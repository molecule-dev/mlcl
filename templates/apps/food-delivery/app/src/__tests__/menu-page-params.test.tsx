// @vitest-environment jsdom
/**
 * The menu page reads the restaurant id from its URL through `@molecule/app-react`'s
 * `useParams`, under the routing bond's router as the app mounts it: the request names the
 * restaurant the address names.
 */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { Route, Routes } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'

import { MemoryRouter } from '@molecule/app-routing-react-router'

const { http } = vi.hoisted(() => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

// Only the HTTP client and the translator are stand-ins: the routing hooks are the real ones.
vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useHttpClient: () => http,
  useTranslation: () => ({
    t: (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

import { MenuPage } from '../pages/MenuPage.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const cleanups: (() => void)[] = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  vi.resetAllMocks()
})

it('requests the menu of the restaurant its URL names', async () => {
  http.get.mockResolvedValue({ data: { categories: {} } })
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
          <Route path="/restaurant/:id" element={<MenuPage />} />
        </Routes>
      </MemoryRouter>,
    )
  })

  expect(http.get).toHaveBeenCalledWith('/api/menu/restaurant/r1')
})
