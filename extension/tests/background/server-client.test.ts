import { afterEach, describe, expect, it, vi } from 'vitest'
import { VerificationServerClient } from '../../src/background/server-client'

function mkResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('VerificationServerClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('health() returns {status,imap} on 200', async () => {
    const fake = vi.fn(async () => mkResponse(200, { status: 'ok', imap: 'connected' }))
    vi.stubGlobal('fetch', fake)
    const c = new VerificationServerClient('http://localhost:8080', 'tok')
    await expect(c.health()).resolves.toEqual({ status: 'ok', imap: 'connected' })
    expect(fake).toHaveBeenCalledOnce()
  })

  it('health() throws on 500', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mkResponse(500, { error: 'boom' })))
    const c = new VerificationServerClient('http://localhost:8080', 'tok')
    await expect(c.health()).rejects.toThrow(/HTTP 500/)
  })

  it('verifyCode() returns on 200', async () => {
    const body = { code: '123456', magic_link: null, subject: 's', from_addr: 'a@b.c' }
    vi.stubGlobal('fetch', vi.fn(async () => mkResponse(200, body)))
    const c = new VerificationServerClient('http://localhost:8080', 'tok')
    await expect(c.verifyCode({ timeout_seconds: 5 })).resolves.toEqual(body)
  })

  it("verifyCode() throws 'unauthorized' on 401", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mkResponse(401, { error: 'no' })))
    const c = new VerificationServerClient('http://localhost:8080', 'bad')
    await expect(c.verifyCode()).rejects.toThrow('unauthorized')
  })

  it("verifyCode() throws 'timeout' on 408", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mkResponse(408, { error: 'timeout' })))
    const c = new VerificationServerClient('http://localhost:8080', 'tok')
    await expect(c.verifyCode()).rejects.toThrow('timeout')
  })

  it('verifyCode() sends Bearer token and JSON body', async () => {
    const fake = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      expect(headers.get('Authorization')).toBe('Bearer tok')
      expect(headers.get('Content-Type')).toBe('application/json')
      expect(init?.method).toBe('POST')
      expect(JSON.parse(String(init?.body))).toEqual({ timeout_seconds: 10 })
      return mkResponse(200, { code: '000000', magic_link: null, subject: '', from_addr: '' })
    })
    vi.stubGlobal('fetch', fake)
    const c = new VerificationServerClient('http://localhost:8080', 'tok')
    await c.verifyCode({ timeout_seconds: 10 })
    expect(fake).toHaveBeenCalledOnce()
  })
})
