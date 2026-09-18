import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Editorial lab result row — clinical-font value with H/L flag, reference
 * range under the value, status pill, and optional inline trend
 * sparkline. Whole row clickable when an `id` is supplied.
 *
 * Translated from personal-finance's AccountRecentTransactions.tsx +
 * crm/StatusPill — the divide-y / right-aligned numeric / status pill
 * pattern translated to Meridian's clinical-status colour ladder. Lab
 * values use SF Mono with tabular-nums per DESIGN.md.
 */
export type LabFlag = 'normal' | 'high' | 'low' | 'critical'

export interface LabResultRowProps {
  /** Lab result id — when present the row links to /labs/:id. */
  id?: string
  /** Test name, e.g. "Total cholesterol". */
  testName: string
  /** Category label, e.g. "Blood work". */
  categoryLabel: string
  /** Numeric or string result value, e.g. "184". */
  value: string
  /** Unit, e.g. "mg/dL". */
  unit: string
  /** Reference range string, e.g. "< 200". */
  referenceRange: string
  /** Flag — drives left accent + value colour + H/L pill. */
  flag: LabFlag
  /** Display-formatted collected date, e.g. "Apr 12". */
  collectedLabel: string
  /** Optional last-N-results trend, oldest first, normalised 0..1. */
  trend?: ReadonlyArray<number>
}

const FLAG_TEXT: Record<LabFlag, string> = {
  normal: 'var(--color-clinical-normal)',
  high: 'var(--color-clinical-abnormal)',
  low: 'var(--color-clinical-abnormal)',
  critical: 'var(--color-clinical-abnormal)',
}

const FLAG_BORDER: Record<LabFlag, string> = {
  normal: 'transparent',
  high: 'var(--color-clinical-abnormal)',
  low: 'var(--color-clinical-abnormal)',
  critical: 'var(--color-clinical-abnormal)',
}

const FLAG_BG: Record<LabFlag, string> = {
  normal: 'transparent',
  high: 'var(--color-clinical-abnormal-bg)',
  low: 'var(--color-clinical-abnormal-bg)',
  critical: 'var(--color-clinical-abnormal-bg)',
}

const FLAG_BADGE: Record<LabFlag, string | null> = {
  normal: null,
  high: 'H',
  low: 'L',
  critical: '!',
}

function buildSparkPath(trend: ReadonlyArray<number>) {
  if (!trend || trend.length < 2) return null
  const w = 60
  const h = 24
  const stepX = w / (trend.length - 1)
  const points = trend.map((v, i) => {
    const x = i * stepX
    const y = h - Math.max(2, v * (h - 4))
    return `${x},${y}`
  })
  return `M${points.join(' L')}`
}

export function LabResultRow({
  id,
  testName,
  categoryLabel,
  value,
  unit,
  referenceRange,
  flag,
  collectedLabel,
  trend,
}: LabResultRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const sparkPath = trend ? buildSparkPath(trend) : null
  const badge = FLAG_BADGE[flag]
  const isCritical = flag === 'critical'

  const inner = (
    <article
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('px', 5),
        cm.sp('py', 4),
        'rounded-xl transition-all group',
        isCritical ? '' : 'hover:bg-surface-container-lowest',
      )}
      style={{
        borderLeft: `4px solid ${FLAG_BORDER[flag]}`,
        backgroundColor: isCritical ? FLAG_BG.critical : undefined,
      }}
    >
      <div className={cm.cn(cm.flex1, 'min-w-0')}>
        <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'truncate')}>{testName}</p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
          {t(
            'labResultRow.subline',
            { category: categoryLabel, date: collectedLabel },
            { defaultValue: '{{category}} · {{date}}' },
          )}
        </p>
      </div>

      {sparkPath && (
        <svg
          width="60"
          height="24"
          viewBox="0 0 60 24"
          aria-hidden="true"
          className={cm.cn('shrink-0 hidden md:block')}
        >
          <path d={sparkPath} fill="none" stroke="var(--color-primary)" strokeWidth="1.5" />
        </svg>
      )}

      <div className={cm.cn(cm.shrink0, cm.textRight)}>
        <p
          className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tabular-nums')}
          style={{ color: FLAG_TEXT[flag], fontFamily: 'var(--mol-font-mono)' }}
        >
          {value}
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('normal'),
              cm.sp('ml', 1),
              'text-on-surface-variant',
            )}
          >
            {unit}
          </span>
          {badge && (
            <span
              className={cm.cn('ml-2 px-1.5 py-0.5 text-[10px] font-black tracking-widest rounded')}
              style={{ backgroundColor: FLAG_TEXT[flag], color: 'white' }}
            >
              {badge}
            </span>
          )}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'labResultRow.reference',
            { range: referenceRange },
            { defaultValue: 'Ref · {{range}}' },
          )}
        </p>
      </div>
    </article>
  )

  return id ? (
    <Link to={`/labs/${id}`} className={cm.cn('block')}>
      {inner}
    </Link>
  ) : (
    inner
  )
}

export default LabResultRow
