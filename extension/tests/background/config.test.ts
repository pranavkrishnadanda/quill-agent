// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

/** Regression tests for reviewer finding:
 *  Saved credentials (via Options page) must override build-time env defaults.
 */
function installChromeStub(seed: Record<string, unknown> = {}): Map<string, unknown> {
  const store = new Map(Object.entries(seed))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).chrome = {
    storage: {
      local: {
        get: async (k: string) => (store.has(k) ? { [k]: store.get(k) } : {}),
        set: async (obj: Record<string, unknown>) => {
          for (const [k, v] of Object.entries(obj)) store.set(k, v)
        },
        remove: async (k: string) => { store.delete(k) },
        clear: async () => { store.clear() },
      },
    },
  }
  return store
}

describe('loadRuntimeConfig', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns env defaults when nothing is saved in chrome.storage', async () => {
    installChromeStub()
    const { loadRuntimeConfig } = await import('../../src/background/config.ts')
    const cfg = await loadRuntimeConfig()
    // Build-time default (see config.ts envDefaults() fallback).
    expect(cfg.verificationServerUrl).toBe('http://127.0.0.1:8787')
    expect(cfg.verificationToken).toBe('')
    expect(cfg.anthropicApiKey).toBeNull()
  })

  it('saved serverUrl overrides the env default', async () => {
    installChromeStub({
      serverUrl: 'https://mac.local:9000',
    })
    const { loadRuntimeConfig } = await import('../../src/background/config.ts')
    const cfg = await loadRuntimeConfig()
    expect(cfg.verificationServerUrl).toBe('https://mac.local:9000')
  })

  it('saved authToken and anthropicKey override defaults', async () => {
    installChromeStub({
      authToken: 'saved-bearer-token',
      anthropicKey: 'sk-ant-saved-abc',
    })
    const { loadRuntimeConfig } = await import('../../src/background/config.ts')
    const cfg = await loadRuntimeConfig()
    expect(cfg.verificationToken).toBe('saved-bearer-token')
    expect(cfg.anthropicApiKey).toBe('sk-ant-saved-abc')
  })

  it('whitespace-only saved value falls back to the env default', async () => {
    installChromeStub({
      serverUrl: '   ',
      authToken: '   ',
      anthropicKey: '   ',
    })
    const { loadRuntimeConfig } = await import('../../src/background/config.ts')
    const cfg = await loadRuntimeConfig()
    expect(cfg.verificationServerUrl).toBe('http://127.0.0.1:8787')
    expect(cfg.verificationToken).toBe('')
    expect(cfg.anthropicApiKey).toBeNull()
  })
})
