import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

async function runHost(name: string, globals: Record<string, unknown>) {
  const source = await readFile(`scripts/host/${name}.js`, 'utf8');
  return runInNewContext(
    `${source.replace('export async function run()', 'async function run()')}\nrun();`,
    globals,
  );
}

test('corpus stream export uses the selected fixture root despite stale default IDs', async () => {
  const writes: Record<string, unknown> = {};
  const ids = { pairs: { lora: { new: 27 } } };
  await runHost('export-streams', {
    hostRoot: '/project',
    hostValidationRoot: '/project/.local/fresh',
    IOUtils: {
      readJSON: async (path: string) => {
        assert.equal(path, '/project/.local/fresh/corpus-ids.json');
        return ids;
      },
      writeJSON: async (path: string, value: unknown) => {
        writes[path] = value;
      },
    },
    Zotero: {
      getMainWindow: () => ({ AbortController }),
      MarginCarryTest: {
        adapter: {
          pages: async (id: number) => {
            assert.equal(id, 27);
            return [{ index: 0 }];
          },
        },
        pageText: () => ({ text: 'new revision' }),
      },
    },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(writes)), {
    '/project/.local/fresh/native-corpus.json': { lora: [{ index: 0, text: 'new revision' }] },
  });
});

async function repeatFixture(extraAnnotation = false, extraOperation = false) {
  const before = JSON.parse(await readFile('validation/native-v010/ui-before.json', 'utf8'));
  const prior = JSON.parse(await readFile('validation/native-v010/ui-after.json', 'utf8'));
  const after = structuredClone(prior.after);
  const journal = [structuredClone(prior.record)];
  prior.journal = structuredClone(journal);
  if (extraAnnotation)
    after.target.annotations.push({ key: 'EXTRA_REPEAT_COPY', fingerprint: 'new' });
  if (extraOperation) journal.push({ ...structuredClone(prior.record), id: 'extra', created: [] });
  const hash = '2c0e849b219f34406b6a6987c2292e0ecf3704db15651b4f33a361c9472124a7';
  const api = {
    adapter: {
      snapshot: async (id: number) => (id === prior.record.sourceID ? after.source : after.target),
      fingerprint: async (_libraryID: number, key: string) =>
        prior.record.created.find((c: { key: string }) => c.key === key).fingerprint,
    },
    service: { journal: async () => journal },
  };
  const writes: unknown[] = [];
  const globals = {
    hostValidationRoot: '/isolated',
    hostValidationReportRoot: '/reports',
    hostValidationAction: 'ui-repeat',
    Services: {
      dirsvc: { get: () => ({ path: '/isolated/profile' }) },
      appinfo: {},
      scriptloader: {
        loadSubScriptWithOptions: (_url: string, options: { target: Record<string, unknown> }) => {
          options.target.MarginCarry = api;
        },
      },
    },
    ChromeUtils: {
      importESModule: () => ({
        AddonManager: {
          getAddonByID: async () => ({
            isActive: true,
            version: '0.1.0',
            getResourceURI: () => ({ spec: 'bundle' }),
          }),
        },
      }),
    },
    Ci: {},
    Cc: {},
    Cu: {},
    PathUtils: {},
    Zotero: {
      DataDirectory: { dir: '/isolated/data' },
      getMainWindow: () => ({
        crypto: {
          subtle: {
            digest: async () => Uint8Array.from(hash.match(/../g)!, (s) => Number.parseInt(s, 16)),
          },
        },
      }),
      Items: { getByLibraryAndKey: () => ({ deleted: false }) },
    },
    IOUtils: {
      read: async () => new Uint8Array(),
      readJSON: async (path: string) => {
        if (path.endsWith('native-ids.json'))
          return {
            pairs: { attention: { old: prior.record.sourceID, new: prior.record.targetID } },
          };
        if (path.endsWith('cases.json')) return { cases: [] };
        if (path.endsWith('ui-before.json')) return before;
        if (path.endsWith('ui-after.json')) return prior;
        throw new Error(`Unexpected fixture read: ${path}`);
      },
      writeJSON: async (_path: string, value: unknown) => {
        writes.push(value);
      },
    },
  };
  return { globals, writes, api };
}

test('UI repeat accepts unchanged snapshots and journal', async () => {
  const fixture = await repeatFixture();
  const result = await runHost('native-validation', fixture.globals);
  assert.equal(result.repeatUnchanged, true);
  assert.equal(fixture.writes.length, 1);
});

for (const [label, annotation, operation] of [
  ['extra copy with all old fingerprints intact', true, false],
  ['extra journal operation without target change', false, true],
] as const) {
  test(`UI repeat rejects ${label}`, async () => {
    const fixture = await repeatFixture(annotation, operation);
    await assert.rejects(runHost('native-validation', fixture.globals), /UI repeat changed/);
    assert.equal(fixture.writes.length, 0);
  });
}

test('bridge rejects concurrent requests before replacing another command or result', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'margincarry-host-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'harness-ready.json'), JSON.stringify({ profile: `${root}/profile` }));
  await writeFile(join(root, 'command.js'), 'in-flight command');
  await writeFile(join(root, 'result.json'), 'in-flight result');
  await writeFile(join(root, 'request.lock'), '');
  assert.throws(
    () =>
      execFileSync(process.execPath, [resolve('scripts/host-request.mjs'), 'unused.js'], {
        env: { ...process.env, MARGINCARRY_HOST_ROOT: root },
        stdio: 'pipe',
      }),
    /Another host request is active/,
  );
  assert.equal(await readFile(join(root, 'command.js'), 'utf8'), 'in-flight command');
  assert.equal(await readFile(join(root, 'result.json'), 'utf8'), 'in-flight result');
});

test('bridge releases its request lock after a failed script read', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'margincarry-host-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'harness-ready.json'), JSON.stringify({ profile: `${root}/profile` }));
  assert.throws(
    () =>
      execFileSync(
        process.execPath,
        [resolve('scripts/host-request.mjs'), join(root, 'missing.js')],
        {
          env: { ...process.env, MARGINCARRY_HOST_ROOT: root },
          stdio: 'pipe',
        },
      ),
    /ENOENT/,
  );
  await assert.rejects(readFile(join(root, 'request.lock')), { code: 'ENOENT' });
});

for (const loseComment of [false, true]) {
  test(`native metadata checks independent sources when journal and copy ${loseComment ? 'both lose a comment' : 'preserve multiline text'}`, async () => {
    const fixture = await repeatFixture();
    const applied = JSON.parse(await readFile('validation/native-v010/apply.json', 'utf8'));
    const analysis = JSON.parse(await readFile('validation/native-v010/analysis.json', 'utf8'));
    const cases = JSON.parse(await readFile('validation/native-v010/cases.json', 'utf8'));
    const sources = JSON.parse(await readFile('validation/native-v010/sources.json', 'utf8'));
    const pairs = Object.values(applied.pairs) as (typeof applied.pairs.lora)[];
    if (loseComment) {
      for (const pair of pairs) {
        pair.after.target.annotations.find(
          (a: { key: string }) => a.key === pair.record.created[0].key,
        ).comment = '';
        pair.record.copies[0].comment = '';
      }
    }
    const targetReads: Record<number, number> = {};
    Object.assign(fixture.api.adapter, {
      controller: () => new AbortController(),
      navigate: async () => {},
      snapshot: async (id: number) => {
        const pair = pairs.find((p) => p.record.sourceID === id || p.record.targetID === id);
        if (id === pair.record.sourceID) return pair.before.source;
        targetReads[id] = (targetReads[id] || 0) + 1;
        return targetReads[id] === 1 ? pair.before.target : pair.after.target;
      },
    });
    Object.assign(fixture.api, {
      analyze: async (_adapter: unknown, sourceID: number) => {
        const pair = pairs.find((p) => p.record.sourceID === sourceID);
        return {
          source: pair.before.source,
          target: pair.before.target,
          proposals: analysis.rows
            .filter((row: { sourceKey: string }) =>
              pair.before.source.annotations.some((a: { key: string }) => a.key === row.sourceKey),
            )
            .map((row: { sourceKey: string; candidates: unknown[] }) => ({
              source: pair.before.source.annotations.find(
                (a: { key: string }) => a.key === row.sourceKey,
              ),
              candidates: row.candidates,
            })),
        };
      },
    });
    Object.assign(fixture.api.service, {
      apply: async (plan: { source: { id: number } }) =>
        pairs.find((p) => p.record.sourceID === plan.source.id).record,
    });
    fixture.globals.hostValidationAction = 'apply';
    fixture.globals.IOUtils.readJSON = async (path: string) => {
      if (path.endsWith('native-ids.json'))
        return {
          pairs: Object.fromEntries(
            Object.entries(applied.pairs).map(([name, pair]) => [
              name,
              { old: pair.record.sourceID, new: pair.record.targetID },
            ]),
          ),
        };
      if (path.endsWith('cases.json')) return cases;
      if (path.endsWith('analysis.json')) return analysis;
      if (path.endsWith('sources.json')) return sources;
      throw new Error(`Unexpected fixture read: ${path}`);
    };
    const result = await runHost('native-validation', fixture.globals);
    assert.equal(result.pairs.lora.copyPropertiesCorrect, !loseComment);
    assert.equal(result.pairs.attention.copyPropertiesCorrect, !loseComment);
  });
}
