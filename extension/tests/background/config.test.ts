// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/** Regression tests for reviewer finding:
 *  Saved credentials (via Options page) must override build-time env defaults.
 *  We stub the Vite env vars to empty so the "no saved value" path returns
 *  documented defaults regardless of the developer's local .env.
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
    // Neutralise real .env so tests aren't sensitive to a developer's local config.
    vi.stubEnv('VITE_VERIFICATION_SERVER_URL', '')
    vi.stubEnv('VITE_VERIFICATION_TOKEN', '')
    vi.stubEnv('VITE_ANTHROPIC_API_KEY', '')
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
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
