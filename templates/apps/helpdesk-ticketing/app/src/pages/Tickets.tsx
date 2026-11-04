// Phase 1 baseline — verbatim JSX of design-helpdesk-ticketing-tickets.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { useListRoute } from '@molecule/app-routing-react-router'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import AppShell from '../components/AppShell.js'
import TicketsFab from '../components/TicketsFab.js'
import TicketsFilterBar from '../components/TicketsFilterBar.js'
import TicketsPagination from '../components/TicketsPagination.js'
import TicketsTable from '../components/TicketsTable.js'
import TicketsTopNavBar from '../components/TicketsTopNavBar.js'
import { enrichTicketListRow } from '../lib/demo-ticket-display.js'

interface Ticket {
  id: string
  subject: string
  status: string
  priority: string
  category?: string | null
  created_at: string
  updated_at?: string
  assignee_id?: string | null
  requester_id?: string | null
  requester_name?: string
  assignee_name?: string
  assignee_avatar?: string
  sla?: string
}

function Tickets() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { status, user } = useAuth<{ id: string }>()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  useEffect(() => {
    document.title = t(
      'tickets.pageTitle',
      { appName: APP_NAME },
      { defaultValue: 'Tickets — {{appName}} Support' },
    )
  }, [t])
  // The list's page, tab, filters and search live in the URL (?page=, ?view=,
  // ?status=, ?priority=, ?assignee=, ?q=) via useListRoute — no mirrored
  // state, so page links, Back/Forward and reloads keep the view.
  const listRoute = useListRoute({
    pageSize: 10,
    filters: {
      q: {},
      status: { defaultValue: '' },
      priority: { defaultValue: '' },
      assignee: { defaultValue: '' },
    },
    selections: {
      all: { path: '/tickets', query: { view: undefined }, requiresAuth: true },
      assigned: { path: '/tickets', query: { view: 'assigned' }, requiresAuth: true },
      unassigned: { path: '/tickets', query: { view: 'unassigned' }, requiresAuth: true },
    },
    defaultSelection: 'all',
    auth: { status, redirectTo: '/login' },
  })
  // When the dashboard search bar lands here with `?q=…`, the subject filter
  // reads it straight from the URL so the user sees results matching what
  // they typed instead of the unfiltered list.
  const search = listRoute.filters.q ?? ''
  const statusFilter = listRoute.filters.status ?? ''
  const priorityFilter = listRoute.filters.priority ?? ''
  const assigneeId = listRoute.filters.assignee ?? ''
  const viewTab = listRoute.selection ?? 'all'
  const page = listRoute.page
  const navigate = useNavigate()

  const fetchTickets = useCallback(async () => {
    if (!listRoute.canLoad) return
    const request = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const res = await http.get('/api/tickets')
      if (request !== requestId.current) return
      const raw: Ticket[] = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []
      setTickets(raw.map((row) => enrichTicketListRow(row, t)))
    } catch (error: unknown) {
      if (request !== requestId.current) return
      setTickets([])
      setError(
        error instanceof Error
          ? error.message
          : t('tickets.loadError', {}, { defaultValue: 'Failed to load tickets' }),
      )
    } finally {
      if (request === requestId.current) setLoading(false)
    }
  }, [http, t, listRoute.canLoad])

  useEffect(() => {
    void fetchTickets()
    return () => {
      requestId.current += 1
    }
  }, [fetchTickets, user?.id])

  const assigneeOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const tk of tickets) {
      if (tk.assignee_id && tk.assignee_name) m.set(tk.assignee_id, tk.assignee_name)
    }
    return [...m.entries()].map(([id, name]) => ({ id, name }))
  }, [tickets])

  const filteredTickets = tickets.filter((tk) => {
    if (statusFilter && tk.status !== statusFilter) return false
    if (priorityFilter && tk.priority !== priorityFilter) return false
    if (assigneeId && tk.assignee_id !== assigneeId) return false
    if (search && !tk.subject.toLowerCase().includes(search.toLowerCase())) return false
    if (viewTab === 'assigned' && (!user?.id || tk.assignee_id !== user.id)) return false
    if (viewTab === 'unassigned' && tk.assignee_id) return false
    return true
  })
  const itemsPerPage = listRoute.pageSize
  const paginatedTickets = filteredTickets.slice(listRoute.offset, listRoute.offset + itemsPerPage)

  return (
    <AppShell
      topBar={
        <TicketsTopNavBar
          search={search}
          onSearchChange={(val) => {
            // setFilters writes ?q= and returns to page one atomically.
            listRoute.setFilters({ q: val || undefined }, { replace: true })
          }}
          viewTab={viewTab}
          onViewTabChange={(tab) => listRoute.select(tab)}
        />
      }
    >
      {/* Content Canvas — the top bar is in flow (sticky), so no fixed-bar
          clearance offsets are needed. */}
      <section className={cm.cn(cm.flex1, cm.stack(10), 'px-4 md:p-8 pt-4 md:pt-8')}>
        {/* Filter Bar */}
        <TicketsFilterBar
          statusFilter={statusFilter}
          onStatusChange={(v) => listRoute.setFilters({ status: v || undefined })}
          priorityFilter={priorityFilter}
          onPriorityChange={(v) => listRoute.setFilters({ priority: v || undefined })}
          assigneeId={assigneeId}
          onAssigneeChange={(v) => listRoute.setFilters({ assignee: v || undefined })}
          assigneeOptions={assigneeOptions}
          onClear={() => {
            // One atomic navigation back to the unfiltered first page.
            listRoute.navigate({
              selection: 'all',
              filters: {
                status: undefined,
                priority: undefined,
                assignee: undefined,
                q: undefined,
              },
            })
          }}
        />
        {/* Ticket Table Container */}
        {error && listRoute.canLoad && (
          <div role="alert">
            {error}
            <button
              className={cm.button({ variant: 'ghost', size: 'sm' })}
              onClick={() => void fetchTickets()}
            >
              {t('common.tryAgain', {}, { defaultValue: 'Try again' })}
            </button>
          </div>
        )}
        <TicketsTable
          tickets={listRoute.canLoad ? paginatedTickets : []}
          loading={loading || !listRoute.canLoad}
          onRowClick={(ticket) => navigate(`/tickets/${ticket.id}`)}
        />
        {/* Pagination */}
        <TicketsPagination
          page={page}
          onPageChange={(p) => {
            if (p !== page) listRoute.setPage(p)
          }}
          totalItems={filteredTickets.length}
          itemsPerPage={itemsPerPage}
        />
      </section>
      {/* Contextual FAB (Suppressed on details/settings as per rules, but showing for main list) */}
      <TicketsFab />
    </AppShell>
  )
}

export default Tickets
export { Tickets, Tickets as TicketsPage }
