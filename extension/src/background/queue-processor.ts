import type { QueueEntry, QueueStatus } from '../types/queue.js'
import { upsertEntry, loadQueue } from '../lib/queue-store.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('queue-processor')

export interface FillCurrentTabFn { (tabId: number): Promise<{ ok: boolean; filled?: number; skipped?: string[]; fieldsDetected?: number; error?: string }> }

/** Open each pending queue item in a new tab, wait for the content script to be ready, run the fill flow, mark ready.
 *  Leaves the tab open at the review step. */
export async function processQueue(fill: FillCurrentTabFn, opts: { maxConcurrent?: number } = {}): Promise<void> {
  const snap = await loadQueue()
  const pending = snap.entries.filter(e => e.status === 'pending')
  const conc = Math.max(1, Math.min(opts.maxConcurrent ?? 1, 3))
  log.info('processing', { pending: pending.length, conc })
  for (let i = 0; i < pending.length; i += conc) {
    const batch = pending.slice(i, i + conc)
    await Promise.all(batch.map(async (entry) => {
      const patch = (s: QueueStatus, extra: Partial<QueueEntry> = {}) =>
        upsertEntry({ ...entry, status: s, updatedAt: Date.now(), ...extra })
      let currentTabId: number | undefined
      try {
        await patch('opening')
        const tab = await chrome.tabs.create({ url: entry.url, active: false })
        if (!tab.id) throw new Error('tab has no id')
        currentTabId = tab.id
        // Wait for tab to fully load
        await waitForTabLoad(currentTabId)
        await patch('filling', { tabId: currentTabId })
        const r = await fill(currentTabId)
        if (!r.ok) { await patch('failed', { tabId: currentTabId, error: r.error }); return }
        await patch('ready', {
          tabId: currentTabId,
          fieldsDetected: r.fieldsDetected,
          filled: r.filled,
          skipped: r.skipped,
        })
      } catch (e) {
        await patch('failed', { tabId: currentTabId, error: String(e) })
      }
    }))
  }
}

async function waitForTabLoad(tabId: number, timeout = 15000): Promise<void> {
  const start = Date.now()
  return new Promise<void>((resolve, reject) => {
    const listener = (id: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (id === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener)
        resolve()
      }
    }
    chrome.tabs.onUpdated.addListener(listener)
    const iv = setInterval(() => {
      if (Date.now() - start > timeout) {
        clearInterval(iv)
        chrome.tabs.onUpdated.removeListener(listener)
        reject(new Error('tab load timeout'))
      }
    }, 500)
  })
}
