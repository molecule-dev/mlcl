/**
 * Package upgrade detection — queries available versions for every dependency
 * a scaffold pins and computes which pins recorded in the registry can be bumped
 * to a newer published version. Three classes of pin are covered, mirroring the
 * three things `mlcl create` writes into a generated project:
 *
 * - **molecule** — every `@molecule/*` package (via `moleculeVersions`).
 * - **toolchain** — the shared/api/app/moleculePackage dev dependencies.
 * - **framework** — the runtime + dev deps each `apiFrameworks`/`appFrameworks`
 *   entry pins (react, react-dom, react-router, express, `@types/*`,
 *   `@vitejs/plugin-react`, …). These are the explicit "this should also apply to
 *   non-molecule packages" half of the original intent and were previously
 *   ignored entirely.
 *
 * The version fetcher is INJECTABLE: the `check-package-upgrades` command wires
 * in the real `npm view` query, while tests inject a deterministic fetcher. This
 * keeps the module free of network/CLI coupling (the Decoupling Principle) and
 * lets the upgrade logic be unit-tested offline.
 *
 * @module
 */

import type { Registry } from './schema.js'

/**
 * Outcome of a single remote version lookup.
 *
 * - `{ ok: true, version }` — a published version was found.
 * - `{ ok: false, reason: 'unpublished' }` — the registry knows nothing about
 *   the package (e.g. npm E404). Expected for @molecule/* until they ship.
 * - `{ ok: false, reason: 'unreachable' }` — the lookup itself failed (offline,
 *   timeout, auth). Distinct from `unpublished` so the report can be clear.
 */
export type FetchResult =
  { ok: true; version: string } | { ok: false; reason: 'unpublished' | 'unreachable' }

/** Resolves the latest published version of a package (no throwing — returns {@link FetchResult}). */
export type VersionFetcher = (packageName: string) => Promise<FetchResult>

/** Per-package upgrade status. */
export type UpgradeStatus = 'upgrade' | 'current' | 'unpublished' | 'unreachable'

/**
 * Whether a candidate is a `@molecule/*` package, a toolchain dev dependency, or
 * a runtime/dev dependency pinned by an api/app framework config.
 */
export type UpgradeKind = 'molecule' | 'toolchain' | 'framework'

/** Which registry framework map a `framework`-kind candidate lives under. */
export type FrameworkFamily = 'apiFrameworks' | 'appFrameworks'

/** Which dependency field of a framework config a `framework`-kind candidate lives in. */
export type FrameworkField = 'dependencies' | 'devDependencies'

/** One package's current pin vs. its latest available version. */
export interface UpgradeCandidate {
  /** Package name. */
  name: string
  /** `'molecule'`, `'toolchain'`, or `'framework'`. */
  kind: UpgradeKind
  /** Toolchain section (`shared`/`api`/`app`/`moleculePackage`); toolchain kind only. */
  section?: string
  /** Framework map (`apiFrameworks`/`appFrameworks`); framework kind only. */
  family?: FrameworkFamily
  /** Framework key (`express`, `react`, `vue`, …); framework kind only. */
  framework?: string
  /** Which dep field the pin lives in (`dependencies`/`devDependencies`); framework kind only. */
  field?: FrameworkField
  /** The exact version currently pinned in the registry. */
  current: string
  /** The latest version reported by the fetcher, or `null` if none was found. */
  latest: string | null
  /** Resolved comparison outcome. */
  status: UpgradeStatus
}

/** A single unit of upgrade work: one pin to check, with everything needed to write it back. */
interface UpgradeWorkItem {
  name: string
  kind: UpgradeKind
  section?: string
  family?: FrameworkFamily
  framework?: string
  field?: FrameworkField
  current: string
}

/** Result of applying upgrades to a registry object. */
export interface ApplyResult {
  /** A new registry object with the bumped pins (the input is never mutated). */
  registry: Registry
  /** Number of @molecule/* package pins that changed. */
  moleculeChanged: number
  /** Number of toolchain dev-dependency pins that changed. */
  toolchainChanged: number
  /** Number of framework (api/app) dependency pins that changed. */
  frameworkChanged: number
}

/**
 * Compare two version strings. Returns 1 if `a > b`, -1 if `a < b`, 0 if equal.
 *
 * Handles `x.y.z` cores and `-prerelease` suffixes (a release outranks a
 * prerelease of the same core). Leading range operators (`^`, `~`, `v`, etc.)
 * are stripped so a stored range still compares sensibly.
 *
 * @param a - First version string.
 * @param b - Second version string.
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string): { nums: number[]; pre: string } => {
    const cleaned = v.replace(/^[v^~>=<\s]+/, '')
    const dashIndex = cleaned.indexOf('-')
    const core = dashIndex === -1 ? cleaned : cleaned.slice(0, dashIndex)
    const pre = dashIndex === -1 ? '' : cleaned.slice(dashIndex + 1)
    const nums = core.split('.').map((n) => Number.parseInt(n, 10) || 0)
    while (nums.length < 3) nums.push(0)
    return { nums, pre }
  }
  const pa = parse(a)
  const pb = parse(b)
  for (let i = 0; i < 3; i++) {
    if (pa.nums[i] !== pb.nums[i]) return pa.nums[i] > pb.nums[i] ? 1 : -1
  }
  // Equal core: a final release (no prerelease) outranks a prerelease.
  if (pa.pre === pb.pre) return 0
  if (!pa.pre) return 1
  if (!pb.pre) return -1
  return pa.pre > pb.pre ? 1 : -1
}

/**
 * True when `latest` is strictly newer than `current`.
 *
 * @param latest - Candidate newer version.
 * @param current - Currently pinned version.
 */
export function isNewerVersion(latest: string, current: string): boolean {
  return compareVersions(latest, current) > 0
}

/**
 * Resolve the version a given @molecule/* package currently pins to, from a
 * registry's `moleculeVersions` map (override first, then the lockstep default).
 *
 * @param registry - The registry to read from.
 * @param name - The @molecule/* package name.
 */
export function resolveMoleculeVersion(registry: Registry, name: string): string {
  const def = registry.moleculeVersions?.default ?? '1.0.0'
  return registry.moleculeVersions?.overrides?.[name] ?? def
}

/**
 * Build the list of pins to check: every @molecule/* package, every toolchain
 * dev-dependency, AND every runtime/dev dependency pinned by an api/app framework
 * config — each paired with its current pin and enough provenance to write the
 * bump back to exactly the right place.
 *
 * Framework deps are enumerated per-occurrence (a package pinned by N frameworks
 * yields N work items, each classified against its own current pin) so a stale
 * pin in one framework is caught even when its siblings are current. The fetch is
 * de-duplicated by name in {@link collectUpgradeCandidates}, so this never causes
 * a package to be queried more than once per run.
 *
 * @param registry - The registry to derive the work list from.
 */
export function buildUpgradeWorkList(registry: Registry): UpgradeWorkItem[] {
  const work: UpgradeWorkItem[] = []

  for (const name of Object.keys(registry.packages).sort((a, b) => a.localeCompare(b))) {
    work.push({ name, kind: 'molecule', current: resolveMoleculeVersion(registry, name) })
  }

  for (const [section, deps] of Object.entries(registry.toolchain ?? {})) {
    if (!deps || typeof deps !== 'object') continue
    for (const [name, current] of Object.entries(deps as Record<string, string>)) {
      work.push({ name, kind: 'toolchain', section, current })
    }
  }

  // Framework runtime/dev deps (react, react-dom, react-router, express,
  // @types/*, @vitejs/plugin-react, …) — the non-molecule pins every scaffold ships.
  const families: Array<[FrameworkFamily, Record<string, unknown> | undefined]> = [
    ['apiFrameworks', registry.apiFrameworks],
    ['appFrameworks', registry.appFrameworks],
  ]
  for (const [family, configs] of families) {
    if (!configs) continue
    for (const framework of Object.keys(configs).sort((a, b) => a.localeCompare(b))) {
      const config = configs[framework] as Partial<Record<FrameworkField, Record<string, string>>>
      for (const field of ['dependencies', 'devDependencies'] as const) {
        const deps = config?.[field]
        if (!deps || typeof deps !== 'object') continue
        for (const name of Object.keys(deps).sort((a, b) => a.localeCompare(b))) {
          work.push({ name, kind: 'framework', family, framework, field, current: deps[name] })
        }
      }
    }
  }

  return work
}

/**
 * Query the latest available version for every @molecule/* + toolchain package
 * and compute each one's upgrade status. Runs the fetcher with bounded
 * concurrency; a rejected fetch is treated as `unreachable` (never throws).
 *
 * @param opts.registry - The registry whose pins to check.
 * @param opts.fetch - Injected version fetcher (real `npm view` or a test stub).
 * @param opts.concurrency - Max simultaneous lookups (default 12).
 */
export async function collectUpgradeCandidates(opts: {
  registry: Registry
  fetch: VersionFetcher
  concurrency?: number
}): Promise<UpgradeCandidate[]> {
  const { registry, fetch, concurrency = 12 } = opts
  const work = buildUpgradeWorkList(registry)
  const results: UpgradeCandidate[] = new Array(work.length)

  // De-duplicate lookups by package name: a dep pinned by several frameworks
  // (react, @types/react, …) or repeated across maps is queried exactly once.
  const inflight = new Map<string, Promise<FetchResult>>()
  const fetchOnce = (name: string): Promise<FetchResult> => {
    let pending = inflight.get(name)
    if (!pending) {
      pending = fetch(name)
      inflight.set(name, pending)
    }
    return pending
  }

  let cursor = 0
  const worker = async (): Promise<void> => {
    while (cursor < work.length) {
      const index = cursor++
      const item = work[index]
      let result: FetchResult
      try {
        result = await fetchOnce(item.name)
      } catch (error) {
        // A throwing fetcher is treated as a transient/unknown failure, not as
        // a definitive "unpublished" — surfaced distinctly in the report.
        void error
        result = { ok: false, reason: 'unreachable' }
      }

      let status: UpgradeStatus
      let latest: string | null
      if (result.ok) {
        latest = result.version
        status = isNewerVersion(result.version, item.current) ? 'upgrade' : 'current'
      } else {
        latest = null
        status = result.reason
      }

      results[index] = { ...item, latest, status }
    }
  }

  const poolSize = Math.max(1, Math.min(concurrency, work.length))
  await Promise.all(Array.from({ length: poolSize }, () => worker()))
  return results
}

/** Sort an object's keys for deterministic JSON output. */
function sortKeys(obj: Record<string, string>): Record<string, string> {
  return Object.keys(obj)
    .sort((a, b) => a.localeCompare(b))
    .reduce<Record<string, string>>((acc, key) => {
      acc[key] = obj[key]
      return acc
    }, {})
}

/**
 * Apply the `upgrade` candidates to a registry, returning a NEW registry object
 * (the input is never mutated).
 *
 * - Toolchain pins are updated in place in their section.
 * - Framework pins (api/app `dependencies`/`devDependencies`) are updated in
 *   place in their exact `family.framework.field` location.
 * - @molecule/* pins are recomputed so the most common target version becomes
 *   the lockstep `default` and only divergent packages get an `overrides` entry
 *   — a uniform republish collapses to a single `default` bump with no
 *   overrides, keeping `registry.json` clean.
 *
 * @param registry - The registry to upgrade (read-only).
 * @param candidates - Candidates from {@link collectUpgradeCandidates}.
 */
export function applyUpgrades(registry: Registry, candidates: UpgradeCandidate[]): ApplyResult {
  const next: Registry = JSON.parse(JSON.stringify(registry))

  // ---- toolchain ----
  let toolchainChanged = 0
  const toolchain = next.toolchain as Record<string, Record<string, string>> | undefined
  for (const candidate of candidates) {
    if (candidate.kind !== 'toolchain' || candidate.status !== 'upgrade') continue
    if (!candidate.latest || !candidate.section) continue
    const section = toolchain?.[candidate.section]
    if (
      section &&
      section[candidate.name] !== undefined &&
      section[candidate.name] !== candidate.latest
    ) {
      section[candidate.name] = candidate.latest
      toolchainChanged++
    }
  }

  // ---- frameworks (apiFrameworks / appFrameworks) ----
  let frameworkChanged = 0
  for (const candidate of candidates) {
    if (candidate.kind !== 'framework' || candidate.status !== 'upgrade') continue
    if (!candidate.latest || !candidate.family || !candidate.framework || !candidate.field) continue
    const family = next[candidate.family] as
      Record<string, Partial<Record<FrameworkField, Record<string, string>>>> | undefined
    const deps = family?.[candidate.framework]?.[candidate.field]
    if (deps && deps[candidate.name] !== undefined && deps[candidate.name] !== candidate.latest) {
      deps[candidate.name] = candidate.latest
      frameworkChanged++
    }
  }

  // ---- molecule versions ----
  const beforeDefault = registry.moleculeVersions?.default ?? '1.0.0'
  const beforeOverrides = registry.moleculeVersions?.overrides ?? {}
  const resolveBefore = (name: string): string => beforeOverrides[name] ?? beforeDefault

  // Target version for EVERY known @molecule package: its current pin, then any
  // upgrade applied. Seeding from the full registry (not just candidates) keeps
  // this correct even if the candidate list was scoped/filtered.
  const targets = new Map<string, string>()
  for (const name of Object.keys(registry.packages)) targets.set(name, resolveBefore(name))
  for (const [name, version] of Object.entries(beforeOverrides)) {
    if (!targets.has(name)) targets.set(name, version)
  }
  let moleculeChanged = 0
  for (const candidate of candidates) {
    if (candidate.kind !== 'molecule' || candidate.status !== 'upgrade' || !candidate.latest)
      continue
    if (resolveBefore(candidate.name) !== candidate.latest) moleculeChanged++
    targets.set(candidate.name, candidate.latest)
  }

  if (targets.size > 0) {
    // Pick the most common target as the new default (ties prefer the old default).
    const frequency = new Map<string, number>()
    for (const version of targets.values()) {
      frequency.set(version, (frequency.get(version) ?? 0) + 1)
    }
    let newDefault = beforeDefault
    let bestCount = frequency.get(beforeDefault) ?? -1
    for (const [version, count] of frequency) {
      if (count > bestCount) {
        bestCount = count
        newDefault = version
      }
    }
    const overrides: Record<string, string> = {}
    for (const [name, version] of targets) {
      if (version !== newDefault) overrides[name] = version
    }
    next.moleculeVersions = { default: newDefault, overrides: sortKeys(overrides) }
  }

  return { registry: next, moleculeChanged, toolchainChanged, frameworkChanged }
}

/**
 * Update an in-memory project `package.json` object's `dependencies` and
 * `devDependencies` to the upgraded pins, in place. Only keys already present
 * that match an `upgrade` candidate are touched (never adds new deps).
 *
 * @param packageJson - Parsed project package.json (mutated in place).
 * @param candidates - Candidates from {@link collectUpgradeCandidates}.
 * @returns Number of dependency entries changed.
 */
export function applyUpgradesToProjectPackageJson(
  packageJson: {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  },
  candidates: UpgradeCandidate[],
): number {
  const latestByName = new Map<string, string>()
  for (const candidate of candidates) {
    if (candidate.status === 'upgrade' && candidate.latest) {
      latestByName.set(candidate.name, candidate.latest)
    }
  }

  let changed = 0
  for (const field of ['dependencies', 'devDependencies'] as const) {
    const deps = packageJson[field]
    if (!deps) continue
    for (const [name, version] of Object.entries(deps)) {
      const latest = latestByName.get(name)
      // Skip non-version specifiers (file:/link:/workspace: protocols).
      if (!latest || /^(file:|link:|workspace:)/.test(version)) continue
      if (version !== latest) {
        deps[name] = latest
        changed++
      }
    }
  }
  return changed
}
