import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AgentDashboardKpiSection from '../components/AgentDashboardKpiSection.js'
import AgentDashboardPerformanceChart from '../components/AgentDashboardPerformanceChart.js'
import AgentDashboardRecentLeadsCard from '../components/AgentDashboardRecentLeadsCard.js'
import AgentDashboardShowingsCard from '../components/AgentDashboardShowingsCard.js'
import AgentDashboardSideNavBar from '../components/AgentDashboardSideNavBar.js'
import AgentDashboardTopAppBar from '../components/AgentDashboardTopAppBar.js'

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  property_title: string
  status: string
}
interface Showing {
  id: string
  property_title: string
  date: string
  time: string
  client_name: string
}
interface Listing {
  id: string
  status: string
  days_on_market?: number
}

function unwrapListPayload(res: unknown): unknown[] {
  if (Array.isArray(res)) return res
  if (res && typeof res === 'object') {
    // The bonded fetch client returns HttpResponse where `.data` is the
    // parsed body; the API itself wraps lists in `{ data: [...] }`, so
    // we may need to peel two layers.
    const inner = (res as { data?: unknown }).data
    if (Array.isArray(inner)) return inner
    if (inner && typeof inner === 'object' && Array.isArray((inner as { data?: unknown }).data)) {
      return (inner as { data: unknown[] }).data
    }
  }
  return []
}

function AgentDashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [leads, setLeads] = useState<Lead[]>([])
  const [showings, setShowings] = useState<Showing[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/leads').catch(() => []),
      http.get('/api/showings').catch(() => []),
      // owner_id=me asks the properties handler to filter to listings
      // owned by the authed user (no /api/listings endpoint exists —
      // properties IS the listing catalogue).
      http.get('/api/properties?owner_id=me&status=all&limit=200').catch(() => []),
    ])
      .then(([leadsRes, showingsRes, listingsRes]) => {
        setLeads(unwrapListPayload(leadsRes) as Lead[])
        setShowings(unwrapListPayload(showingsRes) as Showing[])
        setListings(unwrapListPayload(listingsRes) as Listing[])
      })
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : t('agentDashboard.loadError', {}, { defaultValue: 'Failed to load dashboard data' }),
        ),
      )
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount; http and t are stable refs that do not change

  const activeListings = listings.filter((l) => ['active', 'Active'].includes(l.status)).length
  const pendingLeads = leads.filter((l) =>
    ['pending', 'new', 'new-lead', 'follow-up'].includes((l.status || '').toLowerCase()),
  ).length
  const avgDaysOnMarket = listings.length
    ? Math.round(listings.reduce((s, l) => s + (l.days_on_market || 0), 0) / listings.length)
    : 0
  const stats = {
    active_listings: activeListings,
    pending_leads: pendingLeads,
    upcoming_showings: showings.length,
    avg_days_on_market: avgDaysOnMarket,
  }

  if (loading) {
    return (
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.minH('screen'),
          'text-on-surface selection:bg-primary-fixed-dim',
        )}
      >
        <div className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'md' }))}>
          <div
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              'border-4 border-emerald-600 border-t-transparent animate-spin',
            )}
            aria-label={t('common.loading', {}, { defaultValue: 'Loading' })}
          />
          <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
            {t('agentDashboard.loadingMessage', {}, { defaultValue: 'Loading dashboard...' })}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.minH('screen'),
          'text-on-surface selection:bg-primary-fixed-dim',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
            cm.sp('p', 8),
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontSize: 48, color: 'var(--color-outline)' }}
          >
            error
          </span>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-foreground')}>
            {t('agentDashboard.errorTitle', {}, { defaultValue: 'Failed to load dashboard' })}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={cm.cn(
              cm.sp('px', 6),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'bg-primary text-on-primary py-2.5 rounded-xl hover:opacity-90',
            )}
          >
            {t('common.retry', {}, { defaultValue: 'Retry' })}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cm.cn('text-on-surface selection:bg-primary-fixed-dim')}>
      <AgentDashboardSideNavBar />
      {/* Main Content Wrapper */}
      <main className={cm.cn(cm.minH('screen'), 'ml-64')} data-mol-id="main_wrapper">
        <AgentDashboardTopAppBar />
        {/* Content Canvas */}
        <div className={cm.cn(cm.sp('p', 8), cm.stack(8))} data-mol-id="canvas">
          {/* KPI Cards Row */}
          <AgentDashboardKpiSection stats={stats} />
          {/* Main Grid: Bento Style */}
          <div className={cm.grid({ cols: 12, gap: 'xl' })} data-mol-id="bento_layout">
            <AgentDashboardPerformanceChart />
            {/* Upcoming Showings */}
            <AgentDashboardShowingsCard showings={showings} />
            {/* Recent Leads List */}
            <AgentDashboardRecentLeadsCard leads={leads} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default AgentDashboard
export { AgentDashboard, AgentDashboard as AgentDashboardPage }
