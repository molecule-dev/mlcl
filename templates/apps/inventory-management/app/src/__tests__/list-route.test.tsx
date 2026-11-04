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
import { Inventory } from '../pages/Inventory.js'
import { change, clickText, go, host, mount, url } from './route-test-utils.js'
beforeEach(() => {
  vi.resetAllMocks()
  http.get.mockImplementation(async (path: string) => ({
    data: path.includes('valuation')
      ? {
          items: Array.from({ length: 25 }, (_, i) => ({
            product_id: String(i + 1),
            quantity: 20,
          })),
        }
      : Array.from({ length: 25 }, (_, i) => ({
          id: String(i + 1),
          name: 'Widget ' + (i + 1),
          sku: 'SKU-' + (i + 1),
          category: 'Tools',
        })),
  }))
})
describe('inventory real URL filters', () => {
  it('reloads a page and restores filters through history without losing unrelated queries', async () => {
    const initial = '/inventory?q=Widget&category=Tools&stock=in&page=2&track=a&track=b#rows'
    await mount(<Inventory />, initial)
    expect(host.textContent).toContain('Widget 9')
    await change('[data-testid=inventory-search]', 'Widget 1')
    expect(new URL(url(), 'https://test.local').searchParams.has('page')).toBe(false)
    expect(new URL(url(), 'https://test.local').searchParams.getAll('track')).toEqual(['a', 'b'])
    await clickText('Next')
    expect(new URL(url(), 'https://test.local').searchParams.get('page')).toBe('2')
    await go(-1)
    expect(new URL(url(), 'https://test.local').searchParams.has('page')).toBe(false)
    await go(1)
    const next = url()
    await mount(<Inventory />, next)
    expect(url()).toBe(next)
    expect(host.querySelector<HTMLInputElement>('[data-testid=inventory-search]')?.value).toBe(
      'Widget 1',
    )
  })
})
