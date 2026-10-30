import type { Message, UiKey } from './en.ts';

export const ui: Record<UiKey, string> = {
  title: 'MarginCarry · перенос PDF-аннотаций',
  menu: 'MarginCarry: перенести PDF-аннотации…',
  subtitle: 'Ваши аннотации на новой версии PDF. Проверьте каждое место перед записью.',
  language: 'Язык',
  direction: 'Направление переноса',
  old: 'Старый PDF',
  new: 'Новый PDF',
  swap: 'Поменять направление',
  analyze: 'Найти места',
  cancel: 'Отменить анализ',
  preparing: 'Подготовка…',
  annotations: 'Аннотации',
  unique: 'Выбрать однозначные',
  sourceList: 'Исходные аннотации',
  proposal: 'Предлагаемое место',
  source: 'Источник',
  target: 'Цель',
  openSource: 'Открыть источник в просмотре',
  openTarget: 'Открыть цель в просмотре',
  sourceImage: 'Исходное выделение на настоящей странице PDF',
  targetImage: 'Предлагаемое выделение на настоящей странице PDF',
  accept: 'Принять предложение',
  skip: 'Пропустить',
  selectionOnly: 'Выбор ничего не записывает.',
  selected: 'Выбрано для записи: {count}',
  apply: 'Применить выбранное',
  undo: 'Отменить последний перенос',
  review: 'Выбранные переносы',
  openResult: 'Открыть созданную аннотацию',
  links:
    'Копии получают новые ключи. Ссылки в существующих заметках по-прежнему открывают исходные аннотации.',
  cancelling: 'Отмена анализа…',
  cancelled: 'Анализ отменён. Ничего не записано.',
  ready:
    'Выберите направление переноса и запустите анализ. Аннотации никогда не записываются автоматически.',
  choosePair:
    'Закройте окно и выберите два PDF-вложения одной записи либо саму библиографическую запись.',
  uniqueSelected: 'Однозначные предложения выбраны. Проверьте набор перед применением.',
  undoConfirm:
    'Отменить последний перенос? В корзину попадут только созданные им копии. Если копию изменили, отмена остановится из-за конфликта.',
  undone: 'Перенос отменён: копий в корзине — {count}.',
  analyzed: 'Учтено аннотаций: {count}. Прежде чем принимать предложения, проверьте PDF.',
  analysisFailed: 'Анализ не завершён: {error}. Предложения нельзя применять.',
  type: 'Тип: {type}',
  typeHighlight: 'выделение',
  typeUnderline: 'подчёркивание',
  typeNote: 'заметка',
  typeImage: 'область',
  typeInk: 'рисунок',
  typeText: 'текст',
  accepted: 'Выбрано · ',
  skipped: 'Пропущено · ',
  'unique candidate': 'Один кандидат',
  'multiple candidates': 'Несколько кандидатов',
  'doubtful candidate': 'Сомнительный кандидат',
  'not found': 'Не найдено',
  unsupported: 'Не поддерживается',
  'processing error': 'Ошибка обработки',
  reviewLine: 'стр. {old} → {new} · {text}',
  remove: 'Убрать',
  removeLabel: 'Убрать: {text}',
  noComment: 'Без комментария',
  metadata: '{type} · цвет {color} · теги: {tags}',
  noTags: 'нет',
  sourcePage: 'Источник · страница {page}',
  chooseCandidate: 'Выберите вариант для проверки…',
  variant: 'Вариант {index} · ',
  candidate: 'Страница {page} · {method}',
  exact: 'точное совпадение',
  normalized: 'нормализованное совпадение',
  contextMatch: ' · контекст совпадает',
  outcome: '{status}: {reason}',
  boundaryDiffers: ' · граница слова или числа отличается',
  noGeometry: ' · нет надёжных координат',
  targetPage: 'Цель · страница {page} (лист {sheet})',
  chooseTarget: 'Выберите место в цели',
  noTarget: 'Места в цели нет',
  loading: 'Загрузка PDF…',
  previewFailed: 'Предпросмотр недоступен: {error}. Откройте место в просмотре Zotero.',
  noPreview: 'Нет проверенного места для предпросмотра.',
  applyConfirm:
    'Применить выбранное ({count}) к «{title}»? Исходные аннотации останутся. Копии получат новые ключи.',
  writing: 'Проверка изменений и запись…',
  created: 'Создано аннотаций Zotero: {count}. Перенос сохранён в локальном журнале.',
  applied: 'Перенесено: {count}. Откройте новый PDF или отмените последний перенос.',
  sourceProgress: 'Страницы источника: {current}/{total}',
  targetProgress: 'Страницы цели: {current}/{total}',
  annotationProgress: 'Аннотации: {current}/{total}',
  extractionFailed: 'Не удалось извлечь текст PDF: {error}',
  limit: 'Список ограничен {limit} кандидатами; единственность неизвестна.',
  incompletePage: 'Для страницы {page} получены неполные данные.',
  duplicate:
    'Исходная аннотация {key} уже перенесена. Отмените тот перенос, прежде чем копировать её снова.',
  conflict: 'Конфликт отмены: {keys} изменены, перемещены или удалены. Ни одна копия не удалена.',
};

export const messages: Record<Message, string> = {
  'Only native highlights and underlines are supported.':
    'Поддерживаются только выделения и подчёркивания Zotero.',
  'The source page could not be extracted.': 'Не удалось извлечь страницу источника.',
  'Empty source text.': 'Исходный текст пуст.',
  'The target PDF has no usable text layer. OCR is not supported.':
    'В целевом PDF нет пригодного текстового слоя. Распознавание текста (OCR) не поддерживается.',
  'No exact or conservatively normalized quote on a single target page.':
    'Точная или консервативно нормализованная цитата не найдена ни на одной странице цели.',
  'One occurrence matches the complete available context; alternatives are retained.':
    'Одно вхождение совпадает со всем доступным контекстом; остальные варианты сохранены.',
  'One text occurrence; verify the PDF position.': 'Одно вхождение текста; проверьте место в PDF.',
  'One text occurrence; word boundaries cannot be checked for this script. Verify the PDF position.':
    'Одно вхождение текста; для этой письменности границы слов проверить нельзя. Проверьте место в PDF.',
  'The quote occurs only where the word or number boundary differs from the source selection; no transfer is recommended. Check the PDF before choosing one manually.':
    'Цитата встречается только там, где граница слова или числа отличается от исходного выделения; перенос не рекомендуется. Проверьте PDF, прежде чем выбирать вручную.',
  'Several occurrences require a human choice.': 'Выберите нужное вхождение вручную.',
  'Text found, but none of the occurrences has reliable geometry.':
    'Текст найден, но ни у одного вхождения нет надёжных координат.',
  'The host returned partial page data.': 'Zotero вернул неполные данные страницы.',
  'The range does not align with complete PDF glyphs.':
    'Диапазон не совпадает с границами целых глифов PDF.',
  'Missing PDF glyph in selected range.': 'В выбранном диапазоне нет глифа PDF.',
  'Isolated, diagonal, rotated or unmapped text cannot be transferred.':
    'Изолированный, диагональный, повёрнутый или не сопоставленный текст перенести нельзя.',
  'The selected text extends beyond the PDF crop box.':
    'Выделенный текст выходит за область обрезки страницы PDF.',
  'The host text order has an unmarked line or column boundary.':
    'В порядке текста от Zotero есть неотмеченная граница строки или колонки.',
  'No usable text geometry.': 'Нет пригодных координат текста.',
  'Selection exceeds the native annotation position limit.':
    'Выделение превышает допустимый размер позиции аннотации Zotero.',
  'Multi-page annotations are not supported.': 'Многостраничные аннотации не поддерживаются.',
  'Invalid source rectangles.': 'Некорректные прямоугольники источника.',
  'Not every source rectangle maps to text.':
    'Не каждому прямоугольнику источника соответствует текст.',
  'Empty source range.': 'Исходный диапазон пуст.',
  'Discontinuous source annotation.': 'Исходная аннотация состоит из разрозненных частей.',
  'Missing source text offsets.': 'Нет смещений исходного текста.',
  'Missing normalized text offsets.': 'Нет смещений нормализованного текста.',
  'Source text and source geometry disagree; the complete selection cannot be verified.':
    'Текст и координаты источника не совпадают; выделение целиком проверить нельзя.',
  'Documents or annotations changed during analysis. Run analysis again.':
    'Документы или аннотации изменились во время анализа. Запустите анализ снова.',
  'A transfer operation is in progress.': 'Идёт операция переноса.',
  'An incomplete transfer journal needs inspection. No further copies will be created.':
    'Незавершённый журнал переноса требует проверки. Новые копии создаваться не будут.',
  'An interrupted undo needs inspection. No copies will be removed.':
    'Прерванная отмена требует проверки. Копии удаляться не будут.',
  'This plan is busy, applied or invalid. Recalculate before another transfer.':
    'План занят, уже применён или недействителен. Повторите анализ перед новым переносом.',
  'Select at least one proposal.': 'Выберите хотя бы одно предложение.',
  'This plan has already been applied.': 'Этот план уже применён.',
  'One source annotation cannot select multiple occurrences.':
    'Для одной исходной аннотации нельзя выбрать несколько вхождений.',
  'Selected proposal has no verified geometry.':
    'У выбранного предложения нет проверенных координат.',
  'PDF or annotations changed since analysis. Recalculate the plan.':
    'PDF или аннотации изменились после анализа. Повторите анализ.',
  'Documents or annotations changed during application. The operation was rolled back.':
    'Документы или аннотации изменились во время записи. Операция отменена, изменения откачены.',
  'Copies were committed, but the final journal update failed. Reopen MarginCarry to recover the journal; do not reapply.':
    'Копии записаны, но последнее обновление журнала не удалось. Откройте MarginCarry снова, чтобы восстановить журнал, и не применяйте план повторно.',
  'No completed transfer to undo.': 'Нет завершённого переноса, который можно отменить.',
  'Choose local PDF attachments of one item in your personal library.':
    'Выберите локальные PDF-вложения одной записи из личной библиотеки.',
  'The PDF is not locally available. Download it first.':
    'PDF недоступен локально. Сначала скачайте его.',
  'The source and target must be different attachments.':
    'Источник и цель должны быть разными вложениями.',
  'Two attachments of the same bibliographic item are required.':
    'Нужны два вложения одной библиографической записи.',
  'PDF reader initialization timed out. Open the PDF and retry.':
    'Истекло время запуска просмотра PDF. Откройте PDF и повторите попытку.',
  'Zotero could not open the PDF reader.': 'Zotero не смог открыть просмотр PDF.',
  'This Zotero reader does not expose the verified PDF adapter API.':
    'Просмотр PDF в этой версии Zotero не предоставляет нужный проверенный интерфейс.',
  'The PDF changed while loading. Run analysis again.':
    'PDF изменился во время загрузки. Запустите анализ снова.',
  'The loaded PDF changed. Run analysis again before reviewing or applying.':
    'Загруженный PDF изменился. Прежде чем проверять или применять, запустите анализ снова.',
  'Page too large for a safe preview. Open its reader position instead.':
    'Страница слишком велика для безопасного предпросмотра. Откройте это место в просмотре Zotero.',
  'Copies are in Trash, but an open reader could not refresh. Reopen the PDF and MarginCarry to recover the operation journal.':
    'Копии в корзине, но открытый просмотр не удалось обновить. Откройте PDF и MarginCarry снова, чтобы восстановить журнал операций.',
  'Generated key already exists.': 'Созданный ключ уже существует.',
  'Created annotation no longer exists.': 'Созданной аннотации больше нет.',
  'Undo requires an active operation transaction.':
    'Для отмены нужна активная транзакция операции.',
  'Transfer journal has an unsupported format.': 'Формат журнала переноса не поддерживается.',
};
