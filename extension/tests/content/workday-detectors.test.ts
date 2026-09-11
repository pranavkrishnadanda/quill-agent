import { describe, it, expect, beforeEach } from 'vitest'
import { detectWorkdayFields } from '../../src/content/detectors/workday-detectors'

describe('detectWorkdayFields (Workday-like form)', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('detects a simple text input with an adjacent label', () => {
    document.body.innerHTML = `
      <div>
        <div data-automation-id="firstNameLabel">First Name</div>
        <input data-automation-id="firstNameInput" type="text" />
      </div>
    `
    const fields = detectWorkdayFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].selector).toBe('[data-automation-id="firstNameInput"]')
    expect(fields[0].kind).toBe('text')
    expect(fields[0].label).toBe('First Name')
  })

  it('detects an email input via automation id keyword', () => {
    document.body.innerHTML = `
      <div>
        <div data-automation-id="emailLabel">Email Address</div>
        <input data-automation-id="emailInput" type="email" />
      </div>
    `
    const fields = detectWorkdayFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].kind).toBe('email')
    expect(fields[0].label).toBe('Email Address')
  })

  it('detects a textarea field', () => {
    document.body.innerHTML = `
      <div>
        <div data-automation-id="coverLetterLabel">Cover Letter</div>
        <textarea data-automation-id="coverLetterTextarea"></textarea>
      </div>
    `
    const fields = detectWorkdayFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].kind).toBe('textarea')
    expect(fields[0].selector).toBe('[data-automation-id="coverLetterTextarea"]')
  })

  it('detects a DropDown field', () => {
    document.body.innerHTML = `
      <div>
        <div data-automation-id="countryLabel">Country</div>
        <div data-automation-id="countryDropDown" role="combobox">
          <ul>
            <li>United States</li>
            <li>Canada</li>
          </ul>
        </div>
      </div>
    `
    const fields = detectWorkdayFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].kind).toBe('select')
    expect(fields[0].label).toBe('Country')
  })

  it('detects a FileUpload field', () => {
    document.body.innerHTML = `
      <div>
        <div data-automation-id="resumeLabel">Resume</div>
        <input data-automation-id="resumeFileUpload" type="file" />
      </div>
    `
    const fields = detectWorkdayFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].kind).toBe('file')
    expect(fields[0].selector).toBe('[data-automation-id="resumeFileUpload"]')
  })

  it('detects multiple fields on one page', () => {
    document.body.innerHTML = `
      <form>
        <div>
          <div data-automation-id="firstNameLabel">First Name</div>
          <input data-automation-id="firstNameInput" type="text" />
        </div>
        <div>
          <div data-automation-id="emailLabel">Email</div>
          <input data-automation-id="emailInput" type="email" />
        </div>
        <div>
          <div data-automation-id="phoneLabel">Phone</div>
          <input data-automation-id="phoneInput" type="tel" />
        </div>
        <div>
          <div data-automation-id="countryLabel">Country</div>
          <div data-automation-id="countryDropDown"></div>
        </div>
        <div>
          <div data-automation-id="resumeLabel">Resume</div>
          <input data-automation-id="resumeFileUpload" type="file" />
        </div>
      </form>
    `
    const fields = detectWorkdayFields(document)
    expect(fields).toHaveLength(5)
    const byKind = fields.map((f) => f.kind).sort()
    expect(byKind).toEqual(['email', 'file', 'select', 'tel', 'text'])
    const phone = fields.find((f) => f.selector.includes('phoneInput'))
    expect(phone?.kind).toBe('tel')
    expect(phone?.label).toBe('Phone')
  })

  it('returns an empty array for an empty document', () => {
    document.body.innerHTML = ''
    expect(detectWorkdayFields(document)).toEqual([])
  })

  it('falls back to aria-label when no sibling label element is present', () => {
    document.body.innerHTML = `
      <input data-automation-id="lastNameInput" type="text" aria-label="Last Name" />
    `
    const fields = detectWorkdayFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].label).toBe('Last Name')
    expect(fields[0].kind).toBe('text')
  })

  it('ignores elements whose data-automation-id does not match a known suffix', () => {
    document.body.innerHTML = `
      <div data-automation-id="pageHeader">Apply</div>
      <button data-automation-id="submitButton">Submit</button>
    `
    expect(detectWorkdayFields(document)).toEqual([])
  })
})
