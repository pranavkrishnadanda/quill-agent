export class JobAgentError extends Error {
  constructor(message: string, public readonly cause?: unknown) { super(message) }
}
export class ServerUnreachableError extends JobAgentError {}
export class UnauthorizedError extends JobAgentError {}
export class VerificationTimeoutError extends JobAgentError {}
export class NoResumeError extends JobAgentError { constructor() { super('No resume saved — open Options and paste your resume JSON.') } }
export class NoAnthropicKeyError extends JobAgentError { constructor() { super('Anthropic API key not set — open Options and paste your key.') } }

export function friendlyMessage(err: unknown): string {
  if (err instanceof JobAgentError) return err.message
  if (err instanceof Error) return err.message
  return String(err)
}
