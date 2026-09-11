// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

const OPTIONS_HTML = `
  <form id="options-form">
    <input id="server-url" type="url" />
    <input id="auth-token" type="password" />
    <input id="anthropic-key" type="password" />
    <textarea id="resume-json"></textarea>
    <p id="resume-error" hidden></p>
    <button type="submit" id="save-button">Save</button>
    <span id="status-message"></span>
  </form>
`

const DEFAULT_SERVER = 'http://127.0.0.1:8787'

const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

function installChromeStub(): Map<string, unknown> {
  const store = new Map<string, unknown>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).chrome = {
    storage: {
      local: {
        get: async (k: string) => {
          const v = store.get(k)
          return v === undefined ? {} : { [k]: v }
        },
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

function submitForm(): void {
  const form = document.getElementById('options-form') as HTMLFormElement
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

describe('options page', () => {
  beforeEach(() => {
    document.body.innerHTML = OPTIONS_HTML
    installChromeStub()
    vi.useRealTimers()
    vi.resetModules()
  })

  it('initial load populates fields with defaults', async () => {
    await import('../../src/options/options.ts')
    await flush()
    expect((document.getElementById('server-url') as HTMLInputElement).value).toBe(DEFAULT_SERVER)
    expect((document.getElementById('auth-token') as HTMLInputElement).value).toBe('')
    expect((document.getElementById('anthropic-key') as HTMLInputElement).value).toBe('')
    expect((document.getElementById('resume-json') as HTMLTextAreaElement).value).toBe('')
  })

  it('submitting the form persists to storage and reloads survive', async () => {
    await import('../../src/options/options.ts')
    await flush()

    ;(document.getElementById('server-url') as HTMLInputElement).value = 'https://api.example.com'
    ;(document.getElementById('auth-token') as HTMLInputElement).value = 'tok-123'
    ;(document.getElementById('anthropic-key') as HTMLInputElement).value = 'sk-ant-abc'
    ;(document.getElementById('resume-json') as HTMLTextAreaElement).value = '{"name":"Ada"}'

    submitForm()
    await flush()

    document.body.innerHTML = OPTIONS_HTML
    vi.resetModules()
    await import('../../src/options/options.ts')
    await flush()

    expect((document.getElementById('server-url') as HTMLInputElement).value).toBe('https://api.example.com')
    expect((document.getElementById('auth-token') as HTMLInputElement).value).toBe('tok-123')
    expect((document.getElementById('anthropic-key') as HTMLInputElement).value).toBe('sk-ant-abc')
    expect((document.getElementById('resume-json') as HTMLTextAreaElement).value).toBe('{"name":"Ada"}')
  })

  it('status-message updates then clears after save', async () => {
    vi.useFakeTimers()
    await import('../../src/options/options.ts')
    await flush()

    submitForm()
    await flush()

    const status = document.getElementById('status-message') as HTMLSpanElement
    expect(status.textContent).toBe('Saved')

    await vi.advanceTimersByTimeAsync(2100)
    expect(status.textContent).toBe('')
    vi.useRealTimers()
  })

  it('invalid resume JSON shows resume-error and does not persist', async () => {
    await import('../../src/options/options.ts')
    await flush()

    ;(document.getElementById('server-url') as HTMLInputElement).value = 'https://api.example.com'
    ;(document.getElementById('resume-json') as HTMLTextAreaElement).value = '{not-valid-json'
    submitForm()
    await flush()

    const err = document.getElementById('resume-error') as HTMLParagraphElement
    expect(err.hidden).toBe(false)
    expect(err.textContent).toContain('Invalid JSON')

    // Verify nothing was saved by remounting and confirming server-url is default
    document.body.innerHTML = OPTIONS_HTML
    vi.resetModules()
    await import('../../src/options/options.ts')
    await flush()
    expect((document.getElementById('server-url') as HTMLInputElement).value).toBe(DEFAULT_SERVER)
  })
})
