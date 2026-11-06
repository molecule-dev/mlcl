/**
 * Every GitHub workflow job that runs mlcl's `npm test` installs the browser first, through the one shared step.
 *
 * `mlcl test-feedback` runs real Playwright files, so `npm test` needs Chromium. CI gained the browser install and
 * Release did not; the Release run then failed two tests for a missing browser while CI on the same commit passed.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '../../..')
const WORKFLOWS = join(ROOT, '.github/workflows')
const SHARED_STEP = 'uses: ./mlcl/.github/actions/test-browser'

/**
 * Names of the jobs in a workflow file that run `npm test` without the shared browser step before it.
 *
 * @param text - The workflow YAML.
 * @returns The offending job names.
 */
function jobsMissingBrowser(text: string): string[] {
  const lines = text.split('\n')
  const start = lines.findIndex((line) => line === 'jobs:')
  if (start < 0) return []
  const missing: string[] = []
  let job: string | null = null
  let seenStep = false
  for (const line of lines.slice(start + 1)) {
    const header = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line)
    if (header) {
      job = header[1]
      seenStep = false
      continue
    }
    if (!job) continue
    if (line.trim() === SHARED_STEP || line.trim() === `- ${SHARED_STEP}`) seenStep = true
    if (/^\s+(?:- )?run:\s*npm test\s*$/.test(line) && !seenStep) missing.push(job)
  }
  return missing
}

describe('workflows install the test browser before npm test', () => {
  const files = readdirSync(WORKFLOWS).filter((name) => /\.ya?ml$/.test(name))

  it('finds the workflows that run npm test', () => {
    const running = files.filter((name) =>
      /run:\s*npm test\s*$/m.test(readFileSync(join(WORKFLOWS, name), 'utf8')),
    )
    expect(running.sort()).toEqual(['ci.yml', 'release.yml'])
  })

  it.each(files)('%s runs npm test only after the shared browser step', (name) => {
    expect(jobsMissingBrowser(readFileSync(join(WORKFLOWS, name), 'utf8'))).toEqual([])
  })

  it('the shared step installs and launches the pinned Chromium', () => {
    const action = readFileSync(join(ROOT, '.github/actions/test-browser/action.yml'), 'utf8')
    expect(action).toContain('npx --no-install playwright install chromium')
    expect(action).toContain('chromium.launch()')
  })

  it('names a job that runs npm test without it', () => {
    const bad = [
      'jobs:',
      '  release:',
      '    steps:',
      '      - run: npm ci',
      '      - name: Run full test suite',
      '        run: npm test',
      '  build:',
      '    steps:',
      `      - ${SHARED_STEP}`,
      '      - run: npm test',
    ].join('\n')
    expect(jobsMissingBrowser(bad)).toEqual(['release'])
  })
})
