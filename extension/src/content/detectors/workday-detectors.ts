/**
 * Workday-specific field detectors.
 *
 * Workday renders forms with heavy use of `data-automation-id` attributes and
 * frequently nests portions of the flow inside iframes. This helper walks a
 * given document (defaulting to the top-level `document`) and returns a
 * normalized list of detected fields keyed by their automation id.
 */

export interface WorkdayDetectedField {
  selector: string;
  label: string;
  kind: string;
}

type WorkdayKindSuffix = 'input' | 'textarea' | 'dropdown' | 'fileupload';

const SUFFIX_KIND: Record<WorkdayKindSuffix, string> = {
  input: 'text',
  textarea: 'textarea',
  dropdown: 'select',
  fileupload: 'file',
};

function cssEscapeAttr(value: string): string {
  // Escape characters that would break an attribute selector value inside
  // double quotes. Workday automation ids are typically simple identifiers,
  // but we defensively handle backslash and double-quote.
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function matchSuffix(automationId: string): WorkdayKindSuffix | null {
  const lower = automationId.toLowerCase();
  if (lower.endsWith('fileupload')) return 'fileupload';
  if (lower.endsWith('dropdown')) return 'dropdown';
  if (lower.endsWith('textarea')) return 'textarea';
  if (lower.endsWith('input')) return 'input';
  return null;
}

function resolveKind(automationId: string, suffix: WorkdayKindSuffix): string {
  if (suffix === 'input') {
    const lower = automationId.toLowerCase();
    if (lower.includes('email')) return 'email';
    if (lower.includes('phone')) return 'tel';
    return 'text';
  }
  return SUFFIX_KIND[suffix];
}

function readLabel(el: Element): string {
  // Walk ancestors looking for an element that itself has a
  // data-automation-id ending in "Label", or a descendant with such an id.
  let node: Element | null = el.parentElement;
  let depth = 0;
  while (node && depth < 6) {
    const labelEl = node.querySelector('[data-automation-id$="Label" i]');
    if (labelEl && labelEl.textContent) {
      const text = labelEl.textContent.trim();
      if (text) return text;
    }
    node = node.parentElement;
    depth += 1;
  }
  const aria = el.getAttribute('aria-label');
  if (aria && aria.trim()) return aria.trim();
  return '';
}

export function detectWorkdayFields(
  doc: Document = document,
): WorkdayDetectedField[] {
  const results: WorkdayDetectedField[] = [];
  const seen = new Set<string>();
  const elements = doc.querySelectorAll<HTMLElement>('[data-automation-id]');
  elements.forEach((el) => {
    const automationId = el.getAttribute('data-automation-id');
    if (!automationId) return;
    const suffix = matchSuffix(automationId);
    if (!suffix) return;
    const selector = `[data-automation-id="${cssEscapeAttr(automationId)}"]`;
    if (seen.has(selector)) return;
    seen.add(selector);
    results.push({
      selector,
      label: readLabel(el),
      kind: resolveKind(automationId, suffix),
    });
  });
  return results;
}
