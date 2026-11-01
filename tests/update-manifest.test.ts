import assert from 'node:assert/strict';
import test from 'node:test';
import { crc32, deflateRawSync } from 'node:zlib';
import {
  ADDON_ID,
  addRelease,
  assetUrl,
  buildEntry,
  compareVersions,
  SkipRelease,
  selectUpdate,
  serialize,
  sha256,
  UPDATE_URL,
  validateDocument,
  verifyDocument,
} from '../scripts/lib/update-manifest.mjs';

/** A real ZIP (deflated entries, central directory) built here, so the XPI reader is exercised. */
function zip(files: Record<string, string>): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const data = Buffer.from(text);
    const packed = deflateRawSync(data);
    const n = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc32(data), 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(n.length, 26);
    const head = Buffer.alloc(46);
    head.writeUInt32LE(0x02014b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(20, 6);
    head.writeUInt16LE(8, 10);
    head.writeUInt32LE(crc32(data), 16);
    head.writeUInt32LE(packed.length, 20);
    head.writeUInt32LE(data.length, 24);
    head.writeUInt16LE(n.length, 28);
    head.writeUInt32LE(offset, 42);
    parts.push(local, n, packed);
    central.push(head, n);
    offset += 30 + n.length + packed.length;
  }
  const dir = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, dir, end]);
}
function xpi(
  version: string,
  over: Record<string, unknown> = {},
  zotero: Record<string, unknown> = {},
) {
  return zip({
    'manifest.json': JSON.stringify({
      manifest_version: 2,
      name: 'MarginCarry',
      version,
      applications: {
        zotero: {
          id: ADDON_ID,
          update_url: UPDATE_URL,
          strict_min_version: '10.0.5',
          strict_max_version: '10.0.*',
          ...zotero,
        },
      },
      ...over,
    }),
    'margincarry.js': '/* bundle */',
  });
}
const published = (version: string, bytes = xpi(version)) => ({
  release: { tag: `v${version}`, isDraft: false, isPrerelease: false },
  files: { xpi: bytes, checksum: `${sha256(bytes)}  margincarry-${version}.xpi\n` },
});
/** An in-memory stand-in for the GitHub release API and asset downloads. */
function source(
  releases: Record<
    string,
    { draft?: boolean; pre?: boolean; xpi?: Buffer; sum?: string; omit?: string[] }
  >,
  fail?: string,
) {
  return {
    async release(tag: string) {
      const r = releases[tag];
      if (!r) throw new Error('GET failed: 404');
      const v = tag.slice(1);
      const names = [`margincarry-${v}.xpi`, `margincarry-${v}.xpi.sha256`].filter(
        (n) => !r.omit?.includes(n),
      );
      return {
        tag,
        isDraft: !!r.draft,
        isPrerelease: !!r.pre,
        assets: names.map((name) => ({ name })),
      };
    },
    async download(url: string) {
      if (fail && url.includes(fail)) throw new Error('network down');
      const tag = /download\/(v[\d.]+)\//.exec(url)![1]!;
      const r = releases[tag]!;
      const bytes = r.xpi ?? xpi(tag.slice(1));
      if (url.endsWith('.xpi')) return bytes;
      return Buffer.from(r.sum ?? `${sha256(bytes)}  margincarry-${tag.slice(1)}.xpi\n`);
    },
  };
}
const empty = () => ({ addons: { [ADDON_ID]: { updates: [] } } });
const versions = (doc: ReturnType<typeof empty>) =>
  doc.addons[ADDON_ID]!.updates.map((u: { version: string }) => u.version);

test('an entry ties the XPI manifest, exact bytes and pinned URL together', () => {
  const { release, files } = published('0.2.0');
  const entry = buildEntry(release, files);
  assert.deepEqual(entry, {
    version: '0.2.0',
    update_link:
      'https://github.com/0then0/margincarry/releases/download/v0.2.0/margincarry-0.2.0.xpi',
    update_hash: `sha256:${sha256(files.xpi)}`,
    applications: { zotero: { strict_min_version: '10.0.5', strict_max_version: '10.0.*' } },
  });
  assert.equal(entry.update_link, assetUrl('v0.2.0', 'margincarry-0.2.0.xpi'));
});

test('compatibility comes from the published XPI and is never widened', () => {
  const bytes = xpi('0.2.0', {}, { strict_min_version: '10.0.6', strict_max_version: '10.0.9' });
  const entry = buildEntry(...(Object.values(published('0.2.0', bytes)) as [never, never]));
  assert.deepEqual(entry.applications.zotero, {
    strict_min_version: '10.0.6',
    strict_max_version: '10.0.9',
  });
  const missing = xpi('0.2.0', {}, { strict_max_version: undefined });
  assert.throws(
    () => buildEntry(published('0.2.0', missing).release, published('0.2.0', missing).files),
    /strict_min_version and strict_max_version/,
  );
});

test('a wrong ID, version or update_url in the XPI is rejected', () => {
  for (const [bytes, pattern] of [
    [xpi('0.2.0', {}, { id: 'other@example.org' }), /add-on ID/],
    [xpi('0.2.1'), /manifest version is 0.2.1/],
    [xpi('0.2.0', {}, { update_url: 'https://example.org/updates.json' }), /update_url/],
  ] as const) {
    const p = published('0.2.0', bytes);
    assert.throws(() => buildEntry(p.release, p.files), pattern);
  }
});

test('a checksum that does not match the asset bytes is rejected, however it is wrong', () => {
  const p = published('0.2.0');
  const other = 'f'.repeat(64);
  assert.throws(
    () => buildEntry(p.release, { ...p.files, checksum: `${other}  margincarry-0.2.0.xpi\n` }),
    /SHA-256 mismatch/,
  );
  assert.throws(
    () =>
      buildEntry(p.release, {
        ...p.files,
        checksum: `${sha256(p.files.xpi)}  margincarry-0.1.0.xpi\n`,
      }),
    /names margincarry-0.1.0.xpi/,
  );
  assert.throws(
    () => buildEntry(p.release, { ...p.files, checksum: 'not a checksum' }),
    /<sha256>/,
  );
  const flipped = Buffer.from(p.files.xpi);
  flipped[flipped.length - 40] ^= 1;
  assert.throws(() => buildEntry(p.release, { ...p.files, xpi: flipped }));
});

test('a damaged or empty asset is an error, not an entry', () => {
  const p = published('0.2.0');
  const junk = Buffer.from('not a zip at all, definitely');
  assert.throws(
    () =>
      buildEntry(p.release, { xpi: junk, checksum: `${sha256(junk)}  margincarry-0.2.0.xpi\n` }),
    /not a valid ZIP/,
  );
  const noManifest = zip({ 'other.txt': 'x' });
  assert.throws(
    () =>
      buildEntry(p.release, {
        xpi: noManifest,
        checksum: `${sha256(noManifest)}  margincarry-0.2.0.xpi\n`,
      }),
    /no manifest.json/,
  );
});

test('drafts and prereleases never reach the stable channel', async () => {
  for (const flag of [{ draft: true }, { pre: true }]) {
    const doc = empty();
    await assert.rejects(addRelease(doc, source({ 'v0.3.0': flag }), 'v0.3.0'), SkipRelease);
  }
});

test('a missing asset, a network error and an unknown tag leave nothing behind', async () => {
  const doc = empty();
  await assert.rejects(
    addRelease(doc, source({ 'v0.2.0': { omit: ['margincarry-0.2.0.xpi.sha256'] } }), 'v0.2.0'),
    /no asset margincarry-0.2.0.xpi.sha256/,
  );
  await assert.rejects(addRelease(doc, source({ 'v0.2.0': {} }, '.xpi'), 'v0.2.0'), /network down/);
  await assert.rejects(addRelease(doc, source({}), 'v0.2.0'), /404/);
  assert.deepEqual(doc, empty());
});

test('adding is idempotent and keeps earlier entries in numeric version order', async () => {
  const s = source({ 'v0.9.0': {}, 'v0.10.0': {}, 'v0.2.0': {} });
  let doc: ReturnType<typeof empty> = empty();
  for (const tag of ['v0.9.0', 'v0.10.0', 'v0.2.0'])
    doc = (await addRelease(doc, s, tag)).doc as typeof doc;
  assert.deepEqual(versions(doc), ['0.2.0', '0.9.0', '0.10.0']);
  const again = await addRelease(doc, s, 'v0.10.0');
  assert.equal(again.changed, false);
  assert.equal(serialize(again.doc), serialize(doc));
  assert.ok(compareVersions('0.10.0', '0.9.0') > 0);
});

test('an existing entry is never rewritten with different data', async () => {
  const first = await addRelease(empty(), source({ 'v0.2.0': {} }), 'v0.2.0');
  const rebuilt = source({ 'v0.2.0': { xpi: xpi('0.2.0', { description: 'repacked' }) } });
  await assert.rejects(
    addRelease(first.doc as never, rebuilt, 'v0.2.0'),
    /already listed with different data/,
  );
});

test('verification re-derives every entry from its asset', async () => {
  const s = source({ 'v0.1.0': {}, 'v0.2.0': {} });
  let doc: ReturnType<typeof empty> = empty();
  for (const tag of ['v0.1.0', 'v0.2.0']) doc = (await addRelease(doc, s, tag)).doc as typeof doc;
  assert.equal(await verifyDocument(doc, s), 2);
  // The asset changed after the entry was written.
  const swapped = source({ 'v0.1.0': {}, 'v0.2.0': { xpi: xpi('0.2.0', { description: 'x' }) } });
  await assert.rejects(verifyDocument(doc, swapped), /does not match/);
  // A tampered hash in the document.
  const bad = structuredClone(doc);
  bad.addons[ADDON_ID]!.updates[0]!.update_hash = `sha256:${'0'.repeat(64)}`;
  await assert.rejects(verifyDocument(bad, s), /does not match/);
});

test('the document shape is enforced', () => {
  assert.throws(() => validateDocument({ addons: {} }), /exactly one add-on/);
  const entry = buildEntry(published('0.2.0').release, published('0.2.0').files);
  const doc = (u: object[]) => ({ addons: { [ADDON_ID]: { updates: u } } });
  assert.throws(() => validateDocument(doc([entry, entry])), /Duplicate/);
  assert.throws(
    () =>
      validateDocument(
        doc([
          {
            ...entry,
            update_link:
              'https://github.com/0then0/margincarry/releases/latest/download/margincarry.xpi',
          },
        ]),
      ),
    /pinned/,
  );
  assert.throws(() => validateDocument(doc([{ ...entry, update_hash: 'abc' }])), /update_hash/);
  assert.throws(() => validateDocument(doc([{ ...entry, applications: {} }])), /compatibility/);
  const older = {
    ...entry,
    version: '0.1.0',
    update_link: assetUrl('v0.1.0', 'margincarry-0.1.0.xpi'),
  };
  assert.throws(() => validateDocument(doc([entry, older])), /ascending/);
});

test('the committed updates.json is well formed and lists only released-or-current versions', async () => {
  const { readFile } = await import('node:fs/promises');
  const read = async (f: string) =>
    JSON.parse(await readFile(new URL(`../${f}`, import.meta.url), 'utf8'));
  const doc = await read('updates.json');
  const manifest = await read('manifest.json');
  const updates = validateDocument(doc);
  assert.ok(updates.length >= 1);
  assert.equal(manifest.applications.zotero.update_url, UPDATE_URL);
  assert.equal(manifest.applications.zotero.id, ADDON_ID);
  for (const u of updates) assert.ok(compareVersions(u.version, manifest.version) <= 0, u.version);
});

test('the committed channel offers the newest compatible version to every older install', async () => {
  const { readFile } = await import('node:fs/promises');
  const doc = JSON.parse(await readFile(new URL('../updates.json', import.meta.url), 'utf8'));
  const newest = validateDocument(doc).at(-1)!.version;
  for (const installed of ['0.1.0', '0.1.1'])
    assert.equal(selectUpdate(doc, installed, '10.0.7')?.version, newest);
  assert.equal(selectUpdate(doc, newest, '10.0.7'), null);
  // Hosts outside the declared range are offered nothing.
  assert.equal(selectUpdate(doc, '0.1.0', '10.1.0'), null);
  assert.equal(selectUpdate(doc, '0.1.0', '10.0.4'), null);
  assert.equal(selectUpdate(doc, '0.1.0', '11.0.0'), null);
});
