import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  type Locale,
  Localization,
  localeNames,
  locales,
  resources,
  selectLocale,
} from '../src/l10n.ts';
import { messages, ui } from '../src/locales/en.ts';

const others = locales.filter((locale) => locale !== 'en');
const params = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('English is the fallback; Zotero and BCP 47 locales select the matching language', () => {
  const expected: Record<string, Locale> = {
    'en-US': 'en',
    en: 'en',
    '': 'en',
    'ru-RU': 'ru',
    RU: 'ru',
    'es-ES': 'es',
    'es-MX': 'es',
    'de-DE': 'de',
    'de-AT': 'de',
    'fr-FR': 'fr',
    'fr-CA': 'fr',
    ja: 'ja',
    'ja-JP': 'ja',
    'pt-BR': 'pt-BR',
    pt_BR: 'pt-BR',
    'pt-PT': 'pt-BR',
    pt: 'pt-BR',
    'zh-CN': 'en',
    'it-IT': 'en',
    'ruby-x': 'en',
  };
  for (const [tag, locale] of Object.entries(expected))
    assert.equal(selectLocale(tag), locale, tag);
});

test('every language has a native name and the same keys and parameters as English', () => {
  assert.deepEqual([...locales], ['en', 'ru', 'es', 'de', 'fr', 'ja', 'pt-BR']);
  for (const locale of locales) {
    assert.ok(localeNames[locale].length, locale);
    assert.deepEqual(Object.keys(resources[locale].ui).sort(), Object.keys(ui).sort(), locale);
    assert.deepEqual(Object.keys(resources[locale].messages).sort(), [...messages].sort(), locale);
    for (const key of Object.keys(ui) as (keyof typeof ui)[]) {
      const value = resources[locale].ui[key];
      assert.ok(value.trim().length || key === 'accepted' || key === 'skipped', `${locale}.${key}`);
      assert.deepEqual(params(value), params(ui[key]), `${locale}.${key}`);
    }
    for (const message of messages) {
      const value = resources[locale].messages[message];
      assert.ok(value.length, `${locale}: ${message}`);
      assert.deepEqual(params(value), [], `${locale}: ${message}`);
    }
  }
});

test('other languages are real translations, not copied English', () => {
  for (const locale of others) {
    const same = (Object.keys(ui) as (keyof typeof ui)[]).filter(
      (key) =>
        !/^type[A-Z]/.test(key) && key !== 'outcome' && resources[locale].ui[key] === ui[key],
    );
    assert.ok(same.length <= 6, `${locale}: ${same.join(', ')}`);
    const untranslated = messages.filter((m) => resources[locale].messages[m] === m);
    assert.deepEqual(untranslated, [], locale);
  }
  const script: Partial<Record<Locale, RegExp>> = {
    ru: /\p{Script=Cyrillic}/u,
    ja: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u,
  };
  for (const [locale, pattern] of Object.entries(script) as [Locale, RegExp][]) {
    for (const [key, value] of Object.entries(resources[locale].ui))
      if (
        /[a-z]{4}/i.test(ui[key as keyof typeof ui].replace(/\{\w+\}/g, '')) &&
        !/^\{\w+\}$/.test(value)
      )
        assert.match(value, pattern, `${locale}.${key}`);
  }
});

test('every static XHTML localization key exists in every language', async () => {
  const html = await readFile(new URL('../content/transfer.xhtml', import.meta.url), 'utf8');
  const keys = [...html.matchAll(/data-l10n(?:-title|-aria-label|-alt)?="([^"]+)"/g)].map(
    (match) => match[1]!,
  );
  assert.ok(keys.length > 20);
  for (const locale of locales)
    for (const key of keys) assert.ok(key in resources[locale].ui, `${locale}.${key}`);
});

test('project-owned messages are translated, quoted data and unknown host text are not', () => {
  for (const locale of others) {
    const l = new Localization(locale);
    for (const message of messages) {
      assert.equal(l.message(message), resources[locale].messages[message]);
      assert.equal(l.message(`Error: ${message}`), resources[locale].messages[message]);
    }
    assert.equal(l.message('Some host diagnostic'), 'Some host diagnostic', locale);
    assert.equal(
      l.message('Source pages: 2/10'),
      l.t('sourceProgress', { current: '2', total: '10' }),
    );
    assert.equal(
      l.message('Target pages: 3/11'),
      l.t('targetProgress', { current: '3', total: '11' }),
    );
    assert.equal(
      l.message('Annotations: 4/12'),
      l.t('annotationProgress', { current: '4', total: '12' }),
    );
    assert.equal(
      l.message('Candidate list limited to 200; uniqueness is unknown.'),
      l.t('limit', { limit: '200' }),
    );
    assert.equal(
      l.message('Page 7 has incomplete extraction data.'),
      l.t('incompletePage', { page: '7' }),
    );
    assert.equal(
      l.message(
        'Source annotation ABC was already transferred. Undo that operation before copying it again.',
      ),
      l.t('duplicate', { key: 'ABC' }),
    );
    assert.equal(
      l.message('Undo conflict: ABC was edited, moved or deleted. No copies were removed.'),
      l.t('conflict', { keys: 'ABC' }),
    );
    // A nested message is translated inside the surrounding sentence.
    assert.equal(
      l.message('PDF extraction failed: The PDF is not locally available. Download it first.'),
      l.t('extractionFailed', {
        error: resources[locale].messages['The PDF is not locally available. Download it first.'],
      }),
    );
  }
  const english = new Localization('en');
  assert.equal(english.message('Empty source text.'), 'Empty source text.');
  assert.equal(
    english.message('Undo conflict: ABC was edited, moved or deleted. No copies were removed.'),
    'Undo conflict: ABC was edited, moved or deleted. No copies were removed.',
  );
});

test('interpolation leaves unknown placeholders visible and fills known ones', () => {
  for (const locale of locales) {
    const l = new Localization(locale);
    assert.match(l.t('selected', { count: 5 }), /5/);
    assert.match(l.t('selected'), /\{count\}/);
  }
});

test('every literal message in the source is a translated message and none is unused', async () => {
  const dir = new URL('../src/', import.meta.url);
  const files = (await readdir(dir)).filter((f) => f.endsWith('.ts'));
  const used = new Set<string>();
  let text = '';
  for (const file of files) text += `${await readFile(new URL(file, dir), 'utf8')}\n`;
  for (const m of text.matchAll(/(?:new Error|reason = |reason: )\(?\s*'((?:[^'\\]|\\.)+)'/gs))
    used.add(m[1]!.replace(/\\'/g, "'"));
  for (const m of text.matchAll(/\?\s*'((?:[^'\\]|\\.){12,})'\s*:/gs)) used.add(m[1]!);
  const known = new Set<string>(messages);
  for (const message of used)
    if (/^[A-Z]/.test(message) && /[.]$/.test(message))
      assert.ok(known.has(message), `untranslated message: ${message}`);
  for (const message of messages)
    assert.ok(text.includes(message.replace(/'/g, "\\'")) || text.includes(message), message);
});
