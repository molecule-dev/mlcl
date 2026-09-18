import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { KpiStatCard } from '../components/KpiStatCard.js'

const PALETTE = [
  '#0d7377',
  '#e86c3a',
  '#7c3aed',
  '#16804a',
  '#d97706',
  '#0891b2',
  '#c42b2b',
  '#6b7280',
]

interface RevenuePoint {
  bucket?: string
  date?: string
  total_amount?: number
}

interface AgingRow {
  status: string
  total_outstanding?: number
  invoice_count?: number
}

interface TopClientRow {
  client_id: string
  lifetime_revenue?: number
  invoice_count?: number
}

interface PaymentMethodRow {
  method: string
  total_amount?: number
}

interface ClientLite {
  id: string
  name: string
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const monthLabel = (iso: string | undefined) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short' })
}

export function Reports() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'annual'>('monthly')
  const [revenue, setRevenue] = useState<RevenuePoint[]>([])
  const [aging, setAging] = useState<AgingRow[]>([])
  const [topClients, setTopClients] = useState<TopClientRow[]>([])
  const [methods, setMethods] = useState<PaymentMethodRow[]>([])
  const [clientNames, setClientNames] = useState<Map<string, string>>(new Map())
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const now = new Date()
    let monthsBack = 7
    if (period === 'quarterly') monthsBack = 12
    if (period === 'annual') monthsBack = 24
    const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)
    const startISO = start.toISOString().slice(0, 10)
    const endISO = now.toISOString().slice(0, 10)
    let active = true

    const safeGet = <T,>(url: string, fallback: T): Promise<T> =>
      http
        .get<T>(url)
        .then((r) => (r.data ?? fallback) as T)
        .catch(() => fallback)

    Promise.all([
      safeGet<RevenuePoint[]>(`/api/reports/revenue?start_date=${startISO}&end_date=${endISO}`, []),
      safeGet<AgingRow[]>('/api/reports/aging', []),
      safeGet<TopClientRow[]>('/api/reports/top-clients', []),
      safeGet<PaymentMethodRow[]>('/api/reports/payment-methods', []),
      safeGet<ClientLite[]>('/api/clients', []),
    ]).then(([rev, ag, top, meth, clients]) => {
      if (!active) return
      setRevenue(Array.isArray(rev) ? rev : [])
      setAging(Array.isArray(ag) ? ag : [])
      setTopClients(Array.isArray(top) ? top : [])
      setMethods(Array.isArray(meth) ? meth : [])
      const map = new Map<string, string>()
      for (const c of Array.isArray(clients) ? clients : []) map.set(c.id, c.name)
      setClientNames(map)
    })

    return () => {
      active = false
    }
  }, [http, period])

  const revenueSeries = useMemo(() => {
    return revenue
      .map((p) => ({
        label: monthLabel(p.bucket ?? p.date),
        value: Number(p.total_amount ?? 0),
      }))
      .filter((p) => p.label)
  }, [revenue])

  const yearRevenue = useMemo(() => revenueSeries.reduce((s, p) => s + p.value, 0), [revenueSeries])
  const yearTax = yearRevenue * 0.085
  const collectedCount = revenue.reduce((s, p) => s + (Number(p.total_amount ?? 0) > 0 ? 1 : 0), 0)
  const dso = collectedCount > 0 ? (revenueSeries.length * 30) / Math.max(1, collectedCount) : 0

  const agingTotal = aging.reduce((s, b) => s + Number(b.total_outstanding ?? 0), 0)

  const topRows = useMemo(() => {
    return topClients
      .filter((r) => r.client_id)
      .map((r) => ({
        client_id: r.client_id,
        name: clientNames.get(r.client_id) ?? `Client ${r.client_id.slice(0, 6)}`,
        revenue: Number(r.lifetime_revenue ?? 0),
      }))
      .filter((r) => r.revenue > 0)
      .slice(0, 5)
  }, [topClients, clientNames])

  const methodsTotal = methods.reduce((s, m) => s + Number(m.total_amount ?? 0), 0)
  const methodSlices = methods
    .filter((m) => Number(m.total_amount ?? 0) > 0)
    .map((m, i) => ({
      label: m.method,
      pct: methodsTotal > 0 ? Number(m.total_amount ?? 0) / methodsTotal : 0,
      color: PALETTE[i % PALETTE.length],
    }))

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    try {
      const r = await fetch('/api/exports/invoices.csv', {
        credentials: 'include',
        headers: http.defaultHeaders ?? {},
      })
      if (r.status === 402) {
        setError(
          t(
            'reports.exportRequiresPaid',
            {},
            { defaultValue: 'Exports are a paid feature — upgrade to enable.' },
          ),
        )
        return
      }
      if (!r.ok) {
        setError(t('reports.exportError', {}, { defaultValue: 'Export failed.' }))
        return
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'invoices.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div data-mol-id="page-reports" className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}
        style={{ flexWrap: 'wrap', gap: '12px' }}
      >
        <div>
          <span
            style={{
              fontSize: '11px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-primary-dark)',
              fontWeight: 700,
            }}
          >
            {t('reports.eyebrow', {}, { defaultValue: 'Tax-ready insights' })}
          </span>
          <h1
            className={cm.cn(cm.fontWeight('bold'))}
            style={{
              fontSize: '28px',
              letterSpacing: '-0.02em',
              color: 'var(--mol-color-text)',
              margin: '4px 0 0',
            }}
          >
            {t('nav.reports', {}, { defaultValue: 'Reports' })}
          </h1>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: 'var(--mol-color-surface)',
              border: '1px solid var(--mol-color-border)',
              borderRadius: '9999px',
              padding: '4px',
            }}
          >
            {(['monthly', 'quarterly', 'annual'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                data-period={p}
                className={cm.cn(cm.fontWeight(period === p ? 'bold' : 'medium'))}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: period === p ? 'var(--color-primary-dark)' : 'transparent',
                  color:
                    period === p
                      ? 'var(--color-sidebar-text-active)'
                      : 'var(--mol-color-text-secondary)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {t(`reports.period.${p}`, {}, { defaultValue: p })}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            data-action="export-invoices"
            style={{
              padding: '8px 16px',
              borderRadius: '9999px',
              backgroundColor: 'var(--mol-color-surface)',
              color: 'var(--color-primary-dark)',
              fontWeight: 600,
              fontSize: '12px',
              border: '1px solid var(--mol-color-border)',
              cursor: exporting ? 'not-allowed' : 'pointer',
              opacity: exporting ? 0.6 : 1,
            }}
          >
            {exporting
              ? t('reports.exporting', {}, { defaultValue: 'Exporting…' })
              : t('common.exportCsv', {}, { defaultValue: 'Export CSV' })}
          </button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-overdue-light)',
            color: 'var(--color-danger-hover)',
            borderRadius: '12px',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <KpiStatCard
          label={t('reports.kpi.revenue', {}, { defaultValue: 'Revenue YTD' })}
          value={formatCurrency(yearRevenue)}
          icon="trending_up"
          tone="revenue"
        />
        <KpiStatCard
          label={t('reports.kpi.taxOwed', {}, { defaultValue: 'Tax owed' })}
          value={formatCurrency(yearTax)}
          icon="account_balance"
          tone="outstanding"
          caption={t('reports.kpi.taxCaption', {}, { defaultValue: 'Estimated' })}
        />
        <KpiStatCard
          label={t('reports.kpi.dso', {}, { defaultValue: 'DSO avg' })}
          value={`${dso.toFixed(1)} d`}
          icon="speed"
          tone="collected"
        />
        <KpiStatCard
          label={t('status.outstanding', {}, { defaultValue: 'Outstanding' })}
          value={formatCurrency(agingTotal)}
          icon="schedule_send"
          tone="neutral"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px' }}>
        <ChartCard
          title={t('reports.chart.revenue', {}, { defaultValue: 'Revenue overview' })}
          caption={t('reports.chart.revenueCaption', {}, { defaultValue: 'Period revenue' })}
        >
          <RevenueAreaChart series={revenueSeries} />
        </ChartCard>
        <ChartCard
          title={t('reports.chart.aging', {}, { defaultValue: 'Invoice aging' })}
          caption={t('reports.chart.agingCaption', {}, { defaultValue: 'Outstanding by status' })}
        >
          <AgingBarChart aging={aging} />
        </ChartCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <ChartCard
          title={t('reports.chart.topClients', {}, { defaultValue: 'Top clients' })}
          caption={t(
            'reports.chart.topClientsCaption',
            {},
            { defaultValue: 'Lifetime revenue, top 5' },
          )}
        >
          <TopClientsList rows={topRows} />
        </ChartCard>
        <ChartCard
          title={t('reports.chart.methods', {}, { defaultValue: 'Payment methods' })}
          caption={t(
            'reports.chart.methodsCaption',
            {},
            { defaultValue: 'Share of collected payments' },
          )}
        >
          <MethodsBreakdown slices={methodSlices} total={methodsTotal} />
        </ChartCard>
      </div>
    </div>
  )
}

function ChartCard({
  title,
  caption,
  children,
}: {
  title: string
  caption?: string
  children: React.ReactNode
}) {
  return (
    <section
      style={{
        padding: '24px',
        backgroundColor: 'var(--mol-color-surface)',
        borderRadius: '20px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04)',
        border: '1px solid var(--mol-color-border)',
      }}
    >
      <h3
        style={{
          fontSize: '16px',
          fontWeight: 700,
          color: 'var(--mol-color-text)',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h3>
      {caption ? (
        <p
          style={{
            fontSize: '12px',
            color: 'var(--mol-color-text-secondary)',
            margin: '4px 0 16px',
          }}
        >
          {caption}
        </p>
      ) : (
        <div style={{ height: '12px' }} />
      )}
      {children}
    </section>
  )
}

function RevenueAreaChart({ series }: { series: Array<{ label: string; value: number }> }) {
  const { t } = useTranslation()
  if (series.length === 0) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          color: 'var(--mol-color-text-tertiary)',
          fontSize: '13px',
        }}
      >
        {t('reports.empty.revenue', {}, { defaultValue: 'No revenue data yet.' })}
      </div>
    )
  }
  const max = Math.max(...series.map((d) => d.value), 1)
  const points = series.map((d, i) => {
    const x = (i / Math.max(1, series.length - 1)) * 400
    const y = 200 - (d.value / max) * 180
    return [x, y] as const
  })
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  const fill = `${path} L 400 200 L 0 200 Z`

  return (
    <div>
      <svg viewBox="0 0 400 220" style={{ width: '100%', height: '220px' }} aria-hidden="true">
        <defs>
          <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--mol-color-primary)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--mol-color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fill} fill="url(#rev-grad)" />
        <path
          d={path}
          fill="none"
          stroke="var(--mol-color-primary)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {points.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={4}
            fill={i === points.length - 1 ? 'var(--color-accent)' : 'var(--color-on-primary)'}
            stroke="var(--mol-color-primary)"
            strokeWidth={2}
          />
        ))}
      </svg>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '8px',
          fontSize: '10px',
          color: 'var(--mol-color-text-tertiary)',
          letterSpacing: '0.05em',
        }}
      >
        {series.map((d, i) => (
          <span key={`${d.label}-${i}`}>{d.label}</span>
        ))}
      </div>
    </div>
  )
}

function AgingBarChart({ aging }: { aging: AgingRow[] }) {
  const { t } = useTranslation()
  if (aging.length === 0) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          color: 'var(--mol-color-text-tertiary)',
          fontSize: '13px',
        }}
      >
        {t('reports.empty.aging', {}, { defaultValue: 'No outstanding invoices.' })}
      </div>
    )
  }
  const max = Math.max(...aging.map((d) => Number(d.total_outstanding ?? 0)), 1)
  return (
    <div>
      {aging.map((bucket) => {
        const amount = Number(bucket.total_outstanding ?? 0)
        const color =
          bucket.status === 'overdue'
            ? 'var(--color-overdue)'
            : bucket.status === 'partial'
              ? 'var(--color-unpaid)'
              : 'var(--mol-color-primary)'
        return (
          <div key={bucket.status} style={{ marginBottom: '14px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px',
                fontSize: '12px',
                color: 'var(--mol-color-text-secondary)',
              }}
            >
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{bucket.status}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color }}>
                {formatCurrency(amount)}
              </span>
            </div>
            <div
              style={{
                height: '10px',
                backgroundColor: 'var(--color-draft-light)',
                borderRadius: '9999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.round((amount / max) * 100)}%`,
                  height: '100%',
                  backgroundColor: color,
                  borderRadius: '9999px',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TopClientsList({
  rows,
}: {
  rows: Array<{ client_id: string; name: string; revenue: number }>
}) {
  const { t } = useTranslation()
  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          color: 'var(--mol-color-text-tertiary)',
          fontSize: '13px',
        }}
      >
        {t('reports.empty.topClients', {}, { defaultValue: 'No client revenue data yet.' })}
      </div>
    )
  }
  const max = Math.max(...rows.map((c) => c.revenue), 1)
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {rows.map((c, idx) => (
        <li
          key={c.client_id}
          style={{
            display: 'grid',
            gridTemplateColumns: '24px 1fr auto',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 0',
            borderBottom: idx === rows.length - 1 ? 'none' : '1px solid var(--color-draft-light)',
          }}
        >
          <span
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '9999px',
              backgroundColor: PALETTE[idx % PALETTE.length],
              color: 'var(--color-sidebar-text-active)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            {idx + 1}
          </span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--mol-color-text)' }}>
              {c.name}
            </div>
            <div
              style={{
                marginTop: '4px',
                height: '6px',
                width: '100%',
                backgroundColor: 'var(--color-draft-light)',
                borderRadius: '9999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.round((c.revenue / max) * 100)}%`,
                  backgroundColor: PALETTE[idx % PALETTE.length],
                }}
              />
            </div>
          </div>
          <span
            style={{
              fontWeight: 700,
              color: 'var(--color-primary-dark)',
              fontVariantNumeric: 'tabular-nums',
              fontSize: '13px',
            }}
          >
            {formatCurrency(c.revenue)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function MethodsBreakdown({
  slices,
  total,
}: {
  slices: Array<{ label: string; pct: number; color: string }>
  total: number
}) {
  const { t } = useTranslation()
  if (slices.length === 0) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          color: 'var(--mol-color-text-tertiary)',
          fontSize: '13px',
        }}
      >
        {t('reports.empty.methods', {}, { defaultValue: 'No payment data yet.' })}
      </div>
    )
  }
  let cumulative = 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      <svg viewBox="0 0 120 120" width={140} height={140} aria-hidden="true">
        <circle
          cx="60"
          cy="60"
          r="48"
          stroke="var(--mol-color-border)"
          strokeWidth="20"
          fill="none"
        />
        {slices.map((m) => {
          const dash = m.pct * 2 * Math.PI * 48
          const offset = -cumulative * 2 * Math.PI * 48
          cumulative += m.pct
          return (
            <circle
              key={m.label}
              cx="60"
              cy="60"
              r="48"
              stroke={m.color}
              strokeWidth="20"
              fill="none"
              strokeDasharray={`${dash} 999`}
              strokeDashoffset={offset}
              transform="rotate(-90 60 60)"
            />
          )
        })}
        <text
          x="60"
          y="56"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="var(--mol-color-text-secondary)"
          letterSpacing="2"
        >
          {t(
            'reports.donut.ofTotal',
            { amount: formatCurrency(total) },
            { defaultValue: 'OF {{amount}}' },
          )}
        </text>
        <text
          x="60"
          y="74"
          textAnchor="middle"
          fontSize="14"
          fontWeight="800"
          fill="var(--mol-color-text)"
        >
          100%
        </text>
      </svg>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1 }}>
        {slices.map((m) => (
          <li
            key={m.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 0',
              fontSize: '13px',
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '9999px',
                backgroundColor: m.color,
              }}
            />
            <span style={{ flex: 1, color: 'var(--mol-color-text)', textTransform: 'capitalize' }}>
              {m.label}
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: m.color }}>
              {Math.round(m.pct * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Reports
