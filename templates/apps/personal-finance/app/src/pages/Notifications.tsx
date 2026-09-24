import { Link } from 'react-router'

import { useGet, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import FinanceShell from '../components/FinanceShell.js'

interface NotificationItem {
  id: string
  type:
    | 'budget_exceeded'
    | 'budget_at_risk'
    | 'goal_milestone'
    | 'low_account_balance'
    | 'large_transaction'
  title: string
  body: string
  severity: 'info' | 'warning' | 'critical' | 'success'
  link: string
  ts: string
}

const severityIcon = (s: NotificationItem['severity']): string => {
  if (s === 'critical') return 'priority_high'
  if (s === 'warning') return 'warning'
  if (s === 'success') return 'celebration'
  return 'info'
}

const severityToneClass = (s: NotificationItem['severity']): string => {
  if (s === 'critical') return 'bg-error-light text-error border-error/30'
  if (s === 'warning') return 'bg-warning-light text-warning border-warning/30'
  if (s === 'success') return 'bg-success-light text-success border-success/30'
  return 'bg-surface-secondary text-foreground border-border'
}

const severityLabelKey = (s: NotificationItem['severity']): string => `notifications.severity.${s}`
const severityLabelDefault = (s: NotificationItem['severity']): string => {
  if (s === 'critical') return 'Critical'
  if (s === 'warning') return 'Warning'
  if (s === 'success') return 'Milestone'
  return 'Info'
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { data, loading, error } = useGet<{ data: NotificationItem[]; count: number }>(
    '/notifications',
    { immediate: true },
  )

  const items: NotificationItem[] = data?.data ?? []

  return (
    <FinanceShell>
      <div className="text-on-surface">
        <div
          data-mol-id="page-notifications"
          className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 8))}
        >
          <h1
            className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}
            data-mol-id="notifications-title"
          >
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          {loading && (
            <p className={cm.textMuted} data-mol-id="notifications-loading">
              {t('nav.loadingNotifications', {}, { defaultValue: 'Loading notifications…' })}
            </p>
          )}
          {error && (
            <p className={cm.formError} role="alert" data-mol-id="notifications-error">
              {t(
                'notifications.error',
                {},
                { defaultValue: 'Could not load notifications. Try again later.' },
              )}
            </p>
          )}
          {!loading && !error && items.length === 0 && (
            <p className={cm.textMuted} data-mol-id="notifications-empty">
              {t('notifications.empty', {}, { defaultValue: "You're all caught up." })}
            </p>
          )}
          {!loading && !error && items.length > 0 && (
            <ul
              className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
              data-mol-id="notifications-list"
            >
              {items.map((n) => (
                <li
                  key={n.id}
                  data-mol-id={`notification-${n.id}`}
                  data-mol-type={n.type}
                  data-mol-severity={n.severity}
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.flex({ direction: 'row', gap: 'md', align: 'start' }),
                    'rounded-xl border ' + severityToneClass(n.severity),
                  )}
                >
                  <span
                    className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined shrink-0')}
                    aria-hidden
                  >
                    {severityIcon(n.severity)}
                  </span>
                  <div
                    className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 min-w-0')}
                  >
                    <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }))}>
                      <span
                        className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'uppercase')}
                      >
                        {t(
                          severityLabelKey(n.severity),
                          {},
                          { defaultValue: severityLabelDefault(n.severity) },
                        )}
                      </span>
                      <time className={cm.cn(cm.textSize('xs'), cm.textMuted)} dateTime={n.ts}>
                        {new Date(n.ts).toLocaleDateString()}
                      </time>
                    </div>
                    <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>{n.title}</h2>
                    <p className={cm.cn(cm.textSize('sm'))}>{n.body}</p>
                    {n.link && (
                      <Link
                        to={n.link}
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'underline underline-offset-2 mt-1',
                        )}
                        data-mol-id={`notification-link-${n.id}`}
                      >
                        {t('notifications.viewDetails', {}, { defaultValue: 'View details →' })}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </FinanceShell>
  )
}
export default Notifications
