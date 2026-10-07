import assert from 'node:assert/strict';
import test from 'node:test';
import { type Locale, Localization } from '../src/l10n.ts';
import type { Snapshot } from '../src/model.ts';
import type { TransferService } from '../src/transfer.ts';
import { TransferWindow } from '../src/ui.ts';
import type { ZoteroAdapter } from '../src/zotero.ts';

// Small DOM boundary double: tests drive actual UI event handlers and asynchronous state transitions.
class Element {
  value = '';
  textContent = '';
  disabled = false;
  hidden = false;
  selectedIndex = 0;
  src = '';
  children: Element[] = [];
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  onclick: (() => void) | null = null;
  onchange: (() => void) | null = null;
  append(...children: Element[]) {
    this.children.push(...children);
  }
  replaceChildren() {
    this.children = [];
  }
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }
  removeAttribute(name: string) {
    this.attributes.delete(name);
    if (name === 'src') this.src = '';
  }
}
async function fixture(locale: Locale = 'en') {
  const nodes = new Map<string, Element>();
  const el = (id: string) => {
    let node = nodes.get(id);
    if (!node) {
      node = new Element();
      nodes.set(id, node);
    }
    return node;
  };
  const subtitle = el('subtitle');
  subtitle.dataset.l10n = 'subtitle';
  const sourceImage = el('source-preview');
  sourceImage.setAttribute('data-l10n-alt', 'sourceImage');
  const document = {
    documentElement: { lang: 'en' },
    getElementById: el,
    createElement: () => new Element(),
    querySelectorAll: (selector: string) =>
      selector === '[data-l10n]' ? [subtitle] : selector === '[data-l10n-alt]' ? [sourceImage] : [],
  };
  const win = { document, addEventListener() {}, focus() {}, confirm: () => true };
  const glyph = { c: 'needle', rect: [10, 700, 52, 710], inlineRect: [10, 700, 52, 710] };
  const page = { index: 0, label: '1', viewBox: [0, 0, 612, 792], chars: [glyph] };
  const source = {
    id: 1,
    key: 'OLD',
    parentID: 3,
    libraryID: 1,
    title: 'old',
    itemFingerprint: 'old',
    file: { path: 'old.pdf', hash: 'a', size: 1, modified: 1 },
    annotations: [
      {
        key: 'ANN',
        type: 'highlight',
        text: 'needle',
        comment: '',
        color: '#ffd400',
        tags: [],
        position: { pageIndex: 0, rects: [glyph.rect] },
        external: false,
        fingerprint: 's',
      },
    ],
  } as Snapshot;
  const target = { ...source, id: 2, key: 'NEW', title: 'new', annotations: [] };
  let release: () => void = () => {};
  let entered: () => void = () => {};
  const held = new Promise<void>((r) => {
    release = r;
  });
  const started = new Promise<void>((r) => {
    entered = r;
  });
  const adapter = {
    locale: () => locale,
    choices: async () => [
      { id: 1, title: 'old' },
      { id: 2, title: 'new' },
    ],
    controller: () => new AbortController(),
    pair: async () => [source, target],
    pages: async () => [page],
    snapshot: async (id: number) => (id === 1 ? source : target),
    yield: async () => {},
    log() {},
    preview: async () => {
      entered();
      await held;
      return 'data:image/png;base64,fixture';
    },
  } as unknown as ZoteroAdapter;
  const ui = new TransferWindow(win as unknown as Window, adapter, {
    journal: async () => [],
  } as unknown as TransferService);
  await ui.init([1, 2]);
  el('old').value = '1';
  el('new').value = '2';
  const until = async (done: () => boolean) => {
    for (let i = 0; i < 100 && !done(); i++) await new Promise((r) => setTimeout(r, 0));
    assert.ok(done(), 'UI did not finish');
  };
  return { el, document, started, release, until };
}

test('cancel while first previews load leaves no applicable plan or stale image', async () => {
  const { el, started, release, until } = await fixture();
  el('analyze').onclick!();
  await started;
  assert.equal(el('cancel').disabled, false);
  assert.equal(el('accept').disabled, true);
  el('cancel').onclick!();
  release();
  await until(() => el('cancel').disabled);
  assert.equal(el('status').textContent, 'Analysis cancelled. Nothing was written.');
  assert.equal(el('selected-count').textContent, 'Selected to write: 0');
  assert.equal(el('detail').hidden, true);
  assert.equal(el('apply').disabled, true);
});

for (const locale of ['en', 'ru'] as const) {
  test(`direction change clears the visible review count (${locale})`, async () => {
    const { el, document, release, until } = await fixture(locale);
    release();
    el('analyze').onclick!();
    await until(() => el('cancel').disabled);
    el('accept').onclick!();
    assert.equal(
      el('selected-count').textContent,
      new Localization(locale).t('selected', { count: 1 }),
    );
    el('old').onchange!();
    assert.equal(
      el('selected-count').textContent,
      new Localization(locale).t('selected', { count: 0 }),
    );
    assert.equal(el('review').children.length, 0);
    assert.equal(el('apply').disabled, true);
    assert.equal(document.documentElement.lang, locale);
    assert.equal(el('subtitle').textContent, new Localization(locale).t('subtitle'));
    assert.equal(
      el('source-preview').getAttribute('alt'),
      new Localization(locale).t('sourceImage'),
    );
  });
}

test('switching language preserves accepted locations and translates dynamic and accessible text', async () => {
  const { el, document, release, until } = await fixture();
  release();
  el('analyze').onclick!();
  await until(() => el('cancel').disabled);
  el('accept').onclick!();
  el('language').value = 'ru';
  el('language').onchange!();
  await until(() => el('status').textContent.startsWith('Учтено'));
  assert.equal(document.documentElement.lang, 'ru');
  assert.equal(el('selected-count').textContent, 'Выбрано для записи: 1');
  assert.match(el('outcome').textContent, /Одно текстовое вхождение/);
  assert.equal(
    el('source-preview').getAttribute('alt'),
    'Исходное выделение на реальной PDF-странице',
  );
  assert.equal(el('apply').disabled, false);
});

test('the initial Russian review count is localized before analysis', async () => {
  const { el } = await fixture('ru');
  assert.equal(el('selected-count').textContent, 'Выбрано для записи: 0');
  assert.equal(el('apply').disabled, true);
});
