// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { installContentBridge } from '../../src/content/base.ts'

type Listener = (
  msg: unknown,
  sender: unknown,
  sendResponse: (r: unknown) => void,
) => boolean | void

interface StubChrome {
  runtime: {
    onMessage: {
      addListener: (fn: Listener) => void
    }
  }
}

let registered: Listener | null = null

function invoke(msg: unknown): unknown {
  if (!registered) throw new Error('no listener registered')
  let captured: unknown = undefined
  registered(msg, {}, (r: unknown) => {
    captured = r
  })
  return captured
}

describe('installContentBridge — find-otp-field', () => {
  beforeEach(() => {
    registered = null
    const stub: StubChrome = {
      runtime: {
        onMessage: {
          addListener: (fn: Listener) => {
            registered = fn
          },
        },
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chrome global stub for jsdom
    ;(globalThis as any).chrome = stub
    document.body.innerHTML = ''
  })

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cleanup chrome stub
    delete (globalThis as any).chrome
  })

  it('returns OTP selector for input[autocomplete="one-time-code"]', () => {
    document.body.innerHTML = `
      <input id="email" name="email" type="email" />
      <input id="otp" type="text" autocomplete="one-time-code" />
    `
    installContentBridge('test-host')
    const response = invoke({ type: 'find-otp-field' }) as {
      selector: string
      reason: string
    } | null
    expect(response).not.toBeNull()
    expect(response!.selector).toBe('#otp')
    expect(response!.reason).toBe('autocomplete')
  })

  it('returns null when no OTP field is present on the page', () => {
    document.body.innerHTML = `
      <input id="fullName" name="full_name" type="text" />
      <input id="email" name="email" type="email" />
    `
    installContentBridge('test-host')
    const response = invoke({ type: 'find-otp-field' })
    expect(response).toBeNull()
  })

  it('detects OTP field by name pattern when no autocomplete hint exists', () => {
    document.body.innerHTML = `
      <input id="username" name="username" type="text" />
      <input id="verification_code" name="verification_code" type="text" />
    `
    installContentBridge('test-host')
    const response = invoke({ type: 'find-otp-field' }) as {
      selector: string
      reason: string
    } | null
    expect(response).not.toBeNull()
    expect(response!.selector).toBe('#verification_code')
    expect(response!.reason).toBe('name')
  })

  it('does not respond to unrelated message types with an OTP result', () => {
    document.body.innerHTML = `<input autocomplete="one-time-code" />`
    installContentBridge('test-host')
    const response = invoke({ type: 'some-other-message' })
    // Bridge falls through without calling sendResponse for unknown types.
    expect(response).toBeUndefined()
  })
})
