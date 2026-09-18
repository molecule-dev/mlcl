import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { t } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

type ActivityType = 'submitted' | 'approved' | 'rejected' | 'reimbursed' | 'policy' | 'reminder'

interface ActivityEvent {
  id: string
  type: ActivityType
  title: string
  description: string
  amount_cents: number | null
  actor: string
  reportId?: string
  occurred_at: string
}

const FALLBACK: ActivityEvent[] = [
  {
    id: 'a-1',
    type: 'submitted',
    title: 'Berlin sales offsite submitted',
    description: 'Maya Okafor submitted 5 expenses for manager review.',
    amount_cents: 234_550,
    actor: 'Maya Okafor',
    reportId: 'r-2401',
    occurred_at: '2026-04-21T09:14:00Z',
  },
  {
    id: 'a-2',
    type: 'approved',
    title: 'Q2 client dinners approved',
    description: "Sergei Volkov approved Henry Liang's report.",
    amount_cents: 89_120,
    actor: 'Sergei Volkov',
    reportId: 'r-2399',
    occurred_at: '2026-04-20T15:42:00Z',
  },
  {
    id: 'a-3',
    type: 'reimbursed',
    title: 'NYC product summit reimbursed',
    description: 'Finance issued ACH reimbursement to Avery Cole.',
    amount_cents: 412_000,
    actor: `Finance · ${APP_NAME}`,
    reportId: 'r-2398',
    occurred_at: '2026-04-18T11:00:00Z',
  },
  {
    id: 'a-4',
    type: 'policy',
    title: 'Policy flag · meal cap exceeded',
    description: 'Maya Okafor logged a $104.30 dinner — daily cap is $80.',
    amount_cents: 10_430,
    actor: `${APP_NAME} policy bot`,
    reportId: 'r-2401',
    occurred_at: '2026-04-15T19:50:00Z',
  },
  {
    id: 'a-5',
    type: 'rejected',
    title: 'March software stack rejected',
    description: 'Receipt missing for $42.50 line item — Jordan Reyes asked to revise.',
    amount_cents: 67_400,
    actor: 'Sergei Volkov',
    reportId: 'r-2392',
    occurred_at: '2026-04-08T16:24:00Z',
  },
  {
    id: 'a-6',
    type: 'reminder',
    title: 'Receipts due in 2 days',
    description: '4 expenses still need a receipt before month-end close.',
    amount_cents: null,
    actor: APP_NAME,
    occurred_at: '2026-04-04T08:00:00Z',
  },
]

const ICON_FOR: Record<ActivityType, string> = {
  submitted: 'send',
  approved: 'check_circle',
  rejected: 'cancel',
  reimbursed: 'paid',
  policy: 'flag',
  reminder: 'notifications_active',
}

const TONE_FOR: Record<ActivityType, string> = {
  submitted: 'bg-[var(--color-status-pending-bg)] text-[var(--color-status-pending)]',
  approved: 'bg-[var(--color-status-approved-bg)] text-[var(--color-status-approved)]',
  rejected: 'bg-[var(--color-status-rejected-bg)] text-[var(--color-status-rejected)]',
  reimbursed: 'bg-[var(--color-secondary-light)] text-[var(--color-status-reimbursed)]',
  policy: 'bg-[var(--color-status-rejected-bg)] text-[var(--color-status-rejected)]',
  reminder: 'bg-primary-container text-on-primary-container',
}

const formatUsd = (cents: number | null): string => {
  if (cents === null) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

const formatRelative = (iso: string): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffHours = Math.round(diffMs / 36e5)
  if (diffHours < 24) {
    return diffHours <= 1
      ? t('common.justNow', {}, { defaultValue: 'just now' })
      : t('time.hoursAgo', { count: diffHours }, { defaultValue: '{{count}}h ago' })
  }
  const diffDays = Math.round(diffHours / 24)
  if (diffDays < 7)
    return t('time.daysAgo', { count: diffDays }, { defaultValue: '{{count}}d ago' })
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [events, setEvents] = useState<ActivityEvent[]>(FALLBACK)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<ActivityEvent[]>('/api/notifications')
      .then((response) => {
        if (cancelled) return
        const data = response?.data
        if (Array.isArray(data) && data.length > 0) setEvents(data)
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setError('feed')
      })
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <div data-mol-id="page-notifications" className={cm.stack(8)}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('notifications.eyebrow', {}, { defaultValue: 'Workspace activity' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}>
          {t('settings.notifications.title', {}, { defaultValue: 'Notifications' })}
        </h1>
      </header>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl bg-warning-container/40 text-on-warning-container',
          )}
        >
          {t(
            'notifications.feedFallback',
            {},
            { defaultValue: 'Live feed unavailable — showing curated demo data.' },
          )}
        </div>
      ) : null}

      <section
        data-mol-id="activity-feed"
        className={cm.cn(
          'rounded-2xl bg-surface border border-outline-variant/40 overflow-hidden divide-y divide-outline-variant/40',
        )}
      >
        {events.map((event) => (
          <article
            key={event.id}
            className={cm.cn(
              cm.flex({ align: 'start', gap: 'md' }),
              cm.sp('px', 5),
              cm.sp('py', 4),
              'hover:bg-surface-container-low transition-colors',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'h-10 w-10 shrink-0 rounded-xl',
                TONE_FOR[event.type],
              )}
              aria-hidden="true"
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>
                {ICON_FOR[event.type]}
              </span>
            </div>
            <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
              <div className={cm.flex({ align: 'baseline', justify: 'between', gap: 'sm' })}>
                <span
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                >
                  {event.title}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'text-on-surface-variant tabular-nums shrink-0',
                  )}
                >
                  {formatRelative(event.occurred_at)}
                </span>
              </div>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant',
                )}
              >
                {event.description}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
                  cm.sp('mt', 1),
                )}
              >
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {event.actor}
                </span>
                {event.amount_cents !== null ? (
                  <span className={cm.cn('text-xs font-bold tabular-nums tracking-tight')}>
                    {formatUsd(event.amount_cents)}
                  </span>
                ) : null}
                {event.reportId ? (
                  <Link
                    to={`/reports?id=${encodeURIComponent(event.reportId)}`}
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'text-primary-dark hover:underline',
                    )}
                  >
                    {t('notifications.openReport', {}, { defaultValue: 'Open report ›' })}
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        ))}
        {events.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('p', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            {t(
              'notifications.empty',
              {},
              { defaultValue: 'No activity yet — your feed will populate once expenses move.' },
            )}
          </div>
        ) : null}
      </section>
    </div>
  )
}
