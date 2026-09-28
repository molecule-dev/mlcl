/**
 * Feed — /feed primary announcement list.
 *
 * Layout: hero strip (greeting + filter chips) → single-column list of
 * AnnouncementCard rows. Channel chips + filter pills filter the
 * visible cards. Reads live data from /api/announcements,
 * /api/categories, /api/users — no sample data; on a fresh signup the
 * feed empty-state explains how to publish the first announcement.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AnnouncementCard } from '../components/AnnouncementCard.js'
import {
  type ApiAcknowledgment,
  type ApiAnnouncement,
  type ApiCategory,
  type ApiComment,
  type ApiUser,
  buildCardData,
  categoryColor,
  categorySlug,
} from '../lib/announcements.js'

const FILTERS: Array<{
  id: 'all' | 'urgent' | 'pinned' | 'unacked' | 'mine'
  labelKey: string
  defaultLabel: string
}> = [
  { id: 'all', labelKey: 'feed.filterAll', defaultLabel: 'All' },
  { id: 'urgent', labelKey: 'feed.filterUrgent', defaultLabel: 'Urgent' },
  { id: 'pinned', labelKey: 'feed.filterPinned', defaultLabel: 'Pinned' },
  { id: 'unacked', labelKey: 'feed.filterUnacked', defaultLabel: 'Needs ack' },
  { id: 'mine', labelKey: 'feed.filterMine', defaultLabel: 'My posts' },
]

export function Feed() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<ApiUser>()
  const [searchParams, setSearchParams] = useSearchParams()

  const [announcements, setAnnouncements] = useState<ApiAnnouncement[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [users, setUsers] = useState<ApiUser[]>([])
  const [acks, setAcks] = useState<ApiAcknowledgment[]>([])
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')
  const [sortNewest, setSortNewest] = useState(true)
  const channelParam = searchParams.get('channel')
  const authorParam = searchParams.get('author')

  const clearAuthor = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.delete('author')
    setSearchParams(next, { replace: false })
  }, [searchParams, setSearchParams])

  const setChannel = useCallback(
    (slug: string | null) => {
      const next = new URLSearchParams(searchParams)
      if (slug) next.set('channel', slug)
      else next.delete('channel')
      setSearchParams(next, { replace: false })
    },
    [searchParams, setSearchParams],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get<ApiAnnouncement[]>('/announcements'),
      http.get<ApiCategory[]>('/categories'),
      http.get<ApiUser[]>('/team'),
      http.get<ApiAcknowledgment[]>('/announcements/me/acknowledgments'),
    ])
      .then(async ([annsRes, catsRes, usersRes, acksRes]) => {
        if (cancelled) return
        setAnnouncements(annsRes.data)
        setCategories(catsRes.data)
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : [])
        setAcks(acksRes.data)
        // Fetch comment counts in parallel — best effort, do not block the feed.
        const counts: Record<string, number> = {}
        await Promise.all(
          annsRes.data.map(async (a) => {
            try {
              const r = await http.get<ApiComment[]>(`/comments/${a.id}`)
              counts[a.id] = r.data.length
            } catch (_error) {
              // best-effort — comment count fetch fails gracefully; defaults to 0
              counts[a.id] = 0
            }
          }),
        )
        if (!cancelled) setCommentCounts(counts)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const usersIndex = useMemo(
    () => ({ byId: Object.fromEntries(users.map((u) => [u.id, u])) }),
    [users],
  )

  const ackedSet = useMemo(() => new Set(acks.map((a) => a.announcement_id)), [acks])

  const cards = useMemo(() => {
    const myId = (user as ApiUser | null)?.id ?? null
    return announcements
      .filter((a) => a.status === 'published')
      .map((a) => {
        const ackTotal = a.requires_acknowledgment ? Math.max(users.length, 1) : 0
        const card = buildCardData(a, {
          categories,
          users: usersIndex,
          ackCount: ackedSet.has(a.id) ? 1 : 0,
          ackTotal,
          hasAcknowledged: ackedSet.has(a.id),
          commentCount: commentCounts[a.id] ?? 0,
          viewCount: undefined,
          unread: !ackedSet.has(a.id) && a.requires_acknowledgment,
        })
        return { card, ann: a, isMine: myId != null && a.author_id === myId }
      })
  }, [announcements, categories, usersIndex, ackedSet, commentCounts, users.length, user])

  const visible = useMemo(() => {
    let items = cards
    if (channelParam) {
      const cat = categories.find((c) => categorySlug(c) === channelParam)
      if (cat) items = items.filter((c) => c.ann.category_id === cat.id)
    }
    // Honor ?author= deep links from the team directory (/people).
    if (authorParam) items = items.filter((c) => c.ann.author_id === authorParam)
    if (filter === 'urgent') items = items.filter((c) => c.card.priority === 'urgent')
    if (filter === 'pinned') items = items.filter((c) => c.card.priority === 'pinned')
    if (filter === 'unacked')
      items = items.filter((c) => c.card.ackTotal > 0 && !c.card.hasAcknowledged)
    if (filter === 'mine') items = items.filter((c) => c.isMine)
    const stamp = (a: ApiAnnouncement) => new Date(a.published_at ?? a.created_at).getTime() || 0
    return [...items].sort((x, y) =>
      sortNewest ? stamp(y.ann) - stamp(x.ann) : stamp(x.ann) - stamp(y.ann),
    )
  }, [cards, categories, channelParam, authorParam, filter, sortNewest])

  const authorFilterName = useMemo(() => {
    if (!authorParam) return null
    const author = usersIndex.byId[authorParam]
    return author?.name?.trim() || author?.email?.split('@')[0] || null
  }, [authorParam, usersIndex])

  const totalUnacked = cards.filter((c) => c.card.ackTotal > 0 && !c.card.hasAcknowledged).length

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md' }),
          cm.sp('pb', 4),
          'flex-wrap justify-between border-b border-outline-variant/40',
        )}
      >
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'min-w-0')}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('px', 2),
                'py-0.5',
                'rounded-full text-[10px] uppercase tracking-widest text-primary bg-primary/10',
              )}
            >
              {t('feed.eyebrow', {}, { defaultValue: 'Internal · Announcements' })}
            </span>
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {loading
                ? t('feed.loading', {}, { defaultValue: 'Refreshing…' })
                : t(
                    'feed.totalCount',
                    { count: cards.length },
                    { defaultValue: '{{count}} published' },
                  )}
            </span>
          </div>
          <h1 className={cm.cn(cm.fontWeight('bold'), 'text-2xl tracking-tight text-on-surface')}>
            {t('feed.title', {}, { defaultValue: 'Announcements that need to land' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-2xl')}>
            {t(
              'feed.subtitle',
              { unacked: totalUnacked },
              {
                defaultValue:
                  '{{unacked}} still need your acknowledgment. Acknowledge as you read so leadership sees signal, not noise.',
              },
            )}
          </p>
        </div>
        <Link
          to="/compose"
          data-testid="feed-compose-cta"
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            'rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors shrink-0',
          )}
        >
          <span className="material-symbols-outlined text-base">add</span>
          {t('feed.compose', {}, { defaultValue: 'New announcement' })}
        </Link>
      </header>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border border-error/40 bg-error-container/40 text-on-error-container',
          )}
        >
          {t(
            'feed.loadError',
            { message: error },
            { defaultValue: 'Could not load announcements: {{message}}' },
          )}
        </div>
      )}

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap justify-between')}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
          {FILTERS.map((f) => {
            const isActive = filter === f.id
            return (
              <button
                key={f.id}
                type="button"
                data-testid={`feed-filter-${f.id}`}
                onClick={() => setFilter(f.id)}
                className={cm.cn(
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  'py-1.5',
                  'rounded-full transition-colors shrink-0',
                  isActive
                    ? 'bg-on-surface text-surface'
                    : 'border border-outline-variant/40 bg-surface text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/60',
                )}
              >
                {f.id === 'urgent' && (
                  <span
                    aria-hidden="true"
                    className={cm.cn(cm.w(1.5), cm.h(1.5), cm.roundedFull, 'bg-error shrink-0')}
                  />
                )}
                {f.id === 'pinned' && (
                  <span
                    aria-hidden="true"
                    className={cm.cn('material-symbols-outlined text-[14px] text-warning shrink-0')}
                  >
                    push_pin
                  </span>
                )}
                {t(f.labelKey, {}, { defaultValue: f.defaultLabel })}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          data-testid="feed-sort-toggle"
          onClick={() => setSortNewest((v) => !v)}
          className={cm.cn(
            cm.fontWeight('medium'),
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            'text-on-surface-variant hover:text-on-surface transition-colors shrink-0',
          )}
        >
          {sortNewest
            ? t('feed.sortNewest', {}, { defaultValue: 'Newest first' })
            : t('feed.sortOldest', {}, { defaultValue: 'Oldest first' })}
          <span
            aria-hidden="true"
            className={cm.cn(
              'material-symbols-outlined text-[16px] transition-transform',
              sortNewest ? '' : 'rotate-180',
            )}
          >
            expand_more
          </span>
        </button>
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
        <button
          type="button"
          data-testid="feed-channel-all"
          onClick={() => setChannel(null)}
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            cm.sp('px', 3),
            'py-1',
            'rounded-full transition-colors',
            channelParam === null
              ? 'bg-on-surface text-surface'
              : 'border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/60',
          )}
        >
          {t('feed.allChannels', {}, { defaultValue: 'All channels' })}
        </button>
        {categories.map((c) => {
          const slug = categorySlug(c)
          const color = categoryColor(c)
          const isActive = channelParam === slug
          return (
            <button
              key={c.id}
              type="button"
              data-testid={`feed-channel-${slug}`}
              onClick={() => setChannel(slug)}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('xs'),
                cm.sp('px', 3),
                'py-1',
                'rounded-full transition-colors',
              )}
              style={
                isActive
                  ? { backgroundColor: color, color: 'var(--mol-color-text-inverse)' }
                  : { borderWidth: 1, borderColor: `${color}66`, color }
              }
            >
              <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                tag
              </span>
              {c.name}
            </button>
          )
        })}
      </div>

      {authorParam && (
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
          <span
            data-testid="feed-author-filter"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              cm.sp('px', 3),
              'py-1',
              'rounded-full bg-primary/10 text-primary',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
              person
            </span>
            {authorFilterName
              ? t(
                  'feed.authorFilter',
                  { name: authorFilterName },
                  { defaultValue: 'Posts by {{name}}' },
                )
              : t('feed.authorFilterUnknown', {}, { defaultValue: 'Posts by teammate' })}
            <button
              type="button"
              data-testid="feed-author-filter-clear"
              onClick={clearAuthor}
              aria-label={t('feed.authorFilterClear', {}, { defaultValue: 'Clear author filter' })}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'rounded-full hover:bg-primary/20 transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                close
              </span>
            </button>
          </span>
        </div>
      )}

      <section data-testid="feed-list" className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('feed.loading', {}, { defaultValue: 'Refreshing…' })}
          </p>
        ) : visible.length === 0 ? (
          <div
            data-testid="feed-empty"
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
              cm.sp('p', 10),
              'rounded-2xl border border-dashed border-outline-variant/40 text-on-surface-variant text-center',
            )}
          >
            <span className="material-symbols-outlined text-4xl text-primary">inbox</span>
            <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
              {cards.length === 0
                ? t('feed.emptyAllTitle', {}, { defaultValue: 'No announcements yet.' })
                : t('feed.emptyTitle', {}, { defaultValue: 'You are caught up.' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'))}>
              {cards.length === 0
                ? t(
                    'feed.emptyAllSubtitle',
                    {},
                    {
                      defaultValue:
                        'Click "New announcement" above to publish your first message — the feed will refresh as soon as you hit Publish.',
                    },
                  )
                : t(
                    'feed.emptySubtitle',
                    {},
                    {
                      defaultValue:
                        'Nothing matches this filter — try another channel or check back later.',
                    },
                  )}
            </p>
          </div>
        ) : (
          visible.map(({ card }) => <AnnouncementCard key={card.id} announcement={card} />)
        )}
      </section>
    </div>
  )
}

export default Feed
