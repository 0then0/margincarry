// Runs the matcher on real PDFs written in each supported language (see
// scripts/make-language-fixtures.py) and compares every outcome with the expected one.
// Source annotations are created from the plugin's own glyph rectangles for the old PDF, as a
// reader selection would be. Isolated profile only. Run install.js and load.js first.
// Writes languages.json to the report root and returns the mismatches with a summary.
export async function run() {
  const MC = Zotero.MarginCarryTest;
  const root = `${hostRoot}/.local/language-fixtures`;
  const languages = ['ru', 'es', 'de', 'fr', 'ja', 'pt-BR'];
  const AC = Zotero.getMainWindow().AbortController;
  const expectedStatus = {
    unique: 'unique candidate',
    doubtful: 'doubtful candidate',
    multiple: 'multiple candidates',
    'not found': 'not found',
  };
  // Finds a quote in raw page text the way a person's selection would cover it: the raw text may
  // be decomposed or wrapped, so compare NFC graphemes with folded whitespace and map back.
  const locate = (raw, quote) => {
    let text = '';
    const starts = [];
    const ends = [];
    for (const part of new Intl.Segmenter('und', { granularity: 'grapheme' }).segment(raw)) {
      const end = part.index + part.segment.length;
      const piece = /^\s+$/u.test(part.segment) ? ' ' : part.segment.normalize('NFC');
      if (piece === ' ' && text.endsWith(' ')) {
        ends[ends.length - 1] = end;
        continue;
      }
      for (const unit of piece) {
        text += unit;
        for (let i = 0; i < unit.length; i++) {
          starts.push(part.index);
          ends.push(end);
        }
      }
    }
    const wanted = quote.normalize('NFC').replace(/\s+/g, ' ');
    const at = text.indexOf(wanted);
    return at < 0 ? null : { start: starts[at], end: ends[at + wanted.length - 1] };
  };
  const report = [];
  for (const lang of languages) {
    const cases = await IOUtils.readJSON(`${root}/${lang}/cases.json`);
    const parent = new Zotero.Item('journalArticle');
    parent.setField('title', `MarginCarry language check: ${lang}`);
    await parent.saveTx();
    const old = await Zotero.Attachments.importFromFile({
      file: `${root}/${lang}/old.pdf`,
      parentItemID: parent.id,
    });
    const target = await Zotero.Attachments.importFromFile({
      file: `${root}/${lang}/new.pdf`,
      parentItemID: parent.id,
    });
    const oldPages = await MC.adapter.pages(old.id, new AC().signal, () => {});
    const newPages = await MC.adapter.pages(target.id, new AC().signal, () => {});
    const sample = (pages) => MC.pageText(pages[0]).text.slice(0, 80);
    const keys = [];
    for (const c of cases) {
      let located = null;
      for (const page of oldPages) {
        const hit = locate(MC.pageText(page).text, c.quote);
        if (hit) {
          located = { page, ...hit };
          break;
        }
      }
      if (!located) throw new Error(`${lang}: quote not found in the old PDF: ${c.quote}`);
      const key = Zotero.DataObjectUtilities.generateKey();
      keys.push(key);
      await Zotero.Annotations.saveFromJSON(old, {
        key,
        type: 'highlight',
        text: c.quote,
        comment: '',
        color: '#ffd400',
        pageLabel: located.page.label,
        sortIndex: `${String(located.page.index).padStart(5, '0')}|${String(located.start).padStart(6, '0')}|00000`,
        position: MC.rangePosition(located.page, located.start, located.end),
        tags: [],
      });
    }
    const plan = await MC.analyze(MC.adapter, old.id, target.id, new AC().signal, () => {});
    for (const [index, c] of cases.entries()) {
      const p = plan.proposals.find((x) => x.source.key === keys[index]);
      const recommended = p.candidates.find((x) => x.id === p.recommendedID);
      report.push({
        lang,
        quote: c.quote,
        note: c.note,
        expected: expectedStatus[c.expected],
        status: p.status,
        ok: p.status === expectedStatus[c.expected],
        massSelectable: p.status === 'unique candidate' && !!p.recommendedID,
        candidates: p.candidates.length,
        recommendedText: recommended?.text ?? null,
        recommendedRects: recommended?.position?.rects.length ?? null,
        recommendedPage: recommended?.pageIndex ?? null,
        boundary: p.candidates[0]?.boundary ?? null,
        reason: p.reason,
        extractedOld: sample(oldPages),
        extractedNew: sample(newPages),
      });
    }
  }
  await IOUtils.writeJSON(`${hostValidationReportRoot}/languages.json`, report);
  return {
    total: report.length,
    mismatches: report.filter((r) => !r.ok),
    bad: report.filter(
      (r) =>
        r.massSelectable &&
        (r.recommendedText.normalize('NFC').replace(/\s+/g, ' ') !==
          r.quote.normalize('NFC').replace(/\s+/g, ' ') ||
          !r.recommendedRects),
    ),
  };
}
