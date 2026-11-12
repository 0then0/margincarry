import assert from 'node:assert/strict';
import test from 'node:test';
import { type Locale, Localization, localeNames, locales } from '../src/l10n.ts';
import type { Position, Selection, Snapshot } from '../src/model.ts';
import { initNoteCopy } from '../src/note-copy-ui.ts';
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

test('rebinding the note copy dialog discards ready and in-flight previews for earlier notes', async () => {
  const nodes = new Map<string, Element>();
  const el = (id: string) => {
    let node = nodes.get(id);
    if (!node) {
      node = new Element();
      nodes.set(id, node);
    }
    return node;
  };
  const document = {
    documentElement: { lang: 'en' },
    getElementById: el,
    createElement: () => new Element(),
    querySelectorAll: () => [],
  };
  const saved: number[] = [];
  const { promise: held, resolve: release } = Promise.withResolvers<void>();
  const { promise: started, resolve: enter } = Promise.withResolvers<void>();
  const bind = initNoteCopy(
    { document, closed: false } as unknown as Window,
    { locale: () => 'en', log: () => {}, selectItem: async () => {} },
    {
      choices: async (id) => ({
        noteTitle: `Note ${id}`,
        operations: [
          { id: 'transfer', date: '2026-11-07', sourceTitle: 'Old', targetTitle: 'New' },
        ],
      }),
      preview: async (id, operationID) => {
        if (id === 2) {
          enter();
          await held;
        }
        return {
          note: { id, key: '', title: '', libraryID: 1, parentID: 1, html: '', editorHTMLs: [] },
          operationID,
          html: '',
          rows: [{ text: `Quote ${id}`, oldPage: '1', newPage: '2' }],
        };
      },
      save: async ({ note }) => saved.push(note.id),
    },
  );
  const until = async (done: () => boolean) => {
    for (let i = 0; i < 100 && !done(); i++) await new Promise((r) => setTimeout(r, 0));
    assert.ok(done(), 'Note copy dialog did not finish');
  };
  const preview = () => {
    el('operation').value = 'transfer';
    el('preview').onclick!();
  };
  bind([1]);
  await until(() => !el('preview').disabled);
  preview();
  await until(() => !el('save').disabled);
  const saveFirst = el('save').onclick!;
  bind([2]);
  saveFirst();
  assert.equal(el('save').disabled, true);
  assert.deepEqual(el('note-copy-links').children, []);
  await until(() => !el('preview').disabled);
  preview();
  await started;
  bind([3]);
  release();
  await until(() => el('note-copy-source').textContent.includes('Note 3'));
  assert.equal(el('save').disabled, true);
  assert.deepEqual(el('note-copy-links').children, []);
  assert.deepEqual(saved, []);
  preview();
  await until(() => !el('save').disabled);
  assert.match(el('note-copy-links').children[0]!.textContent, /Quote 3/u);
  el('save').onclick!();
  await until(() => saved.length === 1);
  assert.deepEqual(saved, [3]);
});

interface Scenario {
  /** Text of the page, or of each consecutive page. */
  old: string | string[];
  new: string | string[];
  quotes: string[];
  /** Source positions, when a quote is not simply found on the first old page. */
  positions?: Position[];
  /** Index of a new page that the host returned only partly. */
  partial?: number;
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
  const pageOf = (chars: object[], index = 0) => ({
    index,
    label: String(index + 1),
    viewBox: [0, 0, 612, 792],
    chars,
  });
  const pagesOf = (text?: string | string[]) =>
    text === undefined ? [pageOf([glyph])] : [text].flat().map((t, i) => pageOf(glyphs(t), i));
  const oldPages = pagesOf(scenario?.old);
  const newPages = pagesOf(scenario?.new);
  if (scenario?.partial !== undefined)
    Object.assign(newPages[scenario.partial]!, { partial: true });
  const source = {
    id: 1,
    key: 'OLD',
    parentID: 3,
    libraryID: 1,
    title: 'old',
    itemFingerprint: 'old',
    file: { path: 'old.pdf', hash: 'a', size: 1, modified: 1 },
    annotations: (scenario?.quotes ?? ['needle']).map((quote, i) => {
      const at = scenario ? [scenario.old].flat()[0]!.indexOf(quote) : 0;
      return {
        key: `ANN${i}`,
        type: 'highlight',
        text: quote,
        comment: '',
        color: '#ffd400',
        tags: [],
        position: scenario?.positions?.[i] ?? {
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
    pages: async (id: number) => (id === 1 ? oldPages : newPages),
    snapshot: async (id: number) => (id === 1 ? source : target),
    yield: async () => {},
    log() {},
    preview: async (id: number, position: Position) => {
      entered();
      await held;
      if (failing.page === position.pageIndex) throw new Error('render failed');
      previews.push([id, position]);
      return `data:image/png;base64,fixture${id}-${position.pageIndex}`;
    },
    navigate: async (id: number, position: Position, key?: string) => {
      navigations.push([id, position, key]);
    },
  } as unknown as ZoteroAdapter;
  const previews: [number, Position][] = [];
  const navigations: [number, Position, string | undefined][] = [];
  const failing: { page: number | null } = { page: null };
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
  return { el, document, started, release, until, applied, previews, navigations, failing };
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

const breakRect = (from: number, to: number) => [10 + 7 * from, 700, 10 + 7 * to, 710];
for (const locale of locales) {
  test(`a proposal across a page break shows, opens and applies both pages (${locale})`, async () => {
    const { el, release, until, applied, previews, navigations } = await fixture(locale, {
      old: 'intro alpha beta outro',
      new: ['intro alpha', 'beta outro'],
      quotes: ['alpha beta'],
    });
    const l = new Localization(locale);
    release();
    el('analyze').onclick!();
    await until(() => el('cancel').disabled);
    assert.equal(el('target-page').textContent, l.t('targetPages', { page: '1–2', sheet: '1–2' }));
    assert.equal(
      el('candidates').children[0]!.textContent,
      l.t('candidatePages', { page: '1–2', method: l.t('exact') }),
    );
    assert.equal(el('source-page').textContent, l.t('sourcePage', { page: 1 }));
    assert.equal(el('target-next-page').textContent, l.t('nextPage', { page: '2' }));
    // One image per affected page; the one-page source has no second image or button.
    assert.equal(el('source-next').hidden, true);
    assert.equal(el('open-source-next').hidden, true);
    assert.equal(el('target-next').hidden, false);
    assert.equal(el('open-target-next').hidden, false);
    assert.equal(el('target-preview').src, 'data:image/png;base64,fixture2-0');
    assert.equal(el('target-next-preview').src, 'data:image/png;base64,fixture2-1');
    assert.equal(el('target-next-preview-status').textContent, '');
    assert.deepEqual(
      previews.filter(([id]) => id === 2).map(([, position]) => position),
      [
        { pageIndex: 0, rects: [breakRect(6, 11)] },
        { pageIndex: 1, rects: [breakRect(0, 4)] },
      ],
    );
    el('open-target').onclick!();
    el('open-target-next').onclick!();
    await until(() => navigations.length === 2);
    assert.deepEqual(navigations, [
      [2, { pageIndex: 0, rects: [breakRect(6, 11)] }, undefined],
      [2, { pageIndex: 1, rects: [breakRect(0, 4)] }, undefined],
    ]);
    // Nothing is written by the analysis: the candidate still needs Accept and a confirmed Apply.
    assert.equal(el('selected-count').textContent, l.t('selected', { count: 0 }));
    assert.equal(el('apply').disabled, true);
    el('accept').onclick!();
    assert.equal(
      el('review').children[0]!.textContent,
      l.t('reviewLine', { old: '1', new: '1–2', text: 'alpha beta' }),
    );
    el('apply').onclick!();
    await until(() => applied.length === 1);
    assert.deepEqual(applied[0], [{ sourceKey: 'ANN0', candidateID: '0:6:11+0:4' }]);
  });
}

test('a source across a page break shows and opens both of its pages', async () => {
  const position = { pageIndex: 0, rects: [breakRect(6, 11)], nextPageRects: [breakRect(0, 4)] };
  const { el, release, until, previews, navigations } = await fixture('en', {
    old: ['intro alpha', 'beta outro'],
    new: 'intro alpha beta outro',
    quotes: ['alpha beta'],
    positions: [position as Position],
  });
  release();
  el('analyze').onclick!();
  await until(() => el('cancel').disabled);
  assert.match(el('outcome').textContent, /^Unique candidate/);
  assert.equal(el('source-page').textContent, 'Source · pages 1–2');
  assert.equal(el('source-next-page').textContent, 'Continues on page 2');
  assert.equal(el('target-page').textContent, 'Target · page 1 (sheet 1)');
  assert.equal(el('source-next').hidden, false);
  assert.equal(el('target-next').hidden, true);
  assert.equal(el('open-target-next').hidden, true);
  assert.equal(el('source-next-preview').src, 'data:image/png;base64,fixture1-1');
  assert.deepEqual(
    previews.filter(([id]) => id === 1).map(([, part]) => part),
    [
      { pageIndex: 0, rects: position.rects },
      { pageIndex: 1, rects: position.nextPageRects },
    ],
  );
  el('open-source').onclick!();
  el('open-source-next').onclick!();
  await until(() => navigations.length === 2);
  // The first part opens the annotation itself; the second its rectangles on the next page.
  assert.deepEqual(navigations, [
    [1, position, 'ANN0'],
    [1, { pageIndex: 1, rects: position.nextPageRects }, undefined],
  ]);
  el('accept').onclick!();
  assert.equal(el('review').children[0]!.textContent, 'p. 1–2 → 1 · alpha beta');
});

test('a failed preview of the second page is reported next to it', async () => {
  const { el, release, until, failing } = await fixture('en', {
    old: 'intro alpha beta outro',
    new: ['intro alpha', 'beta outro'],
    quotes: ['alpha beta'],
  });
  failing.page = 1;
  release();
  el('analyze').onclick!();
  await until(() => el('cancel').disabled);
  assert.equal(el('target-preview').src, 'data:image/png;base64,fixture2-0');
  assert.equal(el('target-preview-status').textContent, '');
  assert.equal(el('target-next').hidden, false);
  assert.equal(el('target-next-preview').src, '');
  assert.match(
    el('target-next-preview-status').textContent,
    /^Preview unavailable: .*render failed/,
  );
});

test('a candidate whose second page was only partly extracted cannot be accepted or mass-selected', async () => {
  const { el, release, until } = await fixture('en', {
    old: 'intro alpha beta outro',
    new: ['intro alpha', 'beta outro'],
    quotes: ['alpha beta'],
    partial: 1,
  });
  release();
  el('analyze').onclick!();
  await until(() => el('cancel').disabled);
  assert.match(el('outcome').textContent, /^Processing error/);
  // It is still shown as a two-page occurrence, with the reason instead of an image.
  assert.equal(el('target-page').textContent, 'Target · pages 1–2 (sheets 1–2)');
  assert.match(el('candidates').children[0]!.textContent, /no reliable geometry/);
  assert.equal(el('geometry').textContent, 'The host returned partial page data.');
  assert.equal(el('target-next').hidden, false);
  for (const id of ['target-preview', 'target-next-preview']) {
    assert.equal(el(id).src, '');
    assert.equal(el(`${id}-status`).textContent, 'No verified location to preview.');
  }
  assert.equal(el('accept').disabled, true);
  assert.equal(el('open-target').disabled, true);
  assert.equal(el('open-target-next').disabled, true);
  el('accept-unique').onclick!();
  assert.equal(el('selected-count').textContent, 'Selected to write: 0');
  assert.equal(el('apply').disabled, true);
});
