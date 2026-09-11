import { describe, it, expect, beforeEach } from 'vitest'
import { detectFieldsFromDom } from '../../src/content/base'

describe('detectFieldsFromDom (Ashby-like form)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form>
        <label for="full_name">Full name</label>
        <input id="full_name" name="full_name" type="text" required />

        <label for="email">Email</label>
        <input id="email" name="email" type="email" required />

        <label for="resume">Resume</label>
        <input id="resume" name="submissions[resume]" type="file" />
      </form>
    `
  })

  it('detects full_name, email, and resume file field', () => {
    const fields = detectFieldsFromDom(document)
    const byName = Object.fromEntries(
      fields.map((f) => [f.label === '' ? f.selector : f.label, f]),
    )

    const fullName = fields.find((f) => f.selector.includes('full_name'))
    expect(fullName).toBeDefined()
    expect(fullName?.kind).toBe('text')
    expect(fullName?.required).toBe(true)
    expect(fullName?.label).toBe('Full name')

    const email = fields.find((f) => f.selector.includes('email'))
    expect(email).toBeDefined()
    expect(email?.kind).toBe('email')
    expect(email?.required).toBe(true)
    expect(email?.label).toBe('Email')

    const resume = fields.find((f) => f.selector.includes('submissions[resume]'))
    expect(resume).toBeDefined()
    expect(resume?.kind).toBe('file')
    expect(resume?.label).toBe('Resume')

    expect(fields.length).toBe(3)
    // silence unused-var lint if any
    void byName
  })
})
