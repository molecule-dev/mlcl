/**
 * The visual parity workflow compares every showcase framework with React's showcase, from npm, with the browser
 * installed first (.github/workflows/visual-parity.yml, which ci.yml calls on every push and pull request).
 *
 * The framework list lives twice on purpose: once in TypeScript (VISUAL_TEST_FRAMEWORKS, what the showcases and the
 * spec read) and once in the workflow's matrix, which GitHub evaluates before any code runs. A framework added to one
 * and not the other is a framework CI never compares, so this suite reads both and fails naming the one missing. The
 * rest guards what makes a run mean something: the showcases install from npm (a checkout with no molecule repo beside
 * it cannot link them), the browser is there before the comparison, and a failure keeps its images.
 *
 * @module
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

import type { WorkflowJob, WorkflowStep } from '@molecule/api-ci-github-actions'

import { comparedFrameworks } from '../visual-test.js'

const ROOT = resolve(import.meta.dirname, '../../..')
const WORKFLOWS = join(ROOT, '.github', 'workflows')
const VISUAL_PARITY = 'visual-parity.yml'
const SHARED_BROWSER_STEP = './mlcl/.github/actions/test-browser'
const LOCAL_ACTION = /^\./

/** A job as a workflow file writes it: steps of its own, or a call to another workflow (`uses`). */
type Job = Partial<WorkflowJob> & { uses?: string }

/** The jobs of a workflow's YAML. */
function jobsOf(text: string): Record<string, Job> {
  return (parse(text) as { jobs: Record<string, Job> }).jobs
}

/** The steps of every job in a workflow. */
function stepsOf(text: string): WorkflowStep[] {
  return Object.values(jobsOf(text)).flatMap((job) => job.steps ?? [])
}

/**
 * The frameworks the visual parity workflow leaves out of its matrix.
 *
 * @param text - The workflow YAML.
 * @returns The showcase frameworks no job compares, and the names that are no showcase framework.
 */
function matrixMismatches(text: string): string[] {
  const listed = jobsOf(text).compare?.strategy?.matrix?.framework
  const matrix: readonly string[] = Array.isArray(listed) ? listed.map(String) : []
  if (matrix.length === 0) return ['the compare job has no framework matrix']
  const expected: readonly string[] = comparedFrameworks()
  return [
    ...expected.filter((framework) => !matrix.includes(framework)),
    ...matrix.filter((framework) => !expected.includes(framework)),
  ]
}

/**
 * The job names in a workflow file that compare showcases before the shared browser step installs one.
 *
 * @param text - The workflow YAML.
 * @returns The offending job names.
 */
function jobsMissingBrowser(text: string): string[] {
  const missing: string[] = []
  for (const [job, config] of Object.entries(jobsOf(text))) {
    let seenStep = false
    for (const step of config.steps ?? []) {
      if (
        step.uses === SHARED_BROWSER_STEP &&
        step.if === undefined &&
        (step['continue-on-error'] === undefined || step['continue-on-error'] === false)
      )
        seenStep = true
      if (/\bplaywright\s+test\b/.test(step.run ?? '') && !seenStep) missing.push(job)
    }
  }
  return [...new Set(missing)]
}

/**
 * The actions a workflow uses without a major version (`@v7`): `@main`, a branch, or nothing.
 *
 * @param text - The workflow YAML.
 * @returns The unpinned `uses:` values.
 */
function unpinnedActions(text: string): string[] {
  return stepsOf(text)
    .map((step) => step.uses)
    .filter((uses): uses is string => uses !== undefined && !LOCAL_ACTION.test(uses))
    .filter((uses) => !/@v\d+$/.test(uses))
}

describe('the visual parity workflow', () => {
  const workflow = readFileSync(join(WORKFLOWS, VISUAL_PARITY), 'utf8')
  const compare = jobsOf(workflow).compare?.steps ?? []

  it('compares every showcase framework besides React, and nothing else', () => {
    expect(matrixMismatches(workflow)).toEqual([])
  })

  it('names a showcase framework the matrix leaves out, and one that is no showcase framework', () => {
    const [first, ...rest] = comparedFrameworks()
    const without = [first, ...rest.slice(1)]
    const matrix = `jobs:\n  compare:\n    strategy:\n      matrix:\n        framework: [${without.join(', ')}]\n    steps: []\n`
    expect(matrixMismatches(matrix)).toEqual([rest[0]])
    expect(matrixMismatches(matrix.replace(']', ', expo]'))).toEqual([rest[0], 'expo'])
    expect(matrixMismatches('jobs:\n  compare:\n    steps: []\n')).toEqual([
      'the compare job has no framework matrix',
    ])
  })

  it('installs the showcases from npm for the framework of the job', () => {
    const step = compare.find((candidate) => /\bplaywright\s+test\b/.test(candidate.run ?? ''))
    expect(step?.env?.MOLECULE_SHOWCASE_PACKAGES).toBe('npm')
    expect(step?.env?.MOLECULE_SHOWCASE_FRAMEWORKS).toBe('${{ matrix.framework }}')
  })

  it('has the browser before the comparison', () => {
    expect(jobsMissingBrowser(workflow)).toEqual([])
    expect(
      jobsMissingBrowser(`jobs:
  compare:
    steps:
      - run: npx --no-install playwright test
`),
    ).toEqual(['compare'])
  })

  it('keeps the comparison images when a job fails', () => {
    const compareAt = compare.findIndex((step) => /\bplaywright\s+test\b/.test(step.run ?? ''))
    const uploadAt = compare.findIndex((step) => step.if === 'failure()')
    expect(uploadAt).toBeGreaterThan(compareAt)
    const upload = compare[uploadAt]
    expect(upload.uses).toMatch(/^actions\/upload-artifact@v\d+$/)
    expect(upload.with?.path).toContain('.playwright-results')
    expect(upload.with?.name).toContain('matrix.framework')
  })

  it('is called by CI', () => {
    expect(jobsOf(readFileSync(join(WORKFLOWS, 'ci.yml'), 'utf8'))['visual-parity']?.uses).toBe(
      `./.github/workflows/${VISUAL_PARITY}`,
    )
  })
})

describe('action versions', () => {
  const files = readdirSync(WORKFLOWS).filter((name) => /\.ya?ml$/.test(name))

  it.each(files)('%s uses each action at a major version', (name) => {
    expect(unpinnedActions(readFileSync(join(WORKFLOWS, name), 'utf8'))).toEqual([])
  })

  it('finds an action used at a branch or with no version', () => {
    expect(
      unpinnedActions(`jobs:
  build:
    steps:
      - uses: actions/checkout@main
      - uses: actions/setup-node
      - uses: ./.github/workflows/framework-scaffolds.yml
      - uses: actions/setup-node@v7
`),
    ).toEqual(['actions/checkout@main', 'actions/setup-node'])
  })
})
