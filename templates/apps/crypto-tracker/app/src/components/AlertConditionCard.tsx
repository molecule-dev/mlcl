/**
 * Alert ledger card — coin avatar, condition phrase + tabular threshold,
 * status pill (active gold, paused outline, triggered rose), and a
 * meta line with create / triggered timestamps. Stacks vertically on
 * mobile and switches to a row on `sm:` breakpoints.
 *
 * Translated from project-management/StatsRow + helpdesk-ticketing
 * status-badge patterns; the avatar treatment matches CoinSparklineRow.
 */
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type AlertCondition =
  'above' | 'below' | 'change_24h_above' | 'change_24h_below' | 'volume_above'

export interface AlertConditionCardData {
  id: string
  symbol: string
  coin_name: string
  condition: AlertCondition
  threshold: number
  active: boolean
  triggered_at?: string | null
  created_at: string
}

const CONDITION_FALLBACK: Record<AlertCondition, string> = {
  above: 'Price above',
  below: 'Price below',
  change_24h_above: '24h change ≥',
  change_24h_below: '24h change ≤',
  volume_above: '24h volume above',
}

function fmtThreshold(condition: AlertCondition, threshold: number): string {
  if (condition === 'change_24h_above' || condition === 'change_24h_below') {
    return `${threshold.toFixed(2)}%`
  }
  if (condition === 'volume_above') {
    return `$${threshold.toLocaleString()}`
  }
  return `$${threshold.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function AlertConditionCard({
  alert,
  onToggle,
  onDelete,
}: {
  alert: AlertConditionCardData
  onToggle?: (id: string) => void
  onDelete?: (id: string) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const triggered = !!alert.triggered_at
  const statusBg = triggered
    ? 'bg-error/15 text-error'
    : alert.active
      ? 'bg-success/15 text-success'
      : 'bg-surface-container text-on-surface-variant'
  const statusKey = triggered ? 'triggered' : alert.active ? 'active' : 'paused'
  const statusIcon = triggered ? 'notifications_active' : alert.active ? 'bolt' : 'pause_circle'
  const statusFallback = triggered ? 'Triggered' : alert.active ? 'Armed' : 'Paused'

  return (
    <article
      className={cm.cn(
        cm.sp('p', 5),
        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
        'rounded-2xl bg-surface-container-lowest shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex-wrap',
        cm.accentCard({ tone: 'primary' }),
      )}
      data-mol-id={`alert-card-${alert.id}`}
    >
      <div className={cm.flex({ align: 'center', gap: 'md' })}>
        <span
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.textSize('xs'),
            'bg-primary-container text-on-primary-container font-extrabold uppercase tabular-nums',
          )}
          aria-hidden="true"
        >
          {alert.symbol.slice(0, 2)}
        </span>
        <div>
          <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'))}>
            {alert.coin_name}
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('ml', 2),
                'uppercase font-mono tabular-nums text-on-surface-variant tracking-wider',
              )}
            >
              {alert.symbol}
            </span>
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'mt-0.5 text-on-surface-variant')}>
            {t(
              `alertConditionCard.condition.${alert.condition}`,
              {},
              { defaultValue: CONDITION_FALLBACK[alert.condition] },
            )}{' '}
            <span className={cm.cn(cm.fontWeight('bold'), 'tabular-nums text-on-surface')}>
              {fmtThreshold(alert.condition, alert.threshold)}
            </span>
          </p>
          <p
            className={cm.cn(
              'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
              cm.sp('mt', 1),
            )}
          >
            {triggered
              ? t(
                  'alertConditionCard.triggeredAt',
                  { when: fmtDate(alert.triggered_at as string) },
                  { defaultValue: 'Triggered {{when}}' },
                )
              : t(
                  'alertConditionCard.armedSince',
                  { when: fmtDate(alert.created_at) },
                  { defaultValue: 'Armed since {{when}}' },
                )}
          </p>
        </div>
      </div>
      <div className={cm.flex({ align: 'center', gap: 'md' })}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.roundedFull,
            'text-[10px] font-black uppercase tracking-widest',
            statusBg,
          )}
          data-mol-id={`alert-status-${statusKey}`}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
            {statusIcon}
          </span>
          {t(`alertConditionCard.status.${statusKey}`, {}, { defaultValue: statusFallback })}
        </span>
        {onToggle ? (
          <button
            type="button"
            onClick={() => onToggle(alert.id)}
            className={cm.cn(
              cm.sp('p', 2),
              cm.textSize('sm'),
              cm.cursorPointer,
              cm.roundedFull,
              'text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors',
            )}
            data-mol-id="alert-toggle"
            aria-label={
              alert.active
                ? t('alertConditionCard.pauseAriaLabel', {}, { defaultValue: 'Pause alert' })
                : t('alertConditionCard.resumeAriaLabel', {}, { defaultValue: 'Resume alert' })
            }
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {alert.active ? 'pause_circle' : 'play_circle'}
            </span>
          </button>
        ) : null}
        {onDelete ? (
          confirmingDelete ? (
            <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <button
                type="button"
                onClick={() => onDelete(alert.id)}
                data-mol-id="alert-delete-confirm"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.cursorPointer,
                  cm.roundedFull,
                  'bg-error text-on-error uppercase tracking-wide',
                )}
              >
                {t('alertConditionCard.confirmDelete', {}, { defaultValue: 'Confirm delete' })}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                aria-label={t('common.cancel', {}, { defaultValue: 'Cancel' })}
                className={cm.cn(
                  cm.sp('p', 2),
                  cm.textSize('sm'),
                  cm.cursorPointer,
                  cm.roundedFull,
                  'text-on-surface-variant hover:bg-surface-container transition-colors',
                )}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  close
                </span>
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className={cm.cn(
                cm.sp('p', 2),
                cm.textSize('sm'),
                cm.cursorPointer,
                cm.roundedFull,
                'text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors',
              )}
              aria-label={t(
                'alertConditionCard.deleteAriaLabel',
                {},
                { defaultValue: 'Delete alert' },
              )}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                delete_outline
              </span>
            </button>
          )
        ) : null}
      </div>
    </article>
  )
}
