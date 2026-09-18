import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CalciteKpiTile } from '../components/CalciteKpiTile.js'
import { WorkbenchLayout } from '../components/WorkbenchLayout.js'

const CHART_TYPES = [
  { id: 'line', label: 'Line', labelKey: 'charts.type.line', icon: 'show_chart' },
  { id: 'bar', label: 'Bar', labelKey: 'charts.type.bar', icon: 'bar_chart' },
  { id: 'area', label: 'Area', labelKey: 'charts.type.area', icon: 'area_chart' },
  { id: 'pie', label: 'Pie', labelKey: 'charts.type.pie', icon: 'pie_chart' },
  { id: 'scatter', label: 'Scatter', labelKey: 'charts.type.scatter', icon: 'scatter_plot' },
] as const

type ChartType = (typeof CHART_TYPES)[number]['id']

interface ChartRow {
  id: string
  sheet_id: string
  spreadsheet_id: string
  owner_id: string
  name: string
  type: string
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface SheetRow {
  id: string
  spreadsheet_id: string
  name: string
}

interface SpreadsheetDetail {
  id: string
  title: string
  sheets?: SheetRow[]
}

function buildPath(points: number[], width = 400, height = 160): string {
  if (points.length === 0) return ''
  const max = Math.max(1, ...points)
  const step = points.length > 1 ? width / (points.length - 1) : width
  return points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(height - (p / max) * (height - 16) - 8).toFixed(1)}`,
    )
    .join(' ')
}

export function Charts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id: routeId } = useParams<{ id: string }>()

  const [workbook, setWorkbook] = useState<SpreadsheetDetail | null>(null)
  const [charts, setCharts] = useState<ChartRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [chartType, setChartType] = useState<ChartType>('line')
  const [sheetId, setSheetId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const spreadsheetId = routeId ?? null

  useEffect(() => {
    let cancelled = false
    async function fetchAll() {
      setLoading(true)
      setError(null)
      try {
        if (spreadsheetId) {
          const [wbRes, chartRes] = await Promise.all([
            http.get<SpreadsheetDetail>(`/spreadsheets/${spreadsheetId}`),
            http.get<ChartRow[]>(`/charts?spreadsheet_id=${spreadsheetId}`),
          ])
          if (cancelled) return
          if (wbRes.data) {
            setWorkbook(wbRes.data)
            if (wbRes.data.sheets?.length && !sheetId) setSheetId(wbRes.data.sheets[0]!.id)
          }
          setCharts(Array.isArray(chartRes.data) ? chartRes.data : [])
        } else {
          const chartRes = await http.get<ChartRow[]>(`/charts`)
          if (cancelled) return
          setCharts(Array.isArray(chartRes.data) ? chartRes.data : [])
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchAll()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, spreadsheetId]) // sheetId intentionally omitted: only seed from sheets on mount; form state manages it

  async function createChart(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!name.trim() || !sheetId) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await http.post<ChartRow>('/charts', {
        sheet_id: sheetId,
        name: name.trim(),
        type: chartType,
        config: {},
      })
      if (res.data) setCharts((prev) => [res.data!, ...prev])
      setName('')
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteChart(chart: ChartRow): Promise<void> {
    if (
      !window.confirm(
        t('charts.confirmDelete', { name: chart.name }, { defaultValue: 'Delete "{{name}}"?' }),
      )
    )
      return
    try {
      await http.delete(`/charts/${chart.id}`)
      setCharts((prev) => prev.filter((c) => c.id !== chart.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  // Demo viz uses count of charts grouped by type to show something live
  const seriesByType = useMemo(() => {
    const groups: Record<string, number> = {}
    charts.forEach((c) => {
      groups[c.type] = (groups[c.type] ?? 0) + 1
    })
    return groups
  }, [charts])

  const seriesPoints = useMemo(
    () => CHART_TYPES.map((ct) => seriesByType[ct.id] ?? 0),
    [seriesByType],
  )
  const linePath = buildPath(seriesPoints)
  const linePathFill = `${linePath} L400,160 L0,160 Z`

  return (
    <WorkbenchLayout>
      <div
        className={cm.cn(cm.flex({ justify: 'between', align: 'end', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <p
            className={cm.cn(
              'text-[10px] uppercase tracking-[0.25em] font-bold text-on-surface-variant',
            )}
          >
            {workbook
              ? t(
                  'charts.eyebrow',
                  { id: workbook.id.slice(0, 8) },
                  { defaultValue: 'Workbook · {{id}}' },
                )
              : t('charts.allWorkbooks', {}, { defaultValue: 'All workbooks' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface mt-1',
            )}
          >
            {t('charts.headline', {}, { defaultValue: 'Charts' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('lg'), 'text-on-surface-variant')}>
            {t(
              'charts.subhead',
              {},
              {
                defaultValue:
                  'Live visualisations bound to your grid — re-render on every cell edit.',
              },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
          {workbook && (
            <button
              onClick={() => setShowForm((s) => !s)}
              type="button"
              disabled={!workbook.sheets?.length}
              className={
                'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-on-primary rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform disabled:opacity-50'
              }
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                add_circle
              </span>
              {showForm
                ? t('common.cancel', {}, { defaultValue: 'Cancel' })
                : t('charts.newChart', {}, { defaultValue: 'New chart' })}
            </button>
          )}
          {workbook && (
            <Link
              to={`/workbooks/${workbook.id}`}
              className={
                'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-on-surface-variant rounded-full border border-outline-variant hover:border-primary hover:text-primary transition-colors'
              }
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                grid_on
              </span>
              {t('charts.backToGrid', {}, { defaultValue: 'Back to grid' })}
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className={cm.cn(cm.sp('p', 4), 'text-sm text-error bg-error-container/40 rounded-2xl')}
        >
          {error}
        </div>
      )}

      {showForm && workbook?.sheets?.length ? (
        <form
          onSubmit={createChart}
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40',
          )}
          data-testid="chart-form"
        >
          <div className={cm.cn(cm.grid({ cols: 3, gap: 'md' }))}>
            <label className={cm.cn(cm.stack(1))}>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                {t('form.name', {}, { defaultValue: 'Name' })}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={t('charts.namePlaceholder', {}, { defaultValue: 'Revenue trend' })}
                className="px-3 py-2 text-sm bg-surface-container-low rounded-md border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className={cm.cn(cm.stack(1))}>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                {t('charts.field.sheet', {}, { defaultValue: 'Sheet' })}
              </span>
              <select
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                className="px-3 py-2 text-sm bg-surface-container-low rounded-md border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {workbook.sheets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={cm.cn(cm.stack(1))}>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                {t('form.type', {}, { defaultValue: 'Type' })}
              </span>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as ChartType)}
                className="px-3 py-2 text-sm bg-surface-container-low rounded-md border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {CHART_TYPES.map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {t(ct.labelKey, {}, { defaultValue: ct.label })}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }), cm.sp('mt', 4))}>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-on-primary rounded-full bg-primary hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.create', {}, { defaultValue: 'Create' })}
            </button>
          </div>
        </form>
      ) : null}

      <div className={cm.cn(cm.grid({ cols: 4, gap: 'lg' }))}>
        <CalciteKpiTile
          icon="insights"
          accent="primary"
          label={t('charts.kpi.totalCharts', {}, { defaultValue: 'Total charts' })}
          value={charts.length}
        />
        {CHART_TYPES.slice(0, 3).map((ct) => (
          <CalciteKpiTile
            key={ct.id}
            icon={ct.icon}
            accent="info"
            label={t(ct.labelKey, {}, { defaultValue: ct.label })}
            value={seriesByType[ct.id] ?? 0}
          />
        ))}
      </div>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }))}>
        <section
          className={cm.cn(
            'col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden',
          )}
        >
          <header
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 6),
              cm.sp('py', 4),
              'border-b border-outline-variant/40',
            )}
          >
            <div>
              <p
                className={cm.cn(
                  'text-[10px] uppercase tracking-widest font-bold text-on-surface-variant',
                )}
              >
                {t('charts.primary.eyebrow', {}, { defaultValue: 'Charts by type' })}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  'font-extrabold tracking-tight text-on-surface mt-1',
                )}
              >
                {t('charts.primary.headline', {}, { defaultValue: 'Workspace overview' })}
              </h2>
            </div>
          </header>
          <div className={cm.cn(cm.sp('p', 6))}>
            {charts.length === 0 ? (
              <p className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-on-surface-variant')}>
                {t(
                  'charts.empty',
                  {},
                  { defaultValue: 'No charts yet — create your first chart.' },
                )}
              </p>
            ) : (
              <svg viewBox="0 0 400 200" className={'w-full h-64'} aria-hidden="true">
                <defs>
                  <linearGradient id="primaryFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[40, 80, 120, 160].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="400"
                    y2={y}
                    stroke="var(--color-outline-variant)"
                    strokeOpacity="0.3"
                    strokeDasharray="2 4"
                  />
                ))}
                <path d={linePathFill} fill="url(#primaryFill)" />
                <path
                  d={linePath}
                  stroke="var(--color-primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                {seriesPoints.map((p, i) => (
                  <circle
                    key={i}
                    cx={(i * 400) / Math.max(1, seriesPoints.length - 1)}
                    cy={160 - (p / Math.max(1, ...seriesPoints)) * (160 - 16) - 8}
                    r="3"
                    fill="var(--color-primary)"
                  />
                ))}
              </svg>
            )}
          </div>
        </section>

        <section
          className={cm.cn(
            'col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden',
          )}
        >
          <header
            className={cm.cn(cm.sp('px', 6), cm.sp('py', 4), 'border-b border-outline-variant/40')}
          >
            <h2
              className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t('charts.list.headline', {}, { defaultValue: 'Saved charts' })}
            </h2>
          </header>
          {loading ? (
            <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : charts.length === 0 ? (
            <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
              {t('charts.list.empty', {}, { defaultValue: 'No charts yet.' })}
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant/40" data-testid="charts-list">
              {charts.map((c) => (
                <li
                  key={c.id}
                  data-testid={`chart-${c.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md' }),
                    cm.sp('px', 6),
                    cm.sp('py', 4),
                    'hover:bg-surface-container-low transition-colors',
                  )}
                >
                  <span className="material-symbols-outlined text-primary" aria-hidden="true">
                    {CHART_TYPES.find((ct) => ct.id === c.type)?.icon ?? 'show_chart'}
                  </span>
                  <div className={cm.cn(cm.flex1, 'min-w-0')}>
                    <p className="font-bold text-on-surface truncate">{c.name}</p>
                    <p className="text-xs text-on-surface-variant uppercase tracking-widest">
                      {c.type}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteChart(c)}
                    type="button"
                    aria-label={t(
                      'charts.delete',
                      { name: c.name },
                      { defaultValue: 'Delete {{name}}' },
                    )}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      delete
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </WorkbenchLayout>
  )
}

export default Charts
