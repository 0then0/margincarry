// Builds and verifies the Zotero update manifest (updates.json) from published release assets.
// Pure functions plus an injectable source, so tests never touch the network.
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';

export const ADDON_ID = 'margincarry@0then0.github.io';
export const REPO = '0then0/margincarry';
export const UPDATE_URL = `https://raw.githubusercontent.com/${REPO}/main/updates.json`;
const SEMVER = /^\d+\.\d+\.\d+$/;
const HASH = /^[0-9a-f]{64}$/;

export class SkipRelease extends Error {}

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Numeric, component-wise comparison; never a string comparison. */
export function compareVersions(a, b) {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/** Reads one file from a ZIP archive with the central directory, so a damaged archive fails. */
export function readZipEntry(zip, name) {
  const buf = Buffer.from(zip);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('The XPI is not a valid ZIP archive.');
  let at = buf.readUInt32LE(eocd + 16);
  const count = buf.readUInt16LE(eocd + 10);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(at) !== 0x02014b50)
      throw new Error('The XPI central directory is damaged.');
    const method = buf.readUInt16LE(at + 10);
    const size = buf.readUInt32LE(at + 20);
    const nameLength = buf.readUInt16LE(at + 28);
    const extra = buf.readUInt16LE(at + 30);
    const comment = buf.readUInt16LE(at + 32);
    const local = buf.readUInt32LE(at + 42);
    const entry = buf.toString('utf8', at + 46, at + 46 + nameLength);
    if (entry === name) {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + size);
      if (method === 0) return data;
      if (method === 8) return inflateRawSync(data);
      throw new Error(`Unsupported ZIP compression method ${method}.`);
    }
    at += 46 + nameLength + extra + comment;
  }
  throw new Error(`The XPI has no ${name}.`);
}

export function parseChecksum(text, assetName) {
  const match = /^([0-9a-f]{64}) {2}(\S+)\n?$/.exec(text);
  if (!match) throw new Error('The checksum file is not in "<sha256>  <file>" form.');
  if (match[2] !== assetName)
    throw new Error(`The checksum file names ${match[2]}, not ${assetName}.`);
  return match[1];
}

/** The exact URL of a release asset, pinned to its tag. */
export const assetUrl = (tag, name) =>
  `https://github.com/${REPO}/releases/download/${tag}/${name}`;

/**
 * Validates a published release and returns its update entry.
 * @param {{tag:string,isDraft:boolean,isPrerelease:boolean}} release
 * @param {{xpi:Uint8Array,checksum:string}} files bytes of margincarry-<v>.xpi and its .sha256 file
 */
export function buildEntry(release, files) {
  if (release.isDraft || release.isPrerelease)
    throw new SkipRelease(
      `${release.tag} is a ${release.isDraft ? 'draft' : 'prerelease'}; the stable channel is unchanged.`,
    );
  const tagMatch = /^v(\d+\.\d+\.\d+)$/.exec(release.tag);
  if (!tagMatch) throw new Error(`Tag ${release.tag} is not vMAJOR.MINOR.PATCH.`);
  const version = tagMatch[1];
  const name = `margincarry-${version}.xpi`;
  const expected = parseChecksum(files.checksum, name);
  const actual = sha256(files.xpi);
  if (actual !== expected)
    throw new Error(
      `SHA-256 mismatch for ${name}: the checksum file says ${expected}, the asset is ${actual}.`,
    );
  const manifest = JSON.parse(readZipEntry(files.xpi, 'manifest.json').toString('utf8'));
  const zotero = manifest.applications?.zotero;
  if (zotero?.id !== ADDON_ID)
    throw new Error(`The XPI add-on ID is ${zotero?.id}, not ${ADDON_ID}.`);
  if (manifest.version !== version)
    throw new Error(
      `The XPI manifest version is ${manifest.version}, but the tag is ${release.tag}.`,
    );
  if (zotero.update_url !== UPDATE_URL)
    throw new Error(
      `The XPI update_url is ${zotero.update_url}; installed copies would not find this manifest.`,
    );
  if (!zotero.strict_min_version || !zotero.strict_max_version)
    throw new Error('The XPI manifest must declare strict_min_version and strict_max_version.');
  return {
    version,
    update_link: assetUrl(release.tag, name),
    update_hash: `sha256:${actual}`,
    applications: {
      zotero: {
        strict_min_version: zotero.strict_min_version,
        strict_max_version: zotero.strict_max_version,
      },
    },
  };
}

/** Checks the shape of a manifest document. Returns the update list. */
export function validateDocument(doc) {
  const updates = doc?.addons?.[ADDON_ID]?.updates;
  if (!Array.isArray(updates) || Object.keys(doc.addons).length !== 1)
    throw new Error(
      `updates.json must contain exactly one add-on, ${ADDON_ID}, with an updates array.`,
    );
  const seen = new Set();
  for (const u of updates) {
    if (!SEMVER.test(u.version ?? '')) throw new Error(`Invalid version ${u.version}.`);
    if (seen.has(u.version)) throw new Error(`Duplicate version ${u.version}.`);
    seen.add(u.version);
    if (u.update_link !== assetUrl(`v${u.version}`, `margincarry-${u.version}.xpi`))
      throw new Error(`${u.version}: update_link is not the pinned release asset.`);
    if (
      !HASH.test(u.update_hash?.replace(/^sha256:/, '') ?? '') ||
      !u.update_hash.startsWith('sha256:')
    )
      throw new Error(`${u.version}: update_hash must be sha256:<64 hex digits>.`);
    const z = u.applications?.zotero;
    if (!z?.strict_min_version || !z?.strict_max_version)
      throw new Error(`${u.version}: compatibility is missing.`);
  }
  const sorted = [...updates].sort((a, b) => compareVersions(a.version, b.version));
  if (sorted.some((u, i) => u !== updates[i]))
    throw new Error('Updates must be ordered by ascending version.');
  return updates;
}

/** Adds an entry without touching the others. Identical re-adds are no-ops; conflicts are errors. */
export function mergeEntry(doc, entry) {
  const updates = validateDocument(doc);
  const existing = updates.find((u) => u.version === entry.version);
  if (existing) {
    if (JSON.stringify(existing) !== JSON.stringify(entry))
      throw new Error(
        `${entry.version} is already listed with different data; published entries are never rewritten.`,
      );
    return { doc, changed: false };
  }
  const next = [...updates, entry].sort((a, b) => compareVersions(a.version, b.version));
  return { doc: { addons: { [ADDON_ID]: { updates: next } } }, changed: true };
}

export const serialize = (doc) => `${JSON.stringify(doc, null, 2)}\n`;

/**
 * Downloads a release through `source` and checks every entry already listed against its asset.
 * @param {{release:(tag:string)=>Promise<any>, download:(url:string)=>Promise<Uint8Array>}} source
 */
export async function fetchFiles(source, tag) {
  const release = await source.release(tag);
  if (release.isDraft || release.isPrerelease)
    throw new SkipRelease(
      `${tag} is a ${release.isDraft ? 'draft' : 'prerelease'}; the stable channel is unchanged.`,
    );
  const version = tag.replace(/^v/, '');
  const xpiName = `margincarry-${version}.xpi`;
  const names = new Set((release.assets ?? []).map((a) => a.name));
  for (const n of [xpiName, `${xpiName}.sha256`])
    if (!names.has(n)) throw new Error(`Release ${tag} has no asset ${n}.`);
  const [xpi, checksum] = await Promise.all([
    source.download(assetUrl(tag, xpiName)),
    source.download(assetUrl(tag, `${xpiName}.sha256`)),
  ]);
  return { release, files: { xpi, checksum: Buffer.from(checksum).toString('utf8') } };
}

export async function addRelease(doc, source, tag) {
  const { release, files } = await fetchFiles(source, tag);
  return mergeEntry(doc, buildEntry(release, files));
}

/** Re-derives every listed entry from its published asset and requires an exact match. */
export async function verifyDocument(doc, source) {
  const updates = validateDocument(doc);
  for (const u of updates) {
    const tag = `v${u.version}`;
    const { release, files } = await fetchFiles(source, tag);
    const rebuilt = buildEntry(release, files);
    if (JSON.stringify(rebuilt) !== JSON.stringify(u))
      throw new Error(`${u.version}: the entry does not match the published asset.`);
  }
  return updates.length;
}

const matches = (pattern, version) => {
  const wild = pattern.endsWith('.*');
  const base = wild ? pattern.slice(0, -2).split('.') : pattern.split('.');
  const v = version.split('.');
  if (wild) return base.every((part, i) => String(v[i]) === part);
  return compareVersions(version, pattern) === 0;
};
/**
 * A model of the host's choice, for tests and documentation: the newest listed version that is
 * newer than the installed one and whose compatibility range includes the host version.
 */
export function selectUpdate(doc, installed, hostVersion) {
  const candidates = validateDocument(doc).filter((u) => {
    const { strict_min_version: min, strict_max_version: max } = u.applications.zotero;
    return (
      compareVersions(u.version, installed) > 0 &&
      compareVersions(hostVersion, min.replace(/\.\*$/, '.0')) >= 0 &&
      (max.endsWith('.*') ? matches(max, hostVersion) : compareVersions(hostVersion, max) <= 0)
    );
  });
  return candidates.at(-1) ?? null;
}
