import { describe, it, expect, beforeEach } from 'vitest'
import { detectFieldsFromDom, type DetectedField } from '../../src/content/base'

// Inline Greenhouse-style application form fixture (fixtures dir not present).
const GREENHOUSE_HTML = `
<form id="application_form">
  <div>
    <label for="first_name">First Name</label>
    <input id="first_name" name="job_application[first_name]" type="text" required />
  </div>
  <div>
    <label for="last_name">Last Name</label>
    <input id="last_name" name="job_application[last_name]" type="text" required />
  </div>
  <div>
    <label for="full_name">Full Name</label>
    <input id="full_name" name="job_application[full_name]" type="text" required />
  </div>
  <div>
    <label for="email">Email</label>
    <input id="email" name="job_application[email]" type="email" required />
  </div>
  <div>
    <label for="phone">Phone</label>
    <input id="phone" name="job_application[phone]" type="tel" />
  </div>
  <div>
    <label for="cover_letter">Cover Letter</label>
    <textarea id="cover_letter" name="job_application[cover_letter_text]"></textarea>
  </div>
  <div>
    <label for="years_of_experience">Years of Experience</label>
    <input id="years_of_experience" name="job_application[answers_attributes][0][text_value]" type="text" />
  </div>
  <div>
    <label for="resume">Resume</label>
    <input id="resume" name="job_application[resume]" type="file" />
  </div>
</form>
`

function find(fields: DetectedField[], needle: string): DetectedField | undefined {
  const lower = needle.toLowerCase()
  return fields.find(
    (f) => f.label.toLowerCase().includes(lower) || f.selector.toLowerCase().includes(lower),
  )
}

describe('detectFieldsFromDom - Greenhouse form', () => {
  let fields: DetectedField[]

  beforeEach(() => {
    document.body.innerHTML = GREENHOUSE_HTML
    fields = detectFieldsFromDom(document)
  })

  it('detects the full_name text field', () => {
    const f = find(fields, 'full_name') ?? find(fields, 'Full Name')
    expect(f).toBeDefined()
    expect(f?.kind).toBe('text')
    expect(f?.required).toBe(true)
  })

  it('detects the email field with email kind', () => {
    const f = find(fields, 'email')
    expect(f).toBeDefined()
    expect(f?.kind).toBe('email')
    expect(f?.required).toBe(true)
  })

  it('detects the phone field with tel kind', () => {
    const f = find(fields, 'phone')
    expect(f).toBeDefined()
    expect(f?.kind).toBe('tel')
  })

  it('detects the cover_letter as a textarea', () => {
    const f = find(fields, 'cover_letter')
    expect(f).toBeDefined()
    expect(f?.kind).toBe('textarea')
    expect(f?.label.toLowerCase()).toContain('cover letter')
  })

  it('detects the years_of_experience field', () => {
    const f = find(fields, 'years_of_experience') ?? find(fields, 'Years of Experience')
    expect(f).toBeDefined()
    expect(f?.kind).toBe('text')
    expect(f?.label.toLowerCase()).toContain('years')
  })
})
