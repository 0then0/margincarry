import assert from 'node:assert/strict';
import test from 'node:test';
import { ZoteroAdapter } from '../src/zotero.ts';

function fixture(failRefresh = false) {
  const events: string[] = [];
  const item = {
    key: 'OWNED001',
    parentID: 15,
    deleted: false,
    isAnnotation: () => true,
    isAttachment: () => false,
    async save() {
      events.push('save');
    },
    toJSON() {
      return { key: this.key, deleted: this.deleted };
    },
  };
  const reader = (id: number, closed = false) => ({
    itemID: id,
    _isTabClosed: closed,
    _internalReader: {},
    async unsetAnnotations(keys: string[]) {
      events.push(`hide:${id}:${keys.join(',')}`);
      if (failRefresh) throw new Error('View refresh failed');
    },
  });
  Object.assign(globalThis, {
    PathUtils: { join: (...parts: string[]) => parts.join('/') },
    Zotero: {
      DataDirectory: { dir: '/disposable' },
      Items: { getByLibraryAndKey: () => item },
      Reader: { _readers: [reader(15), reader(99), reader(15, true)] },
      logError: () => events.push('log'),
      DB: {
        async executeTransaction<T>(work: () => Promise<T>) {
          const wasDeleted = item.deleted;
          try {
            const result = await work();
            events.push('commit');
            return result;
          } catch (error) {
            item.deleted = wasDeleted;
            events.push('rollback');
            throw error;
          }
        },
      },
    },
  });
  return { adapter: new ZoteroAdapter(), item, events };
}

test('soft undo hides only owned keys in matching readers after database commit', async () => {
  const { adapter, item, events } = fixture();
  await adapter.transaction(() => adapter.trash(1, 'OWNED001'));
  assert.equal(item.deleted, true);
  assert.deepEqual(events, ['save', 'commit', 'hide:15:OWNED001']);
});

test('failed undo transaction leaves reader annotations visible', async () => {
  const { adapter, item, events } = fixture();
  await assert.rejects(
    adapter.transaction(async () => {
      await adapter.trash(1, 'OWNED001');
      throw new Error('Journal failed');
    }),
    /Journal failed/,
  );
  assert.equal(item.deleted, false);
  assert.deepEqual(events, ['save', 'rollback']);
});

test('reader refresh failure reports committed Trash state instead of complete success', async () => {
  const { adapter, item, events } = fixture(true);
  await assert.rejects(
    adapter.transaction(() => adapter.trash(1, 'OWNED001')),
    /Copies are in Trash/,
  );
  assert.equal(item.deleted, true);
  assert.deepEqual(events, ['save', 'commit', 'hide:15:OWNED001', 'log']);
});
