// Native check of selections that cross a page break. Isolated profile only.
// Run `python3 scripts/make-cross-page-fixture.py`, install.js and load.js first, then pass one
// action as the second argument of host-request.mjs:
//   seed                      import the four fixture revisions under one item
//   reader:<revision>         open a revision and return window-local points to drag over the quote
//   decorate                  give every source annotation a comment and two tags (metadata only)
//   analyze:<source>:<target> run the real dialog up to the displayed proposal and leave it open
//   apply:<source>:<target>   accept and apply in that dialog, then check the created annotation
//   reopen:<target>           close and reopen the target and check what the reader loaded
//   note:<source>:<target>    make a note from the source annotation, copy it through the real
//                             dialog and follow the copied link
//   undo                      undo through the real dialog and check that only the copy is gone
// Source annotations are created by hand in the reader; this script never writes one.
// Each action appends its result to cross-page.json in the report root.
export async function run() {
  const MC = Zotero.MarginCarryTest;
  const [action, first, second] = hostValidationAction.split(':');
  const fixtures = `${hostRoot}/.local/cross-page-fixture`;
  const idsPath = `${hostValidationRoot}/cross-page-ids.json`;
  const reportPath = `${hostValidationReportRoot}/cross-page.json`;
  const names = ['single', 'split-a', 'split-b', 'footer'];
  const sleep = (ms) => Zotero.Promise.delay(ms);
  const until = async (done, what) => {
    for (let i = 0; i < 300; i++) {
      if (await done()) return;
      await sleep(100);
    }
    throw new Error(`Timed out waiting for ${what}`);
  };
  const dialog = (name) => {
    for (const win of Services.wm.getEnumerator(null))
      if (win.location.href.endsWith(`margincarry/content/${name}.xhtml`)) return win;
    return null;
  };
  const save = async (result) => {
    const report = (await IOUtils.exists(reportPath)) ? await IOUtils.readJSON(reportPath) : [];
    report.push({ action: hostValidationAction, zotero: Zotero.version, result });
    await IOUtils.writeJSON(reportPath, report);
    return result;
  };
  if (action === 'seed') {
    if (await IOUtils.exists(idsPath)) throw new Error('The fixture is already seeded.');
    const parent = new Zotero.Item('journalArticle');
    parent.setField('title', 'MarginCarry cross-page fixture');
    await parent.saveTx();
    const ids = { parentID: parent.id };
    for (const name of names)
      ids[name] = (
        await Zotero.Attachments.importFromFile({
          file: `${fixtures}/${name}.pdf`,
          parentItemID: parent.id,
        })
      ).id;
    await IOUtils.writeJSON(idsPath, ids);
    return save(ids);
  }

  const ids = await IOUtils.readJSON(idsPath);
  const gold = await IOUtils.readJSON(`${fixtures}/expected.json`);
  const annotations = (name) =>
    Zotero.Items.get(ids[name])
      .getAnnotations()
      .map((a) => ({
        key: a.key,
        type: a.annotationType,
        text: a.annotationText,
        comment: a.annotationComment,
        color: a.annotationColor,
        pageLabel: a.annotationPageLabel,
        position: JSON.parse(a.annotationPosition),
        tags: a
          .getTags()
          .map((t) => t.tag)
          .sort(),
      }));
  const snapshot = () => Object.fromEntries(names.map((name) => [name, annotations(name)]));
  // Independent gold: a rectangle spans the expected columns and contains the line's baseline.
  const matches = (rects, lines) =>
    (rects ?? []).length === lines.length &&
    lines.every(([x0, baseline, x1], i) => {
      const r = rects[i];
      return (
        Math.abs(r[0] - x0) < 0.05 &&
        Math.abs(r[2] - x1) < 0.05 &&
        r[1] < baseline &&
        r[1] > baseline - 4 &&
        r[3] > baseline + 6 &&
        r[3] < baseline + 12
      );
    });
  const geometry = (name, position) => {
    const expected = gold.revisions[name];
    return (
      position.pageIndex === expected.pageIndex &&
      matches(position.rects, expected.lines) &&
      matches(position.nextPageRects, expected.nextPageLines)
    );
  };
  const openReader = async (name) => {
    const reader = await Zotero.Reader.open(ids[name]);
    await reader._initPromise;
    const view = reader._internalReader._primaryView;
    await view.initializedPromise;
    return { reader, view };
  };

  if (action === 'reader') {
    const expected = gold.revisions[first];
    const win = Zotero.getMainWindow();
    win.resizeTo(1300, 950);
    const { view } = await openReader(first);
    const iw = view._iframeWindow,
      app = iw.PDFViewerApplication;
    app.pdfViewer.currentScaleValue = '0.6';
    await sleep(1500);
    const point = (pageIndex, x, y) => {
      const pv = app.pdfViewer.getPageView(pageIndex);
      const [vx, vy] = pv.viewport.convertToViewportPoint(x, y);
      const r = pv.div.getBoundingClientRect();
      const style = iw.getComputedStyle(pv.div);
      return [
        r.left + parseFloat(style.borderLeftWidth) + vx,
        r.top + parseFloat(style.borderTopWidth) + vy,
      ];
    };
    const start = expected.lines[0];
    const crossing = expected.nextPageLines.length > 0;
    const end = (crossing ? expected.nextPageLines : expected.lines).at(-1);
    const [, top] = point(expected.pageIndex, start[0], start[1] + 4);
    iw.document.getElementById('viewerContainer').scrollTop += top - 60;
    await sleep(800);
    const local = ([x, y]) => [
      Math.round(x + iw.mozInnerScreenX - win.screenX),
      Math.round(y + iw.mozInnerScreenY - win.screenY),
    ];
    return {
      from: local(point(expected.pageIndex, start[0] + 1, start[1] + 3)),
      to: local(point(expected.pageIndex + (crossing ? 1 : 0), end[2] - 1, end[1] + 3)),
    };
  }
  if (action === 'decorate') {
    for (const name of names)
      for (const item of Zotero.Items.get(ids[name]).getAnnotations()) {
        if (item.annotationComment) continue;
        item.annotationComment = `Carried comment for ${name}`;
        item.setTags([{ tag: 'cross-page' }, { tag: 'review' }]);
        await item.saveTx();
      }
    return save(snapshot());
  }
  if (action === 'analyze') {
    dialog('transfer')?.close();
    await until(() => !dialog('transfer'), 'previous dialog to close');
    await MC.open([ids[first], ids[second]]);
    await until(
      () => dialog('transfer')?.document.getElementById('language-options')?.children.length === 7,
      'dialog',
    );
    const win = dialog('transfer');
    win.confirm = () => true;
    const $ = (id) => win.document.getElementById(id);
    await until(() => $('old').options.length >= 2, 'attachments');
    $('old').value = String(ids[first]);
    $('new').value = String(ids[second]);
    $('analyze').click();
    await until(() => !$('accept-unique').disabled && $('list').children.length > 0, 'analysis');
    const images = [
      'source-preview',
      'source-next-preview',
      'target-preview',
      'target-next-preview',
    ];
    await until(
      () =>
        images.every(
          (id) => $(id).naturalWidth > 0 || $(`${id}-status`).textContent !== 'Loading PDF…',
        ),
      'previews',
    );
    win.focus();
    return save({
      rows: [...$('list').children].map((row) => row.children[1].textContent),
      outcome: $('outcome').textContent,
      sourcePage: $('source-page').textContent,
      targetPage: $('target-page').textContent,
      candidates: [...$('candidates').options].map((o) => o.textContent),
      geometry: $('geometry').textContent,
      previews: Object.fromEntries(
        images.map((id) => [
          id,
          {
            hidden: !!$(id).closest('[hidden]'),
            width: $(id).naturalWidth,
            status: $(`${id}-status`).textContent,
          },
        ]),
      ),
      openNext: {
        source: !$('open-source-next').hidden,
        target: !$('open-target-next').hidden,
      },
      acceptEnabled: !$('accept').disabled,
      selected: $('selected-count').textContent,
    });
  }
  if (action === 'apply') {
    const win = dialog('transfer');
    if (!win) throw new Error('Run analyze first.');
    const $ = (id) => win.document.getElementById(id);
    const before = snapshot();
    $('accept').click();
    $('apply').click();
    await until(() => $('apply-result').textContent !== '', 'apply');
    const after = snapshot();
    const source = before[first][0];
    const created = after[second].filter((a) => !before[second].some((b) => b.key === a.key));
    const copy = created[0];
    const result = {
      status: $('status').textContent,
      created: created.length,
      copy,
      geometryMatchesGold: !!copy && geometry(second, copy.position),
      textIsQuote: copy?.text === gold.quote,
      keepsTypeCommentColorTags:
        !!copy &&
        ['type', 'comment', 'color'].every((field) => copy[field] === source[field]) &&
        JSON.stringify(copy.tags) === JSON.stringify(source.tags),
      newKey: !!copy && copy.key !== source.key,
      othersUnchanged: names
        .filter((name) => name !== second)
        .every((name) => JSON.stringify(before[name]) === JSON.stringify(after[name])),
    };
    // A recalculated plan must refuse to copy the same source again.
    $('analyze').click();
    await until(() => !$('accept-unique').disabled && $('list').children.length > 0, 'reanalysis');
    $('accept-unique').click();
    $('apply').click();
    await until(() => /already transferred/.test($('status').textContent), 'repeat refusal');
    result.repeatRefused = annotations(second).length === after[second].length;
    win.close();
    return save(result);
  }
  if (action === 'reopen') {
    for (const reader of [...Zotero.Reader._readers])
      if (reader.itemID === ids[first]) await reader.close();
    await sleep(1000);
    const { view } = await openReader(first);
    const stored = annotations(first);
    await until(() => view._annotations.length === stored.length, 'reader annotations');
    return save({
      stored,
      reader: view._annotations.map((a) => ({
        id: a.id,
        type: a.type,
        text: a.text,
        comment: a.comment,
        color: a.color,
        position: a.position,
        geometryMatchesGold: geometry(first, a.position),
      })),
    });
  }
  if (action === 'note') {
    const source = Zotero.Items.get(ids[first]).getAnnotations()[0];
    const note = await Zotero.EditorInstance.createNoteFromAnnotations([source], {
      parentID: ids.parentID,
    });
    dialog('note-copy')?.close();
    await until(() => !dialog('note-copy'), 'previous dialog to close');
    const existing = new Set(Zotero.Items.get(ids.parentID).getNotes());
    await MC.openNoteCopy([note.id]);
    await until(() => dialog('note-copy')?.document.getElementById('operation'), 'dialog');
    const win = dialog('note-copy');
    const $ = (id) => win.document.getElementById(id);
    await until(() => !$('preview').disabled, 'transfers');
    const record = (await MC.service.journal())
      .filter(
        (r) => r.status === 'committed' && r.sourceID === ids[first] && r.targetID === ids[second],
      )
      .at(-1);
    $('operation').value = record.id;
    $('preview').click();
    await until(() => !$('save').disabled, 'preview');
    const rows = [...$('note-copy-links').children].map((li) => li.textContent);
    $('save').click();
    await until(() => !$('open-note-copy').hidden, 'save');
    win.close();
    const copyID = Zotero.Items.get(ids.parentID)
      .getNotes()
      .find((id) => !existing.has(id));
    const html = Zotero.Items.get(copyID).getNote();
    const data = JSON.parse(decodeURIComponent(html.match(/data-annotation="([^"]+)"/)[1]));
    const target = annotations(second).find((a) => a.key === record.created[0].key);
    // Follow the link as the note editor does for its openAnnotation message.
    for (const reader of [...Zotero.Reader._readers])
      if (reader.itemID === ids[second]) await reader.close();
    const linked = await Zotero.URI.getURIItem(data.attachmentURI);
    await Zotero.getActiveZoteroPane().viewPDF(linked.id, { position: data.position });
    let view;
    await until(() => {
      const reader = Zotero.Reader._readers.find((r) => r.itemID === ids[second]);
      view = reader?._internalReader?._primaryView;
      return view?._iframeWindow?.PDFViewerApplication?.pdfViewer?.pagesCount > 0;
    }, 'linked reader');
    await sleep(1500);
    return save({
      rows,
      originalNoteUnchanged: Zotero.Items.get(note.id).getNote().includes(source.key),
      link: data,
      linksTargetAttachment: linked.id === ids[second],
      linksCreatedAnnotation: data.annotationKey === target?.key,
      positionIsWholeAnnotation: JSON.stringify(data.position) === JSON.stringify(target?.position),
      pageLabel: data.pageLabel,
      openedPage: view._iframeWindow.PDFViewerApplication.pdfViewer.currentPageNumber,
      readerHasAnnotation: view._annotations.some((a) => a.id === data.annotationKey),
    });
  }
  if (action === 'undo') {
    const before = snapshot();
    const record = (await MC.service.journal()).filter((r) => r.status === 'committed').at(-1);
    dialog('transfer')?.close();
    await until(() => !dialog('transfer'), 'previous dialog to close');
    await MC.open([record.sourceID, record.targetID]);
    await until(
      () => dialog('transfer')?.document.getElementById('language-options')?.children.length === 7,
      'dialog',
    );
    const win = dialog('transfer');
    win.confirm = () => true;
    const $ = (id) => win.document.getElementById(id);
    await until(() => /Choose the transfer direction/.test($('status').textContent), 'ready');
    $('undo').click();
    await until(() => /Transfer undone/.test($('status').textContent), 'undo');
    const status = $('status').textContent;
    win.close();
    const after = snapshot();
    const removed = names.flatMap((name) =>
      before[name].filter((a) => !after[name].some((b) => b.key === a.key)).map((a) => a.key),
    );
    const item = Zotero.Items.getByLibraryAndKey(record.libraryID, record.created[0].key);
    return save({
      status,
      removed,
      onlyCreatedCopyRemoved:
        JSON.stringify(removed) === JSON.stringify(record.created.map((c) => c.key)),
      copyInTrash: !!item?.deleted,
      remaining: Object.fromEntries(names.map((name) => [name, after[name].length])),
      journal: (await MC.service.journal()).map((r) => r.status),
    });
  }
  throw new Error(`Unknown action: ${hostValidationAction}`);
}
