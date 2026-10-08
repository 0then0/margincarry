export async function run() {
  // Run only through scripts/host-request.mjs in the isolated development profile.
  const corpus = await IOUtils.readJSON(`${hostRoot}/validation/corpus.json`);
  const pairs = {};
  const sources = {};
  for (const pair of ['lora', 'attention']) {
    const parent = new Zotero.Item('journalArticle');
    parent.setField('title', `MarginCarry corpus: ${pair}`);
    await parent.saveTx();
    const attachments = [];
    for (const version of [1, 2]) {
      const attachment = await Zotero.Attachments.importFromFile({
        file: `${hostRoot}/.local/corpus/${pair}-v${version}.pdf`,
        parentItemID: parent.id,
      });
      attachments.push(attachment);
    }
    pairs[pair] = { parentID: parent.id, old: attachments[0].id, new: attachments[1].id };
    for (const gold of corpus.annotations.filter((a) => a.pair === pair)) {
      const key = Zotero.DataObjectUtilities.generateKey();
      const item = await Zotero.Annotations.saveFromJSON(attachments[0], {
        key,
        type: gold.type,
        text: gold.quote,
        comment: `Corpus case ${gold.id}`,
        color: gold.type === 'underline' ? '#2ea8e5' : '#ffd400',
        pageLabel: String(gold.source.pageIndex + 1),
        sortIndex:
          String(gold.source.pageIndex).padStart(5, '0') +
          '|' +
          String(gold.source.charStart || 0).padStart(6, '0') +
          '|00000',
        position: { pageIndex: gold.source.pageIndex, rects: gold.source.rects },
        tags: [{ name: 'MarginCarry corpus' }, { name: gold.id }],
      });
      sources[gold.id] = item.key;
    }
    // A pre-existing target annotation whose preservation is checked after apply and undo.
    await Zotero.Annotations.saveFromJSON(attachments[1], {
      key: Zotero.DataObjectUtilities.generateKey(),
      type: 'note',
      comment: 'Existing target annotation: preserve',
      color: '#ffd400',
      pageLabel: '1',
      sortIndex: '00000|000000|00000',
      position: { pageIndex: 0, rects: [[72, 700, 90, 720]] },
      tags: [],
    });
  }
  const ids = { pairs, sources };
  await IOUtils.writeJSON(`${hostValidationRoot}/corpus-ids.json`, ids);
  return { pairs, sourceCount: Object.keys(sources).length };
}
