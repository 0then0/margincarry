import type { Page } from './model.ts';

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
