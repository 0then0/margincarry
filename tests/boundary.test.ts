import assert from 'node:assert/strict';
import test from 'node:test';
import { propose } from '../src/matching.ts';
import type { Annotation, Glyph, Page, Proposal } from '../src/model.ts';

// Independent synthetic layout: every code point is one glyph with a 7-unit box; '\n' starts a line
// 20 units lower. A rectangle at code point index i therefore spans x = 10 + 7 * i.
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
    const r: [number, number, number, number] = [x, y, x + 7, y + 10];
    chars.push({ c, rect: r, inlineRect: [...r] });
    x += 7;
  }
  return { index, label: String(index + 1), chars, viewBox: [0, 0, 612, 792] };
}
/** Propose a transfer of `quote`, selected where it first occurs in `oldText`, into `newPages`. */
function transfer(oldText: string, quote: string, ...newPages: (string | Page)[]): Proposal {
  const at = Array.from(oldText.slice(0, oldText.indexOf(quote))).length;
  assert.ok(oldText.includes(quote), `fixture: ${quote} is in the source page`);
  const width = Array.from(quote).length;
  const source: Annotation = {
    key: 'SOURCE01',
    type: 'highlight',
    text: quote,
    comment: '',
    color: '#ffd400',
    tags: [],
    position: { pageIndex: 0, rects: [[10 + 7 * at, 700, 10 + 7 * (at + width), 710]] },
    external: false,
    fingerprint: 'source',
  };
  return propose(
    source,
    page(oldText),
    newPages.map((p, i) => (typeof p === 'string' ? page(p, i) : p)),
  );
}
/** What the Select unique proposals button takes: a unique status with a recommended location. */
const massSelectable = (p: Proposal) => p.status === 'unique candidate' && p.recommendedID !== null;

test('a quote surviving only inside a longer word or number is doubtful, not unique', () => {
  for (const [quote, changed, rect] of [
    ['41.0', 'value 41.03 here', [loc(6, 10)]],
    ['cat', 'concatenate', [loc(3, 6)]],
    ['not', 'cannot', [loc(3, 6)]],
  ] as const) {
    const old = quote === '41.0' ? 'value 41.0 here' : quote;
    const p = transfer(old, quote, changed);
    assert.equal(p.status, 'doubtful candidate', quote);
    assert.equal(p.recommendedID, null, quote);
    assert.equal(massSelectable(p), false, quote);
    // The occurrence is kept for a person to inspect, with exact glyph geometry.
    assert.equal(p.candidates.length, 1, quote);
    assert.equal(p.candidates[0]!.text, quote);
    assert.deepEqual(p.candidates[0]!.position?.rects, rect, quote);
    assert.match(p.reason, /word or number boundary differs/, quote);
  }
});
function loc(from: number, to: number): [number, number, number, number] {
  return [10 + 7 * from, 700, 10 + 7 * to, 710];
}

test('unchanged quotes remain unique and recommended with the exact rectangle', () => {
  for (const [quote, text, rect] of [
    ['41.0', 'value 41.0 here', loc(6, 10)],
    ['cat', 'cat', loc(0, 3)],
    ['not', 'it is not so', loc(6, 9)],
  ] as const) {
    const p = transfer(text, quote, text);
    assert.equal(p.status, 'unique candidate', quote);
    assert.equal(p.candidates[0]!.id === p.recommendedID, true, quote);
    assert.deepEqual(p.candidates[0]!.position?.rects, [rect], quote);
    assert.equal(massSelectable(p), true, quote);
  }
});

test('expansion on either side of a closed word or number is doubtful', () => {
  for (const [old, quote, changed] of [
    ['a cat sat', 'cat', 'a bobcat sat'],
    ['a cat sat', 'cat', 'a cats sat'],
    ['a cat sat', 'cat', 'a bobcats sat'],
    ['p = 5 here', '5', 'p = -5 here'],
    ['p = 5 here', '5', 'p = +5 here'],
    ['p = 5 here', '5', 'p = 0.5 here'],
    ['p = 41 here', '41', 'p = 41.5 here'],
    ['p = 41 here', '41', 'p = 41,5 here'],
    ['p = 4.1 here', '4.1', 'p = 4.1.2 here'],
    ['it can do', 'can', "it can't do"],
    ['it can do', 'can', 'it can’t do'],
    ['p < 0.05 here', '0.05', 'p < 0.052 here'],
    ['v 10 here', '10', 'v 10² here'],
    ['a snake b', 'snake', 'a snake_case b'],
  ]) {
    const p = transfer(old, quote, changed);
    assert.equal(p.status, 'doubtful candidate', `${quote} -> ${changed}`);
    assert.equal(massSelectable(p), false, `${quote} -> ${changed}`);
  }
});

test('ordinary punctuation, ranges and sentence ends do not count as expansion', () => {
  for (const [old, quote, changed] of [
    ['a cat sat', 'cat', 'a (cat) sat'],
    ['a cat sat', 'cat', 'a cat, sat'],
    ['a cat sat', 'cat', 'a cat. Sat'],
    ['p = 41 here', '41', 'It was 41. Next'],
    ['p = 41 here', '41', 'p = 41, 42'],
    ['p = 7 here', '7', 'pages 5-7'],
    ['p = 5 here', '5', 'x-5'],
    ['p = 5 here', '5', 'tags 5/6'],
    ['p < 0.05 here', '0.05', 'p < 0.05.'],
    ['a cat sat', 'cat', 'a cat\nsat'],
    ['a cat sat', 'cat', 'a😀cat😀sat'],
  ]) {
    const p = transfer(old, quote, changed);
    assert.equal(p.status, 'unique candidate', `${quote} -> ${changed}`);
    assert.equal(massSelectable(p), true, `${quote} -> ${changed}`);
  }
});

test('the quote at the very start or end of the page has no boundary evidence against it', () => {
  for (const [old, changed] of [
    ['cat sat', 'cat'],
    ['sat cat', 'cat'],
    ['cat sat', 'cat sat on it'],
    ['a cat', 'one more cat'],
  ]) {
    const p = transfer(old, 'cat', changed);
    assert.equal(p.status, 'unique candidate', changed);
    assert.equal(massSelectable(p), true, changed);
  }
});

test('an intentional partial selection is kept only while its surrounding word is the same', () => {
  const old = 'we concatenate strings';
  const kept = transfer(old, 'cat', 'later: we concatenate strings now');
  assert.equal(kept.status, 'unique candidate');
  assert.deepEqual(kept.candidates[0]!.position?.rects, [loc(13, 16)]);
  assert.equal(massSelectable(kept), true);

  // Same fragment, but it now belongs to a different word.
  for (const changed of ['we category strings', 'we cat strings', 'we bobcat strings']) {
    const p = transfer(old, 'cat', changed);
    assert.equal(p.status, 'doubtful candidate', changed);
    assert.equal(massSelectable(p), false, changed);
  }

  // A partial number: the same longer number is preserved, a different one is not.
  const number = 'x = 41.03 mm';
  assert.equal(transfer(number, '41.0', 'y = 41.03 cm').status, 'unique candidate');
  assert.equal(transfer(number, '41.0', 'y = 41.07 cm').status, 'doubtful candidate');
  assert.equal(transfer(number, '41.0', 'y = 41.0 cm').status, 'doubtful candidate');
});

test('a partial selection of one side does not constrain the other side', () => {
  // Starts mid-word ("ould"), ends at a word boundary.
  const old = 'it would be fine.';
  const p = transfer(old, 'ould be fine', 'x. it would be fine.');
  assert.equal(p.status, 'unique candidate');
  const bad = transfer(old, 'ould be fine', 'x. it should be fine.');
  assert.equal(bad.status, 'doubtful candidate');
  const right = transfer(old, 'ould be fine', 'it would be finer');
  assert.equal(right.status, 'doubtful candidate');
});

test('changed surrounding text does not prevent a correct transfer', () => {
  const changed = 'Intro was rewritten completely. A new key result is 41.0 here! Epilogue added.';
  const p = transfer(
    'The earlier sentence one. The key result is 41.0 here. Later sentence follows.',
    '41.0',
    changed,
  );
  assert.equal(p.status, 'unique candidate');
  assert.equal(p.candidates[0]!.contextMatches, false);
  assert.equal(massSelectable(p), true);
  const at = changed.indexOf('41.0');
  assert.deepEqual(p.candidates[0]!.position?.rects, [loc(at, at + 4)]);
});

test('a moved, unchanged or reflowed quote is recommended on its new page', () => {
  const moved = transfer('a cat sat', 'cat', 'unrelated', 'also unrelated', 'at last a cat sat');
  assert.equal(moved.status, 'unique candidate');
  assert.equal(moved.candidates[0]!.pageIndex, 2);
  const reflowed = transfer('the black cat sat', 'black cat', 'the black\ncat sat');
  assert.equal(reflowed.status, 'unique candidate');
  assert.deepEqual(reflowed.candidates[0]!.position?.rects, [
    [38, 700, 73, 710],
    [10, 680, 31, 690],
  ]);
});

test('doubtful occurrences never make another occurrence look unique', () => {
  // A stray standalone word among many longer words is not a recommendation.
  for (const [old, quote, changed] of [
    ['the sky is blue', 'is', 'this island is hers, their issue, miss'],
    ['we did not agree', 'not', 'cannot, notable, knot, and note: not here'],
    ['value 5 here', '5', 'v 15 and 25 and 5.5 and -5 and 5 end'],
    ['a cat sat', 'cat', 'concatenate the cat now'],
  ]) {
    const p = transfer(old, quote, changed);
    assert.equal(p.status, 'multiple candidates', changed);
    assert.equal(p.recommendedID, null, changed);
    assert.equal(massSelectable(p), false, changed);
    assert.ok(p.candidates.length > 1, changed);
  }
  // Doubtful occurrences stay flagged in the list.
  const p = transfer('a cat sat', 'cat', 'concatenate the cat now');
  assert.equal(p.candidates.find((c) => c.start === 3)?.boundary.left, 'expanded');
  assert.equal(p.candidates.find((c) => c.start === 16)?.boundary.left, 'kept');
});

test('a clean occurrence without geometry next to a doubtful one recommends nothing', () => {
  const broken = page('concatenate x cat');
  broken.chars[14]!.rotation = 90;
  const p = transfer('a cat b', 'cat', broken);
  assert.equal(p.status, 'multiple candidates');
  assert.equal(p.recommendedID, null);
});

test('two clean occurrences stay ambiguous; context still separates them', () => {
  const ambiguous = transfer('a cat sat', 'cat', 'a cat sat', 'one cat here', 'concatenate');
  assert.equal(ambiguous.status, 'multiple candidates');
  assert.equal(ambiguous.recommendedID, null);
  assert.equal(ambiguous.candidates.length, 3);

  const old = 'introduction needle reliable conclusion';
  const byContext = transfer(
    old,
    'needle',
    'introduction needle reliable conclusion',
    'other text needle different conclusion',
    'a needles page',
  );
  assert.equal(byContext.status, 'unique candidate');
  assert.equal(byContext.candidates.length, 3);
  assert.equal(byContext.candidates.find((c) => c.id === byContext.recommendedID)?.pageIndex, 0);
});

test('composed and decomposed forms, combining marks and supplementary letters', () => {
  // NFC folding of the quote itself is unchanged.
  const composed = transfer('un café ici', 'café', 'un café ici');
  assert.equal(composed.status, 'unique candidate');
  assert.deepEqual(composed.candidates[0]!.position?.rects, [loc(3, 8)]);
  // The neighbor is a letter in decomposed text as well.
  assert.equal(transfer('un café ici', 'café', 'un cafés ici').status, 'doubtful candidate');
  assert.equal(transfer('un café ici', 'café', 'un décafé ici').status, 'doubtful candidate');
  // A combining mark is never a free neighbor and cannot be split away.
  assert.equal(transfer('a e b', 'e', 'a é b').status, 'not found');
  // Supplementary mathematical letters are letters; emoji are not.
  const letter = String.fromCodePoint(0x1d4b3);
  assert.equal(transfer('a z b', 'z', `a ${letter} z b`).status, 'unique candidate');
  assert.equal(transfer('a z b', 'z', `a ${letter}z b`).status, 'doubtful candidate');
  assert.equal(transfer('a z b', 'z', `a${letter}z b`).status, 'doubtful candidate');
  assert.equal(transfer('a z b', 'z', `a z${letter} b`).status, 'doubtful candidate');
  const emoji = transfer('a z b', 'z', 'a😀z😀b');
  assert.equal(emoji.status, 'unique candidate');
  // UTF-16 offsets address the second code unit of the emoji pair; geometry uses glyphs.
  const mapped = transfer('a z b', 'z', '😀 cat z');
  assert.equal(mapped.candidates[0]!.id, '0:7:8');
  assert.deepEqual(mapped.candidates[0]!.position?.rects, [loc(6, 7)]);
});

test('Cyrillic words are letters, case and endings are significant', () => {
  assert.equal(transfer('там кот спит', 'кот', 'на кот сидел').status, 'unique candidate');
  assert.equal(transfer('там кот спит', 'кот', 'там котёл').status, 'doubtful candidate');
  assert.equal(transfer('там кот спит', 'кот', 'там кота').status, 'doubtful candidate');
  assert.equal(transfer('там кот спит', 'кот', 'там Кот').status, 'not found');
  const negated = transfer('так рекомендуется', 'рекомендуется', 'так нерекомендуется');
  assert.equal(negated.status, 'doubtful candidate');
  assert.equal(massSelectable(negated), false);
});

test('scripts written without word delimiters are not guessed', () => {
  // The quote sits inside an unbroken CJK run on both pages: no boundary evidence either way.
  const ja = transfer('これは猫です', '猫', 'それは猫でした');
  assert.equal(ja.status, 'unique candidate');
  assert.match(ja.reason, /word boundaries cannot be checked/);
  assert.deepEqual(ja.candidates[0]!.position?.rects, [loc(3, 4)]);
  const zh = transfer('我们认为这是正确的。', '这是', '他们认为这是错误的。');
  assert.equal(zh.status, 'unique candidate');
  assert.match(zh.reason, /word boundaries cannot be checked/);
  // Without any match the text is still simply not found.
  assert.equal(transfer('これは猫です', '猫', 'それは犬です').status, 'not found');
  // A script change is an ordinary boundary: Latin text inside CJK needs no space.
  const mixed = transfer('使用 Python 进行', 'Python', '使用Python进行');
  assert.equal(mixed.status, 'unique candidate');
  assert.doesNotMatch(mixed.reason, /cannot be checked/);
  // Latin letters next to Latin letters are still a longer word.
  assert.equal(
    transfer('使用 Python 进行', 'Python', '使用Pythonic进行').status,
    'doubtful candidate',
  );
  // A numeral keeps its own boundary next to ideographs.
  assert.equal(transfer('共 41 个', '41', '共41个').status, 'unique candidate');
  assert.equal(transfer('共 41 个', '41', '共410个').status, 'doubtful candidate');
});

test('hyphenated compounds are read as separate words, like the Unicode word rules', () => {
  // Documented limit: a hyphen is an ordinary boundary.
  assert.equal(transfer('a well done', 'well', 'a well-known').status, 'unique candidate');
});

test('a frequent standalone word stays an ambiguous, unrecommended choice', () => {
  const p = transfer('a cat', 'a', 'a a a a a');
  assert.equal(p.status, 'multiple candidates');
  assert.equal(p.recommendedID, null);
  assert.equal(p.candidates.length, 5);
});
