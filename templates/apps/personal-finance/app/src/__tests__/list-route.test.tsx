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

vi.mock('../components/FinanceShell.js', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
vi.mock('../components/UserMenu.js', () => ({ UserMenu: () => null }))
vi.mock('@molecule/app-transactions-table-react', () => ({
  TransactionsTable: ({
    transactions,
    footer,
    loading,
  }: {
    transactions: { id: string; description: string }[]
    footer: ReactNode
    loading: boolean
  }) => (
    <>
      {!loading &&
        transactions.map((tx) => (
          <p data-row key={tx.id}>
            {tx.description}
          </p>
        ))}
      {footer}
    </>
  ),
}))

import { Transactions } from '../pages/Transactions.js'
import { change, clickText, go, host, mount, render, router, url } from './route-test-utils.js'

beforeEach(() => {
  vi.resetAllMocks()
  session.status = 'authenticated'
  http.get.mockImplementation(async (path: string) => {
    const query = new URL(path, 'https://test.local').searchParams
    const offset = Number(query.get('offset') ?? 0)
    const limit = Number(query.get('limit') ?? 50)
    const type = query.get('type') ?? 'all'
    const all = Array.from({ length: 25 }, (_, i) => ({
      id: String(i + 1),
      description: type + ' transaction ' + (i + 1),
      account_id: 'a1',
      amount: 10,
      type,
      category_name: 'income',
      notes: '',
      date: '2026-11-01',
    }))
    const needle = (query.get('search') ?? '').toLowerCase()
    const matching = all.filter((row) => !needle || row.description.toLowerCase().includes(needle))
    const rows = matching.slice(offset, offset + limit)
    return {
      data: query.get('include_total') === 'true' ? { data: rows, total: matching.length } : rows,
    }
  })
})

describe('transaction route state with the real router', () => {
  it('honors a direct type/page/range link and requests its twelve-row offset', async () => {
    const initial =
      '/transactions?type=income&range=month&page=2&search=transaction&track=a&track=b#rows'
    await mount(<Transactions />, initial)
    const request = new URL(http.get.mock.calls.at(-1)![0], 'https://test.local')
    expect(request.searchParams.get('type')).toBe('income')
    expect(request.searchParams.get('limit')).toBe('12')
    expect(request.searchParams.get('offset')).toBe('12')
    expect(request.searchParams.get('start_date')).toBeTruthy()
    expect(host.querySelectorAll('[data-row]')).toHaveLength(12)
    expect(host.textContent).toContain('income transaction 13')
    expect(host.textContent).not.toContain('income transaction 1income')
    expect(host.textContent).toContain('of 25 transactions')
    await mount(<Transactions />, url()) // fresh mount is the reload contract
    expect(url()).toBe(initial)
    expect(host.textContent).toContain('income transaction 13')
  })
  it('changes tab atomically, retains unrelated query values, and restores both directions', async () => {
    const initial = '/transactions?type=income&page=2&search=transaction&track=a&track=b#rows'
    await mount(<Transactions />, initial)
    http.get.mockClear()
    await clickText('Expenses')
    expect(url()).toBe('/transactions?search=transaction&track=a&track=b&type=expense#rows')
    expect(host.querySelector('[role=tab][aria-selected=true]')?.textContent).toBe('Expenses')
    expect(http.get.mock.calls).toHaveLength(1)
    expect(
      new URL(http.get.mock.calls[0][0], 'https://test.local').searchParams.get('offset'),
    ).toBe('0')
    await go(-1)
    expect(url()).toBe(initial)
    expect(host.textContent).toContain('income transaction 13')
    await go(1)
    expect(host.textContent).toContain('expense transaction 1')
    await clickText('Today')
    expect(new URL(url(), 'https://test.local').searchParams.get('range')).toBe('today')
    await clickText('All Time')
    expect(new URL(url(), 'https://test.local').searchParams.has('range')).toBe(false)
  })
  it('paginates real rows and uses server totals for the last page', async () => {
    await mount(<Transactions />, '/transactions?track=a')
    await clickText('Next')
    expect(url()).toBe('/transactions?track=a&page=2')
    expect(host.textContent).toContain('all transaction 13')
    await clickText('Next')
    expect(host.querySelectorAll('[data-row]')).toHaveLength(1)
    const next = [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Next'))!
    expect(next.disabled).toBe(true)
    await clickText('Previous')
    expect(host.textContent).toContain('all transaction 13')
  })
  it('falls back from unknown tab/range and preserves the public query contract', async () => {
    await mount(<Transactions />, '/transactions?type=unknown&range=unknown')
    expect(host.querySelector('[role=tab][aria-selected=true]')?.textContent).toBe('All')
    const params = new URL(http.get.mock.calls.at(-1)![0], 'https://test.local').searchParams
    expect(params.has('type')).toBe(false)
    expect(params.has('start_date')).toBe(false)
  })
  it('waits for real auth readiness and replaces a signed-out protected visit', async () => {
    session.status = 'loading'
    await mount(<Transactions />, '/transactions?type=expense&page=2#rows')
    expect(http.get).not.toHaveBeenCalled()
    session.status = 'unavailable'
    await render(<Transactions />)
    expect(http.get).not.toHaveBeenCalled()
    expect(url()).toBe('/transactions?type=expense&page=2#rows')
    session.status = 'unauthenticated'
    await render(<Transactions />)
    expect(url()).toBe('/login')
    expect(router.state.location.state).toEqual({
      returnTo: '/transactions?type=expense&page=2#rows',
    })
    expect(http.get).not.toHaveBeenCalled()
  })
  it('loads the retained URL after authentication becomes ready', async () => {
    session.status = 'loading'
    await mount(<Transactions />, '/transactions?type=income&page=2')
    expect(http.get).not.toHaveBeenCalled()
    session.status = 'authenticated'
    await render(<Transactions />)
    expect(host.textContent).toContain('income transaction 13')
    expect(url()).toBe('/transactions?type=income&page=2')
  })

  it('ignores a late response from the previous tab', async () => {
    let finish!: (response: unknown) => void
    http.get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    await mount(<Transactions />, '/transactions?type=income')
    await clickText('Expenses')
    expect(host.textContent).toContain('expense transaction 1')
    await act(async () => finish({ data: [{ id: 'late', description: 'stale income' }] }))
    expect(host.textContent).toContain('expense transaction 1')
    expect(host.textContent).not.toContain('stale income')
  })

  it('searches before pagination and keeps the tab, history, and unrelated query values in the real header', async () => {
    await mount(<Transactions />, '/transactions?type=income&page=2&track=a&track=b#rows')
    await change('input[placeholder="Search transactions..."]', '25')
    let params = new URL(url(), 'https://test.local').searchParams
    expect(params.get('type')).toBe('income')
    expect(params.get('search')).toBe('25')
    expect(params.has('page')).toBe(false)
    expect(params.getAll('track')).toEqual(['a', 'b'])
    expect(host.textContent).toContain('income transaction 25')
    expect(host.querySelectorAll('[data-row]')).toHaveLength(1)
    const input = host.querySelector<HTMLInputElement>(
      'input[placeholder="Search transactions..."]',
    )!
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    params = new URL(url(), 'https://test.local').searchParams
    expect(params.get('type')).toBe('income')
    expect(params.getAll('track')).toEqual(['a', 'b'])
    await go('/transactions?type=expense&search=2')
    expect(input.value).toBe('2')
    await go(-1)
    expect(input.value).toBe('25')
    expect(host.textContent).toContain('income transaction 25')
  })

  it('finds a search match outside the first server page', async () => {
    await mount(<Transactions />, '/transactions?search=25')
    expect(host.textContent).toContain('all transaction 25')
    expect(host.querySelectorAll('[data-row]')).toHaveLength(1)
    expect(host.textContent).toContain('of 1 transactions')
  })

  it('uses local calendar dates for Today and This Month in a positive UTC offset', async () => {
    vi.stubEnv('TZ', 'Europe/Tallinn')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-14T22:30:00Z'))
    try {
      await mount(<Transactions />, '/transactions?range=today')
      expect(
        new URL(http.get.mock.calls.at(-1)![0], 'https://test.local').searchParams.get(
          'start_date',
        ),
      ).toBe('2026-11-15')
      await clickText('This Month')
      expect(
        new URL(http.get.mock.calls.at(-1)![0], 'https://test.local').searchParams.get(
          'start_date',
        ),
      ).toBe('2026-11-01')
    } finally {
      vi.useRealTimers()
      vi.unstubAllEnvs()
    }
  })
})
