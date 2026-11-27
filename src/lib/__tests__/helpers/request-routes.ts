/**
 * Reads a scaffolded full-stack project's requests and the routes its API serves, so a test can
 * check that every request the app makes is answered.
 *
 * Requests come from the app's own sources and from the molecule packages it imports, followed by
 * name into molecule's sources: a feature or framework package's component or hook makes its
 * requests on the app's behalf. A request is a path literal in an HTTP client call
 * (`http.get('/devices')`), a configured endpoint (`loginEndpoint: '/users/log-in'`) or any
 * `'/api/...'` literal. Paths are relative to the app's `API_BASE_URL` unless they already start
 * with its path, as the HTTP client joins them.
 *
 * Routes are read per router, from where `server.ts` mounts it down: its route calls
 * (`router.get('/users/me', …)`), the routers it mounts under their prefix, and the routes a
 * package function it is handed to adds (`mountDefaultUserCrudRoutes(router, User)`). A mounted
 * module with no routes of its own (a middleware a package builds, `createBillingRoutes({ tiers })`)
 * serves the route literals of the `@molecule/*` packages it imports.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

import ts from 'typescript'

import { code } from './source-text.js'

/** A route the API serves: an HTTP method (`all` for any) and an Express path. */
export interface ServedRoute {
  method: string
  path: string
  file: string
}

/**
 * A request the app makes: its method (`any` when the source does not say) and full path. A
 * configured endpoint with no method of its own (`oauthEndpoint: '/users/oauth'`) is a base the
 * client may extend, so a route under it answers it (`base`).
 */
export interface AppRequest {
  method: string
  path: string
  file: string
  base?: boolean
}

/** Where to read package sources: `path` per package name (the registry's) under a molecule root. */
export interface PackageSources {
  moleculeRoot: string
  packages: Record<string, { path?: string; type?: string; stack?: string }>
}

const sourceCache = new Map<string, string>()

/**
 * A source file's code (`code()` of its text), read once: a fleet run reads each package for
 * every app. Files must not change during a run; a known-bad case writes its own copy.
 */
function sourceCode(file: string): string {
  let text = sourceCache.get(file)
  if (text === undefined) {
    text = code(readFileSync(file, 'utf8'))
    sourceCache.set(file, text)
  }
  return text
}

const SOURCE_FILE = /\.(ts|tsx|js|jsx|vue|svelte)$/

const listingCache = new Map<string, string[]>()

/** Every source file under a directory, tests and locale data left out, listed once. */
function sourceFiles(dir: string): string[] {
  const cached = listingCache.get(dir)
  if (cached) return cached
  const files = listSourceFiles(dir)
  listingCache.set(dir, files)
  return files
}

/** The source files under `dir`, tests and locale data left out. */
function listSourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => SOURCE_FILE.test(file))
    .filter((file) => !/(^|\/)(__tests__|locales)\//.test(file) && !/\.(test|spec)\./.test(file))
    .map((file) => join(dir, file))
}

/** The file a relative import names: `./x.js` is `x.ts`, `x.tsx` or `x/index.ts`. */
function resolveRelative(from: string, specifier: string): string | undefined {
  const base = join(dirname(from), specifier)
  const stem = base.replace(/\.(js|jsx|mjs)$/, '')
  for (const candidate of [
    base,
    `${stem}.ts`,
    `${stem}.tsx`,
    `${stem}.js`,
    join(stem, 'index.ts'),
    join(stem, 'index.tsx'),
  ]) {
    if (existsSync(candidate) && SOURCE_FILE.test(candidate)) return candidate
  }
  return undefined
}

/** Each import of a file: its specifier and the names it takes (`X as Y` takes `X`). */
function imports(text: string): { specifier: string; names: string[] }[] {
  const out: { specifier: string; names: string[] }[] = []
  const pattern =
    /import\s+(?:type\s+)?(?:([\w$]+)\s*,?\s*)?(?:\{([^}]*)\}\s*)?(?:\*\s+as\s+[\w$]+\s*)?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s*['"]([^'"]+)['"]|\bexport\s+(?:type\s+)?(?:\*(?:\s+as\s+[\w$]+)?|\{([^}]*)\})\s*from\s*['"]([^'"]+)['"]/g
  for (const match of text.matchAll(pattern)) {
    const specifier = match[3] ?? match[4] ?? match[5] ?? match[7]
    const names = (match[2] ?? match[6] ?? '')
      .split(',')
      .map((part) =>
        part
          .replace(/^\s*type\s+/, '')
          .trim()
          .split(/\s+as\s+/)[0]
          ?.trim(),
      )
      .filter((name): name is string => Boolean(name))
    if (match[1]) names.push('default')
    out.push({ specifier, names })
  }
  return out
}

/** The source directory of a `@molecule/*` package, when the registry places it. */
function packageSrc(name: string, sources: PackageSources): string | undefined {
  const path = sources.packages[name]?.path
  return path ? join(sources.moleculeRoot, path, 'src') : undefined
}

/** The files of a package that define `name`: `export function name`, or a file named after it. */
function definingFiles(srcDir: string, name: string): string[] {
  const definition = new RegExp(
    `export\\s+(?:default\\s+)?(?:async\\s+)?(?:function\\*?|const|let|class)\\s+${name}\\b`,
  )
  return sourceFiles(srcDir).filter((file) => {
    const base = file.slice(file.lastIndexOf('/') + 1).replace(SOURCE_FILE, '')
    return base === name || definition.test(sourceCode(file))
  })
}

/** Where a local name of a module comes from: an import's specifier and the name it exports. */
interface Binding {
  specifier: string
  name: string
}

/** The imported names of a module, by local name (`import { a as b }` binds `b`). */
function bindings(text: string): Map<string, Binding> {
  const out = new Map<string, Binding>()
  for (const match of text.matchAll(
    /import\s+(?:type\s+)?(?:([\w$]+)\s*,?\s*)?(?:\{([^}]*)\}\s*)?from\s*['"]([^'"]+)['"]/g,
  )) {
    const specifier = match[3]
    if (match[1]) out.set(match[1], { specifier, name: 'default' })
    for (const part of (match[2] ?? '').split(',')) {
      const [name, local] = part
        .replace(/^\s*type\s+/, '')
        .trim()
        .split(/\s+as\s+/)
      if (name) out.set((local ?? name).trim(), { specifier, name: name.trim() })
    }
  }
  // `const { router } = await import('./App/router.js')` binds its names after the import.
  for (const match of text.matchAll(
    /const\s*\{([^}]*)\}\s*=\s*await\s+import\(\s*['"]([^'"]+)['"]\s*\)/g,
  )) {
    for (const part of match[1].split(',')) {
      const [name, local] = part.split(':').map((piece) => piece.trim())
      if (name) out.set(local ?? name, { specifier: match[2], name })
    }
  }
  return out
}

/** The local variable a module exports as `name` (`export default router`, `export const x`). */
function exportedVariable(text: string, name: string): string | undefined {
  if (name === 'default') {
    return (
      text.match(/^export\s+default\s+([\w$]+)\s*$/m)?.[1] ??
      text.match(/export\s*\{[^}]*\b([\w$]+)\s+as\s+default\b/)?.[1]
    )
  }
  if (
    new RegExp(String.raw`export\s+(?:const|let|var|(?:async\s+)?function)\s+${name}\b`).test(text)
  )
    return name
  return (
    text.match(new RegExp(String.raw`export\s*\{[^}]*\b([\w$]+)\s+as\s+${name}\b`))?.[1] ??
    (new RegExp(String.raw`export\s*\{[^}]*\b${name}\b`).test(text) ? name : undefined)
  )
}

/** The parameters and body of `export function name(…) { … }` in a source text. */
function functionBody(text: string, name: string): { params: string; body: string } | undefined {
  const start = text.search(new RegExp(String.raw`export\s+(?:async\s+)?function\s+${name}\b`))
  if (start < 0) return undefined
  // The parameter list opens at the first `(` outside the type parameters (`<L extends X<Y>>`).
  let open = start
  for (let angle = 0; open < text.length; open++) {
    if (text[open] === '<') angle++
    else if (text[open] === '>') angle--
    else if (text[open] === '(' && angle === 0) break
  }
  let depth = 0
  let close = open
  for (; close < text.length; close++) {
    if (text[close] === '(') depth++
    else if (text[close] === ')' && --depth === 0) break
  }
  const bodyStart = text.indexOf('{', close)
  depth = 0
  let end = bodyStart
  for (; end < text.length; end++) {
    if (text[end] === '{') depth++
    else if (text[end] === '}' && --depth === 0) break
  }
  return { params: text.slice(open + 1, close), body: text.slice(bodyStart + 1, end) }
}

const ROUTE_CALL = /\b([\w$]+)\s*\.\s*(get|post|put|patch|delete|all)\s*\(\s*(['"`])(\/[^'"`]*)\3/g
const USE_CALL = /\b([\w$]+)\s*\.\s*use\s*\(\s*(?:(['"`])(\/[^'"`]*)\2\s*,\s*)?([^()]*)\)/g
const PASSED_TO = /\b([\w$]+)\s*\(\s*([\w$]+)\s*[,)]/g
/** A router a package function builds, mounted in place: `router.use(createBillingRouter<L>({ … }))`. */
const USE_BUILT =
  /\b([\w$]+)\s*\.\s*use\s*\(\s*(?:(['"`])(\/[^'"`]*)\2\s*,\s*)?([\w$]+)\s*(?:<[^>()]*>)?\s*\(/g

/**
 * The routes one router serves, read from its module's text: its route calls, the routers it
 * mounts (`router.use('/posts', posts)`, under their prefix), and the routes a package function
 * it is handed to adds (`mountDefaultUserCrudRoutes(router, User)`). With no variable, every
 * router of the module counts.
 */
function routerRoutes(
  file: string,
  variable: string | undefined,
  sources: PackageSources,
  seen = new Set<string>(),
): ServedRoute[] {
  // `seen` holds the routers above this one, so a cycle ends; one router mounted at two paths
  // (`/entries` and its alias `/completions`) is read at each.
  const key = `${file}#${variable ?? '*'}`
  if (seen.has(key)) return []
  seen = new Set([...seen, key])
  const text = sourceCode(file)
  const binds = bindings(text)
  const mine = (receiver: string): boolean => variable === undefined || receiver === variable
  const routes: ServedRoute[] = []
  for (const match of text.matchAll(ROUTE_CALL)) {
    if (mine(match[1])) routes.push({ method: match[2], path: match[4], file })
  }
  for (const match of text.matchAll(USE_CALL)) {
    if (!mine(match[1])) continue
    const ident = match[4].trim().match(/([\w$]+)$/)?.[1]
    if (!ident) continue
    for (const route of mountedRoutes(file, text, binds, ident, sources, seen)) {
      routes.push({ ...route, path: joinPath(match[3] ?? '/', route.path) })
    }
  }
  for (const match of text.matchAll(USE_BUILT)) {
    const built = binds.get(match[4])
    if (!mine(match[1]) || !built?.specifier.startsWith('@molecule/')) continue
    // Only the routes in the function's own body: most functions handed to `use` are middleware.
    for (const route of factoryRoutes(built, sources, false)) {
      routes.push({ ...route, path: joinPath(match[3] ?? '/', route.path) })
    }
  }
  for (const match of text.matchAll(PASSED_TO)) {
    const [, fn, arg] = match
    const binding = binds.get(fn)
    if (!mine(arg) || !binding?.specifier.startsWith('@molecule/')) continue
    const src = packageSrc(binding.specifier, sources)
    for (const definer of src ? definingFiles(src, binding.name) : []) {
      const found = functionBody(sourceCode(definer), binding.name)
      const param = found?.params.split(',')[0]?.split(':')[0]?.trim()
      if (!found || !param) continue
      for (const call of found.body.matchAll(ROUTE_CALL)) {
        if (call[1] === param) routes.push({ method: call[2], path: call[4], file: definer })
      }
    }
  }
  return routes
}

/** The routes of `ident`, a router the module at `file` mounts. */
function mountedRoutes(
  file: string,
  text: string,
  binds: Map<string, Binding>,
  ident: string,
  sources: PackageSources,
  seen: Set<string>,
): ServedRoute[] {
  const binding = binds.get(ident)
  // A router made in the same module: `const posts = Router()`.
  if (!binding)
    return new RegExp(String.raw`\b${ident}\s*=`).test(text)
      ? routerRoutes(file, ident, sources, seen)
      : []
  if (binding.specifier.startsWith('.')) {
    const target = resolveRelative(file, binding.specifier)
    if (!target) return []
    const variable = exportedVariable(sourceCode(target), binding.name)
    // A plain handler mounted with `use` (`router.use('/stats', dashboardStats)`) answers every
    // method at its path and under it.
    if (
      variable &&
      new RegExp(String.raw`(?:^|\s)(?:async\s+)?function\s+${variable}\b`).test(sourceCode(target))
    ) {
      return [{ method: 'all', path: '/{*rest}', file: target }]
    }
    const own = routerRoutes(target, variable, sources, seen)
    if (own.length > 0) return own
    // A module whose export a package function builds (`createBillingRoutes({ tiers })`) serves
    // the routes in that function's body.
    const targetText = sourceCode(target)
    const targetBinds = bindings(targetText)
    return [
      ...targetText.matchAll(
        /export\s+(?:const\s+[\w$]+(?:\s*:[^=]+)?=|default)\s*([\w$]+)\s*(?:<[^>()]*>)?\(/g,
      ),
    ].flatMap((match) => {
      const built = targetBinds.get(match[1])
      return built?.specifier.startsWith('@molecule/') ? factoryRoutes(built, sources) : []
    })
  }
  return binding.specifier.startsWith('@molecule/') ? packageRoutes(binding.specifier, sources) : []
}

/**
 * The routes a package function builds: the route calls in its body, or, when its body holds none
 * (it delegates to helpers) and `fallback` holds, every route literal of its package.
 */
function factoryRoutes(built: Binding, sources: PackageSources, fallback = true): ServedRoute[] {
  const src = packageSrc(built.specifier, sources)
  const routes = (src ? definingFiles(src, built.name) : []).flatMap((file) => {
    const found = functionBody(sourceCode(file), built.name)
    return found
      ? [...found.body.matchAll(ROUTE_CALL)].map((call) => ({
          method: call[2],
          path: call[4],
          file,
        }))
      : []
  })
  return routes.length > 0 || !fallback ? routes : packageRoutes(built.specifier, sources)
}

/** Every route literal in a package's sources. */
function packageRoutes(specifier: string, sources: PackageSources): ServedRoute[] {
  const src = packageSrc(specifier, sources)
  return (src ? sourceFiles(src) : []).flatMap((file) =>
    [...sourceCode(file).matchAll(ROUTE_CALL)].map((match) => ({
      method: match[2],
      path: match[4],
      file,
    })),
  )
}

/** Joins a mount path and a route path the way Express does. */
function joinPath(mount: string, path: string): string {
  const joined = `${mount.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
  return joined === '' ? '/' : joined.replace(/\/$/, '') || '/'
}

/** Literal app mounts may use Express middleware before the final router. */
function applicationMounts(text: string): { mount: string; router: string }[] {
  const source = ts.createSourceFile('server.ts', text, ts.ScriptTarget.Latest, true)
  const mounts: { mount: string; router: string }[] = []
  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const { expression: receiver, name } = node.expression
      if (ts.isIdentifier(receiver) && receiver.text === 'app' && name.text === 'use') {
        const mount = node.arguments[0]
        const router = node.arguments.at(-1)
        if (
          mount &&
          (ts.isStringLiteral(mount) || ts.isNoSubstitutionTemplateLiteral(mount)) &&
          mount.text.startsWith('/') &&
          router &&
          ts.isIdentifier(router)
        ) {
          mounts.push({ mount: mount.text, router: router.text })
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return mounts
}

/**
 * Every route the project's API serves: each router `server.ts` mounts (`app.use('/api', router)`),
 * and the router it hands a server factory (`getRouter: () => import('./App/router.js')`), under
 * the path that factory mounts it at.
 */
export function servedRoutes(apiDir: string, sources: PackageSources): ServedRoute[] {
  const serverFile = join(apiDir, 'src', 'server.ts')
  const server = sourceCode(serverFile)
  const binds = bindings(server)
  const seen = new Set<string>()
  const routes: ServedRoute[] = []
  for (const { mount, router } of applicationMounts(server)) {
    if (!binds.has(router))
      throw new Error(`server.ts mounts ${router} at ${mount}, imported from nowhere it reads`)
    for (const route of mountedRoutes(serverFile, server, binds, router, sources, seen)) {
      routes.push({ ...route, path: joinPath(mount, route.path) })
    }
  }
  const handed = server.match(/getRouter\s*:\s*\(\)\s*=>\s*import\(\s*['"](\.[^'"]+)['"]\s*\)/)
  if (handed) {
    const target = resolveRelative(serverFile, handed[1])
    const factories = [...binds.values()].filter(({ specifier }) =>
      specifier.startsWith('@molecule/'),
    )
    const mount = factories
      .flatMap(({ specifier }) => {
        const src = packageSrc(specifier, sources)
        return src ? sourceFiles(src) : []
      })
      .map((file) => {
        const text = sourceCode(file)
        const local = text.match(
          /const\s*\{\s*([\w$]+)\s*\}\s*=\s*await\s+[\w$.]*getRouter\(\)/,
        )?.[1]
        return local
          ? text.match(
              new RegExp(
                String.raw`app\.use\(\s*['"\x60](/[^'"\x60]*)['"\x60]\s*,\s*${local}\s*\)`,
              ),
            )?.[1]
          : undefined
      })
      .find(Boolean)
    if (!target || !mount)
      throw new Error(
        `server.ts hands ${handed[1]} to a server factory whose mount path it cannot read`,
      )
    const variable = exportedVariable(sourceCode(target), 'router')
    for (const route of routerRoutes(target, variable, sources, seen)) {
      routes.push({ ...route, path: joinPath(mount, route.path) })
    }
  }
  return routes
}

/**
 * A string literal that starts with `/`, its text in group `path`. A template literal keeps its
 * `${…}` parts whole, quotes inside them included (`${user?.id ?? ''}`).
 */
const PATH_LITERAL = String.raw`(?:'(?<single>/[^'\n]*)'|"(?<double>/[^"\n]*)"|\`(?<template>/(?:[^\`\\$]|\\.|\$\{[^}]*\}|\$(?!\{))*)\`)`
const CLIENT_CALL = new RegExp(
  String.raw`\.(get|post|put|patch|delete)\s*(?:<[\s\S]{0,300}?>)?\(\s*` + PATH_LITERAL,
  'g',
)
const ENDPOINT = /\b([\w$]*)Endpoint\s*:\s*/g
const ANY_PATH = new RegExp(PATH_LITERAL, 'g')

/** The text of a `PATH_LITERAL` match. */
function literal(match: RegExpMatchArray): string {
  const groups = match.groups ?? {}
  return groups.single ?? groups.double ?? groups.template ?? ''
}

/**
 * The path an endpoint setting builds, read from the text after its colon: a literal
 * (`'/users/me'`) or a function joining literals and values
 * (`(user) => '/users/' + encodeURIComponent(user.id) + '/password'`), each value a `${…}`.
 */
function endpointPath(rest: string): string | undefined {
  const arrow = rest.match(/^\([^)]*\)\s*(?::[^=]*)?=>\s*/)
  return joinedPath(
    (arrow ? rest.slice(arrow[0].length) : rest)
      .split('\n')[0]
      .replace(/\s+as\s+const\s*,?\s*$/, ''),
  )
}

/**
 * The path an expression joins from literals and values, read up to the end of the argument it
 * starts (a `,` or `)` outside parentheses): `'/api/calls/' + callId + '/end'` is
 * `/api/calls/${value}/end`.
 */
function joinedPath(expression: string): string | undefined {
  const parts: string[] = []
  let depth = 0
  let quote = ''
  let current = ''
  for (const char of expression) {
    if (quote) {
      if (char === quote) quote = ''
    } else if (char === "'" || char === '"' || char === '`') {
      quote = char
    } else if (char === '(') {
      depth++
    } else if ((char === ')' || char === ',' || char === '\n') && depth === 0) {
      break
    } else if (char === ')') {
      depth--
    } else if (char === '+' && depth === 0) {
      parts.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  parts.push(current.trim())
  const path = parts.map((part) => part.match(/^(['"`])([\s\S]*)\1$/)?.[2] ?? '${value}').join('')
  return path.startsWith('/') ? path : undefined
}

const DEFAULT_METHOD = /\b([\w$]+?)Method\s*=\s*['"](GET|POST|PUT|PATCH|DELETE)['"]/g
/** A package call that sends an endpoint option with a fixed method: `fetchAPI(currentUserEndpoint, { method: 'GET'`. */
const SENT_WITH = /\b([\w$]+)Endpoint\s*,\s*\{\s*method:\s*['"](GET|POST|PUT|PATCH|DELETE)['"]/g

/**
 * The default method of each `<name>Method` option the app's packages declare, by name: the auth
 * client's `changePasswordMethod = 'POST'` sends `changePasswordEndpoint` with POST unless the
 * config names another. The packages are the app's `@molecule/app-*` imports and theirs, since a
 * bond package builds the client the config is handed to.
 */
function defaultMethods(appSrc: string, sources: PackageSources): Map<string, string> {
  const queue: string[] = []
  const add = (specifiers: Iterable<string>): void => {
    for (const specifier of specifiers) {
      if (sources.packages[specifier]?.stack === 'app' && !queue.includes(specifier))
        queue.push(specifier)
    }
  }
  for (const file of sourceFiles(appSrc)) add(imports(sourceCode(file)).map((i) => i.specifier))
  const out = new Map<string, string>()
  for (let i = 0; i < queue.length; i++) {
    const { methods, specifiers } = packageOptions(queue[i], sources)
    add(specifiers)
    for (const [name, method] of methods) if (!out.has(name)) out.set(name, method)
  }
  return out
}

const optionsCache = new Map<string, { methods: [string, string][]; specifiers: string[] }>()

/** The option methods one package declares and the packages it imports. */
function packageOptions(
  name: string,
  sources: PackageSources,
): { methods: [string, string][]; specifiers: string[] } {
  const cached = optionsCache.get(name)
  if (cached) return cached
  const methods: [string, string][] = []
  const specifiers = new Set<string>()
  const src = packageSrc(name, sources)
  for (const file of src ? sourceFiles(src) : []) {
    const text = sourceCode(file)
    for (const { specifier } of imports(text)) specifiers.add(specifier)
    for (const match of [...text.matchAll(DEFAULT_METHOD), ...text.matchAll(SENT_WITH)]) {
      methods.push([match[1], match[2].toLowerCase()])
    }
  }
  const options = { methods, specifiers: [...specifiers] }
  optionsCache.set(name, options)
  return options
}

/** The requests one file makes, as written. */
function requestLiterals(
  file: string,
  defaults: Map<string, string>,
  apiBase: string,
): LiteralRequest[] {
  const text = sourceCode(file)
  const out = new Map<string, LiteralRequest>()
  const add = (method: string, path: string, base = false, root?: string): void => {
    out.set(`${method} ${path}`, {
      method,
      path,
      ...(base ? { base } : {}),
      ...(root === undefined ? {} : { root }),
    })
  }
  for (const match of text.matchAll(CLIENT_CALL)) {
    // The path may go on past its first literal: `'/api/calls/' + callId + '/end'`.
    const start = (match.index ?? 0) + match[0].length - literal(match).length - 2
    add(match[1], joinedPath(text.slice(start)) ?? literal(match))
  }
  // `changePasswordEndpoint` is sent with `changePasswordMethod` (`profileEndpoint` with
  // `profileUpdateMethod`): the config's, or the default its package declares.
  for (const match of text.matchAll(ENDPOINT)) {
    const path = endpointPath(text.slice((match.index ?? 0) + match[0].length))
    if (!path) continue
    const name = match[1]
    // A config object's endpoints are sent under its own `baseURL` (the auth client's).
    const root = objectBase(text, match.index ?? 0, apiBase)
    // An endpoint the app sends once per entry of its `<name>Providers` list (`oauthEndpoint`,
    // one `GET <endpoint>/<provider>` per OAuth provider) is no request while that list is empty.
    const providers = name
      ? text.match(new RegExp(String.raw`\b${name}Providers\s*:\s*\[([^\]]*)\]`))
      : null
    if (providers) {
      if (providers[1].trim()) add('get', `${path}/:param`, false, root)
      continue
    }
    const method =
      text
        .match(new RegExp(String.raw`\b${name}\w*Method\s*:\s*['"](\w+)['"]`))?.[1]
        ?.toLowerCase() ??
      defaults.get(name) ??
      [...defaults].find(([option]) => name && option.startsWith(name))?.[1]
    if (method) add(method, path, false, root)
    else add('any', path, true, root)
  }
  // Any other `/api/…` literal is a request too (a link to an OAuth start, a raw fetch).
  for (const match of text.matchAll(ANY_PATH)) {
    const path = literal(match)
    if (!path.startsWith('/api/')) continue
    if (![...out.values()].some((request) => request.path === path)) add('any', path)
  }
  return [...out.values()]
}

/** A request as one file writes it, with the base URL of the config object it sits in. */
type LiteralRequest = Omit<AppRequest, 'file'> & { root?: string }

/** The expression that starts at `index`: up to a `,`, `}` or `)` outside brackets, or a line end. */
function expressionAt(text: string, index: number): string {
  let depth = 0
  let quote = ''
  let end = index
  for (; end < text.length; end++) {
    const char = text[end]
    if (quote) {
      if (char === quote) quote = ''
    } else if (char === "'" || char === '"' || char === '`') {
      quote = char
    } else if (char === '(' || char === '[' || char === '{') {
      depth++
    } else if ((char === ')' || char === ']' || char === '}') && depth > 0) {
      depth--
    } else if (depth === 0 && (char === ',' || char === '}' || char === ')' || char === ';')) {
      break
    } else if (depth === 0 && char === '\n' && !/^\n\s*(\|\||\?\?|\.)/.test(text.slice(end))) {
      break
    }
  }
  return text.slice(index, end).trim()
}

/**
 * The value a base URL expression has in development, where `VITE_API_URL` is unset: the first
 * nonempty term of `a || b`, with `API_BASE_URL` the config's value and any other read (an
 * environment variable) empty. `import.meta.env?.VITE_API_URL || '/api'` is `/api`.
 */
function baseValue(expression: string, apiBase: string): string {
  for (const term of expression.split(/\|\||\?\?/)) {
    const part = term.trim().replace(/\s+as\s+[\w\s|]+$/, '')
    const value =
      part.match(/^(['"`])([^'"`]*)\1$/)?.[2] ?? (part === 'API_BASE_URL' ? apiBase : '')
    if (value) return value.replace(/\/+$/, '')
  }
  return ''
}

/** The app's `API_BASE_URL` in development (`'/api'`, or `''`), read from its config. */
export function apiBasePath(appSrc: string): string {
  for (const file of sourceFiles(appSrc)) {
    const text = sourceCode(file)
    const match = /\bexport\s+const\s+API_BASE_URL\s*(?::[^=]+)?=\s*/.exec(text)
    if (match) return baseValue(expressionAt(text, match.index + match[0].length), '')
  }
  throw new Error(`no API_BASE_URL under ${appSrc}`)
}

/**
 * The base URL of the app's HTTP client, which package hooks and components send their relative
 * paths through: the one a bond under `bonds/` gives the client it bonds (`baseURL: …` or
 * `createDefaultHttpClient(API_BASE_URL)`), or `''` when none does (the client
 * `@molecule/app-http` falls back to has no base).
 */
export function httpBasePath(appSrc: string): string {
  const apiBase = apiBasePath(appSrc)
  // `src/bonds/`, or `src/lib/bonds/` in a SvelteKit app.
  for (const file of sourceFiles(appSrc).filter((path) =>
    /(^|\/)bonds\//.test(relative(appSrc, path)),
  )) {
    const text = sourceCode(file)
    const match =
      /\bbaseURL\s*:\s*/.exec(text) ?? /\bcreate\w*HttpClient\s*\(\s*(?=[^\s{)])/.exec(text)
    if (match) return baseValue(expressionAt(text, match.index + match[0].length), apiBase)
    // `{ baseURL, withCredentials: true }`: the value is the module's `const baseURL = …`.
    const shorthand = /\{\s*(?:[\w$]+\s*,\s*)*baseURL\s*[,}]/.test(text)
      ? /\bconst\s+baseURL\s*(?::[^=]+)?=\s*/.exec(text)
      : null
    if (shorthand)
      return baseValue(expressionAt(text, shorthand.index + shorthand[0].length), apiBase)
  }
  return ''
}

/** The `baseURL` of the object literal around `index`, when it names one. */
function objectBase(text: string, index: number, apiBase: string): string | undefined {
  const start = text.lastIndexOf('= {', index)
  const end = text.indexOf('\n}', index)
  if (start < 0 || end < 0) return undefined
  const object = text.slice(start, end)
  const match = /\bbaseURL\s*:\s*/.exec(object)
  return match ? baseValue(expressionAt(object, match.index + match[0].length), apiBase) : undefined
}

/** A request path as the HTTP client sends it: under the base path, parameters as `:param`. */
function fullPath(path: string, base: string): string {
  // Values first: `${user?.id}` holds a `?` that is not a query string.
  const bare = path.replace(/\$\{[^}]*\}/g, ':param').replace(/[?#].*$/, '')
  const full = bare === base || bare.startsWith(`${base}/`) ? bare : joinPath(base, bare)
  return full.length > 1 ? full.replace(/\/$/, '') : full
}

/**
 * The modules the app's `index.html` loads (`/src/main.tsx`): what it runs starts there. An app
 * with none (SvelteKit routes) is read whole.
 */
function entryModules(appDir: string): string[] {
  const html = join(appDir, 'index.html')
  if (!existsSync(html)) return []
  return [...readFileSync(html, 'utf8').matchAll(/<script\b[^>]*\bsrc="\/(src\/[^"]+)"/g)]
    .map((match) => join(appDir, match[1]))
    .filter((file) => existsSync(file))
}

/**
 * Every request the app makes: in the modules its entry imports, their packages' components and
 * hooks included. A component nothing imports sends nothing.
 */
export function appRequests(appDir: string, sources: PackageSources): AppRequest[] {
  const appSrc = join(appDir, 'src')
  const apiBase = apiBasePath(appSrc)
  const base = httpBasePath(appSrc)
  const defaults = defaultMethods(appSrc, sources)
  const requests: AppRequest[] = []
  const seen = new Set<string>()
  const visit = (file: string): void => {
    if (seen.has(file)) return
    seen.add(file)
    for (const { root, ...request } of requestLiterals(file, defaults, apiBase)) {
      requests.push({ ...request, path: fullPath(request.path, root ?? base), file })
    }
    for (const { specifier, names } of imports(sourceCode(file))) {
      if (specifier.startsWith('.')) {
        const target = resolveRelative(file, specifier)
        if (target) visit(target)
        continue
      }
      const entry = sources.packages[specifier]
      // A feature or framework package acts for the app; a core or provider is configured by it.
      if (!entry || entry.stack !== 'app' || !['feature', 'framework'].includes(entry.type ?? ''))
        continue
      const src = packageSrc(specifier, sources)
      if (!src) continue
      for (const name of names) for (const target of definingFiles(src, name)) visit(target)
    }
  }
  const entries = entryModules(appDir)
  for (const file of entries.length > 0 ? entries : sourceFiles(appSrc)) visit(file)
  return requests
}

/**
 * Whether a served route answers a request. A route parameter takes any segment of a request
 * whose method is known. A request of unknown method could be meant for any route its path fits,
 * so it is answered only by a route that names each of its literal segments: `/users/password`
 * is not answered by `GET /users/:id`.
 */
function answers(route: ServedRoute, request: AppRequest): boolean {
  if (route.method !== 'all' && request.method !== 'any' && route.method !== request.method)
    return false
  const want = request.path.split('/')
  const have = route.path.split('/')
  for (let i = 0; i < have.length; i++) {
    const segment = have[i]
    if (segment.startsWith('*') || segment.startsWith('{*')) return true
    if (i >= want.length) return Boolean(request.base)
    if (want[i].includes(':param')) continue
    if (segment.startsWith(':') ? !request.base || request.method !== 'any' : segment === want[i])
      continue
    return false
  }
  return have.length === want.length
}

/** A project's requests, the routes its API serves, and the requests none of them answers. */
export interface RequestReport {
  requests: AppRequest[]
  routes: ServedRoute[]
  unanswered: AppRequest[]
}

/** The requests of the app under `projectDir` against the routes of its API, read once. */
export function requestReport(projectDir: string, sources: PackageSources): RequestReport {
  const routes = servedRoutes(join(projectDir, 'api'), sources)
  const requests = appRequests(join(projectDir, 'app'), sources)
  const unanswered = requests
    .filter((request) => !routes.some((route) => answers(route, request)))
    .map((request) => ({
      ...request,
      file: request.file.startsWith(projectDir)
        ? relative(projectDir, request.file)
        : relative(sources.moleculeRoot, request.file),
    }))
  return { requests, routes, unanswered }
}

/** The requests no served route answers, each with the file that makes it. */
export function unansweredRequests(projectDir: string, sources: PackageSources): AppRequest[] {
  return requestReport(projectDir, sources).unanswered
}
