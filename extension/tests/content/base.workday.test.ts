import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { detectFieldsFromDom, type DetectedField } from '../../src/content/base'

const FIXTURE_PATH = resolve(__dirname, '../fixtures/workday-form.html')
const WORKDAY_HTML = readFileSync(FIXTURE_PATH, 'utf8')

function find(fields: DetectedField[], needle: string): DetectedField | undefined {
  const lower = needle.toLowerCase()
  return fields.find(
    (f) => f.label.toLowerCase().includes(lower) || f.selector.toLowerCase().includes(lower),
  )
}

describe('detectFieldsFromDom - Workday form fixture', () => {
  let fields: DetectedField[]

  beforeEach(() => {
    document.body.innerHTML = WORKDAY_HTML
    fields = detectFieldsFromDom(document)
  })

  it('detects at least the four input/textarea fields (excluding file upload)', () => {
    // firstName, lastName, email, phone, coverLetter = 5 fillable fields.
    expect(fields.length).toBeGreaterThanOrEqual(4)
  })

  it('detects the firstName text field with its label', () => {
    const f = find(fields, 'firstName') ?? find(fields, 'First Name')
    expect(f).toBeDefined()
    expect(f?.kind).toBe('text')
    expect(f?.label.toLowerCase()).toContain('first name')
  })

  it('detects the email field with email kind', () => {
    const f = find(fields, 'email')
    expect(f).toBeDefined()
    expect(f?.kind).toBe('email')
  })

  it('detects the phone field with tel kind', () => {
    const f = find(fields, 'phone')
    expect(f).toBeDefined()
    expect(f?.kind).toBe('tel')
  })

  it('detects the coverLetter textarea', () => {
    const f = find(fields, 'coverLetter') ?? find(fields, 'Cover Letter')
    expect(f).toBeDefined()
    expect(f?.kind).toBe('textarea')
    expect(f?.label.toLowerCase()).toContain('cover letter')
  })

  it('detects the lastName field with its label', () => {
    const f = find(fields, 'lastName') ?? find(fields, 'Last Name')
    expect(f).toBeDefined()
    expect(f?.kind).toBe('text')
    expect(f?.label.toLowerCase()).toContain('last name')
  })
})
