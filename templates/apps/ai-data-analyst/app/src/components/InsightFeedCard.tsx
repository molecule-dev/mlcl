/**
 * Editorial AI insight card — type-colored left border (trend / anomaly /
 * correlation / summary), uppercase 10px tag pill, dataset chip footer,
 * relative timestamp, and "View →" hover-arrow CTA.
 *
 * Translated from crm/ActivityFeed.tsx + personal-finance/ActivityRow.tsx —
 * single-row activity vocabulary scaled up to a card with a stronger
 * left-accent treatment + AI badge per Clarion's DESIGN.md.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type InsightType = 'trend' | 'anomaly' | 'correlation' | 'summary'

export interface InsightCardData {
  id: string
  type: InsightType
  headline: string
  body: string
  dataset_name: string
  href: string
  detected_at: string
}

const TYPE_BORDER: Record<InsightType, string> = {
  trend: 'border-l-success',
  anomaly: 'border-l-tertiary-container',
  correlation: 'border-l-primary',
  summary: 'border-l-secondary',
}

const TYPE_PILL: Record<InsightType, string> = {
  trend: 'bg-success/10 text-success',
  anomaly: 'bg-tertiary-container/15 text-tertiary-container',
  correlation: 'bg-primary/10 text-primary',
  summary: 'bg-secondary/10 text-secondary',
}

const TYPE_ICON: Record<InsightType, string> = {
  trend: 'trending_up',
  anomaly: 'priority_high',
  correlation: 'scatter_plot',
  summary: 'auto_awesome',
}

function fmtRelative(iso: string): string {
  const d = new Date(iso)
  const diffH = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60))
  if (diffH < 1) return 'just now'
  if (diffH < 24) return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}

export interface InsightFeedCardProps {
  insight: InsightCardData
}

export function InsightFeedCard({ insight }: InsightFeedCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const type: InsightType = (TYPE_BORDER[insight.type] ? insight.type : 'summary') as InsightType

  return (
    <article
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 3 }),
        cm.sp('p', 5),
        'border-l-4 bg-surface-container-lowest rounded-xl shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200',
        TYPE_BORDER[type],
      )}
    >
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 1 }),
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.roundedFull,
            'text-[10px] uppercase tracking-widest font-black',
            TYPE_PILL[type],
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined', cm.textSize('xs'))}
            aria-hidden="true"
          >
            {TYPE_ICON[type]}
          </span>
          {t(`insightFeedCard.type.${type}`, {}, { defaultValue: type })}
        </span>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            'text-on-surface-variant tabular-nums',
          )}
        >
          {fmtRelative(insight.detected_at)}
        </span>
      </header>

      <div className={cm.flex({ direction: 'col', gap: 1 })}>
        <h3
          className={cm.cn(
            cm.textSize('base'),
            cm.fontWeight('semibold'),
            'leading-snug text-on-surface',
          )}
        >
          {insight.headline}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface-variant')}>
          {insight.body}
        </p>
      </div>

      <footer
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('pt', 2),
          'border-t border-outline-variant/40',
        )}
      >
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 1 }),
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            'bg-surface-container font-mono text-on-surface-variant',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined', cm.textSize('xs'))}
            aria-hidden="true"
          >
            database
          </span>
          {insight.dataset_name}
        </span>
        <Link
          to={insight.href}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 1 }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'text-primary hover:text-primary-container uppercase tracking-widest transition-colors group',
          )}
        >
          {t('insightFeedCard.viewCta', {}, { defaultValue: 'View' })}
          <span
            className={cm.cn(
              'material-symbols-outlined',
              cm.textSize('sm'),
              'group-hover:translate-x-0.5 transition-transform',
            )}
            aria-hidden="true"
          >
            arrow_forward
          </span>
        </Link>
      </footer>
    </article>
  )
}

export default InsightFeedCard
