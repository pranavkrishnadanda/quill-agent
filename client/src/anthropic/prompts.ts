import type { Resume } from '../resume/schema.js'
import type { FormFieldDescriptor } from './types.js'

export function buildFormFillPrompt(resume: Resume, fields: FormFieldDescriptor[], jd?: string): string {
  return `You are helping fill a job application form.

CANDIDATE:
${JSON.stringify(resume, null, 2)}

${jd ? `JOB DESCRIPTION:\n${jd}\n` : ''}

FORM FIELDS (return only values for these selectors; skip fields you can't fill):
${JSON.stringify(fields, null, 2)}

Return a single JSON object mapping each field's 'selector' to a string value. For long-form text fields (textarea), write concise 2-3 sentence answers tailored to the candidate's actual experience. Do not fabricate credentials.
JSON only, no prose.`
}

export function buildJobFitPrompt(resume: Resume, jd: string): string {
  return `Score this job description against this candidate on a 0-10 scale for fit.

CANDIDATE:
${JSON.stringify(resume, null, 2)}

JOB DESCRIPTION:
${jd}

Return JSON: { "score": <number 0-10>, "reasons": ["reason 1", "reason 2", "reason 3"] }
JSON only.`
}
