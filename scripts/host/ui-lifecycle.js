// Exercises the real dialog on the interface fixture: mass selection, a manually chosen doubtful
// candidate, apply, repeat protection, and Undo. Isolated profile only. Run install.js, load.js and
// seed-ui.js first. Writes ui-lifecycle.json to the report root and returns the same summary.
export async function run() {
  const MC = Zotero.MarginCarryTest;
  const ids = await IOUtils.readJSON(`${hostValidationRoot}/ui-fixture-ids.json`);
  const sleep = (ms) => Zotero.Promise.delay(ms);
  const until = async (done, what) => {
    for (let i = 0; i < 300; i++) {
      if (await done()) return;
      await sleep(100);
    }
    throw new Error(`Timed out waiting for ${what}`);
  };
  const find = () => {
    for (const win of Services.wm.getEnumerator(null))
      if (win.location.href.endsWith('margincarry/content/transfer.xhtml')) return win;
    return null;
  };
  find()?.close();
  await until(() => !find(), 'previous dialog to close');
  const snapshot = (item) => {
    const json = item.toJSON();
    return JSON.stringify({
      key: item.key,
      ...json,
      dateModified: undefined,
      dateAdded: undefined,
    });
  };
  const annotationsOf = (id) => Zotero.Items.get(id).getAnnotations();
  const sources = annotationsOf(ids.old);
  const sourcesBefore = sources.map(snapshot);
  const targetBefore = annotationsOf(ids.new).length;
  const oldFileHash = await Zotero.Utilities.Internal.md5Async(
    Zotero.Items.get(ids.old).getFilePath(),
  );
  const newFileHash = await Zotero.Utilities.Internal.md5Async(
    Zotero.Items.get(ids.new).getFilePath(),
  );

  const open = async () => {
    await MC.open([ids.old, ids.new]);
    await until(
      () => find()?.document.getElementById('language-options')?.children.length === 7,
      'dialog',
    );
    const win = find();
    win.confirm = () => true;
    const $ = (id) => win.document.getElementById(id);
    await until(() => $('old').options.length >= 2, 'attachments');
    $('old').value = String(ids.old);
    $('new').value = String(ids.new);
    $('analyze').click();
    await until(() => !$('accept-unique').disabled && $('list').children.length === 8, 'analysis');
    return { win, $ };
  };
  const row = ($, quote) =>
    [...$('list').children].find((r) => r.children[0].textContent.startsWith(quote));
  const report = {};

  let { win, $ } = await open();
  $('accept-unique').click();
  report.massSelected = Number($('selected-count').textContent.match(/\d+/)[0]);
  report.massSelectedStatuses = [...$('list').children]
    .filter((r) => r.children[1].textContent.startsWith('Selected'))
    .map((r) => r.children[0].textContent);
  row($, '41.0').click();
  await sleep(500);
  report.doubtfulPreselected = $('candidates').value !== '';
  report.doubtfulAcceptEnabledBeforeChoice = !$('accept').disabled;
  $('candidates').value = $('candidates').options[1].value;
  $('candidates').onchange();
  await until(() => !$('accept').disabled, 'doubtful accept');
  $('accept').click();
  report.selectedAfterManual = Number($('selected-count').textContent.match(/\d+/)[0]);
  $('apply').click();
  await until(() => $('apply-result').textContent !== '', 'apply');
  const copies = annotationsOf(ids.new);
  report.copiesCreated = copies.length - targetBefore;
  report.copies = copies.map((c) => ({
    type: c.annotationType,
    text: c.annotationText,
    comment: c.annotationComment,
    color: c.annotationColor,
    tags: c.getTags().map((t) => t.tag),
  }));
  report.sourcesUnchangedAfterApply =
    JSON.stringify(annotationsOf(ids.old).map(snapshot)) === JSON.stringify(sourcesBefore);

  win.close();
  await until(() => !find(), 'dialog close');
  ({ win, $ } = await open());
  $('accept-unique').click();
  $('apply').click();
  await until(() => /already transferred/.test($('status').textContent), 'repeat refusal');
  report.repeatRefusal = $('status').textContent;
  report.copiesAfterRepeat = annotationsOf(ids.new).length - targetBefore;

  $('undo').click();
  await until(() => /Transfer undone/.test($('status').textContent), 'undo');
  report.undoStatus = $('status').textContent;
  report.copiesAfterUndo = annotationsOf(ids.new).length - targetBefore;
  report.sourcesUnchangedAfterUndo =
    JSON.stringify(annotationsOf(ids.old).map(snapshot)) === JSON.stringify(sourcesBefore);
  report.pdfsUnchanged =
    oldFileHash ===
      (await Zotero.Utilities.Internal.md5Async(Zotero.Items.get(ids.old).getFilePath())) &&
    newFileHash ===
      (await Zotero.Utilities.Internal.md5Async(Zotero.Items.get(ids.new).getFilePath()));
  const journal = await IOUtils.readJSON(`${Zotero.DataDirectory.dir}/margincarry/transfers.json`);
  report.journalStatuses = (journal.records ?? journal).map((r) => r.status);
  win.close();
  report.zotero = Zotero.version;
  await IOUtils.writeJSON(`${hostValidationReportRoot}/ui-lifecycle.json`, report);
  return report;
}
