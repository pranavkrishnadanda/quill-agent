import { describe, it, expect } from 'vitest'
import {
  JobAgentError,
  ServerUnreachableError,
  UnauthorizedError,
  VerificationTimeoutError,
  NoResumeError,
  NoAnthropicKeyError,
  friendlyMessage,
} from '../../src/lib/errors.js'

describe('errors', () => {
  it('subclasses are instanceof JobAgentError and Error', () => {
    expect(new ServerUnreachableError('x')).toBeInstanceOf(JobAgentError)
    expect(new ServerUnreachableError('x')).toBeInstanceOf(Error)
    expect(new UnauthorizedError('x')).toBeInstanceOf(JobAgentError)
    expect(new VerificationTimeoutError('x')).toBeInstanceOf(JobAgentError)
    expect(new NoResumeError()).toBeInstanceOf(JobAgentError)
    expect(new NoAnthropicKeyError()).toBeInstanceOf(JobAgentError)
  })

  it('JobAgentError preserves message and optional cause', () => {
    const cause = { detail: 'boom' }
    const err = new JobAgentError('bad thing', cause)
    expect(err.message).toBe('bad thing')
    expect(err.cause).toBe(cause)
  })

  it('friendlyMessage on JobAgentError returns its message', () => {
    expect(friendlyMessage(new ServerUnreachableError('server down'))).toBe('server down')
    expect(friendlyMessage(new JobAgentError('nope'))).toBe('nope')
  })

  it('friendlyMessage on plain Error returns its message', () => {
    expect(friendlyMessage(new Error('kaboom'))).toBe('kaboom')
    expect(friendlyMessage(new TypeError('bad type'))).toBe('bad type')
  })

  it('friendlyMessage on non-Error returns String(err)', () => {
    expect(friendlyMessage('a string')).toBe('a string')
    expect(friendlyMessage(42)).toBe('42')
    expect(friendlyMessage(null)).toBe('null')
    expect(friendlyMessage(undefined)).toBe('undefined')
    expect(friendlyMessage({ foo: 'bar' })).toBe('[object Object]')
  })

  it('NoResumeError has expected message', () => {
    const err = new NoResumeError()
    expect(err.message).toBe('No resume saved — open Options and paste your resume JSON.')
    expect(friendlyMessage(err)).toBe('No resume saved — open Options and paste your resume JSON.')
  })

  it('NoAnthropicKeyError has expected message', () => {
    const err = new NoAnthropicKeyError()
    expect(err.message).toBe('Anthropic API key not set — open Options and paste your key.')
  })
})
