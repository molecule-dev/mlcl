#!/usr/bin/env node
/**
 * Project-archive external-state coverage gate.
 *
 * `@molecule/api-project-archive` captures a project and the caller then
 * DESTROYS the original — releasing the sandbox, dropping the database, deleting
 * the bucket — on the strength of `result.verified`. Everything a project owns
 * outside its source tree is captured by a `ProjectExternalStateProvider` bond
 * under `packages/api/bonds/project-archive-external-state/`, and the archiver
 * asks only the providers that are REGISTERED. It cannot know about state whose
 * provider was never written.
 *
 * So a state-owning bond with no external-state provider is not a missing
 * feature. It is silent permanent data loss: the capture succeeds, verifies, and
 * omits the data — and the next thing that runs deletes it.
 *
 * That is a "remember to also do the other thing" rule, and those are forgotten.
 * This is the gate that fails instead of remembering. It asserts that every
 * provider bond in a state-owning category is covered by an external-state
 * provider, or carries an explicit exemption with a written reason.
 *
 * ## The rule this gate is written to
 *
 * **Absence must be DECLARED, never INFERRED.** "I looked and found no gap" and
 * "I could not look" are different answers, and this gate reporting the first
 * when the second is true is what gets a live project deleted. So every input it
 * cannot read — a missing molecule checkout, a covering package that is only a
 * registry row, a `type` field that is not what it should be — is a FAILURE here,
 * never a skip. A check that is skipped when its input is missing is not a check.
 *
 * ## What counts as coverage
 *
 * A provider `@molecule/api-<core>-<name>` in a state-owning category is covered
 * when EITHER of these exists in the registry **and on disk**:
 *
 *   - `@molecule/api-project-archive-external-state-<name>` — a per-provider bond,
 *     needed when capture requires the provider's OWN tooling (`pg_dump` cannot
 *     dump MySQL).
 *   - `@molecule/api-project-archive-external-state-<core>` — a category-wide bond
 *     that composes the CORE interface and therefore covers every provider of it,
 *     present and future. `…-external-state-uploads` is one: it calls
 *     `listFiles`/`getFile`/`upload`/`deleteFile` on whichever uploads bond is
 *     wired, so S3, the filesystem, and every uploads bond written later are
 *     already handled and no per-provider bond is ever needed.
 *
 * A registry row is not coverage. The bond directory must EXIST under
 * `packages/api/bonds/project-archive-external-state/`, be the package the
 * registry key names, and contain `src/` — because it is code, not a name, that
 * captures the data. And the two name spaces above are kept SEPARATE: a token
 * that is a core's own name (`uploads`) is a category-wide bond for THAT core and
 * can never be consumed as the per-provider bond of a differently-cored provider
 * that happens to end in the same word (`@molecule/api-database-uploads`).
 *
 * ## Adding a NEW state-owning category
 *
 * Nothing in `registry.json` says whether a category owns durable state, so this
 * script cannot infer it — `STATE_OWNING` below is a hand-maintained ledger and
 * a new category must be ADDED to it. The test is one question: **if this
 * resource were deleted, could the project regenerate it from its source tree?**
 * If no, it is state-owning, it needs external-state bonds, and it belongs in
 * `STATE_OWNING`. `NOT_STATE_OWNING` records the categories that were asked that
 * question and answered yes, so the next reader does not re-derive them.
 *
 * ## Requires a molecule checkout
 *
 * Coverage is a claim about code in the SEPARATE `molecule` repo, so this gate
 * reads that repo and REFUSES TO RUN without it — an mlcl-only checkout cannot
 * verify coverage, and a gate that reports "complete" when it could not look is
 * the exact failure it exists to prevent. Resolution order:
 * `--molecule-root <dir>`, then `MOLECULE_PACKAGES_DIR`'s parent (the same env
 * var `sync-registry` and `verify:registry-exports` use), then the `molecule`
 * sibling directory next to `mlcl`. CI must therefore check out `molecule`
 * alongside `mlcl` (or set `MOLECULE_PACKAGES_DIR`) for the job that runs this.
 *
 * Usage:
 *   node scripts/check-external-state-coverage.mjs
 *       → check `mlcl/registry.json` against the sibling `molecule` checkout.
 *   node scripts/check-external-state-coverage.mjs --registry /path/to/registry.json
 *       → check a specific registry file (used by the test that proves this gate bites).
 *   node scripts/check-external-state-coverage.mjs --molecule-root /path/to/molecule
 *       → check against a specific molecule checkout.
 *
 * @module
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const EXTERNAL_STATE_PREFIX = '@molecule/api-project-archive-external-state-'
/** Where external-state bonds live, relative to the molecule repo root (registry `path` form). */
const BOND_DIR_REGISTRY_RELATIVE = 'packages/api/bonds/project-archive-external-state'
/** The same directory as written in operator-facing messages (workspace-relative). */
const BOND_DIR = `molecule/${BOND_DIR_REGISTRY_RELATIVE}/`
/** Package-name prefix that identifies an API-stack package structurally, not by metadata. */
const API_PACKAGE_PREFIX = '@molecule/api-'

/**
 * Categories whose whole purpose is durable data a project cannot regenerate.
 *
 * Keyed by CORE package rather than by category string because the two do not
 * always match: the uploads core's registry `category` is `storage`, not
 * `uploads`. The category is read off the core entry instead of being restated.
 */
const STATE_OWNING = [
  {
    core: '@molecule/api-database',
    reason: "a project's rows ARE its data — nothing else in the project can reproduce them",
  },
  {
    core: '@molecule/api-uploads',
    reason: 'user-uploaded bytes live outside every repository and exist nowhere else',
  },
]

/**
 * Categories deliberately NOT state-owning, with the reason, so the next reader
 * does not re-derive them (and so promoting one is a visible edit here).
 *
 * Each answers "could the project regenerate this from its source tree?" — yes.
 */
const NOT_STATE_OWNING = [
  {
    core: '@molecule/api-cache',
    reason: 'a cache is regenerable by definition — a cold cache is a correct cache',
  },
  {
    core: '@molecule/api-queue',
    reason: 'holds transient in-flight work, not durable state; a restored project starts idle',
  },
  {
    core: '@molecule/api-search',
    reason: 'an index is DERIVED from the records the database bonds restore — reindex rebuilds it',
  },
]

/**
 * Provider bonds in a state-owning category that genuinely need no external-state
 * provider.
 *
 * Empty today, and it should stay short: the normal answer to "this one is fine"
 * is a bond, not an entry here. Shape — `{ package, reason }`, one line, stating
 * WHERE that provider's data already survives. An entry with no reason fails this
 * script, and so does one naming a package that is not an in-scope provider (a
 * stale exemption would silently hide a real gap).
 *
 * This is also where a package that lands in a state-owning category WITHOUT
 * owning state (a migration helper, a query builder) is declared. That is the
 * point: scope is decided by the category it sits in, not by its `type` field, so
 * the answer to "this one does not need a bond" is a written line here rather
 * than a metadata value nobody re-reads.
 *
 * @example
 * // A hypothetical in-tree engine whose data file IS a source file:
 * // { package: '@molecule/api-database-inline', reason: 'stores rows in the worktree — the source archive already carries them' }
 */
const EXEMPT_PROVIDERS = [
  {
    package: '@molecule/api-uploads-filesystem',
    reason:
      "writes into the deployment's own upload directory, which sits in the filesystem the source archive already captures",
  },
  {
    package: '@molecule/api-uploads-s3',
    reason:
      "the bucket belongs to the deployment, which mirrors it server-side; a generic bond cannot tell WHICH objects are one project's (upload() takes no key — both bonds mint a bare uuid at the root)",
  },
  {
    package: '@molecule/api-uploads-mirror',
    reason:
      'holds no state of its own: it writes every file to its target upload providers, each covered or exempt in its own right',
  },
  {
    package: '@molecule/api-uploads-encrypted',
    reason:
      'holds no state of its own: it encrypts and hands every file to its inner upload provider, covered or exempt in its own right',
  },
]

/**
 * The token after `…-external-state-`, e.g. `postgresql`, `uploads`.
 *
 * @param {string} name - A full external-state bond package name.
 * @returns {string} The token.
 */
function externalStateToken(name) {
  return name.slice(EXTERNAL_STATE_PREFIX.length)
}

/**
 * The token after `@molecule/api-`, e.g. `database` for `@molecule/api-database`.
 *
 * @param {string} name - A full API package name.
 * @returns {string} The token.
 */
function apiToken(name) {
  return name.replace(/^@molecule\/api-/, '')
}

/**
 * Whether a package.json declares `dependency` as a runtime or peer dependency.
 *
 * @param {Record<string, unknown>} packageJson - Parsed package.json.
 * @param {string} dependency - Package name to look for.
 * @returns {boolean} True when declared in `dependencies` or `peerDependencies`.
 */
function declaresDependency(packageJson, dependency) {
  const runtime = packageJson.dependencies ?? {}
  const peer = packageJson.peerDependencies ?? {}
  return Boolean(runtime[dependency] ?? peer[dependency])
}

/**
 * Verify that a registered external-state bond is a real package on disk.
 *
 * A registry row costs one edit and captures nothing. This resolves the row's
 * `path` inside the molecule checkout and requires a real directory, in the
 * external-state bond dir, whose `package.json` is the package the registry key
 * names, with a `src/` beside it.
 *
 * @param {string} name - The external-state bond package name (registry key).
 * @param {Record<string, unknown>} entry - Its registry entry.
 * @param {string} moleculeRoot - Absolute path to the molecule repo root.
 * @returns {{ packageJson: Record<string, unknown> } | { problem: string }}
 *   The parsed package.json when the bond is real, else the reason it is not.
 */
function verifyBondOnDisk(name, entry, moleculeRoot) {
  const registryPath = typeof entry?.path === 'string' ? entry.path : ''
  const notCoverage = `A registry row is not a bond: it runs nothing, captures nothing, covers nothing.`

  // Deliberately an allowlist rather than a normalize-and-compare: requiring one
  // trailing slug that starts alphanumeric settles `..` traversal, absolute
  // paths, and separator ambiguity in a single expression instead of three
  // rules that can disagree with each other about what a separator is.
  const bondPath =
    /^packages\/api\/bonds\/project-archive-external-state\/[A-Za-z0-9][A-Za-z0-9._-]*$/
  if (!bondPath.test(registryPath)) {
    return {
      problem:
        `${name} has path '${registryPath || '(missing)'}', which is not a directory directly ` +
        `under ${BOND_DIR_REGISTRY_RELATIVE}/ — where external-state bonds live. ${notCoverage}`,
    }
  }

  const dir = join(moleculeRoot, registryPath)
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    return {
      problem: `${name} points at '${registryPath}', which is not a directory in the molecule checkout. ${notCoverage}`,
    }
  }

  const packageJsonPath = join(dir, 'package.json')
  if (!existsSync(packageJsonPath)) {
    return {
      problem: `${name} has no package.json at '${registryPath}'. ${notCoverage}`,
    }
  }

  let packageJson
  try {
    packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  } catch (error) {
    return {
      problem: `${name} has an unreadable package.json at '${registryPath}': ${error.message}. ${notCoverage}`,
    }
  }

  if (packageJson.name !== name) {
    return {
      problem:
        `${name} points at '${registryPath}', which is package '${packageJson.name}' — a registry ` +
        `key aimed at another package's directory implements nothing. ${notCoverage}`,
    }
  }

  const srcDir = join(dir, 'src')
  if (!existsSync(srcDir) || !statSync(srcDir).isDirectory()) {
    return {
      problem: `${name} has no src/ at '${registryPath}' — it is a name, not a ProjectExternalStateProvider. ${notCoverage}`,
    }
  }

  return { packageJson }
}

/**
 * Resolve the registered external-state bonds into the two coverage name spaces.
 *
 * They are kept apart on purpose. A token that is a CORE's own name is a
 * category-wide bond for that core and covers every provider of it; any other
 * token names one specific provider. Collapsing them into one set is how
 * `@molecule/api-database-uploads` — a database provider whose name merely ends
 * in `uploads` — gets "covered" by the uploads core bond, which never touches a
 * database.
 *
 * @param {Record<string, Record<string, unknown>>} packages - All registry entries.
 * @param {string} moleculeRoot - Absolute path to the molecule repo root.
 * @param {string[]} problems - Collector for defects found here.
 * @returns {{ categoryCovers: Map<string, string>, providerCovers: Map<string, string> }}
 *   `categoryCovers` — core token → bond name; `providerCovers` — provider token → bond name.
 */
function resolveCoverage(packages, moleculeRoot, problems) {
  const categoryCovers = new Map()
  const providerCovers = new Map()

  for (const [name, entry] of Object.entries(packages)) {
    if (!name.startsWith(EXTERNAL_STATE_PREFIX)) continue

    const verified = verifyBondOnDisk(name, entry, moleculeRoot)
    if (verified.problem) {
      problems.push(verified.problem)
      continue // NOT coverage — the gap it was hiding is now reported too.
    }

    const token = externalStateToken(name)
    // A token is category-wide exactly when `@molecule/api-<token>` is itself a
    // package — i.e. the token names a CORE. That is structural: it reads the
    // registry's own key space instead of trusting a `type` field.
    const claimedCore = `${API_PACKAGE_PREFIX}${token}`
    if (packages[claimedCore]) {
      // A category-wide bond covers every provider of the core, present and
      // future, which it can only do by composing the core's interface. If it
      // does not depend on the core, it is not doing that.
      if (!declaresDependency(verified.packageJson, claimedCore)) {
        problems.push(
          `${name} is named for the ${claimedCore} core, so it claims to cover every provider of ` +
            `that core — but it does not depend on ${claimedCore}, so it cannot be composing the ` +
            `core interface. Depend on the core, or rename the bond after the single provider it captures.`,
        )
        continue
      }
      categoryCovers.set(token, name)
      continue
    }

    providerCovers.set(token, name)
  }

  return { categoryCovers, providerCovers }
}

/**
 * Run the coverage check against a parsed registry.
 *
 * @param {{ packages: Record<string, Record<string, unknown>> }} registry - Parsed `registry.json`.
 * @param {{ moleculeRoot?: string | null }} [options] - `moleculeRoot`: absolute path to the
 *   molecule repo checkout. Required — coverage is a claim about code that lives there.
 * @returns {{ gaps: { name: string, core: string, reason: string, wanted: string[], note?: string }[], problems: string[], providers: number, exempt: number }}
 *   `gaps` — uncovered provider bonds; `problems` — defects that are failures in
 *   their own right (unverifiable input, stale ledger, phantom covering package,
 *   reasonless exemption); `providers` — how many provider bonds were checked;
 *   `exempt` — how many were skipped by ledger.
 */
export function checkExternalStateCoverage(registry, options = {}) {
  const packages = registry.packages ?? {}
  const problems = []
  const moleculeRoot = options.moleculeRoot

  // "I could not look" is not "I looked and found nothing". Without the molecule
  // checkout, whether a covering bond is real code or an empty registry row is
  // unknowable — so the gate fails instead of certifying what it did not read.
  if (!moleculeRoot || !existsSync(moleculeRoot) || !statSync(moleculeRoot).isDirectory()) {
    problems.push(
      `cannot read the molecule checkout at '${moleculeRoot ?? '(unresolved)'}', so coverage ` +
        `cannot be verified at all. This is a failure, not a skip: a registry row is not a bond, ` +
        `and certifying coverage without reading the code is how a project gets deleted uncaptured. ` +
        `Check out molecule beside mlcl, set MOLECULE_PACKAGES_DIR, or pass --molecule-root.`,
    )
    return { gaps: [], problems, providers: 0, exempt: 0 }
  }

  // A stale ledger is a silent hole: a renamed core stops matching any provider
  // and the category drops out of the check entirely, reporting success.
  for (const { core } of [...STATE_OWNING, ...NOT_STATE_OWNING]) {
    if (!packages[core]) {
      problems.push(
        `ledger entry '${core}' is not in the registry — it was renamed or removed. ` +
          `Update STATE_OWNING/NOT_STATE_OWNING in ${scriptRelativePath()}.`,
      )
    }
  }

  const { categoryCovers, providerCovers } = resolveCoverage(packages, moleculeRoot, problems)

  const exemptions = new Map()
  for (const entry of EXEMPT_PROVIDERS) {
    const name = entry?.package
    if (!name) {
      problems.push(`EXEMPT_PROVIDERS entry has no 'package': ${JSON.stringify(entry)}`)
      continue
    }
    if (!entry.reason || !String(entry.reason).trim()) {
      problems.push(
        `EXEMPT_PROVIDERS entry '${name}' has no reason — an exemption with no reason is a bug.`,
      )
      continue
    }
    exemptions.set(name, String(entry.reason))
  }

  const gaps = []
  const seenExemptions = new Set()
  const seenProviders = new Set()
  let providers = 0

  for (const { core, reason } of STATE_OWNING) {
    const coreEntry = packages[core]
    if (!coreEntry) continue // already reported as a stale ledger entry above
    const coreCategory = coreEntry.category
    const coreToken = apiToken(core)

    for (const [name, entry] of Object.entries(packages)) {
      if (name === core) continue // the core is the contract, not a state owner

      // Scope is decided by two things a typo cannot quietly erase: the package
      // NAME (a `@molecule/api-*` package is API-stack by construction, which is
      // what keeps `@molecule/app-storage-localstorage` — same `storage` category,
      // owns no project state — out) and the relationship to the core.
      //
      // `implements` OR `category`, and NEITHER gated on `type`, deliberately.
      // Every one of those fields is hand-written metadata, and a gate that lets
      // a wrong value shrink its own scope is not a gate: `type: 'bond'` instead
      // of `'provider'`, or a missing `implements`, is precisely the sloppiness
      // this exists to catch, and it must fail LOUD rather than skip the package.
      // A package that lands here without owning state is declared in
      // EXEMPT_PROVIDERS with a reason — a written line, not a silent field.
      if (!name.startsWith(API_PACKAGE_PREFIX)) continue
      if (entry.implements !== core && entry.category !== coreCategory) continue

      // A package can match two state-owning cores only via metadata that is
      // wrong; count it once so the summary stays truthful.
      if (seenProviders.has(name)) continue
      seenProviders.add(name)
      providers++

      if (exemptions.has(name)) {
        seenExemptions.add(name)
        continue
      }

      // The category-wide bond for THIS core covers every provider of it.
      if (categoryCovers.has(coreToken)) continue

      // Normally `@molecule/api-database-mysql` → `mysql`. A provider that does
      // not follow `<core>-<name>` still reduces to something suggestible rather
      // than having its whole scoped name pasted into the fix message.
      const providerToken = name.startsWith(`${core}-`)
        ? name.slice(core.length + 1)
        : apiToken(name)

      // A per-provider bond is matched only in the per-provider name space. A
      // token that names a CORE lives in the category-wide space and belongs to
      // that core alone — it cannot be borrowed by a same-suffixed provider of a
      // different core.
      if (providerCovers.has(providerToken)) continue

      const collidesWith = categoryCovers.get(providerToken)
      gaps.push({
        name,
        core,
        reason,
        wanted: [
          `${EXTERNAL_STATE_PREFIX}${providerToken}`,
          `${EXTERNAL_STATE_PREFIX}${coreToken}`,
        ],
        note: collidesWith
          ? `${collidesWith} exists, but it is the category-wide bond for ` +
            `${API_PACKAGE_PREFIX}${providerToken} — a name collision, not coverage of ${core}. ` +
            `Rename this provider, or write the ${core} bond it actually needs.`
          : undefined,
      })
    }
  }

  for (const name of exemptions.keys()) {
    if (!seenExemptions.has(name)) {
      problems.push(
        `EXEMPT_PROVIDERS names '${name}', which is not a provider bond in any state-owning ` +
          `category. A stale exemption hides a real gap — remove it.`,
      )
    }
  }

  return { gaps, problems, providers, exempt: seenExemptions.size }
}

/**
 * This script's path, as written in operator-facing messages.
 *
 * @returns {string} The repo-relative path.
 */
function scriptRelativePath() {
  return 'mlcl/scripts/check-external-state-coverage.mjs'
}

/**
 * Read `--flag <value>` out of an argv slice.
 *
 * @param {string[]} argv - Arguments after the script name.
 * @param {string} flag - The flag to read, e.g. `--registry`.
 * @returns {string | null} The value, or `null` when the flag is absent.
 * @throws {Error} If the flag is passed without a value.
 */
function readFlag(argv, flag) {
  const index = argv.indexOf(flag)
  if (index === -1) return null
  const value = argv[index + 1]
  if (!value) throw new Error(`${flag} requires a path`)
  return value
}

/**
 * Resolve the registry path from `--registry <path>`, else `mlcl/registry.json`.
 *
 * @param {string[]} argv - Arguments after the script name.
 * @returns {string} An absolute path to a `registry.json`.
 * @throws {Error} If `--registry` is passed without a value.
 */
function resolveRegistryPath(argv) {
  return readFlag(argv, '--registry') ?? join(mlclRoot(), 'registry.json')
}

/**
 * Resolve the molecule repo root: `--molecule-root`, else `MOLECULE_PACKAGES_DIR`'s
 * parent (the same env var `sync-registry` and `verify:registry-exports` honor),
 * else the `molecule` sibling directory next to `mlcl`.
 *
 * @param {string[]} argv - Arguments after the script name.
 * @returns {string} A path to the molecule repo root — existence is checked by the caller.
 * @throws {Error} If `--molecule-root` is passed without a value.
 */
function resolveMoleculeRoot(argv) {
  const flag = readFlag(argv, '--molecule-root')
  if (flag) return flag
  if (process.env.MOLECULE_PACKAGES_DIR) return join(process.env.MOLECULE_PACKAGES_DIR, '..')
  return join(mlclRoot(), '..', 'molecule')
}

/**
 * The mlcl repo root, derived from this script's own location.
 *
 * @returns {string} An absolute path.
 */
function mlclRoot() {
  return join(dirname(fileURLToPath(import.meta.url)), '..')
}

/**
 * CLI entry point: check the registry and exit non-zero on any gap or defect.
 *
 * @returns {void}
 */
function main() {
  const argv = process.argv.slice(2)
  const registryPath = resolveRegistryPath(argv)
  const moleculeRoot = resolveMoleculeRoot(argv)
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'))
  const { gaps, problems, providers, exempt } = checkExternalStateCoverage(registry, {
    moleculeRoot,
  })

  if (problems.length > 0) {
    console.error(
      `\n✗ external-state coverage cannot be certified (${problems.length} problem(s)):\n`,
    )
    for (const problem of problems) console.error(`  ${problem}`)
    console.error('')
  }

  if (gaps.length > 0) {
    console.error(`\n✗ project-archive external-state coverage gap (${gaps.length} package(s)):\n`)
    for (const { name, core, reason, wanted, note } of gaps) {
      console.error(`  ${name}`)
      console.error(`      state-owning: implements ${core} — ${reason}`)
      // When the per-provider name is already taken by another core's
      // category-wide bond, "no <wanted[0]>" would be a lie — say what is
      // actually there instead.
      if (note) console.error(`      ${note}`)
      else console.error(`      no ${wanted[0]}`)
      console.error(`      and no category-wide ${wanted[1]}`)
    }
    console.error(`\nFix: add a bond under ${BOND_DIR}<name>/ exporting a`)
    console.error(`     ProjectExternalStateProvider (see @molecule/api-project-archive), then run`)
    console.error(`     \`cd mlcl && node bin/run.js sync-registry\` so it lands in registry.json.`)
    console.error(
      `\n     Write the bond per-provider when capture needs that provider's own tooling,`,
    )
    console.error(
      `     or once against the CORE interface (named \`${EXTERNAL_STATE_PREFIX}<core>\`)`,
    )
    console.error(`     when one implementation covers every provider — as the uploads bond does.`)
    console.error(
      `\nWhy this is a gate, not a lint: the project archive DESTROYS a project after a`,
    )
    console.error(
      `verified capture. State whose provider was never registered is captured by nobody,`,
    )
    console.error(
      `verifies clean, and is then permanently deleted. It is silent data loss, not a gap.`,
    )
    console.error(`\nIf the provider genuinely owns nothing a project cannot regenerate, add it to`)
    console.error(`EXEMPT_PROVIDERS in ${scriptRelativePath()} with a one-line reason.\n`)
  }

  if (gaps.length > 0 || problems.length > 0) process.exit(1)

  const exemptNote = exempt > 0 ? `, ${exempt} exempt` : ''
  console.log(
    `✓ project-archive external-state coverage complete ` +
      `(${providers} provider bond(s) across ${STATE_OWNING.length} state-owning ` +
      `categor${STATE_OWNING.length === 1 ? 'y' : 'ies'}${exemptNote})`,
  )
}

// Only run as a CLI. The test that proves this gate bites SPAWNS it, because the
// exit code and stderr are what CI consumes; `checkExternalStateCoverage` is
// exported for a caller that wants the structured result instead.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
}
