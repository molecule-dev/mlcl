/**
 * The ONE resolver for a package's setup SQL bytes, bound to the exact package
 * version the caller intends to install.
 *
 * Both consumers read through here:
 *
 * - the compatibility preflight (`database-compatibility.ts`) judges exactly the
 *   bytes a scaffold will replay;
 * - `copySqlSetupScripts` (`scaffold.ts`) writes those bytes into
 *   `<api>/__setup__/`.
 *
 * Resolving twice is how the two drifted: the preflight walked Node's own
 * `node_modules` chain and passed on a production host, while the copier joined
 * only `<project>/node_modules` and the molecule source path — so a
 * `--skip-install` scaffold shipped an EMPTY `__setup__/` and booted with none
 * of its resource tables.
 *
 * Resolving the right VERSION is the same failure one layer down. A walk-up can
 * reach a copy of another version (a parent fleet install, a sibling checkout, a
 * project whose own install has not run yet), and the registry bundle is the
 * DDL of ONE release. Setup SQL changes between releases — `api-resource-comment`
 * gained `comment_numbers.sql` — so bytes from the wrong version are the wrong
 * schema beside the right code. The caller therefore passes the version it is
 * actually pinning (`versions`), and the resolver binds to it:
 *
 * 1. an INSTALLED copy (a project's `node_modules`, then any ancestor fleet
 *    install) or the molecule SOURCE tree (`pkg.path`) — but ONLY when that
 *    root's own `package.json` declares the intended version. The first
 *    MATCHING root wins, in that order;
 * 2. otherwise the exact bytes `sync-registry --scan-tables` bundled into
 *    `registry.json` (`setupSql`), and ONLY when `setupSqlVersion` equals the
 *    intended version;
 * 3. otherwise a problem, reported to the caller so it refuses BEFORE anything
 *    is written, naming the versions that were actually found.
 *
 * A root that EXISTS at the intended version but lacks a declared file is a
 * broken install, and the bundle never hides it. A ranged or missing intended
 * version (`^1.2.0`, `latest`, `workspace:*`) cannot name one schema, so it is
 * refused rather than guessed at.
 *
 * @module
 */

import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { basename, join, relative, resolve, sep } from 'node:path'

import { isExactVersion, isVersionRange, satisfiesVersionRange } from './exact-version.js'
import { loadRegistry } from './registry.js'
import type { InferredPackage } from './schema.js'

/** Where a resolved setup file's bytes came from. */
export type SetupSqlOrigin = 'installed' | 'source' | 'bundled' | 'replay' | 'planned'

/** One setup file a selection will apply, with the SQL it carries. */
export interface SetupSqlSource {
  /** `package:file` — what a refusal names and what the analyzer reports. */
  source: string
  /** The package that declares the file. */
  packageName: string
  /** The file as the package declares it (`src/__setup__/<name>.sql`). */
  sqlFile: string
  /** The SQL text. */
  sql: string
  /** Which copy the bytes came from. */
  origin: SetupSqlOrigin
  /**
   * The exact package version these bytes belong to. Absent for `replay`
   * sources, which are a project's own files and carry no package version.
   */
  version?: string
  /** The absolute path read, absent for `bundled`. */
  path?: string
}

/** A declared setup file whose bytes could not be resolved. */
export interface SetupSqlProblem {
  /** `package:file`, or the package name for a version-level problem. */
  source: string
  packageName: string
  /** The declared file, when the problem is about one. */
  sqlFile?: string
  message: string
}

/** What {@link resolveSetupSqlSources} found for one selection. */
export interface SetupSqlResolution {
  /** Readable setup files, in declaration order, deduplicated by package+file. */
  sources: SetupSqlSource[]
  /** Declared files that could not be resolved — never silently skipped. */
  problems: SetupSqlProblem[]
}

/**
 * Whether `candidate` stays inside `root` — `sqlFile` is package metadata, and a
 * `../` would point this reader at any file on disk.
 *
 * @param root - The package directory.
 * @param candidate - The resolved file path.
 * @returns True when the path is inside the package.
 */
export function isInsideDir(root: string, candidate: string): boolean {
  const rel = relative(root, candidate)
  return rel.length > 0 && !rel.startsWith(`..${sep}`) && rel !== '..' && !rel.startsWith(sep)
}

/**
 * Whether `path` is an existing directory.
 *
 * @param path - Absolute path to test.
 * @returns True when a directory is there.
 */
function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch (_error) {
    // Absent or unreadable — the caller treats both as "not present here".
    return false
  }
}

/**
 * The exact version a package root on disk declares, from its own
 * `package.json`.
 *
 * A root with no readable manifest, no `version`, or a non-exact one returns
 * null: it cannot be shown to BE the intended version, so it is not a candidate.
 * (A ranged version in a PUBLISHED package.json is malformed; treating it as a
 * match would bind the bytes to a schema nobody can name.)
 *
 * Exported because the injector's planner binds the migrations it writes to the
 * same contract: only a root that declares the intended version may supply
 * another release's schema.
 *
 * @param root - The package directory.
 * @returns The exact version, or null when it cannot be established.
 */
export function readPackageVersion(root: string): string | null {
  let version: unknown
  try {
    version = (
      JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8')) as { version?: unknown }
    ).version
  } catch (_error) {
    // No readable package.json beside the SQL — this root cannot be identified.
    return null
  }
  return isExactVersion(version) ? version : null
}

/**
 * Every place `packageName` is installed for a project, using Node's own
 * resolution, nearest first.
 *
 * `join(projectPath, 'node_modules', name)` finds only a copy installed INSIDE
 * the project. A production host runs `mlcl create` with no molecule checkout
 * and one fleet install ABOVE the project (`/app/node_modules` for a project at
 * `/workspace/proj`), so the package is resolvable by Node and invisible to that
 * join. `require.resolve.paths` yields exactly the node_modules directories Node
 * would search from the project, which is the same walk-up the generated app
 * uses. ALL of them are returned, not just the nearest: the nearest copy can be
 * another version (a stale project install), and the matching one further up is
 * still a legitimate copy of what the caller intends.
 *
 * @param projectPath - The api workspace the generated app will live in.
 * @param packageName - The `@molecule/*` package to locate.
 * @returns The installed package roots, nearest first (empty when none).
 */
export function installedPackageRoots(projectPath: string, packageName: string): string[] {
  let searchPaths: string[] | null
  try {
    // `createRequire` requires an ABSOLUTE path: with a relative `-p` (which
    // `mlcl inject -p app` accepts as typed) it throws ERR_INVALID_ARG_VALUE, the
    // catch returned no roots, and the preflight silently judged the registry
    // bundle while the injector wrote the installed copy — two different files
    // under one decision (r6 acceptance review, F7). Resolve it here, the single
    // place every caller goes through.
    searchPaths = createRequire(join(resolve(projectPath), 'package.json')).resolve.paths(
      packageName,
    )
  } catch (_error) {
    // No resolvable package.json anchor: fall back to the source tree.
    return []
  }
  return (searchPaths ?? []).map((base) => join(base, packageName)).filter(isDirectory)
}

/**
 * The NEAREST place `packageName` is installed for a project, using Node's own
 * resolution.
 *
 * @param projectPath - The api workspace the generated app will live in.
 * @param packageName - The `@molecule/*` package to locate.
 * @returns The installed package root, or null when it is not installed here.
 */
export function installedPackageRoot(projectPath: string, packageName: string): string | null {
  return installedPackageRoots(projectPath, packageName)[0] ?? null
}

/** How a project's dependency spec was bound to one schema version. */
export type IntendedVersionBinding =
  | {
      /** The exact version whose setup SQL may be written. */
      kind: 'bound'
      version: string
      /** The PIN itself, a copy on disk inside the pin's range, or the registry pin. */
      via: 'exact' | 'copy' | 'registry'
    }
  /** The spec names no version mlcl can evaluate here — the nearest copy is used. */
  | { kind: 'unbound' }
  /** The spec is a range nothing available satisfies; the caller refuses. */
  | { kind: 'refused'; message: string }

/**
 * Bind a project's dependency spec to the ONE schema version its setup SQL may
 * come from.
 *
 * An exact pin IS that version. A RANGE still names a set the app will accept,
 * so it binds to the copy Node resolves for the project when that copy falls
 * inside the range (the version the app runs today), else to the registry's own
 * pin when THAT falls inside the range (the bytes the registry bundles), and is
 * otherwise refused naming the range, the copies found and the registry pin —
 * never silently read from whichever release happens to sit on disk (P18 r11
 * review, R11-6). A spec that names no evaluable version at all (`file:`,
 * `workspace:*`, a dist-tag, a git/URL spec) stays UNBOUND: the project itself
 * declared where the bytes come from, which is the pre-existing nearest-copy
 * contract (r10 review, K10/K11).
 *
 * @param options - The package, the spec the project declares, and where to look.
 * @param options.packageName - The `@molecule/*` package.
 * @param options.pin - The dependency spec from the project manifest, if one.
 * @param options.projectPath - The api workspace whose `node_modules` chain to walk.
 * @param options.registryPin - The version `registry.json` pins for the package, when
 *   it has an entry there (the caller reads it, so a fixture registry and the real
 *   one can never be confused).
 * @returns The binding — exact, ranged via a copy or the registry pin, unbound, or a refusal.
 */
export function bindIntendedVersion(options: {
  packageName: string
  pin: string | undefined
  projectPath: string
  registryPin?: string
}): IntendedVersionBinding {
  const { packageName, pin } = options
  if (pin === undefined) return { kind: 'unbound' }
  if (isExactVersion(pin)) return { kind: 'bound', version: pin, via: 'exact' }
  if (!isVersionRange(pin)) return { kind: 'unbound' }

  const copies = [
    ...new Set(
      installedPackageRoots(options.projectPath, packageName)
        .map((root) => readPackageVersion(root))
        .filter((version): version is string => version !== null),
    ),
  ]
  const satisfying = copies.find((version) => satisfiesVersionRange(pin, version))
  if (satisfying) return { kind: 'bound', version: satisfying, via: 'copy' }

  const registryPin = options.registryPin
  if (registryPin !== undefined && satisfiesVersionRange(pin, registryPin))
    return { kind: 'bound', version: registryPin, via: 'registry' }

  const found =
    copies.length > 0
      ? `installed: ${copies.join(', ')}`
      : 'no copy of it is installed for this project'
  const registryNote =
    registryPin === undefined
      ? 'registry.json pins no version for it'
      : `registry.json pins ${packageName}@${registryPin}, which the range does not cover`
  return {
    kind: 'refused',
    message:
      `${packageName} is pinned at ${JSON.stringify(pin)}, a version range that nothing available ` +
      `satisfies (${found}; ${registryNote}), so its setup SQL cannot be bound to one schema. ` +
      `Install a version inside the range (\`npm install ${packageName}@<version>\`) or pin one ` +
      'exact version, then re-run.',
  }
}

/**
 * Resolve and read every setup file the selection declares, for the EXACT
 * package versions the caller is about to pin.
 *
 * @param options - The api workspace, the package names and their intended
 *   versions, and their registry entries.
 * @param options.projectPath - The api workspace (holds `node_modules`).
 * @param options.packageNames - `@molecule/*` names whose setup SQL this
 *   invocation will preflight and copy.
 * @param options.versions - The exact version intended for each of those names,
 *   from the caller's own selection/project/template manifest. A name with no
 *   entry, or with a non-exact one, is refused — the bytes cannot be bound.
 * @param options.packages - Registry entries (defaults to {@link loadRegistry}).
 * @returns The readable sources and the declared files that could not be read.
 */
export async function resolveSetupSqlSources(options: {
  projectPath: string
  packageNames: readonly string[]
  versions: Readonly<Record<string, string | undefined>>
  packages?: readonly InferredPackage[]
}): Promise<SetupSqlResolution> {
  const packages = options.packages ?? loadRegistry()
  const byName = new Map(packages.map((pkg) => [pkg.name, pkg]))
  const sources: SetupSqlSource[] = []
  const problems: SetupSqlProblem[] = []
  const seen = new Set<string>()

  for (const packageName of [...new Set(options.packageNames)]) {
    const pkg = byName.get(packageName)
    if (!pkg || pkg.tables.length === 0) continue

    const sqlFiles = [...new Set(pkg.tables.map((table) => table.sqlFile))]
    const intended = options.versions[packageName]

    // The version the invocation is pinning is the ONLY thing that can say which
    // bytes are right. Without one exact version there is no correct answer, so
    // the caller is told rather than given the first directory that happens to
    // hold the package.
    if (!intended) {
      problems.push({
        source: packageName,
        packageName,
        message:
          `No exact version is recorded for ${packageName}, so its setup SQL cannot be bound ` +
          'to a schema version — it is neither installed here at one version nor pinned in ' +
          `this project's manifest. Add it with \`mlcl add ${packageName}\` (which resolves the ` +
          'registry pin), or install the exact version this project should run, then re-run. ' +
          'Refusing before anything is written.',
      })
      continue
    }
    if (!isExactVersion(intended)) {
      problems.push({
        source: packageName,
        packageName,
        message:
          `${packageName} is intended at ${JSON.stringify(intended)}, which is not an exact ` +
          'version — the setup SQL it would copy cannot be bound to one schema. Pin an exact ' +
          'version (no range, tag, path or URL) or install the version you mean, then re-run.',
      })
      continue
    }

    // Every root that EXISTS is a possible copy. Only one whose own
    // `package.json` declares the intended version may supply bytes.
    const roots: { root: string; origin: 'installed' | 'source'; version: string | null }[] = []
    for (const root of installedPackageRoots(options.projectPath, packageName)) {
      roots.push({ root, origin: 'installed', version: readPackageVersion(root) })
    }
    if (pkg.path && isDirectory(pkg.path)) {
      roots.push({ root: pkg.path, origin: 'source', version: readPackageVersion(pkg.path) })
    }

    // Path safety BEFORE any lookup: a declaration that leaves its package is
    // corrupt metadata, and neither a bundled copy nor a matching root may make
    // it readable. The SQL lands in `__setup__/` and is replayed at boot.
    const escaping = roots.find(({ root }) =>
      sqlFiles.some((sqlFile) => !isInsideDir(root, join(root, sqlFile))),
    )
    if (escaping) {
      problems.push({
        source: packageName,
        packageName,
        message:
          `${packageName} declares a setup file outside its package (under ${escaping.root}) — ` +
          'refusing to read it; fix the registry metadata before scaffolding.',
      })
      continue
    }

    const matching = roots.filter((root) => root.version === intended)
    if (matching.length > 0) {
      // A root at the intended version is authoritative — including its
      // omissions. Falling through to the bundle for a file it lacks would hide
      // a broken install behind another version's bytes.
      const chosen = matching[0]
      for (const sqlFile of sqlFiles) {
        const source = `${packageName}:${sqlFile}`
        const key = `${packageName}\u0000${sqlFile}`
        if (seen.has(key)) continue
        seen.add(key)
        const candidate = join(chosen.root, sqlFile)
        try {
          sources.push({
            source,
            packageName,
            sqlFile,
            sql: await readFile(candidate, 'utf-8'),
            origin: chosen.origin,
            version: intended,
            path: candidate,
          })
        } catch (_error) {
          problems.push({
            source,
            packageName,
            sqlFile,
            message:
              `Cannot read ${source} — the app would boot without that table; the ` +
              `${chosen.origin} copy at ${chosen.root} declares ${intended} but not this file. ` +
              `Reinstall ${packageName}@${intended} (or fix the registry metadata) before scaffolding.`,
          })
        }
      }
      continue
    }

    // No copy of the intended version is reachable. The registry's bundled bytes
    // are usable ONLY for the version they were scanned from.
    const bundled = pkg.molecule?.setupSql ?? {}
    const bundledVersion = pkg.molecule?.setupSqlVersion
    const found =
      roots
        .map(
          ({ origin, root, version }) => `${origin} ${version ?? 'of unknown version'} at ${root}`,
        )
        .join('; ') || 'no installed copy and no molecule source tree'

    if (!bundledVersion) {
      problems.push({
        source: packageName,
        packageName,
        message:
          `${packageName}@${intended} is not available (${found}), and registry.json bundles no ` +
          'setup SQL for it (no setupSqlVersion recorded); regenerate the registry ' +
          '(`mlcl sync-registry --scan-tables`) or install the package before scaffolding.',
      })
      continue
    }
    if (bundledVersion !== intended) {
      problems.push({
        source: packageName,
        packageName,
        message:
          `${packageName}@${intended} is not available (${found}), and the registry's bundled ` +
          `setup SQL belongs to ${packageName}@${bundledVersion} — copying it would run one ` +
          "release's schema beside another release's code. Install " +
          `${packageName}@${intended}, or use a CLI whose registry was scanned at ${intended}.`,
      })
      continue
    }

    for (const sqlFile of sqlFiles) {
      const source = `${packageName}:${sqlFile}`
      const key = `${packageName}\u0000${sqlFile}`
      if (seen.has(key)) continue
      seen.add(key)
      const sql = bundled[sqlFile]
      if (typeof sql === 'string') {
        sources.push({ source, packageName, sqlFile, sql, origin: 'bundled', version: intended })
      } else {
        problems.push({
          source,
          packageName,
          sqlFile,
          message:
            `Cannot read ${source} — the registry bundle for ${packageName}@${intended} has no ` +
            'bytes for that file; run `mlcl sync-registry --scan-tables` or install the package ' +
            'before scaffolding.',
        })
      }
    }
  }

  return { sources, problems }
}

/**
 * One setup file's write destination: the basename it lands under in
 * `__setup__/`, the package that declared it, and its bytes.
 */
export interface SetupSqlDestination {
  /** The file name written into `__setup__/`. */
  destination: string
  /** The package that declared the file. */
  packageName: string
  /** The file as that package declares it (`src/__setup__/<name>.sql`). */
  sqlFile: string
  /** The SQL text to write. */
  sql: string
}

/** Two declarations that would write ONE `__setup__/` file with different bytes. */
export interface SetupSqlDestinationConflict {
  /** The file name both declarations target. */
  destination: string
  /** The declaration whose bytes would be kept. */
  first: { packageName: string; sqlFile: string }
  /** The declaration whose bytes would silently replace them. */
  second: { packageName: string; sqlFile: string }
}

/**
 * A planned destination that would replace `__setup__/` bytes that are already
 * on disk, and whose owner cannot be shown to be the same package.
 */
export interface SetupSqlExistingFileConflict {
  /** The file name already present in `__setup__/`. */
  destination: string
  /** The declaration whose bytes this run would write. */
  packageName: string
  /** The declared file of that declaration. */
  sqlFile: string
  /** The package the existing file's own header names, or null when it has none. */
  existingOwner: string | null
  /** The declared file the existing header names, when it names one. */
  existingSqlFile?: string
  /**
   * True when the file's owner line names the SAME package, but the body below
   * it no longer hashes to the digest that line records — so it was edited by
   * hand after mlcl wrote it, and rewriting would silently revert the edit.
   */
  existingOwnerModified?: boolean
}

/** A `*.sql` file already sitting in `__setup__/` before this run writes. */
export interface SetupSqlExistingFile {
  /** Its file name (the destination the writers compare against). */
  destination: string
  /** Its current bytes, verbatim. */
  content: string
}

/** The owner a `__setup__/` file's own header records. */
export interface SetupSqlFileOwner {
  /** The package whose setup SQL the file holds. */
  packageName: string
  /** The file as that package declares it. */
  sqlFile: string
  /** The first 16 hex digits of the sha256 of the SQL bytes it was written from. */
  payloadHash: string
}

/**
 * The marker every `__setup__/` file mlcl writes starts with.
 *
 * It is part of the header line the writers already prepend, not a sidecar: the
 * bytes it names are the SQL below it, so the file stays self-describing wherever
 * it is copied. The hash lets a later run tell "the same schema, written by an
 * older mlcl" from "a DIFFERENT schema that would silently replace this one"
 * without re-deriving any package's version.
 */
const SETUP_SQL_OWNER_LINE = /^-- mlcl setup SQL of (\S+) \((\S+)\) sha256:([0-9a-f]{16})$/

/**
 * The first 16 hex digits of a SQL payload's sha256.
 *
 * @param sql - The SQL bytes.
 * @returns The truncated digest recorded in the owner line.
 */
export function setupSqlPayloadHash(sql: string): string {
  return createHash('sha256').update(sql, 'utf8').digest('hex').slice(0, 16)
}

/**
 * The owner line naming the package a `__setup__/` file's bytes come from.
 *
 * @param packageName - The declaring package.
 * @param sqlFile - The file as that package declares it.
 * @param sql - The SQL bytes.
 * @returns One comment line, ending in a newline.
 */
export function setupSqlOwnerLine(packageName: string, sqlFile: string, sql: string): string {
  return `-- mlcl setup SQL of ${packageName} (${sqlFile}) sha256:${setupSqlPayloadHash(sql)}\n`
}

/**
 * The exact bytes a writer puts in `__setup__/<destination>`.
 *
 * Shared by the scaffold copier and the inject command's setup writer so the
 * owner line and the dialect header cannot differ between them, and so the
 * planner compares what will actually be written.
 *
 * @param destination - The planned destination.
 * @param header - The dialect header for the app's database, or `''`.
 * @returns The file content.
 */
export function setupSqlFileContent(destination: SetupSqlDestination, header = ''): string {
  return `${setupSqlOwnerLine(destination.packageName, destination.sqlFile, destination.sql)}${header}${destination.sql}`
}

/**
 * The owner a `__setup__/` file records in its first line, if it records one.
 *
 * A file written by an older mlcl, or by hand, has no owner line: nothing can
 * prove which package its bytes belong to, so it is never overwritten silently.
 *
 * @param content - The file's current bytes.
 * @returns The owner, or null.
 */
export function readSetupSqlFileOwner(content: string): SetupSqlFileOwner | null {
  const newline = content.indexOf('\n')
  const firstLine = newline === -1 ? content : content.slice(0, newline)
  const match = SETUP_SQL_OWNER_LINE.exec(firstLine)
  if (!match) return null
  const [, packageName, sqlFile, payloadHash] = match
  return { packageName: packageName!, sqlFile: sqlFile!, payloadHash: payloadHash! }
}

/**
 * Read the `*.sql` files already in a directory the writers touch.
 *
 * Read BEFORE anything is planned or written, so a collision with an earlier
 * run's file is judged by the same rule as a collision inside this run — and
 * refused before either file is touched.
 *
 * @param dir - The `__setup__/` directory (absent is not an error).
 * @returns Its files, sorted by name.
 */
export async function readSetupSqlFiles(dir: string): Promise<SetupSqlExistingFile[]> {
  let entries: string[]
  try {
    entries = (await readdir(dir)).filter((file) => file.endsWith('.sql')).sort()
  } catch (_error) {
    // No `__setup__/` yet: nothing to collide with.
    return []
  }
  const files: SetupSqlExistingFile[] = []
  for (const destination of entries) {
    const path = join(dir, destination)
    try {
      files.push({ destination, content: await readFile(path, 'utf-8') })
    } catch (error) {
      throw new Error(
        `Cannot read ${path} — refusing to write ${dir} without knowing what is already ` +
          `there (a different package's schema could be silently replaced): ${String(error)}`,
        { cause: error },
      )
    }
  }
  return files
}

/** What the destination planner knows about the directory it is writing into. */
export interface PlanSetupSqlDestinationsOptions {
  /** The header line(s) prepended before the SQL bytes (the dialect header), or `''`. */
  header?: string
  /** The files already in `__setup__/` — see {@link readSetupSqlFiles}. */
  existing?: readonly SetupSqlExistingFile[]
}

/**
 * A file's bytes with the leading run of `--` comment lines removed.
 *
 * That run is where a dialect header lives — the block {@link
 * migrationDialectHeader} prepends, whose TEXT has changed between mlcl
 * releases (the DuckDB/MotherDuck header grew in the version that named the
 * constructs its migrator rewrites). The header is a comment: it does not
 * replay, and a file written by an older mlcl is the same schema as one written
 * today. Comparing files with it stripped is what lets a 2.1.13 project upgrade
 * instead of being refused as "records no mlcl owner" (P18 r11 review, R11-3).
 *
 * @param content - A file's bytes.
 * @returns The bytes from the first non-comment line on.
 */
export function stripLeadingSqlComments(content: string): string {
  let offset = 0
  while (offset < content.length) {
    const newline = content.indexOf('\n', offset)
    const end = newline === -1 ? content.length : newline + 1
    if (!content.slice(offset, end).startsWith('--')) break
    offset = end
  }
  return content.slice(offset)
}

/**
 * Whether a `__setup__/` file is still exactly what mlcl wrote under its own
 * owner line.
 *
 * The owner line records the sha256 of the SQL it was written from, and the SQL
 * sits below the dialect header. Which header is below it depends on the mlcl
 * version and the app's database at the time, so every cut that ends at a
 * comment-line boundary is tried: a match is a sha256 match against the
 * RECORDED digest, so a wrong cut cannot produce a false one.
 *
 * A body that matches no such cut was edited after mlcl wrote it, which is what
 * tells the writer to refuse instead of silently reverting the edit (P18 r11
 * review, R11-4).
 *
 * @param content - The file's current bytes.
 * @param owner - The owner its first line records.
 * @returns True when the body below the owner line still hashes to `owner.payloadHash`.
 */
export function setupSqlOwnedBodyIntact(content: string, owner: SetupSqlFileOwner): boolean {
  const newline = content.indexOf('\n')
  if (newline === -1) return false
  let offset = newline + 1
  for (;;) {
    if (setupSqlPayloadHash(content.slice(offset)) === owner.payloadHash) return true
    const next = content.indexOf('\n', offset)
    if (next === -1) return false
    // Only a leading comment block may sit between the owner line and the SQL.
    if (!content.slice(offset, next).startsWith('--')) return false
    offset = next + 1
  }
}

/**
 * Whether a file that records NO owner line already holds exactly this SQL
 * payload.
 *
 * True for a file an older mlcl wrote (the same SQL under that version's
 * dialect header — or under none, for a Postgres project), and for a
 * hand-written copy of the same bytes. A header difference alone is never a
 * conflict: the payload is what replays.
 *
 * @param content - The file's current bytes.
 * @param header - The dialect header this run would prepend.
 * @param sql - The SQL bytes this run would write.
 * @returns True when the file already carries this payload.
 */
function setupSqlUnownedPayloadMatches(content: string, header: string, sql: string): boolean {
  if (header && content === `${header}${sql}`) return true
  if (content === sql) return true
  return stripLeadingSqlComments(content) === stripLeadingSqlComments(`${header}${sql}`)
}

/**
 * Decide every `__setup__/` destination once, for EVERY writer of that
 * directory.
 *
 * Both writers name a destination by BASENAME (`src/__setup__/x.sql` and
 * `setup/x.sql` are both `x.sql`), so two declarations can target one file. The
 * scaffold copier (`copySqlSetupScripts`) and the inject command's setup writer
 * share this function, because a rule only one of them held is how the second
 * writer could silently overwrite the first package's schema — the app would
 * boot with one package's table and the other's would be missing.
 *
 * Identical bytes are the same file written twice, which is harmless and is
 * kept once. Different bytes are returned as a conflict and the caller must
 * refuse BEFORE writing anything.
 *
 * The directory is not empty on a re-run, so the files ALREADY there are judged
 * by the same rule (r10 acceptance review, F6). A file holding DIFFERENT bytes
 * is a conflict unless it is provably this package's own unmodified copy — an
 * owner line this run can verify against the file's own body (P18 r11 review,
 * R11-3/R11-4). An owner line naming another package is refused, and so is one
 * this package wrote whose body was edited afterwards: an owner line must never
 * make a hand edit less safe than no owner line.
 *
 * A file with NO owner line is a match when its payload (the bytes after the
 * leading comment block, so any mlcl version's dialect header, or none) equals
 * the incoming SQL: it is rewritten with this run's header and an owner line, so
 * a project created by an older mlcl upgrades instead of being refused, and the
 * next version bump recognizes the file. Anything else is refused before any
 * write.
 *
 * @param sources - The setup files a selection resolved.
 * @param options - The dialect header the writer prepends and the files already
 *   in `__setup__/` (default: `''` and none — the fresh-scaffold case).
 * @returns The destinations to write, the ones already on disk unchanged, and
 *   every conflict (inside this run, then against the directory).
 */
export function planSetupSqlDestinations(
  sources: readonly SetupSqlSource[],
  options: PlanSetupSqlDestinationsOptions = {},
): {
  destinations: SetupSqlDestination[]
  unchanged: SetupSqlDestination[]
  conflicts: SetupSqlDestinationConflict[]
  existingConflicts: SetupSqlExistingFileConflict[]
} {
  const header = options.header ?? ''
  const destinations = new Map<string, SetupSqlDestination>()
  const conflicts: SetupSqlDestinationConflict[] = []
  for (const source of sources) {
    const destination = basename(source.sqlFile)
    const previous = destinations.get(destination)
    if (!previous) {
      destinations.set(destination, {
        destination,
        packageName: source.packageName,
        sqlFile: source.sqlFile,
        sql: source.sql,
      })
      continue
    }
    if (previous.sql !== source.sql) {
      conflicts.push({
        destination,
        first: { packageName: previous.packageName, sqlFile: previous.sqlFile },
        second: { packageName: source.packageName, sqlFile: source.sqlFile },
      })
    }
  }

  // What is already there, read before this run wrote anything.
  const existing = new Map(
    (options.existing ?? []).map((file) => [file.destination, file] as const),
  )
  const writes: SetupSqlDestination[] = []
  const unchanged: SetupSqlDestination[] = []
  const existingConflicts: SetupSqlExistingFileConflict[] = []
  for (const destination of destinations.values()) {
    const prior = existing.get(destination.destination)
    if (!prior) {
      writes.push(destination)
      continue
    }
    const content = setupSqlFileContent(destination, header)
    if (prior.content === content) {
      // Byte-for-byte what this run would write: a re-run, nothing to do.
      unchanged.push(destination)
      continue
    }
    const owner = readSetupSqlFileOwner(prior.content)
    if (owner) {
      if (!setupSqlOwnedBodyIntact(prior.content, owner)) {
        // The body no longer hashes to the digest its own first line records:
        // someone edited it after mlcl wrote it. An owner line must never make
        // a hand edit LESS safe than no owner line, so this is refused and
        // preserved exactly like unowned content (P18 r11 review, R11-4).
        existingConflicts.push({
          destination: destination.destination,
          packageName: destination.packageName,
          sqlFile: destination.sqlFile,
          existingOwner: owner.packageName,
          existingSqlFile: owner.sqlFile,
          existingOwnerModified: true,
        })
        continue
      }
      if (owner.packageName === destination.packageName) {
        // The same package's own file: an upgrade to its newer schema, or the
        // same payload under a stale dialect header (a database swap).
        writes.push(destination)
        continue
      }
      if (owner.payloadHash === setupSqlPayloadHash(destination.sql)) {
        // Another package's file that already holds exactly these bytes: one
        // schema written twice, so there is nothing to write.
        unchanged.push(destination)
        continue
      }
      existingConflicts.push({
        destination: destination.destination,
        packageName: destination.packageName,
        sqlFile: destination.sqlFile,
        existingOwner: owner.packageName,
        existingSqlFile: owner.sqlFile,
      })
      continue
    }
    if (setupSqlUnownedPayloadMatches(prior.content, header, destination.sql)) {
      // A file with no owner line that already holds this payload: an older
      // mlcl wrote it (its dialect header may differ — DuckDB's did), or it was
      // copied by hand. The payload is what replays, so this is a match — and
      // it is REWRITTEN, so the file gains this run's header and the owner line.
      // Leaving it alone meant every later version bump of the same package was
      // refused as unowned content (P18 r11 review, R11-3).
      writes.push(destination)
      continue
    }
    existingConflicts.push({
      destination: destination.destination,
      packageName: destination.packageName,
      sqlFile: destination.sqlFile,
      existingOwner: null,
    })
  }

  return { destinations: writes, unchanged, conflicts, existingConflicts }
}

/**
 * The operator-facing refusal for one destination conflict.
 *
 * One wording for both writers: the copier throws it, the inject command prints
 * it before exiting.
 *
 * @param conflict - The conflict {@link planSetupSqlDestinations} reported.
 * @returns The message.
 */
export function describeSetupSqlDestinationConflict(conflict: SetupSqlDestinationConflict): string {
  return (
    `${conflict.first.packageName}:${conflict.first.sqlFile} and ` +
    `${conflict.second.packageName}:${conflict.second.sqlFile} both write ` +
    `${conflict.destination} with DIFFERENT bytes — one package's schema would silently ` +
    'replace the other. Rename one declaration (or make them identical) before scaffolding.'
  )
}

/**
 * The operator-facing refusal for one collision with a file already on disk.
 *
 * @param conflict - The conflict `planSetupSqlDestinations` reported.
 * @returns The message.
 */
export function describeSetupSqlExistingFileConflict(
  conflict: SetupSqlExistingFileConflict,
): string {
  const incoming = `${conflict.packageName}:${conflict.sqlFile}`
  if (conflict.existingOwnerModified && conflict.existingOwner) {
    const existing = conflict.existingSqlFile
      ? `${conflict.existingOwner}:${conflict.existingSqlFile}`
      : conflict.existingOwner
    return (
      `__setup__/${conflict.destination} was written by mlcl as ${existing}, but its body no ` +
      'longer matches the sha256 its first line records — it has been edited by hand, and ' +
      `${incoming} would replace those edits silently. mlcl will not overwrite it: keep your ` +
      'edits and rename one of the two files, or delete the file and re-run to take ' +
      `${incoming}'s schema instead.`
    )
  }
  if (conflict.existingOwner) {
    const existing = conflict.existingSqlFile
      ? `${conflict.existingOwner}:${conflict.existingSqlFile}`
      : conflict.existingOwner
    return (
      `__setup__/${conflict.destination} already holds ${existing}, and ${incoming} would ` +
      "replace it with DIFFERENT bytes — one package's schema would silently replace the " +
      'other. Rename one declaration (or make them identical) before injecting.'
    )
  }
  return (
    `__setup__/${conflict.destination} already exists with DIFFERENT bytes and records no ` +
    `mlcl owner (an older mlcl wrote it, or it was added by hand), so ${incoming} cannot ` +
    "replace it safely. If it is this package's stale copy, delete it and re-run; " +
    'otherwise rename one of the two files.'
  )
}

/**
 * Read the `*.sql` files of directories the generated runner replays.
 *
 * Two kinds of directory reach this function:
 *
 * - `<api>/__setup__` — the scaffold-time copy of every selected package's setup
 *   SQL, and the step the runner applies after `migrations/`;
 * - `<api>/migrations` — the app's own schema.
 *
 * Those bytes are the SQL a boot will actually execute, so `mlcl inject` and
 * `mlcl swap` judge exactly them instead of re-deriving a set from manifest keys:
 * a key can name a package whose SQL was never copied (a transitive peer), and
 * judging that is a refusal for SQL nothing will replay. A missing directory is
 * not a finding: a project without migrations has nothing to replay.
 *
 * @param dirs - The directories the runner replays (e.g. `<api>/__setup__`).
 * @returns The readable sources; unreadable files are reported as problems.
 */
export async function resolveSqlDirectorySources(
  dirs: readonly string[],
): Promise<{ sources: SetupSqlSource[]; problems: SetupSqlProblem[] }> {
  const sources: SetupSqlSource[] = []
  const problems: SetupSqlProblem[] = []
  for (const dir of dirs) {
    let entries: string[]
    try {
      entries = (await readdir(dir)).filter((file) => file.endsWith('.sql')).sort()
    } catch (_error) {
      continue
    }
    for (const file of entries) {
      // The path is what the operator needs: the runner reads this exact file,
      // and an absolute path is what makes it findable in a generated app.
      const source = join(dir, file)
      try {
        sources.push({
          source,
          packageName: dir,
          sqlFile: file,
          sql: await readFile(source, 'utf-8'),
          origin: 'replay',
          path: source,
        })
      } catch (error) {
        problems.push({
          source,
          packageName: dir,
          sqlFile: file,
          message: `Cannot read ${source} — the migrations cannot be judged: ${String(error)}`,
        })
      }
    }
  }
  return { sources, problems }
}
