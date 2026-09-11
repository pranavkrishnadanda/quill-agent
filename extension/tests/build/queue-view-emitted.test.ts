import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const here = path.dirname(url.fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '../..')

/** Regression test for reviewer finding:
 *  The queue-view page must be declared in vite's rollup input and in the manifest's
 *  web_accessible_resources so `chrome.runtime.getURL('src/popup/queue-view.html')` resolves
 *  after a build.
 */
describe('queue-view is packaged', () => {
  it('vite.config.ts declares queue-view as a rollup input', () => {
    const src = fs.readFileSync(path.join(repoRoot, 'vite.config.ts'), 'utf-8')
    expect(src).toMatch(/queue-view/)
    expect(src).toMatch(/rollupOptions/)
  })

  it('manifest.json declares queue-view.html as a web_accessible_resource', () => {
    const m = JSON.parse(fs.readFileSync(path.join(repoRoot, 'manifest.json'), 'utf-8')) as {
      web_accessible_resources?: Array<{ resources: string[]; matches: string[] }>
    }
    expect(m.web_accessible_resources).toBeDefined()
    const resources = (m.web_accessible_resources ?? []).flatMap((r) => r.resources)
    expect(resources).toContain('src/popup/queue-view.html')
  })
})
