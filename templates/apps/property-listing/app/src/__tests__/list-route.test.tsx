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

import Pagination from '../components/Pagination.js'
import { clickText, go, host, mount, url } from './route-test-utils.js'
beforeEach(() => vi.resetAllMocks())
describe('demo pagination URL state', () => {
  it('preserves queries and hash across page changes, reload and history', async () => {
    await mount(<Pagination />, '/leads?page=2&source=web&track=a&track=b#rows')
    expect(host.textContent).toContain('5')
    await clickText('chevron_right')
    expect(url()).toBe('/leads?source=web&track=a&track=b&page=3#rows')
    await go(-1)
    expect(url()).toContain('page=2')
    await go(1)
    const next = url()
    await mount(<Pagination />, next)
    expect(url()).toBe(next)
    expect(host.textContent).toContain('9')
  })
})
