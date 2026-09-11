import type { FormFieldDescriptor } from '../anthropic/types.js'
import type { FieldExtractionInput, FieldExtractionResult } from './types.js'

/** Detect form fields in an HTML fragment. Framework-agnostic. */
export function detectFormFields(input: FieldExtractionInput): FieldExtractionResult {
  // Use a simple DOM parser (linkedom is small, but we'll use plain regex here for zero-dep).
  const html = input.html
  const fields: FormFieldDescriptor[] = []
  // Find <input> tags with a name or id
  const inputRe = /<input\b[^>]*\bname=["']([^"']+)["'][^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = inputRe.exec(html)) !== null) {
    const tag = m[0]
    const name = m[1]
    const type = /\btype=["']([^"']+)["']/i.exec(tag)?.[1] ?? 'text'
    const kind = type === 'email' ? 'email' : type === 'tel' ? 'tel' : type === 'file' ? 'file' : type === 'checkbox' ? 'checkbox' : 'text'
    const required = /\brequired\b/i.test(tag)
    fields.push({ selector: `[name="${name}"]`, label: name, kind, required })
  }
  // Find <textarea>
  const taRe = /<textarea\b[^>]*\bname=["']([^"']+)["'][^>]*>/gi
  while ((m = taRe.exec(html)) !== null) {
    const name = m[1]
    const required = /\brequired\b/i.test(m[0])
    fields.push({ selector: `[name="${name}"]`, label: name, kind: 'textarea', required })
  }
  // Find <select>
  const selRe = /<select\b[^>]*\bname=["']([^"']+)["'][^>]*>([\s\S]*?)<\/select>/gi
  while ((m = selRe.exec(html)) !== null) {
    const name = m[1]
    const inner = m[2]
    const options = Array.from(inner.matchAll(/<option[^>]*>([^<]*)<\/option>/gi)).map(o => o[1].trim())
    fields.push({ selector: `[name="${name}"]`, label: name, kind: 'select', options })
  }
  return { fields }
}
