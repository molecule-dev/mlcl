// @vitest-environment jsdom
import type { ReactNode } from 'react'
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

vi.mock('../components/AppShell.js', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
vi.mock('../components/PostListHeader.js', () => ({ default: () => null }))
vi.mock('../components/PostListItem.js', () => ({
  default: ({ title }: { title: string }) => <p data-row>{title}</p>,
}))
vi.mock('@molecule/app-analytics', () => ({ track: vi.fn() }))
vi.mock('@molecule/app-ui-react', () => ({ ConfirmButton: () => null }))
import { PostList } from '../pages/PostList.js'
import { Tags } from '../pages/Tags.js'
import {
  change,
  click,
  clickText,
  go,
  host,
  mount,
  render,
  router,
  url,
} from './route-test-utils.js'
beforeEach(() => {
  vi.resetAllMocks()
  session.status = 'authenticated'
  http.get.mockImplementation(async (path: string) => {
    const params = new URL(path, 'https://test.local').searchParams
    if (path.startsWith('/api/tags'))
      return {
        data: {
          data: Array.from({ length: 18 }, (_, i) => ({
            id: String(i + 1),
            name: 'Tag ' + String(i + 1).padStart(2, '0'),
            post_count: 18 - i,
          })),
          total: 18,
        },
      }
    return {
      data: {
        data: [
          { id: 'p1', title: (params.get('status') ?? 'all') + ' page ' + params.get('page') },
        ],
        total: 60,
      },
    }
  })
})
describe('blog real URL-backed lists', () => {
  it('loads a direct status/page link, resets the tab and restores it both ways', async () => {
    const initial = '/posts?status=draft&page=2&track=a&track=b#rows'
    await mount(<PostList />, initial)
    expect(host.textContent).toContain('draft page 2')
    expect(host.textContent).toContain('Showing 21-40 of 60 stories')
    expect(http.get).toHaveBeenCalledWith(
      '/api/posts/mine/all?status=draft&page=2&limit=20&include_total=true',
    )
    await clickText('Published')
    expect(url()).toBe('/posts?track=a&track=b&status=published#rows')
    expect(host.textContent).toContain('published page 1')
    await go(-1)
    expect(host.textContent).toContain('draft page 2')
    await go(1)
    await mount(<PostList />, url())
    expect(host.textContent).toContain('published page 1')
  })
  it('does not load private drafts while auth is loading or signed out', async () => {
    session.status = 'loading'
    await mount(<PostList />, '/posts?status=draft&page=2')
    expect(http.get).not.toHaveBeenCalled()
    session.status = 'unauthenticated'
    await render(<PostList />)
    expect(url()).toBe('/login')
    expect(router.state.location.state).toEqual({ returnTo: '/posts?status=draft&page=2' })
    expect(http.get).not.toHaveBeenCalled()
  })
  it('honors tags sort/search/page on reload and resets sort atomically', async () => {
    const initial = '/tags?sort=alpha&q=Tag&page=2&track=a&track=b#rows'
    await mount(<Tags />, initial)
    expect(host.textContent).toContain('Tag 09')
    expect(host.querySelector('tbody')?.textContent).not.toContain('Tag 01')
    await change('[data-mol-id=select-sort-tags]', 'recent')
    expect(url()).toBe('/tags?q=Tag&track=a&track=b&sort=recent#rows')
    await go(-1)
    expect(host.textContent).toContain('Tag 09')
    await go(1)
    await mount(<Tags />, url())
    expect(host.querySelector<HTMLSelectElement>('[data-mol-id=select-sort-tags]')?.value).toBe(
      'recent',
    )
    await click('[data-mol-id=btn-page-next]')
    expect(new URL(url(), 'https://test.local').searchParams.get('page')).toBe('2')
  })
})
