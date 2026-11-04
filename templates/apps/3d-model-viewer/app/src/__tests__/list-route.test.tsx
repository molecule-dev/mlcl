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

vi.mock('../components/ModelLibraryGrid.js', () => ({
  default: ({ models }: { models: { id: string; name: string }[] }) => (
    <>
      {models.map((row) => (
        <p data-row key={row.id}>
          {row.name}
        </p>
      ))}
    </>
  ),
}))
vi.mock('../components/ModelLibraryHeader.js', () => ({ default: () => null }))
import { ModelLibrary } from '../pages/ModelLibrary.js'
import { change, clickText, go, host, mount, url } from './route-test-utils.js'
beforeEach(() => {
  vi.resetAllMocks()
  http.get.mockResolvedValue({
    data: Array.from({ length: 30 }, (_, i) => ({
      id: String(i + 1),
      name: 'Model ' + String(i + 1).padStart(2, '0'),
      category: 'architecture',
      format: i % 2 ? 'glb' : 'obj',
      file_size: i + 1,
      polygon_count: i * 10,
    })),
  })
})
describe('model library real URL state', () => {
  it('retains category/search/unrelated query values in href links and restores pages', async () => {
    await mount(<ModelLibrary />, '/models?page=2&q=Model&track=a&track=b#rows')
    expect(host.querySelectorAll('[data-row]')).toHaveLength(12)
    expect(host.textContent).toContain('Model 13')
    const link = [...host.querySelectorAll('a')].find((el) =>
      el.textContent?.includes('Architecture'),
    )!
    expect(link.getAttribute('href')).toBe(
      '/models?q=Model&track=a&track=b&category=architecture#rows',
    )
    await clickText('Architecture')
    expect(url()).toBe(link.getAttribute('href'))
    await go(-1)
    expect(host.textContent).toContain('Model 13')
    await go(1)
    await mount(<ModelLibrary />, url())
    expect(host.textContent).toContain('Model 01')
  })
  it('restores refinements with page history and resets the page for sort changes', async () => {
    await mount(<ModelLibrary />, '/models?page=2')
    await clickText('GLB')
    expect(new URL(url(), 'https://test.local').searchParams.get('format')).toBe('GLB')
    expect(new URL(url(), 'https://test.local').searchParams.has('page')).toBe(false)
    await go(-1)
    expect(host.textContent).toContain('Model 13')
    await change('select', 'Name')
    expect(new URL(url(), 'https://test.local').searchParams.get('sort')).toBe('Name')
    expect(new URL(url(), 'https://test.local').searchParams.has('page')).toBe(false)
    await mount(<ModelLibrary />, '/models?format=GLB&polycount=50&sort=Size')
    expect(host.querySelector('input[type=range]')?.getAttribute('value')).toBe('50')
    expect(host.querySelector('select')?.value).toBe('Size')
    expect(host.textContent).toContain('Model 14')
    expect(host.textContent).not.toContain('Model 30')
  })
})
