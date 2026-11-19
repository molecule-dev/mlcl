// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as auth from '@molecule/app-auth'
import { resetQueryClient, setProvider } from '@molecule/app-query'
import { createProvider } from '@molecule/app-query-memory'
import * as queryReact from '@molecule/app-query-react'
import * as appReact from '@molecule/app-react'

import { parseContract, planContractResourceModules } from '../contract-resource-modules.js'
import { getRawRegistry } from '../registry.js'

interface Page {
  id: string
  title: string
  pinned: boolean
}

interface Pin {
  value: boolean
  pending: boolean
  toggle: () => void
}

interface PageModule {
  usePage: (id: string) => { data: Page | null | undefined }
  setPagePin: (id: string, on: boolean) => Promise<Page>
  usePagePin?: (record: Page) => Pin
  usePageMark?: (record: Page) => {
    value: Page
    pending: boolean
    error: unknown
    set: (on: boolean) => void
    toggle: (savedOn: boolean) => void
  }
  PageView?: React.ComponentType<{
    parentId?: string
    id: string
    pending: React.ReactNode
    missing: React.ReactNode
    error: (cause: unknown) => React.ReactNode
    children: (page: Page) => React.ReactNode
  }>
}

const noteContract = parseContract(
  readFileSync(join(import.meta.dirname, 'fixtures/note-pin-openapi.json.txt'), 'utf8'),
) as { paths: Record<string, { get?: unknown; post?: unknown; delete?: unknown }> }

const packages = getRawRegistry().packages
const query = '@molecule/app-query-react'
const factory = packages[query].decisionGuide!.resourceModules!
const initial = { id: 'page 1', title: 'Notes for Friday', pinned: false }
const answer = (record: Page): { data: { note: Page } } => ({ data: { note: record } })

function loadGenerated(source: string, http: object): PageModule {
  const emitted = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  const imports: Record<string, unknown> = {
    react: React,
    '@molecule/app-auth': auth,
    '@molecule/app-http': { getClient: () => http },
    '@molecule/app-query-react': queryReact,
    '@molecule/app-react': appReact,
  }
  const adapt = new Function('require', 'exports', emitted)
  const exports: Record<string, unknown> = {}
  adapt((name: string) => {
    if (!(name in imports)) throw new Error(`Unexpected generated import ${name}`)
    return imports[name]
  }, exports)
  return exports as unknown as PageModule
}

function generated(http: object, contract = noteContract, withAuth = false): PageModule {
  const [module] = planContractResourceModules(
    contract,
    factory,
    query,
    'app',
    'openapi.json',
    undefined,
    { view: true, toggle: true, auth: withAuth },
  ).modules
  return loadGenerated(module.source, http)
}

describe('generated Note-taking pin and record view', () => {
  beforeEach(() => setProvider(createProvider()))
  afterEach(() => {
    cleanup()
    resetQueryClient()
  })

  it('honors the opposite click before a delayed pin has saved', async () => {
    const first = Promise.withResolvers<ReturnType<typeof answer>>()
    const post = vi.fn(() => first.promise)
    const remove = vi.fn(async () => answer(initial))
    const module = generated({ post, delete: remove })

    function useGuardedPin(record: Page): Pin {
      const [value, show] = React.useState(record.pinned)
      const [pending, save] = React.useState(false)
      async function toggle(): Promise<void> {
        if (pending) return
        const next = !value
        show(next)
        save(true)
        try {
          show((await module.setPagePin(record.id, next)).pinned)
        } finally {
          save(false)
        }
      }
      return { value, pending, toggle }
    }

    // The old generator supplied only the setter, so this control reproduces the pending guard.
    const usePin = module.usePagePin ?? useGuardedPin
    function Button(): React.ReactElement {
      const pin = usePin(initial)
      return React.createElement(
        'button',
        { 'aria-busy': pin.pending, onClick: pin.toggle },
        pin.value ? 'Unpin' : 'Pin',
      )
    }
    render(React.createElement(Button))
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }))
    expect(post).toHaveBeenCalledExactlyOnceWith('/pages/page%201/pin')
    fireEvent.click(screen.getByRole('button', { name: 'Unpin' }))
    expect(remove).not.toHaveBeenCalled()
    first.resolve(answer({ ...initial, pinned: true }))
    await waitFor(() => expect(screen.getByRole('button').getAttribute('aria-busy')).toBe('false'))
    expect(remove).toHaveBeenCalledExactlyOnceWith('/pages/page%201/pin')
    expect(screen.getByRole('button', { name: 'Pin' })).toBeTruthy()
  })

  it('renders pending and missing outside the record markup', async () => {
    const load = Promise.withResolvers<{ data: { note: Page | null } }>()
    const get = vi
      .fn()
      .mockReturnValueOnce(load.promise)
      .mockResolvedValue({ data: { note: null } })
    const module = generated({ get })
    const pending = React.createElement('p', { role: 'status' }, 'Loading page')
    const missing = React.createElement('p', { role: 'status' }, 'Page missing')
    const children = (page: Page): React.ReactElement =>
      React.createElement('article', {}, React.createElement('p', {}, page.title))
    function GuardedView(): React.ReactElement {
      const { data } = module.usePage(initial.id)
      return data
        ? children(data)
        : React.createElement('article', {}, data === null ? missing : pending)
    }
    const View = module.PageView ?? GuardedView
    const view = (id: string): React.ReactElement =>
      React.createElement(View, {
        id,
        pending,
        missing,
        error: () => null,
        children,
      })
    const page = render(view(initial.id))
    expect(screen.getByRole('status').textContent).toBe('Loading page')
    expect(screen.queryByRole('article')).toBeNull()
    load.resolve(answer(initial))
    expect((await screen.findByRole('article')).textContent).toBe(initial.title)
    page.rerender(view('missing'))
    expect(screen.queryByRole('article')).toBeNull()
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Page missing'))
    expect(screen.queryByRole('article')).toBeNull()
  })

  it('keeps a queued click on the session that made it even when the control stays mounted', async () => {
    const authClient = auth.createJWTAuthClient<{ handle: string }>({
      storage: 'memory',
      autoRefresh: false,
    })
    auth.setClient(authClient)
    authClient.setSession({ accessToken: 'reader', user: { handle: 'reader' } })
    const first = Promise.withResolvers<ReturnType<typeof answer>>()
    const post = vi.fn(() => first.promise)
    const remove = vi.fn(async () => answer(initial))
    const { usePagePin } = generated({ post, delete: remove }, noteContract, true)
    expect(usePagePin).toBeTypeOf('function')

    function Button(): React.ReactElement {
      const pin = usePagePin!(initial)
      return React.createElement(
        'button',
        { 'aria-busy': pin.pending, onClick: pin.toggle },
        pin.value ? 'Unpin' : 'Pin',
      )
    }

    try {
      render(React.createElement(Button))
      fireEvent.click(screen.getByRole('button', { name: 'Pin' }))
      fireEvent.click(screen.getByRole('button', { name: 'Unpin' }))
      fireEvent.click(screen.getByRole('button', { name: 'Pin' }))
      expect(post).toHaveBeenCalledTimes(1)
      act(() => authClient.setSession({ accessToken: 'writer', user: { handle: 'writer' } }))
      first.resolve(answer({ ...initial, pinned: true }))
      await waitFor(() =>
        expect(screen.getByRole('button').getAttribute('aria-busy')).toBe('false'),
      )
      expect(post).toHaveBeenCalledTimes(1)
      expect(remove).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Pin' })).toBeTruthy()
    } finally {
      authClient.destroy()
    }
  })

  it('mounts fresh record content when a nested page changes viewer or parent', async () => {
    const get = vi.fn(async (_path: string) => answer(initial))
    const client = auth.createJWTAuthClient<{ handle: string }>({
      storage: 'memory',
      autoRefresh: false,
    })
    auth.setClient(client)
    client.setSession({ accessToken: 'reader', user: { handle: 'reader' } })
    const { PageView } = generated(
      { get },
      {
        ...noteContract,
        paths: { '/notebooks/{id}/pages/{pageId}': noteContract.paths['/pages/{id}'] },
      },
      true,
    )
    expect(PageView).toBeTypeOf('function')
    function RecordContent(): React.ReactElement {
      const [draft, setDraft] = React.useState('Unedited')
      return React.createElement('button', { onClick: () => setDraft('Edited') }, draft)
    }
    const page = (parentId: string): React.ReactElement =>
      React.createElement(PageView!, {
        parentId,
        id: initial.id,
        pending: null,
        missing: null,
        error: () => null,
        children: () => React.createElement(RecordContent),
      })
    const view = render(page('book 1'))
    fireEvent.click(await screen.findByRole('button', { name: 'Unedited' }))
    expect(screen.getByRole('button', { name: 'Edited' })).toBeTruthy()
    act(() => client.setSession({ accessToken: 'writer', user: { handle: 'writer' } }))
    expect(await screen.findByRole('button', { name: 'Unedited' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Unedited' }))
    view.rerender(page('book 2'))
    expect(await screen.findByRole('button', { name: 'Unedited' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Unedited' }))
    view.rerender(page('book 1'))
    // Switching to a cached record must also remount the loaded child.
    expect(screen.getByRole('button', { name: 'Unedited' })).toBeTruthy()
    expect(get.mock.calls.map(([path]) => path)).toEqual(
      expect.arrayContaining([
        '/notebooks/book%201/pages/page%201',
        '/notebooks/book%202/pages/page%201',
      ]),
    )
    client.destroy()
  })

  it('queues an unnamed flag and shows the saved record after the newest save fails', async () => {
    const first = Promise.withResolvers<ReturnType<typeof answer>>()
    const second = Promise.withResolvers<ReturnType<typeof answer>>()
    const post = vi.fn(() => first.promise)
    const remove = vi.fn(() => second.promise)
    const contract = noteContract
    const paths = {
      ...contract.paths,
      // There is no field named for this action. The generator cannot infer how to edit Page.
      '/pages/{id}/mark': contract.paths['/pages/{id}/pin'],
    }
    const { usePageMark } = generated({ post, delete: remove }, { ...contract, paths })
    expect(usePageMark).toBeTypeOf('function')
    function Button(): React.ReactElement {
      const mark = usePageMark!(initial)
      const title = `${mark.error ? 'Save failed. ' : ''}${mark.value.title}`
      return React.createElement('button', { onClick: () => mark.toggle(mark.value.pinned) }, title)
    }
    render(React.createElement(Button))
    fireEvent.click(screen.getByRole('button', { name: initial.title }))
    fireEvent.click(screen.getByRole('button', { name: initial.title }))
    expect(post).toHaveBeenCalledExactlyOnceWith('/pages/page%201/mark')
    expect(remove).not.toHaveBeenCalled()
    const saved = { ...initial, pinned: true, title: 'Saved by the server' }
    first.resolve(answer(saved))
    await waitFor(() => expect(remove).toHaveBeenCalledExactlyOnceWith('/pages/page%201/mark'))
    second.reject(new Error('Save rejected'))
    expect(
      await screen.findByRole('button', { name: 'Save failed. Saved by the server' }),
    ).toBeTruthy()
  })

  it('leaves a local switch and a POST-only sub-path without generated toggle hooks', () => {
    const contract = noteContract
    const module = generated(
      {},
      {
        ...contract,
        paths: {
          ...contract.paths,
          '/pages/{id}/pin': { post: contract.paths['/pages/{id}/pin'].post, delete: undefined },
        },
      },
    )
    expect(Object.keys(module).sort()).toEqual(['PageView', 'pageErrorMessage', 'usePage'].sort())

    function CompactSwitch(): React.ReactElement {
      const [compact, setCompact] = React.useState(false)
      return React.createElement(
        'button',
        { onClick: () => setCompact(!compact) },
        compact ? 'Compact' : 'Spacious',
      )
    }
    render(React.createElement(CompactSwitch))
    fireEvent.click(screen.getByRole('button', { name: 'Spacious' }))
    expect(screen.getByRole('button', { name: 'Compact' })).toBeTruthy()
  })
})
