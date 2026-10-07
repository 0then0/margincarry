import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = new URL('../', import.meta.url);
process.chdir(fileURLToPath(root));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
await rm('dist/package', { recursive: true, force: true });
await mkdir('dist/package/content', { recursive: true });
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/package/margincarry.js',
  bundle: true,
  format: 'iife',
  globalName: 'MarginCarry',
  target: 'firefox140',
  legalComments: 'eof',
  charset: 'utf8',
});
for (const name of ['bootstrap.js', 'manifest.json', 'LICENSE'])
  await copyFile(name, `dist/package/${name}`);
for (const name of ['transfer.xhtml', 'transfer.css'])
  await copyFile(`content/${name}`, `dist/package/content/${name}`);
await copyFile('assets/icon.svg', 'dist/package/content/icon.svg');
const archive = `dist/margincarry-${pkg.version}.xpi`;
await rm(archive, { force: true });
// A ZIP-based XPI needs no extra archive dependency; sorted inputs make packaging reproducible.
execFileSync('python3', [
  '-c',
  `import pathlib,zipfile
root=pathlib.Path('dist/package')
with zipfile.ZipFile('${archive}','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(root.rglob('*')):
  if p.is_file():
   info=zipfile.ZipInfo(str(p.relative_to(root)),date_time=(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16
   z.writestr(info,p.read_bytes())`,
]);
const hash = createHash('sha256')
  .update(await readFile(archive))
  .digest('hex');
await writeFile(`${archive}.sha256`, `${hash}  margincarry-${pkg.version}.xpi\n`);
console.log(`${archive}\nSHA-256 ${hash}`);
