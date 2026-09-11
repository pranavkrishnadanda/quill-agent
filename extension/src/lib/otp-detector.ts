export interface OtpFieldMatch {
  selector: string
  element: HTMLInputElement
  reason: 'name' | 'label' | 'autocomplete' | 'length-hint'
}

const NAME_PATTERN = /(otp|one[-_ ]?time|verif(y|ication)|2fa|mfa|auth[-_ ]?code|security[-_ ]?code|\bcode\b)/i

function buildSelector(input: HTMLInputElement, doc: Document): string {
  if (input.id) {
    const escaped =
      typeof (doc.defaultView as (Window & typeof globalThis) | null)?.CSS?.escape === 'function'
        ? (doc.defaultView as Window & typeof globalThis).CSS.escape(input.id)
        : input.id.replace(/([^a-zA-Z0-9_-])/g, '\\$1')
    return `#${escaped}`
  }
  if (input.name) {
    return `input[name="${input.name.replace(/"/g, '\\"')}"]`
  }
  const inputs = Array.from(doc.querySelectorAll('input'))
  const idx = inputs.indexOf(input)
  return `input:nth-of-type(${idx + 1})`
}

function labelTextFor(input: HTMLInputElement, doc: Document): string {
  const parts: string[] = []
  if (input.id) {
    const lbl = doc.querySelector(`label[for="${input.id.replace(/"/g, '\\"')}"]`)
    if (lbl?.textContent) parts.push(lbl.textContent)
  }
  const wrappingLabel = input.closest('label')
  if (wrappingLabel?.textContent) parts.push(wrappingLabel.textContent)
  const aria = input.getAttribute('aria-label')
  if (aria) parts.push(aria)
  const placeholder = input.getAttribute('placeholder')
  if (placeholder) parts.push(placeholder)
  return parts.join(' ')
}

/** Detect a probable OTP/verification-code input field on the current page. Returns the first match or null. */
export function detectOtpField(doc: Document = document): OtpFieldMatch | null {
  const inputs = Array.from(doc.querySelectorAll('input')) as HTMLInputElement[]
  const candidates: HTMLInputElement[] = inputs.filter((el) => {
    const type = (el.type || 'text').toLowerCase()
    return type === 'text' || type === 'tel' || type === 'number' || type === 'password' || type === ''
  })

  // 1. autocomplete="one-time-code"
  for (const el of candidates) {
    if ((el.getAttribute('autocomplete') || '').toLowerCase() === 'one-time-code') {
      return { selector: buildSelector(el, doc), element: el, reason: 'autocomplete' }
    }
  }

  // 2. name/id matches OTP pattern
  for (const el of candidates) {
    const haystack = `${el.name} ${el.id}`
    if (NAME_PATTERN.test(haystack)) {
      return { selector: buildSelector(el, doc), element: el, reason: 'name' }
    }
  }

  // 3. adjacent label/aria/placeholder matches
  for (const el of candidates) {
    const text = labelTextFor(el, doc)
    if (text && NAME_PATTERN.test(text)) {
      return { selector: buildSelector(el, doc), element: el, reason: 'label' }
    }
  }

  // 4. maxlength hint (4-8)
  for (const el of candidates) {
    const maxAttr = el.getAttribute('maxlength')
    if (!maxAttr) continue
    const max = Number.parseInt(maxAttr, 10)
    if (Number.isFinite(max) && max >= 4 && max <= 8) {
      return { selector: buildSelector(el, doc), element: el, reason: 'length-hint' }
    }
  }

  return null
}
