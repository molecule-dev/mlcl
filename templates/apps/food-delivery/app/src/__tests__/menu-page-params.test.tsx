// @vitest-environment jsdom
/**
 * The restaurant menu page (`/restaurant/:id`) reads the restaurant id from its URL under the
 * routing bond's router as the app mounts it: the request names the restaurant the address names.
 */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { Route, Routes } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'

import { MemoryRouter } from '@molecule/app-routing-react-router'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

const { http, translation } = vi.hoisted(() => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  // One translator for every render, as the provider gives: the page reloads when `t` changes.
  translation: {
    t: (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  },
}))

// Only the HTTP client and the translator are stand-ins: the routing hooks are the real ones.
vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useHttpClient: () => http,
  useTranslation: () => translation,
}))

import { RestaurantMenu } from '../pages/RestaurantMenu.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
setClassMap(classMap)

const cleanups: (() => void)[] = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  vi.resetAllMocks()
})

it('requests the menu of the restaurant its URL names', async () => {
  http.get.mockResolvedValue({
    status: 200,
    data: {
      restaurant: {
        id: 'r1',
        name: 'Sushi Bar',
        cuisine: 'japanese',
        description: '',
        rating: 4.5,
        review_count: 10,
        estimated_delivery_min: 30,
        delivery_fee_cents: 299,
        minimum_order_cents: 1000,
      },
      items: [],
      categories: {},
    },
  })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  cleanups.push(() => {
    act(() => root.unmount())
    host.remove()
  })

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/restaurant/r1']}>
        <Routes>
          <Route path="/restaurant/:id" element={<RestaurantMenu />} />
        </Routes>
      </MemoryRouter>,
    )
  })

  expect(http.get).toHaveBeenCalledWith('/api/menu/restaurant/r1')
})
