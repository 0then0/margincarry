import {
  bodyGlyphs,
  coversGlyph,
  crossPagePosition,
  GAP_ERROR,
  REVERSE_ERROR,
  rangePosition,
  selectedRange,
  sourceRange,
} from './geometry.ts';
import {
  continuesOn,
  edgeJoin,
  fragment,
  type Join,
  lineJoins,
  literalText,
  pageJoin,
  type Reading,
  readings,
} from './hyphenation.ts';
import type { Annotation, Candidate, HyphenJoin, Page, Position, Proposal } from './model.ts';
import type { MappedText, PageText } from './text.ts';
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

/** Source hyphens beyond this number are read only as the page text gives them. */
const SOURCE_JOINS = 3;

/** A place where a selection may leave or enter a page: offsets in the raw and normalized text. */
interface Cut {
  raw: number;
  at: number;
}
/** A confirmed hyphen with the normalized offsets where the word fragments end and start. */
interface PreparedJoin extends Join {
  before: number;
  after: number;
}
export interface PreparedPage {
  raw: string;
  mapped: MappedText;
  stream: PageText;
  /** Where a selection continuing from the previous page starts: the first selectable glyph. */
  lead: Cut | null;
  /** Where a selection continuing on the next page ends: the last selectable glyph. */
  trail: Cut | null;
  /** Starts of the next three lines and ends of the previous three: only to explain a refusal. */
  leadLines: Cut[];
  trailLines: Cut[];
  /** Hyphens that divide a word between two lines of this page. */
  joins: PreparedJoin[];
  /** A hyphen after a word fragment at the end of the page's text. */
  edge: PreparedJoin | null;
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
  const present = <T>(value: T | null): value is T => value !== null;
  const prepared = (join: Join): PreparedJoin | null => {
    const before = normalizedEnd(mapped, join.from),
      after = join.pageBreak ? 0 : normalizedStart(mapped, join.to);
    return before === null || after === null ? null : { ...join, before, after };
  };
  const edge = edgeJoin(page, stream);
  return {
    raw,
    mapped,
    stream,
    lead: body ? starting(body.first) : null,
    trail: body ? ending(body.last) : null,
    leadLines: breaks
      .slice(0, 3)
      .map((i) => starting(i + 1))
      .filter(present),
    trailLines: breaks.slice(-3).map(ending).filter(present),
    joins: lineJoins(page, stream).map(prepared).filter(present),
    edge: edge ? prepared(edge) : null,
  };
}

/** The quote widens or alters a word or number that the source selection had closed or fixed. */
export function boundaryDiffers(c: Candidate): boolean {
  return [c.boundary.left, c.boundary.right].some((v) => v === 'expanded' || v === 'changed');
}
/** A candidate that is listed but never recommended: a changed boundary or a hyphen reading. */
export function doubtful(c: Candidate): boolean {
  return boundaryDiffers(c) || !!c.hyphenation?.length;
}

function describe(
  side: HyphenJoin['side'],
  page: Page,
  join: Join,
  reading: HyphenJoin['reading'],
  next?: Page,
): HyphenJoin {
  const value: HyphenJoin = {
    side,
    pageIndex: page.index,
    pageLabel: page.label,
    pageBreak: join.pageBreak,
    mark: join.mark,
    offset: join.from,
    glyphIndex: join.glyph,
    reading,
    fragment: fragment(page, join, next),
  };
  if (join.pageBreak && next) value.nextPageLabel = next.label;
  return value;
}
/** Offsets `i` where `needle` is `head + text + tail`, `head` ending at `a[before]` and `tail` starting at `b[after]`. */
function splitsAround(
  needle: string,
  text: string,
  a: string,
  before: number,
  b: string,
  after: number,
): { head: number; tail: number }[] {
  const found = [];
  for (let i = 1; i + text.length < needle.length; i++) {
    const tail = needle.length - i - text.length;
    if (
      needle[i - 1] !== a[before - 1] ||
      needle[i + text.length] !== b[after] ||
      before < i ||
      !needle.startsWith(text, i) ||
      !a.startsWith(needle.slice(0, i), before - i) ||
      !b.startsWith(needle.slice(i + text.length), after)
    )
      continue;
    found.push({ head: i, tail });
  }
  return found;
}

/** One searched form of the source quote: its text, and the source hyphens it reads differently. */
interface Needle {
  text: string;
  joins: HyphenJoin[];
}
/** A target range on one page; `last` is the last printed glyph when a hyphen ends the page. */
interface Span {
  page: Page;
  prep: PreparedPage;
  start: number;
  end: number;
  last?: number;
}

type TargetJoin = { value: Join; reading: HyphenJoin['reading']; part: 0 | 1 };

function* spaceSplits(text: string) {
  for (let i = text.indexOf(' '); i >= 0; i = text.indexOf(' ', i + 1))
    yield { head: text.slice(0, i), tail: text.slice(i + 1) };
}

/** Matches that need one explicit replacement in the target stream on this page. */
function* lineMatches(prep: PreparedPage, needle: string) {
  const { raw, mapped } = prep;
  for (const value of prep.joins) {
    const segment = raw.slice(value.from, value.to);
    for (const option of readings(value, segment)) {
      if (option.text === segment || !option.reading) continue;
      for (const { head, tail } of splitsAround(
        needle,
        option.text,
        mapped.text,
        value.before,
        mapped.text,
        value.after,
      )) {
        const start = mapped.starts[value.before - head],
          end = mapped.ends[value.after + tail - 1];
        if (start === undefined || end === undefined) continue;
        const text = raw.slice(start, value.from) + option.text + raw.slice(value.to, end);
        if (normalize(text).text === needle) yield { start, end, value, reading: option.reading };
      }
    }
  }
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
  const oldStream = pageText(oldPage);
  // A word divided by a hyphen at the source page break: the selection may end at that hyphen.
  const sourceJoin = crossing ? pageJoin(oldPage, oldStream, oldNext) : null;
  let anchor: ReturnType<typeof sourceRange>;
  try {
    anchor = sourceRange(oldPage, source.position, source.text, oldNext, sourceJoin?.glyph);
  } catch (e) {
    result.reason = String(e instanceof Error ? e.message : e);
    return result;
  }
  // Context and word boundaries belong to the outer ends of the whole selection: the text before
  // its first part and after its last part. The page break inside it is not an end.
  const oldText = oldStream.text,
    nextStream = anchor.next && oldNext ? pageText(oldNext) : null,
    lastText = nextStream ? nextStream.text : oldText,
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
  if (!normalize(source.text).text) {
    result.reason = 'Empty source text.';
    return result;
  }

  // The source selection as printed, and the hyphens inside it that may be read differently.
  const pieces = [{ page: oldPage, stream: oldStream, start: anchor.start, end: anchor.end }];
  if (anchor.next && oldNext && nextStream)
    pieces.push({ page: oldNext, stream: nextStream, ...anchor.next });
  const pageEnd = anchor.next ? sourceJoin : null;
  const sourceRaw = pieces.map((p) => p.stream.text.slice(p.start, p.end)).join(PAGE_BREAK),
    sourceExtracted = normalize(sourceRaw).text;
  const slots: { join: Join; page: Page; next?: Page; from: number; to: number }[] = [];
  const literal: string[] = [];
  let sourceJoinUnverified = false;
  let offset = 0;
  for (const [k, piece] of pieces.entries()) {
    const first = piece.stream.glyphAt[piece.start] ?? -1,
      lastGlyph = k === 0 && pageEnd ? pageEnd.glyph : (piece.stream.glyphAt[piece.end - 1] ?? -1);
    literal.push(literalText(piece.page, first, lastGlyph));
    const verified = new Set<number>();
    const rects = k ? (source.position.nextPageRects ?? []) : source.position.rects;
    for (const join of lineJoins(piece.page, piece.stream)) {
      if (join.glyph <= first || join.glyph >= lastGlyph) continue;
      if (!coversGlyph(rects, piece.page.chars[join.glyph])) continue;
      verified.add(join.glyph);
      slots.push({
        join,
        page: piece.page,
        from: offset + join.from - piece.start,
        to: offset + join.to - piece.start,
      });
    }
    for (let i = first; i < lastGlyph; i++) {
      if (piece.page.chars[i]?.ignorable && !verified.has(i)) sourceJoinUnverified = true;
    }
    offset += piece.end - piece.start + PAGE_BREAK.length;
  }
  if (pageEnd && oldNext)
    slots.push({
      join: pageEnd,
      page: oldPage,
      next: oldNext,
      from: pageEnd.from - anchor.start,
      to: anchor.end - anchor.start + PAGE_BREAK.length,
    });
  slots.sort((a, b) => a.from - b.from);
  const sourcePrintedText = literal.join(PAGE_BREAK);
  const sourceLiteral = normalize(sourcePrintedText).text;
  const options = slots.map((slot) => {
    const list = readings(slot.join, sourceRaw.slice(slot.from, slot.to));
    return slots.length > SOURCE_JOINS ? list.slice(0, 1) : list;
  });
  const needles: Needle[] = [];
  const addNeedle = (chosen: Reading[]) => {
    let text = sourceRaw;
    for (let i = slots.length - 1; i >= 0; i--) {
      const slot = slots[i],
        option = chosen[i];
      if (slot && option) text = text.slice(0, slot.from) + option.text + text.slice(slot.to);
    }
    const value = normalize(text).text;
    if (!value || needles.some((n) => n.text === value)) return;
    const joins: HyphenJoin[] = [];
    slots.forEach((slot, i) => {
      const reading = chosen[i]?.reading;
      if (reading) joins.push(describe('source', slot.page, slot.join, reading, slot.next));
    });
    needles.push({ text: value, joins });
  };
  let choices: Reading[][] = [[]];
  for (const optionsForSlot of options)
    choices = choices.flatMap((chosen) => optionsForSlot.map((option) => [...chosen, option]));
  for (const chosen of choices) addNeedle(chosen);

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
  const seen = new Set<string>();
  /**
   * `join` is a target hyphen that the search read
   * differently from the page text; such a candidate and any candidate whose printed text differs
   * from the printed source only by line-end hyphens is a hyphenation candidate.
   */
  const add = (
    spans: [Span] | [Span, Span],
    needle: Needle,
    geometry: (include: ReadonlySet<number>, nextInclude?: ReadonlySet<number>) => Position,
    join?: TargetJoin,
  ) => {
    const [first, second] = spans,
      end = second ?? first;
    const id = `${first.page.index}:${first.start}:${first.end}${second ? `+${second.start}:${second.end}` : ''}`;
    if (seen.has(id)) return;
    const before = first.prep.raw.slice(Math.max(0, first.start - 100), first.start),
      after = end.prep.raw.slice(end.end, end.end + 100);
    const contextMatches =
      prefix.length + suffix.length >= 16 &&
      (!prefix || normalize(before).text.endsWith(prefix)) &&
      (!suffix || normalize(after).text.startsWith(suffix));
    // The printed glyphs of each part. When they read the same as the printed source, line-end
    // hyphens are where they were, and nothing had to be read differently.
    const ranges = spans.map((s) => ({
      span: s,
      first: s.prep.stream.glyphAt[s.start] ?? -1,
      last: s.last ?? s.prep.stream.glyphAt[s.end - 1] ?? -1,
    }));
    const printedText = ranges
      .map((r) => literalText(r.span.page, r.first, r.last))
      .join(PAGE_BREAK);
    const plain =
      !join && needle.text === sourceExtracted && normalize(printedText).text === sourceLiteral;
    const include = new Set<number>(),
      nextInclude = new Set<number>();
    const hyphenation: HyphenJoin[] = [];
    if (!plain) {
      if (sourceJoinUnverified) return;
      hyphenation.push(...needle.joins);
      for (const [k, r] of ranges.entries()) {
        for (let i = Math.max(0, r.first); i <= r.last; i++) {
          const g = r.span.page.chars[i];
          if (!g?.ignorable || (k === join?.part && i === join.value.glyph)) continue;
          const confirmed = r.span.prep.joins.find((j) => j.glyph === i && i < r.last);
          if (!confirmed) return;
          (k ? nextInclude : include).add(i);
          hyphenation.push(describe('target', r.span.page, confirmed, 'removed'));
        }
      }
      if (join) {
        (join.part ? nextInclude : include).add(join.value.glyph);
        hyphenation.push(
          describe(
            'target',
            join.part ? end.page : first.page,
            join.value,
            join.reading,
            second?.page,
          ),
        );
      }
    }
    let position = null,
      geometryError = null;
    try {
      position = geometry(include, nextInclude);
      if (hyphenation.length)
        for (const [k, s] of spans.entries()) {
          const rects = k ? position.nextPageRects : position.rects;
          const back = rects ? selectedRange(s.page, rects, k ? nextInclude : include) : null;
          if (back?.start !== s.start || back.end !== s.end) throw new Error(REVERSE_ERROR);
        }
    } catch (e) {
      if (hyphenation.length) return;
      position = null;
      geometryError = String(e instanceof Error ? e.message : e);
    }
    if (full()) return;
    seen.add(id);
    const text = spans.map((s) => s.prep.raw.slice(s.start, s.end)).join(PAGE_BREAK);
    const candidate: Candidate = {
      id,
      pageIndex: first.page.index,
      pageLabel: first.page.label,
      start: first.start,
      end: first.end,
      text,
      prefix: before,
      suffix: after,
      method: text.replace(PAGE_BREAK, ' ') === source.text ? 'exact' : 'normalized',
      contextMatches,
      boundary: {
        left: compareEdge(
          sourceEdges.left,
          rangeEdges(first.prep.raw, first.start, first.end).left,
        ),
        right: compareEdge(sourceEdges.right, rangeEdges(end.prep.raw, end.start, end.end).right),
      },
      position,
      geometryError,
    };
    if (hyphenation.length) {
      candidate.hyphenation = hyphenation;
      candidate.printedText = printedText;
      result.sourcePrintedText = sourcePrintedText;
    }
    if (second)
      candidate.nextPage = { pageLabel: second.page.label, start: second.start, end: second.end };
    result.candidates.push(candidate);
  };

  const interrupted: (() => void)[] = [];
  /** Occurrences of the quote as the pages give it, on one page or across a page break. */
  const search = (needle: Needle) => {
    const n = needle.text;
    // A page break stands for exactly one space of the quote, so the quote can only be divided
    // between two pages at one of its spaces.
    const splits = [...spaceSplits(n)];
    for (const page of pages) {
      const prep = prepare(page),
        { raw, mapped, trail, trailLines } = prep;
      for (const offset of occurrences(mapped.text, n)) {
        const start = mapped.starts[offset],
          end = mapped.ends[offset + n.length - 1];
        // A substring inside a grapheme must not expand into additional meaningful symbols.
        if (start === undefined || end === undefined || normalize(raw.slice(start, end)).text !== n)
          continue;
        add([{ page, prep, start, end }], needle, (include) =>
          rangePosition(page, start, end, include),
        );
        if (result.truncated) return;
      }
      const next = byIndex.get(page.index + 1);
      if (!next || !trail || !splits.length) continue;
      const following = prepare(next);
      if (!following.lead) continue;
      // The direct continuation first; then the same quote with up to three other lines between
      // its parts at either page edge. The latter only explains a refusal, see below.
      const ends = [trail, ...trailLines.filter((cut) => cut.at !== trail.at)],
        starts = [
          following.lead,
          ...following.leadLines.filter((c) => c.at !== following.lead?.at),
        ];
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
              ).text !== n
            )
              continue;
            const spans: [Span, Span] = [
              { page, prep, start, end: ending.raw },
              { page: next, prep: following, start: starting.raw, end },
            ];
            if (ei || si) {
              if (!needle.joins.length && interrupted.length <= limit)
                interrupted.push(() =>
                  add(spans, needle, () => {
                    throw new Error(GAP_ERROR);
                  }),
                );
              continue;
            }
            add(spans, needle, (include, nextInclude) =>
              crossPagePosition(page, start, next, end, include, nextInclude),
            );
            if (result.truncated) return;
          }
        }
      }
    }
  };
  /**
   * Occurrences that exist only when a confirmed target hyphen is read differently from the page
   * text: removed where the page keeps it, or kept where the reader drops it.
   */
  const hyphenated = (needle: Needle) => {
    const n = needle.text,
      splits = [...spaceSplits(n)];
    for (const page of pages) {
      const prep = prepare(page),
        { raw, mapped } = prep;
      for (const { start, end, value, reading } of lineMatches(prep, n)) {
        add(
          [{ page, prep, start, end }],
          needle,
          (include) => rangePosition(page, start, end, include),
          { value, reading, part: 0 },
        );
        if (result.truncated) return;
      }
      const next = byIndex.get(page.index + 1);
      if (!next) continue;
      const following = prepare(next),
        lead = following.lead,
        trail = prep.trail;
      if (!lead || !trail) continue;
      const addAcross = (start: number, end: number, join: TargetJoin) => {
        const first: Span = { page, prep, start, end: trail.raw };
        if (join.value.pageBreak) {
          first.end = prep.stream.glyphEnds[join.value.glyph] ?? trail.raw;
          first.last = join.value.glyph;
        }
        add(
          [first, { page: next, prep: following, start: lead.raw, end }],
          needle,
          (include, nextInclude) => crossPagePosition(page, start, next, end, include, nextInclude),
          join,
        );
      };
      // A word can divide inside either page of a selection that crosses at a space.
      for (const { head, tail } of splits) {
        const tailEnd = following.mapped.ends[lead.at + tail.length - 1];
        if (
          prep.joins.length &&
          tailEnd !== undefined &&
          normalize(following.raw.slice(lead.raw, tailEnd)).text === tail
        ) {
          for (const hit of lineMatches(prep, head)) {
            if (hit.end === trail.raw) addAcross(hit.start, tailEnd, { ...hit, part: 0 });
            if (result.truncated) return;
          }
        }
        const headStart = mapped.starts[trail.at - head.length];
        if (
          following.joins.length &&
          headStart !== undefined &&
          normalize(raw.slice(headStart, trail.raw)).text === head
        ) {
          for (const hit of lineMatches(following, tail)) {
            if (hit.start === lead.raw) addAcross(headStart, hit.end, { ...hit, part: 1 });
            if (result.truncated) return;
          }
        }
      }
      const edge = prep.edge;
      if (!edge || !continuesOn(page, edge, next)) continue;
      const segment = (edge.ignorable ? '' : edge.mark) + PAGE_BREAK;
      for (const option of readings(edge, segment)) {
        if (option.text === segment || !option.reading) continue;
        for (const { head, tail } of splitsAround(
          n,
          option.text,
          mapped.text,
          edge.before,
          following.mapped.text,
          lead.at,
        )) {
          const start = mapped.starts[edge.before - head],
            end = following.mapped.ends[lead.at + tail - 1];
          if (start === undefined || end === undefined) continue;
          const text =
            raw.slice(start, edge.from) + option.text + following.raw.slice(lead.raw, end);
          if (normalize(text).text !== n) continue;
          addAcross(start, end, { value: edge, reading: option.reading, part: 0 });
          if (result.truncated) return;
        }
      }
    }
  };
  for (const needle of needles) if (!result.truncated) search(needle);
  for (const needle of needles) if (!result.truncated) hyphenated(needle);
  // Two halves that meet only when lines are skipped are weak evidence: ordinary lines of text can
  // lie between them as well as a header or footer. They never compete with a real occurrence and
  // are listed, without a position, only when the quote was found nowhere else.
  if (!result.candidates.length) for (const list of interrupted) if (!result.truncated) list();
  if (!result.candidates.length) {
    result.status = 'not found';
    result.reason = pages.every((p) => !p.chars.some((c) => !c.ignorable && c.c))
      ? 'The target PDF has no usable text layer. OCR is not supported.'
      : 'No exact or conservatively normalized quote on one target page or across two adjacent target pages.';
  } else {
    // A text occurrence is not yet a recommended transfer: a quote that changed the word or number
    // boundary of the source selection, or that needs a line-end hyphen read differently, stays
    // listed, but is never recommended. Doubtful occurrences still count toward ambiguity, so
    // they cannot make another occurrence look unique.
    const contextual = result.candidates.filter((c) => c.contextMatches);
    const preferred =
      result.candidates.length === 1
        ? result.candidates[0]
        : contextual.length === 1
          ? contextual[0]
          : undefined;
    const hyphens = result.candidates.filter((c) => c.hyphenation).length;
    const needsChoice = result.candidates.length > 1 && hyphens > 0;
    const recommendable = preferred && !needsChoice && !doubtful(preferred) ? preferred : undefined;
    result.status = result.truncated
      ? 'multiple candidates'
      : needsChoice
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
        ? hyphens
          ? 'The line-end hyphen may belong to the word. Compare both PDFs and confirm the location manually.'
          : 'The quote occurs only where the word or number boundary differs from the source selection; no transfer is recommended. Check the PDF before choosing one manually.'
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
