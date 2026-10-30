import type { EdgeVerdict, Page } from './model.ts';

export interface MappedText {
  text: string;
  starts: number[];
  ends: number[];
}
/** Only canonical Unicode composition and whitespace folding. Offsets are UTF-16. */
export function normalize(source: string): MappedText {
  let text = '';
  const starts: number[] = [],
    ends: number[] = [];
  for (const part of new Intl.Segmenter('und', { granularity: 'grapheme' }).segment(source)) {
    const start = part.index,
      end = start + part.segment.length;
    if (/^\s+$/u.test(part.segment)) {
      if (!text.length) continue;
      if (text.endsWith(' ')) {
        ends[ends.length - 1] = end;
        continue;
      }
      text += ' ';
      starts.push(start);
      ends.push(end);
    } else {
      const composed = part.segment.normalize('NFC');
      text += composed;
      for (let i = 0; i < composed.length; i++) {
        starts.push(start);
        ends.push(end);
      }
    }
  }
  if (text.endsWith(' ')) {
    text = text.slice(0, -1);
    starts.pop();
    ends.pop();
  }
  return { text, starts, ends };
}

export interface PageText {
  text: string;
  glyphAt: number[];
  glyphStarts: number[];
  glyphEnds: number[];
}
/** Preserve the host's glyph order. Never estimate a glyph width from a string. */
export function pageText(page: Page): PageText {
  let text = '';
  const glyphAt: number[] = [],
    glyphStarts: number[] = [],
    glyphEnds: number[] = [];
  for (const [i, g] of page.chars.entries()) {
    glyphStarts.push(text.length);
    if (!g.ignorable) {
      text += g.c;
      for (let j = 0; j < g.c.length; j++) glyphAt.push(i);
    }
    glyphEnds.push(text.length);
    if (!g.ignorable && (g.spaceAfter || g.lineBreakAfter || g.paragraphBreakAfter)) {
      const separator = g.paragraphBreakAfter ? '\n\n' : g.lineBreakAfter ? '\n' : ' ';
      text += separator;
      for (let j = 0; j < separator.length; j++) glyphAt.push(-1);
    }
  }
  return { text, glyphAt, glyphStarts, glyphEnds };
}

/*
 * Token boundary model. A cut between two adjacent code points is `attached` when both belong to
 * one word or number, `free` when it is an ordinary boundary, and `unknown` inside scripts that
 * are written without word delimiters. Nothing is inferred from meaning, case or a dictionary.
 */
export type EdgeKind = 'free' | 'attached' | 'unknown';
export interface Edge {
  kind: EdgeKind;
  /** For an attached edge: the token text that continues beyond the range (at most RUN_LIMIT). */
  run: string;
}

const RUN_LIMIT = 64;
const WORD = /^[\p{L}\p{M}\p{N}_]$/u;
const LETTER = /^\p{L}$/u;
const DIGIT = /^\p{Nd}$/u;
const UNSPACED =
  /^[\p{Script_Extensions=Han}\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}\p{Script_Extensions=Thai}\p{Script_Extensions=Lao}\p{Script_Extensions=Khmer}\p{Script_Extensions=Myanmar}\p{Script_Extensions=Tibetan}]$/u;
const SIGN = new Set(['-', '−', '+', '±']);
const APOSTROPHE = new Set(["'", '’']);

function before(text: string, at: number): string {
  if (at <= 0) return '';
  const low = text.charCodeAt(at - 1),
    high = at >= 2 ? text.charCodeAt(at - 2) : 0;
  return low >= 0xdc00 && low <= 0xdfff && high >= 0xd800 && high <= 0xdbff
    ? text.slice(at - 2, at)
    : text.slice(at - 1, at);
}
function after(text: string, at: number): string {
  const cp = text.codePointAt(at);
  return cp === undefined ? '' : String.fromCodePoint(cp);
}
function cut(text: string, at: number): EdgeKind {
  const a = before(text, at),
    b = after(text, at);
  if (!a || !b) return 'free';
  if (WORD.test(a) && WORD.test(b)) {
    if (UNSPACED.test(a) && UNSPACED.test(b)) return 'unknown';
    return UNSPACED.test(a) || UNSPACED.test(b) ? 'free' : 'attached';
  }
  const a2 = before(text, at - a.length),
    b2 = after(text, at + b.length);
  // Decimal or grouping separator between digits: 41|.5, 41.|5
  if (DIGIT.test(a) && (b === '.' || b === ',') && DIGIT.test(b2)) return 'attached';
  if ((a === '.' || a === ',') && DIGIT.test(b) && DIGIT.test(a2)) return 'attached';
  // A sign directly before a number, unless the sign joins two tokens as in 5-7 or x-5.
  if (SIGN.has(a) && DIGIT.test(b) && !WORD.test(a2)) return 'attached';
  // Apostrophe inside a word: can|'t
  if (APOSTROPHE.has(b) && LETTER.test(a) && LETTER.test(b2)) return 'attached';
  if (APOSTROPHE.has(a) && LETTER.test(b) && LETTER.test(a2)) return 'attached';
  return 'free';
}
function edge(text: string, at: number, step: -1 | 1): Edge {
  const kind = cut(text, at);
  if (kind !== 'attached') return { kind, run: '' };
  let p = at;
  while (Math.abs(p - at) < RUN_LIMIT && cut(text, p) === 'attached') {
    p += step < 0 ? -before(text, p).length : after(text, p).length;
  }
  return { kind, run: step < 0 ? text.slice(p, at) : text.slice(at, p) };
}
/** Boundary character of a range in UTF-16 offsets of `text`; surrounding whitespace is ignored. */
export function rangeEdges(text: string, start: number, end: number): { left: Edge; right: Edge } {
  while (start < end && /\s/u.test(text[start] ?? '')) start++;
  while (end > start && /\s/u.test(text[end - 1] ?? '')) end--;
  return { left: edge(text, start, -1), right: edge(text, end, 1) };
}
/** Compare one edge of the source selection with the same edge of a target candidate. */
export function compareEdge(source: Edge, target: Edge): EdgeVerdict {
  if (source.kind === 'unknown' || target.kind === 'unknown') return 'unverifiable';
  if (source.kind === 'free') return target.kind === 'free' ? 'kept' : 'expanded';
  return target.kind === 'attached' && target.run.normalize('NFC') === source.run.normalize('NFC')
    ? 'kept'
    : 'changed';
}

export function occurrences(
  haystack: string,
  needle: string,
  limit: number,
  accept: (offset: number) => boolean = () => true,
): { spans: number[]; truncated: boolean } {
  if (!needle) return { spans: [], truncated: false };
  const spans: number[] = [];
  let from = 0;
  while (from <= haystack.length - needle.length) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) break;
    from = at + 1;
    if (!accept(at)) continue;
    if (spans.length === limit) return { spans, truncated: true };
    spans.push(at);
  }
  return { spans, truncated: false };
}
