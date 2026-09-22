import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { InventoryKpiCard } from '../components/InventoryKpiCard.js'

interface TurnoverPoint {
  label: string
  value: number
}

interface AgingBucket {
  bucket: string
  value: number
  color: string
}

interface TopValueRow {
  sku: string
  name: string
  value: number
  share: number
}

interface ReportSummary {
  range: 'wk' | 'mo' | 'qtr'
  kpis: {
    turnoverLtm: number
    daysOnHand: number
    valuationDollars: number
    forecastAccuracyPercent: number
  }
  turnoverTrend: TurnoverPoint[]
  aging: AgingBucket[]
  topValue: TopValueRow[]
  totals: {
    totalCost: number
    totalSell: number
    totalUnits: number
    uniqueSkus: number
  }
}

const EMPTY: ReportSummary = {
  range: 'mo',
  kpis: { turnoverLtm: 0, daysOnHand: 0, valuationDollars: 0, forecastAccuracyPercent: 0 },
  turnoverTrend: [],
  aging: [
    { bucket: '0–30 d', value: 0, color: 'var(--color-stock-in)' },
    { bucket: '31–60 d', value: 0, color: 'var(--color-stock-low)' },
    { bucket: '61–90 d', value: 0, color: 'var(--color-stock-overstock)' },
    { bucket: '90+ d', value: 0, color: 'var(--color-stock-out)' },
  ],
  topValue: [],
  totals: { totalCost: 0, totalSell: 0, totalUnits: 0, uniqueSkus: 0 },
}

function formatDollars(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

export function Reports() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [range, setRange] = useState<'wk' | 'mo' | 'qtr'>('mo')
  const [summary, setSummary] = useState<ReportSummary>(EMPTY)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = (await http.get(`/reports/summary?range=${range}`)) as
          { data?: Partial<ReportSummary> } | Partial<ReportSummary> | null
        if (cancelled) return
        const body = (res as { data?: Partial<ReportSummary> } | null)?.data ?? res
        const data = (body ?? {}) as Partial<ReportSummary>
        setSummary({
          range: (data.range as ReportSummary['range']) ?? range,
          kpis: {
            turnoverLtm: Number(data.kpis?.turnoverLtm ?? 0),
            daysOnHand: Number(data.kpis?.daysOnHand ?? 0),
            valuationDollars: Number(data.kpis?.valuationDollars ?? 0),
            forecastAccuracyPercent: Number(data.kpis?.forecastAccuracyPercent ?? 0),
          },
          turnoverTrend: Array.isArray(data.turnoverTrend)
            ? data.turnoverTrend.map((p) => ({
                label: String(p.label ?? ''),
                value: Number(p.value ?? 0),
              }))
            : [],
          aging:
            Array.isArray(data.aging) && data.aging.length > 0
              ? data.aging.map((b) => ({
                  bucket: String(b.bucket ?? ''),
                  value: Number(b.value ?? 0),
                  color: String(b.color ?? 'var(--color-stock-in)'),
                }))
              : EMPTY.aging,
          topValue: Array.isArray(data.topValue)
            ? data.topValue.map((row) => ({
                sku: String(row.sku ?? ''),
                name: String(row.name ?? ''),
                value: Number(row.value ?? 0),
                share: Number(row.share ?? 0),
              }))
            : [],
          totals: {
            totalCost: Number(data.totals?.totalCost ?? 0),
            totalSell: Number(data.totals?.totalSell ?? 0),
            totalUnits: Number(data.totals?.totalUnits ?? 0),
            uniqueSkus: Number(data.totals?.uniqueSkus ?? 0),
          },
        })
      } catch (_error) {
        // error shown via empty state (EMPTY summary); no further handling needed
        if (!cancelled) setSummary(EMPTY)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, range])

  const turnover =
    summary.turnoverTrend.length > 0
      ? summary.turnoverTrend
      : EMPTY.aging.map((_, i) => ({ label: `Wk ${i + 1}`, value: 1 }))
  const max = Math.max(...turnover.map((p) => p.value), 1)
  const points = turnover
    .map((p, i) => {
      const x = (i / Math.max(1, turnover.length - 1)) * 100
      const y = 100 - (p.value / max) * 100
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  const maxShare = summary.topValue.reduce((m, r) => Math.max(m, r.share), 1)

  return (
    <div className={cm.stack(6)}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(1)}>
          <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
            {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
            {t('nav.reports', {}, { defaultValue: 'Reports' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'reports.subtitle',
              {},
              { defaultValue: 'Turnover, aging, valuation, and forecast — across the network.' },
            )}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.flex({ gap: 'xs' }),
            'rounded-lg border border-outline-variant bg-surface-container-lowest p-1',
          )}
        >
          {(['wk', 'mo', 'qtr'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              data-testid={`reports-range-${option}`}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                // 44px-wide / 36px-tall tap target on touch screens.
                'inline-flex min-h-[36px] min-w-[44px] items-center justify-center rounded-md text-xs uppercase tracking-wider transition-colors',
                range === option
                  ? 'bg-primary text-white shadow'
                  : 'text-on-surface-variant hover:bg-background-secondary',
              )}
            >
              {t(`reports.range.${option}`, {}, { defaultValue: option.toUpperCase() })}
            </button>
          ))}
        </div>
      </header>

      <section className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4')}>
        <InventoryKpiCard
          label={t('reports.kpis.turnover', {}, { defaultValue: 'Turnover (LTM)' })}
          value={`${summary.kpis.turnoverLtm.toFixed(1)}×`}
          tone="primary"
          icon="loop"
        />
        <InventoryKpiCard
          label={t('reports.kpis.daysOnHand', {}, { defaultValue: 'Days on hand' })}
          value={String(summary.kpis.daysOnHand)}
          tone="info"
          icon="schedule"
        />
        <InventoryKpiCard
          label={t('reports.kpis.valuation', {}, { defaultValue: 'Valuation' })}
          value={formatDollars(summary.kpis.valuationDollars)}
          tone="success"
          icon="payments"
        />
        <InventoryKpiCard
          label={t('reports.kpis.forecast', {}, { defaultValue: 'Forecast accuracy' })}
          value={`${summary.kpis.forecastAccuracyPercent}%`}
          tone="overstock"
          icon="auto_awesome"
          hint={t('status.last30Days', {}, { defaultValue: 'Last 30 days' })}
        />
      </section>

      <div className={cm.cn('grid lg:grid-cols-3 gap-6 [&>*]:min-w-0')}>
        <article
          data-testid="reports-turnover-chart"
          className={cm.cn(
            cm.stack(4),
            cm.sp('p', 6),
            'lg:col-span-2 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
          )}
        >
          <header>
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
              )}
            >
              {t('reports.turnover.eyebrow', {}, { defaultValue: 'Turnover trend' })}
            </p>
            <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
              {t('reports.turnover.title', {}, { defaultValue: 'Inventory turnover' })}
            </h2>
          </header>
          <svg
            viewBox="0 0 100 100"
            className={cm.cn('w-full h-48')}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="turnover-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={`0,100 ${points} 100,100`} fill="url(#turnover-fill)" stroke="none" />
            <polyline
              points={points}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              'text-[11px] text-on-surface-variant',
            )}
          >
            {turnover.map((point) => (
              <span key={point.label}>{point.label}</span>
            ))}
          </div>
        </article>

        <article
          className={cm.cn(
            cm.stack(4),
            cm.sp('p', 6),
            'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
          )}
        >
          <header>
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
              )}
            >
              {t('reports.aging.eyebrow', {}, { defaultValue: 'Aging' })}
            </p>
            <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
              {t('reports.aging.title', {}, { defaultValue: 'How old is my stock?' })}
            </h2>
          </header>
          <div className={cm.stack(3)}>
            {summary.aging.map((bucket) => (
              <div key={bucket.bucket} className={cm.stack(1)}>
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'text-sm')}>
                  <span className={cm.cn('font-semibold text-on-surface')}>{bucket.bucket}</span>
                  <span className={cm.cn('font-mono tabular-nums')} style={{ color: bucket.color }}>
                    {bucket.value}%
                  </span>
                </div>
                <div className={cm.cn('h-2 rounded-full bg-background-secondary overflow-hidden')}>
                  <div
                    className={cm.cn('h-full rounded-full')}
                    style={{ width: `${bucket.value}%`, backgroundColor: bucket.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <section
        data-testid="reports-top-value"
        className={cm.cn(
          cm.stack(4),
          cm.sp('p', 6),
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
        )}
      >
        <header>
          <p
            className={cm.cn(
              'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
            )}
          >
            {t('reports.topValue.eyebrow', {}, { defaultValue: 'Concentration' })}
          </p>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
            {t('reports.topValue.title', {}, { defaultValue: 'Top SKUs by inventory value' })}
          </h2>
        </header>
        {summary.topValue.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant italic')}>
            {loading
              ? t('reports.topValue.loading', {}, { defaultValue: 'Computing top SKUs…' })
              : t(
                  'reports.topValue.empty',
                  {},
                  {
                    defaultValue:
                      'No stock on hand yet — receive a PO or add a product to populate this report.',
                  },
                )}
          </p>
        ) : (
          <div className={cm.cn('overflow-x-auto')}>
            <table className={cm.cn(cm.w('full'), 'text-left')}>
              <thead>
                <tr
                  className={cm.cn(
                    'border-b border-outline-variant/40 text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant',
                  )}
                >
                  <th className={cm.cn('py-2')}>SKU</th>
                  <th className={cm.cn('py-2')}>
                    {t('nav.product', {}, { defaultValue: 'Product' })}
                  </th>
                  <th className={cm.cn('py-2 text-right')}>
                    {t('reports.topValue.col.value', {}, { defaultValue: 'Value' })}
                  </th>
                  <th className={cm.cn('py-2 text-right')}>
                    {t('reports.topValue.col.share', {}, { defaultValue: '% of total' })}
                  </th>
                  <th className={cm.cn('py-2 w-32')}>
                    {t('reports.topValue.col.distribution', {}, { defaultValue: 'Distribution' })}
                  </th>
                </tr>
              </thead>
              <tbody className={cm.cn('divide-y divide-outline-variant/40')}>
                {summary.topValue.map((row) => (
                  <tr key={row.sku}>
                    <td
                      className={cm.cn('py-3 font-mono text-sm')}
                      style={{ color: 'var(--color-sku)' }}
                    >
                      {row.sku}
                    </td>
                    <td className={cm.cn('py-3 text-sm text-on-surface')}>{row.name}</td>
                    <td className={cm.cn('py-3 text-right font-mono text-sm tabular-nums')}>
                      ${row.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className={cm.cn('py-3 text-right font-mono text-sm tabular-nums')}>
                      {row.share}%
                    </td>
                    <td className={cm.cn('py-3')}>
                      <div
                        className={cm.cn(
                          'h-1.5 rounded-full bg-background-secondary overflow-hidden',
                        )}
                      >
                        <div
                          className={cm.cn('h-full rounded-full')}
                          style={{
                            width: `${(row.share / maxShare) * 100}%`,
                            backgroundColor: 'var(--color-primary)',
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default Reports
