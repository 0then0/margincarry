export async function run() {
  // Disposable project-owned documents only, through the isolated-profile bridge.
  const api = Zotero.MarginCarryTest;
  const gold = await IOUtils.readJSON(`${hostRoot}/validation/fixture-gold.json`);
  const parent = new Zotero.Item('journalArticle');
  parent.setField('title', 'MarginCarry validation: same-path PDF replacement');
  await parent.saveTx();
  const source = await Zotero.Attachments.importFromFile({
    file: `${hostRoot}/.local/fixtures/old.pdf`,
    parentItemID: parent.id,
  });
  const target = await Zotero.Attachments.importFromFile({
    file: `${hostRoot}/.local/fixtures/old.pdf`,
    parentItemID: parent.id,
  });
  const quote = 'The selected passage moves to a new page.';
  await Zotero.Annotations.saveFromJSON(source, {
    key: Zotero.DataObjectUtilities.generateKey(),
    type: 'highlight',
    text: quote,
    comment: 'Revision regression fixture',
    color: '#ffd400',
    pageLabel: '1',
    sortIndex: '00000|000001|00000',
    position: gold[quote],
    tags: [{ name: 'MarginCarry validation' }],
  });
  const signal = () => new (Zotero.getMainWindow().AbortController)().signal;
  const cached = await api.adapter.pages(target.id, signal(), () => {});
  const oldHash = (await api.adapter.snapshot(target.id)).file.hash;
  const path = await target.getFilePathAsync();
  const beforeSource = await api.adapter.snapshot(source.id);
  await IOUtils.write(path, await IOUtils.read(`${hostRoot}/.local/fixtures/new.pdf`));
  const plan = await api.analyze(api.adapter, source.id, target.id, signal(), () => {});
  const proposal = plan.proposals[0],
    candidate = proposal.candidates.find((c) => c.id === proposal.recommendedID);
  if (!candidate?.position || candidate.pageIndex !== 1)
    throw new Error('Analysis reused cached coordinates from the replaced PDF');
  const record = await api.service.apply(plan, [
    { sourceKey: proposal.source.key, candidateID: candidate.id },
  ]);
  const created = Zotero.Items.getByLibraryAndKey(record.libraryID, record.created[0].key);
  if (JSON.parse(created.annotationPosition).pageIndex !== 1)
    throw new Error('Created copy uses stale geometry');
  await api.service.undoLast();
  // Changing the file after analysis must also reject preview and applying an old plan.
  const nextPlan = await api.analyze(api.adapter, source.id, target.id, signal(), () => {});
  await IOUtils.write(path, await IOUtils.read(`${hostRoot}/.local/fixtures/old.pdf`));
  let previewError = '',
    applyError = '';
  try {
    await api.adapter.preview(target.id, nextPlan.proposals[0].candidates[0].position, '#ffd400');
  } catch (e) {
    previewError = String(e);
  }
  try {
    await api.service.apply(nextPlan, [
      {
        sourceKey: nextPlan.proposals[0].source.key,
        candidateID: nextPlan.proposals[0].recommendedID,
      },
    ]);
  } catch (e) {
    applyError = String(e);
  }
  const report = {
    version: Zotero.version,
    os: Services.appinfo.OS,
    cachedPages: cached.length,
    replacedFileHashChanged: oldHash !== plan.target.file.hash,
    matchedPageIndex: candidate.pageIndex,
    copiedPageIndex: JSON.parse(created.annotationPosition).pageIndex,
    copyUndone: created.deleted,
    sourceUnchanged:
      JSON.stringify(beforeSource) === JSON.stringify(await api.adapter.snapshot(source.id)),
    rejectedStalePreview: previewError.includes('loaded PDF changed'),
    rejectedStaleApply: applyError.includes('changed since analysis'),
    previewError,
    applyError,
  };
  if (!report.sourceUnchanged || !report.rejectedStalePreview || !report.rejectedStaleApply)
    throw new Error(JSON.stringify(report));
  await IOUtils.writeJSON(`${hostRoot}/validation/host-revision-regression.json`, report);
  return report;
}
