import type { Message, UiKey } from './en.ts';

export const ui: Record<UiKey, string> = {
  title: 'MarginCarry · PDF注釈の移行',
  menu: 'MarginCarry: PDF注釈を移行…',
  subtitle: 'PDFの新しい版へ注釈を移します。書き込む前に、各位置を確認してください。',
  language: '言語',
  direction: '移行の方向',
  old: '旧PDF',
  new: '新PDF',
  swap: '方向を入れ替え',
  analyze: '候補を検索',
  cancel: '解析をキャンセル',
  preparing: '準備中…',
  annotations: '注釈',
  unique: '一意の候補を選択',
  sourceList: '移行元の注釈',
  proposal: '候補の位置',
  source: '移行元',
  target: '移行先',
  openSource: 'リーダーで移行元を開く',
  openTarget: 'リーダーで移行先を開く',
  sourceImage: '実際のPDFページ上の移行元の選択範囲',
  targetImage: '実際のPDFページ上の候補の選択範囲',
  accept: '候補を採用',
  skip: 'スキップ',
  selectionOnly: '選択しただけでは何も書き込まれません。',
  selected: '書き込み対象: {count}件',
  apply: '選択を適用',
  undo: '直前の移行を元に戻す',
  review: '選択した移行',
  openResult: '作成された注釈を開く',
  links: 'コピーには新しいキーが付きます。既存のノート内のリンクは、引き続き元の注釈を開きます。',
  cancelling: '解析をキャンセルしています…',
  cancelled: '解析をキャンセルしました。何も書き込まれていません。',
  ready: '移行の方向を選んで解析を開始してください。注釈が自動的に書き込まれることはありません。',
  choosePair:
    'このウィンドウを閉じて、同じアイテムのPDF添付ファイルを2つ、または文献アイテムを選択してください。',
  uniqueSelected: '一意の候補を選択しました。適用する前に内容を確認してください。',
  undoConfirm:
    '直前の移行を元に戻しますか？ その移行で作成されたコピーだけがゴミ箱に移動します。コピーが編集されている場合は、競合として中止されます。',
  undone: '移行を元に戻しました。ゴミ箱に移動したコピー: {count}件',
  analyzed: '処理した注釈: {count}件。候補を採用する前にPDFを確認してください。',
  analysisFailed: '解析が完了しませんでした: {error}。候補は適用できません。',
  type: '種類: {type}',
  typeHighlight: 'ハイライト',
  typeUnderline: '下線',
  typeNote: 'ノート',
  typeImage: '画像',
  typeInk: 'インク',
  typeText: 'テキスト',
  accepted: '選択済み · ',
  skipped: 'スキップ済み · ',
  'unique candidate': '一意の候補',
  'multiple candidates': '複数の候補',
  'doubtful candidate': '疑わしい候補',
  'not found': '見つかりません',
  unsupported: '非対応',
  'processing error': '処理エラー',
  reviewLine: '{old}ページ → {new}ページ · {text}',
  remove: '削除',
  removeLabel: '削除: {text}',
  noComment: 'コメントなし',
  metadata: '{type} · 色 {color} · タグ: {tags}',
  noTags: 'なし',
  sourcePage: '移行元 · {page}ページ',
  chooseCandidate: '確認する候補を選んでください…',
  variant: '候補 {index} · ',
  candidate: '{page}ページ · {method}',
  exact: '完全一致',
  normalized: '正規化して一致',
  contextMatch: ' · 前後の文脈が一致',
  outcome: '{status}：{reason}',
  boundaryDiffers: ' · 語または数値の区切りが異なる',
  noGeometry: ' · 信頼できる座標なし',
  targetPage: '移行先 · {page}ページ（ファイル内 {sheet}ページ目）',
  chooseTarget: '移行先の位置を選んでください',
  noTarget: '移行先の位置がありません',
  loading: 'PDFを読み込み中…',
  previewFailed: 'プレビューを表示できません: {error}。リーダーでこの位置を開いてください。',
  noPreview: 'プレビューできる検証済みの位置がありません。',
  applyConfirm:
    '選択した{count}件を「{title}」に適用しますか？ 元の注釈は残ります。コピーには新しいキーが付きます。',
  writing: '変更を確認して書き込み中…',
  created: 'Zotero注釈を{count}件作成しました。移行内容はローカル履歴に保存されました。',
  applied: '移行しました: {count}件。新しいPDFを開くか、直前の移行を元に戻せます。',
  sourceProgress: '移行元のページ: {current}/{total}',
  targetProgress: '移行先のページ: {current}/{total}',
  annotationProgress: '注釈: {current}/{total}',
  extractionFailed: 'PDFからテキストを取得できませんでした: {error}',
  limit: '候補を{limit}件に制限しました。候補が1件だけかどうかは不明です。',
  incompletePage: '{page}ページの抽出データが不完全です。',
  duplicate:
    '移行元の注釈 {key} はすでに移行済みです。もう一度コピーするには、先にその移行を元に戻してください。',
  conflict:
    '元に戻せません: {keys} が編集、移動、または削除されています。コピーは1件も削除されていません。',
};

export const messages: Record<Message, string> = {
  'Only native highlights and underlines are supported.':
    'Zotero標準のハイライトと下線のみ対応しています。',
  'The source page could not be extracted.': '移行元のページを取得できませんでした。',
  'Empty source text.': '移行元のテキストが空です。',
  'The target PDF has no usable text layer. OCR is not supported.':
    '移行先のPDFには利用できるテキストレイヤーがありません。OCRには対応していません。',
  'No exact or conservatively normalized quote on a single target page.':
    '移行先の1ページ内に、完全一致または控えめな正規化で一致する引用が見つかりません。',
  'One occurrence matches the complete available context; alternatives are retained.':
    '1件が、利用できる前後の文脈すべてと一致しました。ほかの候補も残してあります。',
  'One text occurrence; verify the PDF position.':
    'テキストが1か所で見つかりました。PDF上の位置を確認してください。',
  'One text occurrence; word boundaries cannot be checked for this script. Verify the PDF position.':
    'テキストが1か所で見つかりました。この文字体系では語の区切りを確認できません。PDF上の位置を確認してください。',
  'The quote occurs only where the word or number boundary differs from the source selection; no transfer is recommended. Check the PDF before choosing one manually.':
    '引用は、語または数値の区切りが移行元の選択範囲と異なる場所にしかありません。移行は推奨されません。PDFを確認してから、手動で選んでください。',
  'Several occurrences require a human choice.': '正しい候補を手動で選んでください。',
  'Text found, but none of the occurrences has reliable geometry.':
    'テキストは見つかりましたが、信頼できる座標を持つ候補がありません。',
  'The host returned partial page data.': 'Zoteroから不完全なページデータが返されました。',
  'The range does not align with complete PDF glyphs.':
    '範囲がPDFの完全なグリフの境界と一致しません。',
  'Missing PDF glyph in selected range.': '選択範囲にPDFのグリフが欠けています。',
  'Isolated, diagonal, rotated or unmapped text cannot be transferred.':
    '孤立した文字、斜めや回転した文字、対応付けできない文字は移行できません。',
  'The selected text extends beyond the PDF crop box.':
    '選択したテキストがPDFのクロップボックスからはみ出しています。',
  'The host text order has an unmarked line or column boundary.':
    'Zoteroが返したテキスト順序に、印のない行または段の区切りがあります。',
  'No usable text geometry.': '利用できるテキストの座標がありません。',
  'Selection exceeds the native annotation position limit.':
    '選択範囲が、Zotero注釈の位置情報のサイズ上限を超えています。',
  'Multi-page annotations are not supported.': '複数ページにまたがる注釈には対応していません。',
  'Invalid source rectangles.': '移行元の矩形が不正です。',
  'Not every source rectangle maps to text.': 'テキストに対応しない移行元の矩形があります。',
  'Empty source range.': '移行元の範囲が空です。',
  'Discontinuous source annotation.': '移行元の注釈が連続していません。',
  'Missing source text offsets.': '移行元テキストの位置情報がありません。',
  'Missing normalized text offsets.': '正規化したテキストの位置情報がありません。',
  'Source text and source geometry disagree; the complete selection cannot be verified.':
    '移行元のテキストと座標が一致しないため、選択範囲全体を検証できません。',
  'Documents or annotations changed during analysis. Run analysis again.':
    '解析中に文書または注釈が変更されました。もう一度解析してください。',
  'A transfer operation is in progress.': '移行処理を実行中です。',
  'An incomplete transfer journal needs inspection. No further copies will be created.':
    '未完了の移行履歴を確認する必要があります。これ以上コピーは作成されません。',
  'An interrupted undo needs inspection. No copies will be removed.':
    '中断された取り消しを確認する必要があります。コピーは削除されません。',
  'This plan is busy, applied or invalid. Recalculate before another transfer.':
    'このプランは処理中、適用済み、または無効です。次の移行の前に、もう一度解析してください。',
  'Select at least one proposal.': '候補を1件以上選択してください。',
  'This plan has already been applied.': 'このプランはすでに適用済みです。',
  'One source annotation cannot select multiple occurrences.':
    '1つの移行元注釈で複数の候補を選ぶことはできません。',
  'Selected proposal has no verified geometry.': '選択した候補には検証済みの座標がありません。',
  'PDF or annotations changed since analysis. Recalculate the plan.':
    '解析後にPDFまたは注釈が変更されました。もう一度解析してください。',
  'Documents or annotations changed during application. The operation was rolled back.':
    '書き込み中に文書または注釈が変更されました。処理は取り消され、変更は元に戻されました。',
  'Copies were committed, but the final journal update failed. Reopen MarginCarry to recover the journal; do not reapply.':
    'コピーは保存されましたが、最後の履歴の更新に失敗しました。MarginCarryを開き直して履歴を復旧してください。プランを再適用しないでください。',
  'No completed transfer to undo.': '元に戻せる完了済みの移行がありません。',
  'Choose local PDF attachments of one item in your personal library.':
    '個人ライブラリにある同じアイテムのローカルPDF添付ファイルを選択してください。',
  'The PDF is not locally available. Download it first.':
    'PDFがローカルにありません。先にダウンロードしてください。',
  'The source and target must be different attachments.':
    '移行元と移行先には別々の添付ファイルを指定してください。',
  'Two attachments of the same bibliographic item are required.':
    '同じ文献アイテムの添付ファイルが2つ必要です。',
  'PDF reader initialization timed out. Open the PDF and retry.':
    'PDFリーダーの初期化がタイムアウトしました。PDFを開いてやり直してください。',
  'Zotero could not open the PDF reader.': 'ZoteroがPDFリーダーを開けませんでした。',
  'This Zotero reader does not expose the verified PDF adapter API.':
    'このバージョンのZoteroのリーダーには、必要な検証済みのインターフェースがありません。',
  'The PDF changed while loading. Run analysis again.':
    '読み込み中にPDFが変更されました。もう一度解析してください。',
  'The loaded PDF changed. Run analysis again before reviewing or applying.':
    '読み込んだPDFが変更されました。確認や適用の前に、もう一度解析してください。',
  'Page too large for a safe preview. Open its reader position instead.':
    'ページが大きすぎるため、安全にプレビューできません。リーダーでこの位置を開いてください。',
  'Copies are in Trash, but an open reader could not refresh. Reopen the PDF and MarginCarry to recover the operation journal.':
    'コピーはゴミ箱にありますが、開いているリーダーを更新できませんでした。PDFとMarginCarryを開き直して、操作履歴を復旧してください。',
  'Generated key already exists.': '生成したキーはすでに存在します。',
  'Created annotation no longer exists.': '作成した注釈が存在しなくなりました。',
  'Undo requires an active operation transaction.':
    '元に戻すには、有効な操作トランザクションが必要です。',
  'Transfer journal has an unsupported format.': '移行履歴の形式に対応していません。',
};
