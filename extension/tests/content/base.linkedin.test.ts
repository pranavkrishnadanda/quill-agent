/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { detectFieldsFromDom, type DetectedField } from '../../src/content/base.js'

const FIXTURE_PATH = resolve(__dirname, '../fixtures/linkedin-form.html')
const LINKEDIN_HTML = readFileSync(FIXTURE_PATH, 'utf8')

describe('detectFieldsFromDom (LinkedIn Easy Apply)', () => {
  let fields: DetectedField[]

  beforeEach(() => {
    document.body.innerHTML = LINKEDIN_HTML
    fields = detectFieldsFromDom(document)
  })

  it('detects the phone tel input', () => {
    const phone = fields.find((f) => f.selector.includes('phoneNumber'))
    expect(phone).toBeDefined()
    expect(phone?.kind).toBe('tel')
    expect(phone?.label.toLowerCase()).toContain('mobile phone')
  })

  it('detects the phone country code select with options', () => {
    const country = fields.find((f) => f.selector.includes('phoneCountryCode'))
    expect(country).toBeDefined()
    expect(country?.kind).toBe('select')
    expect(country?.required).toBe(true)
    // options include the placeholder + 4 real options
    expect(country?.options?.length).toBe(5)
    expect(country?.options).toEqual(
      expect.arrayContaining([
        'United States (+1)',
        'United Kingdom (+44)',
        'India (+91)',
        'Germany (+49)',
      ]),
    )
  })

  it('detects the cover letter textarea', () => {
    const cover = fields.find((f) => f.selector.includes('coverLetter'))
    expect(cover).toBeDefined()
    expect(cover?.kind).toBe('textarea')
    expect(cover?.label.toLowerCase()).toContain('cover letter')
  })

  it('does not classify radio inputs as text/select/textarea (radios not currently supported)', () => {
    // Radios have a `name` so base still enumerates them, but their kind is not
    // any of the supported form-fill kinds. We assert none of them come back as
    // one of the "fillable" kinds so downstream form filling won't misapply.
    const radios = fields.filter((f) => f.selector.includes('yearsOfExperience'))
    expect(radios.length).toBe(4)
    // Radios are now first-class — applyFillPlan handles .checked semantics.
    for (const r of radios) {
      expect(r.kind).toBe('radio')
    }
  })

  it('detects the expected total number of fields (3 supported + 4 radio placeholders)', () => {
    // 1 tel input + 1 select + 1 textarea + 4 radios (same name) = 7 detected entries.
    expect(fields).toHaveLength(7)
    const supported = fields.filter((f) =>
      (['text', 'email', 'tel', 'textarea', 'select', 'file', 'checkbox'] as DetectedField['kind'][]).includes(
        f.kind,
      ),
    )
    expect(supported).toHaveLength(3)
  })
})
