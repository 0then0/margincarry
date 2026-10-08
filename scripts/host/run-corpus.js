export async function run() {
  // Run only through scripts/host-request.mjs in the isolated development profile.
  const { AddonManager } = ChromeUtils.importESModule(
    'resource://gre/modules/AddonManager.sys.mjs',
  );
  const api = {
    Zotero,
    Services,
    IOUtils,
    PathUtils,
    Cu,
    Cc,
    Ci,
    crypto: Zotero.getMainWindow().crypto,
    AbortController: Zotero.getMainWindow().AbortController,
    Intl,
  };
  Services.scriptloader.loadSubScriptWithOptions(
    (await AddonManager.getAddonByID('margincarry@0then0.github.io')).getResourceURI(
      'margincarry.js',
    ).spec,
    { target: api, ignoreCache: true },
  );
  Zotero.MarginCarryTest = api.MarginCarry;
  const ids = await IOUtils.readJSON(`${hostValidationRoot}/corpus-ids.json`);
  const corpus = await IOUtils.readJSON(`${hostRoot}/validation/corpus.json`);
  const AC = Zotero.getMainWindow().AbortController,
    plans = {},
    results = [];
  for (const pair of ['lora', 'attention']) {
    const started = Date.now();
    const plan = await api.MarginCarry.analyze(
      api.MarginCarry.adapter,
      ids.pairs[pair].old,
      ids.pairs[pair].new,
      new AC().signal,
      (msg) => Zotero.debug(`MarginCarry corpus ${pair} ${msg}`),
    );
    plans[pair] = plan;
    for (const gold of corpus.annotations.filter((a) => a.pair === pair)) {
      const p = plan.proposals.find((p) => p.source.key === ids.sources[gold.id]);
      results.push({
        id: gold.id,
        pair,
        sourceKey: p.source.key,
        status: p.status,
        reason: p.reason,
        truncated: p.truncated,
        recommendedID: p.recommendedID,
        candidates: p.candidates.map((c) => ({
          id: c.id,
          pageIndex: c.pageIndex,
          pageLabel: c.pageLabel,
          position: c.position,
          text: c.text,
          method: c.method,
          contextMatches: c.contextMatches,
          geometryError: c.geometryError,
        })),
      });
    }
    Zotero.debug(`MarginCarry corpus ${pair} completed in ${Date.now() - started}ms`);
  }
  Zotero.MarginCarryCorpusPlans = plans;
  await IOUtils.writeJSON(`${hostValidationRoot}/corpus-plans.json`, plans);
  const reportRoot = hostValidationReportRoot;
  await IOUtils.writeJSON(`${reportRoot}/corpus-results.json`, {
    version: Zotero.version,
    os: Services.appinfo.OS,
    date: new Date().toISOString(),
    results,
  });
  return results.map((r) => ({
    id: r.id,
    status: r.status,
    candidates: r.candidates.length,
    reason: r.reason,
  }));
}
