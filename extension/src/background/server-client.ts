export interface HealthResponse { status: string; imap: string }
export interface VerifyRequest { pattern?: string; since_seconds?: number; timeout_seconds?: number; poll_interval_seconds?: number }
export interface VerifyResponse { code: string | null; magic_link: string | null; subject: string; from_addr: string }

export class VerificationServerClient {
  constructor(private baseUrl: string, private token: string) {}
  async health(): Promise<HealthResponse> {
    const r = await fetch(new URL('/health', this.baseUrl))
    if (!r.ok) throw new Error(`health HTTP ${r.status}`)
    return r.json() as Promise<HealthResponse>
  }
  async verifyCode(req: VerifyRequest = {}): Promise<VerifyResponse> {
    const r = await fetch(new URL('/verify-code', this.baseUrl), {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` }, body: JSON.stringify(req),
    })
    if (r.status === 401) throw new Error('unauthorized')
    if (r.status === 408) throw new Error('timeout')
    if (!r.ok) throw new Error(`verify-code HTTP ${r.status}`)
    return r.json() as Promise<VerifyResponse>
  }
}
