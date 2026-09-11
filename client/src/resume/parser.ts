import { ResumeSchema, type Resume } from './schema.js'
export function parseResume(input: unknown): Resume {
  return ResumeSchema.parse(input)
}
export function tryParseResume(input: unknown): { ok: true; value: Resume } | { ok: false; error: string } {
  const r = ResumeSchema.safeParse(input)
  if (r.success) return { ok: true, value: r.data }
  return { ok: false, error: r.error.message }
}
