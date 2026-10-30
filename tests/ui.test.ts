import assert from 'node:assert/strict';
import test from 'node:test';
import { type Locale, Localization, localeNames, locales } from '../src/l10n.ts';
import type { Selection, Snapshot } from '../src/model.ts';
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
interface Scenario {
  old: string;
  new: string;
  quotes: string[];
}
// One 7-unit glyph per UTF-16 unit; the default scenario is a single 'needle' glyph.
function glyphs(text: string) {
  return Array.from(text, (c, i) => {
    const rect = [10 + 7 * i, 700, 17 + 7 * i, 710];
    return { c, rect, inlineRect: [...rect] };
  });
}
async function fixture(locale: Locale = 'en', scenario?: Scenario) {
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
  const pageOf = (chars: object[]) => ({ index: 0, label: '1', viewBox: [0, 0, 612, 792], chars });
  const page = pageOf([glyph]);
  const oldPage = scenario ? pageOf(glyphs(scenario.old)) : page;
  const newPage = scenario ? pageOf(glyphs(scenario.new)) : page;
  const source = {
    id: 1,
    key: 'OLD',
    parentID: 3,
    libraryID: 1,
    title: 'old',
    itemFingerprint: 'old',
    file: { path: 'old.pdf', hash: 'a', size: 1, modified: 1 },
    annotations: (scenario?.quotes ?? ['needle']).map((quote, i) => {
      const at = scenario ? scenario.old.indexOf(quote) : 0;
      return {
        key: `ANN${i}`,
        type: 'highlight',
        text: quote,
        comment: '',
        color: '#ffd400',
        tags: [],
        position: {
          pageIndex: 0,
          rects: [scenario ? [10 + 7 * at, 700, 10 + 7 * (at + quote.length), 710] : glyph.rect],
        },
        external: false,
        fingerprint: 's',
      };
    }),
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
    pages: async (id: number) => [id === 1 ? oldPage : newPage],
    snapshot: async (id: number) => (id === 1 ? source : target),
    yield: async () => {},
    log() {},
    preview: async () => {
      entered();
      await held;
      return 'data:image/png;base64,fixture';
    },
  } as unknown as ZoteroAdapter;
  const applied: Selection[][] = [];
  const ui = new TransferWindow(win as unknown as Window, adapter, {
    journal: async () => [],
    apply: async (_plan: unknown, selections: Selection[]) => {
      applied.push(selections);
      return { created: selections, copies: [] };
    },
  } as unknown as TransferService);
  await ui.init([1, 2]);
  el('old').value = '1';
  el('new').value = '2';
  const until = async (done: () => boolean) => {
    for (let i = 0; i < 100 && !done(); i++) await new Promise((r) => setTimeout(r, 0));
    assert.ok(done(), 'UI did not finish');
  };
  return { el, document, started, release, until, applied };
}

test('cancel while first previews load leaves no applicable plan or stale image', async () => {
  const { el, started, release, until } = await fixture();
  el('analyze').onclick!();
  await started;
  assert.equal(el('cancel').disabled, false);
  assert.equal(el('language-en').disabled, true);
  assert.equal(el('language-ru').disabled, true);
  assert.equal(el('accept').disabled, true);
  el('cancel').onclick!();
  release();
  await until(() => el('cancel').disabled);
  assert.equal(el('status').textContent, 'Analysis cancelled. Nothing was written.');
  assert.equal(el('selected-count').textContent, 'Selected to write: 0');
  assert.equal(el('detail').hidden, true);
  assert.equal(el('apply').disabled, true);
});

for (const locale of locales) {
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

test('every language button switches the dialog and preserves accepted locations', async () => {
  const { el, document, release, until } = await fixture();
  release();
  el('analyze').onclick!();
  await until(() => el('cancel').disabled);
  el('accept').onclick!();
  const buttons = el('language-options').children;
  assert.deepEqual(
    buttons.map((button) => button.textContent),
    locales.map((locale) => localeNames[locale]),
  );
  assert.deepEqual(
    buttons.map((button) => button.id),
    locales.map((locale) => `language-${locale}`),
  );
  for (const locale of [...locales.slice(1), 'en'] as const) {
    const l = new Localization(locale);
    el(`language-${locale}`).onclick!();
    await until(
      () =>
        document.documentElement.lang === locale &&
        el('status').textContent === l.t('analyzed', { count: 1 }),
    );
    assert.equal(el('selected-count').textContent, l.t('selected', { count: 1 }));
    assert.equal(el('subtitle').textContent, l.t('subtitle'));
    assert.ok(el('outcome').textContent.startsWith(l.t('unique candidate')), locale);
    assert.equal(el('source-preview').getAttribute('alt'), l.t('sourceImage'));
    assert.ok(el('metadata').textContent.startsWith(l.t('typeHighlight')), locale);
    assert.equal(el('apply').disabled, false);
    for (const other of locales)
      assert.equal(
        el(`language-${other}`).getAttribute('aria-pressed'),
        String(other === locale),
        `${locale}/${other}`,
      );
  }
});

test('Russian status text translates the reason of a proposal', async () => {
  const { el, release, until } = await fixture('ru');
  release();
  el('analyze').onclick!();
  await until(() => el('cancel').disabled);
  assert.match(el('outcome').textContent, /Одно вхождение текста/);
});

for (const locale of locales) {
  test(`the initial review count and language button are localized before analysis (${locale})`, async () => {
    const { el } = await fixture(locale);
    assert.equal(
      el('selected-count').textContent,
      new Localization(locale).t('selected', { count: 0 }),
    );
    assert.equal(el('apply').disabled, true);
    for (const other of locales)
      assert.equal(el(`language-${other}`).getAttribute('aria-pressed'), String(other === locale));
  });
}

const mixed: Scenario = {
  old: 'see 41.0 and cat and not',
  new: 'see 41.03 and concatenate and cannot',
  quotes: ['see', '41.0', 'cat', 'not'],
};
for (const locale of locales) {
  test(`mass selection skips doubtful word and number matches; manual choice still applies (${locale})`, async () => {
    const { el, release, until, applied } = await fixture(locale, mixed);
    const l = new Localization(locale);
    release();
    el('analyze').onclick!();
    await until(() => el('cancel').disabled);
    const rows = () => el('list').children.map((row) => row.children[1]!.textContent);
    assert.deepEqual(rows(), [
      l.t('unique candidate'),
      l.t('doubtful candidate'),
      l.t('doubtful candidate'),
      l.t('doubtful candidate'),
    ]);

    el('accept-unique').onclick!();
    assert.equal(el('selected-count').textContent, l.t('selected', { count: 1 }));
    assert.deepEqual(rows().slice(1), Array(3).fill(l.t('doubtful candidate')));

    // The doubtful row explains itself, preselects nothing and cannot be accepted blindly.
    el('list').children[1]!.onclick!();
    await until(() => el('outcome').textContent.startsWith(l.t('doubtful candidate')));
    assert.equal(el('candidates').value, '');
    assert.equal(el('accept').disabled, true);
    assert.match(el('candidates').children[1]!.textContent, new RegExp(l.t('boundaryDiffers')));

    // A person can still inspect and select it deliberately.
    el('candidates').value = '0:4:8';
    el('candidates').onchange!();
    await until(() => !el('accept').disabled);
    el('accept').onclick!();
    assert.equal(el('selected-count').textContent, l.t('selected', { count: 2 }));
    el('apply').onclick!();
    await until(() => applied.length === 1);
    assert.deepEqual(applied[0], [
      { sourceKey: 'ANN0', candidateID: '0:0:3' },
      { sourceKey: 'ANN1', candidateID: '0:4:8' },
    ]);
  });
}
