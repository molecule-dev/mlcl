import { execFileSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  type CheckPackage,
  type CheckStepResult,
  discoverPackages,
  extractStepErrors,
  formatCheckReport,
  missingPlaywrightBrowsers,
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

function pkg(overrides: Partial<CheckPackage> = {}): CheckPackage {
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
  it('preserves the project lint script, flags and lifecycle in every repository', () => {
    const { steps } = planCheckSteps(
      [pkg({ scripts: { lint: 'eslint --config company.config.mjs --max-warnings 0 src/' } })],
      { budgetMs: BUDGET, steps: ['lint'] },
    )
    expect(steps[0].command).toBe('npm run --silent lint')
  })
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
    // A configured package that declares its e2e script runs that script, so whatever it runs
    // first (a `pretest:e2e` that installs its browser) runs too (OLD MUSTFAIL: the check ran
    // the local Playwright beside the script).
    const both = planCheckSteps(
      [
        pkg({
          playwrightConfig: 'playwright.config.ts',
          scripts: { 'test:e2e': 'playwright test' },
        }),
      ],
      { budgetMs: BUDGET, steps: ['e2e'], e2e: 'e2e/auth.spec.ts' },
    )
    expect(both.steps[0].command).toBe(`npm run --silent test:e2e -- 'e2e/auth.spec.ts'`)
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

  // A scaffolded app's build is `tsc --noEmit && vite build` with a `prebuild` of `npm run lint`:
  // run whole beside the typecheck and lint steps, it ran both again and took 10.8 s of an 11.2 s
  // check where Vite needed 4.5 s (harness eval `scaffold`, 2026-11-24).
  const app = pkg({
    scripts: {
      build: 'tsc --noEmit && vite build',
      prebuild: 'npm run lint',
      typecheck: 'tsc --noEmit',
      lint: 'eslint src/',
    },
  })

  it('builds without repeating the typecheck and lint the check runs beside it (OLD MUSTFAIL)', () => {
    const { steps } = planCheckSteps([app], { budgetMs: BUDGET })
    expect(steps.find((s) => s.kind === 'build')?.command).toBe(
      `npm exec --silent --no -c 'vite build'`,
    )
    expect(steps.map((s) => s.kind).sort()).toEqual(['build', 'lint', 'typecheck'])
  })

  it('counterexample: a build run alone keeps its own typecheck and lint', () => {
    const { steps } = planCheckSteps([app], { budgetMs: BUDGET, steps: ['build'] })
    expect(steps[0].command).toBe('npm run --silent build')
  })

  it('counterexample: keeps a prebuild that is not the lint, and the postbuild', () => {
    const codegen = pkg({
      scripts: {
        build: "tsc --noEmit && vite build --mode 'prod'",
        prebuild: 'node scripts/generate-routes.mjs',
        postbuild: 'node scripts/verify-dist.mjs',
        typecheck: 'tsc --noEmit',
      },
    })
    const { steps } = planCheckSteps([codegen], { budgetMs: BUDGET, steps: ['typecheck', 'build'] })
    expect(steps.find((s) => s.kind === 'build')?.command).toBe(
      `npm run --silent prebuild && npm exec --silent --no -c 'vite build --mode '\\''prod'\\''' && npm run --silent postbuild`,
    )
  })

  it('counterexample: a build that does not repeat a check step runs as written', () => {
    const api = pkg({
      scripts: {
        build: 'tsc && npm run db:verify',
        typecheck: 'tsc --noEmit',
        lint: 'eslint src/',
      },
    })
    const { steps } = planCheckSteps([api], { budgetMs: BUDGET })
    expect(steps.find((s) => s.kind === 'build')?.command).toBe('npm run --silent build')
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
  it('reports the real strict lint failure and runs prelint for an inventory project', async () => {
    const root = fixtureDir({
      'package.json': JSON.stringify({
        private: true,
        scripts: {
          prelint: "node -e \"require('fs').writeFileSync('prelint-ran', 'yes')\"",
          lint: 'eslint --config eslint.config.mjs --max-warnings 0 src/',
        },
      }),
      'eslint.config.mjs': "export default [{ rules: { 'no-unused-vars': 'warn' } }]\n",
      'src/inventory.js': 'const inventoryCount = 1\n',
    })
    execFileSync('git', ['init', '-q', root])
    const require = createRequire(import.meta.url)
    const eslint = dirname(require.resolve('eslint/package.json'))
    mkdirSync(join(root, 'node_modules', '.bin'), { recursive: true })
    symlinkSync(join(eslint, 'bin', 'eslint.js'), join(root, 'node_modules', '.bin', 'eslint'))
    const result = await runCheckLocal(root, { steps: ['lint'] }, { budgetMs: 30_000 })
    if ('error' in result) throw new Error(result.error)
    expect(result.ok).toBe(false)
    expect(readFileSync(join(root, 'prelint-ran'), 'utf8')).toBe('yes')
    expect(result.report).toContain('FAILED')
  })
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
    expect(result.report).not.toContain('unreached-source')
  })

  it('passes through the native Vite diagnostic on a successful build', async () => {
    const warning = '[molecule:unreached-source] "src/unused.css" is outside the Vite build graph.'
    const root = fixtureDir({
      'package.json': JSON.stringify({ scripts: { build: 'node build.mjs' } }),
      'build.mjs': `process.stderr.write(${JSON.stringify(warning + '\n')})`,
    })
    const result = await runCheckLocal(root, { steps: ['build'] }, { budgetMs: 30_000 })
    if ('error' in result) throw new Error(result.error)
    expect(result.ok).toBe(true)
    expect(result.report).toContain(warning)
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

  it('runs typecheck, lint and build by default, and the tests only when asked for', async () => {
    const ran = (name: string): string => `node -e "require('fs').writeFileSync('${name}-ran', '')"`
    const root = fixtureDir({
      'package.json': JSON.stringify({
        scripts: {
          typecheck: ran('typecheck'),
          lint: ran('lint'),
          build: ran('build'),
          test: ran('unit'),
          'test:e2e': ran('e2e'),
        },
      }),
    })
    const events: string[] = []
    const result = await runCheckLocal(
      root,
      {},
      { budgetMs: 60_000, onProgress: (event) => events.push(`${event.type} ${event.step.kind}`) },
    )
    if ('error' in result) throw new Error(result.error)
    expect(result.results.map((r) => r.kind).sort()).toEqual(['build', 'lint', 'typecheck'])
    for (const step of ['typecheck', 'lint', 'build']) {
      expect(readFileSync(join(root, `${step}-ran`), 'utf8')).toBe('')
      expect(events).toContain(`start ${step}`)
      expect(events).toContain(`finish ${step}`)
    }
    expect(events.indexOf('start build')).toBeLessThan(events.indexOf('finish build'))
    const tests = await runCheckLocal(root, { steps: ['unit'] }, { budgetMs: 60_000 })
    if ('error' in tests) throw new Error(tests.error)
    expect(tests.results.map((r) => r.kind)).toEqual(['unit'])
    expect(readFileSync(join(root, 'unit-ran'), 'utf8')).toBe('')
  })

  it('runs e2e too when an e2e filter is given without steps', async () => {
    const root = fixtureDir({
      'package.json': JSON.stringify({ scripts: { build: 'true', 'test:e2e': 'true' } }),
    })
    const result = await runCheckLocal(root, { e2e: 'e2e/a.spec.ts' }, { budgetMs: 60_000 })
    if ('error' in result) throw new Error(result.error)
    expect(result.results.map((r) => r.kind)).toContain('e2e')
  })

  /**
   * What `playwright install --only-shell chromium` prints off a terminal (playwright-core 1.64:
   * `logPolitely` and `getBasicDownloadProgress`, a bar line at each tenth), `from` dimmed.
   */
  const INSTALL_OUTPUT = [
    'Downloading Chromium Headless Shell 141.0.7390.37 (playwright chromium-headless-shell v1194)\u001b[2m from https://cdn.playwright.dev/dbazure/download/playwright/builds/chromium/1194/chromium-headless-shell-linux-arm64.zip\u001b[22m',
    ...[10, 20, 30, 41, 50, 60, 70, 80, 90, 100].map(
      (p) => `|${'■'.repeat((p / 10) | 0).padEnd(10)}| ${String(p).padStart(3)}% of 106.5 MiB`,
    ),
    'Chromium Headless Shell 141.0.7390.37 (playwright chromium-headless-shell v1194) downloaded to /home/u/.cache/ms-playwright/chromium_headless_shell-1194',
  ]

  /**
   * A project whose `playwright` fails like a real one with no browser until `playwright install`
   * runs. With `installFailure`, the install prints it on stderr and exits 1.
   */
  function playwrightProject(
    failure: string,
    installFailure?: string,
    installDir?: string,
    removeAfterDryRun = false,
  ): string {
    const dir =
      installDir ??
      /Executable doesn't exist at (.*?[\\/](?:chromium_headless_shell|chromium|firefox|webkit|ffmpeg)-\d+)[\\/]/.exec(
        failure,
      )?.[1]
    const root = fixtureDir({
      'package.json': JSON.stringify({ name: 'e2e-fixture' }),
      'playwright.config.ts': 'export default {}\n',
      'install-output.txt': `${INSTALL_OUTPUT.join('\n')}\n`,
      // What `playwright install --dry-run <browser>` prints: where it would install it.
      'dry-run-output.txt': dir
        ? `Chrome Headless Shell 141.0.7390.37\n  Install location:    ${dir}\n`
        : '',
      'node_modules/.bin/playwright': [
        '#!/bin/sh',
        ...(removeAfterDryRun
          ? [
              'if [ "$1" = install ] && [ "$2" = --dry-run ]; then cat dry-run-output.txt; rm node_modules/.bin/playwright; exit 0; fi',
            ]
          : [
              'if [ "$1" = install ] && [ "$2" = --dry-run ]; then cat dry-run-output.txt; exit 0; fi',
            ]),
        ...(installFailure
          ? [`if [ "$1" = install ]; then echo '${installFailure}' >&2; exit 1; fi`]
          : []),
        // What an agent reading the step log while the browser installs would see.
        'if [ "$1" = install ]; then cat node_modules/.cache/mlcl-check/*.log > log-during-install.txt; fi',
        // And once the download output has been read, what the log says then.
        'if [ "$1" = install ]; then shift; echo "$*" >> installed.txt; cat install-output.txt; sleep 1; cat node_modules/.cache/mlcl-check/*.log > log-after-download.txt; exit 0; fi',
        'if [ -f installed.txt ]; then echo "  2 passed (1.0s)"; exit 0; fi',
        'cat <<"EOF"',
        failure,
        'EOF',
        'exit 1',
        '',
      ].join('\n'),
    })
    chmodSync(join(root, 'node_modules', '.bin', 'playwright'), 0o755)
    return root
  }

  it('installs the browser a first e2e run reports missing, then runs it again', async () => {
    // A fresh machine has no Playwright browser: the run fails with this line, and an agent read it,
    // installed Chromium by hand and ran the step a second time (harness eval, 2026-11-23).
    const root = playwrightProject(
      "  1) [chromium] › e2e/smoke.spec.ts:27 › renders — Error: browserType.launch: Executable doesn't exist at /home/u/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell",
    )
    const events: string[] = []
    const result = await runCheckLocal(
      root,
      { steps: ['e2e'] },
      {
        budgetMs: 60_000,
        onProgress: (event) => events.push(event.type === 'note' ? event.text : event.type),
      },
    )
    if ('error' in result) throw new Error(result.error)
    // Said as the install starts, so a caller watching the output knows what the step is doing
    // (OLD MUSTFAIL: an agent saw the install in `ps` and went looking for the browser itself).
    // Then how far the download got, as Playwright prints it: the start, each fifth and the end
    // (OLD MUSTFAIL, 2026-11-25: with the install silent an agent probed for the browser three times
    // in 20 s, and one probe was a failed step).
    expect(events).toEqual([
      'start',
      'has no Playwright browser: installing chromium, then running it again',
      'downloading Chromium Headless Shell 141.0.7390.37',
      'downloaded 20% of 106.5 MiB',
      'downloaded 41% of 106.5 MiB',
      'downloaded 60% of 106.5 MiB',
      'downloaded 80% of 106.5 MiB',
      'downloaded Chromium Headless Shell 141.0.7390.37',
      'finish',
    ])
    const [e2e] = result.results
    expect(e2e.status).toBe('passed')
    expect(readFileSync(join(root, 'installed.txt'), 'utf8')).toBe('--only-shell chromium\n')
    expect(e2e.summary).toContain('installed the Playwright browser first (chromium)')
    // While it installs, the step log says so: Codex read that log beside a pending check, took
    // "Executable doesn't exist" as its own job, installed the browser and probed for it (harness
    // eval `check`, 2026-11-25; OLD MUSTFAIL). The next run replaces it.
    const during = readFileSync(join(root, 'log-during-install.txt'), 'utf8')
    expect(during).toBe(
      'npx mlcl check: the Playwright browser (chromium) is not installed, so the first e2e run could not launch it. The check is installing it now (`npx --no-install --loglevel=notice playwright install --only-shell chromium`) and will run this step again; nothing needs doing meanwhile. This log is replaced when that run ends.\n',
    )
    // Without the first run's failure under it: with that output kept below the note, Codex searched
    // the log for errors, found only "Executable doesn't exist" and looked for the browser itself
    // (harness eval `check`, 2026-11-26; OLD MUSTFAIL).
    expect(during).not.toContain("Executable doesn't exist")
    // Then how far the download got, for an agent reading the log instead of the notes.
    expect(readFileSync(join(root, 'log-after-download.txt'), 'utf8')).toBe(
      `${during}${events.slice(2, -1).join('\n')}\n`,
    )
    expect(readFileSync(e2e.logPath, 'utf8')).not.toContain('mlcl check:')
  })

  it('says the browser install failed, and how to run it, when it cannot install', async () => {
    // The check's process had no route to the network (Codex starts an MCP server without the
    // proxy variables), the install failed, and the report was the first run's alone: the agent
    // read "Executable doesn't exist" as a browser the check never tried to install, installed it
    // from its own shell and ran the check again (harness eval `check`, 2026-11-25; OLD MUSTFAIL).
    const missing =
      "  1) [chromium] › e2e/smoke.spec.ts:27 › renders — Error: browserType.launch: Executable doesn't exist at /home/u/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell"
    const root = playwrightProject(missing, 'Error: getaddrinfo EAI_AGAIN cdn.playwright.dev')
    const result = await runCheckLocal(root, { steps: ['e2e'] }, { budgetMs: 60_000 })
    if ('error' in result) throw new Error(result.error)
    const [e2e] = result.results
    expect(e2e.status).toBe('failed')
    expect(e2e.errors[0]).toBe(
      'Playwright browser install failed. Run `npx --no-install --loglevel=notice playwright install --only-shell chromium` from the check root. The install reported Error: getaddrinfo EAI_AGAIN cdn.playwright.dev',
    )
    expect(e2e.errors.slice(1).join('\n')).toContain("Executable doesn't exist")
    expect(e2e.errorTotal).toBe(e2e.errors.length)
    // Counterexample: once the install has failed, the log no longer says the check will run again.
    expect(readFileSync(e2e.logPath, 'utf8')).not.toContain('will run this step again')
  })

  it('keeps install stderr in the step log and reports the last diagnostic before the stack', async () => {
    const root = playwrightProject(
      "Error: browserType.launch: Executable doesn't exist at /cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell",
      'Error: unable to verify the first certificate\n    at Socket.onConnect (/local/install.js:9:5)',
    )
    const result = await runCheckLocal(root, { steps: ['e2e'] }, { budgetMs: 60_000 })
    if ('error' in result) throw new Error(result.error)
    const [e2e] = result.results
    expect(e2e.errors[0]).toContain('Error: unable to verify the first certificate')
    expect(e2e.errors[0]).not.toContain('Socket.onConnect')
    expect(readFileSync(e2e.logPath, 'utf8')).toContain('Socket.onConnect')
  })

  it('keeps the npm recovery failure and its diagnostic under a silent npm parent', async () => {
    const path = process.env.PATH
    const npx = execFileSync('which', ['npx'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
    try {
      const run = async (level: string): Promise<{ status: string; errors: string[] }> => {
        const root = playwrightProject(
          "Error: browserType.launch: Executable doesn't exist at /cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell",
          undefined,
          undefined,
          true,
        )
        const bin = join(root, 'bin')
        mkdirSync(bin)
        writeFileSync(
          join(bin, 'npx'),
          '#!/bin/bash\nexec "$MOL_FIXTURE_NPX" "$@" > >(cat) 2> >(cat >&2)\n',
          { mode: 0o755 },
        )
        vi.stubEnv('MOL_FIXTURE_NPX', npx)
        vi.stubEnv('PATH', `${bin}:${path}`)
        vi.stubEnv('npm_config_cache', join(root, 'npm-cache'))
        vi.stubEnv('npm_config_offline', 'true')
        vi.stubEnv('npm_config_logs_max', '0')
        vi.stubEnv('npm_config_loglevel', level)
        const result = await runCheckLocal(root, { steps: ['e2e'] }, { budgetMs: 60_000 })
        if ('error' in result) throw new Error(result.error)
        const [e2e] = result.results
        expect(readFileSync(e2e.logPath, 'utf8')).toContain('npm error code ENOTCACHED')
        return { status: e2e.status, errors: e2e.errors }
      }
      const normal = await run('notice')
      expect(normal.status).toBe('failed')
      expect(normal.errors[0]).toContain('Playwright browser install failed')
      expect(await run('silent')).toEqual(normal)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('reports the suite browser setup failure first without invoking recovery', async () => {
    const diagnostic = 'MOL_E2E_BROWSER_SETUP_FAILED: exit code 7. Error: CDN unavailable'
    const root = playwrightProject(
      [
        '  1) [chromium] › e2e/smoke.spec.ts:27:1 › launches ──────────',
        "    Error: browserType.launch: Executable doesn't exist at /cache/ms-playwright/chromium_headless_shell-1248/chrome",
        '  2) [chromium] › e2e/smoke.spec.ts:36:1 › opens settings ──────────',
        '\x1b[31m    Error: ' + diagnostic + '\x1b[0m',
        '  2 failed',
      ].join('\n'),
    )
    const notes: string[] = []
    const result = await runCheckLocal(
      root,
      { steps: ['e2e'] },
      { budgetMs: 60_000, note: (line) => notes.push(line) },
    )
    if ('error' in result) throw new Error(result.error)
    const [e2e] = result.results
    expect(e2e.status).toBe('failed')
    expect(e2e.errors[0]).toBe(diagnostic)
    expect(e2e.summary).toBe('2 failed')
    expect(notes.join('\n')).not.toContain('installing')
    expect(existsSync(join(root, 'installed.txt'))).toBe(false)
    expect(readFileSync(e2e.logPath, 'utf8')).toContain(diagnostic)
  })

  it('reports cancellation during browser recovery as a timeout with the install command', async () => {
    const root = playwrightProject(
      "Error: browserType.launch: Executable doesn't exist at /cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell",
    )
    const controller = new AbortController()
    const result = await runCheckLocal(
      root,
      { steps: ['e2e'] },
      {
        budgetMs: 60_000,
        signal: controller.signal,
        onProgress: (event) => {
          if (event.type === 'note') controller.abort()
        },
      },
    )
    if ('error' in result) throw new Error(result.error)
    expect(result.results[0]).toMatchObject({ status: 'timeout' })
    expect(result.results[0].errors[0]).toContain('Playwright browser install stopped')
    expect(result.results[0].errors[0]).toContain('playwright install --only-shell chromium')
    expect(result.results[0].errors[0]).toContain('The check was cancelled.')
  })

  it('leaves an e2e run that failed for another reason alone', async () => {
    const root = playwrightProject(
      '  1) [chromium] › e2e/smoke.spec.ts:27 › renders — Error: expect(received).toBe(expected)',
    )
    const result = await runCheckLocal(root, { steps: ['e2e'] }, { budgetMs: 60_000 })
    if ('error' in result) throw new Error(result.error)
    expect(result.results[0].status).toBe('failed')
    expect(existsSync(join(root, 'installed.txt'))).toBe(false)
  })

  it("leaves a missing browser alone when the step's own Playwright would not install it there", async () => {
    // An opaque e2e script can launch some other Playwright's browser: installing with the
    // project's would fetch a browser that run never uses (OLD MUSTFAIL: the check installed it).
    const root = playwrightProject(
      "Error: browserType.launch: Executable doesn't exist at /other/ms-playwright/chromium_headless_shell-1180/chrome-headless-shell-linux64/chrome-headless-shell",
      undefined,
      '/home/u/.cache/ms-playwright/chromium_headless_shell-1248',
    )
    const result = await runCheckLocal(root, { steps: ['e2e'] }, { budgetMs: 60_000 })
    if ('error' in result) throw new Error(result.error)
    const [e2e] = result.results
    expect(e2e.status).toBe('failed')
    expect(existsSync(join(root, 'installed.txt'))).toBe(false)
    expect(readFileSync(e2e.logPath, 'utf8')).toContain("Executable doesn't exist")
  })

  /**
   * A project outside Molecule: a Playwright config, an npm e2e script, and a fake CLI that
   * records each call and launches a browser only once `install` has run.
   */
  function recordingPlaywrightProject(scripts: Record<string, string>, launches: boolean): string {
    const root = fixtureDir({
      'package.json': JSON.stringify({ name: 'pw-fixture', scripts }),
      'playwright.config.ts': 'export default {}\n',
      'node_modules/.bin/playwright': [
        '#!/bin/sh',
        'echo "$*" >> calls.txt',
        'if [ "$1" = install ] && [ "$2" = --dry-run ]; then echo "  Install location:    /cache/ms-playwright/chromium_headless_shell-1248"; exit 0; fi',
        'if [ "$1" = install ]; then touch installed; exit 0; fi',
        ...(launches
          ? [
              'if [ ! -f installed ]; then echo "Error: browserType.launch: Executable doesn\'t exist at /cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell"; exit 1; fi',
            ]
          : []),
        'echo "  1 passed (1.0s)"',
        '',
      ].join('\n'),
    })
    chmodSync(join(root, 'node_modules', '.bin', 'playwright'), 0o755)
    return root
  }

  it("runs the project's e2e script, so its own preparation installs the browser before any run", async () => {
    // Astra's design review (2026-11-26): a failed first run boots the app's server for nothing
    // and leaves "Executable doesn't exist" for an agent to find. OLD MUSTFAIL: the check ran
    // `playwright test` directly, beside the script, and the calls were test → install → test.
    const root = recordingPlaywrightProject(
      { 'pretest:e2e': 'playwright install --only-shell chromium', 'test:e2e': 'playwright test' },
      true,
    )
    const result = await runCheckLocal(root, { steps: ['e2e'] }, { budgetMs: 60_000 })
    if ('error' in result) throw new Error(result.error)
    expect(result.results[0]).toMatchObject({ status: 'passed' })
    expect(readFileSync(join(root, 'calls.txt'), 'utf8')).toBe(
      'install --only-shell chromium\ntest\n',
    )
  })

  it('installs nothing for an e2e run that launches no browser', async () => {
    // Counterexample: a cold machine, specs that only use `request`.
    const root = recordingPlaywrightProject({ 'test:e2e': 'playwright test' }, false)
    const result = await runCheckLocal(root, { steps: ['e2e'] }, { budgetMs: 60_000 })
    if ('error' in result) throw new Error(result.error)
    expect(result.results[0]).toMatchObject({ status: 'passed' })
    expect(readFileSync(join(root, 'calls.txt'), 'utf8')).toBe('test\n')
  })

  it("shows the suite's own browser install while the e2e step runs", async () => {
    // OLD MUSTFAIL: the check said only "e2e (app) started" through the suite's 120 MiB download,
    // and an agent watching it probed for the browser itself (harness eval `check`, 2026-11-26).
    const root = fixtureDir({
      'package.json': JSON.stringify({ scripts: { 'test:e2e': 'sh e2e.sh' } }),
      'e2e.sh': [
        'echo "Molecule browser setup: playwright install --only-shell chromium"',
        "echo 'Downloading Chrome Headless Shell 148.0.7778.5 (playwright chromium-headless-shell v1248) from https://cdn.playwright.dev/x.zip'",
        "echo '|■■■■■■■■■■■■■■■■                                                                |  40% of 119.9 MiB'",
        // The check writes each note to the log as it reads the line, so wait for it (up to 10 s).
        'n=0; until grep -q "downloaded 40%" node_modules/.cache/mlcl-check/e2e.log || [ $n -ge 200 ]; do n=$((n + 1)); sleep 0.05; done',
        'cat node_modules/.cache/mlcl-check/e2e.log > seen.txt',
        'echo "  1 passed (1.0s)"',
        '',
      ].join('\n'),
    })
    const notes: string[] = []
    const result = await runCheckLocal(
      root,
      { steps: ['e2e'] },
      {
        budgetMs: 60_000,
        onProgress: (event) => {
          if (event.type === 'note') notes.push(event.text)
        },
      },
    )
    if ('error' in result) throw new Error(result.error)
    expect(result.results[0]).toMatchObject({ status: 'passed' })
    const said = [
      'the suite is installing its Playwright browser (`playwright install --only-shell chromium`); the step goes on when it is done',
      'downloading Chrome Headless Shell 148.0.7778.5',
      'downloaded 40% of 119.9 MiB',
    ]
    expect(notes).toEqual(said)
    // The step's log, read while the step ran, says the same.
    expect(readFileSync(join(root, 'seen.txt'), 'utf8')).toContain(said.join('\n'))
  })

  it('relays no download progress from a step that did not announce a browser setup', async () => {
    // Counterexample: a test's own output that looks like a progress bar is not the check's to show.
    const root = fixtureDir({
      'package.json': JSON.stringify({
        scripts: {
          'test:e2e':
            "echo '|■■■■■■■■■■■■■■■■                |  40% of 1 MiB' && echo '  1 passed'",
        },
      }),
    })
    const notes: string[] = []
    const result = await runCheckLocal(
      root,
      { steps: ['e2e'] },
      {
        budgetMs: 60_000,
        onProgress: (event) => {
          if (event.type === 'note') notes.push(event.text)
        },
      },
    )
    if ('error' in result) throw new Error(result.error)
    expect(notes).toEqual([])
  })

  it("says the check is running a step instead of showing the last check's log", async () => {
    // An agent reading the step log mid-check read the previous check's failure as this one's.
    const root = fixtureDir({
      'package.json': JSON.stringify({
        scripts: { 'test:e2e': 'cat node_modules/.cache/mlcl-check/e2e.log > seen.txt' },
      }),
      'node_modules/.cache/mlcl-check/e2e.log': 'Error: the last check failed\n',
    })
    const result = await runCheckLocal(root, { steps: ['e2e'] }, { budgetMs: 60_000 })
    if ('error' in result) throw new Error(result.error)
    expect(readFileSync(join(root, 'seen.txt'), 'utf8')).toBe(
      `npx mlcl check (pid ${process.pid}) is running this step; this log is replaced with its output when it ends.\n`,
    )
    expect(readFileSync(result.results[0].logPath, 'utf8')).toBe('')
  })

  it('recovers browsers stored under a custom cache path with spaces', async () => {
    const root = playwrightProject(
      "Error: browserType.launch: Executable doesn't exist at /cache/custom browsers/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell",
    )
    const result = await runCheckLocal(root, { steps: ['e2e'] }, { budgetMs: 60_000 })
    if ('error' in result) throw new Error(result.error)
    expect(result.results[0]).toMatchObject({ status: 'passed' })
    expect(readFileSync(join(root, 'installed.txt'), 'utf8').trim()).toBe('--only-shell chromium')
  })

  it('rejects unknown step names before running anything', async () => {
    const result = await runCheckLocal(process.cwd(), { steps: ['nope' as never] })
    expect('error' in result && result.error).toContain('Unknown step(s): nope')
  })
})

describe('missingPlaywrightBrowsers', () => {
  const missing = (dir: string): string =>
    `Error: browserType.launch: Executable doesn't exist at /h/.cache/ms-playwright/${dir}/chrome`
  it('installs only what the run could not launch', () => {
    expect(missingPlaywrightBrowsers(missing('chromium_headless_shell-1248/x'))).toEqual([
      '--only-shell',
      'chromium',
    ])
    // A headed run launches full Chromium alone (OLD MUSTFAIL: it installed the shell too).
    expect(missingPlaywrightBrowsers(missing('chromium-1248/x'))).toEqual([
      '--no-shell',
      'chromium',
    ])
    expect(
      missingPlaywrightBrowsers(
        `${missing('chromium-1248/x')}\n${missing('chromium_headless_shell-1248/x')}`,
      ),
    ).toEqual(['chromium'])
    expect(
      missingPlaywrightBrowsers(
        `${missing('chromium_headless_shell-1248/x')}\n${missing('firefox-1500/x')}`,
      ),
    ).toEqual(['--only-shell', 'chromium', 'firefox'])
  })
  it('returns null for any other failure', () => {
    expect(missingPlaywrightBrowsers('Error: expect(received).toBe(expected)')).toBeNull()
  })
  it('does not recover a browser launch if the suite already reported failed setup', () => {
    expect(
      missingPlaywrightBrowsers(
        `${missing('chromium_headless_shell-1248/x')}\nError: MOL_E2E_BROWSER_SETUP_FAILED: exit code 7`,
      ),
    ).toBeNull()
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
