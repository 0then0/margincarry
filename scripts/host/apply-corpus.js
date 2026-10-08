export async function run() {
  // Run only through scripts/host-request.mjs in the isolated development profile.
  const api = Zotero.MarginCarryTest,
    plans = Zotero.MarginCarryCorpusPlans;
  const corpus = await IOUtils.readJSON(`${hostRoot}/validation/corpus.json`);
  const ids = await IOUtils.readJSON(`${hostValidationRoot}/corpus-ids.json`);
  function matches(c, t) {
    return (
      c.position &&
      c.position.pageIndex === t.pageIndex &&
      c.position.rects.length === t.rects.length &&
      c.position.rects.every((r, i) => r.every((x, j) => Math.abs(x - t.rects[i][j]) <= 2))
    );
  }
  const report = { version: Zotero.version, os: Services.appinfo.OS, pairs: {}, checks: {} };
  const AC = Zotero.getMainWindow().AbortController;
  const cancel = new AC();
  let cancelled = '';
  try {
    await api.analyze(api.adapter, ids.pairs.lora.old, ids.pairs.lora.new, cancel.signal, () =>
      cancel.abort(),
    );
  } catch (e) {
    cancelled = String(e);
  }
  report.checks.cancelled = cancelled;
  for (const pair of ['lora', 'attention']) {
    const plan = plans[pair];
    const beforeSource = await api.adapter.snapshot(plan.source.id),
      beforeTarget = await api.adapter.snapshot(plan.target.id);
    const selections = [];
    for (const gold of corpus.annotations.filter(
      (a) => a.pair === pair && a.expected === 'locations',
    )) {
      const p = plan.proposals.find((p) => p.source.key === ids.sources[gold.id]);
      const c = p.candidates.find((c) => gold.targets.some((t) => matches(c, t)));
      if (!c) throw new Error(`No independently verified candidate for ${gold.id}`);
      selections.push({ sourceKey: p.source.key, candidateID: c.id });
    }
    if (pair === 'lora') {
      const originalCreate = api.adapter.create.bind(api.adapter);
      let calls = 0;
      api.adapter.create = async (...args) => {
        if (++calls === 2) throw new Error('Injected host write failure');
        return originalCreate(...args);
      };
      let failure = '';
      try {
        await api.service.apply(plan, selections);
      } catch (e) {
        failure = String(e);
      } finally {
        api.adapter.create = originalCreate;
      }
      const rollbackTarget = await api.adapter.snapshot(plan.target.id);
      report.checks.writeFailure = {
        failure,
        targetUnchanged: JSON.stringify(beforeTarget) === JSON.stringify(rollbackTarget),
        journalStatus: (await api.service.journal()).find((r) => r.id === plan.id)?.status,
      };
      // Recalculate a failed plan, as the product requires.
      plans[pair] = await api.analyze(
        api.adapter,
        plan.source.id,
        plan.target.id,
        new AC().signal,
        () => {},
      );
    }
    const livePlan = plans[pair],
      record = await api.service.apply(livePlan, selections);
    const afterSource = await api.adapter.snapshot(plan.source.id),
      afterTarget = await api.adapter.snapshot(plan.target.id);
    let repeated = '';
    try {
      await api.service.apply(livePlan, selections);
    } catch (e) {
      repeated = String(e);
    }
    const properties = record.created.every((created) => {
      const item = Zotero.Items.getByLibraryAndKey(record.libraryID, created.key),
        copy = record.copies.find((c) => c.key === created.key);
      return (
        item.parentID === record.targetID &&
        item.annotationText === copy.text &&
        item.annotationComment === copy.comment &&
        item.annotationColor === copy.color &&
        JSON.stringify(
          item
            .getTags()
            .map((t) => t.tag)
            .sort(),
        ) === JSON.stringify([...copy.tags].sort()) &&
        created.key !== created.sourceKey
      );
    });
    report.pairs[pair] = {
      operationID: record.id,
      created: record.created,
      sourceUnchanged: JSON.stringify(beforeSource) === JSON.stringify(afterSource),
      pdfHashesUnchanged:
        beforeSource.file.hash === afterSource.file.hash &&
        beforeTarget.file.hash === afterTarget.file.hash,
      existingTargetsUnchanged: beforeTarget.annotations.every((a) =>
        afterTarget.annotations.some((b) => b.key === a.key && b.fingerprint === a.fingerprint),
      ),
      nativePropertiesCorrect: properties,
      repeatBlocked: repeated,
      createdCount: afterTarget.annotations.length - beforeTarget.annotations.length,
    };
    await api.adapter.navigate(record.targetID, record.copies[0].position, record.created[0].key);
  }
  await IOUtils.writeJSON(`${hostValidationRoot}/corpus-plans.json`, plans);
  await IOUtils.writeJSON(`${hostValidationReportRoot}/host-corpus-apply.json`, report);
  return {
    checks: report.checks,
    pairs: Object.fromEntries(
      Object.entries(report.pairs).map(([name, r]) => [
        name,
        { ...r, created: r.created.map((c) => ({ key: c.key, sourceKey: c.sourceKey })) },
      ]),
    ),
  };
}
