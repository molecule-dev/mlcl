import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type EnergyKpi, EnergyKpiTriad } from '../components/EnergyKpiTriad.js'
import { unwrapList } from '../lib/unwrap.js'

interface DailyApiRow {
  date: string
  consumption?: number | string
  production?: number | string
  net_export?: number | string
  total?: number | string
  cost?: number | string
  peak_cost?: number | string
  off_peak_cost?: number | string
}

interface DailyRow {
  date: string
  consumption: number
  production: number
  netExport: number
  cost: number
  peakCost: number
  offPeakCost: number
}

interface MeterRow {
  id: string
  name: string
  type: string
}

const RANGES = [
  { key: '7d', defaultLabel: '7D', days: 7 },
  { key: '30d', defaultLabel: '30D', days: 30 },
  { key: '90d', defaultLabel: '90D', days: 90 },
  { key: '1y', defaultLabel: '1Y', days: 365 },
] as const

export function Reports() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rows, setRows] = useState<DailyRow[] | null>(null)
  const [meters, setMeters] = useState<MeterRow[]>([])
  const [meterFilter, setMeterFilter] = useState<string>('all')
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('30d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const m = await http.get<MeterRow[]>('/api/meters')
        if (cancelled) return
        setMeters(unwrapList<MeterRow>(m))
      } catch (_error) {
        // meters list optional — page still works without meter filter
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const days = RANGES.find((r) => r.key === range)?.days ?? 30
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days)
    const meterParam = meterFilter !== 'all' ? `&meter_id=${encodeURIComponent(meterFilter)}` : ''
    http
      .get<DailyApiRow[]>(
        `/api/readings/daily?start_date=${start.toISOString()}&end_date=${end.toISOString()}${meterParam}`,
      )
      .then((payload) => {
        if (cancelled) return
        const list = unwrapList<DailyApiRow>(payload)
        setRows(
          list.map((item) => ({
            date: String(item.date ?? ''),
            consumption: Number(item.consumption ?? item.total ?? 0),
            production: Number(item.production ?? 0),
            netExport: Number(item.net_export ?? 0),
            cost: Number(item.cost ?? 0),
            peakCost: Number(item.peak_cost ?? 0),
            offPeakCost: Number(item.off_peak_cost ?? 0),
          })),
        )
      })
      .catch((err) => {
        if (cancelled) return
        const msg =
          err instanceof Error
            ? err.message
            : t('reports.loadError', {}, { defaultValue: 'Could not load reports.' })
        setError(msg)
        setRows([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t, range, meterFilter])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- list is derived inline; stable identity not guaranteed but value equality is sufficient
  const list = rows ?? []

  const totals = useMemo(() => {
    return list.reduce(
      (acc, r) => ({
        consumption: acc.consumption + r.consumption,
        production: acc.production + r.production,
        cost: acc.cost + r.cost,
        peakCost: acc.peakCost + r.peakCost,
        offPeakCost: acc.offPeakCost + r.offPeakCost,
      }),
      { consumption: 0, production: 0, cost: 0, peakCost: 0, offPeakCost: 0 },
    )
  }, [list])

  // Older API responses carry no peak/off-peak split — a flat rate means the
  // whole bill is off-peak, so fall back to that instead of showing $0 slices.
  const splitKnown = totals.peakCost + totals.offPeakCost > 0
  const peakShare = splitKnown ? totals.peakCost : 0
  const offPeakShare = splitKnown ? totals.offPeakCost : totals.cost
  const peakPct = totals.cost > 0 ? Math.round((peakShare / totals.cost) * 100) : 0

  const max = Math.max(1, ...list.map((r) => Math.max(r.consumption, r.production)))

  const kpis: EnergyKpi[] = [
    {
      key: 'consumption',
      label: 'Total consumption',
      value: `${totals.consumption.toFixed(1)} kWh`,
      icon: 'electric_bolt',
      tint: 'text-primary',
    },
    {
      key: 'production',
      label: 'Total production',
      value: `${totals.production.toFixed(1)} kWh`,
      icon: 'solar_power',
      tint: 'text-warning',
    },
    {
      key: 'cost',
      label: 'Total cost',
      value: `$${totals.cost.toFixed(2)}`,
      icon: 'savings',
      tint: 'text-error',
    },
  ]

  function downloadCsv(): void {
    const header = 'date,consumption_kwh,production_kwh,net_export_kwh,cost_usd\n'
    const body = list
      .map(
        (r) =>
          `${r.date},${r.consumption.toFixed(3)},${r.production.toFixed(3)},${r.netExport.toFixed(3)},${r.cost.toFixed(2)}`,
      )
      .join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `energy-${range}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      data-mol-id="reports-page"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}
    >
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('reports.eyebrow', {}, { defaultValue: 'Historical usage' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.reports', {}, { defaultValue: 'Reports' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'reports.subheading',
            {},
            {
              defaultValue:
                'Daily totals for consumption, production, and cost — broken down by date.',
            },
          )}
        </p>
      </header>

      {error ? (
        <p
          data-mol-id="reports-error"
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'bg-error-container text-on-error-container rounded-xl text-sm',
          )}
        >
          {error}
        </p>
      ) : null}

      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              data-mol-id={`reports-range-${r.key}`}
              onClick={() => setRange(r.key)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest transition-all',
                range === r.key
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
            >
              {t(`reports.range.${r.key}`, {}, { defaultValue: r.defaultLabel })}
            </button>
          ))}
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
          {meters.length > 0 ? (
            <select
              data-mol-id="reports-meter"
              value={meterFilter}
              onChange={(e) => setMeterFilter(e.target.value)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                'bg-surface rounded-full border border-outline-variant focus:border-primary outline-none text-xs uppercase tracking-widest font-bold max-w-full min-w-0',
              )}
            >
              <option value="all">
                {t('reports.allMeters', {}, { defaultValue: 'All meters' })}
              </option>
              {meters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            data-mol-id="reports-export"
            onClick={downloadCsv}
            disabled={list.length === 0}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest bg-primary text-on-primary hover:bg-primary/90 transition-all disabled:opacity-50',
            )}
          >
            <span
              className={'material-symbols-outlined text-base align-middle mr-1'}
              aria-hidden="true"
            >
              download
            </span>
            {t('reports.exportCsv', {}, { defaultValue: 'Download CSV' })}
          </button>
        </div>
      </div>

      <EnergyKpiTriad kpis={kpis} />

      {loading && rows === null ? (
        <p
          data-mol-id="reports-loading"
          className={cm.cn(
            cm.sp('p', 6),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
          )}
        >
          {t('reports.loading', {}, { defaultValue: 'Aggregating readings\u2026' })}
        </p>
      ) : list.length === 0 ? (
        <p
          data-mol-id="reports-empty"
          className={cm.cn(
            cm.sp('p', 6),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
          )}
        >
          {t(
            'reports.empty',
            {},
            { defaultValue: 'No readings in this range — pick a wider window or wait for ingest.' },
          )}
        </p>
      ) : (
        <>
          <section
            data-mol-id="reports-cost-breakdown"
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface-container-lowest rounded-2xl grid gap-6 md:grid-cols-[auto,1fr] md:items-center',
            )}
          >
            <div>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
                {t('reports.costBreakdown', {}, { defaultValue: 'Cost breakdown' })}
              </h2>
              <div className={cm.cn('relative w-40 h-40 mx-auto flex items-center justify-center')}>
                <div
                  data-mol-id="reports-cost-donut"
                  role="img"
                  aria-label={t(
                    'reports.costDonutLabel',
                    { peak: peakShare.toFixed(2), offPeak: offPeakShare.toFixed(2) },
                    {
                      defaultValue: `Cost breakdown donut — peak $${peakShare.toFixed(2)}, off-peak $${offPeakShare.toFixed(2)}`,
                    },
                  )}
                  className={cm.cn('absolute inset-0 rounded-full')}
                  style={{
                    background: `conic-gradient(var(--color-primary) 0% ${peakPct}%, var(--color-secondary) ${peakPct}% 100%)`,
                  }}
                />
                <div
                  className={cm.cn(
                    'absolute inset-4 bg-surface rounded-full flex flex-col items-center justify-center border border-outline-variant',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant font-medium uppercase tracking-wider',
                    )}
                  >
                    {t('reports.costTotal', {}, { defaultValue: 'Total' })}
                  </span>
                  <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tabular-nums')}>
                    ${totals.cost.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
            <div className={cm.cn(cm.stack(3))}>
              {[
                {
                  key: 'peak',
                  label: t('reports.costPeak', {}, { defaultValue: 'Peak time' }),
                  value: peakShare,
                  swatch: 'bg-primary',
                },
                {
                  key: 'offPeak',
                  label: t('reports.costOffPeak', {}, { defaultValue: 'Off-peak' }),
                  value: offPeakShare,
                  swatch: 'bg-secondary',
                },
              ].map((slice) => (
                <div
                  key={slice.key}
                  data-mol-id={`reports-cost-slice-${slice.key}`}
                  className={cm.cn(
                    cm.flex({ justify: 'between', align: 'center' }),
                    cm.textSize('sm'),
                  )}
                >
                  <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <span
                      aria-hidden="true"
                      className={cm.cn(slice.swatch, 'w-2.5 h-2.5 rounded-full shrink-0')}
                    />
                    {slice.label}
                  </span>
                  <span className={cm.cn(cm.fontWeight('semibold'), 'tabular-nums')}>
                    ${slice.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
              {t('reports.tableHeading', {}, { defaultValue: 'Daily breakdown' })}
            </h2>
            <div className={cm.cn('overflow-x-auto')}>
              <table data-mol-id="reports-table" className={cm.cn('w-full text-sm')}>
                <thead>
                  <tr className={cm.cn('text-left text-on-surface-variant')}>
                    {[
                      { key: 'date', defaultLabel: 'Date' },
                      { key: 'consumption', defaultLabel: 'Consumption' },
                      { key: 'production', defaultLabel: 'Production' },
                      { key: 'netExport', defaultLabel: 'Net export' },
                      { key: 'cost', defaultLabel: 'Cost' },
                    ].map((h) => (
                      <th
                        key={h.key}
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          cm.fontWeight('bold'),
                          'text-[10px] uppercase tracking-widest',
                        )}
                      >
                        {t(`reports.col.${h.key}`, {}, { defaultValue: h.defaultLabel })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={cm.cn('divide-y divide-surface-container')}>
                  {list.map((row) => (
                    <tr
                      key={row.date}
                      data-mol-id={`reports-row-${row.date}`}
                      className={cm.cn('hover:bg-surface-container/50 transition-colors')}
                    >
                      <td
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 3),
                          cm.fontWeight('semibold'),
                          'tabular-nums',
                        )}
                      >
                        {row.date}
                      </td>
                      <td className={cm.cn(cm.sp('px', 3), cm.sp('py', 3))}>
                        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                          <span className={cm.cn(cm.fontWeight('bold'), 'tabular-nums w-20')}>
                            {row.consumption.toFixed(1)}
                          </span>
                          <div
                            className={cm.cn(
                              'flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden',
                            )}
                            aria-hidden="true"
                          >
                            <div
                              className={cm.cn('h-full bg-primary rounded-full')}
                              style={{ width: `${(row.consumption / max) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className={cm.cn(cm.sp('px', 3), cm.sp('py', 3))}>
                        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                          <span
                            className={cm.cn(
                              cm.fontWeight('bold'),
                              'tabular-nums w-20 text-warning',
                            )}
                          >
                            {row.production.toFixed(1)}
                          </span>
                          <div
                            className={cm.cn(
                              'flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden',
                            )}
                            aria-hidden="true"
                          >
                            <div
                              className={cm.cn('h-full bg-warning rounded-full')}
                              style={{ width: `${(row.production / max) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 3),
                          cm.fontWeight('semibold'),
                          'tabular-nums',
                          row.netExport >= 0 ? 'text-success' : 'text-error',
                        )}
                      >
                        {row.netExport >= 0 ? '+' : ''}
                        {row.netExport.toFixed(1)}
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 3),
                          cm.fontWeight('semibold'),
                          'tabular-nums',
                        )}
                      >
                        ${row.cost.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
