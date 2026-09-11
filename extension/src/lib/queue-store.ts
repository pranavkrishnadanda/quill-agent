import { createStorage } from './storage.js'
import type { QueueEntry, QueueSnapshot } from '../types/queue.js'

const KEY = 'queue.v1'

export async function loadQueue(): Promise<QueueSnapshot> {
  const store = createStorage()
  const snap = await store.get<QueueSnapshot>(KEY)
  return snap ?? { entries: [] }
}

export async function saveQueue(snap: QueueSnapshot): Promise<void> {
  const store = createStorage()
  await store.set(KEY, snap)
}

export async function upsertEntry(entry: QueueEntry): Promise<void> {
  const snap = await loadQueue()
  const idx = snap.entries.findIndex(e => e.id === entry.id)
  if (idx >= 0) snap.entries[idx] = entry
  else snap.entries.push(entry)
  await saveQueue(snap)
}

export async function clearQueue(): Promise<void> { await saveQueue({ entries: [] }) }
