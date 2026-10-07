export async function run() {
  // Run only through scripts/host-request.mjs in the isolated development profile.
  const api = Zotero.MarginCarryTest;
  const gold = await IOUtils.readJSON(`${hostRoot}/validation/fixture-gold.json`);
  const root = hostRoot;
  const results = [],
    ids = {};
  for (const test of [
    {
      id: 'page-insertion',
      old: 'old',
      new: 'new',
      quotes: [
        'The selected passage moves to a new page.',
        'It keeps its comment, color and text tags.',
      ],
    },
    {
      id: 'rotation-crop',
      old: 'old',
      new: 'rotated',
      quotes: ['The selected passage moves to a new page.'],
    },
    {
      id: 'two-columns',
      old: 'columns',
      new: 'columns',
      quotes: ['Column left line one continues below.'],
    },
    {
      id: 'no-text',
      old: 'old',
      new: 'no-text',
      quotes: ['The selected passage moves to a new page.'],
    },
  ]) {
    const parent = new Zotero.Item('journalArticle');
    parent.setField('title', `MarginCarry validation: ${test.id}`);
    await parent.saveTx();
    const old = await Zotero.Attachments.importFromFile({
        file: `${root}/.local/fixtures/${test.old}.pdf`,
        parentItemID: parent.id,
      }),
      target = await Zotero.Attachments.importFromFile({
        file: `${root}/.local/fixtures/${test.new}.pdf`,
        parentItemID: parent.id,
      });
    ids[test.id] = { parentID: parent.id, old: old.id, new: target.id };
    for (const [i, quote] of test.quotes.entries())
      await Zotero.Annotations.saveFromJSON(old, {
        key: Zotero.DataObjectUtilities.generateKey(),
        type: i ? 'underline' : 'highlight',
        text: quote,
        comment: 'Review this passage in the new revision.',
        color: i ? '#2ea8e5' : '#ffd400',
        pageLabel: '1',
        sortIndex: `00000|${String(i).padStart(6, '0')}|00000`,
        position: gold[quote],
        tags: [{ name: 'MarginCarry validation' }],
      });
    const plan = await api.analyze(
      api.adapter,
      old.id,
      target.id,
      new (Zotero.getMainWindow().AbortController)().signal,
      () => {},
    );
    results.push({
      id: test.id,
      outcomes: plan.proposals.map((p) => ({
        quote: p.source.text,
        status: p.status,
        reason: p.reason,
        candidates: p.candidates,
      })),
      targetPage: (
        await api.adapter.pages(
          target.id,
          new (Zotero.getMainWindow().AbortController)().signal,
          () => {},
        )
      ).map((p) => ({ index: p.index, rotation: p.rotation, viewBox: p.viewBox })),
    });
    if (test.id === 'page-insertion') {
      const proposal = plan.proposals[0],
        candidate = proposal.candidates[0];
      for (const [side, itemID, position] of [
        ['old', old.id, proposal.source.position],
        ['new', target.id, candidate.position],
      ]) {
        const data = await api.adapter.preview(
          itemID,
          position,
          proposal.source.color,
          proposal.source.type,
        );
        await IOUtils.write(
          `${root}/docs/images/fixture-${side}.png`,
          Uint8Array.from(atob(data.split(',')[1]), (c) => c.charCodeAt(0)),
        );
      }
    }
    if (test.id === 'rotation-crop' && plan.proposals[0].candidates[0]?.position) {
      const p = plan.proposals[0],
        c = p.candidates[0],
        data = await api.adapter.preview(target.id, c.position, p.source.color, p.source.type);
      await IOUtils.write(
        `${root}/docs/images/fixture-rotated.png`,
        Uint8Array.from(atob(data.split(',')[1]), (c) => c.charCodeAt(0)),
      );
    }
  }
  await IOUtils.writeJSON(`${root}/.local/geometry-ids.json`, ids);
  await IOUtils.writeJSON(`${root}/validation/host-geometry.json`, {
    version: Zotero.version,
    os: Services.appinfo.OS,
    results,
  });
  return { ids, results };
}
