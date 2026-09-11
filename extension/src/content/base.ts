import { detectOtpField } from '../lib/otp-detector.js'

export type FieldKind =
  | 'text'
  | 'email'
  | 'tel'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'file'
  | 'radio'
  | 'unknown'

export interface DetectedField {
  selector: string
  label: string
  kind: FieldKind
  required?: boolean
  options?: string[]
}

export interface FillPlan {
  values: Record<string, string>
}

export interface FillResult {
  filled: number
  skipped: string[]
  errors: Record<string, string>
}

const cssEscape = (v: string): string =>
  typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(v) : v.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`)

export function detectFieldsFromDom(doc: Document = document): DetectedField[] {
  const out: DetectedField[] = []
  for (const el of Array.from(doc.querySelectorAll('input, textarea, select'))) {
    const name = el.getAttribute('name') || el.id
    if (!name) continue
    const type = (el as HTMLInputElement).type ?? 'text'
    const tag = el.tagName.toLowerCase()
    let kind: FieldKind = 'unknown'
    if (tag === 'textarea') kind = 'textarea'
    else if (tag === 'select') kind = 'select'
    else if (type === 'email') kind = 'email'
    else if (type === 'tel') kind = 'tel'
    else if (type === 'file') kind = 'file'
    else if (type === 'checkbox') kind = 'checkbox'
    else if (type === 'radio') kind = 'radio'
    else if (type === 'text' || type === 'url') kind = 'text'
    const labelText = findLabelText(el, doc)
    const required = (el as HTMLInputElement).required
    const options =
      tag === 'select'
        ? Array.from((el as HTMLSelectElement).options).map((o) => o.text.trim())
        : undefined
    const selector = name.startsWith('#') ? name : `[name="${name}"], #${cssEscape(name)}`
    out.push({ selector, label: labelText || name, kind, required, options })
  }
  return out
}

function findLabelText(el: Element, doc: Document = document): string {
  const id = el.id
  if (id) {
    const lab = doc.querySelector(`label[for="${cssEscape(id)}"]`)
    if (lab) return (lab.textContent || '').trim()
  }
  const parent = el.closest('label')
  if (parent) return (parent.textContent || '').trim()
  return ''
}

/** Truthy check for checkbox values arriving from an LLM plan. */
function isTruthy(v: string): boolean {
  const s = v.trim().toLowerCase()
  return s === 'true' || s === '1' || s === 'yes' || s === 'on' || s === 'checked'
}

/** Apply a fill plan to the DOM. Dispatches input+change events so framework listeners fire.
 *  Refuses to write to file inputs (browser security throws InvalidStateError).
 *  Handles checkbox and radio inputs by setting .checked instead of .value.
 *  Records per-selector errors instead of throwing. */
export function applyFillPlan(plan: FillPlan, doc: Document = document): FillResult {
  let filled = 0
  const skipped: string[] = []
  const errors: Record<string, string> = {}

  for (const [selector, value] of Object.entries(plan.values)) {
    const el = doc.querySelector(selector)
    if (!el) { skipped.push(selector); continue }

    try {
      if (el instanceof HTMLInputElement) {
        const type = (el.type || 'text').toLowerCase()

        // File inputs can't be programmatically set (browser security).
        if (type === 'file') {
          skipped.push(selector)
          errors[selector] = 'file inputs cannot be filled programmatically'
          continue
        }

        // Buttons/hidden inputs aren't user-facing form fields.
        if (type === 'button' || type === 'submit' || type === 'reset' || type === 'image' || type === 'hidden') {
          skipped.push(selector)
          continue
        }

        if (type === 'checkbox') {
          const nextChecked = isTruthy(value)
          if (el.checked !== nextChecked) {
            el.checked = nextChecked
            el.dispatchEvent(new Event('input', { bubbles: true }))
            el.dispatchEvent(new Event('change', { bubbles: true }))
          }
          filled++
          continue
        }

        if (type === 'radio') {
          // Value semantics: match the radio in the same group whose .value === value.
          const name = el.name
          const group = name
            ? Array.from(doc.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${cssEscape(name)}"]`))
            : [el]
          const target = group.find((r) => r.value === value)
          if (!target) {
            skipped.push(selector)
            errors[selector] = `no radio in group "${name}" has value "${value}"`
            continue
          }
          target.checked = true
          target.dispatchEvent(new Event('input', { bubbles: true }))
          target.dispatchEvent(new Event('change', { bubbles: true }))
          filled++
          continue
        }

        // Standard text-like inputs (text, email, tel, url, number, search, password).
        el.value = value
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
        filled++
        continue
      }

      if (el instanceof HTMLTextAreaElement) {
        el.value = value
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
        filled++
        continue
      }

      if (el instanceof HTMLSelectElement) {
        const opt = Array.from(el.options).find((o) => o.value === value || o.text === value)
        if (opt) {
          el.value = opt.value
          el.dispatchEvent(new Event('change', { bubbles: true }))
          filled++
        } else {
          skipped.push(selector)
          errors[selector] = `no option matches "${value}"`
        }
        continue
      }

      skipped.push(selector)
      errors[selector] = `unsupported element type: ${el.tagName.toLowerCase()}`
    } catch (e) {
      skipped.push(selector)
      errors[selector] = e instanceof Error ? e.message : String(e)
    }
  }

  return { filled, skipped, errors }
}

export interface ContentBridgeOptions {
  /** Optional detector override — used by ATSes with quirky DOMs (Workday, LinkedIn, iCIMS). */
  detector?: (doc?: Document) => DetectedField[]
}

/** Install a chrome.runtime.onMessage listener that responds to find-otp-field, get-fields, apply-fill-plan.
 *  Safe to call outside of a Chrome extension context — it becomes a no-op. */
export function installContentBridge(host: string, options: ContentBridgeOptions = {}): void {
  if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return
  const detector = options.detector ?? ((doc?: Document) => detectFieldsFromDom(doc))

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    try {
      if (msg?.type === 'find-otp-field') {
        const match = detectOtpField(document)
        // Strip the DOM element reference before sending — messages must be structured-cloneable.
        sendResponse(match ? { selector: match.selector, reason: match.reason } : null)
        return false
      }
      if (msg?.type === 'get-fields') {
        const fields = detector(document)
        sendResponse({ host, url: location.href, fields })
        return false
      }
      if (msg?.type === 'apply-fill-plan') {
        const plan = (msg.payload ?? { values: {} }) as FillPlan
        const result = applyFillPlan(plan)
        // ok = every attempted selector either filled or skipped-with-known-reason
        // AND we didn't accumulate errors on ALL of them (i.e. at least one success or nothing tried).
        const attempted = Object.keys(plan.values).length
        const errored = Object.keys(result.errors).length
        const ok = attempted === 0 ? true : errored < attempted || result.filled > 0
        sendResponse({ ok, ...result })
        return false
      }
    } catch (e) {
      sendResponse({ ok: false, filled: 0, skipped: [], errors: { _bridge: String(e) } })
      return false
    }
    return false
  })
}

/** Adapt a specialized detector (returns `{selector,label,kind}`) into `DetectedField[]`. */
export function adaptSpecializedDetector<T extends { selector: string; label: string; kind: string }>(
  fn: (doc?: Document) => T[],
): (doc?: Document) => DetectedField[] {
  const known: readonly FieldKind[] = [
    'text', 'email', 'tel', 'textarea', 'select', 'checkbox', 'file', 'radio', 'unknown',
  ]
  return (doc?: Document) =>
    fn(doc).map((f) => ({
      selector: f.selector,
      label: f.label,
      kind: (known as readonly string[]).includes(f.kind) ? (f.kind as FieldKind) : 'unknown',
    }))
}
