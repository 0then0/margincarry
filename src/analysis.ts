import { preparePage, propose } from './matching.ts';
import type { Page, Plan } from './model.ts';
import { snapshotEqual } from './transfer.ts';
import type { ZoteroAdapter } from './zotero.ts';

export async function analyze(
  adapter: ZoteroAdapter,
  oldID: number,
  newID: number,
  signal: AbortSignal,
  progress: (message: string) => void,
): Promise<Plan> {
  const [source, target] = await adapter.pair(oldID, newID);
  signal.throwIfAborted();
  let oldPages: Page[], newPages: Page[];
  try {
    oldPages = await adapter.pages(oldID, signal, (i, n) => progress(`Source pages: ${i}/${n}`));
    newPages = await adapter.pages(newID, signal, (i, n) => progress(`Target pages: ${i}/${n}`));
  } catch (error) {
    signal.throwIfAborted();
    const reason = `PDF extraction failed: ${error instanceof Error ? error.message : String(error)}`;
    return {
      id: crypto.randomUUID(),
      source,
      target,
      state: 'review',
      proposals: source.annotations.map((annotation) => ({
        source: annotation,
        status:
          ['highlight', 'underline'].includes(annotation.type) && !annotation.external
            ? 'processing error'
            : 'unsupported',
        reason,
        candidates: [],
        sourcePrefix: '',
        sourceSuffix: '',
        truncated: false,
        recommendedID: null,
      })),
    };
  }
  const prepared = new Map<number, ReturnType<typeof preparePage>>();
  for (const page of newPages) {
    signal.throwIfAborted();
    prepared.set(page.index, preparePage(page));
    await adapter.yield();
  }
  const proposals = [];
  for (const annotation of source.annotations) {
    signal.throwIfAborted();
    progress(`Annotations: ${proposals.length + 1}/${source.annotations.length}`);
    proposals.push(
      propose(annotation, oldPages[annotation.position.pageIndex], newPages, 200, prepared),
    );
    await adapter.yield();
  }
  signal.throwIfAborted();
  if (
    !snapshotEqual(source, await adapter.snapshot(oldID)) ||
    !snapshotEqual(target, await adapter.snapshot(newID))
  ) {
    throw new Error('Documents or annotations changed during analysis. Run analysis again.');
  }
  return { id: crypto.randomUUID(), source, target, proposals, state: 'review' };
}
