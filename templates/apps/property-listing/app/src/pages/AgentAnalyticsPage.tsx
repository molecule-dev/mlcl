import { type ReactNode, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AdminShell from '../components/AdminShell.js'
import AgentAnalyticsFooter from '../components/AgentAnalyticsFooter.js'

function AgentAnalyticsChrome({ children }: { children: ReactNode }) {
  const cm = getClassMap()
  return (
    <AdminShell
      className="text-on-surface selection:bg-primary-fixed-dim"
      contentMolId="main_wrapper"
      contentClassName={cm.cn('min-h-screen flex flex-col')}
    >
      <div className={cm.cn('flex-1')}>{children}</div>
      <AgentAnalyticsFooter />
    </AdminShell>
  )
}

function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  if (res && typeof res === 'object') {
    const inner = (res as { data?: unknown }).data
    if (Array.isArray(inner)) return inner as T[]
    if (inner && typeof inner === 'object' && Array.isArray((inner as { data?: unknown }).data)) {
      return (inner as { data: T[] }).data
    }
  }
  return []
}

interface ListingRow {
  id: string
  title?: string
  address?: string
  city?: string
  state?: string
  status?: string
  photos?: string[] | string
  created_at?: string
}
interface LeadRow {
  id: string
  source?: string
  status?: string
  property_id?: string | null
  created_at?: string
}

function firstPhotoUrl(p: ListingRow): string {
  const v = p.photos
  if (!v) return ''
  if (Array.isArray(v)) return v[0] ?? ''
  try {
    const parsed = JSON.parse(v as string)
    return Array.isArray(parsed) ? (parsed[0] ?? '') : ''
  } catch (_error) {
    // JSON.parse failed — photos value is not a valid array string, return empty
    return ''
  }
}

interface Analytics {
  total_views: number
  total_views_change: string
  active_leads: number
  active_leads_change: string
  conversion_rate: number
  conversion_rate_change: string
  avg_days_on_market: number
  avg_days_change: string
  views_by_listing: { title: string; views: number }[]
  lead_sources: { source: string; count: number; percentage: number }[]
  top_listings: {
    title: string
    address: string
    image: string
    views: string
    leads: number
    status: string
  }[]
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#acf1d0', text: '#00513a' },
  pending: { bg: '#cde9d9', text: '#334c40' },
  sold: { bg: '#e6e9e8', text: '#3f4944' },
}

const LEGEND_COLORS = ['#00523a', '#003927', '#cde9d9']

// Retained for shape reference / type narrowing only; not rendered.
const _DEMO_ANALYTICS_SHAPE: Analytics = {
  total_views: 24500,
  total_views_change: '+12.5%',
  active_leads: 84,
  active_leads_change: '+8.3%',
  conversion_rate: 2.1,
  conversion_rate_change: '+0.4%',
  avg_days_on_market: 18,
  avg_days_change: '-3.2%',
  views_by_listing: [
    { title: 'The Obsidian Ridge', views: 12402 },
    { title: 'Azure Waterfront Estate', views: 9100 },
    { title: 'Steel & Glass Loft', views: 4950 },
  ],
  lead_sources: [
    { source: 'Portal', count: 34, percentage: 40 },
    { source: 'Referral', count: 27, percentage: 32 },
    { source: 'Direct', count: 23, percentage: 28 },
  ],
  top_listings: [
    {
      title: 'The Obsidian Ridge',
      address: '123 Oak Terrace, Aspen, CO',
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=128&h=128&fit=crop',
      views: '12,402',
      leads: 48,
      status: 'Active',
    },
    {
      title: 'Azure Waterfront Estate',
      address: '456 Harbor View, Miami, FL',
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=128&h=128&fit=crop',
      views: '9,100',
      leads: 32,
      status: 'Pending',
    },
    {
      title: 'Steel & Glass Loft',
      address: '789 Broadway, Tribeca, NY',
      image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=128&h=128&fit=crop',
      views: '4,950',
      leads: 14,
      status: 'Active',
    },
  ],
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function AgentAnalyticsPage() {
  const { t } = useTranslation()
  const http = useHttpClient()
  const cm = getClassMap()
  const navigate = useNavigate()

  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('7D')

  useEffect(() => {
    setLoading(true)
    // No /api/admin/analytics endpoint exists. Compute analytics
    // client-side from the agent's actual listings + leads.
    Promise.all([
      http.get('/api/properties?owner_id=me&status=all&limit=200').catch(() => []),
      http.get('/api/leads?limit=200').catch(() => []),
    ])
      .then(([propsRes, leadsRes]) => {
        const listings = unwrapList<ListingRow>(propsRes)
        const leads = unwrapList<LeadRow>(leadsRes)

        const activeLeads = leads.filter((l) =>
          ['new', 'contacted', 'qualified'].includes((l.status ?? '').toLowerCase()),
        ).length
        const closedLeads = leads.filter((l) =>
          ['qualified', 'lost'].includes((l.status ?? '').toLowerCase()),
        ).length
        const conversionRate = closedLeads
          ? Math.round(
              (leads.filter((l) => l.status === 'qualified').length / closedLeads) * 1000,
            ) / 10
          : 0

        // Lead source breakdown.
        const sourceCounts: Record<string, number> = {}
        for (const lead of leads) {
          const src = (lead.source ?? 'direct').replace(/_/g, ' ')
          sourceCounts[src] = (sourceCounts[src] ?? 0) + 1
        }
        const totalLeads = leads.length || 1
        const lead_sources = Object.entries(sourceCounts)
          .map(([source, count]) => ({
            source: source.charAt(0).toUpperCase() + source.slice(1),
            count,
            percentage: Math.round((count / totalLeads) * 100),
          }))
          .sort((a, b) => b.count - a.count)

        // Lead-density per listing (treats lead count as proxy "views").
        const leadsPerProperty: Record<string, number> = {}
        for (const lead of leads) {
          if (!lead.property_id) continue
          leadsPerProperty[lead.property_id] = (leadsPerProperty[lead.property_id] ?? 0) + 1
        }
        const ranked = listings
          .map((l) => ({
            listing: l,
            leadCount: leadsPerProperty[l.id] ?? 0,
          }))
          .sort((a, b) => b.leadCount - a.leadCount)

        const views_by_listing = ranked.slice(0, 5).map(({ listing, leadCount }) => ({
          title: listing.title ?? listing.address ?? 'Untitled',
          views: leadCount,
        }))
        const top_listings = ranked.slice(0, 5).map(({ listing, leadCount }) => ({
          title: listing.title ?? listing.address ?? 'Untitled',
          address: [listing.address, listing.city, listing.state].filter(Boolean).join(', '),
          image: firstPhotoUrl(listing),
          views: String(leadCount),
          leads: leadCount,
          status: (listing.status ?? 'active').replace(/^./, (c) => c.toUpperCase()),
        }))

        // Avg days on market = mean days since created_at for listings
        // currently active (loose proxy until view-tracking exists).
        const now = Date.now()
        const dayMs = 1000 * 60 * 60 * 24
        const ages = listings
          .filter((l) => (l.status ?? '').toLowerCase() === 'active' && l.created_at)
          .map((l) => Math.round((now - new Date(l.created_at!).getTime()) / dayMs))
        const avg_days_on_market = ages.length
          ? Math.round(ages.reduce((s, n) => s + n, 0) / ages.length)
          : 0

        setAnalytics({
          total_views: leads.length,
          total_views_change: '',
          active_leads: activeLeads,
          active_leads_change: '',
          conversion_rate: conversionRate,
          conversion_rate_change: '',
          avg_days_on_market,
          avg_days_change: '',
          views_by_listing,
          lead_sources,
          top_listings,
        })
      })
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false))
  }, [http])

  const data: Analytics = analytics ?? {
    total_views: 0,
    total_views_change: '',
    active_leads: 0,
    active_leads_change: '',
    conversion_rate: 0,
    conversion_rate_change: '',
    avg_days_on_market: 0,
    avg_days_change: '',
    views_by_listing: [],
    lead_sources: [],
    top_listings: [],
  }

  if (loading) {
    return (
      <AgentAnalyticsChrome>
        <div className={cm.cn(cm.flex({ justify: 'center', align: 'center' }), cm.sp('py', 12))}>
          <div className={cm.spinner({ size: 'lg' })} />
        </div>
      </AgentAnalyticsChrome>
    )
  }

  const kpiCards = [
    {
      icon: 'visibility',
      change: data.total_views_change,
      label: t('analytics.totalViews', {}, { defaultValue: 'Total Views' }),
      value: formatNumber(data.total_views),
      positive: !data.total_views_change?.startsWith('-'),
    },
    {
      icon: 'hub',
      change: data.active_leads_change,
      label: t('analytics.totalLeads', {}, { defaultValue: 'Total Leads' }),
      value: String(data.active_leads),
      positive: !data.active_leads_change?.startsWith('-'),
    },
    {
      icon: 'ads_click',
      change: data.conversion_rate_change,
      label: t('analytics.conversionRate', {}, { defaultValue: 'Conversion Rate' }),
      value: `${data.conversion_rate}%`,
      positive: !data.conversion_rate_change?.startsWith('-'),
    },
    {
      icon: 'speed',
      change: data.avg_days_change,
      label: t('analytics.avgDaysOnMarket', {}, { defaultValue: 'Avg Days on Market' }),
      value: String(data.avg_days_on_market),
      positive: data.avg_days_change?.startsWith('-'),
    },
  ]

  const periods = ['7D', '30D', '90D', '1Y']

  return (
    <AgentAnalyticsChrome>
      {/* Header & Date Selector */}
      <header
        className={cm.sp('mb', 10)}
        style={{
          padding: '32px 40px 0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div className={cm.flex({ align: 'baseline' })} style={{ gap: '16px' }}>
          <h2
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
              lineHeight: '36px',
              color: 'var(--color-on-surface)',
              margin: 0,
            }}
          >
            {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
          </h2>
          <p
            className={cm.fontWeight('medium')}
            style={{ color: 'var(--color-on-surface-variant)', margin: 0, fontSize: '14px' }}
          >
            {t(
              'analytics.subtitle',
              {},
              { defaultValue: 'Performance oversight for your portfolio.' },
            )}
          </p>
        </div>
        <div
          className={cm.cn(cm.flex({ align: 'center' }), cm.roundedFull)}
          style={{
            gap: '8px',
            backgroundColor: 'var(--color-surface-container-low)',
            padding: '6px',
          }}
        >
          {periods.map((p) => (
            <button
              key={p}
              data-mol-id={`period-${p.toLowerCase()}`}
              onClick={() => setPeriod(p)}
              className={cm.cn(cm.roundedFull, cm.textSize('sm'))}
              style={{
                padding: '8px 24px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                fontWeight: p === period ? 700 : 600,
                backgroundColor: p === period ? 'var(--color-on-error)' : 'transparent',
                color: p === period ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                boxShadow: p === period ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </header>

      {/* KPI Cards */}
      <section
        className={cm.sp('mb', 12)}
        style={{
          padding: '0 40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '24px',
        }}
      >
        {kpiCards.map((kpi, i) => (
          <div
            key={i}
            data-mol-id={`kpi-${i}`}
            className={cm.cn(cm.flex({ direction: 'col', justify: 'between' }), cm.sp('p', 8))}
            style={{
              backgroundColor: 'var(--color-on-error)',
              borderRadius: '12px',
              height: '192px',
              transition: 'transform 0.2s ease',
            }}
          >
            <div className={cm.flex({ justify: 'between', align: 'start' })}>
              <span
                className="material-symbols-outlined"
                style={{
                  padding: '12px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(172, 241, 208, 0.3)',
                  color: 'var(--color-on-surface)',
                }}
              >
                {kpi.icon}
              </span>
              {kpi.change ? (
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    cm.roundedFull,
                  )}
                  style={{
                    padding: '4px 12px',
                    color: kpi.positive ? '#059669' : 'var(--color-error)',
                    backgroundColor: kpi.positive
                      ? 'var(--color-surface-hover)'
                      : 'rgba(255, 218, 214, 0.5)',
                  }}
                >
                  {kpi.change}
                </span>
              ) : null}
            </div>
            <div>
              <p
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--color-on-surface-variant)',
                  marginBottom: '4px',
                }}
              >
                {kpi.label}
              </p>
              <h3
                style={{
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: '36px',
                  fontWeight: 800,
                  lineHeight: '40px',
                  color: 'var(--color-on-surface)',
                  margin: 0,
                }}
              >
                {kpi.value}
              </h3>
            </div>
          </div>
        ))}
      </section>

      {/* Charts Section */}
      <section
        className={cm.sp('mb', 12)}
        style={{ padding: '0 40px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}
      >
        {/* Line Chart */}
        <div
          className={cm.sp('p', 10)}
          style={{ backgroundColor: 'var(--color-on-error)', borderRadius: '12px' }}
        >
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 8))}>
            <h3
              style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--color-on-surface)',
                margin: 0,
              }}
            >
              {t('analytics.viewsOverTime', {}, { defaultValue: 'Property Views Over Time' })}
            </h3>
            <div className={cm.flex({ align: 'center' })} style={{ gap: '16px' }}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center' }),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                )}
                style={{ gap: '8px', color: 'var(--color-on-surface-variant)' }}
              >
                <span
                  className={cm.roundedFull}
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#003927',
                    display: 'inline-block',
                  }}
                />
                {t('analytics.luxuryAssets', {}, { defaultValue: 'Luxury Assets' })}
              </span>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center' }),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                )}
                style={{ gap: '8px', color: 'var(--color-on-surface-variant)' }}
              >
                <span
                  className={cm.roundedFull}
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: 'var(--color-primary-fixed)',
                    display: 'inline-block',
                  }}
                />
                {t('analytics.commercial', {}, { defaultValue: 'Commercial' })}
              </span>
            </div>
          </div>
          <div
            style={{
              position: 'relative',
              height: '256px',
              width: '100%',
              backgroundColor: 'var(--color-surface-container-low)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              padding: '16px 32px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end' }}
            >
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path
                  d="M0,80 Q25,20 50,60 T100,30"
                  fill="none"
                  stroke="#003927"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M0,90 Q30,50 60,80 T100,50"
                  fill="none"
                  stroke="#acf1d0"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
              <div
                key={day}
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: day === 'WED' ? 'var(--color-primary)' : 'rgba(63, 73, 68, 0.4)',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {day}
              </div>
            ))}
          </div>
        </div>

        {/* Donut Chart */}
        <div
          className={cm.cn(cm.flex({ direction: 'col' }), cm.sp('p', 10))}
          style={{ backgroundColor: 'var(--color-on-error)', borderRadius: '12px' }}
        >
          <h3
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--color-on-surface)',
              margin: '0 0 32px',
            }}
          >
            {t('analytics.leadSources', {}, { defaultValue: 'Lead Sources' })}
          </h3>
          <div
            className={cm.cn(cm.flex({ direction: 'col', align: 'center', justify: 'center' }))}
            style={{ flex: 1 }}
          >
            {/* Donut Ring */}
            <div
              className={cm.flex({ align: 'center', justify: 'center' })}
              style={{
                width: '192px',
                height: '192px',
                borderRadius: '50%',
                borderWidth: '18px',
                borderStyle: 'solid',
                borderColor: 'var(--color-primary)',
                borderRightColor: 'var(--mol-color-border)',
                borderBottomColor: '#003927',
                position: 'relative',
              }}
            >
              <div className={cm.textCenter}>
                <span
                  style={{
                    display: 'block',
                    fontSize: '30px',
                    fontWeight: 900,
                    color: 'var(--color-on-surface)',
                    fontFamily: 'Manrope, sans-serif',
                  }}
                >
                  {data.active_leads}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--color-on-surface-variant)',
                    fontWeight: 700,
                  }}
                >
                  {t('analytics.leads', {}, { defaultValue: 'Leads' })}
                </span>
              </div>
            </div>

            {/* Legend */}
            <div
              className={cm.sp('mt', 8)}
              style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', width: '100%' }}
            >
              {data.lead_sources?.map((source, i) => (
                <div
                  key={i}
                  className={cm.cn(
                    cm.flex({ justify: 'between', align: 'center' }),
                    cm.roundedFull,
                  )}
                  style={{
                    backgroundColor: 'var(--color-surface-container-low)',
                    padding: '8px 16px',
                  }}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                    )}
                    style={{ gap: '8px' }}
                  >
                    <span
                      className={cm.roundedFull}
                      style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: LEGEND_COLORS[i] || '#003927',
                        display: 'inline-block',
                      }}
                    />
                    {source.source}
                  </span>
                  <span className={cm.textSize('xs')} style={{ fontWeight: 900 }}>
                    {source.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Top Performing Listings */}
      <section
        className={cm.sp('p', 10)}
        style={{
          margin: '0 40px 32px',
          backgroundColor: 'var(--color-on-error)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 10))}>
          <h3
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--color-on-surface)',
              margin: 0,
            }}
          >
            {t('analytics.topListings', {}, { defaultValue: 'Top Performing Listings' })}
          </h3>
          <button
            data-mol-id="btn-view-inventory"
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
            )}
            style={{
              color: 'var(--color-primary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              gap: '8px',
              padding: 0,
              fontFamily: 'Inter, sans-serif',
            }}
            onClick={() => navigate('/admin/listings')}
          >
            {t('analytics.viewFullInventory', {}, { defaultValue: 'View Full Inventory' })}
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              arrow_forward
            </span>
          </button>
        </div>

        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th
                style={{
                  paddingBottom: '24px',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  color: 'var(--color-on-surface-variant)',
                  fontWeight: 700,
                }}
              >
                {t('analytics.col.property', {}, { defaultValue: 'Property' })}
              </th>
              <th
                style={{
                  paddingBottom: '24px',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  color: 'var(--color-on-surface-variant)',
                  fontWeight: 700,
                }}
              >
                {t('analytics.col.views', {}, { defaultValue: 'Views' })}
              </th>
              <th
                style={{
                  paddingBottom: '24px',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  color: 'var(--color-on-surface-variant)',
                  fontWeight: 700,
                }}
              >
                {t('analytics.col.leads', {}, { defaultValue: 'Leads' })}
              </th>
              <th
                style={{
                  paddingBottom: '24px',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  color: 'var(--color-on-surface-variant)',
                  fontWeight: 700,
                  textAlign: 'right',
                }}
              >
                {t('nav.status', {}, { defaultValue: 'Status' })}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.top_listings?.map((listing, i) => {
              const status = listing.status.toLowerCase()
              const colors = STATUS_COLORS[status] || STATUS_COLORS.sold
              return (
                <tr
                  key={i}
                  style={{
                    borderTop: i > 0 ? '1px solid var(--color-surface-container-low)' : undefined,
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <td
                    className={cm.flex({ align: 'center' })}
                    style={{ padding: '24px 0', gap: '16px' }}
                  >
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={listing.image}
                        alt={listing.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div>
                      <h4
                        className={cm.fontWeight('bold')}
                        style={{ color: 'var(--color-on-surface)', margin: 0, fontSize: '16px' }}
                      >
                        {listing.title}
                      </h4>
                      <p
                        className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))}
                        style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}
                      >
                        {listing.address}
                      </p>
                    </div>
                  </td>
                  <td
                    style={{ padding: '24px 0', fontWeight: 900, color: 'var(--color-on-surface)' }}
                  >
                    {listing.views}
                  </td>
                  <td
                    style={{ padding: '24px 0', fontWeight: 900, color: 'var(--color-on-surface)' }}
                  >
                    {listing.leads}
                  </td>
                  <td style={{ padding: '24px 0', textAlign: 'right' }}>
                    <span
                      className={cm.roundedFull}
                      style={{
                        display: 'inline-block',
                        backgroundColor: colors.bg,
                        color: colors.text,
                        padding: '6px 16px',
                        fontSize: '10px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {listing.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </AgentAnalyticsChrome>
  )
}
