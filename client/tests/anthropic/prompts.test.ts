import { describe, it, expect } from 'vitest'
import { buildFormFillPrompt, buildJobFitPrompt } from '../../src/anthropic/prompts.js'
import type { Resume } from '../../src/resume/schema.js'
import type { FormFieldDescriptor } from '../../src/anthropic/types.js'

const fixtureResume: Resume = {
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+1-555-0100',
  location: 'Seattle, WA',
  experience: [
    {
      company: 'Acme Corp',
      title: 'Senior Engineer',
      startDate: '2022-01',
      bullets: ['Led migration to TypeScript', 'Reduced latency by 30%'],
    },
  ],
  education: [
    {
      institution: 'State University',
      degree: 'B.S. Computer Science',
    },
  ],
  skills: ['TypeScript', 'React', 'Node.js'],
}

const fixtureFields: FormFieldDescriptor[] = [
  { selector: '#name', label: 'Full Name', kind: 'text', required: true },
  { selector: '#email', label: 'Email', kind: 'email', required: true },
  { selector: '#cover', label: 'Cover Letter', kind: 'textarea' },
]

const fixtureJd = 'We are hiring a Senior TypeScript Engineer to lead frontend architecture.'

describe('buildFormFillPrompt', () => {
  it('includes candidate and form fields but not job description when JD omitted', () => {
    const prompt = buildFormFillPrompt(fixtureResume, fixtureFields)
    expect(prompt).toContain('CANDIDATE:')
    expect(prompt).toContain('FORM FIELDS')
    expect(prompt).not.toContain('JOB DESCRIPTION:')
    expect(prompt).toContain('Jane Doe')
    expect(prompt).toContain('#cover')
  })

  it('includes job description section when JD provided', () => {
    const prompt = buildFormFillPrompt(fixtureResume, fixtureFields, fixtureJd)
    expect(prompt).toContain('JOB DESCRIPTION:')
    expect(prompt).toContain(fixtureJd)
    expect(prompt).toContain('CANDIDATE:')
  })

  it('ends with a JSON-only instruction', () => {
    const prompt = buildFormFillPrompt(fixtureResume, fixtureFields)
    expect(prompt.trimEnd().endsWith('JSON only, no prose.')).toBe(true)
  })
})

describe('buildJobFitPrompt', () => {
  it('contains score, reasons, and both resume + JD content', () => {
    const prompt = buildJobFitPrompt(fixtureResume, fixtureJd)
    expect(prompt).toContain('score')
    expect(prompt).toContain('reasons')
    expect(prompt).toContain('Jane Doe')
    expect(prompt).toContain(fixtureJd)
    expect(prompt).toContain('CANDIDATE:')
    expect(prompt).toContain('JOB DESCRIPTION:')
  })

  it('ends with a JSON-only instruction', () => {
    const prompt = buildJobFitPrompt(fixtureResume, fixtureJd)
    expect(prompt.trimEnd().endsWith('JSON only.')).toBe(true)
  })
})
