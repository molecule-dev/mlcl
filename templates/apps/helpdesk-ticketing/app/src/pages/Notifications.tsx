import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import AppShell from '../components/AppShell.js'

interface NotifTicket {
  id: string
  subject: string
  status: string
  priority?: string
  created_at: string
  updated_at?: string | null
}

interface DerivedNotification {
  id: string
  ticketId: string
  kind: 'open' | 'pending' | 'recent'
  subject: string
  priority: string
  ts: string
  message: string
}

const PRIORITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

function deriveNotifications(
  tickets: NotifTicket[],
  t: ReturnType<typeof useTranslation>['t'],
): DerivedNotification[] {
  const now = Date.now()
  const out: DerivedNotification[] = []
  for (const tk of tickets) {
    if (tk.status === 'open') {
      const ageMs = now - new Date(tk.created_at).getTime()
      if (Number.isFinite(ageMs)) {
        const hours = Math.max(0, Math.round(ageMs / 3_600_000))
        out.push({
          id: `open-${tk.id}`,
          ticketId: tk.id,
          kind: 'open',
          subject: tk.subject,
          priority: tk.priority || 'medium',
          ts: tk.created_at,
          message: t(
            'notifications.openTicket',
            { hours },
            {
              defaultValue:
                hours <= 1 ? 'Open ticket — opened just now' : 'Open ticket — {{hours}}h waiting',
            },
          ),
        })
      }
    } else if (tk.status === 'pending') {
      out.push({
        id: `pending-${tk.id}`,
        ticketId: tk.id,
        kind: 'pending',
        subject: tk.subject,
        priority: tk.priority || 'medium',
        ts: tk.updated_at || tk.created_at,
        message: t(
          'notifications.pendingTicket',
          {},
          { defaultValue: 'Waiting on requester response' },
        ),
      })
    }
    if (tk.updated_at && tk.updated_at !== tk.created_at) {
      const updatedAge = now - new Date(tk.updated_at).getTime()
      if (Number.isFinite(updatedAge) && updatedAge < 24 * 3_600_000) {
        out.push({
          id: `recent-${tk.id}`,
          ticketId: tk.id,
          kind: 'recent',
          subject: tk.subject,
          priority: tk.priority || 'medium',
          ts: tk.updated_at,
          message: t('notifications.recentlyUpdated', {}, { defaultValue: 'Recently updated' }),
        })
      }
    }
  }
  out.sort((a, b) => {
    const pri = (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0)
    if (pri !== 0) return pri
    return new Date(b.ts).getTime() - new Date(a.ts).getTime()
  })
  return out.slice(0, 25)
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tickets, setTickets] = useState<NotifTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = t(
      'notifications.pageTitle',
      { appName: APP_NAME },
      { defaultValue: 'Notifications — {{appName}} Support' },
    )
  }, [t])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await http.get('/api/tickets')
        if (cancelled) return
        const raw: NotifTicket[] = Array.isArray(res)
          ? (res as NotifTicket[])
          : Array.isArray((res as { data?: unknown })?.data)
            ? (res as { data: NotifTicket[] }).data
            : []
        setTickets(raw)
      } catch (err) {
        if (cancelled) return
        logError(err instanceof Error ? err : new Error(String(err)))
        setError(
          t(
            'notifications.loadError',
            {},
            { defaultValue: "Couldn't load notifications. Try again in a moment." },
          ),
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, t])

  const items = useMemo(() => deriveNotifications(tickets, t), [tickets, t])

  return (
    <AppShell
      mobileTitle={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
      contentMolId="page-notifications"
    >
      <div className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 8))}>
        <header className={cm.stack(2)}>
          <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'notifications.subtitle',
              {},
              {
                defaultValue:
                  'Synthesised from ticket activity — open, pending, and recently updated tickets surface here.',
              },
            )}
          </p>
        </header>

        <section
          className={cm.cn(cm.sp('mt', 6), cm.stack(3))}
          data-mol-id="notifications-list"
          data-loaded={!loading}
        >
          {loading ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : error ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-error')} data-mol-id="notifications-error">
              {error}
            </p>
          ) : items.length === 0 ? (
            <p
              className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
              data-mol-id="notifications-empty"
            >
              {t('notifications.empty', {}, { defaultValue: "You're all caught up." })}
            </p>
          ) : (
            items.map((n) => (
              <Link
                key={n.id}
                to={`/tickets/${n.ticketId}`}
                data-mol-id="notification-item"
                data-kind={n.kind}
                data-priority={n.priority}
                data-ticket-id={n.ticketId}
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 4 }),
                  cm.sp('p', 4),
                  'rounded-lg bg-surface-container-low/40 hover:bg-surface-container-low transition-colors border border-outline-variant/40',
                )}
              >
                <span
                  className={cm.cn(
                    cm.w(2),
                    cm.h(2),
                    cm.roundedFull,
                    cm.sp('mt', 2),
                    n.priority === 'critical' || n.priority === 'high'
                      ? 'bg-error'
                      : n.priority === 'medium'
                        ? 'bg-primary'
                        : 'bg-secondary-container',
                  )}
                  aria-hidden
                />
                <div className={cm.cn(cm.flex1, cm.stack(1))}>
                  <div className={cm.flex({ align: 'center', justify: 'between', gap: 2 })}>
                    <span
                      className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
                      data-mol-id="notification-subject"
                    >
                      {n.subject}
                    </span>
                    <span
                      className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
                      data-mol-id="notification-priority"
                    >
                      {n.priority}
                    </span>
                  </div>
                  <p
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
                    data-mol-id="notification-message"
                  >
                    {n.message}
                  </p>
                </div>
              </Link>
            ))
          )}
        </section>
      </div>
    </AppShell>
  )
}

export default Notifications
