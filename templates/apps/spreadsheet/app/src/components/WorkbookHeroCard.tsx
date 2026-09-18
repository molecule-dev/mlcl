import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface WorkbookHeroCardProps {
  /** Total active workbooks across the workspace. */
  workbookCount: number
  /** Cells touched in the current week (delta vs previous week). */
  cellsThisWeek: number
  cellsDeltaPct: number
  /** Active collaborators in the workspace. */
  activeCollaborators: number
  /** Pending automation runs queued for tonight. */
  pendingAutomations: number
  /** Sparkline points (cells/day for the last 14 days, normalized 0..100). */
  sparklinePoints?: number[]
}

const DEFAULT_SPARK = [42, 55, 48, 60, 58, 72, 65, 78, 70, 82, 76, 88, 84, 92]

function buildSparklinePath(points: number[]): string {
  if (points.length === 0) return ''
  const w = 400
  const h = 100
  const step = w / (points.length - 1)
  const ys = points.map((p) => h - (Math.max(0, Math.min(100, p)) / 100) * (h - 10) - 5)
  let d = `M0,${ys[0].toFixed(1)}`
  for (let i = 1; i < points.length; i++) {
    const x = i * step
    d += ` L${x.toFixed(1)},${ys[i].toFixed(1)}`
  }
  return d
}

/**
 * Gradient hero card — workspace headline metric (active workbooks),
 * frosted-glass delta pill, decorative blurred orbs, inline SVG sparkline.
 *
 * Translated from personal-finance's NetWorthCard.tsx (catalog §1.1).
 * Calcite reframes the metric as "active workbooks" with cell-edit
 * velocity instead of dollar balance.
 */
export function WorkbookHeroCard({
  workbookCount,
  cellsThisWeek,
  cellsDeltaPct,
  activeCollaborators,
  pendingAutomations,
  sparklinePoints = DEFAULT_SPARK,
}: WorkbookHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const linePath = buildSparklinePath(sparklinePoints)
  const fillPath = `${linePath} L400,100 L0,100 Z`
  const deltaSign = cellsDeltaPct >= 0 ? '+' : ''
  const deltaIcon = cellsDeltaPct >= 0 ? 'trending_up' : 'trending_down'

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] bg-gradient-to-br from-primary to-primary-dark rounded-[2rem] text-on-primary relative overflow-hidden shadow-xl shadow-primary/20',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-on-primary/80',
          )}
        >
          {t('workbookHeroCard.eyebrow', {}, { defaultValue: 'Active workbooks · this workspace' })}
        </p>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md', wrap: 'wrap' }))}>
          <span className="text-6xl font-extrabold tracking-tighter tabular-nums">
            {workbookCount}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface/20 backdrop-blur-md',
            )}
          >
            <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
              {deltaIcon}
            </span>
            {t(
              'workbookHeroCard.cellsDelta',
              {
                cells: cellsThisWeek.toLocaleString(),
                sign: deltaSign,
                pct: Math.abs(cellsDeltaPct).toFixed(1),
              },
              { defaultValue: '{{cells}} cells · {{sign}}{{pct}}% wk' },
            )}
          </span>
        </div>
        <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-on-primary/85 max-w-md')}>
          {t(
            'workbookHeroCard.subline',
            { collaborators: activeCollaborators, automations: pendingAutomations },
            {
              defaultValue:
                '{{collaborators}} collaborators in flight · {{automations}} automations queued for tonight',
            },
          )}
        </p>
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 6))}
        >
          <Link
            to="/workbooks"
            className={
              'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-primary bg-surface rounded-full hover:bg-surface/90 transition-colors'
            }
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              grid_on
            </span>
            {t('workbookHeroCard.openWorkbooks', {}, { defaultValue: 'Open workbooks' })}
          </Link>
          <Link
            to="/templates"
            className={
              'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full border border-surface/30 hover:bg-surface/10 transition-colors'
            }
          >
            {t('common.browseTemplates', {}, { defaultValue: 'Browse templates' })}
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </div>
      </div>
      <div className={cm.cn(cm.sp('mt', 8), cm.h(24), cm.w('full'), 'relative z-10')}>
        <svg
          className={'w-full h-full'}
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={fillPath} fill="white" opacity="0.18" />
          <path
            d={linePath}
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div
        className={'w-80 h-80 rounded-full absolute -right-20 -bottom-20 bg-surface/10 blur-3xl'}
        aria-hidden="true"
      />
      <div
        className={'w-20 h-20 rounded-full absolute right-12 top-10 bg-surface/20 blur-xl'}
        aria-hidden="true"
      />
    </div>
  )
}
