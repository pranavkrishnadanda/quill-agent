/**
 * LinkedIn Easy Apply modal field detector.
 *
 * Scans elements within the Easy Apply modal (`.jobs-easy-apply-modal` or
 * `[data-test-modal]`) and returns a lightweight descriptor for each field.
 * Radio groups are collapsed to a single entry keyed by the shared `name`
 * attribute so the fill layer can target the group rather than each option.
 */

export type LinkedInFieldKind =
  | 'text'
  | 'email'
  | 'tel'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'file'
  | 'radio'
  | 'unknown'

export interface LinkedInDetectedField {
  selector: string
  label: string
  kind: LinkedInFieldKind
}

const cssEscape = (v: string): string =>
  typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(v) : v.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`)

const MODAL_SELECTOR = '.jobs-easy-apply-modal, [data-test-modal], .jobs-easy-apply-form-element'

function findModalRoots(doc: Document): Element[] {
  const explicit = Array.from(doc.querySelectorAll(MODAL_SELECTOR))
  if (explicit.length > 0) return explicit
  // Fallback: treat the whole body as the root so unstyled test fixtures still detect.
  const body = doc.body
  return body ? [body] : []
}

function classifyKind(el: Element): LinkedInFieldKind {
  const tag = el.tagName.toLowerCase()
  if (tag === 'textarea') return 'textarea'
  if (tag === 'select') return 'select'
  const type = ((el as HTMLInputElement).type ?? 'text').toLowerCase()
  if (type === 'email') return 'email'
  if (type === 'tel') return 'tel'
  if (type === 'file') return 'file'
  if (type === 'checkbox') return 'checkbox'
  if (type === 'radio') return 'radio'
  if (type === 'text' || type === 'url' || type === 'number' || type === 'search') return 'text'
  return 'unknown'
}

function labelForControl(el: Element, root: Element | Document): string {
  const id = el.id
  if (id) {
    const lab = root.querySelector(`label[for="${cssEscape(id)}"]`)
    if (lab && lab.textContent) return lab.textContent.trim()
  }
  const wrapping = el.closest('label')
  if (wrapping && wrapping.textContent) return wrapping.textContent.trim()
  return ''
}

function legendForGroup(el: Element): string {
  const fs = el.closest('fieldset')
  if (!fs) return ''
  const legend = fs.querySelector('legend')
  if (legend && legend.textContent) return legend.textContent.trim()
  // LinkedIn sometimes uses span[data-test-form-builder-radio-button-form-component__title]
  // or a div with role="group"/aria-label at the fieldset level.
  const aria = fs.getAttribute('aria-label')
  if (aria) return aria.trim()
  return ''
}

export function detectLinkedInFields(doc: Document = document): LinkedInDetectedField[] {
  const roots = findModalRoots(doc)
  if (roots.length === 0) return []

  const out: LinkedInDetectedField[] = []
  const seenRadioGroups = new Set<string>()
  const seenControls = new WeakSet<Element>()

  for (const root of roots) {
    const controls = Array.from(root.querySelectorAll('input, textarea, select'))
    for (const el of controls) {
      if (seenControls.has(el)) continue
      seenControls.add(el)
      const id = el.id
      const name = el.getAttribute('name') || ''
      if (!id && !name) continue

      const kind = classifyKind(el)

      if (kind === 'radio') {
        // Collapse group by shared name attribute.
        const groupKey = name || id
        if (!groupKey || seenRadioGroups.has(groupKey)) continue
        seenRadioGroups.add(groupKey)
        const legend = legendForGroup(el) || labelForControl(el, root) || groupKey
        const selector = name ? `input[type="radio"][name="${cssEscape(name)}"]` : `#${cssEscape(id)}`
        out.push({ selector, label: legend, kind: 'radio' })
        continue
      }

      const label = labelForControl(el, root) || legendForGroup(el) || name || id
      const selector = id
        ? `#${cssEscape(id)}`
        : `[name="${cssEscape(name)}"]`
      out.push({ selector, label, kind })
    }
  }

  return out
}
