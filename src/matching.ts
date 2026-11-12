import {
  bodyGlyphs,
  crossPagePosition,
  GAP_ERROR,
  rangePosition,
  sourceRange,
} from './geometry.ts';
import type { Annotation, Candidate, Page, Position, Proposal } from './model.ts';
import type { MappedText } from './text.ts';
import {
  compareEdge,
  normalize,
  normalizedEnd,
  normalizedStart,
  occurrences,
  PAGE_BREAK,
  pageText,
  rangeEdges,
} from './text.ts';

/** A place where a selection may leave or enter a page: offsets in the raw and normalized text. */
interface Cut {
  raw: number;
  at: number;
}
export interface PreparedPage {
  raw: string;
  mapped: MappedText;
  /** Where a selection continuing from the previous page starts: the first selectable glyph. */
  lead: Cut | null;
  /** Where a selection continuing on the next page ends: the last selectable glyph. */
  trail: Cut | null;
  /** Starts of the next three lines and ends of the previous three: only to explain a refusal. */
  leadLines: Cut[];
  trailLines: Cut[];
}
export function preparePage(page: Page): PreparedPage {
  const stream = pageText(page),
    raw = stream.text,
    mapped = normalize(raw),
    body = bodyGlyphs(page);
  const starting = (glyph: number): Cut | null => {
    const offset = stream.glyphStarts[glyph],
      at = offset === undefined ? null : normalizedStart(mapped, offset);
    return offset === undefined || at === null ? null : { raw: offset, at };
  };
  const ending = (glyph: number): Cut | null => {
    const offset = stream.glyphEnds[glyph],
      at = offset === undefined ? null : normalizedEnd(mapped, offset);
    return offset === undefined || at === null ? null : { raw: offset, at };
  };
  const breaks: number[] = [];
  for (let i = body?.first ?? 0; body && i < body.last; i++) {
    const g = page.chars[i];
    if (g && !g.ignorable && (g.lineBreakAfter || g.paragraphBreakAfter)) breaks.push(i);
  }
  const present = (cut: Cut | null): cut is Cut => cut !== null;
  return {
    raw,
    mapped,
    lead: body ? starting(body.first) : null,
    trail: body ? ending(body.last) : null,
    leadLines: breaks
      .slice(0, 3)
      .map((i) => starting(i + 1))
      .filter(present),
    trailLines: breaks.slice(-3).map(ending).filter(present),
  };
}

/** The quote widens or alters a word or number that the source selection had closed or fixed. */
export function doubtful(c: Candidate): boolean {
  return [c.boundary.left, c.boundary.right].some((v) => v === 'expanded' || v === 'changed');
}

/**
 * `oldNext` is the page after `oldPage`; it is needed when the source selection continues on it.
 * Target occurrences are searched on each page and across each pair of adjacent pages.
 */
export function propose(
  source: Annotation,
  oldPage: Page | undefined,
  pages: Page[],
  limit = 200,
  prepared?: ReadonlyMap<number, PreparedPage>,
  oldNext?: Page,
): Proposal {
  const result: Proposal = {
    source,
    status: 'unsupported',
    reason: '',
    candidates: [],
    sourcePrefix: '',
    sourceSuffix: '',
    truncated: false,
    recommendedID: null,
  };
  if (!['highlight', 'underline'].includes(source.type) || source.external) {
    result.reason = 'Only native highlights and underlines are supported.';
    return result;
  }
  if (!oldPage) {
    result.status = 'processing error';
    result.reason = 'The source page could not be extracted.';
    return result;
  }
  const crossing = !!source.position.nextPageRects?.length;
  if (crossing && !oldNext) {
    result.status = 'processing error';
    result.reason = 'The second source page could not be extracted.';
    return result;
  }
  let anchor: ReturnType<typeof sourceRange>;
  try {
    anchor = sourceRange(oldPage, source.position, source.text, oldNext);
  } catch (e) {
    result.reason = String(e instanceof Error ? e.message : e);
    return result;
  }
  // Context and word boundaries belong to the outer ends of the whole selection: the text before
  // its first part and after its last part. The page break inside it is not an end.
  const oldText = pageText(oldPage).text,
    lastText = anchor.next && oldNext ? pageText(oldNext).text : oldText,
    last = anchor.next ?? anchor;
  const sourceEdges = {
    left: rangeEdges(oldText, anchor.start, anchor.end).left,
    right: rangeEdges(lastText, last.start, last.end).right,
  };
  result.sourcePrefix = oldText.slice(Math.max(0, anchor.start - 80), anchor.start);
  result.sourceSuffix = lastText.slice(last.end, last.end + 80);
  if (anchor.next && oldNext) result.sourceNextPageLabel = oldNext.label;
  const prefix = normalize(result.sourcePrefix).text,
    suffix = normalize(result.sourceSuffix).text;
  const needle = normalize(source.text).text;
  if (!needle) {
    result.reason = 'Empty source text.';
    return result;
  }
  // A page break stands for exactly one space of the quote, so the quote can only be divided
  // between two pages at one of its spaces.
  const splits: { head: string; tail: string }[] = [];
  for (let i = needle.indexOf(' '); i >= 0; i = needle.indexOf(' ', i + 1))
    splits.push({ head: needle.slice(0, i), tail: needle.slice(i + 1) });
  const local = new Map<number, PreparedPage>();
  const prepare = (page: Page): PreparedPage => {
    let value = prepared?.get(page.index) ?? local.get(page.index);
    if (!value) {
      value = preparePage(page);
      local.set(page.index, value);
    }
    return value;
  };
  const byIndex = new Map(pages.map((page) => [page.index, page]));
  const full = () => {
    if (result.candidates.length < limit) return false;
    result.truncated = true;
    return true;
  };
  const add = (
    page: Page,
    first: { raw: string; start: number; end: number },
    second: { page: Page; raw: string; start: number; end: number } | null,
    geometry: () => Position,
  ) => {
    const text = second
      ? first.raw.slice(first.start, first.end) +
        PAGE_BREAK +
        second.raw.slice(second.start, second.end)
      : first.raw.slice(first.start, first.end);
    const end = second ?? first,
      before = first.raw.slice(Math.max(0, first.start - 100), first.start),
      after = end.raw.slice(end.end, end.end + 100);
    const contextMatches =
      prefix.length + suffix.length >= 16 &&
      (!prefix || normalize(before).text.endsWith(prefix)) &&
      (!suffix || normalize(after).text.startsWith(suffix));
    let position = null,
      geometryError = null;
    try {
      position = geometry();
    } catch (e) {
      geometryError = String(e instanceof Error ? e.message : e);
    }
    const candidate: Candidate = {
      id: `${page.index}:${first.start}:${first.end}${second ? `+${second.start}:${second.end}` : ''}`,
      pageIndex: page.index,
      pageLabel: page.label,
      start: first.start,
      end: first.end,
      text,
      prefix: before,
      suffix: after,
      method:
        (second ? text.replace(PAGE_BREAK, ' ') : text) === source.text ? 'exact' : 'normalized',
      contextMatches,
      boundary: {
        left: compareEdge(sourceEdges.left, rangeEdges(first.raw, first.start, first.end).left),
        right: compareEdge(sourceEdges.right, rangeEdges(end.raw, end.start, end.end).right),
      },
      position,
      geometryError,
    };
    if (second)
      candidate.nextPage = { pageLabel: second.page.label, start: second.start, end: second.end };
    result.candidates.push(candidate);
  };
  const interrupted: (() => void)[] = [];
  search: for (const page of pages) {
    const { raw, mapped, trail, trailLines } = prepare(page);
    const found = occurrences(
      mapped.text,
      needle,
      Math.max(0, limit - result.candidates.length),
      (offset) => {
        const start = mapped.starts[offset],
          end = mapped.ends[offset + needle.length - 1];
        // A substring inside a grapheme must not expand into additional meaningful symbols.
        return (
          start !== undefined &&
          end !== undefined &&
          normalize(raw.slice(start, end)).text === needle
        );
      },
    );
    result.truncated ||= found.truncated;
    for (const offset of found.spans) {
      const start = mapped.starts[offset],
        end = mapped.ends[offset + needle.length - 1];
      if (start === undefined || end === undefined)
        throw new Error('Missing normalized text offsets.');
      add(page, { raw, start, end }, null, () => rangePosition(page, start, end));
    }
    const next = byIndex.get(page.index + 1);
    if (!next || !trail || !splits.length) continue;
    const following = prepare(next);
    if (!following.lead) continue;
    // The direct continuation first; then the same quote with up to three other lines between its
    // parts at either page edge. The latter only explains a refusal, see below.
    const ends = [trail, ...trailLines.filter((cut) => cut.at !== trail.at)],
      starts = [following.lead, ...following.leadLines.filter((c) => c.at !== following.lead?.at)];
    for (const [ei, ending] of ends.entries()) {
      for (const [si, starting] of starts.entries()) {
        for (const { head, tail } of splits) {
          const from = ending.at - head.length;
          if (
            from < 0 ||
            !mapped.text.startsWith(head, from) ||
            !following.mapped.text.startsWith(tail, starting.at)
          )
            continue;
          const start = mapped.starts[from],
            end = following.mapped.ends[starting.at + tail.length - 1];
          if (
            start === undefined ||
            end === undefined ||
            normalize(
              raw.slice(start, ending.raw) + PAGE_BREAK + following.raw.slice(starting.raw, end),
            ).text !== needle
          )
            continue;
          const first = { raw, start, end: ending.raw },
            second = { page: next, raw: following.raw, start: starting.raw, end };
          if (ei || si) {
            interrupted.push(() =>
              add(page, first, second, () => {
                throw new Error(GAP_ERROR);
              }),
            );
            continue;
          }
          if (full()) break search;
          add(page, first, second, () => crossPagePosition(page, start, next, end));
        }
      }
    }
  }
  // Two halves that meet only when lines are skipped are weak evidence: ordinary lines of text can
  // lie between them as well as a header or footer. They never compete with a real occurrence and
  // are listed, without a position, only when the quote was found nowhere else.
  if (!result.candidates.length) for (const list of interrupted) if (!full()) list();
  if (!result.candidates.length) {
    result.status = 'not found';
    result.reason = pages.every((p) => !p.chars.some((c) => !c.ignorable && c.c))
      ? 'The target PDF has no usable text layer. OCR is not supported.'
      : 'No exact or conservatively normalized quote on one target page or across two adjacent target pages.';
  } else {
    // A text occurrence is not yet a recommended transfer: a quote that changed the word or number
    // boundary of the source selection stays listed, but is never recommended. Doubtful occurrences
    // still count toward ambiguity, so they cannot make another occurrence look unique.
    const contextual = result.candidates.filter((c) => c.contextMatches);
    const preferred =
      result.candidates.length === 1
        ? result.candidates[0]
        : contextual.length === 1
          ? contextual[0]
          : undefined;
    const recommendable = preferred && !doubtful(preferred) ? preferred : undefined;
    result.status = result.truncated
      ? 'multiple candidates'
      : result.candidates.every(doubtful)
        ? 'doubtful candidate'
        : recommendable
          ? 'unique candidate'
          : 'multiple candidates';
    result.recommendedID = !result.truncated && recommendable?.position ? recommendable.id : null;
    result.reason = result.truncated
      ? `Candidate list limited to ${limit}; uniqueness is unknown.`
      : result.status === 'doubtful candidate'
        ? 'The quote occurs only where the word or number boundary differs from the source selection; no transfer is recommended. Check the PDF before choosing one manually.'
        : recommendable && contextual.length === 1 && result.candidates.length > 1
          ? 'One occurrence matches the complete available context; alternatives are retained.'
          : result.candidates.length === 1
            ? recommendable?.boundary.left === 'unverifiable' ||
              recommendable?.boundary.right === 'unverifiable'
              ? 'One text occurrence; word boundaries cannot be checked for this script. Verify the PDF position.'
              : 'One text occurrence; verify the PDF position.'
            : 'Several occurrences require a human choice.';
    if (!result.candidates.some((c) => c.position)) {
      result.status = 'processing error';
      // Text between the two parts at a page break is stated as the cause when it is the only one.
      result.reason = result.candidates.every((c) => c.geometryError === GAP_ERROR)
        ? GAP_ERROR
        : 'Text found, but none of the occurrences has reliable geometry.';
    }
  }
  return result;
}
