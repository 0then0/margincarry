import assert from 'node:assert/strict';
import test from 'node:test';
import { analyze } from '../src/analysis.ts';
import type { Snapshot } from '../src/model.ts';
import { ZoteroAdapter } from '../src/zotero.ts';

const snapshot: Snapshot = {
  id: 1,
  key: 'SOURCE',
  parentID: 3,
  parentTitle: 'Paper',
  parentType: 'Journal Article',
  libraryID: 1,
  title: 'fixture',
  filename: 'a.pdf',
  itemFingerprint: 'a',
  file: { path: 'a.pdf', hash: 'a', size: 1, modified: 1 },
  annotations: [],
};

test('the Zotero adapter opens explicitly selected PDFs from two personal items and rejects a different library', async (t) => {
  const parent = (id: number, libraryID: number, title: string, attachments: number[] = []) => ({
    id,
    itemTypeID: id,
    libraryID,
    getDisplayTitle: () => title,
    isRegularItem: () => true,
    getAttachments: () => attachments,
  });
  const pdf = (id: number, libraryID: number, parentID: number, filename: string) => ({
    id,
    key: `PDF${id}`,
    libraryID,
    parentID,
    attachmentFilename: filename,
    isPDFAttachment: () => true,
    getFilePathAsync: async () => `/profile/${filename}`,
    getField: () => 'PDF',
    getAnnotations: () => [],
    isAttachment: () => true,
    toJSON: () => ({ title: filename }),
  });
  const published = parent(12, 1, 'Published paper');
  const publishedPDF = pdf(2, 1, 12, 'published.pdf');
  const items = new Map(
    [
      parent(11, 1, 'Preprint', [1, 4]),
      published,
      parent(13, 2, 'Group paper'),
      pdf(1, 1, 11, 'preprint.pdf'),
      publishedPDF,
      pdf(3, 2, 13, 'group.pdf'),
      pdf(4, 1, 11, 'revised-preprint.pdf'),
    ].map((item) => [item.id, item]),
  );
  Object.assign(globalThis, {
    PathUtils: { join: (...parts: string[]) => parts.join('/') },
    IOUtils: {
      stat: async () => ({ size: 1, lastModified: 1 }),
      read: async () => new Uint8Array([1]),
    },
    Zotero: {
      DataDirectory: { dir: '/profile' },
      Libraries: { userLibraryID: 1, get: () => ({ editable: true }) },
      ItemTypes: {
        getLocalizedString: (type: number) => (type === 11 ? 'Preprint' : 'Conference Paper'),
      },
      Items: {
        getAsync: async (id: number | number[]) => {
          if (!id) throw new Error('No arguments provided');
          return Array.isArray(id)
            ? id.map((key) => items.get(key)).filter(Boolean)
            : (items.get(id) ?? false);
        },
      },
    },
  });
  t.after(() => {
    for (const name of ['Zotero', 'PathUtils', 'IOUtils']) Reflect.deleteProperty(globalThis, name);
  });
  const adapter = new ZoteroAdapter();
  assert.deepEqual(await adapter.choices([1, 2]), [
    {
      id: 1,
      key: 'PDF1',
      parentID: 11,
      parentTitle: 'Preprint',
      parentType: 'Preprint',
      title: 'preprint.pdf',
      filename: 'preprint.pdf',
    },
    {
      id: 2,
      key: 'PDF2',
      parentID: 12,
      parentTitle: 'Published paper',
      parentType: 'Conference Paper',
      title: 'published.pdf',
      filename: 'published.pdf',
    },
  ]);
  const [source, target] = await adapter.pair(1, 2);
  assert.equal(source.parentID, 11);
  assert.equal(target.parentID, 12);
  assert.deepEqual(
    (await adapter.choices([11])).map(({ id }) => id),
    [1, 4],
  );
  assert.deepEqual(
    (await adapter.pair(1, 4)).map(({ parentID }) => parentID),
    [11, 11],
  );
  assert.deepEqual(
    (await adapter.choices([1, 3])).map(({ id }) => id),
    [1],
  );
  await assert.rejects(adapter.pair(1, 3), /writable personal library/u);

  await t.test('rejects a missing parent reported as false by Zotero', async () => {
    items.delete(published.id);
    try {
      assert.deepEqual(
        (await adapter.choices([1, 2])).map(({ id }) => id),
        [1],
      );
      await assert.rejects(adapter.snapshot(2), /writable personal library/u);
    } finally {
      items.set(published.id, published);
    }
  });

  await t.test('rejects detachment while checking the local file', async () => {
    const getFilePath = publishedPDF.getFilePathAsync;
    publishedPDF.getFilePathAsync = async () => {
      publishedPDF.parentID = 0;
      return getFilePath();
    };
    await assert.rejects(adapter.snapshot(2), /writable personal library/u);
  });
});

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
