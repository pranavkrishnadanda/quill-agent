/**
 * iCIMS-specific field detection.
 *
 * iCIMS renders form controls with ids that begin with "fld" (e.g. `fld12345`)
 * and pairs them with `<label for="fldXXXX">` elements. This detector walks
 * those controls and returns a normalized descriptor per field.
 */

export interface ICIMSDetectedField {
  selector: string;
  label: string;
  kind: string;
}

type ICIMSControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const CONTROL_SELECTOR =
  'input[id^="fld"], textarea[id^="fld"], select[id^="fld"]';

// CSS.escape polyfill fallback for older jsdom versions used in tests.
function escapeId(id: string): string {
  const css = (globalThis as { CSS?: { escape?: (s: string) => string } }).CSS;
  if (css && typeof css.escape === 'function') {
    return css.escape(id);
  }
  return id.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
}

function kindFor(el: ICIMSControl): string {
  const tag = el.tagName.toLowerCase();
  if (tag === 'textarea') return 'textarea';
  if (tag === 'select') return 'select';
  const type = (el as HTMLInputElement).type?.toLowerCase() || 'text';
  return type;
}

function labelFor(doc: Document, id: string): string {
  const labelEl = doc.querySelector<HTMLLabelElement>(
    `label[for="${escapeId(id)}"]`,
  );
  const text = labelEl?.textContent?.trim();
  if (text) return text;
  const aria = (
    doc.getElementById(id) as HTMLElement | null
  )?.getAttribute('aria-label');
  return aria?.trim() ?? '';
}

export function detectICIMSFields(
  doc: Document = document,
): ICIMSDetectedField[] {
  const controls = Array.from(
    doc.querySelectorAll<ICIMSControl>(CONTROL_SELECTOR),
  );
  const results: ICIMSDetectedField[] = [];
  const seen = new Set<string>();
  for (const el of controls) {
    const id = el.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    results.push({
      selector: `#${escapeId(id)}`,
      label: labelFor(doc, id),
      kind: kindFor(el),
    });
  }
  return results;
}
