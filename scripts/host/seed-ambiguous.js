export async function run() {
  const root = hostRoot,
    gold = await IOUtils.readJSON(`${root}/validation/fixture-gold.json`);
  const parent = new Zotero.Item('journalArticle');
  parent.setField('title', 'MarginCarry validation: ambiguous');
  await parent.saveTx();
  const old = await Zotero.Attachments.importFromFile({
      file: `${root}/.local/fixtures/old.pdf`,
      parentItemID: parent.id,
    }),
    target = await Zotero.Attachments.importFromFile({
      file: `${root}/.local/fixtures/repeated.pdf`,
      parentItemID: parent.id,
    });
  await Zotero.Annotations.saveFromJSON(old, {
    key: Zotero.DataObjectUtilities.generateKey(),
    type: 'highlight',
    text: 'A repeated quote',
    comment: 'Choose the intended occurrence.',
    color: '#ffd400',
    pageLabel: '1',
    sortIndex: '00000|000000|00000',
    position: gold['A repeated quote'],
    tags: [{ name: 'MarginCarry validation' }],
  });
  const ids = { parentID: parent.id, old: old.id, new: target.id };
  await IOUtils.writeJSON(`${root}/.local/ambiguous-ids.json`, ids);
  return ids;
}
