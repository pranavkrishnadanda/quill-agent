/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { detectFieldsFromDom } from '../../src/content/base.js'

function buildLeverForm(): Document {
  const doc = document.implementation.createHTMLDocument('lever')
  doc.body.innerHTML = `
    <form>
      <label for="name">Full name</label>
      <input id="name" name="name" type="text" required />

      <label for="email">Email</label>
      <input id="email" name="email" type="email" required />

      <label for="current_company">Current company</label>
      <input id="current_company" name="current_company" type="text" />

      <label for="urls[LinkedIn]">LinkedIn URL</label>
      <input id="urls[LinkedIn]" name="urls[LinkedIn]" type="url" />

      <label for="additional_information">Additional information</label>
      <textarea id="additional_information" name="additional_information"></textarea>
    </form>
  `
  return doc
}

describe('detectFieldsFromDom (Lever)', () => {
  it('detects all expected Lever fields', () => {
    const fields = detectFieldsFromDom(buildLeverForm())
    const byName = Object.fromEntries(
      fields.map((f) => [f.label.replace(/\s+/g, ' ').trim(), f]),
    )
    expect(fields).toHaveLength(5)
    expect(byName['Full name'].kind).toBe('text')
    expect(byName['Full name'].required).toBe(true)
    expect(byName['Email'].kind).toBe('email')
    expect(byName['Email'].required).toBe(true)
    expect(byName['Current company'].kind).toBe('text')
    expect(byName['LinkedIn URL'].kind).toBe('text')
    expect(byName['Additional information'].kind).toBe('textarea')
  })

  it('produces selectors keyed by name attribute', () => {
    const fields = detectFieldsFromDom(buildLeverForm())
    const selectors = fields.map((f) => f.selector)
    expect(selectors.some((s) => s.includes('[name="name"]'))).toBe(true)
    expect(selectors.some((s) => s.includes('[name="email"]'))).toBe(true)
    expect(selectors.some((s) => s.includes('[name="urls[LinkedIn]"]'))).toBe(true)
    expect(selectors.some((s) => s.includes('[name="additional_information"]'))).toBe(true)
  })

  it('marks non-required fields accordingly', () => {
    const fields = detectFieldsFromDom(buildLeverForm())
    const company = fields.find((f) => f.label === 'Current company')
    expect(company?.required).toBe(false)
  })
})
