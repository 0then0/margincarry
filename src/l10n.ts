import * as de from './locales/de.ts';
import * as en from './locales/en.ts';
import * as es from './locales/es.ts';
import * as fr from './locales/fr.ts';
import * as ja from './locales/ja.ts';
import * as ptBR from './locales/pt-br.ts';
import * as ru from './locales/ru.ts';

export type { Message, UiKey } from './locales/en.ts';

type UiKey = en.UiKey;

export const locales = ['en', 'ru', 'es', 'de', 'fr', 'ja', 'pt-BR'] as const;
export type Locale = (typeof locales)[number];
/** Each language in its own language, as shown on the language buttons. */
export const localeNames: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
  ja: '日本語',
  'pt-BR': 'Português (Brasil)',
};
export const resources: Record<
  Locale,
  { ui: Record<UiKey, string>; messages: Record<en.Message, string> }
> = {
  en: {
    ui: en.ui,
    messages: Object.fromEntries(en.messages.map((m) => [m, m])) as Record<en.Message, string>,
  },
  ru,
  es,
  de,
  fr,
  ja,
  'pt-BR': ptBR,
};

/** Maps a Zotero or BCP 47 locale to a supported language; anything else falls back to English. */
export function selectLocale(value: string): Locale {
  const language = value.toLowerCase().split(/[-_]/u)[0];
  if (language === 'pt') return 'pt-BR';
  return locales.find((locale) => locale === language) ?? 'en';
}

export class Localization {
  locale: Locale;
  constructor(locale: Locale) {
    this.locale = locale;
  }
  t(key: UiKey, params: Record<string, string | number> = {}): string {
    return resources[this.locale].ui[key].replace(/\{(\w+)\}/g, (whole, name: string) =>
      String(params[name] ?? whole),
    );
  }
  message(value: string): string {
    if (this.locale === 'en') return value;
    const known = resources[this.locale].messages as Record<string, string>;
    const plain = value.replace(/^Error: /, '');
    const translated = known[value] ?? known[plain];
    if (translated !== undefined) return translated;
    const patterns: [RegExp, UiKey, string[]][] = [
      [/^Source pages: (\d+)\/(\d+)$/, 'sourceProgress', ['current', 'total']],
      [/^Target pages: (\d+)\/(\d+)$/, 'targetProgress', ['current', 'total']],
      [/^Annotations: (\d+)\/(\d+)$/, 'annotationProgress', ['current', 'total']],
      [/^PDF extraction failed: (.*)$/s, 'extractionFailed', ['error']],
      [/^Candidate list limited to (\d+); uniqueness is unknown\.$/, 'limit', ['limit']],
      [/^Page (\d+) has incomplete extraction data\.$/, 'incompletePage', ['page']],
      [
        /^Source annotation (\S+) was already transferred\. Undo that operation before copying it again\.$/,
        'duplicate',
        ['key'],
      ],
      [
        /^Undo conflict: (.*) was edited, moved or deleted\. No copies were removed\.$/,
        'conflict',
        ['keys'],
      ],
    ];
    for (const [pattern, key, names] of patterns) {
      const match = plain.match(pattern);
      if (match)
        return this.t(
          key,
          Object.fromEntries(
            names.map((name, i) => [
              name,
              name === 'error' ? this.message(match[i + 1] ?? '') : (match[i + 1] ?? ''),
            ]),
          ),
        );
    }
    // Host-generated diagnostics retain their original wording; project-owned messages are translated.
    return value;
  }
  apply(doc: Document): void {
    doc.documentElement.lang = this.locale;
    for (const el of doc.querySelectorAll<HTMLElement>('[data-l10n]'))
      el.textContent = this.t(el.dataset.l10n as UiKey);
    for (const attr of ['title', 'aria-label', 'alt'])
      for (const el of doc.querySelectorAll<HTMLElement>(`[data-l10n-${attr}]`))
        el.setAttribute(attr, this.t(el.getAttribute(`data-l10n-${attr}`) as UiKey));
  }
}
