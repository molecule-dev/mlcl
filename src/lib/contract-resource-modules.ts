/**
 * App resource modules generated from the API contract the app actually serves.
 *
 * `app-resource-modules.ts` writes one module per resource PACKAGE, typed from that package's own
 * responses. A project whose request pins its own API (a supplied OpenAPI file) serves different
 * paths, envelopes and records, so those modules describe an API the app does not have. In X1
 * P317 all 8 projects shipped them and no run imported one: each wrote its own data file for the
 * contract instead.
 *
 * This reads the contract and writes the module a project would have written itself: one per
 * collection the contract declares, on the same resource factory the registry names
 * (`decisionGuide.resourceModules`), with
 *
 * - the record typed from the response schemas (a field is required only where every endpoint
 *   that returns the record requires it),
 * - readers that open the contract's own envelopes (`{ articles: [...] }`, `{ article: {...} }`),
 * - the request bodies typed as the contract declares them,
 * - the whole list answer (`{ articles, articlesCount }`) as its own typed query when the list
 *   carries more than the rows,
 * - a collection nested under a parent record (`/articles/{slug}/comments`) as a function of the
 *   parent's id.
 *
 * What is written is tracked in `<directory>/.contract-modules.json` (the contract's hash and
 * each file's hash). Running again after the contract changed rewrites the files this wrote and
 * nobody edited, removes the ones whose collection is gone, and leaves an edited file alone. A
 * package-derived module at the same path is replaced only while it is still byte-for-byte what
 * the scaffold wrote.
 *
 * @module
 */

import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { parse as parseYaml } from 'yaml'

import {
  factoryIsDeclared,
  planAppResourceModules,
  type ResourceModuleFactory,
} from './app-resource-modules.js'
import type { DeclaredPackage } from './capability-map.js'
import { formatGeneratedSource } from './format.js'
import type { Registry } from './schema.js'

type Json = Record<string, unknown>

/** One module the contract calls for. */
export interface ContractResourceModule {
  /** The collection's path in the contract, e.g. `/articles/{slug}/comments`. */
  collection: string
  /** Project-relative path of the module, e.g. `app/src/resources/comments.ts`. */
  path: string
  /** The exported resource, e.g. `comments`. */
  exportName: string
  /** The exported record type, e.g. `Comment`. */
  typeName: string
  /** The contract operations the module covers, e.g. `list`, `create`, `toggle favorite`. */
  operations: string[]
  /** The module's source, unformatted. */
  source: string
}

/** A contract path that got no module, and why. */
export interface SkippedContractPath {
  path: string
  reason: string
}

/** What a contract yields. */
export interface ContractResourcePlan {
  modules: ContractResourceModule[]
  skipped: SkippedContractPath[]
}

const SEGMENT = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/
const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const
const isObject = (value: unknown): value is Json =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const words = (name: string): string[] => name.split(/[-_]/).filter(Boolean)
const pascal = (name: string): string =>
  words(name)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
const camel = (name: string): string => {
  const value = pascal(name)
  return value.charAt(0).toLowerCase() + value.slice(1)
}
const singular = (name: string): string =>
  /ies$/.test(name)
    ? `${name.slice(0, -3)}y`
    : /(?:ses|xes|ches|shes)$/.test(name)
      ? name.slice(0, -2)
      : /s$/.test(name) && !/ss$/.test(name)
        ? name.slice(0, -1)
        : name

/** Reads a contract file's text: JSON or YAML. */
export function parseContract(text: string): unknown {
  const trimmed = text.trimStart()
  return trimmed.startsWith('{') ? JSON.parse(text) : parseYaml(text)
}

/**
 * Plan the modules for an OpenAPI 3 document.
 *
 * @param contract - The parsed document.
 * @param factory - The app package's resource factory, from the registry.
 * @param factoryPackage - The app package that exports the factory.
 * @param workspace - The app workspace relative to the project root (`app`, or `` for one package).
 * @param label - How the header names the contract (its project-relative path).
 * @param listRoute - Optional installed URL list binding, supplied by the composition root.
 * @returns The modules, in collection order, and the paths that got none.
 */
export function planContractResourceModules(
  contract: unknown,
  factory: ResourceModuleFactory,
  factoryPackage: string,
  workspace: string,
  label: string,
  listRoute?: ResourceModuleFactory['listRoute'],
): ContractResourcePlan {
  const plan: ContractResourcePlan = { modules: [], skipped: [] }
  if (!isObject(contract) || !isObject(contract.paths)) return plan
  const document = contract

  /** Follows `$ref`s inside this document; anything else resolves to itself. */
  const resolve = (
    node: unknown,
    seen = new Set<string>(),
  ): { value: unknown; name: string | null } => {
    let name: string | null = null
    let value = node
    while (isObject(value) && typeof value.$ref === 'string') {
      const ref = value.$ref
      if (!ref.startsWith('#/') || seen.has(ref)) return { value: null, name: null }
      seen.add(ref)
      const parts = ref.slice(2).split('/')
      let at: unknown = document
      for (const part of parts)
        at = isObject(at) ? at[part.replace(/~1/g, '/').replace(/~0/g, '~')] : null
      if (parts[0] === 'components' && parts[1] === 'schemas') name = parts[2] ?? null
      value = at
    }
    return { value, name }
  }

  type Operation = { method: (typeof METHODS)[number]; path: string; operation: Json }
  const operations: Operation[] = []
  for (const [path, item] of Object.entries(document.paths as Json)) {
    const entry = resolve(item).value
    if (!isObject(entry)) continue
    for (const method of METHODS)
      if (isObject(entry[method]))
        operations.push({ method, path, operation: entry[method] as Json })
  }
  const find = (method: string, path: string): Operation | undefined =>
    operations.find((operation) => operation.method === method && operation.path === path)

  /** The JSON schema of an operation's success answer, with the name of a referenced schema. */
  const answer = (
    operation: Operation | undefined,
  ): { schema: unknown; name: string | null } | null => {
    const responses = isObject(operation?.operation.responses)
      ? operation!.operation.responses
      : null
    if (!responses) return null
    const status = ['200', '201', '2XX', 'default'].find((code) => code in responses)
    if (!status) return null
    const response = resolve(responses[status]).value
    const content = isObject(response) && isObject(response.content) ? response.content : null
    const media = content
      ? (content['application/json'] ??
        Object.entries(content).find(([type]) => /json/.test(type))?.[1])
      : null
    if (!isObject(media) || media.schema === undefined) return null
    const resolved = resolve(media.schema)
    return { schema: resolved.value, name: resolved.name }
  }
  /** The JSON schema of an operation's request body. */
  const body = (operation: Operation | undefined): unknown => {
    const request = resolve(operation?.operation.requestBody).value
    const content = isObject(request) && isObject(request.content) ? request.content : null
    const media = content
      ? (content['application/json'] ??
        Object.entries(content).find(([type]) => /json/.test(type))?.[1])
      : null
    return isObject(media) ? media.schema : undefined
  }

  /** Where a list answer keeps its rows: the array itself, or the one array property. */
  const listShape = (
    schema: unknown,
  ): { key: string | null; items: unknown; extra: boolean } | null => {
    const value = resolve(schema).value
    if (!isObject(value)) return null
    if (value.type === 'array') return { key: null, items: value.items, extra: false }
    const properties = isObject(value.properties) ? value.properties : null
    if (!properties) return null
    const arrays = Object.entries(properties).filter(([, property]) => {
      const resolved = resolve(property).value
      return isObject(resolved) && resolved.type === 'array'
    })
    if (arrays.length !== 1) return null
    const [key, property] = arrays[0]
    return {
      key,
      items: (resolve(property).value as Json).items,
      extra: Object.keys(properties).length > 1,
    }
  }
  /** Where a single-record answer keeps the record: the object itself, or its one property. */
  const oneShape = (
    schema: unknown,
    named: string | null,
  ): { key: string | null; record: unknown } | null => {
    const value = resolve(schema).value
    if (!isObject(value)) return null
    if (named) return { key: null, record: schema }
    const properties = isObject(value.properties) ? Object.entries(value.properties) : []
    if (properties.length === 1) {
      const inner = resolve(properties[0][1]).value
      if (isObject(inner) && (inner.type === 'object' || isObject(inner.properties)))
        return { key: properties[0][0], record: properties[0][1] }
    }
    return value.type === 'object' || isObject(value.properties)
      ? { key: null, record: schema }
      : null
  }

  const toColon = (path: string): string => path.replace(/\{([^}]+)\}/g, ':$1')
  const segmentsOf = (path: string): string[] => path.split('/').filter(Boolean)
  const isParam = (segment: string): boolean => /^\{[^}]+\}$/.test(segment)

  // Every path that could be a collection: its last segment is a word, and it lists (GET on it)
  // or holds records (GET on `<it>/{id}`).
  const paths = [...new Set(operations.map((operation) => operation.path))]
  const itemOf = (base: string): string | undefined =>
    paths.find((path) => {
      const rest = path.startsWith(`${base}/`) ? path.slice(base.length + 1) : ''
      return isParam(rest)
    })
  const candidates = paths.filter((path) => {
    const segments = segmentsOf(path)
    const last = segments.at(-1) ?? ''
    return segments.length > 0 && !isParam(last) && SEGMENT.test(last)
  })
  const bases = new Set<string>()
  for (const path of candidates) {
    const item = itemOf(path)
    const lists = listShape(answer(find('get', path))?.schema) !== null
    if (
      lists ||
      (item &&
        (find('get', item) || find('put', item) || find('patch', item) || find('delete', item)))
    )
      bases.add(path)
  }
  // Also a parent that only its records name (`/profiles/{username}` with no `GET /profiles`).
  for (const path of paths) {
    const segments = segmentsOf(path)
    if (segments.length >= 2 && isParam(segments.at(-1)!) && !isParam(segments.at(-2)!)) {
      const base = `/${segments.slice(0, -1).join('/')}`
      if (SEGMENT.test(segments.at(-2)!) && find('get', path)) bases.add(base)
    }
  }
  // A literal list beside a collection's records (`/articles/feed`) belongs to that collection.
  const extraLists = new Map<string, string[]>()
  for (const base of [...bases]) {
    const parent = `/${segmentsOf(base).slice(0, -1).join('/')}`
    if (parent !== '/' && bases.has(parent) && itemOf(parent) && !itemOf(base)) {
      const own =
        find('post', base) || find('put', base) || find('patch', base) || find('delete', base)
      if (!own && listShape(answer(find('get', base))?.schema)) {
        extraLists.set(parent, [...(extraLists.get(parent) ?? []), base])
        bases.delete(base)
      }
    }
  }

  const taken = new Set<string>()
  for (const base of [...bases].sort()) {
    const segments = segmentsOf(base)
    const name = segments.at(-1)!
    const parents = segments.slice(0, -1)
    const parentParams = parents.filter(isParam).map((segment) => segment.slice(1, -1))
    if (parentParams.length > 1) {
      plan.skipped.push({ path: base, reason: 'nested under more than one parent record' })
      continue
    }
    if (taken.has(name)) {
      plan.skipped.push({ path: base, reason: `another collection is already named ${name}` })
      continue
    }
    const item = itemOf(base)
    const param = item ? item.slice(base.length + 2, -1) : 'id'
    const list = find('get', base)
    const detail = item ? find('get', item) : undefined
    const create = find('post', base)
    const update = item ? (find('put', item) ?? find('patch', item)) : undefined
    const remove = item ? find('delete', item) : undefined
    const toggles = item
      ? paths
          .filter(
            (path) => path.startsWith(`${item}/`) && SEGMENT.test(path.slice(item.length + 1)),
          )
          .filter((path) => find('post', path) && find('delete', path))
          .map((path) => path.slice(item.length + 1))
      : []
    const listAnswer = listShape(answer(list)?.schema)
    if (!listAnswer && !detail) {
      plan.skipped.push({ path: base, reason: 'neither lists records nor returns one by id' })
      continue
    }
    taken.add(name)

    // ---- types -------------------------------------------------------------------------
    const exportName = camel(name)
    const declarations = new Map<string, string>()
    const pending: Array<{ name: string; schema: unknown }> = []
    /** A TypeScript type for a schema; component object schemas become named interfaces. */
    const typeOf = (schema: unknown, depth = 0): string => {
      if (isObject(schema) && typeof schema.$ref === 'string') {
        const resolved = resolve(schema)
        if (resolved.name && isObject(resolved.value)) {
          const typeName = pascal(resolved.name.replace(/[^A-Za-z0-9]+/g, '-'))
          if (!declarations.has(typeName)) {
            declarations.set(typeName, '')
            pending.push({ name: typeName, schema: resolved.value })
          }
          return typeName
        }
        return typeOf(resolved.value, depth)
      }
      if (!isObject(schema) || depth > 8) return 'unknown'
      if (Array.isArray(schema.enum))
        return schema.enum.map((value) => JSON.stringify(value)).join(' | ') || 'never'
      if ('const' in schema) return JSON.stringify(schema.const)
      for (const [key, joiner] of [
        ['oneOf', ' | '],
        ['anyOf', ' | '],
        ['allOf', ' & '],
      ] as const)
        if (Array.isArray(schema[key]))
          return `(${(schema[key] as unknown[]).map((part) => typeOf(part, depth + 1)).join(joiner)})`
      const types = Array.isArray(schema.type) ? (schema.type as unknown[]) : [schema.type]
      const nullable = schema.nullable === true || types.includes('null')
      const withNull = (type: string): string => (nullable ? `${type} | null` : type)
      const type = types.find((value) => value !== 'null')
      if (type === 'string') return withNull('string')
      if (type === 'integer' || type === 'number') return withNull('number')
      if (type === 'boolean') return withNull('boolean')
      if (type === 'array') {
        const items = typeOf(schema.items, depth + 1)
        return withNull(/[ |&]/.test(items) ? `Array<${items}>` : `${items}[]`)
      }
      if (type === 'object' || isObject(schema.properties))
        return withNull(objectType(schema, depth))
      return nullable ? 'unknown | null' : 'unknown'
    }
    const propertyKey = (key: string): string =>
      /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)
    const access = (key: string): string =>
      /^[A-Za-z_$][\w$]*$/.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`
    const objectType = (
      schema: Json,
      depth: number,
      optional: ReadonlySet<string> = new Set(),
    ): string => {
      const properties = isObject(schema.properties) ? schema.properties : {}
      const required = new Set(Array.isArray(schema.required) ? (schema.required as string[]) : [])
      const lines = Object.entries(properties).map(
        ([key, property]) =>
          `${propertyKey(key)}${required.has(key) && !optional.has(key) ? '' : '?'}: ${typeOf(property, depth + 1)}`,
      )
      if (schema.additionalProperties && schema.additionalProperties !== false)
        lines.push(
          `[key: string]: ${schema.additionalProperties === true ? 'unknown' : typeOf(schema.additionalProperties, depth + 1)}`,
        )
      return lines.length ? `{ ${lines.join('; ')} }` : 'Record<string, unknown>'
    }
    const drain = (): void => {
      while (pending.length) {
        const next = pending.shift()!
        if (declarations.get(next.name)) continue
        const value = next.schema as Json
        declarations.set(
          next.name,
          value.type === 'object' || isObject(value.properties)
            ? `export interface ${next.name} ${objectType(value, 0)}`
            : `export type ${next.name} = ${typeOf({ ...value }, 0)}`,
        )
      }
    }

    // The record: what the detail (or a write) returns, opened out of its envelope; the list's
    // rows when nothing returns one record.
    const single = detail ?? create ?? update
    const singleAnswer = answer(single)
    const one = singleAnswer ? oneShape(singleAnswer.schema, singleAnswer.name) : null
    const recordSource = one?.record ?? listAnswer?.items
    const recordResolved = resolve(recordSource)
    const typeName = pascal((recordResolved.name ?? singular(name)).replace(/[^A-Za-z0-9]+/g, '-'))
    const rowResolved = resolve(listAnswer?.items)
    let recordIsScalar = false
    if (
      isObject(recordResolved.value) &&
      (recordResolved.value.type === 'object' || isObject(recordResolved.value.properties))
    ) {
      // A field the list's rows leave out (or do not require) is optional on the shared record.
      const absent = new Set<string>()
      if (
        one &&
        listAnswer &&
        isObject(rowResolved.value) &&
        rowResolved.value !== recordResolved.value
      ) {
        const rowProperties = isObject(rowResolved.value.properties)
          ? rowResolved.value.properties
          : {}
        const rowRequired = new Set(
          Array.isArray(rowResolved.value.required) ? (rowResolved.value.required as string[]) : [],
        )
        for (const key of Object.keys(
          isObject(recordResolved.value.properties) ? recordResolved.value.properties : {},
        ))
          if (!(key in rowProperties) || !rowRequired.has(key)) absent.add(key)
      }
      declarations.set(
        typeName,
        `export interface ${typeName} ${objectType(recordResolved.value, 0, absent)}`,
      )
    } else {
      recordIsScalar = true
      declarations.set(typeName, `export type ${typeName} = ${typeOf(recordSource, 0)}`)
    }
    drain()
    const createBody = create ? body(create) : undefined
    const updateBody = update ? body(update) : undefined
    const createType = createBody === undefined ? null : `${typeName}Create`
    const updateType = updateBody === undefined ? null : `${typeName}Update`
    if (createType)
      declarations.set(createType, `export type ${createType} = ${typeOf(createBody, 0)}`)
    if (updateType)
      declarations.set(updateType, `export type ${updateType} = ${typeOf(updateBody, 0)}`)
    drain()

    // ---- contract-typed list reads and URL controllers -----------------------------------
    const pageExports: string[] = []
    const pageNames: string[] = []
    const listHooks: string[] = []
    const listParamTypes = new Map<string, { name: string; required: boolean }>()
    const listPaths = [...(list && listAnswer ? [base] : []), ...(extraLists.get(base) ?? [])]
    const pathExpression = (path: string): string => {
      const text = toColon(path).replace(
        /:([A-Za-z_]\w*)/g,
        (_m, key: string) => `\${encodeURIComponent(${camel(key)})}`,
      )
      return text.includes('${') ? `\`${text}\`` : `'${text}'`
    }
    for (const path of listPaths) {
      const shape = listShape(answer(find('get', path))?.schema)
      if (!shape) continue
      const suffix = path === base ? '' : pascal(path.slice(base.length + 1).replace(/\//g, '-'))
      const pageType = `${pascal(name)}${suffix}Page`
      const pageName = `${exportName}${suffix}${shape.extra ? 'Page' : 'List'}`
      const schema = resolve(answer(find('get', path))!.schema).value as Json
      if (shape.extra)
        declarations.set(pageType, `export interface ${pageType} ${objectType(schema, 0)}`)
      const resultType = shape.extra ? pageType : `${typeName}[]`
      const pageReader =
        !shape.extra && shape.key
          ? `(response) => (response.data as { ${propertyKey(shape.key)}: ${resultType} })${access(shape.key)}`
          : `(response) => response.data as ${resultType}`
      // Operation parameters override path-level parameters, including referenced declarations.
      const item = resolve((document.paths as Json)[path]).value
      const parameters = new Map<string, Json>()
      for (const parameter of [
        ...(isObject(item) && Array.isArray(item.parameters) ? item.parameters : []),
        ...(Array.isArray(find('get', path)?.operation.parameters)
          ? (find('get', path)!.operation.parameters as unknown[])
          : []),
      ]) {
        const value = resolve(parameter).value
        if (isObject(value) && value.in === 'query' && typeof value.name === 'string')
          parameters.set(value.name, value)
      }
      const paramsType = `${pascal(name)}${suffix}ListParams`
      declarations.set(
        paramsType,
        parameters.size === 0
          ? `export type ${paramsType} = Record<string, never>`
          : `export type ${paramsType} = { ${[...parameters]
              .map(
                ([key, parameter]) =>
                  `${propertyKey(key)}${parameter.required ? '' : '?'}: ${typeOf(parameter.schema)}`,
              )
              .join('; ')} }`,
      )
      drain()
      pageNames.push(pageName)
      const resourceCall = parentParams.length
        ? `${exportName}(${camel(parentParams[0])})`
        : exportName
      const required = [...parameters.values()].some((parameter) => parameter.required === true)
      listParamTypes.set(path, { name: paramsType, required })
      pageExports.push(
        `/** \`GET ${path}\` whole, as the API answers it: the rows and what it sends beside them. */\n` +
          `export const ${pageName} = (${[...parentParams.map((key) => `${camel(key)}: string`), 'viewer: string', `params: ${paramsType}${required ? '' : ' = {}'}`].join(', ')}): QueryOptions<${resultType}> =>\n` +
          `  ${resourceCall}.listPage(viewer, { ...params }, ${pageReader}, ${pathExpression(path)})`,
      )
      // Only a declared limit/offset contract is paged this way. Cursor/page-number APIs and
      // non-list screens retain their own valid contract instead of receiving guessed params.
      const numeric = (key: string): Json | null => {
        const value = resolve(parameters.get(key)?.schema).value
        return isObject(value) && ['integer', 'number'].includes(String(value.type)) ? value : null
      }
      if (listRoute && numeric('limit') && numeric('offset')) {
        const filters = [...parameters]
          .filter(([key, parameter]) => {
            const value = resolve(parameter.schema).value
            return (
              key !== 'limit' &&
              key !== 'offset' &&
              !parameter.required &&
              isObject(value) &&
              value.type === 'string' &&
              !value.enum &&
              !value.nullable
            )
          })
          .map(([key]) => key)
        const managed = ['limit', 'offset', ...filters]
        const remainingRequired = [...parameters].some(
          ([key, value]) => !managed.includes(key) && value.required,
        )
        const hookName = `use${pascal(name)}${suffix}List`
        const defaultLimit = numeric('limit')!.default
        const limit =
          Number.isSafeInteger(defaultLimit) && Number(defaultLimit) > 0
            ? Number(defaultLimit)
            : null
        const filterType = filters.map((key) => JSON.stringify(key)).join(' | ') || 'never'
        listHooks.push(
          `/** URL paging and filters, one cached read, and refetch; writes use ${resourceCall}. */\n` +
            `export function ${hookName}<Selection extends string = string>(${[...parentParams.map((key) => `${camel(key)}: string`), 'viewer: string | null', `params: Omit<${paramsType}, ${managed.map((key) => JSON.stringify(key)).join(' | ')}>${remainingRequired ? '' : ' = {}'}`, `options: ${listRoute.optionsType}<${filterType}, Selection> = {}`].join(', ')}) {\n` +
            `  const route = ${listRoute.hook}({ ...options,${limit ? ` pageSize: options.pageSize ?? ${limit},` : ''} filters: { ${filters.map((key) => `${propertyKey(key)}: {}`).join(', ')}${filters.length ? ', ' : ''}...options.filters } })\n` +
            `  const query = ${listRoute.queryHook}(viewer !== null && route.canLoad ? ${pageName}(${[...parentParams.map(camel), 'viewer', `{ ...params, ${filters.map((key) => `${propertyKey(key)}: route.filters[${JSON.stringify(key)}], `).join('')}limit: route.pageSize, offset: route.offset }`].join(', ')}) : null)\n` +
            `  return { route, ...query }\n}`,
        )
      }
    }

    // ---- the resource ----------------------------------------------------------------------
    const generics = [
      typeName,
      ...(createType || updateType ? [createType ?? `Partial<${typeName}>`] : []),
      ...(updateType ? [updateType] : []),
    ].join(', ')
    const readList = listAnswer
      ? listAnswer.key
        ? `(response) => (response.data as { ${propertyKey(listAnswer.key)}: ${typeName}[] })${access(listAnswer.key)}`
        : `(response) => response.data as ${typeName}[]`
      : null
    const readOne = one
      ? one.key
        ? `(response) => (response.data as { ${propertyKey(one.key)}: ${typeName} | null })${access(one.key)}`
        : `(response) => response.data as ${typeName} | null`
      : null
    const resourceFor = (path: string, resourceName: string): string => {
      const ownList = listShape(answer(find('get', path))?.schema)
      const ownReader = ownList
        ? ownList.key
          ? `(response) => (response.data as { ${propertyKey(ownList.key)}: ${typeName}[] })${access(ownList.key)}`
          : `(response) => response.data as ${typeName}[]`
        : readList
      return (
        `${factory.factory}<${generics}>({\n` +
        `  name: ${resourceName},\n  path: ${pathExpression(path)},` +
        (param === 'id' || recordIsScalar ? '' : `\n  id: '${param}',`) +
        (update?.method === 'patch' ? `\n  updateMethod: 'patch',` : '') +
        `\n  http: ${factory.http.client},` +
        (ownReader ? `\n  readList: ${ownReader},` : '') +
        (readOne ? `\n  readOne: ${readOne},` : '') +
        `\n})`
      )
    }
    const exported: string[] = []
    // A resource factory offers every operation; the contract may not. Keep unavailable
    // methods out of the generated public type rather than teaching a page a nonexistent route.
    const resourceType = (path: string): string => {
      const methods =
        path === base
          ? [
              ...(listPaths.length ? ['listPage'] : []),
              ...(detail ? ['detail'] : []),
              ...(create ? ['create'] : []),
              ...(update ? ['update'] : []),
              ...(remove ? ['remove'] : []),
              ...(toggles.length ? ['toggle'] : []),
              'refresh',
            ]
          : ['listPage', 'refresh']
      const params = listParamTypes.get(path)
      return (
        `Pick<QueryResource<${generics}>, ${methods.map((method) => JSON.stringify(method)).join(' | ')}>` +
        (params
          ? ` & { list(viewer: string, params${params.required ? '' : '?'}: ${params.name}): QueryOptions<${typeName}[]> }`
          : '')
      )
    }
    const describe = (path: string, exportedName: string, resourceName: string): void => {
      if (parentParams.length === 0) {
        exported.push(
          `export const ${exportedName}: ${resourceType(path)} = ${resourceFor(path, `'${resourceName}'`)}`,
        )
        return
      }
      const key = camel(parentParams[0])
      exported.push(
        `const ${exportedName}By = new Map<string, ${resourceType(path)}>()\n` +
          `/** The ${resourceName} of one ${singular(segmentsOf(base).at(-3) ?? 'record')}: the same object for the same ${key}, so its lists stay tracked. */\n` +
          `export const ${exportedName} = (${key}: string): ${resourceType(path)} => {\n` +
          `  let resource = ${exportedName}By.get(${key})\n` +
          `  if (!resource) {\n    resource = ${resourceFor(path, `\`${resourceName}:\${${key}}\``)}\n    ${exportedName}By.set(${key}, resource)\n  }\n  return resource\n}`,
      )
    }
    describe(base, exportName, name)
    const extraNames: string[] = []
    for (const path of extraLists.get(base) ?? []) {
      const extraName = `${exportName}${pascal(path.slice(base.length + 1).replace(/\//g, '-'))}`
      extraNames.push(extraName)
      describe(path, extraName, `${name}-${path.slice(base.length + 1).replace(/\//g, '-')}`)
    }

    const covered = [
      ...(list && listAnswer ? [`list (GET ${base})`] : []),
      ...(detail ? [`detail (GET ${item})`] : []),
      ...(create ? [`create (POST ${base})`] : []),
      ...(update ? [`update (${update.method.toUpperCase()} ${item})`] : []),
      ...(remove ? [`remove (DELETE ${item})`] : []),
      ...toggles.map((action) => `toggle ${action} (POST/DELETE ${item}/${action})`),
      ...(extraLists.get(base) ?? []).map((path) => `list (GET ${path})`),
    ]
    const call = parentParams.length ? `${exportName}(${camel(parentParams[0])})` : exportName
    const typeImports = [
      ...(pageExports.length ? [{ name: 'QueryOptions', from: '@molecule/app-query' }] : []),
      { name: 'QueryResource', from: factoryPackage },
    ]
    const moduleOf = (line: string): string => /from '([^']+)'/.exec(line)?.[1] ?? ''
    const importLines = [
      ...typeImports
        .filter((entry) => entry.from !== factoryPackage)
        .map((entry) => `import type { ${entry.name} } from '${entry.from}'`),
      `import { ${factory.http.client} } from '${factory.http.package}'`,
      `import { ${factory.factory}${listHooks.length ? `, ${listRoute!.queryHook}` : ''}${typeImports.some((entry) => entry.from === factoryPackage) ? ', type QueryResource' : ''} } from '${factoryPackage}'`,
      ...(listHooks.length
        ? [
            `import { ${listRoute!.hook}, type ${listRoute!.optionsType} } from '${listRoute!.package}'`,
          ]
        : []),
    ].sort((a, b) => moduleOf(a).localeCompare(moduleOf(b)))
    const source = `/**
 * ${pascal(name)} on the app's shared query cache, as ${label} declares them.
 *
 * Generated by mlcl from the API contract. It is this app's code: edit it freely. mlcl writes it
 * again only while it is unchanged (\`mlcl resources --contract ${label}\` after the contract changes).
 *
 * Covers: ${covered.join(', ')}.
 * Read with \`useQuery(${call}.${list && listAnswer ? 'list(viewer, params)' : `detail(viewer, ${camel(param)})`})\`${detail && list && listAnswer ? ` and \`useQuery(${call}.detail(viewer, ${camel(param)}))\`` : ''}.${
   pageNames.length
     ? `\n * \`${pageNames.join('`, `')}\` return${pageNames.length === 1 ? 's' : ''} the whole list answer (rows and totals) for a pager.`
     : ''
 }${
   create || update || remove || toggles.length
     ? `\n * Write with ${[
         create ? 'create' : '',
         update ? 'update' : '',
         remove ? 'remove' : '',
         toggles.length ? 'toggle' : '',
       ]
         .filter(Boolean)
         .map((operation) => `\`${call}.${operation}\``)
         .join(
           ', ',
         )}: each write shows the server's record in the cache and fetches the lists on screen again.`
     : ''
 }
 * \`viewer\` is the signed-in user's id, or 'anonymous'.
${listHooks.length ? ` * List pages use \`${listHooks.map((source) => /export function (\w+)/.exec(source)![1]).join('`, `')}\`: URL state, limit/offset and query/refetch are already wired.\n * Pass null as viewer while restoring auth; route options configure paths, filters and protected selections.\n` : ''}
 */
${importLines.join('\n')}

${[...declarations.entries()]
  .filter(([, text]) => text)
  .map(([, text]) => text)
  .join('\n\n')}

${exported.join('\n\n')}
${pageExports.length ? `\n${pageExports.join('\n\n')}\n` : ''}
${listHooks.join('\n\n')}`
    plan.modules.push({
      collection: base,
      path: [workspace, factory.directory, `${name}.ts`].filter(Boolean).join('/'),
      exportName,
      typeName,
      operations: covered,
      source,
    })
    void extraNames
  }

  // Everything the contract serves that no module covers, said once per path.
  const coveredPaths = new Set<string>()
  for (const module of plan.modules) {
    coveredPaths.add(module.collection)
    for (const path of paths) if (path.startsWith(`${module.collection}/`)) coveredPaths.add(path)
  }
  for (const path of paths)
    if (!coveredPaths.has(path) && !plan.skipped.some((skip) => skip.path === path))
      plan.skipped.push({
        path,
        reason: 'not a collection (a single record or an action); call the HTTP client for it',
      })
  return plan
}

/** What {@link writeContractResourceModules} did. */
export interface ContractModulesResult {
  /** Modules written or rewritten by this call. */
  written: ContractResourceModule[]
  /** Project-relative files removed because their collection left the contract. */
  removed: string[]
  /** Files left as they are because someone edited them, with the module the contract now calls for. */
  kept: string[]
  /** Contract paths with no module. */
  skipped: SkippedContractPath[]
  /** Why nothing was generated, when nothing could be. */
  reason?: string
}

const sha = (text: string): string => createHash('sha256').update(text).digest('hex')

/**
 * Generate (or regenerate) the app's resource modules from a contract file.
 *
 * @param projectRoot - The project root.
 * @param contractPath - The contract file, relative to the project root or absolute.
 * @param registry - The registry whose metadata names the resource factory.
 * @param declared - The project's declared packages with their workspaces.
 * @returns What was written, removed, kept and skipped.
 */
export async function writeContractResourceModules(
  projectRoot: string,
  contractPath: string,
  registry: Registry,
  declared: readonly DeclaredPackage[],
): Promise<ContractModulesResult> {
  const result: ContractModulesResult = { written: [], removed: [], kept: [], skipped: [] }
  const declaration = declared.find((item) => {
    const factory = registry.packages[item.name]?.decisionGuide?.resourceModules
    return (
      factory !== undefined &&
      declared.some(
        (other) => other.name === factory.http.package && other.workspace === item.workspace,
      )
    )
  })
  if (!declaration)
    return {
      ...result,
      reason: 'no app workspace declares a resource factory with its HTTP package',
    }
  const factory = registry.packages[declaration.name]!.decisionGuide!.resourceModules!
  if (!(await factoryIsDeclared(projectRoot, registry, declared)))
    return {
      ...result,
      reason: 'the declared resource factory version does not support generated modules',
    }
  const absolute = contractPath.startsWith('/') ? contractPath : join(projectRoot, contractPath)
  let text: string
  try {
    text = await readFile(absolute, 'utf8')
  } catch (_error) {
    // No contract file is the ordinary case for a project without one: nothing to generate.
    return { ...result, reason: `no contract file at ${contractPath}` }
  }
  let contract: unknown
  try {
    contract = parseContract(text)
  } catch (error) {
    return {
      ...result,
      reason: `the contract could not be parsed: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
  const label = absolute.startsWith(`${projectRoot}/`)
    ? absolute.slice(projectRoot.length + 1)
    : contractPath
  const plan = planContractResourceModules(
    contract,
    factory,
    declaration.name,
    declaration.workspace,
    label,
    factory.listRoute &&
      declared.some(
        (item) =>
          item.name === factory.listRoute!.package && item.workspace === declaration.workspace,
      )
      ? factory.listRoute
      : undefined,
  )
  result.skipped = plan.skipped
  const directory = join(projectRoot, declaration.workspace, factory.directory)
  const manifestPath = join(directory, '.contract-modules.json')
  let manifest: { contract: string; files: Record<string, string> } = { contract: '', files: {} }
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as typeof manifest
  } catch (_error) {
    // First generation for this project: nothing was written before.
  }
  // What the scaffold wrote for the declared resource packages, to tell an untouched one apart.
  const scaffolded = new Map<string, string>()
  for (const module of planAppResourceModules(registry, declared)) {
    const target = join(projectRoot, module.path)
    scaffolded.set(module.path, await formatGeneratedSource(module.source, target))
  }
  const files: Record<string, string> = {}
  for (const module of plan.modules) {
    const target = join(projectRoot, module.path)
    const formatted = await formatGeneratedSource(module.source, target)
    let current: string | null = null
    try {
      current = await readFile(target, 'utf8')
    } catch (_error) {
      // Not there yet: written below.
    }
    const ours = current !== null && manifest.files[module.path] === sha(current)
    const untouchedScaffold = current !== null && scaffolded.get(module.path) === current
    if (current !== null && !ours && !untouchedScaffold) {
      result.kept.push(module.path)
      continue
    }
    files[module.path] = sha(formatted)
    if (current === formatted) continue
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, formatted, 'utf8')
    result.written.push(module)
  }
  for (const [path, hash] of Object.entries(manifest.files)) {
    if (path in files || plan.modules.some((module) => module.path === path)) continue
    const target = join(projectRoot, path)
    if (!existsSync(target)) continue
    if (sha(await readFile(target, 'utf8')) === hash) {
      await rm(target)
      result.removed.push(path)
    } else result.kept.push(path)
  }
  if (plan.modules.length > 0 || Object.keys(manifest.files).length > 0) {
    await mkdir(directory, { recursive: true })
    await writeFile(
      manifestPath,
      `${JSON.stringify({ contract: sha(text), files }, null, 2)}\n`,
      'utf8',
    )
  }
  return result
}
