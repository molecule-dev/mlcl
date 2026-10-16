import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  type CheckPackage,
  type CheckStepResult,
  discoverPackages,
  extractStepErrors,
  formatCheckReport,
  planCheckSteps,
  runCheckLocal,
} from '../check.js'

const dirs: string[] = []

afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

function fixtureDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'mlcl-check-'))
  dirs.push(dir)
  for (const [name, content] of Object.entries(files)) {
    const p = join(dir, name)
    mkdirSync(p.slice(0, p.lastIndexOf('/')), { recursive: true })
    writeFileSync(p, content)
  }
  return dir
}

const BUDGET = 15 * 60_000

function pkg(overrides: Partial<CheckPackage>): CheckPackage {
  return {
    dir: '/proj',
    rel: '.',
    scripts: {},
    workspaces: false,
    hasTsconfig: false,
    tsconfigReferences: false,
    playwrightConfig: null,
    ...overrides,
  }
}

describe('planCheckSteps', () => {
  it('checks a plain root project with its own scripts', () => {
    const { steps, skipped } = planCheckSteps(
      [pkg({ scripts: { build: 'tsc', test: 'vitest run', lint: 'eslint .' } })],
      { budgetMs: BUDGET },
    )
    expect(steps.map((s) => s.kind).sort()).toEqual(['build', 'lint', 'unit'])
    expect(steps.find((s) => s.kind === 'unit')?.command).toBe('CI=1 npm run --silent test')
    expect(skipped.map((s) => s.kind)).toContain('typecheck') // no scripts, no tsconfig
  })

  it('prefers typecheck scripts in order, then falls back to tsc', () => {
    const { steps } = planCheckSteps(
      [pkg({ scripts: { 'check-types': 'tsc' }, hasTsconfig: true })],
      { budgetMs: BUDGET, steps: ['typecheck'] },
    )
    expect(steps[0].command).toBe('npm run --silent check-types')
    const fallback = planCheckSteps([pkg({ hasTsconfig: true, tsconfigReferences: true })], {
      budgetMs: BUDGET,
      steps: ['typecheck'],
    })
    expect(fallback.steps[0].command).toContain('tsc -b --pretty false')
  })

  const workspacesRoot = pkg({
    workspaces: true,
    scripts: { build: 'echo root-build-should-not-run' },
  })

  it('a workspaces root orchestrates its members, not itself', () => {
    const api = pkg({ dir: '/proj/api', rel: 'api', scripts: { build: 'tsc' } })
    const { steps } = planCheckSteps([workspacesRoot, api], { budgetMs: BUDGET, steps: ['build'] })
    expect(steps).toHaveLength(1)
    expect(steps[0].dir).toBe('/proj/api')
    expect(steps[0].name).toBe('build (api)')
  })

  it('prefers playwright configs for e2e, then e2e scripts, then skips', () => {
    const configured = planCheckSteps([pkg({ playwrightConfig: 'playwright.config.ts' })], {
      budgetMs: BUDGET,
      steps: ['e2e'],
      e2e: 'e2e/auth.spec.ts',
    })
    expect(configured.steps[0].command).toBe(`npx --no-install playwright test 'e2e/auth.spec.ts'`)
    const scripted = planCheckSteps([pkg({ scripts: { 'test:e2e': 'playwright test' } })], {
      budgetMs: BUDGET,
      steps: ['e2e'],
    })
    expect(scripted.steps[0].command).toContain('npm run --silent test:e2e')
    const none = planCheckSteps([pkg()], { budgetMs: BUDGET, steps: ['e2e'] })
    expect(none.steps).toHaveLength(0)
    expect(none.skipped[0].reason).toContain('no playwright.config')
  })

  it('skips vitest-shaped test scripts that drive e2e runners', () => {
    const { steps } = planCheckSteps([pkg({ scripts: { test: 'playwright test' } })], {
      budgetMs: BUDGET,
      steps: ['unit'],
    })
    expect(steps).toHaveLength(0)
  })

  it('caps each step at the budget', () => {
    const { steps } = planCheckSteps([pkg({ scripts: { build: 'tsc' } })], {
      budgetMs: 5_000,
      steps: ['build'],
    })
    expect(steps[0].timeoutMs).toBe(5_000)
  })
})

describe('discoverPackages', () => {
  it('finds the root and one level down, skipping node_modules and dot-dirs', () => {
    const root = fixtureDir({
      'package.json': '{"scripts":{"build":"tsc"}}',
      'api/package.json': '{}',
      'app/package.json': '{}',
      'node_modules/x/package.json': '{}',
      '.hidden/package.json': '{}',
    })
    const found = discoverPackages(root)
    expect(found.map((p) => p.rel).sort()).toEqual(['.', 'api', 'app'])
    expect(found.find((p) => p.rel === '.')?.workspaces).toBe(false)
  })
})

describe('extractStepErrors', () => {
  it('parses tsc errors in both shapes', () => {
    const log = [
      'src/handlers/user.ts(12,5): error TS2322: Type "string" is not assignable to type "number".',
      'src/x.ts:9:1 - error TS2304: Cannot find name "cm".',
    ].join('\n')
    const { errors, total } = extractStepErrors('typecheck', log, '/proj', '/proj', true)
    expect(total).toBe(2)
    expect(errors[0]).toContain('src/handlers/user.ts:12: TS2322')
    expect(errors[1]).toContain('TS2304 Cannot find name')
  })

  it('parses eslint stylish header + row pairs', () => {
    const log = [
      '/proj/api/src/a.ts',
      '  3:7  error  "x" is never used  @typescript-eslint/no-unused-vars',
    ].join('\n')
    const { errors } = extractStepErrors('lint', log, '/proj', '/proj/api', true)
    expect(errors[0]).toContain('api/src/a.ts:3: "x" is never used')
  })

  it('parses a vitest failure with its error and location', () => {
    const log = [
      'FAIL  src/a.test.ts > adds',
      'AssertionError: expected 1 to be 2',
      ' ❯ src/a.test.ts:6:5',
    ].join('\n')
    const { errors } = extractStepErrors('unit', log, '/proj', '/proj', true)
    expect(errors[0]).toContain('FAIL src/a.test.ts > adds: AssertionError')
    expect(errors[0]).toContain('(at src/a.test.ts:6)')
  })

  it('falls back to the log tail when nothing tool-shaped matches', () => {
    const log = ['some noise', '', 'ECONNREFUSED 127.0.0.1:5432'].join('\n')
    const { errors } = extractStepErrors('build', log, '/proj', '/proj', true)
    expect(errors.some((e) => e.includes('ECONNREFUSED'))).toBe(true)
  })
})

describe('runCheckLocal', () => {
  it('runs a passing build step and reports its output manifest', async () => {
    const root = fixtureDir({
      'package.json': '{"scripts":{"build":"mkdir -p dist && printf hi > dist/index.txt"}}',
    })
    const result = await runCheckLocal(root, { steps: ['build'] }, { budgetMs: 60_000 })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.ok).toBe(true)
    expect(result.report).toContain('PASS build')
    expect(result.report).toContain('dist/: 1 file')
  })

  it('reports a failing script with its real output', async () => {
    const root = fixtureDir({
      'package.json': '{"scripts":{"build":"echo exploded && exit 3"}}',
    })
    const result = await runCheckLocal(root, { steps: ['build'] }, { budgetMs: 60_000 })
    if ('error' in result) throw new Error(result.error)
    expect(result.ok).toBe(false)
    expect(result.report).toContain('FAIL build')
    expect(result.report).toContain('exploded')
  })

  it('rejects unknown step names before running anything', async () => {
    const result = await runCheckLocal(process.cwd(), { steps: ['nope' as never] })
    expect('error' in result && result.error).toContain('Unknown step(s): nope')
  })
})

describe('formatCheckReport', () => {
  it('orders steps by kind and renders skips as SKIP rows', () => {
    const report = formatCheckReport(
      [
        {
          kind: 'e2e',
          name: 'e2e',
          status: 'skipped',
          durationMs: 0,
          errors: [],
          errorTotal: 0,
          logPath: '',
          reason: 'no playwright.config.* and no e2e script',
        },
        {
          kind: 'unit',
          name: 'unit',
          status: 'passed',
          durationMs: 1200,
          errors: [],
          errorTotal: 0,
          logPath: '',
        },
        {
          kind: 'lint',
          name: 'lint',
          status: 'failed',
          durationMs: 800,
          errors: ['src/a.ts:1: boom'],
          errorTotal: 1,
          logPath: '/log/lint.log',
        },
      ],
      2000,
    )
    expect(report).toContain('check: FAILED — 1 failed, 1 passed, 1 skipped')
    const lines = report.split('\n')
    expect(lines.findIndex((l) => l.startsWith('FAIL'))).toBeLessThan(
      lines.findIndex((l) => l.startsWith('PASS')),
    )
    expect(lines.findIndex((l) => l.startsWith('PASS'))).toBeLessThan(
      lines.findIndex((l) => l.startsWith('SKIP')),
    )
  })

  /**
   * X0 flash-m99 (2026-10-17): `check` printed `full log: /tmp/mol-check/…` under a
   * step whose every error it had ALREADY listed, and the model went after the file
   * twice (a `read_file` refused as outside the workspace, then a `cat`) for the same
   * five lines. The pointer is for what the report could not fit.
   */
  it('names the log only for the errors the report could not list', () => {
    const step = (errorTotal: number, errors: string[]): CheckStepResult => ({
      kind: 'lint',
      name: 'lint',
      status: 'failed',
      durationMs: 800,
      errors,
      errorTotal,
      logPath: '/tmp/mol-check/lint.log',
    })
    const all = formatCheckReport([step(1, ['src/a.ts:1: boom'])], 2000)
    expect(all).toContain('src/a.ts:1: boom')
    expect(all).not.toContain('full log')

    const cut = formatCheckReport([step(4, ['src/a.ts:1: boom'])], 2000)
    expect(cut).toContain('4 errors (first 1)')
    expect(cut).toContain('  3 more in the full log: /tmp/mol-check/lint.log')

    // A step that failed with no parsed error line: the log is all there is, so it is
    // named without a count.
    const silent = formatCheckReport([step(0, [])], 2000)
    expect(silent).toContain('  full log: /tmp/mol-check/lint.log')
  })
})
