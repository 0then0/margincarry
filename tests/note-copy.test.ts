import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
const unrelatedItemURI = itemURI('OTHERITEM');
const oldPosition: Position = { pageIndex: 0, rects: [[10, 20, 30, 40]] };
const newPosition: Position = { pageIndex: 6, rects: [[60, 50, 80, 70]] };
const citationItem = { uris: [parentURI], locator: '1' };
const citationItems = [{ uris: [parentURI], itemData: { title: 'Preprint', type: 'article' } }];
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
const unrelatedCitation = {
  ...originalCitation,
  citationItems: [{ uris: [unrelatedItemURI], locator: '1' }],
};
const encode = (value: object) => encodeURIComponent(JSON.stringify(value));
const embedded = (type: string, data: string, body: string) =>
  `<span class="${type}" data-annotation="${data}">${body}</span>`;
const citation = (data: string, label: string) =>
  `<span class="citation" data-citation="${data}">(<span class="citation-item">${label}</span>)</span>`;
const quote = '“The <strong>source</strong> quote”';
const quoteText = '“The source quote”';
const unrelatedText = '“A different highlight”';
const imageLink = (data: string) =>
  `<img data-attachment-key="IMAGE001" data-annotation="${data}">`;
const unrelated = embedded('highlight', encode(unrelatedAnnotation), unrelatedText);
const ordinaryLink = '<a href="zotero://open-pdf/library/items/OLDPDF01?page=1">Original PDF</a>';
const noteHTML = (annotation: string, cite: string, label: string, other = unrelated) =>
  `<div data-schema-version="10" data-citation-items="${encode(citationItems)}"><p>${embedded('underline', annotation, quote)} ${citation(cite, label)} <em>My own comment</em></p><p>${other} ${ordinaryLink}</p></div>`;
const originalHTML = noteHTML(encode(originalAnnotation), encode(originalCitation), 'Paper, p. 1');

// This DOM boundary double exposes only the nodes in the fixture. The native Zotero
// check exercises parsing the same kinds of nodes with Gecko's HTML parser.
function documentForFixture(
  html: string,
  other: string,
  citationData: string,
  label: string,
  withImage: boolean,
): Document {
  const htmlDocument = {
    createElement(name: string) {
      assert.equal(name, 'template');
      let annotation = encode(originalAnnotation);
      let otherAnnotation = other;
      let cite = citationData;
      const citationLabel = { nodeType: 3, data: label };
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
        localName: 'span',
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
        localName: withImage ? 'img' : 'span',
        textContent: withImage ? '' : unrelatedText,
        classList: { contains: (value: string) => !withImage && value === 'highlight' },
        nextSibling: null,
        getAttribute: (attribute: string) =>
          attribute === 'data-annotation' ? otherAnnotation : null,
        setAttribute(attribute: string, value: string) {
          assert.equal(attribute, 'data-annotation');
          otherAnnotation = value;
        },
      };
      return {
        set innerHTML(content: string) {
          assert.equal(content, html);
        },
        get innerHTML() {
          return noteHTML(
            annotation,
            cite,
            citationLabel.data,
            withImage
              ? imageLink(otherAnnotation)
              : embedded('highlight', otherAnnotation, unrelatedText),
          );
        },
        content: {
          querySelectorAll(selector: string) {
            assert.match(selector, /data-annotation/u);
            return withImage && selector !== '[data-annotation]'
              ? [annotationSpan]
              : [annotationSpan, otherSpan];
          },
        },
      };
    },
  };
  return {
    implementation: { createHTMLDocument: () => htmlDocument },
  } as unknown as Document;
}

function fixture({
  betweenItems = false,
  citationData = originalCitation,
  withImage = false,
} = {}) {
  const other = encode(
    betweenItems ? { ...originalAnnotation, annotationKey: 'UNPAIRED' } : unrelatedAnnotation,
  );
  const label = citationData === originalCitation ? 'Paper, p. 1' : 'Other Work, p. 1';
  const html = noteHTML(
    encode(originalAnnotation),
    encode(citationData),
    label,
    withImage ? imageLink(other) : embedded('highlight', other, unrelatedText),
  );
  const note = {
    id: noteID,
    key: 'NOTE0001',
    libraryID: 1,
    parentID: 9,
    title: 'Note fixture',
    html,
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
    ...(betweenItems ? { betweenItems: true } : {}),
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
  const annotation = {
    key: targetKey,
    type: 'underline',
    pageLabel: 'vii',
    position: newPosition,
    fingerprint: 'created',
  };
  const state = { annotation: annotation as typeof annotation | null };
  const source = {
    id: record.sourceID,
    key: record.sourceKey,
    parentID: note.parentID,
    parentKey: 'PARENT01',
    parentTitle: 'Preprint',
    parentType: 'Preprint',
    title: 'old.pdf',
    filename: 'old.pdf',
  };
  const target = {
    ...source,
    id: record.targetID,
    key: record.targetKey,
    ...(betweenItems
      ? {
          parentID: 10,
          parentKey: 'PARENT02',
          parentTitle: 'Published Paper',
          parentType: 'Journal Article',
        }
      : {}),
    title: 'new.pdf',
    filename: 'new.pdf',
  };
  const writes: { id: number; parentID: number; html: string }[] = [];
  const store: NoteCopyStore = {
    readNote: async (id) => {
      assert.equal(id, noteID);
      return structuredClone(note);
    },
    transferPDFs: async () => ({
      source,
      target,
      sourceURIs: [sourceURI],
      targetURI,
      parentURIs: [parentURI],
      fingerprints: [],
    }),
    targetAnnotation: async (_record, key) => {
      assert.equal(key, targetKey);
      return state.annotation;
    },
    transaction: async (work) => work(),
    createNoteCopy: async (id, parentID, html) => {
      writes.push({ id, parentID, html });
      return 4;
    },
  };
  const service = new NoteCopyService(store, {
    withJournal: async (work) => work([structuredClone(record)]),
  });
  const document = documentForFixture(html, other, encode(citationData), label, withImage);
  return {
    note,
    record,
    state,
    service,
    document,
    writes,
    store,
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
      parentID: note.parentID,
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

test('copying between items relinks only the journaled annotation and keeps its original citation and locator', async () => {
  const { service, note, preview, record, document, writes } = fixture({ betweenItems: true });
  const original = note.html;
  assert.deepEqual(
    (await service.choices(noteID)).operations.map(({ id }) => id),
    [record.id],
  );
  const review = await preview();
  assert.deepEqual(review.rows, [
    { text: quoteText, oldPage: '1', newPage: 'vii' },
    { text: unrelatedText, oldPage: '1' },
  ]);
  assert.equal(await service.save(review, document), 4);
  assert.deepEqual(writes, [
    {
      id: noteID,
      parentID: 10,
      html: original.replace(
        encode(originalAnnotation),
        encode({
          ...originalAnnotation,
          attachmentURI: targetURI,
          annotationKey: targetKey,
          position: newPosition,
          pageLabel: 'vii',
        }),
      ),
    },
  ]);
  assert.equal(note.html, original);
});

test('copying between items preserves an unrelated citation next to the relinked quote', async () => {
  const { service, note, preview, document, writes } = fixture({
    betweenItems: true,
    citationData: unrelatedCitation,
  });
  const review = await preview();
  assert.equal(review.rows[0]?.newPage, 'vii');
  await service.save(review, document);
  const cite = citation(encode(unrelatedCitation), 'Other Work, p. 1');
  assert.ok(note.html.includes(cite));
  assert.ok(writes[0]?.html.includes(cite));
});

test('the cross-item preview lists an embedded image link without relinking it', async () => {
  const { service, note, preview, document, writes } = fixture({
    betweenItems: true,
    withImage: true,
  });
  const review = await preview();
  assert.deepEqual(review.rows, [
    { text: quoteText, oldPage: '1', newPage: 'vii' },
    { text: '', oldPage: '1', image: true },
  ]);
  await service.save(review, document);
  const originalLink = note.html.match(/<img [^>]+>/u)![0];
  assert.ok(writes[0]?.html.includes(originalLink));
});

for (const betweenItems of [false, true]) {
  test(`a deleted target invalidates the ${betweenItems ? 'cross-item' : 'same-item'} preview`, async () => {
    const { service, preview, document, state, writes } = fixture({ betweenItems });
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
}

test('a target edit without a page change still requires a new preview', async () => {
  const { service, preview, document, state, writes } = fixture({ betweenItems: true });
  const review = await preview();
  state.annotation!.fingerprint = 'edited';
  await assert.rejects(service.save(review, document), /transfer links changed/u);
  assert.deepEqual(writes, []);
});

test('moving the source note after preview prevents saving', async () => {
  const { service, note, preview, document, writes } = fixture({ betweenItems: true });
  const review = await preview();
  note.parentID = 11;
  await assert.rejects(service.save(review, document), /note changed after the preview/u);
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

test('a new target parent after preview requires renewed confirmation of the destination', async (t) => {
  const { note, record, service, preview, document, writes, store } = fixture({
    betweenItems: true,
  });
  const parent = (id: number, key: string, title: string) => ({
    id,
    key,
    libraryID: 1,
    itemTypeID: id,
    getDisplayTitle: () => title,
    isRegularItem: () => true,
    isAttachment: () => false,
    toJSON: () => ({ key, title }),
  });
  const pdf = (id: number, key: string, parentID: number, filename: string) => ({
    id,
    key,
    parentID,
    libraryID: 1,
    attachmentFilename: filename,
    isPDFAttachment: () => true,
    isAttachment: () => true,
    getField: () => filename,
    getFilePathAsync: async () => `/profile/${filename}`,
    toJSON: () => ({ key, title: filename }),
  });
  const source = pdf(record.sourceID, record.sourceKey, note.parentID, 'old.pdf');
  const target = pdf(record.targetID, record.targetKey, 10, 'new.pdf');
  const items = new Map(
    [
      parent(note.parentID, 'PARENT01', 'Preprint'),
      parent(10, 'PARENT02', 'Published Paper'),
      parent(11, 'PARENT03', 'Published Paper'),
      source,
      target,
    ].map((item) => [item.id, item]),
  );
  const data = new Uint8Array([1]);
  record.sourceFile.hash = record.targetFile.hash = createHash('sha256').update(data).digest('hex');
  Object.assign(globalThis, {
    PathUtils: { join: (...parts: string[]) => parts.join('/') },
    IOUtils: {
      stat: async () => ({ size: data.length, lastModified: 1 }),
      read: async () => data,
    },
    Zotero: {
      DataDirectory: { dir: '/profile' },
      Libraries: { userLibraryID: 1, get: () => ({ editable: true }) },
      ItemTypes: { getLocalizedString: () => 'Article' },
      URI: {
        getItemURI: ({ key }: { key: string }) => itemURI(key),
        getLocalUserURI: () => 'http://zotero.org/users/local/TESTUSER',
      },
      Items: {
        getAsync: async (id: number | number[]) =>
          Array.isArray(id)
            ? id.map((key) => items.get(key)).filter(Boolean)
            : (items.get(id) ?? false),
      },
    },
  });
  t.after(() => {
    for (const name of ['Zotero', 'PathUtils', 'IOUtils']) Reflect.deleteProperty(globalThis, name);
  });
  const adapter = new ZoteroAdapter();
  store.transferPDFs = adapter.transferPDFs.bind(adapter);

  const review = await preview();
  assert.equal(review.pdfs.target.parentID, 10);
  target.parentID = 11;
  await assert.rejects(service.save(review, document), /transfer links changed/u);
  assert.deepEqual(writes, []);
  const refreshed = await preview();
  await service.save(refreshed, document);
  assert.equal(writes[0]?.parentID, 11);

  target.parentID = note.parentID;
  assert.deepEqual((await service.choices(noteID)).operations, []);
  target.parentID = 10;
  source.parentID = 11;
  assert.deepEqual((await service.choices(noteID)).operations, []);
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
  state.annotation = {
    key: targetKey,
    type: 'underline',
    pageLabel: 'vii',
    position,
    fingerprint: 'created',
  };
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
      fingerprint: 'created',
    };
    const review = await preview();
    assert.deepEqual(review.rows[0], { text: quoteText, oldPage: '1' });
    assert.equal(review.html, originalHTML);
  }
});
