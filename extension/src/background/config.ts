import { createStorage } from '../lib/storage.js'

export interface RuntimeConfig {
  verificationServerUrl: string
  verificationToken: string
  anthropicApiKey: string | null
}

/** Build-time defaults from Vite env — used only when nothing is saved in chrome.storage. */
function envDefaults(): RuntimeConfig {
  return {
    verificationServerUrl: import.meta.env.VITE_VERIFICATION_SERVER_URL ?? 'http://127.0.0.1:8787',
    verificationToken: import.meta.env.VITE_VERIFICATION_TOKEN ?? '',
    anthropicApiKey: import.meta.env.VITE_ANTHROPIC_API_KEY ?? null,
  }
}

/** Read runtime config, preferring values saved via the Options page over build-time defaults. */
export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  const store = createStorage()
  const defaults = envDefaults()
  const [savedUrl, savedToken, savedKey] = await Promise.all([
    store.get<string>('serverUrl'),
    store.get<string>('authToken'),
    store.get<string>('anthropicKey'),
  ])
  const url = (savedUrl ?? '').trim() || defaults.verificationServerUrl
  const token = (savedToken ?? '').trim() || defaults.verificationToken
  const rawKey = (savedKey ?? '').trim()
  return {
    verificationServerUrl: url,
    verificationToken: token,
    anthropicApiKey: rawKey || defaults.anthropicApiKey,
  }
}

/** @deprecated build-time only path — kept so old callers don't crash. Prefer loadRuntimeConfig(). */
export function loadConfigFromEnv(): RuntimeConfig {
  return envDefaults()
}
