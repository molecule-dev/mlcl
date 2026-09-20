import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LineBadge, type LineBadgeLine } from './LineBadge.js'

export interface ServiceAlert {
  id: string
  line_code: string | null
  line: LineBadgeLine | null
  severity: 'info' | 'warning' | 'severe'
  title: string
  body: string | null
  starts_at: string
  ends_at: string | null
}

/**
 * Service-alert card. Severity sets the left accent + chip color via the
 * theme's board-state tokens; a NULL line renders the system-wide chip
 * instead of a badge.
 */
export function ServiceAlertCard({ alert }: { alert: ServiceAlert }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const severityVar =
    alert.severity === 'severe'
      ? 'var(--color-severe)'
      : alert.severity === 'warning'
        ? 'var(--color-warning)'
        : 'var(--color-secondary)'
  const severityBgVar =
    alert.severity === 'severe'
      ? 'var(--color-severe-light)'
      : alert.severity === 'warning'
        ? 'var(--color-warning-light)'
        : 'var(--color-primary-light)'

  return (
    <article
      data-mol-id={`service-alert-${alert.id}`}
      className={cm.cn(
        'relative overflow-hidden',
        cm.sp('p', 5),
        'bg-surface rounded-2xl ring-1 ring-outline-variant/40',
      )}
    >
      <span
        className="absolute inset-y-0 left-0 w-1.5"
        aria-hidden="true"
        style={{ backgroundColor: severityVar }}
      />
      <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest rounded-full px-2.5 py-0.5',
          )}
          style={{ backgroundColor: severityBgVar, color: severityVar }}
        >
          {t(`alerts.severity.${alert.severity}`, {}, { defaultValue: alert.severity })}
        </span>
        {alert.line ? (
          <LineBadge line={alert.line} size="sm" />
        ) : (
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
            )}
          >
            {t('alerts.allLines', {}, { defaultValue: 'All lines' })}
          </span>
        )}
        <span className={cm.cn(cm.textSize('xs'), 'ml-auto text-on-surface-variant tabular-nums')}>
          {alert.ends_at
            ? t(
                'alerts.untilDate',
                { date: new Date(alert.ends_at).toLocaleDateString() },
                { defaultValue: 'until {{date}}' },
              )
            : t('alerts.untilFurtherNotice', {}, { defaultValue: 'until further notice' })}
        </span>
      </div>
      <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), cm.sp('mt', 3))}>
        {alert.title}
      </h3>
      {alert.body ? (
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mt', 1),
            'text-on-surface-variant leading-relaxed',
          )}
        >
          {alert.body}
        </p>
      ) : null}
    </article>
  )
}
