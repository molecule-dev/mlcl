/**
 * Injection engine - copies and adapts molecule files to target project
 *
 * The injector:
 * 1. Reads molecule package info via the scanner
 * 2. Copies source files to appropriate locations
 * 3. Transforms file content for target project structure
 * 4. Generates route wiring code (synthesized straight into the project's router)
 * 5. Creates SQL migration files if needed
 * 6. Installs dependencies automatically
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs'
import {
  access,
  copyFile,
  mkdir,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, sep } from 'node:path'

/**
 * Whether `candidate` resolves to a path INSIDE `baseDir` (the directory itself
 * counts as outside — it is not a file).
 *
 * The paths this file derives from package/registry METADATA (`molecule.
 * middlewareSetup.configFile`, a table's `sqlFile`) are data, and not
 * necessarily this repo's data: {@link scanPackage} falls back to the INSTALLED
 * package's own `package.json` `molecule` block for any package the registry
 * does not list, so a third-party package declares them. `join()` resolves a
 * `../…` happily, so an uncontained `join(projectPath, configFile)` writes the
 * declared content anywhere on the filesystem, and an uncontained read copies
 * any readable file into the project. Both sides are compared as RESOLVED
 * paths (`relative`), which is also what catches an ABSOLUTE declaration —
 * `join(base, '/etc/passwd')` silently folds it into `base`, so a prefix check
 * on the joined string would call an escape "inside".
 *
 * @param baseDir - The directory the path must stay within.
 * @param candidate - The declared path (absolute or relative).
 * @returns True when `candidate` is a path strictly inside `baseDir`.
 */
function isInside(baseDir: string, candidate: string): boolean {
  const inside = relative(baseDir, candidate)
  return inside !== '' && inside !== '..' && !inside.startsWith(`..${sep}`) && !isAbsolute(inside)
}

/**
 * Resolve a project-relative path declared by package metadata against the
 * project, or null when it escapes it — see {@link isInside} for why the
 * declared value cannot be trusted or prefix-checked.
 *
 * @param projectPath - The project the path must stay within.
 * @param relPath - The declared, project-relative path.
 * @returns The absolute target, or null when it is not inside the project.
 */
function containedProjectPath(projectPath: string, relPath: string): string | null {
  const target = join(projectPath, relPath)
  return isInside(projectPath, target) ? target : null
}

/**
 * The table-name segment of a migration FILENAME.
 *
 * A migration is written to `join(<project>/migrations, ◀name▶)`, and the name
 * carries a table name taken from package metadata — an unconstrained string
 * (`z.string()`), so `a/../../../../x` turned the write into an arbitrary file
 * write outside the project. A real table name never contains a path
 * separator, so the separators are flattened into `_` and the filename stays
 * one segment inside `migrations/`. The SAME transformation is applied by
 * {@link checkMigrationExists}, or a re-run would not recognize the migration
 * it wrote and would plan a duplicate.
 *
 * @param tableName - The table name as declared by the package/registry.
 * @returns A single-path-segment name safe to concatenate into the filename.
 */
function migrationFileTableSegment(tableName: string): string {
  return tableName.replace(/[\\/]+/g, '_')
}

import { execa } from 'execa'

import { generateCode, isAIAvailable } from './ai.js'
import { buildPackageContext, loadMoleculeMdBatch } from './ai-context.js'
import { sortImportStatements } from './format.js'
import { t } from './i18n.js'
import { generateLocaleArrayCode } from './locales.js'
import { readMigrateRunner } from './migrate-runner.js'
import {
  findRegistryPackage,
  getMoleculeVersion,
  getPackageStack,
  getRawRegistry,
  loadApiFrameworks,
  loadRegistry,
  requirePackageByRole,
} from './registry.js'
import { scanPackage } from './scanner.js'
import type { InferredPackage } from './schema.js'

// =============================================================================
// API Framework Configuration
// =============================================================================

/**
 * Framework-specific code patterns for API project generation.
 *
 * Decouples the injector from any single HTTP framework. Adding a new
 * framework (Fastify, Hono, etc.) requires only a new entry here.
 */
export interface ApiFrameworkConfig {
  /** Framework name (e.g. 'express') */
  name: string
  /** Import statement for the router module */
  routerImport: string
  /** Expression to create a new router instance */
  routerCreate: string
  /** Import statement for the middleware request handler type */
  middlewareTypeImport: string
  /** Type name for middleware handlers */
  middlewareType: string
  /** Import statement for the server module */
  serverImport: string
  /** Expression to create a new server/app instance */
  serverCreate: string
  /** Expression for built-in JSON body parser middleware */
  jsonBodyParser: string
  /** Error handler function signature */
  errorHandlerSignature: string
  /** Cast expression for the error handler */
  errorHandlerCast: string
  /** Type name for the server/app instance */
  serverType: string
}

/**
 * Load API framework configs from the registry.
 * The registry is the single source of truth for framework configurations.
 */
function getApiFrameworks(): Record<string, ApiFrameworkConfig> {
  const registryFrameworks = loadApiFrameworks()
  const result: Record<string, ApiFrameworkConfig> = {}
  for (const [key, fw] of Object.entries(registryFrameworks)) {
    result[key] = {
      name: fw.name,
      routerImport: fw.routerImport,
      routerCreate: fw.routerCreate,
      middlewareTypeImport: fw.middlewareTypeImport,
      middlewareType: fw.middlewareType,
      serverImport: fw.serverImport,
      serverCreate: fw.serverCreate,
      jsonBodyParser: fw.jsonBodyParser,
      errorHandlerSignature: fw.errorHandlerSignature,
      errorHandlerCast: fw.errorHandlerCast,
      serverType: fw.serverType,
    }
  }
  return result
}

const DEFAULT_API_FRAMEWORK = 'express'

/**
 * Read the API framework from a target project's package.json.
 * Falls back to 'express' if not specified.
 */
export function getProjectApiFramework(projectPath: string): string {
  try {
    const pkg = JSON.parse(readFileSync(join(projectPath, 'package.json'), 'utf-8'))
    return (pkg.molecule?.apiFramework as string) ?? DEFAULT_API_FRAMEWORK
  } catch (_error) {
    // package.json absent or unparseable — safe to fall back to express default
    return DEFAULT_API_FRAMEWORK
  }
}

/**
 * Get the framework config for a given API framework name.
 * Throws if the framework is not supported.
 */
function getApiFrameworkConfig(apiFramework: string): ApiFrameworkConfig {
  const frameworks = getApiFrameworks()
  const fw = frameworks[apiFramework]
  if (!fw) {
    throw new Error(
      `Unsupported API framework: ${apiFramework}. Supported: ${Object.keys(frameworks).join(', ')}`,
    )
  }
  return fw
}

// =============================================================================
// AI System Prompts
// =============================================================================

function buildWrapperPrompt(): string {
  const resourcePkg = requirePackageByRole('api', 'infrastructure', 'resource')
  return `You are a code generator for the molecule framework.
Generate resource wrapper files that bridge molecule packages to the project structure.

Rules:
- If the package exports createRequestHandlerMap, call it with createRequestHandler from ${resourcePkg}
- If it exports requestHandlerMap directly, re-export it
- Re-export any extra exports described in README.md (like authorization)
- Output ONLY the TypeScript code, no explanation`
}

const MOCK_PROMPT = `You are a code generator for the molecule framework.
Generate vi.mock() calls for all molecule packages used in a project's test suite.

Rules:
- Packages with testMock metadata in the registry: use the specified mock exports
- Resource packages with createRequestHandlerMap: mock the factory returning vi.fn() handlers
- Resources exporting authorization: mock verifyMiddleware as no-op middleware
- OAuth packages: mock { verify: vi.fn() }
- Middleware packages: use Proxy returning no-op middleware
- Generic packages: mock as empty object
- Output ONLY the vi.mock() calls, no explanation`

export interface InjectionPlan {
  molecule: string
  moleculePackage: InferredPackage
  files: FileOperation[]
  dependencies: DependencyChange[]
  migrations: MigrationFile[]
  bondSetup: BondSetup | null
  conflicts: Conflict[]
  /**
   * Resource migrations that could NOT be planned because the package's SQL
   * file could not be read — one message per table. A migration absent from
   * `migrations` for this reason must surface as a FAILED injection (the
   * resource's table would be missing at runtime), not a silent success; the
   * inject command warns on each and exits 1.
   */
  migrationFailures?: string[]
}

export interface FileOperation {
  action: 'create' | 'modify' | 'copy' | 'transform'
  sourcePath?: string
  targetPath: string
  content?: string
  description: string
  transformations?: FileTransformation[]
}

export interface FileTransformation {
  type: 'replace-import' | 'replace-path' | 'replace-string'
  from: string
  to: string
}

export interface DependencyChange {
  name: string
  version: string
  type: 'dependency' | 'devDependency' | 'peerDependency'
}

export interface MigrationFile {
  name: string
  content: string
  tableName: string
}

export interface BondSetup {
  providerPackage: string
  interfacePackage: string
  interfaceType: string
  setupCode: string
}

export interface Conflict {
  path: string
  message: string
  resolution?: 'skip' | 'overwrite' | 'merge'
}

export interface InjectionResult {
  success: boolean
  filesCreated: string[]
  filesModified: string[]
  errors: string[]
  warnings: string[]
}

export interface InjectionOptions {
  dryRun?: boolean
  force?: boolean
  autoInstall?: boolean
  verbose?: boolean
}

/**
 * Find molecule package path in node_modules or via file: protocol paths.
 * Walks up the directory tree to handle npm workspaces where packages
 * are hoisted to the workspace root's node_modules. Also checks the
 * project's package.json for file: protocol entries (monorepo dev).
 */
export async function findMoleculePackage(
  moleculeName: string,
  projectPath: string,
): Promise<string | null> {
  // Check node_modules (walk up for workspace hoisting)
  let current = projectPath
  const root = dirname(current) === current ? current : '/'

  while (current !== root) {
    const candidate = join(current, 'node_modules', moleculeName)
    try {
      await access(candidate)
      return candidate
    } catch (_error) {
      // access() throws when the candidate doesn't exist — safe to walk up
    }
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }

  // Check file: protocol paths in package.json (for --skip-install / monorepo dev)
  try {
    const packageJsonPath = join(projectPath, 'package.json')
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
    const version =
      packageJson.dependencies?.[moleculeName] ?? packageJson.devDependencies?.[moleculeName]
    if (version && version.startsWith('file:')) {
      const filePath = version.slice(5) // Remove 'file:' prefix
      const resolved = filePath.startsWith('/') ? filePath : join(projectPath, filePath)
      try {
        await access(resolved)
        return resolved
      } catch (_error) {
        // file: path not accessible — safe to skip, other resolution paths follow
      }
    }
  } catch (_error) {
    // package.json absent or unreadable — safe to skip, other resolution paths follow
  }

  // Final fallback: use the centralized registry's `path` field, which
  // points at the canonical location of each @molecule/* package in the
  // monorepo (e.g. `packages/api/core/entitlements`). Resolved relative
  // to the molecule monorepo dir (overridable via MOLECULE_PACKAGES_DIR).
  // This unblocks `mlcl create --skip-install`: the inject step previously
  // bailed because it couldn't read the molecule packages from a missing
  // node_modules; now it reads them straight from the registry path.
  //
  // Gated on the project actually declaring the dependency — otherwise an
  // unrelated empty directory would resolve to the workspace's molecule
  // copy and surface a "found" result the caller never asked for.
  let projectDeclaresDependency = false
  try {
    const packageJsonPath = join(projectPath, 'package.json')
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
    projectDeclaresDependency =
      packageJson.dependencies?.[moleculeName] !== undefined ||
      packageJson.devDependencies?.[moleculeName] !== undefined
  } catch (_error) {
    // No package.json — treat as not declared, fall through to null.
  }
  if (projectDeclaresDependency) {
    try {
      const allRegistry = loadRegistry()
      const entry = allRegistry.find((p) => p.name === moleculeName)
      if (entry?.path) {
        try {
          await access(entry.path)
          return entry.path
        } catch (_error) {
          // registry path not accessible (unusual — registry is sync'd); safe to fall through
        }
      }
    } catch (_error) {
      // registry unreadable — safe to give up and return null
    }
  }

  return null
}

/**
 * Plan injection for a molecule
 */
export async function planInjection(
  moleculeName: string,
  projectPath: string,
  sharedCodeDir?: string,
): Promise<InjectionPlan> {
  const plan: InjectionPlan = {
    molecule: moleculeName,
    moleculePackage: null as unknown as InferredPackage,
    files: [],
    dependencies: [],
    migrations: [],
    bondSetup: null,
    conflicts: [],
  }

  // The name is data (see isPackageNameShaped) and every path, identifier and
  // dependency key below is derived from it, so it is checked before any of them
  // exists. The refusal rides the resolution-failure channel the inject command
  // already warns on and exits non-zero for — and a plan with no package
  // contributes no files to execute, so `--force` cannot carry it past this.
  if (!isPackageNameShaped(moleculeName)) {
    plan.conflicts.push({
      path: moleculeName,
      message:
        `"${moleculeName}" is not a package name — its segments become paths and identifiers ` +
        'inside the project, so a name carrying a path separator or a ".." segment is refused.',
    })
    return plan
  }

  // Find the molecule package
  const packagePath = await findMoleculePackage(moleculeName, projectPath)
  if (!packagePath) {
    plan.conflicts.push({
      path: moleculeName,
      message: t('lib.injector.errors.packageNotFound', { name: moleculeName }),
    })
    return plan
  }

  // Scan the molecule package
  try {
    plan.moleculePackage = await scanPackage(packagePath)
  } catch (error) {
    plan.conflicts.push({
      path: packagePath,
      message: t('lib.injector.errors.scanFailed', { error: String(error) }),
    })
    return plan
  }

  const pkg = plan.moleculePackage

  // The name a package declares about ITSELF is data too — `scanPackage` reads
  // it from the package.json — and it becomes the dependency key this plan
  // writes into the manifest and the import specifier in generated code. Same
  // rule, same refusal; recorded as a resolution failure so the plan
  // contributes nothing.
  if (!isPackageNameShaped(pkg.name)) {
    plan.conflicts.push({
      path: packagePath,
      message:
        `the package at ${packagePath} declares the name "${String(pkg.name)}", which is not a ` +
        'package name — refusing to inject it.',
    })
    plan.moleculePackage = null as unknown as InferredPackage
    return plan
  }

  // Plan file operations based on package type
  if (pkg.type === 'resource' && pkg.molecule?.middlewareMountPath) {
    // Router-factory resource (e.g. api-resource-invoice's createInvoiceRouter):
    // mounts as a route set at its registry-declared path, same as route-set
    // middleware — the App/Resource requestHandlerMap convention doesn't apply.
    await planMiddlewareInjection(plan, pkg, projectPath)
  } else if (pkg.type === 'resource') {
    await planResourceInjection(plan, pkg, projectPath)
  } else if (pkg.type === 'bond') {
    await planBondInjection(plan, pkg, projectPath, sharedCodeDir)
  } else if (pkg.type === 'middleware') {
    await planMiddlewareInjection(plan, pkg, projectPath)
  } else {
    // Generic package - just add as dependency
  }

  // Add the main package as dependency
  plan.dependencies.push({
    name: pkg.name,
    version: `${pkg.version}`,
    type: 'dependency',
  })

  // Add dependencies from package.json (non-molecule ones)
  for (const [name, version] of Object.entries(pkg.dependencies)) {
    if (!name.startsWith('@molecule/')) {
      plan.dependencies.push({ name, version: version as string, type: 'dependency' })
    }
  }

  // Add peer dependencies
  for (const [name, version] of Object.entries(pkg.peerDependencies)) {
    plan.dependencies.push({ name, version: version as string, type: 'peerDependency' })
  }

  return plan
}

/**
 * Plan injection for a Resource type molecule
 */
async function planResourceInjection(
  plan: InjectionPlan,
  pkg: InferredPackage,
  projectPath: string,
): Promise<void> {
  // Resource wrappers and router wiring are handled by synthesizeProjectFiles().
  // This function only plans SQL migrations.

  // Plan SQL migrations
  for (const table of pkg.tables) {
    if (table.sqlFile) {
      // The SQL path is metadata too (see {@link isInside}), and it is read and
      // then written into the project as a migration: a `../…` escape copies a
      // file from OUTSIDE the package — `/etc/passwd`, another project's
      // `.env` — into the user's repo, where it is committed. Refuse it as the
      // unreadable-SQL failure it is (the migration cannot be produced).
      if (!isInside(pkg.path, table.sqlFile)) {
        plan.migrationFailures = [
          ...(plan.migrationFailures ?? []),
          `${table.name}: ${table.sqlFile} is outside ${pkg.path} — refusing to read it`,
        ]
        continue
      }
      try {
        const sqlContent = await readFile(table.sqlFile, 'utf-8')
        const timestamp = Date.now()
        // The table name is interpolated into a FILE NAME below; flatten any
        // path separator in it so the migration stays inside `migrations/`
        // (see {@link migrationFileTableSegment}).
        const migrationName = `${timestamp}_create_${migrationFileTableSegment(table.name)}_table.sql`

        // Check for existing migration
        const migrationsDir = join(projectPath, 'migrations')
        const existingMigration = await checkMigrationExists(migrationsDir, table.name)
        if (existingMigration) {
          plan.conflicts.push({
            path: existingMigration,
            message: t('lib.injector.errors.migrationExists', { table: table.name }),
            resolution: 'skip',
          })
        } else {
          plan.migrations.push({
            name: migrationName,
            content: sqlContent,
            tableName: table.name,
          })
        }
      } catch (error) {
        // A migration whose SQL file cannot be read must not vanish into a
        // console.warn: the preview omits it, the injection exits 0, and the
        // resource's table is missing at runtime ("relation does not exist").
        // Record it on the plan — the inject command warns on each entry and
        // fails the request with exit 1, the same policy an unresolvable
        // package gets.
        plan.migrationFailures = [
          ...(plan.migrationFailures ?? []),
          `${table.name}: could not read ${table.sqlFile} — ${String(error)}`,
        ]
      }
    }
  }
}

/**
 * Plan injection for a Bond/Provider type molecule
 */
async function planBondInjection(
  plan: InjectionPlan,
  pkg: InferredPackage,
  projectPath: string,
  sharedCodeDir?: string,
): Promise<void> {
  const bondName = extractBondName(pkg.name)

  // A provider the registry marks `bondWiring.type: 'none'` is wired by the project
  // itself, never into src/bonds/ — test tooling such as the e2e bonds, which the
  // scaffolded e2e/bonds.ts wires at test time. Wiring it here would import a Node
  // test driver (and Playwright) into the app's client bundle (found 2026-09-12:
  // `vite build` failed resolving playwright-core's internals).
  const wiring = (pkg.molecule?.bondWiring ??
    findRegistryPackage(pkg.name)?.molecule?.bondWiring) as { type?: string } | undefined
  if (wiring?.type === 'none') return

  // Primary: use registry `implements` field (single source of truth)
  // Check both the package's own molecule metadata and the centralized registry
  const registryImplements =
    pkg.molecule?.implements ?? findRegistryPackage(pkg.name)?.molecule?.implements

  // Fallback: infer the interface package from the package name pattern
  // @molecule/api-emails-sendgrid -> @molecule/api-emails
  // @molecule/api-payments-stripe -> @molecule/api-payments
  const categoryMatch = registryImplements ? null : pkg.name.match(/@molecule\/(api|app)-([^-]+)-/)
  const inferredInterface = categoryMatch
    ? `@molecule/${categoryMatch[1]}-${categoryMatch[2]}`
    : null

  // Find the interface package: registry first, then inferred, then peer dep scan
  const interfacePackage =
    registryImplements ??
    (inferredInterface && pkg.peerDependencies[inferredInterface]
      ? inferredInterface
      : Object.keys(pkg.peerDependencies).find(
          (dep) =>
            dep.startsWith('@molecule/') &&
            !dep.includes(bondName) &&
            !findRegistryPackage(dep)?.molecule?.alwaysInclude &&
            !dep.includes('-bond'),
        ))

  if (interfacePackage) {
    const interfaceType = extractInterfaceType(interfacePackage)
    const setupCode = await generateBondSetupCode(pkg, bondName, interfacePackage, projectPath)

    plan.bondSetup = {
      providerPackage: pkg.name,
      interfacePackage,
      interfaceType,
      setupCode,
    }

    // Create bonds directory and setup file
    const bondsDir = sharedCodeDir
      ? join(projectPath, 'src', sharedCodeDir, 'bonds')
      : join(projectPath, 'src', 'bonds')
    const setupPath = join(bondsDir, `${bondName}.ts`)

    const conflict = await checkConflict(setupPath)
    if (conflict) {
      plan.conflicts.push(conflict)
    }

    // Always add the file operation so --force can overwrite
    plan.files.push({
      action: 'create',
      targetPath: setupPath,
      content: setupCode,
      description: t('lib.injector.descriptions.createBond', { name: bondName }),
    })

    // Create bonds index.ts to export all setups
    const indexPath = join(bondsDir, 'index.ts')
    plan.files.push({
      action: 'modify',
      targetPath: indexPath,
      description: t('lib.injector.descriptions.addBondExport', { name: bondName }),
      content: `export * from './${bondName}.js'\n`,
    })
  }
}

/**
 * Plan injection for a Middleware type molecule
 */
async function planMiddlewareInjection(
  plan: InjectionPlan,
  pkg: InferredPackage,
  projectPath: string,
): Promise<void> {
  // `shortName` is package METADATA and becomes both a path segment and a
  // generated identifier below, so it is only used when it is a safe single
  // segment (see {@link isSafeShortName}); a declared value that is not names
  // no file, and the (validated) package name derives the fallback instead.
  const declaredShortName = pkg.molecule?.shortName
  const middlewareName = isSafeShortName(declaredShortName)
    ? declaredShortName
    : extractShortName(pkg.name)

  // Create middleware setup file
  const setupPath = join(projectPath, 'src', 'middleware', `${middlewareName}.ts`)

  const conflict = await checkConflict(setupPath)
  if (conflict) {
    plan.conflicts.push(conflict)
  }

  // Always add the file operation so --force can overwrite
  const fw = getProjectApiFramework(projectPath)
  plan.files.push({
    action: 'create',
    targetPath: setupPath,
    content: await generateMiddlewareSetup(pkg, middlewareName, fw),
    description: t('lib.injector.descriptions.createMiddleware', { name: middlewareName }),
  })

  // Registry-declared companion config (e.g. billing-routes → src/tiers.ts):
  // the app-specific data the create* factory needs, scaffolded with a
  // self-documenting template from the package's registry entry.
  const middlewareSetup = pkg.molecule?.middlewareSetup as
    { configFile?: string; configTemplate?: string } | undefined
  if (middlewareSetup?.configFile && middlewareSetup.configTemplate) {
    // `configFile` is metadata (see {@link isInside}) and its CONTENT is the
    // package's `configTemplate`: written uncontained, a `../…` declaration
    // put attacker-chosen bytes at any path the injecting user can write —
    // outside the project this command was asked to edit. A declaration that
    // escapes is surfaced as a conflict and NOT planned, so nothing is written
    // there (the sibling fonts.json containment in scaffold.ts warns and skips
    // for the same reason).
    const configTarget = containedProjectPath(projectPath, middlewareSetup.configFile)
    if (configTarget === null) {
      plan.conflicts.push({
        path: middlewareSetup.configFile,
        message:
          `${pkg.name} declares its config file at ${middlewareSetup.configFile}, ` +
          `which is outside ${projectPath} — skipped`,
        resolution: 'skip',
      })
    } else {
      // Guarded like the sibling writes above. This file is the app's own DATA —
      // the package's registry template tells the reader to "add/rename tiers
      // freely" — and a re-run of `mlcl inject` (the CLI's own remedy for a
      // failed install) re-plans EVERY `@molecule/*` dep the manifest declares,
      // not just the unwired ones. Without a conflict here the stock template
      // replaced whatever the user had edited, with no warning and no `--force`
      // to opt in; with it the write is skipped and the user is told, exactly
      // like the middleware/bond setup files beside it.
      const configConflict = await checkConflict(configTarget)
      if (configConflict) {
        plan.conflicts.push(configConflict)
      }
      plan.files.push({
        action: 'create',
        targetPath: configTarget,
        content: middlewareSetup.configTemplate,
        description: t('lib.injector.descriptions.createMiddleware', { name: middlewareName }),
      })
    }
  }
}

/**
 * Capture a file's pre-injection content for rollback, before any write
 * touches it.
 *
 * The FIRST capture for a path wins — a plan may write the same target more
 * than once (a create followed by a transform), and rollback must land on the
 * state BEFORE the injection, not on an intermediate one. A `null` entry marks
 * a file the injection itself created: rollback removes it, while a captured
 * Buffer (binary-safe — no utf-8 round trip) is restored verbatim. Without the
 * snapshot, rollback `rm`'d every target — including files like `server.ts` or
 * `src/scripts/migrate.ts` that predate the injection and were only
 * OVERWRITTEN, so a failed inject left the project strictly worse than before.
 */
async function snapshotForRollback(
  path: string,
  snapshots: Map<string, Buffer | null>,
): Promise<void> {
  if (snapshots.has(path)) return
  try {
    snapshots.set(path, await readFile(path))
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      // ENOENT — the file does not exist yet; the injection creates it.
      snapshots.set(path, null)
      return
    }
    // Any OTHER read failure (EACCES on an unreadable file, EISDIR on a
    // directory at that path) must NOT be recorded as `null` — that entry
    // marks the file "created by this injection", so the rollback rm()s a
    // file that PREDATES the inject, deleting content this inject never
    // even read (verified 2026-10-10: a failed inject over a mode-000 file
    // deleted it). Rethrow: the write this snapshot precedes cannot succeed
    // either, so the caller reports the failure and the file is left
    // exactly as it was — unchanged, never worse.
    throw error
  }
}

/** What {@link writeSynthesizedFiles} did. */
export interface SynthesizedFilesWrite {
  /** The files written before the loop ended (on success or on failure). */
  written: string[]
  /** The failure message when a write failed; null when every file landed. */
  error: string | null
}

/**
 * Write the synthesized project files (router.ts, server.ts, bonds/index.ts,
 * src/scripts/migrate.ts, …) under the injector's rollback policy: a failed
 * inject may leave the project unchanged, never worse.
 *
 * Each target's pre-write content is captured BEFORE the first write touches
 * it (first capture wins, so a target the list writes twice rolls back to its
 * pre-injection state). On the first failure, every file the loop already
 * wrote is restored — files the injection itself created are removed, files
 * that predate it are put back byte-for-byte — and the remaining files are
 * not attempted.
 *
 * The command loop this replaces rolled back with a bare `rm` of everything
 * it had written. On a re-inject that set includes server.ts, router.ts,
 * bonds/index.ts and src/scripts/migrate.ts — files that PREDATE the
 * injection and were only overwritten — so one failed write (a target whose
 * parent path is a file, a full disk) deleted the project's working entry
 * point and left it strictly worse than before: the exact bug the plan
 * executor's rollback was fixed for.
 */
export async function writeSynthesizedFiles(
  files: readonly FileOperation[],
): Promise<SynthesizedFilesWrite> {
  const snapshots = new Map<string, Buffer | null>()
  const written: string[] = []
  for (const file of files) {
    try {
      if (!file.content) continue
      await mkdir(dirname(file.targetPath), { recursive: true })
      await snapshotForRollback(file.targetPath, snapshots)
      await writeFile(file.targetPath, file.content)
      written.push(file.targetPath)
    } catch (error) {
      for (const [path, priorContent] of snapshots) {
        try {
          if (priorContent === null) {
            await rm(path, { force: true })
          } else {
            await writeFile(path, priorContent)
          }
        } catch (_error) {
          // Rollback is best-effort; the primary failure is reported below.
        }
      }
      return { written, error: `Failed to write ${file.targetPath}: ${String(error)}` }
    }
  }
  return { written, error: null }
}

/**
 * Execute the injection plan
 */
export async function executeInjection(
  plan: InjectionPlan,
  projectPath: string,
  options: InjectionOptions = {},
): Promise<InjectionResult> {
  const result: InjectionResult = {
    success: true,
    filesCreated: [],
    filesModified: [],
    errors: [],
    warnings: [],
  }

  if (options.dryRun) {
    return result
  }

  const rollbackSnapshots = new Map<string, Buffer | null>()

  try {
    // Execute file operations
    for (const op of plan.files) {
      // Skip if conflict and not forced
      const hasConflict = plan.conflicts.some(
        (c) => c.path === op.targetPath && c.resolution !== 'overwrite',
      )
      if (hasConflict && !options.force) {
        result.warnings.push(t('lib.injector.warnings.skippedConflict', { path: op.targetPath }))
        continue
      }

      // Ensure directory exists
      await mkdir(dirname(op.targetPath), { recursive: true })

      if (op.action === 'copy' && op.sourcePath) {
        await snapshotForRollback(op.targetPath, rollbackSnapshots)
        if (op.transformations && op.transformations.length > 0) {
          // Read, transform, and write
          let content = await readFile(op.sourcePath, 'utf-8')
          for (const transform of op.transformations) {
            content = applyTransformation(content, transform)
          }
          await writeFile(op.targetPath, content)
        } else {
          await copyFile(op.sourcePath, op.targetPath)
        }
        result.filesCreated.push(op.targetPath)
      } else if (op.action === 'create' && op.content) {
        await snapshotForRollback(op.targetPath, rollbackSnapshots)
        const content = /\.(ts|tsx|mjs)$/.test(op.targetPath)
          ? sortImportStatements(op.content)
          : op.content
        await writeFile(op.targetPath, content)
        result.filesCreated.push(op.targetPath)
      } else if (op.action === 'transform' && op.sourcePath) {
        await snapshotForRollback(op.targetPath, rollbackSnapshots)
        let content = await readFile(op.sourcePath, 'utf-8')
        if (op.transformations) {
          for (const transform of op.transformations) {
            content = applyTransformation(content, transform)
          }
        }
        await writeFile(op.targetPath, content)
        result.filesCreated.push(op.targetPath)
      } else if (op.action === 'modify') {
        // Append content if file exists, create if not
        try {
          const existing = await readFile(op.targetPath, 'utf-8')
          if (op.content && !existing.includes(op.content.trim())) {
            await snapshotForRollback(op.targetPath, rollbackSnapshots)
            await writeFile(op.targetPath, existing + op.content)
            result.filesModified.push(op.targetPath)
          }
        } catch (error) {
          // Only ENOENT means "the file does not exist yet" and may be created
          // from scratch. Any other read failure (EACCES on an unreadable file)
          // must surface as a failed op: treating it as "create" would
          // blind-overwrite content this inject could not read, and the
          // rollback snapshot would then rm() a file that predates the inject.
          if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') throw error
          if (op.content) {
            await snapshotForRollback(op.targetPath, rollbackSnapshots)
            await writeFile(op.targetPath, op.content)
            result.filesCreated.push(op.targetPath)
          }
        }
      }
    }

    // Create migrations
    if (plan.migrations.length > 0) {
      const migrationsDir = join(projectPath, 'migrations')
      await mkdir(migrationsDir, { recursive: true })

      for (const migration of plan.migrations) {
        const migrationPath = join(migrationsDir, migration.name)
        await snapshotForRollback(migrationPath, rollbackSnapshots)
        await writeFile(migrationPath, migration.content)
        result.filesCreated.push(migrationPath)
      }
    }

    // Update package.json dependencies
    if (plan.dependencies.length > 0) {
      // Snapshotted like every other write: a manifest write that fails
      // mid-flight (a full disk) must roll back to the pre-injection bytes,
      // not leave the project a corrupt package.json — the one write that
      // used to sit outside the rollback set.
      await snapshotForRollback(join(projectPath, 'package.json'), rollbackSnapshots)
      await updatePackageJson(projectPath, plan.dependencies)
      result.filesModified.push(join(projectPath, 'package.json'))
    }

    // Auto-install dependencies
    if (options.autoInstall !== false && plan.dependencies.length > 0) {
      try {
        await runNpmInstall(projectPath)
      } catch (error) {
        result.warnings.push(t('lib.injector.warnings.npmInstallFailed', { error: String(error) }))
      }
    }
  } catch (error) {
    result.success = false
    result.errors.push(t('lib.injector.errors.injectionFailed', { error: String(error) }))

    // Roll back file writes: files the injection CREATED are removed, files
    // that existed before are restored to their pre-injection content.
    if (!options.dryRun) {
      for (const [file, priorContent] of rollbackSnapshots) {
        try {
          if (priorContent === null) {
            await rm(file, { force: true })
          } else {
            await writeFile(file, priorContent)
          }
        } catch (_error) {
          // Rollback is best-effort; if the restore fails the file may linger
          // but the primary error is already recorded in result.errors above.
        }
      }
      // The rollback removed or restored every write recorded above, so none
      // of them exist in their written state any more. The caller totals these
      // arrays into the run summary — a failed plan's rolled-back writes
      // counted there reported "Created N files" for files that are gone.
      result.filesCreated.length = 0
      result.filesModified.length = 0
    }
  }

  return result
}

/**
 * Derive the exact version a range is pinned to in the target project: the
 * range's floor.
 *
 * peerDependencies use ranges for npm compatibility, but target projects must
 * pin. A range may be a `||` union (`^4.0.0 || ^5.0.0` — how express, react
 * and vite peers are declared across the fleet), so stripping one leading
 * operator is not enough: `4.0.0 || ^5.0.0` is still a range, and npm would
 * resolve it at install time in a manifest that must pin exact. The floor of
 * a union is the lowest concrete version any alternative admits, and every
 * alternative the fleet declares carries its floor as a literal — so take the
 * lowest literal.
 *
 * "Concrete" means the alternative STATES a full `x.y.z`: a comparator is
 * stripped and the first three-part literal is the floor. An alternative that
 * states less — `*`, `latest`, `1.x`, and equally a two-part `~1.2` — is
 * REFUSED rather than shipped. npm gives the short forms a floor of their own
 * (`~1.2` → 1.2.0, `1.x` → 1.0.0), but the declaration does not state it, and
 * this pin is written into the target manifest as the version the project
 * depends on: it must be the version the declaration named, not one this
 * function inferred. The caller's rollback reports the refusal and the target
 * manifest is never left with an unpinned dependency.
 *
 * @param version - The declared range (single comparator, bare version, or
 *   `||` union of those).
 * @returns The exact version to pin.
 * @throws When no alternative states a full `x.y.z` literal to pin.
 */
function pinVersion(version: string): string {
  const floors: Array<readonly [number, number, number]> = []
  for (const alternative of version.split('||')) {
    const literal = alternative
      .trim()
      .replace(/^[\^~>=v]+\s*/, '')
      .match(/(\d+)\.(\d+)\.(\d+)/)
    if (literal) {
      floors.push([Number(literal[1]), Number(literal[2]), Number(literal[3])])
    }
  }
  if (floors.length === 0) {
    throw new Error(
      `Cannot pin the dependency declared with the range '${version}': it has no concrete ` +
        `version floor to pin exactly. Declare it with concrete versions (e.g. '^1.0.0').`,
    )
  }
  const lowest = floors.reduce((min, floor) =>
    floor[0] < min[0] ||
    (floor[0] === min[0] && (floor[1] < min[1] || (floor[1] === min[1] && floor[2] < min[2])))
      ? floor
      : min,
  )
  return `${lowest[0]}.${lowest[1]}.${lowest[2]}`
}

/**
 * Resolve the exact version a peer dependency gets pinned to in the target project.
 *
 * For a `@molecule/*` peer the registry is the authority: `moleculeVersions`
 * (per-package `overrides` first, then the lockstep `default`) is the same map
 * `mlcl create` scaffolds every other @molecule pin from. Stripping the prefix
 * off the peer RANGE instead pins the range's floor — the oldest version the
 * package still tolerates, not the one the fleet ships — so a package whose peer
 * says `^1.0.1` while the registry override says `1.1.0` landed a project on
 * 1.0.1 and had to be re-pinned by hand afterwards.
 *
 * Anything else (react, express, a third-party lib) has no registry entry, so it
 * keeps the range floor.
 */
function pinPeerVersion(name: string, range: string): string {
  return name.startsWith('@molecule/') ? getMoleculeVersion(name) : pinVersion(range)
}

/**
 * Update package.json with new dependencies
 */
async function updatePackageJson(
  projectPath: string,
  dependencies: DependencyChange[],
): Promise<void> {
  const packageJsonPath = join(projectPath, 'package.json')
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))

  for (const dep of dependencies) {
    if (dep.type === 'dependency') {
      packageJson.dependencies = packageJson.dependencies ?? {}
      // Don't overwrite existing versions
      if (!packageJson.dependencies[dep.name]) {
        packageJson.dependencies[dep.name] = dep.version
      }
    } else if (dep.type === 'devDependency') {
      packageJson.devDependencies = packageJson.devDependencies ?? {}
      if (!packageJson.devDependencies[dep.name]) {
        packageJson.devDependencies[dep.name] = dep.version
      }
    } else if (dep.type === 'peerDependency') {
      // Peer dependencies are added as regular dependencies in the target project,
      // always as an exact pin (peerDeps use ^/~/>= ranges) — from the registry for
      // a @molecule peer, from the range floor otherwise. See pinPeerVersion.
      // Skip if already satisfied by devDependencies (e.g., framework packages like svelte, react).
      packageJson.dependencies = packageJson.dependencies ?? {}
      const inDevDeps = packageJson.devDependencies?.[dep.name]
      if (!packageJson.dependencies[dep.name] && !inDevDeps) {
        packageJson.dependencies[dep.name] = pinPeerVersion(dep.name, dep.version)
      }
    }
  }

  // Sort dependencies alphabetically
  if (packageJson.dependencies) {
    packageJson.dependencies = sortObject(packageJson.dependencies)
  }
  if (packageJson.devDependencies) {
    packageJson.devDependencies = sortObject(packageJson.devDependencies)
  }

  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
}

/**
 * Run npm install in the project
 */
async function runNpmInstall(projectPath: string): Promise<void> {
  await execa('npm', ['install'], {
    cwd: projectPath,
    stdio: 'pipe', // Don't inherit to avoid cluttering output
  })
}

/**
 * Drop the peer dependencies a framework's `excludePeerDependencies` names
 * from every plan's dependency list — `react-native` for the frameworks that
 * alias it to a DOM shim, per the registry's appFrameworks entry. Mutates the
 * plans in place (the inject command calls this right after planning, before
 * execution). Only `peerDependency` entries are filtered: a REGULAR
 * dependency that merely shares the name stays — the exclusion names what the
 * FRAMEWORK tolerates dropping when it arrives as a peer suggestion, not a
 * ban on the package itself.
 */
export function filterExcludedPeerDependencies(
  plans: InjectionPlan[],
  excludedPeers: readonly string[],
): void {
  if (excludedPeers.length === 0) return
  for (const plan of plans) {
    plan.dependencies = plan.dependencies.filter(
      (dep) => dep.type !== 'peerDependency' || !excludedPeers.includes(dep.name),
    )
  }
}

// Helper functions

/**
 * Whether `name` is shaped like an npm package name: an optional single
 * `@scope/` prefix and body segments of `[A-Za-z0-9-._]`, with at least one
 * alphanumeric character per segment (so no segment is `.` or `..`, and none is
 * a bare separator run).
 *
 * Every molecule name the injector works with is DATA — `mlcl inject` reads the
 * pending molecules from the target manifest's `@molecule/*` dependency keys,
 * and a package's own `package.json` declares the name {@link scanPackage}
 * reports — and the injector uses that string VERBATIM as a path segment
 * (`src/App/Resource/<name>/index.ts`), as a generated identifier, and as a
 * dependency key it writes back into the manifest. `join()` resolves `../`
 * happily, so an unvalidated name walks the generated file out of the project
 * being injected into (an arbitrary write), which is the same class of escape
 * {@link isInside} closes for metadata-declared file paths. A real package name
 * can never fail this check; a path can never pass it.
 *
 * @param name - The candidate package name.
 * @returns True when the name is safe to use as a name.
 */
export function isPackageNameShaped(name: unknown): boolean {
  if (typeof name !== 'string') return false
  const segments = name.split('/')
  // `split` always yields at least one element, so only the upper bound is a real
  // check — an empty name is refused by the character test below.
  if (segments.length > 2) return false
  if (segments.length === 2 && !segments[0]!.startsWith('@')) return false
  return segments.every((segment, index) => {
    // The scope's leading `@` is part of the name, not of the segment's body.
    const body = index === 0 ? segment.replace(/^@/, '') : segment
    return /^[A-Za-z0-9-._]+$/.test(body) && /[A-Za-z0-9]/.test(body)
  })
}

/**
 * Whether `name` is safe to use as ONE path segment AND as the source of a
 * JavaScript identifier: a single run of `[A-Za-z0-9_-]` carrying at least one
 * alphanumeric character, whose camelCase form ({@link camelizeShortName}) is
 * ITSELF already a valid identifier.
 *
 * `molecule.shortName` is metadata (same trust story as {@link isPackageNameShaped}):
 * {@link scanPackage} reads it from the INSTALLED package's own `package.json`
 * for every package the registry does not list, so a third-party package
 * declares it. The middleware plan uses it VERBATIM as a path segment —
 * `join(projectPath, 'src', 'middleware', \`${name}.ts\`)` — so an unvalidated
 * `"shortName": "../../../../x"` turned `mlcl inject` into an arbitrary write
 * outside the project (the same escape {@link isPackageNameShaped} closes for
 * the package name, {@link containedProjectPath} for `configFile`, and
 * {@link isInside} for a table's `sqlFile`). The name is ALSO the source of the
 * identifier the generated setup declares (`export const
 * ${camelizeShortName(name)}Middleware`), so a name whose camelCase is not a
 * legal identifier — `x-` (a trailing separator), `9-lives` (a leading digit) —
 * is refused here rather than emitted as `x-Middleware`, a syntax error the
 * project cannot compile. A refusal costs nothing: the (validated) package name
 * derives the fallback instead ({@link extractShortName}), and where that
 * fallback is the ONLY source — no declared shortName — {@link
 * middlewareIdentifier} makes the identifier valid by construction. A real
 * short name (`body-parser`, `cors`, `validation`) always passes; a path never
 * can.
 *
 * @param name - The candidate short name (package metadata; any value in).
 * @returns True when the name is a safe single-segment name.
 */
export function isSafeShortName(name: unknown): name is string {
  return (
    typeof name === 'string' &&
    /^[A-Za-z0-9_-]+$/.test(name) &&
    /[A-Za-z0-9]/.test(name) &&
    /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(camelizeShortName(name))
  )
}

/**
 * kebab-case → camelCase, the rule every generator site already used
 * (`body-parser` → `bodyParser`). Private because the derived form that reaches
 * generated code is {@link middlewareIdentifier}, which sanitizes this result.
 *
 * @param name - The short name.
 * @returns The camelCase form (possibly still not a valid identifier).
 */
function camelizeShortName(name: string): string {
  return name.replace(/-(\w)/g, (_match: string, ch: string) => ch.toUpperCase())
}

/**
 * The identifier fragment a middleware name contributes to generated code.
 *
 * Every generator site embeds it — `export const ${…}Middleware` in the setup
 * file, `vi.mock('../middleware/<name>.js', () => ({ ${…}Middleware }))` and the
 * server's dynamic-import destructure — so all of them must derive the SAME
 * name, and it must always be a legal identifier:
 *
 * - kebab-case becomes camelCase (`body-parser` → `bodyParser`), the rule the
 *   generators already used;
 * - a digit-leading result is prefixed (`9-lives` → `_9Lives`) — `2fa` is a
 *   plausible package name (`@molecule/api-middleware-2fa`), and the derived
 *   name is used unconditionally when a package declares no `shortName`;
 * - anything else that cannot appear in an identifier is replaced with `_`, so
 *   the function is TOTAL: no name can make the generators emit a token the
 *   project cannot compile (`x-` → `x_`, not `x-Middleware`).
 *
 * The two synthesis sites used `-(\w)` and the setup generator used `-([a-z])`,
 * so a name with a dash before a digit (`my-2fa`) produced `my2faMiddleware`
 * where the server imported it and `my-2faMiddleware` — a syntax error — in the
 * file it pointed at.
 *
 * @param name - A short name (validated by {@link isSafeShortName} where it
 *   becomes a path segment; the derivation is safe for any input).
 * @returns A valid JavaScript identifier fragment.
 */
export function middlewareIdentifier(name: string): string {
  const sanitized = camelizeShortName(name).replace(/[^A-Za-z0-9_$]/g, '_')
  return /^[A-Za-z_$]/.test(sanitized) ? sanitized : `_${sanitized}`
}

/**
 * Extract a short name from a package name by stripping the @molecule/ prefix
 * and known type segments. Prefers registry shortName when available.
 */
function extractShortName(packageName: string): string {
  // Strip @molecule/ prefix and known type segments
  return packageName
    .replace('@molecule/', '')
    .replace(/^api-middleware-/, '')
    .replace(/^api-resource-/, '')
    .replace(/^api-/, '')
    .replace(/^app-/, '')
}

function extractResourceName(packageName: string): string {
  // The resource name comes from the PACKAGE NAME only. A "prefer the registry
  // label" branch used to stand here, but no caller ever passed a label (all
  // five call sites have always passed one argument), so it was unreachable
  // code that read like a working preference.
  // Parse from package name
  // @molecule/api-resource-user -> User
  const match = packageName.match(/@molecule\/api-resource-(\w+)/)
  if (match) {
    return match[1].charAt(0).toUpperCase() + match[1].slice(1)
  }
  // @molecule/api-users -> Users
  const match2 = packageName.match(/@molecule\/api-(\w+)/)
  if (match2) {
    return match2[1].charAt(0).toUpperCase() + match2[1].slice(1)
  }
  return packageName.replace('@molecule/', '')
}

export function extractBondName(packageName: string): string {
  // Use category-provider naming to avoid collisions
  // @molecule/api-emails-sendgrid -> emails-sendgrid
  // @molecule/api-oauth-github -> oauth-github
  // @molecule/api-payments-google -> payments-google
  // @molecule/api-database-postgresql -> database-postgresql
  // App bonds use the full name minus @molecule/ prefix:
  // @molecule/app-icons-molecule -> app-icons-molecule
  // @molecule/app-state-zustand -> app-state-zustand
  const match = packageName.match(/@molecule\/api-(.+)/)
  return match ? match[1] : packageName.replace('@molecule/', '')
}

/**
 * Convert kebab-case bond name to PascalCase for function names.
 * e.g., "oauth-github" -> "OauthGithub", "database-postgresql" -> "DatabasePostgresql"
 */
export function bondNameToPascal(bondName: string): string {
  return bondName
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function extractInterfaceType(packageName: string | undefined): string {
  if (!packageName) return 'custom'
  // @molecule/api-emails -> email
  const match = packageName.match(/@molecule\/api-(\w+)/)
  return match ? match[1].replace(/s$/, '') : 'custom'
}

async function checkConflict(path: string): Promise<Conflict | null> {
  try {
    await access(path)
    return {
      path,
      message: t('lib.injector.errors.fileExists', { path }),
      resolution: 'skip',
    }
  } catch (_error) {
    // access() throws when the file doesn't exist — that means no conflict; safe to return null
    return null
  }
}

/**
 * Find an existing migration covering a table, or null when none does.
 *
 * Matches the `_create_${table}_table.sql` TAIL of the canonical filename this
 * planner writes — `${timestamp}_create_${table}_table.sql` — and nothing
 * looser: a bare substring match also hit files for a LONGER table name that
 * merely contains this one (`_create_post_comments_table.sql` for table
 * `comments`), reported a false "migration exists" conflict, and the real
 * migration was silently never planned — the table then did not exist at
 * runtime ("relation does not exist"), and `--force` could not override it
 * because migrations bypass the file-op conflict machinery (the skip happens
 * here, at plan time). The anchor is a SUFFIX: any prefix before
 * `_create_…` is accepted, so a hand-renamed migration for the same table
 * (`legacy_create_comments_table.sql`) still counts as coverage — the safe
 * direction, since resource SQL is `CREATE TABLE IF NOT EXISTS` and a
 * redundant second migration would be a no-op at apply time. A missed match
 * is the harmless one by the same token.
 */
export async function checkMigrationExists(
  migrationsDir: string,
  tableName: string,
): Promise<string | null> {
  // The segment is transformed exactly like the filename the planner writes
  // (`migrationFileTableSegment`), or a table name carrying a separator would
  // never match the migration derived from it and every re-run would plan a
  // duplicate.
  const canonical = new RegExp(
    `_create_${escapeRegExp(migrationFileTableSegment(tableName))}_table\\.sql$`,
  )
  try {
    const files = await readdir(migrationsDir)
    const existing = files.find((f) => canonical.test(f))
    return existing ? join(migrationsDir, existing) : null
  } catch (_error) {
    // readdir throws when the migrations dir doesn't exist yet — safe to return null (no existing migration)
    return null
  }
}

function applyTransformation(content: string, transform: FileTransformation): string {
  switch (transform.type) {
    case 'replace-import':
    case 'replace-path':
    case 'replace-string':
      // `transform.to` is DATA (an import specifier, a path, a snippet a plan
      // computed), and a replacement STRING is not a literal: `$&` splices the
      // matched text back in, `$$` collapses to `$`, and `` $` ``/`$'` pull in
      // the surrounding content — silently corrupting the generated file. A
      // function replacement inserts the declared value verbatim. (`from` is
      // already escaped for its own reason — see escapeRegExp.)
      return content.replace(new RegExp(escapeRegExp(transform.from), 'g'), () => transform.to)
    default:
      return content
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sortObject<T extends Record<string, unknown>>(obj: T): T {
  return Object.keys(obj)
    .sort()
    .reduce((sorted, key) => {
      sorted[key as keyof T] = obj[key as keyof T]
      return sorted
    }, {} as T)
}

/**
 * Find the best setter export from the interface package.
 *
 * When the interface exports multiple setters (e.g. setProvider AND setClassMap),
 * we pick the one whose derived name matches an export from the bond package.
 * This ensures @molecule/app-ui-tailwind gets setClassMap (matches classMap export)
 * rather than setProvider (no matching export in the bond).
 *
 * When 'provider' is in the bond exports, we prefer the "simple" setter — the one
 * whose derived name does NOT match any other bond export — because 'provider' is the
 * correctly-typed export for that setter. This avoids pairing e.g. setJsonParserFactory
 * with 'provider' (a Middleware) when setBodyParser is the right match.
 */
async function findSetterExport(
  interfacePackagePath: string,
  bondExports?: string[],
): Promise<string | null> {
  const exports = await scanExportsFromPath(interfacePackagePath)
  const setters = exports.filter((e) => /^(set|register)[A-Z]/.test(e))

  if (setters.length === 0) return null
  if (setters.length === 1 || !bondExports || bondExports.length === 0) return setters[0]

  // A provider bond (exports `provider` or a `createProvider` factory) is wired via the
  // canonical `setProvider`. Prefer it over sibling setters that target OTHER concerns
  // (setPreferences, setTenant, setFlag, setClassMap, setLevel, …). Without this, a core
  // that exports setProvider AND another setter — e.g. notification-center (setPreferences +
  // setProvider), multi-tenancy (setTenant + setProvider), feature-flags (setFlag +
  // setProvider) — falls through to setters[0] (registry/scan order) and can pick the wrong
  // one, generating e.g. `setPreferences(createProvider())` → a TS2345 → verify=error.
  // Safe for classMap/bodyParser bonds: they don't export provider/createProvider (so this
  // never triggers) and are matched by the derived-name pass below.
  if (
    (bondExports.includes('provider') || bondExports.includes('createProvider')) &&
    setters.includes('setProvider')
  ) {
    return 'setProvider'
  }

  // When 'provider' is available in the bond, prefer the setter that accepts the base type
  // (its derived name won't match a specific bond export, or it derives to 'provider' itself)
  if (bondExports.includes('provider')) {
    const simpleSetters = setters.filter((s) => {
      const derived = s.replace(/^(set|register)/, '')
      const derivedExport = derived.charAt(0).toLowerCase() + derived.slice(1)
      return !bondExports.includes(derivedExport) || derivedExport === 'provider'
    })
    if (simpleSetters.length > 0) {
      // Several "simple" setters can survive the filter when the core has
      // multiple non-provider setters (logger: setLevel + setLogger — neither
      // derives to a bond export). Prefer the one named after the core itself
      // (set<PascalCase(core dir)> — logger → setLogger); simpleSetters[0] is
      // registry/scan order and picked setLevel(provider), a type error.
      let coreBase = interfacePackagePath.split('/').filter(Boolean).pop() ?? ''
      // When resolved through node_modules, the last segment is the full package
      // name (e.g. 'api-logger' not 'logger'). Strip the api-/app- stack prefix
      // so corePascal correctly derives e.g. 'Logger' → 'setLogger'.
      const stripped = coreBase.replace(/^(api|app)-/, '')
      if (stripped !== coreBase) coreBase = stripped
      const corePascal = coreBase
        .split(/[-_]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')
      const categorySetter = simpleSetters.find((s) => s === `set${corePascal}`)
      if (categorySetter) return categorySetter
      return simpleSetters[0]
    }
  }

  // No 'provider' in bond — pick the setter whose derived name matches a bond export
  for (const setter of setters) {
    const derived = setter.replace(/^(set|register)/, '')
    const derivedExport = derived.charAt(0).toLowerCase() + derived.slice(1)
    if (bondExports.includes(derivedExport)) return setter
  }

  return setters[0]
}

/**
 * Scan a bond package's exports to find its provider export.
 * Convention: the provider is named 'provider', 'pool', 'client', 'transport', 'logger', etc.
 *
 * Priority: 'provider' always wins (it's the modern, correctly-typed convention),
 * then setter-derived name, then other well-known names.
 */
async function findProviderExport(
  bondPackagePath: string,
  setterName?: string | null,
  registryProviderExportName?: string | null,
): Promise<string | null> {
  const exports = await scanExportsFromPath(bondPackagePath)

  // 'provider' always wins — it's the modern convention and correctly typed
  if (exports.includes('provider')) return 'provider'

  // Then try setter-derived name
  if (setterName) {
    const derived = setterName.replace(/^(set|register)/, '')
    const derivedExport = derived.charAt(0).toLowerCase() + derived.slice(1)
    if (exports.includes(derivedExport)) return derivedExport
  }

  // Fall back to registry-declared provider export name
  if (registryProviderExportName && exports.includes(registryProviderExportName)) {
    return registryProviderExportName
  }

  // Check for create* factory functions (e.g. createProvider, createPool). Return the
  // BARE export name — the caller detects the create* factory (via /^create[A-Z]/) and
  // appends the invoking `()` itself (setProvider(createProvider())). Do NOT return it
  // with `()` here, or the caller would double it.
  const createExport = exports.find((e) => /^create[A-Z]/.test(e))
  if (createExport) return createExport

  // Check for register* functions (e.g. registerTailwindClassMerger). These are
  // self-registering — the caller should import and invoke them directly without
  // a setter from the core interface.
  const registerExport = exports.find((e) => /^register[A-Z]/.test(e))
  if (registerExport) return registerExport

  return null
}

/**
 * Read exports from a package path (checking src/index.ts then index.ts).
 */
async function scanExportsFromPath(packagePath: string): Promise<string[]> {
  const { scanPackage } = await import('./scanner.js')
  try {
    const pkg = await scanPackage(packagePath)
    return pkg.exports
  } catch (error) {
    console.warn(`[injector] Could not scan exports from '${packagePath}': ${String(error)}`)
    return []
  }
}

/**
 * Generate bond setup code — deterministic, never AI.
 *
 * Dispatch order:
 * 1. Specialized generators (theme, i18n) — deterministic, always correct.
 *    These bonds must export specific named instances (themeProvider, i18nProvider)
 *    that bonds/index.ts re-exports for MoleculeProvider.
 * 2. Everything else → the heuristic, which scans the bond package's real exports
 *    to find the correct setter/provider names.
 *
 * AI generation is NOT used here at all (the heuristic dispatches to the same
 * specialized generators first, so both paths agree): it hallucinates setter
 * names it cannot see, e.g. `setDatabase` instead of `setPool`, because it never
 * reads the interface package's exports. Only the resource WRAPPER and the mock
 * generator still consult the AI.
 */
export async function generateBondSetupCode(
  pkg: InferredPackage,
  bondName: string,
  interfacePackage: string,
  projectPath: string,
): Promise<string> {
  const pascal = bondNameToPascal(bondName)
  const meta = pkg.molecule as Record<string, unknown> | undefined
  const appSetup = meta?.appBondSetup as { generatorType?: string } | undefined

  // Specialized generators — deterministic, always take priority over AI.
  if (appSetup?.generatorType === 'theme') {
    const result = generateAppThemeBondSetup(pkg, pascal, projectPath)
    if (result) return result
  }
  if (appSetup?.generatorType === 'i18n') {
    const result = generateAppI18nBondSetup(pkg, pascal, interfacePackage)
    if (result) return result
  }

  // Bond setup is fully deterministic — the heuristic scans actual package
  // exports to find the correct setter/provider names. AI generation is skipped
  // because it hallucinates wrong setter names (e.g. setDatabase instead of
  // setPool) since it can't see the interface package's real exports.
  return generateBondSetupCodeHeuristic(pkg, bondName, interfacePackage, projectPath)
}

/**
 * Generate theme bond setup code that exports the provider instance.
 *
 * Creates the theme provider, registers it via setProvider() from
 * @molecule/app-theme, and exports the instance for MoleculeProvider.
 * Keeps config.ts provider-agnostic.
 */
function readThemeCssColors(projectPath: string): Record<string, string> {
  const colors: Record<string, string> = {}
  // `projectPath` is the app WORKSPACE (e.g. `<project>/app`, or the project
  // root for an app-only project), so its palette is exactly
  // `<workspace>/src/theme.css` — the file the create flow writes and the
  // template copies ship. Two other candidates used to be probed first/last:
  // `<mlcl>/templates/apps/<workspace-parent-basename>/theme.css` (keyed on
  // the USER's project name, not on a template — it matched nothing in the
  // fleet, and would have silently adopted a flagship's palette for a custom
  // app that happened to share its name) and `<parent>/app/src/theme.css`
  // (which, for an app-only project with no palette of its own, read a SIBLING
  // directory's theme.css and injected another project's colors). One path,
  // the workspace's own.
  try {
    const fullCss = readFileSync(join(projectPath, 'src', 'theme.css'), 'utf-8')
    // Two defects lived in the block boundary, and both read an app WITH a
    // palette as "no overrides at all":
    //
    // 1. The boundary search ran over the RAW file, comments included — and
    //    this file's own self-documenting header NAMES the dark-mode selector
    //    while explaining it (`*   [data-mol-mode='dark'] { … }     → dark
    //    theme`). mlcl stamps that header itself (scaffold.ts's
    //    THEME_CSS_HEADER_TEMPLATE for templates, THEME_CSS_HEADER_CUSTOM for
    //    every custom app) and it sits ABOVE the palette, so the "light block"
    //    was sliced down to the header and every `--mol-color-*` declaration
    //    fell after the cut. Measured across the flagship fleet: 3d-model-viewer,
    //    ai-writing-studio, ai-code-review-tool, field-service, webhook-manager
    //    and music-daw each read ZERO color overrides from a full palette, and
    //    every custom app's theme.css opens with the same header.
    // 2. The bare `[data-mol-mode` alternative matched a LIGHT-mode selector
    //    too, and apps commonly declare the light palette as a selector LIST —
    //    voting-polling's `:root,\n[data-mol-mode='light'] {` cut the block at
    //    index 7, before its first declaration.
    //
    // So: strip comments first, then stop only at a DARK-mode override.
    const css = fullCss.replace(/\/\*[\s\S]*?\*\//g, '')
    const darkStart =
      /\[data-mol-mode\s*=\s*['"]dark['"]\]|\[data-theme\s*=\s*['"]dark['"]\]|\.dark\b|@media[^{]*prefers-color-scheme/i
    const rootEnd = css.search(darkStart)
    // `>= 0`, not `> 0`: `search` returns 0 for a dark selector that opens the
    // (comment-stripped) file — a theme.css whose only block IS the dark
    // override. Treating that 0 as "no dark block found" read the whole file as
    // the LIGHT palette, so the dark overrides were emitted as the app's light
    // colors; `-1` (no dark block at all) still keeps the whole file, and a
    // match at 0 now cuts the light block to nothing, which is correct.
    const lightBlock = rootEnd >= 0 ? css.slice(0, rootEnd) : css
    const re = /--mol-color-([\w-]+)\s*:\s*([^;]+)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(lightBlock)) !== null) {
      const name = m[1].replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
      colors[name] = m[2].trim()
    }
  } catch (_error) {
    // No theme.css in the workspace — no overrides to apply; the provider's own
    // default themes drive the palette.
  }
  return colors
}

function generateAppThemeBondSetup(
  pkg: InferredPackage,
  pascal: string,
  projectPath: string,
): string | null {
  if (!pkg.molecule?.implements) return null

  // Detect available exports from the provider package
  const hasCreateFn = pkg.exports.some((e) => e.startsWith('create'))
  const createFn = pkg.exports.find((e) => e.startsWith('create'))
  const hasLightTheme = pkg.exports.includes('lightTheme')
  const hasDarkTheme = pkg.exports.includes('darkTheme')

  if (!hasCreateFn || !createFn) return null

  // Check if this is the default provider or a theme preset.
  // Preset providers ship curated themes — use them as-is (no color overrides).
  // The default provider exports generic themes that benefit from customization.
  const coreEntry = findRegistryPackage(pkg.molecule.implements)
  const isDefaultProvider = coreEntry?.molecule?.defaultProvider === pkg.name

  const typeImport = `import type { Theme } from '${pkg.molecule.implements}'`
  const setterImport = `import { setProvider } from '${pkg.molecule.implements}'`

  let themeSetup: string
  let imports: string[]
  // Tracks whether the generated code actually references the `Theme` type
  // (only the custom-colors branch declares a typed theme constant). Drives
  // the type-import emission so projects without theme.css overrides don't
  // get a dead `import type { Theme }` (TS6133).
  let usesThemeType = false

  if (!isDefaultProvider && hasLightTheme && hasDarkTheme) {
    // Preset provider: use themes directly without overrides
    imports = [createFn, 'lightTheme', 'darkTheme']
    themeSetup = `
export const themeProvider = ${createFn}({
  themes: [lightTheme, darkTheme],
  defaultTheme: 'light',
  systemDefault: true,
  applyToDocument: false,
  persistKey: 'molecule-theme',
})
`
  } else if (hasLightTheme && hasDarkTheme) {
    // Default provider: override base theme colors with values from theme.css
    const themeColors = readThemeCssColors(projectPath)
    const hasCustomColors = Object.keys(themeColors).length > 0

    if (hasCustomColors) {
      usesThemeType = true
      imports = [createFn, 'lightTheme as baseLightTheme', 'darkTheme']
      const colorEntries = Object.entries(themeColors)
        .map(([k, v]) => `    ${k}: '${v}',`)
        .join('\n')
      themeSetup = `
const defaultLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
${colorEntries}
  },
}

export const themeProvider = ${createFn}({
  themes: [defaultLightTheme, darkTheme],
  defaultTheme: 'light',
  systemDefault: true,
  persistKey: 'molecule-theme',
})`
    } else {
      imports = [createFn, 'lightTheme', 'darkTheme']
      themeSetup = `
export const themeProvider = ${createFn}({
  themes: [lightTheme, darkTheme],
  defaultTheme: 'light',
  systemDefault: true,
  persistKey: 'molecule-theme',
})`
    }
  } else {
    imports = [createFn]
    themeSetup = `
export const themeProvider = ${createFn}({
  defaultTheme: 'light',
  systemDefault: true,
  applyToDocument: false,
  persistKey: 'molecule-theme',
})
`
  }

  // Only include the `Theme` type import when the generated code actually
  // references it — i.e. the custom-colors branch that declares a typed
  // `defaultLightTheme` constant. Without this, projects that have no
  // theme.css color overrides get a dead import (TS6133).
  const needsTypeImport = usesThemeType

  return `/**
 * ${pascal} bond setup
 *
 * Wires ${pkg.name} to ${pkg.molecule.implements}.
 * Exports themeProvider for use in MoleculeProvider.
 */

${needsTypeImport ? `${typeImport}\n` : ''}${setterImport}
import { ${imports.join(', ')} } from '${pkg.name}'
${themeSetup}
export function setup${pascal}(): void {
  setProvider(themeProvider)
}
`
}

/**
 * Generate i18n bond setup code that exports the provider instance.
 *
 * The i18n provider has a setter (setProvider) AND needs to be exported
 * for MoleculeProvider. The bond setup creates it, registers it, and
 * sets up locale persistence.
 */
function generateAppI18nBondSetup(
  pkg: InferredPackage,
  pascal: string,
  interfacePackage: string,
): string | null {
  // Only handle app-side i18n bonds (not api-i18n bonds)
  if (getPackageStack(interfacePackage) !== 'app') return null

  // For the built-in createSimpleI18nProvider from the core @molecule/app-i18n,
  // the injection is handled via the i18n-simple bond setup path.
  // For third-party i18n providers (e.g., @molecule/app-i18n-i18next), detect the factory.
  const createFn = pkg.exports.find((e) => e.startsWith('create'))
  const providerExport = pkg.exports.find((e) => e === 'provider')

  if (!createFn && !providerExport) return null

  const providerRef = createFn ? `${createFn}()` : 'provider'
  const importName = createFn ?? 'provider'
  const storagePkg = requirePackageByRole('app', 'core', 'storage')

  return `/**
 * ${pascal} bond setup
 *
 * Wires ${pkg.name} to ${interfacePackage}.
 * Exports i18nProvider for use in MoleculeProvider.
 */

import { setProvider } from '${interfacePackage}'
import { ${importName} } from '${pkg.name}'

import { ui as en } from '../locales/en/ui.js'

const lazyLocale = (code: string) => () =>
  import(\`../locales/\${code}/ui.ts\`).then((m: { ui: Record<string, string> }) => m.ui)

export const i18nProvider = ${
    providerRef === 'provider'
      ? 'provider'
      : `${createFn}({
  defaultLocale: 'en',
  locales: [
${generateLocaleArrayCode()},
  ],
})`
  }

export function setup${pascal}(): void {
  setProvider(i18nProvider)

  // Persist locale selection through the bonded storage provider.
  //
  // The import is dynamic for ORDERING, not optionality — the storage core is
  // alwaysInclude, so it ships in every generated app. Deferring by a microtask
  // makes this wiring run after EVERY setup*() call in bonds/index.ts; the i18n
  // bond is set up before the storage bond, so a static import + a direct get()
  // here would throw "no storage provider bonded" and locale restore would break.
  // Bundlers report this as INEFFECTIVE_DYNAMIC_IMPORT — that warning is expected.
  import('${storagePkg}')
    .then(({ get, set }) => {
      i18nProvider.onLocaleChange((locale: string) => set('molecule-locale', locale))
      get<string>('molecule-locale').then((saved: string | null) => {
        if (saved && saved !== i18nProvider.getLocale()) {
          i18nProvider.setLocale(saved).catch(() => {
            // The saved locale is no longer registered (pruned as unsupported, or
            // dropped in an app update) — keep the default locale instead of
            // surfacing an unhandled rejection on every boot.
          })
        }
      })
    })
    .catch(() => {
      // No storage provider bonded (or the wiring above threw) — locale
      // persistence is skipped and the default locale still applies.
    })
}
`
}

/**
 * Heuristic bond setup code generation (fallback when AI is unavailable).
 *
 * For named bond categories (oauth, payments), uses the bond registry directly:
 *   bond('oauth', 'github', { serverName, verify })
 *   bond('payments', 'stripe', paymentProvider)
 *
 * For singleton bonds with a setter (email, database, etc.), uses the setter:
 *   setTransport(transport)
 */
async function generateBondSetupCodeHeuristic(
  pkg: InferredPackage,
  bondName: string,
  interfacePackage: string,
  projectPath: string,
): Promise<string> {
  const pascal = bondNameToPascal(bondName)
  const meta = pkg.molecule as Record<string, unknown> | undefined
  const appSetup = meta?.appBondSetup as { generatorType?: string } | undefined

  // Data-driven app bond generation: dispatch based on registry appBondSetup.generatorType.
  // Theme and i18n providers need to export their instances so framework templates
  // can pass them to MoleculeProvider. This keeps config.ts provider-agnostic.
  if (appSetup?.generatorType === 'theme') {
    const appThemeSetup = generateAppThemeBondSetup(pkg, pascal, projectPath)
    if (appThemeSetup) return appThemeSetup
  }

  if (appSetup?.generatorType === 'i18n') {
    const appI18nSetup = generateAppI18nBondSetup(pkg, pascal, interfacePackage)
    if (appI18nSetup) return appI18nSetup
  }

  // Check for bondWiring metadata (self-describing named bonds)
  const bondWiring = pkg.molecule?.bondWiring as
    | { type: string; bondCategory: string; nameExport?: string; providerExports?: string[] }
    | undefined

  if (bondWiring?.type === 'named') {
    const { bondCategory, nameExport, providerExports = [] } = bondWiring
    const stack = getPackageStack(interfacePackage) ?? 'api'
    const bondPkg = requirePackageByRole(stack, 'infrastructure', 'bond')

    // Resolve the provider import name. If `providerExports` is set, honor it.
    // Otherwise prefer `provider`, then `createProvider`, then any `*Provider` class.
    // This lets a package whose only public surface is `createProvider()` (e.g.
    // ai-openai, ai-deepseek) still bond cleanly without registry tweaking.
    const pickProviderImport = (exports: readonly string[]): string => {
      if (providerExports.length > 0) return providerExports[0]
      if (exports.includes('provider')) return 'provider'
      if (exports.includes('createProvider')) return 'createProvider'
      const klass = exports.find((e) => /Provider$/.test(e) && /^[A-Z]/.test(e))
      return klass ?? 'provider'
    }
    const importName = pickProviderImport(pkg.exports)
    const imports = providerExports.length > 0 ? providerExports : [importName]
    // Factory exports (create*) need to be called with () in the bond value.
    const isFactory = /^create[A-Z]/.test(importName)
    const providerValue = isFactory ? `${importName}()` : importName

    // For named bonds with a nameExport (e.g., OAuth: serverName), use that as the key
    if (nameExport) {
      return `/**
 * ${pascal} bond setup
 *
 * Wires ${pkg.name} to the bond registry as ${bondCategory} provider.
 */

import { bond } from '${bondPkg}'
import { ${imports.join(', ')} } from '${pkg.name}'

export function setup${pascal}(): void {
  bond('${bondCategory}', ${nameExport}, { ${imports.join(', ')} })
}
`
    }

    // For named bonds without a nameExport (e.g., payments, ai), derive name from package
    const lastSegment = pkg.name.split('-').pop() ?? pkg.name
    return `/**
 * ${pascal} bond setup
 *
 * Wires ${pkg.name} to the bond registry as ${bondCategory} provider '${lastSegment}'.
 */

import { bond } from '${bondPkg}'
import { ${imports.join(', ')} } from '${pkg.name}'

export function setup${pascal}(): void {
  bond('${bondCategory}', '${lastSegment}', ${providerValue})
}
`
  }

  // Singleton bonds: find setter in interface package
  // Pass bond exports so findSetterExport can pick the right setter when multiple exist
  const bondExports = pkg.exports.length > 0 ? pkg.exports : await scanExportsFromPath(pkg.path)
  // Try projectPath first, then resolve from the bond package's real location
  // (handles monorepo dev where interface packages may not be in project's node_modules yet)
  let interfacePath = await findMoleculePackage(interfacePackage, projectPath)
  if (!interfacePath) {
    const resolvedBondPath = await realpath(pkg.path).catch(() => pkg.path)
    interfacePath = await findMoleculePackage(interfacePackage, resolvedBondPath)
  }
  const setter = interfacePath ? await findSetterExport(interfacePath, bondExports) : null

  // Find the provider export from the bond package (pass setter name for smarter matching)
  const registryMeta = pkg.molecule as Record<string, unknown> | undefined
  const providerExport = await findProviderExport(
    pkg.path,
    setter,
    registryMeta?.providerExportName as string | undefined,
  )

  // If no setter found, the bond package is used directly (no registration pattern)
  if (!setter) {
    // Re-export everything from the bond package
    return `/**
 * ${pascal} bond setup
 *
 * Re-exports ${pkg.name} for use in the app.
 */

export * from '${pkg.name}'

export function setup${pascal}(): void {
  // No explicit setup needed - configured via environment variables
}
`
  }

  const provider = providerExport ?? 'provider'
  // Factory exports (create*) need to be called with () in setup
  const isFactory = /^create[A-Z]/.test(provider)
  // Register exports (register*) are self-registering — call them directly, no setter
  const isRegister = /^register[A-Z]/.test(provider)
  const providerCall = isFactory ? `${provider}()` : provider

  // Registry-declared stub variant (bondSetup.generatorType): realtime bonds
  // (socketio/ws/sse) must DEFER their port bind — the scaffolded server
  // attaches the bonded provider to the API's HTTP server via
  // attachHttpServer (see templates/api/server.ts.tpl), so realtime shares
  // the API port instead of a standalone port a container/proxy may not
  // expose. A zero-config createProvider() binds nothing and silently waits
  // for an attach that never comes — without this, realtime is dead in a
  // fresh scaffold (the flagship templates avoid this via
  // @molecule/api-bonds-default-express; the custom-create path does not).
  const bondSetup = meta?.bondSetup as { generatorType?: string } | undefined
  if (bondSetup?.generatorType === 'realtime-deferred' && isFactory) {
    return `/**
 * ${pascal} bond setup
 *
 * Wires ${pkg.name} to ${interfacePackage}
 *
 * deferAttach: the provider binds NO port at creation — the scaffolded server
 * attaches it to the API's HTTP server (attachHttpServer) so realtime shares
 * the API port instead of a standalone port a container/proxy may not expose.
 */

import { ${setter} } from '${interfacePackage}'
import { ${provider} } from '${pkg.name}'

export function setup${pascal}(): void {
  ${setter}(${provider}({ deferAttach: true }))
}
`
  }

  // Self-registering bonds (register*) don't use the setter pattern — just import
  // and call the register function from the bond package.
  if (isRegister) {
    return `/**
 * ${pascal} bond setup
 *
 * Wires ${pkg.name} to ${interfacePackage}
 */

import { ${provider} } from '${pkg.name}'

export function setup${pascal}(): void {
  ${provider}()
}
`
  }

  // Check for additional setter/provider pairs (e.g. database exports both setPool/pool and setStore/store)
  const additionalPairs: Array<{ setter: string; provider: string }> = []
  if (interfacePath) {
    const interfaceExports = await scanExportsFromPath(interfacePath)
    const allSetters = interfaceExports.filter((e) => /^(set|register)[A-Z]/.test(e))
    for (const extraSetter of allSetters) {
      if (extraSetter === setter) continue
      // Derive the expected bond export name from the setter (e.g. setStore -> store)
      const derived = extraSetter.replace(/^(set|register)/, '')
      const derivedExport = derived.charAt(0).toLowerCase() + derived.slice(1)
      if (bondExports.includes(derivedExport)) {
        additionalPairs.push({ setter: extraSetter, provider: derivedExport })
      }
    }
  }

  const allSetterImports = [setter, ...additionalPairs.map((p) => p.setter)].join(', ')
  const allProviderImports = [provider, ...additionalPairs.map((p) => p.provider)].join(', ')
  // Local font faces load from `<basePath>fonts/<file>`; a site served under a
  // sub-path (Vite `base`, BASE_PATH) 404s every face at `/fonts/…` unless the
  // app passes the base it already knows. Only the app knows it — the bond
  // cannot discover it reliably in both dev and the built site.
  const setterCall =
    setter === 'setFont' && interfacePackage === '@molecule/app-fonts'
      ? `${setter}(${providerCall}, { basePath: import.meta.env.BASE_URL })`
      : `${setter}(${providerCall})`
  const allSetupCalls = [setterCall, ...additionalPairs.map((p) => `${p.setter}(${p.provider})`)]
    .map((call) => `  ${call}`)
    .join('\n')

  return `/**
 * ${pascal} bond setup
 *
 * Wires ${pkg.name} to ${interfacePackage}
 */

import { ${allSetterImports} } from '${interfacePackage}'
import { ${allProviderImports} } from '${pkg.name}'

export function setup${pascal}(): void {
${allSetupCalls}
}
`
}

/**
 * Generate middleware setup by scanning the package's exports for a create* function.
 */
async function generateMiddlewareSetup(
  pkg: InferredPackage,
  middlewareName: string,
  apiFramework: string = DEFAULT_API_FRAMEWORK,
): Promise<string> {
  const fw = getApiFrameworkConfig(apiFramework)
  // One derivation, shared with every site that names this middleware in
  // generated code — see middlewareIdentifier.
  const camelName = middlewareIdentifier(middlewareName)
  const capitalizedName = camelName.charAt(0).toUpperCase() + camelName.slice(1)

  // Scan the package exports to find a pre-built middleware instance or factory function.
  const exports = pkg.exports.length > 0 ? pkg.exports : await scanExportsFromPath(pkg.path)

  // Prefer a pre-built instance with the same name (e.g., `cors`, `bodyParser`, `cookieParser`)
  const prebuiltExport = exports.find((e) => e === camelName || e === `${camelName}Middleware`)

  if (prebuiltExport) {
    return `/**
 * ${capitalizedName} middleware setup
 */

${fw.middlewareTypeImport}
import { ${prebuiltExport} } from '${pkg.name}'

export const ${camelName}Middleware: ${fw.middlewareType} = ${prebuiltExport}

export { ${camelName}Middleware as default }
`
  }

  // Registry-declared wiring (e.g. billing-routes): a create* factory that needs
  // arguments. The registry entry's `middlewareSetup` supplies the exact call
  // expression plus a generated config module (e.g. src/tiers.ts) holding the
  // app-specific data the CLI cannot know (price IDs) — keeping package
  // knowledge in the registry, not in this generator.
  const middlewareSetup = pkg.molecule?.middlewareSetup as
    { configFile?: string; configImport?: string; expression: string } | undefined
  if (middlewareSetup) {
    const createImport = exports.find((e) => /^create[A-Z]/.test(e))
    return `/**
 * ${capitalizedName} middleware setup
 */

${fw.middlewareTypeImport}
import { ${createImport} } from '${pkg.name}'
${middlewareSetup.configImport ? `${middlewareSetup.configImport}\n` : ''}
export const ${camelName}Middleware: ${fw.middlewareType} = ${middlewareSetup.expression}

export { ${camelName}Middleware as default }
`
  }

  // Fall back to a create* factory function
  const createFunction =
    exports.find((e) => /^create[A-Z]/.test(e)) ?? `create${capitalizedName}Middleware`

  return `/**
 * ${capitalizedName} middleware setup
 */

${fw.middlewareTypeImport}
import { ${createFunction} } from '${pkg.name}'

export const ${camelName}Middleware: ${fw.middlewareType} = ${createFunction}()

export { ${camelName}Middleware as default }
`
}

// =============================================================================
// Service bond generation
// =============================================================================

/**
 * Generate service bond files.
 *
 * Uses the heuristic which reads `molecule.services` metadata from the
 * registry — deterministic and correct. AI generation is skipped because
 * it hallucinates wrong export/function names.
 */
async function generateServiceBondFiles(
  allMolecules: string[],
  projectPath: string,
  _resourcePlans: InjectionPlan[],
): Promise<FileOperation[]> {
  const { loadRegistry } = await import('./registry.js')
  const allPackages = loadRegistry()
  return generateServiceBondFilesHeuristic(allMolecules, projectPath, allPackages)
}

/**
 * Heuristic service bond file generation (fallback).
 *
 * - Device resource -> bond('device', deviceService)
 * - Payment resource -> bond('plans', planService) + bond('paymentRecords', paymentRecordService)
 */
function generateServiceBondFilesHeuristic(
  allMolecules: string[],
  projectPath: string,
  allPackages?: InferredPackage[],
): FileOperation[] {
  const files: FileOperation[] = []
  const bondPkg = requirePackageByRole('api', 'infrastructure', 'bond')

  // Data-driven: scan all packages for molecule.services metadata
  if (allPackages) {
    for (const pkg of allPackages) {
      const services = pkg.molecule?.services as
        Array<{ export: string; bondCategory: string; bondType?: string }> | undefined

      if (!services || services.length === 0) continue
      if (!allMolecules.includes(pkg.name)) continue

      const shortName = extractShortName(pkg.name)
      const pascal = shortName.replace(/(^|-)(\w)/g, (_: string, __: string, c: string) =>
        c.toUpperCase(),
      )

      const importNames = services.map((s) => s.export)
      const bondLines = services.map((s) => {
        return `  bond('${s.bondCategory}', ${s.export})`
      })

      files.push({
        action: 'create',
        targetPath: join(projectPath, 'src', 'bonds', `service-${shortName}.ts`),
        content: `/**
 * ${pascal} service bond setup
 *
 * Registers services from ${pkg.name} with the bond system.
 */

import { bond } from '${bondPkg}'
import { ${importNames.join(', ')} } from '${pkg.name}'

export function setupService${pascal}(): void {
${bondLines.join('\n')}
}
`,
        description: `Create ${pascal} service bond setup`,
      })
    }
  }

  return files
}

// =============================================================================
// Holistic project file synthesis
// =============================================================================

/**
 * Synthesize holistic project files from all injection plans.
 *
 * Creates files that require a global view of all molecules:
 * - Resource wrappers (with factory calls)
 * - router.ts (all routes from all resources)
 * - server.ts (API app with middleware, bonds, error handling)
 * - bonds/index.ts (setupBonds function calling all bond + service setups)
 * - Service bond files (device service, payment services)
 */
export async function synthesizeProjectFiles(
  plans: InjectionPlan[],
  allMolecules: string[],
  projectPath: string,
  registryPackages?: InferredPackage[],
  apiFramework?: string,
): Promise<FileOperation[]> {
  const fw = apiFramework ?? getProjectApiFramework(projectPath)
  const files: FileOperation[] = []

  const resourcePlans = plans.filter((p) => p.moleculePackage?.type === 'resource')

  // Derive optional features from registry metadata
  const optionalFeatures = deriveOptionalFeatures(allMolecules, registryPackages)

  // Generate wrappers for resources that have active routes — plus any resource
  // exporting `authorization`, whose wrapper the router imports for the global
  // gate even when the resource's own routes are all inactive (see
  // generateRouterContentHeuristic: without the wrapper that import is a missing
  // module, TS2307).
  const routablePlans = resourcePlans.filter((plan) => {
    if (!plan.moleculePackage) return false
    if (plan.moleculePackage.exports.includes('authorization')) return true
    return plan.moleculePackage.routes.some((r) => !r.optional || optionalFeatures.has(r.optional))
  })

  // Generate resource wrappers with factory calls
  for (const plan of routablePlans) {
    if (!plan.moleculePackage) continue
    const resourceName = extractResourceName(plan.molecule)
    const wrapperPath = join(projectPath, 'src', 'App', 'Resource', resourceName, 'index.ts')
    // `resourceName` is derived from the molecule NAME, which is data:
    // {@link planInjection} refuses an escaping one up front, and that refusal is
    // what normally keeps this path inside the project. This function is
    // exported and takes whatever plans it is handed, so the containment is
    // asserted here too — a name carrying `..` resolves this join ABOVE the
    // project root (the wrapper would be written outside it, with the served
    // tree as its only boundary). Skip loudly rather than write.
    if (!isInside(projectPath, wrapperPath)) {
      console.warn(
        `[injector] skipping the ${resourceName} resource wrapper — it resolves outside ${projectPath}`,
      )
      continue
    }

    const content = await generateWrapperContent(plan.moleculePackage)

    files.push({
      action: 'create',
      targetPath: wrapperPath,
      content,
      description: `Create ${resourceName} resource wrapper with factory`,
    })
  }

  // Generate router.ts
  files.push({
    action: 'create',
    targetPath: join(projectPath, 'src', 'App', 'router.ts'),
    content: generateRouterContent(resourcePlans, allMolecules, registryPackages, fw),
    description: 'Generate complete router with all routes',
  })

  // Generate server.ts
  files.push({
    action: 'create',
    targetPath: join(projectPath, 'src', 'server.ts'),
    content: generateServerContent(allMolecules, registryPackages, fw),
    description: 'Generate server entry point',
  })

  // Emit the CI workflow when the github-actions package is selected — until
  // now the package was installed but never invoked, so scaffolds shipped no
  // real CI (only the security workflow). Steps mirror the scripts the
  // scaffold ships (lint/typecheck/build/test + db:setup when a database bond
  // is present) so a green local run means a green CI. Full-stack scaffolds
  // run this per-workspace (api/), but the workflow lives at the repo root.
  if (allMolecules.includes('@molecule/api-ci-github-actions')) {
    const hasDatabase = (registryPackages ?? []).some(
      (p) => p.molecule?.category === 'database' && allMolecules.includes(p.name),
    )
    const { generateWorkflow, workflows, workflowPath } =
      await import('@molecule/api-ci-github-actions')
    const repoRoot = projectPath.endsWith(`${sep}api`) ? dirname(projectPath) : projectPath
    files.push({
      action: 'create',
      targetPath: join(repoRoot, workflowPath('ci')),
      content: generateWorkflow(workflows.projectCi({ database: hasDatabase })),
      description: 'Generate GitHub Actions CI workflow (lint, typecheck, build, test, migrations)',
    })
  }

  // Generate service bond setup files for resource packages that expose services
  const serviceBondFiles = await generateServiceBondFiles(allMolecules, projectPath, resourcePlans)
  files.push(...serviceBondFiles)

  // Generate bonds/index.ts
  const bondSetups = plans.filter((p) => p.bondSetup).map((p) => p.bondSetup!)
  const serviceBondNames = serviceBondFiles
    .map((f: FileOperation) => {
      // Extract bond name from path: src/bonds/service-device.ts -> service-device
      const match = f.targetPath.match(/bonds\/(.+)\.ts$/)
      return match ? match[1] : ''
    })
    .filter(Boolean)
  // Collect all secret keys from registry metadata of selected packages
  const secretKeys = (registryPackages ?? [])
    .filter((pkg) => allMolecules.includes(pkg.name))
    .flatMap((pkg) => {
      const secrets = (pkg.molecule?.secrets ?? []) as Array<{ name: string }>
      return secrets.map((s) => s.name)
    })
    .filter((key, i, arr) => arr.indexOf(key) === i) // deduplicate
  files.push({
    action: 'create',
    targetPath: join(projectPath, 'src', 'bonds', 'index.ts'),
    content: generateBondsIndexContent(
      bondSetups,
      serviceBondNames,
      secretKeys,
      allMolecules,
      registryPackages,
    ),
    description: 'Generate bonds index with setupBonds function',
  })

  // Entitlements safety net: when `@molecule/api-entitlements` is selected, the
  // generated bonds/index.ts imports `setupEntitlements` from '../tiers.js'. Flagship
  // templates ship a real `src/tiers.ts` (copied BEFORE injection), but a CUSTOM build
  // (no template) has none — leaving a DANGLING import that crashes the API at boot
  // (ERR_MODULE_NOT_FOUND), which tsc does not catch. Write a no-op placeholder so the
  // import resolves and the server boots — only when one isn't already on disk, so a
  // template's real tier ladder is never clobbered.
  if (
    allMolecules.includes('@molecule/api-entitlements') &&
    !existsSync(join(projectPath, 'src', 'tiers.ts'))
  ) {
    files.push({
      action: 'create',
      targetPath: join(projectPath, 'src', 'tiers.ts'),
      content: `/**
 * Entitlements / tier configuration.
 *
 * No tier ladder is configured for this app yet. setupEntitlements() is a no-op so
 * the "import { setupEntitlements } from '../tiers.js'" in bonds/index.ts resolves and
 * the API boots. Define per-plan limits here (see @molecule/api-entitlements) to gate
 * features by subscription tier.
 */
export function setupEntitlements(): void {
  // No tier checks configured.
}
`,
      description:
        'Generate placeholder tiers.ts so the entitlements import resolves (custom builds)',
    })
  }

  // Generate scripts/migrate.ts when database packages are present (server.ts imports it)
  const hasDatabase = (registryPackages ?? []).some(
    (p) => p.molecule?.category === 'database' && allMolecules.includes(p.name),
  )
  if (hasDatabase) {
    // The runner matching the project's databases — `mlcl swap` rewrites it
    // through the same helper when the database changes. Rendered from the
    // project's own manifest (union the injected list): every inject flow
    // finds a manifest that already declares the injected packages AND the
    // project's earlier ones, so injecting one database into a project that
    // declares another keeps the dual runner instead of silently re-rendering
    // for the injected database alone.
    const migrateContent = await readMigrateRunner(allMolecules, projectPath)
    files.push({
      action: 'create',
      targetPath: join(projectPath, 'src', 'scripts', 'migrate.ts'),
      content: migrateContent,
      description: 'Generate database migration script',
    })
  }

  // Generate smoke tests.
  //
  // BOTH smoke tests need the same `vi.mock()` block over the same packages,
  // and the AI path (generateMoleculeViMocksAI) is a METERED request per call —
  // generating it inside each test builder sent the same request twice (same
  // packages, same registry mock data, same task), paying a second model call
  // and its latency on every injection. It is built ONCE here and handed to
  // both: one request per synthesis, and the two files can never disagree about
  // how a package is mocked.
  const moleculeMocks = await generateMoleculeViMocks(allMolecules, resourcePlans)
  files.push({
    action: 'create',
    targetPath: join(projectPath, 'src', '__tests__', 'server.test.ts'),
    content: generateServerSmokeTest(allMolecules, registryPackages, moleculeMocks),
    description: 'Generate server smoke tests',
  })

  const routeTestContent = generateRouteSmokeTest(routablePlans, moleculeMocks)
  if (routeTestContent) {
    files.push({
      action: 'create',
      targetPath: join(projectPath, 'src', '__tests__', 'routes.test.ts'),
      content: routeTestContent,
      description: 'Generate route smoke tests',
    })
  }

  // Sort imports in all generated source files for consistent lint-clean output
  for (const file of files) {
    if (file.content && /\.(ts|tsx|mjs)$/.test(file.targetPath)) {
      file.content = sortImportStatements(file.content)
    }
  }

  return files
}

/**
 * Synthesize holistic project files for App (frontend) projects.
 *
 * Creates:
 * - bonds/index.ts (setupProviders function calling all bond setups)
 * - src/service-worker.ts (if @molecule/app-version is included)
 */
/**
 * Generates a default bond setup file from registry `defaultBondSetup` metadata.
 * When a core package declares `defaultBond` and `defaultBondSetup` in the registry
 * and no explicit provider bond exists for that category, this generates the setup file.
 */

export function synthesizeAppProjectFiles(
  plans: InjectionPlan[],
  allMolecules: string[],
  projectPath: string,
  registryPackages?: InferredPackage[],
  sharedCodeDir?: string,
  skipServiceWorker?: boolean,
): FileOperation[] {
  const files: FileOperation[] = []
  // Bonds directory: src/bonds/ by default, src/<sharedCodeDir>/bonds/ for frameworks like SvelteKit
  const bondsDir = sharedCodeDir
    ? join(projectPath, 'src', sharedCodeDir, 'bonds')
    : join(projectPath, 'src', 'bonds')
  // The SAME root the shared config/locales live in (`copyTemplateFiles` writes
  // config.ts, branding.ts, locales/ … under `src/<sharedCodeDir>`). Everything
  // synthesized here that reaches for `../config.js` / `../locales/en/ui.js` /
  // `../bonds/index.js` must sit one level under it, or the relative import
  // names a module the same run never wrote: the app bonds smoke test was
  // hardcoded to `src/__tests__` (its imports point at `src/bonds`,
  // `src/config.ts`, `src/locales`), so a SvelteKit scaffold — the one
  // framework with a sharedCodeDir — shipped a test whose every import was
  // dangling, and the config rewrite below silently read ENOENT and never
  // populated the named-provider lists (oauth/payments) at all.
  const sharedSrcDir = sharedCodeDir ? join('src', sharedCodeDir) : 'src'

  // Use registry metadata to detect feature generation needs
  const generates = new Set<string>()
  if (registryPackages) {
    for (const pkg of registryPackages) {
      if (!allMolecules.includes(pkg.name)) continue
      const gen = pkg.molecule?.generates
      if (gen) gen.forEach((g) => generates.add(g))
    }
  }

  // Generate service-worker.ts if a package declares generates: ["service-worker"]
  // Skip for frameworks that auto-compile service workers (e.g. SvelteKit picks up src/service-worker.ts
  // by convention, which conflicts with vite-plugin-pwa's generateSW mode).
  if (generates.has('service-worker') && !skipServiceWorker) {
    const hasPush = generates.has('service-worker-push')
    files.push({
      action: 'create',
      targetPath: join(projectPath, 'src', 'service-worker.ts'),
      content: generateServiceWorkerSource(hasPush),
      description: `Generate service worker${hasPush ? ' with push notification support' : ''}`,
    })
  }

  // Generate bonds/index.ts with setupProviders()
  const bondSetups = plans.filter((p) => p.bondSetup).map((p) => p.bondSetup!)
  const bondNames = bondSetups.map((b) => extractBondName(b.providerPackage))

  // Detect bond categories and appBondSetup metadata for re-exports
  const bondCategories = new Map<string, string>()
  const bondAppSetup = new Map<string, { exportName: string; reExport?: boolean }>()
  for (const setup of bondSetups) {
    const pkg = plans.find((p) => p.bondSetup === setup)?.moleculePackage
    const meta = pkg?.molecule as Record<string, unknown> | undefined
    const cat = meta?.category as string | undefined
    if (cat) {
      bondCategories.set(cat, extractBondName(setup.providerPackage))
      const appSetup = meta?.appBondSetup as { exportName: string; reExport?: boolean } | undefined
      if (appSetup) bondAppSetup.set(cat, appSetup)
    }
  }

  // Generate default bond setups for core packages that declare defaultBond in the registry
  const registry = getRawRegistry()
  if (registryPackages) {
    for (const pkg of registryPackages) {
      if (!allMolecules.includes(pkg.name)) continue
      const meta = pkg.molecule as Record<string, unknown> | undefined
      const defaultBond = meta?.defaultBond as string | undefined
      if (!defaultBond) continue
      const cat = meta?.category as string | undefined
      if (!cat || bondCategories.has(cat)) continue

      const pascal = bondNameToPascal(defaultBond)
      // The setup file's metadata is read FIRST, and a `defaultBond` with no
      // `defaultBondSetup` registers nothing: the loops below emit
      // `import { setup<Pascal> } from './<defaultBond>.js'` (and, when the core
      // declares `appBondSetup`, an `export { … } from './<defaultBond>.js'`) for
      // every registered name — so registering the name before knowing a file
      // would be written shipped a bonds/index.ts importing a module nothing
      // generated (TS2307, then ERR_MODULE_NOT_FOUND at boot). The two fields are
      // independent optionals; a registry entry carrying only one is a data
      // error, and the honest answer is to wire neither.
      const setupMeta = (meta?.defaultBondSetup ??
        registry.packages[pkg.name]?.defaultBondSetup) as
        | {
            factory: string
            setter: string
            configImport?: string
            extraImports?: Array<{ names: string[]; from: string }>
            configExtend?: string[]
          }
        | undefined
      if (!setupMeta) continue

      bondNames.push(defaultBond)
      bondCategories.set(cat, defaultBond)

      // Capture appBondSetup from core package for re-exports (only if no provider override)
      const coreAppSetup = meta?.appBondSetup as
        { exportName: string; reExport?: boolean } | undefined
      if (coreAppSetup && !bondAppSetup.has(cat)) bondAppSetup.set(cat, coreAppSetup)

      files.push({
        action: 'create',
        targetPath: join(bondsDir, `${defaultBond}.ts`),
        content: generateDefaultBondSetup(pkg.name, setupMeta, pascal, cat!, coreAppSetup),
        description: `Generate default ${cat} bond setup`,
      })
    }
  }

  const imports: string[] = []
  const setupCalls: string[] = []

  for (const bondName of bondNames) {
    const pascal = bondNameToPascal(bondName)
    imports.push(`import { setup${pascal} } from './${bondName}.js'`)
    setupCalls.push(`  setup${pascal}()`)
  }

  // Re-export provider instances that framework templates need from MoleculeProvider.
  // This lets templates import from './bonds/index.js' instead of hardcoding provider packages.
  // Driven by appBondSetup.reExport + appBondSetup.exportName from the registry.
  const reExports: string[] = []
  const hasAnalyticsBond = bondCategories.has('analytics')
  // Names imported as local bindings for auto-tracking (instead of direct re-exports)
  const autoTrackSources: string[] = []

  for (const [cat, bondFile] of bondCategories) {
    const appSetup = bondAppSetup.get(cat)
    if (appSetup?.reExport && appSetup?.exportName) {
      // When analytics is present, convert auth re-export to import + export so we can
      // pass the instance to setupAutoTracking() inside setupProviders().
      if (hasAnalyticsBond && cat === 'auth') {
        imports.push(`import { ${appSetup.exportName} } from './${bondFile}.js'`)
        reExports.push(`export { ${appSetup.exportName} }`)
        autoTrackSources.push(appSetup.exportName)
      } else {
        reExports.push(`export { ${appSetup.exportName} } from './${bondFile}.js'`)
      }
    }
  }

  // Wire routing and HTTP client into auto-tracking via their core package getters.
  // These don't use appBondSetup because they're accessed through getRouter()/getClient()
  // rather than being pre-exported instances from bond setup files.
  if (hasAnalyticsBond) {
    if (allMolecules.includes('@molecule/app-routing')) {
      imports.push(`import { getRouter } from '@molecule/app-routing'`)
      autoTrackSources.push('router: getRouter()')
    }
    if (allMolecules.includes('@molecule/app-http')) {
      imports.push(`import { getClient as getHttpClient } from '@molecule/app-http'`)
      autoTrackSources.push('httpClient: getHttpClient()')
    }
  }

  // Wire setupAutoTracking() when an analytics provider and trackable sources are present.
  // This auto-tracks auth events, route changes, and HTTP errors via @molecule/app-analytics.
  if (hasAnalyticsBond && autoTrackSources.length > 0) {
    imports.push(`import { setupAutoTracking } from '@molecule/app-analytics'`)
    setupCalls.push(`  setupAutoTracking({ ${autoTrackSources.join(', ')} })`)
  }

  const reExportBlock = reExports.length > 0 ? `\n${reExports.join('\n')}\n` : ''

  const bondsContent = `${imports.join('\n')}
${reExportBlock}
/**
 * Initialize all providers.
 * Call this during application startup, before mounting the app.
 */
export function setupProviders(): void {
${setupCalls.join('\n') || '  // No providers configured'}
}
`

  files.push({
    action: 'create',
    targetPath: join(bondsDir, 'index.ts'),
    content: bondsContent,
    description: 'Generate bonds index with setupProviders function',
  })

  // Generate bonds smoke test
  const reExportNames: string[] = []
  for (const [cat] of bondCategories) {
    const appSetup = bondAppSetup.get(cat)
    if (appSetup?.reExport && appSetup?.exportName) {
      reExportNames.push(appSetup.exportName)
    }
  }
  // Collect ALL @molecule/* packages referenced by bond files
  // (includes core interface packages from bondSetup.interfacePackage)
  const bondMolecules = new Set(allMolecules.filter((m) => m.startsWith('@molecule/')))
  for (const plan of plans) {
    if (plan.bondSetup) {
      bondMolecules.add(plan.bondSetup.interfacePackage)
      bondMolecules.add(plan.bondSetup.providerPackage)
    }
    // Scan bond file content for additional @molecule/* imports
    for (const file of plan.files) {
      if (file.targetPath.includes('/bonds/') && file.content) {
        for (const match of file.content.matchAll(/'(@molecule\/[^']+)'/g)) {
          bondMolecules.add(match[1])
        }
      }
    }
  }
  // Also scan synthesized files (default bond setups)
  for (const file of files) {
    if (file.targetPath.includes('/bonds/') && file.content) {
      for (const match of file.content.matchAll(/'(@molecule\/[^']+)'/g)) {
        bondMolecules.add(match[1])
      }
    }
  }
  const bondsTestContent = generateAppBondsSmokeTest([...bondMolecules], reExportNames)
  files.push({
    action: 'create',
    targetPath: join(projectPath, sharedSrcDir, '__tests__', 'bonds.test.ts'),
    content: bondsTestContent,
    description: 'Generate app bonds smoke tests',
  })

  // Update config.ts with named bond provider lists (e.g. oauthProviders, paymentsProviders)
  // Named bond providers live on the API side (e.g. @molecule/api-oauth-github) but the
  // app config needs to know about them. Check both app molecules AND sibling API project.
  if (registryPackages) {
    const namedProviders = new Map<string, string[]>()

    // Collect all molecule names to check: app molecules + sibling API molecules
    const allMoleculesToCheck = new Set(allMolecules)
    try {
      const parentDir = dirname(projectPath)
      const siblingApiPkg = join(parentDir, 'api', 'package.json')
      const apiPkgJson = JSON.parse(readFileSync(siblingApiPkg, 'utf-8'))
      const apiDeps = { ...apiPkgJson.dependencies, ...apiPkgJson.devDependencies }
      for (const dep of Object.keys(apiDeps)) {
        if (dep.startsWith('@molecule/')) allMoleculesToCheck.add(dep)
      }
    } catch (_error) {
      // Sibling api/package.json absent or unreadable — safe to check app molecules only
    }

    for (const pkg of registryPackages) {
      if (!allMoleculesToCheck.has(pkg.name)) continue
      const meta = pkg.molecule as Record<string, unknown> | undefined
      const bondWiring = meta?.bondWiring as { type?: string; bondCategory?: string } | undefined
      if (bondWiring?.type !== 'named' || !bondWiring.bondCategory) continue
      const shortName = pkg.name.split('-').pop()!
      if (!namedProviders.has(bondWiring.bondCategory))
        namedProviders.set(bondWiring.bondCategory, [])
      namedProviders.get(bondWiring.bondCategory)!.push(shortName)
    }

    if (namedProviders.size > 0) {
      // Same root the file actually lives in — see sharedSrcDir.
      const configPath = join(projectPath, sharedSrcDir, 'config.ts')
      try {
        let configContent = readFileSync(configPath, 'utf-8')
        for (const [category, providers] of namedProviders) {
          const key = `${category}Providers`
          const providerList = providers.map((p) => `'${p}'`).join(', ')
          const regex = new RegExp(`(${key}:\\s*)\\[[^\\]]*\\]`)
          configContent = configContent.replace(regex, `$1[${providerList}]`)
        }
        files.push({
          action: 'create',
          targetPath: configPath,
          content: configContent,
          description: 'Update config.ts with named bond providers (OAuth, payments, etc.)',
        })
      } catch (_error) {
        // config.ts absent or unreadable — safe to skip provider name update
      }
    }
  }

  // Sort imports in all generated source files for consistent lint-clean output
  for (const file of files) {
    if (file.content && /\.(ts|tsx|mjs)$/.test(file.targetPath)) {
      file.content = sortImportStatements(file.content)
    }
  }

  return files
}

/**
 * Generate a default bond setup file from registry `defaultBondSetup` metadata.
 *
 * Handles the generic pattern (factory + setter + optional config) and
 * category-specific templates (i18n with locale support).
 */
function generateDefaultBondSetup(
  packageName: string,
  setup: {
    factory: string
    setter: string
    configImport?: string
    extraImports?: Array<{ names: string[]; from: string }>
    configExtend?: string[]
  },
  pascal: string,
  category: string,
  appBondSetup?: { exportName?: string; reExport?: boolean; generatorType?: string } | null,
): string {
  const imports: string[] = []
  imports.push(`import { ${setup.factory}, ${setup.setter} } from '${packageName}'`)
  if (setup.configImport) {
    imports.push(`import { ${setup.configImport} } from '../config.js'`)
  }
  for (const imp of setup.extraImports ?? []) {
    imports.push(`import { ${imp.names.join(', ')} } from '${imp.from}'`)
  }

  // i18n generatorType needs locale-specific template
  if (appBondSetup?.generatorType === 'i18n') {
    const exportName = appBondSetup.exportName ?? `${category}Provider`
    const storagePkg = requirePackageByRole('app', 'core', 'storage')
    // Only import storage statically if it's in extraImports; use dynamic import for persistence
    const i18nImports = imports.filter((imp) => !imp.includes(storagePkg))
    i18nImports.push(`import { ui as en } from '../locales/en/ui.js'`)
    return `/**
 * Default ${category} bond setup
 *
 * Uses the built-in ${setup.factory} from ${packageName}.
 * Swap to a different ${category} provider by replacing this bond.
 */

${i18nImports.join('\n')}

const lazyLocale = (code: string) => () =>
  import(\`../locales/\${code}/ui.ts\`).then((m: { ui: Record<string, string> }) => m.ui)

export const ${exportName} = ${setup.factory}('en', [
${generateLocaleArrayCode()},
])

export function setup${pascal}(): void {
  ${setup.setter}(${exportName})

  // Persist locale selection through the bonded storage provider.
  //
  // The import is dynamic for ORDERING, not optionality — the storage core is
  // alwaysInclude, so it ships in every generated app. Deferring by a microtask
  // makes this wiring run after EVERY setup*() call in bonds/index.ts; the i18n
  // bond is set up before the storage bond, so a static import + a direct get()
  // here would throw "no storage provider bonded" and locale restore would break.
  // Bundlers report this as INEFFECTIVE_DYNAMIC_IMPORT — that warning is expected.
  import('${storagePkg}')
    .then(({ get, set }) => {
      ${exportName}.onLocaleChange((locale: string) => set('molecule-locale', locale))
      get<string>('molecule-locale').then((saved: string | null) => {
        if (saved && saved !== ${exportName}.getLocale()) {
          ${exportName}.setLocale(saved).catch(() => {
            // The saved locale is no longer registered (pruned as unsupported, or
            // dropped in an app update) — keep the default locale instead of
            // surfacing an unhandled rejection on every boot.
          })
        }
      })
    })
    .catch(() => {
      // No storage provider bonded (or the wiring above threw) — locale
      // persistence is skipped and the default locale still applies.
    })
}
`
  }

  // Generic pattern: create instance from factory, call setter
  const instanceName = appBondSetup?.exportName ?? `${category}Client`
  let factoryArgs: string
  if (setup.configExtend?.length) {
    const extended = setup.configExtend.join(', ')
    factoryArgs = setup.configImport
      ? `{ ...${setup.configImport}, ${extended} }`
      : `{ ${extended} }`
  } else {
    factoryArgs = setup.configImport ?? ''
  }
  return `/**
 * Default ${category} bond setup
 *
 * Uses the built-in ${setup.factory} from ${packageName}.
 * Swap to a different ${category} provider by replacing this bond.
 */

${imports.join('\n')}

export const ${instanceName} = ${setup.factory}(${factoryArgs})

export function setup${pascal}(): void {
  ${setup.setter}(${instanceName})
}
`
}

/**
 * Generate service worker source file content.
 *
 * Produces a TypeScript service worker with Workbox precaching, app-shell
 * routing, image caching, and optionally push notification handling.
 */
function generateServiceWorkerSource(pushNotifications: boolean): string {
  const parts: string[] = []

  parts.push(`/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

clientsClaim()

// Precache all assets generated by the build process.
precacheAndRoute(self.__WB_MANIFEST)

// App Shell-style routing: all navigation requests are fulfilled
// with index.html so client-side routing works offline.
const fileExtensionRegexp = new RegExp('/[^/?]+\\\\.[^/]+$')
registerRoute(
  ({ request, url }: { request: Request; url: URL }) => {
    if (request.mode !== 'navigate') return false
    if (url.pathname.startsWith('/_')) return false
    if (url.pathname.match(fileExtensionRegexp)) return false
    return true
  },
  createHandlerBoundToURL('/index.html'),
)

// Cache images with a StaleWhileRevalidate strategy.
registerRoute(
  ({ url }: { url: URL }) => url.origin === self.location.origin && url.pathname.endsWith('.png'),
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 50 })],
  }),
)`)

  if (pushNotifications) {
    parts.push(`

/**
 * Display a push notification.
 */
const showNotification = async (notification: {
  title: string
  options: NotificationOptions
}): Promise<void> => {
  return self.registration.showNotification(
    notification.title,
    notification.options,
  )
}

/**
 * Close all notifications.
 */
const removeNotifications = async (): Promise<void> => {
  const notifications = await self.registration.getNotifications()
  for (const notification of notifications) {
    notification.close()
  }
}

/**
 * Focus an existing window or open a new one.
 */
const focusWindow = async (): Promise<void> => {
  const allClients = await self.clients.matchAll({ type: 'window' })

  if (allClients.length > 0) {
    allClients[0].focus()
  } else {
    const client = await self.clients.openWindow('/')
    client?.focus()
  }
}

// Close the notification and focus a window when clicked.
self.onnotificationclick = (event: NotificationEvent) => {
  event.notification.close()
  event.waitUntil(focusWindow())
}

// Show a notification when a push event is received.
self.addEventListener('push', (event) => {
  try {
    const data = event.data?.json()
    const { title, ...options } = data

    if (title) {
      event.waitUntil(showNotification({ title, options }))
    }
  } catch (error) {
    console.error('Push notification error:', error)
  }
})`)
  }

  const windowFocusedHandler = pushNotifications
    ? `
    case 'WINDOW_FOCUSED':
      return event.waitUntil(removeNotifications())`
    : ''

  parts.push(`

// Listen for messages from the application.
self.addEventListener('message', (event) => {
  switch (event.data?.type) {
    case 'SKIP_WAITING':
      return event.waitUntil(self.skipWaiting())${windowFocusedHandler}
    default:
      return
  }
})
`)

  return parts.join('')
}

/**
 * Generate resource wrapper — dispatches between AI and heuristic.
 */
async function generateWrapperContent(pkg: InferredPackage): Promise<string> {
  if (isAIAvailable()) {
    try {
      return await generateWrapperContentAI(pkg)
    } catch (error) {
      console.warn(
        `[injector] AI wrapper generation failed for '${pkg.name}', using heuristic: ${String(error)}`,
      )
    }
  }
  return generateWrapperContentHeuristic(pkg)
}

/**
 * AI-driven resource wrapper generation.
 * Reads README.md to determine exports (authorization, services, handler map, etc.)
 */
async function generateWrapperContentAI(pkg: InferredPackage): Promise<string> {
  await loadMoleculeMdBatch([pkg])
  const context = buildPackageContext([pkg])
  const resourcePkg = requirePackageByRole('api', 'infrastructure', 'resource')
  return generateCode(
    buildWrapperPrompt(),
    context,
    `Generate resource wrapper for ${pkg.name}.
Package exports: [${pkg.exports.join(', ')}]
If it exports createRequestHandlerMap, call it with createRequestHandler from ${resourcePkg}.
Re-export any extra exports described in README.md (like authorization).`,
  )
}

/**
 * The accessor exports the GENERATED `router.ts` imports from a resource
 * wrapper besides the handler map.
 *
 * `generateRouterContentHeuristic` emits the app-wide gate
 * (`router.use(xAuthorization.verifyMiddleware())`) for every resource whose
 * package `exports` include `authorization`, and imports it as
 * `{ authorization as xAuthorization }` from that resource's wrapper. The
 * wrapper is what has to export it, so this list is its contract — not a
 * per-package special case: the router keys the import on the package's own
 * scanned `exports`, while `molecule.reExports` is hand-maintained registry
 * metadata, so a wrapper that re-exported only `reExports` produced a router
 * importing a name that does not exist (TS2305) in every scaffolded project
 * using such a resource. Registry `reExports` stays the place for ADDITIONAL
 * accessors (e.g. Device's `deviceService`).
 */
const ROUTER_ACCESSOR_EXPORTS: readonly string[] = ['authorization']

/** The accessor exports of `exports` the generated router will import from the wrapper. */
function routerAccessorExports(exports: readonly string[]): string[] {
  return exports.filter((e) => ROUTER_ACCESSOR_EXPORTS.includes(e))
}

/**
 * Heuristic resource wrapper generation (fallback).
 *
 * Detects whether the package exports a `createRequestHandlerMap` factory
 * or a static `requestHandlerMap` object and generates the appropriate code.
 * Extra exports a resource makes available to the app (e.g. `authorization`) are
 * re-exported when the registry entry names them in `molecule.reExports` — the
 * mapping is registry metadata, never a per-package special case here — plus
 * the accessors the generated router imports (see
 * {@link ROUTER_ACCESSOR_EXPORTS}), which the wrapper must export for that
 * import to resolve.
 */
async function generateWrapperContentHeuristic(pkg: InferredPackage): Promise<string> {
  const exports = pkg.exports.length > 0 ? pkg.exports : await scanExportsFromPath(pkg.path)
  const accessors = routerAccessorExports(exports)

  if (exports.includes('createRequestHandlerMap')) {
    const resourcePkg = requirePackageByRole('api', 'infrastructure', 'resource')
    // Re-export special exports declared in registry metadata, plus the
    // accessors the generated router imports from this wrapper.
    const reExportList = (pkg.molecule?.reExports as string[] | undefined) ?? []
    const extraExports = exports.filter((e) => reExportList.includes(e) || accessors.includes(e))
    const extraImports = extraExports.length > 0 ? `, ${extraExports.join(', ')}` : ''
    const extraReExports =
      extraExports.length > 0 ? extraExports.map((e) => `export { ${e} }`).join('\n') + '\n\n' : ''

    return `import { createRequestHandler } from '${resourcePkg}'
import { createRequestHandlerMap${extraImports} } from '${pkg.name}'

${extraReExports}export const requestHandlerMap = createRequestHandlerMap(createRequestHandler)
`
  }

  if (exports.includes('requestHandlerMap')) {
    // The accessor re-exports the generated router's
    // `import { authorization as … }` resolves against.
    const accessorReExports =
      accessors.length > 0
        ? accessors.map((e) => `export { ${e} } from '${pkg.name}'`).join('\n') + '\n'
        : ''
    return `export { requestHandlerMap } from '${pkg.name}'
${accessorReExports}`
  }

  // Fallback: re-export individual handler functions (not types)
  const handlerExports = exports.filter(
    (e) => /^[a-z]/.test(e) && e !== 'default' && !e.endsWith('Schema'),
  )

  if (handlerExports.length === 0) {
    // `export *` carries every accessor too.
    return `export * from '${pkg.name}'
`
  }

  // An accessor that is ALSO a handler export is already a local binding from
  // the import below — re-export the binding rather than the module, so the
  // file names it once.
  const importedNames = new Set(handlerExports)
  const accessorReExports =
    accessors
      .map((e) => (importedNames.has(e) ? `export { ${e} }` : `export { ${e} } from '${pkg.name}'`))
      .join('\n') + (accessors.length > 0 ? '\n' : '')

  return `import { ${handlerExports.join(', ')} } from '${pkg.name}'

${accessorReExports}export const requestHandlerMap = { ${handlerExports.join(', ')} } as const
`
}

/**
 * Generate router.ts content.
 *
 * Uses the heuristic which derives routes from registry metadata —
 * deterministic and correct. AI generation is skipped because it
 * hallucinates wrong authorization imports and route patterns.
 */
function generateRouterContent(
  resourcePlans: InjectionPlan[],
  allMolecules: string[],
  registryPackages?: InferredPackage[],
  apiFramework: string = DEFAULT_API_FRAMEWORK,
): string {
  return generateRouterContentHeuristic(resourcePlans, allMolecules, registryPackages, apiFramework)
}

/**
 * Heuristic router generation.
 * Derives optional features from installed package names.
 */
function generateRouterContentHeuristic(
  resourcePlans: InjectionPlan[],
  allMolecules: string[],
  registryPackages?: InferredPackage[],
  apiFramework: string = DEFAULT_API_FRAMEWORK,
): string {
  const fw = getApiFrameworkConfig(apiFramework)
  const lines: string[] = []

  // Derive optional features from registry metadata
  const optionalFeatures = deriveOptionalFeatures(allMolecules, registryPackages)

  // Find resources that export authorization
  const authorizationResources = resourcePlans.filter((p) => {
    if (!p.moleculePackage) return false
    return p.moleculePackage.exports.includes('authorization')
  })

  // Determine which resources have active routes (to avoid unused imports)
  const resourcesWithRoutes = new Set<string>()
  for (const plan of resourcePlans) {
    if (!plan.moleculePackage) continue
    const activeRoutes = plan.moleculePackage.routes.filter(
      (r) => !r.optional || optionalFeatures.has(r.optional),
    )
    if (activeRoutes.length > 0) {
      resourcesWithRoutes.add(plan.molecule)
    }
  }

  // A resource exporting `authorization` supplies the app's GLOBAL auth gate
  // (`router.use(xAuthorization.verifyMiddleware())` below), which runs for every
  // route in the app — so it must be imported even when none of its OWN routes
  // are active. Gating that import on `resourcesWithRoutes` (while the `router.use`
  // loop iterates every authorization resource) is what emitted a `router.use`
  // for an identifier nothing had imported: a scaffolded project that cannot
  // compile (TS2304). Dropping the middleware instead would silently un-gate every
  // OTHER resource's routes, so the import is what has to follow the use.
  const authorizationImports = new Set(authorizationResources.map((plan) => plan.molecule))
  const resourceImports = new Set([...resourcesWithRoutes, ...authorizationImports])

  lines.push(fw.routerImport)

  // Import from resource wrappers: the handler map where the resource has active
  // routes, the authorization accessor where its global gate is emitted below.
  for (const plan of resourcePlans) {
    if (!plan.moleculePackage) continue
    if (!resourceImports.has(plan.molecule)) continue
    const name = extractResourceName(plan.molecule)
    const camelName = name.charAt(0).toLowerCase() + name.slice(1)
    if (authorizationImports.has(plan.molecule)) {
      lines.push(
        `import { authorization as ${camelName}Authorization } from './Resource/${name}/index.js'`,
      )
    }
    if (resourcesWithRoutes.has(plan.molecule)) {
      lines.push(`import { requestHandlerMap as ${name} } from './Resource/${name}/index.js'`)
    }
  }

  lines.push('')
  lines.push(`export const router = ${fw.routerCreate}`)
  lines.push('')

  // Global authorization middleware from resources that provide it
  for (const plan of authorizationResources) {
    const name = extractResourceName(plan.molecule)
    const camelName = name.charAt(0).toLowerCase() + name.slice(1)
    lines.push(`router.use(${camelName}Authorization.verifyMiddleware())`)
  }
  if (authorizationResources.length > 0) {
    lines.push('')
  }

  // Wire routes for each resource
  for (const plan of resourcePlans) {
    if (!plan.moleculePackage) continue
    const importName = extractResourceName(plan.molecule)

    for (const route of plan.moleculePackage.routes) {
      if (route.optional && !optionalFeatures.has(route.optional)) continue

      const chain: string[] = []
      for (const mw of route.middlewares) {
        chain.push(`  ${importName}.${mw},`)
      }
      chain.push(`  ${importName}.${route.handler}`)

      lines.push(`router.${route.method}(\`${route.path}\`,`)
      lines.push(chain.join('\n'))
      lines.push(`)`)
      lines.push('')
    }
  }

  return lines.join('\n')
}

/**
 * Derive optional features from installed package names using registry metadata.
 * Reads the `optionalFeature` field from registry entries instead of hardcoding
 * patterns like 'oauth' or 'stripe'.
 */
function deriveOptionalFeatures(
  allMolecules: string[],
  registryPackages?: InferredPackage[],
): Set<string> {
  const features = new Set<string>()

  if (registryPackages) {
    for (const pkg of registryPackages) {
      if (!allMolecules.includes(pkg.name)) continue
      const meta = pkg.molecule as Record<string, unknown> | undefined
      const feature = meta?.optionalFeature as string | undefined
      if (feature) features.add(feature)
    }
  }

  return features
}

/**
 * Generate server.ts content.
 *
 * Uses the heuristic which detects middleware from registry metadata —
 * deterministic and correct. AI generation is skipped because it
 * hallucinates wrong imports (e.g. @molecule/pem) and export patterns.
 */
function generateServerContent(
  allMolecules: string[],
  registryPackages?: InferredPackage[],
  apiFramework: string = DEFAULT_API_FRAMEWORK,
): string {
  return generateServerContentHeuristic(allMolecules, registryPackages, apiFramework)
}

/**
 * Heuristic server.ts generation.
 * Detects middleware from registry metadata instead of hardcoded names.
 */
function generateServerContentHeuristic(
  allMolecules: string[],
  registryPackages?: InferredPackage[],
  apiFramework: string = DEFAULT_API_FRAMEWORK,
): string {
  const fw = getApiFrameworkConfig(apiFramework)

  // Detect logger from registry metadata instead of hardcoding the package name
  const loggerPkg = (registryPackages ?? []).find(
    (p) => p.type === 'core' && p.molecule?.category === 'logger',
  )
  const hasLogger = loggerPkg ? allMolecules.includes(loggerPkg.name) : false
  const loggerPackageName = loggerPkg?.name

  // Detect monitoring from registry metadata
  const monitoringPkg = (registryPackages ?? []).find(
    (p) => p.type === 'core' && p.molecule?.category === 'monitoring',
  )
  const hasMonitoring = monitoringPkg ? allMolecules.includes(monitoringPkg.name) : false

  // Detect database packages (determines whether to run migrations on startup)
  const hasDatabase = (registryPackages ?? []).some(
    (p) => p.molecule?.category === 'database' && allMolecules.includes(p.name),
  )

  // Discover installed middleware from registry by type — plus router-factory
  // RESOURCES (e.g. api-resource-invoice) that mount as route sets via their
  // registry middlewareMountPath instead of the requestHandlerMap convention.
  const installedMiddleware = (registryPackages ?? []).filter(
    (p) =>
      (p.type === 'middleware' || (p.type === 'resource' && p.molecule?.middlewareMountPath)) &&
      allMolecules.includes(p.name),
  )
  const middlewareNames = installedMiddleware.map((p) => {
    const declared = p.molecule?.shortName
    const shortName = isSafeShortName(declared) ? declared : extractShortName(p.name)
    const camelName = middlewareIdentifier(shortName)
    // Packages whose "middleware" is really a route set (e.g. billing-routes →
    // /api/billing/*) declare their mount path in the registry. They mount
    // AFTER the /api router so the session annotation + body parsing are in
    // place and the bare /api router can't shadow their paths.
    const mountPath = (p.molecule?.middlewareMountPath as string | undefined) ?? null
    return { shortName, camelName, varName: `${camelName}Middleware`, mountPath }
  })

  const logError = hasLogger ? 'logger.error(error)' : 'console.error(error)'
  const logInfo = hasLogger ? 'logger.info' : 'console.log'

  const lines: string[] = []

  // External/node imports (alphabetical)
  const externalImports = [
    fw.serverImport,
    `import https from 'https'`,
    `import process from 'process'`,
    `import { fileURLToPath } from 'url'`,
  ].sort()
  lines.push(...externalImports)

  // @molecule/ imports
  if (hasLogger || hasMonitoring) {
    lines.push('')
  }
  if (hasLogger) {
    lines.push(`import { logger } from '${loggerPackageName}'`)
  }
  if (hasMonitoring) {
    lines.push(
      `import { getOptionalProvider as getMonitoringProvider, runAll as runMonitoringChecks } from '${monitoringPkg!.name}'`,
    )
  }

  // Local imports (alphabetical) — router is NOT imported statically; it must be
  // dynamically imported after setupBonds() so bond-conditional handler maps are built
  // with providers already registered. Middleware files are dynamic for the same
  // reason: their factories read config/env (e.g. billing tiers' Stripe price IDs)
  // at module evaluation, which only exists after setupBonds() has loaded .env.
  const localImports = [
    `import { setupBonds } from './bonds/index.js'`,
    ...(hasDatabase ? [`import { runMigrations } from './scripts/migrate.js'`] : []),
  ].sort()
  lines.push('')
  lines.push(...localImports)

  lines.push('')
  lines.push(`process.on('uncaughtException', error => ${logError})`)
  lines.push(`process.on('unhandledRejection', error => ${logError})`)
  lines.push('')

  lines.push(
    `export const create = async (port: number = (Number(process.env.PORT) || 4000)): Promise<${fw.serverType} | https.Server> => {`,
  )
  if (hasDatabase) {
    lines.push(`  await runMigrations()`)
  }
  lines.push(`  await setupBonds()`)
  lines.push(``)
  lines.push(`  // Import router after bonds are set up — handler maps are built at module`)
  lines.push(`  // evaluation time, so bond-conditional handlers need providers registered first.`)
  lines.push(`  const { router } = await import('./App/router.js')`)
  if (middlewareNames.length > 0) {
    lines.push(`  // Middleware likewise evaluates config/env at module scope (e.g. billing`)
    lines.push(`  // tiers' price IDs) — import only after setupBonds() has loaded .env.`)
    for (const mw of middlewareNames) {
      lines.push(`  const { ${mw.varName} } = await import('./middleware/${mw.shortName}.js')`)
    }
  }
  lines.push(``)
  lines.push(`  const app = ${fw.serverCreate}`)
  lines.push(`  app.disable('x-powered-by')`)
  lines.push(``)

  for (const mw of middlewareNames) {
    if (mw.mountPath) continue
    lines.push(`  app.use(${mw.varName})`)
  }
  if (!middlewareNames.some((mw) => mw.shortName === 'body-parser')) {
    // The parser's verify callback (part of the registry's jsonBodyParser
    // expression — the CLI never hardcodes framework code) saves the RAW
    // request bytes to req.rawBody before the stream is consumed: webhook
    // signature verification (Stripe, GitHub, …) HMACs the exact bytes, which
    // the parsed req.body no longer carries.
    lines.push(`  app.use(${fw.jsonBodyParser})`)
  }
  lines.push(``)

  lines.push(`  app.use('/api', router)`)

  // Route-set middleware (registry middlewareMountPath, e.g. billing-routes →
  // /api/billing/*): mounts after the /api router so session annotation and
  // body parsing apply, and unmatched /api/* requests fall through to it.
  for (const mw of middlewareNames) {
    if (!mw.mountPath) continue
    lines.push(`  app.use('${mw.mountPath}', ${mw.varName})`)
  }
  lines.push(``)
  lines.push(`  app.get('/health', (_req, res) => {`)
  lines.push(`    res.json({ status: 'ok', timestamp: new Date().toISOString() })`)
  lines.push(`  })`)
  lines.push(``)

  if (hasMonitoring) {
    lines.push(`  app.get('/status', async (_req, res) => {`)
    lines.push(`    const provider = getMonitoringProvider()`)
    lines.push(`    if (!provider) {`)
    lines.push(
      `      res.json({ status: 'operational', checks: {}, timestamp: new Date().toISOString() })`,
    )
    lines.push(`      return`)
    lines.push(`    }`)
    lines.push(`    const health = await runMonitoringChecks()`)
    lines.push(`    const statusCode = health.status === 'down' ? 503 : 200`)
    lines.push(`    res.status(statusCode).json(health)`)
    lines.push(`  })`)
    lines.push(``)
  }

  lines.push(`  app.use((${fw.errorHandlerSignature} => {`)
  lines.push(`    // Auth middleware passes the i18n-translated 'Unauthorized'`)
  lines.push(`    // string through next(); the trailing period varies by locale`)
  lines.push(`    // pack so we match both with and without it.`)
  lines.push(`    const errStr = typeof error === 'string' ? error : ''`)
  lines.push(`    if (errStr === 'Unauthorized' || errStr === 'Unauthorized.') {`)
  lines.push(`      res.status(401).send(error)`)
  lines.push(`      return`)
  lines.push(`    }`)
  lines.push(`    ${logError}`)
  lines.push(`    // Never delegate to the framework's default error handler — it can`)
  lines.push(`    // leak stack traces (absolute paths, dependency internals, error`)
  lines.push(`    // text) to clients whenever NODE_ENV !== 'production'. Always send a`)
  lines.push(`    // sanitized response so non-disclosure is independent of NODE_ENV.`)
  lines.push(`    if (!res.headersSent) {`)
  lines.push(`      res.status(500).json({ error: 'Internal Server Error' })`)
  lines.push(`    }`)
  lines.push(`  }) ${fw.errorHandlerCast})`)
  lines.push(``)

  lines.push(`  let server: ${fw.serverType} | https.Server = app`)
  lines.push(`  if (process.env.HTTPS) {`)
  lines.push(`    // Create a self-signed SSL certificate for local HTTPS development.`)
  lines.push(`    // pem is an optional dependency for local HTTPS development.`)
  lines.push(`    // eslint-disable-next-line @typescript-eslint/no-require-imports`)
  lines.push(`    const pem = require('pem') as {`)
  lines.push(`      createCertificate(`)
  lines.push(`        options: { days: number; selfSigned: boolean },`)
  lines.push(
    `        callback: (error: Error | null, keys: { serviceKey: string; certificate: string }) => void,`,
  )
  lines.push(`      ): void`)
  lines.push(`    }`)
  lines.push(`    server = await new Promise<https.Server>((resolve, reject) => {`)
  lines.push(`      pem.createCertificate({ days: 1, selfSigned: true }, (error, keys) => {`)
  lines.push(`        if (error) reject(error)`)
  lines.push(
    `        else resolve(https.createServer({ key: keys.serviceKey, cert: keys.certificate }, app))`,
  )
  lines.push(`      })`)
  lines.push(`    })`)
  lines.push(`  }`)
  lines.push(``)
  lines.push(`  const listener = server.listen(port, () => {`)
  lines.push(
    `    ${logInfo}(\`Started \${process.env.NODE_ENV} \${process.env.HTTPS ? 'HTTPS' : 'HTTP'} server on port \${port}.\`)`,
  )
  lines.push(`  })`)
  lines.push(``)
  lines.push(`  // A realtime provider bonded with deferAttach (the socketio/ws/sse bond`)
  lines.push(`  // stubs) binds no port of its own — attach it to the API's HTTP server so`)
  lines.push(`  // realtime shares the API port (e.g. /socket.io, /sse) instead of a`)
  lines.push(`  // standalone port a container/proxy may not expose. The import specifier is`)
  lines.push(`  // a variable on purpose: projects WITHOUT a realtime package must compile`)
  lines.push(`  // (no static dependency) and simply skip the attach at runtime.`)
  lines.push(`  try {`)
  lines.push(`    const realtimePackage = '@molecule/api-realtime'`)
  lines.push(`    const realtime = (await import(realtimePackage)) as {`)
  lines.push(`      hasProvider(): boolean`)
  lines.push(`      getProvider(): { attachHttpServer?: (server: unknown) => void }`)
  lines.push(`    }`)
  lines.push(`    if (realtime.hasProvider()) realtime.getProvider().attachHttpServer?.(listener)`)
  lines.push(`  } catch (_error) {`)
  lines.push(`    // @molecule/api-realtime is not installed in this project — nothing to attach.`)
  lines.push(`  }`)
  lines.push(``)
  lines.push(`  return server`)
  lines.push(`}`)
  lines.push(``)
  lines.push(`if (process.argv[1] === fileURLToPath(import.meta.url)) {`)
  lines.push(`  create()`)
  lines.push(`}`)
  lines.push(``)

  return lines.join('\n')
}

/**
 * Generate bonds/index.ts content with a setupBonds function.
 */
export function generateBondsIndexContent(
  bondSetups: BondSetup[],
  serviceBondNames: string[] = [],
  secretKeys: string[] = [],
  allMolecules: string[] = [],
  registryPackages?: InferredPackage[],
): string {
  if (bondSetups.length === 0 && serviceBondNames.length === 0) {
    return `/**
 * Bond setup - no providers configured.
 */
export async function setupBonds(): Promise<void> {
  // No providers to wire. Add bonds via mlcl inject.
}
`
  }

  const bondNames = bondSetups.map((b) => extractBondName(b.providerPackage))

  // Secrets provider must be bonded FIRST so resolveAll() can load .env values.
  // Monitoring bond must be set up next so other bonds can register health checks.
  // Service bonds must be set up BEFORE provider bonds, so that resources
  // like User can query device/plans/paymentRecords during initialization.
  // Use registry metadata to identify category-specific bonds (not hardcoded strings).
  const secretsProviderNames = new Set(
    bondSetups
      .filter((b) => {
        const reg = (registryPackages ?? []).find((p) => p.name === b.providerPackage)
        return reg?.molecule?.category === 'secrets'
      })
      .map((b) => extractBondName(b.providerPackage)),
  )
  const monitoringProviderNames = new Set(
    bondSetups
      .filter((b) => {
        const reg = (registryPackages ?? []).find((p) => p.name === b.providerPackage)
        return reg?.molecule?.category === 'monitoring'
      })
      .map((b) => extractBondName(b.providerPackage)),
  )
  const secretsBonds = bondNames.filter((n) => secretsProviderNames.has(n))
  const monitoringBonds = bondNames.filter(
    (n) => monitoringProviderNames.has(n) && !secretsProviderNames.has(n),
  )
  const otherBonds = bondNames.filter(
    (n) => !monitoringProviderNames.has(n) && !secretsProviderNames.has(n),
  )
  const allNames = [...secretsBonds, ...monitoringBonds, ...serviceBondNames, ...otherBonds]

  const imports = allNames
    .map((name) => {
      const pascal = bondNameToPascal(name)
      return `import { setup${pascal} } from './${name}.js'`
    })
    .join('\n')
  const secretsSetupCalls = secretsBonds
    .map((name) => {
      const pascal = bondNameToPascal(name)
      return `  setup${pascal}()`
    })
    .join('\n')
  const otherSetupCalls = allNames
    .filter((n) => !secretsProviderNames.has(n))
    .map((name) => {
      const pascal = bondNameToPascal(name)
      return `  setup${pascal}()`
    })
    .join('\n')

  const resolveCall =
    secretKeys.length > 0
      ? `  await resolveAll([${secretKeys.map((k) => `'${k}'`).join(', ')}])`
      : '  await resolveAll()'

  const secretsPkg = requirePackageByRole('api', 'core', 'secrets')

  // Auto-register health checks when monitoring is installed alongside database/cache.
  // Use registry metadata to detect monitoring core and database/cache providers.
  const monitoringPkg = (registryPackages ?? []).find(
    (p) => p.type === 'core' && p.molecule?.category === 'monitoring',
  )
  const hasMonitoring = monitoringPkg ? allMolecules.includes(monitoringPkg.name) : false
  const hasDatabase = (registryPackages ?? []).some(
    (p) =>
      p.molecule?.type === 'provider' &&
      p.molecule?.category === 'database' &&
      allMolecules.includes(p.name),
  )
  const hasCache = (registryPackages ?? []).some(
    (p) =>
      p.molecule?.type === 'provider' &&
      p.molecule?.category === 'cache' &&
      allMolecules.includes(p.name),
  )
  const needsAutoRegistration = hasMonitoring && (hasDatabase || hasCache)

  let monitoringImport = ''
  let monitoringRegistration = ''
  if (needsAutoRegistration) {
    const checkImports: string[] = ['getOptionalProvider as getMonitoring']
    if (hasDatabase) checkImports.push('createDatabaseCheck')
    if (hasCache) checkImports.push('createCacheCheck')
    monitoringImport = `import { ${checkImports.join(', ')} } from '${monitoringPkg!.name}'\n`

    const registrations: string[] = []
    registrations.push(`\n  // Auto-register health checks for bonded providers`)
    registrations.push(`  const monitor = getMonitoring()`)
    registrations.push(`  if (monitor) {`)
    if (hasDatabase) registrations.push(`    monitor.register(createDatabaseCheck())`)
    if (hasCache) registrations.push(`    monitor.register(createCacheCheck())`)
    registrations.push(`  }`)
    monitoringRegistration = registrations.join('\n')
  }

  // Auto-wire the entitlements bond when `@molecule/api-entitlements` is selected.
  // Templates that include subscription billing ship a `src/tiers.ts` exporting
  // a `setupEntitlements()` function that builds the per-app tier registry and
  // bonds it. We import + call it after secrets so the registry is available
  // before any other bond reads it.
  const hasEntitlements = allMolecules.includes('@molecule/api-entitlements')
  const entitlementsImport = hasEntitlements
    ? `import { setupEntitlements } from '../tiers.js'\n`
    : ''
  const entitlementsCall = hasEntitlements ? `\n  setupEntitlements()` : ''

  return `import { resolveAll } from '${secretsPkg}'
${monitoringImport}${entitlementsImport}${imports}

/**
 * Initialize all providers and service bonds.
 * Resolves all registered secrets before wiring providers.
 */
export async function setupBonds(): Promise<void> {
${secretsSetupCalls ? `  // Secrets provider must be bonded first so resolveAll can load .env values\n${secretsSetupCalls}\n\n` : ''}${resolveCall}${entitlementsCall}
${otherSetupCalls}${monitoringRegistration}
}
`
}

// =============================================================================
// Smoke test generation
// =============================================================================

/**
 * Collect all @molecule/* packages that need mocking for tests.
 * Scans allMolecules and resource wrapper imports.
 */
function collectMoleculeMocks(allMolecules: string[], resourcePlans: InjectionPlan[]): string[] {
  const mocks = new Set<string>()

  for (const m of allMolecules) {
    if (m.startsWith('@molecule/')) mocks.add(m)
  }

  // Resource packages need their factory functions mocked
  for (const plan of resourcePlans) {
    if (!plan.moleculePackage) continue
    mocks.add(plan.molecule)
  }

  return [...mocks].sort()
}

/**
 * Generate vi.mock() calls — dispatches between AI and heuristic.
 */
async function generateMoleculeViMocks(
  allMolecules: string[],
  resourcePlans: InjectionPlan[],
): Promise<string> {
  if (isAIAvailable()) {
    try {
      return await generateMoleculeViMocksAI(allMolecules, resourcePlans)
    } catch (error) {
      console.warn(`[injector] AI mock generation failed, using heuristic: ${String(error)}`)
    }
  }
  return generateMoleculeViMocksHeuristic(allMolecules, resourcePlans)
}

/**
 * AI-driven mock generation.
 * Reads package exports to determine appropriate mock shapes.
 */
async function generateMoleculeViMocksAI(
  allMolecules: string[],
  resourcePlans: InjectionPlan[],
): Promise<string> {
  const moleculePkgs = collectMoleculeMocks(allMolecules, resourcePlans)
  const pkgSummary = moleculePkgs
    .map((pkg) => {
      const plan = resourcePlans.find((p) => p.molecule === pkg)
      const exports = plan?.moleculePackage?.exports ?? []
      const routes = plan?.moleculePackage?.routes ?? []
      const handlers = routes.flatMap((r) => [...r.middlewares, r.handler])
      return `${pkg} (exports: [${exports.join(', ')}], handlers: [${handlers.join(', ')}])`
    })
    .join('\n')

  // Build mock instructions from registry testMock data instead of hardcoding package names
  const registry = getRawRegistry()
  const testMockInstructions = moleculePkgs
    .filter((pkg) => registry.packages[pkg]?.testMock)
    .map((pkg) => {
      const testMock = registry.packages[pkg].testMock as Record<string, string>
      const mockDesc = Object.entries(testMock)
        .map(([key, val]) => `${key}: ${val}`)
        .join(', ')
      return `${pkg}: mock with { ${mockDesc} }.`
    })
    .join('\n')

  return generateCode(
    MOCK_PROMPT,
    pkgSummary,
    `Generate vi.mock() for each of these packages:
${moleculePkgs.join('\n')}

Resource packages with createRequestHandlerMap: mock the factory returning handler vi.fn()s.
Resources exporting 'authorization': include verifyMiddleware as no-op middleware mock.
Middleware packages (type: middleware): Proxy returning no-op middleware for any export.
OAuth provider packages (implements @molecule/api-oauth): mock with testMock data below.
${testMockInstructions}
Other packages: mock every camelCase registry export as vi.fn() — never an empty object
(module-scope calls like expectBond() crash on import against an empty mock).`,
  )
}

/**
 * Heuristic mock generation (fallback).
 * Generates mock shapes based on package type and exports.
 */
function generateMoleculeViMocksHeuristic(
  allMolecules: string[],
  resourcePlans: InjectionPlan[],
): string {
  const lines: string[] = []

  const resourceHandlerMap = new Map<string, Set<string>>()
  const resourceExportsMap = new Map<string, string[]>()
  for (const plan of resourcePlans) {
    if (!plan.moleculePackage) continue
    const handlers = new Set<string>()
    for (const route of plan.moleculePackage.routes) {
      for (const mw of route.middlewares) handlers.add(mw)
      handlers.add(route.handler)
    }
    resourceHandlerMap.set(plan.molecule, handlers)
    resourceExportsMap.set(plan.molecule, plan.moleculePackage.exports)
  }

  const moleculePkgs = collectMoleculeMocks(allMolecules, resourcePlans)

  const registry = getRawRegistry()

  for (const pkg of moleculePkgs) {
    // Check registry for testMock metadata
    const testMock = registry.packages[pkg]?.testMock as Record<string, string> | undefined
    if (testMock) {
      const mockEntries = Object.entries(testMock)
        .map(([key, value]) => `  ${key}: ${value},`)
        .join('\n')
      lines.push(`vi.mock('${pkg}', () => ({`)
      lines.push(mockEntries)
      lines.push(`}))`)
    } else if (resourceHandlerMap.has(pkg)) {
      const handlers = resourceHandlerMap.get(pkg)!
      const pkgExports = resourceExportsMap.get(pkg) ?? []
      const hasAuthorization = pkgExports.includes('authorization')
      const hasFactory = pkgExports.includes('createRequestHandlerMap')

      if (hasFactory) {
        const handlerEntries = [...handlers].map((h) => `    ${h}: vi.fn()`).join(',\n')
        lines.push(`vi.mock('${pkg}', () => ({`)
        lines.push(`  createRequestHandlerMap: () => ({`)
        lines.push(handlerEntries)
        lines.push(`  }),`)
        if (hasAuthorization) {
          lines.push(
            `  authorization: { verifyMiddleware: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()) },`,
          )
        }
        lines.push(`}))`)
      } else if (pkgExports.includes('requestHandlerMap')) {
        // Static requestHandlerMap — mock as object with handler entries
        const handlerEntries = [...handlers].map((h) => `    ${h}: vi.fn()`).join(',\n')
        lines.push(`vi.mock('${pkg}', () => ({`)
        lines.push(`  requestHandlerMap: {`)
        lines.push(handlerEntries)
        lines.push(`  },`)
        if (hasAuthorization) {
          lines.push(
            `  authorization: { verifyMiddleware: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()) },`,
          )
        }
        lines.push(`}))`)
      } else {
        const camelExports = pkgExports.filter(
          (e) => /^[a-z]/.test(e) && e !== 'default' && !e.endsWith('Schema'),
        )
        const mockExports = camelExports.length > 0 ? camelExports : [...handlers]
        const entries = mockExports.map((h) => `  ${h}: vi.fn()`).join(',\n')
        lines.push(`vi.mock('${pkg}', () => ({`)
        lines.push(entries)
        if (hasAuthorization) {
          lines.push(
            `,\n  authorization: { verifyMiddleware: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()) },`,
          )
        }
        lines.push(`}))`)
      }
    } else if (registry.packages[pkg]?.type === 'middleware') {
      lines.push(`vi.mock('${pkg}', () => new Proxy({}, {`)
      lines.push(`  get: () => () => (_req: unknown, _res: unknown, next: () => void) => next(),`)
      lines.push(`}))`)
    } else {
      // Registry-driven surface for every other package: a module-scope call
      // into an empty `{}` mock crashes the test on import. Core packages call
      // `expectBond(type)` at module scope (see @molecule/api-bond), and the
      // migration runner's typed-wrapper import pulls such cores into the
      // smoke test's module graph — the scaffold's own suite then died on
      // `No "expectBond" export is defined on the "@molecule/api-bond" mock`.
      // Mock each registry export (camelCase values; type exports carry no
      // runtime surface) as a vi.fn() instead.
      const camelExports = (registry.packages[pkg]?.exports ?? []).filter(
        (e: string) => /^[a-z]/.test(e) && e !== 'default' && !e.endsWith('Schema'),
      )
      const entries = camelExports.map((e: string) => `  ${e}: vi.fn(),`).join('\n')
      lines.push(`vi.mock('${pkg}', () => ({`)
      if (entries) lines.push(entries)
      lines.push(`}))`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Generate server smoke test that verifies:
 * - Server creates without crashing
 * - Health endpoint responds
 * - Exports are correct
 *
 * @param moleculeMocks - The `vi.mock()` block for every @molecule/* package,
 *   built ONCE per synthesis by the caller (see synthesizeProjectFiles) — the
 *   AI-backed builder is a metered request, so neither smoke test may rebuild
 *   it.
 */
function generateServerSmokeTest(
  allMolecules: string[],
  registryPackages?: InferredPackage[],
  moleculeMocks = '',
): string {
  // Discover installed middleware from registry by type — plus router-factory
  // RESOURCES (e.g. api-resource-invoice) that mount as route sets via their
  // registry middlewareMountPath instead of the requestHandlerMap convention.
  const installedMiddleware = (registryPackages ?? []).filter(
    (p) =>
      (p.type === 'middleware' || (p.type === 'resource' && p.molecule?.middlewareMountPath)) &&
      allMolecules.includes(p.name),
  )
  const noopMiddleware = `(_req: unknown, _res: unknown, next: () => void) => next()`
  const middlewareMocks = installedMiddleware.map((p) => {
    const declared = p.molecule?.shortName
    const shortName = isSafeShortName(declared) ? declared : extractShortName(p.name)
    const camelName = middlewareIdentifier(shortName)
    return `vi.mock('../middleware/${shortName}.js', () => ({ ${camelName}Middleware: ${noopMiddleware} }))`
  })

  return `import { describe, it, expect, vi } from 'vitest'

// Mock bonds to avoid requiring real connections when server.ts is imported
// below. The bonds/index block further down reads the REAL module through
// vi.importActual — this mock exists to shield server.ts's import, not to
// hide the generated bonds/index.ts from its own smoke test.
vi.mock('../bonds/index.js', () => ({
  setupBonds: vi.fn(),
}))

// Mock the migration runner: server.ts imports it at module scope, and the
// runner's typed-wrapper import (@molecule/api-bonds-default-express) would
// otherwise drag every provider bond's module graph — and its module-scope
// bond calls — into this smoke test.
vi.mock('../scripts/migrate.js', () => ({
  runMigrations: vi.fn(),
}))

// Mock middleware to avoid loading @molecule/* middleware packages
${middlewareMocks.join('\n')}

// Mock all @molecule/* packages
${moleculeMocks}
describe('server', () => {
  it('exports a create function', async () => {
    const { create } = await import('../server.js')
    expect(typeof create).toBe('function')
  })
})

describe('bonds/index', () => {
  it('exports setupBonds function', async () => {
    // The REAL module — the vi.mock above only shields server.ts's import.
    // Asserting against the mock could never fail: a generated bonds/index.ts
    // that did not export setupBonds (or failed to load at all) passed its own
    // smoke suite and crashed the server at boot instead.
    const bonds = (await vi.importActual('../bonds/index.js')) as Record<string, unknown>
    expect(typeof bonds.setupBonds).toBe('function')
  })
})

describe('router', () => {
  it('exports a router', async () => {
    const { router } = await import('../App/router.js')
    expect(router).toBeDefined()
  })
})
`
}

/**
 * Generate route smoke test that verifies:
 * - Each resource wrapper exports requestHandlerMap
 * - requestHandlerMap has expected handler keys
 *
 * @param moleculeMocks - The `vi.mock()` block for every @molecule/* package,
 *   built ONCE per synthesis by the caller (see synthesizeProjectFiles) — the
 *   AI-backed builder is a metered request, so neither smoke test may rebuild
 *   it.
 */
function generateRouteSmokeTest(resourcePlans: InjectionPlan[], moleculeMocks = ''): string | null {
  if (resourcePlans.length === 0) return null

  const lines: string[] = []

  lines.push(`import { describe, it, expect, vi } from 'vitest'`)
  lines.push('')
  lines.push('// Mock bonds and all @molecule/* dependencies')
  lines.push(`vi.mock('../bonds/index.js', () => ({`)
  lines.push(`  setupBonds: vi.fn(),`)
  lines.push(`}))`)
  lines.push('')
  lines.push(moleculeMocks)

  for (const plan of resourcePlans) {
    if (!plan.moleculePackage) continue
    const name = extractResourceName(plan.molecule)

    // Collect expected handler names from routes
    const handlerNames = new Set<string>()
    for (const route of plan.moleculePackage.routes) {
      for (const mw of route.middlewares) handlerNames.add(mw)
      handlerNames.add(route.handler)
    }

    lines.push(`describe('Resource: ${name}', () => {`)
    lines.push(`  it('exports requestHandlerMap', async () => {`)
    lines.push(`    const mod = await import('../App/Resource/${name}/index.js')`)
    lines.push(`    expect(mod.requestHandlerMap).toBeDefined()`)
    lines.push(`  })`)
    lines.push('')
    lines.push(`  it('requestHandlerMap has expected handlers', async () => {`)
    lines.push(`    const { requestHandlerMap } = await import('../App/Resource/${name}/index.js')`)

    // Check core handlers (skip optional ones like payments/oauth)
    const requiredHandlers = [...handlerNames]
      .filter(
        (h) =>
          ![
            'verifyStripeSubscription',
            'handleStripeNotification',
            'verifyAppleSubscription',
            'handleAppleIAPNotification',
            'verifyGoogleSubscription',
            'handleGoogleIAPNotification',
            'logInOAuth',
          ].includes(h),
      )
      .slice(0, 5)

    if (requiredHandlers.length > 0) {
      lines.push(`    const keys = Object.keys(requestHandlerMap)`)
      for (const handler of requiredHandlers) {
        lines.push(`    expect(keys).toContain('${handler}')`)
      }
    } else {
      lines.push(`    expect(requestHandlerMap).toBeDefined()`)
    }

    lines.push(`  })`)
    lines.push(`})`)
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Generate app bonds smoke test that verifies:
 * - bonds/index exports setupProviders function
 * - setupProviders() completes without throwing
 * - Re-exported provider instances are defined
 */
function generateAppBondsSmokeTest(allMolecules: string[], reExportNames: string[]): string {
  const lines: string[] = []
  const registry = getRawRegistry()

  lines.push(`import { describe, it, expect, vi } from 'vitest'`)
  lines.push('')

  // Mock config to avoid importing real app config (used by auth-default bond)
  lines.push(`// Mock config to avoid importing real app config`)
  lines.push(`vi.mock('../config.js', () => ({`)
  lines.push(`  authConfig: {},`)
  lines.push(`  oauthConfig: {},`)
  lines.push(`  loadContent: vi.fn(),`)
  lines.push(`  API_BASE_URL: '',`)
  lines.push(`}))`)
  lines.push('')

  // Mock locale files if i18n provider is present
  const hasI18n = allMolecules.some(
    (m) => m.startsWith('@molecule/app-i18n-') && m !== '@molecule/app-i18n',
  )
  if (hasI18n) {
    lines.push(`// Mock locale imports for i18n bond`)
    lines.push(`vi.mock('../locales/en/ui.js', () => ({ ui: {} }))`)
    lines.push('')
  }

  // Mock all @molecule/* packages based on registry exports
  const moleculePkgs = allMolecules.filter((m) => m.startsWith('@molecule/')).sort()

  lines.push(`// Mock all @molecule/* packages`)
  for (const pkg of moleculePkgs) {
    const regEntry = registry.packages[pkg]
    const exports = regEntry?.exports ?? []

    if (exports.length === 0) {
      lines.push(`vi.mock('${pkg}', () => ({}))`)
      lines.push('')
      continue
    }

    const mockEntries: string[] = []
    for (const exp of exports) {
      if (exp === 'default' || exp === '*' || exp.endsWith('Schema') || !/^[a-zA-Z_$]/.test(exp))
        continue

      if (/^(set|register)[A-Z]/.test(exp)) {
        mockEntries.push(`  ${exp}: vi.fn()`)
      } else if (/^create[A-Z]/.test(exp)) {
        // Factory — return object with common methods mocked
        mockEntries.push(
          `  ${exp}: vi.fn(() => ({ onLocaleChange: vi.fn(), initialize: vi.fn() }))`,
        )
      } else if (/^(get|is|has|use)[A-Z]/.test(exp)) {
        mockEntries.push(`  ${exp}: vi.fn()`)
      } else {
        // Named export — mock as empty object (covers provider, classMap, iconSet, etc.)
        mockEntries.push(`  ${exp}: {}`)
      }
    }

    if (mockEntries.length > 0) {
      lines.push(`vi.mock('${pkg}', () => ({`)
      lines.push(mockEntries.join(',\n'))
      lines.push(`}))`)
    } else {
      lines.push(`vi.mock('${pkg}', () => ({}))`)
    }
    lines.push('')
  }

  // Test cases
  lines.push(`describe('bonds/index', () => {`)
  lines.push(`  it('exports setupProviders function', async () => {`)
  lines.push(`    const mod = await import('../bonds/index.js')`)
  lines.push(`    expect(typeof mod.setupProviders).toBe('function')`)
  lines.push(`  })`)
  lines.push('')
  lines.push(`  it('setupProviders completes without error', async () => {`)
  lines.push(`    const { setupProviders } = await import('../bonds/index.js')`)
  lines.push(`    expect(() => setupProviders()).not.toThrow()`)
  lines.push(`  })`)

  if (reExportNames.length > 0) {
    lines.push('')
    lines.push(`  it('exports provider instances', async () => {`)
    lines.push(`    const mod = await import('../bonds/index.js')`)
    for (const name of reExportNames) {
      lines.push(`    expect(mod.${name}).toBeDefined()`)
    }
    lines.push(`  })`)
  }

  lines.push(`})`)
  lines.push('')

  return lines.join('\n')
}

/**
 * Resolve default providers from injection plans (for standalone inject).
 *
 * Scans peer dependencies from all plans to find core packages with a
 * defaultProvider declaration. If no provider for that category exists
 * in the current molecule list, returns the default provider names to add.
 *
 * Framework-aware: if the project uses a specific framework (e.g. react-native),
 * prefers a provider with a matching `framework` field over the generic
 * `defaultProvider` (e.g. nativewind over tailwind for RN projects).
 */
export async function resolveDefaultProvidersFromPlans(
  plans: InjectionPlan[],
  currentMolecules: string[],
  projectPath: string,
): Promise<string[]> {
  const allNames = new Set(currentMolecules)

  // Detect project framework from current molecules via registry. `loadRegistry()`
  // ALWAYS returns an array — it throws for a missing registry file — so this used
  // to sit behind an always-true `if (registry)`: dead code that implied a falsy
  // registry takes some other path, the same shape the inject command dropped for
  // its locale lookup. It does not: an empty registry simply matches no framework.
  const registry = loadRegistry()
  let projectFramework: string | undefined
  for (const name of allNames) {
    const regPkg = registry.find((p) => p.name === name)
    if (regPkg?.molecule?.category === 'framework' && regPkg.molecule.framework) {
      projectFramework = regPkg.molecule.framework
      break
    }
  }

  // Collect all core package names to check — both direct molecules and peer deps
  const coreCheckNames = new Set<string>()

  // Include direct molecules (handles alwaysInclude packages)
  for (const name of currentMolecules) {
    coreCheckNames.add(name)
  }

  // Include peer dep names from all plans (handles transitive deps)
  for (const plan of plans) {
    for (const dep of plan.dependencies) {
      if (dep.name.startsWith('@molecule/') && dep.type === 'peerDependency') {
        coreCheckNames.add(dep.name)
      }
    }
  }

  // Scan each candidate for defaultProvider
  const additions: string[] = []
  for (const name of coreCheckNames) {
    const pkgPath = await findMoleculePackage(name, projectPath)
    if (!pkgPath) continue

    let pkg: InferredPackage
    try {
      pkg = await scanPackage(pkgPath)
    } catch (error) {
      console.warn(`[injector] Could not scan package at '${pkgPath}': ${String(error)}`)
      continue
    }

    if (pkg.molecule?.type !== 'core' || !pkg.molecule?.defaultProvider) continue

    // Check if any provider implementing this core already exists
    const hasProvider = [...allNames, ...additions].some((existing) => {
      const plan = plans.find((p) => p.molecule === existing)
      return plan?.moleculePackage?.molecule?.implements === name
    })

    if (!hasProvider) {
      // Prefer a framework-specific provider when one exists in the registry
      // (`registry` is always the array loadRegistry returned — see above).
      if (projectFramework) {
        const frameworkProvider = registry.find(
          (p) =>
            p.molecule?.implements === name &&
            p.molecule?.type === 'provider' &&
            p.molecule?.framework === projectFramework,
        )
        if (frameworkProvider) {
          additions.push(frameworkProvider.name)
          continue
        }
      }

      additions.push(pkg.molecule.defaultProvider)
    }
  }

  return additions
}
