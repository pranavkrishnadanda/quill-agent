import { loadQueue, upsertEntry, clearQueue } from '../lib/queue-store.js'
import { sendToBackground } from '../lib/messaging.js'
import type { QueueEntry } from '../types/queue.js'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

async function render(): Promise<void> {
  const snap = await loadQueue()
  const tbody = $<HTMLTableSectionElement>('queueTable').querySelector('tbody')!
  tbody.innerHTML = ''
  for (const e of snap.entries) {
    const tr = document.createElement('tr')
    tr.innerHTML = `<td>${e.url}</td><td><span class="status status-${e.status}">${e.status}</span></td><td>${e.filled ?? '-'} / ${e.fieldsDetected ?? '-'}</td><td>${e.error ?? ''}</td>`
    tbody.appendChild(tr)
  }
}

$<HTMLButtonElement>('addUrl').addEventListener('click', async () => {
  const url = $<HTMLInputElement>('urlInput').value.trim()
  if (!url) return
  const now = Date.now()
  const entry: QueueEntry = { id: crypto.randomUUID(), url, status: 'pending', createdAt: now, updatedAt: now }
  await upsertEntry(entry)
  $<HTMLInputElement>('urlInput').value = ''
  render()
})

$<HTMLButtonElement>('processAll').addEventListener('click', async () => {
  await sendToBackground({ type: 'process-queue', payload: {} })
  render()
})

$<HTMLButtonElement>('clearAll').addEventListener('click', async () => { await clearQueue(); render() })

render()
setInterval(render, 2000)
