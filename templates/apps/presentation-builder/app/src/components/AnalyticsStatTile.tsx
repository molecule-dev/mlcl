import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * KPI stat tile — uppercase 10px tracking-widest label, 4xl extrabold
 * value, change pill (with up/down/flat arrow), and a thin sparkline. The
 * left-border accent is the cursor-palette color tied to the metric.
 *
 * Translated from personal-finance's NetWorthCard chrome (large numeric
 * values + change pill) + crm's StatsRow border-l-4 accent + sparkline
 * recipe from catalog §2.3 KPI/category. Sparklines use 30%-opacity area
 * fills and a contrast stroke matching the accent.
 */
export interface AnalyticsStatTileProps {
  label: string
  value: string
  /** Optional eyebrow placed above the label (e.g. "LAST 30 DAYS"). */
  eyebrow?: string
  /** Change percentage; positive numbers render up arrow + tertiary, negative down + error, 0 flat + neutral. */
  changePct?: number
  changeLabel?: string
  /** Sparkline data (0-1 normalized values, max ~24 points). */
  sparkline?: number[]
  accentColor: string
  /** Material Symbols icon name shown as a circular badge. */
  iconName?: string
}

function buildSparkPath(values: number[], width: number, height: number, padY: number): string {
  if (values.length < 2) return ''
  const stepX = width / (values.length - 1)
  const usableH = height - padY * 2
  return values
    .map((v, i) => {
      const x = i * stepX
      const y = height - padY - v * usableH
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

function buildSparkAreaPath(values: number[], width: number, height: number, padY: number): string {
  const line = buildSparkPath(values, width, height, padY)
  if (!line) return ''
  return `${line} L ${width.toFixed(1)} ${height.toFixed(1)} L 0 ${height.toFixed(1)} Z`
}

export function AnalyticsStatTile({
  label,
  value,
  eyebrow,
  changePct,
  changeLabel,
  sparkline,
  accentColor,
  iconName,
}: AnalyticsStatTileProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const arrow =
    changePct == null
      ? null
      : changePct > 0
        ? 'arrow_upward'
        : changePct < 0
          ? 'arrow_downward'
          : 'remove'
  const changeTone =
    changePct == null
      ? 'bg-surface-container text-on-surface-variant'
      : changePct > 0
        ? 'bg-tertiary/15 text-tertiary'
        : changePct < 0
          ? 'bg-error-container/40 text-on-error-container'
          : 'bg-surface-container text-on-surface-variant'

  const sparkW = 200
  const sparkH = 56

  return (
    <article
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('p', 6),
        cm.stack(3),
        'group bg-surface-container-lowest rounded-xl shadow-sm border-l-4 hover:-translate-y-0.5 hover:shadow-md transition-all',
      )}
      style={{ borderLeftColor: accentColor }}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}>
        <div className={cm.stack(1)}>
          {eyebrow && (
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant/70',
              )}
            >
              {eyebrow}
            </span>
          )}
          <span
            className={cm.cn(cm.fontWeight('bold'), 'text-[10px] uppercase tracking-widest')}
            style={{ color: accentColor }}
          >
            {label}
          </span>
        </div>
        {iconName && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(9),
              cm.h(9),
              cm.roundedFull,
              'text-white shadow-md',
            )}
            style={{ backgroundColor: accentColor }}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[18px]')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {iconName}
            </span>
          </span>
        )}
      </div>
      <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }), 'flex-wrap')}>
        <span
          className={cm.cn('text-4xl font-extrabold tracking-tighter text-on-surface tabular-nums')}
        >
          {value}
        </span>
        {arrow && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest',
              changeTone,
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')}>{arrow}</span>
            {changePct != null
              ? t(
                  'analyticsStatTile.changePct',
                  { value: `${Math.abs(changePct).toFixed(1)}%` },
                  { defaultValue: '{{value}}' },
                )
              : null}
            {changeLabel && (
              <span
                className={cm.cn('text-on-surface-variant font-bold normal-case tracking-normal')}
              >
                {changeLabel}
              </span>
            )}
          </span>
        )}
      </div>
      {sparkline && sparkline.length >= 2 && (
        <svg viewBox={`0 0 ${sparkW} ${sparkH}`} className={cm.cn(cm.w('full'), 'h-14')}>
          <path
            d={buildSparkAreaPath(sparkline, sparkW, sparkH, 4)}
            fill={accentColor}
            fillOpacity="0.18"
          />
          <path
            d={buildSparkPath(sparkline, sparkW, sparkH, 4)}
            stroke={accentColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      )}
    </article>
  )
}

export default AnalyticsStatTile
