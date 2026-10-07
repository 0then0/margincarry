import assert from 'node:assert/strict';
import test from 'node:test';
import { analyze } from '../src/analysis.ts';
import type { Snapshot } from '../src/model.ts';
import type { ZoteroAdapter } from '../src/zotero.ts';

const snapshot: Snapshot = {
  id: 1,
  key: 'SOURCE',
  parentID: 3,
  libraryID: 1,
  title: 'fixture',
  itemFingerprint: 'a',
  file: { path: 'a.pdf', hash: 'a', size: 1, modified: 1 },
  annotations: [],
};
test('analysis cancellation never produces an applicable plan', async () => {
  const controller = new AbortController();
  const adapter = {
    pair: async () => [snapshot, { ...snapshot, id: 2 }],
    pages: async () => {
      controller.abort();
      return [];
    },
    snapshot: async (id: number) => ({ ...snapshot, id }),
    yield: async () => {},
  } as unknown as ZoteroAdapter;
  await assert.rejects(
    analyze(adapter, 1, 2, controller.signal, () => {}),
    (e) => e instanceof Error && e.name === 'AbortError',
  );
});
test('extraction failure gives an outcome for each source without a false unique candidate', async () => {
  const source = {
    ...snapshot,
    annotations: [
      {
        key: 'ANNOT01',
        type: 'highlight',
        text: 'quote',
        comment: '',
        color: '#ffd400',
        tags: [],
        position: { pageIndex: 0, rects: [[1, 2, 3, 4]] },
        external: false,
        fingerprint: 'original',
      },
    ],
  };
  const adapter = {
    pair: async () => [source, { ...snapshot, id: 2 }],
    pages: async () => {
      throw new Error('extraction failed');
    },
  } as unknown as ZoteroAdapter;
  const plan = await analyze(adapter, 1, 2, new AbortController().signal, () => {});
  assert.equal(plan.proposals.length, 1);
  assert.equal(plan.proposals[0]!.status, 'processing error');
  assert.equal(plan.proposals[0]!.candidates.length, 0);
});
test('PDF change during analysis invalidates every proposal', async () => {
  const adapter = {
    pair: async () => [snapshot, { ...snapshot, id: 2 }],
    pages: async () => [],
    snapshot: async (id: number) => ({
      ...snapshot,
      id,
      file: { ...snapshot.file, hash: 'changed' },
    }),
    yield: async () => {},
  } as unknown as ZoteroAdapter;
  await assert.rejects(
    analyze(adapter, 1, 2, new AbortController().signal, () => {}),
    /changed during analysis/,
  );
});
