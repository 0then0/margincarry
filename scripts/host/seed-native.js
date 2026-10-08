// Import only PDFs and pre-existing target notes. Source annotations must be made in the reader UI.
export async function run() {
  if (
    Services.dirsvc.get('ProfD', Ci.nsIFile).path !== `${hostValidationRoot}/profile` ||
    Zotero.DataDirectory.dir !== `${hostValidationRoot}/data`
  )
    throw new Error('Refusing a non-isolated profile or data directory.');
  if (await IOUtils.exists(`${hostValidationRoot}/native-ids.json`))
    throw new Error('Native fixtures already exist; use a fresh isolated profile.');
  const pairs = {};
  for (const pair of ['lora', 'attention']) {
    const parent = new Zotero.Item('journalArticle');
    parent.setField('title', `MarginCarry native v0.1.0: ${pair}`);
    await parent.saveTx();
    const attachments = [];
    for (const version of [1, 2])
      attachments.push(
        await Zotero.Attachments.importFromFile({
          file: `${hostRoot}/.local/corpus/${pair}-v${version}.pdf`,
          parentItemID: parent.id,
        }),
      );
    pairs[pair] = { parentID: parent.id, old: attachments[0].id, new: attachments[1].id };
    await Zotero.Annotations.saveFromJSON(attachments[1], {
      key: Zotero.DataObjectUtilities.generateKey(),
      type: 'note',
      comment: 'Existing target: preserve',
      color: '#ffd400',
      pageLabel: '1',
      sortIndex: '00000|000000|00000',
      position: { pageIndex: 0, rects: [[72, 700, 90, 720]] },
      tags: [],
    });
  }
  await IOUtils.writeJSON(`${hostValidationRoot}/native-ids.json`, { pairs });
  await Zotero.Reader.open(pairs.attention.old);
  return pairs;
}
