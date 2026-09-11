import { createLogger } from '../lib/logger.js'
import { onMessage } from '../lib/messaging.js'
import { loadRuntimeConfig } from './config.js'
import { VerificationServerClient } from './server-client.js'
import { AnthropicClient, type FieldDescriptor, type FillPlan } from './anthropic-client.js'
import { JobQueue } from './queue.js'
import { loadStoredResume } from '../lib/resume-store.js'
import { tryAutoVerify } from './auto-verify.js'
import { processQueue } from './queue-processor.js'

const log = createLogger('bg')
const queue = new JobQueue()

/** Build a fresh server client from the current saved config on every call.
 *  This makes Options-page saves take effect without reloading the extension. */
async function makeServer(): Promise<VerificationServerClient> {
  const cfg = await loadRuntimeConfig()
  return new VerificationServerClient(cfg.verificationServerUrl, cfg.verificationToken)
}

async function makeAnthropic(): Promise<AnthropicClient | null> {
  const cfg = await loadRuntimeConfig()
  return cfg.anthropicApiKey ? new AnthropicClient(cfg.anthropicApiKey) : null
}

interface DetectedFieldsResponse {
  host: string
  url: string
  fields: FieldDescriptor[]
}

interface ApplyFillPlanResponse {
  ok: boolean
  filled: number
  skipped: string[]
  errors?: Record<string, string>
}

interface FillTabResult {
  ok: boolean
  filled?: number
  skipped?: string[]
  errors?: Record<string, string>
  error?: string
  fieldsDetected?: number
}

async function fillTabById(tabId: number): Promise<FillTabResult> {
  const anthropic = await makeAnthropic()
  if (!anthropic) return { ok: false, error: 'anthropic API key not set (see Options)' }

  const resume = await loadStoredResume()
  if (!resume) return { ok: false, error: 'no resume saved (see Options)' }

  const detected = (await chrome.tabs.sendMessage(tabId, { type: 'get-fields' })) as
    | DetectedFieldsResponse
    | undefined
  if (!detected?.fields?.length) return { ok: false, error: 'no fields detected on the current page (is a supported ATS open?)' }

  log.info('planning fill', { host: detected.host, fields: detected.fields.length })
  const plan: FillPlan = await anthropic.fillForm(resume, detected.fields)

  const result = (await chrome.tabs.sendMessage(tabId, { type: 'apply-fill-plan', payload: plan })) as
    | ApplyFillPlanResponse
    | undefined
  if (!result) return { ok: false, error: 'no response from content bridge' }
  if (!result.ok) {
    return {
      ok: false,
      error: 'content bridge reported failure',
      filled: result.filled,
      skipped: result.skipped,
      errors: result.errors,
      fieldsDetected: detected.fields.length,
    }
  }
  return {
    ok: true,
    filled: result.filled,
    skipped: result.skipped,
    errors: result.errors,
    fieldsDetected: detected.fields.length,
  }
}

async function fillCurrentTab(): Promise<FillTabResult> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return { ok: false, error: 'no active tab' }
  return fillTabById(tab.id)
}

// Boot log — cheap sanity that the service worker started.
void loadRuntimeConfig().then((cfg) => {
  log.info('service worker booted', {
    hasToken: !!cfg.verificationToken,
    hasAnthropic: !!cfg.anthropicApiKey,
    server: cfg.verificationServerUrl,
  })
})

onMessage(async (msg) => {
  switch (msg.type) {
    case 'enqueue':
      return queue.add((msg.payload as { url: string }).url)
    case 'list-queue':
      return queue.all()
    case 'get-verification-code': {
      const server = await makeServer()
      return server.verifyCode(msg.payload as Parameters<typeof server.verifyCode>[0])
    }
    case 'health': {
      const server = await makeServer()
      return server.health()
    }
    case 'fill-current-tab':
      return fillCurrentTab()
    case 'process-queue':
      return processQueue((tabId) => fillTabById(tabId), { maxConcurrent: 1 })
    case 'auto-verify': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) return { ok: false, error: 'no active tab' }
      const server = await makeServer()
      return tryAutoVerify(tab.id, server)
    }
    case 'fill-form': {
      const anthropic = await makeAnthropic()
      if (!anthropic) return { error: 'anthropic key not set' }
      return anthropic.fillForm(...(msg.payload as Parameters<typeof anthropic.fillForm>))
    }
    default:
      return { error: `unknown message type: ${String(msg.type)}` }
  }
})
