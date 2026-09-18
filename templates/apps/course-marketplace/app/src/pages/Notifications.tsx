/**
 * Notifications — owner-only activity feed.
 *
 * Reads /api/notifications (server returns rows decorated via
 * decorateNotification). Mark-all-read POSTs /api/notifications/read-all
 * and PUT /api/notifications/:id/read marks a single row read.
 * Each notification row links into the matching artefact (course,
 * lesson, certificate) via its `href`.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import type { TranslateFunction } from '@molecule/app-i18n'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import { api, type Notification } from '../lib/api.js'

const ICON: Record<string, string> = {
  enrollment: 'person_add',
  review: 'star',
  reply: 'chat_bubble',
  update: 'update',
  certificate: 'workspace_premium',
  system: 'notifications',
}

type Bucket = 'today' | 'yesterday' | 'earlier-this-week' | 'earlier'

const BUCKET_ORDER: Bucket[] = ['today', 'yesterday', 'earlier-this-week', 'earlier']

const BUCKET_LABELS: Record<Bucket, { key: string; defaultValue: string }> = {
  today: { key: 'notifications.group.today', defaultValue: 'Today' },
  yesterday: { key: 'notifications.group.yesterday', defaultValue: 'Yesterday' },
  'earlier-this-week': { key: 'notifications.group.thisWeek', defaultValue: 'Earlier this week' },
  earlier: { key: 'notifications.group.earlier', defaultValue: 'Earlier' },
}

function bucket(iso: string): Bucket {
  const ms = Date.now() - new Date(iso).getTime()
  const h = ms / (60 * 60 * 1000)
  if (h < 24) return 'today'
  if (h < 48) return 'yesterday'
  if (h < 24 * 7) return 'earlier-this-week'
  return 'earlier'
}

function relTime(t: TranslateFunction, iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / (60 * 1000))
  if (m < 60) return t('timeAgo.minutes', { count: m }, { defaultValue: '{{count}} min ago' })
  const h = Math.floor(m / 60)
  if (h < 24) return t('timeAgo.hours', { count: h }, { defaultValue: '{{count}}h ago' })
  const d = Math.floor(h / 24)
  return t('timeAgo.daysShort', { count: d }, { defaultValue: '{{count}}d ago' })
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const rows = await api<Notification[]>('/notifications')
      setItems(Array.isArray(rows) ? rows : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const onMarkAllRead = async () => {
    if (marking) return
    setMarking(true)
    try {
      await api('/notifications/read-all', { method: 'POST' })
      setItems((prev) =>
        prev.map((n) => ({ ...n, unread: false, read_at: new Date().toISOString() })),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark all read'
      alert(message)
    } finally {
      setMarking(false)
    }
  }

  const onMarkRead = async (id: string) => {
    try {
      await api(`/notifications/${id}/read`, { method: 'PUT' })
      setItems((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, unread: false, read_at: new Date().toISOString() } : n,
        ),
      )
    } catch (err) {
      // best-effort; surface in console only.
      console.warn('Failed to mark read', err)
    }
  }

  const grouped: Partial<Record<Bucket, Notification[]>> = {}
  for (const n of items) {
    const key = bucket(n.created_at)
    grouped[key] = grouped[key] ?? []
    grouped[key].push(n)
  }
  const groupOrder = BUCKET_ORDER.filter((k) => grouped[k])

  return (
    <div className={cm.cn('min-h-screen flex flex-col bg-background')}>
      <Header />
      <main className={cm.cn(cm.sp('px', 6), cm.sp('py', 12), 'max-w-4xl mx-auto w-full flex-1')}>
        <header className={cm.cn('flex items-end justify-between mb-10 gap-6 flex-wrap')}>
          <div>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
              )}
            >
              {t('nav.activity', {}, { defaultValue: 'Activity' })}
            </p>
            <h1
              className={cm.cn(
                'text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            </h1>
          </div>
          <button
            onClick={onMarkAllRead}
            type="button"
            disabled={marking || items.every((n) => !n.unread)}
            data-mol-id="mark-all-read"
            className={cm.cn(
              'inline-flex items-center gap-2 bg-surface-container-low text-on-surface px-4 py-2 rounded-full text-sm font-medium hover:bg-surface-container transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>done_all</span>
            {marking
              ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
              : t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
          </button>
        </header>
        {loading ? (
          <p
            data-mol-id="notifications-loading"
            className={cm.cn('text-on-surface-variant text-sm py-10 text-center')}
          >
            {t('nav.loadingNotifications', {}, { defaultValue: 'Loading notifications…' })}
          </p>
        ) : items.length === 0 ? (
          <div
            data-mol-id="notifications-empty"
            className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm p-12 text-center')}
          >
            <span
              className={cm.cn('material-symbols-outlined text-5xl text-primary mb-3')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              notifications_off
            </span>
            <p className={cm.cn('text-lg font-bold text-on-surface mb-2')}>
              {t('notifications.empty.title', {}, { defaultValue: 'You are all caught up' })}
            </p>
            <p className={cm.cn('text-on-surface-variant text-sm')}>
              {t(
                'notifications.empty.body',
                {},
                { defaultValue: 'No new activity to review. New events will appear here.' },
              )}
            </p>
          </div>
        ) : (
          <div className={cm.cn('space-y-10')}>
            {groupOrder.map((heading) => (
              <section key={heading} data-mol-id={`notif-group-${heading}`}>
                <h2
                  className={cm.cn(
                    'text-[11px] font-black uppercase tracking-widest text-on-surface-variant mb-4',
                  )}
                >
                  {t(
                    BUCKET_LABELS[heading].key,
                    {},
                    { defaultValue: BUCKET_LABELS[heading].defaultValue },
                  )}
                </h2>
                <ul
                  className={cm.cn(
                    'bg-surface-container-lowest rounded-2xl shadow-sm divide-y divide-outline-variant/15 overflow-hidden',
                  )}
                >
                  {(grouped[heading] ?? []).map((n) => {
                    const icon = ICON[n.type] ?? ICON.system
                    const inner = (
                      <>
                        <div
                          className={cm.cn(
                            'w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0',
                            n.type === 'review'
                              ? 'bg-[var(--color-lectura-gold-bg)] text-[var(--color-lectura-gold)]'
                              : n.type === 'certificate'
                                ? 'bg-[var(--color-lectura-gold-bg)] text-[var(--color-lectura-gold)]'
                                : n.type === 'enrollment'
                                  ? 'bg-[var(--color-lectura-green-bg)] text-[var(--color-lectura-green)]'
                                  : 'bg-primary-fixed text-primary',
                          )}
                        >
                          <span
                            className={cm.cn('material-symbols-outlined text-[22px]')}
                            style={{ fontVariationSettings: "'FILL' 1" }}
                            aria-hidden="true"
                          >
                            {icon}
                          </span>
                        </div>
                        <div className={cm.cn('flex-1 min-w-0')}>
                          <p className={cm.cn('text-sm font-bold text-on-surface leading-tight')}>
                            {n.title}
                            {n.unread && (
                              <span
                                className={cm.cn(
                                  'inline-block w-2 h-2 rounded-full bg-primary ml-2 align-middle',
                                )}
                                aria-label={t('status.unread', {}, { defaultValue: 'Unread' })}
                              ></span>
                            )}
                          </p>
                          {n.body && (
                            <p
                              className={cm.cn(
                                'text-sm text-on-surface-variant mt-1 leading-relaxed',
                              )}
                            >
                              {n.body}
                            </p>
                          )}
                          <p
                            className={cm.cn(
                              'text-[11px] font-medium text-on-surface-variant uppercase tracking-widest mt-2',
                            )}
                          >
                            {relTime(t, n.created_at)}
                          </p>
                        </div>
                      </>
                    )
                    return (
                      <li
                        key={n.id}
                        data-mol-id={`notification-${n.id}`}
                        className={cm.cn('transition-colors', n.unread && 'bg-primary-fixed/30')}
                      >
                        {n.href ? (
                          <Link
                            to={n.href}
                            onClick={() => {
                              if (n.unread) void onMarkRead(n.id)
                            }}
                            className={cm.cn('flex gap-4 px-6 py-5 hover:bg-surface-container-low')}
                          >
                            {inner}
                          </Link>
                        ) : (
                          <div
                            role="button"
                            tabIndex={0}
                            className={cm.cn('flex gap-4 px-6 py-5 hover:bg-surface-container-low')}
                            onClick={() => {
                              if (n.unread) void onMarkRead(n.id)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                if (n.unread) void onMarkRead(n.id)
                              }
                            }}
                          >
                            {inner}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default Notifications
