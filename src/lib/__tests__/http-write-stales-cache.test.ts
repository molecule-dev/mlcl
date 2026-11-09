/**
 * A write through the scaffold's HTTP client makes every cached read stale.
 *
 * xr-molecule-flash-l1818: the editor read an article into the shared query cache, the save
 * removed both of its tags, and the article page then mounted the same key inside the cache's
 * five-minute freshness window — it showed the two tags the save had just removed. The generated
 * `bonds/http-default.ts` now marks the cache stale after any accepted write, so the next page
 * that mounts a read fetches it again. This drives the GENERATED file with the real packages.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getClient } from '@molecule/app-http'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { disableAI } from '../ai.js'
import { synthesizeAppProjectFiles } from '../injector.js'
import { loadRegistry } from '../registry.js'

disableAI()

let dir = ''
let tags: string[] = ['dragons', 'training']
const requests: string[] = []

beforeAll(async () => {
  const bond = synthesizeAppProjectFiles(
    [],
    ['@molecule/app-http', '@molecule/app-query'],
    '/tmp/test-app',
    loadRegistry(),
  ).find((f) => f.targetPath.endsWith(join('bonds', 'http-default.ts')))!
  // Inside the package, so the generated imports resolve through the workspace's node_modules.
  dir = await mkdtemp(join(import.meta.dirname, '.http-write-stales-cache-'))
  await writeFile(join(dir, 'config.ts'), "export const API_BASE_URL = 'http://app.test/api'\n")
  await writeFile(
    join(dir, 'http-default.ts'),
    bond.content.replaceAll('../config.js', './config.js'),
  )
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      requests.push(`${method} ${new URL(url).pathname}`)
      if (method === 'PUT') tags = []
      return new Response(JSON.stringify({ article: { slug: 'a', tagList: tags } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }),
  )
  setProvider(provider)
  const generated = (await import(join(dir, 'http-default.ts'))) as { setupHttpDefault(): void }
  generated.setupHttpDefault()
})

afterAll(async () => {
  vi.unstubAllGlobals()
  await rm(dir, { recursive: true, force: true })
})

beforeEach(() => {
  resetQueryClient()
  tags = ['dragons', 'training']
  requests.length = 0
})

type Article = { slug: string; tagList: string[] }
const options = {
  key: ['article', 'a'],
  fetch: async (signal: AbortSignal) =>
    (await getClient().get<{ article: Article }>('/articles/a', { signal })).data.article,
}

/** Mounts a page that reads the article and resolves with the last tags it painted once settled. */
async function mount(): Promise<string[][]> {
  const painted: string[][] = []
  const stop = getQueryClient().subscribe<Article>(options, (state) => {
    if (state.data) painted.push(state.data.tagList)
  })
  // The fetch double answers at once; this lets its response reach the cache and the page.
  await new Promise((resolve) => setTimeout(resolve, 20))
  stop()
  return painted
}

describe('the generated HTTP client and the read cache', () => {
  it('a page mounted after a save fetches the article again and paints the saved tags', async () => {
    expect((await mount()).at(-1)).toEqual(['dragons', 'training'])
    await getClient().put('/articles/a', { article: { tagList: [] } })
    expect((await mount()).at(-1)).toEqual([])
    expect(requests).toEqual(['GET /api/articles/a', 'PUT /api/articles/a', 'GET /api/articles/a'])
  })

  it('without a write, a second mount inside the freshness window reads the cache only', async () => {
    await mount()
    expect((await mount()).at(-1)).toEqual(['dragons', 'training'])
    expect(requests).toEqual(['GET /api/articles/a'])
  })
})
