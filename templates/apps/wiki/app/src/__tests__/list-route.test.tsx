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

vi.mock('@molecule/app-analytics', () => ({ track: vi.fn() }))
import { VersionHistory } from '../pages/VersionHistory.js'
import { click, go, host, mount, url } from './route-test-utils.js'
beforeEach(() => {
  vi.resetAllMocks()
  http.get.mockImplementation(async (path: string) => ({
    data: path.endsWith('/versions')
      ? [1, 3, 2].map((version) => ({
          id: 'v' + version,
          version,
          content: 'Version content ' + version,
          created_at: '2026-11-01',
        }))
      : { id: 'p1', version: 3 },
  }))
})
describe('wiki version URL contract', () => {
  it('selects the numbered version, preserves unrelated values and restores the diff both ways', async () => {
    const initial = '/page/p1/history?v=2&track=a&track=b#diff'
    await mount(<VersionHistory />, initial, '/page/:id/history')
    expect(host.querySelector('[data-testid=version-diff] h2')?.textContent).toBe(
      'Comparing v1 with v2',
    )
    await click('[data-testid=version-row-1]')
    expect(url()).toBe('/page/p1/history?track=a&track=b&v=1#diff')
    await go(-1)
    expect(host.querySelector('[data-testid=version-diff] h2')?.textContent).toBe(
      'Comparing v1 with v2',
    )
    await go(1)
    const next = url()
    await mount(<VersionHistory />, next, '/page/:id/history')
    expect(host.querySelector('[data-testid=version-diff] h2')?.textContent).toBe(
      'Initial version v1',
    )
  })
  it.each(['', '?v=404', '?v=0', '?v=NaN', '?v=2oops', '?v=9007199254740992'])(
    'safely selects the newest version for %s',
    async (suffix) => {
      await mount(<VersionHistory />, '/page/p1/history' + suffix, '/page/:id/history')
      expect(host.querySelector('[data-testid=version-diff] h2')?.textContent).toBe(
        'Comparing v2 with v3',
      )
      expect(host.querySelector<HTMLButtonElement>('[data-testid=version-restore]')?.disabled).toBe(
        true,
      )
    },
  )
})
