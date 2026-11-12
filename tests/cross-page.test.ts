import assert from 'node:assert/strict';
import test from 'node:test';
import { crossPagePosition, rangePosition, sourceRange } from '../src/geometry.ts';
import { preparePage, propose } from '../src/matching.ts';
import type { Annotation, Glyph, Page, Rect } from '../src/model.ts';

// Independent synthetic layout: every code point, spaces included, is one glyph with a 7-unit box.
// '\n' starts a line 20 units lower. Expected rectangles below are written from these numbers, not
// read back from the matcher: code points `from`..`to` of line `line` span x = 10 + 7 * index.
function page(text: string, index = 0): Page {
  const chars: Glyph[] = [];
  let x = 10,
    y = 700;
  for (const c of text) {
    if (c === '\n') {
      if (chars.length) chars.at(-1)!.lineBreakAfter = true;
      x = 10;
      y -= 20;
      continue;
    }
    const r: Rect = [x, y, x + 7, y + 10];
    chars.push({ c, rect: r, inlineRect: [...r] });
    x += 7;
  }
  return { index, label: String(index + 1), chars, viewBox: [0, 0, 612, 792] };
}
const at = (from: number, to: number, line = 0): Rect => [
  10 + 7 * from,
  700 - 20 * line,
  10 + 7 * to,
  710 - 20 * line,
];
function source(text: string, rects: Rect[], nextPageRects?: Rect[]): Annotation {
  return {
    key: 'SOURCE01',
    type: 'highlight',
    text,
    comment: 'my comment',
    color: '#ffd400',
    tags: ['test'],
    position: nextPageRects ? { pageIndex: 0, rects, nextPageRects } : { pageIndex: 0, rects },
    external: false,
    fingerprint: 'source',
  };
}
/** Marks the glyphs of the last line as lying outside the content area, as the reader does. */
function isolateLastLine(p: Page): Page {
  let i = p.chars.length - 1;
  while (i >= 0 && !p.chars[i]!.lineBreakAfter) p.chars[i--]!.isolated = true;
  return p;
}
function isolateFirstLine(p: Page): Page {
  for (const g of p.chars) {
    g.isolated = true;
    if (g.lineBreakAfter) break;
  }
  return p;
}

// 'alpha beta' selected on one page: code points 6..16 of 'intro alpha beta outro'.
const onePage = () => page('intro alpha beta outro');
const oneSource = () => source('alpha beta', [at(6, 16)]);
// The same words divided by a page break: 'alpha' ends page 1, 'beta' starts page 2.
const firstHalf = (index = 0) => page('first line\nintro alpha', index);
const secondHalf = (index = 1) => page('beta outro', index);
const twoSource = () => source('alpha beta', [at(6, 11, 1)], [at(0, 4)]);

test('one page to two adjacent pages keeps one position with separate rectangles per page', () => {
  const r = propose(oneSource(), onePage(), [firstHalf(3), secondHalf(4)]);
  assert.equal(r.status, 'unique candidate');
  assert.equal(r.candidates.length, 1);
  const c = r.candidates[0]!;
  assert.equal(r.recommendedID, c.id);
  assert.deepEqual(c.position, {
    pageIndex: 3,
    rects: [at(6, 11, 1)],
    nextPageRects: [at(0, 4)],
  });
  assert.equal(c.pageIndex, 3);
  assert.equal(c.pageLabel, '4');
  assert.deepEqual(c.nextPage, { pageLabel: '5', start: 0, end: 4 });
  // The page break is explicit in the candidate text and stands for the one space of the quote.
  assert.equal(c.text, 'alpha\fbeta');
  assert.equal(c.method, 'exact');
  assert.deepEqual(c.boundary, { left: 'kept', right: 'kept' });
});

test('two adjacent pages to one page verifies both source parts and gives one rectangle', () => {
  const r = propose(twoSource(), firstHalf(), [onePage()], 200, undefined, secondHalf());
  assert.equal(r.status, 'unique candidate');
  assert.deepEqual(r.candidates[0]!.position, { pageIndex: 0, rects: [at(6, 16)] });
  assert.equal(r.candidates[0]!.nextPage, undefined);
  assert.equal(r.sourceNextPageLabel, '2');
  // Context is taken outside the whole selection: before its first part and after its last.
  assert.equal(r.sourcePrefix, 'first line\nintro ');
  assert.equal(r.sourceSuffix, ' outro');
});

test('two adjacent pages to two adjacent pages follows the new page break', () => {
  const s = source('alpha beta gamma', [at(2, 7)], [at(0, 10)]);
  const r = propose(
    s,
    page('x alpha'),
    [page('t alpha beta', 3), page('gamma y', 4)],
    200,
    undefined,
    page('beta gamma y', 1),
  );
  assert.equal(r.status, 'unique candidate');
  assert.deepEqual(r.candidates[0]!.position, {
    pageIndex: 3,
    rects: [at(2, 12)],
    nextPageRects: [at(0, 5)],
  });
});

test('single-page matching is unchanged and a page pair adds no duplicate occurrence', () => {
  const whole = propose(oneSource(), onePage(), [onePage(), page('intro alpha beta outro', 1)]);
  assert.deepEqual(
    whole.candidates.map((c) => [c.id, c.nextPage]),
    [
      ['0:6:16', undefined],
      ['1:6:16', undefined],
    ],
  );
  assert.equal(whole.status, 'multiple candidates');
  // Three consecutive pages: the quote crosses only the first break, and is listed once.
  const three = propose(oneSource(), onePage(), [page('alpha'), page('beta', 1), page('gamma', 2)]);
  assert.deepEqual(
    three.candidates.map((c) => c.id),
    ['0:0:5+0:4'],
  );
});

test('the source must cover the end of its first page and the start of its second', () => {
  const run = (s: Annotation, a = firstHalf(), b = secondHalf()) =>
    propose(s, a, [onePage()], 200, undefined, b);
  // The second part starts at the second word of the next page.
  const late = run(source('alpha outro', [at(6, 11, 1)], [at(5, 10)]));
  assert.equal(late.status, 'unsupported');
  assert.match(late.reason, /does not continue directly/);
  // The first part stops before the end of its page.
  const early = run(source('intro beta', [at(0, 5, 1)], [at(0, 4)]));
  assert.equal(early.status, 'unsupported');
  assert.match(early.reason, /does not continue directly/);
  // A hole on the second page.
  const hole = run(source('alpha be outro', [at(6, 11, 1)], [at(0, 2), at(5, 10)]));
  assert.equal(hole.status, 'unsupported');
  assert.match(hole.reason, /Discontinuous/);
  // The quote names only the first part, or text that is not under the rectangles.
  for (const text of ['alpha', 'alpha gamma']) {
    const r = run(source(text, [at(6, 11, 1)], [at(0, 4)]));
    assert.equal(r.status, 'unsupported', text);
    assert.match(r.reason, /text and source geometry disagree/, text);
    assert.deepEqual(r.candidates, [], text);
  }
  // Rectangles that point at nothing on the second page.
  const empty = run(source('alpha beta', [at(6, 11, 1)], [[300, 300, 320, 310]]));
  assert.equal(empty.status, 'unsupported');
  assert.match(empty.reason, /Not every source rectangle maps to text/);
});

test('invalid rectangles on either page are rejected', () => {
  for (const bad of [[[10, 700, Number.NaN, 710]], [[38, 700, 10, 710]]] as Rect[][]) {
    const second = propose(
      source('alpha beta', [at(6, 11, 1)], bad),
      firstHalf(),
      [onePage()],
      200,
      undefined,
      secondHalf(),
    );
    assert.equal(second.status, 'unsupported');
    assert.equal(second.reason, 'Invalid source rectangles.');
    const first = propose(
      source('alpha beta', bad, [at(0, 4)]),
      firstHalf(),
      [onePage()],
      200,
      undefined,
      secondHalf(),
    );
    assert.equal(first.reason, 'Invalid source rectangles.');
  }
  assert.throws(
    () =>
      sourceRange(
        firstHalf(),
        { pageIndex: 0, rects: [at(6, 11, 1)], nextPageRects: 'x' as unknown as Rect[] },
        'alpha beta',
        secondHalf(),
      ),
    /Invalid source rectangles/,
  );
});

test('a missing second source page is a visible processing error, not a one-page match', () => {
  const r = propose(twoSource(), firstHalf(), [onePage(), firstHalf(3), secondHalf(4)]);
  assert.equal(r.status, 'processing error');
  assert.equal(r.reason, 'The second source page could not be extracted.');
  assert.deepEqual(r.candidates, []);
  assert.equal(r.recommendedID, null);
});

test('a page break stands for exactly one space of the quote', () => {
  // Line breaks and repeated spaces around the break fold as they do inside a page.
  const spaced = propose(source('alpha  \n beta', [at(6, 16)]), onePage(), [
    page('intro alpha ', 0),
    page(' beta outro', 1),
  ]);
  assert.equal(spaced.status, 'unique candidate');
  assert.equal(spaced.candidates[0]!.method, 'normalized');
  // The trailing and leading space glyphs belong to the pages' text, as in a native selection.
  assert.deepEqual(spaced.candidates[0]!.position, {
    pageIndex: 0,
    rects: [at(6, 12)],
    nextPageRects: [at(0, 5)],
  });
  // No space is removed: a word written in one piece does not match two pieces on two pages...
  const joined = propose(source('alphabeta', [at(0, 9)]), page('alphabeta'), [
    page('alpha'),
    page('beta', 1),
  ]);
  assert.equal(joined.status, 'not found');
  // ...and no space is dropped when two words on two pages meet a single joined word.
  const split = propose(
    source('alpha beta', [at(0, 5)], [at(0, 4)]),
    page('alpha'),
    [page('alphabeta')],
    200,
    undefined,
    page('beta', 1),
  );
  assert.equal(split.status, 'not found');
});

test('a changed number, punctuation or negation across the break is not found', () => {
  for (const [quote, first, second] of [
    ['value 41.0 holds', 'value', '41.2 holds'],
    ['value 41.0 holds', 'value 41,0', 'holds'],
    ['alpha, beta', 'alpha', 'beta'],
    ['is not valid', 'is', 'valid'],
    ['is valid', 'is not', 'valid'],
    ['a−b c', 'a-b', 'c'],
  ] as const) {
    const s = source(quote, [at(0, Array.from(quote).length)]);
    const r = propose(s, page(quote), [page(first), page(second, 1)]);
    assert.equal(r.status, 'not found', `${first} | ${second}`);
    assert.deepEqual(r.candidates, [], `${first} | ${second}`);
  }
  // The control: the same text unchanged is found.
  const same = propose(source('value 41.0 holds', [at(0, 16)]), page('value 41.0 holds'), [
    page('value'),
    page('41.0 holds', 1),
  ]);
  assert.equal(same.status, 'unique candidate');
});

test('a ligature or combining sequence at the break is never selected in part', () => {
  // Page 1 ends with one 'fi' glyph. A quote that starts at its 'i' has no whole-glyph geometry.
  const ligature = page('x');
  ligature.chars[0]!.c = 'fi';
  const inside = propose(source('i beta', [at(0, 6)]), page('i beta'), [ligature, page('beta', 1)]);
  assert.equal(inside.status, 'processing error');
  assert.equal(inside.candidates[0]!.position, null);
  assert.match(inside.candidates[0]!.geometryError ?? '', /complete PDF glyphs/);
  // The whole ligature transfers, as one glyph rectangle.
  const whole = propose(source('fi beta', [at(0, 7)]), page('fi beta'), [
    ligature,
    page('beta', 1),
  ]);
  assert.deepEqual(whole.candidates[0]!.position, {
    pageIndex: 0,
    rects: [at(0, 1)],
    nextPageRects: [at(0, 4)],
  });
  // Page 2 starts with e + combining acute. 'alpha e' must not match and leave the accent behind.
  const accented = page('é beta', 1);
  const bare = propose(source('alpha e', [at(0, 7)]), page('alpha e'), [page('alpha'), accented]);
  assert.equal(bare.status, 'not found');
  const composed = propose(source('alpha é', [at(0, 7)]), page('alpha é'), [
    page('alpha'),
    accented,
  ]);
  assert.equal(composed.status, 'unique candidate');
  assert.deepEqual(composed.candidates[0]!.position?.nextPageRects, [at(0, 2)]);
  // Page 1 ends with x and page 2 would add a combining mark to a quote that ends at the break.
  const marked = propose(source('alpha x', [at(0, 7)]), page('alpha x'), [
    page('alpha'),
    page('x̸ tail', 1),
  ]);
  assert.equal(marked.status, 'not found');
});

test('word boundaries are checked at the outer ends of the whole selection only', () => {
  // A deliberate selection inside words: 'pha beta gam' of 'alpha beta gamma'.
  const partial = source('pha beta gam', [at(2, 14)]);
  const old = page('alpha beta gamma');
  const kept = propose(partial, old, [page('alpha'), page('beta gamma', 1)]);
  assert.equal(kept.status, 'unique candidate');
  assert.deepEqual(kept.candidates[0]!.boundary, { left: 'kept', right: 'kept' });
  assert.deepEqual(kept.candidates[0]!.position, {
    pageIndex: 0,
    rects: [at(2, 5)],
    nextPageRects: [at(0, 8)],
  });
  // The same fragments inside other words are doubtful, on either outer end.
  const other = propose(partial, old, [page('sulpha'), page('beta gamut', 1)]);
  assert.equal(other.status, 'doubtful candidate');
  assert.deepEqual(other.candidates[0]!.boundary, { left: 'changed', right: 'changed' });
  assert.equal(other.recommendedID, null);
  // Whole words that survive only inside longer words on the two pages are doubtful as well.
  const longer = propose(oneSource(), onePage(), [page('zalpha'), page('betas', 1)]);
  assert.equal(longer.status, 'doubtful candidate');
  assert.deepEqual(longer.candidates[0]!.boundary, { left: 'expanded', right: 'expanded' });
  // A source that crosses a page break has free outer ends; the break itself is not an end.
  const crossing = propose(twoSource(), firstHalf(), [onePage()], 200, undefined, secondHalf());
  assert.deepEqual(crossing.candidates[0]!.boundary, { left: 'kept', right: 'kept' });
});

test('a footer, header or page number between the parts is refused with its reason', () => {
  for (const [name, pages] of [
    ['page number', [page('intro alpha\n7'), secondHalf()]],
    ['footer', [page('intro alpha\nJournal of Tests\n7'), secondHalf()]],
    ['header', [page('intro alpha'), page('Running head\nbeta outro', 1)]],
    ['both', [page('intro alpha\n7'), page('Running head\nbeta outro', 1)]],
  ] as const) {
    const r = propose(oneSource(), onePage(), [...pages]);
    assert.equal(r.status, 'processing error', name);
    assert.match(r.reason, /header, footer or page number, lies between its two parts/, name);
    assert.equal(r.recommendedID, null, name);
    assert.equal(r.candidates.length, 1, name);
    assert.equal(r.candidates[0]!.position, null, name);
    assert.equal(r.candidates[0]!.geometryError, r.reason, name);
    assert.ok(r.candidates[0]!.nextPage, name);
  }
  // It only explains a refusal. Next to a real occurrence it is not listed, so that halves which
  // merely end one page and start the next cannot make a unique quote look ambiguous.
  const also = propose(oneSource(), onePage(), [
    page('intro alpha\n7'),
    secondHalf(),
    page('intro alpha beta outro', 5),
  ]);
  assert.equal(also.status, 'unique candidate');
  assert.deepEqual(
    also.candidates.map((c) => c.id),
    ['5:6:16'],
  );
  assert.equal(also.recommendedID, '5:6:16');
  // Unrelated halves that only meet when most of both pages is skipped are not an occurrence.
  const far = propose(oneSource(), onePage(), [
    page('intro alpha\na\nb\nc\nd'),
    page('e\nf\ng\nh\nbeta outro', 1),
  ]);
  assert.equal(far.status, 'not found');
});

test('glyphs the reader marks as isolated are dropped at the page edge only on other lines', () => {
  // Footer and header lie outside the content area and on lines of their own.
  const first = isolateLastLine(page('intro alpha\n7'));
  const second = isolateFirstLine(page('Running head\nbeta outro', 1));
  const r = propose(oneSource(), onePage(), [first, second]);
  assert.equal(r.status, 'unique candidate');
  assert.deepEqual(r.candidates[0]!.position, {
    pageIndex: 0,
    rects: [at(6, 11)],
    nextPageRects: [at(0, 4, 1)],
  });
  assert.equal(r.candidates[0]!.text, 'alpha\fbeta');
  // Isolated text on the line of the selection is not a footer: refuse.
  const inline = page('intro alpha 7');
  inline.chars.at(-1)!.isolated = true;
  inline.chars.at(-2)!.isolated = true;
  const same = propose(oneSource(), onePage(), [inline, secondHalf()]);
  assert.equal(same.status, 'processing error');
  assert.match(same.reason, /lies between its two parts/);
  // An isolated glyph inside a part is never skipped.
  const inside = page('intro alpha');
  inside.chars[8]!.isolated = true;
  const middle = propose(oneSource(), onePage(), [inside, secondHalf()]);
  assert.equal(middle.status, 'processing error');
  assert.match(middle.candidates[0]!.geometryError ?? '', /Isolated/);
  // A source whose rectangles stop before an isolated footer is a continuous selection.
  const native = propose(
    source('alpha beta', [at(6, 11)], [at(0, 4, 1)]),
    first,
    [onePage()],
    200,
    undefined,
    second,
  );
  assert.equal(native.status, 'unique candidate');
  assert.deepEqual(native.candidates[0]!.position, { pageIndex: 0, rects: [at(6, 16)] });
});

test('a page number that the selection itself covers is part of the quote', () => {
  // Without an isolation mark the reader selects the page number too: quote and rectangles agree.
  const first = page('intro alpha\n7'),
    s = source('alpha 7 beta', [at(6, 11), at(0, 1, 1)], [at(0, 4)]);
  const same = propose(
    s,
    first,
    [page('intro alpha\n7', 2), secondHalf(3)],
    200,
    undefined,
    secondHalf(),
  );
  assert.equal(same.status, 'unique candidate');
  assert.deepEqual(same.candidates[0]!.position, {
    pageIndex: 2,
    rects: [at(6, 11), at(0, 1, 1)],
    nextPageRects: [at(0, 4)],
  });
  // The number is text like any other: it is not removed to match a page without it.
  for (const pages of [[onePage()], [page('intro alpha\n8'), secondHalf()]]) {
    const r = propose(s, first, pages, 200, undefined, secondHalf());
    assert.equal(r.status, 'not found');
  }
});

test('a line-end hyphen at the page break is ambiguous and never transferred', () => {
  const hyphenated = () => {
    const p = page('intro al-');
    Object.assign(p.chars.at(-1)!, { ignorable: true, lineBreakAfter: true });
    return p;
  };
  const target = propose(source('intro al pha', [at(0, 12)]), page('intro al pha'), [
    hyphenated(),
    page('pha beta', 1),
  ]);
  assert.equal(target.status, 'processing error');
  assert.match(target.candidates[0]!.geometryError ?? '', /line-end hyphen/);
  const origin = propose(
    source('al pha', [at(6, 8)], [at(0, 3)]),
    hyphenated(),
    [page('al pha')],
    200,
    undefined,
    page('pha beta', 1),
  );
  assert.equal(origin.status, 'unsupported');
  assert.match(origin.reason, /line-end hyphen/);
  // The hyphenated word is not silently joined either.
  const joined = propose(source('alpha', [at(0, 5)]), page('alpha'), [
    hyphenated(),
    page('pha beta', 1),
  ]);
  assert.equal(joined.status, 'not found');
});

test('occurrences on one page and across pages share ambiguity, context and the limit', () => {
  const pages = () => [page('alpha'), page('beta', 1), page('alpha', 2), page('beta', 3)];
  const both = propose(oneSource(), onePage(), pages());
  assert.equal(both.status, 'multiple candidates');
  assert.equal(both.recommendedID, null);
  assert.deepEqual(
    both.candidates.map((c) => c.id),
    ['0:0:5+0:4', '2:0:5+0:4'],
  );
  const mixed = propose(oneSource(), onePage(), [
    page('alpha beta'),
    page('alpha', 1),
    page('beta', 2),
  ]);
  assert.equal(mixed.status, 'multiple candidates');
  assert.deepEqual(
    mixed.candidates.map((c) => !!c.nextPage),
    [false, true],
  );
  // A truncated list cannot establish uniqueness, whichever kind of occurrence was cut off.
  for (const list of [pages(), [page('alpha beta'), page('alpha', 1), page('beta', 2)]]) {
    const limited = propose(oneSource(), onePage(), list, 1);
    assert.equal(limited.truncated, true);
    assert.equal(limited.status, 'multiple candidates');
    assert.equal(limited.recommendedID, null);
    assert.equal(limited.candidates.length, 1);
    assert.match(limited.reason, /limited to 1/);
  }
  // Exactly as many occurrences as the limit is not a truncation.
  assert.equal(propose(oneSource(), onePage(), pages(), 2).truncated, false);
});

test('context belongs to the outer ends of a selection that crosses pages', () => {
  const old = page('the long introduction alpha beta reliable conclusion here');
  const s = source('alpha beta', [at(22, 32)]);
  const r = propose(s, old, [
    page('other words alpha', 0),
    page('beta different ending', 1),
    page('the long introduction alpha', 2),
    page('beta reliable conclusion here', 3),
  ]);
  assert.equal(r.candidates.length, 2);
  assert.deepEqual(
    r.candidates.map((c) => c.contextMatches),
    [false, true],
  );
  assert.equal(r.status, 'unique candidate');
  assert.equal(r.recommendedID, r.candidates[1]!.id);
  assert.equal(r.candidates[1]!.prefix, 'the long introduction ');
  assert.equal(r.candidates[1]!.suffix, ' reliable conclusion here');
  // The source page number is not evidence: both occurrences are on other pages than the source.
  assert.equal(r.candidates[1]!.pageIndex, 2);
});

test('a second target page that is missing or only partly extracted leaves no ready candidate', () => {
  // Pages 0 and 2 are not adjacent: nothing joins them.
  const gap = propose(oneSource(), onePage(), [firstHalf(0), secondHalf(2)]);
  assert.equal(gap.status, 'not found');
  for (const which of [0, 1]) {
    const pages = [firstHalf(0), secondHalf(1)];
    pages[which]!.partial = true;
    const r = propose(oneSource(), onePage(), pages);
    assert.equal(r.status, 'processing error', String(which));
    assert.equal(r.candidates[0]!.position, null);
    assert.match(r.candidates[0]!.geometryError ?? '', /partial page data/);
    assert.equal(r.recommendedID, null);
  }
  // A page without any text cannot continue a selection.
  const blank = propose(oneSource(), onePage(), [firstHalf(0), page('', 1)]);
  assert.equal(blank.status, 'not found');
  // A glyph without usable geometry on the second page.
  const broken = secondHalf(1);
  broken.chars[1]!.inlineRect = [Number.NaN, 0, 0, 0];
  const r = propose(oneSource(), onePage(), [firstHalf(0), broken]);
  assert.equal(r.status, 'processing error');
  assert.equal(r.candidates[0]!.position, null);
});

test('both parts count toward the native position size limit', () => {
  const lines = Array.from({ length: 1900 }, () => 'ab').join('\n');
  const a = page(lines, 0),
    b = page(lines, 1);
  a.viewBox = b.viewBox = [0, -40000, 612, 792];
  const length = lines.length;
  assert.equal(rangePosition(a, 0, length).rects.length, 1900);
  assert.equal(rangePosition(b, 0, length).rects.length, 1900);
  assert.throws(() => crossPagePosition(a, 0, b, length), /position limit/);
  assert.equal(crossPagePosition(a, length - 2, b, 2).rects.length, 1);
});

test('positions of the two parts require adjacent pages and whole glyphs', () => {
  assert.throws(() => crossPagePosition(firstHalf(0), 17, secondHalf(2), 4), /geometry/);
  assert.throws(() => crossPagePosition(firstHalf(0), 17, secondHalf(1), 0), /complete PDF glyphs/);
  const p = crossPagePosition(firstHalf(0), 17, secondHalf(1), 4);
  assert.deepEqual(p, { pageIndex: 0, rects: [at(6, 11, 1)], nextPageRects: [at(0, 4)] });
  // Lines of one part stay separate rectangles; nothing is merged across the page break.
  const tall = crossPagePosition(page('a\nbb\nccc', 4), 0, page('dd\ne', 5), 4);
  assert.deepEqual(tall, {
    pageIndex: 4,
    rects: [at(0, 1), at(0, 2, 1), at(0, 3, 2)],
    nextPageRects: [at(0, 2), at(0, 1, 1)],
  });
});

test('prepared pages are reused for every annotation and give the same proposals', () => {
  const pages = [firstHalf(0), secondHalf(1), page('intro alpha beta outro', 2)];
  const prepared = new Map(pages.map((p) => [p.index, preparePage(p)]));
  const direct = propose(oneSource(), onePage(), pages);
  const reused = propose(oneSource(), onePage(), pages, 200, prepared);
  assert.deepEqual(reused, direct);
  assert.equal(direct.candidates.length, 2);
});
