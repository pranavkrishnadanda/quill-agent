import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLogger, readLogRing, type LogEntry } from '../../src/lib/logger'

// Chrome storage stub shared across createStorage() instances so the ring
// persists between emit() and readLogRing() — mirrors the real MV3 sink.
// Cast via `unknown` to sidestep @types/chrome's overloaded signatures.
const RING_MAX = 200

function installChromeStub(): Map<string, unknown> {
  const backing = new Map<string, unknown>()
  const stub = {
    storage: {
      local: {
        async get(k: string) {
          return backing.has(k) ? { [k]: backing.get(k) } : {}
        },
        async set(o: Record<string, unknown>) {
          for (const [k, v] of Object.entries(o)) backing.set(k, v)
        },
        async remove(k: string) {
          backing.delete(k)
        },
        async clear() {
          backing.clear()
        },
      },
    },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).chrome = stub
  return backing
}

// Wait for the fire-and-forget pushToRing() microtasks to flush.
async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve()
  await new Promise((r) => setTimeout(r, 0))
}

describe('logger ring sink', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    installChromeStub()
    consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).chrome = undefined
    void consoleSpy
  })

  it('records scope + level for a single log call', async () => {
    const log = createLogger('scopeA')
    log.info('hello', 42)
    await flush()
    const ring: LogEntry[] = await readLogRing()
    expect(ring.length).toBe(1)
    expect(ring[0]!.scope).toBe('scopeA')
    expect(ring[0]!.level).toBe('info')
    expect(ring[0]!.args).toEqual(['hello', '42'])
    expect(typeof ring[0]!.ts).toBe('number')
  })

  it('caps ring at RING_MAX (205 -> 200, oldest shifted out)', async () => {
    const log = createLogger('capScope')
    for (let i = 0; i < 205; i++) log.info('n', i)
    await flush()
    const ring = await readLogRing()
    expect(ring.length).toBe(RING_MAX)
    // Oldest 5 entries dropped, so the first surviving arg is "5".
    expect(ring[0]!.args[1]).toBe('5')
    expect(ring[ring.length - 1]!.args[1]).toBe('204')
  })

  it('does not throw when serializing a circular reference', async () => {
    interface Cyc { self?: Cyc; name: string }
    const cyc: Cyc = { name: 'root' }
    cyc.self = cyc
    const log = createLogger('cycScope')
    expect(() => log.warn('bad', cyc)).not.toThrow()
    await flush()
    const ring = await readLogRing()
    expect(ring.length).toBe(1)
    expect(ring[0]!.scope).toBe('cycScope')
    expect(ring[0]!.level).toBe('warn')
    // First arg is a plain string; second arg is the circular object — safeStringify
    // falls back through JSON.stringify (throws) into String(x) which yields
    // '[object Object]'. We only assert it didn't throw and produced *some* string.
    expect(ring[0]!.args[0]).toBe('bad')
    expect(typeof ring[0]!.args[1]).toBe('string')
  })

  it('writes entries for multiple loggers with different scopes', async () => {
    const a = createLogger('alpha')
    const b = createLogger('beta')
    a.info('from-a')
    b.error('from-b')
    a.debug('from-a-2')
    await flush()
    const ring = await readLogRing()
    expect(ring.length).toBe(3)
    const byScope = ring.map((e) => ({ scope: e.scope, level: e.level }))
    expect(byScope).toEqual([
      { scope: 'alpha', level: 'info' },
      { scope: 'beta', level: 'error' },
      { scope: 'alpha', level: 'debug' },
    ])
  })
})
