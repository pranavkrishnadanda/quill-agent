export type QueueStatus = 'pending' | 'opening' | 'filling' | 'ready' | 'failed'

export interface QueueEntry {
  id: string
  url: string
  status: QueueStatus
  error?: string
  tabId?: number
  fieldsDetected?: number
  filled?: number
  skipped?: string[]
  createdAt: number
  updatedAt: number
}

export interface QueueSnapshot {
  entries: QueueEntry[]
}
