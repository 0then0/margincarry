import { type Locale, selectLocale } from './l10n.ts';
import type {
  Annotation,
  Copy,
  Created,
  FileStamp,
  Page,
  Position,
  Snapshot,
  Store,
  TransferRecord,
} from './model.ts';

export function fingerprintJSON(input: Record<string, any>, attachment = false): string {
  const data = { ...input };
  delete data.version;
  if (attachment) delete data.lastRead;
  if (Array.isArray(data.tags))
    data.tags = [...data.tags].sort((a, b) =>
      a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : (a.type ?? 0) - (b.type ?? 0),
    );
  return JSON.stringify(data);
}

/** The complete boundary to Zotero 10.0.5 and its bundled reader internals. */
export class ZoteroAdapter implements Store {
  private readonly readers = new Map<number, any>();
  private readonly loaded = new Map<number, { view: any; file: FileStamp }>();
  private pendingRemovals: { attachmentID: number; key: string }[] | null = null;
  private readonly journalPath = PathUtils.join(
    Zotero.DataDirectory.dir,
    'margincarry',
    'transfers.json',
  );

  menuItem(win: Window): HTMLElement {
    return (win.document as any).createXULElement('menuitem') as HTMLElement;
  }
  locale(): Locale {
    return selectLocale(Zotero.locale || 'en');
  }
  controller(): AbortController {
    return new (Zotero.getMainWindow().AbortController)();
  }
  private label(item: any): string {
    const filename = item.attachmentFilename,
      title = item.getField('title');
    return filename && title && title !== 'PDF' && title !== filename
      ? `${title} · ${filename}`
      : filename || title || item.key;
  }
  selectedIDs(): number[] {
    return Zotero.getMainWindow()
      .ZoteroPane.getSelectedItems()
      .map((item: any) => item.id);
  }
  async choices(ids: number[]): Promise<{ id: number; title: string }[]> {
    let items = await Zotero.Items.getAsync(ids);
    if (items.length === 1 && items[0].isRegularItem())
      items = await Zotero.Items.getAsync(items[0].getAttachments());
    return items
      .filter(
        (i: any) =>
          i.isPDFAttachment() && !i.deleted && i.libraryID === Zotero.Libraries.userLibraryID,
      )
      .map((i: any) => ({ id: i.id, title: this.label(i) }));
  }
  private async attachment(id: number): Promise<any> {
    const item = await Zotero.Items.getAsync(id);
    if (
      !item ||
      item.deleted ||
      !item.isPDFAttachment() ||
      item.libraryID !== Zotero.Libraries.userLibraryID ||
      !item.parentID ||
      !Zotero.Libraries.get(item.libraryID).editable
    ) {
      throw new Error('Choose local PDF attachments of one item in your personal library.');
    }
    if (!(await item.getFilePathAsync()))
      throw new Error('The PDF is not locally available. Download it first.');
    return item;
  }
  private canonical(item: any): string {
    // Tag order, sync version and reader lastRead are bookkeeping; user edits remain visible.
    return fingerprintJSON(item.toJSON(), item.isAttachment());
  }
  private annotation(item: any): Annotation {
    return {
      key: item.key,
      type: item.annotationType,
      text: item.annotationText || '',
      comment: item.annotationComment || '',
      color: item.annotationColor,
      tags: item
        .getTags()
        .map((t: any) => t.tag)
        .sort(),
      position: JSON.parse(item.annotationPosition),
      pageLabel:
        item.annotationPageLabel || String(JSON.parse(item.annotationPosition).pageIndex + 1),
      external: !!item.annotationIsExternal,
      fingerprint: this.canonical(item),
    };
  }
  async snapshot(id: number): Promise<Snapshot> {
    const item = await this.attachment(id);
    const file = await this.fileStamp(id);
    const annotations: Annotation[] = (
      await Zotero.Items.getAsync(item.getAnnotations(false, true))
    )
      .filter((a: any) => !a.deleted)
      .map((a: any) => this.annotation(a));
    annotations.sort((a, b) => a.key.localeCompare(b.key));
    return {
      id,
      key: item.key,
      libraryID: item.libraryID,
      parentID: item.parentID,
      title: this.label(item),
      itemFingerprint: this.canonical(item),
      file,
      annotations,
    };
  }
  private async fileStamp(id: number): Promise<FileStamp> {
    const item = await this.attachment(id),
      path = await item.getFilePathAsync();
    const stat = await IOUtils.stat(path),
      bytes = await IOUtils.read(path);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return { path, hash, size: stat.size, modified: stat.lastModified };
  }
  async pair(oldID: number, newID: number): Promise<[Snapshot, Snapshot]> {
    if (oldID === newID) throw new Error('The source and target must be different attachments.');
    const a = await this.snapshot(oldID),
      b = await this.snapshot(newID);
    if (a.parentID !== b.parentID)
      throw new Error('v0.1 requires two attachments of the same bibliographic item.');
    return [a, b];
  }
  private async ready(promise: Promise<unknown>): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('PDF reader initialization timed out. Open the PDF and retry.')),
            20000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  private async view(id: number): Promise<any> {
    let reader = Zotero.Reader._readers.find(
      (reader: any) => reader.itemID === id && !reader._isTabClosed,
    );
    if (!reader?._internalReader?._primaryView || reader._internalReader._primaryView._init2) {
      reader = (await Zotero.Reader.open(id)) || reader;
    }
    if (!reader) {
      for (let retry = 0; retry < 100 && !reader; retry++) {
        await Zotero.Promise.delay(100);
        reader = Zotero.Reader._readers.find(
          (reader: any) => reader.itemID === id && !reader._isTabClosed,
        );
      }
    }
    if (!reader) throw new Error('Zotero could not open the PDF reader.');
    await this.ready(reader._initPromise);
    const view = reader._internalReader?._primaryView;
    if (!view || typeof view._ensureBasicPageData !== 'function')
      throw new Error('This Zotero reader does not expose the verified PDF adapter API.');
    await this.ready(view.initializedPromise);
    this.readers.set(id, reader);
    return view;
  }
  async pages(
    id: number,
    signal: AbortSignal,
    progress: (current: number, total: number) => void,
  ): Promise<Page[]> {
    signal.throwIfAborted();
    this.loaded.delete(id);
    const before = await this.fileStamp(id);
    await this.view(id);
    const reader = this.readers.get(id);
    // An existing reader can still contain bytes from a file replaced at the same path.
    // Native reload reads the current bytes and creates a new PDF view.
    await this.ready(reader.reload());
    signal.throwIfAborted();
    const view = await this.view(id),
      document = view._iframeWindow.PDFViewerApplication.pdfDocument;
    const labels = await document.getPageLabels2();
    const pages: Page[] = [];
    for (let index = 0; index < document.numPages; index++) {
      signal.throwIfAborted();
      await view._ensureBasicPageData(index);
      const data = view._pdfPages[index];
      if (!data || !Array.isArray(data.chars) || !Array.isArray(data.viewBox))
        throw new Error(`Page ${index + 1} has incomplete extraction data.`);
      // The host sets partial=true for basic page metadata (unprocessed overlays), not glyph truncation.
      // getPageData returns the complete structured glyph array. Copy it without mutating the host.
      const page = JSON.parse(
        JSON.stringify({
          index,
          label: labels?.[index] || String(index + 1),
          chars: data.chars,
          viewBox: data.viewBox,
          partial: false,
        }),
      ) as Page;
      pages.push(page);
      progress(index + 1, document.numPages);
      await Zotero.Promise.delay(0);
    }
    signal.throwIfAborted();
    const after = await this.fileStamp(id);
    if (
      JSON.stringify(before) !== JSON.stringify(after) ||
      reader._internalReader._primaryView !== view
    )
      throw new Error('The PDF changed while loading. Run analysis again.');
    this.loaded.set(id, { view, file: after });
    return pages;
  }
  private async verifiedView(id: number): Promise<any> {
    const view = await this.view(id),
      loaded = this.loaded.get(id);
    if (
      !loaded ||
      loaded.view !== view ||
      JSON.stringify(loaded.file) !== JSON.stringify(await this.fileStamp(id))
    )
      throw new Error('The loaded PDF changed. Run analysis again before reviewing or applying.');
    return view;
  }
  async preview(
    id: number,
    position: Position,
    color: string,
    type = 'highlight',
  ): Promise<string> {
    const view = await this.verifiedView(id),
      pdfDocument = view._iframeWindow.PDFViewerApplication.pdfDocument;
    const page = Cu.waiveXrays(await pdfDocument.getPage(position.pageIndex + 1));
    const viewport = page.getViewport(Cu.cloneInto({ scale: 1.25 }, view._iframeWindow));
    if (viewport.width * viewport.height > 8_000_000)
      throw new Error('Page too large for a safe preview. Open its reader position instead.');
    const canvas = view._iframeWindow.document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d', { alpha: false });
    const renderOptions = Cu.cloneInto(
      { canvasContext: ctx, intent: 'print' },
      view._iframeWindow,
      { wrapReflectors: true },
    );
    renderOptions.viewport = viewport;
    // print intent avoids requestAnimationFrame being paused in a hidden reader iframe.
    const renderTask = page.render(renderOptions);
    try {
      await this.ready(renderTask.promise);
    } catch (error) {
      renderTask.cancel();
      canvas.width = 0;
      canvas.height = 0;
      throw error;
    }
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = color;
    ctx.globalCompositeOperation = 'multiply';
    for (const rect of position.rects) {
      const transformed = viewport.convertToViewportRectangle(
        Cu.cloneInto(
          type === 'underline'
            ? [rect[0], rect[1], rect[2], rect[1] + Math.min(1.5, rect[3] - rect[1])]
            : rect,
          view._iframeWindow,
        ),
      );
      const x = Math.min(transformed[0], transformed[2]),
        y = Math.min(transformed[1], transformed[3]);
      const w = Math.abs(transformed[2] - transformed[0]),
        h = Math.abs(transformed[3] - transformed[1]);
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
    const data = canvas.toDataURL('image/png');
    canvas.width = 0;
    canvas.height = 0;
    return data;
  }
  async navigate(id: number, position: Position, annotationKey?: string): Promise<void> {
    await this.view(id);
    const reader = await Zotero.Reader.open(id);
    const actual = reader || this.readers.get(id);
    await actual.navigate(annotationKey ? { annotationID: annotationKey } : { position });
  }
  async transaction<T>(work: () => Promise<T>): Promise<T> {
    const removals: { attachmentID: number; key: string }[] = [];
    this.pendingRemovals = removals;
    let result: T;
    try {
      result = await Zotero.DB.executeTransaction(work);
    } finally {
      this.pendingRemovals = null;
    }
    // The 10.0.5 reader handles hard-delete notifications, but not trashed annotations.
    // Remove only committed operation copies from every open view; rollback leaves views intact.
    try {
      for (const reader of Zotero.Reader._readers) {
        const keys = removals.filter((r) => r.attachmentID === reader.itemID).map((r) => r.key);
        if (keys.length && !reader._isTabClosed && reader._internalReader) {
          await this.ready(reader.unsetAnnotations(keys));
        }
      }
    } catch (error) {
      Zotero.logError(error);
      throw new Error(
        'Copies are in Trash, but an open reader could not refresh. Reopen the PDF and MarginCarry to recover the operation journal.',
      );
    }
    return result;
  }
  newKey(): string {
    return Zotero.DataObjectUtilities.generateKey();
  }
  async create(targetID: number, copy: Copy): Promise<Created> {
    const target = await this.attachment(targetID);
    if (Zotero.Items.getByLibraryAndKey(target.libraryID, copy.key))
      throw new Error('Generated key already exists.');
    const view = await this.verifiedView(targetID);
    await view._ensureBasicPageData(copy.position.pageIndex);
    const meta = view.getAnnotationMeta(Cu.cloneInto(copy.position, view._iframeWindow));
    // saveFromJSON always calls saveTx in 10.0.5, which cannot nest in executeTransaction.
    // Use the native Item setters and save() inside our single outer transaction instead.
    const item = new Zotero.Item('annotation');
    item.libraryID = target.libraryID;
    item.key = copy.key;
    await item.loadPrimaryData();
    item.parentID = target.id;
    item.annotationType = copy.type;
    item.annotationText = copy.text;
    item.annotationComment = copy.comment;
    item.annotationColor = copy.color;
    item.annotationPageLabel = meta.pageLabel;
    item.annotationSortIndex = meta.sortIndex;
    item.annotationPosition = JSON.stringify(copy.position);
    item.annotationIsExternal = false;
    item.setTags(copy.tags.map((tag) => ({ tag })));
    await item.save({ skipSelect: true });
    return { key: item.key, sourceKey: copy.sourceKey, fingerprint: this.canonical(item) };
  }
  async fingerprint(libraryID: number, key: string): Promise<string | null> {
    const item = Zotero.Items.getByLibraryAndKey(libraryID, key);
    return item ? this.canonical(item) : null;
  }
  async trash(libraryID: number, key: string): Promise<string> {
    const item = Zotero.Items.getByLibraryAndKey(libraryID, key);
    if (!item?.isAnnotation()) throw new Error('Created annotation no longer exists.');
    if (!this.pendingRemovals) throw new Error('Undo requires an active operation transaction.');
    item.deleted = true;
    await item.save();
    this.pendingRemovals.push({ attachmentID: item.parentID, key });
    return this.canonical(item);
  }
  async readJournal(): Promise<TransferRecord[]> {
    if (!(await IOUtils.exists(this.journalPath))) return [];
    const data = await IOUtils.readJSON(this.journalPath);
    if (
      !Array.isArray(data) ||
      data.some((r) => r.schema !== 1 || !Array.isArray(r.created) || !Array.isArray(r.copies))
    )
      throw new Error('Transfer journal has an unsupported format.');
    return data;
  }
  async writeJournal(records: TransferRecord[]): Promise<void> {
    await IOUtils.makeDirectory(PathUtils.parent(this.journalPath), { ignoreExisting: true });
    await IOUtils.writeJSON(this.journalPath, records, {
      tmpPath: `${this.journalPath}.tmp`,
      flush: true,
    });
  }
  mainWindows(): Window[] {
    return Zotero.getMainWindows();
  }
  openWindow(url: string, argument: unknown): Window {
    return Zotero.getMainWindow().openDialog(
      url,
      'margincarry-transfer',
      'chrome,centerscreen,resizable,width=1180,height=820',
      argument,
    );
  }
  log(error: unknown): void {
    Zotero.logError(error);
  }
  async yield(): Promise<void> {
    await Zotero.Promise.delay(0);
  }
}
