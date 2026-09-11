import { describe, expect, it } from 'vitest'
import { deterministicFill, mergeFillPlans } from '../../src/matcher/value-mapper.js'
import type { FormFieldDescriptor } from '../../src/anthropic/types.js'
import type { Resume } from '../../src/resume/schema.js'

const resume: Resume = {
  fullName: 'Alice Smith',
  email: 'a@b.com',
  phone: '+91 9999999999',
  linkedin: 'https://linkedin.com/in/alice',
  github: 'https://github.com/alice',
  experience: [],
  education: [],
  skills: [],
}

describe('deterministicFill', () => {
  it('fills a "Full Name" label with fullName', () => {
    const fields: FormFieldDescriptor[] = [{ selector: '#fn', label: 'Full Name', kind: 'text' }]
    expect(deterministicFill(resume, fields).values).toEqual({ '#fn': 'Alice Smith' })
  })

  it('fills a "name" label with fullName', () => {
    const fields: FormFieldDescriptor[] = [{ selector: '#n', label: 'name', kind: 'text' }]
    expect(deterministicFill(resume, fields).values).toEqual({ '#n': 'Alice Smith' })
  })

  it('fills an Email field when kind=email', () => {
    const fields: FormFieldDescriptor[] = [{ selector: '#e', label: 'Email', kind: 'email' }]
    expect(deterministicFill(resume, fields).values).toEqual({ '#e': 'a@b.com' })
  })

  it('does NOT fill an email-labeled field when kind is not email', () => {
    const fields: FormFieldDescriptor[] = [{ selector: '#e', label: 'email', kind: 'text' }]
    expect(deterministicFill(resume, fields).values).toEqual({})
  })

  it('does NOT fill a linkedin field when resume.linkedin is missing', () => {
    const resumeNoLinkedIn: Resume = { ...resume, linkedin: undefined }
    const fields: FormFieldDescriptor[] = [{ selector: '#li', label: 'LinkedIn', kind: 'text' }]
    expect(deterministicFill(resumeNoLinkedIn, fields).values).toEqual({})
  })

  it('fills phone/github when present', () => {
    const fields: FormFieldDescriptor[] = [
      { selector: '#p', label: 'Phone', kind: 'tel' },
      { selector: '#gh', label: 'GitHub', kind: 'text' },
    ]
    expect(deterministicFill(resume, fields).values).toEqual({
      '#p': '+91 9999999999',
      '#gh': 'https://github.com/alice',
    })
  })
})

describe('mergeFillPlans', () => {
  it('merges with override winning on conflict', () => {
    const merged = mergeFillPlans(
      { values: { selectorA: 'x' } },
      { values: { selectorA: 'y', selectorB: 'z' } },
    )
    expect(merged.values).toEqual({ selectorA: 'y', selectorB: 'z' })
  })
})
