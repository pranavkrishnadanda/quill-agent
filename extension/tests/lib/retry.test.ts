import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withRetry } from '../../src/lib/retry.js'

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns immediately when fn resolves on first attempt', async () => {
    const fn = vi.fn(async () => 'ok')
    const promise = withRetry(fn, { jitter: false })
    await vi.advanceTimersByTimeAsync(0)
    await expect(promise).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries twice then resolves', async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('e1'))
      .mockRejectedValueOnce(new Error('e2'))
      .mockResolvedValueOnce('ok')
    const promise = withRetry(fn, { maxAttempts: 5, baseDelayMs: 100, jitter: false })
    // Drain all pending microtasks/timers until settlement.
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws the last error when all attempts fail', async () => {
    const err1 = new Error('e1')
    const err2 = new Error('e2')
    const err3 = new Error('e3-final')
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(err1)
      .mockRejectedValueOnce(err2)
      .mockRejectedValueOnce(err3)
    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 50, jitter: false })
    const caught = promise.catch((e: unknown) => e)
    await vi.runAllTimersAsync()
    await expect(caught).resolves.toBe(err3)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('maxAttempts=1 does not retry and throws immediately', async () => {
    const err = new Error('nope')
    const fn = vi.fn<() => Promise<string>>().mockRejectedValueOnce(err)
    const promise = withRetry(fn, { maxAttempts: 1, jitter: false })
    const caught = promise.catch((e: unknown) => e)
    await vi.runAllTimersAsync()
    await expect(caught).resolves.toBe(err)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('stops retrying when shouldRetry returns false', async () => {
    const err = new Error('fatal')
    const fn = vi.fn<() => Promise<string>>().mockRejectedValue(err)
    const shouldRetry = vi.fn(() => false)
    const promise = withRetry(fn, { maxAttempts: 5, baseDelayMs: 10, jitter: false, shouldRetry })
    const caught = promise.catch((e: unknown) => e)
    await vi.runAllTimersAsync()
    await expect(caught).resolves.toBe(err)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(shouldRetry).toHaveBeenCalledTimes(1)
  })

  it('uses fake timers — advance skips the backoff delay', async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('done')
    const promise = withRetry(fn, {
      maxAttempts: 3,
      baseDelayMs: 10_000,
      maxDelayMs: 10_000,
      jitter: false,
    })
    // Kick off the first attempt.
    await Promise.resolve()
    expect(fn).toHaveBeenCalledTimes(1)
    // Not enough time for the retry yet.
    await vi.advanceTimersByTimeAsync(1_000)
    expect(fn).toHaveBeenCalledTimes(1)
    // Advance past the 10s backoff.
    await vi.advanceTimersByTimeAsync(10_000)
    await expect(promise).resolves.toBe('done')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('passes attempt number to shouldRetry and stops after first when it returns false', async () => {
    const fn = vi.fn<() => Promise<string>>().mockRejectedValue(new Error('x'))
    const shouldRetry = vi.fn((_e: unknown, attempt: number) => attempt < 1)
    const promise = withRetry(fn, { maxAttempts: 4, baseDelayMs: 5, jitter: false, shouldRetry })
    const caught = promise.catch((e: unknown) => e)
    await vi.runAllTimersAsync()
    await caught
    expect(fn).toHaveBeenCalledTimes(1)
    expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 1)
  })
})
