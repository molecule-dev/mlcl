/**
 * `mlcl check` — run the project's own checks (typecheck, lint, build, unit
 * tests, e2e), discovered from its package.json scripts, and return one
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

import { exec } from 'node:child_process'
import type { Dirent } from 'node:fs'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

/** The kinds of step `check` can run, in report order. */
export const CHECK_STEP_KINDS = ['typecheck', 'lint', 'build', 'unit', 'e2e'] as const

/** One kind of check step. */
export type CheckStepKind = (typeof CHECK_STEP_KINDS)[number]

/** Default wall clock per step kind; each is also capped by the whole call's budget. */
export const CHECK_STEP_TIMEOUT_MS: Readonly<Record<CheckStepKind, number>> = {
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

/** A step `check` will run. */
export interface PlannedCheckStep {
  kind: CheckStepKind
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
  /** Build output dirs to list on success (build steps only). */
  outDirs?: string[]
}

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
  /** Why it was skipped (status `skipped`). */
  reason?: string
  logPath: string
}

/** Options for {@link planCheckSteps}. */
export interface PlanCheckOptions {
  /** Only these kinds (default: all). */
  steps?: readonly CheckStepKind[]
  /** Extra arguments for the e2e run (spec files, `--grep …`). */
  e2e?: string
  /** The whole call's budget; no step may exceed it. */
  budgetMs: number
}

/** Scripts that type-check, in preference order. */
const TYPECHECK_SCRIPTS = ['typecheck', 'type-check', 'check-types', 'tsc']

/** Files an eslint lint step considers. */
const LINTABLE = String.raw`\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|vue|svelte)$`

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
  const wanted = new Set<CheckStepKind>(options.steps?.length ? options.steps : CHECK_STEP_KINDS)
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
  const add = (kind: CheckStepKind, p: CheckPackage, command: string, extra?: object): void => {
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
    if (wanted.has('typecheck')) {
      const script = TYPECHECK_SCRIPTS.find((s) => p.scripts[s])
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
      else if (/\beslint\b/.test(lint))
        add(
          'lint',
          p,
          // Changed files only, the way a pre-commit hook lints: modified and
          // untracked, as git sees them from this package dir. Outside a git
          // repo there is no "changed", so the script runs as written.
          [
            'if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then',
            `  files=$({ git diff --name-only --relative HEAD; git ls-files --others --exclude-standard; } 2>/dev/null | grep -E '${LINTABLE}' | sort -u | while IFS= read -r f; do [ -f "$f" ] && printf '%s\\n' "$f"; done)`,
            '  if [ -z "$files" ]; then echo __MOL_NO_CHANGED__; exit 0; fi',
            `  echo "__MOL_LINT_FILES__ $(printf '%s\\n' "$files" | wc -l)"`,
            `  printf '%s\\n' "$files" | xargs -d '\\n' npx --no-install eslint`,
            'else',
            `  npm run --silent lint`,
            'fi',
          ].join('\n'),
        )
      else add('lint', p, 'npm run --silent lint')
    }
    if (wanted.has('build')) {
      if (p.scripts.build)
        add('build', p, 'npm run --silent build', { outDirs: ['dist', 'build', 'out'] })
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
    if (r.status !== 'passed') {
      for (const e of r.errors) out.push(`  ${e}`)
      out.push(`  full log: ${r.logPath}`)
    }
  }
  return out.join('\n')
}

/**
 * Run one planned step locally and shape its result.
 *
 * @param root - The check root (display paths).
 * @param step - The step.
 * @returns Its result (never throws).
 */
async function runStep(root: string, step: PlannedCheckStep): Promise<CheckStepResult> {
  const started = Date.now()
  const base = { kind: step.kind, name: step.name, logPath: step.logPath }
  let stdout: string
  let stderr: string
  let exitCode: number | null
  try {
    const r = await execAsync(step.command, {
      cwd: step.dir,
      timeout: step.timeoutMs,
      killSignal: 'SIGTERM',
      maxBuffer: 16 * 1024 * 1024,
      shell: '/bin/bash',
    })
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
      writeLogs(step, stdout, stderr)
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
  writeLogs(step, stdout, stderr)
  const log = `${stdout}${stderr}`
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
  }
}

function writeLogs(step: PlannedCheckStep, stdout: string, stderr: string): void {
  try {
    mkdirSync(step.logPath.slice(0, step.logPath.lastIndexOf('/')), { recursive: true })
    writeFileSync(step.logPath, `${stdout}${stderr}`)
  } catch (_error) {
    // The log file is a convenience; the result already carries the errors.
  }
}

/** Arguments {@link runCheckLocal} accepts. */
export interface CheckInput {
  steps?: unknown
  e2e?: unknown
}

/**
 * Run the project's checks concurrently (e2e once the build is done) and
 * return one report — the local twin of the IDE `check` tool's loop.
 *
 * @param root - The project root to check (default cwd).
 * @param input - `steps` (subset) and `e2e` (spec filter).
 * @param options - `budgetMs` for the whole call (default 15 min).
 * @returns `{ ok, report, results }`, or `{ error }` when nothing could be discovered.
 */
export async function runCheckLocal(
  root: string,
  input: CheckInput,
  options: { budgetMs?: number } = {},
): Promise<{ ok: boolean; report: string; results: CheckStepResult[] } | { error: string }> {
  const started = Date.now()
  const budgetMs = options.budgetMs ?? 15 * 60_000
  const rawSteps = Array.isArray(input.steps)
    ? input.steps
    : typeof input.steps === 'string'
      ? input.steps.split(/[\s,]+/)
      : []
  const unknown = rawSteps.filter(
    (s) => typeof s !== 'string' || !(CHECK_STEP_KINDS as readonly string[]).includes(s),
  )
  if (unknown.length > 0) {
    return {
      error: `Unknown step(s): ${unknown.map(String).join(', ')}. Valid steps: ${CHECK_STEP_KINDS.join(', ')}.`,
    }
  }
  const steps = rawSteps as CheckStepKind[]
  const e2e = typeof input.e2e === 'string' ? input.e2e : undefined

  const packages = discoverPackages(root)
  if (packages.length === 0) {
    return { error: `check could not read a package.json under ${root}.` }
  }

  const plan = planCheckSteps(packages, { steps, e2e, budgetMs })
  const results = new Map<PlannedCheckStep, CheckStepResult>()
  const run = (step: PlannedCheckStep): Promise<void> =>
    runStep(root, step).then((r) => {
      results.set(step, r)
    })
  // e2e waits for the build: specs that read dist/ (or a server that serves
  // it) otherwise run while the build is rewriting it, and report failures
  // that are gone a second later.
  const builds = plan.steps.filter((s) => s.kind === 'build').map(run)
  const buildsDone = Promise.allSettled(builds)
  const running = [
    ...builds,
    ...plan.steps
      .filter((s) => s.kind !== 'build')
      .map((step) => (step.kind === 'e2e' ? buildsDone.then(() => run(step)) : run(step))),
  ]
  // Every step has its own timeout under the budget; this is the backstop that
  // makes a stuck step return the finished steps instead of nothing.
  let timer: NodeJS.Timeout | undefined
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, Math.max(0, budgetMs - (Date.now() - started)))
    timer.unref?.()
  })
  await Promise.race([Promise.allSettled(running), deadline])
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
