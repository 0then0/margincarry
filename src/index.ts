import { Localization } from './l10n.ts';
import { NoteCopyService } from './note-copy.ts';
import { initNoteCopy } from './note-copy-ui.ts';
import { TransferService } from './transfer.ts';
import { TransferWindow } from './ui.ts';
import { ZoteroAdapter } from './zotero.ts';

export { analyze } from './analysis.ts';
export { rangePosition } from './geometry.ts';
export { propose } from './matching.ts';
export { pageText } from './text.ts';

export const adapter = new ZoteroAdapter();
export const service = new TransferService(adapter);
const noteCopyService = new NoteCopyService(adapter, service);
const windows = new Set<Window>();
let noteCopyWindow: { win: Window; ids: number[]; bind?: (ids: number[]) => void } | null = null;
let root = '';
export function install(win: Window): void {
  const doc = win.document;
  if (doc.getElementById('margincarry-menu')) return;
  const item = adapter.menuItem(win);
  item.id = 'margincarry-menu';
  item.setAttribute('label', new Localization(adapter.locale()).t('menu'));
  item.addEventListener('command', () => {
    void open().catch((e) => adapter.log(e));
  });
  const noteCopy = adapter.menuItem(win);
  noteCopy.id = 'margincarry-note-copy-menu';
  noteCopy.setAttribute('label', new Localization(adapter.locale()).t('noteCopyMenu'));
  noteCopy.addEventListener('command', () => {
    void openNoteCopy(adapter.selectedIDs(win)).catch((e) => adapter.log(e));
  });
  doc.getElementById('menu_ToolsPopup')?.append(item, noteCopy);
}
export function uninstallMenu(win: Window): void {
  for (const id of ['margincarry-menu', 'margincarry-note-copy-menu'])
    win.document.getElementById(id)?.remove();
}
export async function openNoteCopy(ids = adapter.selectedIDs()): Promise<void> {
  if (noteCopyWindow && !noteCopyWindow.win.closed) {
    if (ids.join(',') !== noteCopyWindow.ids.join(',')) {
      noteCopyWindow.ids = ids;
      noteCopyWindow.bind?.(ids);
    }
    noteCopyWindow.win.focus();
    return;
  }
  const win = adapter.openWindow('chrome://margincarry/content/note-copy.xhtml', {}, '_blank');
  const dialog: NonNullable<typeof noteCopyWindow> = { win, ids };
  noteCopyWindow = dialog;
  win.addEventListener(
    'load',
    () => {
      // Listen for the dialog's unload after Gecko replaces its initial blank document.
      win.addEventListener(
        'unload',
        () => {
          if (noteCopyWindow === dialog) noteCopyWindow = null;
        },
        { once: true },
      );
      dialog.bind = initNoteCopy(win, adapter, noteCopyService);
      dialog.bind(dialog.ids);
    },
    { once: true },
  );
}
export async function open(ids = adapter.selectedIDs()): Promise<void> {
  // One review window shares one operation lock and journal.
  for (const win of windows) {
    if (!win.closed) {
      win.focus();
      return;
    }
  }
  const win = adapter.openWindow('chrome://margincarry/content/transfer.xhtml', {});
  windows.add(win);
  win.addEventListener(
    'load',
    () => {
      const ui = new TransferWindow(win, adapter, service);
      void ui.init(ids).catch((e) => {
        const status = win.document.getElementById('status');
        if (status) status.textContent = String(e);
        adapter.log(e);
      });
    },
    { once: true },
  );
  win.addEventListener('unload', () => windows.delete(win), { once: true });
}
export function start(rootURI: string): void {
  root = rootURI;
  for (const win of adapter.mainWindows()) install(win);
}
export function stop(): void {
  for (const win of adapter.mainWindows()) uninstallMenu(win);
  noteCopyWindow?.win.close();
  noteCopyWindow = null;
  for (const win of windows) win.close();
  windows.clear();
  root = '';
}
export function resourceRoot(): string {
  return root;
}
