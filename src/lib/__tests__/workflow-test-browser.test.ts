/**
 * Every GitHub workflow job that runs mlcl's `npm test` installs the browser first, through the one shared step.
 *
 * `mlcl test-feedback` runs real Playwright files, so `npm test` needs Chromium. CI gained the browser install and
 * Release did not; the Release run then failed two tests for a missing browser while CI on the same commit passed.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

import type { WorkflowConfig } from '@molecule/api-ci-github-actions'

const ROOT = resolve(import.meta.dirname, '../../..')
const WORKFLOWS = join(ROOT, '.github/workflows')
const SHARED_STEP = 'uses: ./mlcl/.github/actions/test-browser'

// Match direct shell invocations, including ordinary environment assignments and
// npm flags. YAML decoding below handles quoting and block/folded run scripts.
const NPM_TEST =
  /(?:^|[\n;&|])\s*(?:(?:env\s+)|(?:[A-Za-z_]\w*=(?:"[^"]*"|'[^']*'|[^\s]+)\s+))*npm(?:\s+--[\w-]+(?:=[^\s]+|\s+[^\s]+)?)*\s+(?:test|run(?:-script)?\s+test)(?=\s|$|[;&|])/

/**
 * Names of the jobs in a workflow file that run `npm test` without the shared browser step before it.
 *
 * @param text - The workflow YAML.
 * @returns The offending job names.
 */
function jobsMissingBrowser(text: string): string[] {
  const workflow = parse(text) as Pick<WorkflowConfig, 'jobs'>
  const missing: string[] = []
  for (const [job, config] of Object.entries(workflow.jobs ?? {})) {
    let seenStep = false
    for (const step of config.steps ?? []) {
      if (
        step.uses === SHARED_STEP.slice('uses: '.length) &&
        step.if === undefined &&
        (step['continue-on-error'] === undefined || step['continue-on-error'] === false)
      )
        seenStep = true
      // Parse YAML first so quoted, literal and folded run scripts have the same
      // meaning. Match shell commands, not comments or an echo mentioning tests.
      if (NPM_TEST.test(step.run ?? '') && !seenStep) missing.push(job)
    }
  }
  return [...new Set(missing)]
}

describe('workflows install the test browser before npm test', () => {
  const files = readdirSync(WORKFLOWS).filter((name) => /\.ya?ml$/.test(name))

  it('finds the workflows that run npm test', () => {
    const running = files.filter((name) => {
      const workflow = parse(readFileSync(join(WORKFLOWS, name), 'utf8')) as WorkflowConfig
      return Object.values(workflow.jobs).some((job) =>
        job.steps?.some((step) => NPM_TEST.test(step.run ?? '')),
      )
    })
    expect(running.sort()).toEqual(['ci.yml', 'release.yml'])
  })

  it.each(files)('%s runs npm test only after the shared browser step', (name) => {
    expect(jobsMissingBrowser(readFileSync(join(WORKFLOWS, name), 'utf8'))).toEqual([])
  })

  it.each([
    'run: |\n          npm ci\n          npm test',
    'run: >-\n          npm test -- --runInBand',
    'run: "npm test"',
    "run: 'npm test -- --coverage'",
    'run: npm ci && npm test # full suite',
    'run: CI=true npm test',
    'run: env CI=true npm test',
    'run: npm --prefix mlcl test',
    'run: npm --silent test',
    'run: npm run test',
  ])('rejects an unprepared job using %s', (run) => {
    expect(jobsMissingBrowser(`jobs:\n  release:\n    steps:\n      - ${run}\n`)).toEqual([
      'release',
    ])
  })

  it('does not mistake a commented shared step for an installation', () => {
    expect(
      jobsMissingBrowser(`jobs:
  release:
    steps:
      # ${SHARED_STEP}
      - run: npm test
`),
    ).toEqual(['release'])
  })

  it('does not count a shared step that may skip or ignore installation failure', () => {
    for (const guard of ['if: false', 'continue-on-error: true']) {
      expect(
        jobsMissingBrowser(`jobs:
  release:
    steps:
      - ${SHARED_STEP}
        ${guard}
      - run: npm test
`),
      ).toEqual(['release'])
    }
  })

  it('requires setup in each job and before the test step', () => {
    expect(
      jobsMissingBrowser(`jobs:
  prepared:
    steps:
      - ${SHARED_STEP}
      - run: |
          npm test
  unprepared:
    steps:
      - run: |
          npm test
      - ${SHARED_STEP}
`),
    ).toEqual(['unprepared'])
  })

  it('ignores comments and commands that only mention npm test', () => {
    expect(
      jobsMissingBrowser(`jobs:
  docs:
    steps:
      - run: |
          # npm test
          echo "npm test needs a browser"
`),
    ).toEqual([])
  })

  it('accepts a prepared job with a block script and extra test flags', () => {
    expect(
      jobsMissingBrowser(`jobs:
  build:
    steps:
      - ${SHARED_STEP}
      - run: |
          npm test -- --coverage
`),
    ).toEqual([])
  })

  it('the shared step installs and launches the pinned Chromium', () => {
    const action = parse(
      readFileSync(join(ROOT, '.github/actions/test-browser/action.yml'), 'utf8'),
    ) as {
      runs: {
        using: string
        steps: Array<{ shell: string; 'working-directory': string; run: string }>
      }
    }
    expect(action.runs.using).toBe('composite')
    const step = action.runs.steps[0]
    expect(step.shell).toBe('bash')
    expect(step['working-directory']).toBe('mlcl')
    expect(step.run).toContain('npx --no-install playwright install chromium')
    expect(step.run).toContain('chromium.launch()')
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
