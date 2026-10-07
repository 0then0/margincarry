import { rangePosition, sourceRange } from './geometry.ts';
import type { Annotation, Candidate, Page, Proposal } from './model.ts';
import type { MappedText } from './text.ts';
import { normalize, occurrences, pageText } from './text.ts';
export interface PreparedPage {
  raw: string;
  mapped: MappedText;
}
export function preparePage(page: Page): PreparedPage {
  const raw = pageText(page).text;
  return { raw, mapped: normalize(raw) };
}

export function propose(
  source: Annotation,
  oldPage: Page | undefined,
  pages: Page[],
  limit = 200,
  prepared?: ReadonlyMap<number, PreparedPage>,
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
  let anchor: { start: number; end: number };
  try {
    anchor = sourceRange(oldPage, source.position, source.text);
  } catch (e) {
    result.reason = String(e instanceof Error ? e.message : e);
    return result;
  }
  const oldText = pageText(oldPage).text;
  result.sourcePrefix = oldText.slice(Math.max(0, anchor.start - 80), anchor.start);
  result.sourceSuffix = oldText.slice(anchor.end, anchor.end + 80);
  const prefix = normalize(result.sourcePrefix).text,
    suffix = normalize(result.sourceSuffix).text;
  const needle = normalize(source.text).text;
  if (!needle) {
    result.reason = 'Empty source text.';
    return result;
  }
  for (const page of pages) {
    const { raw, mapped } = prepared?.get(page.index) ?? preparePage(page);
    const found = occurrences(
      mapped.text,
      needle,
      Math.max(0, limit - result.candidates.length),
      (offset) => {
        const start = mapped.starts[offset],
          end = mapped.ends[offset + needle.length - 1];
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
      const text = raw.slice(start, end),
        before = raw.slice(Math.max(0, start - 100), start),
        after = raw.slice(end, end + 100);
      // A substring inside a grapheme must not expand into additional meaningful symbols.
      if (normalize(text).text !== needle) continue;
      const contextMatches =
        prefix.length + suffix.length >= 16 &&
        (!prefix || normalize(before).text.endsWith(prefix)) &&
        (!suffix || normalize(after).text.startsWith(suffix));
      let position = null,
        geometryError = null;
      try {
        position = rangePosition(page, start, end);
      } catch (e) {
        geometryError = String(e instanceof Error ? e.message : e);
      }
      const candidate: Candidate = {
        id: `${page.index}:${start}:${end}`,
        pageIndex: page.index,
        pageLabel: page.label,
        start,
        end,
        text,
        prefix: before,
        suffix: after,
        method: text === source.text ? 'exact' : 'normalized',
        contextMatches,
        position,
        geometryError,
      };
      result.candidates.push(candidate);
    }
  }
  if (!result.candidates.length) {
    result.status = 'not found';
    result.reason = pages.every((p) => !p.chars.some((c) => !c.ignorable && c.c))
      ? 'The target PDF has no usable text layer. OCR is outside v0.1.'
      : 'No exact or conservatively normalized quote on a single target page.';
  } else {
    const contextual = result.candidates.filter((c) => c.contextMatches);
    const preferred =
      result.candidates.length === 1
        ? result.candidates[0]
        : contextual.length === 1
          ? contextual[0]
          : undefined;
    result.status = !result.truncated && preferred ? 'unique candidate' : 'multiple candidates';
    result.recommendedID = !result.truncated && preferred?.position ? preferred.id : null;
    result.reason = result.truncated
      ? `Candidate list limited to ${limit}; uniqueness is unknown.`
      : contextual.length === 1 && result.candidates.length > 1
        ? 'One occurrence matches the complete available context; alternatives are retained.'
        : result.candidates.length === 1
          ? 'One text occurrence; verify the PDF position.'
          : 'Several occurrences require a human choice.';
    if (!result.candidates.some((c) => c.position)) {
      result.status = 'processing error';
      result.reason = 'Text found, but none of the occurrences has reliable geometry.';
    }
  }
  return result;
}
