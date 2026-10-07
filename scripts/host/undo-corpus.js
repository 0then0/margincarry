export async function run() {
  // Run only through scripts/host-request.mjs in the isolated development profile.
  const api = Zotero.MarginCarryTest;
  const records = await api.service.journal();
  const apply = await IOUtils.readJSON(`${hostRoot}/validation/host-corpus-apply.json`);
  const record = records.find((r) => r.id === apply.pairs.attention.operationID);
  const item = Zotero.Items.getByLibraryAndKey(record.libraryID, record.created[0].key);
  const savedComment = item.annotationComment,
    savedDate = item.dateModified;
  item.annotationComment = 'Edited after transfer: undo must stop';
  await item.saveTx();
  let conflict = '';
  try {
    await api.service.undoLast();
  } catch (e) {
    conflict = String(e);
  }
  const noneDeleted = record.created.every(
    (c) => !Zotero.Items.getByLibraryAndKey(record.libraryID, c.key).deleted,
  );
  // Restore only this disposable test copy, including dateModified, to test the successful branch independently.
  item.annotationComment = savedComment;
  item.dateModified = savedDate;
  await item.saveTx({ skipDateModifiedUpdate: true });
  const restored =
    (await api.adapter.fingerprint(record.libraryID, item.key)) === record.created[0].fingerprint;
  if (!restored) throw new Error('Fixture restoration does not equal recorded fingerprint');
  const results = [];
  for (const pair of ['attention', 'lora']) {
    const applied = apply.pairs[pair],
      r = records.find((r) => r.id === applied.operationID);
    const sourceBefore = await api.adapter.snapshot(r.sourceID),
      targetBefore = await api.adapter.snapshot(r.targetID);
    const undone = await api.service.undoLast();
    const sourceAfter = await api.adapter.snapshot(r.sourceID),
      targetAfter = await api.adapter.snapshot(r.targetID);
    results.push({
      pair,
      ...undone,
      onlyOwnedCopiesTrashed: r.created.every(
        (c) => Zotero.Items.getByLibraryAndKey(r.libraryID, c.key).deleted,
      ),
      sourceUnchanged: JSON.stringify(sourceBefore) === JSON.stringify(sourceAfter),
      pdfHashesUnchanged:
        sourceBefore.file.hash === sourceAfter.file.hash &&
        targetBefore.file.hash === targetAfter.file.hash,
      existingTargetPreserved: targetBefore.annotations
        .filter((a) => !r.created.some((c) => c.key === a.key))
        .every((a) =>
          targetAfter.annotations.some((b) => a.key === b.key && a.fingerprint === b.fingerprint),
        ),
    });
  }
  const report = {
    version: Zotero.version,
    conflict,
    noneDeletedOnConflict: noneDeleted,
    restoredTestCopy: restored,
    results,
  };
  await IOUtils.writeJSON(`${hostRoot}/validation/host-corpus-undo.json`, report);
  return report;
}
