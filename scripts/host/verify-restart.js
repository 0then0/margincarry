export async function run() {
  // Run only through scripts/host-request.mjs in the isolated development profile.
  const api = Zotero.MarginCarryTest;
  const apply = await IOUtils.readJSON(`${hostRoot}/validation/host-corpus-apply.json`);
  const plans = await IOUtils.readJSON(`${hostRoot}/.local/corpus-plans.json`);
  const records = await api.service.journal();
  const result = { version: Zotero.version, os: Services.appinfo.OS, pairs: {} };
  for (const [pair, applied] of Object.entries(apply.pairs)) {
    const record = records.find((r) => r.id === applied.operationID);
    const fingerprints = await Promise.all(
      record.created.map((c) => api.adapter.fingerprint(record.libraryID, c.key)),
    );
    const selectors = record.copies.map((copy) => ({
      sourceKey: copy.sourceKey,
      candidateID: plans[pair].proposals
        .find((p) => p.source.key === copy.sourceKey)
        .candidates.find((c) => JSON.stringify(c.position) === JSON.stringify(copy.position)).id,
    }));
    let replay = '';
    try {
      const plan = JSON.parse(JSON.stringify(plans[pair]));
      plan.state = 'review';
      await api.service.apply(plan, selectors);
    } catch (e) {
      replay = String(e);
    }
    result.pairs[pair] = {
      createdCount: record.created.length,
      persistedUnchanged: record.created.every((c, i) => c.fingerprint === fingerprints[i]),
      journalStatus: record.status,
      replayBlocked: replay,
    };
  }
  await IOUtils.writeJSON(`${hostRoot}/validation/host-restart.json`, result);
  return result;
}
