/**
 * KPI-style drift summary card — uppercase eyebrow label,
 * extrabold percentage, current vs target progress bar with target tick,
 * the shared inset accent bar in the action color (success/error/muted).
 *
 * Translated from personal-finance's DashboardAccountOverview triad
 * + the budget progress bar treatment from BudgetProgressPanel.
 */

import { useTranslation } from '@molecule/app-react'
import { type AccentTone, getClassMap } from '@molecule/app-ui'

interface RebalanceDriftCardProps {
  category: string
  currentPct: number
  targetPct: number
  driftPct: number
  tolerancePct: number
  tradeAction: 'buy' | 'sell' | 'hold'
  tradeAmountCents: number
}

const ACTION_LABEL: Record<RebalanceDriftCardProps['tradeAction'], string> = {
  buy: 'Buy',
  sell: 'Sell',
  hold: 'Hold',
}

const ACTION_ACCENT: Record<
  RebalanceDriftCardProps['tradeAction'],
  { tone: AccentTone; pill: string; icon: string }
> = {
  buy: { tone: 'success', pill: 'bg-success/15 text-success', icon: 'arrow_upward' },
  sell: { tone: 'error', pill: 'bg-error/15 text-error', icon: 'arrow_downward' },
  hold: {
    tone: 'default',
    pill: 'bg-surface-container text-on-surface-variant',
    icon: 'pause',
  },
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function fmtUsd(cents: unknown): string {
  const dollars = Math.abs(num(cents)) / 100
  return `$${dollars.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function RebalanceDriftCard({
  category,
  currentPct,
  targetPct,
  driftPct,
  tolerancePct,
  tradeAction,
  tradeAmountCents,
}: RebalanceDriftCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accent = ACTION_ACCENT[tradeAction] ?? ACTION_ACCENT.hold
  const safeCurrent = num(currentPct)
  const safeTarget = num(targetPct)
  const safeDrift = num(driftPct)
  const safeTolerance = num(tolerancePct)
  const outOfBand = Math.abs(safeDrift) > safeTolerance
  const scale = Math.max(safeCurrent, safeTarget, 1)
  const currentWidth = (safeCurrent / scale) * 100
  const targetMarker = (safeTarget / scale) * 100

  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl border border-outline-variant/40 hover:-translate-y-0.5 transition-transform',
        cm.accentCard({ tone: accent.tone }),
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'start', justify: 'between' }), cm.sp('mb', 5))}>
        <div>
          <p className={cm.accentCardLabel({ tone: accent.tone })}>{category}</p>
          <p
            className={cm.cn(
              'text-3xl font-extrabold tabular-nums tracking-tight text-on-surface',
              cm.sp('mt', 1),
            )}
          >
            {safeCurrent.toFixed(1)}%
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
            {t(
              'rebalanceDriftCard.targetLabel',
              { pct: safeTarget.toFixed(0) },
              { defaultValue: 'target {{pct}}%' },
            )}
          </p>
        </div>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest whitespace-nowrap',
            accent.pill,
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
            {accent.icon}
          </span>
          {t(
            `rebalanceDriftCard.action.${tradeAction}`,
            {},
            { defaultValue: ACTION_LABEL[tradeAction] },
          )}
        </span>
      </div>

      <div className={cm.cn('relative h-2 rounded-full bg-surface-container overflow-visible')}>
        <div
          className={cm.cn(
            'h-full rounded-full',
            tradeAction === 'sell'
              ? 'bg-error/70'
              : tradeAction === 'buy'
                ? 'bg-success/70'
                : 'bg-outline/40',
          )}
          style={{ width: `${currentWidth}%` }}
        />
        <div
          className={cm.cn('absolute -top-1 h-4 w-0.5 bg-on-surface')}
          style={{ left: `${targetMarker}%` }}
          aria-hidden="true"
        />
      </div>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('mt', 4),
          cm.textSize('xs'),
        )}
      >
        <span
          className={cm.cn(
            'uppercase tracking-widest',
            outOfBand ? 'text-warning font-semibold' : 'text-on-surface-variant',
          )}
        >
          {t(
            'rebalanceDriftCard.drift',
            {
              sign: safeDrift >= 0 ? '+' : '',
              pct: safeDrift.toFixed(1),
              tolerance: safeTolerance.toFixed(0),
            },
            { defaultValue: 'drift {{sign}}{{pct}}% · band ±{{tolerance}}%' },
          )}
        </span>
        {num(tradeAmountCents) !== 0 ? (
          <span className={cm.cn(cm.fontWeight('bold'), 'tabular-nums text-on-surface')}>
            {fmtUsd(tradeAmountCents)}
          </span>
        ) : null}
      </div>
    </div>
  )
}
