// Creates a disposable item with two PDF revisions and source annotations for UI checks.
// Run `python3 scripts/make-ui-fixture.py` first. Use only in the isolated profile.
export async function run() {
  const fixtures = `${hostRoot}/.local/ui-fixture`;
  const parent = new Zotero.Item('journalArticle');
  parent.setField('title', 'MarginCarry interface fixture');
  await parent.saveTx();
  const old = await Zotero.Attachments.importFromFile({
    file: `${fixtures}/old.pdf`,
    parentItemID: parent.id,
  });
  const target = await Zotero.Attachments.importFromFile({
    file: `${fixtures}/new.pdf`,
    parentItemID: parent.id,
  });
  const quotes = [
    ['the quick brown fox jumps', 690, 'A short comment.', '#ffd400'],
    ['41.0', 660, 'The number changes from 41.0 to 41.03.', '#ff6666'],
    ['not', 630, '', '#5fb236'],
    ['cat', 600, 'Only a fragment of another word remains.', '#2ea8e5'],
    ['A repeated quote', 570, 'Choose the intended occurrence.', '#a28ae5'],
    ['This sentence disappears in the new revision', 540, '', '#ffd400'],
    [
      'A longer passage that is highlighted to show how a long source quote wraps in the list',
      510,
      'A long comment shows how several lines of explanatory text are laid out in the detail panel next to the quote and its metadata.',
      '#e56eee',
    ],
  ];
  const keys = [];
  for (const [index, [text, y, comment, color]] of quotes.entries()) {
    const key = Zotero.DataObjectUtilities.generateKey();
    keys.push(key);
    await Zotero.Annotations.saveFromJSON(old, {
      key,
      type: index === 3 ? 'underline' : 'highlight',
      text,
      comment,
      color,
      pageLabel: '1',
      sortIndex: `00000|${String(800 - y).padStart(6, '0')}|00000`,
      position: { pageIndex: 0, rects: [[70, y - 3, 74 + text.length * 6.2, y + 11]] },
      tags: [{ name: 'interface check' }],
    });
  }
  await Zotero.Annotations.saveFromJSON(old, {
    key: Zotero.DataObjectUtilities.generateKey(),
    type: 'note',
    comment: 'A note annotation is not supported.',
    color: '#ffd400',
    pageLabel: '1',
    sortIndex: '00000|000300|00000',
    position: { pageIndex: 0, rects: [[300, 400, 318, 418]] },
    tags: [],
  });
  const ids = { parentID: parent.id, old: old.id, new: target.id, keys };
  await IOUtils.writeJSON(`${hostValidationRoot}/ui-fixture-ids.json`, ids);
  return ids;
}
