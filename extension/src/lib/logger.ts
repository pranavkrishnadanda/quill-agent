type Level = 'debug' | 'info' | 'warn' | 'error'
export interface Logger {
  debug(...args: unknown[]): void
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
}

const RING_KEY = 'log-ring.v1'
const RING_MAX = 200

export interface LogEntry { level: string; scope: string; ts: number; args: string[] }

function safeStringify(x: unknown): string {
  try {
    if (typeof x === 'string') return x
    return JSON.stringify(x)
  } catch {
    try { return String(x) } catch { return '[unserializable]' }
  }
}

// Serialize pushToRing writes so concurrent log calls don't race on the
// read-modify-write of the ring. Each push chains onto the previous promise.
let ringChain: Promise<void> = Promise.resolve()
function pushToRing(entry: LogEntry): Promise<void> {
  const next = ringChain.then(async () => {
    try {
      const store = (await import('./storage.js')).createStorage()
      const ring = (await store.get<LogEntry[]>(RING_KEY)) ?? []
      ring.push(entry)
      while (ring.length > RING_MAX) ring.shift()
      await store.set(RING_KEY, ring)
    } catch { /* best effort */ }
  })
  ringChain = next
  return next
}

export function createLogger(scope: string): Logger {
  const emit = (level: Level, ...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console[level](`[${scope}]`, ...args)
    const entry: LogEntry = {
      level,
      scope,
      ts: Date.now(),
      args: args.map((a) => safeStringify(a)),
    }
    void pushToRing(entry)
  }
  return {
    debug: (...a) => emit('debug', ...a),
    info: (...a) => emit('info', ...a),
    warn: (...a) => emit('warn', ...a),
    error: (...a) => emit('error', ...a),
  }
}

export async function readLogRing(): Promise<LogEntry[]> {
  const store = (await import('./storage.js')).createStorage()
  return (await store.get<LogEntry[]>(RING_KEY)) ?? []
}
