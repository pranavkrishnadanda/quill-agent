// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'

/** Regression tests for reviewer finding:
 *  Specialized ATS detectors must be imported by their content scripts.
 *  Absence of the import means the runtime falls back to the generic detector
 *  and the specialized-detector tests pass in isolation but never fire in prod.
 */
describe('content scripts wire specialized detectors', () => {
  it('workday.ts imports detectWorkdayFields', async () => {
    const src = await import('../../src/content/workday.ts?raw' as string).catch(async () => {
      // Fallback: read the source directly since Vite raw imports may not be enabled in vitest.
      const fs = await import('node:fs/promises')
      const url = await import('node:url')
      const path = await import('node:path')
      const here = path.dirname(url.fileURLToPath(import.meta.url))
      return { default: await fs.readFile(path.resolve(here, '../../src/content/workday.ts'), 'utf-8') }
    })
    const source: string = (src as { default: string }).default
    expect(source).toMatch(/from ['"].+detectors\/workday-detectors\.(?:js|ts)['"]/)
    expect(source).toMatch(/detectWorkdayFields/)
  })

  it('linkedin.ts imports detectLinkedInFields', async () => {
    const fs = await import('node:fs/promises')
    const url = await import('node:url')
    const path = await import('node:path')
    const here = path.dirname(url.fileURLToPath(import.meta.url))
    const src = await fs.readFile(path.resolve(here, '../../src/content/linkedin.ts'), 'utf-8')
    expect(src).toMatch(/from ['"].+detectors\/linkedin-detectors\.(?:js|ts)['"]/)
    expect(src).toMatch(/detectLinkedInFields/)
  })

  it('icims.ts imports detectICIMSFields', async () => {
    const fs = await import('node:fs/promises')
    const url = await import('node:url')
    const path = await import('node:path')
    const here = path.dirname(url.fileURLToPath(import.meta.url))
    const src = await fs.readFile(path.resolve(here, '../../src/content/icims.ts'), 'utf-8')
    expect(src).toMatch(/from ['"].+detectors\/icims-detectors\.(?:js|ts)['"]/)
    expect(src).toMatch(/detectICIMSFields/)
  })
})
