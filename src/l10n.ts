export type Locale = 'en' | 'ru';
export function selectLocale(value: string): Locale {
  return /^ru(?:-|$)/i.test(value) ? 'ru' : 'en';
}
export const en = {
  title: 'MarginCarry · PDF annotation transfer',
  menu: 'MarginCarry: transfer PDF annotations…',
  subtitle: 'Your annotations on a new PDF revision. Review each position before writing.',
  language: 'Language',
  direction: 'Transfer direction',
  old: 'Old PDF',
  new: 'New PDF',
  swap: 'Swap direction',
  analyze: 'Find proposals',
  cancel: 'Cancel analysis',
  preparing: 'Preparing…',
  annotations: 'Annotations',
  unique: 'Select unique proposals',
  sourceList: 'Source annotations',
  proposal: 'Proposed location',
  source: 'Source',
  target: 'Target',
  openSource: 'Open source in reader',
  openTarget: 'Open target in reader',
  sourceImage: 'Source selection on the actual PDF page',
  targetImage: 'Proposed selection on the actual PDF page',
  accept: 'Accept proposal',
  skip: 'Skip',
  selectionOnly: 'Selecting does not write data.',
  selected: 'Selected to write: {count}',
  apply: 'Apply selected',
  undo: 'Undo last transfer',
  review: 'Specific selected transfers',
  openResult: 'Open created annotation',
  links: 'Copies receive new IDs. Existing note links continue to open the original annotations.',
  cancelling: 'Cancelling analysis…',
  cancelled: 'Analysis cancelled. Nothing was written.',
  ready:
    'Choose the transfer direction and start analysis. No annotations are written automatically.',
  choosePair:
    'Close this window and select two PDF attachments of one item, or the bibliographic item.',
  uniqueSelected: 'Unique proposals selected. Review the set before applying.',
  undoConfirm:
    'Undo the last transfer? Only its copies will move to Trash. Edited copies cause an undo conflict.',
  undone: 'Transfer undone: {count} copies moved to Trash.',
  analyzed: 'Annotations accounted for: {count}. Review the PDF before accepting proposals.',
  analysisFailed: 'Analysis did not finish: {error}. Proposals are not ready to apply.',
  type: 'Type: {type}',
  accepted: 'Selected · ',
  skipped: 'Skipped · ',
  'unique candidate': 'Unique candidate',
  'multiple candidates': 'Multiple candidates',
  'not found': 'Not found',
  unsupported: 'Unsupported',
  'processing error': 'Processing error',
  reviewLine: 'p. {old} → {new} · {text}',
  remove: 'Remove',
  removeLabel: 'Remove {text}',
  noComment: 'No comment',
  metadata: '{type} · color {color} · tags: {tags}',
  noTags: 'none',
  sourcePage: 'Source · page {page}',
  chooseCandidate: 'Choose a candidate to review…',
  variant: 'Candidate {index} · ',
  candidate: 'Page {page} · {method}',
  exact: 'exact',
  normalized: 'normalized',
  contextMatch: ' · context matches',
  noGeometry: ' · no reliable geometry',
  targetPage: 'Target · page {page} (sheet {sheet})',
  chooseTarget: 'Choose a target location',
  noTarget: 'No target location',
  loading: 'Loading PDF…',
  previewFailed: 'Preview unavailable: {error}. Open the location in the reader.',
  noPreview: 'No verified location to preview.',
  applyConfirm:
    'Apply {count} selected transfers to “{title}”? Original annotations remain available. New copies receive new links.',
  writing: 'Checking changes and writing…',
  created: 'Created {count} native annotations. Transfer saved in the local journal.',
  applied: 'Transferred: {count}. Open the new PDF or undo the last transfer.',
  sourceProgress: 'Source pages: {current}/{total}',
  targetProgress: 'Target pages: {current}/{total}',
  annotationProgress: 'Annotations: {current}/{total}',
  extractionFailed: 'PDF extraction failed: {error}',
  limit: 'Candidate list limited to {limit}; uniqueness is unknown.',
  incompletePage: 'Page {page} has incomplete extraction data.',
  duplicate:
    'Source annotation {key} was already transferred. Undo that operation before copying it again.',
  conflict: 'Undo conflict: {keys} was edited, moved or deleted. No copies were removed.',
} as const;
export const ru: Record<keyof typeof en, string> = {
  title: 'MarginCarry · перенос PDF-аннотаций',
  menu: 'MarginCarry: перенести PDF-аннотации…',
  subtitle: 'Ваши аннотации на новой версии PDF. Проверьте каждое положение перед записью.',
  language: 'Язык',
  direction: 'Направление переноса',
  old: 'Старое PDF',
  new: 'Новое PDF',
  swap: 'Поменять направление',
  analyze: 'Получить предложения',
  cancel: 'Отменить анализ',
  preparing: 'Подготовка…',
  annotations: 'Аннотации',
  unique: 'Выбрать однозначные',
  sourceList: 'Исходные аннотации',
  proposal: 'Предлагаемое место',
  source: 'Источник',
  target: 'Цель',
  openSource: 'Открыть источник в reader',
  openTarget: 'Открыть цель в reader',
  sourceImage: 'Исходное выделение на реальной PDF-странице',
  targetImage: 'Предлагаемое выделение на реальной PDF-странице',
  accept: 'Принять предложение',
  skip: 'Пропустить',
  selectionOnly: 'Выбор пока не записывает данные.',
  selected: 'Выбрано для записи: {count}',
  apply: 'Применить выбранное',
  undo: 'Отменить последний перенос',
  review: 'Конкретные выбранные переносы',
  openResult: 'Открыть созданную аннотацию',
  links:
    'Копии получают новые ID. Ссылки в существующих notes продолжают открывать исходные аннотации.',
  cancelling: 'Отмена анализа…',
  cancelled: 'Анализ отменён. Ничего не записано.',
  ready:
    'Выберите направление переноса и запустите анализ. Ни одна аннотация не записывается автоматически.',
  choosePair: 'Закройте окно и выберите два PDF-вложения одного item либо библиографический item.',
  uniqueSelected: 'Однозначные предложения выбраны. Проверьте набор перед применением.',
  undoConfirm:
    'Отменить последний перенос? Только созданные им копии будут перемещены в корзину. Изменённые копии вызывают конфликт отмены.',
  undone: 'Перенос отменён: {count} копий в корзине.',
  analyzed: 'Учтено аннотаций: {count}. Проверьте PDF перед принятием предложений.',
  analysisFailed: 'Анализ не завершён: {error}. Предложения не готовы к применению.',
  type: 'Тип: {type}',
  accepted: 'Выбрано · ',
  skipped: 'Пропущено · ',
  'unique candidate': 'Один кандидат',
  'multiple candidates': 'Несколько кандидатов',
  'not found': 'Не найдено',
  unsupported: 'Не поддерживается',
  'processing error': 'Ошибка обработки',
  reviewLine: 'стр. {old} → {new} · {text}',
  remove: 'Убрать',
  removeLabel: 'Убрать {text}',
  noComment: 'Без комментария',
  metadata: '{type} · цвет {color} · теги: {tags}',
  noTags: 'нет',
  sourcePage: 'Источник · страница {page}',
  chooseCandidate: 'Выберите вариант для проверки…',
  variant: 'Вариант {index} · ',
  candidate: 'Страница {page} · {method}',
  exact: 'точное совпадение',
  normalized: 'нормализованное совпадение',
  contextMatch: ' · совпадает контекст',
  noGeometry: ' · нет надёжной геометрии',
  targetPage: 'Цель · страница {page} (лист {sheet})',
  chooseTarget: 'Выберите целевое место',
  noTarget: 'Целевого места нет',
  loading: 'Загрузка PDF…',
  previewFailed: 'Превью недоступно: {error}. Откройте место в reader.',
  noPreview: 'Нет проверенного положения для предпросмотра.',
  applyConfirm:
    'Применить {count} выбранных переносов на «{title}»? Исходные аннотации сохранятся. Новые копии получат новые ссылки.',
  writing: 'Проверка изменений и запись…',
  created: 'Создано {count} native-аннотаций. Перенос сохранён в локальном журнале.',
  applied: 'Перенесено: {count}. Откройте новый PDF или отмените последний перенос.',
  sourceProgress: 'Страницы источника: {current}/{total}',
  targetProgress: 'Страницы цели: {current}/{total}',
  annotationProgress: 'Аннотации: {current}/{total}',
  extractionFailed: 'Не удалось извлечь PDF: {error}',
  limit: 'Список ограничен {limit} кандидатами; однозначность неизвестна.',
  incompletePage: 'Страница {page} содержит неполные данные извлечения.',
  duplicate:
    'Исходная аннотация {key} уже перенесена. Отмените ту операцию перед повторным копированием.',
  conflict: 'Конфликт отмены: {keys} изменены, перемещены или удалены. Копии не удалены.',
};

export const russianMessages: Record<string, string> = {
  'Only native highlights and underlines are supported.':
    'Поддерживаются только native-выделения и подчёркивания.',
  'The source page could not be extracted.': 'Не удалось извлечь страницу источника.',
  'Empty source text.': 'Исходный текст пуст.',
  'The target PDF has no usable text layer. OCR is outside v0.1.':
    'У целевого PDF нет пригодного текстового слоя. OCR не входит в v0.1.',
  'No exact or conservatively normalized quote on a single target page.':
    'Точная или нормализованная цитата не найдена на одной странице цели.',
  'One occurrence matches the complete available context; alternatives are retained.':
    'Одно вхождение совпадает с полным доступным контекстом; альтернативы сохранены.',
  'One text occurrence; verify the PDF position.':
    'Одно текстовое вхождение; проверьте положение в PDF.',
  'Several occurrences require a human choice.': 'Несколько вхождений требуют выбора человека.',
  'Text found, but none of the occurrences has reliable geometry.':
    'Текст найден, но ни у одного вхождения нет надёжной геометрии.',
  'The host returned partial page data.': 'Zotero вернул неполные данные страницы.',
  'The range does not align with complete PDF glyphs.':
    'Диапазон не совпадает с границами полных PDF-глифов.',
  'Missing PDF glyph in selected range.': 'В выбранном диапазоне отсутствует PDF-глиф.',
  'Isolated, diagonal, rotated or unmapped text cannot be transferred.':
    'Изолированный, диагональный, повёрнутый или несопоставленный текст не переносится.',
  'The selected text extends beyond the PDF crop box.': 'Выделенный текст выходит за crop box PDF.',
  'The host text order has an unmarked line or column boundary.':
    'В порядке текста Zotero есть неотмеченная граница строки или колонки.',
  'No usable text geometry.': 'Нет пригодной геометрии текста.',
  'Selection exceeds the native annotation position limit.':
    'Выделение превышает лимит позиции native-аннотации.',
  'Multi-page annotations are outside v0.1.': 'Многостраничные аннотации не входят в v0.1.',
  'Invalid source rectangles.': 'Некорректные прямоугольники источника.',
  'Not every source rectangle maps to text.':
    'Не все прямоугольники источника соответствуют тексту.',
  'Empty source range.': 'Исходный диапазон пуст.',
  'Discontinuous source annotation.': 'Разрывная исходная аннотация.',
  'Missing source text offsets.': 'Отсутствуют смещения исходного текста.',
  'Missing normalized text offsets.': 'Отсутствуют смещения нормализованного текста.',
  'Source text and source geometry disagree; the complete selection cannot be verified.':
    'Исходные текст и геометрия не совпадают; полное выделение нельзя проверить.',
  'Documents or annotations changed during analysis. Run analysis again.':
    'Документы или аннотации изменились во время анализа. Повторите анализ.',
  'A transfer operation is in progress.':
    'Выполняется операция переноса. Дождитесь завершения и откройте окно снова.',
  'An incomplete transfer journal needs inspection. No further copies will be created.':
    'Неполный журнал переноса требует проверки. Новые копии не создаются.',
  'An interrupted undo needs inspection. No copies will be removed.':
    'Прерванная отмена требует проверки. Копии не удаляются.',
  'This plan is busy, applied or invalid. Recalculate before another transfer.':
    'План занят, применён или недействителен. Повторите анализ перед переносом.',
  'Select at least one proposal.': 'Выберите хотя бы одно предложение.',
  'This plan has already been applied.': 'Этот план уже применён.',
  'One source annotation cannot select multiple occurrences.':
    'Для одной исходной аннотации нельзя выбрать несколько вхождений.',
  'Selected proposal has no verified geometry.':
    'У выбранного предложения нет проверенной геометрии.',
  'PDF or annotations changed since analysis. Recalculate the plan.':
    'PDF или аннотации изменились после анализа. Повторите анализ.',
  'Documents or annotations changed during application. The operation was rolled back.':
    'Документы или аннотации изменились во время применения. Операция отменена транзакцией.',
  'Copies were committed, but the final journal update failed. Reopen MarginCarry to recover the journal; do not reapply.':
    'Копии записаны, но последнее обновление журнала не удалось. Откройте MarginCarry снова для восстановления; не применяйте план повторно.',
  'No completed transfer to undo.': 'Нет завершённого переноса для отмены.',
  'Choose local PDF attachments of one item in your personal library.':
    'Выберите локальные PDF-вложения одного item в личной библиотеке.',
  'The PDF is not locally available. Download it first.':
    'PDF недоступен локально. Сначала скачайте его.',
  'The source and target must be different attachments.':
    'Источник и цель должны быть разными вложениями.',
  'v0.1 requires two attachments of the same bibliographic item.':
    'v0.1 требует двух вложений одного библиографического item.',
  'PDF reader initialization timed out. Open the PDF and retry.':
    'Истекло время загрузки reader. Откройте PDF и повторите попытку.',
  'Zotero could not open the PDF reader.': 'Zotero не смог открыть PDF reader.',
  'This Zotero reader does not expose the verified PDF adapter API.':
    'Этот reader Zotero не предоставляет проверенный API PDF-адаптера.',
  'The PDF changed while loading. Run analysis again.':
    'PDF изменился во время загрузки. Повторите анализ.',
  'The loaded PDF changed. Run analysis again before reviewing or applying.':
    'Загруженный PDF изменился. Повторите анализ перед проверкой или применением.',
  'Page too large for a safe preview. Open its reader position instead.':
    'Страница слишком велика для превью. Откройте положение в reader.',
  'Copies are in Trash, but an open reader could not refresh. Reopen the PDF and MarginCarry to recover the operation journal.':
    'Копии в корзине, но открытый reader не обновился. Откройте PDF и MarginCarry снова для восстановления журнала.',
  'Generated key already exists.': 'Созданный ключ уже существует.',
  'Created annotation no longer exists.': 'Созданная аннотация больше не существует.',
  'Undo requires an active operation transaction.': 'Отмена требует активной транзакции операции.',
  'Transfer journal has an unsupported format.': 'Формат журнала переноса не поддерживается.',
};

export class Localization {
  locale: Locale;
  constructor(locale: Locale) {
    this.locale = locale;
  }
  t(key: keyof typeof en, params: Record<string, string | number> = {}): string {
    return (this.locale === 'ru' ? ru[key] : en[key]).replace(/\{(\w+)\}/g, (whole, name: string) =>
      String(params[name] ?? whole),
    );
  }
  message(value: string): string {
    if (this.locale === 'en') return value;
    if (russianMessages[value]) return russianMessages[value];
    const plain = value.replace(/^Error: /, '');
    if (russianMessages[plain]) return russianMessages[plain];
    const patterns: [RegExp, keyof typeof en, string[]][] = [
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
      el.textContent = this.t(el.dataset.l10n as keyof typeof en);
    for (const attr of ['title', 'aria-label', 'alt'])
      for (const el of doc.querySelectorAll<HTMLElement>(`[data-l10n-${attr}]`))
        el.setAttribute(attr, this.t(el.getAttribute(`data-l10n-${attr}`) as keyof typeof en));
  }
}
