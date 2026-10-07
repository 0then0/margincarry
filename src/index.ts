import { Localization } from './l10n.ts';
import { TransferService } from './transfer.ts';
import { TransferWindow } from './ui.ts';
import { ZoteroAdapter } from './zotero.ts';

export { analyze } from './analysis.ts';
export { rangePosition } from './geometry.ts';
export { propose } from './matching.ts';
export { pageText } from './text.ts';

export const adapter = new ZoteroAdapter();
export const service = new TransferService(adapter);
const windows = new Set<Window>();
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
  doc.getElementById('menu_ToolsPopup')?.append(item);
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
  for (const win of adapter.mainWindows())
    win.document.getElementById('margincarry-menu')?.remove();
  for (const win of windows) win.close();
  windows.clear();
  root = '';
}
export function resourceRoot(): string {
  return root;
}
