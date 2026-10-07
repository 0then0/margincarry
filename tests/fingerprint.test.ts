import assert from 'node:assert/strict';
import test from 'node:test';
import { fingerprintJSON } from '../src/zotero.ts';

test('reader lastRead, sync version and unordered tags do not invalidate a document', () => {
  const a = {
    key: 'PDF01',
    lastRead: 10,
    version: 0,
    tags: [{ tag: 'second' }, { tag: 'first' }],
    title: 'PDF',
  };
  const b = { ...a, lastRead: 20, version: 1, tags: [{ tag: 'first' }, { tag: 'second' }] };
  assert.equal(fingerprintJSON(a, true), fingerprintJSON(b, true));
  assert.deepEqual(a.tags, [{ tag: 'second' }, { tag: 'first' }]);
});
test('changed content, geometry, tags or dateModified still invalidate undo', () => {
  const a = {
    key: 'ANN01',
    annotationText: '1.0',
    annotationPosition: '{"rects":[[1,2,3,4]]}',
    tags: [{ tag: 'first' }],
    dateModified: '2026-10-07',
  };
  for (const change of [
    { annotationText: '10' },
    { annotationPosition: '{"rects":[[1,2,4,5]]}' },
    { tags: [{ tag: 'new' }] },
    { dateModified: '2026-10-08' },
  ])
    assert.notEqual(fingerprintJSON(a), fingerprintJSON({ ...a, ...change }));
});
