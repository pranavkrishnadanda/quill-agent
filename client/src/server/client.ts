import type { VerifyRequest, VerifyResponse, HealthResponse } from './types.js'

export class VerificationServerClient {
  constructor(private readonly baseUrl: string, private readonly authToken: string, private readonly fetchImpl: typeof fetch = fetch) {}

  async health(): Promise<HealthResponse> {
    const r = await this.fetchImpl(new URL('/health', this.baseUrl))
    if (!r.ok) throw new Error(`health failed: HTTP ${r.status}`)
    return r.json() as Promise<HealthResponse>
  }

  async verifyCode(req: VerifyRequest = {}): Promise<VerifyResponse> {
    const r = await this.fetchImpl(new URL('/verify-code', this.baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.authToken}` },
      body: JSON.stringify(req),
    })
    if (r.status === 401) throw new Error('unauthorized')
    if (r.status === 408) throw new Error('timeout')
    if (!r.ok) throw new Error(`verify-code failed: HTTP ${r.status}`)
    return r.json() as Promise<VerifyResponse>
  }
}
