// Development-only stages. Source positions must be created in the reader UI before capture.
export async function run() {
  const out = hostValidationReportRoot;
  const profile = Services.dirsvc.get('ProfD', Ci.nsIFile).path;
  if (
    profile !== `${hostValidationRoot}/profile` ||
    Zotero.DataDirectory.dir !== `${hostValidationRoot}/data`
  )
    throw new Error('Refusing a non-isolated profile or data directory.');
  const { AddonManager } = ChromeUtils.importESModule(
    'resource://gre/modules/AddonManager.sys.mjs',
  );
  const addon = await AddonManager.getAddonByID('margincarry@0then0.github.io');
  const digest = await Zotero.getMainWindow().crypto.subtle.digest(
    'SHA-256',
    await IOUtils.read(`${profile}/extensions/margincarry@0then0.github.io.xpi`),
  );
  const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (
    hash !== '2c0e849b219f34406b6a6987c2292e0ecf3704db15651b4f33a361c9472124a7' ||
    !addon?.isActive
  )
    throw new Error('This validation requires the active published v0.1.0 XPI.');
  const scope = {
    Zotero,
    Services,
    IOUtils,
    PathUtils,
    Cu,
    Cc,
    Ci,
    crypto: Zotero.getMainWindow().crypto,
    Intl,
  };
  Services.scriptloader.loadSubScriptWithOptions(addon.getResourceURI('margincarry.js').spec, {
    target: scope,
    ignoreCache: true,
  });
  const api = scope.MarginCarry;
  const header = {
    date: new Date().toISOString(),
    version: Zotero.version,
    os: Services.appinfo.OS,
    architecture: Services.appinfo.XPCOMABI,
    addonVersion: addon.version,
    installedSHA256: hash,
    profile,
    dataDirectory: Zotero.DataDirectory.dir,
    action: hostValidationAction,
  };
  if (hostValidationAction === 'environment') return { ...header, reportRoot: out };
  const ids = await IOUtils.readJSON(`${hostValidationRoot}/native-ids.json`);
  const cases = (await IOUtils.readJSON(`${out}/cases.json`)).cases;
  const save = async (name, value) => {
    await IOUtils.writeJSON(`${out}/${name}.json`, { ...header, ...value });
    return value;
  };
  const snapshotPair = async (pair) => ({
    source: await api.adapter.snapshot(ids.pairs[pair].old),
    target: await api.adapter.snapshot(ids.pairs[pair].new),
  });
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const matches = (p, g) =>
    p &&
    g &&
    p.pageIndex === g.pageIndex &&
    p.rects.length === g.rects.length &&
    p.rects.every((r, i) => r.every((v, j) => Math.abs(v - g.rects[i][j]) <= 2));
  const analyze = async (pair) =>
    api.analyze(
      api.adapter,
      ids.pairs[pair].old,
      ids.pairs[pair].new,
      api.adapter.controller().signal,
      () => {},
    );
  if (hostValidationAction === 'geometry') {
    const corpus = await IOUtils.readJSON(`${hostRoot}/validation/corpus.json`);
    const results = await IOUtils.readJSON(`${out}/corpus-results.json`);
    const gold = corpus.annotations.find((a) => a.id === 'lora-15');
    const proposal = results.results.find((a) => a.id === gold.id);
    const view = await api.adapter.view(ids.pairs.lora.new);
    const doc = view._iframeWindow.PDFViewerApplication.pdfDocument;
    const rows = [];
    await IOUtils.makeDirectory(`${out}/geometry-images`, { ignoreExisting: true });
    for (const id of ['0:1691:1695', '5:4305:4309', '5:4332:4336', '7:2107:2111']) {
      const candidate = proposal.candidates.find((c) => c.id === id);
      const pageIndex = candidate.pageIndex;
      await view._ensureBasicPageData(pageIndex);
      const data = view._pdfPages[pageIndex];
      let text = '';
      const mapping = [];
      for (const [i, char] of data.chars.entries()) {
        text += char.u;
        for (let k = 0; k < char.u.length; k++) mapping.push(i);
        if (char.spaceAfter || char.lineBreakAfter || char.paragraphBreakAfter) {
          text += ' ';
          mapping.push(i);
        }
      }
      const offsets = [];
      for (let i = text.indexOf('LoRA'); i !== -1; i = text.indexOf('LoRA', i + 4)) offsets.push(i);
      // Invoke the installed reader's pure range-rectangle method, without calling MarginCarry geometry.
      const nativePositions = JSON.parse(
        JSON.stringify(
          view._findController.getMatchPositions.call(
            Cu.cloneInto(
              {
                _pageMatches: { [pageIndex]: offsets },
                _pageMatchesLength: { [pageIndex]: offsets.map(() => 4) },
              },
              view._findController,
            ),
            pageIndex,
            data,
          ),
        ),
      );
      const distance = (a, b) => a.rects[0].reduce((n, v, i) => n + Math.abs(v - b.rects[0][i]), 0);
      const expected = gold.targets
        .filter((g) => g.pageIndex === pageIndex)
        .sort((a, b) => distance(a, candidate.position) - distance(b, candidate.position))[0];
      const nativeIndex = nativePositions
        .map((p, i) => ({ p, i }))
        .sort((a, b) => distance(a.p, expected) - distance(b.p, expected))[0].i;
      const native = JSON.parse(JSON.stringify(nativePositions[nativeIndex]));
      const offset = offsets[nativeIndex];
      const glyphs = JSON.parse(
        JSON.stringify(data.chars.slice(mapping[offset], mapping[offset + 3] + 1)),
      );
      const images = [];
      const page = Cu.waiveXrays(await doc.getPage(pageIndex + 1));
      const viewport = page.getViewport(Cu.cloneInto({ scale: 3 }, view._iframeWindow));
      const cropPDF = [
        Math.min(expected.rects[0][0], native.rects[0][0]) - 35,
        Math.min(expected.rects[0][1], native.rects[0][1]) - 18,
        Math.max(expected.rects[0][2], native.rects[0][2]) + 35,
        Math.max(expected.rects[0][3], native.rects[0][3]) + 18,
      ];
      const cr = viewport.convertToViewportRectangle(Cu.cloneInto(cropPDF, view._iframeWindow));
      for (const [model, position] of [
        ['reader', native],
        ['margincarry', candidate.position],
        ['pdfplumber', expected],
      ]) {
        for (const type of ['highlight', 'underline']) {
          const canvas = view._iframeWindow.document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const renderOptions = Cu.cloneInto(
            { canvasContext: canvas.getContext('2d', { alpha: false }), intent: 'print' },
            view._iframeWindow,
            { wrapReflectors: true },
          );
          renderOptions.viewport = viewport;
          await api.adapter.ready(page.render(renderOptions).promise);
          // Native reader export renderer; no annotation item is created and no live view is altered.
          await view.renderPageAnnotationsOnCanvas.call(
            Cu.cloneInto(
              {
                _annotations: [
                  { type, color: type === 'underline' ? '#2ea8e5' : '#ffd400', position },
                ],
                _pdfPages: { [pageIndex]: JSON.parse(JSON.stringify(data)) },
                _ensureBasicPageData: () => {},
              },
              view,
              { cloneFunctions: true },
            ),
            canvas,
            viewport,
            pageIndex,
          );
          const crop = view._iframeWindow.document.createElement('canvas');
          crop.width = Math.ceil(Math.abs(cr[2] - cr[0]));
          crop.height = Math.ceil(Math.abs(cr[3] - cr[1]));
          crop
            .getContext('2d')
            .drawImage(
              canvas,
              Math.min(cr[0], cr[2]),
              Math.min(cr[1], cr[3]),
              crop.width,
              crop.height,
              0,
              0,
              crop.width,
              crop.height,
            );
          const name = `${id.replaceAll(':', '-')}-${model}-${type}.png`;
          const bytes = Uint8Array.from(atob(crop.toDataURL('image/png').split(',')[1]), (v) =>
            v.charCodeAt(0),
          );
          await IOUtils.write(`${out}/geometry-images/${name}`, bytes);
          images.push(name);
          canvas.width = 0;
          crop.width = 0;
        }
      }
      rows.push({
        id,
        expected,
        margincarry: candidate.position,
        reader: native,
        nativeText: glyphs.map((c) => c.u).join(''),
        glyphs,
        nativeMatchesOnPage: offsets.length,
        cornerDeltaFromGold: candidate.position.rects[0].map((v, i) => v - expected.rects[0][i]),
        cornerDeltaFromReader: candidate.position.rects[0].map((v, i) => v - native.rects[0][i]),
        images,
      });
    }
    return save('geometry', {
      method:
        'Installed Zotero reader getMatchPositions (pure native range geometry) and renderPageAnnotationsOnCanvas (native print renderer); supplementary API measurement, not a mouse selection or desktop overlay capture.',
      rows,
    });
  }
  if (hostValidationAction === 'ui-before') {
    return save('ui-before', { attention: await snapshotPair('attention') });
  }
  if (hostValidationAction.startsWith('ui-')) {
    const before = await IOUtils.readJSON(`${out}/ui-before.json`);
    const after = await snapshotPair('attention');
    const journal = await api.service.journal();
    const prior =
      hostValidationAction === 'ui-after' ? null : await IOUtils.readJSON(`${out}/ui-after.json`);
    const record = prior
      ? journal.find((r) => r.id === prior.record.id)
      : journal
          .filter((r) => r.sourceID === ids.pairs.attention.old && r.created.length === 2)
          .at(-1);
    if (!record) throw new Error('Expected the separate two-copy UI operation.');
    const repeatUnchanged = prior
      ? same(prior.after.target, after.target) && same(prior.journal, journal)
      : null;
    if (hostValidationAction === 'ui-repeat' && !repeatUnchanged)
      throw new Error('UI repeat changed target annotations or transfer journal.');
    return save(hostValidationAction, {
      record,
      journal,
      after,
      repeatUnchanged,
      sourceUnchanged: same(before.attention.source, after.source),
      pdfHashesUnchanged:
        before.attention.source.file.hash === after.source.file.hash &&
        before.attention.target.file.hash === after.target.file.hash,
      existingTargetsUnchanged: before.attention.target.annotations.every((a) =>
        after.target.annotations.some((b) => a.key === b.key && a.fingerprint === b.fingerprint),
      ),
      copies: await Promise.all(
        record.created.map(async (c) => ({
          key: c.key,
          deleted: Zotero.Items.getByLibraryAndKey(record.libraryID, c.key).deleted,
          fingerprintMatches:
            (await api.adapter.fingerprint(record.libraryID, c.key)) === c.fingerprint,
        })),
      ),
      persistedUnchanged: prior
        ? record.created.every((c) =>
            prior.record.created.some((p) => p.key === c.key && p.fingerprint === c.fingerprint),
          )
        : null,
    });
  }
  if (hostValidationAction === 'capture') {
    const snapshots = {},
      rows = [];
    for (const pair of ['lora', 'attention']) snapshots[pair] = await snapshotPair(pair);
    for (const c of cases) {
      const source = snapshots[c.pair].source.annotations.find(
        (a) => a.text === c.quote && a.type === c.type && matches(a.position, c.expectedSource),
      );
      rows.push({
        id: c.id,
        pair: c.pair,
        creationMethod:
          'See separately recorded UI observations; snapshots cannot prove creation method',
        source: source || null,
      });
    }
    const selected = new Set(rows.map((r) => r.source?.key));
    const extraSources = Object.values(snapshots)
      .flatMap((s) => s.source.annotations)
      .filter((a) => !selected.has(a.key));
    return save('sources', {
      rows,
      extraSources,
      snapshots,
      uiCreationVerifiedBySnapshot: false,
    });
  }
  if (hostValidationAction === 'decorate') {
    const captured = await IOUtils.readJSON(`${out}/sources.json`);
    for (const row of captured.rows.filter((r) => r.source)) {
      const item = Zotero.Items.getByLibraryAndKey(
        captured.snapshots[row.pair].source.libraryID,
        row.source.key,
      );
      item.annotationComment = `Native UI case ${row.id}: комментарий`;
      item.annotationColor = item.annotationType === 'underline' ? '#2ea8e5' : '#ffd400';
      item.setTags([{ tag: 'native-reader' }, { tag: row.id }, { tag: 'текстовый тег' }]);
      await item.saveTx();
    }
    return save('metadata', {
      method:
        'Native API edits only comment/color/tags on existing UI-created source annotations; positions and text untouched',
    });
  }
  const captured = await IOUtils.readJSON(`${out}/sources.json`);
  if (hostValidationAction === 'analyze') {
    const plans = {},
      rows = [],
      previews = [];
    for (const pair of ['lora', 'attention']) {
      plans[pair] = await analyze(pair);
      for (const c of cases.filter((c) => c.pair === pair)) {
        const source = captured.rows.find((r) => r.id === c.id)?.source;
        const p = plans[c.pair].proposals.find((p) => p.source.key === source?.key);
        const chosen = p?.candidates.find((v) =>
          matches(v.position, c.expectedCorrespondingTarget),
        );
        rows.push({
          id: c.id,
          status: p?.status || 'source not created',
          sourceKey: source?.key,
          reason: p?.reason,
          recommendedID: p?.recommendedID,
          candidates: p?.candidates || [],
          correspondingCandidateID: chosen?.id || null,
          expected: c.expectedCorrespondingTarget ? 'locations' : 'not found',
        });
        if (chosen) {
          for (const [side, id, position] of [
            ['source', plans[c.pair].source.id, p.source.position],
            ['target', plans[c.pair].target.id, chosen.position],
          ]) {
            const url = await api.adapter.preview(id, position, p.source.color, p.source.type);
            const bytes = Uint8Array.from(atob(url.split(',')[1]), (v) => v.charCodeAt(0));
            await IOUtils.write(`${hostValidationRoot}/${c.id}-${side}.png`, bytes);
            previews.push({ id: c.id, side, bytes: bytes.length });
          }
          await api.adapter.navigate(plans[c.pair].target.id, chosen.position);
        }
      }
    }
    await IOUtils.writeJSON(`${hostValidationRoot}/native-plans.json`, plans);
    return save('analysis', {
      rows,
      previews,
      extraProposals: Object.values(plans)
        .flatMap((p) => p.proposals)
        .filter((p) => !captured.rows.some((r) => r.source?.key === p.source.key)),
    });
  }
  if (hostValidationAction === 'apply') {
    const analysis = await IOUtils.readJSON(`${out}/analysis.json`),
      pairs = {};
    for (const pair of ['lora', 'attention']) {
      const plan = await analyze(pair),
        before = await snapshotPair(pair);
      const selections = analysis.rows
        .filter(
          (r) => cases.find((c) => c.id === r.id)?.pair === pair && r.correspondingCandidateID,
        )
        .map((r) => ({ sourceKey: r.sourceKey, candidateID: r.correspondingCandidateID }));
      const record = await api.service.apply(plan, selections),
        after = await snapshotPair(pair);
      const copyPropertiesCorrect = record.created.every((r) => {
        const a = after.target.annotations.find((a) => a.key === r.key),
          source = before.source.annotations.find((s) => s.key === r.sourceKey),
          selected = selections.find((s) => s.sourceKey === r.sourceKey),
          candidate = plan.proposals
            .find((p) => p.source.key === r.sourceKey)
            ?.candidates.find((c) => c.id === selected?.candidateID);
        return (
          a &&
          source &&
          candidate &&
          a.type === source.type &&
          a.text === candidate.text.replace(/\s+/gu, ' ').trim() &&
          a.comment === source.comment &&
          a.color === source.color &&
          same(a.tags, [...source.tags].sort()) &&
          same(a.position, candidate.position) &&
          a.key !== source.key
        );
      });
      pairs[pair] = {
        operationID: record.id,
        selections,
        record,
        before,
        after,
        sourceUnchanged: same(before.source, after.source),
        pdfHashesUnchanged:
          before.source.file.hash === after.source.file.hash &&
          before.target.file.hash === after.target.file.hash,
        existingTargetsUnchanged: before.target.annotations.every((a) =>
          after.target.annotations.some((b) => a.key === b.key && a.fingerprint === b.fingerprint),
        ),
        copyPropertiesCorrect,
      };
      await api.adapter.navigate(record.targetID, record.copies[0].position, record.created[0].key);
    }
    return save('apply', {
      method:
        'Native API apply of independently chosen corresponding candidates; does not prove UI Apply confirmation',
      pairs,
    });
  }
  const applied = await IOUtils.readJSON(`${out}/apply.json`);
  if (hostValidationAction === 'restart') {
    const pairs = {};
    for (const [pair, prior] of Object.entries(applied.pairs)) {
      const journal = await api.service.journal(),
        record = journal.find((r) => r.id === prior.operationID);
      const fingerprints = await Promise.all(
        record.created.map((c) => api.adapter.fingerprint(record.libraryID, c.key)),
      );
      const fresh = await analyze(pair);
      const targetBefore = await api.adapter.snapshot(record.targetID);
      const journalBefore = await api.service.journal();
      let repeat = '';
      try {
        await api.service.apply(fresh, prior.selections);
      } catch (e) {
        repeat = String(e);
      }
      const repeatUnchanged =
        same(targetBefore, await api.adapter.snapshot(record.targetID)) &&
        same(journalBefore, await api.service.journal());
      const duplicateError =
        /^Error: Source annotation \S+ was already transferred\. Undo that operation before copying it again\.$/.test(
          repeat,
        );
      if (!duplicateError || !repeatUnchanged)
        throw new Error(`Repeat validation failed: ${repeat || 'no duplicate error'}`);
      pairs[pair] = {
        repeatUnchanged,
        duplicateError,
        persistedUnchanged: record.created.every((c, i) => c.fingerprint === fingerprints[i]),
        sourceUnchanged: same(prior.before.source, await api.adapter.snapshot(record.sourceID)),
        journalStatus: record.status,
        repeatBlockedAfterNewAnalysis: repeat,
      };
    }
    return save('restart', { pairs });
  }
  if (hostValidationAction === 'undo') {
    const pairs = {},
      record = applied.pairs.attention.record;
    const item = Zotero.Items.getByLibraryAndKey(record.libraryID, record.created[0].key);
    const comment = item.annotationComment,
      dateModified = item.dateModified;
    item.annotationComment += ' Edited copy: Undo must reject';
    await item.saveTx();
    const editedFingerprints = await Promise.all(
      record.created.map((c) => api.adapter.fingerprint(record.libraryID, c.key)),
    );
    let conflict = '';
    try {
      await api.service.undoLast();
    } catch (e) {
      conflict = String(e);
    }
    const noneDeletedOnConflict = record.created.every(
      (c) => !Zotero.Items.getByLibraryAndKey(record.libraryID, c.key).deleted,
    );
    const noPartialMutation = same(
      editedFingerprints,
      await Promise.all(
        record.created.map((c) => api.adapter.fingerprint(record.libraryID, c.key)),
      ),
    );
    // Fixture-only restoration, never performed by MarginCarry.
    item.annotationComment = comment;
    item.dateModified = dateModified;
    await item.saveTx({ skipDateModifiedUpdate: true });
    if (
      (await api.adapter.fingerprint(record.libraryID, item.key)) !== record.created[0].fingerprint
    )
      throw new Error('Fixture restoration failed');
    for (const pair of ['attention', 'lora']) {
      const r = applied.pairs[pair].record,
        before = await snapshotPair(pair),
        undone = await api.service.undoLast(),
        after = await snapshotPair(pair);
      pairs[pair] = {
        ...undone,
        onlyOperationCopiesTrashed: r.created.every(
          (c) => Zotero.Items.getByLibraryAndKey(r.libraryID, c.key).deleted,
        ),
        sourceUnchanged: same(before.source, after.source),
        pdfHashesUnchanged:
          before.source.file.hash === after.source.file.hash &&
          before.target.file.hash === after.target.file.hash,
        existingTargetsUnchanged: before.target.annotations
          .filter((a) => !r.created.some((c) => c.key === a.key))
          .every((a) =>
            after.target.annotations.some(
              (b) => a.key === b.key && a.fingerprint === b.fingerprint,
            ),
          ),
      };
    }
    return save('undo', {
      conflict,
      noneDeletedOnConflict,
      noPartialMutation,
      restoredDisposableCopyOnly: true,
      pairs,
    });
  }
  throw new Error('Use capture, decorate, analyze, apply, restart, or undo.');
}
