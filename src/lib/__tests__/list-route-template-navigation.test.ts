// @vitest-environment jsdom
/**
 * Mount the real template pages against the real useListRoute hook. Selecting a
 * filter pushes URL history; Back must restore the selected control and request,
 * not just the address bar.
 *
 * @module
 */

import { act, createElement, type ReactElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, type Router, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const get = vi.fn()
  const deleteRequest = vi.fn()
  return {
    listPhotos: vi.fn(),
    get,
    delete: deleteRequest,
    http: { get, delete: deleteRequest },
    track: vi.fn(),
    translation: {
      t: (_key: string, _values?: unknown, options?: { defaultValue?: string }) =>
        options?.defaultValue ?? _key,
    },
  }
})

vi.mock('@molecule/app-react', () => ({
  useAuth: () => ({ user: { name: 'Ada Lovelace' } }),
  useHttpClient: () => mocks.http,
  useTranslation: () => mocks.translation,
}))

vi.mock('@molecule/app-analytics', () => ({ track: mocks.track }))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_target, property) => {
          if (property === 'flex1') return 'stub'
          return property === 'cn'
            ? (...values: unknown[]) =>
                values.filter((value) => typeof value === 'string').join(' ')
            : () => 'stub'
        },
      },
    ),
}))

vi.mock('@molecule/app-ui-react', () => ({
  ConfirmButton: () => createElement('button', { type: 'button' }, 'Delete'),
}))

vi.mock('../../../templates/apps/photo-sharing/app/src/lib/api.js', () => ({
  listPhotos: mocks.listPhotos,
}))

vi.mock(
  '../../../templates/apps/cloud-file-manager/app/src/components/NimbusFilesLayout.js',
  () => ({
    NimbusFilesLayout: ({
      breadcrumbs = [],
      children,
    }: {
      breadcrumbs?: Array<{ label: string }>
      children?: ReactNode
    }) =>
      createElement(
        'section',
        null,
        createElement(
          'nav',
          { 'aria-label': 'breadcrumb' },
          breadcrumbs.map((item, index) =>
            createElement('span', { key: `${index}-${item.label}` }, item.label),
          ),
        ),
        children,
      ),
  }),
)
vi.mock(
  '../../../templates/apps/cloud-file-manager/app/src/components/NimbusFileGridCard.js',
  () => ({
    NimbusFileGridCard: ({ name }: { name: string }) => createElement('div', null, name),
  }),
)
vi.mock('../../../templates/apps/cloud-file-manager/app/src/components/NimbusFileRow.js', () => ({
  NimbusFileRow: ({ name }: { name: string }) => createElement('div', null, name),
}))
vi.mock(
  '../../../templates/apps/cloud-file-manager/app/src/components/NimbusFileTypeIcon.js',
  () => ({ NimbusFileTypeIcon: () => null }),
)

const { Explore } = await import('../../../templates/apps/photo-sharing/app/src/pages/Explore')
const { Issues } = await import('../../../templates/apps/newsletter/app/src/pages/Issues')
const { MyFiles } = await import('../../../templates/apps/cloud-file-manager/app/src/pages/MyFiles')

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLElement
let root: Root

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve))
  })
}

async function mount(
  path: '/explore' | '/issues' | '/files',
  element: ReactElement,
): Promise<Router> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const initial =
    path === '/explore'
      ? '/explore?tag=landscape'
      : path === '/issues'
        ? '/issues?status=draft'
        : '/files?folder=folder-a'
  const router = createMemoryRouter([{ path, element }], { initialEntries: [initial] })
  await act(async () => {
    root.render(createElement(RouterProvider, { router }))
  })
  await flush()
  return router
}

async function click(selector: string): Promise<void> {
  const control = container.querySelector<HTMLElement>(selector)
  if (!control) throw new Error(`missing control ${selector}`)
  await act(async () => control.click())
  await flush()
}

async function back(router: Router): Promise<void> {
  await act(async () => {
    await router.navigate(-1)
  })
  await flush()
}

function url(router: Router): string {
  return `${router.state.location.pathname}${router.state.location.search}`
}

beforeEach(() => {
  mocks.listPhotos.mockReset().mockResolvedValue([])
  mocks.get.mockReset().mockResolvedValue({ data: [] })
  mocks.delete.mockReset().mockResolvedValue({})
  mocks.track.mockReset().mockResolvedValue(undefined)
})

afterEach(async () => {
  if (root) await act(async () => root.unmount())
  document.body.innerHTML = ''
})

describe('template list routes survive Back with control, request and URL in agreement', () => {
  it('photo-sharing Explore derives the tag and photo request from the restored URL', async () => {
    const router = await mount('/explore', createElement(Explore))
    expect(url(router)).toBe('/explore?tag=landscape')
    expect(mocks.listPhotos).toHaveBeenLastCalledWith({ tag: 'landscape', limit: 60 })

    await click('[data-testid="explore-tag-portrait"]')
    expect(url(router)).toBe('/explore?tag=portrait')
    expect(mocks.listPhotos).toHaveBeenLastCalledWith({ tag: 'portrait', limit: 60 })
    expect(
      container.querySelector('[data-testid="explore-tag-portrait"]')?.getAttribute('aria-pressed'),
    ).toBe('true')

    await back(router)
    expect(url(router)).toBe('/explore?tag=landscape')
    expect(mocks.listPhotos).toHaveBeenLastCalledWith({ tag: 'landscape', limit: 60 })
    expect(
      container
        .querySelector('[data-testid="explore-tag-landscape"]')
        ?.getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('cloud-file-manager MyFiles restores the current folder request and listing on Back', async () => {
    const folders = [
      { id: 'folder-a', name: 'Folder A', parent_id: null },
      { id: 'folder-b', name: 'Folder B', parent_id: 'folder-a' },
    ]
    const files = [
      {
        id: 'file-a',
        name: 'alpha.txt',
        mime_type: 'text/plain',
        size: 10,
        is_starred: false,
        is_trashed: false,
        folder_id: 'folder-a',
      },
      {
        id: 'file-b',
        name: 'beta.txt',
        mime_type: 'text/plain',
        size: 20,
        is_starred: false,
        is_trashed: false,
        folder_id: 'folder-b',
      },
    ]
    mocks.get.mockImplementation(async (request: string) => {
      if (request === '/api/files') return { data: files }
      if (request === '/api/folders') return { data: folders }
      if (request === '/api/stats') {
        return {
          data: {
            totalFiles: 2,
            totalFolders: 2,
            starredFiles: 0,
            collaborators: 0,
            usedBytes: 30,
          },
        }
      }
      const folder = folders.find((item) => request === `/api/folders/${item.id}`)
      if (folder) return { data: folder }
      throw new Error(`unexpected request ${request}`)
    })

    const router = await mount('/files', createElement(MyFiles))
    expect(url(router)).toBe('/files?folder=folder-a')
    expect(mocks.get).toHaveBeenLastCalledWith('/api/folders/folder-a')
    expect(container.querySelector('nav')?.textContent).toContain('Folder A')
    expect(container.textContent).toContain('alpha.txt')

    await click('a[href="/files?folder=folder-b"]')
    expect(url(router)).toBe('/files?folder=folder-b')
    expect(mocks.get).toHaveBeenLastCalledWith('/api/folders/folder-b')
    expect(container.querySelector('nav')?.textContent).toContain('Folder B')
    expect(container.textContent).toContain('beta.txt')

    await back(router)
    expect(url(router)).toBe('/files?folder=folder-a')
    expect(mocks.get).toHaveBeenLastCalledWith('/api/folders/folder-a')
    expect(container.querySelector('nav')?.textContent).toContain('Folder A')
    expect(container.textContent).toContain('alpha.txt')
  })

  it('newsletter Issues derives the status tab and API request from the restored URL', async () => {
    const router = await mount('/issues', createElement(Issues))
    expect(url(router)).toBe('/issues?status=draft')
    expect(mocks.get.mock.calls.at(-1)?.[0]).toContain('status=draft')

    await click('[data-mol-id="issues-filter-published"]')
    expect(url(router)).toBe('/issues?status=published')
    expect(mocks.get.mock.calls.at(-1)?.[0]).toContain('status=published')
    expect(
      container
        .querySelector('[data-mol-id="issues-filter-published"]')
        ?.getAttribute('aria-selected'),
    ).toBe('true')

    await back(router)
    expect(url(router)).toBe('/issues?status=draft')
    expect(mocks.get.mock.calls.at(-1)?.[0]).toContain('status=draft')
    expect(
      container.querySelector('[data-mol-id="issues-filter-draft"]')?.getAttribute('aria-selected'),
    ).toBe('true')
  })
})
