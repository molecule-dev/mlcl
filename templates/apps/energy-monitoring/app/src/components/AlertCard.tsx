import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface AlertCardItem {
  id: string
  /** Alert type — drives the icon and severity. */
  type:
    'high_usage' | 'low_production' | 'unusual_pattern' | 'cost_threshold' | 'peak_demand' | string
  /** Already-translated message body. */
  message: string
  /** ISO timestamp. */
  createdAt?: string | null
  /** Active / acknowledged / dismissed. */
  status?: 'active' | 'acknowledged' | 'dismissed' | string
  /** Numeric value that triggered the rule (kWh, $, W). */
  value?: number | null
  threshold?: number | null
}

interface AlertCardProps {
  alert: AlertCardItem
  onAcknowledge?: (id: string) => void
  onDismiss?: (id: string) => void
}

const TYPE_META: Record<
  string,
  { icon: string; tint: string; accent: string; severity: 'critical' | 'warn' | 'info' }
> = {
  high_usage: {
    icon: 'warning',
    tint: 'text-error',
    accent: 'border-l-error',
    severity: 'critical',
  },
  cost_threshold: {
    icon: 'payments',
    tint: 'text-error',
    accent: 'border-l-error',
    severity: 'critical',
  },
  peak_demand: { icon: 'bolt', tint: 'text-warning', accent: 'border-l-warning', severity: 'warn' },
  low_production: {
    icon: 'wb_sunny',
    tint: 'text-warning',
    accent: 'border-l-warning',
    severity: 'warn',
  },
  unusual_pattern: {
    icon: 'insights',
    tint: 'text-info',
    accent: 'border-l-info',
    severity: 'info',
  },
}

function fmtAbsoluteAndRelative(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diffMs = Math.max(0, Date.now() - d.getTime())
  const mins = Math.round(diffMs / 60000)
  const rel =
    mins < 60
      ? `${mins}m ago`
      : mins < 1440
        ? `${Math.round(mins / 60)}h ago`
        : `${Math.round(mins / 1440)}d ago`
  return `${d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · ${rel}`
}

/**
 * Editorial alert card — left accent bar tinted by severity, type chip
 * with material-symbol, message body, optional triggered-value summary,
 * and ack/dismiss action buttons.
 *
 * Translated from smart-home-dashboard's AutomationRow (left-accent bar +
 * meta-row + trailing actions) and personal-finance's ActivityRow
 * (timestamp + status pill).
 */
export function AlertCard({ alert, onAcknowledge, onDismiss }: AlertCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const meta = TYPE_META[alert.type] ?? TYPE_META.unusual_pattern
  const isActive = (alert.status ?? 'active') === 'active'

  return (
    <div
      data-mol-id={`alert-card-${alert.id}`}
      className={cm.cn(
        cm.flex({ align: 'start', gap: 'md' }),
        cm.sp('p', 5),
        'bg-surface-container-lowest rounded-2xl border-l-4 transition-all hover:bg-surface-container-low',
        meta.accent,
        isActive ? '' : 'opacity-70',
      )}
    >
      <div
        className={cm.cn(
          cm.w(10),
          cm.h(10),
          cm.roundedFull,
          cm.flex({ align: 'center', justify: 'center' }),
          'bg-surface-container shrink-0',
          meta.tint,
        )}
        aria-hidden="true"
      >
        <span className="material-symbols-outlined">{meta.icon}</span>
      </div>
      <div className={cm.cn('flex-1 min-w-0', cm.stack(2))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.roundedFull,
              cm.fontWeight('bold'),
              'text-[10px] py-0.5 uppercase tracking-widest bg-surface-container text-on-surface-variant',
            )}
          >
            {t(`alertCard.type.${alert.type}`, {}, { defaultValue: alert.type.replace(/_/g, ' ') })}
          </span>
          {alert.status ? (
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.roundedFull,
                cm.fontWeight('bold'),
                'text-[10px] py-0.5 uppercase tracking-widest',
                isActive
                  ? meta.severity === 'critical'
                    ? 'bg-error-container text-on-error-container'
                    : meta.severity === 'warn'
                      ? 'bg-warning-container text-on-warning-container'
                      : 'bg-info-container text-on-info-container'
                  : 'bg-surface-container text-on-surface-variant',
              )}
            >
              {t(`alertCard.status.${alert.status}`, {}, { defaultValue: alert.status })}
            </span>
          ) : null}
        </div>
        <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>{alert.message}</p>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
          {alert.value != null && alert.threshold != null ? (
            <span
              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant font-mono tabular-nums')}
            >
              {t(
                'alertCard.threshold',
                {
                  value: Number(alert.value).toFixed(1),
                  threshold: Number(alert.threshold).toFixed(1),
                },
                { defaultValue: '{{value}} vs {{threshold}}' },
              )}
            </span>
          ) : null}
          {alert.createdAt ? (
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
              {fmtAbsoluteAndRelative(alert.createdAt)}
            </span>
          ) : null}
        </div>
      </div>
      {isActive && (onAcknowledge || onDismiss) ? (
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0')}>
          {onAcknowledge ? (
            <button
              type="button"
              data-mol-id={`alert-ack-${alert.id}`}
              onClick={() => onAcknowledge(alert.id)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest bg-primary text-on-primary hover:bg-primary/90 transition-colors',
              )}
            >
              {t('alertCard.acknowledge', {}, { defaultValue: 'Ack' })}
            </button>
          ) : null}
          {onDismiss ? (
            <button
              type="button"
              data-mol-id={`alert-dismiss-${alert.id}`}
              onClick={() => onDismiss(alert.id)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors',
              )}
            >
              {t('alertCard.dismiss', {}, { defaultValue: 'Dismiss' })}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
