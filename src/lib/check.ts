/**
 * `mlcl check` — run the project's own checks (typecheck, lint, build, unit
 * tests, e2e, a live service assertion), discovered from its package.json scripts, and return one
 * compact report with the first actionable errors.
 *
 * The policy, error extraction and report format are a local-execution port of
 * the IDE's `check` tool (`molecule-dev/api/src/ai/check-tool.ts` — Synthase's
 * verification primitive): an agent that works on a molecule project gets the
 * same one-call verification loop whether it runs inside the IDE sandbox or on
 * the user's machine. Keep the two behaviorally in sync; the sandbox original
 * carries the fuller narrative for why each rule exists.
 *
 * Local-execution differences, all deliberate:
 * - discovery reads the filesystem directly (no script-through-shell);
 * - steps run through `bash -c` with a Node-side timeout (macOS has no GNU
 *   `timeout`);
 * - no heap cap and no platform-env sourcing — the user's machine is not a
 *   1-CPU sandbox, and npm scripts load their own .env;
 * - logs land in `<root>/node_modules/.cache/mlcl-check/` (always ignored, no
 *   .gitignore churn).
 *
 * @module
 */

import type { Dirent } from 'node:fs'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { stripVTControlCharacters } from 'node:util'

import { acquireCheckLock } from './check-lock.js'
import { spawnCheckCommand } from './check-process.js'
import { runServeCheck } from './check-serve.js'

const SCRIPT_CHECK_STEPS = ['typecheck', 'lint', 'build', 'unit', 'e2e'] as const
type ScriptCheckStepKind = (typeof SCRIPT_CHECK_STEPS)[number]

/** The kinds of step `check` can run, in report order. */
export const CHECK_STEP_KINDS = [...SCRIPT_CHECK_STEPS, 'serve'] as const

/**
 * The steps a check with no `steps` runs: the quick pass after an edit. The tests take minutes
 * (a machine's first e2e run installs its Playwright browser), so they run when asked for (`--steps unit,e2e`), as the
 * Molecule harness's `check` tool leaves them to its test runner.
 */
export const DEFAULT_CHECK_STEPS = ['typecheck', 'lint', 'build'] as const

/** One kind of check step. */
export type CheckStepKind = (typeof CHECK_STEP_KINDS)[number]

/** Default wall clock per step kind; each is also capped by the whole call's budget. */
export const CHECK_STEP_TIMEOUT_MS: Readonly<Record<ScriptCheckStepKind, number>> = {
  typecheck: 150_000,
  lint: 120_000,
  build: 240_000,
  unit: 180_000,
  e2e: 270_000,
}

/** Most errors a step's report lists. */
export const MAX_REPORTED_ERRORS = 5

/** Longest single error line in a report. */
export const MAX_ERROR_LINE_CHARS = 300

/** Most HTML pages a build step's manifest names (other files are counted by extension). */
export const MAX_MANIFEST_PATHS = 15

/** Where each step's full log is written, under the checked project's root. */
export const checkLogDir = (root: string): string =>
  join(root, 'node_modules', '.cache', 'mlcl-check')

/** One package the checks can run in, as discovery saw it. */
export interface CheckPackage {
  /** Absolute path. */
  dir: string
  /** Path relative to the check root (`.` for the root itself). */
  rel: string
  /** The package.json `scripts`. */
  scripts: Record<string, string>
  /** Whether package.json declares `workspaces`. */
  workspaces: boolean
  /** Whether a tsconfig.json sits next to it. */
  hasTsconfig: boolean
  /** Whether that tsconfig is solution-style (`references`). */
  tsconfigReferences: boolean
  /** The playwright.config.* filename in this dir, if any. */
  playwrightConfig: string | null
}

interface CheckStepCommand {
  /** Display name, e.g. `typecheck (app)`. */
  name: string
  /** Absolute dir the command runs in. */
  dir: string
  /** The command, run in `dir`. */
  command: string
  /** Wall clock for this step. */
  timeoutMs: number
  /** Full log path. */
  logPath: string
}

interface ScriptCheckStep extends CheckStepCommand {
  kind: ScriptCheckStepKind
  /** Build output dirs to list on success (build steps only). */
  outDirs?: string[]
}

interface ServeCheckStep extends CheckStepCommand {
  kind: 'serve'
  ready: URL
  run: string
}

/** A step `check` will run. */
export type PlannedCheckStep = ScriptCheckStep | ServeCheckStep

/** A step `check` did not run, and why. */
export interface SkippedCheckStep {
  kind: CheckStepKind
  name: string
  reason: string
}

/** What one step came to. */
export interface CheckStepResult {
  kind: CheckStepKind
  name: string
  status: 'passed' | 'failed' | 'timeout' | 'error' | 'skipped'
  durationMs: number
  /** The first few actionable errors, deduplicated and truncated. */
  errors: string[]
  /** How many distinct errors there were in total. */
  errorTotal: number
  /** A one-line tally, e.g. `Tests 3 failed | 40 passed (43)`. */
  summary?: string
  /** For a build: what its output dir now contains. */
  manifest?: string
  /** Selected Vite diagnostics, including warnings from passing builds. */
  buildWarnings?: string[]
  /** Why it was skipped (status `skipped`). */
  reason?: string
  logPath: string
}

/** Options for {@link planCheckSteps}. */
export interface PlanCheckOptions {
  /** Only these kinds (default: all script checks). */
  steps?: readonly CheckStepKind[]
  /** Extra arguments for the e2e run (spec files, `--grep …`). */
  e2e?: string
  /** Validated inputs for the opt-in service check. */
  serve?: { ready: URL; run: string; start?: string }
  /** The whole call's budget; no step may exceed it. */
  budgetMs: number
}

/** Scripts that type-check, in preference order. */
const TYPECHECK_SCRIPTS = ['typecheck', 'type-check', 'check-types', 'tsc']

/**
 * A step name's filesystem-safe form, for its log file.
 *
 * @param name - The display name.
 * @returns A slug.
 */
function slug(name: string): string {
  return name
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

/**
 * Shell-split an e2e filter into quoted arguments.
 *
 * @param filter - What the caller passed (`e2e/auth.spec.ts --grep login`).
 * @returns The quoted argument string (leading space included), or ''.
 */
function e2eArgs(filter: string | undefined): string {
  const parts = (filter ?? '').split(/\s+/).filter(Boolean)
  return parts.length ? ` ${parts.map((p) => `'${p.replace(/'/g, `'\\''`)}'`).join(' ')}` : ''
}

/** A shell word holding `text` as it is. */
const shellWord = (text: string): string => `'${text.replace(/'/g, `'\\''`)}'`

/**
 * The build step's command. A build script often repeats what the check runs beside it: a
 * `prebuild` of `npm run lint`, or a script that opens with the typecheck command (`tsc --noEmit
 * && vite build`, which a scaffolded app has). The step then runs only the rest, through `npm exec`
 * so its binaries resolve as under `npm run`, with any other `prebuild` and the `postbuild` kept.
 * In a scaffolded app that took the app's build from 10.8 s to Vite's 4.5 s. `npm run build` itself
 * is unchanged.
 *
 * @param p - The package.
 * @param typecheckScript - The typecheck script the check runs for it, if any.
 * @param runsLint - Whether the check runs its lint script.
 * @returns The command.
 */
export function buildStepCommand(
  p: CheckPackage,
  typecheckScript: string | undefined,
  runsLint: boolean,
): string {
  const build = p.scripts.build.trim()
  const typecheck = typecheckScript ? p.scripts[typecheckScript]?.trim() : undefined
  const rest =
    typecheck && build.startsWith(`${typecheck} && `)
      ? build.slice(typecheck.length + 4).trim()
      : build
  const prebuild = p.scripts.prebuild?.trim()
  const lint = p.scripts.lint?.trim()
  const prebuildIsLint =
    runsLint &&
    prebuild !== undefined &&
    (/^npm run (--silent |-s )?lint$/.test(prebuild) || prebuild === lint)
  if (rest === build && !prebuildIsLint) return 'npm run --silent build'
  return [
    prebuild !== undefined && !prebuildIsLint ? 'npm run --silent prebuild' : null,
    `npm exec --silent --no -c ${shellWord(rest)}`,
    p.scripts.postbuild !== undefined ? 'npm run --silent postbuild' : null,
  ]
    .filter(Boolean)
    .join(' && ')
}

/**
 * Read one directory's package metadata for discovery.
 *
 * @param root - The project root.
 * @param dir - Absolute dir to read.
 * @param rel - Path relative to the root.
 * @returns The package info, or null when there is no readable package.json.
 */
function readPackage(root: string, dir: string, rel: string): CheckPackage | null {
  let pkg: { scripts?: unknown; workspaces?: unknown }
  try {
    pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  } catch (_error) {
    // Not a readable package — discovery just skips this dir.
    return null
  }
  let ts: string | null = null
  try {
    ts = readFileSync(join(dir, 'tsconfig.json'), 'utf8')
  } catch (_error) {
    // no tsconfig — hasTsconfig stays false
  }
  const pw = [
    'playwright.config.ts',
    'playwright.config.js',
    'playwright.config.mjs',
    'playwright.config.cjs',
    'playwright.config.mts',
  ].find((f) => existsSync(join(dir, f)))
  return {
    dir,
    rel,
    scripts:
      pkg.scripts && typeof pkg.scripts === 'object' ? (pkg.scripts as Record<string, string>) : {},
    workspaces: Boolean(pkg.workspaces),
    hasTsconfig: ts !== null,
    tsconfigReferences: ts !== null && /"references"\s*:/.test(ts),
    playwrightConfig: pw ?? null,
  }
}

/**
 * Discover the packages to check: the root plus its immediate child
 * directories (a workspace's members), skipping node_modules and dot-dirs.
 *
 * @param root - The project root.
 * @returns The packages, root first.
 */
export function discoverPackages(root: string): CheckPackage[] {
  const out: CheckPackage[] = []
  const top = readPackage(root, root, '.')
  if (top) out.push(top)
  let entries: Dirent[] = []
  try {
    entries = readdirSync(root, { withFileTypes: true })
  } catch (_error) {
    // unreadable root — the root entry (or nothing) is what we have
  }
  for (const e of entries) {
    if (!e.isDirectory() || e.name === 'node_modules' || e.name.startsWith('.')) continue
    const p = readPackage(root, join(root, e.name), e.name)
    if (p) out.push(p)
  }
  return out
}

/**
 * Decide which steps to run from what the discovery found. Pure — the whole
 * policy lives here so it is unit-tested without running anything.
 *
 * @param packages - Every package.json found at the root and one level down.
 * @param options - Step subset, e2e filter, and the call's budget.
 * @returns The steps to run and the ones skipped (with the reason).
 */
export function planCheckSteps(
  packages: readonly CheckPackage[],
  options: PlanCheckOptions,
): { steps: PlannedCheckStep[]; skipped: SkippedCheckStep[] } {
  const wanted = new Set<CheckStepKind>(options.steps?.length ? options.steps : SCRIPT_CHECK_STEPS)
  const root = packages.find((p) => p.rel === '.')
  const members = packages.filter((p) => p.rel !== '.')
  // A workspaces root only orchestrates its members (its `build` is "build
  // each workspace"), so the members are what gets checked. A plain root is
  // the project.
  const code = root && (!root.workspaces || members.length === 0) ? [root] : members
  const label = (kind: CheckStepKind, p: CheckPackage): string =>
    p.rel === '.' ? kind : `${kind} (${p.rel})`
  const rootDir = root?.dir ?? process.cwd()
  const logDir = (name: string): string => join(checkLogDir(rootDir), `${slug(name)}.log`)

  const steps: PlannedCheckStep[] = []
  const skipped: SkippedCheckStep[] = []
  const add = (
    kind: ScriptCheckStepKind,
    p: CheckPackage,
    command: string,
    extra?: object,
  ): void => {
    const name = label(kind, p)
    steps.push({
      kind,
      name,
      dir: p.dir,
      command,
      timeoutMs: Math.min(CHECK_STEP_TIMEOUT_MS[kind], options.budgetMs),
      logPath: logDir(name),
      ...extra,
    })
  }
  const skip = (kind: CheckStepKind, name: string, reason: string): void => {
    skipped.push({ kind, name, reason })
  }

  if (code.length === 0) {
    for (const kind of wanted) skip(kind, kind, 'no package.json found in the project')
    return { steps, skipped }
  }

  for (const p of code) {
    const typecheckScript = wanted.has('typecheck')
      ? TYPECHECK_SCRIPTS.find((s) => p.scripts[s])
      : undefined
    if (wanted.has('typecheck')) {
      const script = typecheckScript
      if (script) add('typecheck', p, `npm run --silent ${script}`)
      else if (p.hasTsconfig)
        add(
          'typecheck',
          p,
          p.tsconfigReferences
            ? `npx --no-install tsc -b --pretty false`
            : `npx --no-install tsc --noEmit --pretty false`,
        )
      else skip('typecheck', label('typecheck', p), 'no typecheck script and no tsconfig.json')
    }
    if (wanted.has('lint')) {
      const lint = p.scripts.lint
      if (!lint) skip('lint', label('lint', p), 'no lint script')
      else add('lint', p, 'npm run --silent lint')
    }
    if (wanted.has('build')) {
      if (p.scripts.build)
        add(
          'build',
          p,
          buildStepCommand(p, typecheckScript, wanted.has('lint') && Boolean(p.scripts.lint)),
          { outDirs: ['dist', 'build', 'out'] },
        )
      else skip('build', label('build', p), 'no build script')
    }
    if (wanted.has('unit')) {
      const test = p.scripts['test:unit']
        ? 'test:unit'
        : p.scripts.test &&
            !/\b(playwright|cypress)\b/.test(p.scripts.test) &&
            !/no test specified/.test(p.scripts.test)
          ? 'test'
          : null
      if (test) add('unit', p, `CI=1 npm run --silent ${test}`)
      else skip('unit', label('unit', p), 'no unit test script')
    }
  }

  if (wanted.has('e2e')) {
    const configured = packages.filter((p) => p.playwrightConfig)
    const scripted = code.filter((p) => p.scripts['test:e2e'] || p.scripts.e2e)
    if (configured.length > 0) {
      for (const p of configured)
        add('e2e', p, `npx --no-install playwright test${e2eArgs(options.e2e)}`)
    } else if (scripted.length > 0) {
      for (const p of scripted) {
        const script = p.scripts['test:e2e'] ? 'test:e2e' : 'e2e'
        add('e2e', p, `npm run --silent ${script} --${e2eArgs(options.e2e)}`)
      }
    } else skip('e2e', 'e2e', 'no playwright.config.* and no e2e script')
  }

  if (wanted.has('serve') && root && options.serve) {
    const { ready, run, start } = options.serve
    const script = start ?? (Object.hasOwn(root.scripts, 'start') ? 'start' : 'dev')
    steps.push({
      kind: 'serve',
      name: 'serve',
      dir: root.dir,
      command: `npm run -- ${shellWord(script)}`,
      timeoutMs: options.budgetMs,
      logPath: logDir('serve'),
      ready,
      run,
    })
  }

  return { steps, skipped }
}

// ── Error extraction ──────────────────────────────────────────────────────────

/** tsc, `file(12,5): error TS2322: msg` and the pretty `file:12:5 - error TS2322: msg`. */
const TSC_PAREN = /^(\S[^()]*?)\((\d+),\d+\): error (TS\d+): (.+)$/
const TSC_PRETTY = /^(\S.*?):(\d+):\d+ - error (TS\d+): (.+)$/
/** eslint stylish, `  12:5  error  msg  rule`. */
const ESLINT_ROW = /^\s+(\d+):\d+\s+error\s+(.+?)(?:\s{2,}(\S+))?\s*$/
/** A line that names a source file on its own (an eslint stylish header). */
const FILE_HEADER =
  /^(\/|\.{0,2}\/?[\w@.-]+\/)?[^\s:]+\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|vue|svelte)$/
/** esbuild, `✘ [ERROR] msg` with the location on a following line. */
const ESBUILD_ERROR = /^[✘x]\s*\[ERROR\]\s*(.+)$/
const ESBUILD_LOCATION = /^\s+(\S+?):(\d+):\d+:\s*$/
/** vitest, `FAIL  file > suite > test`. */
const VITEST_FAIL = /^\s*FAIL\s+(\S+\.\w+)(?:\s+>\s+(.+?))?\s*(?:\[.*\])?\s*$/
/** A thrown error's first line. */
const ERROR_LINE = /^\s*((?:\w*Error|Error)(?:\s*\[\w+\])?:\s*.+|Expected[:\s].+)$/
/** vitest's source pointer, ` ❯ file:12:5`. */
const VITEST_AT = /^\s*❯\s+(\S+?):(\d+):\d+/
/** Playwright list reporter failure header, `  1) [chromium] › e2e/a.spec.ts:10:5 › title ───`. */
const PLAYWRIGHT_FAIL = /^\s*\d+\)\s+(?:\[[^\]]+\]\s+›\s+)?(\S+?):(\d+):\d+\s+›\s+(.+?)\s*─*\s*$/

/** Strip ANSI color escape sequences (Vite / tsc / eslint output is colorized). */
const stripAnsi = (s: string): string =>
  // eslint-disable-next-line no-control-regex
  s.replace(/\x1B\[[0-9;]*m/g, '')

/**
 * Display a path relative to the checked project's root: absolute paths lose
 * the root prefix, relative ones (as runners print them, from the step's dir)
 * gain the dir.
 *
 * @param file - The path the tool printed.
 * @param root - The check root.
 * @param dir - The step's absolute dir.
 * @returns A root-relative path.
 */
function displayPath(file: string, root: string, dir: string): string {
  const base = relative(root, dir)
  if (file.startsWith('/')) return relative(root, file)
  const clean = file.replace(/^\.\//, '')
  return base ? `${base}/${clean}` : clean
}

/**
 * Cut an error line to the report's width.
 *
 * @param line - The error.
 * @returns At most {@link MAX_ERROR_LINE_CHARS} characters.
 */
function clip(line: string): string {
  const one = line.replace(/\s+/g, ' ').trim()
  return one.length > MAX_ERROR_LINE_CHARS ? `${one.slice(0, MAX_ERROR_LINE_CHARS - 1)}…` : one
}

/**
 * The first few actionable errors in a step's log, plus a one-line tally when
 * the runner printed one. Tool-shaped patterns first (tsc, eslint, esbuild,
 * vitest, Playwright — whichever appear, whatever the step kind, since a build
 * runs tsc and a test run can fail to compile); for a failure none of them
 * recognize, the last lines of the log, because an unparsed failure must never
 * read as "no errors".
 *
 * @param kind - The step kind.
 * @param rawLog - The step's output.
 * @param root - The check root (for display paths).
 * @param dir - The step's absolute dir.
 * @param failed - Whether the step exited non-zero.
 * @returns Deduplicated errors (capped), their total, and the tally.
 */
export function extractStepErrors(
  kind: CheckStepKind,
  rawLog: string,
  root: string,
  dir: string,
  failed: boolean,
): { errors: string[]; total: number; summary?: string } {
  const lines = rawLog.split('\n').map((l) => stripAnsi(l).replace(/\r$/, ''))
  const found: string[] = []
  const seen = new Set<string>()
  const push = (e: string): void => {
    const c = clip(e)
    if (c && !seen.has(c)) {
      seen.add(c)
      found.push(c)
    }
  }
  const nextError = (from: number): string | null => {
    for (let j = from; j < Math.min(lines.length, from + 20); j++) {
      const m = ERROR_LINE.exec(lines[j])
      if (m) return m[1]
    }
    return null
  }
  const nextAt = (from: number): string | null => {
    for (let j = from; j < Math.min(lines.length, from + 40); j++) {
      const m = VITEST_AT.exec(lines[j])
      if (m) return `${displayPath(m[1], root, dir)}:${m[2]}`
      if (VITEST_FAIL.test(lines[j])) return null
    }
    return null
  }

  let header: string | null = null
  const failedTests = new Set<string>()
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let m = TSC_PAREN.exec(line) ?? TSC_PRETTY.exec(line)
    if (m) {
      push(`${displayPath(m[1], root, dir)}:${m[2]}: ${m[3]} ${m[4]}`)
      continue
    }
    if (FILE_HEADER.test(line.trim()) && !/^\s/.test(line)) {
      header = line.trim()
      continue
    }
    m = ESLINT_ROW.exec(line)
    if (m && header) {
      push(`${displayPath(header, root, dir)}:${m[1]}: ${m[2]}${m[3] ? ` (${m[3]})` : ''}`)
      continue
    }
    m = ESBUILD_ERROR.exec(line)
    if (m) {
      const loc = lines
        .slice(i + 1, i + 4)
        .map((l) => ESBUILD_LOCATION.exec(l))
        .find(Boolean)
      push(loc ? `${displayPath(loc[1], root, dir)}:${loc[2]}: ${m[1]}` : m[1])
      continue
    }
    m = PLAYWRIGHT_FAIL.exec(line)
    if (m) {
      const error = nextError(i + 1)
      push(`${displayPath(m[1], root, dir)}:${m[2]} › ${m[3]}${error ? ` — ${error}` : ''}`)
      continue
    }
    m = VITEST_FAIL.exec(line)
    if (m) {
      const name = m[2] ? `${m[1]} > ${m[2]}` : m[1]
      // vitest prints each failure twice (as it runs, then in the summary);
      // the summary copy has the error under it, so keep the one that does.
      const error = nextError(i + 1)
      if (!error && failedTests.has(name)) continue
      if (!error) {
        failedTests.add(name)
        continue
      }
      failedTests.add(name)
      const at = nextAt(i + 1)
      push(
        `FAIL ${displayPath(m[1], root, dir)}${m[2] ? ` > ${m[2]}` : ''}: ${error}${at ? ` (at ${at})` : ''}`,
      )
      continue
    }
    if (/^\s*error during build:?\s*$/i.test(line)) {
      // Vite prints the header alone; the error itself is on the next line.
      const next = nextError(i + 1) ?? lines.slice(i + 1).find((l) => l.trim())
      if (next) push(next)
      continue
    }
    if (/Rollup failed to resolve import|\[vite\].*error|error during build/i.test(line)) {
      push(line)
    }
  }
  // FAIL lines that never showed an error under them still count.
  for (const name of failedTests) {
    if (!found.some((e) => e.includes(name.split(' > ').pop() ?? name))) push(`FAIL ${name}`)
  }

  let summary: string | undefined
  if (kind === 'unit') {
    summary = lines
      .map((l) => l.trim())
      .find((l) => /^Tests\s+.*\(\d+\)$/.test(l))
      ?.replace(/\s+/g, ' ')
  } else if (kind === 'lint') {
    // eslint's own tally — warnings do not fail the step, but they are worth a count.
    summary = lines.map((l) => /^\s*✖\s+(\d+ problems? \(.+\))/.exec(l)?.[1]).find(Boolean)
  } else if (kind === 'e2e') {
    const tally = lines
      .map((l) => /^\s*(\d+) (failed|passed|flaky|skipped|did not run|interrupted)\b/.exec(l))
      .filter((x): x is RegExpExecArray => Boolean(x))
      .map((x) => `${x[1]} ${x[2]}`)
    if (tally.length) summary = [...new Set(tally)].join(', ')
  }

  if (failed && found.length === 0) {
    // A thrown error (a config, a global setup, a script) — its message and
    // the first stack frame that names a file.
    const thrown = lines.findIndex((l) => /^\s*(?:\w*Error|Error)(?:\s*\[\w+\])?: \S/.test(l))
    if (thrown !== -1) {
      const frame = lines
        .slice(thrown + 1, thrown + 30)
        .map((l) => /^\s+at (?:.*\()?([^():]+):(\d+):\d+\)?\s*$/.exec(l))
        .find((m): m is RegExpExecArray => Boolean(m) && !m![1].includes('/node_modules/'))
      push(
        `${lines[thrown].trim()}${frame ? ` (at ${displayPath(frame[1], root, dir)}:${frame[2]})` : ''}`,
      )
      return { errors: found, total: found.length, summary }
    }
    // Nothing recognized: the log's own last words are the best lead there is
    // (npm's own noise and code-frame lines dropped).
    const tail = lines
      .map((l) => l.trim())
      .filter(
        (l) =>
          l &&
          !/^npm (ERR!|error|warn)/.test(l) &&
          !/^>?\s*\d*\s*\|/.test(l) &&
          l !== '__MOL_CUT__',
      )
      .slice(-6)
    for (const l of tail) push(l)
    return { errors: found, total: found.length, summary }
  }
  return { errors: found.slice(0, MAX_REPORTED_ERRORS), total: found.length, summary }
}

/**
 * Seconds, to one decimal.
 *
 * @param ms - Milliseconds.
 * @returns e.g. `12.3s`.
 */
function secs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}

/** A build output dir's manifest: the file count and up to 300 sorted paths. */
function buildManifest(
  dir: string,
  outDirs: string[],
): { dir: string; count: number; paths: string[] } | null {
  for (const out of outDirs) {
    const abs = join(dir, out)
    if (!existsSync(abs) || !statSync(abs).isDirectory()) continue
    const paths: string[] = []
    const walk = (d: string): void => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name)
        if (e.isDirectory()) walk(p)
        else paths.push(p)
      }
    }
    walk(abs)
    return { dir: out, count: paths.length, paths: paths.sort().slice(0, 300) }
  }
  return null
}

/**
 * Render a build manifest compactly: the count, then HTML pages first.
 *
 * @param manifest - The manifest.
 * @returns One line, e.g. `dist/: 23 files — index.html, about/index.html, … (+8 more)`.
 */
export function formatManifest(manifest: { dir: string; count: number; paths: string[] }): string {
  if (manifest.count === 0) return `${manifest.dir}/: EMPTY — the build wrote no files`
  const rel = manifest.paths.map((p) => p.replace(new RegExp(`^${manifest.dir}/`), ''))
  // The pages are what a static site IS, so they are named; everything else
  // (hashed assets, compiled modules) is only counted, by extension.
  const pages = rel.filter((p) => p.endsWith('.html'))
  const byExt = new Map<string, number>()
  for (const p of rel.filter((x) => !x.endsWith('.html'))) {
    const ext = /(\.d\.ts|\.[A-Za-z0-9]+)$/.exec(p)?.[1] ?? '(no extension)'
    byExt.set(ext, (byExt.get(ext) ?? 0) + 1)
  }
  const listed = manifest.count - manifest.paths.length
  const parts = [
    pages.length
      ? `pages: ${pages.slice(0, MAX_MANIFEST_PATHS).join(', ')}${pages.length > MAX_MANIFEST_PATHS ? `, … (+${pages.length - MAX_MANIFEST_PATHS} more)` : ''}`
      : null,
    byExt.size
      ? [...byExt.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([ext, n]) => `${n} ${ext}`)
          .join(', ')
      : null,
    listed > 0 ? `+${listed} not listed` : null,
  ].filter(Boolean)
  return `${manifest.dir}/: ${manifest.count} file${manifest.count === 1 ? '' : 's'} — ${parts.join('; ')}`
}

/**
 * The one report the caller reads.
 *
 * @param results - Every step's result, including skipped ones.
 * @param totalMs - The whole call's wall clock.
 * @returns The report text.
 */
export function formatCheckReport(results: readonly CheckStepResult[], totalMs: number): string {
  const order = (r: CheckStepResult): number => CHECK_STEP_KINDS.indexOf(r.kind)
  const sorted = [...results].sort((a, b) => order(a) - order(b))
  const count = (s: CheckStepResult['status']): number =>
    results.filter((r) => r.status === s).length
  const bad = count('failed') + count('timeout') + count('error')
  const parts = [
    count('failed') && `${count('failed')} failed`,
    count('timeout') && `${count('timeout')} timed out`,
    count('error') && `${count('error')} could not run`,
    count('passed') && `${count('passed')} passed`,
    count('skipped') && `${count('skipped')} skipped`,
  ].filter(Boolean)
  const out = [
    `check: ${bad ? 'FAILED' : 'PASSED'} — ${parts.join(', ') || 'nothing to run'} (${secs(totalMs)})`,
  ]
  for (const r of sorted) {
    if (r.status === 'skipped') {
      out.push(`SKIP ${r.name} — ${r.reason ?? 'not run'}`)
      continue
    }
    const tag = { passed: 'PASS', failed: 'FAIL', timeout: 'TIMEOUT', error: 'ERROR' }[r.status]
    const detail = [
      r.summary,
      r.status === 'failed' && r.errorTotal > 0
        ? `${r.errorTotal} error${r.errorTotal === 1 ? '' : 's'}${r.errorTotal > r.errors.length ? ` (first ${r.errors.length})` : ''}`
        : null,
      r.manifest,
    ].filter(Boolean)
    out.push(
      `${tag} ${r.name} ${secs(r.durationMs)}${detail.length ? ` — ${detail.join('; ')}` : ''}`,
    )
    for (const warning of r.buildWarnings ?? []) out.push(`  ${warning}`)
    if (r.status !== 'passed') {
      for (const e of r.errors) out.push(`  ${e}`)
      // The log ONLY when the list above is not all of it — a pointer under a step
      // whose every error is already printed sends the reader after a file that
      // repeats them (X0 flash-m99 read the log for the five lines it had just
      // been given, twice over: `read_file` refused the path, then a `cat`).
      const omitted = Math.max(0, r.errorTotal - r.errors.length)
      if (omitted > 0) out.push(`  ${omitted} more in the full log: ${r.logPath}`)
      else if (r.errors.length === 0 || r.kind === 'serve') out.push(`  full log: ${r.logPath}`)
    }
  }
  return out.join('\n')
}

/**
 * The `playwright install` arguments for the browsers a failed Playwright run reports missing
 * (`Executable doesn't exist at …/ms-playwright/chromium_headless_shell-1248/…`), or null when it
 * failed for another reason. A machine's first e2e run has no browser.
 *
 * @param log - The run's output.
 * @returns The install arguments, or null.
 */
export function missingPlaywrightBrowsers(log: string): string[] | null {
  const missing = new Set(
    [
      ...log.matchAll(
        /Executable doesn't exist at [^\r\n]*?[\\/](chromium(?:_headless_shell)?|firefox|webkit|ffmpeg)-\d+[\\/]/g,
      ),
    ].map((m) => m[1]),
  )
  const others = ['firefox', 'webkit', 'ffmpeg'].filter((name) => missing.has(name))
  if (missing.has('chromium')) return ['chromium', ...others]
  // Headless runs launch Chromium's headless shell alone.
  if (missing.has('chromium_headless_shell')) return ['--only-shell', 'chromium', ...others]
  return others.length > 0 ? others : null
}

/**
 * Turns `playwright install` output into progress for a caller watching the check. Off a terminal
 * Playwright prints `Downloading <browser> (playwright …) from <url>`, a bar at each tenth of the
 * download (`|■■■■   |  40% of 106.5 MiB`) and `<browser> (playwright …) downloaded to <dir>`; the
 * download is most of the install, and with none of it shown an agent watching the check went
 * looking for the browser itself (harness eval `check`, 2026-11-25: three probes in 20 s, one a
 * failed step).
 *
 * @returns A function from one output line to a note (the start, every fifth of the way, the end),
 *   or null for a line that says neither.
 */
export function playwrightInstallProgress(): (line: string) => string | null {
  let fifth = 0
  return (line) => {
    const text = stripVTControlCharacters(line).trim()
    const start = /^Downloading (.+?)(?: \(playwright [^)]*\))?(?: from \S+)?$/.exec(text)
    if (start) {
      fifth = 0
      return `downloading ${start[1]}`
    }
    const bar = /^\|[^|]*\|\s*(\d+)% of (.+)$/.exec(text)
    if (bar) {
      const percent = Number(bar[1])
      if (percent >= 100 || Math.floor(percent / 20) <= fifth) return null
      fifth = Math.floor(percent / 20)
      return `downloaded ${percent}% of ${bar[2]}`
    }
    const done = /^(.+?)(?: \(playwright [^)]*\))? downloaded to /.exec(text)
    return done ? `downloaded ${done[1]}` : null
  }
}

/**
 * Run one planned step locally and shape its result. An e2e step that fails only because its
 * Playwright browser is not installed installs that browser and runs once more.
 *
 * @param root - The check root (display paths).
 * @param step - The step.
 * @param signal - Aborts the step.
 * @param note - Told when the step starts the install, so a caller watching the output sees why
 *   it takes longer (an agent that saw a `playwright install` it did not start went looking for
 *   the browser itself, harness eval `check`, 2026-11-23).
 * @returns Its result (never throws).
 */
async function runStep(
  root: string,
  step: PlannedCheckStep,
  signal: AbortSignal,
  note: (text: string) => void = () => {},
): Promise<CheckStepResult> {
  if (step.kind === 'serve') return runServeStep(root, step, signal)
  const first = await runStepOnce(root, step, signal)
  if (step.kind !== 'e2e' || first.status !== 'failed' || !step.command.includes('playwright'))
    return first
  const install = missingPlaywrightBrowsers(readLog(step.logPath))
  if (!install) return first
  const browsers = install.filter((a) => !a.startsWith('-')).join(', ')
  note(`has no Playwright browser: installing ${browsers}, then running it again`)
  const progress = playwrightInstallProgress()
  const command = `npx --no-install playwright install ${install.join(' ')}`
  // The first run's log names the missing browser, and an agent that read it while the check was
  // still running installed the browser from its own shell and probed for it (harness eval `check`,
  // 2026-11-25, Codex reading the log beside a pending `check_project`). Until the next run replaces
  // it, the log says what the check is doing.
  const firstLog = readLog(step.logPath)
  writeLogs(
    step,
    `mlcl check: the Playwright browser (${browsers}) is not installed. The check is installing it (\`${command}\`) and will run this step again; this log is replaced when that run ends. The first run's output follows.\n\n${firstLog}`,
  )
  const installStarted = Date.now()
  try {
    await execCheckCommand({ ...step, command }, signal, (line) => {
      const text = progress(line)
      if (text) note(text)
    })
  } catch (error) {
    // The install failed (no network, no permission) or was stopped. Said first, with its last
    // diagnostic and the command: the first run's "Executable doesn't exist" alone reads as a browser
    // the check never tried to install, and an agent installed it from its own shell and ran the
    // check once more (harness eval `check`, 2026-11-25, a check process with no route to the network).
    const { stdout, stderr, message, killed } = error as {
      stdout?: string
      stderr?: string
      message: string
      killed?: boolean
    }
    const output = [stdout, stderr].filter(Boolean).join('\n')
    writeLogs(step, output ? `${firstLog}\n\n$ ${command}\n${output}` : firstLog)
    const lastDiagnostic = output
      .split('\n')
      .map((line) => stripVTControlCharacters(line).trim())
      .filter((line) => line && !line.startsWith('at '))
      .at(-1)
    const stopReason =
      signal.aborted && signal.reason instanceof Error ? signal.reason.message : message
    const reason = killed ? stopReason : (lastDiagnostic ?? message)
    const dir = relative(root, step.dir)
    const from = dir ? `from \`${dir}\`` : 'from the check root'
    return {
      ...first,
      status: killed ? 'timeout' : 'failed',
      durationMs: first.durationMs + Date.now() - installStarted,
      errors: [
        clip(
          `Playwright browser install ${killed ? 'stopped' : 'failed'}. Run \`${command}\` ${from}. ${killed ? reason : `The install reported ${reason}`}`,
        ),
        ...first.errors,
      ].slice(0, MAX_REPORTED_ERRORS),
      errorTotal: first.errorTotal + 1,
    }
  }
  const installDurationMs = Date.now() - installStarted
  const again = await runStepOnce(root, step, signal)
  const installed = `installed the Playwright browser first (${browsers})`
  return {
    ...again,
    durationMs: again.durationMs + first.durationMs + installDurationMs,
    summary: again.summary ? `${installed}, ${again.summary}` : installed,
  }
}

/** A step's full log, or '' when it was not written. */
function readLog(path: string): string {
  try {
    return readFileSync(path, 'utf8')
  } catch (_error) {
    // Never written (the step did not spawn): nothing to read.
    return ''
  }
}

async function runStepOnce(
  root: string,
  step: ScriptCheckStep,
  signal: AbortSignal,
): Promise<CheckStepResult> {
  const started = Date.now()
  const base = { kind: step.kind, name: step.name, logPath: step.logPath }
  let stdout: string
  let stderr: string
  let exitCode: number | null
  try {
    const r = await execCheckCommand(step, signal)
    stdout = r.stdout
    stderr = r.stderr
    exitCode = 0
  } catch (error) {
    const e = error as {
      stdout?: string
      stderr?: string
      code?: number | string
      killed?: boolean
      message: string
    }
    stdout = e.stdout ?? ''
    stderr = e.stderr ?? ''
    exitCode = typeof e.code === 'number' ? e.code : null
    if (exitCode === null) {
      // Never spawned (bash missing) or killed by our timeout (killed, no code).
      const timedOut = e.killed === true || /timed ?out/i.test(e.message)
      writeLogs(step, `${stdout}${stderr}`)
      return {
        ...base,
        status: timedOut ? 'timeout' : 'error',
        durationMs: Date.now() - started,
        errors: [
          timedOut ? `stopped after ${secs(step.timeoutMs)} — the output so far:` : clip(e.message),
        ],
        errorTotal: 1,
      }
    }
  }
  const durationMs = Date.now() - started
  const log = `${stdout}${stderr}`
  writeLogs(step, log)
  if (step.kind === 'lint' && log.includes('__MOL_NO_CHANGED__')) {
    return {
      ...base,
      status: 'skipped',
      durationMs,
      errors: [],
      errorTotal: 0,
      reason: 'no changed files to lint',
    }
  }
  const lintFiles = /__MOL_LINT_FILES__ (\d+)/.exec(log)?.[1]
  const cleanLog = log.replace(/^__MOL_LINT_FILES__ \d+\n?/m, '')
  const failed = exitCode !== 0
  const { errors, total, summary } = extractStepErrors(step.kind, cleanLog, root, step.dir, failed)
  const manifest =
    step.kind === 'build' && !failed && step.outDirs ? buildManifest(step.dir, step.outDirs) : null
  const buildWarnings =
    step.kind === 'build' && !failed
      ? [
          ...new Set(
            cleanLog
              .split('\n')
              .map((line) => stripAnsi(line).trim())
              .filter((line) => line.startsWith('[molecule:unreached-source] ')),
          ),
        ]
      : []
  const warnings = buildWarnings.slice(0, MAX_REPORTED_ERRORS).map((line) => clip(line))
  if (buildWarnings.length > warnings.length)
    warnings.push(`${buildWarnings.length - warnings.length} more warnings in ${step.logPath}`)
  return {
    ...base,
    status: failed ? 'failed' : 'passed',
    durationMs,
    errors: failed ? errors : [],
    errorTotal: failed ? total : 0,
    ...((): { summary?: string } => {
      const files = lintFiles
        ? `${lintFiles} changed file${lintFiles === '1' ? '' : 's'}`
        : undefined
      const text = [files, summary].filter(Boolean).join(', ')
      return text ? { summary: text } : {}
    })(),
    ...(manifest ? { manifest: formatManifest(manifest) } : {}),
    ...(warnings.length ? { buildWarnings: warnings } : {}),
  }
}

const CHECK_BUDGET_EXPIRED = new Error('The check budget expired.')

async function runServeStep(
  root: string,
  step: ServeCheckStep,
  signal: AbortSignal,
): Promise<CheckStepResult> {
  const started = Date.now()
  const { error, diagnostic, log } = await runServeCheck(step, signal)
  writeLogs(step, log)
  const { errors, total } = error
    ? extractStepErrors('serve', diagnostic, root, step.dir, true)
    : { errors: [], total: 0 }
  return {
    kind: 'serve',
    name: step.name,
    status: error === CHECK_BUDGET_EXPIRED ? 'timeout' : error ? 'failed' : 'passed',
    durationMs: Date.now() - started,
    errors: error ? [clip(error.message), ...errors.slice(0, MAX_REPORTED_ERRORS - 1)] : [],
    errorTotal: error ? 1 + total : 0,
    logPath: step.logPath,
  }
}

/** Run and reap a check's shell and descendants before resolving its timeout. */
async function execCheckCommand(
  step: PlannedCheckStep,
  signal: AbortSignal,
  onLine?: (line: string) => void,
): Promise<{ stdout: string; stderr: string }> {
  const timeout = (): Error & { killed: boolean } =>
    Object.assign(new Error('Check command timed out'), { killed: true })
  if (signal.aborted) throw timeout()
  let failure: Error | undefined
  const command = spawnCheckCommand(step.command, step.dir, (error) => stop(error), onLine)
  const stop = (error: Error): void => {
    if (failure) return
    failure = error
    try {
      command.send('SIGKILL')
    } catch (cause) {
      failure = new Error('Could not stop the check command', { cause })
    }
  }
  const abort = (): void => stop(timeout())
  const timer = setTimeout(abort, step.timeoutMs)
  timer.unref?.()
  signal.addEventListener('abort', abort, { once: true })
  try {
    await command.closed
    const exit = await command.exited
    const output = command.output()
    const commandError = failure ?? exit.error
    if (commandError) throw Object.assign(commandError, output)
    if (exit.code !== 0)
      throw Object.assign(new Error(`Check command exited with ${exit.code ?? exit.signal}`), {
        code: exit.code,
        ...output,
      })
    return output
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', abort)
  }
}

function writeLogs(step: PlannedCheckStep, log: string): void {
  try {
    mkdirSync(dirname(step.logPath), { recursive: true })
    writeFileSync(step.logPath, log)
  } catch (_error) {
    // The log file is a convenience; the result already carries the errors.
  }
}

/** Arguments {@link runCheckLocal} accepts. */
export interface CheckInput {
  steps?: unknown
  e2e?: unknown
  /** HTTP readiness URL on localhost or 127.0.0.1 for `serve`. */
  ready?: unknown
  /** Shell assertion to run in the project root once the service answers. */
  run?: unknown
  /** npm script for `serve`; defaults to start if declared, otherwise dev. */
  start?: unknown
}

function serveOptions(
  input: CheckInput,
): NonNullable<PlanCheckOptions['serve']> | { error: string } {
  const rawReady = typeof input.ready === 'string' ? input.ready.trim() : ''
  const run = typeof input.run === 'string' ? input.run : ''
  if (!rawReady && !run.trim()) return { error: 'The serve step needs ready and run.' }
  if (!rawReady) return { error: 'The serve step needs a ready URL.' }
  if (!run.trim()) return { error: 'The serve step needs a run command.' }
  const ready = URL.canParse(rawReady) ? new URL(rawReady) : undefined
  if (
    !ready ||
    ready.protocol !== 'http:' ||
    !['localhost', '127.0.0.1'].includes(ready.hostname) ||
    ready.port === '0'
  )
    return { error: 'The serve step needs an HTTP ready URL on localhost or 127.0.0.1.' }
  if (input.start !== undefined && (typeof input.start !== 'string' || !input.start.trim()))
    return { error: 'The serve step needs a script name for start.' }
  return { ready, run, start: input.start }
}

/**
 * The steps a check input selects: the ones it names, or {@link DEFAULT_CHECK_STEPS} (plus e2e when
 * it gives an e2e filter) when it names none.
 *
 * @param input - `steps` (an array, or a comma- or space-separated string) and `e2e`.
 * @returns The steps, or the refusal naming what is not a step.
 */
export function selectedCheckSteps(
  input: CheckInput,
): { steps: CheckStepKind[] } | { error: string } {
  const rawSteps = Array.isArray(input.steps)
    ? input.steps
    : typeof input.steps === 'string'
      ? input.steps.split(/[\s,]+/).filter(Boolean)
      : []
  const unknown = rawSteps.filter(
    (s) => typeof s !== 'string' || !(CHECK_STEP_KINDS as readonly string[]).includes(s),
  )
  if (unknown.length > 0) {
    return {
      error: `Unknown step(s): ${unknown.map(String).join(', ')}. Valid steps: ${CHECK_STEP_KINDS.join(', ')}.`,
    }
  }
  const e2e = typeof input.e2e === 'string' ? input.e2e : undefined
  return {
    steps: rawSteps.length
      ? (rawSteps as CheckStepKind[])
      : [...DEFAULT_CHECK_STEPS, ...(e2e ? (['e2e'] as const) : [])],
  }
}

/** A step starting, or finishing with its result, as {@link runCheckLocal} reports it. */
export type CheckProgress =
  | { type: 'start'; step: PlannedCheckStep }
  /** Something a running step does besides its command, said as it starts (a browser install). */
  | { type: 'note'; step: PlannedCheckStep; text: string }
  | { type: 'finish'; step: PlannedCheckStep; result: CheckStepResult }

/**
 * Run the project's checks concurrently (e2e and serve once the build is done) and
 * return one report — the local twin of the IDE `check` tool's loop.
 *
 * @param root - The project root to check (default cwd).
 * @param input - `steps` (subset; {@link DEFAULT_CHECK_STEPS} when empty, plus e2e when an
 *   `e2e` filter is given), `e2e` (spec filter) and `ready`, `run`, `start` for a service check.
 * @param options - `budgetMs` for the steps (default 15 min, counted once no other check of the
 *   project runs: see check-lock.ts), `signal` for cancellation, `onProgress`, called as each
 *   step starts and finishes, and when a step starts work besides its command, and `onWait`, called
 *   with the other check's pid when this one waits for it.
 * @returns `{ ok, report, results }`, or `{ error }` when nothing could be discovered.
 */
export async function runCheckLocal(
  root: string,
  input: CheckInput,
  options: {
    budgetMs?: number
    signal?: AbortSignal
    onProgress?: (event: CheckProgress) => void
    onWait?: (holder: number) => void
  } = {},
): Promise<{ ok: boolean; report: string; results: CheckStepResult[] } | { error: string }> {
  const budgetMs = options.budgetMs ?? 15 * 60_000
  const selected = selectedCheckSteps(input)
  if ('error' in selected) return selected
  const { steps } = selected
  const e2e = typeof input.e2e === 'string' ? input.e2e : undefined
  const serve = steps.includes('serve') ? serveOptions(input) : undefined
  if (serve && 'error' in serve) return serve

  const packages = discoverPackages(root)
  if (packages.length === 0) {
    return { error: `check could not read a package.json under ${root}.` }
  }
  if (serve && !packages.some((pkg) => pkg.rel === '.'))
    return { error: 'The serve step needs a package.json in the project root.' }

  let release: () => Promise<void>
  try {
    release = await acquireCheckLock(root, { signal: options.signal, onWait: options.onWait })
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
  try {
    return await runPlannedCheck(root, packages, { steps, e2e, serve, budgetMs }, options)
  } finally {
    await release()
  }
}

/**
 * The steps of one check, run while it holds the project's check lock.
 *
 * @param root - The project root.
 * @param packages - The packages {@link discoverPackages} found.
 * @param selection - The steps, the e2e filter, the serve options and the budget.
 * @param options - `signal` and `onProgress`, as {@link runCheckLocal} takes them.
 * @returns `{ ok, report, results }`.
 */
async function runPlannedCheck(
  root: string,
  packages: CheckPackage[],
  selection: {
    steps: CheckStepKind[]
    e2e: string | undefined
    serve: Exclude<ReturnType<typeof serveOptions>, { error: string }> | undefined
    budgetMs: number
  },
  options: { signal?: AbortSignal; onProgress?: (event: CheckProgress) => void },
): Promise<{ ok: boolean; report: string; results: CheckStepResult[] }> {
  const started = Date.now()
  const { steps, e2e, serve, budgetMs } = selection
  const plan = planCheckSteps(packages, { steps, e2e, serve, budgetMs })
  const controller = new AbortController()
  const cancel = (): void => controller.abort(new Error('The check was cancelled.'))
  if (options.signal?.aborted) cancel()
  else options.signal?.addEventListener('abort', cancel, { once: true })
  const remaining = budgetMs - (Date.now() - started)
  const expire = (): void => controller.abort(CHECK_BUDGET_EXPIRED)
  const timer = remaining > 0 ? setTimeout(expire, remaining) : undefined
  timer?.unref?.()
  if (remaining <= 0) expire()
  const results = new Map<PlannedCheckStep, CheckStepResult>()
  const run = async (step: PlannedCheckStep): Promise<void> => {
    options.onProgress?.({ type: 'start', step })
    const result = await runStep(root, step, controller.signal, (text) =>
      options.onProgress?.({ type: 'note', step, text }),
    )
    results.set(step, result)
    options.onProgress?.({ type: 'finish', step, result })
  }
  // e2e and serve wait for the build: specs that read dist/ (or a server that serves
  // it) otherwise run while the build is rewriting it, and report failures
  // that are gone a second later.
  const builds = plan.steps.filter((s) => s.kind === 'build').map(run)
  const buildsDone = Promise.allSettled(builds)
  const running = [
    ...builds,
    ...plan.steps
      .filter((s) => s.kind !== 'build')
      .map((step) =>
        step.kind === 'e2e' || step.kind === 'serve' ? buildsDone.then(() => run(step)) : run(step),
      ),
  ]
  // Cancellation stops each process group. Await close and log writes before the
  // caller can remove its project. Queued steps also see the aborted signal.
  await Promise.allSettled(running)
  options.signal?.removeEventListener('abort', cancel)
  if (timer) clearTimeout(timer)

  const all: CheckStepResult[] = plan.steps.map(
    (step) =>
      results.get(step) ?? {
        kind: step.kind,
        name: step.name,
        status: 'timeout',
        durationMs: Date.now() - started,
        errors: ['still running when the check budget ran out'],
        errorTotal: 1,
        logPath: step.logPath,
      },
  )
  for (const s of plan.skipped) {
    all.push({ ...s, status: 'skipped', durationMs: 0, errors: [], errorTotal: 0, logPath: '' })
  }
  const ok = all.every((r) => r.status === 'passed' || r.status === 'skipped')
  return { ok, report: formatCheckReport(all, Date.now() - started), results: all }
}
