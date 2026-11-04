// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { http, session, t } = vi.hoisted(() => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  session: {
    user: { id: 'u1' },
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
  default: ({ children, topBar }: { children: ReactNode; topBar: ReactNode }) => (
    <>
      {topBar}
      {children}
    </>
  ),
}))
vi.mock('@molecule/app-ui-react', () => ({
  ResponsiveAppShell: { TopBar: ({ brand }: { brand: ReactNode }) => <>{brand}</> },
}))
vi.mock('../components/TicketsFab.js', () => ({ default: () => null }))
vi.mock('../components/TicketsTable.js', () => ({
  default: ({ tickets }: { tickets: { id: string; subject: string }[] }) => (
    <>
      {tickets.map((t) => (
        <p data-row key={t.id}>
          {t.subject}
        </p>
      ))}
    </>
  ),
}))
vi.mock('../lib/demo-ticket-display.js', () => ({ enrichTicketListRow: (row: unknown) => row }))
import { Tickets } from '../pages/Tickets.js'
import { change, clickText, go, host, mount, render, router, url } from './route-test-utils.js'
beforeEach(() => {
  vi.resetAllMocks()
  session.status = 'authenticated'
  http.get.mockResolvedValue({
    data: Array.from({ length: 25 }, (_, i) => ({
      id: String(i + 1),
      subject: 'Ticket ' + (i + 1),
      status: 'open',
      priority: i % 2 ? 'high' : 'low',
      assignee_id: i % 2 ? 'u1' : null,
      assignee_name: i % 2 ? 'Ada' : undefined,
    })),
  })
})
describe('ticket filters and protected views', () => {
  it('reads a deep link, resets filters and restores the old tab and page', async () => {
    const initial = '/tickets?view=unassigned&page=2&track=a&track=b#rows'
    await mount(<Tickets />, initial)
    expect(host.textContent).toContain('Ticket 21')
    await clickText('Assigned')
    expect(url()).toBe('/tickets?track=a&track=b&view=assigned#rows')
    expect(host.textContent).toContain('Ticket 2')
    await go(-1)
    expect(host.textContent).toContain('Ticket 21')
    await go(1)
    await mount(<Tickets />, url())
    expect(host.textContent).toContain('Ticket 2')
    await change('select', 'open')
    expect(new URL(url(), 'https://test.local').searchParams.get('status')).toBe('open')
  })
  it('waits for auth, then redirects without requesting protected tickets', async () => {
    session.status = 'loading'
    await mount(<Tickets />, '/tickets?view=assigned&page=2')
    expect(http.get).not.toHaveBeenCalled()
    session.status = 'unavailable'
    await render(<Tickets />)
    expect(url()).toBe('/tickets?view=assigned&page=2')
    expect(http.get).not.toHaveBeenCalled()
    session.status = 'unauthenticated'
    await render(<Tickets />)
    expect(url()).toBe('/login')
    expect(router.state.location.state).toEqual({ returnTo: '/tickets?view=assigned&page=2' })
    expect(http.get).not.toHaveBeenCalled()
  })

  it('uses the signed-in user ID for Assigned to me and assignment IDs for Unassigned', async () => {
    http.get.mockResolvedValue({
      data: [
        { id: '1', subject: 'Mine without a display name', assignee_id: 'u1' },
        { id: '2', subject: 'Another agent', assignee_id: 'u2', assignee_name: 'Grace' },
        { id: '3', subject: 'No assignee', assignee_id: null },
      ],
    })
    await mount(<Tickets />, '/tickets?view=assigned')
    expect(host.textContent).toContain('Mine without a display name')
    expect(host.textContent).not.toContain('Another agent')
    await clickText('Unassigned')
    expect(host.querySelectorAll('[data-row]')).toHaveLength(1)
    expect(host.textContent).toContain('No assignee')
    expect(host.textContent).not.toContain('Mine without a display name')
  })

  it('shows a failed request and retries the current URL', async () => {
    http.get.mockRejectedValueOnce(new Error('List is offline'))
    await mount(<Tickets />, '/tickets')
    expect(host.querySelector('[role=alert]')?.textContent).toContain('List is offline')
    await clickText('Try again')
    expect(host.querySelector('[role=alert]')).toBeNull()
    expect(host.textContent).toContain('Ticket 1')
  })
})
