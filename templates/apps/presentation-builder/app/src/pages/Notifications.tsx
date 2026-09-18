import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ActivityFeedItem } from '../components/ActivityFeedItem.js'
import { PresentationBuilderLayout } from '../components/PresentationBuilderLayout.js'

interface Presentation {
  id: string
  title: string
  description: string | null
  is_public: boolean
  slide_count: number
  created_at: string
  updated_at: string
}

const FILTERS = ['all', 'unread', 'edits', 'shares'] as const
type FilterKey = (typeof FILTERS)[number]

const ACCENTS = ['#7c3aed', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#dc2626']
const accentForId = (id: string): string => {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return ACCENTS[h % ACCENTS.length]!
}

const formatRelative = (iso: string): string => {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - then)
  const min = 60 * 1000
  const hr = 60 * min
  const day = 24 * hr
  if (diff < min) return 'Just now'
  if (diff < hr) return `${Math.floor(diff / min)} min ago`
  if (diff < day) return `${Math.floor(diff / hr)} hr ago`
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

interface ActivityRow {
  id: string
  kind: 'edit' | 'share' | 'create'
  actorName: string
  actorColor: string
  sentence: string
  target: string
  targetHref: string
  timeLabel: string
  unread: boolean
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [decks, setDecks] = useState<Presentation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const raw = window.localStorage.getItem('overture:notif:read')
      if (!raw) return new Set()
      return new Set(JSON.parse(raw) as string[])
    } catch (_error) {
      // corrupt localStorage value — fall back to empty set
      return new Set()
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('overture:notif:read', JSON.stringify(Array.from(readIds)))
  }, [readIds])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<Presentation[]>('/presentations')
      .then((res) => {
        if (cancelled) return
        setDecks(res.data)
      })
      .catch(() => {
        if (cancelled) return
        setDecks([])
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const activity: ActivityRow[] = useMemo(() => {
    const meName = t('nav.you', {}, { defaultValue: 'You' })!
    const untitled = t('decks.untitled', {}, { defaultValue: 'Untitled deck' })!
    return decks.flatMap((d): ActivityRow[] => {
      const id = d.id
      const isCreate = new Date(d.created_at).getTime() === new Date(d.updated_at).getTime()
      const rows: ActivityRow[] = [
        {
          id: `${id}-${isCreate ? 'create' : 'edit'}`,
          kind: isCreate ? 'create' : 'edit',
          actorName: meName,
          actorColor: accentForId(id),
          sentence: isCreate
            ? t('notifications.created', {}, { defaultValue: 'created' })!
            : t('notifications.edited', {}, { defaultValue: 'edited' })!,
          target: d.title || untitled,
          targetHref: `/decks/${d.id}/edit`,
          timeLabel: formatRelative(d.updated_at),
          unread: !readIds.has(`${id}-${isCreate ? 'create' : 'edit'}`),
        },
      ]
      if (d.is_public) {
        rows.push({
          id: `${id}-share`,
          kind: 'share',
          actorName: meName,
          actorColor: accentForId(id),
          sentence: t('notifications.shared', {}, { defaultValue: 'shared publicly' })!,
          target: d.title || untitled,
          targetHref: `/decks/${d.id}/edit`,
          timeLabel: formatRelative(d.updated_at),
          unread: !readIds.has(`${id}-share`),
        })
      }
      return rows
    })
  }, [decks, t, readIds])

  const visible = useMemo(() => {
    switch (filter) {
      case 'unread':
        return activity.filter((a) => a.unread)
      case 'edits':
        return activity.filter((a) => a.kind === 'edit' || a.kind === 'create')
      case 'shares':
        return activity.filter((a) => a.kind === 'share')
      default:
        return activity
    }
  }, [activity, filter])

  const unreadCount = activity.filter((a) => a.unread).length

  const markAllRead = () => {
    const ids = activity.map((a) => a.id)
    setReadIds(new Set(ids))
  }

  return (
    <PresentationBuilderLayout
      eyebrow={t('notifications.eyebrow', {}, { defaultValue: 'Stage activity' })!}
      title={t('settings.notifications', {}, { defaultValue: 'Notifications' })!}
      actions={
        <button
          type="button"
          data-testid="notif-mark-all-read"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'bg-surface-container text-on-surface rounded-xl shadow-sm hover:bg-surface-container-high disabled:opacity-50',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[16px]')}>done_all</span>
          {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })} ({unreadCount})
        </button>
      }
    >
      <div className={cm.cn(cm.stack(6))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              data-testid={`notif-filter-${f}`}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest transition-colors',
                filter === f
                  ? 'bg-primary text-on-primary shadow-md shadow-primary/30'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
              )}
            >
              {t(`notifications.filter.${f}`, {}, { defaultValue: f })}
            </button>
          ))}
        </div>
        {loading ? (
          <div
            data-testid="notif-loading"
            className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant text-center')}
          >
            {t('notifications.loading', {}, { defaultValue: 'Loading…' })}
          </div>
        ) : visible.length === 0 ? (
          <div
            data-testid="notif-empty"
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center' }),
              cm.sp('p', 12),
              cm.stack(2),
              'bg-surface-container-low rounded-2xl text-center',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[32px] text-on-surface-variant')}
            >
              notifications_none
            </span>
            <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
              {t('notifications.empty.title', {}, { defaultValue: 'No notifications yet' })}
            </span>
            <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-md')}>
              {t(
                'notifications.empty.body',
                {},
                {
                  defaultValue:
                    'Activity on your decks — comments, mentions, exports — will surface here.',
                },
              )}
            </span>
          </div>
        ) : (
          <div className={cm.cn(cm.stack(2))}>
            {visible.map((item) => (
              <button
                key={item.id}
                type="button"
                data-testid={`notif-${item.id}`}
                onClick={() => setReadIds((s) => new Set([...s, item.id]))}
                className="text-left"
              >
                <ActivityFeedItem item={item} />
              </button>
            ))}
          </div>
        )}
      </div>
    </PresentationBuilderLayout>
  )
}

export default Notifications
