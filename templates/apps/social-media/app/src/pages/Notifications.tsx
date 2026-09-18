import { useCallback } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useNotifications } from '../lib/api.js'
import { fmtRelativeShort, type SampleNotification, vividGradient } from '../lib/sample-feed.js'

const KIND_META: Record<string, { icon: string; tone: string }> = {
  like: { icon: 'favorite', tone: 'text-error' },
  comment: { icon: 'chat_bubble', tone: 'text-blue-500' },
  follow: { icon: 'person_add', tone: 'text-success' },
  mention: { icon: 'alternate_email', tone: 'text-violet-500' },
  live: { icon: 'sensors', tone: 'text-error' },
  tag: { icon: 'sell', tone: 'text-warning' },
}

function isWithinDays(iso: string, days: number, now: number = Date.now()): boolean {
  return now - new Date(iso).getTime() <= days * 86_400_000
}

function kindToSentence(kind: string, t: ReturnType<typeof useTranslation>['t']): string {
  switch (kind) {
    case 'like':
      return t('notifications.kind.like', {}, { defaultValue: 'liked your post' })
    case 'comment':
      return t('notifications.kind.comment', {}, { defaultValue: 'commented on your post' })
    case 'follow':
      return t('notifications.kind.follow', {}, { defaultValue: 'started following you' })
    case 'mention':
      return t('notifications.kind.mention', {}, { defaultValue: 'mentioned you in a post' })
    case 'live':
      return t('notifications.kind.live', {}, { defaultValue: 'is live now' })
    case 'tag':
      return t('notifications.kind.tag', {}, { defaultValue: 'tagged you in a post' })
    default:
      return kind
  }
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { data: items, loading, error, refetch } = useNotifications()

  const markAllRead = useCallback(async () => {
    try {
      await http.post('/notifications/mark-all-read')
      await refetch()
    } catch (err) {
      logError('notifications.markAllRead', err)
    }
  }, [http, refetch])

  const list = items ?? []
  const unreadCount = list.filter((n) => n.unread).length
  const today = list.filter((n) => isWithinDays(n.posted_at, 1))
  const week = list.filter((n) => !isWithinDays(n.posted_at, 1) && isWithinDays(n.posted_at, 7))
  const older = list.filter((n) => !isWithinDays(n.posted_at, 7))

  return (
    <div className={cm.cn(cm.sp('p', 6), cm.sp('py', 8), 'lg:px-10 mx-auto w-full max-w-3xl')}>
      <header
        className={cm.cn(cm.sp('mb', 6), cm.flex({ align: 'center', justify: 'between' }), 'gap-4')}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('nav.activity', {}, { defaultValue: 'Activity' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight md:text-4xl mt-1')}
          >
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}
            data-testid="notifications-unread"
          >
            {loading
              ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
              : t(
                  'notifications.subheading',
                  { count: unreadCount },
                  { defaultValue: '{{count}} unread.' },
                )}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            data-testid="mark-all-read"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-full text-sm font-bold border border-outline-variant hover:bg-surface-container-low transition-colors',
            )}
          >
            {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
          </button>
        )}
      </header>

      {error && (
        <div
          className={cm.cn(
            'rounded-2xl border border-red-300 bg-error-light text-error px-4 py-3 mb-4 text-sm',
          )}
        >
          {error.message}
        </div>
      )}

      {!loading && list.length === 0 && (
        <div
          className={cm.cn(
            'rounded-2xl border border-dashed border-outline-variant px-6 py-12 text-center',
          )}
          data-testid="notifications-empty"
        >
          <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('lg'))}>
            {t('notifications.emptyTitle', {}, { defaultValue: "You're all caught up." })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-2')}>
            {t(
              'notifications.emptyBody',
              {},
              { defaultValue: 'New activity from people you follow will show up here.' },
            )}
          </p>
        </div>
      )}

      <Group label={t('status.today', {}, { defaultValue: 'Today' })} items={today} />
      <Group label={t('status.thisWeek', {}, { defaultValue: 'This week' })} items={week} />
      <Group label={t('notifications.earlier', {}, { defaultValue: 'Earlier' })} items={older} />
    </div>
  )
}

function Group({ label, items }: { label: string; items: SampleNotification[] }) {
  const cm = getClassMap()
  if (items.length === 0) return null
  return (
    <section className={cm.cn(cm.sp('mb', 8))}>
      <h2
        className={cm.cn(
          cm.textSize('xs'),
          'font-black',
          cm.sp('mb', 3),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </h2>
      <ul
        className={cm.cn(
          'bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-sm divide-y divide-outline-variant/40 overflow-hidden',
        )}
      >
        {items.map((n) => (
          <Row key={n.id} n={n} />
        ))}
      </ul>
    </section>
  )
}

function Row({ n }: { n: SampleNotification }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const meta = KIND_META[n.kind] ?? KIND_META.like
  const actor = n.actor ?? {
    id: '',
    display_name: '?',
    handle: '',
    cover_index: 0,
    is_verified: false,
    bio: '',
  }

  const linkTarget = n.post_id ? `/posts/${n.post_id}` : `/profile/${actor.handle}`

  return (
    <li
      className={cm.cn(
        cm.sp('px', 5),
        cm.sp('py', 4),
        cm.flex({ align: 'center', gap: 'sm' }),
        n.unread ? 'bg-primary/5' : '',
      )}
    >
      <span className={cm.cn('relative shrink-0')}>
        <span
          className={cm.cn(
            'inline-flex w-12 h-12 rounded-full items-center justify-center text-white font-extrabold shadow-sm',
          )}
          style={{ background: vividGradient(actor.cover_index) }}
          aria-hidden="true"
        >
          {actor.display_name.charAt(0)}
        </span>
        <span
          className={cm.cn(
            'absolute -bottom-1 -right-1 inline-flex w-6 h-6 rounded-full bg-surface-container-lowest items-center justify-center',
            meta.tone,
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-[14px]')}
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            {meta.icon}
          </span>
        </span>
      </span>

      <div className={cm.cn('flex-1 min-w-0')}>
        <p className={cm.cn(cm.textSize('sm'), 'leading-snug')}>
          <Link
            to={`/profile/${actor.handle}`}
            className={cm.cn(cm.fontWeight('bold'), 'hover:text-primary transition-colors')}
          >
            {actor.display_name}
          </Link>
          <span className={cm.cn('text-on-surface-variant ml-1')}>{kindToSentence(n.kind, t)}</span>
        </p>
        {n.excerpt && (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 1),
              'text-on-surface-variant italic line-clamp-1',
            )}
          >
            "{n.excerpt}"
          </p>
        )}
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mt', 1),
            'text-on-surface-variant uppercase tracking-widest tabular-nums',
          )}
        >
          {fmtRelativeShort(n.posted_at)}
        </p>
      </div>

      {n.post_id && (
        <Link
          to={linkTarget}
          className={cm.cn(
            'relative shrink-0 inline-flex w-11 h-11 rounded-md overflow-hidden hover:ring-2 hover:ring-primary transition-shadow',
          )}
          style={{ background: vividGradient(n.post_cover_index ?? 0) }}
        >
          <span
            className={cm.cn('absolute inset-0 flex items-center justify-center text-white/60')}
          >
            <span className={cm.cn('material-symbols-outlined text-[20px]')}>photo</span>
          </span>
        </Link>
      )}
    </li>
  )
}
