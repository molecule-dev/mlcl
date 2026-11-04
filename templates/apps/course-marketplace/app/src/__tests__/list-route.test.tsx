// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { http, session, t } = vi.hoisted(() => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  session: {
    status: 'authenticated' as 'loading' | 'authenticated' | 'unauthenticated' | 'unavailable',
  },
  t: (key: string, values: Record<string, unknown> = {}, options?: { defaultValue?: string }) =>
    (options?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
      String(values[key] ?? ''),
    ),
}))
vi.mock('@molecule/app-react', () => ({
  useHttpClient: () => http,
  useTranslation: () => ({ t }),
  useAuth: () => session,
}))

vi.mock('../components/Header.js', () => ({ Header: () => null }))
vi.mock('../components/Footer.js', () => ({ Footer: () => null }))
vi.mock('../components/CourseTile.js', () => ({
  CourseTile: ({ title }: { title: string }) => <p data-row>{title}</p>,
}))
vi.mock('../lib/api.js', () => ({ api: (path: string) => http.get(path) }))
import { Browse } from '../pages/Browse.js'
import { change, click, go, host, mount, url } from './route-test-utils.js'
beforeEach(() => {
  vi.resetAllMocks()
  http.get.mockImplementation(async (path: string) =>
    path.startsWith('/courses/categories')
      ? [{ name: 'Design' }]
      : Array.from({ length: 30 }, (_, i) => ({
          id: String(i + 1),
          title: 'Course ' + (i + 1),
          price_cents: 0,
        })),
  )
})
describe('browse real URL state', () => {
  it('keeps a direct page on fetch, resets category/search atomically, and walks history', async () => {
    const initial = '/browse?q=design&page=2&track=a&track=b#rows'
    await mount(<Browse />, initial)
    expect(host.querySelectorAll('[data-row]')).toHaveLength(9)
    expect(host.textContent).toContain('Course 10')
    expect(url()).toBe(initial)
    await click('[data-mol-id=filter-Design]')
    expect(url()).toBe('/browse?track=a&track=b&category=Design#rows')
    await go(-1)
    expect(host.textContent).toContain('Course 10')
    await go(1)
    await mount(<Browse />, url())
    expect(http.get.mock.calls.at(-1)![0]).toContain('category=Design')
  })
  it('restores level/price/sort refinements instead of combining old pages with new local filters', async () => {
    await mount(<Browse />, '/browse?page=2')
    await click('[data-mol-id=level-beginner]')
    expect(new URL(url(), 'https://test.local').searchParams.get('level')).toBe('beginner')
    await go(-1)
    expect(host.querySelector<HTMLInputElement>('[data-mol-id=level-beginner]')?.checked).toBe(
      false,
    )
    expect(host.textContent).toContain('Course 10')
    await mount(<Browse />, '/browse?level=advanced&price=under-50&sort=rating&page=2')
    const params = new URL(http.get.mock.calls.at(-1)![0], 'https://test.local').searchParams
    expect(params.get('level')).toBe('advanced')
    expect(params.get('price_min')).toBe('1')
    expect(params.get('price_max')).toBe('4999')
    expect(params.get('sort')).toBe('rating')
    await change('select#sort', 'recent')
    expect(new URL(url(), 'https://test.local').searchParams.has('page')).toBe(false)
    await click('[data-mol-id=level-advanced]')
    expect(new URL(url(), 'https://test.local').searchParams.has('level')).toBe(false)
  })
})
