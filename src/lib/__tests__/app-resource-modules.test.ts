import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { Readable } from 'svelte/store'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  planAppResourceModule,
  planAppResourceModules,
  resourceCollection,
  resourceRecordName,
} from '../app-resource-modules.js'
import { GENERATED_ROUTER_MARKER } from '../injector.js'
import { getRawRegistry } from '../registry.js'
import { scanResponseRecord } from '../response-record.js'
import { ensureAgentsMd } from '../scaffold.js'
import type { RegistryEntry } from '../schema.js'

const registry = getRawRegistry()
const QUERY = '@molecule/app-query-react'
const HTTP = '@molecule/app-http'
const ARTICLE = '@molecule/api-resource-article'
const PROJECT = '@molecule/api-resource-project'
const COMMENT = '@molecule/api-resource-comment'
const MOLECULE = join(import.meta.dirname, '..', '..', '..', '..', 'molecule', 'packages', 'app')
const SINCE = registry.packages[QUERY].decisionGuide!.resourceModules!.since
let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'app-resource-modules-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

/** A project as `mlcl create` leaves it before its last step: two workspaces and a router. */
async function project(api: string[], app: string[], queryVersion = SINCE): Promise<void> {
  const manifest = (names: string[]): string =>
    JSON.stringify({
      dependencies: Object.fromEntries(
        names.map((name) => [name, name === QUERY ? queryVersion : '1.0.0']),
      ),
    })
  await mkdir(join(root, 'api/src/App'), { recursive: true })
  await mkdir(join(root, 'app/src'), { recursive: true })
  await writeFile(join(root, 'api/package.json'), manifest(api))
  await writeFile(join(root, 'app/package.json'), manifest(app))
  await writeFile(join(root, 'app/src/App.tsx'), 'export const App = () => <main>Desk</main>\n')
  // The generated router's own header, one mount line per resource package (`injector.ts`).
  await writeFile(
    join(root, 'api/src/App/router.ts'),
    [
      GENERATED_ROUTER_MARKER,
      '//',
      '// Mounted here — server.ts mounts this router at /api:',
      ...api
        .filter((name) => registry.packages[name]?.type === 'resource')
        .map((name) => `//   ${name} (${name.split('-').at(-1)}): GET /somewhere`),
      '//',
      'export const router = {}',
      '',
    ].join('\n'),
  )
}
const read = (path: string): Promise<string> => readFile(join(root, path), 'utf8')

describe('app modules for declared API resources, written by the create step', () => {
  it('writes one typed module per plain collection and names it where the builder reads', async () => {
    await project([ARTICLE, PROJECT, COMMENT], [QUERY, HTTP])
    await ensureAgentsMd(root)

    const articles = await read('app/src/resources/articles.ts')
    expect(articles).toContain(
      "import { createQueryResource, useQuery } from '@molecule/app-query-react'",
    )
    expect(articles).toContain(
      "import { getClient, unwrapList, unwrapSingle } from '@molecule/app-http'",
    )
    // The record the API returns, not the stored row: the row's tagList is a JSON string and
    // has neither of the two fields the service adds.
    expect(articles).toContain('export interface Article {')
    expect(articles).toContain('  slug: string')
    expect(articles).toContain('  tagList: string[]')
    expect(articles).toContain('  favoritesCount: number')
    expect(articles).toContain('  favorited: boolean')
    expect(articles).not.toContain('tagList: string\n')
    expect(articles).toContain("  id: 'slug',")
    expect(articles).toContain("path: '/articles',")
    expect(articles).toContain('`articles.toggle`')
    expect(articles).toContain('Await the saved record before showing a completed change')

    // A non-benchmark resource: projects are addressed by id and updated with PATCH.
    const projects = await read('app/src/resources/projects.ts')
    expect(projects).toContain('export const projects = createQueryResource<Project>({')
    expect(projects).toContain("updateMethod: 'patch',")
    expect(projects).not.toContain("  id: '")

    // Comments hang under another record: not a plain collection, so no module.
    expect(existsSync(join(root, 'app/src/resources/comments.ts'))).toBe(false)

    const router = await read('api/src/App/router.ts')
    expect(router).toContain(
      `//   ${ARTICLE} (article): GET /somewhere\n//     app module: app/src/resources/articles.ts (articles: list, detail, create, update, remove, toggle)`,
    )
    expect(router).toContain('//     app module: app/src/resources/projects.ts (projects: ')
    expect(router).toContain(`${GENERATED_ROUTER_MARKER}\n`)

    const app = await read('app/src/App.tsx')
    expect(app).toContain('Resource module, already written')
    expect(app).toContain('app/src/resources/articles.ts')
    expect(app.endsWith('export const App = () => <main>Desk</main>\n')).toBe(true)
    const agents = await read('AGENTS.md')
    expect(agents).toContain('`app/src/resources/projects.ts`')
    expect(agents).toContain('`useProjects`, `useProject`, `createProject`, `updateProject`')
    expect(app).toContain('useProjects, useProject, createProject, updateProject')
  })

  it('never rewrites a module the app already has, and is stable on a second run', async () => {
    await project([ARTICLE, PROJECT], [QUERY, HTTP])
    await mkdir(join(root, 'app/src/resources'), { recursive: true })
    const mine = "export const articles = 'this app serves articles its own way'\n"
    await writeFile(join(root, 'app/src/resources/articles.ts'), mine)
    await ensureAgentsMd(root)
    expect(await read('app/src/resources/articles.ts')).toBe(mine)
    expect(existsSync(join(root, 'app/src/resources/projects.ts'))).toBe(true)
    // The app's own module was not written by this run, so the router does not claim it.
    expect(await read('api/src/App/router.ts')).not.toContain('resources/articles.ts')

    await writeFile(join(root, 'app/src/resources/projects.ts'), '// customised\n')
    const router = await read('api/src/App/router.ts')
    await ensureAgentsMd(root)
    expect(await read('app/src/resources/projects.ts')).toBe('// customised\n')
    expect(await read('app/src/resources/articles.ts')).toBe(mine)
    expect(await read('api/src/App/router.ts')).toBe(router)
  })

  it.each([
    ['1.1.6', false],
    ['^1.1.99', false],
    [SINCE, true],
    ['2.0.0', true],
    ['workspace:*', true],
  ])('follows the declared factory version %s (written: %s)', async (version, expected) => {
    await project([ARTICLE], [QUERY, HTTP], version)
    await ensureAgentsMd(root)
    expect(existsSync(join(root, 'app/src/resources/articles.ts'))).toBe(expected)
  })

  it.each([
    ['the app has no HTTP package beside the factory', [ARTICLE], [QUERY]],
    ['the app does not declare the factory package', [ARTICLE], [HTTP]],
    ['the project declares no resource', ['@molecule/api-logger'], [QUERY, HTTP]],
    ['every declared resource is nested under another record', [COMMENT], [QUERY, HTTP]],
  ])('writes no resource module when %s', async (_name, api, app) => {
    await project(api, app)
    const router = await read('api/src/App/router.ts')
    await ensureAgentsMd(root)
    expect(existsSync(join(root, 'app/src/resources'))).toBe(false)
    // Package recipes may prepend a guide to an otherwise unchanged router.
    expect((await read('api/src/App/router.ts')).endsWith(router)).toBe(true)
  })
})

/** A package's types module: the stored row and the record its service returns differ. */
const INVOICE_TYPES = `
export type InvoiceStatus = 'open' | 'paid'
export interface InvoiceRow {
  id: string
  number: string
  totalCents: number
  tags: string
  status: string
  paidAt: string | null
}
export interface Invoice {
  id: string
  number: string
  /** In the account's currency. */
  total: number
  tags: string[]
  status: InvoiceStatus
  paidAt?: string | null
}
export interface Customer<T> extends Base {
  id: T
}
`

describe('the record a package declares', () => {
  it('reads the returned record, inlines a local union and ignores the row', () => {
    expect(scanResponseRecord(INVOICE_TYPES, ['Invoice'])).toEqual({
      name: 'Invoice',
      fields: [
        { name: 'id', type: 'string', optional: false },
        { name: 'number', type: 'string', optional: false },
        { name: 'total', type: 'number', optional: false },
        { name: 'tags', type: 'string[]', optional: false },
        { name: 'status', type: "'open' | 'paid'", optional: false },
        { name: 'paidAt', type: 'string | null', optional: true },
      ],
    })
  })

  it('types what it cannot see as unknown and declines an interface it cannot read whole', () => {
    const source = `import type { Money } from './money.js'
export interface Line { sku: string; price: Money; next?: Line }
export interface Quote { lines: Line[]; when: Date; meta: Record<string, Money>; pick: Pick<Line, 'sku'> }
${INVOICE_TYPES}`
    expect(scanResponseRecord(source, ['Quote'])?.fields).toEqual([
      { name: 'lines', type: '{ sku: string; price: unknown; next?: unknown }[]', optional: false },
      { name: 'when', type: 'string', optional: false },
      { name: 'meta', type: 'Record<string, unknown>', optional: false },
      { name: 'pick', type: 'unknown', optional: false },
    ])
    expect(scanResponseRecord(source, ['Customer'])).toBeNull()
    expect(scanResponseRecord(source, ['Missing'])).toBeNull()
  })

  // The registry copy is what a production scaffold reads; the package source is the truth.
  const types = (short: string): string =>
    join(MOLECULE, '..', 'api', 'resources', short, 'src', 'types.ts')
  it.runIf(existsSync(types('article')))(
    'matches the package source for every resource the registry holds a record for',
    async () => {
      const held = Object.entries(registry.packages).filter(([, entry]) => entry.responseRecord)
      expect(held.length).toBeGreaterThan(10)
      for (const [name, entry] of held) {
        const source = await readFile(
          join(MOLECULE, '..', '..', entry.path, 'src', 'types.ts'),
          'utf8',
        )
        expect([
          name,
          scanResponseRecord(source, [resourceRecordName(entry.routes ?? [])!]),
        ]).toEqual([name, entry.responseRecord])
      }
      // The article row and the article response differ exactly where the generator used to be wrong.
      const article = registry.packages[ARTICLE].responseRecord!
      expect(article.fields.find((field) => field.name === 'tagList')?.type).toBe('string[]')
      expect(article.fields.map((field) => field.name)).toEqual(
        expect.arrayContaining(['favoritesCount', 'favorited']),
      )
    },
  )
})

describe('an invoices resource described by registry metadata alone', () => {
  const invoices = {
    type: 'resource',
    routes: [
      { method: 'get', path: '/invoices', handler: 'list', middlewares: [] },
      { method: 'post', path: '/invoices', handler: 'create', middlewares: [] },
      { method: 'get', path: '/invoices/:id', handler: 'read', middlewares: [] },
      { method: 'patch', path: '/invoices/:id', handler: 'update', middlewares: [] },
      { method: 'post', path: '/invoices/:id/flag', handler: 'flag', middlewares: [] },
      { method: 'delete', path: '/invoices/:id/flag', handler: 'unflag', middlewares: [] },
      { method: 'post', path: '/invoices/:id/send', handler: 'send', middlewares: [] },
    ],
    setupSql: {
      'src/__setup__/invoices.sql': `CREATE TABLE IF NOT EXISTS "invoices" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "number" VARCHAR(40) NOT NULL UNIQUE,
  "totalCents" INTEGER NOT NULL DEFAULT 0,
  "flagged" BOOLEAN NOT NULL DEFAULT false,
  "paidAt" TIMESTAMPTZ,
  -- Free-form data from the billing provider.
  "metadata" JSONB,
  UNIQUE ("number", "paidAt")
);
CREATE INDEX IF NOT EXISTS "idx_invoices_paid" ON "invoices" ("paidAt");`,
    },
    responseRecord: scanResponseRecord(INVOICE_TYPES, ['Invoice']),
  } as unknown as RegistryEntry
  const factory = registry.packages[QUERY].decisionGuide!.resourceModules!

  it('reads the collection, its writes and its one true toggle from the routes', () => {
    expect(resourceCollection(invoices.routes!)).toEqual({
      base: '/invoices',
      param: 'id',
      create: true,
      update: 'patch',
      remove: false,
      // `send` has no DELETE counterpart: an action, not a flag.
      toggles: ['flag'],
    })
  })

  it('renders the module for a single-package project at its root', () => {
    const module = planAppResourceModule(
      '@molecule/api-resource-invoice',
      invoices,
      factory,
      QUERY,
      '',
    )
    expect(module?.path).toBe('src/resources/invoices.ts')
    expect(module?.operations).toEqual([
      'list',
      'detail',
      'create',
      'update',
      "toggle(viewer, id, 'flag', on)",
    ])
    // A row and a response that differ: the stored row keeps totals in cents and tags as JSON
    // text; the declared record is what the app gets.
    expect(module?.source).toContain(
      "export interface Invoice {\n  id: string\n  number: string\n  total: number\n  tags: string[]\n  status: 'open' | 'paid'\n  paidAt?: string | null\n}",
    )
    expect(module?.source).not.toContain('totalCents')
    expect(module?.source).toContain("updateMethod: 'patch',")
  })

  it.each([
    ['no declared record', undefined],
    [
      'a declared record under another name',
      { name: 'InvoiceRow', fields: [{ name: 'id', type: 'string', optional: false }] },
    ],
  ])('falls back to an open record, never the row, with %s', (_name, responseRecord) => {
    const module = planAppResourceModule(
      '@molecule/api-resource-invoice',
      { ...invoices, responseRecord } as RegistryEntry,
      factory,
      QUERY,
      'app',
    )
    expect(module?.source).toContain(
      'export interface Invoice {\n  id: string\n  [field: string]: unknown\n}',
    )
  })

  it('names no writes in the header of a read-only collection', () => {
    const readOnly = {
      ...invoices,
      routes: invoices.routes!.filter((route) => route.method === 'get'),
    } as RegistryEntry
    const module = planAppResourceModule(
      '@molecule/api-resource-invoice',
      readOnly,
      factory,
      QUERY,
      'app',
    )
    expect(module?.operations).toEqual(['list', 'detail'])
    expect(module?.source).not.toContain('Write with')
    expect(module?.source).not.toContain('each write shows')
    expect(module?.source).toContain(" * `viewer` is the signed-in user's id, or 'anonymous'.")
    expect(module?.source).not.toContain('export function createInvoice')
    expect(module?.source).not.toContain('export function updateInvoice')
    expect(module?.source).toContain('export function useInvoices')
    expect(module?.source).toContain('export function useInvoice')
  })

  it('offers named reads and only declared writes on the same resource instance', () => {
    const source = planAppResourceModule(
      '@molecule/api-resource-invoice',
      invoices,
      factory,
      QUERY,
      'app',
    )!.source
    const emitted = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText
    const calls: unknown[][] = []
    const resource = {
      list: (...args: unknown[]) => {
        calls.push(['list', ...args])
        return 'rows'
      },
      detail: (...args: unknown[]) => {
        calls.push(['detail', ...args])
        return 'record'
      },
      create: (...args: unknown[]) => {
        calls.push(['create', ...args])
        return Promise.resolve('saved')
      },
      update: (...args: unknown[]) => {
        calls.push(['update', ...args])
        return Promise.resolve('saved')
      },
      toggle: (...args: unknown[]) => {
        calls.push(['toggle', ...args])
        return Promise.resolve('saved')
      },
    }
    const exports: Record<string, (...args: unknown[]) => unknown> = {}
    new Function('require', 'exports', emitted)(
      (name: string) =>
        name === QUERY
          ? { createQueryResource: () => resource, useQuery: (query: unknown) => query }
          : {},
      exports,
    )
    expect(exports.useInvoice, 'a page can import its detail hook directly').toBeTypeOf('function')
    expect(exports.useInvoices('u1', { status: 'paid' })).toBe('rows')
    expect(exports.useInvoice('u1', 12)).toBe('record')
    expect(exports.useInvoice(null, '12')).toBeNull()
    expect(exports.useInvoices('u1', null)).toBeNull()
    const input = { number: 'INV-12' }
    exports.createInvoice('u1', input)
    exports.updateInvoice('u1', 12, input)
    exports.setInvoiceFlag('u1', 12, true)
    expect(calls).toEqual([
      ['list', 'u1', { status: 'paid' }],
      ['detail', 'u1', '12'],
      ['create', 'u1', input],
      ['update', 'u1', '12', input],
      ['toggle', 'u1', '12', 'flag', true],
    ])
    expect(exports.deleteInvoice).toBeUndefined()
    expect(exports.setInvoiceSend).toBeUndefined()
  })

  it('keeps custom factory metadata without an observer usable', () => {
    const { queryHook: _queryHook, ...withoutObserver } = factory
    const source = planAppResourceModule(
      '@molecule/api-resource-invoice',
      invoices,
      withoutObserver,
      QUERY,
      'app',
    )!.source
    expect(source).not.toContain('export function useInvoice')
    expect(source).toContain('export function createInvoice')
  })

  it.each(['vue', 'solid', 'svelte', 'angular'])(
    'keeps the current viewer and id reactive in a %s named hook',
    async (framework) => {
      const queryPackage = `@molecule/app-query-${framework}`
      const metadata = registry.packages[queryPackage].decisionGuide!.resourceModules!
      const source = planAppResourceModule(
        '@molecule/api-resource-invoice',
        invoices,
        metadata,
        queryPackage,
        'app',
      )!.source
      const emitted = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
      }).outputText
      const stores = await import('svelte/store')
      const exports: Record<string, (...args: unknown[]) => unknown> = {}
      new Function('require', 'exports', emitted)(
        (name: string) =>
          name === queryPackage
            ? {
                createQueryResource: () => ({
                  detail: (viewer: string, id: string) => [viewer, id],
                }),
                useQuery: (options: unknown) => options,
              }
            : name === 'svelte/store'
              ? stores
              : { computed: (read: () => unknown) => read },
        exports,
      )
      expect(exports.useInvoice, 'the named reactive detail hook is exported').toBeTypeOf(
        'function',
      )
      let viewer: string | null = null
      let id = 'one'
      const viewerStore = stores.writable<string | null>(viewer)
      const idStore = stores.writable(id)
      const query = exports.useInvoice(
        framework === 'svelte' ? viewerStore : () => viewer,
        framework === 'svelte' ? idStore : () => id,
      )
      const read = (): unknown =>
        framework === 'svelte' ? stores.get(query as Readable<unknown>) : (query as () => unknown)()
      expect(read()).toBeNull()
      viewer = 'first'
      viewerStore.set(viewer)
      expect(read()).toEqual(['first', 'one'])
      viewer = 'second'
      id = 'two'
      viewerStore.set(viewer)
      idStore.set(id)
      expect(read()).toEqual(['second', 'two'])
    },
  )
})

describe('every module the registry can produce', () => {
  const declared = [
    { name: QUERY, workspace: 'app' },
    { name: HTTP, workspace: 'app' },
    ...Object.keys(registry.packages)
      .filter((name) => registry.packages[name].type === 'resource')
      .map((name) => ({ name, workspace: 'api' })),
  ]
  const modules = planAppResourceModules(registry, declared)

  it('has a distinct path and export per module', () => {
    expect(modules.length).toBeGreaterThan(10)
    expect(new Set(modules.map((module) => module.path)).size).toBe(modules.length)
    for (const module of modules)
      expect(module.source).toContain(`export const ${module.exportName} =`)
  })

  // The sibling molecule checkout holds the built declarations of the factory. A standalone
  // mlcl clone resolves the published packages instead, which gain the factory at its release.
  const declarations = {
    [HTTP]: join(MOLECULE, 'core/http/dist/index.d.ts'),
    [QUERY]: join(MOLECULE, 'features/query-react/dist/index.d.ts'),
    '@molecule/app-query': join(MOLECULE, 'core/query/dist/index.d.ts'),
  }
  const built =
    Object.values(declarations).every((file) => existsSync(file)) &&
    existsSync(join(MOLECULE, 'features/query-react/dist/resource.d.ts'))

  it.runIf(built)('type-checks every module against the real package declarations', async () => {
    const dir = join(root, 'compile')
    await mkdir(dir, { recursive: true })
    const files = []
    for (const module of modules) {
      const file = join(dir, `${module.exportName}.ts`)
      await writeFile(file, module.source)
      files.push(file)
    }
    const program = ts.createProgram(files, {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      paths: Object.fromEntries(Object.entries(declarations).map(([name, file]) => [name, [file]])),
    })
    const problems = ts
      .getPreEmitDiagnostics(program)
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    expect(problems).toEqual([])
    expect(files.length).toBe(modules.length)
  })
})
