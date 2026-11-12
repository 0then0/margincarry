import { validRect } from './geometry.ts';
import type { Annotation, Rect, TransferRecord } from './model.ts';
import type { TransferService } from './transfer.ts';

export interface NoteSnapshot {
  id: number;
  key: string;
  title: string;
  libraryID: number;
  parentID: number;
  html: string;
  editorHTMLs: string[];
}

export interface TransferPDFs {
  sourceTitle: string;
  targetTitle: string;
  sourceURIs: string[];
  targetURI: string;
  parentURIs: string[];
}

type TargetAnnotation = Pick<Annotation, 'key' | 'type' | 'position' | 'pageLabel'>;

export function parseNoteHTML(document: Document, html: string): HTMLTemplateElement {
  // A template parses HTML without loading note resources or activating any of its elements.
  const template = document.implementation.createHTMLDocument().createElement('template');
  template.innerHTML = html;
  return template;
}

export interface NoteCopyStore {
  readNote(id: number): Promise<NoteSnapshot>;
  transferPDFs(
    note: NoteSnapshot,
    record: TransferRecord,
    verifyFiles: boolean,
  ): Promise<TransferPDFs | null>;
  targetAnnotation(record: TransferRecord, key: string): Promise<TargetAnnotation | null>;
  transaction<T>(work: () => Promise<T>): Promise<T>;
  createNoteCopy(noteID: number, html: string): Promise<number>;
}

interface PreviewRow {
  text: string;
  oldPage?: string;
  newPage?: string;
}

export interface NoteCopyPreview {
  rows: PreviewRow[];
  html: string;
  note: NoteSnapshot;
  operationID: string;
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function decode(value: string | null): Record<string, unknown> | undefined {
  try {
    return value ? object(JSON.parse(decodeURIComponent(value))) : undefined;
  } catch {
    return undefined;
  }
}

function encode(value: Record<string, unknown>): string {
  return encodeURIComponent(JSON.stringify(value));
}

/**
 * Number of the page where a text position starts. A selection that continues on the following
 * page is located by its first page, as Zotero does for the annotation's own page label.
 */
function textPageNumber(value: unknown): string | undefined {
  const position = object(value);
  const pageIndex = position?.pageIndex;
  const rects = position?.rects;
  const nextPageRects = position?.nextPageRects;
  const valid = (list: unknown[]) =>
    list.every((rect) => Array.isArray(rect) && validRect(rect as Rect));
  if (
    typeof pageIndex === 'number' &&
    Number.isSafeInteger(pageIndex) &&
    pageIndex >= 0 &&
    Array.isArray(rects) &&
    rects.length > 0 &&
    valid(rects) &&
    (nextPageRects === undefined || (Array.isArray(nextPageRects) && valid(nextPageRects)))
  )
    return String(pageIndex + 1);
}

function locatorText(page: string, label: unknown): string {
  const abbreviation =
    typeof label === 'string' && label ? label : /[-–,]/u.test(page) ? 'pp.' : 'p.';
  return `, ${abbreviation} ${page}`;
}

function updateCitation(
  span: Element,
  data: Record<string, unknown>,
  parentURIs: string[],
  oldPage: string | undefined,
  newPage: string,
): void {
  const item = object(data.citationItem);
  const uris = item?.uris;
  if (
    !oldPage ||
    oldPage === newPage ||
    !item ||
    item.locator !== oldPage ||
    !Array.isArray(uris) ||
    !uris.some((uri) => parentURIs.includes(uri))
  )
    return;

  data.citationItem = { ...item, locator: newPage };
  // Zotero pairs an immediately following citation with the annotation, ignoring spaces and breaks.
  let sibling = span.nextSibling;
  while (
    sibling &&
    ((sibling.nodeType === 3 && !sibling.textContent?.trim()) ||
      (sibling.nodeType === 1 && (sibling as Element).localName === 'br'))
  ) {
    sibling = sibling.nextSibling;
  }
  const element = sibling?.nodeType === 1 ? (sibling as Element) : undefined;
  if (!element?.matches('span.citation[data-citation]')) return;
  const citation = decode(element.getAttribute('data-citation'));
  if (!citation || !Array.isArray(citation.citationItems) || citation.citationItems.length !== 1)
    return;
  const other = object(citation.citationItems[0]);
  if (
    !other ||
    !Array.isArray(other.uris) ||
    !other.uris.some((uri) => uris.includes(uri) && parentURIs.includes(uri))
  )
    return;
  const { uris: _oldURIs, ...oldFields } = item;
  const { uris: _newURIs, ...newFields } = other;
  const fields = Object.keys(oldFields);
  if (
    fields.length !== Object.keys(newFields).length ||
    !fields.every((field) => JSON.stringify(oldFields[field]) === JSON.stringify(newFields[field]))
  )
    return;

  other.locator = newPage;
  element.setAttribute('data-citation', encode(citation));
  const last = element.querySelector('span.citation-item')?.lastChild;
  const oldLocator = locatorText(oldPage, other.label);
  if (last?.nodeType === 3 && (last as Text).data.endsWith(oldLocator)) {
    const text = last as Text;
    text.data = text.data.slice(0, -oldLocator.length) + locatorText(newPage, other.label);
  }
}

export class NoteCopyService {
  private readonly store: NoteCopyStore;
  private readonly transfers: Pick<TransferService, 'withJournal'>;

  constructor(store: NoteCopyStore, transfers: Pick<TransferService, 'withJournal'>) {
    this.store = store;
    this.transfers = transfers;
  }

  private available(records: TransferRecord[], note: NoteSnapshot): TransferRecord[] {
    return records.filter(
      (record) =>
        record.status === 'committed' &&
        record.libraryID === note.libraryID &&
        record.sourceID !== record.targetID &&
        record.created.length > 0 &&
        records.filter((entry) => entry.id === record.id).length === 1,
    );
  }

  async choices(noteID: number): Promise<{
    noteTitle: string;
    operations: { id: string; date: string; sourceTitle: string; targetTitle: string }[];
  }> {
    return this.transfers.withJournal(async (records) => {
      const note = await this.store.readNote(noteID);
      const choices = [];
      for (const record of this.available(records, note).reverse()) {
        const pdfs = await this.store.transferPDFs(note, record, false);
        if (pdfs)
          choices.push({
            id: record.id,
            date: record.date,
            sourceTitle: pdfs.sourceTitle,
            targetTitle: pdfs.targetTitle,
          });
      }
      return { noteTitle: note.title, operations: choices };
    });
  }

  private async render(
    records: TransferRecord[],
    note: NoteSnapshot,
    operationID: string,
    document: Document,
  ): Promise<NoteCopyPreview> {
    const record = this.available(records, note).find((record) => record.id === operationID);
    const pdfs = record && (await this.store.transferPDFs(note, record, true));
    if (!record || !pdfs)
      throw new Error('The selected transfer is no longer available for this note.');

    const template = parseNoteHTML(document, note.html);
    const rows: PreviewRow[] = [];
    for (const span of template.content.querySelectorAll(
      'span.highlight[data-annotation], span.underline[data-annotation]',
    )) {
      const row: PreviewRow = { text: span.textContent ?? '' };
      rows.push(row);
      const data = decode(span.getAttribute('data-annotation'));
      if (!data) continue;
      const oldNumber = textPageNumber(data.position);
      const oldPage =
        typeof data.pageLabel === 'string' && data.pageLabel ? data.pageLabel : oldNumber;
      if (oldPage !== undefined) row.oldPage = oldPage;
      const highlight = span.classList.contains('highlight');
      const underline = span.classList.contains('underline');
      if (
        highlight === underline ||
        data.uri !== undefined ||
        !oldNumber ||
        typeof data.annotationKey !== 'string' ||
        typeof data.attachmentURI !== 'string' ||
        !pdfs.sourceURIs.includes(data.attachmentURI)
      )
        continue;
      const pairs = record.created.filter((entry) => entry?.sourceKey === data.annotationKey);
      const pair = pairs[0];
      if (
        pairs.length !== 1 ||
        typeof pair?.key !== 'string' ||
        !pair.key ||
        record.created.filter((entry) => entry?.key === pair.key).length !== 1
      )
        continue;
      const target = await this.store.targetAnnotation(record, pair.key);
      if (!target || target.type !== (highlight ? 'highlight' : 'underline')) continue;
      const number = textPageNumber(target.position);
      if (!number) continue;
      const newPage = target.pageLabel || number;
      updateCitation(span, data, pdfs.parentURIs, oldPage, newPage);
      Object.assign(data, {
        attachmentURI: pdfs.targetURI,
        annotationKey: target.key,
        position: target.position,
        pageLabel: newPage,
      });
      span.setAttribute('data-annotation', encode(data));
      row.newPage = newPage;
    }
    return { rows, html: template.innerHTML, note, operationID };
  }

  async preview(noteID: number, operationID: string, document: Document): Promise<NoteCopyPreview> {
    return this.transfers.withJournal(async (records) =>
      this.render(records, await this.store.readNote(noteID), operationID, document),
    );
  }

  async save(preview: NoteCopyPreview, document: Document): Promise<number> {
    if (!preview.rows.some((row) => row.newPage !== undefined))
      throw new Error('There are no confirmed links to copy.');

    const checkNote = async () => {
      const note = await this.store.readNote(preview.note.id);
      if (JSON.stringify(note) !== JSON.stringify(preview.note))
        throw new Error('The note changed after the preview. Refresh the preview and try again.');
      return note;
    };
    return this.transfers.withJournal((records) =>
      this.store.transaction(async () => {
        const current = await this.render(
          records,
          await checkNote(),
          preview.operationID,
          document,
        );
        if (
          current.html !== preview.html ||
          JSON.stringify(current.rows) !== JSON.stringify(preview.rows)
        )
          throw new Error(
            'The transfer links changed after the preview. Refresh the preview and try again.',
          );
        await checkNote();
        const id = await this.store.createNoteCopy(current.note.id, current.html);
        await checkNote();
        return id;
      }),
    );
  }
}
