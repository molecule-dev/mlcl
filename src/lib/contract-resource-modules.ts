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
  declaresAtLeast,
  factoryIsDeclared,
  planAppResourceModules,
  type ResourceModuleFactory,
} from './app-resource-modules.js'
import type { DeclaredPackage } from './capability-map.js'
import { resourceErrorMessage, resourceErrorPaths } from './contract-resource-errors.js'
import { formatGeneratedSource, sortImportStatements } from './format.js'
import { type ResourceHook, resourceHooks, resourceWrites } from './resource-module-facade.js'
import { resourceRecordView } from './resource-record-view.js'
import { RESOURCE_AUTH_PACKAGE, resourceViewer, scopedResources } from './resource-viewer.js'
import type { Registry } from './schema.js'

type Json = Record<string, unknown>

/** One module the contract calls for. */
export interface ContractResourceModule {
  /** The collection's path in the contract, e.g. `/articles/{slug}/comments`. */
  collection: string
  /** Project-relative path of the module, e.g. `app/src/resources/comments.ts`. */
  path: string
  /** The resource name, e.g. `comments`. */
  exportName: string
  /** The exported record type, e.g. `Comment`. */
  typeName: string
  /** The contract operations the module covers, e.g. `list`, `create`, `toggle favorite`. */
  operations: string[]
  /** The module's source, unformatted. */
  source: string
  /** Native view source, when the framework needs a separate component file. */
  view?: { path: string; source: string }
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

/** Association comes from a unique required boolean with the action's name in the schema. */
function toggleFieldNames(action: string): Set<string> {
  const name = action.replace(/[-_]/g, '')
  const stem = name.replace(/e$/, '')
  const doubled = /[aeiou][^aeiou]$/.test(name) ? name + name.at(-1) : name
  return new Set(
    [name, `${stem}ed`, `${stem}ing`, `${doubled}ed`, `${doubled}ing`].flatMap((word) => [
      word,
      `is${word}`,
      `has${word}`,
    ]),
  )
}

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
 * @param pageSupport - Which page APIs the workspace's declared versions support.
 * @returns The modules, in collection order, and the paths that got none.
 */
export function planContractResourceModules(
  contract: unknown,
  factory: ResourceModuleFactory,
  factoryPackage: string,
  workspace: string,
  label: string,
  listRoute?: ResourceModuleFactory['listRoute'],
  pageSupport: { view: boolean; toggle: boolean; auth?: boolean } = { view: true, toggle: true },
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

  const responseSchema = (node: unknown): unknown => {
    const response = resolve(node).value
    const content = isObject(response) && isObject(response.content) ? response.content : null
    const media = content
      ? (content['application/json'] ??
        Object.entries(content).find(([type]) => /json/.test(type))?.[1])
      : null
    return isObject(media) ? media.schema : undefined
  }

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
    const schema = responseSchema(responses[status])
    if (schema === undefined) return null
    const resolved = resolve(schema)
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
    const parentArgs = parentParams.map((key) => {
      const name = camel(key)
      return [
        'id',
        'viewer',
        'params',
        'options',
        'record',
        'children',
        'pending',
        'missing',
        'error',
        'query',
        'recordKey',
        'resource',
      ].includes(name)
        ? `parent${pascal(key)}`
        : name
    })
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
    const fields = (schema: unknown): Json => {
      const value = resolve(schema).value
      return isObject(value) && isObject(value.properties) ? value.properties : {}
    }
    const recordFields = fields(recordSource)
    const idField = [param, 'id'].find((key) => {
      const schema = resolve(recordFields[key]).value
      return isObject(schema) && ['string', 'integer', 'number'].includes(String(schema.type))
    })
    const requiredBoolean = (schema: unknown, key: string): boolean => {
      const value = resolve(schema).value
      const property = resolve(fields(value)[key]).value
      return (
        isObject(value) &&
        Array.isArray(value.required) &&
        value.required.includes(key) &&
        isObject(property) &&
        property.nullable !== true &&
        (property.type === 'boolean' || typeof property.const === 'boolean')
      )
    }
    const toggleFlag = (action: string): string | undefined => {
      const names = toggleFieldNames(action)
      const answers = ['post', 'delete'].map((method) => {
        const response = answer(find(method, `${item}/${action}`))
        return response && oneShape(response.schema, response.name)?.record
      })
      const candidates = Object.keys(recordFields).filter(
        (key) =>
          names.has(key.replace(/[-_]/g, '').toLowerCase()) &&
          requiredBoolean(recordSource, key) &&
          answers.every((schema) => requiredBoolean(schema, key)),
      )
      return candidates.length === 1 ? candidates[0] : undefined
    }
    const typeName = pascal((recordResolved.name ?? singular(name)).replace(/[^A-Za-z0-9]+/g, '-'))
    const rowResolved = resolve(listAnswer?.items)
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
    const listHooks: string[] = []
    const listHookNames: string[] = []
    const namedReads: ResourceHook[] = []
    const listPaths = [...(list && listAnswer ? [base] : []), ...(extraLists.get(base) ?? [])]
    const pathExpression = (path: string): string => {
      const text = toColon(path).replace(
        /:([A-Za-z_]\w*)/g,
        (_m, key: string) =>
          `\${encodeURIComponent(${parentArgs[parentParams.indexOf(key)] ?? camel(key)})}`,
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
      const pageValue =
        !shape.extra && shape.key
          ? `(response.data as { ${propertyKey(shape.key)}: ${resultType} })${access(shape.key)}`
          : `response.data as ${resultType}`
      const pageReader = `(response) => ${pageValue}`
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
      const pageWithViewer = `${pageName}ForViewer`
      const resourceCall = `${exportName}(${['viewer', ...parentArgs].join(', ')})`
      const required = [...parameters.values()].some((parameter) => parameter.required === true)
      const hookName = `use${pascal(name)}${suffix}${pascal(name) === typeName && !suffix ? 'Collection' : ''}`
      namedReads.push({
        name: hookName,
        args: [
          ...parentArgs.map((name) => ({ name, type: 'string | null' })),
          { name: 'params', type: `${paramsType} | null`, ...(required ? {} : { default: '{}' }) },
        ],
        result: resultType,
        read: `${[...parentArgs.map((name) => `${name}Value === null`), 'viewerValue === null', 'paramsValue === null'].join(' || ')} ? null : ${pageWithViewer}(${['viewerValue', ...parentArgs.map((name) => `${name}Value`), 'paramsValue'].join(', ')})`,
      })
      const pageArgs = [...parentArgs.map((name) => `${name}: string`), `params: ${paramsType}`]
      pageExports.push(
        `function ${pageWithViewer}(${['viewer: string', ...pageArgs].join(', ')}): QueryOptions<${resultType}> {\n` +
          `  return ${resourceCall}.listPage(viewer, { ...params }, ${pageReader}, ${pathExpression(path)})\n}\n\n` +
          `/** Query options for warming \`GET ${path}\` for the active session. */\n` +
          `export function ${pageName}(${pageArgs.join(', ')}${required ? '' : ' = {}'}): QueryOptions<${resultType}> | null {\n` +
          `  const viewer = getResourceViewer()\n` +
          `  return viewer === null ? null : ${pageWithViewer}(${['viewer', ...parentArgs, 'params'].join(', ')})\n}`,
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
        listHookNames.push(hookName)
        const defaultLimit = numeric('limit')!.default
        const limit =
          Number.isSafeInteger(defaultLimit) && Number(defaultLimit) > 0
            ? Number(defaultLimit)
            : null
        const filterType = filters.map((key) => JSON.stringify(key)).join(' | ') || 'never'
        const routeCall = `${listRoute.hook}({ ...options,${limit ? ` pageSize: options.pageSize ?? ${limit},` : ''} filters: { ${filters.map((key) => `${propertyKey(key)}: {}`).join(', ')}${filters.length ? ', ' : ''}...options.filters } })`
        const routeArgs = (list: string): string =>
          [
            'viewer',
            ...parentArgs,
            `{ ...params, ${filters.map((key) => `${propertyKey(key)}: ${list}.filters[${JSON.stringify(key)}], `).join('')}limit: ${list}.pageSize, offset: ${list}.offset }`,
          ].join(', ')
        const sourceType = listRoute.sourceType
        const omitted = managed.map((key) => JSON.stringify(key)).join(' | ')
        // The scaffold's lint asks every exported function for its return type: name it from the
        // two hooks it composes, so the hook stays right when either package's result changes.
        const routeResult = `ReturnType<typeof ${listRoute.hook}<${filterType}, Selection>>`
        if (sourceType) {
          // A binding whose hooks run once (a setup function, not a render) reads each argument
          // reactively: every argument is the package's source type, and its list query reads
          // their current values, so a changed viewer, parent id or params value moves the query.
          const inputs = [...parentArgs, 'viewer', 'params'].join(', ')
          listHooks.push(
            `/** URL paging and filters, one cached read, and refetch; writes use ${resourceCall}. */\n` +
              `export function ${hookName}<Selection extends string = string>(${[...parentArgs.map((name) => `${name}: ${sourceType}<string>`), `params: ${sourceType}<Omit<${paramsType}, ${omitted}>>${remainingRequired ? '' : ' = {}'}`, `options: ${listRoute.optionsType}<${filterType}, Selection> = {}`].join(', ')}): { route: ${routeResult}; query: ReturnType<typeof ${listRoute.queryHook}<${resultType}, { ${[...parentArgs.map((name) => `${name}: string; `), 'viewer: string | null; '].join('')}params: Omit<${paramsType}, ${omitted}> }, ${filterType}>> } {\n` +
              `  const viewer = useResourceViewer()\n` +
              `  const route = ${routeCall}\n` +
              `  const query = ${listRoute.queryHook}(route, { ${inputs} }, ({ ${inputs} }, list) => ${pageWithViewer}(${routeArgs('list')}))\n` +
              `  return { route, query }\n}`,
          )
        } else
          listHooks.push(
            `/** URL paging and filters, one cached read, and refetch; writes use ${resourceCall}. */\n` +
              `export function ${hookName}<Selection extends string = string>(${[...parentArgs.map((name) => `${name}: string`), `params: Omit<${paramsType}, ${omitted}>${remainingRequired ? '' : ' = {}'}`, `options: ${listRoute.optionsType}<${filterType}, Selection> = {}`].join(', ')}): { route: ${routeResult} } & ReturnType<typeof ${listRoute.queryHook}<${resultType}>> {\n` +
              `  const viewer = useResourceViewer()\n` +
              `  const route = ${routeCall}\n` +
              `  const query = ${listRoute.queryHook}(viewer !== null && route.canLoad ? ${pageWithViewer}(${routeArgs('route')}) : null)\n` +
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
    const recordValue = one?.key
      ? `(response.data as { ${propertyKey(one.key)}: ${typeName} | null })${access(one.key)}`
      : `response.data as ${typeName} | null`
    const readOne = one ? `(response) => ${recordValue}` : null
    const resourceFor = (path: string, resourceName: string): string => {
      return (
        `${factory.factory}<${generics}>({\n` +
        `  name: ${resourceName},\n  path: ${pathExpression(path)},` +
        (!idField || idField === 'id' ? '' : `\n  id: ${JSON.stringify(idField)},`) +
        (update?.method === 'patch' ? `\n  updateMethod: 'patch',` : '') +
        `\n  http: ${session.http},` +
        (readList ? `\n  readList: ${readList},` : '') +
        (readOne ? `\n  readOne: ${readOne},` : '') +
        `\n})`
      )
    }
    const resources: string[] = []
    const describe = (path: string, exportedName: string, resourceName: string): void => {
      const [parent] = parentArgs
      resources.push(
        `const ${exportedName} = scopeResource((${[pageSupport.auth ? 'viewer' : '_viewer', ...parentArgs.map((name) => `${name}: string`)].join(', ')}) =>\n` +
          `  ${resourceFor(path, parent ? `\`${resourceName}:\${${parent}}\`` : JSON.stringify(resourceName))},\n)`,
      )
    }

    const detailRead: ResourceHook | undefined = detail
      ? {
          name: `use${typeName}`,
          args: [
            ...parentArgs.map((name) => ({ name, type: 'string | null' })),
            { name: 'id', type: 'string | number | null | undefined' },
          ],
          result: `${typeName} | null`,
          read: `${[...parentArgs.map((name) => `${name}Value === null`), 'viewerValue === null'].join(' || ')} ? null : ${exportName}(${['viewerValue', ...parentArgs.map((name) => `${name}Value`)].join(', ')}).detail(viewerValue, idValue == null ? null : String(idValue))`,
        }
      : undefined
    if (detailRead) namedReads.push(detailRead)
    // An alternate path ending in /list can otherwise take the URL controller's name.
    const hookNames = new Set(listHookNames)
    for (const read of namedReads) {
      while (hookNames.has(read.name)) read.name += 'Query'
      hookNames.add(read.name)
    }
    const hooks = resourceHooks(factory, namedReads)
    const page = factory.recordPage
    const recordView =
      pageSupport.view && page && factory.queryHook && detailRead
        ? resourceRecordView(page.framework, factoryPackage, name, typeName, detailRead)
        : undefined
    const optimistic =
      pageSupport.toggle && page && factory.queryHook && toggles.length
        ? page.optimisticValue
        : undefined
    const toggleActions = toggles.map((action) => ({
      action,
      ...(optimistic ? { field: toggleFlag(action) } : {}),
    }))
    const namedWrites = resourceWrites({
      resource: exportName,
      type: typeName,
      parents: parentArgs,
      create: !!create,
      ...(createType ? { createType } : {}),
      update: !!update,
      ...(updateType ? { updateType } : {}),
      remove: !!remove,
      toggles: toggleActions,
      ...(optimistic && page && factory.queryHook
        ? {
            toggleBinding: {
              observer: factory.queryHook,
              framework: page.framework,
              idField,
              usedNames: hookNames,
            },
          }
        : {}),
    })
    const session = resourceViewer(
      factory,
      pageSupport.auth ?? false,
      !!(hooks.source || listHooks.length || optimistic),
      !!recordView?.file,
      !!(create || update || remove || toggles.length),
    )
    describe(base, exportName, name)

    const covered = [
      ...(list && listAnswer ? [`list (GET ${base})`] : []),
      ...(detail ? [`detail (GET ${item})`] : []),
      ...(create ? [`create (POST ${base})`] : []),
      ...(update ? [`update (${update.method.toUpperCase()} ${item})`] : []),
      ...(remove ? [`remove (DELETE ${item})`] : []),
      ...toggles.map((action) => `toggle ${action} (POST/DELETE ${item}/${action})`),
      ...(extraLists.get(base) ?? []).map((path) => `list (GET ${path})`),
    ]
    const errorName = `${typeName.charAt(0).toLowerCase()}${typeName.slice(1)}ErrorMessage`
    const errorSchemas = operations
      .filter(({ path }) =>
        [base, item, ...listPaths, ...toggles.map((action) => `${item}/${action}`)].includes(path),
      )
      .flatMap(({ operation }) =>
        isObject(operation.responses)
          ? Object.entries(operation.responses)
              .filter(([code]) => /^(?:[45][\dX]{2}|default)$/i.test(code))
              .map(([, response]) => responseSchema(response))
          : [],
      )
    const errors = resourceErrorMessage(
      errorName,
      resourceErrorPaths(errorSchemas, (node) => resolve(node).value),
    )
    // One import per module, its names in the order the scaffold's `simple-import-sort` lint
    // keeps (by name, `type` ignored): a module of only types is an `import type`.
    const values = new Map<string, string[]>([
      [factory.http.package, [factory.http.client, 'HttpError']],
      [
        factoryPackage,
        [
          ...new Set([
            factory.factory,
            ...hooks.values,
            ...(listHooks.length ? [listRoute!.queryHook] : []),
          ]),
        ],
      ],
      ...(listHooks.length ? [[listRoute!.package, [listRoute!.hook]] as [string, string[]]] : []),
      ...(hooks.storePackage
        ? [[hooks.storePackage, ['derived', 'readable']] as [string, string[]]]
        : []),
      ...(hooks.wrap ? [[hooks.wrap.package, [hooks.wrap.name]] as [string, string[]]] : []),
    ])
    const types = new Map<string, string[]>()
    const valueImport = (from: string, name: string): void => {
      values.set(from, [...new Set([...(values.get(from) ?? []), name])])
    }
    const typeImport = (from: string, name: string): void => {
      types.set(from, [...(types.get(from) ?? []), name])
    }
    for (const [from, names] of session.imports)
      for (const name of names)
        if (name.startsWith('type ')) typeImport(from, name.slice(5))
        else valueImport(from, name)
    if (optimistic) valueImport(optimistic.package, 'useOptimisticValue')
    if (optimistic && page?.framework === 'vue') valueImport('vue', 'computed')
    if (optimistic && hooks.storePackage) valueImport(hooks.storePackage, 'get')
    if (recordView?.source) {
      valueImport(factoryPackage, 'QueryContent')
      typeImport(factoryPackage, 'QueryContentProps')
    }
    if (recordView?.imports) {
      const [from, names] = recordView.imports
      for (const name of names) {
        if (name.startsWith('type ')) typeImport(from, name.slice(5))
        else valueImport(from, name)
      }
    }
    if (pageExports.length) typeImport('@molecule/app-query', 'QueryOptions')
    if (hooks.storePackage) typeImport(hooks.storePackage, 'Readable')
    if (listHooks.length) {
      typeImport(listRoute!.optionsPackage ?? listRoute!.package, listRoute!.optionsType)
      if (listRoute!.sourceType) typeImport(factoryPackage, listRoute!.sourceType)
    }
    const byName = (a: string, b: string): number =>
      a
        .replace(/^type /, '')
        .toLowerCase()
        .localeCompare(b.replace(/^type /, '').toLowerCase())
    const importLines = [...new Set([...values.keys(), ...types.keys()])]
      .sort((a, b) => a.localeCompare(b))
      .map((from) => {
        const typeNames = types.get(from) ?? []
        if (!values.has(from))
          return `import type { ${typeNames.sort(byName).join(', ')} } from '${from}'`
        const names = [...values.get(from)!, ...typeNames.map((typeName) => `type ${typeName}`)]
        return `import { ${names.sort(byName).join(', ')} } from '${from}'`
      })
    const viewDoc = recordView ? ` * ${recordView.doc}\n` : ''
    const toggleDoc = namedWrites.toggleDocs.length
      ? ` * ${namedWrites.toggleDocs.join('\n * ')}\n * Keep each toggle control mounted and enabled while saving. Pending is for feedback, and clicks queue.\n`
      : ''
    const createDoc = createType
      ? ` * Create with \`create${typeName}(${[...parentArgs, 'input'].join(', ')})\`. Pass the complete \`${createType}\` body declared below.\n`
      : ''
    const source = `/**
 * ${pascal(name)} on the app's shared query cache, as ${label} declares them.
 *
 * Generated by mlcl from the API contract. This module is the supported client for these routes.
 * Regenerate with \`mlcl resources --contract ${label}\` after the contract changes.
 *
 * Covers: ${covered.join(', ')}.
${viewDoc}${toggleDoc}${hooks.source ? ` * Page reads: ${namedReads.map((hook) => `\`${hook.name}(${hook.args.map((arg) => arg.name).join(', ')})\``).join(', ')}.\n * The hooks expose data, status, error and refetch(). Lists return the whole response, including totals.\n` : ''}${namedWrites.names.length ? ` * Named writes: ${namedWrites.names.map((name) => `\`${name}\``).join(', ')}.\n * Their typed input is the API's complete request body, including any envelope, sent unchanged.\n${createDoc}` : ''}${listHooks.length ? ` * List pages use ${listHookNames.map((name) => `\`${name}\``).join(', ')} for URL paging and filters.\n` : ''} *
 * ${pageSupport.auth ? 'Reads and writes use the current auth session automatically. Reads pause until auth settles.' : 'Reads and writes share the public cache.'}
 * A successful write publishes the saved detail or deletion and refetches up to four recently read lists for this resource and session.
 * Writes reject with the HTTP error, and query failures appear in error. Show \`${errorName}(error)\` for the contract's validation message or a generic fallback.
 */
${importLines.join('\n')}

${[...declarations.entries()]
  .filter(([, text]) => text)
  .map(([, text]) => text)
  .join('\n\n')}

${session.source}

${scopedResources}

${resources.join('\n\n')}
${pageExports.length ? `\n${pageExports.join('\n\n')}\n` : ''}
${hooks.source}

${recordView?.source ?? ''}

${namedWrites.source}

${errors}

${listHooks.join('\n\n')}`
    plan.modules.push({
      collection: base,
      path: [workspace, factory.directory, `${name}.ts`].filter(Boolean).join('/'),
      exportName,
      typeName,
      operations: covered,
      source: sortImportStatements(source),
      ...(recordView?.file
        ? {
            view: {
              path: [workspace, factory.directory, recordView.file.name].filter(Boolean).join('/'),
              source: recordView.file.source,
            },
          }
        : {}),
    })
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

/** Additional APIs the generated module may import from this workspace's declared packages. */
async function declaredPageApis(
  projectRoot: string,
  factory: ResourceModuleFactory,
  declaration: DeclaredPackage,
  declared: readonly DeclaredPackage[],
): Promise<{
  listRoute?: ResourceModuleFactory['listRoute']
  view: boolean
  toggle: boolean
  auth: boolean
}> {
  let manifest: Record<string, Record<string, string> | undefined> = {}
  try {
    manifest = JSON.parse(
      await readFile(join(projectRoot, declaration.workspace, 'package.json'), 'utf8'),
    ) as typeof manifest
  } catch (_error) {
    // factoryIsDeclared read this manifest a moment ago; unreadable now proves no version.
  }
  const beside = (name: string): boolean =>
    declared.some((item) => item.name === name && item.workspace === declaration.workspace)
  const version = (name: string): string | undefined =>
    manifest.dependencies?.[name] ?? manifest.devDependencies?.[name]
  const { listRoute, recordPage } = factory
  return {
    listRoute:
      listRoute &&
      beside(listRoute.package) &&
      (!listRoute.since || declaresAtLeast(version(declaration.name), listRoute.since))
        ? listRoute
        : undefined,
    view: !!recordPage && declaresAtLeast(version(declaration.name), recordPage.viewSince),
    auth: beside(RESOURCE_AUTH_PACKAGE),
    toggle:
      !!recordPage &&
      beside(recordPage.optimisticValue.package) &&
      declaresAtLeast(
        version(recordPage.optimisticValue.package),
        recordPage.optimisticValue.since,
      ),
  }
}

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
  const apis = await declaredPageApis(projectRoot, factory, declaration, declared)
  const plan = planContractResourceModules(
    contract,
    factory,
    declaration.name,
    declaration.workspace,
    label,
    apis.listRoute,
    apis,
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
  const planned = new Set(
    plan.modules.flatMap((module) =>
      module.view ? [module.path, module.view.path] : [module.path],
    ),
  )
  const save = async (file: {
    path: string
    source: string
  }): Promise<'written' | 'kept' | 'same'> => {
    const target = join(projectRoot, file.path)
    const formatted = await formatGeneratedSource(file.source, target).catch((error: unknown) => {
      // Existing Svelte projects can generate the component without configuring a formatter.
      if (
        target.endsWith('.svelte') &&
        error instanceof Error &&
        error.name === 'UndefinedParserError'
      )
        return file.source
      throw error
    })
    const current = await readFile(target, 'utf8').catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null
      throw error
    })
    const ours = current !== null && manifest.files[file.path] === sha(current)
    const untouchedScaffold = current !== null && scaffolded.get(file.path) === current
    if (current !== null && !ours && !untouchedScaffold) {
      result.kept.push(file.path)
      return 'kept'
    }
    files[file.path] = sha(formatted)
    if (current === formatted) return 'same'
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, formatted, 'utf8')
    return 'written'
  }
  for (const module of plan.modules) {
    const primary = await save(module)
    if (primary === 'kept') {
      if (module.view && manifest.files[module.view.path])
        files[module.view.path] = manifest.files[module.view.path]
      continue
    }
    const view = module.view ? await save(module.view) : 'same'
    if (primary === 'written' || view === 'written') result.written.push(module)
  }
  for (const [path, hash] of Object.entries(manifest.files)) {
    if (path in files || planned.has(path)) continue
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
