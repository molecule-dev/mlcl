/**
 * Package scanner - infers molecule info from conventions
 *
 * Scans package directories to extract:
 * - Metadata from package.json
 * - Type from directory location
 * - Routes from source files
 * - Tables from SQL setup files
 * - Edge case notes from README.md
 *
 * @module
 */

import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { access, readdir, readFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

import { ts } from 'ts-morph'

import { isExactVersion } from './exact-version.js'
import { getRawRegistry } from './registry.js'
import type { InferredPackage, InferredTable, PackageType, SqlSupport } from './schema.js'
import { InferredRoute, MoleculeMetadata } from './schema.js'

/**
 * Infer package type from its directory location
 */
export function inferPackageType(packagePath: string): PackageType {
  const normalized = packagePath.replace(/\\/g, '/')

  if (normalized.includes('/frameworks/')) return 'framework'
  if (normalized.includes('/features/')) return 'feature'
  if (normalized.includes('/native/')) return 'native'
  if (normalized.includes('/core/')) return 'core'
  if (normalized.includes('/bonds/')) return 'bond'
  if (normalized.includes('/infrastructure/') || normalized.includes('/ci/'))
    return 'infrastructure'
  if (normalized.includes('/resources/')) return 'resource'
  if (normalized.includes('/middleware/')) return 'middleware'
  if (normalized.includes('/utilities/') || normalized.includes('/testing/')) return 'utility'

  // Default based on package name patterns
  return 'utility'
}

/**
 * Scan a package directory and infer its metadata
 */
export async function scanPackage(packagePath: string): Promise<InferredPackage> {
  // Read package.json
  const packageJsonPath = join(packagePath, 'package.json')
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))

  // Check for src directory
  const srcPath = join(packagePath, 'src')
  let hasSrc = false
  try {
    await access(srcPath)
    hasSrc = true
  } catch (_error) {
    // Safe to ignore: src/ is optional; absence is normal for some packages
  }

  // Look up metadata from centralized registry first, fall back to package.json
  let molecule: InferredPackage['molecule']
  const registry = getRawRegistry()
  const registryEntry = registry.packages[packageJson.name]
  if (registryEntry) {
    molecule = registryEntry as unknown as InferredPackage['molecule']
  } else if (packageJson.molecule) {
    const parsed = MoleculeMetadata.safeParse(packageJson.molecule)
    if (parsed.success) {
      molecule = parsed.data
    }
  }

  // Infer type: prefer molecule.type metadata, fall back to path-based inference
  const moleculeTypeMap: Record<string, PackageType> = {
    core: 'core',
    provider: 'bond',
    resource: 'resource',
    middleware: 'middleware',
    utility: 'utility',
    infrastructure: 'infrastructure',
    framework: 'framework',
    feature: 'feature',
    native: 'native',
    locales: 'locales',
  }
  const type = (molecule?.type && moleculeTypeMap[molecule.type]) || inferPackageType(packagePath)

  // Prefer pre-computed metadata from molecule field, fall back to source scanning
  // Parse through Zod to apply defaults (e.g. middlewares: []).
  // The registry copy is not just a cache: a published package ships only
  // `dist/` (no `routes.ts`), so when the package was npm-installed the source
  // scan below finds NOTHING and the registry is the only place routes can come
  // from. `sync-registry --scan-routes` keeps it populated from the source.
  const routes = molecule?.routes
    ? molecule.routes.map((r) => InferredRoute.parse(r))
    : ROUTE_SCANNED_TYPES.has(type)
      ? await scanForRoutes(hasSrc ? srcPath : packagePath)
      : []

  const tables = molecule?.tables
    ? molecule.tables.map((t) => ({
        ...t,
        sqlFile: join(packagePath, t.sqlFile),
      }))
    : await scanForTables(packagePath)

  const exports = molecule?.exports
    ? molecule.exports
    : await scanExports(hasSrc ? srcPath : packagePath)

  // Read README.md if present
  let moleculeMd: string | undefined
  try {
    moleculeMd = await readFile(join(packagePath, 'README.md'), 'utf-8')
  } catch (_error) {
    // Safe to ignore: README.md is optional and absent for many packages
  }

  return {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    dependencies: packageJson.dependencies ?? {},
    peerDependencies: packageJson.peerDependencies ?? {},
    type,
    routes,
    tables,
    exports,
    moleculeMd,
    molecule,
    path: packagePath,
    srcPath: hasSrc ? srcPath : undefined,
  }
}

/**
 * Package types whose declarative routes the scanner derives from source
 * (`src/routes.ts`) — the ONE definition shared by `scanPackage`,
 * `sync-registry --scan-routes`, and the registry drift gates, so they can
 * never disagree about which entries must carry `routes`.
 *
 * Typed over `string` on purpose: callers hold either the scanner's
 * `PackageType` or the registry entry's `type` enum (which spells bonds
 * `provider`), and both spell the two members here identically.
 */
export const ROUTE_SCANNED_TYPES: ReadonlySet<string> = new Set<PackageType>([
  'resource',
  'infrastructure',
])

/**
 * Canonical form of a route list for drift comparison. Each route is parsed
 * through `InferredRoute` so defaults (`middlewares: []`) and key order match
 * whichever side wrote it (registry JSON vs. a fresh scan). Declaration ORDER
 * is kept, not sorted: Express matches in order, so `/x/unread-count` before
 * `/x/:id` is part of what the registry must record faithfully.
 *
 * @param routes - Route objects from the registry or from `scanForRoutes()`.
 * @returns A string that is equal iff the two lists are the same routes in the same order.
 */
export function routesSignature(routes: readonly unknown[] | undefined): string {
  return JSON.stringify((routes ?? []).map((r) => InferredRoute.parse(r)))
}

/**
 * Derive a package's declarative routes from its SOURCE.
 *
 * First checks for a structured `routes.ts` export (preferred); those routes'
 * middlewares are then filtered down to real `requestHandlerMap` keys (see
 * `parseRoutesFile`). Falls back to inferring routes from requestHandlerMap
 * patterns.
 *
 * This is the source of truth the registry `routes` field is synced FROM
 * (`sync-registry --scan-routes`). `scanPackage` prefers the registry copy —
 * necessarily, because an npm-installed package has no `src/` to scan — so a
 * registry entry that drifts from this function's output is what a scaffold
 * actually wires. Compare with `routesSignature()`.
 *
 * @param srcPath - The package's `src` directory.
 * @returns The routes in declaration order (empty if the package declares none).
 */
export async function scanForRoutes(srcPath: string): Promise<InferredRoute[]> {
  // Preferred: read structured route definitions from routes.ts
  const routesFromFile = await parseRoutesFile(srcPath)
  if (routesFromFile.length > 0) {
    return routesFromFile
  }

  // Fallback: infer from requestHandlerMap patterns
  const routes: InferredRoute[] = []

  try {
    const files = await findTypeScriptFiles(srcPath)

    for (const file of files) {
      const content = await readFile(file, 'utf-8')

      if (content.includes('requestHandlerMap')) {
        const handlerMatches = content.matchAll(
          /(\w+):\s*(?:createRequestHandler\()?handlers\.(\w+)/g,
        )
        for (const match of handlerMatches) {
          const handlerName = match[1]
          const route = inferRouteFromHandler(handlerName, basename(dirname(file)))
          if (route) routes.push(route)
        }
      }

      const routeComments = content.matchAll(
        /\/\/\s*@route\s+(GET|POST|PUT|PATCH|DELETE)\s+(\S+)/gi,
      )
      for (const match of routeComments) {
        routes.push({
          method: match[1].toLowerCase() as InferredRoute['method'],
          path: match[2],
          handler: 'unknown',
          middlewares: [],
        })
      }
    }
  } catch (_error) {
    // Safe to ignore: srcPath may not exist or be readable; routes default to []
  }

  return routes
}

/**
 * Parse a routes.ts file that exports a structured `routes` array.
 *
 * Expected format:
 * ```ts
 * export const routes = [
 *   { method: 'get' as const, path: '/users/:id', middlewares: ['authSelf'], handler: 'read' },
 *   { method: 'post' as const, path: '/login/oauth', middlewares: [], handler: 'logInOAuth', optional: 'oauth' },
 * ]
 * ```
 */
async function parseRoutesFile(srcPath: string): Promise<InferredRoute[]> {
  const routes: InferredRoute[] = []

  try {
    const routesPath = join(srcPath, 'routes.ts')
    const content = await readFile(routesPath, 'utf-8')

    // Locate each route-object literal heuristically (top-level `{ ... }`
    // chunks that contain a `method:` field). We then parse fields in any
    // order so writers don't have to memorise a column order.
    const objectRegex = /\{[^{}]*method:\s*['"][a-z]+['"][^{}]*\}/gi
    let match: RegExpExecArray | null
    while ((match = objectRegex.exec(content)) !== null) {
      const body = match[0]
      const method = body.match(/method:\s*['"]([a-z]+)['"]/i)?.[1]
      const path = body.match(/path:\s*['"]([^'"]+)['"]/)?.[1]
      const handler = body.match(/handler:\s*['"]([A-Za-z0-9_]+)['"]/)?.[1]
      const optional = body.match(/optional:\s*['"]([^'"]+)['"]/)?.[1]
      const middlewareStr = body.match(/middlewares:\s*\[([^\]]*)\]/)?.[1] ?? ''
      const middlewares = middlewareStr
        .split(',')
        .map((m) => m.trim().replace(/['"]/g, ''))
        .filter(Boolean)

      if (!method || !path || !handler) continue

      routes.push({
        method: method.toLowerCase() as InferredRoute['method'],
        path,
        handler,
        middlewares,
        ...(optional ? { optional } : {}),
      })
    }

    // Drop route middlewares that aren't actual requestHandlerMap keys. Resource
    // routes mark `authenticate` (the GLOBAL auth middleware, applied app-wide via
    // `verifyMiddleware()`), but it isn't in any resource's handler map — so the
    // injector emitting `Resource.authenticate` yields `undefined` → Express throws
    // "argument handler must be a function" at boot → the whole API fails to start
    // (verify=ok misses it: it only type-checks the executor's changed files, and
    // the scaffold tsc resolves the generated re-export to `any`). Resource-local
    // authorizers (authSelf/auth/authUser) ARE in the map and are kept. If we can't
    // determine the keys, keep middlewares as-is (no regression, no new IDOR).
    const handlerKeys = await extractHandlerMapKeys(srcPath)
    if (handlerKeys.size > 0) {
      // `authenticate` is legitimately global (applied via verifyMiddleware
      // app-wide) so its drop is expected. ANY OTHER dropped name is a declared
      // authorizer with no handler-map entry — it silently vanishes from the
      // generated route, so a resource that relied on it ships UNGUARDED. Warn
      // loudly so it's caught at scaffold time, not by a pentest. (Handlers
      // should self-authorize regardless — see the inventory read handlers.)
      const KNOWN_GLOBAL_MIDDLEWARES = new Set(['authenticate'])
      for (const route of routes) {
        const dropped = route.middlewares.filter(
          (mw) => !handlerKeys.has(mw) && !KNOWN_GLOBAL_MIDDLEWARES.has(mw),
        )
        if (dropped.length > 0) {
          console.warn(
            `[mlcl:scanner] Dropping unresolvable route middleware(s) [${dropped.join(', ')}] ` +
              `on ${route.method} ${route.path} — no matching requestHandlerMap key. The route ` +
              `will ship WITHOUT them; ensure the handler authorizes itself.`,
          )
        }
        route.middlewares = route.middlewares.filter((mw) => handlerKeys.has(mw))
      }
    }
  } catch (_error) {
    // Safe to ignore: routes.ts is optional; absence triggers the handler-pattern fallback
  }

  return routes
}

/**
 * Extract the property names of a resource's `requestHandlerMap` from its
 * `requestHandlerMap.ts`. Handles both the typed-interface form
 * (`XRequestHandlerMap { auth: MoleculeRequestHandler; … }`) and the `as const`
 * object-literal form (`requestHandlerMap = { logActivity: log, feed, … }`).
 * Used to filter route middlewares down to real handler references.
 *
 * Exported so the registry drift guard can assert the invariant this filter
 * exists for — every handler/middleware name the registry records for a
 * resource is a key of that resource's map — and, just as important, that
 * this parser actually understands every map in the fleet: an unparsable map
 * yields an empty set, which makes `parseRoutesFile` keep middlewares as-is
 * (deliberately — dropping an authorizer it cannot see would ship a route
 * unguarded), so a silent no-op here is a filter that never runs.
 *
 * @param srcPath - The resource package's `src` directory.
 * @returns The set of handler-map key names (empty if the file is absent/unparsable).
 */
export async function extractHandlerMapKeys(srcPath: string): Promise<Set<string>> {
  const keys = new Set<string>()
  try {
    const content = await readFile(join(srcPath, 'requestHandlerMap.ts'), 'utf-8')
    const iface = content.match(/\w*RequestHandlerMap\b[^{]*\{([\s\S]*?)\n\}/)
    const literal = content.match(/requestHandlerMap\b[^={]*=\s*\{([\s\S]*?)\n\s*\}/)
    for (const block of [iface?.[1], literal?.[1]]) {
      if (!block) continue
      for (const line of block.split(/[\n,]/)) {
        const trimmed = line.trim()
        const m = trimmed.match(/^(\w+)\s*[?:]/) ?? trimmed.match(/^(\w+)$/)
        if (m?.[1] && m[1] !== 'MoleculeRequestHandler') keys.add(m[1])
      }
    }
  } catch (_error) {
    // No requestHandlerMap.ts (or unreadable) → empty set → caller keeps middlewares as-is.
  }
  return keys
}

/**
 * Infer route from handler name using conventions
 */
function inferRouteFromHandler(handlerName: string, resourceName: string): InferredRoute | null {
  const resource = resourceName.toLowerCase()

  // Common CRUD patterns
  const patterns: Record<string, { method: InferredRoute['method']; pathSuffix: string }> = {
    create: { method: 'post', pathSuffix: '' },
    read: { method: 'get', pathSuffix: '/:id' },
    update: { method: 'patch', pathSuffix: '/:id' },
    del: { method: 'delete', pathSuffix: '/:id' },
    delete: { method: 'delete', pathSuffix: '/:id' },
    query: { method: 'get', pathSuffix: '' },
    list: { method: 'get', pathSuffix: '' },
  }

  const pattern = patterns[handlerName.toLowerCase()]
  if (pattern) {
    return {
      method: pattern.method,
      path: `/${resource}s${pattern.pathSuffix}`,
      handler: handlerName,
      middlewares: [],
    }
  }

  return null
}

/**
 * The directory a package keeps its setup SQL in, or null when it ships none.
 *
 * Resource and utility packages ship setup SQL in `src/__setup__/` (the one
 * convention every `@molecule/api-resource-*` package follows). The root
 * `setup/` form is kept for bond packages that ship SQL beside their source —
 * @molecule/api-bonds-audit-database's `audit_log.sql` is the one left. The
 * first directory that actually declares a table wins; a directory holding SQL
 * with no `CREATE TABLE` (a comment-only file) does not stop the search, which
 * is the order {@link scanForTables} has always applied.
 *
 * @param packagePath - The package root.
 * @returns The setup directory, or null.
 */
async function resolveSetupDir(packagePath: string): Promise<string | null> {
  const setupPaths = [join(packagePath, 'src', '__setup__'), join(packagePath, 'setup')]
  const createTable = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?/gi

  for (const setupPath of setupPaths) {
    let files: string[]
    try {
      files = (await readdir(setupPath)).filter((file) => file.endsWith('.sql')).sort()
    } catch (_error) {
      // Safe to ignore: setup dir is optional; not all packages have SQL setup files
      continue
    }
    for (const file of files) {
      const content = await readFile(join(setupPath, file), 'utf-8')
      if ([...content.matchAll(createTable)].length > 0) return setupPath
    }
  }
  return null
}

/**
 * Scan for SQL setup files
 */
export async function scanForTables(packagePath: string): Promise<InferredTable[]> {
  const setupPath = await resolveSetupDir(packagePath)
  if (setupPath === null) return []

  const tables: InferredTable[] = []
  const files = (await readdir(setupPath)).filter((file) => file.endsWith('.sql')).sort()
  for (const file of files) {
    const sqlPath = join(setupPath, file)
    const content = await readFile(sqlPath, 'utf-8')

    // Extract table names from CREATE TABLE statements
    const tableMatches = content.matchAll(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?/gi,
    )
    for (const match of tableMatches) {
      tables.push({
        name: match[1],
        sqlFile: sqlPath,
      })
    }
  }

  return tables
}

/**
 * Read the EXACT bytes of every setup SQL file a package declares, keyed by the
 * package-relative path `tables[].sqlFile` uses, TOGETHER with the package
 * version those bytes belong to.
 *
 * `sync-registry --scan-tables` bundles this into the registry entry as
 * `setupSql` + `setupSqlVersion`. The two are one value on purpose: the bytes
 * are the DDL of ONE version, and a scaffold that pins another version must not
 * copy them (a schema can gain or change a file between releases — `comment_
 * numbers.sql` did). A selection can only use the bundle when its intended
 * version equals {@link SetupSqlScan.version}; otherwise it resolves a copy of
 * the intended version or refuses before writing.
 *
 * The version is read from the package's OWN `package.json` in the same pass as
 * the bytes, so the tag cannot disagree with the files. A package with setup SQL
 * but no readable exact `version` is an error: an untagged bundle is unusable,
 * and writing one silently would defer the failure to scaffold time.
 *
 * It is derived from the same directory {@link scanForTables} reads, so the
 * declared paths and the bytes can never drift within one scan.
 *
 * @param packagePath - The package root.
 * @returns The version + path→SQL map (sorted by path), or null when the
 *   package ships no setup SQL.
 */
export async function scanSetupSqlBundle(
  packagePath: string,
): Promise<{ version: string; files: Record<string, string> } | null> {
  const setupPath = await resolveSetupDir(packagePath)
  if (setupPath === null) return null

  const files = (await readdir(setupPath)).filter((file) => file.endsWith('.sql')).sort()
  const bundle: Record<string, string> = {}
  for (const file of files) {
    const sqlPath = join(setupPath, file)
    bundle[relative(packagePath, sqlPath)] = await readFile(sqlPath, 'utf-8')
  }
  if (Object.keys(bundle).length === 0) return null

  const manifestPath = join(packagePath, 'package.json')
  let version: unknown
  try {
    version = (JSON.parse(readFileSync(manifestPath, 'utf-8')) as { version?: unknown }).version
  } catch (error) {
    throw new Error(
      `${packagePath} ships setup SQL but its ${manifestPath} cannot be read/parsed ` +
        `(${String(error)}) — the bundle cannot be tagged with the version it belongs to.`,
      { cause: error },
    )
  }
  if (typeof version !== 'string' || !isExactVersion(version)) {
    throw new Error(
      `${packagePath} ships setup SQL but its package.json declares no exact version ` +
        `(${JSON.stringify(version)}) — the bundle cannot be tagged with the version it belongs to.`,
    )
  }
  return { version, files: bundle }
}

/**
 * Read the EXACT bytes of every setup SQL file a package declares, keyed by the
 * package-relative path `tables[].sqlFile` uses.
 *
 * This is the byte map alone. {@link scanSetupSqlBundle} is the value
 * `sync-registry --scan-tables` writes, because the bytes are only meaningful at
 * the exact package version they came from.
 *
 * @param packagePath - The package root.
 * @returns The path→SQL map (sorted by path), or null when the package ships no
 *   setup SQL.
 */
export async function scanSetupSqlFiles(
  packagePath: string,
): Promise<Record<string, string> | null> {
  return (await scanSetupSqlBundle(packagePath))?.files ?? null
}

/**
 * Strip comments for the generated hook-category metadata scan below.
 * Public exports use the TypeScript compiler, not this textual approximation.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
}

/**
 * Read the public named exports of index.ts using TypeScript's module checker.
 *
 * Only this source directory participates: dependencies, sibling packages and
 * ambient libraries are not loaded. The compiler owns barrel recursion, cycles,
 * aliases, type-only exports and TSX resolution. A public star whose source is
 * unavailable remains `*` (unknown), including when the 256-file/8-MiB budget is
 * exhausted. No source is executed and no package build is required.
 */
export async function scanExports(srcPath: string): Promise<string[]> {
  let root: string
  try {
    root = realpathSync(resolve(srcPath))
  } catch (_error) {
    // Optional source directory is absent/unreadable; there is no entry to scan.
    return []
  }
  const inside = (path: string): boolean => {
    const rel = relative(root, path)
    return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)
  }
  const localPath = (path: string): string | undefined => {
    if (!inside(resolve(path))) return undefined
    try {
      const canonical = realpathSync(path)
      return inside(canonical) ? canonical : undefined
    } catch (_error) {
      // Missing optional module candidate; TypeScript tries its other candidates.
      return undefined
    }
  }
  const texts = new Map<string, string | undefined>()
  let bytes = 0
  let files = 0
  let limited = false
  const readSource = (path: string): string | undefined => {
    const canonical = localPath(path)
    if (!canonical) return undefined
    if (texts.has(canonical)) return texts.get(canonical)
    let text: string | undefined
    try {
      const size = statSync(canonical).size
      if (files >= 256 || bytes + size > 8 * 1024 * 1024) limited = true
      else {
        text = readFileSync(canonical, 'utf8')
        files++
        bytes += size
      }
    } catch (_error) {
      // Unreadable module is unavailable; public star traversal reports unknown.
    }
    texts.set(canonical, text)
    return text
  }
  const indexPath = join(root, 'index.ts')
  if (readSource(indexPath) === undefined) return limited ? ['*'] : []
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.Preserve,
    noLib: true,
    types: [],
  }
  const host = ts.createCompilerHost(options)
  host.readFile = readSource
  host.fileExists = (path) => {
    const canonical = localPath(path)
    return canonical !== undefined && ts.sys.fileExists(canonical)
  }
  host.directoryExists = (path) => {
    const canonical = localPath(path)
    return canonical !== undefined && ts.sys.directoryExists(canonical)
  }
  host.getSourceFile = (path, languageVersion) => {
    const text = readSource(path)
    return text === undefined ? undefined : ts.createSourceFile(path, text, languageVersion, true)
  }
  const modules = new Map<string, ts.ResolvedModuleFull | undefined>()
  const resolveModule = (name: string, from: string): ts.ResolvedModuleFull | undefined => {
    const key = `${from}\0${name}`
    if (!modules.has(key)) {
      // Explicit named external exports stay named; external stars stay unknown.
      const resolved = name.startsWith('.')
        ? ts.resolveModuleName(name, from, options, host).resolvedModule
        : undefined
      const canonical = resolved && localPath(resolved.resolvedFileName)
      modules.set(
        key,
        resolved && canonical ? { ...resolved, resolvedFileName: canonical } : undefined,
      )
    }
    return modules.get(key)
  }
  host.resolveModuleNames = (names, from) => names.map((name) => resolveModule(name, from))
  const program = ts.createProgram([indexPath], options, host)
  const checker = program.getTypeChecker()
  const entry = program.getSourceFile(indexPath)!
  const symbol = checker.getSymbolAtLocation(entry)
  const names = new Set(
    symbol ? checker.getExportsOfModule(symbol).map((item) => item.getName()) : [],
  )
  names.delete('default') // Star exports never expose another module's default.
  const visited = new Set<ts.SourceFile>()
  const pending = [entry]
  while (pending.length) {
    const file = pending.pop()!
    if (visited.has(file)) continue
    visited.add(file)
    for (const statement of file.statements) {
      if (
        !ts.isExportDeclaration(statement) ||
        statement.exportClause ||
        !statement.moduleSpecifier ||
        !ts.isStringLiteral(statement.moduleSpecifier)
      )
        continue
      const resolved = resolveModule(statement.moduleSpecifier.text, file.fileName)
      const source = resolved && program.getSourceFile(resolved.resolvedFileName)
      if (source) pending.push(source)
      else names.add('*')
    }
  }
  if (limited) names.add('*')
  return [...names]
}

/**
 * Recursively find all TypeScript files in a directory
 */
async function findTypeScriptFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  try {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)

      if (
        entry.isDirectory() &&
        !entry.name.startsWith('.') &&
        entry.name !== 'node_modules' &&
        entry.name !== 'dist'
      ) {
        files.push(...(await findTypeScriptFiles(fullPath)))
      } else if (
        entry.isFile() &&
        (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
        !entry.name.endsWith('.d.ts')
      ) {
        files.push(fullPath)
      }
    }
  } catch (_error) {
    // Safe to ignore: directory may not exist or be readable; files default to []
  }

  return files
}

/** Type shapes that decide whether a setter can receive a provider object. */
type ParamShape = 'object' | 'primitive' | 'function' | 'array'

/** Type keywords that are never a provider interface. */
const PRIMITIVE_TYPE_NAMES = new Set([
  'string',
  'number',
  'boolean',
  'bigint',
  'symbol',
  'object',
  'unknown',
  'any',
  'never',
  'void',
  'undefined',
  'null',
  'true',
  'false',
])

/** Index of the delimiter closing the one at `open`, or -1 when unbalanced. */
function matchingDelimiter(text: string, open: number): number {
  const openChar = text[open]
  const closeChar = openChar === '(' ? ')' : openChar === '{' ? '}' : openChar === '[' ? ']' : '>'
  let depth = 0
  for (let i = open; i < text.length; i++) {
    const c = text[i]
    if (c === openChar) depth++
    else if (c === closeChar) {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

/** Cut a parameter at its top-level default value, keeping the `=>` of a type intact. */
function stripDefaultValue(text: string): string {
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '(' || c === '<' || c === '[' || c === '{') depth++
    else if (c === ')' || c === '>' || c === ']' || c === '}') depth--
    else if (c === '=' && depth === 0 && text[i + 1] !== '>') return text.slice(0, i)
  }
  return text
}

/**
 * Read a type expression from `start` to the end of its statement — the first
 * `;` or newline at bracket depth 0. Multi-line declarations continue while a
 * bracket is open, so `type Middleware = (\n  req: Req,\n) => void` keeps its
 * `=>` (classifying only the first line would read it as an object type and
 * make a function-shaped provider look like a provider interface).
 *
 * `<`/`>` are deliberately NOT depth-tracked: in `=>` the `>` would close an
 * unopened generic and corrupt the depth. Generics never span a statement end.
 */
function readTypeExpression(source: string, start: number): string {
  let depth = 0
  let text = ''
  for (let i = start; i < Math.min(source.length, start + 600); i++) {
    const c = source[i]
    if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') depth--
    else if (depth === 0 && (c === ';' || c === '\n')) break
    text += c
  }
  return text
}

/** Split `text` on top-level `separator` occurrences (depth-aware). */
function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '(' || c === '<' || c === '[' || c === '{') depth++
    else if (c === ')' || c === '>' || c === ']' || c === '}') depth--
    else if (c === separator && depth === 0) {
      parts.push(text.slice(start, i))
      start = i + 1
    }
  }
  parts.push(text.slice(start))
  return parts
}

/**
 * Classify a parameter's type as written, so a setter that could never accept a
 * provider object is skipped. `kinds` resolves type aliases declared in the same
 * package (`LogLevel` → a string-literal union → primitive), which is what tells
 * api-logger's `setLogger(logger: Logger)` apart from its `setLevel(level: LogLevel)`.
 */
function classifyParamType(text: string, kinds: Map<string, ParamShape>): ParamShape {
  const type = text.trim().replace(/[;,]$/, '')
  if (type === '') return 'primitive'
  if (type.includes('=>')) return 'function'
  const members = type
    .split('|')
    .map((m) => m.trim())
    .filter((m) => m !== '' && m !== 'null' && m !== 'undefined')
  if (members.length === 0) return 'primitive'
  const shapes = members.map((member): ParamShape => {
    if (/^['"`]/.test(member) || /^[-\d]/.test(member)) return 'primitive'
    if (PRIMITIVE_TYPE_NAMES.has(member)) return 'primitive'
    if (/^[A-Za-z_$][\w$]*$/.test(member)) return kinds.get(member) ?? 'object'
    if (/\[\]$/.test(member) || /^(Readonly)?Array</.test(member)) return 'array'
    if (/^\{[\s\S]*\}$/.test(member)) return 'object'
    // `Record<K, V>`, `Partial<T>`, tuples, mapped types: not a plain provider
    // interface, but not provably primitive either — treated as an object.
    return 'object'
  })
  if (shapes.every((s) => s === 'primitive')) return 'primitive'
  if (shapes.every((s) => s === 'array')) return 'array'
  if (shapes.includes('object')) return 'object'
  if (shapes.includes('function')) return 'function'
  return 'array'
}

/**
 * Collect the parameter-type texts of every `export const`/`export function`
 * declaration in the source, keyed by name (overloads keep every signature).
 *
 * The parameter list is found by walking delimiters rather than by regex: a
 * regex stop at the first `)` truncates exactly the case that matters —
 * `setAuthGate(next: (() => Promise<void>) | null)` — leaving `next: ((`, which
 * reads as a parameter that is not function-typed.
 */
function collectDeclaredParamTypes(source: string): Map<string, string[]> {
  const declared = new Map<string, string[]>()
  const declRe = /export\s+(?:async\s+)?(?:const|function)\s+([A-Za-z_$][\w$]*)/g
  for (const match of source.matchAll(declRe)) {
    const name = match[1]
    let i = match.index + match[0].length
    if (source[i] === '<') {
      const generics = matchingDelimiter(source, i)
      i = generics === -1 ? i : generics + 1
    }
    while (/\s/.test(source[i] ?? '')) i++
    if (source[i] !== '(') {
      // A type annotation and/or initializer before the parameter list.
      const rest = source.slice(i, i + 400)
      const eq = rest.indexOf('=')
      if (eq === -1) continue
      i += eq + 1
      while (/\s/.test(source[i] ?? '')) i++
      // `setProvider = <TLimits = unknown>(provider: …) => …` — a generic
      // parameter list may sit between the `=` and the parameters.
      if (source[i] === '<') {
        const generics = matchingDelimiter(source, i)
        if (generics === -1) continue
        i = generics + 1
        while (/\s/.test(source[i] ?? '')) i++
      }
      if (source[i] !== '(') continue
    }
    const close = matchingDelimiter(source, i)
    if (close === -1) continue
    const params = source.slice(i + 1, close)
    // A parenthesised expression is only a parameter list in a function
    // declaration or an arrow function — never in a call initializer.
    let after = close + 1
    while (/\s/.test(source[after] ?? '')) after++
    if (source[after] === ':') {
      const tail = source.slice(after + 1, after + 200)
      const end = tail.search(/=>|\{|;/)
      after = end === -1 ? after : after + 1 + end
      while (/\s/.test(source[after] ?? '')) after++
    }
    if (source.slice(after, after + 2) !== '=>' && source[after] !== '{') continue

    const types: string[] = []
    for (const rawParam of splitTopLevel(params, ',')) {
      const param = rawParam.trim()
      if (param === '') continue
      if (param.startsWith('...')) continue
      const colon = splitTopLevel(param, ':')
      if (colon.length < 2) continue
      types.push(stripDefaultValue(colon.slice(1).join(':')).trim())
    }
    const previous = declared.get(name) ?? []
    declared.set(name, [...previous, ...types])
  }
  return declared
}

/**
 * The registry entries whose `bondSetter` is derived from source: every core,
 * plus every package some other package declares as its `implements` target —
 * a middleware or native package can be a bond interface too
 * (`@molecule/api-middleware-body-parser`, `@molecule/app-clipboard`), and the
 * bond-file generator consults the field for whichever package is the interface.
 *
 * Shared by `sync-registry --scan-exports` (which fills the field) and the
 * drift gate (`scripts/check-registry-exports.mjs`), so the two can never
 * disagree about which entries must carry it.
 *
 * @param packages - the registry's `packages` map.
 * @returns the package names whose `bondSetter` the scan must keep current.
 */
export function bondSetterScope(
  packages: Record<string, { type?: string; implements?: string }>,
): Set<string> {
  const scope = new Set<string>()
  for (const [name, entry] of Object.entries(packages)) {
    if (entry.type === 'core') scope.add(name)
    if (entry.implements) scope.add(entry.implements)
  }
  return scope
}

/**
 * Derive the setter a provider bond for this package must call to register
 * itself — the name recorded as `bondSetter` in the registry and consumed by the
 * bond-file generator and the README generator.
 *
 * Nothing in an export list says which `set*` a provider bond belongs to, so
 * every consumer that picked one by export ORDER got it wrong the moment a core
 * grew a second setter: `@molecule/app-http` gaining
 * `setAuthGate(next: (() => Promise<void>) | null)` made every fresh scaffold
 * shipping `@molecule/app-http-axios` import `setAuthGate` and call it with the
 * provider — a TS2345 in the scaffold's own `app/src/bonds/app-http-axios.ts`,
 * with the starter app registering no HTTP client at all (2026-10-17).
 *
 * The rule, in order:
 * 1. `setProvider` when exported — the canonical "this is the bond's entry point".
 * 2. Otherwise the candidate paired with a getter of the same name
 *    (`setClient` with `getClient(): HttpClient`) — the typed provider accessor.
 * 3. Otherwise the only candidate left.
 * 4. Otherwise `null` — no confident answer, so callers keep their legacy
 *    heuristics rather than acting on a guess.
 *
 * A candidate is an exported `set*`/`register*` function with at least one
 * parameter typed as an OBJECT. That excludes the two shapes no provider can be
 * passed to: a function-typed parameter (`setAuthGate`, body-parser's
 * `Middleware`) and a primitive or closed string-literal union (`setLevel`'s
 * `LogLevel = 'debug' | …`). The parameter's POSITION is not fixed — a
 * named-provider core takes `setProvider(name, provider)`.
 *
 * Scoped to the package's own `src/` — the source of truth the registry mirrors.
 * Reads declarations textually (same level as `scanExports`), never a type
 * checker: the shapes involved are our own generated-style accessors, and a
 * shape it cannot parse simply yields no candidate rather than a wrong one.
 *
 * @param srcPath - the package's `src/` directory.
 * @param exportedNames - the package's public exports, so a module-local setter
 *   that no consumer can import is never proposed.
 * @returns the setter's export name, or null when none can be named confidently.
 */
export async function scanBondSetter(
  srcPath: string,
  exportedNames: readonly string[],
): Promise<string | null> {
  const setters = exportedNames.filter((name) => /^(set|register)[A-Z]/.test(name))
  if (setters.length === 0) return null

  const files = (await findTypeScriptFiles(srcPath)).filter(
    (file) => !file.includes('__tests__') && !/\.(test|spec)\./.test(file),
  )
  let source = ''
  for (const file of files) {
    try {
      source += `\n${stripComments(await readFile(file, 'utf-8'))}`
    } catch (_error) {
      // Unreadable file: skip it. The scan then sees fewer declarations, which
      // can only cost a candidate (→ null → legacy heuristics), never invent one.
    }
  }
  if (source === '') return null

  // Type-alias shapes, resolved in two passes so `type A = B` reaches B's shape.
  const kinds = new Map<string, ParamShape>()
  for (const match of source.matchAll(/export\s+interface\s+([A-Za-z_$][\w$]*)/g)) {
    kinds.set(match[1], 'object')
  }
  for (const match of source.matchAll(/export\s+(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/g)) {
    kinds.set(match[1], 'object')
  }
  for (const match of source.matchAll(/export\s+enum\s+([A-Za-z_$][\w$]*)/g)) {
    kinds.set(match[1], 'primitive')
  }
  const aliases = [...source.matchAll(/export\s+type\s+([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*=\s*/g)]
    .map((match) => ({
      name: match[1],
      rhs: readTypeExpression(source, match.index + match[0].length),
    }))
    .filter((alias) => !kinds.has(alias.name))
  for (let pass = 0; pass < 2; pass++) {
    for (const alias of aliases) kinds.set(alias.name, classifyParamType(alias.rhs, kinds))
  }

  const declared = collectDeclaredParamTypes(source)
  const candidates = setters.filter((name) =>
    (declared.get(name) ?? []).some((type) => classifyParamType(type, kinds) === 'object'),
  )
  if (candidates.length === 0) return null
  if (candidates.includes('setProvider')) return 'setProvider'

  const paired = candidates.filter((setter) =>
    exportedNames.includes(`get${setter.replace(/^(set|register)/, '')}`),
  )
  if (paired.length > 0) return paired[0]
  if (candidates.length === 1) return candidates[0]
  return null
}

/** The SQL capability map a database bond declares in `src/capabilities.ts`. */
export type ScannedSqlCapabilities = Record<string, { support: SqlSupport; note?: string }>

/** The closed set of support values the contract defines. */
const SQL_SUPPORTS: readonly string[] = ['native', 'translated', 'unsupported']

/**
 * Read a string-valued expression from the AST.
 *
 * Handles the shapes the provider declarations actually use: a plain string
 * literal, a no-substitution template literal, parentheses, and the `+`
 * concatenation the long provider notes are written with. Anything else yields
 * null, so an unreadable note can never be mistaken for a different one.
 *
 * @param node - The expression node.
 * @returns The string value, or null when the expression is not a constant string.
 */
function readStringExpression(node: ts.Node): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (ts.isParenthesizedExpression(node)) return readStringExpression(node.expression)
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = readStringExpression(node.left)
    const right = readStringExpression(node.right)
    return left === null || right === null ? null : left + right
  }
  return null
}

/**
 * Convert a capability-map object literal to plain data.
 *
 * @param literal - The `{ … }` initializer.
 * @returns The map, or null when any entry is not a literal `{ support, note? }`.
 */
function readCapabilityMap(literal: ts.ObjectLiteralExpression): ScannedSqlCapabilities | null {
  const map: ScannedSqlCapabilities = {}
  for (const property of literal.properties) {
    if (!ts.isPropertyAssignment(property)) return null
    const key =
      ts.isStringLiteral(property.name) || ts.isIdentifier(property.name)
        ? property.name.text
        : null
    if (!key) return null
    let value: ts.Expression = property.initializer
    while (ts.isParenthesizedExpression(value)) value = value.expression
    if (!ts.isObjectLiteralExpression(value)) return null
    let support: string | null = null
    let note: string | undefined
    for (const entry of value.properties) {
      if (!ts.isPropertyAssignment(entry)) continue
      const name =
        ts.isStringLiteral(entry.name) || ts.isIdentifier(entry.name) ? entry.name.text : ''
      if (name === 'support') support = readStringExpression(entry.initializer)
      if (name === 'note') note = readStringExpression(entry.initializer) ?? undefined
    }
    if (!support || !SQL_SUPPORTS.includes(support)) return null
    map[key] =
      note === undefined
        ? { support: support as SqlSupport }
        : { support: support as SqlSupport, note }
  }
  return Object.keys(map).length > 0 ? map : null
}

/**
 * Derive a database bond's `sqlCapabilities` from its OWN `src/capabilities.ts`.
 *
 * The map is read as SOURCE, never imported: the declaration imports only the
 * contract TYPE (and, for MotherDuck, another bond's constant), and evaluating
 * it could pull engine code into a registry scan that must stay dependency-free.
 * The two shapes the seven providers use are both handled — an object literal
 * (with `+`-concatenated notes) and an import alias re-exporting another
 * provider's constant, resolved through `resolvePackageSrc`.
 *
 * Shared by `sync-registry --scan-exports` (which writes the field) and
 * `sync-registry --check`, so the registry can never drift from the bond that
 * publishes the contract.
 *
 * @param srcPath - The package's `src/` directory.
 * @param resolvePackageSrc - Maps a package name to its `src/` directory, for a
 *   re-exported declaration (MotherDuck → DuckDB).
 * @returns The capability map, or null when the package declares none.
 */
export function scanSqlCapabilities(
  srcPath: string,
  resolvePackageSrc?: (packageName: string) => string | null,
): ScannedSqlCapabilities | null {
  const file = join(srcPath, 'capabilities.ts')
  if (!existsSync(file)) return null
  let text: string
  try {
    text = readFileSync(file, 'utf-8')
  } catch (_error) {
    // Unreadable source cannot be scanned; the caller keeps the recorded value.
    return null
  }
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const imports = new Map<string, string>()
  const found: {
    capabilities: ScannedSqlCapabilities | null
    reexport: { module: string; name: string } | null
  } = { capabilities: null, reexport: null }
  source.forEachChild((node) => {
    if (
      ts.isImportDeclaration(node) &&
      node.importClause &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const bindings = node.importClause.namedBindings
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          imports.set(element.name.text, node.moduleSpecifier.text)
        }
      }
      return
    }
    if (!ts.isVariableStatement(node)) return
    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== 'sqlCapabilities')
        continue
      let initializer: ts.Expression | undefined = declaration.initializer
      while (initializer && ts.isParenthesizedExpression(initializer)) {
        initializer = initializer.expression
      }
      if (initializer && ts.isObjectLiteralExpression(initializer)) {
        found.capabilities = readCapabilityMap(initializer)
      } else if (initializer && ts.isIdentifier(initializer)) {
        const module = imports.get(initializer.text)
        if (module) found.reexport = { module, name: initializer.text }
      }
    }
  })
  if (found.capabilities) return found.capabilities
  if (!found.reexport || !resolvePackageSrc) return null
  // The import specifier may carry a subpath (`…-duckdb/capabilities.js`);
  // resolution is by PACKAGE, so strip everything after the package name.
  const specifier = found.reexport.module
  const packageName = specifier.startsWith('@')
    ? specifier.split('/').slice(0, 2).join('/')
    : specifier.split('/')[0]
  const target = resolvePackageSrc(packageName)
  if (!target) return null
  return scanSqlCapabilities(target, resolvePackageSrc)
}

/**
 * Mapping from molecule.type metadata values to the expected PackageType (directory-based).
 * molecule.type uses "provider" while the directory-based system uses "bond".
 */
const METADATA_TO_DIR_TYPE: Record<string, PackageType> = {
  core: 'core',
  provider: 'bond',
  resource: 'resource',
  middleware: 'middleware',
  utility: 'utility',
  infrastructure: 'infrastructure',
  framework: 'framework',
  feature: 'feature',
  native: 'native',
}

/**
 * Validate that a package's molecule.type metadata matches its directory location.
 *
 * Returns a warning message if there's a mismatch, or null if valid.
 * This is the enforcement mechanism that prevents packages from being placed in the wrong directory.
 */
export function validatePackagePlacement(pkg: InferredPackage): string | null {
  if (!pkg.molecule?.type || !pkg.path) return null

  const expectedDirType = METADATA_TO_DIR_TYPE[pkg.molecule.type]
  if (!expectedDirType) return null

  const actualDirType = inferPackageType(pkg.path)

  if (expectedDirType !== actualDirType) {
    return (
      `Package ${pkg.name} has molecule.type="${pkg.molecule.type}" ` +
      `(expects ${expectedDirType}/ directory) but is located in a ` +
      `${actualDirType}/ directory (${pkg.path}). ` +
      `Move it to the correct directory or fix molecule.type.`
    )
  }

  return null
}

/**
 * Find all molecule packages in a directory
 */
export async function findMoleculePackages(packagesDir: string): Promise<string[]> {
  const packages: string[] = []

  async function scan(dir: string, depth = 0): Promise<void> {
    if (depth > 4) return // Don't go too deep

    try {
      const entries = await readdir(dir, { withFileTypes: true })

      // Check if this is a package (has package.json)
      const hasPackageJson = entries.some((e) => e.name === 'package.json')
      if (hasPackageJson) {
        const packageJsonPath = join(dir, 'package.json')
        const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
        if (packageJson.name?.startsWith('@molecule/')) {
          packages.push(dir)
        }
      }

      // Recurse into subdirectories
      for (const entry of entries) {
        if (
          entry.isDirectory() &&
          !entry.name.startsWith('.') &&
          entry.name !== 'node_modules' &&
          entry.name !== 'dist'
        ) {
          await scan(join(dir, entry.name), depth + 1)
        }
      }
    } catch (_error) {
      // Safe to ignore: directory may not exist or be readable; scanning continues with other dirs
    }
  }

  await scan(packagesDir)
  return packages
}
