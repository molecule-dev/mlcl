/**
 * Local env-var detection — the CLI counterpart of the IDE's server-side scan
 * (molecule-dev `api/src/App/Resource/EnvVars/scan.ts`), answering the same
 * question for a project on disk with no platform involved: **which env vars
 * does this app actually need, and which of those is the user missing?**
 *
 * Everything here is pure Node (fs + path + the local registry.json) so the
 * module can later lift into a shared home unchanged. The guard/tooling
 * classification mirrors the IDE scan's semantics line for line — the two
 * surfaces must not disagree about what "needs attention" means:
 *
 * 1. **Code reads.** `process.env.X` / `import.meta.env.X` in app source —
 *    tests, e2e specs, build configs, and scripts are tooling and dropped.
 *    A read with an inline `?? / ||` fallback, or a bare assignment guarded a
 *    few lines later, is optional; the literal fallback is carried so the
 *    report can show it.
 * 2. **Registry declarations.** The `secrets` arrays of the project's
 *    installed `@molecule/*` packages (resolved from the local registry.json,
 *    the same source `mlcl create`/`inject` write `.env` from), OR-ing
 *    `required` across packages exactly like the IDE does.
 * 3. **Local .env state.** api/.env + app/.env + .env per the scaffold
 *    convention — a key present (uncommented) anywhere counts as set.
 * 4. **Platform-provided.** `provisioned: true` secrets are injected by
 *    molecule.dev in sandboxes/deploys — never demanded of the user.
 *    `generate`-marked secrets are auto-generatable on the spot, so a missing
 *    one is attention, but locally fixable (`mlcl env check --fix`).
 *
 * Never returns secret VALUES — key names, referencing files, and the same
 * group classification the IDE panel renders.
 *
 * @module
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { findRegistryPackage } from './registry.js'
import type { MoleculeSecret } from './schema.js'

/** One place the code reads an env var (mirrors the IDE's EnvRef). */
export interface LocalEnvRef {
  /** The env key read. */
  key: string
  /** Repo-relative path. */
  file: string
  /** 1-based line number. */
  line: number
  /** True when the reference is in tests / e2e specs / build config / scripts. */
  tooling: boolean
  /** True when this line's reads all tolerate the var being unset. */
  guarded: boolean
  /** The literal fallback, when the line supplies a plain one. */
  defaultValue?: string
  /** A trailing `//` comment on the line — the author explaining their own var. */
  comment?: string
}

/** File extensions scanned for env reads (same set the IDE greps). */
const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.vue',
  '.svelte',
  '.astro',
])

/** Directories never worth entering — installed deps, build output, VCS, tool state. */
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  '.output',
  '.vite',
])

/** Max bytes of a single file read into the scan — a bundle is not source. */
const MAX_FILE_BYTES = 1_000_000

/** Max distinct keys in a report (bounds the response; same cap as the IDE). */
const MAX_KEYS = 100

/** Max referencing lines reported per key. */
const MAX_FILES_PER_KEY = 5

/**
 * Pure noise: env keys every toolchain reads that are NEVER a user-settable
 * integration credential (Vite's `import.meta.env` builtins). `NODE_ENV` is
 * deliberately NOT here — the scaffold writes it, so it reports as set.
 */
const NOISE_KEYS = new Set(['MODE', 'DEV', 'PROD', 'SSR', 'BASE_URL'])

/** Every `process.env.KEY` / `import.meta.env.KEY` in a line. Fresh per call: a `/g` regex carries `lastIndex` between uses. */
const envRefMatcher = (): RegExp => /(?:process\.env|import\.meta\.env)\.([A-Za-z_][A-Za-z0-9_]*)/g

/** A line that is entirely a comment — its `process.env.X` is prose, not a read. */
const COMMENT_LINE = /^\s*(\/\/|\/\*|\*)/

/** A trailing `//` comment, captured as the var's own documentation. */
const TRAILING_COMMENT = /\/\/\s*(.+?)\s*$/

/** Longest author comment carried into the report. */
const MAX_COMMENT = 120

/**
 * A chain the reference may be wrapped in before its fallback appears —
 * `process.env.X?.replace(/\/$/, '') || y`. Consumed so the operator after it is
 * still recognised.
 */
const TRAILING_CHAIN = /^(?:\??\.[A-Za-z_$][\w$]*(?:\([^()]*\))?|\[[^\]]*\])*/

/** `?? v`, `|| v`, a comparison, or a ternary test — all mean "absence is handled". */
const GUARD = /^\s*(\?\?|\|\||[!=]==?|\?(?!\.))/

/** Longest fallback literal carried into the report. */
const MAX_DEFAULT_VALUE = 60

/** A plain literal fallback, so the report can show what the code uses instead. */
const LITERAL =
  /^\s*(?:'([^']*)'|"([^"]*)"|`([^`$]*)`|(-?\d+(?:\.\d+)?)|(true|false|null|undefined))/

/**
 * Directory segments that are unambiguously tooling wherever they appear.
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
 * Directory segments that mean tooling only OUTSIDE `src/`. `scripts/seed.ts`
 * is tooling; `src/scripts/migrate.ts` is the migration runner the app ships,
 * and calling that tooling would hide a real `DATABASE_URL` reference.
 */
const TOOLING_DIRS_OUTSIDE_SRC = new Set(['scripts', 'test', 'tests', 'fixtures', 'benchmarks'])

/** `foo.test.ts`, `foo.spec.tsx`. */
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/

/** `vite.config.ts`, `playwright.config.ts`, `eslint.config.js`. */
const CONFIG_FILE = /\.config\.[cm]?[jt]sx?$/

/**
 * Is this reference from tooling rather than from the app the user ships?
 * (Kept in lockstep with the IDE scan's `isToolingPath`.)
 *
 * @param file - Repo-relative path.
 * @returns True for tests, e2e specs, build/test config, and scripts outside src/.
 */
export function isToolingPath(file: string): boolean {
  const segments = file.split('/')
  const name = segments[segments.length - 1] ?? ''
  const dirs = segments.slice(0, -1)
  const underSrc = dirs.includes('src')
  if (dirs.some((d) => TOOLING_DIRS.has(d))) return true
  if (!underSrc && dirs.some((d) => TOOLING_DIRS_OUTSIDE_SRC.has(d))) return true
  if (TEST_FILE.test(name)) return true
  // A build-tool config at a workspace root (`app/vite.config.ts`). Under
  // `src/` a `*.config.ts` is app code, not toolchain configuration.
  if (!underSrc && CONFIG_FILE.test(name)) return true
  return false
}

/**
 * Does this particular read of the key tolerate the var being unset?
 * (Mirrors the IDE scan's `readIsGuarded`.)
 *
 * @param rest - The source text immediately following the reference.
 * @returns Whether absence is handled, and the literal fallback when there is one.
 */
export function readIsGuarded(rest: string): { guarded: boolean; defaultValue?: string } {
  const afterChain = rest.slice(TRAILING_CHAIN.exec(rest)?.[0].length ?? 0)
  const guard = GUARD.exec(afterChain)
  if (!guard) return { guarded: false }
  const operator = guard[1]
  if (operator !== '??' && operator !== '||') return { guarded: true }
  const literal = LITERAL.exec(afterChain.slice(guard[0].length))
  if (!literal) return { guarded: true }
  const value = literal.slice(1).find((group) => group !== undefined)
  return { guarded: true, defaultValue: value?.slice(0, MAX_DEFAULT_VALUE) }
}

/**
 * When a line is a bare `const|let|var V = process.env.KEY` (no inline guard),
 * the variable name the read was assigned to — so a guard on `V` a few lines
 * later can still be found. (Mirrors the IDE scan's `assignedVariable`.)
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
 * variable `v`? (Mirrors the IDE scan's `variableIsGuarded`; a plain truthiness
 * `if (v)` is deliberately NOT a guard — it branches but supplies no fallback.)
 *
 * @param text - A line following the assignment.
 * @param v - The assigned variable name.
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

/** How many lines after a bare assignment a guard on its variable is still credited. */
const GUARD_WINDOW = 4

/**
 * Scan one source file's text for env reads.
 *
 * @param file - Repo-relative path (for tooling classification + reporting).
 * @param lines - The file's lines.
 * @returns The refs found, in line order.
 */
function scanFile(file: string, lines: string[]): LocalEnvRef[] {
  const tooling = isToolingPath(file)
  const refs: LocalEnvRef[] = []
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i]
    if (COMMENT_LINE.test(text)) continue
    const matcher = envRefMatcher()
    let ref: RegExpExecArray | null
    const onLine = new Map<string, { guarded: boolean; defaultValue?: string }>()
    while ((ref = matcher.exec(text)) !== null) {
      const key = ref[1]
      const rest = text.slice(ref.index + ref[0].length).split(';')[0]
      const { guarded, defaultValue } = readIsGuarded(rest)
      const prev = onLine.get(key)
      if (!prev?.guarded) onLine.set(key, { guarded, defaultValue })
      else if (defaultValue !== undefined && prev.defaultValue === undefined) {
        onLine.set(key, { guarded: true, defaultValue })
      }
    }
    // Assign-then-guard: a bare `const V = process.env.KEY` whose default is
    // applied on a later line against V.
    for (const [key, verdict] of onLine) {
      if (verdict.guarded) continue
      const variable = assignedVariable(text, key)
      if (!variable) continue
      for (let j = i + 1; j < Math.min(i + 1 + GUARD_WINDOW, lines.length); j++) {
        const hit = variableIsGuarded(lines[j], variable)
        if (hit.guarded) {
          onLine.set(key, { guarded: true, defaultValue: hit.defaultValue })
          break
        }
      }
    }
    if (onLine.size === 0) continue
    const trailing = TRAILING_COMMENT.exec(text)?.[1]
    const comment = trailing ? trailing.slice(0, MAX_COMMENT) : undefined
    for (const [key, verdict] of onLine) {
      refs.push({
        key,
        file,
        line: i + 1,
        tooling,
        guarded: verdict.guarded,
        defaultValue: verdict.defaultValue,
        comment,
      })
    }
  }
  return refs
}

/**
 * Walk the project tree and collect every env read, keyed by env key.
 *
 * @param root - Project root to scan (repo-relative paths are reported).
 * @returns Map of env key → references, in scan order.
 */
export function scanEnvRefs(root: string): Map<string, LocalEnvRef[]> {
  const byKey = new Map<string, LocalEnvRef[]>()
  const walk = (dir: string): void => {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch (_error) {
      // Unreadable dir (permissions/race) — nothing to scan there.
      return
    }
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue
        walk(full)
        continue
      }
      if (!entry.isFile()) continue
      if (!SOURCE_EXTENSIONS.has(entry.name.slice(entry.name.lastIndexOf('.')))) continue
      let size: number
      try {
        size = statSync(full).size
      } catch (_error) {
        // Vanished mid-walk — skip.
        continue
      }
      if (size > MAX_FILE_BYTES || size === 0) continue
      let text: string
      try {
        text = readFileSync(full, 'utf8')
      } catch (_error) {
        // Vanished mid-walk or unreadable — skip.
        continue
      }
      const rel = relative(root, full).split('\\').join('/')
      for (const ref of scanFile(rel, text.split('\n'))) {
        let refs = byKey.get(ref.key)
        if (!refs) {
          refs = []
          byKey.set(ref.key, refs)
        }
        refs.push(ref)
      }
    }
  }
  walk(root)
  return byKey
}

/** One registry-declared secret, aggregated across the project's packages. */
export interface RegistrySecretDeclaration extends MoleculeSecret {
  /** True when ANY installed package requires it (required is OR-ed across packages). */
  required: boolean
}

/**
 * Registry-declared secrets for a project's installed `@molecule/*` packages.
 * First declaration wins per key (most specific default); `required` is OR-ed
 * across packages — if ANY installed package needs the key, the user needs to
 * supply it. Same semantics as the IDE's detection orchestration.
 *
 * @param packageNames - The `@molecule/*` packages the project depends on.
 * @returns Declarations keyed by env var name.
 */
export function collectRegistrySecrets(
  packageNames: string[],
): Map<string, RegistrySecretDeclaration> {
  const out = new Map<string, RegistrySecretDeclaration>()
  for (const name of packageNames) {
    const pkg = findRegistryPackage(name)
    for (const secret of pkg?.molecule?.secrets ?? []) {
      const prev = out.get(secret.name)
      if (!prev) {
        out.set(secret.name, { ...secret, required: secret.required !== false })
      } else if (secret.required !== false && !prev.required) {
        prev.required = true
      }
    }
  }
  return out
}

/** Read the `@molecule/*` package names a workspace depends on, from its package.json files. */
function projectPackageNames(root: string): string[] {
  const names = new Set<string>()
  for (const manifest of ['package.json', 'api/package.json', 'app/package.json']) {
    try {
      const pkg = JSON.parse(readFileSync(join(root, manifest), 'utf8')) as {
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
      }
      for (const dep of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
        if (dep.startsWith('@molecule/')) names.add(dep)
      }
    } catch (_error) {
      // No manifest here — fine.
    }
  }
  return [...names]
}

/** The workspace's .env files per the scaffold convention, that exist. */
export function workspaceEnvFiles(root: string): string[] {
  const candidates = ['.env', 'api/.env', 'app/.env']
  return candidates.filter((rel) => {
    try {
      return statSync(join(root, rel)).isFile()
    } catch (_error) {
      // Not there — that stack has no .env.
      return false
    }
  })
}

/** Every env key with a non-empty value across the workspace's .env files, with the file that holds it. */
export function localEnvState(root: string): { keys: Map<string, string>; files: string[] } {
  const keys = new Map<string, string>()
  const files = workspaceEnvFiles(root)
  const ENV_LINE = /^(#)?\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/
  for (const rel of files) {
    let text: string
    try {
      text = readFileSync(join(root, rel), 'utf8')
    } catch (_error) {
      // Listed a moment ago, gone now — skip.
      continue
    }
    for (const line of text.split('\n')) {
      const m = ENV_LINE.exec(line)
      // An EMPTY value is exactly what the scaffold writes for a key the user
      // must fill in — it is the "missing" state, not the set state.
      if (m && m[1] !== '#' && m[3].trim() !== '' && !keys.has(m[2])) keys.set(m[2], rel)
    }
  }
  return { keys, files }
}

/** Where a key is known from when unset — the report's `source` values. */
export type LocalEnvSource = 'env' | 'registry' | 'platform' | null

/** One detected/declared env var — the local mirror of the IDE's DetectedEnvVar. */
export interface DetectedLocalEnvVar {
  key: string
  /** Repo-relative `path:line` runtime references, deduped and capped. */
  files: string[]
  /** True when a value exists in a workspace .env. */
  set: boolean
  /** Which .env file holds the value, when set. */
  setIn?: string
  /** Where the key is known from when unset: registry declaration, platform, or code only. */
  source: LocalEnvSource
  /** attention = the user must act; optional = works unset; set; platform = molecule provides. */
  group: 'attention' | 'optional' | 'set' | 'platform'
  /** How a missing attention key can be fixed without the user hunting for a value. */
  fix?: 'generate' | 'declare'
  /** True when every runtime read of this key falls back to something. */
  hasDefault?: boolean
  /** The literal the code (or the registry) falls back to. */
  defaultValue?: string
  /** A trailing `//` comment on a line that reads the key. */
  comment?: string
  /** Registry: does any installed package require it? */
  required?: boolean
  /** Registry: what to call it, how to get it, where. */
  label?: string
  instructions?: string
  setupUrl?: string
}

/** The local detection report — mirrors the IDE's DetectedEnvReport. */
export interface LocalEnvReport {
  vars: DetectedLocalEnvVar[]
  /** How many vars are in the `attention` group — the "needs action" count. */
  missingCount: number
  /** Tooling-only keys dropped from `vars`. */
  hiddenCount: number
  /** The root the scan ran against. */
  scannedRoot: string
  /** The .env files consulted for set-state. */
  envFiles: string[]
  /** The `@molecule/*` packages whose registry declarations were consulted. */
  packages: string[]
}

/**
 * Summarize a key's references the way the IDE scan does: tooling dropped,
 * optional only when EVERY runtime read tolerates absence.
 */
function summarizeRefs(refs: LocalEnvRef[]): {
  runtime: LocalEnvRef[]
  hasDefault: boolean
  defaultValue?: string
  comment?: string
} {
  const runtime = refs.filter((r) => !r.tooling)
  return {
    runtime,
    hasDefault: runtime.length > 0 && runtime.every((r) => r.guarded),
    defaultValue: runtime.find((r) => r.defaultValue !== undefined)?.defaultValue,
    comment: runtime.find((r) => r.comment)?.comment,
  }
}

/**
 * Classify code-detected reads ∪ registry-declared secrets against the local
 * .env state (pure — unit tested). Precedence per key: set in .env →
 * platform-provisioned → registry-declared (required → attention, unless the
 * registry or the code supplies a default) → code-only.
 *
 * @param codeRefs - Key → references from {@link scanEnvRefs}.
 * @param registry - Declarations from {@link collectRegistrySecrets}.
 * @param envKeys - Keys already set locally, mapped to the file that holds them.
 * @param scannedRoot - Echoed into the report.
 * @param packages - The packages consulted, echoed into the report.
 * @param envFiles - The .env files consulted, echoed into the report.
 * @returns The report.
 */
export function classifyLocalEnvVars(
  codeRefs: Map<string, LocalEnvRef[]>,
  registry: Map<string, RegistrySecretDeclaration>,
  envKeys: Map<string, string>,
  scannedRoot: string,
  packages: string[],
  envFiles: string[],
): LocalEnvReport {
  const keys = new Set<string>([...codeRefs.keys(), ...registry.keys()])
  const vars: DetectedLocalEnvVar[] = []
  let hiddenCount = 0

  for (const key of keys) {
    if (NOISE_KEYS.has(key)) continue
    const { runtime, hasDefault, defaultValue, comment } = summarizeRefs(codeRefs.get(key) ?? [])
    const decl = registry.get(key)
    const setIn = envKeys.get(key)

    // Tooling-only and nothing else knows about it — there is nothing to do.
    if (runtime.length === 0 && !decl && !setIn && (codeRefs.get(key)?.length ?? 0) > 0) {
      hiddenCount++
      continue
    }

    const files = runtime.slice(0, MAX_FILES_PER_KEY).map((r) => `${r.file}:${r.line}`)
    const base: DetectedLocalEnvVar = { key, files, set: false, source: null, group: 'attention' }
    if (comment) base.comment = comment

    if (setIn) {
      base.set = true
      base.setIn = setIn
      base.source = 'env'
      base.group = 'set'
    } else if (decl?.provisioned) {
      // molecule.dev injects these in sandboxes/deploys — present without user input.
      base.source = 'platform'
      base.group = 'platform'
      Object.assign(base, {
        required: decl.required,
        label: decl.label,
        instructions: decl.instructions,
      })
    } else if (decl) {
      base.source = 'registry'
      const hasRegistryDefault = decl.default !== undefined
      const required = decl.required && !hasRegistryDefault && !hasDefault
      base.required = decl.required
      base.label = decl.label
      base.instructions = decl.instructions
      base.setupUrl = decl.setupUrl
      base.group = required ? 'attention' : 'optional'
      if (required) base.fix = decl.generate ? 'generate' : 'declare'
      if (decl.default !== undefined) {
        base.hasDefault = true
        base.defaultValue = decl.default
      }
    } else {
      // Code-only, read at runtime — genuinely the user's, unless the code falls back.
      base.group = hasDefault ? 'optional' : 'attention'
      if (hasDefault) base.hasDefault = true
    }
    if (hasDefault && base.defaultValue === undefined && base.group !== 'set') {
      base.hasDefault = true
      base.defaultValue = defaultValue
    }

    vars.push(base)
  }

  const order: Record<DetectedLocalEnvVar['group'], number> = {
    attention: 0,
    optional: 1,
    set: 2,
    platform: 3,
  }
  vars.sort((a, b) => order[a.group] - order[b.group] || a.key.localeCompare(b.key))
  const bounded = vars.slice(0, MAX_KEYS)
  return {
    vars: bounded,
    missingCount: bounded.filter((v) => v.group === 'attention').length,
    hiddenCount,
    scannedRoot,
    envFiles,
    packages,
  }
}

/**
 * Detect the env-var situation for a project on disk: code scan ∪ registry
 * declarations, classified against the local .env files. Never throws for a
 * scan failure — the report degrades rather than erroring.
 *
 * @param root - Project root (cwd for a normal CLI run).
 * @returns The report.
 */
export function detectLocalEnvVars(root: string): LocalEnvReport {
  const packages = projectPackageNames(root)
  const registry = collectRegistrySecrets(packages)
  const state = localEnvState(root)
  let codeRefs: Map<string, LocalEnvRef[]>
  try {
    codeRefs = scanEnvRefs(root)
  } catch (error) {
    // The report degrades to registry-derived vars; it never errors to the caller.
    console.warn(
      `env check: source scan skipped (${error instanceof Error ? error.message : error})`,
    )
    codeRefs = new Map()
  }
  return classifyLocalEnvVars(codeRefs, registry, state.keys, root, packages, state.files)
}
