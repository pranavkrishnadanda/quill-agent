// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { applyFillPlan, type FillPlan } from '../../src/content/base.ts'

describe('applyFillPlan', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="fullName" name="full_name" type="text" />
      <input id="email" name="email" type="email" />
      <textarea id="cover" name="cover_letter"></textarea>
      <select id="years" name="years">
        <option value="0-1">0-1</option>
        <option value="2-4">2-4</option>
        <option value="5+">5+</option>
      </select>
    `
  })

  it('fills text input by selector and dispatches input+change events', () => {
    let inputCount = 0
    let changeCount = 0
    document.getElementById('fullName')!.addEventListener('input', () => inputCount++)
    document.getElementById('fullName')!.addEventListener('change', () => changeCount++)

    const plan: FillPlan = { values: { '[name="full_name"]': 'Ada Lovelace' } }
    const r = applyFillPlan(plan)

    expect((document.getElementById('fullName') as HTMLInputElement).value).toBe('Ada Lovelace')
    expect(r.filled).toBe(1)
    expect(r.skipped).toEqual([])
    expect(inputCount).toBe(1)
    expect(changeCount).toBe(1)
  })

  it('fills textarea', () => {
    const plan: FillPlan = { values: { '[name="cover_letter"]': 'Hello world.' } }
    const r = applyFillPlan(plan)
    expect((document.getElementById('cover') as HTMLTextAreaElement).value).toBe('Hello world.')
    expect(r.filled).toBe(1)
  })

  it('fills select by option value', () => {
    const plan: FillPlan = { values: { '[name="years"]': '2-4' } }
    const r = applyFillPlan(plan)
    expect((document.getElementById('years') as HTMLSelectElement).value).toBe('2-4')
    expect(r.filled).toBe(1)
  })

  it('fills select by option text as fallback', () => {
    const plan: FillPlan = { values: { '[name="years"]': '5+' } }
    const r = applyFillPlan(plan)
    expect((document.getElementById('years') as HTMLSelectElement).value).toBe('5+')
    expect(r.filled).toBe(1)
  })

  it('records skipped for missing selector', () => {
    const plan: FillPlan = { values: { '[name="does_not_exist"]': 'x' } }
    const r = applyFillPlan(plan)
    expect(r.filled).toBe(0)
    expect(r.skipped).toEqual(['[name="does_not_exist"]'])
  })

  it('fills multiple fields in one call', () => {
    const plan: FillPlan = {
      values: {
        '[name="full_name"]': 'Ada',
        '[name="email"]': 'ada@example.com',
        '[name="years"]': '0-1',
      },
    }
    const r = applyFillPlan(plan)
    expect(r.filled).toBe(3)
    expect(r.skipped).toEqual([])
    expect((document.getElementById('fullName') as HTMLInputElement).value).toBe('Ada')
    expect((document.getElementById('email') as HTMLInputElement).value).toBe('ada@example.com')
    expect((document.getElementById('years') as HTMLSelectElement).value).toBe('0-1')
  })
})
