import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { VerificationServerClient } from '../../src/server/client.js'

const BASE_URL = 'http://verify.test'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('VerificationServerClient', () => {
  it('health() returns HealthResponse when server responds 200', async () => {
    server.use(
      http.get(`${BASE_URL}/health`, () =>
        HttpResponse.json({ status: 'ok', imap: 'connected' }),
      ),
    )
    const client = new VerificationServerClient(BASE_URL, 'token')
    const res = await client.health()
    expect(res).toEqual({ status: 'ok', imap: 'connected' })
  })

  it('health() throws when server returns 500', async () => {
    server.use(
      http.get(`${BASE_URL}/health`, () =>
        new HttpResponse(null, { status: 500 }),
      ),
    )
    const client = new VerificationServerClient(BASE_URL, 'token')
    await expect(client.health()).rejects.toThrow(/health failed: HTTP 500/)
  })

  it('verifyCode() returns VerifyResponse on 200', async () => {
    const payload = {
      code: '123456',
      magic_link: null,
      subject: 'Your code',
      from_addr: 'noreply@example.com',
    }
    server.use(
      http.post(`${BASE_URL}/verify-code`, async ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer token')
        expect(request.headers.get('content-type')).toBe('application/json')
        return HttpResponse.json(payload)
      }),
    )
    const client = new VerificationServerClient(BASE_URL, 'token')
    const res = await client.verifyCode({ pattern: '\\d{6}', timeout_seconds: 30 })
    expect(res).toEqual(payload)
  })

  it('verifyCode() throws "unauthorized" on 401', async () => {
    server.use(
      http.post(`${BASE_URL}/verify-code`, () =>
        new HttpResponse(null, { status: 401 }),
      ),
    )
    const client = new VerificationServerClient(BASE_URL, 'bad-token')
    await expect(client.verifyCode()).rejects.toThrow('unauthorized')
  })

  it('verifyCode() throws "timeout" on 408', async () => {
    server.use(
      http.post(`${BASE_URL}/verify-code`, () =>
        new HttpResponse(null, { status: 408 }),
      ),
    )
    const client = new VerificationServerClient(BASE_URL, 'token')
    await expect(client.verifyCode()).rejects.toThrow('timeout')
  })
})
