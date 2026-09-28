/**
 * Notifications — activity feed grouped by date with workflow run alerts
 * and failure highlights. Each row links to its source run.
 *
 * Data source: GET /api/notifications synthesises a per-user feed from
 * recent run history.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WorkflowAppShell } from '../components/WorkflowAppShell.js'
import { type RunStatus, WorkflowStatusBadge } from '../components/WorkflowStatusBadge.js'

interface NotificationItem {
  id: string
  kind: 'run'
  run_id: string
  workflow_id: string
  workflow_name: string
  status: string
  title: string
  body: string
  group: string
  time: string | null
  unread: boolean
}

interface NotificationsResponse {
  data: NotificationItem[]
  total: number
  unread: number
}

function statusToRunStatus(status: string): RunStatus {
  if (status === 'success' || status === 'completed') return 'completed'
  if (status === 'failure' || status === 'failed') return 'failed'
  if (status === 'running') return 'running'
  if (status === 'queued') return 'queued'
  if (status === 'paused') return 'paused'
  return 'completed'
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return 'just now'
  if (ms < 60_000) return 'just now'
  if (ms < 3600_000) return `${Math.round(ms / 60_000)}m ago`
  if (ms < 86_400_000) return `${Math.round(ms / 3600_000)}h ago`
  return `${Math.round(ms / 86_400_000)}d ago`
}

const GROUPS = ['Today', 'Yesterday', 'This week']

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [response, setResponse] = useState<NotificationsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<NotificationsResponse>('/api/notifications')
      .then((res) => {
        if (cancelled) return
        setResponse(res.data ?? { data: [], total: 0, unread: 0 })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t(
                'nav.couldNotLoadNotifications',
                {},
                { defaultValue: 'Could not load notifications.' },
              ),
        )
        setResponse({ data: [], total: 0, unread: 0 })
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const items = response?.data ?? []
  const unread = response?.unread ?? 0

  return (
    <WorkflowAppShell
      pageId="notifications"
      eyebrow={t('notifications.eyebrow', { n: unread }, { defaultValue: '{{n}} unread' })}
      title={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
      description={t(
        'notifications.description',
        {},
        {
          defaultValue:
            'Run failures and digest deliveries — grouped by date and filtered to your workspace.',
        },
      )}
    >
      {error && (
        <div
          role="alert"
          data-mol-id="notifications-error"
          className={cm.cn(cm.sp('p', 3), cm.sp('mb', 4), cm.textSize('sm'), 'rounded-xl')}
          style={{
            background: 'var(--color-status-error-bg)',
            color: 'var(--color-status-error-fg)',
          }}
        >
          {error}
        </div>
      )}

      {response === null ? (
        <div
          className={cm.cn(cm.sp('p', 12), cm.textCenter, cm.textMuted)}
          data-mol-id="notifications-loading"
        >
          {t('nav.loadingNotifications', {}, { defaultValue: 'Loading notifications…' })}
        </div>
      ) : items.length === 0 ? (
        <div
          className={cm.cn(cm.sp('p', 12), cm.textCenter, 'rounded-xl bg-surface')}
          data-mol-id="notifications-empty"
          style={{ border: '1px dashed var(--color-border)' }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl', cm.sp('mb', 3))}
            style={{ color: 'var(--color-accent-violet-light)' }}
          >
            notifications_none
          </span>
          <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('notifications.empty.title', {}, { defaultValue: 'You are all caught up' })}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mt', 2))}>
            {t(
              'notifications.empty.body',
              {},
              { defaultValue: 'Run a workflow to start populating this feed.' },
            )}
          </p>
        </div>
      ) : (
        GROUPS.map((group) => {
          const groupItems = items.filter((i) => i.group === group)
          if (groupItems.length === 0) return null
          return (
            <section key={group} className={cm.sp('mb', 8)}>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 3))}>
                <h2
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest',
                  )}
                  style={{ color: 'var(--color-node-condition)' }}
                >
                  {group}
                </h2>
                <span className={'flex-1 h-px'} style={{ background: 'var(--color-border)' }} />
              </div>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                {groupItems.map((item) => (
                  <Link
                    key={item.id}
                    to={`/executions/${item.run_id}`}
                    data-mol-id={`notification-${item.id}`}
                    className={cm.cn(
                      cm.sp('p', 5),
                      item.unread ? cm.accentCard({ tone: 'custom' }) : 'pl-[30px]',
                      'rounded-xl bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md block',
                    )}
                    style={{
                      border: '1px solid var(--color-border)',
                      // Unread: the accent bar (DESIGN.md → "Accent bars"); read
                      // keeps the same left padding so cards line up.
                      ['--mol-accent' as string]: 'var(--color-accent-violet)',
                    }}
                  >
                    <div
                      className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }))}
                    >
                      <div className={'min-w-0 flex-1'}>
                        <div
                          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 1))}
                        >
                          <WorkflowStatusBadge status={statusToRunStatus(item.status)} size="sm" />
                          {item.unread && (
                            <span className={cm.accentCardLabel({ tone: 'custom' })}>
                              {t('status.new', {}, { defaultValue: 'New' })}
                            </span>
                          )}
                        </div>
                        <h3
                          className={cm.cn(
                            cm.textSize('base'),
                            cm.fontWeight('bold'),
                            cm.sp('mb', 1),
                          )}
                        >
                          {item.title}
                        </h3>
                        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>{item.body}</p>
                        <div
                          className={cm.cn(
                            cm.flex({ align: 'center', gap: 'sm' }),
                            cm.sp('mt', 2),
                            cm.textSize('xs'),
                          )}
                        >
                          <span
                            className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}
                            style={{ color: 'var(--color-accent-violet-light)' }}
                          >
                            account_tree
                          </span>
                          <span style={{ color: 'var(--color-foreground-secondary)' }}>
                            {item.workflow_name}
                          </span>
                        </div>
                      </div>
                      <span
                        className={cm.cn(cm.textSize('xs'), 'whitespace-nowrap')}
                        style={{ color: 'var(--color-foreground-secondary)' }}
                      >
                        {relativeTime(item.time)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )
        })
      )}
    </WorkflowAppShell>
  )
}

export default Notifications
