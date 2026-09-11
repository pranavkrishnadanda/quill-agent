import { describe, it, expect, beforeEach } from 'vitest'
import { detectLinkedInFields } from '../../src/content/detectors/linkedin-detectors'

/**
 * These fixtures approximate the DOM produced by the LinkedIn Easy Apply modal.
 * LinkedIn typically renders each question inside a wrapper with class
 * `jobs-easy-apply-form-element` (or similar), a `<label for="...">` bound to
 * the input by id, and groups radio choices inside a `<fieldset>` whose
 * `<legend>` carries the question text.
 */
describe('detectLinkedInFields (Easy Apply modal)', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('detects a plain text input paired with a <label for="…">', () => {
    document.body.innerHTML = `
      <div class="jobs-easy-apply-modal">
        <div class="jobs-easy-apply-form-element">
          <label for="single-line-text-form-component-0">First name</label>
          <input
            id="single-line-text-form-component-0"
            name="firstName"
            type="text"
            class="artdeco-text-input--input"
          />
        </div>
      </div>
    `
    const fields = detectLinkedInFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].kind).toBe('text')
    expect(fields[0].label).toBe('First name')
    // Selector must resolve back to the exact input element.
    const el = document.querySelector(fields[0].selector)
    expect(el).not.toBeNull()
    expect((el as HTMLInputElement).name).toBe('firstName')
  })

  it('detects a <select> dropdown question', () => {
    document.body.innerHTML = `
      <div class="jobs-easy-apply-form-element">
        <label for="text-entity-list-form-component-1">Country/Region</label>
        <select id="text-entity-list-form-component-1" name="country">
          <option value="">Select an option</option>
          <option value="US">United States</option>
          <option value="CA">Canada</option>
        </select>
      </div>
    `
    const fields = detectLinkedInFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].kind).toBe('select')
    expect(fields[0].label).toBe('Country/Region')
    const el = document.querySelector(fields[0].selector)
    expect(el?.tagName).toBe('SELECT')
  })

  it('detects a <textarea> (multi-line answer)', () => {
    document.body.innerHTML = `
      <div class="jobs-easy-apply-form-element">
        <label for="multi-line-text-form-component-2">
          Why are you interested in this role?
        </label>
        <textarea
          id="multi-line-text-form-component-2"
          name="coverLetter"
        ></textarea>
      </div>
    `
    const fields = detectLinkedInFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].kind).toBe('textarea')
    expect(fields[0].label).toBe('Why are you interested in this role?')
    const el = document.querySelector(fields[0].selector)
    expect(el?.tagName).toBe('TEXTAREA')
  })

  it('detects a radio-button group and uses the <legend> as the label', () => {
    document.body.innerHTML = `
      <div class="jobs-easy-apply-form-element">
        <fieldset data-test-form-element="radio-button-form-component">
          <legend>Are you legally authorized to work in the United States?</legend>
          <div>
            <input
              id="radio-yes"
              type="radio"
              name="workAuth"
              value="Yes"
            />
            <label for="radio-yes">Yes</label>
          </div>
          <div>
            <input
              id="radio-no"
              type="radio"
              name="workAuth"
              value="No"
            />
            <label for="radio-no">No</label>
          </div>
        </fieldset>
      </div>
    `
    const fields = detectLinkedInFields(document)
    // A radio group is one logical field, keyed by its shared `name`.
    expect(fields).toHaveLength(1)
    const [group] = fields
    expect(group.kind).toBe('radio')
    expect(group.label).toBe(
      'Are you legally authorized to work in the United States?',
    )
    // The selector should match at least one radio in the group.
    const matches = document.querySelectorAll(group.selector)
    expect(matches.length).toBeGreaterThanOrEqual(1)
    const first = matches[0] as HTMLInputElement
    expect(first.type).toBe('radio')
    expect(first.name).toBe('workAuth')
  })

  it('uses <legend> text as the label even for a single input inside a fieldset', () => {
    document.body.innerHTML = `
      <fieldset class="jobs-easy-apply-form-element">
        <legend>Years of experience with TypeScript</legend>
        <input
          id="numeric-form-component-3"
          type="text"
          name="yoeTypescript"
        />
      </fieldset>
    `
    const fields = detectLinkedInFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].label).toBe('Years of experience with TypeScript')
    expect(fields[0].kind).toBe('text')
  })

  it('detects a mixed modal with text, select, textarea, and radio-group at once', () => {
    document.body.innerHTML = `
      <form class="jobs-easy-apply-modal">
        <div class="jobs-easy-apply-form-element">
          <label for="fld-name">Full name</label>
          <input id="fld-name" type="text" name="fullName" />
        </div>
        <div class="jobs-easy-apply-form-element">
          <label for="fld-country">Country</label>
          <select id="fld-country" name="country">
            <option value="US">United States</option>
          </select>
        </div>
        <div class="jobs-easy-apply-form-element">
          <label for="fld-notes">Additional notes</label>
          <textarea id="fld-notes" name="notes"></textarea>
        </div>
        <fieldset class="jobs-easy-apply-form-element">
          <legend>Do you require sponsorship?</legend>
          <input id="spon-yes" type="radio" name="sponsor" value="Yes" />
          <label for="spon-yes">Yes</label>
          <input id="spon-no" type="radio" name="sponsor" value="No" />
          <label for="spon-no">No</label>
        </fieldset>
      </form>
    `
    const fields = detectLinkedInFields(document)
    expect(fields).toHaveLength(4)
    const byKind = fields.map((f) => f.kind).sort()
    expect(byKind).toEqual(['radio', 'select', 'text', 'textarea'])
    const radio = fields.find((f) => f.kind === 'radio')
    expect(radio?.label).toBe('Do you require sponsorship?')
    const text = fields.find((f) => f.kind === 'text')
    expect(text?.label).toBe('Full name')
  })

  it('returns an empty array when the modal has no form fields', () => {
    document.body.innerHTML = `
      <div class="jobs-easy-apply-modal">
        <h2>Contact info</h2>
        <p>Review your info before applying.</p>
      </div>
    `
    expect(detectLinkedInFields(document)).toEqual([])
  })
})
