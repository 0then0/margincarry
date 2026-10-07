import type { Page, Position, Rect } from './model.ts';
import { normalize, pageText } from './text.ts';

export function validRect(rect: Rect): boolean {
  return rect.length === 4 && rect.every(Number.isFinite) && rect[2] > rect[0] && rect[3] > rect[1];
}
function containsCenter(rect: Rect, glyph: Rect): boolean {
  const x = (glyph[0] + glyph[2]) / 2,
    y = (glyph[1] + glyph[3]) / 2;
  return x >= rect[0] - 0.1 && x <= rect[2] + 0.1 && y >= rect[1] - 0.1 && y <= rect[3] + 0.1;
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
  const position = { pageIndex: page.index, rects };
  if (JSON.stringify(position).length > 60000)
    throw new Error('Selection exceeds the native annotation position limit.');
  return position;
}

/** Reject holes instead of taking the bounding range of a discontinuous annotation. */
export function sourceRange(
  page: Page,
  position: Position,
  quote: string,
): { start: number; end: number } {
  if (position.nextPageRects?.length) throw new Error('Multi-page annotations are outside v0.1.');
  if (!position.rects?.length || !position.rects.every(validRect))
    throw new Error('Invalid source rectangles.');
  const stream = pageText(page),
    covered: number[] = [],
    touched = new Set<number>();
  page.chars.forEach((g, index) => {
    if (g.ignorable) return;
    position.rects.forEach((rect, ri) => {
      if (containsCenter(rect, g.rect)) touched.add(ri);
    });
    if (position.rects.some((rect) => containsCenter(rect, g.rect))) covered.push(index);
  });
  if (!covered.length || touched.size !== position.rects.length)
    throw new Error('Not every source rectangle maps to text.');
  const first = covered[0],
    last = covered.at(-1);
  if (first === undefined || last === undefined) throw new Error('Empty source range.');
  for (let i = first; i <= last; i++) {
    if (!page.chars[i]?.ignorable && !covered.includes(i))
      throw new Error('Discontinuous source annotation.');
  }
  const start = stream.glyphStarts[first],
    end = stream.glyphEnds[last];
  if (start === undefined || end === undefined) throw new Error('Missing source text offsets.');
  rangePosition(page, start, end);
  if (normalize(stream.text.slice(start, end)).text !== normalize(quote).text) {
    throw new Error(
      'Source text and source geometry disagree; the complete selection cannot be verified.',
    );
  }
  return { start, end };
}
