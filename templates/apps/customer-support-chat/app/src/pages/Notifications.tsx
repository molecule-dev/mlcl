import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { get } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { InboxLayout } from '../components/InboxLayout.js'
import { StatusPill } from '../components/StatusPill.js'

interface ConversationRow {
  id: string
  status: string | null
  priority: string | null
  subject: string | null
  visitor_name: string | null
  visitor_email: string | null
  last_message_at: string | null
  created_at: string | null
  agent_id: string | null
}

interface NotificationEntry {
  id: string
  type: 'assignment' | 'open' | 'urgent' | 'resolved'
  title: string
  body: string
  timestamp: string
  href: string
  unread: boolean
}

const TYPE_META: Record<NotificationEntry['type'], { icon: string; bg: string; text: string }> = {
  assignment: { icon: 'assignment_ind', bg: 'bg-primary/15', text: 'text-primary-dark' },
  open: { icon: 'forum', bg: 'bg-secondary/15', text: 'text-secondary' },
  urgent: {
    icon: 'schedule',
    bg: 'bg-[var(--color-status-error-bg)]',
    text: 'text-[var(--color-status-error-text)]',
  },
  resolved: {
    icon: 'check_circle',
    bg: 'bg-[var(--color-status-resolved-bg)]',
    text: 'text-[var(--color-status-resolved-text)]',
  },
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  const m = Math.floor(ms / 60_000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

type Translate = ReturnType<typeof useTranslation>['t']

function entryFromConversation(c: ConversationRow, t: Translate): NotificationEntry {
  const visitor =
    c.visitor_name ||
    c.visitor_email ||
    t('notifications.visitorFallback', {}, { defaultValue: 'A visitor' })
  const subject =
    c.subject || t('notifications.subjectFallback', {}, { defaultValue: 'a conversation' })
  const ts = c.last_message_at || c.created_at
  if (c.status === 'closed' || c.status === 'resolved') {
    return {
      id: `c-${c.id}`,
      type: 'resolved',
      title: t(
        'notifications.resolvedTitle',
        { subject },
        { defaultValue: 'Resolved · {{subject}}' },
      ),
      body: t(
        'notifications.resolvedBody',
        { visitor },
        { defaultValue: '{{visitor}}’s conversation was marked resolved.' },
      ),
      timestamp: relativeTime(ts),
      href: `/conversation/${c.id}`,
      unread: false,
    }
  }
  if (c.priority === 'urgent' || c.priority === 'high') {
    return {
      id: `c-${c.id}`,
      type: 'urgent',
      title:
        c.priority === 'urgent'
          ? t('notifications.urgentTitle', { subject }, { defaultValue: 'Urgent: {{subject}}' })
          : t(
              'notifications.highPriorityTitle',
              { subject },
              { defaultValue: 'High priority: {{subject}}' },
            ),
      body: t(
        'notifications.urgentBody',
        { visitor },
        { defaultValue: '{{visitor}} needs a reply soon.' },
      ),
      timestamp: relativeTime(ts),
      href: `/conversation/${c.id}`,
      unread: true,
    }
  }
  if (c.agent_id) {
    return {
      id: `c-${c.id}`,
      type: 'assignment',
      title: t(
        'notifications.assignedTitle',
        { subject },
        { defaultValue: 'Assigned · {{subject}}' },
      ),
      body: t(
        'notifications.assignedBody',
        { visitor },
        { defaultValue: '{{visitor}} is assigned to an agent.' },
      ),
      timestamp: relativeTime(ts),
      href: `/conversation/${c.id}`,
      unread: false,
    }
  }
  return {
    id: `c-${c.id}`,
    type: 'open',
    title: t(
      'notifications.openTitle',
      { subject },
      { defaultValue: 'New conversation · {{subject}}' },
    ),
    body: t(
      'notifications.openBody',
      { visitor },
      { defaultValue: '{{visitor}} started a conversation.' },
    ),
    timestamp: relativeTime(ts),
    href: `/conversation/${c.id}`,
    unread: true,
  }
}

function NotificationsBody() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [entries, setEntries] = useState<NotificationEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const rows = await get<ConversationRow[]>('/api/conversations')
        if (cancelled) return
        const list = Array.isArray(rows.data) ? rows.data : []
        const sorted = [...list].sort((a, b) => {
          const at = new Date(a.last_message_at || a.created_at || 0).getTime()
          const bt = new Date(b.last_message_at || b.created_at || 0).getTime()
          return bt - at
        })
        setEntries(sorted.slice(0, 50).map((c) => entryFromConversation(c, t)))
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load notifications')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [t])

  return (
    <div className={cm.cn(cm.stack(6), cm.sp('p', 6))}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-primary-dark',
          )}
        >
          {t('nav.activityFeed', {}, { defaultValue: 'Activity feed' })}
        </span>
        <h1 className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'notifications.subheading',
            {},
            {
              defaultValue:
                'Assignments, @mentions, SLA risks, CSAT feedback and team activity — sorted newest first.',
            },
          )}
        </p>
      </header>
      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-error-container)] text-[color:var(--color-on-error-container)]',
          )}
        >
          {error}
        </div>
      ) : null}
      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : entries.length === 0 ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'notifications.empty',
            {},
            { defaultValue: 'No activity yet. New conversations show up here.' },
          )}
        </p>
      ) : null}
      <ul className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
        {entries.map((entry) => {
          const meta = TYPE_META[entry.type]
          const body = (
            <>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(10),
                  cm.h(10),
                  cm.roundedFull,
                  meta.bg,
                  meta.text,
                  'shrink-0',
                )}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  {meta.icon}
                </span>
              </div>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 1 }), cm.flex1, 'min-w-0')}>
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 2 }))}>
                  <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface truncate')}>
                    {entry.title}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant shrink-0 tabular-nums',
                    )}
                  >
                    {entry.timestamp}
                  </span>
                </div>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{entry.body}</p>
                {entry.unread && (
                  <StatusPill
                    variant="unread"
                    label={t('status.new', {}, { defaultValue: 'New' })}
                  />
                )}
              </div>
            </>
          )
          const className = cm.cn(
            cm.flex({ align: 'start', gap: 3 }),
            cm.sp('p', 4),
            'rounded-xl bg-surface border border-[color:var(--color-border)] hover:border-primary/40 transition-colors',
          )
          return (
            <li key={entry.id}>
              <Link to={entry.href} className={className}>
                {body}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Notifications() {
  return <InboxLayout main={<NotificationsBody />} />
}

export default Notifications
export { Notifications, Notifications as NotificationsPage }
