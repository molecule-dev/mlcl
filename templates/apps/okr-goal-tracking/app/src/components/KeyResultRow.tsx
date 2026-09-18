import type { TranslateFunction } from '@molecule/app-i18n'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { RingStatus } from './ProgressRing.js'

export interface KeyResultRowData {
  id: string
  title: string
  metricType: 'percentage' | 'number' | 'currency' | 'boolean'
  startValue: number
  currentValue: number
  targetValue: number
  status: RingStatus
  ownerName?: string
}

interface KeyResultRowProps {
  kr: KeyResultRowData
  className?: string
  /** Optional inline confidence pill on the right. */
  confidence?: 'on-track' | 'at-risk' | 'behind'
}

const STATUS_DOT: Record<RingStatus, string> = {
  'on-track': 'bg-emerald-500',
  'at-risk': 'bg-amber-500',
  behind: 'bg-red-500',
  'not-started': 'bg-slate-400',
  completed: 'bg-violet-500',
}

const STATUS_BAR: Record<RingStatus, string> = {
  'on-track': 'bg-emerald-500',
  'at-risk': 'bg-amber-500',
  behind: 'bg-red-500',
  'not-started': 'bg-slate-400',
  completed: 'bg-violet-500',
}

function formatMetric(
  value: number,
  type: KeyResultRowData['metricType'],
  t: TranslateFunction,
): string {
  if (type === 'percentage') return `${value.toFixed(0)}%`
  if (type === 'currency') return `$${value.toLocaleString()}`
  if (type === 'boolean')
    return value > 0
      ? t('common.yes', {}, { defaultValue: 'Yes' })
      : t('common.no', {}, { defaultValue: 'No' })
  return value.toLocaleString()
}

/**
 * Inline KR row — status dot, title, metric value, inline progress bar.
 * Translated from personal-finance/AccountRecentTransactions row treatment
 * (left-icon + label + right-aligned metric) into an OKR-shaped row with
 * progress bar instead of trend arrow.
 */
export function KeyResultRow({ kr, className, confidence }: KeyResultRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const total = kr.targetValue - kr.startValue
  const done = kr.currentValue - kr.startValue
  const pct = total > 0 ? Math.max(0, Math.min(100, (done / total) * 100)) : 0

  return (
    <div
      className={cm.cn(
        cm.sp('p', 4),
        cm.flex({ align: 'center', gap: 'md' }),
        'rounded-lg hover:bg-surface-container-low transition-colors',
        className,
      )}
    >
      <span aria-hidden className={cm.cn('w-2 h-2 rounded-full shrink-0', STATUS_DOT[kr.status])} />
      <div className={cm.cn(cm.flex1, cm.stack(2), 'min-w-0')}>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'center', gap: 'sm' }))}>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface truncate',
            )}
          >
            {kr.title}
          </p>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'tabular-nums text-on-surface shrink-0',
            )}
          >
            {formatMetric(kr.currentValue, kr.metricType, t)}
            <span className="text-on-surface-variant font-medium">
              {' '}
              / {formatMetric(kr.targetValue, kr.metricType, t)}
            </span>
          </span>
        </div>
        <div
          className={cm.cn(
            'relative w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden',
          )}
        >
          <div
            className={cm.cn('absolute inset-y-0 left-0 rounded-full', STATUS_BAR[kr.status])}
            style={{ width: `${pct}%`, transition: 'width 600ms ease' }}
          />
        </div>
      </div>
      {confidence && (
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0',
            confidence === 'on-track' && 'bg-success-light text-success-text',
            confidence === 'at-risk' && 'bg-warning-light text-warning',
            confidence === 'behind' && 'bg-error-light text-error',
          )}
        >
          {t(
            `keyResultRow.confidence.${confidence}` as 'keyResultRow.confidence.onTrack',
            {},
            {
              defaultValue:
                confidence === 'on-track'
                  ? 'On track'
                  : confidence === 'at-risk'
                    ? 'At risk'
                    : 'Behind',
            },
          )}
        </span>
      )}
    </div>
  )
}

export default KeyResultRow
