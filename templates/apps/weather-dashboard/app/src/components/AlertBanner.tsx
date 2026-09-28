import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface WeatherAlertItem {
  id: string
  /** Free-text type label (Severe Thunderstorm, Heat Advisory, …). */
  type?: string | null
  /** Severity bucket. */
  severity: 'minor' | 'moderate' | 'severe' | 'extreme' | string
  /** Headline. */
  title: string
  /** Optional secondary copy. */
  description?: string | null
  /** Issuing source. */
  source?: string | null
  /** ISO timestamps. */
  issued_at?: string | null
  expires_at?: string | null
  /** Status (active / expired / dismissed). */
  status?: string | null
}

interface AlertBannerProps {
  alert: WeatherAlertItem
  onDismiss?: (id: string) => void
}

const SEVERITY_TONE: Record<
  string,
  { bar: 'info' | 'warning' | 'error'; bg: string; pill: string; icon: string }
> = {
  minor: {
    bar: 'info',
    bg: 'bg-info/10',
    pill: 'bg-info/20 text-info',
    icon: 'info',
  },
  moderate: {
    bar: 'warning',
    bg: 'bg-warning/10',
    pill: 'bg-warning/20 text-warning',
    icon: 'notifications_active',
  },
  severe: {
    bar: 'error',
    bg: 'bg-error/10',
    pill: 'bg-error/20 text-error',
    icon: 'warning',
  },
  extreme: {
    bar: 'error',
    bg: 'bg-error/15',
    pill: 'bg-error/30 text-on-error-container',
    icon: 'storm',
  },
}

function fmtTime(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/**
 * Severity-tinted alert banner — inset accent bar, glass-tinted
 * background, severity pill, and an optional dismiss control. Stacks
 * vertically inside the Alerts page; the Dashboard renders the highest
 * severity banner inline above the hero.
 *
 * Translated from helpdesk-ticketing's TicketDetail status banner
 * pattern (severity bar + tinted bg + pill row) and DESIGN.md's
 * "Alert Banner" recipe.
 */
export function AlertBanner({ alert, onDismiss }: AlertBannerProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const severity = SEVERITY_TONE[alert.severity] || SEVERITY_TONE.moderate

  return (
    <div
      className={cm.cn(
        cm.sp('p', 4),
        'rounded-xl',
        severity.bg,
        cm.accentCard({ tone: severity.bar }),
        'backdrop-blur-sm',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }))}>
        <div className={cm.cn(cm.flex({ align: 'start', gap: 'md' }), 'flex-1 min-w-0')}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              severity.pill,
            )}
            aria-hidden="true"
          >
            <span
              className={cm.cn('material-symbols-outlined', cm.textSize('xl'))}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {severity.icon}
            </span>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full',
                  severity.pill,
                )}
              >
                {t(`alertBanner.severity.${alert.severity}`, {}, { defaultValue: alert.severity })}
              </span>
              {alert.type ? (
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {alert.type}
                </span>
              ) : null}
              {alert.issued_at ? (
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-mono text-on-surface-variant tabular-nums',
                  )}
                >
                  {fmtTime(alert.issued_at)}
                </span>
              ) : null}
            </div>
            <h3 className={cm.cn(cm.sp('mt', 1), cm.fontWeight('bold'), cm.textSize('base'))}>
              {alert.title}
            </h3>
            {alert.description ? (
              <p
                className={cm.cn(
                  cm.sp('mt', 1),
                  cm.textSize('sm'),
                  'text-on-surface-variant leading-relaxed',
                )}
              >
                {alert.description}
              </p>
            ) : null}
            {alert.source || alert.expires_at ? (
              <p
                className={cm.cn(
                  cm.sp('mt', 2),
                  cm.textSize('xs'),
                  'font-mono uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {alert.source ? `${alert.source}` : ''}
                {alert.source && alert.expires_at ? ' · ' : ''}
                {alert.expires_at
                  ? t(
                      'alertBanner.expires',
                      { time: fmtTime(alert.expires_at) },
                      { defaultValue: 'Until {{time}}' },
                    )
                  : ''}
              </p>
            ) : null}
          </div>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={() => onDismiss(alert.id)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              'bg-surface-container/60 hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors',
            )}
            aria-label={t(
              'alertBanner.dismissAria',
              { title: alert.title },
              { defaultValue: 'Dismiss {{title}}' },
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
              aria-hidden="true"
            >
              close
            </span>
          </button>
        ) : null}
      </div>
    </div>
  )
}
