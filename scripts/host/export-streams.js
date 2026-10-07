export async function run() {
  const api = Zotero.MarginCarryTest,
    ids = await IOUtils.readJSON(`${hostRoot}/.local/corpus-ids.json`),
    streams = {};
  for (const [pair, attachments] of Object.entries(ids.pairs)) {
    const pages = await api.adapter.pages(
      attachments.new,
      new (Zotero.getMainWindow().AbortController)().signal,
      () => {},
    );
    streams[pair] = pages.map((page) => ({ index: page.index, text: api.pageText(page).text }));
  }
  await IOUtils.writeJSON(`${hostRoot}/.local/native-corpus.json`, streams);
  return Object.keys(streams);
}
