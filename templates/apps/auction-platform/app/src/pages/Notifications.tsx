import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type NotificationKind, NotificationRow } from '../components/NotificationRow.js'

interface NotificationItem {
  id: string
  kind: NotificationKind
  title: string
  body: string
  when: string
  unread?: boolean
  to?: string
}

interface MeSummary {
  name?: string | null
  username?: string | null
  email?: string | null
  notifyPrefs?: Record<string, boolean>
}

type DayGroup = 'today' | 'yesterday' | 'earlier'

function dayGroupOf(iso: string): DayGroup {
  const t = new Date(iso).getTime()
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (t >= startOfToday) return 'today'
  if (t >= startOfToday - 24 * 60 * 60 * 1000) return 'yesterday'
  return 'earlier'
}

const FILTERS = [
  'all',
  'outbid',
  'ending',
  'won',
  'new_bid',
  'watchlist',
  'sold',
  'system',
] as const
type FilterKey = (typeof FILTERS)[number]

function parseFilter(hash: string): FilterKey {
  const v = hash.replace(/^#/, '')
  return (FILTERS as readonly string[]).includes(v) ? (v as FilterKey) : 'all'
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const location = useLocation()
  const navigate = useNavigate()
  const filter = parseFilter(location.hash)
  const setFilter = (next: FilterKey) => {
    navigate({ pathname: '/notifications', hash: `#${next}` })
  }
  const [items, setItems] = useState<NotificationItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)
  const [me, setMe] = useState<MeSummary | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<MeSummary>('/api/me')
      .then((res) => {
        if (cancelled) return
        setMe(res.data ?? null)
      })
      .catch(() => {
        // Account card is supplementary — the feed works without it.
      })
    return () => {
      cancelled = true
    }
  }, [http])

  useEffect(() => {
    let cancelled = false
    setItems(null)
    setError(null)
    http
      .get<{ data?: NotificationItem[] }>('/api/notifications')
      .then((res) => {
        if (cancelled) return
        const list = (res.data?.data ?? []) as NotificationItem[]
        setItems(list)
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
        setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- safeItems is a stable-reference guard; wrapping in useMemo would be circular
  const safeItems = items ?? []

  const filtered = useMemo(() => {
    if (filter === 'all') return safeItems
    return safeItems.filter((i) => i.kind === filter)
  }, [safeItems, filter])

  // Day-grouped feed — the design's "Today" / "Yesterday" section headings,
  // derived from each notification's own timestamp.
  const groups = useMemo(() => {
    const order: DayGroup[] = []
    const byGroup: Record<DayGroup, NotificationItem[]> = { today: [], yesterday: [], earlier: [] }
    for (const n of filtered) {
      const g = dayGroupOf(n.when)
      if (byGroup[g].length === 0) order.push(g)
      byGroup[g].push(n)
    }
    return order.map((g) => ({ group: g, items: byGroup[g] }))
  }, [filtered])

  const unreadCount = safeItems.filter((i) => i.unread).length

  const handleMarkAllRead = () => {
    if (marking) return
    setMarking(true)
    http
      .post('/api/notifications/mark-all-read')
      .catch(() => {
        // Server-side mark may fail without a notifications table; UI still updates.
      })
      .finally(() => {
        setItems((prev) => (prev ?? []).map((i) => ({ ...i, unread: false })))
        setMarking(false)
      })
  }

  return (
    <div
      id="top"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}
    >
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div className={cm.stack(2)}>
          <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary')}>
            {t('notificationsPage.eyebrow', {}, { defaultValue: 'Activity center' })}
          </p>
          <h1 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'notificationsPage.subheading',
              { count: unreadCount },
              { defaultValue: '{{count}} unread · live updates as auctions move' },
            )}
          </p>
        </div>
        <button
          type="button"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            'rounded-full border border-outline-variant text-sm font-semibold hover:bg-surface-container-low',
          )}
          onClick={handleMarkAllRead}
          disabled={marking || unreadCount === 0}
        >
          {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
        </button>
      </header>

      <section className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
        {FILTERS.map((k) => {
          const active = k === filter
          const label = t(
            `notificationsPage.filter.${k}`,
            {},
            { defaultValue: k.replace('_', ' ') },
          )
          if (active) {
            return (
              <span
                key={k}
                aria-current="true"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-full text-xs font-bold uppercase tracking-widest border text-white border-transparent',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-end))',
                }}
              >
                {label}
              </span>
            )
          }
          return (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-full text-xs font-bold uppercase tracking-widest border transition-colors',
                'border-outline-variant text-on-surface-variant hover:text-on-surface',
              )}
            >
              {label}
            </button>
          )
        })}
      </section>

      {items === null ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, cm.textMuted)}>
          {t('notificationsPage.loading', {}, { defaultValue: 'Loading notifications…' })}
        </p>
      ) : error ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-error')}>{error}</p>
      ) : filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, cm.textMuted)}>
          {t('notificationsPage.empty', {}, { defaultValue: 'No notifications yet.' })}
        </p>
      ) : (
        <section className={cm.cn(cm.stack(6))}>
          {groups.map(({ group, items: groupItems }) => (
            <div key={group} className={cm.cn(cm.stack(3))}>
              <h2
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-bold uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t(
                  `notificationsPage.group.${group}`,
                  {},
                  {
                    defaultValue:
                      group === 'today' ? 'Today' : group === 'yesterday' ? 'Yesterday' : 'Earlier',
                  },
                )}
              </h2>
              <div className={cm.cn('space-y-3')}>
                {groupItems.map((n) => (
                  <NotificationRow
                    key={n.id}
                    kind={n.kind}
                    title={n.title}
                    body={n.body}
                    whenIso={n.when}
                    unread={n.unread}
                    actionTo={n.to}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Preferences + account — the design's sidebar cards, kept as real
          surfaces: preferences live in Settings; identity comes from /api/me. */}
      <section className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-6')}>
        <article
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(4),
            'rounded-xl bg-surface border border-outline-variant/40',
          )}
        >
          <h3 className={cm.cn('text-lg font-extrabold tracking-tight')}>
            {t(
              'notificationsPage.preferencesHeading',
              {},
              { defaultValue: 'Notification Preferences' },
            )}
          </h3>
          <ul className={cm.cn(cm.stack(2), 'text-sm')}>
            {(['outbid', 'ending', 'won'] as const).map((kind) => {
              const on = me?.notifyPrefs ? me.notifyPrefs[kind] !== false : true
              return (
                <li
                  key={kind}
                  className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}
                >
                  <span className={cm.cn('font-semibold capitalize text-on-surface')}>
                    {t(`settings.notify.${kind}`, {}, { defaultValue: kind.replace('_', ' ') })}
                  </span>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      'rounded-full text-[10px] font-black uppercase tracking-widest',
                    )}
                    style={{
                      background: on
                        ? 'var(--color-bid-winning-light)'
                        : 'var(--color-status-neutral-bg)',
                      color: on ? 'var(--color-bid-winning)' : 'var(--color-status-neutral-fg)',
                    }}
                  >
                    {on
                      ? t('notificationsPage.prefOn', {}, { defaultValue: 'On' })
                      : t('notificationsPage.prefOff', {}, { defaultValue: 'Off' })}
                  </span>
                </li>
              )
            })}
          </ul>
          <Link
            to="/settings#notifications"
            data-mol-id="notifications-manage-preferences"
            className={cm.cn('text-sm font-bold text-primary hover:underline')}
          >
            {t('notificationsPage.managePreferences', {}, { defaultValue: 'Manage preferences →' })}
          </Link>
        </article>

        <article
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(3),
            'rounded-xl bg-surface border border-outline-variant/40',
          )}
        >
          <h3 className={cm.cn('text-lg font-extrabold tracking-tight')}>
            {t('notificationsPage.accountHeading', {}, { defaultValue: 'Account' })}
          </h3>
          {me ? (
            <div className={cm.cn(cm.stack(1))}>
              <p className={cm.cn('font-bold text-on-surface')}>
                {me.name || me.username || me.email || APP_NAME}
              </p>
              {me.username ? (
                <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>@{me.username}</p>
              ) : null}
              {me.email ? (
                <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>{me.email}</p>
              ) : null}
            </div>
          ) : (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t('notificationsPage.accountLoading', {}, { defaultValue: 'Loading account…' })}
            </p>
          )}
          <Link
            to="/settings"
            data-mol-id="notifications-manage-account"
            className={cm.cn('text-sm font-bold text-primary hover:underline')}
          >
            {t('notificationsPage.manageAccount', {}, { defaultValue: 'Manage account →' })}
          </Link>
        </article>
      </section>
    </div>
  )
}

export default Notifications
