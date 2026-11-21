import { readdirSync, readFileSync } from 'node:fs'
import { URL } from 'node:url'

const database = '@molecule/api-database'
const mutations = new Set(['create', 'updateById', 'updateMany', 'deleteById', 'deleteMany'])

/** Package setup uses unqualified, conditional CREATEs so an app can define its own schema. */
function appTables(directory) {
  let migrations
  try {
    migrations = readdirSync(directory, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return new Set()
    throw error
  }
  const seen = new Set()
  const app = new Set()
  for (const file of migrations
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort()) {
    if (!file.endsWith('.sql')) continue
    const sql = readFileSync(new URL(encodeURIComponent(file), directory), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*--[^\n]*/gm, '')
    for (const [, conditional, schema, quoted, bare] of sql.matchAll(
      /^\s*CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?(?:(public|"public")\s*\.\s*)?(?:"([^"]+)"|(\w+))\s*\(/gim,
    )) {
      const name = quoted ?? bare.toLowerCase()
      if (!seen.has(name) && (!conditional || schema)) app.add(name)
      seen.add(name)
    }
  }
  return app
}

/** Match installed package tables to their public mutation APIs once per workspace config. */
export function resourceTableOwners(resources, dependencies, migrations) {
  const installed = resources.filter((entry) => Object.hasOwn(dependencies, entry.package))
  if (!installed.length) return {}
  const app = appTables(migrations)
  const tables = new Map()
  for (const resource of installed) {
    for (const table of resource.tables) {
      if (app.has(table)) continue
      const services = Object.hasOwn(resource.services, table) ? resource.services[table] : []
      const owners = tables.get(table) ?? { packages: [], services: [] }
      owners.packages.push(`the ${resource.package} service API`)
      if (services.length) owners.services.push(`${resource.package}'s ${services.join(', ')}`)
      tables.set(table, owners)
    }
  }
  return Object.fromEntries(
    [...tables].map(([table, { packages, services }]) => [
      table,
      (services.length ? services : packages).join(' or '),
    ]),
  )
}

function unwrap(node) {
  while (
    node &&
    ['ChainExpression', 'TSAsExpression', 'TSNonNullExpression', 'TSSatisfiesExpression'].includes(
      node.type,
    )
  ) {
    node = node.expression
  }
  return node
}

function variableFor(source, node) {
  if (node.type !== 'Identifier') return undefined
  for (let scope = source.getScope(node); scope; scope = scope.upper) {
    const variable = scope.set.get(node.name)
    if (variable) return variable
  }
}

function constant(variable) {
  const def = variable?.defs.length === 1 ? variable.defs[0] : undefined
  if (def?.type === 'Variable' && def.parent.kind === 'const') return def.node
}

function stringValue(source, expression, seen = new Set()) {
  const node = unwrap(expression)
  if (!node || seen.has(node)) return undefined
  seen.add(node)
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value
  if (node.type === 'TemplateLiteral' && !node.expressions.length)
    return node.quasis[0].value.cooked
  const declaration = constant(variableFor(source, node))
  if (declaration?.id.type === 'Identifier') return stringValue(source, declaration.init, seen)
}

function propertyName(source, node, seen) {
  const key = node.property ?? node.key
  return !node.computed && key.type === 'Identifier' ? key.name : stringValue(source, key, seen)
}

/** Follow imports and local const aliases of the database namespace, accessor and store. */
function databaseMember(source, expression, seen = new Set()) {
  const node = unwrap(expression)
  if (!node || seen.has(node)) return undefined
  seen.add(node)
  if (node.type === 'CallExpression') {
    if (databaseMember(source, node.callee, seen) === 'getStore') return 'store'
    return undefined
  }
  if (node.type === 'MemberExpression') {
    const receiver = databaseMember(source, node.object, seen)
    if (receiver === 'namespace' || receiver === 'store') return propertyName(source, node, seen)
    return undefined
  }
  const binding = variableFor(source, node)
  const def = binding?.defs.length === 1 ? binding.defs[0] : undefined
  if (def?.type === 'ImportBinding' && def.parent.source.value === database) {
    if (def.node.type === 'ImportNamespaceSpecifier') return 'namespace'
    if (def.node.type === 'ImportSpecifier') return def.node.imported.name
  }
  const declaration = constant(binding)
  if (!declaration) return undefined
  if (declaration.id.type === 'Identifier') return databaseMember(source, declaration.init, seen)
  if (declaration.id.type === 'ObjectPattern') {
    const receiver = databaseMember(source, declaration.init, seen)
    if (receiver !== 'namespace' && receiver !== 'store') return undefined
    const member = declaration.id.properties.find(
      (property) => property.type === 'Property' && property.value.name === node.name,
    )
    if (member) return propertyName(source, member, seen)
  }
}

export default {
  meta: {
    type: 'problem',
    schema: [{ type: 'object', additionalProperties: { type: 'string' } }],
    messages: {
      resourceWrite: 'Use {{service}} to write to the package-owned {{table}} table.',
    },
  },
  create(context) {
    const owners = context.options[0]
    if (!owners || Object.keys(owners).length === 0) return {}
    return {
      CallExpression(node) {
        const table = stringValue(context.sourceCode, node.arguments[0])
        if (!table || !Object.hasOwn(owners, table)) return
        if (!mutations.has(databaseMember(context.sourceCode, node.callee))) return
        context.report({
          node,
          messageId: 'resourceWrite',
          data: { table, service: owners[table] },
        })
      },
    }
  },
}
