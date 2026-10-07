// Development-only bridge to a deliberately isolated Zotero test profile.
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('.local');
const ready = JSON.parse(await readFile(`${root}/harness-ready.json`, 'utf8'));
if (ready.profile !== `${root}/profile`) throw new Error('Refusing a non-isolated Zotero profile.');
await unlink(`${root}/result.json`).catch((e) => {
  if (e.code !== 'ENOENT') throw e;
});
const input = await readFile(process.argv[2], 'utf8');
const body = input.includes('export async function run()')
  ? `${input.replace('export async function run()', 'async function run()')}\nreturn await run();`
  : input;
const code = `const hostRoot = ${JSON.stringify(resolve('.'))};\n${body}`;
await writeFile(`${root}/command.js`, code);
const deadline = Date.now() + 240000;
while (Date.now() < deadline) {
  const result = await readFile(`${root}/result.json`, 'utf8').catch(() => null);
  if (result) {
    console.log(result);
    const parsed = JSON.parse(result);
    process.exitCode = parsed.ok ? 0 : 1;
    break;
  }
  await new Promise((r) => setTimeout(r, 200));
}
if (Date.now() >= deadline)
  throw new Error('Zotero test request timed out; inspect .local/host.log.');
