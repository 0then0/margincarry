// Screenshots the transfer dialog in every language and reports clipped text.
// Run scripts/host/install.js, load.js and seed-ui.js first, in the isolated profile only.
// Writes PNG files and metrics.json to <report root>/ui-languages/.
export async function run() {
  const MC = Zotero.MarginCarryTest;
  const ids = await IOUtils.readJSON(`${hostValidationRoot}/ui-fixture-ids.json`);
  const outDir = `${hostValidationReportRoot}/ui-languages`;
  await IOUtils.makeDirectory(outDir, { ignoreExisting: true });
  const locales = ['en', 'ru', 'es', 'de', 'fr', 'ja', 'pt-BR'];
  const widths = [1180, 900];
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
  await MC.open([ids.old, ids.new]);
  await until(
    () => find()?.document.getElementById('language-options')?.children.length === 7,
    'dialog',
  );
  const win = find();
  const doc = win.document;
  const $ = (id) => doc.getElementById(id);
  await until(() => $('old').options.length >= 2, 'attachment list');
  $('old').value = String(ids.old);
  $('new').value = String(ids.new);
  $('analyze').click();
  await until(() => !$('accept-unique').disabled && $('list').children.length === 8, 'analysis');
  // Previews are settled when the source image is shown and neither status text changes any more.
  let lastStatus = '';
  let stable = 0;
  const settled = () => {
    const now = `${$('source-preview-status').textContent}|${$('target-preview-status').textContent}`;
    stable = now === lastStatus ? stable + 1 : 0;
    lastStatus = now;
    return $('source-preview-status').textContent === '' && stable >= 4;
  };
  const metrics = (locale, state, width) => {
    const issues = [];
    const ruler = doc.createElementNS('http://www.w3.org/1999/xhtml', 'canvas').getContext('2d');
    for (const el of doc.querySelectorAll('select')) {
      if (!el.offsetParent) continue;
      // A select's own scroll width is not meaningful; measure its widest option instead.
      ruler.font = win.getComputedStyle(el).font;
      const widest = Math.max(
        0,
        ...[...el.options].map((o) => ruler.measureText(o.textContent).width),
      );
      if (widest > el.clientWidth - 40)
        issues.push({
          id: el.id,
          text: 'widest option',
          kind: 'select',
          scroll: Math.round(widest),
          client: el.clientWidth,
        });
    }
    for (const el of doc.querySelectorAll(
      'button, label, h1, h2, h3, p, small, legend, blockquote',
    )) {
      if (!el.offsetParent) continue;
      if (el.scrollWidth > el.clientWidth + 1)
        issues.push({
          id: el.id || el.tagName,
          text: el.textContent.trim().slice(0, 50),
          kind: 'horizontal',
          scroll: el.scrollWidth,
          client: el.clientWidth,
        });
    }
    // The annotation list intentionally clamps a long quote to two lines.
    const buttons = [...doc.querySelectorAll('button')]
      .filter((b) => b.offsetParent && !b.classList.contains('annotation-row'))
      .map((b) => ({
        id: b.id || b.className,
        lines: Math.round(
          b.clientHeight /
            parseFloat(
              win.getComputedStyle(b).lineHeight === 'normal'
                ? '17'
                : win.getComputedStyle(b).lineHeight,
            ),
        ),
      }))
      .filter((b) => b.lines > 2);
    return {
      locale,
      state,
      width,
      pageOverflow: doc.documentElement.scrollWidth > win.innerWidth + 1,
      issues,
      tallButtons: buttons,
      language: doc.documentElement.lang,
    };
  };
  const shot = async (name, height) => {
    const canvas = doc.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
    const w = win.innerWidth,
      h = height ?? Math.max(doc.documentElement.scrollHeight, win.innerHeight);
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawWindow(win, 0, 0, w, h, 'rgb(255,255,255)');
    const data = canvas.toDataURL('image/png').split(',')[1];
    await IOUtils.write(
      `${outDir}/${name}.png`,
      Uint8Array.from(atob(data), (c) => c.charCodeAt(0)),
    );
  };
  const select = async (quote) => {
    const row = [...$('list').children].find((r) => r.children[0].textContent.startsWith(quote));
    if (!row) throw new Error(`No annotation row for ${quote}`);
    row.click();
    await sleep(400);
    stable = 0;
    await until(settled, `previews of ${quote}`);
  };
  const report = [];
  for (const width of widths) {
    win.resizeTo(width, 1000);
    await sleep(500);
    for (const locale of locales) {
      $(`language-${locale}`).click();
      await until(() => doc.documentElement.lang === locale, 'language');
      await sleep(300);
      // Row 0 unique candidate: accept it once so the review list is populated.
      await select('the quick brown fox');
      if ($('selected-count').textContent.match(/\d+/)[0] === '0') $('accept').click();
      await sleep(200);
      report.push(metrics(locale, 'unique', width));
      await shot(`${locale}-${width}-unique`);
      await select('41.0');
      report.push(metrics(locale, 'doubtful', width));
      await shot(`${locale}-${width}-doubtful`);
      if (width === widths[0]) {
        await select('A repeated quote');
        report.push(metrics(locale, 'multiple', width));
        await shot(`${locale}-${width}-multiple`);
        await select('This sentence');
        report.push(metrics(locale, 'not-found', width));
        await shot(`${locale}-${width}-not-found`);
        await select('A longer passage');
        report.push(metrics(locale, 'long', width));
        await shot(`${locale}-${width}-header`, doc.querySelector('header').offsetHeight);
      }
    }
  }
  await IOUtils.writeJSON(`${outDir}/metrics.json`, report);
  win.close();
  return report.filter((r) => r.pageOverflow || r.issues.length || r.tallButtons.length);
}
