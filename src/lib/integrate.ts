/**
 * Helpers for integrating `@molecule/*` packages into an existing project —
 * the `mlcl add` / `mlcl swap` external-app integration flow.
 *
 * These back the documented "build in the molecule IDE → export → run `mlcl`
 * locally" path (see `docs/INTEGRATE-EXISTING-APP.md`). They make the commands
 * robust against the realities of an existing app: packages that are not (yet)
 * on a public npm registry, offline/private registries, and projects that adopt
 * the molecule bond convention without carrying the `molecule.projectType`
 * marker that `mlcl create` writes.
 *
 * @module
 */

import { access, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { t } from './i18n.js'
import { bondNameToPascal, extractBondName, generateBondSetupCode } from './injector.js'
import {
  detectAppFramework,
  findRegistryPackage,
  getMoleculeVersion,
  getSharedCodeDir,
} from './registry.js'
import type { InferredPackage } from './schema.js'

/** Which source produced the version chosen by {@link resolveAddVersion}. */
export type AddVersionSource = 'npm' | 'registry' | 'fallback'

/** Result of resolving the version to pin for an added package. */
export interface ResolvedAddVersion {
  /** The exact version string to write into package.json. */
  version: string
  /** Where the version came from (drives the user-facing warning). */
  source: AddVersionSource
}

/**
 * Resolve the exact version to pin for a molecule package being added to a project.
 *
 * Resolution order (first that yields a non-empty version wins):
 * 1. `npm` — the published version from the npm registry (via `npmView`).
 * 2. `registry` — the exact lockstep version from the local molecule registry.
 *    Used when the package is not published to a public registry (the MVP state)
 *    or npm is unreachable (offline / private registry).
 * 3. `fallback` — `'latest'`, for a non-`@molecule/*` package with no registry
 *    entry whose npm lookup also failed.
 *
 * Never throws on an unresolved npm lookup — the whole point is to keep the
 * external-app flow working when packages are not on the public registry.
 *
 * @param name - Package name to resolve (e.g. `@molecule/api-logger`).
 * @param npmView - Returns the published version, or throws when unresolvable.
 * @returns the resolved version plus which source produced it.
 */
export async function resolveAddVersion(
  name: string,
  npmView: (name: string) => Promise<string>,
): Promise<ResolvedAddVersion> {
  try {
    const version = (await npmView(name)).trim()
    if (version) return { version, source: 'npm' }
  } catch (_error) {
    // npm registry lookup failed (404 for an unpublished package, offline, or a
    // private registry). This is expected in the external-app MVP flow — fall
    // through to the local registry instead of surfacing an opaque npm error.
  }

  if (name.startsWith('@molecule/') && findRegistryPackage(name)) {
    return { version: getMoleculeVersion(name), source: 'registry' }
  }

  return { version: 'latest', source: 'fallback' }
}

/**
 * Locate the project directory that owns the given stack's bond wiring.
 *
 * Resolution order (first match wins):
 * 1. `cwd` when its package.json carries `molecule.projectType === stack` — the
 *    marker `mlcl create` writes and an IDE export preserves.
 * 2. `cwd/<stack>` when that subdirectory has a package.json — the full-stack
 *    monorepo layout (`api/`, `app/`).
 * 3. `cwd` when it has a `src/bonds/` directory — the molecule bond-wiring
 *    convention. This lets the commands operate on a flat existing app that
 *    adopted the convention but lacks the `molecule.projectType` marker.
 *
 * @param cwd - The directory to resolve from (usually `process.cwd()`).
 * @param stack - The stack whose project root is wanted (`api` or `app`).
 * @returns the resolved project path, or `null` when none matches.
 */
export async function detectProjectRoot(cwd: string, stack: 'api' | 'app'): Promise<string | null> {
  // 1. Explicit marker on the cwd package.json.
  try {
    const pkg = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf-8'))
    if (pkg.molecule?.projectType === stack) return cwd
  } catch (_error) {
    // package.json absent or unparseable — cwd is not the marked root; keep looking.
  }

  // 2. Full-stack subdirectory layout (api/ or app/).
  const subdir = join(cwd, stack)
  try {
    await access(join(subdir, 'package.json'))
    return subdir
  } catch (_error) {
    // No matching subdirectory — fall through to the convention check.
  }

  // 3. Flat existing app that adopted the bond convention.
  try {
    await access(join(cwd, 'src', 'bonds'))
    return cwd
  } catch (_error) {
    // No src/bonds/ — this directory is not a molecule-integrated project.
  }

  return null
}

/** Resolved on-disk paths for the bond files involved in a swap. */
export interface BondPaths {
  /** Absolute path to the bonds directory (honours a framework's shared-code subdir). */
  bondsDir: string
  /** Bond name for the provider being removed (e.g. `emails-mailgun`). */
  oldBondName: string
  /** Bond name for the provider being added (e.g. `emails-sendgrid`). */
  newBondName: string
  /** Absolute path of the bond file being removed. */
  oldBondFile: string
  /** Absolute path of the bond file being created. */
  newBondFile: string
  /** Absolute path of the bonds barrel (`index.ts`) that wires the setups. */
  bondsIndexFile: string
}

/**
 * Resolve where a swap's bond files live, deriving the bonds directory the same
 * way `mlcl inject` does — via {@link detectAppFramework} + {@link getSharedCodeDir}.
 *
 * A framework with a shared-code subdir (e.g. SvelteKit's `src/lib`) keeps its
 * bonds under `src/<sharedDir>/bonds`, not `src/bonds`. Hardcoding `src/bonds`
 * made swap miss those layouts entirely (read/delete the wrong paths), so this
 * mirrors inject's resolution to keep the two commands consistent.
 *
 * @param projectPath - Project root that owns the bond wiring.
 * @param oldName - Package name of the provider being removed.
 * @param newName - Package name of the provider being added.
 */
export async function resolveBondPaths(
  projectPath: string,
  oldName: string,
  newName: string,
): Promise<BondPaths> {
  const packageJson = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8'))
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
  const framework = detectAppFramework(deps, packageJson.molecule)
  const sharedSubdir = framework ? getSharedCodeDir(framework) : undefined
  const bondsDir = sharedSubdir
    ? join(projectPath, 'src', sharedSubdir, 'bonds')
    : join(projectPath, 'src', 'bonds')

  const oldBondName = extractBondName(oldName)
  const newBondName = extractBondName(newName)
  return {
    bondsDir,
    oldBondName,
    newBondName,
    oldBondFile: join(bondsDir, `${oldBondName}.ts`),
    newBondFile: join(bondsDir, `${newBondName}.ts`),
    bondsIndexFile: join(bondsDir, 'index.ts'),
  }
}

/** Why an {@link applyBondSwap} call could not complete (no/partial mutation, fully rolled back). */
export type BondSwapErrorCode =
  /** `bonds/index.ts` does not exist under the resolved bonds directory. */
  | 'index-missing'
  /** The old provider's `setup…` import was not found in `bonds/index.ts` — a rewrite would no-op. */
  | 'index-no-match'
  /** A write/delete failed mid-swap; all prior mutations were rolled back. */
  | 'write-failed'

/**
 * Raised when a bond swap cannot be applied safely. By contract, when this is
 * thrown the project is left in its original state (nothing deleted, package.json
 * + index.ts restored) — never a half-applied swap.
 */
export class BondSwapError extends Error {
  constructor(
    message: string,
    readonly code: BondSwapErrorCode,
  ) {
    super(message)
    this.name = 'BondSwapError'
  }
}

/** Inputs for {@link applyBondSwap}. */
export interface BondSwapInput {
  /** Project root that owns the bond wiring. */
  projectPath: string
  /** Registry entry for the provider being removed. */
  oldPkg: InferredPackage
  /** Registry entry for the provider being added. */
  newPkg: InferredPackage
  /** Package name of the provider being added (`newPkg.name`). */
  newName: string
  /** Interface both providers implement (drives bond-code generation). */
  implementsInterface: string
  /** Exact version to pin the new provider at in package.json. */
  newVersion: string
}

/** Outcome of a successful {@link applyBondSwap}. */
export interface BondSwapResult extends BondPaths {
  /**
   * Whether the `setup…()` call inside `setupBonds`/`setupProviders` was rewritten
   * too. The import is the hard requirement (its absence aborts before any
   * mutation); a missing call is non-fatal (the project still compiles) but means
   * the new provider is never initialized, so the caller should warn the user.
   */
  callRewritten: boolean
}

/**
 * Apply a provider swap to an existing project's bond wiring, atomically.
 *
 * This is the destructive core behind `mlcl swap`, extracted so it can be tested
 * directly against a real on-disk project. It is hardened against the two ways
 * the original inline implementation could leave a non-compiling project while
 * still reporting success:
 *
 * 1. **No-op index rewrite.** The old rewrite used `String.replace` with an
 *    exact-format regex; on any deviation it silently changed nothing, yet the
 *    old bond file was already deleted — so `bonds/index.ts` kept importing a
 *    now-missing module. Here the index rewrite is **pre-flighted before any
 *    mutation**: if the old provider's `setup…` import is not present, the swap
 *    throws {@link BondSwapError} (`index-no-match`) and nothing is touched.
 * 2. **Mid-swap failure.** All mutations are ordered so the old bond file is
 *    deleted **last** (only after every other write succeeds) and any failure
 *    rolls back package.json + index.ts and removes the freshly-written new bond
 *    file — never a half-applied state.
 *
 * The bonds directory is resolved via {@link resolveBondPaths} (framework-aware),
 * not a hardcoded `src/bonds`.
 *
 * @param input - The packages, versions, and project to swap within.
 * @returns the resolved paths plus whether the setup call was rewritten.
 * @throws {BondSwapError} when the swap cannot be applied (project left untouched).
 */
export async function applyBondSwap(input: BondSwapInput): Promise<BondSwapResult> {
  const { projectPath, oldPkg, newPkg, newName, implementsInterface, newVersion } = input

  const paths = await resolveBondPaths(projectPath, oldPkg.name, newName)
  const { bondsIndexFile, oldBondFile, newBondFile, oldBondName, newBondName } = paths
  const oldPascal = bondNameToPascal(oldBondName)
  const newPascal = bondNameToPascal(newBondName)

  // 1. Pre-flight the bonds/index.ts rewrite BEFORE deleting anything. The index
  //    is the linchpin: if the old provider's wiring is not found there, a rewrite
  //    is a no-op and removing the old bond file would leave a dangling import to
  //    a now-missing module — a project that no longer type-checks. Abort first.
  let indexContent: string
  try {
    indexContent = await readFile(bondsIndexFile, 'utf-8')
  } catch (_error) {
    throw new BondSwapError(
      t('commands.swap.errors.indexMissing', { file: bondsIndexFile }),
      'index-missing',
    )
  }

  // Tolerant of quote style, inter-token spacing, and an optional trailing
  // semicolon so a prettier-formatted or hand-written index (the flat external
  // app this flow targets) is still matched. The trailing `;?` is NOT followed by
  // `\s*` on purpose — consuming the line's newline would glue the next statement
  // onto the rewritten import.
  const importRe = new RegExp(
    `import[ \\t]*\\{[ \\t]*setup${oldPascal}[ \\t]*\\}[ \\t]*from[ \\t]*['"]\\.\\/${oldBondName}\\.js['"];?`,
  )
  const callRe = new RegExp(`setup${oldPascal}[ \\t]*\\([ \\t]*\\)`)

  if (!importRe.test(indexContent)) {
    throw new BondSwapError(
      t('commands.swap.errors.indexNoMatch', {
        bond: oldBondName,
        symbol: `setup${oldPascal}`,
        file: bondsIndexFile,
      }),
      'index-no-match',
    )
  }

  const callRewritten = callRe.test(indexContent)
  const rewrittenIndex = indexContent
    .replace(importRe, `import { setup${newPascal} } from './${newBondName}.js'`)
    .replace(callRe, `setup${newPascal}()`)

  // 2. Generate the new bond file content up-front, so a generation failure also
  //    aborts before any destructive change to the project.
  const bondCode = await generateBondSetupCode(
    newPkg,
    newBondName,
    implementsInterface,
    projectPath,
  )

  // 3. Compute the rewritten package.json (remove old dep, add new pinned, sort).
  const packageJsonPath = join(projectPath, 'package.json')
  const packageJsonRaw = await readFile(packageJsonPath, 'utf-8')
  const packageJson = JSON.parse(packageJsonRaw)
  const depKey = packageJson.dependencies?.[oldPkg.name] ? 'dependencies' : 'devDependencies'
  packageJson[depKey] = packageJson[depKey] ?? {}
  delete packageJson[depKey][oldPkg.name]
  packageJson[depKey][newName] = newVersion
  const sorted: Record<string, string> = {}
  for (const key of Object.keys(packageJson[depKey]).sort()) {
    sorted[key] = packageJson[depKey][key]
  }
  packageJson[depKey] = sorted
  const newPackageJsonRaw = JSON.stringify(packageJson, null, 2) + '\n'

  // 4. Mutate in a safe order with rollback. The old bond file is removed LAST,
  //    only after every other write succeeds, so a mid-way failure never leaves
  //    a project importing a deleted module.
  try {
    await writeFile(packageJsonPath, newPackageJsonRaw)
    await writeFile(newBondFile, bondCode)
    await writeFile(bondsIndexFile, rewrittenIndex)
    // Old bond name always differs from the new one (extractBondName encodes the
    // provider), so this never removes the file we just wrote. force:true makes an
    // already-absent old bond a no-op (the index still referenced it — now fixed).
    await rm(oldBondFile, { force: true })
  } catch (error) {
    // Roll back every write performed so far; restore the originals and drop the
    // freshly-written new bond file. The old bond file is deleted last, so on any
    // failure here it is still present and needs no restore.
    await writeFile(packageJsonPath, packageJsonRaw).catch(() => {})
    await writeFile(bondsIndexFile, indexContent).catch(() => {})
    await rm(newBondFile, { force: true }).catch(() => {})
    throw new BondSwapError(
      t('commands.swap.errors.writeFailed', { error: String(error) }),
      'write-failed',
    )
  }

  return { ...paths, callRewritten }
}
