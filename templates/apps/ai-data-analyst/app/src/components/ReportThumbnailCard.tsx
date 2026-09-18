/**
 * Bespoke report card — gradient mini-chart header (8-bar series), title +
 * description, schedule pill (daily / weekly / monthly / on-demand), shared-
 * with avatar count, and "RUN Xh AGO" eyebrow.
 *
 * Translated from blog/ArticleListItem.tsx (editorial header + meta footer)
 * and personal-finance/MonthlyCashFlowCard.tsx (gradient chart band + label
 * row). The gradient header doubles as the visual "thumbnail" for the
 * report so users can scan the wall of cards by chart shape.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type ReportSchedule = 'daily' | 'weekly' | 'monthly'

export interface ReportThumbnailData {
  id: string
  title: string
  description: string
  chart_type: 'bar' | 'line' | 'scatter' | 'heatmap' | 'pie' | 'table'
  schedule?: ReportSchedule | null
  shared_with: string[]
  last_run_at: string
  thumbnail_series: number[]
}

const SCHEDULE_TONE: Record<ReportSchedule, string> = {
  daily: 'bg-success/10 text-success',
  weekly: 'bg-primary/10 text-primary',
  monthly: 'bg-secondary/10 text-secondary',
}

const CHART_ICON: Record<ReportThumbnailData['chart_type'], string> = {
  bar: 'bar_chart',
  line: 'show_chart',
  scatter: 'scatter_plot',
  heatmap: 'grid_view',
  pie: 'pie_chart',
  table: 'table_view',
}

function fmtRelative(iso: string): string {
  const d = new Date(iso)
  const diffH = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60))
  if (diffH < 1) return 'just now'
  if (diffH < 24) return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}

export interface ReportThumbnailCardProps {
  report: ReportThumbnailData
}

export function ReportThumbnailCard({ report }: ReportThumbnailCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const max = Math.max(...report.thumbnail_series, 1)
  const min = Math.min(...report.thumbnail_series, 0)
  const range = Math.max(1, max - min)
  const isLine = report.chart_type === 'line' || report.chart_type === 'scatter'
  const points = report.thumbnail_series
    .map((p, i, arr) => {
      const x = (i / Math.max(1, arr.length - 1)) * 200
      const y = 80 - ((p - min) / range) * 64
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const areaPath = `M0,80 L${points.split(' ').join(' L')} L200,80 Z`

  return (
    <Link
      to={`/reports/${report.id}`}
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'rounded-2xl bg-surface-container-lowest border border-outline-variant/50 overflow-hidden shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 transition-all duration-200 group',
      )}
    >
      <div
        className={
          'relative h-32 bg-gradient-to-br from-primary to-primary-container overflow-hidden'
        }
      >
        <svg
          viewBox="0 0 200 80"
          preserveAspectRatio="none"
          className={'w-full h-full'}
          aria-hidden="true"
        >
          {isLine ? (
            <>
              <path d={areaPath} fill="white" opacity="0.18" />
              <polyline
                points={points}
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : (
            report.thumbnail_series.map((v, i, arr) => {
              const w = 200 / arr.length
              const x = i * w + 2
              const h = ((v - min) / range) * 70
              return (
                <rect
                  key={i}
                  x={x}
                  y={75 - h}
                  width={w - 4}
                  height={h}
                  fill="white"
                  opacity={0.85}
                  rx={1.5}
                />
              )
            })
          )}
        </svg>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 1 }),
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.roundedFull,
            'absolute top-3 left-3 bg-surface-container-highest/80 backdrop-blur-md text-on-surface text-[10px] font-bold uppercase tracking-widest',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined', cm.textSize('xs'))}
            aria-hidden="true"
          >
            {CHART_ICON[report.chart_type]}
          </span>
          {report.chart_type}
        </span>
        <span
          aria-hidden="true"
          className={'absolute -right-12 -bottom-12 w-32 h-32 rounded-full bg-surface/10 blur-2xl'}
        />
      </div>

      <div className={cm.cn(cm.flex({ direction: 'col', gap: 3 }), cm.sp('p', 5))}>
        <div className={cm.flex({ direction: 'col', gap: 1 })}>
          <h3
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('bold'),
              'font-headline tracking-tight leading-snug text-on-surface group-hover:text-primary transition-colors',
            )}
          >
            {report.title}
          </h3>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'text-on-surface-variant leading-relaxed line-clamp-2',
            )}
          >
            {report.description}
          </p>
        </div>

        <footer className={cm.flex({ align: 'center', justify: 'between' })}>
          {report.schedule ? (
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.sp('py', 1),
                cm.roundedFull,
                'text-[10px] uppercase tracking-widest font-black',
                SCHEDULE_TONE[report.schedule],
              )}
            >
              {report.schedule}
            </span>
          ) : (
            <span
              className={cm.cn(
                'text-[10px] uppercase tracking-widest font-bold text-on-surface-variant',
              )}
            >
              {t('reportThumbnailCard.onDemand', {}, { defaultValue: 'on demand' })}
            </span>
          )}
          <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
            {report.shared_with.length > 0 ? (
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 1 }),
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined', cm.textSize('xs'))}
                  aria-hidden="true"
                >
                  group
                </span>
                <span className={'tabular-nums'}>{report.shared_with.length}</span>
              </span>
            ) : null}
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
              {t(
                'reportThumbnailCard.runPrefix',
                { when: fmtRelative(report.last_run_at) },
                { defaultValue: 'run {{when}}' },
              )}
            </span>
          </div>
        </footer>
      </div>
    </Link>
  )
}

export default ReportThumbnailCard
