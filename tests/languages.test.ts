import assert from 'node:assert/strict';
import test from 'node:test';
import { propose } from '../src/matching.ts';
import type { Annotation, Glyph, Page } from '../src/model.ts';

// One 7-unit glyph per code point, so geometry is known independently of the matcher.
function page(text: string): Page {
  const chars: Glyph[] = [];
  let x = 10;
  for (const c of text) {
    const r: [number, number, number, number] = [x, 700, x + 7, 710];
    chars.push({ c, rect: r, inlineRect: [...r] });
    x += 7;
  }
  return { index: 0, label: '1', chars, viewBox: [0, 0, 5000, 792] };
}
function outcome(oldText: string, quote: string, newText: string) {
  const at = Array.from(oldText.slice(0, oldText.indexOf(quote))).length;
  assert.ok(oldText.includes(quote), `fixture: ${quote}`);
  const source: Annotation = {
    key: 'SOURCE01',
    type: 'highlight',
    text: quote,
    comment: '',
    color: '#ffd400',
    tags: [],
    position: {
      pageIndex: 0,
      rects: [[10 + 7 * at, 700, 10 + 7 * (at + Array.from(quote).length), 710]],
    },
    external: false,
    fingerprint: 'source',
  };
  return propose(source, page(oldText), [page(newText)]);
}

type Row = [label: string, old: string, quote: string, changed: string, status: string];
const unique = 'unique candidate';
const doubtful = 'doubtful candidate';
const missing = 'not found';
const languages: Record<string, Row[]> = {
  ru: [
    ['unchanged phrase', 'он сказал «дом» здесь', 'дом', 'он сказал «дом» здесь', unique],
    ['ending added', 'новый дом', 'дом', 'новый дома', doubtful],
    ['word continues', 'в углу кот', 'кот', 'в углу котёл', doubtful],
    ['ё is not е', 'всё ясно', 'всё', 'все ясно', missing],
    ['case matters', 'там дом', 'дом', 'там Дом', missing],
    ['stress mark kept', 'за́мок стоит', 'за́мок', 'за́мок стоит', unique],
    ['dash is a boundary', 'он — врач', 'врач', 'он — врач.', unique],
    ['decimal comma', 'около 4,5 км', '4,5', 'около 4,5 км', unique],
    ['decimal comma extended', 'около 4,5 км', '4,5', 'около 4,52 км', doubtful],
    ['й decomposed in the new PDF', 'новый вид', 'новый', 'новыи\u0306 вид', unique],
  ],
  es: [
    ['inverted marks', '¿Qué hora es?', 'Qué hora es', '¿Qué hora es?', unique],
    ['ñ decomposed', 'el año pasado', 'año', 'el año pasado', unique],
    ['plural contains singular', 'la casa roja', 'casa', 'las casas rojas', doubtful],
    ['accent dropped', 'también', 'también', 'tambien', missing],
    ['decimal comma', 'el 41,0 %', '41,0', 'el 41,0 %', unique],
    ['decimal extended', 'el 41,0 %', '41,0', 'el 41,03 %', doubtful],
    ['negation added is not detected', 'es cierto', 'es cierto', 'no es cierto', unique],
  ],
  de: [
    ['ß is not ss', 'die Straße ist lang', 'Straße', 'die Strasse ist lang', missing],
    ['umlaut decomposed', 'für uns', 'für', 'für uns', unique],
    ['compound grows', 'das Haus ist alt', 'Haus', 'das Hausaufgabenheft', doubtful],
    [
      'deliberate fragment kept',
      'Donaudampfschiff fährt',
      'dampf',
      'Donaudampfschiff fährt',
      unique,
    ],
    [
      'fragment in another word',
      'Donaudampfschiff fährt',
      'dampf',
      'Elbdampfschiff fährt',
      doubtful,
    ],
    ['capitalization', 'das Haus', 'Haus', 'das haus', missing],
    ['inflection with umlaut', 'ein Haus', 'Haus', 'viele Häuser', missing],
    ['decimal comma', 'Wert 3,5 %', '3,5', 'Wert 3,5 %', unique],
    ['thousands dot extended', '1.000 Euro', '1.000', '1.0005 Euro', doubtful],
    ['German quotation marks', 'er sagte „ja“ laut', 'ja', 'er sagte „ja“ laut', unique],
  ],
  fr: [
    [
      'elision unchanged',
      'dans l’histoire de la ville',
      'histoire',
      'voir l’histoire de la ville',
      unique,
    ],
    [
      'elision introduced',
      'une histoire de la ville',
      'histoire',
      'voir l’histoire de la ville',
      doubtful,
    ],
    ['no-break space before colon', 'Résultat : 12', 'Résultat', 'Résultat : 12', unique],
    [
      'narrow no-break space in guillemets',
      '« bonjour » dit-il',
      'bonjour',
      '« bonjour » dit-il',
      unique,
    ],
    ['hyphenated compound', 'peut-être demain', 'peut', 'peut-être demain', unique],
    ['plural contains singular', 'un homme sage', 'homme', 'des hommes sages', doubtful],
    ['circumflex decomposed', 'être là', 'être', 'être là', unique],
    ['accent dropped', 'été chaud', 'été', 'ete chaud', missing],
    ['aujourd’hui', 'aujourd’hui il pleut', 'aujourd’hui', 'et aujourd’hui il pleut', unique],
    ['negation by apostrophe', 'il faut', 'faut', 'il n’faut', doubtful],
  ],
  ja: [
    ['no delimiters, disclosed', 'これは猫です。', '猫です', 'それは猫です。', unique],
    ['full-width digit', '第１章です', '１', '第１章です', unique],
    ['full-width number extended', '第１章です', '１', '第１２章です', doubtful],
    ['digits between ideographs', '共41個', '41', '共41個', unique],
    ['Latin word between kana', 'これはPythonです', 'Python', 'それはPythonです', unique],
    ['Latin word extended', 'これはPythonです', 'Python', 'それはPythonicです', doubtful],
    ['katakana long vowel', 'コンピューターです', 'コンピューター', 'コンピューターです', unique],
    ['full-width Latin extended', 'ＡＢＣです', 'ＡＢＣ', 'ＡＢＣＤです', doubtful],
    ['half-width katakana', 'ﾃｽﾄです', 'ﾃｽﾄ', 'ﾃｽﾄです', unique],
    ['corner brackets are boundaries', '「猫」です', '猫', '「猫」です', unique],
    ['text changed', 'これは猫です', '猫', 'それは犬です', missing],
    ['voiced mark decomposed', 'がんばる', 'がんばる', 'がんばる', unique],
  ],
  'pt-BR': [
    ['ção', 'a ação rápida', 'ação', 'a ação rápida', unique],
    ['plural changes the letters', 'a ação rápida', 'ação', 'as ações rápidas', missing],
    ['plural contains singular', 'o livro azul', 'livro', 'os livros azuis', doubtful],
    ['hyphenated compound', 'guarda-chuva novo', 'guarda', 'guarda-chuva novo', unique],
    ['tilde decomposed', 'não sei', 'não', 'não sei', unique],
    ['decimal comma', 'cerca de 4,5 km', '4,5', 'cerca de 4,5 km', unique],
    ['decimal extended', 'cerca de 4,5 km', '4,5', 'cerca de 4,52 km', doubtful],
  ],
};

for (const [language, rows] of Object.entries(languages)) {
  test(`matching follows the text rules for ${language}`, () => {
    for (const [label, old, quote, changed, status] of rows) {
      const p = outcome(old, quote, changed);
      assert.equal(p.status, status, `${language}: ${label}`);
      // Only a unique, geometry-backed proposal may reach mass selection.
      assert.equal(
        p.status === unique && p.recommendedID !== null,
        status === unique,
        `${language}: ${label}`,
      );
      if (status === unique) {
        const found = p.candidates.find((c) => c.id === p.recommendedID)!;
        assert.equal(found.text.normalize('NFC'), quote.normalize('NFC'), `${language}: ${label}`);
      }
    }
  });
}

test('a unique match inside text without word delimiters says that boundaries are unchecked', () => {
  for (const [, old, quote, changed] of [languages.ja![0]!, languages.ja![6]!]) {
    const p = outcome(old, quote, changed);
    assert.equal(p.status, unique);
    assert.match(p.reason, /word boundaries cannot be checked/);
  }
});

test('every language tested here is one the interface supports', async () => {
  const { locales } = await import('../src/l10n.ts');
  for (const language of Object.keys(languages)) assert.ok(locales.includes(language as never));
});
