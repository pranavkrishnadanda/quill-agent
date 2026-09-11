import { describe, it, expect, beforeEach } from 'vitest'
import { detectICIMSFields } from '../../src/content/detectors/icims-detectors'

describe('detectICIMSFields (iCIMS-like form)', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('detects a text input paired with a <label for="fldXXXX">', () => {
    document.body.innerHTML = `
      <div>
        <label for="fld12345">First Name</label>
        <input id="fld12345" type="text" />
      </div>
    `
    const fields = detectICIMSFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].selector).toBe('#fld12345')
    expect(fields[0].kind).toBe('text')
    expect(fields[0].label).toBe('First Name')
  })

  it('detects an email input and preserves the "email" kind', () => {
    document.body.innerHTML = `
      <label for="fld00042">Email Address</label>
      <input id="fld00042" type="email" />
    `
    const fields = detectICIMSFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].kind).toBe('email')
    expect(fields[0].label).toBe('Email Address')
    expect(fields[0].selector).toBe('#fld00042')
  })

  it('detects a textarea control', () => {
    document.body.innerHTML = `
      <label for="fldCover">Cover Letter</label>
      <textarea id="fldCover"></textarea>
    `
    const fields = detectICIMSFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].kind).toBe('textarea')
    expect(fields[0].selector).toBe('#fldCover')
    expect(fields[0].label).toBe('Cover Letter')
  })

  it('detects a select control', () => {
    document.body.innerHTML = `
      <label for="fldCountry99">Country</label>
      <select id="fldCountry99">
        <option>United States</option>
        <option>Canada</option>
      </select>
    `
    const fields = detectICIMSFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].kind).toBe('select')
    expect(fields[0].label).toBe('Country')
  })

  it('detects a file upload input', () => {
    document.body.innerHTML = `
      <label for="fldResume">Resume</label>
      <input id="fldResume" type="file" />
    `
    const fields = detectICIMSFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].kind).toBe('file')
    expect(fields[0].selector).toBe('#fldResume')
  })

  it('detects multiple fld* fields on one page', () => {
    document.body.innerHTML = `
      <form>
        <label for="fld1">First Name</label>
        <input id="fld1" type="text" />

        <label for="fld2">Email</label>
        <input id="fld2" type="email" />

        <label for="fld3">Phone</label>
        <input id="fld3" type="tel" />

        <label for="fld4">Country</label>
        <select id="fld4"><option>US</option></select>

        <label for="fld5">Resume</label>
        <input id="fld5" type="file" />
      </form>
    `
    const fields = detectICIMSFields(document)
    expect(fields).toHaveLength(5)
    const byKind = fields.map((f) => f.kind).sort()
    expect(byKind).toEqual(['email', 'file', 'select', 'tel', 'text'])
    const phone = fields.find((f) => f.selector === '#fld3')
    expect(phone?.kind).toBe('tel')
    expect(phone?.label).toBe('Phone')
  })

  it('falls back to aria-label when no <label for> is present', () => {
    document.body.innerHTML = `
      <input id="fldLast" type="text" aria-label="Last Name" />
    `
    const fields = detectICIMSFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].label).toBe('Last Name')
    expect(fields[0].kind).toBe('text')
    expect(fields[0].selector).toBe('#fldLast')
  })

  it('ignores inputs whose id does not begin with "fld"', () => {
    document.body.innerHTML = `
      <label for="other123">Other</label>
      <input id="other123" type="text" />
      <button id="fldSubmit">Submit</button>
    `
    // Button is not a form control we scan for; other123 doesn't match fld*.
    expect(detectICIMSFields(document)).toEqual([])
  })

  it('returns an empty array for an empty document', () => {
    document.body.innerHTML = ''
    expect(detectICIMSFields(document)).toEqual([])
  })

  it('returns an empty label string when neither <label for> nor aria-label is present', () => {
    document.body.innerHTML = `<input id="fldNoLabel" type="text" />`
    const fields = detectICIMSFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].label).toBe('')
    expect(fields[0].selector).toBe('#fldNoLabel')
  })
})
