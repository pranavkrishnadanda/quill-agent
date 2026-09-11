import { describe, it, expect } from 'vitest'
import { detectFormFields } from '../../src/matcher/field-detector.js'

describe('detectFormFields', () => {
  it('detects a simple text input', () => {
    const { fields } = detectFormFields({ html: '<input name="fullName" type="text">' })
    expect(fields).toHaveLength(1)
    expect(fields[0]).toMatchObject({ label: 'fullName', kind: 'text', required: false })
  })

  it('detects email input with required flag', () => {
    const { fields } = detectFormFields({ html: '<input type="email" name="email" required>' })
    expect(fields).toHaveLength(1)
    expect(fields[0]).toMatchObject({ label: 'email', kind: 'email', required: true })
  })

  it('detects a textarea as kind=textarea', () => {
    const { fields } = detectFormFields({ html: '<textarea name="cover_letter"></textarea>' })
    expect(fields).toHaveLength(1)
    expect(fields[0].kind).toBe('textarea')
    expect(fields[0].label).toBe('cover_letter')
  })

  it('detects a select and extracts options', () => {
    const html = '<select name="years"><option>0-1</option><option>2-5</option></select>'
    const { fields } = detectFormFields({ html })
    expect(fields).toHaveLength(1)
    expect(fields[0].kind).toBe('select')
    expect(fields[0].options).toEqual(['0-1', '2-5'])
  })

  it('detects multiple inputs of mixed kinds', () => {
    const html = [
      '<input name="first" type="text">',
      '<input name="e" type="email" required>',
      '<textarea name="notes"></textarea>',
      '<select name="lvl"><option>a</option></select>',
    ].join('\n')
    const { fields } = detectFormFields({ html })
    expect(fields).toHaveLength(4)
    const kinds = fields.map(f => f.kind).sort()
    expect(kinds).toEqual(['email', 'select', 'text', 'textarea'])
  })

  it('returns empty array when HTML contains no form inputs', () => {
    const { fields } = detectFormFields({ html: '<div><p>Hello world</p></div>' })
    expect(fields).toEqual([])
  })

  it('detects tel and file input kinds', () => {
    const html = '<input name="phone" type="tel"><input name="resume" type="file" required>'
    const { fields } = detectFormFields({ html })
    expect(fields).toHaveLength(2)
    expect(fields[0]).toMatchObject({ kind: 'tel', label: 'phone', required: false })
    expect(fields[1]).toMatchObject({ kind: 'file', label: 'resume', required: true })
  })

  it('emits a selector using the field name', () => {
    const { fields } = detectFormFields({ html: '<input name="fullName" type="text">' })
    expect(fields[0].selector).toBe('[name="fullName"]')
  })
})
