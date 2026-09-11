import { describe, it, expect, beforeEach, vi } from 'vitest'
import { tryAutoVerify } from '../../src/background/auto-verify'
import type { VerificationServerClient, VerifyResponse } from '../../src/background/server-client'

interface SentMessage {
  tabId: number
  message: unknown
}

function setupChrome(otpResponses: Array<{ selector: string } | null>): { sent: SentMessage[]; sendMessage: ReturnType<typeof vi.fn> } {
  const sent: SentMessage[] = []
  let otpIdx = 0
  const sendMessage = vi.fn(async (tabId: number, message: unknown) => {
    sent.push({ tabId, message })
    const m = message as { type: string }
    if (m.type === 'find-otp-field') {
      const r = otpResponses[Math.min(otpIdx, otpResponses.length - 1)]
      otpIdx++
      return r
    }
    if (m.type === 'apply-fill-plan') return { ok: true }
    return null
  })
  vi.stubGlobal('chrome', { tabs: { sendMessage } })
  return { sent, sendMessage }
}

function fakeServer(impl: () => Promise<VerifyResponse>): VerificationServerClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fake, only verifyCode is exercised
  return { verifyCode: impl } as unknown as VerificationServerClient
}

describe('tryAutoVerify', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns error when there is no OTP field on the page', async () => {
    setupChrome([null])
    const server = fakeServer(async () => ({ code: '000000', magic_link: null, subject: '', from_addr: '' }))
    const res = await tryAutoVerify(1, server)
    expect(res).toEqual({ ok: false, error: 'no OTP field on page' })
  })

  it('fills OTP field on successful verifyCode and returns ok', async () => {
    const { sent } = setupChrome([{ selector: '#otp' }])
    const server = fakeServer(async () => ({ code: '123456', magic_link: null, subject: 'Your code', from_addr: 'a@b' }))
    const res = await tryAutoVerify(7, server)
    expect(res).toEqual({ ok: true, code: '123456' })
    const applyMsg = sent.find(s => (s.message as { type: string }).type === 'apply-fill-plan')
    expect(applyMsg).toBeDefined()
    expect(applyMsg?.tabId).toBe(7)
    expect(applyMsg?.message).toEqual({ type: 'apply-fill-plan', payload: { values: { '#otp': '123456' } } })
  })

  it('propagates a timeout error from verifyCode', async () => {
    setupChrome([{ selector: '#code' }])
    const server = fakeServer(async () => { throw new Error('timeout') })
    const res = await tryAutoVerify(2, server)
    expect(res.ok).toBe(false)
    expect(res.error ?? '').toContain('timeout')
  })

  it('returns error when verifyCode returns no code (only magic_link)', async () => {
    const { sent } = setupChrome([{ selector: '#otp' }])
    const server = fakeServer(async () => ({ code: null, magic_link: 'https://x/y', subject: 's', from_addr: 'a@b' }))
    const res = await tryAutoVerify(3, server)
    expect(res).toEqual({ ok: false, error: 'no code in verification response' })
    // Must not attempt to fill
    expect(sent.some(s => (s.message as { type: string }).type === 'apply-fill-plan')).toBe(false)
  })

  it('handles multiple sequential OTP verifications', async () => {
    const { sent } = setupChrome([{ selector: '#a' }, { selector: '#b' }, { selector: '#c' }])
    let n = 0
    const codes = ['111111', '222222', '333333']
    const server = fakeServer(async () => ({ code: codes[n++]!, magic_link: null, subject: '', from_addr: '' }))
    const r1 = await tryAutoVerify(10, server)
    const r2 = await tryAutoVerify(11, server)
    const r3 = await tryAutoVerify(12, server)
    expect([r1, r2, r3]).toEqual([
      { ok: true, code: '111111' },
      { ok: true, code: '222222' },
      { ok: true, code: '333333' },
    ])
    const applyMsgs = sent.filter(s => (s.message as { type: string }).type === 'apply-fill-plan')
    expect(applyMsgs).toHaveLength(3)
    expect(applyMsgs[0]?.message).toEqual({ type: 'apply-fill-plan', payload: { values: { '#a': '111111' } } })
    expect(applyMsgs[1]?.message).toEqual({ type: 'apply-fill-plan', payload: { values: { '#b': '222222' } } })
    expect(applyMsgs[2]?.message).toEqual({ type: 'apply-fill-plan', payload: { values: { '#c': '333333' } } })
  })
})
