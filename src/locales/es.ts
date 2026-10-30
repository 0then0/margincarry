import type { Message, UiKey } from './en.ts';

export const ui: Record<UiKey, string> = {
  title: 'MarginCarry · transferencia de anotaciones PDF',
  menu: 'MarginCarry: transferir anotaciones PDF…',
  subtitle: 'Sus anotaciones en una nueva versión del PDF. Revise cada posición antes de escribir.',
  language: 'Idioma',
  direction: 'Dirección de la transferencia',
  old: 'PDF antiguo',
  new: 'PDF nuevo',
  swap: 'Invertir dirección',
  analyze: 'Buscar propuestas',
  cancel: 'Cancelar análisis',
  preparing: 'Preparando…',
  annotations: 'Anotaciones',
  unique: 'Seleccionar las únicas',
  sourceList: 'Anotaciones de origen',
  proposal: 'Posición propuesta',
  source: 'Origen',
  target: 'Destino',
  openSource: 'Abrir origen en el lector',
  openTarget: 'Abrir destino en el lector',
  sourceImage: 'Selección de origen en la página real del PDF',
  targetImage: 'Selección propuesta en la página real del PDF',
  accept: 'Aceptar propuesta',
  skip: 'Omitir',
  selectionOnly: 'Seleccionar no escribe nada.',
  selected: 'Seleccionadas para escribir: {count}',
  apply: 'Aplicar selección',
  undo: 'Deshacer última transferencia',
  review: 'Transferencias seleccionadas',
  openResult: 'Abrir la anotación creada',
  links:
    'Las copias reciben claves nuevas. Los enlaces de las notas existentes siguen abriendo las anotaciones originales.',
  cancelling: 'Cancelando el análisis…',
  cancelled: 'Análisis cancelado. No se escribió nada.',
  ready:
    'Elija la dirección de la transferencia e inicie el análisis. Ninguna anotación se escribe automáticamente.',
  choosePair:
    'Cierre esta ventana y seleccione dos archivos PDF adjuntos de un mismo elemento, o el elemento bibliográfico.',
  uniqueSelected: 'Propuestas únicas seleccionadas. Revise el conjunto antes de aplicar.',
  undoConfirm:
    '¿Deshacer la última transferencia? Solo sus copias pasarán a la Papelera. Si alguna copia se ha editado, se producirá un conflicto y no se deshará nada.',
  undone: 'Transferencia deshecha: {count} copias movidas a la Papelera.',
  analyzed: 'Anotaciones contabilizadas: {count}. Revise el PDF antes de aceptar las propuestas.',
  analysisFailed: 'El análisis no terminó: {error}. Las propuestas no se pueden aplicar.',
  type: 'Tipo: {type}',
  typeHighlight: 'resaltado',
  typeUnderline: 'subrayado',
  typeNote: 'nota',
  typeImage: 'imagen',
  typeInk: 'dibujo',
  typeText: 'texto',
  accepted: 'Seleccionada · ',
  skipped: 'Omitida · ',
  'unique candidate': 'Candidato único',
  'multiple candidates': 'Varios candidatos',
  'doubtful candidate': 'Candidato dudoso',
  'not found': 'No encontrado',
  unsupported: 'No compatible',
  'processing error': 'Error de procesamiento',
  reviewLine: 'pág. {old} → {new} · {text}',
  remove: 'Quitar',
  removeLabel: 'Quitar: {text}',
  noComment: 'Sin comentario',
  metadata: '{type} · color {color} · etiquetas: {tags}',
  noTags: 'ninguna',
  sourcePage: 'Origen · página {page}',
  chooseCandidate: 'Elija un candidato para revisarlo…',
  variant: 'Candidato {index} · ',
  candidate: 'Página {page} · {method}',
  exact: 'exacta',
  normalized: 'normalizada',
  contextMatch: ' · el contexto coincide',
  outcome: '{status}: {reason}',
  boundaryDiffers: ' · el límite de palabra o número difiere',
  noGeometry: ' · sin coordenadas fiables',
  targetPage: 'Destino · página {page} (hoja {sheet})',
  chooseTarget: 'Elija una ubicación de destino',
  noTarget: 'Sin ubicación de destino',
  loading: 'Cargando PDF…',
  previewFailed: 'Vista previa no disponible: {error}. Abra la ubicación en el lector.',
  noPreview: 'No hay ninguna ubicación verificada que previsualizar.',
  applyConfirm:
    '¿Aplicar la selección ({count}) a «{title}»? Las anotaciones originales se conservan. Las copias reciben claves nuevas.',
  writing: 'Comprobando cambios y escribiendo…',
  created:
    'Anotaciones de Zotero creadas: {count}. La transferencia se guardó en el registro local.',
  applied: 'Transferidas: {count}. Abra el PDF nuevo o deshaga la última transferencia.',
  sourceProgress: 'Páginas de origen: {current}/{total}',
  targetProgress: 'Páginas de destino: {current}/{total}',
  annotationProgress: 'Anotaciones: {current}/{total}',
  extractionFailed: 'No se pudo extraer el texto del PDF: {error}',
  limit: 'Lista limitada a {limit} candidatos; se desconoce si hay un candidato único.',
  incompletePage: 'La página {page} tiene datos de extracción incompletos.',
  duplicate:
    'La anotación de origen {key} ya se transfirió. Deshaga esa operación antes de copiarla de nuevo.',
  conflict: 'Conflicto al deshacer: {keys} se editó, movió o eliminó. No se eliminó ninguna copia.',
};

export const messages: Record<Message, string> = {
  'Only native highlights and underlines are supported.':
    'Solo se admiten resaltados y subrayados nativos de Zotero.',
  'The source page could not be extracted.': 'No se pudo extraer la página de origen.',
  'Empty source text.': 'El texto de origen está vacío.',
  'The target PDF has no usable text layer. OCR is not supported.':
    'El PDF de destino no tiene una capa de texto utilizable. No se admite el OCR.',
  'No exact or conservatively normalized quote on a single target page.':
    'No hay una cita exacta ni normalizada de forma conservadora en una sola página de destino.',
  'One occurrence matches the complete available context; alternatives are retained.':
    'Una coincidencia concuerda con todo el contexto disponible; se conservan las alternativas.',
  'One text occurrence; verify the PDF position.':
    'Una coincidencia de texto; verifique la posición en el PDF.',
  'One text occurrence; word boundaries cannot be checked for this script. Verify the PDF position.':
    'Una coincidencia de texto; en esta escritura no se pueden comprobar los límites de palabra. Verifique la posición en el PDF.',
  'The quote occurs only where the word or number boundary differs from the source selection; no transfer is recommended. Check the PDF before choosing one manually.':
    'La cita solo aparece donde el límite de palabra o número difiere de la selección de origen; no se recomienda ninguna transferencia. Revise el PDF antes de elegir una manualmente.',
  'Several occurrences require a human choice.': 'Elija manualmente la coincidencia correcta.',
  'Text found, but none of the occurrences has reliable geometry.':
    'Se encontró el texto, pero ninguna coincidencia tiene coordenadas fiables.',
  'The host returned partial page data.': 'Zotero devolvió datos de página incompletos.',
  'The range does not align with complete PDF glyphs.':
    'El intervalo no coincide con glifos completos del PDF.',
  'Missing PDF glyph in selected range.': 'Falta un glifo del PDF en el intervalo seleccionado.',
  'Isolated, diagonal, rotated or unmapped text cannot be transferred.':
    'No se puede transferir texto aislado, en diagonal, girado o sin correspondencia.',
  'The selected text extends beyond the PDF crop box.':
    'El texto seleccionado sale del área de recorte del PDF.',
  'The host text order has an unmarked line or column boundary.':
    'El orden del texto que devuelve Zotero tiene un límite de línea o columna sin marcar.',
  'No usable text geometry.': 'No hay coordenadas de texto utilizables.',
  'Selection exceeds the native annotation position limit.':
    'La selección supera el límite de tamaño de posición de una anotación de Zotero.',
  'Multi-page annotations are not supported.': 'No se admiten anotaciones de varias páginas.',
  'Invalid source rectangles.': 'Rectángulos de origen no válidos.',
  'Not every source rectangle maps to text.':
    'No todos los rectángulos de origen corresponden a texto.',
  'Empty source range.': 'El intervalo de origen está vacío.',
  'Discontinuous source annotation.': 'La anotación de origen es discontinua.',
  'Missing source text offsets.': 'Faltan los desplazamientos del texto de origen.',
  'Missing normalized text offsets.': 'Faltan los desplazamientos del texto normalizado.',
  'Source text and source geometry disagree; the complete selection cannot be verified.':
    'El texto y las coordenadas de origen no coinciden; no se puede verificar la selección completa.',
  'Documents or annotations changed during analysis. Run analysis again.':
    'Los documentos o las anotaciones cambiaron durante el análisis. Ejecute el análisis de nuevo.',
  'A transfer operation is in progress.': 'Hay una operación de transferencia en curso.',
  'An incomplete transfer journal needs inspection. No further copies will be created.':
    'Un registro de transferencia incompleto requiere revisión. No se crearán más copias.',
  'An interrupted undo needs inspection. No copies will be removed.':
    'Una operación de deshacer interrumpida requiere revisión. No se eliminará ninguna copia.',
  'This plan is busy, applied or invalid. Recalculate before another transfer.':
    'Este plan está ocupado, ya se aplicó o no es válido. Vuelva a analizar antes de otra transferencia.',
  'Select at least one proposal.': 'Seleccione al menos una propuesta.',
  'This plan has already been applied.': 'Este plan ya se aplicó.',
  'One source annotation cannot select multiple occurrences.':
    'Una anotación de origen no puede seleccionar varias coincidencias.',
  'Selected proposal has no verified geometry.':
    'La propuesta seleccionada no tiene coordenadas verificadas.',
  'PDF or annotations changed since analysis. Recalculate the plan.':
    'El PDF o las anotaciones cambiaron después del análisis. Vuelva a calcular el plan.',
  'Documents or annotations changed during application. The operation was rolled back.':
    'Los documentos o las anotaciones cambiaron durante la escritura. La operación se revirtió.',
  'Copies were committed, but the final journal update failed. Reopen MarginCarry to recover the journal; do not reapply.':
    'Las copias se guardaron, pero falló la última actualización del registro. Vuelva a abrir MarginCarry para recuperarlo y no aplique el plan otra vez.',
  'No completed transfer to undo.': 'No hay ninguna transferencia completada que deshacer.',
  'Choose local PDF attachments of one item in your personal library.':
    'Elija archivos PDF adjuntos locales de un mismo elemento de su biblioteca personal.',
  'The PDF is not locally available. Download it first.':
    'El PDF no está disponible localmente. Descárguelo primero.',
  'The source and target must be different attachments.':
    'El origen y el destino deben ser adjuntos distintos.',
  'Two attachments of the same bibliographic item are required.':
    'Se necesitan dos adjuntos del mismo elemento bibliográfico.',
  'PDF reader initialization timed out. Open the PDF and retry.':
    'Se agotó el tiempo de inicio del lector de PDF. Abra el PDF y vuelva a intentarlo.',
  'Zotero could not open the PDF reader.': 'Zotero no pudo abrir el lector de PDF.',
  'This Zotero reader does not expose the verified PDF adapter API.':
    'El lector de esta versión de Zotero no ofrece la interfaz verificada que se necesita.',
  'The PDF changed while loading. Run analysis again.':
    'El PDF cambió mientras se cargaba. Ejecute el análisis de nuevo.',
  'The loaded PDF changed. Run analysis again before reviewing or applying.':
    'El PDF cargado cambió. Ejecute el análisis de nuevo antes de revisar o aplicar.',
  'Page too large for a safe preview. Open its reader position instead.':
    'La página es demasiado grande para una vista previa segura. Abra esa posición en el lector.',
  'Copies are in Trash, but an open reader could not refresh. Reopen the PDF and MarginCarry to recover the operation journal.':
    'Las copias están en la Papelera, pero no se pudo actualizar un lector abierto. Vuelva a abrir el PDF y MarginCarry para recuperar el registro de operaciones.',
  'Generated key already exists.': 'La clave generada ya existe.',
  'Created annotation no longer exists.': 'La anotación creada ya no existe.',
  'Undo requires an active operation transaction.':
    'Deshacer requiere una transacción de operación activa.',
  'Transfer journal has an unsupported format.':
    'El registro de transferencias tiene un formato no admitido.',
};
