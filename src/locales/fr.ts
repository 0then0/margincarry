import type { Message, UiKey } from './en.ts';

export const ui: Record<UiKey, string> = {
  title: 'MarginCarry · transfert d’annotations PDF',
  menu: 'MarginCarry : transférer des annotations PDF…',
  subtitle:
    'Vos annotations sur une nouvelle version du PDF. Vérifiez chaque position avant d’écrire.',
  language: 'Langue',
  direction: 'Sens du transfert',
  old: 'Ancien PDF',
  new: 'Nouveau PDF',
  swap: 'Inverser le sens',
  analyze: 'Chercher des propositions',
  cancel: 'Annuler l’analyse',
  preparing: 'Préparation…',
  annotations: 'Annotations',
  unique: 'Sélectionner les uniques',
  sourceList: 'Annotations source',
  proposal: 'Position proposée',
  source: 'Source',
  target: 'Cible',
  openSource: 'Ouvrir la source dans le lecteur',
  openTarget: 'Ouvrir la cible dans le lecteur',
  sourceImage: 'Sélection source sur la page PDF réelle',
  targetImage: 'Sélection proposée sur la page PDF réelle',
  accept: 'Accepter la proposition',
  skip: 'Ignorer',
  selectionOnly: 'Sélectionner n’écrit aucune donnée.',
  selected: 'Sélectionnées pour l’écriture : {count}',
  apply: 'Appliquer la sélection',
  undo: 'Annuler le dernier transfert',
  review: 'Transferts sélectionnés',
  openResult: 'Ouvrir l’annotation créée',
  links:
    'Les copies reçoivent de nouvelles clés. Les liens des notes existantes continuent d’ouvrir les annotations d’origine.',
  cancelling: 'Annulation de l’analyse…',
  cancelled: 'Analyse annulée. Rien n’a été écrit.',
  ready:
    'Choisissez le sens du transfert et lancez l’analyse. Aucune annotation n’est écrite automatiquement.',
  choosePair:
    'Fermez cette fenêtre et sélectionnez deux pièces jointes PDF d’un même document, ou le document bibliographique.',
  uniqueSelected: 'Propositions uniques sélectionnées. Vérifiez la sélection avant de l’appliquer.',
  undoConfirm:
    'Annuler le dernier transfert ? Seules ses copies seront placées dans la corbeille. Si une copie a été modifiée, l’annulation s’arrête avec un conflit.',
  undone: 'Transfert annulé : {count} copies placées dans la corbeille.',
  analyzed:
    'Annotations prises en compte : {count}. Vérifiez le PDF avant d’accepter les propositions.',
  analysisFailed:
    'L’analyse ne s’est pas terminée : {error}. Les propositions ne peuvent pas être appliquées.',
  type: 'Type : {type}',
  typeHighlight: 'surlignage',
  typeUnderline: 'soulignement',
  typeNote: 'note',
  typeImage: 'image',
  typeInk: 'dessin',
  typeText: 'texte',
  accepted: 'Sélectionnée · ',
  skipped: 'Ignorée · ',
  'unique candidate': 'Candidat unique',
  'multiple candidates': 'Plusieurs candidats',
  'doubtful candidate': 'Candidat douteux',
  'not found': 'Introuvable',
  unsupported: 'Non pris en charge',
  'processing error': 'Erreur de traitement',
  reviewLine: 'p. {old} → {new} · {text}',
  remove: 'Retirer',
  removeLabel: 'Retirer : {text}',
  noComment: 'Aucun commentaire',
  metadata: '{type} · couleur {color} · étiquettes : {tags}',
  noTags: 'aucune',
  sourcePage: 'Source · page {page}',
  chooseCandidate: 'Choisissez un candidat à examiner…',
  variant: 'Candidat {index} · ',
  candidate: 'Page {page} · {method}',
  exact: 'exacte',
  normalized: 'normalisée',
  contextMatch: ' · le contexte correspond',
  outcome: '{status} : {reason}',
  boundaryDiffers: ' · la limite du mot ou du nombre diffère',
  noGeometry: ' · coordonnées non fiables',
  targetPage: 'Cible · page {page} (feuille {sheet})',
  chooseTarget: 'Choisissez un emplacement cible',
  noTarget: 'Aucun emplacement cible',
  loading: 'Chargement du PDF…',
  previewFailed: 'Aperçu indisponible : {error}. Ouvrez l’emplacement dans le lecteur.',
  noPreview: 'Aucun emplacement vérifié à prévisualiser.',
  applyConfirm:
    'Appliquer la sélection ({count}) à « {title} » ? Les annotations d’origine sont conservées. Les copies reçoivent de nouvelles clés.',
  writing: 'Vérification des modifications et écriture…',
  created:
    'Annotations Zotero créées : {count}. Le transfert est enregistré dans le journal local.',
  applied: 'Transférées : {count}. Ouvrez le nouveau PDF ou annulez le dernier transfert.',
  sourceProgress: 'Pages source : {current}/{total}',
  targetProgress: 'Pages cible : {current}/{total}',
  annotationProgress: 'Annotations : {current}/{total}',
  extractionFailed: 'Impossible d’extraire le texte du PDF : {error}',
  limit: 'Liste limitée à {limit} candidats ; l’unicité du résultat est inconnue.',
  incompletePage: 'La page {page} contient des données d’extraction incomplètes.',
  duplicate:
    'L’annotation source {key} a déjà été transférée. Annulez ce transfert avant de la copier à nouveau.',
  conflict:
    'Conflit d’annulation : {keys} a été modifiée, déplacée ou supprimée. Aucune copie n’a été supprimée.',
};

export const messages: Record<Message, string> = {
  'Only native highlights and underlines are supported.':
    'Seuls les surlignages et soulignements natifs de Zotero sont pris en charge.',
  'The source page could not be extracted.': 'La page source n’a pas pu être extraite.',
  'Empty source text.': 'Le texte source est vide.',
  'The target PDF has no usable text layer. OCR is not supported.':
    'Le PDF cible n’a pas de couche de texte exploitable. La reconnaissance de texte (OCR) n’est pas prise en charge.',
  'No exact or conservatively normalized quote on a single target page.':
    'Aucune citation exacte ou normalisée de façon prudente sur une seule page cible.',
  'One occurrence matches the complete available context; alternatives are retained.':
    'Une occurrence correspond à tout le contexte disponible ; les alternatives sont conservées.',
  'One text occurrence; verify the PDF position.':
    'Une occurrence du texte ; vérifiez la position dans le PDF.',
  'One text occurrence; word boundaries cannot be checked for this script. Verify the PDF position.':
    'Une occurrence du texte ; les limites de mots ne peuvent pas être vérifiées pour cette écriture. Vérifiez la position dans le PDF.',
  'The quote occurs only where the word or number boundary differs from the source selection; no transfer is recommended. Check the PDF before choosing one manually.':
    'La citation n’apparaît que là où la limite du mot ou du nombre diffère de la sélection source ; aucun transfert n’est recommandé. Vérifiez le PDF avant d’en choisir un manuellement.',
  'Several occurrences require a human choice.': 'Choisissez manuellement l’occurrence voulue.',
  'Text found, but none of the occurrences has reliable geometry.':
    'Le texte a été trouvé, mais aucune occurrence n’a de coordonnées fiables.',
  'The host returned partial page data.': 'Zotero a renvoyé des données de page incomplètes.',
  'The range does not align with complete PDF glyphs.':
    'La plage ne correspond pas à des glyphes PDF complets.',
  'Missing PDF glyph in selected range.': 'Un glyphe PDF manque dans la plage sélectionnée.',
  'Isolated, diagonal, rotated or unmapped text cannot be transferred.':
    'Un texte isolé, en diagonale, pivoté ou sans correspondance ne peut pas être transféré.',
  'The selected text extends beyond the PDF crop box.':
    'Le texte sélectionné dépasse la zone de rognage du PDF.',
  'The host text order has an unmarked line or column boundary.':
    'L’ordre du texte fourni par Zotero comporte une limite de ligne ou de colonne non marquée.',
  'No usable text geometry.': 'Aucune coordonnée de texte exploitable.',
  'Selection exceeds the native annotation position limit.':
    'La sélection dépasse la taille de position maximale d’une annotation Zotero.',
  'Multi-page annotations are not supported.':
    'Les annotations sur plusieurs pages ne sont pas prises en charge.',
  'Invalid source rectangles.': 'Rectangles source non valides.',
  'Not every source rectangle maps to text.':
    'Tous les rectangles source ne correspondent pas à du texte.',
  'Empty source range.': 'La plage source est vide.',
  'Discontinuous source annotation.': 'L’annotation source est discontinue.',
  'Missing source text offsets.': 'Les positions du texte source sont manquantes.',
  'Missing normalized text offsets.': 'Les positions du texte normalisé sont manquantes.',
  'Source text and source geometry disagree; the complete selection cannot be verified.':
    'Le texte source et ses coordonnées ne concordent pas ; la sélection complète ne peut pas être vérifiée.',
  'Documents or annotations changed during analysis. Run analysis again.':
    'Des documents ou des annotations ont changé pendant l’analyse. Relancez l’analyse.',
  'A transfer operation is in progress.': 'Un transfert est en cours.',
  'An incomplete transfer journal needs inspection. No further copies will be created.':
    'Un journal de transfert incomplet doit être examiné. Aucune autre copie ne sera créée.',
  'An interrupted undo needs inspection. No copies will be removed.':
    'Une annulation interrompue doit être examinée. Aucune copie ne sera supprimée.',
  'This plan is busy, applied or invalid. Recalculate before another transfer.':
    'Ce plan est occupé, déjà appliqué ou non valide. Relancez l’analyse avant un nouveau transfert.',
  'Select at least one proposal.': 'Sélectionnez au moins une proposition.',
  'This plan has already been applied.': 'Ce plan a déjà été appliqué.',
  'One source annotation cannot select multiple occurrences.':
    'Une annotation source ne peut pas sélectionner plusieurs occurrences.',
  'Selected proposal has no verified geometry.':
    'La proposition sélectionnée n’a pas de coordonnées vérifiées.',
  'PDF or annotations changed since analysis. Recalculate the plan.':
    'Le PDF ou les annotations ont changé depuis l’analyse. Relancez l’analyse.',
  'Documents or annotations changed during application. The operation was rolled back.':
    'Des documents ou des annotations ont changé pendant l’écriture. L’opération a été annulée.',
  'Copies were committed, but the final journal update failed. Reopen MarginCarry to recover the journal; do not reapply.':
    'Les copies ont été enregistrées, mais la dernière mise à jour du journal a échoué. Rouvrez MarginCarry pour récupérer le journal et n’appliquez pas le plan une seconde fois.',
  'No completed transfer to undo.': 'Aucun transfert terminé à annuler.',
  'Choose local PDF attachments of one item in your personal library.':
    'Choisissez des pièces jointes PDF locales d’un même document de votre bibliothèque personnelle.',
  'The PDF is not locally available. Download it first.':
    'Le PDF n’est pas disponible localement. Téléchargez-le d’abord.',
  'The source and target must be different attachments.':
    'La source et la cible doivent être des pièces jointes différentes.',
  'Two attachments of the same bibliographic item are required.':
    'Deux pièces jointes du même document bibliographique sont nécessaires.',
  'PDF reader initialization timed out. Open the PDF and retry.':
    'Le démarrage du lecteur PDF a expiré. Ouvrez le PDF et réessayez.',
  'Zotero could not open the PDF reader.': 'Zotero n’a pas pu ouvrir le lecteur PDF.',
  'This Zotero reader does not expose the verified PDF adapter API.':
    'Le lecteur de cette version de Zotero n’expose pas l’interface vérifiée nécessaire.',
  'The PDF changed while loading. Run analysis again.':
    'Le PDF a changé pendant son chargement. Relancez l’analyse.',
  'The loaded PDF changed. Run analysis again before reviewing or applying.':
    'Le PDF chargé a changé. Relancez l’analyse avant de vérifier ou d’appliquer.',
  'Page too large for a safe preview. Open its reader position instead.':
    'La page est trop grande pour un aperçu sûr. Ouvrez plutôt cette position dans le lecteur.',
  'Copies are in Trash, but an open reader could not refresh. Reopen the PDF and MarginCarry to recover the operation journal.':
    'Les copies sont dans la corbeille, mais un lecteur ouvert n’a pas pu être actualisé. Rouvrez le PDF et MarginCarry pour récupérer le journal des opérations.',
  'Generated key already exists.': 'La clé générée existe déjà.',
  'Created annotation no longer exists.': 'L’annotation créée n’existe plus.',
  'Undo requires an active operation transaction.':
    'L’annulation nécessite une transaction d’opération active.',
  'Transfer journal has an unsupported format.':
    'Le journal des transferts a un format non pris en charge.',
};
