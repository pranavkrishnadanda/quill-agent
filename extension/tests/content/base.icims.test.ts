import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { detectFieldsFromDom, type DetectedField } from '../../src/content/base'

const FIXTURE_PATH = resolve(__dirname, '../fixtures/icims-form.html')
const ICIMS_HTML = readFileSync(FIXTURE_PATH, 'utf8')

function find(fields: DetectedField[], needle: string): DetectedField | undefined {
  const lower = needle.toLowerCase()
  return fields.find(
    (f) => f.label.toLowerCase().includes(lower) || f.selector.toLowerCase().includes(lower),
  )
}

describe('detectFieldsFromDom - iCIMS form fixture', () => {
  let fields: DetectedField[]

  beforeEach(() => {
    document.body.innerHTML = ICIMS_HTML
    fields = detectFieldsFromDom(document)
  })

  it('detects multiple fillable fields (excluding file upload)', () => {
    // Personal (7 text/email/tel + 2 selects) + eligibility (2 selects)
    // + experience (5 text/number/url + 1 textarea + 1 select). File input excluded.
    expect(fields.length).toBeGreaterThanOrEqual(10)
  })

  it('detects the First Name text field via its label', () => {
    const f = find(fields, 'First Name')
    expect(f).toBeDefined()
    expect(f?.kind).toBe('text')
    expect(f?.label.toLowerCase()).toContain('first name')
  })

  it('detects the Last Name text field via its label', () => {
    const f = find(fields, 'Last Name')
    expect(f).toBeDefined()
    expect(f?.kind).toBe('text')
    expect(f?.label.toLowerCase()).toContain('last name')
  })

  it('detects the Email field with email kind', () => {
    const f = find(fields, 'Email')
    expect(f).toBeDefined()
    expect(f?.kind).toBe('email')
  })

  it('detects the Phone field with tel kind', () => {
    const f = find(fields, 'Phone')
    expect(f).toBeDefined()
    expect(f?.kind).toBe('tel')
  })

  it('detects the Cover Letter textarea', () => {
    const f = find(fields, 'Cover Letter')
    expect(f).toBeDefined()
    expect(f?.kind).toBe('textarea')
    expect(f?.label.toLowerCase()).toContain('cover letter')
  })

  it('surfaces the file input but classifies it as kind="file" (LLM plan can skip these)', () => {
    const f = fields.find((x) => x.selector.includes('fld12380'))
    expect(f).toBeDefined()
    expect(f?.kind).toBe('file')
  })
})
