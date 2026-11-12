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
import {
  createMemoryRouter,
  type Router,
  RouterProvider,
  useLocation,
  useNavigate,
} from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCatalogParams } from './fixtures/list-route-url-hooks.js'

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
  LoadErrorBanner: ({ message }: { message: string }) => createElement('p', null, message),
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

vi.mock('../../../templates/apps/food-delivery/app/src/lib/useCart.js', () => ({
  useCart: () => ({ lines: [] }),
}))
vi.mock('../../../templates/apps/food-delivery/app/src/components/RestaurantsHero.js', () => ({
  RestaurantsHero: () => null,
}))
vi.mock('../../../templates/apps/food-delivery/app/src/components/CartHero.js', () => ({
  CartHero: () => null,
}))
vi.mock(
  '../../../templates/apps/food-delivery/app/src/components/FeaturedRestaurantsGrid.js',
  () => ({
    FeaturedRestaurantsGrid: ({
      restaurants,
    }: {
      restaurants: Array<{ id: string; name: string }>
    }) =>
      createElement(
        'ul',
        null,
        restaurants.map((row) => createElement('li', { key: row.id }, row.name)),
      ),
  }),
)
vi.mock('../../../templates/apps/food-delivery/app/src/components/CategoryChips.js', () => ({
  CategoryChips: ({
    categories,
    activeKey,
    onSelect,
  }: {
    categories: Array<{ key: string; label: string }>
    activeKey: string
    onSelect: (key: string) => void
  }) =>
    createElement(
      'nav',
      null,
      categories.map((row) =>
        createElement(
          'button',
          {
            key: row.key,
            'data-testid': 'cuisine-' + row.key,
            'aria-pressed': row.key === activeKey,
            onClick: () => onSelect(row.key),
          },
          row.label,
        ),
      ),
    ),
}))
const { Restaurants } =
  await import('../../../templates/apps/food-delivery/app/src/pages/Restaurants')

const { Explore } = await import('../../../templates/apps/photo-sharing/app/src/pages/Explore')
const { Issues } = await import('../../../templates/apps/newsletter/app/src/pages/Issues')
const { MyFiles } = await import('../../../templates/apps/cloud-file-manager/app/src/pages/MyFiles')
const { Gifts } = await import('../../../templates/apps/donor-management/app/src/pages/Gifts')
const { Results } = await import('../../../templates/apps/flight-search/app/src/pages/Results')
const { Inbox } = await import('../../../templates/apps/ai-email-composer/app/src/pages/Inbox')
const { Candidates } =
  await import('../../../templates/apps/applicant-tracking/app/src/pages/Candidates')
const { Journal } =
  await import('../../../templates/apps/mental-health-journal/app/src/pages/Journal')

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLElement
let root: Root

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve))
  })
}

async function mount(path: string, element: ReactElement, initialEntry?: string): Promise<Router> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const initial =
    initialEntry ??
    (path === '/explore'
      ? '/explore?tag=landscape'
      : path === '/issues'
        ? '/issues?status=draft'
        : '/files?folder=folder-a')
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

async function change(selector: string, value: string): Promise<void> {
  const control = container.querySelector<HTMLInputElement | HTMLSelectElement>(selector)
  if (!control) throw new Error(`missing control ${selector}`)
  const prototype =
    control instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(control, value)
  await act(async () => {
    control.dispatchEvent(
      new Event(control instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }),
    )
  })
  await flush()
}

async function back(router: Router): Promise<void> {
  await act(async () => {
    await router.navigate(-1)
  })
  await flush()
}

/** A fresh component tree with the current URL and browser history retained. */
async function reload(router: Router): Promise<void> {
  await act(async () => root.unmount())
  root = createRoot(container)
  await act(async () => root.render(createElement(RouterProvider, { router })))
  await flush()
}

function url(router: Router): string {
  return `${router.state.location.pathname}${router.state.location.search}`
}

const useWrappedParams = (): ReturnType<typeof useCatalogParams>[0] => useCatalogParams()[0]

/** Raw router values are already reactive; adopting a particular hook is not required. */
function DirectUrlCatalog({ producer }: { producer: string }): ReactElement {
  const wrapped = useWrappedParams()
  const location = useLocation()
  const navigate = useNavigate()
  const params = producer === 'useLocation' ? new URLSearchParams(location.search) : wrapped
  const sort = params.get('sort') ?? 'name'
  const products = [
    { name: 'Alpha', price: 20 },
    { name: 'Beta', price: 10 },
  ]
  products.sort((a, b) => (sort === 'price' ? a.price - b.price : a.name.localeCompare(b.name)))
  return createElement(
    'section',
    null,
    createElement(
      'select',
      {
        'aria-label': 'Catalog sort',
        value: sort,
        onChange: (event: { target: { value: string } }) => navigate(`?sort=${event.target.value}`),
      },
      createElement('option', { value: 'name' }, 'Name'),
      createElement('option', { value: 'price' }, 'Price'),
    ),
    createElement(
      'ul',
      null,
      products.map((product) => createElement('li', { key: product.name }, product.name)),
    ),
  )
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

    await reload(router)
    expect(mocks.listPhotos).toHaveBeenLastCalledWith({ tag: 'portrait', limit: 60 })

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

    await reload(router)
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

    await reload(router)
    expect(mocks.get.mock.calls.at(-1)?.[0]).toContain('status=published')

    await back(router)
    expect(url(router)).toBe('/issues?status=draft')
    expect(mocks.get.mock.calls.at(-1)?.[0]).toContain('status=draft')
    expect(
      container.querySelector('[data-mol-id="issues-filter-draft"]')?.getAttribute('aria-selected'),
    ).toBe('true')
  })
})

describe('flagship list controls restore their values on initial load and Back', () => {
  it.each(['re-exported alias and arrow wrapper', 'useLocation'])(
    'direct URL controls through %s already survive reload and Back',
    async (producer) => {
      const router = await mount(
        '/catalog',
        createElement(DirectUrlCatalog, { producer }),
        '/catalog?sort=name',
      )
      expect(container.querySelector('li')?.textContent).toBe('Alpha')
      await change('select', 'price')
      expect(url(router)).toBe('/catalog?sort=price')
      expect(container.querySelector('li')?.textContent).toBe('Beta')
      await reload(router)
      expect(container.querySelector<HTMLSelectElement>('select')?.value).toBe('price')
      expect(container.querySelector('li')?.textContent).toBe('Beta')
      await back(router)
      expect(container.querySelector<HTMLSelectElement>('select')?.value).toBe('name')
      expect(container.querySelector('li')?.textContent).toBe('Alpha')
    },
  )

  it('donor-management Gifts restores the method filter', async () => {
    const router = await mount('/gifts', createElement(Gifts), '/gifts?method=card')
    const selector = 'select[aria-label="Filter by method"]'
    expect(container.querySelector<HTMLSelectElement>(selector)?.value).toBe('card')

    await change(selector, 'cash')
    expect(url(router)).toBe('/gifts?method=cash')
    expect(container.querySelector<HTMLSelectElement>(selector)?.value).toBe('cash')

    await reload(router)
    expect(container.querySelector<HTMLSelectElement>(selector)?.value).toBe('cash')

    await back(router)
    expect(url(router)).toBe('/gifts?method=card')
    expect(container.querySelector<HTMLSelectElement>(selector)?.value).toBe('card')
  })

  it('flight-search Results restores the selected sort', async () => {
    mocks.get.mockResolvedValue({
      data: [
        {
          id: 'slow',
          airline: 'SlowAir',
          flight_number: 'S100',
          origin_code: 'JFK',
          destination_code: 'CDG',
          departure_time: '2026-01-01T10:00:00Z',
          arrival_time: '2026-01-01T18:00:00Z',
          duration_minutes: 480,
          stops: 1,
          price: 100,
        },
        {
          id: 'fast',
          airline: 'FastAir',
          flight_number: 'F200',
          origin_code: 'JFK',
          destination_code: 'CDG',
          departure_time: '2026-01-01T12:00:00Z',
          arrival_time: '2026-01-01T14:00:00Z',
          duration_minutes: 120,
          stops: 0,
          price: 200,
        },
      ],
    })
    const router = await mount('/results', createElement(Results), '/results?sort=departure_time')
    const selector = 'select[aria-label="Sort results by"]'
    expect(container.querySelector<HTMLSelectElement>(selector)?.value).toBe('departure_time')
    expect(container.textContent!.indexOf('SlowAir')).toBeLessThan(
      container.textContent!.indexOf('FastAir'),
    )

    await change(selector, 'duration_minutes')
    expect(url(router)).toBe('/results?sort=duration_minutes')
    expect(container.querySelector<HTMLSelectElement>(selector)?.value).toBe('duration_minutes')
    expect(container.textContent!.indexOf('FastAir')).toBeLessThan(
      container.textContent!.indexOf('SlowAir'),
    )

    await reload(router)
    expect(container.querySelector<HTMLSelectElement>(selector)?.value).toBe('duration_minutes')
    expect(container.textContent!.indexOf('FastAir')).toBeLessThan(
      container.textContent!.indexOf('SlowAir'),
    )

    await back(router)
    expect(url(router)).toBe('/results?sort=departure_time')
    expect(container.querySelector<HTMLSelectElement>(selector)?.value).toBe('departure_time')
    expect(container.textContent!.indexOf('SlowAir')).toBeLessThan(
      container.textContent!.indexOf('FastAir'),
    )
  })

  it('ai-email-composer Inbox restores the mail filter', async () => {
    const router = await mount('/inbox', createElement(Inbox), '/inbox?filter=unread')
    expect(
      container.querySelector('[data-mol-id="inbox-filter-unread"]')?.getAttribute('aria-pressed'),
    ).toBe('true')

    await click('[data-mol-id="inbox-filter-ai"]')
    expect(url(router)).toBe('/inbox?filter=ai')
    expect(
      container.querySelector('[data-mol-id="inbox-filter-ai"]')?.getAttribute('aria-pressed'),
    ).toBe('true')

    await reload(router)
    expect(
      container.querySelector('[data-mol-id="inbox-filter-ai"]')?.getAttribute('aria-pressed'),
    ).toBe('true')

    await back(router)
    expect(url(router)).toBe('/inbox?filter=unread')
    expect(
      container.querySelector('[data-mol-id="inbox-filter-unread"]')?.getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('applicant-tracking Candidates restores the search query', async () => {
    mocks.get.mockResolvedValue({
      data: [
        { id: 'ada', name: 'Ada Lovelace', role: 'Engineer' },
        { id: 'grace', name: 'Grace Hopper', role: 'Engineer' },
      ],
    })
    const router = await mount('/candidates', createElement(Candidates), '/candidates?q=ada')
    const selector = '[data-mol-id="candidates-search"]'
    expect(container.querySelector<HTMLInputElement>(selector)?.value).toBe('ada')
    expect(container.querySelector('tbody')?.textContent).toContain('Ada Lovelace')
    expect(container.querySelector('tbody')?.textContent).not.toContain('Grace Hopper')

    await change(selector, 'grace')
    expect(url(router)).toBe('/candidates?q=grace')
    expect(container.querySelector<HTMLInputElement>(selector)?.value).toBe('grace')
    expect(container.querySelector('tbody')?.textContent).toContain('Grace Hopper')

    await reload(router)
    expect(container.querySelector<HTMLInputElement>(selector)?.value).toBe('grace')
    expect(container.querySelector('tbody')?.textContent).toContain('Grace Hopper')

    await back(router)
    expect(url(router)).toBe('/candidates?q=ada')
    expect(container.querySelector<HTMLInputElement>(selector)?.value).toBe('ada')
    expect(container.querySelector('tbody')?.textContent).toContain('Ada Lovelace')
  })

  it('mental-health-journal Journal restores mood and search state', async () => {
    mocks.get.mockResolvedValue({
      data: [
        {
          id: 'good',
          date: '2026-01-01',
          title: 'Alpha good',
          preview: '',
          mood: 'good',
          tags: [],
          word_count: 5,
        },
        {
          id: 'low',
          date: '2026-01-02',
          title: 'Alpha low',
          preview: '',
          mood: 'low',
          tags: [],
          word_count: 5,
        },
        {
          id: 'beta',
          date: '2026-01-03',
          title: 'Beta good',
          preview: '',
          mood: 'good',
          tags: [],
          word_count: 5,
        },
      ],
    })
    const router = await mount('/journal', createElement(Journal), '/journal?mood=good&q=alpha')
    expect(
      container.querySelector('[data-mol-id="journal-filter-good"]')?.getAttribute('aria-pressed'),
    ).toBe('true')
    expect(container.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('alpha')
    expect(container.textContent).toContain('Alpha good')
    expect(container.textContent).not.toContain('Alpha low')

    await click('[data-mol-id="journal-filter-low"]')
    expect(url(router)).toBe('/journal?q=alpha&mood=low')
    expect(
      container.querySelector('[data-mol-id="journal-filter-low"]')?.getAttribute('aria-pressed'),
    ).toBe('true')

    expect(container.textContent).toContain('Alpha low')

    await reload(router)
    expect(
      container.querySelector('[data-mol-id="journal-filter-low"]')?.getAttribute('aria-pressed'),
    ).toBe('true')
    expect(container.textContent).toContain('Alpha low')

    await back(router)
    expect(url(router)).toBe('/journal?mood=good&q=alpha')
    expect(
      container.querySelector('[data-mol-id="journal-filter-good"]')?.getAttribute('aria-pressed'),
    ).toBe('true')

    await change('input[type="search"]', 'beta')
    expect(url(router)).toBe('/journal?mood=good&q=beta')
    await reload(router)
    expect(container.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('beta')
    expect(container.textContent).toContain('Beta good')
    await back(router)
    expect(url(router)).toBe('/journal?mood=good&q=alpha')
    expect(container.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('alpha')
  })
  it('Gifts receipt status restores the visible ledger after reload and Back', async () => {
    mocks.get.mockResolvedValue({
      data: [
        {
          id: 'cash',
          donor_id: 'a',
          donor_name: 'Cash donor',
          method: 'cash',
          receipted: false,
          amount_cents: 100,
          gift_date: '2026-01-01',
        },
        {
          id: 'card',
          donor_id: 'b',
          donor_name: 'Card donor',
          method: 'card',
          receipted: true,
          amount_cents: 200,
          gift_date: '2026-01-02',
        },
      ],
    })
    const router = await mount('/gifts', createElement(Gifts), '/gifts?receipted=yes')
    expect(container.querySelector('tbody')?.textContent).toContain('Card donor')
    expect(container.querySelector('tbody')?.textContent).not.toContain('Cash donor')
    const selector = 'select[aria-label="Filter by receipt status"]'
    await change(selector, 'no')
    expect(url(router)).toBe('/gifts?receipted=no')
    expect(container.querySelector('tbody')?.textContent).toContain('Cash donor')
    await reload(router)
    expect(container.querySelector<HTMLSelectElement>(selector)?.value).toBe('no')
    expect(container.querySelector('tbody')?.textContent).toContain('Cash donor')
    await back(router)
    expect(container.querySelector<HTMLSelectElement>(selector)?.value).toBe('yes')
    expect(container.querySelector('tbody')?.textContent).toContain('Card donor')
  })

  it('Inbox folders retain the mail filter through reload and Back', async () => {
    const router = await mount('/inbox', createElement(Inbox), '/inbox?folder=drafts&filter=ai')
    await click('[data-mol-id="inbox-folder-sent"]')
    expect(new URLSearchParams(router.state.location.search).get('folder')).toBe('sent')
    expect(new URLSearchParams(router.state.location.search).get('filter')).toBe('ai')
    await reload(router)
    expect(
      container.querySelector('[data-mol-id="inbox-filter-ai"]')?.getAttribute('aria-pressed'),
    ).toBe('true')
    await back(router)
    expect(new URLSearchParams(router.state.location.search).get('folder')).toBe('drafts')
    expect(
      container.querySelector('[data-mol-id="inbox-filter-ai"]')?.getAttribute('aria-pressed'),
    ).toBe('true')
  })
  it('Results stop filters survive reload and Back while retaining sort', async () => {
    const router = await mount(
      '/results',
      createElement(Results),
      '/results?stops=one_stop&sort=duration_minutes',
    )
    const button = (): HTMLButtonElement =>
      [...container.querySelectorAll('button')].find((item) => item.textContent === 'Nonstop only')!
    await act(async () => button().click())
    await flush()
    expect(new URLSearchParams(router.state.location.search).get('stops')).toBe('nonstop')
    expect(button().getAttribute('aria-pressed')).toBe('true')
    await reload(router)
    expect(button().getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector<HTMLSelectElement>('select')?.value).toBe('duration_minutes')
    await back(router)
    expect(new URLSearchParams(router.state.location.search).get('stops')).toBe('one_stop')
    expect(button().getAttribute('aria-pressed')).toBe('false')
  })
})

describe('food-delivery URL-owned category selection', () => {
  beforeEach(() =>
    mocks.get.mockImplementation(async (request: string) => ({
      data:
        request === '/api/restaurants'
          ? [
              { id: 'pizza', name: 'Pizza place', category: 'pizza' },
              { id: 'sushi', name: 'Sushi place', category: 'sushi' },
            ]
          : [],
    })),
  )
  it('food-delivery follows same-page query navigation and Back', async () => {
    const router = await mount(
      '/restaurants',
      createElement(Restaurants),
      '/restaurants?cuisine=pizza',
    )
    expect(
      container.querySelector('[data-testid="cuisine-pizza"]')?.getAttribute('aria-pressed'),
    ).toBe('true')
    await act(async () => {
      await router.navigate('/restaurants?cuisine=sushi')
    })
    await flush()
    expect(
      container.querySelector('[data-testid="cuisine-sushi"]')?.getAttribute('aria-pressed'),
    ).toBe('true')
    expect(container.querySelector('[data-testid="restaurants-section"]')?.textContent).toContain(
      'Sushi place',
    )
    expect(
      container.querySelector('[data-testid="restaurants-section"]')?.textContent,
    ).not.toContain('Pizza place')
    await back(router)
    expect(
      container.querySelector('[data-testid="cuisine-pizza"]')?.getAttribute('aria-pressed'),
    ).toBe('true')
  })
  it('food-delivery category controls write URL history and survive reload', async () => {
    const router = await mount(
      '/restaurants',
      createElement(Restaurants),
      '/restaurants?cuisine=pizza',
    )
    await click('[data-testid="cuisine-sushi"]')
    expect(new URLSearchParams(router.state.location.search).get('cuisine')).toBe('sushi')
    await reload(router)
    expect(
      container.querySelector('[data-testid="cuisine-sushi"]')?.getAttribute('aria-pressed'),
    ).toBe('true')
    await back(router)
    expect(
      container.querySelector('[data-testid="cuisine-pizza"]')?.getAttribute('aria-pressed'),
    ).toBe('true')
  })
})
