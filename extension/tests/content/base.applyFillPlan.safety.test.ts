// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { applyFillPlan } from '../../src/content/base.ts'

/** Regression tests for reviewer findings:
 *  - checkbox with value="true" must actually check the box (not silently set .value)
 *  - file input must be skipped, never throw InvalidStateError
 *  - radio group must pick the matching value's radio, not silently succeed
 *  - unfilled targets must appear in `skipped` with an entry in `errors`
 *  - result.ok reflects whether at least one field made real progress
 */
describe('applyFillPlan — safety against silent-success bugs', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('actually checks a checkbox when value is truthy', () => {
    document.body.innerHTML = '<input id="tos" type="checkbox" name="tos" />'
    const cb = document.getElementById('tos') as HTMLInputElement
    expect(cb.checked).toBe(false)
    const r = applyFillPlan({ values: { '[name="tos"]': 'true' } })
    expect(cb.checked).toBe(true)
    expect(r.filled).toBe(1)
    expect(r.skipped).toEqual([])
  })

  it('unchecks a checkbox when value is falsy', () => {
    document.body.innerHTML = '<input id="tos" type="checkbox" name="tos" checked />'
    const cb = document.getElementById('tos') as HTMLInputElement
    expect(cb.checked).toBe(true)
    const r = applyFillPlan({ values: { '[name="tos"]': 'false' } })
    expect(cb.checked).toBe(false)
    expect(r.filled).toBe(1)
  })

  it('never throws on file inputs and marks them skipped with an error', () => {
    document.body.innerHTML = '<input id="resume" type="file" name="resume" />'
    expect(() => applyFillPlan({ values: { '[name="resume"]': '/path/to/resume.pdf' } })).not.toThrow()
    const r = applyFillPlan({ values: { '[name="resume"]': '/path/to/resume.pdf' } })
    expect(r.filled).toBe(0)
    expect(r.skipped).toContain('[name="resume"]')
    expect(r.errors['[name="resume"]']).toMatch(/file inputs cannot be filled/)
  })

  it('picks the correct radio in a group and .checked flips', () => {
    document.body.innerHTML = `
      <input type="radio" name="work_auth" value="Yes" id="yes" />
      <input type="radio" name="work_auth" value="No" id="no" />
    `
    const yes = document.getElementById('yes') as HTMLInputElement
    const no = document.getElementById('no') as HTMLInputElement
    expect(yes.checked).toBe(false)
    const r = applyFillPlan({
      values: { 'input[type="radio"][name="work_auth"]': 'Yes' },
    })
    // Depending on the selector the plan uses, either the first-matching radio's group is scanned.
    // Our impl looks up the group by name attribute and finds the one whose .value === 'Yes'.
    expect(yes.checked).toBe(true)
    expect(no.checked).toBe(false)
    expect(r.filled).toBe(1)
  })

  it('records error when radio value has no matching option', () => {
    document.body.innerHTML = `
      <input type="radio" name="work_auth" value="Yes" />
      <input type="radio" name="work_auth" value="No" />
    `
    const r = applyFillPlan({ values: { 'input[type="radio"][name="work_auth"]': 'Maybe' } })
    expect(r.filled).toBe(0)
    expect(r.skipped).toContain('input[type="radio"][name="work_auth"]')
    expect(r.errors['input[type="radio"][name="work_auth"]']).toMatch(/no radio in group/)
  })

  it('records error when select value has no matching option', () => {
    document.body.innerHTML = `
      <select id="country" name="country">
        <option value="US">United States</option>
      </select>
    `
    const r = applyFillPlan({ values: { '[name="country"]': 'Atlantis' } })
    expect(r.filled).toBe(0)
    expect(r.skipped).toContain('[name="country"]')
    expect(r.errors['[name="country"]']).toMatch(/no option/)
  })

  it('skips submit/reset/hidden/button inputs silently (no errors, no fills)', () => {
    document.body.innerHTML = `
      <input type="submit" name="s" />
      <input type="reset" name="r" />
      <input type="hidden" name="h" />
      <input type="button" name="b" />
    `
    const r = applyFillPlan({
      values: {
        '[name="s"]': 'go', '[name="r"]': 'x', '[name="h"]': 'y', '[name="b"]': 'z',
      },
    })
    expect(r.filled).toBe(0)
    expect(r.skipped).toHaveLength(4)
    // These are legitimately non-fillable; no errors recorded.
    expect(Object.keys(r.errors)).toEqual([])
  })

  it('fill result is safe when some fields succeed and some fail', () => {
    document.body.innerHTML = `
      <input id="name" name="name" type="text" />
      <input id="resume" name="resume" type="file" />
    `
    const r = applyFillPlan({
      values: {
        '[name="name"]': 'Ada',
        '[name="resume"]': '/tmp/x.pdf',
      },
    })
    expect(r.filled).toBe(1)
    expect(r.skipped).toContain('[name="resume"]')
    expect((document.getElementById('name') as HTMLInputElement).value).toBe('Ada')
  })
})
