import { Localization } from './l10n.ts';
import type { NoteCopyPreview, NoteCopyService } from './note-copy.ts';
import type { ZoteroAdapter } from './zotero.ts';

export function initNoteCopy(
  win: Window,
  adapter: Pick<ZoteroAdapter, 'locale' | 'log' | 'selectItem'>,
  service: Pick<NoteCopyService, 'choices' | 'preview' | 'save'>,
): (ids: number[]) => void {
  const doc = win.document;
  const l10n = new Localization(adapter.locale());
  l10n.apply(doc);
  const operation = doc.getElementById('operation') as HTMLSelectElement;
  const previewButton = doc.getElementById('preview') as HTMLButtonElement;
  const save = doc.getElementById('save') as HTMLButtonElement;
  const open = doc.getElementById('open-note-copy') as HTMLButtonElement;
  const links = doc.getElementById('note-copy-links') as HTMLUListElement;
  const status = doc.getElementById('status') as HTMLElement;
  const source = doc.getElementById('note-copy-source') as HTMLElement;
  let preview: NoteCopyPreview | null = null;
  const setPreviewEnabled = (enabled: boolean) => {
    operation.disabled = !enabled;
    previewButton.disabled = !enabled;
  };
  const clearPreview = () => {
    preview = null;
    save.disabled = true;
    links.replaceChildren();
  };
  let selection = 0;
  let pending = Promise.resolve();
  return (ids) => {
    const version = ++selection;
    const active = () => version === selection && !win.closed;
    clearPreview();
    setPreviewEnabled(false);
    operation.replaceChildren();
    operation.onchange = null;
    previewButton.onclick = null;
    save.onclick = null;
    open.onclick = null;
    open.hidden = true;
    source.hidden = true;
    source.textContent = '';
    status.textContent = l10n.t('preparing');

    const noteID = ids[0];
    if (ids.length !== 1 || noteID === undefined) {
      status.textContent = l10n.message('Choose one child note in your personal library.');
      return;
    }

    // Finish any confirmed save or active preview before reading the journal for another note.
    const handle = (work: () => Promise<void>) => () => {
      pending = pending
        .then(async () => {
          if (active()) await work();
        })
        .catch((error) => {
          if (active())
            status.textContent = l10n.message(
              error instanceof Error ? error.message : String(error),
            );
          adapter.log(error);
        });
    };

    operation.onchange = () => {
      clearPreview();
      status.textContent = '';
    };
    previewButton.onclick = handle(async () => {
      clearPreview();
      setPreviewEnabled(false);
      status.textContent = l10n.t('preparing');
      try {
        const result = await service.preview(noteID, operation.value, doc);
        if (!active()) return;
        for (const row of result.rows) {
          const li = doc.createElement('li');
          li.textContent =
            row.newPage === undefined
              ? l10n.t('noteCopyNoPair', { page: row.oldPage ?? '?', text: row.text })
              : l10n.t('reviewLine', { old: row.oldPage ?? '?', new: row.newPage, text: row.text });
          links.append(li);
        }
        if (result.rows.some((row) => row.newPage !== undefined)) {
          preview = result;
          save.disabled = false;
          status.textContent = l10n.t('noteCopyReview');
        } else {
          status.textContent = l10n.message('There are no confirmed links to copy.');
        }
      } finally {
        if (active()) setPreviewEnabled(true);
      }
    });
    save.onclick = handle(async () => {
      if (!preview) return;
      const confirmed = preview;
      preview = null;
      save.disabled = true;
      setPreviewEnabled(false);
      status.textContent = l10n.t('writing');
      try {
        const id = await service.save(confirmed, doc);
        if (!active()) return;
        status.textContent = l10n.t('noteCopyCreated');
        open.hidden = false;
        open.onclick = handle(() => adapter.selectItem(id));
      } catch (error) {
        if (active()) {
          clearPreview();
          setPreviewEnabled(true);
        }
        throw error;
      }
    });

    handle(async () => {
      const { noteTitle, operations } = await service.choices(noteID);
      if (!active()) return;
      source.textContent = noteTitle ? `${l10n.t('source')} · ${noteTitle}` : l10n.t('source');
      source.hidden = false;
      for (const choice of operations) {
        const option = doc.createElement('option');
        option.value = choice.id;
        const date = new Date(choice.date).toLocaleString(l10n.locale);
        option.textContent = `${date} · ${choice.sourceTitle} → ${choice.targetTitle}`;
        operation.append(option);
      }
      setPreviewEnabled(operations.length > 0);
      status.textContent = operations.length ? '' : l10n.t('noteCopyNoOperations');
    })();
  };
}
