// Phase 1 baseline — verbatim JSX of design-helpdesk-ticketing-tickets.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import SideNavBar from '../components/SideNavBar.js'
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
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = t(
      'tickets.pageTitle',
      { appName: APP_NAME },
      { defaultValue: 'Tickets — {{appName}} Support' },
    )
  }, [t])
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')

  // When the dashboard search bar lands here with `?q=…`, sync the
  // initial subject filter so the user sees results matching what they
  // typed instead of the unfiltered list.
  useEffect(() => {
    const q = searchParams.get('q')
    if (q !== null) setSearch(q)
  }, [searchParams])
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [viewTab, setViewTab] = useState<'all' | 'assigned' | 'unassigned'>('all')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await http.get('/api/tickets')
      const raw: Ticket[] = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []
      setTickets(raw.map((row) => enrichTicketListRow(row, t)))
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

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
    if (viewTab === 'assigned' && !tk.assignee_name) return false
    if (viewTab === 'unassigned' && tk.assignee_name) return false
    return true
  })
  const itemsPerPage = 10
  const paginatedTickets = filteredTickets.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  return (
    <div className={cm.cn(cm.surface, 'text-on-surface')}>
      <SideNavBar />
      {/* Main Content Area */}
      <main className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'ml-[240px]')}>
        {/* TopNavBar (Authority: JSON) */}
        <TicketsTopNavBar
          search={search}
          onSearchChange={setSearch}
          viewTab={viewTab}
          onViewTabChange={setViewTab}
        />
        {/* Content Canvas */}
        <section className={cm.cn(cm.sp('mt', 16), cm.sp('p', 8), cm.flex1, cm.stack(10))}>
          {/* Filter Bar */}
          <TicketsFilterBar
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            priorityFilter={priorityFilter}
            onPriorityChange={setPriorityFilter}
            assigneeId={assigneeId}
            onAssigneeChange={(v) => {
              setAssigneeId(v)
              setPage(1)
            }}
            assigneeOptions={assigneeOptions}
            onClear={() => {
              setStatusFilter('')
              setPriorityFilter('')
              setAssigneeId('')
              setSearch('')
              setViewTab('all')
              setPage(1)
            }}
          />
          {/* Ticket Table Container */}
          <TicketsTable
            tickets={paginatedTickets}
            loading={loading}
            onRowClick={(ticket) => navigate(`/tickets/${ticket.id}`)}
          />
          {/* Pagination */}
          <TicketsPagination
            page={page}
            onPageChange={setPage}
            totalItems={filteredTickets.length}
            itemsPerPage={itemsPerPage}
          />
        </section>
      </main>
      {/* Contextual FAB (Suppressed on details/settings as per rules, but showing for main list) */}
      <TicketsFab />
    </div>
  )
}

export default Tickets
export { Tickets, Tickets as TicketsPage }
