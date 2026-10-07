import assert from 'node:assert/strict';
import test from 'node:test';
import { rangePosition, sourceRange } from '../src/geometry.ts';
import { propose } from '../src/matching.ts';
import type { Annotation, Glyph, Page, Position } from '../src/model.ts';
import { normalize, pageText } from '../src/text.ts';

// Independent synthetic layout: each code point has a known 7-unit box. Line starts reset x.
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
function source(
  text: string,
  rects: Position['rects'],
  extra: Partial<Annotation> = {},
): Annotation {
  return {
    key: 'SOURCE01',
    type: 'highlight',
    text,
    comment: 'my comment',
    color: '#ffd400',
    tags: ['test'],
    position: { pageIndex: 0, rects },
    external: false,
    fingerprint: 'source',
    ...extra,
  };
}
const needleSource = () => source('needle', [[10, 700, 52, 710]]);

test('identical document gives the independent complete rectangle', () => {
  const p = page('needle');
  const result = propose(needleSource(), p, [p]);
  assert.equal(result.status, 'unique candidate');
  assert.deepEqual(result.candidates[0]!.position, { pageIndex: 0, rects: [[10, 700, 52, 710]] });
});
test('inserting several pages never uses the old page as identity evidence', () => {
  const result = propose(needleSource(), page('needle'), [
    page('unrelated', 0),
    page('also unrelated', 1),
    page('needle', 8),
  ]);
  assert.equal(result.candidates[0]!.pageIndex, 8);
});
test('reflow preserves full multi-line selection and maps whitespace back', () => {
  const original = source('two words', [[10, 700, 73, 710]]);
  const r = propose(original, page('two words'), [page('two\nwords', 3)]);
  assert.equal(r.candidates[0]!.method, 'normalized');
  assert.equal(r.candidates[0]!.text, 'two\nwords');
  assert.deepEqual(r.candidates[0]!.position?.rects, [
    [10, 700, 31, 710],
    [10, 680, 45, 690],
  ]);
});
test('moving a paragraph changes coordinates while retaining the quote', () => {
  const r = propose(needleSource(), page('needle'), [page('other paragraph\nneedle', 5)]);
  assert.deepEqual(r.candidates[0]!.position, { pageIndex: 5, rects: [[10, 680, 52, 690]] });
});
test('indistinguishable repeats remain multiple candidates', () => {
  const r = propose(needleSource(), page('needle'), [page('needle', 1), page('needle', 7)]);
  assert.equal(r.status, 'multiple candidates');
  assert.equal(r.recommendedID, null);
  assert.equal(r.candidates.length, 2);
});
test('full prefix and suffix distinguish repeats but retain alternatives', () => {
  const old = page('introduction needle reliable conclusion');
  const s = source('needle', [[101, 700, 143, 710]]);
  const r = propose(s, old, [
    page('introduction needle reliable conclusion', 4),
    page('other text needle different conclusion', 8),
  ]);
  assert.equal(r.status, 'unique candidate');
  assert.equal(r.candidates.length, 2);
  assert.equal(r.recommendedID, r.candidates[0]!.id);
});
test('a short frequent quote includes every occurrence up to the disclosed limit', () => {
  const s = source('a', [[10, 700, 17, 710]]);
  const r = propose(s, page('a'), [page('a a a a a')], 2);
  assert.equal(r.status, 'multiple candidates');
  assert.equal(r.truncated, true);
  assert.equal(r.recommendedID, null);
});
test('exact occurrence does not hide normalized alternatives elsewhere', () => {
  const s = source('two words', [[10, 700, 73, 710]]);
  const r = propose(s, page('two words'), [page('two words', 2), page('two\nwords', 4)]);
  assert.equal(r.status, 'multiple candidates');
  assert.equal(r.candidates.length, 2);
});
test('deleted quote is not found', () =>
  assert.equal(propose(needleSource(), page('needle'), [page('different')]).status, 'not found'));
test('numbers, punctuation, negation, case and accents are significant', () => {
  for (const [a, b] of [
    ['1.0', '10'],
    ['a−b', 'a-b'],
    ['not valid', 'valid'],
    ['TRUE', 'true'],
    ['café', 'cafe'],
  ]) {
    const s = source(a!, [[10, 700, 10 + 7 * [...a!].length, 710]]);
    assert.equal(propose(s, page(a!), [page(b!)]).status, 'not found', a);
  }
});
test('canonical combining forms and surrogate pairs preserve UTF-16 source offsets', () => {
  const n = normalize('  😀 cafe\u0301\n tail');
  assert.equal(n.text, '😀 café tail');
  assert.equal(n.starts[0], 2);
  assert.equal(n.starts[1], 2);
  assert.equal(n.starts[6], 8);
  assert.equal(n.ends[6], 10);
  const old = page('café');
  const s = source('café', [[10, 700, 38, 710]]);
  const r = propose(s, old, [page('cafe\u0301')]);
  assert.equal(r.candidates[0]!.end, 5);
  assert.deepEqual(r.candidates[0]!.position?.rects, [[10, 700, 45, 710]]);
});
test('a partial ligature must not silently highlight a whole glyph', () => {
  const p = page('x');
  p.chars[0]!.c = 'fi';
  assert.throws(() => rangePosition(p, 0, 1), /complete PDF glyphs/);
});
test('multi-page and discontinuous highlights are explicitly unsupported', () => {
  const s = needleSource();
  s.position.nextPageRects = [[10, 700, 20, 710]];
  assert.equal(propose(s, page('needle'), [page('needle')]).status, 'unsupported');
  const p = page('aa gap bb');
  const d = source('aa bb', [
    [10, 700, 24, 710],
    [59, 700, 73, 710],
  ]);
  assert.throws(() => sourceRange(p, d.position, d.text), /Discontinuous/);
});
test('source quote/geometry mismatch cannot transfer a partial source', () => {
  const s = source('needle', [[10, 700, 31, 710]]);
  assert.equal(propose(s, page('needle'), [page('needle')]).status, 'unsupported');
});
test('unsupported type is reported before extraction', () => {
  assert.equal(propose({ ...needleSource(), type: 'image' }, undefined, []).status, 'unsupported');
  assert.equal(
    propose({ ...needleSource(), external: true }, page('needle'), []).status,
    'unsupported',
  );
});
test('missing source extraction and missing target geometry are processing errors', () => {
  assert.equal(propose(needleSource(), undefined, [page('needle')]).status, 'processing error');
  const p = page('needle');
  p.chars[2]!.inlineRect = [NaN, 0, 0, 0];
  const r = propose(needleSource(), page('needle'), [p]);
  assert.equal(r.status, 'processing error');
  assert.equal(r.candidates[0]!.position, null);
});
test('no text layer is not found, not a fabricated match', () =>
  assert.equal(propose(needleSource(), page('needle'), [page('')]).status, 'not found'));
test('two columns keep separate line boxes', () => {
  const p = page('left\nright');
  for (const g of p.chars.slice(4)) {
    g.rect[0] += 300;
    g.rect[2] += 300;
    g.inlineRect = [...g.rect];
  }
  assert.deepEqual(rangePosition(p, 0, 10).rects, [
    [10, 700, 38, 710],
    [310, 680, 345, 690],
  ]);
});
test('PDF coordinates preserve a non-zero crop box; viewport rotation is outside matching', () => {
  const p = page('needle');
  p.viewBox = [5, 25, 600, 760];
  assert.deepEqual(rangePosition(p, 0, 6).rects, [[10, 700, 52, 710]]);
  p.viewBox = [20, 25, 600, 760];
  assert.throws(() => rangePosition(p, 0, 6), /crop box/);
});
test('rotated or isolated glyphs and partial extraction cannot produce ready geometry', () => {
  for (const change of [{ rotation: 90 }, { isolated: true }, { diagonal: true }]) {
    const p = page('needle');
    Object.assign(p.chars[1]!, change);
    assert.throws(() => rangePosition(p, 0, 6));
  }
  const p = page('needle');
  p.partial = true;
  assert.throws(() => rangePosition(p, 0, 6), /partial/);
});
test('the page stream does not split UTF-16 surrogate pairs when assigning glyph offsets', () => {
  assert.deepEqual(pageText(page('😀x')).glyphAt, [0, 0, 1]);
});

test('a normalized substring cannot expand into extra combining marks or a ZWJ sequence', () => {
  for (const [oldText, newText] of [
    ['x', 'x\u0338'],
    ['👨', '👨‍👩'],
    ['1', '1\ufe0f\u20e3'],
  ]) {
    const original = source(oldText!, [[10, 700, 10 + [...oldText!].length * 7, 710]]);
    const result = propose(original, page(oldText!), [page(newText!)]);
    assert.equal(result.status, 'not found');
    assert.equal(result.recommendedID, null);
    assert.deepEqual(result.candidates, []);
  }
});

test('invalid grapheme matches do not consume the valid-candidate limit', () => {
  const original = source('x', [[10, 700, 17, 710]]);
  const found = propose(original, page('x'), [page('x\u0338 x')], 1);
  assert.equal(found.status, 'unique candidate');
  assert.equal(found.truncated, false);
  assert.equal(found.candidates[0]!.start, 3);
  assert.equal(found.candidates[0]!.text, 'x');
  const limited = propose(original, page('x'), [page('x\u0338 x x\u0338 x')], 1);
  assert.equal(limited.status, 'multiple candidates');
  assert.equal(limited.truncated, true);
  assert.equal(limited.candidates.length, 1);
  assert.equal(limited.candidates[0]!.text, 'x');
});
