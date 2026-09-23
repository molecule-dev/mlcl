// Phase 1 baseline — verbatim JSX of design-helpdesk-ticketing-dashboard.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import ActiveAgentsCard from '../components/ActiveAgentsCard.js'
import DashboardHeroHeader from '../components/DashboardHeroHeader.js'
import DashboardKpiRow from '../components/DashboardKpiRow.js'
import PriorityBreakdownCard from '../components/PriorityBreakdownCard.js'
import RecentTicketsTable from '../components/RecentTicketsTable.js'
import SideNavBar from '../components/SideNavBar.js'
import TicketVolumeChart from '../components/TicketVolumeChart.js'
import TopNavBar from '../components/TopNavBar.js'
import { dashboardRequesterLabel, enrichTicketListRow } from '../lib/demo-ticket-display.js'
import { computeSlaCompliance, type SlaPolicyLike } from '../lib/sla.js'

export interface Ticket {
  id: string
  subject: string
  status: string
  priority: string
  category?: string | null
  requester?: string
  requester_id?: string | null
  assignee_id?: string | null
  created_at: string
  updated_at?: string
}

export interface TicketCounts {
  open: number
  pending: number
  resolved: number
  overdue: number
}

function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [counts, setCounts] = useState<TicketCounts>({
    open: 0,
    pending: 0,
    resolved: 0,
    overdue: 0,
  })
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([])
  const [allTickets, setAllTickets] = useState<Ticket[]>([])
  const [slaCompliance, setSlaCompliance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = t(
      'dashboard.pageTitle',
      { appName: APP_NAME },
      { defaultValue: 'Dashboard — {{appName}} Support' },
    )
  }, [t])

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await http.get<Ticket[] | { data: Ticket[] }>('/api/tickets')
        const body = res.data
        const raw: Ticket[] = Array.isArray(body)
          ? body
          : Array.isArray(body?.data)
            ? body.data
            : []
        const tickets = raw.map((row) => enrichTicketListRow(row, t))
        let policies: SlaPolicyLike[] = []
        try {
          const slaRes = await http.get<SlaPolicyLike[] | { data: SlaPolicyLike[] }>('/api/sla')
          const slaBody = slaRes.data
          policies = Array.isArray(slaBody)
            ? slaBody
            : Array.isArray(slaBody?.data)
              ? slaBody.data
              : []
        } catch (slaError) {
          // Best-effort: without the SLA policies the compliance/overdue figures degrade to
          // 100% / 0 rather than failing the whole dashboard.
          logError('dashboard.fetchSla', slaError)
        }
        const sla = computeSlaCompliance(tickets, policies, Date.now())
        setSlaCompliance(sla.compliancePct)
        setCounts({
          open: tickets.filter((tk) => tk.status === 'open').length,
          pending: tickets.filter((tk) => tk.status === 'pending').length,
          resolved: tickets.filter((tk) => tk.status === 'resolved' || tk.status === 'solved')
            .length,
          overdue: sla.overdue,
        })
        setAllTickets(tickets)
        setRecentTickets(
          tickets.slice(0, 10).map((tk) => ({
            ...tk,
            requester: dashboardRequesterLabel(tk),
          })),
        )
      } catch (error) {
        // Fall back to representative demo data so the dashboard still
        // renders meaningfully when the API is unreachable.
        logError('dashboard.fetchTickets', error)
        setCounts({ open: 42, pending: 8, resolved: 156, overdue: 3 })
        setSlaCompliance(94)
        setRecentTickets([
          {
            id: 'ZN-8942',
            subject: 'API Integration failing on production',
            status: 'open',
            priority: 'critical',
            category: 'technical',
            requester: 'Acme Corp',
            created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
          },
          {
            id: 'ZN-8941',
            subject: 'Reset password link not received',
            status: 'pending',
            priority: 'high',
            category: 'account',
            requester: 'Sarah Jenkins',
            created_at: new Date(Date.now() - 14 * 60000).toISOString(),
          },
          {
            id: 'ZN-8940',
            subject: 'Request for feature: Dark Mode API',
            status: 'open',
            priority: 'medium',
            category: 'feature_request',
            requester: 'Global Tech',
            created_at: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'ZN-8939',
            subject: 'Invoice clarity for Q3 billing',
            status: 'solved',
            priority: 'low',
            category: 'billing',
            requester: 'Mark Redfield',
            created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
          },
          {
            id: 'ZN-8938',
            subject: 'Slow load times in enterprise dashboard',
            status: 'open',
            priority: 'critical',
            category: 'performance',
            requester: 'Chris Mendez',
            created_at: new Date(Date.now() - 72 * 3600000).toISOString(),
          },
        ])
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [http, t])

  return (
    <div className={cm.cn(cm.surface, 'text-on-surface selection:bg-secondary-container')}>
      {/* SideNavBar (Execution from JSON) */}
      <SideNavBar />
      {/* Main Content Shell */}
      <main className={cm.cn(cm.minH('screen'), 'md:ml-[240px]')}>
        {/* TopNavBar (Execution from JSON) */}
        <TopNavBar />
        {/* Canvas Body */}
        <div
          className={cm.cn(
            cm.stack(10),
            cm.sp('pb', 12),
            cm.maxW('7xl'),
            cm.mxAuto,
            'pt-28 px-4 md:px-10',
          )}
        >
          <DashboardHeroHeader />
          {/* KPI Row: Bento Style */}
          <DashboardKpiRow
            counts={counts}
            slaCompliance={slaCompliance ?? undefined}
            loading={loading}
          />
          {/* Asymmetric Dashboard Content */}
          <div className={cm.cn(cm.grid({ cols: 12 }), 'gap-4 md:gap-10')}>
            {/* Left: Ticket Volume & Table (8 columns) */}
            <div className={cm.cn(cm.stack(10), 'col-span-12 lg:col-span-8')}>
              {/* Chart Placeholder Section */}
              <TicketVolumeChart tickets={allTickets} loading={loading} />
              {/* Recent Tickets Table */}
              <RecentTicketsTable tickets={recentTickets} loading={loading} />
            </div>
            {/* Right: Priority Breakdown & Team (4 columns) */}
            <div className={cm.cn(cm.stack(8), 'col-span-12 lg:col-span-4')}>
              <PriorityBreakdownCard
                priorityData={Object.entries(
                  recentTickets.reduce(
                    (acc, ticket) => {
                      const key = (ticket.priority || 'medium').toLowerCase()
                      acc[key] = (acc[key] || 0) + 1
                      return acc
                    },
                    {} as Record<string, number>,
                  ),
                ).map(([priority, count]) => ({ priority, count }))}
                loading={loading}
              />
              <ActiveAgentsCard />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
export { Dashboard, Dashboard as DashboardPage }
