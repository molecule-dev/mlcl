/**
 * App-side modules for the API resources a project declares.
 *
 * A resource package wires its routes into the API at scaffold time, and the app got nothing:
 * every page that read or changed the resource was written from scratch. For each declared
 * resource that is a plain collection, this writes one small app module that describes it to
 * the app's resource factory (list, detail, create, update, remove and toggles on the shared
 * query cache), typed from the resource's own table.
 *
 * Nothing here names a package. The app package that owns the factory declares it in the
 * registry (`decisionGuide.resourceModules`), the resources come from the project's manifests,
 * and routes, tables and SQL are read from each resource's registry entry.
 *
 * The modules are the app's code from the moment they are written: an existing file is never
 * rewritten, and this runs at `mlcl create` only, so a module the app deleted stays deleted.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { DeclaredPackage } from './capability-map.js'
import type { Registry, RegistryEntry } from './schema.js'
import { splitSqlColumns, splitSqlStatements } from './sql-requirements.js'

/** How an app package declares its resource factory (`decisionGuide.resourceModules`). */
export type ResourceModuleFactory = NonNullable<
  NonNullable<RegistryEntry['decisionGuide']>['resourceModules']
>

/** One app module this project gets. */
export interface AppResourceModule {
  /** The resource package the module is for. */
  resource: string
  /** Project-relative path of the module, e.g. `app/src/resources/invoices.ts`. */
  path: string
  /** The exported resource, e.g. `invoices`. */
  exportName: string
  /** The exported record type, e.g. `Invoice`. */
  typeName: string
  /** The calls the module supports, e.g. `list`, `detail`, `toggle(…, 'flag', on)`. */
  operations: string[]
  /** The module's source. */
  source: string
}

interface Route {
  method: string
  path: string
}

const SEGMENT = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/

const pascal = (name: string): string =>
  name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
const camel = (name: string): string => {
  const value = pascal(name)
  return value.charAt(0).toLowerCase() + value.slice(1)
}

/** `addresses` → `address`, `properties` → `property`, `room-types` → `room-type`. */
const singular = (name: string): string =>
  name.endsWith('ies')
    ? `${name.slice(0, -3)}y`
    : /(?:ss|x|ch|sh)es$/.test(name)
      ? name.slice(0, -2)
      : name.endsWith('s') && !name.endsWith('ss')
        ? name.slice(0, -1)
        : name

/**
 * The plain collection a resource's routes describe: a static base path with a list read and a
 * detail read addressed by one parameter. A resource nested under another record
 * (`/:resourceType/:resourceId/comments`) or with no list is not one, and gets no module.
 *
 * @param routes - The resource's declared routes.
 * @returns The collection, or null when the routes do not describe one.
 */
export function resourceCollection(routes: readonly Route[]): {
  base: string
  param: string
  create: boolean
  update: 'put' | 'patch' | null
  remove: boolean
  toggles: string[]
} | null {
  const has = (method: string, path: string): boolean =>
    routes.some((route) => route.method.toLowerCase() === method && route.path === path)
  const bases = routes
    .filter((route) => route.method.toLowerCase() === 'get')
    .map((route) => route.path)
    .filter((path) =>
      path
        .split('/')
        .slice(1)
        .every((segment) => SEGMENT.test(segment)),
    )
    .sort((a, b) => a.length - b.length)
  for (const base of bases) {
    const detail = routes.find((route) => {
      const rest = route.path.startsWith(`${base}/:`) ? route.path.slice(base.length + 2) : null
      return route.method.toLowerCase() === 'get' && rest !== null && IDENTIFIER.test(rest)
    })
    if (!detail) continue
    const item = detail.path
    const toggles = routes
      .filter((route) => route.method.toLowerCase() === 'post' && route.path.startsWith(`${item}/`))
      .map((route) => route.path.slice(item.length + 1))
      .filter((action) => SEGMENT.test(action) && has('delete', `${item}/${action}`))
    return {
      base,
      param: item.slice(base.length + 2),
      create: has('post', base),
      update: has('put', item) ? 'put' : has('patch', item) ? 'patch' : null,
      remove: has('delete', item),
      toggles: [...new Set(toggles)],
    }
  }
  return null
}

const SQL_TYPES: ReadonlyArray<[RegExp, string]> = [
  [/^(?:BOOL|BOOLEAN)\b/i, 'boolean'],
  [
    /^(?:SMALLINT|INTEGER|INT\d?|BIGINT|SERIAL|BIGSERIAL|SMALLSERIAL|REAL|FLOAT\d?|DOUBLE|NUMERIC|DECIMAL)\b/i,
    'number',
  ],
  [/^(?:JSON|JSONB)\b/i, 'unknown'],
  [/^(?:UUID|TEXT|VARCHAR|CHAR|CHARACTER|CITEXT|TIMESTAMP|TIMESTAMPTZ|DATE|TIME)\b/i, 'string'],
]

/**
 * The columns of one table, read from the resource's setup SQL.
 *
 * @param sql - Every setup SQL text of the resource.
 * @param table - The table to read.
 * @returns Each column with its TypeScript type, or null when the table is not declared.
 */
export function tableColumns(
  sql: readonly string[],
  table: string,
): Array<{ name: string; type: string }> | null {
  for (const text of sql) {
    for (const statement of splitSqlStatements(text)) {
      const body = statement.text
      const head = /^\s*CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([A-Za-z_][\w$]*)"?\s*\(/i.exec(
        body,
      )
      if (!head || head[1] !== table) continue
      const inner = body.slice(head[0].length, body.lastIndexOf(')'))
      const columns: Array<{ name: string; type: string }> = []
      for (const part of splitSqlColumns(inner)) {
        const column = /^"?([A-Za-z_][\w$]*)"?\s+(.+)$/s.exec(
          part.replace(/--[^\n]*\n/g, '').trim(),
        )
        if (!column) continue
        if (/^(?:PRIMARY|UNIQUE|FOREIGN|CONSTRAINT|CHECK|EXCLUDE)$/i.test(column[1])) continue
        const known = SQL_TYPES.find(([pattern]) => pattern.test(column[2]))?.[1] ?? 'unknown'
        const required = /\bNOT\s+NULL\b|\bPRIMARY\s+KEY\b/i.test(column[2])
        columns.push({
          name: column[1],
          type: required || known === 'unknown' ? known : `${known} | null`,
        })
      }
      return columns.length > 0 ? columns : null
    }
  }
  return null
}

/**
 * Plan the app module for one resource package.
 *
 * @param resource - The resource package's name.
 * @param entry - Its registry entry.
 * @param factory - The app package's factory declaration.
 * @param factoryPackage - The app package that exports the factory.
 * @param workspace - The app workspace, relative to the project root (`app`, or `` for a
 *   single-package project).
 * @returns The module, or null when the resource is not a plain collection.
 */
export function planAppResourceModule(
  resource: string,
  entry: RegistryEntry,
  factory: ResourceModuleFactory,
  factoryPackage: string,
  workspace: string,
): AppResourceModule | null {
  const collection = resourceCollection(entry.routes ?? [])
  if (!collection) return null
  const name = collection.base.split('/').at(-1) ?? ''
  const short = entry.shortName ?? resource.replace(/^@molecule\/api-resource-/, '')
  if (!SEGMENT.test(name) || !SEGMENT.test(short)) return null
  const exportName = camel(name)
  // The record is named after what the collection holds: `/services` holds a Service even when
  // the package that serves it is named for something larger.
  const typeName = pascal(singular(name))
  const setupSql = entry.setupSql
  const sql = setupSql && typeof setupSql === 'object' ? Object.values(setupSql) : []
  const columns = tableColumns(
    sql.filter((text): text is string => typeof text === 'string'),
    name.replace(/-/g, '_'),
  )
  const idField = columns?.some((column) => column.name === collection.param)
    ? collection.param
    : 'id'
  const path = [workspace, factory.directory, `${name}.ts`].filter(Boolean).join('/')
  const operations = [
    'list',
    'detail',
    ...(collection.create ? ['create'] : []),
    ...(collection.update ? ['update'] : []),
    ...(collection.remove ? ['remove'] : []),
    ...collection.toggles.map((action) => `toggle(viewer, ${idField}, '${action}', on)`),
  ]
  const routes = (entry.routes ?? [])
    .filter(
      (route) => route.path === collection.base || route.path.startsWith(`${collection.base}/`),
    )
    .map((route) => `${route.method.toUpperCase()} ${route.path}`)
  const httpNames = [factory.http.client, factory.http.readList, factory.http.readOne].sort(
    (a, b) => a.toLowerCase().localeCompare(b.toLowerCase()),
  )
  const fields = columns
    ? columns.map((column) => `  ${column.name}: ${column.type}`).join('\n')
    : '  id: string\n  [field: string]: unknown'
  const source = `/**
 * ${typeName} records on the app's shared query cache.
 *
 * Written once by mlcl for ${resource}.
 * It is this app's code: change the path, the readers and the type to match the API you serve.
 * mlcl does not write it again.
 *
 * Read with \`useQuery(${exportName}.list(viewer, params))\` and
 * \`useQuery(${exportName}.detail(viewer, ${idField}))\`.
 * Write with ${operations
   .slice(2)
   .map((operation) => `\`${exportName}.${operation.replace(/\(.*$/, '')}\``)
   .join(', ')}:
 * each write shows the server's record in the cache and fetches the lists on screen again.
 * \`viewer\` is the signed-in user's id, or 'anonymous'.
 *
 * Routes: ${routes.join(', ')}
 */
import { ${httpNames.join(', ')} } from '${factory.http.package}'
import { ${factory.factory} } from '${factoryPackage}'

/** ${
    columns
      ? `The columns of the \`${name.replace(/-/g, '_')}\` table. Add the fields your API adds to a response.`
      : `A ${typeName} record as the API returns it. Name its fields here.`
  } */
export interface ${typeName} {
${fields}
}

export const ${exportName} = ${factory.factory}<${typeName}>({
  name: '${name}',
  path: '${collection.base}',${idField === 'id' ? '' : `\n  id: '${idField}',`}${
    collection.update === 'patch' ? `\n  updateMethod: 'patch',` : ''
  }
  http: ${factory.http.client},
  readList: (response) => ${factory.http.readList}<${typeName}>(response),
  readOne: (response) => ${factory.http.readOne}<${typeName}>(response),
})
`
  return { resource, path, exportName, typeName, operations, source }
}

/**
 * Every app module a project's declarations call for.
 *
 * @param registry - The registry whose metadata describes the packages.
 * @param declared - The project's declared packages with their workspaces.
 * @returns The modules, in resource-name order; empty when no app workspace declares a factory
 *   together with its HTTP package.
 */
export function planAppResourceModules(
  registry: Registry,
  declared: readonly DeclaredPackage[],
): AppResourceModule[] {
  for (const declaration of declared) {
    const factory = registry.packages[declaration.name]?.decisionGuide?.resourceModules
    if (!factory) continue
    const beside = (name: string): boolean =>
      declared.some((item) => item.name === name && item.workspace === declaration.workspace)
    if (!beside(factory.http.package)) continue
    return declared
      .filter((item) => registry.packages[item.name]?.type === 'resource')
      .map((item) => item.name)
      .filter((name, index, all) => all.indexOf(name) === index)
      .sort()
      .flatMap((name) => {
        const module = planAppResourceModule(
          name,
          registry.packages[name],
          factory,
          declaration.name,
          declaration.workspace,
        )
        return module ? [module] : []
      })
  }
  return []
}

/** The line a generated API router carries for a package's routes (`injector.ts`). */
const mountLine = (resource: string): RegExp =>
  new RegExp(`^//   ${resource.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')} \\([^)]*\\): .*$`, 'm')

/**
 * Write the app modules that do not exist yet, and name each one beside its package's routes
 * in the generated API router.
 *
 * @param projectRoot - The project root.
 * @param registry - The registry whose metadata describes the packages.
 * @param declared - The project's declared packages with their workspaces.
 * @returns The modules written by this call (an existing file is left as it is).
 */
export async function writeAppResourceModules(
  projectRoot: string,
  registry: Registry,
  declared: readonly DeclaredPackage[],
): Promise<AppResourceModule[]> {
  const written: AppResourceModule[] = []
  for (const module of planAppResourceModules(registry, declared)) {
    const target = join(projectRoot, module.path)
    if (existsSync(target)) continue
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, module.source, 'utf8')
    written.push(module)
  }
  if (written.length === 0) return written
  for (const workspace of new Set(declared.map((item) => item.workspace))) {
    const router = join(projectRoot, workspace, 'src', 'App', 'router.ts')
    if (!existsSync(router)) continue
    let source = await readFile(router, 'utf8')
    for (const module of written) {
      const note = `//     app module: ${module.path} (${module.exportName}: ${module.operations
        .map((operation) => operation.replace(/\(.*$/, ''))
        .filter((operation, index, all) => all.indexOf(operation) === index)
        .join(', ')})`
      if (source.includes(note)) continue
      source = source.replace(mountLine(module.resource), (line) => `${line}\n${note}`)
    }
    await writeFile(router, source, 'utf8')
  }
  return written
}
