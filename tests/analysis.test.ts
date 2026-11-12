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
test('analysis reads the following source page for a selection that crosses a page break', async () => {
  // One 7-unit glyph per character: 'alpha' ends source page 1 and 'beta' starts page 2.
  const glyphs = (text: string) =>
    Array.from(text, (c, i) => {
      const rect = [10 + 7 * i, 700, 17 + 7 * i, 710];
      return { c, rect, inlineRect: [...rect] };
    });
  const pageOf = (text: string, index: number) => ({
    index,
    label: `p${index + 1}`,
    viewBox: [0, 0, 612, 792],
    chars: glyphs(text),
  });
  const source = {
    ...snapshot,
    annotations: [
      {
        key: 'ANNOT01',
        type: 'highlight',
        text: 'alpha beta',
        comment: '',
        color: '#ffd400',
        tags: [],
        position: {
          pageIndex: 0,
          rects: [[52, 700, 87, 710]],
          nextPageRects: [[10, 700, 38, 710]],
        },
        external: false,
        fingerprint: 'original',
      },
    ],
  };
  const target = { ...snapshot, id: 2 };
  let extracted = 0;
  const adapter = {
    pair: async () => [source, target],
    pages: async (id: number) => {
      extracted++;
      return id === 1
        ? [pageOf('intro alpha', 0), pageOf('beta outro', 1)]
        : [pageOf('intro alpha beta outro', 0)];
    },
    snapshot: async (id: number) => (id === 1 ? source : target),
    yield: async () => {},
  } as unknown as ZoteroAdapter;
  const plan = await analyze(adapter, 1, 2, new AbortController().signal, () => {});
  const proposal = plan.proposals[0]!;
  assert.equal(proposal.status, 'unique candidate');
  assert.equal(proposal.sourceNextPageLabel, 'p2');
  assert.deepEqual(proposal.candidates[0]!.position, {
    pageIndex: 0,
    rects: [[52, 700, 122, 710]],
  });
  // Each document is extracted once, however many annotations and page pairs are compared.
  assert.equal(extracted, 2);
});
