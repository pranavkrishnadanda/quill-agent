import { describe, it, expect, beforeEach } from 'vitest'
import { JobQueue, type QueueItem } from '../../src/background/queue'

describe('JobQueue', () => {
  let q: JobQueue

  beforeEach(() => {
    q = new JobQueue()
  })

  it('add() returns item with pending status and a stable id/url', () => {
    const it = q.add('https://example.com/job/1')
    expect(it.status).toBe('pending')
    expect(it.url).toBe('https://example.com/job/1')
    expect(typeof it.id).toBe('string')
    expect(it.id.length).toBeGreaterThan(0)
    expect(q.get(it.id)).toEqual(it)
  })

  it('update() patches item and preserves other fields', () => {
    const it = q.add('https://example.com/job/2')
    const patched = q.update(it.id, { status: 'processing', tabId: 42 })
    expect(patched).toBeDefined()
    const p = patched as QueueItem
    expect(p.id).toBe(it.id)
    expect(p.url).toBe(it.url)
    expect(p.status).toBe('processing')
    expect(p.tabId).toBe(42)
    // Second patch preserves prior fields
    const patched2 = q.update(it.id, { error: 'boom', status: 'failed' })
    const p2 = patched2 as QueueItem
    expect(p2.tabId).toBe(42)
    expect(p2.url).toBe(it.url)
    expect(p2.status).toBe('failed')
    expect(p2.error).toBe('boom')
  })

  it('update() unknown id returns undefined and does not add', () => {
    const res = q.update('nope', { status: 'ready' })
    expect(res).toBeUndefined()
    expect(q.all()).toHaveLength(0)
  })

  it('get() unknown id returns undefined', () => {
    expect(q.get('missing-id')).toBeUndefined()
  })

  it('all() returns everything that was added', () => {
    const a = q.add('https://example.com/a')
    const b = q.add('https://example.com/b')
    const c = q.add('https://example.com/c')
    const all = q.all()
    expect(all).toHaveLength(3)
    const ids = all.map((i) => i.id).sort()
    expect(ids).toEqual([a.id, b.id, c.id].sort())
  })

  it('clear() empties the queue', () => {
    q.add('https://example.com/x')
    q.add('https://example.com/y')
    expect(q.all()).toHaveLength(2)
    q.clear()
    expect(q.all()).toHaveLength(0)
  })

  it('add() assigns unique ids across items', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 10; i++) ids.add(q.add(`https://example.com/${i}`).id)
    expect(ids.size).toBe(10)
  })
})
