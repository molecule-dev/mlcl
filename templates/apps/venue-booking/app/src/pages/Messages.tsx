import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Conversation {
  id: string
  venue_id: string
  venue_name: string
  venue_thumbnail_url?: string | null
  host_id: string
  host_name: string
  host_avatar_url?: string | null
  last_message: string
  last_message_at_iso: string
  unread_count: number
  tags?: string[]
}

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Past' },
] as const

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.round(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Messages() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/messages')
      .then((res) => {
        if (!cancelled) setConversations(unwrapList<Conversation>(res))
      })
      .catch(() => {
        /* noop */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const visible = useMemo(() => {
    if (filter === 'all') return conversations
    if (filter === 'unread') return conversations.filter((c) => c.unread_count > 0)
    return conversations.filter((c) => c.tags?.includes(filter))
  }, [conversations, filter])

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0)

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <div className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary',
          )}
        >
          {t('nav.inbox', {}, { defaultValue: 'Inbox' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('extrabold'),
            cm.sp('mt', 2),
            'leading-tight',
          )}
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '-0.02em' }}
        >
          {t('messages.heading', {}, { defaultValue: 'Conversations' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'messages.summary',
            { count: conversations.length, unread: totalUnread },
            { defaultValue: '{{count}} threads · {{unread}} unread' },
          )}
        </p>
      </div>

      <div className={cm.cn(cm.sp('mb', 5), cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest rounded-full transition-colors',
              filter === f.value
                ? 'bg-primary text-on-primary'
                : 'bg-surface border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary',
            )}
          >
            {t(`messages.filter.${f.value}`, {}, { defaultValue: f.label })}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cm.cn('h-20 rounded-2xl bg-surface-container animate-pulse')} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('py', 16),
            cm.textCenter,
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          )}
        >
          <span
            className="material-symbols-outlined text-6xl text-on-surface-variant"
            aria-hidden="true"
          >
            forum
          </span>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('messages.empty', {}, { defaultValue: 'No conversations to show.' })}
          </p>
        </div>
      ) : (
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {visible.map((c) => (
            <li key={c.id}>
              <Link
                to={`/messages/${c.id}`}
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({ align: 'center', gap: 'md' }),
                  'group block bg-surface rounded-2xl border border-outline-variant/40 hover:border-primary/40 hover:shadow-md transition-all',
                )}
              >
                {c.host_avatar_url ? (
                  <img
                    src={c.host_avatar_url}
                    alt={c.host_name}
                    className={'w-12 h-12 rounded-full object-cover flex-shrink-0'}
                  />
                ) : (
                  <div
                    className={
                      'w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold flex-shrink-0'
                    }
                  >
                    {c.host_name.charAt(0)}
                  </div>
                )}
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 min-w-0')}>
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <p className={cm.cn(cm.fontWeight('bold'), 'truncate')}>{c.host_name}</p>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>·</span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                      {c.venue_name}
                    </span>
                  </div>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      'text-on-surface-variant line-clamp-1',
                      c.unread_count > 0 && 'text-on-surface font-semibold',
                    )}
                  >
                    {c.last_message}
                  </p>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
                    'flex-shrink-0',
                  )}
                >
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {fmtRelative(c.last_message_at_iso)}
                  </span>
                  {c.unread_count > 0 ? (
                    <span
                      className={cm.cn(
                        'w-5 h-5 rounded-full bg-primary text-on-primary text-xs font-bold flex items-center justify-center',
                      )}
                    >
                      {c.unread_count}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
