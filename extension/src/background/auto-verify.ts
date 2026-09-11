import { VerificationServerClient, type VerifyResponse } from './server-client.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('auto-verify')

/** Ask a tab for its OTP field, poll the server for a code, ask the tab to fill it. */
export async function tryAutoVerify(tabId: number, server: VerificationServerClient): Promise<{ ok: boolean; code?: string; error?: string }> {
  const otp = await chrome.tabs.sendMessage(tabId, { type: 'find-otp-field' }) as { selector: string } | null
  if (!otp) return { ok: false, error: 'no OTP field on page' }
  log.info('OTP field found', otp.selector)
  let resp: VerifyResponse
  try {
    resp = await server.verifyCode({ pattern: 'verify|confirm|code|otp|two.factor', timeout_seconds: 90 })
  } catch (e) {
    return { ok: false, error: String(e) }
  }
  if (!resp.code) return { ok: false, error: 'no code in verification response' }
  await chrome.tabs.sendMessage(tabId, { type: 'apply-fill-plan', payload: { values: { [otp.selector]: resp.code } } })
  return { ok: true, code: resp.code }
}
