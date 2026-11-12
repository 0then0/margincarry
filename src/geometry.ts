import type { Page, Position, Rect } from './model.ts';
import { normalize, PAGE_BREAK, pageText } from './text.ts';

export const GAP_ERROR =
  'The selection does not continue directly from the end of one page to the start of the next: other text, such as a header, footer or page number, lies between its two parts.';

export function validRect(rect: Rect): boolean {
  return rect.length === 4 && rect.every(Number.isFinite) && rect[2] > rect[0] && rect[3] > rect[1];
}
function containsCenter(rect: Rect, glyph: Rect): boolean {
  const x = (glyph[0] + glyph[2]) / 2,
    y = (glyph[1] + glyph[3]) / 2;
  return x >= rect[0] - 0.1 && x <= rect[2] + 0.1 && y >= rect[1] - 0.1 && y <= rect[3] + 0.1;
}
/** One rectangle per line for the glyphs `first`..`last` of a page, in the host's glyph order. */
function lineRects(page: Page, first: number, last: number): Rect[] {
  if (page.partial) throw new Error('The host returned partial page data.');
  const rects: Rect[] = [];
  let line: Rect | null = null;
  for (let i = first; i <= last; i++) {
    const g = page.chars[i];
    if (!g) throw new Error('Missing PDF glyph in selected range.');
    if (g.ignorable) {
      if (line && (g.lineBreakAfter || g.paragraphBreakAfter)) {
        rects.push(line);
        line = null;
      }
      continue;
    }
    if (g.isolated || g.diagonal || (g.rotation ?? 0) !== 0 || !validRect(g.inlineRect)) {
      throw new Error('Isolated, diagonal, rotated or unmapped text cannot be transferred.');
    }
    const r = g.inlineRect,
      b = page.viewBox;
    if (r[0] < b[0] - 1 || r[1] < b[1] - 1 || r[2] > b[2] + 1 || r[3] > b[3] + 1) {
      throw new Error('The selected text extends beyond the PDF crop box.');
    }
    if (!line) line = [...r];
    else {
      // A missing host line boundary must not merge separate columns or distant lines.
      if (Math.min(line[3], r[3]) <= Math.max(line[1], r[1]) || r[0] < line[0] - 1) {
        throw new Error('The host text order has an unmarked line or column boundary.');
      }
      line = [
        Math.min(line[0], r[0]),
        Math.min(line[1], r[1]),
        Math.max(line[2], r[2]),
        Math.max(line[3], r[3]),
      ];
    }
    if (g.lineBreakAfter || g.paragraphBreakAfter) {
      rects.push(line);
      line = null;
    }
  }
  if (line) rects.push(line);
  if (!rects.length) throw new Error('No usable text geometry.');
  return rects;
}
function limited(position: Position): Position {
  if (JSON.stringify(position).length > 60000)
    throw new Error('Selection exceeds the native annotation position limit.');
  return position;
}
export function rangePosition(page: Page, start: number, end: number): Position {
  if (page.partial) throw new Error('The host returned partial page data.');
  const stream = pageText(page);
  const first = stream.glyphAt[start],
    last = stream.glyphAt[end - 1];
  if (
    first === undefined ||
    last === undefined ||
    first < 0 ||
    last < first ||
    stream.glyphStarts[first] !== start ||
    stream.glyphEnds[last] !== end
  ) {
    throw new Error('The range does not align with complete PDF glyphs.');
  }
  return limited({ pageIndex: page.index, rects: lineRects(page, first, last) });
}

/**
 * The first and last glyph of a page that a selection crossing a page break can reach. Zotero's
 * reader drops glyphs it has marked as isolated (outside the page's content area, typically a
 * header, footer or page number) from the page edge of such a selection, and so does this.
 */
export function bodyGlyphs(page: Page): { first: number; last: number } | null {
  const first = page.chars.findIndex((g) => !g.isolated);
  let last = page.chars.length - 1;
  while (last >= 0 && page.chars[last]?.isolated) last--;
  return first < 0 ? null : { first, last };
}
function edgeGlyph(page: Page, side: 'first' | 'last'): number {
  const body = bodyGlyphs(page);
  if (!body) throw new Error('A page next to the page break has no selectable text.');
  // The reader joins a hyphenated word within a page, but separates the two parts of a selection
  // at a page break; which of the two readings applies here cannot be decided from the text.
  if (page.chars[body[side]]?.ignorable)
    throw new Error(
      'A line-end hyphen next to the page break makes the text across the break ambiguous.',
    );
  return body[side];
}
/** Glyphs dropped at a page edge may only be isolated text on other lines than the selection. */
function offLines(page: Page, from: number, to: number, rects: Rect[]): void {
  for (let i = from; i <= to; i++) {
    const g = page.chars[i]?.rect;
    if (!g || rects.some((r) => Math.min(r[3], g[3]) > Math.max(r[1], g[1])))
      throw new Error(GAP_ERROR);
  }
}
/**
 * Position of a selection that runs from the offset `start` to the end of `first` and from the
 * start of `next`, the following page, to the offset `end`. Each page keeps its own rectangles.
 */
export function crossPagePosition(first: Page, start: number, next: Page, end: number): Position {
  if (first.partial || next.partial) throw new Error('The host returned partial page data.');
  if (next.index !== first.index + 1) throw new Error('No usable text geometry.');
  const a = pageText(first),
    b = pageText(next);
  const lastA = edgeGlyph(first, 'last'),
    firstB = edgeGlyph(next, 'first');
  const from = a.glyphAt[start],
    to = b.glyphAt[end - 1];
  if (
    from === undefined ||
    to === undefined ||
    from < 0 ||
    from > lastA ||
    to < firstB ||
    a.glyphStarts[from] !== start ||
    b.glyphEnds[to] !== end
  ) {
    throw new Error('The range does not align with complete PDF glyphs.');
  }
  const rects = lineRects(first, from, lastA),
    nextPageRects = lineRects(next, firstB, to);
  offLines(first, lastA + 1, first.chars.length - 1, rects);
  offLines(next, 0, firstB - 1, nextPageRects);
  return limited({ pageIndex: first.index, rects, nextPageRects });
}

/** Glyphs under the rectangles. Holes are rejected instead of taking their bounding range. */
function coveredGlyphs(page: Page, rects: Rect[]): { first: number; last: number } {
  if (!Array.isArray(rects) || !rects.length || !rects.every(validRect))
    throw new Error('Invalid source rectangles.');
  const covered: number[] = [],
    touched = new Set<number>();
  page.chars.forEach((g, index) => {
    if (g.ignorable) return;
    rects.forEach((rect, ri) => {
      if (containsCenter(rect, g.rect)) touched.add(ri);
    });
    if (rects.some((rect) => containsCenter(rect, g.rect))) covered.push(index);
  });
  if (!covered.length || touched.size !== rects.length)
    throw new Error('Not every source rectangle maps to text.');
  const first = covered[0],
    last = covered.at(-1);
  if (first === undefined || last === undefined) throw new Error('Empty source range.');
  for (let i = first; i <= last; i++) {
    if (!page.chars[i]?.ignorable && !covered.includes(i))
      throw new Error('Discontinuous source annotation.');
  }
  return { first, last };
}

export interface SourceRange {
  start: number;
  end: number;
  /** Offsets in the text of the following page when the selection crosses the page break. */
  next?: { start: number; end: number };
}
/**
 * Text range of a source annotation, verified against its rectangles and its quote. `next` is the
 * page after `page`; it is required when the position has rectangles on that page.
 */
export function sourceRange(
  page: Page,
  position: Position,
  quote: string,
  next?: Page,
): SourceRange {
  const stream = pageText(page),
    part = coveredGlyphs(page, position.rects);
  const start = stream.glyphStarts[part.first],
    end = stream.glyphEnds[part.last];
  if (start === undefined || end === undefined) throw new Error('Missing source text offsets.');
  const disagree =
    'Source text and source geometry disagree; the complete selection cannot be verified.';
  if (position.nextPageRects === undefined || position.nextPageRects.length === 0) {
    rangePosition(page, start, end);
    if (normalize(stream.text.slice(start, end)).text !== normalize(quote).text)
      throw new Error(disagree);
    return { start, end };
  }
  if (!next) throw new Error('The second source page could not be extracted.');
  const nextStream = pageText(next),
    nextPart = coveredGlyphs(next, position.nextPageRects);
  const nextStart = nextStream.glyphStarts[nextPart.first],
    nextEnd = nextStream.glyphEnds[nextPart.last];
  if (nextStart === undefined || nextEnd === undefined)
    throw new Error('Missing source text offsets.');
  // A real selection across a page break reaches the end of one page and the start of the next.
  if (part.last !== edgeGlyph(page, 'last') || nextPart.first !== edgeGlyph(next, 'first'))
    throw new Error(GAP_ERROR);
  crossPagePosition(page, start, next, nextEnd);
  const text =
    stream.text.slice(start, end) + PAGE_BREAK + nextStream.text.slice(nextStart, nextEnd);
  if (normalize(text).text !== normalize(quote).text) throw new Error(disagree);
  return { start, end, next: { start: nextStart, end: nextEnd } };
}
