// @vitest-environment jsdom
import { act, type ReactNode } from 'react'
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

vi.mock('@molecule/app-admin-table-react', () => ({
  AdminTable: ({
    rows,
    footer,
    loading,
  }: {
    rows: { id: string }[]
    footer: ReactNode
    loading: boolean
  }) => (
    <>
      {!loading &&
        rows.map((row) => (
          <p data-row key={row.id}>
            {row.id}
          </p>
        ))}
      {footer}
    </>
  ),
}))
import AdminOrdersFiltersBar from '../components/AdminOrdersFiltersBar.js'
import { AdminOrdersTable } from '../components/AdminOrdersTable.js'
import AdminOrdersTopBar from '../components/AdminOrdersTopBar.js'
import { change, click, clickText, go, host, mount, url } from './route-test-utils.js'
beforeEach(() => {
  vi.resetAllMocks()
  http.get.mockImplementation(async (path: string) => {
    const query = new URL(path, 'https://test.local').searchParams
    const page = Number(query.get('page') ?? 1)
    const limit = Number(query.get('limit') ?? 50)
    return {
      data: {
        data: Array.from(
          { length: Math.min(limit, Math.max(0, 25 - (page - 1) * limit)) },
          (_, i) => ({ id: 'order-' + ((page - 1) * limit + i + 1) }),
        ),
        total: 25,
      },
    }
  })
})
describe('admin order route pagination', () => {
  it('loads the requested page with the same page size as the footer', async () => {
    await mount(<AdminOrdersTable />, '/admin?view=orders&page=2&track=a&track=b#rows')
    expect(http.get).toHaveBeenCalledWith('/api/admin/orders?page=2&limit=10')
    expect(host.querySelectorAll('[data-row]')).toHaveLength(10)
    expect(host.textContent).toContain('order-11')
    expect(host.textContent).toContain('25 entries')
    await click('[data-mol-id=page-3]')
    expect(url()).toBe('/admin?view=orders&track=a&track=b&page=3#rows')
    expect(host.querySelectorAll('[data-row]')).toHaveLength(5)
    expect(host.textContent).toContain('order-21')
    await go(-1)
    expect(host.textContent).toContain('order-11')
    await go(1)
    expect(host.textContent).toContain('order-21')
    await mount(<AdminOrdersTable />, url())
    expect(host.textContent).toContain('order-21')
    await clickText('chevron_right')
    expect(new URL(url(), 'https://test.local').searchParams.get('page')).toBe('3')
  })
  it('does not offer fake pages or negative ranges for an empty list', async () => {
    http.get.mockResolvedValue({ data: { data: [], total: 0 } })
    await mount(<AdminOrdersTable />, '/admin?view=orders')
    expect(host.querySelector('[data-mol-id=page-2]')).toBeNull()
    expect(host.textContent).toContain('0 entries')
    expect(host.textContent).not.toContain('1,284')
  })

  it('ignores a late response from the previous page', async () => {
    let finish!: (response: unknown) => void
    http.get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    await mount(<AdminOrdersTable />, '/admin?page=1')
    await go('/admin?page=2')
    expect(host.textContent).toContain('order-11')
    await act(async () => finish({ data: { data: [{ id: 'stale-order' }], total: 25 } }))
    expect(host.textContent).toContain('order-11')
    expect(host.textContent).not.toContain('stale-order')
  })

  it('keeps both search boxes, status, date and table requests on one URL contract', async () => {
    const page = (
      <>
        <AdminOrdersTopBar />
        <AdminOrdersFiltersBar />
        <AdminOrdersTable />
      </>
    )
    await mount(page, '/admin/orders?status=pending&date=7d&q=order&page=2&track=a&track=b#rows')
    expect(host.querySelector<HTMLInputElement>('[data-mol-id=order-search]')?.value).toBe('order')
    expect(host.querySelector<HTMLInputElement>('[data-mol-id=global-search]')?.value).toBe('order')
    expect(host.querySelector<HTMLSelectElement>('[data-mol-id=status-filter]')?.value).toBe(
      'pending',
    )
    expect(host.querySelector<HTMLSelectElement>('[data-mol-id=date-filter]')?.value).toBe('7d')
    let params = new URL(http.get.mock.calls.at(-1)![0], 'https://test.local').searchParams
    expect(params.get('status')).toBe('pending')
    expect(params.get('q')).toBe('order')
    expect(params.get('start_date')).toBeTruthy()
    expect(params.get('end_date')).toBeTruthy()
    await change('[data-mol-id=status-filter]', 'shipped')
    expect(new URL(url(), 'https://test.local').searchParams.has('page')).toBe(false)
    expect(new URL(url(), 'https://test.local').searchParams.getAll('track')).toEqual(['a', 'b'])
    await go(-1)
    expect(host.querySelector<HTMLSelectElement>('[data-mol-id=status-filter]')?.value).toBe(
      'pending',
    )
    expect(new URL(url(), 'https://test.local').searchParams.get('page')).toBe('2')
    await change('[data-mol-id=global-search]', 'Ada')
    expect(host.querySelector<HTMLInputElement>('[data-mol-id=order-search]')?.value).toBe('Ada')
    params = new URL(http.get.mock.calls.at(-1)![0], 'https://test.local').searchParams
    expect(params.get('q')).toBe('Ada')
    await mount(page, url())
    expect(host.querySelector<HTMLInputElement>('[data-mol-id=global-search]')?.value).toBe('Ada')
  })

  it('shows a failed request and retries the current URL', async () => {
    http.get.mockRejectedValueOnce(new Error('List is offline'))
    await mount(<AdminOrdersTable />, '/admin/orders')
    expect(host.querySelector('[role=alert]')?.textContent).toContain('List is offline')
    await clickText('Try again')
    expect(host.querySelector('[role=alert]')).toBeNull()
    expect(host.textContent).toContain('order-1')
  })
})
