import assert from 'node:assert/strict';
import test from 'node:test';
import { ZoteroAdapter } from '../src/zotero.ts';

function fixture() {
  let disk = 'new revision';
  const makeView = (text: string) => ({
    initializedPromise: Promise.resolve(),
    _pdfPages: [
      {
        viewBox: [0, 0, 612, 792],
        chars: [{ c: text, rect: [10, 700, 52, 710], inlineRect: [10, 700, 52, 710] }],
      },
    ],
    _ensureBasicPageData: async (_index: number) => {},
    _iframeWindow: {
      PDFViewerApplication: { pdfDocument: { numPages: 1, getPageLabels2: async () => ['1'] } },
    },
  });
  const reader = {
    itemID: 1,
    _isTabClosed: false,
    _initPromise: Promise.resolve(),
    _internalReader: { _primaryView: makeView('old cached revision') },
    reloadCount: 0,
    async reload() {
      this.reloadCount++;
      this._internalReader._primaryView = makeView(disk);
    },
  };
  const attachment = {
    deleted: false,
    libraryID: 1,
    parentID: 3,
    isPDFAttachment: () => true,
    getFilePathAsync: async () => '/disposable/target.pdf',
  };
  Object.assign(globalThis, {
    PathUtils: { join: (...parts: string[]) => parts.join('/') },
    IOUtils: {
      stat: async () => ({ size: disk.length, lastModified: 1 }),
      read: async () => new TextEncoder().encode(disk),
    },
    Zotero: {
      DataDirectory: { dir: '/disposable' },
      locale: 'en-US',
      Items: { getAsync: async () => attachment },
      Libraries: { userLibraryID: 1, get: () => ({ editable: true }) },
      Reader: { _readers: [reader], open: async () => reader },
      Promise: { delay: async () => {} },
    },
  });
  return {
    adapter: new ZoteroAdapter(),
    reader,
    setDisk: (value: string) => {
      disk = value;
    },
    makeView,
  };
}

test('extraction reloads a reader holding the previous revision of a replaced file', async () => {
  const { adapter, reader } = fixture();
  const pages = await adapter.pages(1, new AbortController().signal, () => {});
  assert.equal(reader.reloadCount, 1);
  assert.equal(pages[0]!.chars[0]!.c, 'new revision');
});

test('a file change during reload invalidates extraction', async () => {
  const { adapter, reader, setDisk } = fixture();
  const reload = reader.reload.bind(reader);
  reader.reload = async () => {
    await reload();
    setDisk('changed while loading');
  };
  await assert.rejects(
    adapter.pages(1, new AbortController().signal, () => {}),
    /changed while loading/,
  );
  await assert.rejects(
    adapter.preview(1, { pageIndex: 0, rects: [[10, 700, 52, 710]] }, '#ffd400'),
    /loaded PDF changed/,
  );
});

test('preview refuses a replacement with unchanged size and mtime', async () => {
  const { adapter, setDisk } = fixture();
  await adapter.pages(1, new AbortController().signal, () => {});
  setDisk('bad revision');
  await assert.rejects(
    adapter.preview(1, { pageIndex: 0, rects: [[10, 700, 52, 710]] }, '#ffd400'),
    /loaded PDF changed/,
  );
});

test('a reader reloaded outside MarginCarry cannot reuse the previous analysis geometry', async () => {
  const { adapter, reader, makeView } = fixture();
  await adapter.pages(1, new AbortController().signal, () => {});
  reader._internalReader._primaryView = makeView('new revision');
  await assert.rejects(
    adapter.preview(1, { pageIndex: 0, rects: [[10, 700, 52, 710]] }, '#ffd400'),
    /loaded PDF changed/,
  );
});

test('cancelled extraction does not reload the reader', async () => {
  const { adapter, reader } = fixture();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    adapter.pages(1, controller.signal, () => {}),
    { name: 'AbortError' },
  );
  assert.equal(reader.reloadCount, 0);
});
