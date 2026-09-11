// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { fillFieldsBySelector } from '../../src/lib/form-filler'

describe('fillFieldsBySelector', () => {
  it('fills text input by selector and dispatches input+change events', () => {
    document.body.innerHTML = '<input name="fullName" />'
    const input = document.querySelector('input[name="fullName"]') as HTMLInputElement
    const events: string[] = []
    input.addEventListener('input', () => events.push('input'))
    input.addEventListener('change', () => events.push('change'))

    const result = fillFieldsBySelector(document, { 'input[name="fullName"]': 'Jane Doe' })

    expect(input.value).toBe('Jane Doe')
    expect(events).toEqual(['input', 'change'])
    expect(result.filled).toBe(1)
    expect(result.skipped).toEqual([])
  })

  it('fills textarea value', () => {
    document.body.innerHTML = '<textarea name="bio"></textarea>'
    const ta = document.querySelector('textarea[name="bio"]') as HTMLTextAreaElement

    const result = fillFieldsBySelector(document, { 'textarea[name="bio"]': 'hello world' })

    expect(ta.value).toBe('hello world')
    expect(result.filled).toBe(1)
  })

  it('fills select by option value and updates selectedIndex', () => {
    document.body.innerHTML =
      '<select name="country"><option value="us">United States</option><option value="ca">Canada</option></select>'
    const sel = document.querySelector('select[name="country"]') as HTMLSelectElement
    expect(sel.selectedIndex).toBe(0)

    const result = fillFieldsBySelector(document, { 'select[name="country"]': 'ca' })

    expect(sel.value).toBe('ca')
    expect(sel.selectedIndex).toBe(1)
    expect(result.filled).toBe(1)
  })

  it('fills select by option text as fallback', () => {
    document.body.innerHTML =
      '<select name="country"><option value="us">United States</option><option value="ca">Canada</option></select>'
    const sel = document.querySelector('select[name="country"]') as HTMLSelectElement

    const result = fillFieldsBySelector(document, { 'select[name="country"]': 'Canada' })

    expect(sel.value).toBe('ca')
    expect(sel.selectedIndex).toBe(1)
    expect(result.filled).toBe(1)
    expect(result.skipped).toEqual([])
  })

  it('records missing selectors in skipped array', () => {
    document.body.innerHTML = '<input name="present" />'

    const result = fillFieldsBySelector(document, {
      'input[name="present"]': 'ok',
      'input[name="missing"]': 'nope',
      '#doesNotExist': 'x',
    })

    expect(result.filled).toBe(1)
    expect(result.skipped).toContain('input[name="missing"]')
    expect(result.skipped).toContain('#doesNotExist')
    expect(result.skipped).toHaveLength(2)
  })
})
