import assert from 'node:assert/strict';
import test from 'node:test';
import type { Copy, Created, Plan, Snapshot, Store, TransferRecord } from '../src/model.ts';
import { TransferService } from '../src/transfer.ts';

function fixture() {
  const annotation = {
    key: 'OLDKEY01',
    type: 'highlight',
    text: 'old text',
    comment: 'do not alter',
    color: '#ffd400',
    tags: ['one', 'two'],
    position: { pageIndex: 0, rects: [[1, 2, 8, 12]] },
    external: false,
    fingerprint: 'old fingerprint',
  };
  const source: Snapshot = {
    id: 1,
    key: 'PDFOLD01',
    parentID: 9,
    libraryID: 1,
    title: 'old',
    itemFingerprint: 'old item',
    file: { path: 'old.pdf', hash: 'old hash', size: 10, modified: 1 },
    annotations: [annotation],
  } as Snapshot;
  const target: Snapshot = {
    ...structuredClone(source),
    id: 2,
    key: 'PDFNEW01',
    title: 'new',
    itemFingerprint: 'new item',
    annotations: [],
  };
  const plan: Plan = {
    id: 'plan-1',
    source: structuredClone(source),
    target: structuredClone(target),
    state: 'review',
    proposals: [
      {
        source: annotation,
        status: 'unique candidate',
        reason: 'one',
        sourcePrefix: '',
        sourceSuffix: '',
        truncated: false,
        recommendedID: '3:1:9',
        candidates: [
          {
            id: '3:1:9',
            pageIndex: 3,
            pageLabel: 'iv',
            start: 1,
            end: 9,
            text: 'new\ntext',
            prefix: '',
            suffix: '',
            method: 'normalized',
            contextMatches: false,
            position: { pageIndex: 3, rects: [[10, 20, 100, 30]] },
            geometryError: null,
          },
        ],
      },
    ],
  };
  const store = new MemoryStore(source, target);
  return {
    store,
    plan,
    service: new TransferService(store),
    selected: [{ sourceKey: 'OLDKEY01', candidateID: '3:1:9' }],
  };
}
class MemoryStore implements Store {
  rows = new Map<string, string>([['EXISTING', 'existing fingerprint']]);
  records: TransferRecord[] = [];
  copies: Copy[] = [];
  failAt = 0;
  key = 0;
  writeCount = 0;
  failWriteOn = 0;
  source: Snapshot;
  target: Snapshot;
  constructor(source: Snapshot, target: Snapshot) {
    this.source = source;
    this.target = target;
  }
  async snapshot(id: number) {
    return structuredClone(id === 1 ? this.source : this.target);
  }
  async transaction<T>(work: () => Promise<T>): Promise<T> {
    const before = new Map(this.rows),
      copies = [...this.copies];
    try {
      return await work();
    } catch (e) {
      this.rows = before;
      this.copies = copies;
      throw e;
    }
  }
  newKey() {
    return `NEWKEY${++this.key}`;
  }
  async create(_id: number, copy: Copy): Promise<Created> {
    if (this.failAt === this.copies.length + 1) throw new Error('write failed');
    this.copies.push(structuredClone(copy));
    this.rows.set(copy.key, JSON.stringify(copy));
    return { key: copy.key, sourceKey: copy.sourceKey, fingerprint: JSON.stringify(copy) };
  }
  async fingerprint(_lib: number, key: string) {
    return this.rows.get(key) ?? null;
  }
  async trash(_lib: number, key: string) {
    this.rows.set(key, 'trashed');
    return 'trashed';
  }
  async readJournal() {
    return structuredClone(this.records);
  }
  async writeJournal(records: TransferRecord[]) {
    if (++this.writeCount === this.failWriteOn) throw new Error('journal write failed');
    this.records = structuredClone(records);
  }
}
test('copy retains comment, color and tags and uses actual new text and a fresh key', async () => {
  const { service, store, plan, selected } = fixture();
  const original = structuredClone(store.source);
  const r = await service.apply(plan, selected);
  assert.equal(r.status, 'committed');
  assert.equal(store.copies[0]!.text, 'new text');
  assert.equal(store.copies[0]!.comment, 'do not alter');
  assert.deepEqual(store.copies[0]!.tags, ['one', 'two']);
  assert.equal(store.copies[0]!.color, '#ffd400');
  assert.notEqual(store.copies[0]!.key, 'OLDKEY01');
  assert.deepEqual(store.source, original);
  assert.equal(store.rows.get('EXISTING'), 'existing fingerprint');
});
test('changed file invalidates the analyzed plan', async () => {
  const { service, store, plan, selected } = fixture();
  store.target.file.hash = 'changed';
  await assert.rejects(service.apply(plan, selected), /changed since analysis/);
  assert.equal(store.copies.length, 0);
});
test('changed original annotation invalidates the plan', async () => {
  const { service, store, plan, selected } = fixture();
  store.source.annotations[0]!.comment = 'edited';
  await assert.rejects(service.apply(plan, selected), /changed since analysis/);
  assert.equal(store.copies.length, 0);
});
test('concurrent clicks and repeated application create one set of copies', async () => {
  const { service, store, plan, selected } = fixture();
  const first = service.apply(plan, selected);
  await assert.rejects(service.apply(plan, selected), /busy/);
  await first;
  await assert.rejects(service.apply(plan, selected), /applied/);
  assert.equal(store.copies.length, 1);
});
test('a write error rolls back the whole set and recovers a failed journal', async () => {
  const { service, store, plan, selected } = fixture();
  const p = structuredClone(plan.proposals[0]!);
  p.source.key = 'OLDKEY02';
  store.source.annotations.push(p.source);
  plan.source = structuredClone(store.source);
  plan.proposals.push(p);
  store.failAt = 2;
  await assert.rejects(
    service.apply(plan, [...selected, { sourceKey: 'OLDKEY02', candidateID: '3:1:9' }]),
    /write failed/,
  );
  assert.equal(store.copies.length, 0);
  assert.equal(store.rows.size, 1);
  assert.equal((await service.journal())[0]!.status, 'failed');
});
test('different source keys with identical quotes remain independent', async () => {
  const { service, store, plan, selected } = fixture();
  const p = structuredClone(plan.proposals[0]!);
  p.source.key = 'OLDKEY02';
  store.source.annotations.push(p.source);
  plan.source = structuredClone(store.source);
  plan.proposals.push(p);
  await service.apply(plan, [...selected, { sourceKey: 'OLDKEY02', candidateID: '3:1:9' }]);
  assert.equal(store.copies.length, 2);
});
test('journal blocks reapplication after restart or recalculation', async () => {
  const { service, store, plan, selected } = fixture();
  await service.apply(plan, selected);
  const again = structuredClone(plan);
  again.id = 'new plan';
  again.state = 'review';
  await assert.rejects(new TransferService(store).apply(again, selected), /already transferred/);
  assert.equal(store.copies.length, 1);
});
test('one source cannot silently combine multiple quote occurrences', async () => {
  const { service, plan, selected } = fixture();
  await assert.rejects(service.apply(plan, [...selected, ...selected]), /multiple occurrences/);
});
test('a candidate with no reliable geometry cannot be written', async () => {
  const { service, plan, selected } = fixture();
  plan.proposals[0]!.candidates[0]!.position = null;
  await assert.rejects(service.apply(plan, selected), /verified geometry/);
});
test('undo trashes only the operation copies', async () => {
  const { service, store, plan, selected } = fixture();
  await service.apply(plan, selected);
  const result = await service.undoLast();
  assert.equal(result.count, 1);
  assert.equal(store.rows.get('NEWKEY1'), 'trashed');
  assert.equal(store.rows.get('EXISTING'), 'existing fingerprint');
  assert.equal(store.records[0]!.status, 'undone');
});
test('edited copy stops undo before anything is removed', async () => {
  const { service, store, plan, selected } = fixture();
  await service.apply(plan, selected);
  store.rows.set('NEWKEY1', 'edited');
  await assert.rejects(service.undoLast(), /Undo conflict/);
  assert.equal(store.rows.get('NEWKEY1'), 'edited');
  assert.equal(store.records[0]!.status, 'committed');
});
test('prepared journal with durable saved fingerprints recovers committed copies', async () => {
  const { service, store, plan, selected } = fixture();
  await service.apply(plan, selected);
  store.records[0]!.status = 'prepared';
  assert.equal((await new TransferService(store).journal())[0]!.status, 'committed');
});

test('a final journal failure after commit recovers without allowing duplicate application', async () => {
  const { service, store, plan, selected } = fixture();
  store.failWriteOn = 3;
  await assert.rejects(service.apply(plan, selected), /Copies were committed/);
  assert.equal(store.copies.length, 1);
  assert.equal(plan.state, 'applied');
  assert.equal((await new TransferService(store).journal())[0]!.status, 'committed');
});
test('a failed final undo journal update recovers the already trashed copies', async () => {
  const { service, store, plan, selected } = fixture();
  await service.apply(plan, selected);
  store.failWriteOn = 6;
  await assert.rejects(service.undoLast(), /journal write failed/);
  assert.equal(store.rows.get('NEWKEY1'), 'trashed');
  assert.equal((await new TransferService(store).journal())[0]!.status, 'undone');
});
test('journal failure inside undo rolls back deletion and recovers committed state', async () => {
  const { service, store, plan, selected } = fixture();
  await service.apply(plan, selected);
  const original = store.rows.get('NEWKEY1');
  store.failWriteOn = 5;
  await assert.rejects(service.undoLast(), /journal write failed/);
  assert.equal(store.rows.get('NEWKEY1'), original);
  assert.equal((await new TransferService(store).journal())[0]!.status, 'committed');
});
test('a file changed while writing rolls back every newly created annotation', async () => {
  const { service, store, plan, selected } = fixture();
  const create = store.create.bind(store);
  store.create = async (...args) => {
    const result = await create(...args);
    store.target.file.hash = 'changed during write';
    return result;
  };
  await assert.rejects(service.apply(plan, selected), /changed during application/);
  assert.equal(store.copies.length, 0);
  assert.equal(store.rows.get('EXISTING'), 'existing fingerprint');
});

test('window initialization cannot recover the journal of an active apply', async () => {
  const { store, service, plan, selected } = fixture();
  let release: () => void = () => {};
  let entered: () => void = () => {};
  const held = new Promise<void>((r) => {
    release = r;
  });
  const started = new Promise<void>((r) => {
    entered = r;
  });
  const create = store.create.bind(store);
  store.create = async (id, copy) => {
    entered();
    await held;
    return create(id, copy);
  };
  const applying = service.apply(plan, selected);
  await started;
  await assert.rejects(service.journal(), /operation is in progress/);
  assert.equal(store.records[0]!.status, 'prepared');
  release();
  await applying;
  assert.equal(store.records[0]!.status, 'committed');
  assert.equal(store.records[0]!.created.length, 1);
  await assert.rejects(
    service.apply({ ...plan, id: 'recalculated', state: 'review' }, selected),
    /already transferred/,
  );
  await service.undoLast();
  assert.equal(store.records[0]!.status, 'undone');
  assert.equal(store.copies.length, 1);
});

test('window initialization cannot recover an active undo', async () => {
  const { store, service, plan, selected } = fixture();
  await service.apply(plan, selected);
  let release: () => void = () => {};
  let entered: () => void = () => {};
  const held = new Promise<void>((r) => {
    release = r;
  });
  const started = new Promise<void>((r) => {
    entered = r;
  });
  const trash = store.trash.bind(store);
  store.trash = async (library, key) => {
    entered();
    await held;
    return trash(library, key);
  };
  const undoing = service.undoLast();
  await started;
  await assert.rejects(service.journal(), /operation is in progress/);
  release();
  await undoing;
  assert.equal(store.records[0]!.status, 'undone');
});

test('public recovery locks out apply and releases its lock after a read error', async () => {
  const { store, service, plan, selected } = fixture();
  let release: () => void = () => {};
  const held = new Promise<void>((r) => {
    release = r;
  });
  const read = store.readJournal.bind(store);
  store.readJournal = async () => {
    await held;
    throw new Error('read failed');
  };
  const recovering = service.journal();
  await assert.rejects(service.apply(plan, selected), /busy/);
  release();
  await assert.rejects(recovering, /read failed/);
  store.readJournal = read;
  await service.apply(plan, selected);
  assert.equal(store.records[0]!.status, 'committed');
});
