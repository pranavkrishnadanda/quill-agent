import { beforeEach, describe, expect, it, vi } from 'vitest'
import { processQueue, type FillCurrentTabFn } from '../../src/background/queue-processor'
import { loadQueue, saveQueue } from '../../src/lib/queue-store'
import type { QueueEntry } from '../../src/types/queue'

// chrome.tabs and chrome.storage are I/O boundaries — stub them here.
type StorageRecord = Record<string, unknown>
type UpdateListener = (
  tabId: number,
  changeInfo: { status?: string },
  tab?: unknown,
) => void

interface ChromeStub {
  storage: {
    local: {
      get(key: string): Promise<StorageRecord>
      set(items: StorageRecord): Promise<void>
      remove(key: string): Promise<void>
      clear(): Promise<void>
    }
  }
  tabs: {
    create(props: { url: string; active?: boolean }): Promise<{ id: number }>
    onUpdated: {
      addListener(l: UpdateListener): void
      removeListener(l: UpdateListener): void
    }
  }
}

const mem: StorageRecord = {}
let listeners: UpdateListener[] = []
let nextTabId = 100
const createdTabs: Array<{ id: number; url: string }> = []
let createDelay = 0

function installChromeStub(): void {
  const stub: ChromeStub = {
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
    tabs: {
      async create(props: { url: string; active?: boolean }): Promise<{ id: number }> {
        if (createDelay > 0) await new Promise((r) => setTimeout(r, createDelay))
        const id = nextTabId++
        createdTabs.push({ id, url: props.url })
        // Fire 'complete' after tabs.create returns so waitForTabLoad resolves.
        setTimeout(() => {
          for (const l of [...listeners]) l(id, { status: 'complete' }, undefined)
        }, 0)
        return { id }
      },
      onUpdated: {
        addListener(l: UpdateListener): void {
          listeners.push(l)
        },
        removeListener(l: UpdateListener): void {
          listeners = listeners.filter((x) => x !== l)
        },
      },
    },
  }
  ;(globalThis as unknown as { chrome: ChromeStub }).chrome = stub
}

installChromeStub()

function entry(id: string, overrides: Partial<QueueEntry> = {}): QueueEntry {
  return {
    id,
    url: `https://example.com/jobs/${id}`,
    status: 'pending',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

describe('processQueue', () => {
  beforeEach(async () => {
    for (const k of Object.keys(mem)) delete mem[k]
    listeners = []
    createdTabs.length = 0
    nextTabId = 100
    createDelay = 0
  })

  it('empty queue → returns immediately without creating any tabs', async () => {
    const fill: FillCurrentTabFn = vi.fn(async () => ({ ok: true }))
    await processQueue(fill)
    expect(createdTabs).toHaveLength(0)
    expect(fill).not.toHaveBeenCalled()
  })

  it('one pending entry → tab created and entry marked ready with filled count', async () => {
    await saveQueue({ entries: [entry('a')] })
    const fill: FillCurrentTabFn = vi.fn(async (_tabId: number) => ({
      ok: true,
      filled: 4,
      fieldsDetected: 6,
      skipped: ['s1'],
    }))
    await processQueue(fill)
    expect(createdTabs).toHaveLength(1)
    expect(createdTabs[0].url).toBe('https://example.com/jobs/a')
    expect(fill).toHaveBeenCalledTimes(1)
    expect(fill).toHaveBeenCalledWith(createdTabs[0].id)
    const snap = await loadQueue()
    expect(snap.entries).toHaveLength(1)
    const e = snap.entries[0]
    expect(e.status).toBe('ready')
    expect(e.filled).toBe(4)
    expect(e.fieldsDetected).toBe(6)
    expect(e.skipped).toEqual(['s1'])
    expect(e.tabId).toBe(createdTabs[0].id)
  })

  it('fill returns { ok:false, error } → entry marked failed with error', async () => {
    await saveQueue({ entries: [entry('bad')] })
    const fill: FillCurrentTabFn = vi.fn(async () => ({ ok: false, error: 'x' }))
    await processQueue(fill)
    const snap = await loadQueue()
    expect(snap.entries).toHaveLength(1)
    expect(snap.entries[0].status).toBe('failed')
    expect(snap.entries[0].error).toBe('x')
  })

  it('maxConcurrent=1 processes sequentially (no overlap)', async () => {
    await saveQueue({
      entries: [entry('a'), entry('b'), entry('c')],
    })
    let inFlight = 0
    let peak = 0
    const fill: FillCurrentTabFn = vi.fn(async () => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, 10))
      inFlight -= 1
      return { ok: true, filled: 1 }
    })
    await processQueue(fill, { maxConcurrent: 1 })
    expect(fill).toHaveBeenCalledTimes(3)
    expect(peak).toBe(1)
    const snap = await loadQueue()
    expect(snap.entries.every((e) => e.status === 'ready')).toBe(true)
  })

  it('maxConcurrent=2 processes two in parallel', async () => {
    await saveQueue({
      entries: [entry('a'), entry('b'), entry('c'), entry('d')],
    })
    let inFlight = 0
    let peak = 0
    const fill: FillCurrentTabFn = vi.fn(async () => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, 15))
      inFlight -= 1
      return { ok: true, filled: 2 }
    })
    await processQueue(fill, { maxConcurrent: 2 })
    expect(fill).toHaveBeenCalledTimes(4)
    expect(peak).toBe(2)
    const snap = await loadQueue()
    expect(snap.entries.every((e) => e.status === 'ready')).toBe(true)
  })
})
