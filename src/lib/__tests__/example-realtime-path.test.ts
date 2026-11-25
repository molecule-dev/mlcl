/**
 * An example slice's SSE client must open the path its SSE bond serves.
 *
 * The SSE provider streams ONE path (`createProvider({ path })`, `/sse` when the
 * option is left out) and reads rooms from `?room=`. A client `EventSource` on any
 * other path gets the API's 404 or the SPA, and the page never receives a frame:
 * the in-app notifications bond created its provider without a `path` while its
 * bell opened `/api/realtime?room=user:<id>`, so live notifications never arrived.
 *
 * @module
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const EXAMPLES = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../templates/.agents/skills/examples',
)

/** The path `@molecule/api-realtime-sse` serves when `createProvider` gets none. */
const SSE_DEFAULT_PATH = '/sse'

/** JavaScript and TypeScript source files under the example directory. */
function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...sourceFiles(file))
    else if (/\.(?:[cm]?[jt]s|[jt]sx)$/.test(entry.name)) out.push(file)
  }
  return out
}

/** Find real calls in example code, ignoring comments and string contents. */
function expressions<T>(source: ts.SourceFile, extract: (node: ts.Node) => T | undefined): T[] {
  const found: T[] = []
  function visit(node: ts.Node): void {
    const result = extract(node)
    if (result !== undefined) found.push(result)
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

/** Read the final top-level path. A spread or computed key can override a preceding path. */
function providerPath(options: ts.Expression | undefined): string | null {
  if (!options) return SSE_DEFAULT_PATH
  if (!ts.isObjectLiteralExpression(options)) return null
  let path: string | null = SSE_DEFAULT_PATH
  for (const property of options.properties) {
    const name = property.name
    if (!name) {
      path = null
      continue
    }
    const key = ts.isComputedPropertyName(name) ? name.expression : name
    if (!ts.isIdentifier(key) && !ts.isStringLiteralLike(key) && !ts.isNumericLiteral(key)) {
      path = null
    } else if (ts.isComputedPropertyName(name) && ts.isIdentifier(key)) {
      path = null
    } else if (key.text === 'path') {
      path =
        ts.isPropertyAssignment(property) && ts.isStringLiteralLike(property.initializer)
          ? property.initializer.text
          : null
    }
  }
  return path
}

/** The path each `createProvider(...)` call from the SSE bond serves. */
function ssePathsServed(source: string): (string | null)[] {
  const file = ts.createSourceFile('bond.ts', source, ts.ScriptTarget.Latest)
  const factories = new Set<string>()
  const namespaces = new Set<string>()
  for (const node of file.statements) {
    if (
      !ts.isImportDeclaration(node) ||
      !ts.isStringLiteral(node.moduleSpecifier) ||
      node.moduleSpecifier.text !== '@molecule/api-realtime-sse'
    )
      continue
    const bindings = node.importClause?.namedBindings
    if (!bindings || node.importClause?.isTypeOnly) continue
    if (ts.isNamespaceImport(bindings)) namespaces.add(bindings.name.text)
    else {
      for (const { isTypeOnly, name, propertyName } of bindings.elements) {
        if (!isTypeOnly && (propertyName ?? name).text === 'createProvider')
          factories.add(name.text)
      }
    }
  }
  if (!factories.size && !namespaces.size) return []
  return expressions(file, (node) => {
    if (!ts.isCallExpression(node)) return
    const caller = node.expression
    const factory = ts.isIdentifier(caller) && factories.has(caller.text)
    const namespaced =
      ts.isPropertyAccessExpression(caller) &&
      caller.name.text === 'createProvider' &&
      ts.isIdentifier(caller.expression) &&
      namespaces.has(caller.expression.text)
    if (factory || namespaced) return providerPath(node.arguments[0])
  })
}

/** The path each EventSource opens, or null if the URL depends on runtime values. */
function eventSourcePaths(source: string): (string | null)[] {
  const file = ts.createSourceFile('app.tsx', source, ts.ScriptTarget.Latest)
  return expressions(file, (node) => {
    if (!ts.isNewExpression(node)) return
    const caller = node.expression
    const bare = ts.isIdentifier(caller) && caller.text === 'EventSource'
    const qualified =
      ts.isPropertyAccessExpression(caller) &&
      caller.name.text === 'EventSource' &&
      ts.isIdentifier(caller.expression) &&
      ['window', 'globalThis', 'self'].includes(caller.expression.text)
    if (!bare && !qualified) return
    const url = node.arguments?.[0]
    if (!url) return null
    const text = ts.isStringLiteralLike(url)
      ? url.text
      : ts.isTemplateExpression(url) && /[?#]/.test(url.head.text)
        ? url.head.text
        : null
    if (!text || !/^(?:\/|https?:\/\/)/i.test(text)) return null
    const origin = 'https://example.test'
    return URL.canParse(text, origin) ? new URL(text, origin).pathname : null
  })
}

interface SseSlice {
  slice: string
  served: (string | null)[]
  clients: (string | null)[]
}

/** Slices whose api/ code bonds the SSE provider. */
function sseSlices(): SseSlice[] {
  const slices: SseSlice[] = []
  for (const category of readdirSync(EXAMPLES)) {
    const categoryDir = join(EXAMPLES, category)
    if (!statSync(categoryDir).isDirectory()) continue
    for (const name of readdirSync(categoryDir)) {
      const dir = join(categoryDir, name)
      if (!statSync(dir).isDirectory()) continue
      const read = (sub: string): string[] => {
        const half = join(dir, sub)
        if (!statSync(half, { throwIfNoEntry: false })) return []
        return sourceFiles(half).map((file) => readFileSync(file, 'utf8'))
      }
      const served = read('api').flatMap(ssePathsServed)
      if (served.length === 0) continue
      slices.push({
        slice: relative(EXAMPLES, dir),
        served,
        clients: read('app').flatMap(eventSourcePaths),
      })
    }
  }
  return slices
}

describe('example SSE clients open the path their bond serves', () => {
  it('reads the served path, the default and the client path', () => {
    const bond = `import { createProvider } from '@molecule/api-realtime-sse'\n`
    expect(ssePathsServed(`${bond}createProvider({ deferAttach: true })`)).toEqual(['/sse'])
    expect(
      ssePathsServed(`${bond}createProvider({ deferAttach: true, path: '/api/realtime' })`),
    ).toEqual(['/api/realtime'])
    expect(ssePathsServed(`createProvider({ deferAttach: true })`)).toEqual([])
    expect(
      ssePathsServed(
        `${bond}/** \`createProvider({ deferAttach: true })\` waits. */\n// createProvider({})\n` +
          `createProvider({ deferAttach: true, path: '/api/realtime' }) // http://x`,
      ),
    ).toEqual(['/api/realtime'])
    expect(
      eventSourcePaths('new EventSource(\n  `/api/realtime?room=${encodeURIComponent(room)}`,\n)'),
    ).toEqual(['/api/realtime'])
  })

  it('finds aliased factories and ignores other factories and nested option names', () => {
    const source = [
      'import { createProvider as createSse } from "@molecule/api-realtime-sse"',
      'import { createProvider } from "@molecule/another-provider"',
      "createProvider({ path: '/irrelevant' })",
      "createSse({ nested: { path: '/unused' } })",
      "createSse({ before: fn(), path: '/api/live' })",
    ].join('\n')
    expect(ssePathsServed(source)).toEqual(['/sse', '/api/live'])
  })

  it('does not mistake an unknown provider path for the default', () => {
    const source = [
      "import { createProvider } from '@molecule/api-realtime-sse'",
      "createProvider({ path: '/api/live', ...options })",
      'createProvider({ path: configuredPath })',
    ].join('\n')
    expect(ssePathsServed(source)).toEqual([null, null])
  })

  it('reports dynamic client paths without counting comments or strings as calls', () => {
    const source = [
      "// new EventSource('/comment')",
      `const code = "new EventSource('/string')"`,
      "new window.EventSource('/api/live?room=one')",
      'new EventSource(url)',
      'new EventSource(`/api/${stream}?room=one`)',
    ].join('\n')
    expect(eventSourcePaths(source)).toEqual(['/api/live', null, null])
  })

  const slices = sseSlices()

  it('finds the SSE slices', () => {
    expect(slices.map(({ slice }) => slice).sort()).toEqual([
      'messaging/in-app-chat',
      'notifications/in-app-notifications',
    ])
  })

  it.each(slices)('$slice', ({ served, clients }) => {
    const [path] = served
    expect(path, 'SSE provider path must be statically visible').not.toBeNull()
    expect(new Set(served), 'the slice must serve one unambiguous SSE path').toEqual(
      new Set([path]),
    )
    expect(clients.length).toBeGreaterThan(0)
    for (const client of clients) expect(client, 'EventSource must open the bond path').toBe(path)
  })
})
