import { validRect } from './geometry.ts';
import type { Glyph, Page } from './model.ts';
import type { PageText } from './text.ts';

/*
 * A word divided at the end of a line or page. Zotero's reader marks every dash that ends a line as
 * ignorable and leaves it out of the page text, so `inter-` + `national` reads `international` and
 * `well-` + `known` reads `wellknown`. A soft hyphen (U+00AD) is not marked and stays in the text
 * together with the line break. Neither tells whether the printed hyphen belongs to the word, so
 * every reading other than the literal text is a hypothesis that a person has to confirm.
 */

export const SOFT_HYPHEN = '\u00ad';
/** Visible hyphens that typesetting puts at a line end when it divides a word. */
const HYPHENS = new Set(['-', '‐']);
const WORD_END = /[\p{L}\p{M}]$/u;
const WORD_START = /^\p{L}/u;
const WORD = /^[\p{L}\p{M}]+$/u;

/** A confirmed hyphen at the end of a line or of a page, with a word fragment on each side. */
export interface Join {
  /** Index of the hyphen glyph. */
  glyph: number;
  mark: string;
  ignorable: boolean;
  /** The interval of the page text that holds the hyphen and the line break after it. */
  from: number;
  to: number;
  /** The word continues at the first glyph of the following page. */
  pageBreak: boolean;
}
/** One way to read a join: the text that replaces the hyphen and the break after it. */
export interface Reading {
  /** `null` is the page text itself, which keeps a soft hyphen and a line break in the word. */
  reading: 'removed' | 'kept' | null;
  text: string;
}

function upright(g: Glyph): boolean {
  return !g.diagonal && (g.rotation ?? 0) === 0;
}
function ends(g: Glyph | undefined): boolean {
  return !!g && !!(g.spaceAfter || g.lineBreakAfter || g.paragraphBreakAfter);
}
/** The glyph before the hyphen: the end of a word fragment, directly attached to the hyphen. */
function fragmentEnd(g: Glyph | undefined): g is Glyph {
  return !!g && !g.ignorable && !g.isolated && !ends(g) && upright(g) && WORD_END.test(g.c);
}
/** The glyph after the break: the start of the rest of the word. */
function fragmentStart(g: Glyph | undefined): boolean {
  return !!g && !g.ignorable && !g.isolated && upright(g) && WORD_START.test(g.c);
}
/** A hyphen that the reader reports as the last glyph of a line, not of a paragraph. */
function hyphen(g: Glyph | undefined, pageEnd = false): g is Glyph {
  return (
    !!g &&
    (HYPHENS.has(g.c) || g.c === SOFT_HYPHEN) &&
    !!g.lineBreakAfter &&
    (pageEnd || !g.paragraphBreakAfter) &&
    !g.spaceAfter &&
    !g.isolated &&
    upright(g)
  );
}
function attachedMark(before: Glyph, mark: Glyph): boolean {
  const a = before.rect,
    b = mark.rect;
  return (
    validRect(a) &&
    validRect(b) &&
    Math.min(a[3], b[3]) > Math.max(a[1], b[1]) &&
    Math.abs(a[2] - b[0]) <= (a[3] - a[1]) / 2
  );
}
function endsLine(g: Glyph | undefined): boolean {
  return !!(g?.lineBreakAfter || g?.paragraphBreakAfter);
}

function lineStart(page: Page, i: number): number {
  while (i > 0 && !endsLine(page.chars[i - 1])) i--;
  return i;
}

function aligned(a: Glyph | undefined, b: Glyph | undefined): boolean {
  if (!a || !b || !upright(a) || !upright(b) || a.isolated || b.isolated) return false;
  const left = a.inlineRect,
    right = b.inlineRect;
  if (!validRect(left) || !validRect(right)) return false;
  const height = left[3] - left[1],
    nextHeight = right[3] - right[1];
  return (
    nextHeight >= height * 0.75 &&
    nextHeight <= height * 1.33 &&
    Math.abs(left[0] - right[0]) <= 2 * height
  );
}

function directlyBelow(upper: Glyph, lower: Glyph): boolean {
  const a = upper.inlineRect,
    b = lower.inlineRect;
  if (!validRect(a) || !validRect(b)) return false;
  const height = a[3] - a[1];
  const gap = a[1] - b[3];
  return gap >= -height / 2 && gap <= 1.5 * height;
}

/** The word continues below the current line, in the same column. */
function continues(page: Page, i: number): boolean {
  const before = page.chars[i - 1],
    mark = page.chars[i],
    after = page.chars[i + 1];
  if (!before || !mark || !after) return false;
  return (
    attachedMark(before, mark) &&
    directlyBelow(before, after) &&
    after.inlineRect[0] < mark.rect[0] &&
    aligned(page.chars[lineStart(page, i - 1)], after)
  );
}
function join(page: Page, stream: PageText, i: number, pageBreak: boolean): Join {
  const g = page.chars[i] as Glyph;
  const from = stream.glyphStarts[i] ?? 0,
    to = stream.glyphStarts[i + 1] ?? stream.text.length;
  return { glyph: i, mark: g.c, ignorable: !!g.ignorable, from, to, pageBreak };
}

/** Hyphens that divide a word between two lines of one page, where the reader data confirms it. */
export function lineJoins(page: Page, stream: PageText): Join[] {
  const found: Join[] = [];
  if (page.partial) return found;
  for (let i = 1; i + 1 < page.chars.length; i++) {
    if (
      hyphen(page.chars[i]) &&
      fragmentEnd(page.chars[i - 1]) &&
      fragmentStart(page.chars[i + 1]) &&
      continues(page, i)
    )
      found.push(join(page, stream, i, false));
  }
  return found;
}
/**
 * A hyphen that ends the page's text. Even isolated glyphs after it leave the order across
 * the break uncertain. Zotero sets paragraphBreakAfter on the final glyph of every page.
 */
export function edgeJoin(page: Page, stream: PageText): Join | null {
  if (page.partial) return null;
  const i = page.chars.length - 1,
    previous = page.chars[i - 1],
    mark = page.chars[i];
  return hyphen(mark, true) && fragmentEnd(previous) && attachedMark(previous, mark)
    ? join(page, stream, i, true)
    : null;
}
/**
 * Text at both edges starts in a compatible column. Check its neighboring lines as well:
 * basic page data can leave running headers and footers unmarked.
 */
export function continuesOn(page: Page, edge: Join, next: Page): boolean {
  const start = lineStart(page, edge.glyph - 1);
  const lastLine = page.chars[start],
    firstLine = next.chars[0];
  if (
    next.index !== page.index + 1 ||
    next.partial ||
    !lastLine ||
    !firstLine ||
    !fragmentStart(firstLine) ||
    !aligned(lastLine, firstLine)
  )
    return false;
  const previous = start > 0 ? page.chars[lineStart(page, start - 1)] : undefined;
  const firstEnd = next.chars.findIndex(endsLine);
  const following = firstEnd >= 0 ? next.chars[firstEnd + 1] : undefined;
  return (
    (!previous || (aligned(previous, lastLine) && directlyBelow(previous, lastLine))) &&
    (!following || (aligned(firstLine, following) && directlyBelow(firstLine, following)))
  );
}
/** A confirmed hyphen that ends `page` and divides a word continued on `next`. */
export function pageJoin(page: Page, stream: PageText, next: Page | undefined): Join | null {
  const edge = edgeJoin(page, stream);
  return edge && next && continuesOn(page, edge, next) ? edge : null;
}

/**
 * Ways to read a join. `segment` is its text as the page gives it: the interval `from`..`to` on
 * one page, or the hyphen's own text followed by the page break. The first reading is that text,
 * except for a hyphen the reader drops at a page break, which would become a space between two
 * words; that reading is not offered.
 */
export function readings(join: Join, segment: string): Reading[] {
  const list: Reading[] = [];
  const add = (reading: Reading['reading'], text: string) => {
    if (!list.some((r) => r.text === text)) list.push({ reading, text });
  };
  if (!(join.pageBreak && join.ignorable)) add(segment === '' ? 'removed' : null, segment);
  add('removed', '');
  if (HYPHENS.has(join.mark)) add('kept', join.mark);
  return list;
}

/** Glyphs `first`..`last` as printed: unlike the page text, line-end dashes stay in. */
export function literalText(page: Page, first: number, last: number): string {
  let text = '';
  for (let i = first; i <= last; i++) {
    const g = page.chars[i];
    if (!g) break;
    text += g.c;
    if (i < last && ends(g)) text += g.lineBreakAfter || g.paragraphBreakAfter ? '\n' : ' ';
  }
  return text;
}

/** The divided word around a join, up to 24 glyphs on each side, for display. */
export function fragment(page: Page, j: Join, next?: Page): { before: string; after: string } {
  let before = '';
  for (let i = j.glyph - 1; i >= 0 && before.length < 24; i--) {
    const g = page.chars[i];
    if (!g || g.ignorable || !WORD.test(g.c) || (i < j.glyph - 1 && ends(g))) break;
    before = g.c + before;
  }
  const after = j.pageBreak ? next : page,
    first = j.pageBreak ? 0 : j.glyph + 1;
  let rest = '';
  for (let i = first; after && i < after.chars.length && rest.length < 24; i++) {
    const g = after.chars[i];
    if (!g || g.ignorable || !WORD.test(g.c)) break;
    rest += g.c;
    if (ends(g)) break;
  }
  return { before, after: rest };
}
