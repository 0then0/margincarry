import type { Message, UiKey } from './en.ts';

export const ui: Record<UiKey, string> = {
  title: 'MarginCarry · PDF-Annotationen übertragen',
  menu: 'MarginCarry: PDF-Annotationen übertragen…',
  subtitle:
    'Ihre Annotationen auf einer neuen PDF-Fassung. Prüfen Sie jede Position, bevor etwas geschrieben wird.',
  language: 'Sprache',
  direction: 'Übertragungsrichtung',
  old: 'Altes PDF',
  new: 'Neues PDF',
  swap: 'Richtung tauschen',
  analyze: 'Vorschläge suchen',
  cancel: 'Analyse abbrechen',
  preparing: 'Wird vorbereitet…',
  annotations: 'Annotationen',
  unique: 'Eindeutige auswählen',
  sourceList: 'Quell-Annotationen',
  proposal: 'Vorgeschlagene Stelle',
  source: 'Quelle',
  target: 'Ziel',
  openSource: 'Quelle im Reader öffnen',
  openTarget: 'Ziel im Reader öffnen',
  sourceImage: 'Quellmarkierung auf der echten PDF-Seite',
  targetImage: 'Vorgeschlagene Markierung auf der echten PDF-Seite',
  accept: 'Vorschlag annehmen',
  skip: 'Überspringen',
  selectionOnly: 'Auswählen schreibt keine Daten.',
  selected: 'Zum Schreiben ausgewählt: {count}',
  apply: 'Auswahl anwenden',
  undo: 'Letzte Übertragung rückgängig machen',
  review: 'Ausgewählte Übertragungen',
  openResult: 'Erstellte Annotation öffnen',
  links:
    'Kopien erhalten neue Schlüssel. Links in vorhandenen Notizen öffnen weiterhin die ursprünglichen Annotationen.',
  cancelling: 'Analyse wird abgebrochen…',
  cancelled: 'Analyse abgebrochen. Es wurde nichts geschrieben.',
  ready:
    'Wählen Sie die Übertragungsrichtung und starten Sie die Analyse. Annotationen werden nie automatisch geschrieben.',
  choosePair:
    'Schließen Sie dieses Fenster und wählen Sie zwei PDF-Anhänge eines Eintrags oder den bibliografischen Eintrag selbst aus.',
  uniqueSelected: 'Eindeutige Vorschläge ausgewählt. Prüfen Sie die Auswahl vor dem Anwenden.',
  undoConfirm:
    'Letzte Übertragung rückgängig machen? Nur ihre Kopien kommen in den Papierkorb. Wurde eine Kopie bearbeitet, bricht das Rückgängigmachen mit einem Konflikt ab.',
  undone: 'Übertragung rückgängig gemacht: {count} Kopien in den Papierkorb verschoben.',
  analyzed: 'Erfasste Annotationen: {count}. Prüfen Sie das PDF, bevor Sie Vorschläge annehmen.',
  analysisFailed:
    'Die Analyse wurde nicht abgeschlossen: {error}. Die Vorschläge können nicht angewendet werden.',
  type: 'Typ: {type}',
  typeHighlight: 'Hervorhebung',
  typeUnderline: 'Unterstreichung',
  typeNote: 'Notiz',
  typeImage: 'Bild',
  typeInk: 'Freihandzeichnung',
  typeText: 'Text',
  accepted: 'Ausgewählt · ',
  skipped: 'Übersprungen · ',
  'unique candidate': 'Eindeutiger Kandidat',
  'multiple candidates': 'Mehrere Kandidaten',
  'doubtful candidate': 'Zweifelhafter Kandidat',
  'not found': 'Nicht gefunden',
  unsupported: 'Nicht unterstützt',
  'processing error': 'Verarbeitungsfehler',
  reviewLine: 'S. {old} → {new} · {text}',
  remove: 'Entfernen',
  removeLabel: 'Entfernen: {text}',
  noComment: 'Kein Kommentar',
  metadata: '{type} · Farbe {color} · Tags: {tags}',
  noTags: 'keine',
  sourcePage: 'Quelle · Seite {page}',
  chooseCandidate: 'Kandidaten zur Prüfung auswählen…',
  variant: 'Kandidat {index} · ',
  candidate: 'Seite {page} · {method}',
  exact: 'exakt',
  normalized: 'normalisiert',
  contextMatch: ' · Kontext stimmt überein',
  outcome: '{status}: {reason}',
  boundaryDiffers: ' · Wort- oder Zahlgrenze weicht ab',
  noGeometry: ' · keine verlässlichen Koordinaten',
  targetPage: 'Ziel · Seite {page} (Blatt {sheet})',
  chooseTarget: 'Zielstelle auswählen',
  noTarget: 'Keine Zielstelle',
  loading: 'PDF wird geladen…',
  previewFailed: 'Vorschau nicht verfügbar: {error}. Öffnen Sie die Stelle im Reader.',
  noPreview: 'Keine geprüfte Stelle für die Vorschau.',
  applyConfirm:
    'Auswahl ({count}) auf „{title}“ anwenden? Die ursprünglichen Annotationen bleiben erhalten. Kopien erhalten neue Schlüssel.',
  writing: 'Änderungen werden geprüft und geschrieben…',
  created:
    'Zotero-Annotationen erstellt: {count}. Die Übertragung wurde im lokalen Protokoll gespeichert.',
  applied:
    'Übertragen: {count}. Öffnen Sie das neue PDF oder machen Sie die letzte Übertragung rückgängig.',
  sourceProgress: 'Quellseiten: {current}/{total}',
  targetProgress: 'Zielseiten: {current}/{total}',
  annotationProgress: 'Annotationen: {current}/{total}',
  extractionFailed: 'Text konnte nicht aus dem PDF gelesen werden: {error}',
  limit: 'Liste auf {limit} Kandidaten begrenzt; ob der Treffer eindeutig ist, ist unbekannt.',
  incompletePage: 'Seite {page} enthält unvollständige Extraktionsdaten.',
  duplicate:
    'Die Quell-Annotation {key} wurde bereits übertragen. Machen Sie diese Übertragung rückgängig, bevor Sie sie erneut kopieren.',
  conflict:
    'Konflikt beim Rückgängigmachen: {keys} wurde bearbeitet, verschoben oder gelöscht. Es wurden keine Kopien entfernt.',
};

export const messages: Record<Message, string> = {
  'Only native highlights and underlines are supported.':
    'Es werden nur Hervorhebungen und Unterstreichungen von Zotero unterstützt.',
  'The source page could not be extracted.': 'Die Quellseite konnte nicht gelesen werden.',
  'Empty source text.': 'Der Quelltext ist leer.',
  'The target PDF has no usable text layer. OCR is not supported.':
    'Das Ziel-PDF hat keine nutzbare Textebene. Texterkennung (OCR) wird nicht unterstützt.',
  'No exact or conservatively normalized quote on a single target page.':
    'Auf keiner einzelnen Zielseite gibt es ein exaktes oder vorsichtig normalisiertes Zitat.',
  'One occurrence matches the complete available context; alternatives are retained.':
    'Ein Treffer stimmt mit dem gesamten verfügbaren Kontext überein; Alternativen bleiben erhalten.',
  'One text occurrence; verify the PDF position.':
    'Ein Texttreffer; prüfen Sie die Position im PDF.',
  'One text occurrence; word boundaries cannot be checked for this script. Verify the PDF position.':
    'Ein Texttreffer; Wortgrenzen lassen sich in dieser Schrift nicht prüfen. Prüfen Sie die Position im PDF.',
  'The quote occurs only where the word or number boundary differs from the source selection; no transfer is recommended. Check the PDF before choosing one manually.':
    'Das Zitat kommt nur dort vor, wo die Wort- oder Zahlgrenze von der Quellmarkierung abweicht; es wird keine Übertragung empfohlen. Prüfen Sie das PDF, bevor Sie manuell eine Stelle wählen.',
  'Several occurrences require a human choice.':
    'Bitte wählen Sie die passende Stelle manuell aus.',
  'Text found, but none of the occurrences has reliable geometry.':
    'Der Text wurde gefunden, aber kein Treffer hat verlässliche Koordinaten.',
  'The host returned partial page data.': 'Zotero hat unvollständige Seitendaten geliefert.',
  'The range does not align with complete PDF glyphs.':
    'Der Bereich stimmt nicht mit vollständigen PDF-Glyphen überein.',
  'Missing PDF glyph in selected range.': 'Im gewählten Bereich fehlt ein PDF-Glyph.',
  'Isolated, diagonal, rotated or unmapped text cannot be transferred.':
    'Isolierter, diagonaler, gedrehter oder nicht zuordenbarer Text kann nicht übertragen werden.',
  'The selected text extends beyond the PDF crop box.':
    'Der gewählte Text ragt über den Beschnittrahmen der PDF-Seite hinaus.',
  'The host text order has an unmarked line or column boundary.':
    'In der von Zotero gelieferten Textreihenfolge fehlt die Markierung einer Zeilen- oder Spaltengrenze.',
  'No usable text geometry.': 'Keine verwertbaren Textkoordinaten.',
  'Selection exceeds the native annotation position limit.':
    'Die Auswahl überschreitet die zulässige Positionsgröße einer Zotero-Annotation.',
  'Multi-page annotations are not supported.':
    'Seitenübergreifende Annotationen werden nicht unterstützt.',
  'Invalid source rectangles.': 'Ungültige Quellrechtecke.',
  'Not every source rectangle maps to text.': 'Nicht jedes Quellrechteck entspricht Text.',
  'Empty source range.': 'Der Quellbereich ist leer.',
  'Discontinuous source annotation.': 'Die Quell-Annotation ist nicht zusammenhängend.',
  'Missing source text offsets.': 'Die Positionen des Quelltexts fehlen.',
  'Missing normalized text offsets.': 'Die Positionen des normalisierten Texts fehlen.',
  'Source text and source geometry disagree; the complete selection cannot be verified.':
    'Quelltext und Quellkoordinaten stimmen nicht überein; die vollständige Auswahl lässt sich nicht prüfen.',
  'Documents or annotations changed during analysis. Run analysis again.':
    'Dokumente oder Annotationen haben sich während der Analyse geändert. Starten Sie die Analyse erneut.',
  'A transfer operation is in progress.': 'Eine Übertragung läuft gerade.',
  'An incomplete transfer journal needs inspection. No further copies will be created.':
    'Ein unvollständiges Übertragungsprotokoll muss geprüft werden. Es werden keine weiteren Kopien erstellt.',
  'An interrupted undo needs inspection. No copies will be removed.':
    'Ein unterbrochenes Rückgängigmachen muss geprüft werden. Es werden keine Kopien entfernt.',
  'This plan is busy, applied or invalid. Recalculate before another transfer.':
    'Dieser Plan ist belegt, bereits angewendet oder ungültig. Analysieren Sie erneut, bevor Sie weiter übertragen.',
  'Select at least one proposal.': 'Wählen Sie mindestens einen Vorschlag aus.',
  'This plan has already been applied.': 'Dieser Plan wurde bereits angewendet.',
  'One source annotation cannot select multiple occurrences.':
    'Eine Quell-Annotation kann nicht mehrere Treffer auswählen.',
  'Selected proposal has no verified geometry.':
    'Der gewählte Vorschlag hat keine geprüften Koordinaten.',
  'PDF or annotations changed since analysis. Recalculate the plan.':
    'PDF oder Annotationen haben sich seit der Analyse geändert. Analysieren Sie erneut.',
  'Documents or annotations changed during application. The operation was rolled back.':
    'Dokumente oder Annotationen haben sich während des Schreibens geändert. Der Vorgang wurde zurückgerollt.',
  'Copies were committed, but the final journal update failed. Reopen MarginCarry to recover the journal; do not reapply.':
    'Die Kopien wurden gespeichert, aber die letzte Aktualisierung des Protokolls ist fehlgeschlagen. Öffnen Sie MarginCarry erneut, um das Protokoll wiederherzustellen, und wenden Sie den Plan nicht noch einmal an.',
  'No completed transfer to undo.':
    'Es gibt keine abgeschlossene Übertragung zum Rückgängigmachen.',
  'Choose local PDF attachments of one item in your personal library.':
    'Wählen Sie lokale PDF-Anhänge eines Eintrags aus Ihrer persönlichen Bibliothek.',
  'The PDF is not locally available. Download it first.':
    'Das PDF ist lokal nicht verfügbar. Laden Sie es zuerst herunter.',
  'The source and target must be different attachments.':
    'Quelle und Ziel müssen verschiedene Anhänge sein.',
  'Two attachments of the same bibliographic item are required.':
    'Es werden zwei Anhänge desselben bibliografischen Eintrags benötigt.',
  'PDF reader initialization timed out. Open the PDF and retry.':
    'Zeitüberschreitung beim Start des PDF-Readers. Öffnen Sie das PDF und versuchen Sie es erneut.',
  'Zotero could not open the PDF reader.': 'Zotero konnte den PDF-Reader nicht öffnen.',
  'This Zotero reader does not expose the verified PDF adapter API.':
    'Der Reader dieser Zotero-Version stellt die benötigte geprüfte Schnittstelle nicht bereit.',
  'The PDF changed while loading. Run analysis again.':
    'Das PDF hat sich beim Laden geändert. Starten Sie die Analyse erneut.',
  'The loaded PDF changed. Run analysis again before reviewing or applying.':
    'Das geladene PDF hat sich geändert. Starten Sie die Analyse erneut, bevor Sie prüfen oder anwenden.',
  'Page too large for a safe preview. Open its reader position instead.':
    'Die Seite ist für eine sichere Vorschau zu groß. Öffnen Sie die Stelle stattdessen im Reader.',
  'Copies are in Trash, but an open reader could not refresh. Reopen the PDF and MarginCarry to recover the operation journal.':
    'Die Kopien liegen im Papierkorb, aber ein geöffneter Reader ließ sich nicht aktualisieren. Öffnen Sie das PDF und MarginCarry erneut, um das Vorgangsprotokoll wiederherzustellen.',
  'Generated key already exists.': 'Der erzeugte Schlüssel existiert bereits.',
  'Created annotation no longer exists.': 'Die erstellte Annotation existiert nicht mehr.',
  'Undo requires an active operation transaction.':
    'Rückgängigmachen erfordert eine aktive Vorgangstransaktion.',
  'Transfer journal has an unsupported format.':
    'Das Übertragungsprotokoll hat ein nicht unterstütztes Format.',
};
