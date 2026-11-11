import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  planAppResourceModule,
  planAppResourceModules,
  resourceCollection,
  tableColumns,
} from '../app-resource-modules.js'
import { GENERATED_ROUTER_MARKER } from '../injector.js'
import { getRawRegistry } from '../registry.js'
import { ensureAgentsMd } from '../scaffold.js'
import type { RegistryEntry } from '../schema.js'

const registry = getRawRegistry()
const QUERY = '@molecule/app-query-react'
const HTTP = '@molecule/app-http'
const ARTICLE = '@molecule/api-resource-article'
const PROJECT = '@molecule/api-resource-project'
const COMMENT = '@molecule/api-resource-comment'
const MOLECULE = join(import.meta.dirname, '..', '..', '..', '..', 'molecule', 'packages', 'app')
let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'app-resource-modules-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

/** A project as `mlcl create` leaves it before its last step: two workspaces and a router. */
async function project(api: string[], app: string[]): Promise<void> {
  const manifest = (names: string[]): string =>
    JSON.stringify({ dependencies: Object.fromEntries(names.map((name) => [name, '1.0.0'])) })
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
    expect(articles).toContain("import { createQueryResource } from '@molecule/app-query-react'")
    expect(articles).toContain(
      "import { getClient, unwrapList, unwrapSingle } from '@molecule/app-http'",
    )
    expect(articles).toContain('export interface Article {')
    expect(articles).toContain('  slug: string')
    expect(articles).toContain("  id: 'slug',")
    expect(articles).toContain("path: '/articles',")
    expect(articles).toContain('`articles.toggle`')

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
    expect(router.startsWith(GENERATED_ROUTER_MARKER)).toBe(true)

    const app = await read('app/src/App.tsx')
    expect(app).toContain('Resource module, already written')
    expect(app).toContain('app/src/resources/articles.ts')
    expect(app.endsWith('export const App = () => <main>Desk</main>\n')).toBe(true)
    const agents = await read('AGENTS.md')
    expect(agents).toContain('`app/src/resources/projects.ts`')
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
    ['the app has no HTTP package beside the factory', [ARTICLE], [QUERY]],
    ['the app does not declare the factory package', [ARTICLE], [HTTP]],
    ['the project declares no resource', ['@molecule/api-logger'], [QUERY, HTTP]],
    ['every declared resource is nested under another record', [COMMENT], [QUERY, HTTP]],
  ])('writes nothing when %s', async (_name, api, app) => {
    await project(api, app)
    const router = await read('api/src/App/router.ts')
    await ensureAgentsMd(root)
    expect(existsSync(join(root, 'app/src/resources'))).toBe(false)
    expect(await read('api/src/App/router.ts')).toBe(router)
  })
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

  it('types the record from the table, nullable where the column is', () => {
    expect(
      tableColumns(Object.values(invoices.setupSql as Record<string, string>), 'invoices'),
    ).toEqual([
      { name: 'id', type: 'string' },
      { name: 'number', type: 'string' },
      { name: 'totalCents', type: 'number' },
      { name: 'flagged', type: 'boolean' },
      { name: 'paidAt', type: 'string | null' },
      { name: 'metadata', type: 'unknown' },
    ])
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
    expect(module?.source).toContain('export interface Invoice {\n  id: string\n  number: string\n')
    expect(module?.source).toContain("updateMethod: 'patch',")
  })

  it('falls back to an open record when the resource declares no table', () => {
    const module = planAppResourceModule(
      '@molecule/api-resource-invoice',
      { ...invoices, setupSql: undefined } as RegistryEntry,
      factory,
      QUERY,
      'app',
    )
    expect(module?.source).toContain(
      'export interface Invoice {\n  id: string\n  [field: string]: unknown\n}',
    )
  })
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
