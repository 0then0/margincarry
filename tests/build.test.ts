import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

test('the documented build works in a path containing spaces and non-ASCII characters', async (t) => {
  const scratch = await mkdtemp(join(tmpdir(), 'margincarry-build-'));
  t.after(() => rm(scratch, { recursive: true, force: true }));
  const project = join(scratch, 'PDF revisions тест');
  for (const name of [
    'scripts',
    'src',
    'content',
    'assets',
    'package.json',
    'tsconfig.json',
    'manifest.json',
    'bootstrap.js',
    'LICENSE',
  ])
    await cp(resolve(name), join(project, name), { recursive: true });
  await symlink(
    resolve('node_modules'),
    join(project, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: project, encoding: 'utf8' });
  const bytes = await readFile(join(project, 'dist/margincarry-0.1.0.xpi'));
  assert.equal(bytes.subarray(0, 2).toString(), 'PK');
  assert.match(
    await readFile(join(project, 'dist/margincarry-0.1.0.xpi.sha256'), 'utf8'),
    /^[a-f0-9]{64} {2}margincarry-0\.1\.0\.xpi\n$/,
  );
});
