import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { en, Localization, ru, russianMessages, selectLocale } from '../src/l10n.ts';

test('English is the fallback and Russian host locales select Russian', () => {
  assert.equal(selectLocale('en-US'), 'en');
  assert.equal(selectLocale('ru-RU'), 'ru');
  assert.equal(selectLocale('RU'), 'ru');
  assert.equal(selectLocale('de-DE'), 'en');
});
test('both locales contain the same interpolation parameters', () => {
  const params = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    assert.ok(ru[key].length, key);
    assert.deepEqual(params(en[key]), params(ru[key]), key);
  }
});
test('every static XHTML localization key exists in both locales', async () => {
  const html = await readFile(new URL('../content/transfer.xhtml', import.meta.url), 'utf8');
  for (const match of html.matchAll(/data-l10n(?:-title|-aria-label|-alt)?="([^"]+)"/g))
    assert.ok(match[1]! in en && match[1]! in ru, match[1]);
});
test('project-owned static and dynamic diagnostics are translated without changing quoted data', () => {
  const l = new Localization('ru');
  for (const [english, russian] of Object.entries(russianMessages)) {
    assert.equal(l.message(english), russian);
    assert.equal(l.message(`Error: ${english}`), russian);
  }
  assert.equal(l.message('Source pages: 2/10'), 'Страницы источника: 2/10');
  assert.equal(l.message('Target pages: 3/11'), 'Страницы цели: 3/11');
  assert.equal(
    l.message('Candidate list limited to 200; uniqueness is unknown.'),
    'Список ограничен 200 кандидатами; однозначность неизвестна.',
  );
  assert.equal(
    l.message('Undo conflict: ABC was edited, moved or deleted. No copies were removed.'),
    'Конфликт отмены: ABC изменены, перемещены или удалены. Копии не удалены.',
  );
  assert.equal(
    l.message('PDF extraction failed: The PDF is not locally available. Download it first.'),
    'Не удалось извлечь PDF: PDF недоступен локально. Сначала скачайте его.',
  );
  assert.equal(
    new Localization('en').message(
      'Undo conflict: ABC was edited, moved or deleted. No copies were removed.',
    ),
    'Undo conflict: ABC was edited, moved or deleted. No copies were removed.',
  );
});
