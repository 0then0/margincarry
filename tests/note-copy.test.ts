import assert from 'node:assert/strict';
import test from 'node:test';
import type { Position, TransferRecord } from '../src/model.ts';
import { NoteCopyService, type NoteCopyStore } from '../src/note-copy.ts';
import { ZoteroAdapter } from '../src/zotero.ts';

const noteID = 3;
const sourceKey = 'OLDANN01';
const targetKey = 'NEWANN01';
const itemURI = (key: string) => `http://zotero.org/users/local/TESTUSER/items/${key}`;
const sourceURI = itemURI('OLDPDF01');
const targetURI = itemURI('NEWPDF01');
const parentURI = itemURI('PARENT01');
const unrelatedURI = itemURI('OTHERPDF');
const oldPosition: Position = { pageIndex: 0, rects: [[10, 20, 30, 40]] };
const newPosition: Position = { pageIndex: 6, rects: [[60, 50, 80, 70]] };
const citationItem = { uris: [parentURI], locator: '1' };
const originalAnnotation = {
  attachmentURI: sourceURI,
  annotationKey: sourceKey,
  color: '#ffd400',
  pageLabel: '1',
  position: oldPosition,
  citationItem,
};
const unrelatedAnnotation = { ...originalAnnotation, attachmentURI: unrelatedURI };
const originalCitation = { citationItems: [citationItem], properties: {} };
const encode = (value: object) => encodeURIComponent(JSON.stringify(value));
const embedded = (type: string, data: string, body: string) =>
  `<span class="${type}" data-annotation="${data}">${body}</span>`;
const citation = (data: string, label: string) =>
  `<span class="citation" data-citation="${data}">(<span class="citation-item">${label}</span>)</span>`;
const quote = '“The <strong>source</strong> quote”';
const quoteText = '“The source quote”';
const unrelatedText = '“A different highlight”';
const unrelated = embedded('highlight', encode(unrelatedAnnotation), unrelatedText);
const ordinaryLink = '<a href="zotero://open-pdf/library/items/OLDPDF01?page=1">Original PDF</a>';
const noteHTML = (annotation: string, cite: string, label: string, other = unrelated) =>
  `<div data-schema-version="10"><p>${embedded('underline', annotation, quote)} ${citation(cite, label)} <em>My own comment</em></p><p>${other} ${ordinaryLink}</p></div>`;
const originalHTML = noteHTML(encode(originalAnnotation), encode(originalCitation), 'Paper, p. 1');

// This DOM boundary double exposes only the nodes in the fixture. The native Zotero
// check exercises parsing the same kinds of nodes with Gecko's HTML parser.
function documentForFixture(): Document {
  const htmlDocument = {
    createElement(name: string) {
      assert.equal(name, 'template');
      let annotation = encode(originalAnnotation);
      let otherAnnotation = encode(unrelatedAnnotation);
      let cite = encode(originalCitation);
      const citationLabel = { nodeType: 3, data: 'Paper, p. 1' };
      const citationSpan = {
        nodeType: 1,
        matches: (selector: string) => selector === 'span.citation[data-citation]',
        getAttribute: (attribute: string) => (attribute === 'data-citation' ? cite : null),
        setAttribute(attribute: string, value: string) {
          assert.equal(attribute, 'data-citation');
          cite = value;
        },
        querySelector: (selector: string) =>
          selector === 'span.citation-item' ? { lastChild: citationLabel } : null,
      };
      const whitespace = { nodeType: 3, textContent: ' ', nextSibling: citationSpan };
      const annotationSpan = {
        textContent: quoteText,
        classList: { contains: (value: string) => value === 'underline' },
        nextSibling: whitespace,
        getAttribute: (attribute: string) => (attribute === 'data-annotation' ? annotation : null),
        setAttribute(attribute: string, value: string) {
          assert.equal(attribute, 'data-annotation');
          annotation = value;
        },
      };
      const otherSpan = {
        textContent: unrelatedText,
        classList: { contains: (value: string) => value === 'highlight' },
        nextSibling: null,
        getAttribute: (attribute: string) =>
          attribute === 'data-annotation' ? otherAnnotation : null,
        setAttribute(attribute: string, value: string) {
          assert.equal(attribute, 'data-annotation');
          otherAnnotation = value;
        },
      };
      return {
        set innerHTML(html: string) {
          assert.equal(html, originalHTML);
        },
        get innerHTML() {
          return noteHTML(
            annotation,
            cite,
            citationLabel.data,
            embedded('highlight', otherAnnotation, unrelatedText),
          );
        },
        content: {
          querySelectorAll(selector: string) {
            assert.match(selector, /data-annotation/u);
            return [annotationSpan, otherSpan];
          },
        },
      };
    },
  };
  return {
    implementation: { createHTMLDocument: () => htmlDocument },
  } as unknown as Document;
}

function fixture() {
  const note = {
    id: noteID,
    key: 'NOTE0001',
    libraryID: 1,
    parentID: 9,
    title: 'Note fixture',
    html: originalHTML,
    editorHTMLs: [] as string[],
  };
  const record: TransferRecord = {
    schema: 1,
    id: 'transfer',
    date: '2026-11-07T12:00:00.000Z',
    sourceID: 1,
    targetID: 2,
    libraryID: 1,
    sourceKey: 'OLDPDF01',
    targetKey: 'NEWPDF01',
    sourceFile: { path: 'old.pdf', hash: 'old', size: 1, modified: 1 },
    targetFile: { path: 'new.pdf', hash: 'new', size: 1, modified: 1 },
    status: 'committed',
    originals: [
      {
        key: sourceKey,
        type: 'underline',
        text: 'The source quote',
        comment: '',
        color: '#ffd400',
        tags: [],
        position: oldPosition,
        pageLabel: '1',
        external: false,
        fingerprint: 'source',
      },
    ],
    copies: [
      {
        key: targetKey,
        sourceKey,
        type: 'underline',
        text: 'The source quote',
        comment: '',
        color: '#ffd400',
        tags: [],
        // The saved annotation metadata is authoritative, including its page label.
        position: { pageIndex: 6, rects: [[62, 52, 82, 72]] },
        pageLabel: '7',
      },
    ],
    created: [{ key: targetKey, sourceKey, fingerprint: 'created' }],
  };
  const annotation = { key: targetKey, type: 'underline', pageLabel: 'vii', position: newPosition };
  const state = { annotation: annotation as typeof annotation | null };
  const writes: { id: number; html: string }[] = [];
  const store: NoteCopyStore = {
    readNote: async (id) => {
      assert.equal(id, noteID);
      return structuredClone(note);
    },
    transferPDFs: async () => ({
      sourceTitle: 'Old PDF',
      targetTitle: 'New PDF',
      sourceURIs: [sourceURI],
      targetURI,
      parentURIs: [parentURI],
    }),
    targetAnnotation: async (_record, key) => {
      assert.equal(key, targetKey);
      return state.annotation;
    },
    transaction: async (work) => work(),
    createNoteCopy: async (id, html) => {
      writes.push({ id, html });
      return 4;
    },
  };
  const service = new NoteCopyService(store, {
    withJournal: async (work) => work([structuredClone(record)]),
  });
  const document = documentForFixture();
  return {
    note,
    record,
    state,
    service,
    document,
    writes,
    preview: () => service.preview(noteID, record.id, document),
  };
}

test('copy relinks a Zotero underline and its page citation, preserving the rest of the note', async () => {
  const { service, preview, document, note, writes } = fixture();
  const review = await preview();
  assert.deepEqual(review.rows, [
    { text: quoteText, oldPage: '1', newPage: 'vii' },
    { text: unrelatedText, oldPage: '1' },
  ]);
  assert.deepEqual(writes, []);
  assert.equal(await service.save(review, document), 4);
  const newCitationItem = { ...citationItem, locator: 'vii' };
  assert.deepEqual(writes, [
    {
      id: noteID,
      html: noteHTML(
        encode({
          ...originalAnnotation,
          attachmentURI: targetURI,
          annotationKey: targetKey,
          position: newPosition,
          pageLabel: 'vii',
          citationItem: newCitationItem,
        }),
        encode({ ...originalCitation, citationItems: [newCitationItem] }),
        'Paper, p. vii',
      ),
    },
  ]);
  assert.equal(note.html, originalHTML);
});

test('an undone transfer cannot save a note from an earlier preview', async () => {
  const { service, preview, document, record, writes } = fixture();
  const review = await preview();
  record.status = 'undone';
  assert.deepEqual(await service.choices(noteID), { noteTitle: 'Note fixture', operations: [] });
  await assert.rejects(service.save(review, document), /transfer is no longer available/u);
  assert.deepEqual(writes, []);
});

test('a deleted target invalidates the preview and is left unlinked in a refreshed preview', async () => {
  const { service, preview, document, state, writes } = fixture();
  const review = await preview();
  state.annotation = null;
  await assert.rejects(service.save(review, document), /transfer links changed/u);
  const refreshed = await preview();
  assert.deepEqual(refreshed.rows, [
    { text: quoteText, oldPage: '1' },
    { text: unrelatedText, oldPage: '1' },
  ]);
  await assert.rejects(service.save(refreshed, document), /no confirmed links/u);
  assert.deepEqual(writes, []);
});

test('ambiguous journal pairs leave the source annotation unlinked', async () => {
  const { service, preview, document, record, writes } = fixture();
  record.created.push({ key: 'NEWANN02', sourceKey, fingerprint: 'another copy' });
  const review = await preview();
  assert.deepEqual(review.rows, [
    { text: quoteText, oldPage: '1' },
    { text: unrelatedText, oldPage: '1' },
  ]);
  assert.equal(review.html, originalHTML);
  await assert.rejects(service.save(review, document), /no confirmed links/u);
  assert.deepEqual(writes, []);
});

for (const persisted of [true, false]) {
  test(`a ${persisted ? 'saved' : 'pending'} note edit after preview prevents saving the stale copy`, async () => {
    const { service, preview, document, note, writes } = fixture();
    if (!persisted) note.editorHTMLs = [note.html];
    const review = await preview();
    const edited = note.html.replace('My own comment', 'My revised comment');
    if (persisted) note.html = edited;
    else note.editorHTMLs = [edited];
    await assert.rejects(service.save(review, document), /note changed after the preview/u);
    assert.deepEqual(writes, []);
  });
}

test('the Zotero adapter handles false for a missing annotation or a note without a parent', async (t) => {
  Object.assign(globalThis, {
    PathUtils: { join: (...parts: string[]) => parts.join('/') },
    Zotero: {
      DataDirectory: { dir: '/profile' },
      Libraries: { userLibraryID: 1 },
      Items: {
        getByLibraryAndKeyAsync: () => false,
        getAsync: async () => ({
          parentID: false,
          libraryID: 1,
          isNote: () => true,
          isEditable: () => true,
        }),
      },
    },
  });
  t.after(() => {
    Reflect.deleteProperty(globalThis, 'PathUtils');
    Reflect.deleteProperty(globalThis, 'Zotero');
  });
  const adapter = new ZoteroAdapter();
  assert.equal(await adapter.targetAnnotation(fixture().record, targetKey), null);
  await assert.rejects(adapter.readNote(noteID), /Choose one child note in your personal library/u);
});

test('a link to an annotation across a page break carries its whole position and first page label', async () => {
  const { service, preview, document, state, writes } = fixture();
  const position: Position = {
    pageIndex: 6,
    rects: [[60, 50, 80, 70]],
    nextPageRects: [
      [60, 700, 300, 712],
      [60, 686, 120, 698],
    ],
  };
  state.annotation = { key: targetKey, type: 'underline', pageLabel: 'vii', position };
  const review = await preview();
  // Zotero labels such an annotation by the page where it starts; the link does the same.
  assert.deepEqual(review.rows[0], { text: quoteText, oldPage: '1', newPage: 'vii' });
  await service.save(review, document);
  const data = JSON.parse(
    decodeURIComponent(writes[0]!.html.match(/class="underline" data-annotation="([^"]+)"/u)![1]!),
  );
  assert.equal(data.annotationKey, targetKey);
  assert.equal(data.attachmentURI, targetURI);
  assert.deepEqual(data.position, position);
  assert.equal(data.pageLabel, 'vii');
  assert.equal(data.citationItem.locator, 'vii');
});

test('an annotation whose second-page rectangles are invalid is left unlinked', async () => {
  for (const nextPageRects of [[[60, 700, 60, 712]], 'x', [[1, 2, 3]]]) {
    const { preview, state } = fixture();
    state.annotation = {
      key: targetKey,
      type: 'underline',
      pageLabel: 'vii',
      position: { pageIndex: 6, rects: [[60, 50, 80, 70]], nextPageRects } as unknown as Position,
    };
    const review = await preview();
    assert.deepEqual(review.rows[0], { text: quoteText, oldPage: '1' });
    assert.equal(review.html, originalHTML);
  }
});
