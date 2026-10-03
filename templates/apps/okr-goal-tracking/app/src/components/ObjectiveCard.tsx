import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ProgressRing, type RingStatus } from './ProgressRing.js'

export interface ObjectiveCardData {
  id: string
  title: string
  ownerName: string
  ownerAvatarUrl?: string
  period: string
  progress: number
  status: RingStatus
  keyResultCount: number
  keyResultsCompleted: number
  description?: string
}

interface ObjectiveCardProps {
  objective: ObjectiveCardData
  href?: string
  className?: string
}

const STATUS_LABEL: Record<RingStatus, string> = {
  'on-track': 'On track',
  'at-risk': 'At risk',
  behind: 'Behind',
  'not-started': 'Not started',
  completed: 'Completed',
}

const STATUS_PILL: Record<RingStatus, string> = {
  'on-track': 'bg-success-light text-success-text',
  'at-risk': 'bg-warning-light text-warning',
  behind: 'bg-error-light text-error',
  'not-started': 'bg-surface-secondary text-foreground-secondary',
  completed: 'bg-violet-100 text-violet-700',
}

/** The status accent color: the inset bar and the period label (DESIGN.md → "Accent bars"). */
const STATUS_ACCENT: Record<RingStatus, string> = {
  // 700/800/600 stops: the accent doubles as the 11px uppercase period
  // label's text color (accentCardLabel tone custom), and the 500 stops
  // fail the 4.5:1 AA floor on the card background (axe serious on the
  // landing/dashboard a11y gate). The accent bar just reads slightly deeper.
  'on-track': 'var(--color-emerald-700)',
  'at-risk': 'var(--color-amber-800)',
  behind: 'var(--color-red-700)',
  'not-started': 'var(--color-slate-600)',
  completed: 'var(--color-violet-700)',
}

/**
 * Hero objective card — status-colored left border, ring on the right,
 * status pill, owner row at bottom. Translated from crm/DealCard.tsx
 * (status-band layout) + project-management/KpiCard.tsx (left edge
 * elevation), adapted to OKR domain (Objective / Key Result counts).
 */
export function ObjectiveCard({ objective, href, className }: ObjectiveCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const Wrapper: 'div' | typeof Link = href ? Link : 'div'
  const wrapperProps = href ? { to: href } : {}

  return (
    <Wrapper
      {...(wrapperProps as { to: string })}
      className={cm.cn(
        cm.sp('p', 5),
        cm.flex({ direction: 'col' }),
        cm.accentCard({ tone: 'custom' }),
        'bg-surface-container-lowest rounded-xl shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200',
        className,
      )}
      style={{ ['--mol-accent' as string]: STATUS_ACCENT[objective.status] }}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start', gap: 'md' }))}>
        <div className={cm.cn(cm.stack(2), cm.flex1, 'min-w-0')}>
          <span className={cm.accentCardLabel({ tone: 'custom' })}>
            {t(
              'objectiveCard.period',
              { period: objective.period },
              { defaultValue: '{{period}}' },
            )}
          </span>
          <h3
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('semibold'),
              'tracking-tight text-on-surface leading-snug line-clamp-2',
            )}
          >
            {objective.title}
          </h3>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full self-start',
              STATUS_PILL[objective.status],
            )}
          >
            {t(
              `objectiveCard.status.${objective.status}` as 'objectiveCard.status.onTrack',
              {},
              { defaultValue: STATUS_LABEL[objective.status] },
            )}
          </span>
        </div>
        <ProgressRing value={objective.progress} size={80} stroke={8} status={objective.status} />
      </div>
      {objective.description && (
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mt', 3),
            'text-on-surface-variant line-clamp-2 leading-relaxed',
          )}
        >
          {objective.description}
        </p>
      )}
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center', gap: 'sm' }),
          cm.sp('mt', 4),
          cm.sp('pt', 4),
          'border-t border-outline-variant/40',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
          {objective.ownerAvatarUrl ? (
            <img
              src={objective.ownerAvatarUrl}
              alt=""
              className={cm.cn('w-7 h-7 rounded-full ring-2 ring-surface-container-lowest')}
            />
          ) : (
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.fontWeight('bold'),
                'w-7 h-7 rounded-full bg-primary-fixed text-primary text-[11px]',
              )}
            >
              {objective.ownerName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}>
            {objective.ownerName}
          </span>
        </div>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'text-on-surface-variant tabular-nums',
          )}
        >
          {t(
            'objectiveCard.krProgress',
            { done: objective.keyResultsCompleted, total: objective.keyResultCount },
            { defaultValue: '{{done}}/{{total}} KRs' },
          )}
        </span>
      </div>
    </Wrapper>
  )
}

export default ObjectiveCard
