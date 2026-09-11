export interface RetryOptions {
  maxAttempts?: number       // default 3
  baseDelayMs?: number       // default 300
  maxDelayMs?: number        // default 5000
  factor?: number            // default 2
  jitter?: boolean           // default true
  shouldRetry?: (err: unknown, attempt: number) => boolean
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3
  const base = opts.baseDelayMs ?? 300
  const max = opts.maxDelayMs ?? 5000
  const factor = opts.factor ?? 2
  const jitter = opts.jitter ?? true
  const shouldRetry = opts.shouldRetry ?? (() => true)
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try { return await fn() }
    catch (e) {
      lastErr = e
      if (attempt === maxAttempts || !shouldRetry(e, attempt)) break
      const raw = Math.min(max, base * Math.pow(factor, attempt - 1))
      const delay = jitter ? raw * (0.5 + Math.random() * 0.5) : raw
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw lastErr
}
