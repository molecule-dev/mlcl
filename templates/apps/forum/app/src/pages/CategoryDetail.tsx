/**
 * CategoryDetail — /c/:slug per-community feed.
 *
 * Layout: hero strip (banner + about) → filter pills → feed column +
 * CommunitySidebar.
 *
 * Loads category by slug from `GET /api/categories/by-slug/:slug` and
 * threads from `GET /api/threads?category=<id>&sort=...`.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CommunitySidebar } from '../components/CommunitySidebar.js'
import { ThreadRow } from '../components/ThreadRow.js'
import { type ApiThread, decorateApiThreadToRow } from '../utils/threads.js'

const FILTERS = [
  { id: 'hot', labelKey: 'categoryDetail.filterHot', defaultLabel: 'Hot', sort: 'active' as const },
  { id: 'new', labelKey: 'categoryDetail.filterNew', defaultLabel: 'New', sort: 'latest' as const },
  { id: 'top', labelKey: 'categoryDetail.filterTop', defaultLabel: 'Top', sort: 'top' as const },
  {
    id: 'pinned',
    labelKey: 'categoryDetail.filterPinned',
    defaultLabel: 'Pinned',
    sort: 'latest' as const,
  },
] as const

type FilterId = (typeof FILTERS)[number]['id']

interface ApiCategory {
  id: string
  slug: string
  name: string
  description?: string | null
  color?: string | null
  icon?: string | null
  thread_count?: number | null
  subscriber_count?: number | null
}

export function CategoryDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { slug } = useParams<{ slug: string }>()
  const [active, setActive] = useState<FilterId>('hot')
  const [category, setCategory] = useState<ApiCategory | null>(null)
  const [apiThreads, setApiThreads] = useState<ApiThread[]>([])
  const [loading, setLoading] = useState(true)
  const [voteState, setVoteState] = useState<Record<string, 'up' | 'down' | null>>({})

  const [subscribed, setSubscribed] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    if (!slug) return
    let mounted = true
    void (async () => {
      setLoading(true)
      try {
        const http = getHttpClient()
        const cat = await http.get<ApiCategory>(`/api/categories/by-slug/${slug}`)
        if (!mounted) return
        const c = cat.data ?? null
        setCategory(c)
        if (c?.id) {
          // Probe subscription status; ignore 401 (anon visitors).
          try {
            const check = await http.get<{ bookmarked?: boolean }>(
              `/api/bookmarks/check/category/${c.id}`,
            )
            if (mounted) setSubscribed(Boolean(check.data?.bookmarked))
          } catch (_error) {
            // 401 expected for anonymous visitors; subscription state defaults to false
            if (mounted) setSubscribed(false)
          }
        }
      } catch (error) {
        logError('categoryDetail.load', error)
        if (mounted) setCategory(null)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [slug])

  /**
   * Subscribe / unsubscribe from a community by toggling a bookmark
   * row with resourceType="category". Optimistic update with rollback
   * on failure.
   */
  const toggleSubscribe = useCallback(async () => {
    if (!category?.id || subscribing) return
    setSubscribing(true)
    const next = !subscribed
    setSubscribed(next)
    try {
      const http = getHttpClient()
      if (next) {
        await http.post('/api/bookmarks', {
          resourceType: 'category',
          resourceId: category.id,
        })
      } else {
        await http.delete(`/api/bookmarks/category/${category.id}`)
      }
    } catch (error) {
      logError('categoryDetail.toggleSubscribe', error)
      setSubscribed(!next)
    } finally {
      setSubscribing(false)
    }
  }, [category?.id, subscribed, subscribing])

  const loadThreads = useCallback(async (categoryId: string, filter: FilterId) => {
    const filterDef = FILTERS.find((f) => f.id === filter)
    try {
      const http = getHttpClient()
      const res = await http.get<{ data: ApiThread[] }>(
        `/api/threads?category=${categoryId}&sort=${filterDef?.sort ?? 'latest'}&limit=25`,
      )
      const items = res.data.data ?? []
      if (filter === 'pinned') {
        setApiThreads(items.filter((th) => th.is_pinned))
      } else {
        setApiThreads(items)
      }
    } catch (error) {
      logError('categoryDetail.loadThreads', error)
      setApiThreads([])
    }
  }, [])

  useEffect(() => {
    if (!category) return
    void loadThreads(category.id, active)
  }, [category, active, loadThreads])

  const handleVote = useCallback(
    async (threadId: string, next: 'up' | 'down' | null) => {
      const prev = voteState[threadId] ?? null
      if (prev === next) return
      setVoteState((s) => ({ ...s, [threadId]: next }))
      setApiThreads((list) =>
        list.map((th) => {
          if (th.id !== threadId) return th
          let delta = 0
          if (prev === 'up') delta -= 1
          if (prev === 'down') delta += 1
          if (next === 'up') delta += 1
          if (next === 'down') delta -= 1
          return { ...th, vote_score: (th.vote_score ?? 0) + delta }
        }),
      )
      try {
        const http = getHttpClient()
        await http.post('/api/votes', {
          target_type: 'thread',
          target_id: threadId,
          direction: next,
        })
      } catch (error) {
        logError('categoryDetail.handleVote', error)
        setVoteState((s) => ({ ...s, [threadId]: prev }))
      }
    },
    [voteState],
  )

  const rows = useMemo(
    () => apiThreads.map((th) => decorateApiThreadToRow(th, voteState[th.id] ?? null)),
    [apiThreads, voteState],
  )

  const accent = category?.color ?? 'var(--color-pinned, var(--mol-color-primary))'
  const safeSlug = category?.slug ?? slug ?? ''

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <div
        className={cm.cn('rounded-2xl overflow-hidden border border-outline-variant/40 bg-surface')}
      >
        <div
          className={cm.cn(
            'h-28 relative overflow-hidden bg-gradient-to-br from-primary to-primary-container',
          )}
          aria-hidden="true"
        >
          <div
            className={cm.cn(
              cm.w(60),
              cm.h(60),
              cm.roundedFull,
              'absolute -right-10 -top-10 bg-surface/10 blur-3xl',
            )}
          />
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('px', 6),
            cm.sp('pb', 5),
            '-mt-6 flex-wrap',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(16),
                cm.h(16),
                cm.roundedFull,
                cm.fontWeight('bold'),
                'shrink-0 text-3xl border-4 border-surface bg-surface-container-low',
              )}
              style={{ color: accent }}
              aria-hidden="true"
            >
              {category?.icon ?? '🏷️'}
            </span>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('mt', 8))}>
              <h1
                className={cm.cn(cm.fontWeight('bold'), 'text-2xl tracking-tight text-on-surface')}
              >
                {t('categoryDetail.namePrefix', {}, { defaultValue: 'c/' })}
                {safeSlug}
              </h1>
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {category?.description ??
                  t(
                    'categoryDetail.tagline',
                    {},
                    { defaultValue: 'A space to share, ask, and discuss.' },
                  )}
              </span>
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <button
              type="button"
              disabled={!category?.id || subscribing}
              onClick={() => {
                void toggleSubscribe()
              }}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.sp('px', 5),
                cm.sp('py', 2),
                'rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
                subscribed
                  ? 'bg-primary text-on-primary hover:bg-primary-active'
                  : 'border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/60',
              )}
            >
              {subscribed
                ? t('categoryDetail.subscribed', {}, { defaultValue: 'Subscribed' })
                : t('categoryDetail.subscribe', {}, { defaultValue: 'Subscribe' })}
            </button>
            <Link
              to="/compose"
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 5),
                cm.sp('py', 2),
                'rounded-full bg-primary text-on-primary hover:bg-primary-active',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>edit</span>
              {t('categoryDetail.newPost', {}, { defaultValue: 'New post' })}
            </Link>
          </div>
        </div>
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
        {FILTERS.map((filter) => {
          const isActive = filter.id === active
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActive(filter.id)}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-full transition-colors',
                isActive
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/60',
              )}
            >
              {t(filter.labelKey, {}, { defaultValue: filter.defaultLabel })}
            </button>
          )
        })}
      </div>

      <div className={cm.cn('grid gap-6 grid-cols-1 lg:grid-cols-[1fr_300px]')}>
        <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'min-w-0')}>
          {loading && (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          )}
          {!loading && rows.length === 0 && (
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm', align: 'center' }),
                cm.sp('p', 8),
                'rounded-lg border border-dashed border-outline-variant/60 text-on-surface-variant text-center',
              )}
            >
              <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                {t('categoryDetail.empty', {}, { defaultValue: 'No threads here yet.' })}
              </p>
              <Link
                to="/compose"
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'text-primary hover:underline',
                )}
              >
                {t('categoryDetail.startFirst', {}, { defaultValue: 'Start the first thread →' })}
              </Link>
            </div>
          )}
          {rows.map((th) => (
            <ThreadRow key={th.id} thread={th} onVote={handleVote} />
          ))}
        </section>
        <CommunitySidebar
          name={safeSlug}
          accentColor={accent}
          description={category?.description ?? ''}
          subscribers={category?.subscriber_count ?? 0}
          activeNow={undefined}
          rules={[
            {
              id: 'r1',
              title: t(
                'categoryDetail.ruleBeKind',
                {},
                { defaultValue: 'Be kind. Discuss the work, not the person.' },
              ),
            },
            {
              id: 'r2',
              title: t(
                'categoryDetail.ruleStayOnTopic',
                {},
                { defaultValue: 'Stay on topic for this community.' },
              ),
            },
            {
              id: 'r3',
              title: t(
                'categoryDetail.ruleNoSpam',
                {},
                { defaultValue: 'No spam, no marketplace links.' },
              ),
            },
          ]}
          moderators={[]}
          trending={rows
            .slice(0, 3)
            .map((row) => ({ id: row.id, title: row.title, voteCount: row.score }))}
        />
      </div>
    </div>
  )
}

export default CategoryDetail
