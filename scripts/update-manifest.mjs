// Prepares and verifies updates.json from published GitHub releases.
//   node scripts/update-manifest.mjs add <tag>   add the entry for a published stable release
//   node scripts/update-manifest.mjs verify      re-check every entry against its release asset
// The file is replaced only after every check succeeds; any failure leaves it untouched.
import { readFile, rename, writeFile } from 'node:fs/promises';
import {
  addRelease,
  REPO,
  SkipRelease,
  serialize,
  validateDocument,
  verifyDocument,
} from './lib/update-manifest.mjs';

const file = new URL('../updates.json', import.meta.url);
const headers = {
  'User-Agent': 'margincarry-release-tooling',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};
const get = async (url, init) => {
  const response = await fetch(url, {
    ...init,
    headers: { ...headers, ...init?.headers },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
  return response;
};
export const githubSource = {
  release: async (tag) =>
    (await get(`https://api.github.com/repos/${REPO}/releases/tags/${tag}`)).json(),
  download: async (url) => new Uint8Array(await (await get(url)).arrayBuffer()),
};
const source = {
  release: async (tag) => {
    const r = await githubSource.release(tag);
    return {
      tag: r.tag_name,
      isDraft: r.draft,
      isPrerelease: r.prerelease,
      assets: r.assets.map((a) => ({ name: a.name })),
    };
  },
  download: githubSource.download,
};

const [command, tag] = process.argv.slice(2);
try {
  const doc = JSON.parse(await readFile(file, 'utf8'));
  if (command === 'add' && tag) {
    const { doc: next, changed } = await addRelease(doc, source, tag);
    validateDocument(next);
    if (!changed) console.log(`${tag} is already listed and matches its asset.`);
    else {
      const temporary = new URL('../updates.json.tmp', import.meta.url);
      await writeFile(temporary, serialize(next));
      await rename(temporary, file);
      console.log(`Added ${tag} to updates.json.`);
    }
  } else if (command === 'verify') {
    console.log(
      `Verified ${await verifyDocument(doc, source)} entries against their published assets.`,
    );
  } else {
    console.error('Usage: update-manifest.mjs add <tag> | verify');
    process.exitCode = 2;
  }
} catch (error) {
  if (error instanceof SkipRelease) console.log(`Skipped: ${error.message}`);
  else {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}
