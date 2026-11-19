// @vitest-environment jsdom

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as auth from '@molecule/app-auth'
import { unbond } from '@molecule/app-bond'
import { createDefaultAuthClientWithHttpSync } from '@molecule/app-bonds-default-react'
import * as http from '@molecule/app-http'
import {
  getQueryClient,
  type QueryOptions,
  resetQueryClient,
  setProvider,
} from '@molecule/app-query'
import { createProvider } from '@molecule/app-query-memory'
import * as query from '@molecule/app-query-react'

import { writeContractResourceModules } from '../contract-resource-modules.js'
import { getRawRegistry } from '../registry.js'

interface Comment {
  id: number
  text: string
}

interface ThreadClient {
  useComments: (...args: string[]) => { data: Comment[] | undefined }
  createComment: (...args: (string | { text: string })[]) => Promise<Comment>
  commentsList: (...args: string[]) => QueryOptions<Comment[]>
  commentErrorMessage?: (error: unknown) => string
}

const template = join(import.meta.dirname, '../../../templates/apps/note-taking/app/package.json')
const contract = join(import.meta.dirname, 'fixtures/note-thread-openapi.json.txt')
const QUERY = '@molecule/app-query-react'
const AUTH = '@molecule/app-auth'
const HTTP = '@molecule/app-http'
const registry = getRawRegistry()
const roots: string[] = []
const disposers: (() => void)[] = []
const noteId = 'Friday / planning'

async function generate(authenticated: boolean): Promise<ThreadClient> {
  const root = await mkdtemp(join(tmpdir(), 'note-thread-'))
  roots.push(root)
  const app = join(root, 'app')
  const manifest = JSON.parse(await readFile(template, 'utf8'))
  manifest.dependencies[QUERY] = registry.packages[QUERY].decisionGuide!.resourceModules!.since
  if (!authenticated) delete manifest.dependencies[AUTH]
  await mkdir(app)
  await writeFile(join(app, 'package.json'), JSON.stringify(manifest))
  const declared = [QUERY, HTTP, ...(authenticated ? [AUTH] : [])].map((name) => ({
    name,
    workspace: 'app',
  }))
  await writeFile(join(root, 'openapi.json'), await readFile(contract))
  const result = await writeContractResourceModules(root, 'openapi.json', registry, declared)
  expect(result.written.map((module) => module.collection)).toEqual(['/pages/{pageId}/comments'])
  const source = await readFile(join(app, 'src/resources/comments.ts'), 'utf8')
  if (!authenticated) expect(source).not.toContain(AUTH)
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const imports: Record<string, unknown> = {
    react: React,
    [AUTH]: auth,
    [HTTP]: http,
    [QUERY]: query,
  }
  const exports: Record<string, unknown> = {}
  new Function('require', 'exports', outputText)((name: string) => {
    if (!(name in imports)) throw new Error(`Unexpected generated import: ${name}`)
    return imports[name]
  }, exports)
  return exports as unknown as ThreadClient
}

function setup(): auth.AuthClient<{ handle: string }> {
  const { authClient, setupAuthDefault } = createDefaultAuthClientWithHttpSync<{ handle: string }>({
    storage: 'memory',
    autoRefresh: false,
  })
  setProvider(createProvider())
  http.setClient(http.createFetchClient({ baseURL: 'https://notes.test' }))
  setupAuthDefault()
  disposers.push(() => authClient.destroy())
  return authClient
}

function mountThread(
  client: ThreadClient,
  handle: string,
): { create: (text: string) => Promise<Comment> } {
  const legacy = client.useComments.length > 1
  function create(text: string): Promise<Comment> {
    return client.createComment(...(legacy ? [noteId, handle, { text }] : [noteId, { text }]))
  }
  function Thread(): React.ReactElement {
    const legacyViewer = handle === 'public' ? handle : `user:${handle}`
    const { data } = client.useComments(...(legacy ? [noteId, legacyViewer] : [noteId]))
    const [error, setError] = React.useState('')
    const [saved, setSaved] = React.useState(false)
    return React.createElement(
      'section',
      {},
      React.createElement(
        'ul',
        {},
        data?.map((item) => React.createElement('li', { key: item.id }, item.text)),
      ),
      React.createElement(
        'button',
        {
          onClick: () =>
            void create('Add a checklist').then(
              () => setSaved(true),
              (cause: unknown) =>
                setError(
                  client.commentErrorMessage?.(cause) ?? 'Request failed. Please try again.',
                ),
            ),
        },
        'Add comment',
      ),
      saved ? React.createElement('p', { role: 'status' }, 'Saved') : null,
      error ? React.createElement('p', { role: 'alert' }, error) : null,
    )
  }
  render(React.createElement(Thread))
  return { create }
}

afterEach(async () => {
  cleanup()
  for (const dispose of disposers.splice(0)) dispose()
  unbond('auth-client')
  vi.unstubAllGlobals()
  resetQueryClient()
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('generated Note-taking comment thread', () => {
  it('refreshes a mounted thread after a comment write without a page refetch', async () => {
    setup().setSession({ accessToken: 'alice', user: { handle: 'alice' } })
    const client = await generate(true)
    const rows = [{ id: 1, text: 'Bring the agenda' }]
    const requests = vi.fn(async (url: string, request: RequestInit) => {
      expect(new URL(url).pathname).toBe('/pages/Friday%20%2F%20planning/comments')
      expect(new Headers(request.headers).get('authorization')).toBe('Bearer alice')
      if (request.method === 'POST') {
        const saved = { id: 2, ...JSON.parse(String(request.body)) }
        rows.push(saved)
        return Response.json(saved, { status: 201 })
      }
      return Response.json({ comments: rows })
    })
    vi.stubGlobal('fetch', requests)
    mountThread(client, 'alice')
    await screen.findByText('Bring the agenda')
    fireEvent.click(screen.getByRole('button', { name: 'Add comment' }))
    await screen.findByText('Saved')
    expect(screen.queryByText('Add a checklist')?.textContent).toBe('Add a checklist')
    expect(requests.mock.calls.map(([, request]) => request.method)).toEqual(['GET', 'POST', 'GET'])
  })

  it('keeps two custom-profile sessions separate when an earlier write completes late', async () => {
    const authClient = setup()
    authClient.setSession({ accessToken: 'alice', user: { handle: 'alice' } })
    const client = await generate(true)
    const posted = Promise.withResolvers<Response>()
    const requests = vi.fn(async (_url: string, request: RequestInit) => {
      const token = new Headers(request.headers).get('authorization')
      if (request.method === 'POST') return posted.promise
      return Response.json({ comments: [{ id: 1, text: `${token} private conversation` }] })
    })
    vi.stubGlobal('fetch', requests)
    const thread = mountThread(client, 'alice')
    await screen.findByText('Bearer alice private conversation')
    const legacy = client.useComments.length > 1
    const aliceList = client.commentsList(...(legacy ? [noteId, 'user:alice'] : [noteId]))
    const write = thread.create('Late edit').catch((cause: unknown) => cause)
    await vi.waitFor(() =>
      expect(requests.mock.calls.some(([, request]) => request.method === 'POST')).toBe(true),
    )
    act(() => authClient.setSession({ accessToken: 'bob', user: { handle: 'bob' } }))
    await vi.waitFor(() =>
      expect(screen.queryByText('Bearer bob private conversation')).not.toBeNull(),
    )
    const bobList = client.commentsList(...(legacy ? [noteId, 'user:bob'] : [noteId]))
    expect(screen.queryByText('Bearer alice private conversation')).toBeNull()
    const requestsBefore = requests.mock.calls.length
    await act(async () => {
      posted.resolve(Response.json({ id: 2, text: 'Late edit' }))
      await write
    })
    expect(requests).toHaveBeenCalledTimes(requestsBefore)
    expect(aliceList.key).not.toEqual(bobList.key)
    expect(getQueryClient().getState(aliceList.key).data).toEqual([
      { id: 1, text: 'Bearer alice private conversation' },
    ])
    expect(getQueryClient().getState(bobList.key).data).toEqual([
      { id: 1, text: 'Bearer bob private conversation' },
    ])
    expect(screen.getByText('Bearer bob private conversation')).toBeTruthy()
    expect(screen.queryByText('Late edit')).toBeNull()
  })

  it('uses a public cache when the app has no auth dependency', async () => {
    const client = await generate(false)
    expect(auth.hasClient()).toBe(false)
    setProvider(createProvider())
    http.setClient(http.createFetchClient({ baseURL: 'https://notes.test' }))
    const rows = [{ id: 1, text: 'Public note' }]
    vi.stubGlobal('fetch', async (_url: string, request: RequestInit) => {
      if (request.method === 'POST') {
        const saved = { id: 2, text: 'Add a checklist' }
        rows.push(saved)
        return Response.json(saved)
      }
      return Response.json({ comments: rows })
    })
    mountThread(client, 'public')
    await screen.findByText('Public note')
    fireEvent.click(screen.getByRole('button', { name: 'Add comment' }))
    await screen.findByText('Saved')
    expect(screen.queryByText('Add a checklist')).toBeTruthy()
    expect(getQueryClient().getState(['comments:' + noteId, 'public', 'detail', '2']).data).toEqual(
      rows[1],
    )
  })

  it('cancels an old write before the HTTP transport can use the new account', async () => {
    const authClient = setup()
    authClient.setSession({ accessToken: 'alice', user: { handle: 'alice' } })
    const client = await generate(true)
    const entered = Promise.withResolvers<void>()
    const release = Promise.withResolvers<void>()
    http.getClient().addRequestInterceptor(async (config) => {
      entered.resolve()
      await release.promise
      return config
    })
    const sent: (string | null)[] = []
    vi.stubGlobal('fetch', async (_url: string, request: RequestInit) => {
      request.signal?.throwIfAborted()
      sent.push(new Headers(request.headers).get('authorization'))
      return Response.json({ id: 2, text: 'Delayed' })
    })
    const write = client.createComment(noteId, { text: 'Delayed' }).catch((cause: unknown) => cause)
    await entered.promise
    authClient.setSession({ accessToken: 'bob', user: { handle: 'bob' } })
    release.resolve()
    expect(await write).toBeInstanceOf(Error)
    expect(sent).toEqual([])
  })

  it.each([
    ['validation', 'Comments must be at least 30 characters.'],
    ['network', 'Request failed. Please try again.'],
  ])('renders the right message for a %s write failure', async (kind, expected) => {
    setup().setSession({ accessToken: 'alice', user: { handle: 'alice' } })
    const client = await generate(true)
    vi.stubGlobal('fetch', async (_url: string, request: RequestInit) => {
      if (request.method === 'GET')
        return Response.json({ comments: [{ id: 1, text: 'Existing' }] })
      if (kind === 'network') throw new TypeError('ENETUNREACH internal connection details')
      return Response.json({ errors: { text: ['', expected] } }, { status: 422 })
    })
    mountThread(client, 'alice')
    await screen.findByText('Existing')
    fireEvent.click(screen.getByRole('button', { name: 'Add comment' }))
    expect((await screen.findByRole('alert')).textContent).toBe(expected)
  })
})
