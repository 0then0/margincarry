// Optional comparison, not a product dependency. See docs/development.md.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolveQuote } from '../.local/research/reanchor-npm/package/dist/index.js';

const hostRoot = process.env.MARGINCARRY_HOST_ROOT || '.local';
const reportRoot = process.env.MARGINCARRY_REPORT_ROOT || `${hostRoot}/reports`;

const gold = JSON.parse(await readFile('validation/corpus.json', 'utf8'));
const plans = JSON.parse(await readFile(`${hostRoot}/corpus-plans.json`, 'utf8'));
const streams = JSON.parse(await readFile(`${hostRoot}/native-corpus.json`, 'utf8'));
const ids = JSON.parse(await readFile(`${hostRoot}/corpus-ids.json`, 'utf8'));
const pkg = JSON.parse(await readFile('.local/research/reanchor-npm/package/package.json', 'utf8'));
if (pkg.version !== '0.3.0') throw new Error('This evaluation requires reanchor 0.3.0.');
const rows = [];
for (const a of gold.annotations) {
  if (a.expected === 'unsupported') continue;
  const p = plans[a.pair].proposals.find((p) => p.source.key === ids.sources[a.id]);
  const results = {};
  for (const [mode, opts] of Object.entries({
    default: {},
    normalizedOnly: { maxMethod: 'normalized' },
    restricted: {
      maxMethod: 'normalized',
      normalize: {
        unicode: false,
        stripMarks: false,
        caseFold: false,
        foldPunctuation: false,
        joinHyphenatedLineBreaks: false,
      },
      maxRivals: 200,
    },
  })) {
    const found = [];
    for (const page of streams[a.pair]) {
      const r = resolveQuote(
        page.text,
        { exact: a.quote, prefix: p.sourcePrefix, suffix: p.sourceSuffix },
        opts,
      );
      if (r)
        found.push({
          pageIndex: page.index,
          start: r.start,
          end: r.end,
          text: r.text,
          method: r.method,
          rivals: r.rivals.length,
          offsetsRoundTrip: r.text === page.text.slice(r.start, r.end),
        });
    }
    results[mode] = found;
  }
  rows.push({ id: a.id, expected: a.expected, results });
}
const report = {
  version: '0.3.0',
  npmSHA1: 'ef602f12dcdfc6d98e802d474ddb2cfa17e4e66e',
  protocol:
    'Each full target page is resolved separately using the same native UTF-16 page stream and source context. Unsupported types are excluded from text resolver evaluation only, not from MarginCarry corpus statistics.',
  rows,
  summary: {},
};
for (const mode of ['default', 'normalizedOnly', 'restricted'])
  report.summary[mode] = {
    positiveCasesFound: rows.filter((r) => r.expected === 'locations' && r.results[mode].length)
      .length,
    negativeCasesWithMatch: rows
      .filter((r) => r.expected === 'not found' && r.results[mode].length)
      .map((r) => r.id),
    offsetRoundTripFailures: rows.flatMap((r) => r.results[mode]).filter((r) => !r.offsetsRoundTrip)
      .length,
  };
await mkdir(reportRoot, { recursive: true });
await writeFile(`${reportRoot}/reanchor-evaluation.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary, null, 2));
