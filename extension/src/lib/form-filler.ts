export interface FillResult { filled: number; skipped: string[] }

export function fillFieldsBySelector(doc: Document, values: Record<string, string>): FillResult {
  let filled = 0
  const skipped: string[] = []
  for (const [selector, value] of Object.entries(values)) {
    const el = doc.querySelector(selector)
    if (!el) { skipped.push(selector); continue }
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.value = value
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      filled++
    } else if (el instanceof HTMLSelectElement) {
      const opt = Array.from(el.options).find(o => o.value === value || o.text === value)
      if (opt) { el.value = opt.value; el.dispatchEvent(new Event('change', { bubbles: true })); filled++ }
      else skipped.push(selector)
    } else {
      skipped.push(selector)
    }
  }
  return { filled, skipped }
}
