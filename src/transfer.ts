import type { Copy, Plan, Selection, Snapshot, Store, TransferRecord } from './model.ts';

export function snapshotEqual(a: Snapshot, b: Snapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
export class TransferService {
  private busy = false;
  private readonly store: Store;
  constructor(store: Store) {
    this.store = store;
  }

  async journal(): Promise<TransferRecord[]> {
    if (this.busy) throw new Error('A transfer operation is in progress.');
    this.busy = true;
    try {
      return await this.recoverJournal();
    } finally {
      this.busy = false;
    }
  }

  private async recoverJournal(): Promise<TransferRecord[]> {
    const records = await this.store.readJournal();
    let changed = false;
    for (const record of records.filter((r) => r.status === 'prepared')) {
      const fingerprints = await Promise.all(
        record.copies.map((c) => this.store.fingerprint(record.libraryID, c.key)),
      );
      if (fingerprints.every((f) => f === null)) record.status = 'failed';
      else if (
        record.created.length === record.copies.length &&
        fingerprints.every((f) => f !== null)
      )
        record.status = 'committed';
      else
        throw new Error(
          'An incomplete transfer journal needs inspection. No further copies will be created.',
        );
      changed = true;
    }
    for (const record of records.filter((r) => r.status === 'undo-prepared')) {
      const current = await Promise.all(
        record.created.map((c) => this.store.fingerprint(record.libraryID, c.key)),
      );
      if (current.every((f, i) => f === record.created[i]?.fingerprint))
        record.status = 'committed';
      else if (
        record.undoneCreated?.length === record.created.length &&
        current.every((f, i) => f === record.undoneCreated?.[i]?.fingerprint)
      )
        record.status = 'undone';
      else throw new Error('An interrupted undo needs inspection. No copies will be removed.');
      changed = true;
    }
    if (changed) await this.store.writeJournal(records);
    return records;
  }

  async apply(plan: Plan, selections: Selection[]): Promise<TransferRecord> {
    if (this.busy || plan.state !== 'review')
      throw new Error(
        'This plan is busy, applied or invalid. Recalculate before another transfer.',
      );
    if (!selections.length) throw new Error('Select at least one proposal.');
    this.busy = true;
    plan.state = 'applying';
    let prepared = false;
    try {
      const records = await this.recoverJournal();
      if (records.some((r) => r.id === plan.id && r.status !== 'failed'))
        throw new Error('This plan has already been applied.');
      const seen = new Set<string>();
      const copies: Copy[] = selections.map((selection) => {
        if (seen.has(selection.sourceKey))
          throw new Error('One source annotation cannot select multiple occurrences.');
        seen.add(selection.sourceKey);
        const proposal = plan.proposals.find((p) => p.source.key === selection.sourceKey);
        const candidate = proposal?.candidates.find((c) => c.id === selection.candidateID);
        if (
          !proposal ||
          !candidate?.position ||
          !['highlight', 'underline'].includes(proposal.source.type)
        )
          throw new Error('Selected proposal has no verified geometry.');
        return {
          key: this.store.newKey(),
          sourceKey: proposal.source.key,
          type: proposal.source.type as 'highlight' | 'underline',
          text: candidate.text.replace(/\s+/gu, ' ').trim(),
          comment: proposal.source.comment,
          color: proposal.source.color,
          tags: [...proposal.source.tags],
          position: candidate.position,
          pageLabel: candidate.pageLabel,
        };
      });
      for (const record of records.filter(
        (r) =>
          r.status === 'committed' &&
          r.sourceID === plan.source.id &&
          r.targetID === plan.target.id &&
          r.targetFile.hash === plan.target.file.hash,
      )) {
        for (const original of record.originals) {
          const current = plan.source.annotations.find((a) => a.key === original.key);
          const copy = record.created.find((c) => c.sourceKey === original.key);
          if (
            current?.fingerprint === original.fingerprint &&
            seen.has(original.key) &&
            copy &&
            (await this.store.fingerprint(record.libraryID, copy.key)) !== null
          ) {
            throw new Error(
              `Source annotation ${original.key} was already transferred. Undo that operation before copying it again.`,
            );
          }
        }
      }
      const record: TransferRecord = {
        schema: 1,
        id: plan.id,
        date: new Date().toISOString(),
        sourceID: plan.source.id,
        targetID: plan.target.id,
        libraryID: plan.target.libraryID,
        sourceKey: plan.source.key,
        targetKey: plan.target.key,
        sourceFile: plan.source.file,
        targetFile: plan.target.file,
        status: 'prepared',
        copies,
        created: [],
        originals: plan.source.annotations.filter((a) => seen.has(a.key)),
      };
      // Local write-ahead journal joins the file and Zotero transaction across crashes.
      records.push(record);
      await this.store.transaction(async () => {
        const sourceNow = await this.store.snapshot(plan.source.id),
          targetNow = await this.store.snapshot(plan.target.id);
        if (!snapshotEqual(sourceNow, plan.source) || !snapshotEqual(targetNow, plan.target))
          throw new Error('PDF or annotations changed since analysis. Recalculate the plan.');
        await this.store.writeJournal(records);
        prepared = true;
        for (const copy of copies)
          record.created.push(await this.store.create(plan.target.id, copy));
        const sourceLast = await this.store.snapshot(plan.source.id),
          targetLast = await this.store.snapshot(plan.target.id);
        const createdKeys = new Set(record.created.map((c) => c.key));
        targetLast.annotations = targetLast.annotations.filter((a) => !createdKeys.has(a.key));
        if (!snapshotEqual(sourceLast, plan.source) || !snapshotEqual(targetLast, plan.target))
          throw new Error(
            'Documents or annotations changed during application. The operation was rolled back.',
          );
        // Saved fingerprints must be durable before database commit, including a failed final journal write.
        await this.store.writeJournal(records);
      });
      plan.state = 'applied';
      record.status = 'committed';
      try {
        await this.store.writeJournal(records);
      } catch {
        throw new Error(
          'Copies were committed, but the final journal update failed. Reopen MarginCarry to recover the journal; do not reapply.',
        );
      }
      return record;
    } catch (e) {
      if (plan.state !== 'applied') plan.state = prepared ? 'failed' : 'review';
      throw e;
    } finally {
      this.busy = false;
    }
  }

  async undoLast(): Promise<{ id: string; count: number }> {
    if (this.busy) throw new Error('A transfer operation is in progress.');
    this.busy = true;
    try {
      const records = await this.recoverJournal();
      const record = [...records].reverse().find((r) => r.status === 'committed');
      if (!record) throw new Error('No completed transfer to undo.');
      await this.store.transaction(async () => {
        const conflicts: string[] = [];
        for (const copy of record.created) {
          if ((await this.store.fingerprint(record.libraryID, copy.key)) !== copy.fingerprint)
            conflicts.push(copy.key);
        }
        if (conflicts.length)
          throw new Error(
            `Undo conflict: ${conflicts.join(', ')} was edited, moved or deleted. No copies were removed.`,
          );
        record.status = 'undo-prepared';
        await this.store.writeJournal(records);
        record.undoneCreated = [];
        for (const copy of record.created)
          record.undoneCreated.push({
            ...copy,
            fingerprint: await this.store.trash(record.libraryID, copy.key),
          });
        await this.store.writeJournal(records);
      });
      record.status = 'undone';
      await this.store.writeJournal(records);
      return { id: record.id, count: record.created.length };
    } finally {
      this.busy = false;
    }
  }
}
