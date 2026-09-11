// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { detectOtpField } from '../../src/lib/otp-detector'

describe('detectOtpField', () => {
  it('matches input with autocomplete="one-time-code"', () => {
    document.body.innerHTML = '<input id="a" autocomplete="one-time-code" />'
    const result = detectOtpField(document)
    expect(result).not.toBeNull()
    expect(result?.element.id).toBe('a')
    expect(result?.reason).toBe('autocomplete')
  })

  it('matches input with name="otp"', () => {
    document.body.innerHTML = '<input id="b" name="otp" />'
    const result = detectOtpField(document)
    expect(result).not.toBeNull()
    expect(result?.element.id).toBe('b')
    expect(result?.reason).toBe('name')
  })

  it('matches input with name="verification_code"', () => {
    document.body.innerHTML = '<input id="c" name="verification_code" />'
    const result = detectOtpField(document)
    expect(result).not.toBeNull()
    expect(result?.element.id).toBe('c')
    expect(result?.reason).toBe('name')
  })

  it('matches input via associated label text "Verification code"', () => {
    document.body.innerHTML =
      '<label for="d">Verification code</label><input id="d" name="code123" />'
    const result = detectOtpField(document)
    expect(result).not.toBeNull()
    expect(result?.element.id).toBe('d')
    expect(result?.reason).toBe('label')
  })

  it('matches text input with maxlength=6 as length-hint', () => {
    document.body.innerHTML = '<input id="e" type="text" maxlength="6" />'
    const result = detectOtpField(document)
    expect(result).not.toBeNull()
    expect(result?.element.id).toBe('e')
    expect(result?.reason).toBe('length-hint')
  })

  it('returns null for normal text field with no OTP hints', () => {
    document.body.innerHTML = '<input id="f" type="text" name="firstName" />'
    const result = detectOtpField(document)
    expect(result).toBeNull()
  })

  it('returns the first matching candidate when multiple exist', () => {
    document.body.innerHTML = [
      '<input id="first" autocomplete="one-time-code" />',
      '<input id="second" name="otp" />',
      '<input id="third" name="verification_code" />',
    ].join('')
    const result = detectOtpField(document)
    expect(result).not.toBeNull()
    expect(result?.element.id).toBe('first')
  })

  it('returns null when there are no inputs at all', () => {
    document.body.innerHTML = '<div>nothing here</div>'
    const result = detectOtpField(document)
    expect(result).toBeNull()
  })

  it('returns null when only non-text inputs like checkboxes are present', () => {
    document.body.innerHTML = '<input id="g" type="checkbox" name="otp" />'
    const result = detectOtpField(document)
    expect(result).toBeNull()
  })
})
