/**
 * Tracked price alert card — left border-l-4 in the Skylark "tracked"
 * purple accent, route header (origin → destination) with airport-code
 * pills, current price in a 2xl tabular numeral with a delta pill, an
 * inline 64px-tall area-fill SVG sparkline showing the recent fare
 * trend, and an active/paused toggle pill.
 *
 * Translated from personal-finance's NetWorthCard.tsx (sparkline +
 * delta-pill treatment) condensed into a row card and laid out per
 * DESIGN.md §"Price Alert Card" — left border accent in tracked color,
 * compact metric row, sparkline at the right.
 *
 * Props match `alerts.json` fixture shape (origin_code,
 * origin_city, destination_code, destination_city, target_price,
 * current_lowest, departure_date, history[]).
 */

import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

export interface PriceAlertSummary {
  id: string
  origin_code: string
  origin_city?: string
  destination_code: string
  destination_city?: string
  target_price: number
  current_lowest: number
  departure_date: string
  history?: number[]
  active?: boolean
}

function fmtPrice(value: number): string {
  return `$${Math.round(value).toLocaleString()}`
}

function buildSparkPath(
  history: number[],
  width: number,
  height: number,
): { line: string; area: string } {
  if (history.length < 2) return { line: '', area: '' }
  const min = Math.min(...history)
  const max = Math.max(...history)
  const range = max - min || 1
  const stepX = width / (history.length - 1)
  const points = history.map((value, i) => {
    const x = i * stepX
    const y = height - ((value - min) / range) * (height - 4) - 2
    return [x, y] as const
  })
  const line = points
    .map(([x, y], i) =>
      i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : `L ${x.toFixed(2)} ${y.toFixed(2)}`,
    )
    .join(' ')
  const area = `${line} L ${width.toFixed(2)} ${height} L 0 ${height} Z`
  return { line, area }
}

export function PriceAlertCard({
  alert,
  onToggleActive,
  onDelete,
}: {
  alert: PriceAlertSummary
  onToggleActive?: (id: string, next: boolean) => void
  onDelete?: (id: string) => void | Promise<void>
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const history =
    alert.history && alert.history.length >= 2
      ? alert.history
      : [
          alert.target_price * 1.18,
          alert.target_price * 1.1,
          alert.target_price * 1.05,
          alert.target_price,
          alert.current_lowest,
        ]
  const last = history[history.length - 1] ?? alert.current_lowest
  const first = history[0] ?? alert.current_lowest
  const delta = last - first
  const deltaPct = first === 0 ? 0 : (delta / first) * 100
  const trendingDown = delta < 0
  const hitTarget = alert.current_lowest <= alert.target_price
  const sparkWidth = 220
  const sparkHeight = 64
  const { line, area } = buildSparkPath(history, sparkWidth, sparkHeight)
  const active = alert.active !== false

  return (
    <article
      className={cm.cn(
        cm.sp('p', 5),
        'group relative bg-surface rounded-2xl shadow-sm hover:shadow-md transition-all ring-1 ring-outline-variant/40',
        'border-l-[4px] border-tracked',
      )}
    >
      <div
        className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md', wrap: 'wrap' }))}
      >
        <div className={'min-w-0 flex-1'}>
          <Link
            to={`/search?origin=${encodeURIComponent(alert.origin_code)}&destination=${encodeURIComponent(alert.destination_code)}&departure_date=${encodeURIComponent(alert.departure_date)}`}
            className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'group/title')}
          >
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-md bg-primary/10 text-primary tracking-widest uppercase',
              )}
            >
              {alert.origin_code}
            </span>
            <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">
              arrow_right_alt
            </span>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-md bg-primary/10 text-primary tracking-widest uppercase',
              )}
            >
              {alert.destination_code}
            </span>
          </Link>
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {alert.origin_city && alert.destination_city
              ? t(
                  'priceAlertCard.cities',
                  { o: alert.origin_city, d: alert.destination_city },
                  { defaultValue: '{{o}} → {{d}}' },
                )
              : null}
            {alert.origin_city ? ' · ' : ''}
            {t(
              'priceAlertCard.departing',
              {
                date: new Date(alert.departure_date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }),
              },
              { defaultValue: 'Departing {{date}}' },
            )}
          </p>

          <div
            className={cm.cn(
              cm.sp('mt', 4),
              cm.flex({ align: 'baseline', gap: 'md', wrap: 'wrap' }),
            )}
          >
            <p>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('priceAlertCard.currentLabel', {}, { defaultValue: 'Now' })}
              </span>
              <span
                className={cm.cn(
                  cm.textSize('2xl'),
                  cm.fontWeight('bold'),
                  cm.sp('ml', 2),
                  'tabular-nums',
                  hitTarget ? 'text-cheapest' : 'text-on-surface',
                )}
              >
                {fmtPrice(alert.current_lowest)}
              </span>
            </p>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'uppercase tracking-widest rounded-full',
                trendingDown
                  ? 'bg-cheapest-light text-cheapest'
                  : 'bg-expensive-light text-expensive',
              )}
            >
              <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                {trendingDown ? 'trending_down' : 'trending_up'}
              </span>
              {`${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%`}
            </span>
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'priceAlertCard.target',
                { price: fmtPrice(alert.target_price) },
                { defaultValue: 'Target {{price}}' },
              )}
            </span>
          </div>
        </div>

        {/* Sparkline */}
        <svg
          width={sparkWidth}
          height={sparkHeight}
          viewBox={`0 0 ${sparkWidth} ${sparkHeight}`}
          className="shrink-0"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`spark-${alert.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-tracked)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--color-tracked)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#spark-${alert.id})`} />
          <path
            d={line}
            fill="none"
            stroke="var(--color-tracked)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div
        className={cm.cn(
          cm.sp('mt', 4),
          cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          {hitTarget ? (
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'uppercase tracking-widest rounded-full bg-cheapest text-white',
              )}
            >
              <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                check_circle
              </span>
              {t('priceAlertCard.hitTarget', {}, { defaultValue: 'Target hit · book now' })}
            </span>
          ) : (
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'priceAlertCard.gapLabel',
                { amount: fmtPrice(alert.current_lowest - alert.target_price) },
                { defaultValue: '{{amount}} above target' },
              )}
            </span>
          )}
        </div>

        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          {onToggleActive ? (
            <button
              type="button"
              onClick={() => onToggleActive(alert.id, !active)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'uppercase tracking-widest rounded-full transition-colors',
                active
                  ? 'bg-tracked text-white hover:bg-tracked/90'
                  : 'bg-surface-container ring-1 ring-outline-variant text-on-surface-variant hover:bg-surface-container-high',
              )}
              aria-pressed={active}
            >
              <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                {active ? 'notifications_active' : 'notifications_off'}
              </span>
              {active
                ? t('status.active', {}, { defaultValue: 'Active' })
                : t('status.paused', {}, { defaultValue: 'Paused' })}
            </button>
          ) : null}
          {onDelete ? (
            <ConfirmButton
              label={
                <>
                  <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                    delete
                  </span>
                  {t('common.remove', {}, { defaultValue: 'Remove' })}
                </>
              }
              confirmLabel={t(
                'priceAlerts.deleteConfirm',
                {},
                { defaultValue: 'Remove this alert?' },
              )}
              onConfirm={() => onDelete(alert.id)}
              disarmSeconds={6}
              aria-label={t('priceAlertCard.deleteAria', {}, { defaultValue: 'Delete alert' })}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'uppercase tracking-widest rounded-full text-on-surface-variant hover:text-error transition-colors',
              )}
            />
          ) : null}
        </div>
      </div>
    </article>
  )
}
