/**
 * Which env reads a project's code makes, and whether each one tolerates the variable being unset.
 *
 * mlcl owns this module and molecule-dev's API runs a byte-identical copy (`api-mirrored-modules.json`):
 * `mlcl env` and the MCP `check_env_vars` tool (`env-detect.ts`) and the IDE's Environment panel
 * (`App/Resource/EnvVars/scan.ts`) must judge the same line the same way. Two hand-kept copies drifted: the
 * panel learned that `if (process.env.HTTPS) {` is an opt-in flag and to see a fallback through a
 * TypeScript cast, and `mlcl env` went on telling every fresh scaffold that HTTPS needed setting up.
 *
 * @module
 */

/**
 * Pure noise: env keys every toolchain reads that are NEVER a user-settable
 * integration credential — excluded from the report entirely. Vite's standard
 * `import.meta.env` builtins, which the bundler defines and nobody sets.
 * (`NODE_ENV` is NOT here: molecule sets it, so the report says so.)
 */
export const NOISE_KEYS = new Set(['MODE', 'DEV', 'PROD', 'SSR', 'BASE_URL'])

/**
 * Every `process.env.KEY` / `import.meta.env.KEY` in a line. Constructed per
 * call, never module-scoped: a `/g` regex carries `lastIndex` between uses, so a
 * shared instance would start the next line mid-string and silently skip keys.
 *
 * @returns A fresh global matcher.
 */
export const envRefMatcher = (): RegExp =>
  /(?:process\.env|import\.meta\.env)\.([A-Za-z_][A-Za-z0-9_]*)/g

/**
 * Directory segments that are unambiguously tooling wherever they appear. A key
 * referenced only from these is never something the running app needs.
 */
const TOOLING_DIRS = new Set([
  'e2e',
  '__tests__',
  '__mocks__',
  '__setup__',
  'cypress',
  '.storybook',
  'playwright',
])

/**
 * Directory segments that mean tooling only OUTSIDE `src/`. `api/scripts/seed.ts`
 * is tooling; `api/src/scripts/migrate.ts` is the migration runner the app ships,
 * and calling that tooling would hide a real `DATABASE_URL` reference.
 */
const TOOLING_DIRS_OUTSIDE_SRC = new Set(['scripts', 'test', 'tests', 'fixtures', 'benchmarks'])

/** `foo.test.ts`, `foo.spec.tsx`. */
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/

/** `vite.config.ts`, `playwright.config.ts`, `eslint.config.js`. */
const CONFIG_FILE = /\.config\.[cm]?[jt]sx?$/

/**
 * Is this reference from tooling rather than from the app the user ships?
 *
 * @param file - Repo-relative path from the scan.
 * @returns True for tests, e2e specs, and build/test config.
 */
export function isToolingPath(file: string): boolean {
  const segments = file.split('/')
  const name = segments[segments.length - 1] ?? ''
  const dirs = segments.slice(0, -1)
  const underSrc = dirs.includes('src')
  if (dirs.some((d) => TOOLING_DIRS.has(d))) return true
  if (!underSrc && dirs.some((d) => TOOLING_DIRS_OUTSIDE_SRC.has(d))) return true
  if (TEST_FILE.test(name)) return true
  // A build-tool config at the workspace root (`app/vite.config.ts`). Under
  // `src/` a `*.config.ts` is app code, not toolchain configuration.
  if (!underSrc && CONFIG_FILE.test(name)) return true
  return false
}

/**
 * A chain the reference may be wrapped in before its fallback appears —
 * `process.env.X?.replace(/\/$/, '') || y`. Consumed so the operator after it is
 * still recognised.
 */
const TRAILING_CHAIN = /^(?:\??\.[A-Za-z_$][\w$]*(?:\([^()]*\))?|\[[^\]]*\])*/

/**
 * A TypeScript wrapper between the read and its fallback: a type assertion
 * (`as T`, `satisfies T`), a non-null assertion (`!`), and the closing
 * parentheses the read may sit inside — `(import.meta.env.VITE_API_URL as
 * string | undefined) || '/api'`, `Number(process.env.PORT) || 3000`. Consumed
 * so the operator after the wrapper is still recognised; none of these handles
 * absence on its own. `!(?!=)` leaves a `!=` comparison to {@link GUARD}.
 */
const TYPE_SUFFIX =
  /^(?:\s*\)+\s*|\s*(?:(?:as|satisfies)\s+(?:\{[^}]*\}|[^)|&?]+)(?:\s*[|&]\s*[^)|&?]+)*|!(?!=))\s*\)*)/

/** `?? v`, `|| v`, a comparison, or a ternary test — all mean "absence is handled". */
const GUARD = /^\s*(\?\?|\|\||[!=]==?|\?(?!\.))/

/** Longest fallback literal carried into the report — the panel shows it inline. */
const MAX_DEFAULT_VALUE = 60

/** A plain literal fallback, so the panel can show what the code uses instead. */
const LITERAL =
  /^\s*(?:'([^']*)'|"([^"]*)"|`([^`$]*)`|(-?\d+(?:\.\d+)?)|(true|false|null|undefined))/

/**
 * Does this particular read of the key tolerate the var being unset?
 *
 * A read that IS the whole condition of an `if` (`if (process.env.HTTPS) {`) is an
 * opt-in flag: unset means the branch is skipped and nothing else uses the
 * value, so it needs nothing from the user.
 *
 * @param rest - The source text immediately following the reference, already cut
 *   at the end of its statement.
 * @param before - The source text on the line before the reference.
 * @returns Whether absence is handled, and the literal fallback when there is one.
 */
export function readIsGuarded(
  rest: string,
  before = '',
): { guarded: boolean; defaultValue?: string } {
  if (/\bif\s*\(\s*!?\s*$/.test(before) && /^\s*\)/.test(rest)) return { guarded: true }
  // Peel property/call chains, TypeScript wrappers and closing parentheses until
  // neither applies, so the operator after `(X as string) || '/api'` is seen.
  let cursor = 0
  for (;;) {
    const chain = TRAILING_CHAIN.exec(rest.slice(cursor))?.[0] ?? ''
    if (chain.length > 0) {
      cursor += chain.length
      continue
    }
    const suffix = TYPE_SUFFIX.exec(rest.slice(cursor))?.[0] ?? ''
    if (suffix.length === 0) break
    cursor += suffix.length
  }
  const afterChain = rest.slice(cursor)
  const guard = GUARD.exec(afterChain)
  if (!guard) return { guarded: false }
  const operator = guard[1]
  if (operator !== '??' && operator !== '||') return { guarded: true }
  const literal = LITERAL.exec(afterChain.slice(guard[0].length))
  if (!literal) return { guarded: true }
  const value = literal.slice(1).find((group) => group !== undefined)
  // The panel renders this inline ("Falls back to X"), so a long literal is
  // truncated rather than allowed to take over the row.
  return { guarded: true, defaultValue: value?.slice(0, MAX_DEFAULT_VALUE) }
}

/**
 * When a line is a bare `const|let|var V = process.env.KEY` (no inline guard),
 * the variable name the read was assigned to — so a guard on `V` a few lines
 * later can still be found. Returns null for a read that is not a plain
 * assignment (a call argument, a property value), where a later guard on some
 * unrelated name would not apply. KEY is `[A-Za-z0-9_]+`, so it needs no
 * escaping in the pattern.
 *
 * @param text - The source line.
 * @param key - The env key read on it.
 * @returns The assigned variable name, or null.
 */
export function assignedVariable(text: string, key: string): string | null {
  const re = new RegExp(
    `\\b(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*(?:process\\.env|import\\.meta\\.env)\\.${key}\\b`,
  )
  return re.exec(text)?.[1] ?? null
}

/**
 * Does this line apply a default to (or otherwise tolerate the absence of) the
 * variable `v`? The patterns are the multi-line echoes of {@link readIsGuarded}:
 * `v ?? x` / `v || x` (with the literal captured), `!v`, `v === undefined|null|''`,
 * and a `v ?` ternary test. A plain truthiness `if (v)` is deliberately NOT a
 * guard — it branches but supplies no fallback, so the read can still be
 * required. A named-constant fallback (`return DEFAULT_INTERVAL_MS`) yields
 * `guarded` with no literal, which the panel renders as "handled when unset".
 *
 * @param text - A line following the assignment.
 * @param v - The assigned variable name (a valid identifier — no escaping needed).
 * @returns Whether the line guards `v`, and the literal fallback when it is one.
 */
export function variableIsGuarded(
  text: string,
  v: string,
): { guarded: boolean; defaultValue?: string } {
  const coalesce = new RegExp(`\\b${v}\\s*(?:\\?\\?|\\|\\|)\\s*(.*)$`).exec(text)
  if (coalesce) {
    const literal = LITERAL.exec(coalesce[1])
    const value = literal?.slice(1).find((group) => group !== undefined)
    return { guarded: true, defaultValue: value?.slice(0, MAX_DEFAULT_VALUE) }
  }
  if (new RegExp(`(?:^|[^.\\w$])!\\s*${v}\\b`).test(text)) return { guarded: true }
  if (new RegExp(`\\b${v}\\s*(?:===|!==|==|!=)\\s*(?:undefined|null|''|""|\`\`)`).test(text)) {
    return { guarded: true }
  }
  if (new RegExp(`\\b${v}\\s*\\?(?!\\.)`).test(text)) return { guarded: true }
  return { guarded: false }
}

/** A line that is entirely a comment — its `process.env.X` is prose, not a read. */
export const COMMENT_LINE = /^\s*(\/\/|\/\*|\*)/

/** A trailing `//` comment, captured as the var's own documentation. */
export const TRAILING_COMMENT = /\/\/\s*(.+?)\s*$/

/** Longest author comment carried into the report. */
export const MAX_COMMENT = 120
