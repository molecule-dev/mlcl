/**
 * App resource modules generated from the contract the app serves (`contract-resource-modules.ts`).
 *
 * X1 P317: all 8 projects shipped modules typed from the resource PACKAGES' own responses, and no
 * run imported one — the request pinned a different API (a supplied OpenAPI file), so each run
 * wrote its own data file for it. The first fixture is that supplied contract, unedited.
 */
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { planAppResourceModules } from '../app-resource-modules.js'
import {
  parseContract,
  planContractResourceModules,
  writeContractResourceModules,
} from '../contract-resource-modules.js'
import { formatGeneratedSource } from '../format.js'
import { getRawRegistry } from '../registry.js'

const registry = getRawRegistry()
const QUERY = '@molecule/app-query-react'
const HTTP = '@molecule/app-http'
const factory = registry.packages[QUERY].decisionGuide!.resourceModules!
const MOLECULE = join(import.meta.dirname, '..', '..', '..', '..', 'molecule', 'packages', 'app')
const fixture = (name: string): Promise<string> =>
  readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const plan = async (name: string): Promise<ReturnType<typeof planContractResourceModules>> =>
  planContractResourceModules(
    parseContract(await fixture(name)),
    factory,
    QUERY,
    'app',
    'specs/openapi.yml',
  )

/** The packages a P317 project declared: its API's resource packages and the app's query cache. */
const P317_DECLARED = [
  ...['article', 'comment', 'device', 'follow', 'reaction', 'tag', 'user'].map((name) => ({
    name: `@molecule/api-resource-${name}`,
    workspace: 'api',
  })),
  { name: QUERY, workspace: 'app' },
  { name: HTTP, workspace: 'app' },
]

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'contract-modules-'))
  await mkdir(join(root, 'app/src'), { recursive: true })
  await mkdir(join(root, 'api'), { recursive: true })
  await mkdir(join(root, 'specs'), { recursive: true })
  const manifest = (names: string[]): string =>
    JSON.stringify({
      dependencies: Object.fromEntries(
        names.map((name) => [name, name === QUERY ? factory.since : '1.0.0']),
      ),
    })
  await writeFile(join(root, 'app/package.json'), manifest([QUERY, HTTP, '@molecule/app-query']))
  await writeFile(
    join(root, 'api/package.json'),
    manifest(P317_DECLARED.filter((item) => item.workspace === 'api').map((item) => item.name)),
  )
})
afterEach(() => rm(root, { recursive: true, force: true }))
const read = (path: string): Promise<string> => readFile(join(root, path), 'utf8')

describe('the contract a P317 project was handed', () => {
  it('yields one module per collection the contract has, with the operations it declares', async () => {
    const { modules, skipped } = await plan('p317-supplied-openapi.yml.txt')
    expect(modules.map((module) => [module.path, module.exportName, module.typeName])).toEqual([
      ['app/src/resources/articles.ts', 'articles', 'Article'],
      ['app/src/resources/comments.ts', 'comments', 'Comment'],
      ['app/src/resources/profiles.ts', 'profiles', 'Profile'],
      ['app/src/resources/tags.ts', 'tags', 'Tag'],
    ])
    expect(modules[0].operations).toEqual([
      'list (GET /articles)',
      'detail (GET /articles/{slug})',
      'create (POST /articles)',
      'update (PUT /articles/{slug})',
      'remove (DELETE /articles/{slug})',
      'toggle favorite (POST/DELETE /articles/{slug}/favorite)',
      'list (GET /articles/feed)',
    ])
    expect(modules[2].operations).toEqual([
      'detail (GET /profiles/{username})',
      'toggle follow (POST/DELETE /profiles/{username}/follow)',
    ])
    // Sign-in and the current account are single records, not collections: said, not guessed at.
    expect(skipped.map((skip) => skip.path).sort()).toEqual(['/user', '/users', '/users/login'])
  })

  it('opens the contract’s envelopes and types the record from its responses', async () => {
    const { modules } = await plan('p317-supplied-openapi.yml.txt')
    const articles = modules[0].source
    expect(articles).toContain("path: '/articles'")
    expect(articles).toContain("id: 'slug'")
    expect(articles).toContain(
      'readList: (response) => (response.data as { articles: Article[] }).articles',
    )
    expect(articles).toContain(
      'readOne: (response) => (response.data as { article: Article | null }).article',
    )
    // The list's rows carry no `body`, the detail does: optional on the one shared record.
    expect(articles).toMatch(/export interface Article \{[^}]*body\?: string/)
    expect(articles).toMatch(/export interface Article \{[^}]*tagList: string\[\]/)
    expect(articles).toContain('author: Profile')
    // The request bodies as the contract wraps them.
    expect(articles).toContain('export type ArticleCreate = { article: NewArticle }')
    expect(articles).toContain('createQueryResource<Article, ArticleCreate, ArticleUpdate>')
    // The list answer carries a count beside the rows: its own typed query, for a pager.
    expect(articles).toContain('export const articlesPage = (')
    expect(articles).toMatch(/export interface ArticlesPage \{[^]*articlesCount: number/)
    expect(articles).toContain("path: '/articles/feed'")
  })

  it('makes a nested collection a function of its parent, one resource per parent', async () => {
    const comments = (await plan('p317-supplied-openapi.yml.txt')).modules[1].source
    expect(comments).toContain(
      'export const comments = (slug: string): Pick<QueryResource<Comment, CommentCreate>',
    )
    expect(comments).toContain('path: `/articles/${encodeURIComponent(slug)}/comments`')
    expect(comments).toContain('(response.data as { comments: Comment[] }).comments')
    expect(comments).toMatch(/export interface Comment \{[^}]*id: number/)
  })

  it('is what the package-derived generator could not write', () => {
    // The old generator, on the same project: modules for the PACKAGES' own collections, typed
    // and enveloped as the packages answer. No comments or profiles (the contract's are nested
    // or have no list), a device module the contract never mentions, no `{ articles,
    // articlesCount }`.
    const old = planAppResourceModules(registry, P317_DECLARED)
    expect(old.map((module) => module.path)).toEqual([
      'app/src/resources/articles.ts',
      'app/src/resources/devices.ts',
      'app/src/resources/tags.ts',
    ])
    expect(old[0].source).not.toContain('articlesCount')
    expect(old[0].source).not.toContain('{ articles: Article[] }')
    expect(old[0].source).not.toContain('author: Profile')
  })
})

describe('an inventory API with its own contract', () => {
  it('reads a bare array, a PATCH update, a toggle and a list with a total', async () => {
    const { modules, skipped } = await plan('inventory-openapi.json.txt')
    expect(modules.map((module) => module.path)).toEqual([
      'app/src/resources/items.ts',
      'app/src/resources/stock-counts.ts',
    ])
    const items = modules[0].source
    expect(items).toContain('readList: (response) => response.data as Item[]')
    expect(items).toContain('readOne: (response) => response.data as Item | null')
    expect(items).toContain("id: 'sku'")
    expect(items).toContain("updateMethod: 'patch'")
    expect(items).toContain(`status: "in-stock" | "reserved" | "discontinued"`)
    expect(items).toContain('location?: string | null')
    expect(modules[0].operations).toContain('toggle reserved (POST/DELETE /items/{sku}/reserved)')
    const counts = modules[1]
    expect(counts.exportName).toBe('stockCounts')
    expect(counts.source).toContain('export const stockCountsPage = (')
    expect(counts.source).toContain('total: number')
    expect(skipped).toEqual([expect.objectContaining({ path: '/health' })])
  })
})

describe('every generated module type-checks', () => {
  const declarations = {
    [HTTP]: join(MOLECULE, 'core/http/dist/index.d.ts'),
    // Compile the current contract, without rewriting a linked installation's dist during a cohort.
    [QUERY]: join(MOLECULE, 'features/query-react/src/index.ts'),
    '@molecule/app-query': join(MOLECULE, 'core/query/dist/index.d.ts'),
  }
  const built =
    Object.values(declarations).every((file) => existsSync(file)) &&
    existsSync(join(MOLECULE, 'features/query-react/dist/resource.d.ts'))

  it.runIf(built)('against the real package declarations, with a page that uses them', async () => {
    const dir = join(root, 'compile')
    await mkdir(dir, { recursive: true })
    const files: string[] = []
    for (const name of ['p317-supplied-openapi.yml.txt', 'inventory-openapi.json.txt'])
      for (const module of (await plan(name)).modules) {
        const file = join(dir, `${module.exportName}.ts`)
        await writeFile(file, module.source)
        files.push(file)
      }
    // A consumer: the calls a page makes, typed end to end.
    const page = join(dir, 'page.ts')
    await writeFile(
      page,
      `import { articles, articlesFeed, articlesPage } from './articles.js'
import { comments } from './comments.js'
import { items } from './items.js'
import { profiles } from './profiles.js'
import { tags } from './tags.js'
export async function use(viewer: string, slug: string): Promise<string[]> {
  const page = await articlesPage(viewer, { limit: 10 }).fetch(new AbortController().signal)
  // @ts-expect-error This contract declares limit/offset, not page.
  articlesPage(viewer, { page: 2 })
  // @ts-expect-error The resource's row-only list has the same query contract.
  articles.list(viewer, { page: 2 })
  // @ts-expect-error The alternate feed is read-only.
  articlesFeed.create(viewer, {})
  // @ts-expect-error This contract has no profile collection list.
  profiles.list(viewer)
  // @ts-expect-error This tags endpoint declares no query parameters.
  tags.list(viewer, { limit: 1 })
  const total: number = page.articlesCount
  const created = await articles.create(viewer, { article: { title: 't', description: 'd', body: 'b' } })
  const favorited = await articles.toggle(viewer, created.slug, 'favorite', true)
  const comment = await comments(slug).create(viewer, { comment: { body: 'hi' } })
  const profile = await profiles.toggle(viewer, favorited.author.username, 'follow', true)
  const item = await items.update(viewer, 'sku-1', { sku: 'sku-1', name: 'Bolt' })
  const names: string[] = (await tags.list(viewer).fetch(new AbortController().signal)) ?? []
  return [String(total), String(comment.id), profile.username, item.status, ...names]
}
`,
    )
    files.push(page)
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
  })
})

describe('writing the modules into a project', () => {
  const generate = (
    contract = 'specs/openapi.yml',
  ): ReturnType<typeof writeContractResourceModules> =>
    writeContractResourceModules(root, contract, registry, P317_DECLARED)

  it('does not generate methods missing from the declared factory version', async () => {
    await writeFile(join(root, 'specs/openapi.yml'), await fixture('p317-supplied-openapi.yml.txt'))
    await writeFile(
      join(root, 'app/package.json'),
      JSON.stringify({ dependencies: { [QUERY]: '1.2.0', [HTTP]: '1.0.0' } }),
    )
    const result = await generate()
    expect(result.written).toEqual([])
    expect(result.reason).toContain('version')
  })

  it('wires the URL list hook only when the matching router is declared', async () => {
    await writeFile(join(root, 'specs/openapi.yml'), await fixture('p317-supplied-openapi.yml.txt'))
    const without = await generate()
    expect(without.written[0].source).not.toContain('export function useArticlesList')
    const withRouter = await writeContractResourceModules(root, 'specs/openapi.yml', registry, [
      ...P317_DECLARED,
      { name: factory.listRoute!.package, workspace: 'app' },
    ])
    expect(withRouter.written[0].source).toContain('export function useArticlesList')
    expect(withRouter.written[0].source).toContain('limit: route.pageSize, offset: route.offset')
  })

  it('writes each module formatted, and nothing a second time', async () => {
    await writeFile(join(root, 'specs/openapi.yml'), await fixture('p317-supplied-openapi.yml.txt'))
    const first = await generate()
    expect(first.written.map((module) => module.path)).toEqual([
      'app/src/resources/articles.ts',
      'app/src/resources/comments.ts',
      'app/src/resources/profiles.ts',
      'app/src/resources/tags.ts',
    ])
    const articles = await read('app/src/resources/articles.ts')
    expect(articles).toBe(
      await formatGeneratedSource(articles, join(root, 'app/src/resources/articles.ts')),
    )
    expect(articles).toContain('as specs/openapi.yml declares them')
    expect((await generate()).written).toEqual([])
  })

  it('replaces the scaffold’s package-derived module while it is untouched', async () => {
    const [scaffolded] = planAppResourceModules(registry, P317_DECLARED)
    const target = join(root, scaffolded.path)
    await mkdir(join(root, 'app/src/resources'), { recursive: true })
    await writeFile(target, await formatGeneratedSource(scaffolded.source, target))
    await writeFile(join(root, 'specs/openapi.yml'), await fixture('p317-supplied-openapi.yml.txt'))
    const result = await generate()
    expect(result.kept).toEqual([])
    expect(await read('app/src/resources/articles.ts')).toContain('{ articles: Article[] }')
  })

  it('follows the contract: rewrites what it wrote, removes what left, keeps what was edited', async () => {
    const contract = parseContract(await fixture('p317-supplied-openapi.yml.txt')) as {
      paths: Record<string, unknown>
    }
    await writeFile(join(root, 'specs/openapi.yml'), JSON.stringify(contract))
    await generate()
    // The app edits one module; the contract then drops tags and profiles, and renames a field.
    await writeFile(join(root, 'app/src/resources/profiles.ts'), '// edited by the app\n')
    delete contract.paths['/tags']
    delete contract.paths['/profiles/{username}']
    delete contract.paths['/profiles/{username}/follow']
    const next = JSON.stringify(contract).replaceAll('articlesCount', 'total')
    await writeFile(join(root, 'specs/openapi.yml'), next)
    const result = await generate()
    expect(result.written.map((module) => module.path)).toEqual(['app/src/resources/articles.ts'])
    expect(result.removed).toEqual(['app/src/resources/tags.ts'])
    expect(result.kept).toEqual(['app/src/resources/profiles.ts'])
    expect(existsSync(join(root, 'app/src/resources/tags.ts'))).toBe(false)
    expect(await read('app/src/resources/profiles.ts')).toBe('// edited by the app\n')
    expect(await read('app/src/resources/articles.ts')).toContain('total: number')
  })

  it('leaves an edited module alone even when the contract still has its collection', async () => {
    await writeFile(join(root, 'specs/openapi.yml'), await fixture('inventory-openapi.json.txt'))
    await generate()
    await writeFile(join(root, 'app/src/resources/items.ts'), '// mine now\n')
    const result = await generate()
    expect(result.kept).toEqual(['app/src/resources/items.ts'])
    expect(await read('app/src/resources/items.ts')).toBe('// mine now\n')
  })

  it('writes nothing for a project with no contract file, and says why', async () => {
    const result = await generate('specs/missing.yml')
    expect(result).toMatchObject({
      written: [],
      removed: [],
      reason: 'no contract file at specs/missing.yml',
    })
    expect(existsSync(join(root, 'app/src/resources'))).toBe(false)
  })

  it('writes nothing where no app workspace declares the query cache', async () => {
    await writeFile(join(root, 'specs/openapi.yml'), await fixture('inventory-openapi.json.txt'))
    const result = await writeContractResourceModules(root, 'specs/openapi.yml', registry, [
      { name: HTTP, workspace: 'app' },
    ])
    expect(result.reason).toContain('no app workspace declares a resource factory')
    expect(existsSync(join(root, 'app/src/resources'))).toBe(false)
  })
})
