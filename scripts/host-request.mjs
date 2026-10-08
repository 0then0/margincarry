// Development-only bridge to a deliberately isolated Zotero test profile.
import { mkdir, open, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.env.MARGINCARRY_HOST_ROOT || '.local');
const ready = JSON.parse(await readFile(`${root}/harness-ready.json`, 'utf8'));
if (ready.profile !== `${root}/profile`) throw new Error('Refusing a non-isolated Zotero profile.');
const lockPath = `${root}/request.lock`;
const lock = await open(lockPath, 'wx').catch((error) => {
  if (error.code === 'EEXIST')
    throw new Error(
      'Another host request is active. Wait for it to finish; do not run bridge requests concurrently.',
    );
  throw error;
});
let commandDispatched = false;
let requestFinished = false;
try {
  await unlink(`${root}/result.json`).catch((e) => {
    if (e.code !== 'ENOENT') throw e;
  });
  const reportRoot = resolve(process.env.MARGINCARRY_REPORT_ROOT || `${root}/reports`);
  await mkdir(reportRoot, { recursive: true });
  const input = await readFile(process.argv[2], 'utf8');
  const body = input.includes('export async function run()')
    ? `${input.replace('export async function run()', 'async function run()')}\nreturn await run();`
    : input;
  const code = `const hostRoot = ${JSON.stringify(resolve('.'))};\nconst hostValidationRoot = ${JSON.stringify(root)};\nconst hostValidationReportRoot = ${JSON.stringify(reportRoot)};\nconst hostValidationAction = ${JSON.stringify(process.argv[3] || 'inspect')};\n${body}`;
  await writeFile(`${root}/command.js`, code);
  commandDispatched = true;
  const deadline = Date.now() + 240000;
  while (Date.now() < deadline) {
    const result = await readFile(`${root}/result.json`, 'utf8').catch(() => null);
    if (result) {
      requestFinished = true;
      console.log(result);
      const parsed = JSON.parse(result);
      process.exitCode = parsed.ok ? 0 : 1;
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  if (Date.now() >= deadline)
    throw new Error(
      `Zotero test request timed out. The lock remains at ${lockPath}; quit the isolated host before removing it and retrying.`,
    );
} finally {
  await lock.close();
  if (!commandDispatched || requestFinished) await unlink(lockPath);
}
