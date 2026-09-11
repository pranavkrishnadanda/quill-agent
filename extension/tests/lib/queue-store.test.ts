import { beforeEach, describe, expect, it } from 'vitest'
import { clearQueue, loadQueue, saveQueue, upsertEntry } from '../../src/lib/queue-store'
import type { QueueEntry, QueueSnapshot } from '../../src/types/queue'

// Back createStorage() with a persistent shared chrome.storage.local stub so
// that the queue-store's per-call createStorage() invocations share state.
// (chrome.storage is a browser I/O boundary, stubbed here just like chrome.runtime.)
type StorageRecord = Record<string, unknown>
const mem: StorageRecord = {}
;(globalThis as unknown as { chrome: unknown }).chrome = {
  storage: {
    local: {
      async get(key: string): Promise<StorageRecord> {
        return key in mem ? { [key]: mem[key] } : {}
      },
      async set(items: StorageRecord): Promise<void> {
        for (const [k, v] of Object.entries(items)) mem[k] = v
      },
      async remove(key: string): Promise<void> {
        delete mem[key]
      },
      async clear(): Promise<void> {
        for (const k of Object.keys(mem)) delete mem[k]
      },
    },
  },
}

function makeEntry(id: string, overrides: Partial<QueueEntry> = {}): QueueEntry {
  return {
    id,
    url: `https://example.com/jobs/${id}`,
    status: 'pending',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

describe('queue-store', () => {
  beforeEach(async () => {
    for (const k of Object.keys(mem)) delete mem[k]
  })

  it('loadQueue on empty storage returns { entries: [] }', async () => {
    const snap = await loadQueue()
    expect(snap).toEqual({ entries: [] })
  })

  it('saveQueue then loadQueue roundtrip', async () => {
    const snap: QueueSnapshot = { entries: [makeEntry('a'), makeEntry('b', { status: 'ready' })] }
    await saveQueue(snap)
    const loaded = await loadQueue()
    expect(loaded).toEqual(snap)
  })

  it('upsertEntry inserts a new entry', async () => {
    await upsertEntry(makeEntry('a'))
    const snap = await loadQueue()
    expect(snap.entries).toHaveLength(1)
    expect(snap.entries[0].id).toBe('a')
  })

  it('upsertEntry updates an existing entry by id', async () => {
    await upsertEntry(makeEntry('a', { status: 'pending' }))
    await upsertEntry(makeEntry('a', { status: 'ready', filled: 3, updatedAt: 42 }))
    const snap = await loadQueue()
    expect(snap.entries).toHaveLength(1)
    expect(snap.entries[0].status).toBe('ready')
    expect(snap.entries[0].filled).toBe(3)
    expect(snap.entries[0].updatedAt).toBe(42)
  })

  it('clearQueue empties the queue', async () => {
    await upsertEntry(makeEntry('a'))
    await upsertEntry(makeEntry('b'))
    await clearQueue()
    const snap = await loadQueue()
    expect(snap).toEqual({ entries: [] })
  })

  it('multiple upserts preserve insertion order', async () => {
    await upsertEntry(makeEntry('a'))
    await upsertEntry(makeEntry('b'))
    await upsertEntry(makeEntry('c'))
    await upsertEntry(makeEntry('b', { status: 'filling' }))
    const snap = await loadQueue()
    expect(snap.entries.map(e => e.id)).toEqual(['a', 'b', 'c'])
    expect(snap.entries[1].status).toBe('filling')
  })
})
