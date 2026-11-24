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

import { existsSync } from 'node:fs'
import { access, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { ts } from 'ts-morph'

import { isExactVersion } from './exact-version.js'
import { inLanguage } from './existing-project.js'
import { swapResolvedSecrets } from './extend-api-wiring.js'
import { sortImportStatements } from './format.js'
import { t } from './i18n.js'
import { bondNameToPascal, extractBondName, generateBondSetupCode } from './injector.js'
import { missingMoleculePeers } from './peer-closure.js'
import {
  detectAppFramework,
  findRegistryPackage,
  getMoleculeVersion,
  getSharedCodeDir,
  loadRegistry,
} from './registry.js'
import type { InferredPackage } from './schema.js'

/** Which source produced the version chosen by {@link resolveAddVersion}. */
export type AddVersionSource = 'npm' | 'registry' | 'requested' | 'fallback'

/** Result of resolving the version to pin for an added package. */
export interface ResolvedAddVersion {
  /** The exact version string to write into package.json. */
  version: string
  /** Where the version came from (drives the user-facing warning). */
  source: AddVersionSource
}

/** A `mlcl add` argument split into the package name and an optional pin. */
export interface AddArgument {
  /** The npm package name (`@molecule/api-resource-user`, `express`). */
  name: string
  /** The exact version the operator asked for, when one was given. */
  requestedVersion?: string
}

/**
 * Split `mlcl add`'s argument into a package name and an optional `@version`.
 *
 * A scoped name begins with `@`, so the separator is the LAST `@` past index 0:
 * `@molecule/api-resource-user@1.2.2` → name + `1.2.2`, while
 * `@molecule/api-resource-user` stays one name. An explicit version is honoured
 * only when it names ONE version (see {@link resolveAddVersion}); a range or tag
 * is refused rather than handed to npm as a floating pin.
 *
 * @param spec - The raw argument.
 * @returns The name and, when present, the requested version.
 */
export function parseAddArgument(spec: string): AddArgument {
  const at = spec.lastIndexOf('@')
  if (at > 0) {
    const name = spec.slice(0, at)
    const requestedVersion = spec.slice(at + 1)
    if (name && requestedVersion) return { name, requestedVersion }
  }
  return { name: spec }
}

/**
 * Resolve the exact version to pin for a molecule package being added to a project.
 *
 * Resolution order (first that yields a non-empty version wins):
 * 1. `requested` — a version the operator named explicitly
 *    (`mlcl add pkg@1.2.3`). It must be exact: a range or tag does not name one
 *    schema, and the preflight that follows cannot bind the package's setup SQL
 *    to it, so it is refused before the manifest is touched.
 * 2. `registry` — the exact lockstep version from the local molecule registry,
 *    for a REGISTERED `@molecule/*` package. This is what `create` pins and what
 *    the registry's shipped metadata (`sqlCapabilities`, `setupSql` +
 *    `setupSqlVersion`) describes, so the preflight judges the version that will
 *    actually be installed. npm `latest` is deliberately NOT consulted first: on
 *    any CLI older than the newest molecule publish it names a version whose
 *    bytes this registry does not carry — judging one release and pinning
 *    another is exactly the bug this ordering removes.
 * 3. `npm` — the published version, for a package the registry does not know
 *    (a third-party dependency, or a `@molecule/*` package published before it
 *    was registered).
 * 4. `fallback` — `'latest'`, for a non-`@molecule/*` package with no registry
 *    entry whose npm lookup also failed.
 *
 * Never throws on an unresolved npm lookup — the whole point is to keep the
 * external-app flow working when packages are not on the public registry.
 *
 * @param name - Package name to resolve (e.g. `@molecule/api-logger`).
 * @param npmView - Returns the published version, or throws when unresolvable.
 * @param options - Optional explicit version the operator requested.
 * @param options.requestedVersion - An exact version to pin, or a value that
 *   cannot name one (refused).
 * @returns the resolved version plus which source produced it.
 * @throws {Error} when an explicitly requested version is not exact — see above.
 */
export async function resolveAddVersion(
  name: string,
  npmView: (name: string) => Promise<string>,
  options: { requestedVersion?: string } = {},
): Promise<ResolvedAddVersion> {
  if (options.requestedVersion !== undefined) {
    if (!isExactVersion(options.requestedVersion)) {
      // Two audiences, two remedies: a registry package's setup SQL is checked
      // against the pin the registry carries, while a third-party package has no
      // registry entry, no setup SQL and no pin to fall back to — telling its
      // user about either is advice about a mechanism that does not exist
      // (P18 r11 review, R11-14).
      throw new Error(
        findRegistryPackage(name)
          ? `${name}@${options.requestedVersion} does not name one exact version — ` +
              "a range, tag, path or URL cannot be checked against the registry's setup SQL. " +
              'Request an exact version (e.g. @1.2.3) or let mlcl use the registry pin.'
          : `${name}@${options.requestedVersion} does not name one exact version — mlcl pins ` +
              'exact versions. Request the release you mean (e.g. ' +
              `${name}@1.2.3, see \`npm view ${name} version\`), or omit the version to pin ` +
              "npm's latest published release.",
      )
    }
    return { version: options.requestedVersion, source: 'requested' }
  }

  if (name.startsWith('@molecule/') && findRegistryPackage(name)) {
    return { version: getMoleculeVersion(name), source: 'registry' }
  }

  try {
    const version = (await npmView(name)).trim()
    if (version) return { version, source: 'npm' }
  } catch (_error) {
    // npm registry lookup failed (404 for an unpublished package, offline, or a
    // private registry). This is expected in the external-app MVP flow — the
    // caller falls back to the registry/latest policy below instead of surfacing
    // an opaque npm error.
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
  /**
   * The extension the project's bond files use: `.ts`, or `.js` / `.mjs` where
   * `mlcl inject` wrote them for a JavaScript project.
   */
  extension: '.ts' | '.js' | '.mjs'
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
  const extension =
    (['.ts', '.js', '.mjs'] as const).find((ext) => existsSync(join(bondsDir, `index${ext}`))) ??
    '.ts'
  return {
    bondsDir,
    oldBondName,
    newBondName,
    oldBondFile: join(bondsDir, `${oldBondName}${extension}`),
    newBondFile: join(bondsDir, `${newBondName}${extension}`),
    bondsIndexFile: join(bondsDir, `index${extension}`),
    extension,
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
  /**
   * The package the app keeps that still requires the replaced provider (a default-bonds
   * package that imports it), when the swap left that provider pinned for it.
   */
  keptFor?: string
}

/**
 * The manifest dependencies that exist ONLY as the replaced provider's molecule
 * peers — the closure {@link ensureMoleculePeerClosure} (`scaffold.ts`) writes
 * into every `mlcl create` manifest.
 *
 * A peer pin is not an app selection: it is there because the provider the
 * swap just removed needs it. Once that provider is gone, a peer that no
 * remaining package names stops being required, and leaving it in the manifest
 * lets it outrank the bond the swap actually wired — the later renders
 * (`migrateTemplateFor`, `databasePackageOf`, `readMigrateRunnerForManifest`)
 * all read this manifest, so a leftover `@molecule/api-database-duckdb` pin
 * from a MotherDuck app decided the runner and the migration header after a
 * swap to PostgreSQL, PGlite, SQLite or MySQL.
 *
 * The rule is the closure's own contract, not a provider list: a candidate peer
 * (a `moleculePeers` entry of the replaced provider that the manifest still
 * pins) is dropped only when neither the remaining packages nor the swap target
 * needs it — directly, transitively, or as the `defaultProvider` of a category
 * nothing else in the manifest provides (the same condition
 * `ensureMoleculePeerClosure` applies). A peer another installed package still
 * requires, and the swap target itself, are always kept; a package the app
 * declared for reasons the manifest cannot see is never in the candidate set.
 *
 * @param manifest - The manifest AFTER the swap target was added and the
 *   replaced provider removed.
 * @param replaced - Registry entry of the provider being removed.
 * @param newName - Package name of the provider being added.
 * @returns The dependency names to remove from whichever key holds them.
 */
function peerOnlyDependencies(
  manifest: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> },
  replaced: InferredPackage,
  newName: string,
): string[] {
  const peers = replaced.molecule?.moleculePeers ?? []
  if (peers.length === 0) return []
  const declared = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ])
  const candidates = peers.filter(
    (name) => name !== newName && name !== replaced.name && declared.has(name),
  )
  if (candidates.length === 0) return []

  // Everything the manifest still holds apart from the candidates: the app's
  // own selections and the peers of the databases/resources it keeps.
  const kept = [...declared].filter((name) => name !== replaced.name && !candidates.includes(name))
  const required = new Set([...kept, newName, ...missingMoleculePeers([...kept, newName])])
  return candidates.filter((name) => !required.has(name))
}

/** A default-bonds package's all-in-one setup the bonds index calls: `setupAllDefaultBonds()`. */
interface DefaultBondsCall {
  /** The setup's name. */
  name: string
  /** Where the line after its call statement starts. */
  after: number
  /** The call statement's indentation. */
  indent: string
}

/**
 * The call the bonds index makes to a default-bonds package's all-in-one setup
 * (`setupAllDefaultBonds` from `@molecule/app-bonds-default-react`, or any `@molecule/*-bonds-default*`
 * package), which wires the providers an app does not import a setup for one by one.
 *
 * @param source - The bonds index.
 * @returns The call, or undefined when the index makes none (or more than one).
 */
function defaultBondsCall(source: string): DefaultBondsCall | undefined {
  const file = ts.createSourceFile('index.ts', source, ts.ScriptTarget.Latest, true)
  const names = new Set<string>()
  for (const node of file.statements) {
    if (
      !ts.isImportDeclaration(node) ||
      !ts.isStringLiteral(node.moduleSpecifier) ||
      !/^@molecule\/[\w-]*bonds-default[\w-]*$/.test(node.moduleSpecifier.text)
    )
      continue
    const bindings = node.importClause?.namedBindings
    if (bindings && ts.isNamedImports(bindings))
      for (const element of bindings.elements)
        if (/^setupAll\w*$/.test(element.name.text)) names.add(element.name.text)
  }
  const calls: DefaultBondsCall[] = []
  const visit = (node: ts.Node): void => {
    if (
      ts.isExpressionStatement(node) &&
      ts.isCallExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      names.has(node.expression.expression.text)
    ) {
      const start = node.getStart(file)
      const lineStart = source.lastIndexOf('\n', start - 1) + 1
      const lineEnd = source.indexOf('\n', node.end)
      calls.push({
        name: node.expression.expression.text,
        after: lineEnd < 0 ? source.length : lineEnd + 1,
        indent: source.slice(lineStart, start),
      })
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return calls.length === 1 ? calls[0] : undefined
}

/**
 * Whether a file in the bonds directory other than the old bond itself imports the old bond.
 *
 * @param bondsDir - The bonds directory.
 * @param oldBondFile - The old bond file.
 * @param specifier - The specifier a sibling imports it by (`./app-fonts-arimo.js`).
 * @param index - The index file and its content after the swap.
 * @param index.file - The index file.
 * @param index.content - Its content after the swap.
 * @returns True when another bond file still imports it.
 */
async function bondImported(
  bondsDir: string,
  oldBondFile: string,
  specifier: string,
  index: { file: string; content: string },
): Promise<boolean> {
  const quoted = new RegExp(`['"]${specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`)
  for (const entry of await readdir(bondsDir)) {
    const file = join(bondsDir, entry)
    if (file === oldBondFile || !/\.[cm]?[jt]sx?$/.test(entry)) continue
    const content = file === index.file ? index.content : await readFile(file, 'utf-8')
    if (quoted.test(content)) return true
  }
  return false
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
 * **A provider the default bonds wire.** An index that calls a default-bonds package's
 *    `setupAllDefaultBonds()` (every flagship) imports no setup of its own for the fonts, router,
 *    storage, styling, icons or clipboard that call wires. When the index names the old provider's
 *    setup nowhere, the new provider's setup is imported and called on the line after that call,
 *    and the bond it makes replaces the default's. An old setup imported from a package instead of
 *    the bond file (an `/optional/` wiring) is rewritten like one imported from the bond file.
 *    The old bond file is removed only when no other bond file imports it.
 *
 * **A provider another package still requires stays pinned.** When the closure of the packages
 * the app keeps (`missingMoleculePeers`) still needs the old provider, as a default-bonds package
 * that imports it does, the manifest keeps it and its peers (`result.keptFor` names that package):
 * the project installs with legacy-peer-deps, so npm would not install it as a peer.
 *
 * The bonds directory is resolved via {@link resolveBondPaths} (framework-aware),
 * not a hardcoded `src/bonds`.
 *
 * The package.json rewrite also drops pins that existed only as the replaced
 * provider's molecule peers ({@link peerOnlyDependencies}) — e.g. the local
 * DuckDB bond a MotherDuck manifest carries — so the manifest every later
 * render reads names the database the swap actually wired.
 *
 * @param input - The packages, versions, and project to swap within.
 * @returns the resolved paths plus whether the setup call was rewritten.
 * @throws {BondSwapError} when the swap cannot be applied (project left untouched).
 */
export async function applyBondSwap(input: BondSwapInput): Promise<BondSwapResult> {
  const { projectPath, oldPkg, newPkg, newName, implementsInterface, newVersion } = input

  const paths = await resolveBondPaths(projectPath, oldPkg.name, newName)
  const { bondsIndexFile, oldBondFile, newBondFile, oldBondName, newBondName, extension } = paths
  // The specifier extension the index imports bond files with.
  const specifierExt = extension === '.mjs' ? 'mjs' : 'js'
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
    `import[ \\t]*\\{[ \\t]*setup${oldPascal}[ \\t]*\\}[ \\t]*from[ \\t]*['"]\\.\\/${oldBondName}\\.${specifierExt}['"];?`,
  )
  const callRe = new RegExp(`setup${oldPascal}[ \\t]*\\([ \\t]*\\)`)
  // The same import from a package (an `/optional/` wiring of a default-bonds package).
  const packageImportRe = new RegExp(
    `import[ \\t]*\\{[ \\t]*setup${oldPascal}[ \\t]*\\}[ \\t]*from[ \\t]*['"][^'"\\n]+['"];?`,
  )
  const oldImport = importRe.test(indexContent)
    ? importRe
    : packageImportRe.test(indexContent)
      ? packageImportRe
      : undefined
  // Named nowhere: the default bonds wire it, and the new setup goes after theirs.
  const defaults =
    oldImport || new RegExp(`\\bsetup${oldPascal}\\b`).test(indexContent)
      ? undefined
      : defaultBondsCall(indexContent)
  const wiring: { oldImport: RegExp } | { defaults: DefaultBondsCall } | undefined = oldImport
    ? { oldImport }
    : defaults
      ? { defaults }
      : undefined

  if (!wiring) {
    throw new BondSwapError(
      t('commands.swap.errors.indexNoMatch', {
        bond: oldBondName,
        symbol: `setup${oldPascal}`,
        file: bondsIndexFile,
      }),
      'index-no-match',
    )
  }

  // 2. Generate the new bond file content up-front, so a generation failure also
  //    aborts before any destructive change to the project.
  const generatedCode = await generateBondSetupCode(
    newPkg,
    newBondName,
    implementsInterface,
    projectPath,
  )
  // A JavaScript project's bond files are compiled the way `mlcl inject` wrote them.
  const bondCode =
    extension === '.ts'
      ? generatedCode
      : (inLanguage(
          {
            action: 'create',
            targetPath: newBondFile.replace(/\.m?js$/, '.ts'),
            content: generatedCode,
            description: '',
          },
          extension === '.mjs' ? 'commonjs' : 'esm',
        ).content ?? generatedCode)

  const newImport = `import { setup${newPascal} } from './${newBondName}.${specifierExt}'`
  let wired: string
  let callRewritten: boolean
  if ('oldImport' in wiring) {
    callRewritten = callRe.test(indexContent)
    const rewired = indexContent
      .replace(wiring.oldImport, newImport)
      .replace(callRe, `setup${newPascal}()`)
    // A package import replaced by a bond file's moves to the relative imports' group.
    wired = wiring.oldImport === importRe ? rewired : sortImportStatements(rewired, bondsIndexFile)
  } else {
    const call = wiring.defaults
    const file = ts.createSourceFile('index.ts', indexContent, ts.ScriptTarget.Latest, true)
    const lastImport = file.statements.filter(ts.isImportDeclaration).at(-1)
    const importAt = lastImport ? lastImport.end : 0
    const withCall =
      indexContent.slice(0, call.after) +
      `${call.indent}// Runs after ${call.name}() so this ${implementsInterface} provider replaces its default.\n` +
      `${call.indent}setup${newPascal}()\n` +
      indexContent.slice(call.after)
    wired = sortImportStatements(
      `${withCall.slice(0, importAt)}\n${newImport}${withCall.slice(importAt)}`,
      bondsIndexFile,
    )
    callRewritten = true
  }
  // The startup's resolveAll([...]) list loads only the keys it names from .env, so it
  // follows the swap: the new provider's keys in, the replaced provider's keys out.
  const rewrittenIndex = swapResolvedSecrets(
    wired,
    (oldPkg.molecule?.secrets ?? []).map((secret) => secret.name),
    (newPkg.molecule?.secrets ?? []).map((secret) => secret.name),
  )
  // A bond file another bond still imports stays.
  const removeOldBond = !(await bondImported(
    dirname(bondsIndexFile),
    oldBondFile,
    `./${oldBondName}.${specifierExt}`,
    { file: bondsIndexFile, content: rewrittenIndex },
  ))

  // 3. Compute the rewritten package.json (remove old dep, add new pinned, sort).
  const packageJsonPath = join(projectPath, 'package.json')
  const packageJsonRaw = await readFile(packageJsonPath, 'utf-8')
  const packageJson = JSON.parse(packageJsonRaw)
  const depKey = packageJson.dependencies?.[oldPkg.name] ? 'dependencies' : 'devDependencies'
  packageJson[depKey] = packageJson[depKey] ?? {}
  // A package the app keeps can still require the replaced provider:
  // `@molecule/app-bonds-default-react` imports every default it wires, and
  // `@molecule/api-bonds-default-express` its database and mail providers. The project
  // installs with legacy-peer-deps, so npm installs no peer the manifest leaves out,
  // and that package fails to load. Such a provider stays pinned, and so do its peers.
  const registry = new Map(loadRegistry().map((pkg) => [pkg.name, pkg]))
  const remaining = [
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ].filter((name) => name !== oldPkg.name)
  const keptFor = missingMoleculePeers([...remaining, newName], registry).includes(oldPkg.name)
    ? (remaining.find((name) =>
        registry.get(name)?.molecule?.moleculePeers?.includes(oldPkg.name),
      ) ?? remaining.find((name) => missingMoleculePeers([name], registry).includes(oldPkg.name)))
    : undefined
  if (!keptFor) delete packageJson[depKey][oldPkg.name]
  packageJson[depKey][newName] = newVersion
  // 3b. Drop the pins that existed ONLY as the replaced provider's molecule
  // peers. `mlcl create` closes every manifest over the registry's
  // `moleculePeers` graph, so a provider can carry dependencies the app never
  // selected — MotherDuck's peers include `@molecule/api-database-duckdb`, and
  // every MotherDuck manifest therefore pins the local DuckDB bond too. Left
  // behind by a swap, that pin outranks the database the bond index now wires:
  // every later render reads THIS manifest, so `migrateTemplateFor` re-rendered
  // the DuckDB runner (migrating a local file while the app reads an unmigrated
  // PostgreSQL database) and `databasePackageOf` stamped the DuckDB header on
  // SQLite/MySQL apps. The set is computed from the same closure contract, not
  // a provider list — see {@link peerOnlyDependencies}.
  for (const orphan of keptFor ? [] : peerOnlyDependencies(packageJson, oldPkg, newName)) {
    delete packageJson.dependencies?.[orphan]
    delete packageJson.devDependencies?.[orphan]
  }
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
    if (removeOldBond) await rm(oldBondFile, { force: true })
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

  return { ...paths, callRewritten, ...(keptFor ? { keptFor } : {}) }
}
