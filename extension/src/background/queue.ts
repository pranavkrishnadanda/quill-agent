export interface QueueItem {
  id: string
  url: string
  status: 'pending' | 'processing' | 'ready' | 'failed'
  error?: string
  tabId?: number
}

export class JobQueue {
  private items = new Map<string, QueueItem>()

  add(url: string): QueueItem {
    const id = crypto.randomUUID()
    const it: QueueItem = { id, url, status: 'pending' }
    this.items.set(id, it)
    return it
  }

  update(id: string, patch: Partial<QueueItem>): QueueItem | undefined {
    const cur = this.items.get(id)
    if (!cur) return
    const next = { ...cur, ...patch }
    this.items.set(id, next)
    return next
  }

  get(id: string): QueueItem | undefined {
    return this.items.get(id)
  }

  all(): QueueItem[] {
    return Array.from(this.items.values())
  }

  clear(): void {
    this.items.clear()
  }
}
