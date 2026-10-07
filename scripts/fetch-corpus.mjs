import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const corpus = JSON.parse(
  await readFile(new URL('../validation/corpus.json', import.meta.url), 'utf8'),
);
const folder = new URL('../.local/corpus/', import.meta.url);
await mkdir(folder, { recursive: true });
for (const document of corpus.documents) {
  const path = new URL(document.filename, folder);
  let bytes = await readFile(path).catch((e) => {
    if (e.code !== 'ENOENT') throw e;
    return null;
  });
  if (!bytes) {
    const response = await fetch(document.url);
    if (!response.ok) throw new Error(`Download failed: ${response.status} ${document.url}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== document.sha256)
    throw new Error(
      `Corpus changed: ${document.filename} (${hash}). Frozen gold cannot be reused.`,
    );
  await writeFile(path, bytes);
  console.log(`${document.filename}: ${hash}`);
}
