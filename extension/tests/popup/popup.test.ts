// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'

const POPUP_HTML = `
  <button id="fillTab">Fill this tab</button>
  <pre id="fillOut"></pre>
  <button id="checkHealth">Check Health</button>
  <pre id="healthOut"></pre>
  <button id="requestCode">Request Code</button>
  <pre id="codeOut"></pre>
  <button id="autoVerify">Auto-fill verification code</button>
  <pre id="autoVerifyOut"></pre>
  <a href="#" id="openOptions">Options</a>
  <a href="#" id="openQueue">Queue</a>
`

// Flush microtasks so async click handlers can complete.
const flush = () => new Promise<void>((r) => setTimeout(r, 0))

describe('popup', () => {
  beforeEach(() => {
    document.body.innerHTML = POPUP_HTML
    // Stub chrome.runtime.sendMessage — jsdom lacks the chrome global.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub of browser API
    ;(globalThis as any).chrome = {
      runtime: {
        sendMessage: async () => ({ status: 'ok', imap: 'connected' }),
        openOptionsPage: () => {},
        getURL: (p: string) => `chrome-extension://test/${p}`,
      },
      tabs: { create: () => Promise.resolve({ id: 1 }) },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub of browser API
    } as any
    // Reset module cache so popup.ts re-runs against the fresh DOM.
    return import('vitest').then(({ vi }) => vi.resetModules())
  })

  it('updates #healthOut when #checkHealth is clicked', async () => {
    await import('../../src/popup/popup.ts')
    const btn = document.getElementById('checkHealth') as HTMLButtonElement
    const out = document.getElementById('healthOut') as HTMLPreElement
    btn.click()
    await flush()
    expect(out.textContent).toContain('"status": "ok"')
    expect(out.textContent).toContain('"imap": "connected"')
  })

  it('updates #codeOut when #requestCode is clicked', async () => {
    await import('../../src/popup/popup.ts')
    const btn = document.getElementById('requestCode') as HTMLButtonElement
    const out = document.getElementById('codeOut') as HTMLPreElement
    btn.click()
    await flush()
    expect(out.textContent).toContain('"status": "ok"')
    expect(out.textContent).toContain('"imap": "connected"')
  })

  it('updates #fillOut when #fillTab is clicked', async () => {
    await import('../../src/popup/popup.ts')
    const btn = document.getElementById('fillTab') as HTMLButtonElement
    const out = document.getElementById('fillOut') as HTMLPreElement
    btn.click()
    await flush()
    // stubbed sendMessage returns { status: 'ok', imap: 'connected' } — reused for all calls
    expect(out.textContent).toContain('"status": "ok"')
    expect(btn.disabled).toBe(false)
  })
})
