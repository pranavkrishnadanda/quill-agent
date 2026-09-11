import { describe, expect, it } from 'vitest'
import { createStorage } from '../../src/lib/storage'

describe('createStorage (MemoryStorage in jsdom)', () => {
  it('set + get roundtrip', async () => {
    const s = createStorage()
    await s.set('k', { a: 1, b: 'two' })
    const v = await s.get<{ a: number; b: string }>('k')
    expect(v).toEqual({ a: 1, b: 'two' })
  })

  it('remove clears one key without affecting others', async () => {
    const s = createStorage()
    await s.set('a', 1)
    await s.set('b', 2)
    await s.remove('a')
    expect(await s.get('a')).toBeUndefined()
    expect(await s.get<number>('b')).toBe(2)
  })

  it('clear empties all keys', async () => {
    const s = createStorage()
    await s.set('a', 1)
    await s.set('b', 2)
    await s.clear()
    expect(await s.get('a')).toBeUndefined()
    expect(await s.get('b')).toBeUndefined()
  })

  it('get returns undefined for missing key', async () => {
    const s = createStorage()
    expect(await s.get('nope')).toBeUndefined()
  })
})
