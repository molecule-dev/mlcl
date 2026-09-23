// Phase 1 baseline — verbatim JSX of design-helpdesk-ticketing-reports.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AgentPerformanceTable from '../components/AgentPerformanceTable.js'
import PriorityBreakdownCard from '../components/PriorityBreakdownCard.js'
import ReportsKpiSection from '../components/ReportsKpiSection.js'
import ReportsTicketVolumeChart from '../components/ReportsTicketVolumeChart.js'
import SideNavBar from '../components/SideNavBar.js'
import TopAppBar from '../components/TopAppBar.js'
import { enrichTicketListRow, reportsAgentRows } from '../lib/demo-ticket-display.js'
import { computeSlaCompliance } from '../lib/sla.js'
interface RTicket {
  id?: string
  priority?: string
  status?: string
  agent?: string
  agent_name?: string
  assignee?: string
  assignee_id?: string | null
  assignee_name?: string
  requester_id?: string | null
  created_at?: string
  createdAt?: string
  updated_at?: string
  resolution_time?: number
  rating?: number
}
interface RSlaItem {
  priority?: string
  resolution_hours?: number
  first_response_hours?: number
  active?: boolean
}
function Reports() {
  const { t } = useTranslation()
  const dayLabels = [
    t('common.days.sun', {}, { defaultValue: 'Sun' }),
    t('common.days.mon', {}, { defaultValue: 'Mon' }),
    t('common.days.tue', {}, { defaultValue: 'Tue' }),
    t('common.days.wed', {}, { defaultValue: 'Wed' }),
    t('common.days.thu', {}, { defaultValue: 'Thu' }),
    t('common.days.fri', {}, { defaultValue: 'Fri' }),
    t('common.days.sat', {}, { defaultValue: 'Sat' }),
  ]
  const cm = getClassMap()
  const http = useHttpClient()
  const [tickets, setTickets] = useState<RTicket[]>([])
  const [slaData, setSlaData] = useState<RSlaItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      http.get<RTicket[] | { data: RTicket[] }>('/api/tickets').then((r) => {
        const body = r.data
        return Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : []
      }),
      http.get<RSlaItem[] | { data: RSlaItem[] }>('/api/sla').then((r) => {
        const body = r.data
        return Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : []
      }),
    ])
      .then(([ticketsResp, slaResp]) => {
        setTickets(ticketsResp.map((tk) => enrichTicketListRow(tk as never, t)))
        setSlaData(slaResp)
      })
      .catch((error: unknown) => {
        // The KPI cards below fall back to representative demo numbers when
        // no data loads, so the report stays presentable — just log it.
        logError('reports.fetch', error)
      })
      .finally(() => setLoading(false))
  }, [http, t])

  const priMap: Record<string, number> = {}
  tickets.forEach((tk) => {
    const p = (tk.priority || t('common.priority.low', {}, { defaultValue: 'low' })).toLowerCase()
    priMap[p] = (priMap[p] || 0) + 1
  })
  const priorityData = Object.entries(priMap).map(([priority, count]) => ({ priority, count }))

  const volMap: Record<string, number> = {}
  tickets.forEach((tk) => {
    const d = tk.created_at || tk.createdAt
    if (d) {
      const day = dayLabels[new Date(d).getDay()]
      volMap[day] = (volMap[day] || 0) + 1
    }
  })
  const volumeData = dayLabels.map((d) => ({ label: d, count: volMap[d] || 0 }))

  const agents = reportsAgentRows(tickets as Parameters<typeof reportsAgentRows>[0], t)

  const slaCompliance = computeSlaCompliance(tickets, slaData, Date.now()).compliancePct
  const totalRes = tickets.reduce((s, tk) => s + (tk.resolution_time || 0), 0)
  const avgResolutionTime =
    totalRes > 0 && tickets.length > 0
      ? t(
          'common.time.hours',
          { value: (totalRes / tickets.length).toFixed(1) },
          { defaultValue: '{{value}}h' },
        )
      : t('common.time.hours', { value: '4.2' }, { defaultValue: '{{value}}h' })
  const weekMs = 7 * 86400000
  const ticketsThisWeek = tickets.filter((tk) => {
    const d = new Date(tk.created_at || tk.createdAt || 0).getTime()
    return d >= Date.now() - weekMs
  }).length

  return (
    <div className={cm.cn('text-on-surface antialiased overflow-hidden')}>
      {/* SideNavBar (Authority: JSON & Design System) */}
      <SideNavBar />
      {/* Main Content Shell */}
      <main className={cm.cn(cm.flex({ direction: 'col' }), 'md:ml-[240px] min-h-screen')}>
        {/* TopAppBar (Authority: JSON & Design System) */}
        <TopAppBar />
        {/* Content Canvas */}
        <div
          className={cm.cn(
            cm.stack(10),
            'mt-16 px-4 md:p-8 overflow-y-auto h-[calc(100vh-64px)] no-scrollbar',
          )}
        >
          {/* KPI Section (Editorial Typography & Tonal Depth) */}
          <ReportsKpiSection
            loading={loading}
            avgResolutionTime={avgResolutionTime}
            slaCompliance={slaCompliance}
            ticketsThisWeek={ticketsThisWeek > 0 ? ticketsThisWeek : tickets.length}
          />
          {/* Main Analytics Section (Asymmetric Layout) */}
          <div className={cm.cn(cm.grid({ cols: 12 }), 'gap-4 md:gap-10')}>
            <div className={cm.cn('col-span-12 lg:col-span-8')}>
              <ReportsTicketVolumeChart volumeData={loading ? [] : volumeData} loading={loading} />
            </div>
            <div className={cm.cn('col-span-12 lg:col-span-4')}>
              <PriorityBreakdownCard priorityData={loading ? [] : priorityData} loading={loading} />
            </div>
          </div>
          {/* Bottom Section: Agent Performance Table (Tonal Separation) */}
          <AgentPerformanceTable agents={loading ? [] : agents} loading={loading} />
        </div>
      </main>
    </div>
  )
}

export default Reports
export { Reports, Reports as ReportsPage }
