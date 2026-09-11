// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

const QUEUE_HTML = `
  <input id="urlInput" type="url" />
  <button id="addUrl" type="button">Add</button>
  <button id="processAll" type="button">Process pending</button>
  <button id="clearAll" type="button">Clear</button>
  <table id="queueTable">
    <thead><tr><th>URL</th><th>Status</th><th>Filled / Detected</th><th>Error</th><th>Actions</th></tr></thead>
    <tbody></tbody>
  </table>
`

const flush = () => new Promise<void>((r) => setTimeout(r, 0))

// Stub chrome.storage.local backed by an in-memory map so createStorage() picks
// the ChromeStorage path and state persists across the module's createStorage() calls.
function installChromeStub(): void {
  const mem = new Map<string, unknown>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub of browser API
  ;(globalThis as any).chrome = {
    runtime: {
      sendMessage: async () => ({ ok: true }),
    },
    storage: {
      local: {
        get: async (k: string) => {
          const out: Record<string, unknown> = {}
          if (mem.has(k)) out[k] = mem.get(k)
          return out
        },
        set: async (obj: Record<string, unknown>) => {
          for (const [k, v] of Object.entries(obj)) mem.set(k, v)
        },
        remove: async (k: string) => {
          mem.delete(k)
        },
        clear: async () => {
          mem.clear()
        },
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub of browser API
  } as any
  // Ensure crypto.randomUUID exists in jsdom.
  if (!globalThis.crypto || typeof globalThis.crypto.randomUUID !== 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub
    ;(globalThis as any).crypto = {
      ...(globalThis.crypto ?? {}),
      randomUUID: () => `id-${Math.random().toString(36).slice(2)}-${Date.now()}`,
    }
  }
}

async function loadModule(): Promise<typeof import('../../src/popup/queue-view.ts')> {
  vi.resetModules()
  return import('../../src/popup/queue-view.ts')
}

describe('queue-view', () => {
  beforeEach(() => {
    document.body.innerHTML = QUEUE_HTML
    installChromeStub()
  })

  it('renders an empty tbody when the queue is empty', async () => {
    await loadModule()
    await flush()
    const tbody = document.querySelector('#queueTable tbody') as HTMLTableSectionElement
    expect(tbody.children.length).toBe(0)
  })

  it('populates a row with URL and pending status after upsertEntry + render', async () => {
    await loadModule()
    const { upsertEntry } = await import('../../src/lib/queue-store.ts')
    const now = Date.now()
    await upsertEntry({
      id: 'test-1',
      url: 'https://boards.greenhouse.io/example/jobs/1',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    })
    // Trigger the module's render() via the exposed clearAll->render path is destructive;
    // instead click the addUrl button after emptying input to force a no-op render? No —
    // simplest is to fire the interval-driven render by invoking clearAll after adding a
    // fresh entry (would delete). Use processAll instead, which calls render() without
    // mutating storage (background sendMessage is stubbed).
    ;(document.getElementById('processAll') as HTMLButtonElement).click()
    await flush()
    await flush()
    const tbody = document.querySelector('#queueTable tbody') as HTMLTableSectionElement
    expect(tbody.children.length).toBe(1)
    const row = tbody.children[0] as HTMLTableRowElement
    expect(row.textContent).toContain('https://boards.greenhouse.io/example/jobs/1')
    expect(row.textContent).toContain('pending')
  })

  it('empties the table when #clearAll is clicked', async () => {
    await loadModule()
    const { upsertEntry } = await import('../../src/lib/queue-store.ts')
    const now = Date.now()
    await upsertEntry({
      id: 'test-2',
      url: 'https://jobs.lever.co/example/abc',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    })
    ;(document.getElementById('processAll') as HTMLButtonElement).click()
    await flush()
    await flush()
    const tbody = document.querySelector('#queueTable tbody') as HTMLTableSectionElement
    expect(tbody.children.length).toBe(1)

    ;(document.getElementById('clearAll') as HTMLButtonElement).click()
    await flush()
    await flush()
    expect(tbody.children.length).toBe(0)
  })

  it('creates a pending entry when #addUrl is clicked with non-empty input', async () => {
    await loadModule()
    const input = document.getElementById('urlInput') as HTMLInputElement
    input.value = 'https://jobs.ashbyhq.com/example/job-xyz'
    ;(document.getElementById('addUrl') as HTMLButtonElement).click()
    await flush()
    await flush()
    const tbody = document.querySelector('#queueTable tbody') as HTMLTableSectionElement
    expect(tbody.children.length).toBe(1)
    const row = tbody.children[0] as HTMLTableRowElement
    expect(row.textContent).toContain('https://jobs.ashbyhq.com/example/job-xyz')
    expect(row.textContent).toContain('pending')
    // Input should be cleared after submission.
    expect(input.value).toBe('')
  })

  it('ignores #addUrl clicks when the input is empty', async () => {
    await loadModule()
    const input = document.getElementById('urlInput') as HTMLInputElement
    input.value = '   '
    ;(document.getElementById('addUrl') as HTMLButtonElement).click()
    await flush()
    await flush()
    const tbody = document.querySelector('#queueTable tbody') as HTMLTableSectionElement
    expect(tbody.children.length).toBe(0)
  })
})
