import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CairnHeroCard } from '../components/CairnHeroCard.js'
import { type LinkPost, LinkPostCard } from '../components/LinkPostCard.js'
import { SubBadge, type SubSummary } from '../components/SubBadge.js'
import { pickInitialSort, type SortOption, SORTS } from '../lib/feed-sort.js'

const FALLBACK_TRENDING: SubSummary[] = [
  { slug: 'general', name: 'general', member_count: 1 },
  { slug: 'design', name: 'design', member_count: 1 },
  { slug: 'databases', name: 'databases', member_count: 1 },
]

function normalizeSubs(payload: unknown): SubSummary[] {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown[] })?.data)
      ? (payload as { data: unknown[] }).data
      : []
  return list.map((row) => {
    const r = row as Record<string, unknown>
    return {
      slug: String(r.slug ?? r.name ?? ''),
      name: String(r.name ?? r.slug ?? ''),
      description: typeof r.description === 'string' ? r.description : undefined,
      member_count: Number(r.member_count ?? 0),
      joined: Boolean(r.joined),
    }
  })
}

export function Feed() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [params, setParams] = useSearchParams()
  const tag = params.get('tag') || undefined

  const [posts, setPosts] = useState<LinkPost[]>([])
  const [sort, setSort] = useState<SortOption | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trendingSubs, setTrendingSubs] = useState<SubSummary[]>(FALLBACK_TRENDING)

  useEffect(() => {
    let active = true
    http
      .get('/api/subs?limit=5')
      .then((res: { data?: unknown }) => {
        if (!active) return
        const list = normalizeSubs(res?.data ?? res)
        if (list.length > 0) setTrendingSubs(list)
      })
      .catch(() => {
        // Sidebar is best-effort; fall back silently.
      })
    return () => {
      active = false
    }
  }, [http])

  // Seed the initial sort from the user's saved default (Settings -> Feed preferences); the feed
  // hardcoded 'hot', so a saved default had no effect. Falls back to 'hot' on error.
  useEffect(() => {
    let active = true
    http
      .get('/api/users/me/settings')
      .then((res: { data?: unknown }) => {
        if (active) setSort(pickInitialSort(res))
      })
      .catch(() => {
        if (active) setSort('hot')
      })
    return () => {
      active = false
    }
  }, [http])

  useEffect(() => {
    if (!sort) return
    let active = true
    setLoading(true)
    setError(null)
    const search = new URLSearchParams({ sort, page: '1' })
    if (tag) search.set('tag', tag)
    http
      .get(`/api/links?${search}`)
      .then((res: { data?: unknown }) => {
        if (!active) return
        const list = normalizePosts(res?.data ?? res)
        setPosts(list)
      })
      .catch((err) => {
        if (!active) return
        setError(
          err instanceof Error
            ? err.message
            : t('feed.loadError', {}, { defaultValue: 'Failed to load posts.' }),
        )
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [http, sort, tag, t])

  const handleVote = async (id: string, next: 'up' | 'down' | null) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              user_vote: next,
              points: p.points + voteDelta(p.user_vote ?? null, next),
            }
          : p,
      ),
    )
    try {
      if (next) {
        await http.post(`/api/votes/link/${id}/${next}`)
      } else {
        await http.delete(`/api/votes/link/${id}`)
      }
    } catch (_error) {
      // Failure surfaced through next reload; UI optimism preserved.
    }
  }

  const handleSave = async (id: string) => {
    const previous = posts.find((p) => p.id === id)?.saved ?? false
    // Optimistic flip — reverted below if the server contradicts us.
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)))
    try {
      const res = await http.post<{ saved: boolean }>(`/api/bookmarks/toggle`, {
        resourceType: 'link',
        resourceId: id,
      })
      const data = (res as { data?: { saved?: boolean } })?.data
      const saved = typeof data?.saved === 'boolean' ? data.saved : !previous
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, saved } : p)))
    } catch (_error) {
      // Optimistic revert — server disagreed; restore previous saved state.
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, saved: previous } : p)))
    }
  }

  const clearTag = () => {
    const next = new URLSearchParams(params)
    next.delete('tag')
    setParams(next, { replace: true })
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <CairnHeroCard
        eyebrowKey="eyebrow"
        eyebrowDefault={t('feed.heroEyebrow', {}, { defaultValue: 'Your front page' })}
        headlineKey="headline"
        headlineDefault={t(
          'feed.heroHeadline',
          {},
          { defaultValue: 'Three communities. One slow shared timeline.' },
        )}
        bodyKey="body"
        bodyDefault={t(
          'feed.heroBody',
          {},
          {
            defaultValue:
              'Sorted by the conversations worth showing up for \u2014 not the ones designed to keep you here.',
          },
        )}
        pillIcon="trending_up"
        pillKey="pill"
        pillDefault={t('feed.heroPill', {}, { defaultValue: 'Stack your cairn' })}
      />

      <section
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }))}
        aria-label={t('feed.controls', {}, { defaultValue: 'Sort feed' })}
      >
        <nav
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('p', 1),
            cm.roundedFull,
            'bg-surface-container-low',
          )}
        >
          {SORTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest transition-colors',
                sort === s
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-primary',
              )}
              aria-pressed={sort === s}
            >
              {t(`feed.sort.${s}`, {}, { defaultValue: s })}
            </button>
          ))}
        </nav>
        {tag && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-primary/10 text-primary',
            )}
          >
            #{tag}
            <button
              type="button"
              onClick={clearTag}
              aria-label={t('feed.clearTag', {}, { defaultValue: 'Clear tag filter' })}
              className={'material-symbols-outlined text-base hover:text-primary-hover'}
            >
              close
            </button>
          </span>
        )}
      </section>

      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-3')}>
        <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'lg:col-span-2')}>
          {loading ? (
            <p className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-on-surface-variant')}>
              {t('feed.loading', {}, { defaultValue: 'Loading the front page\u2026' })}
            </p>
          ) : error ? (
            <p className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-error')} role="alert">
              {error}
            </p>
          ) : posts.length === 0 ? (
            <p className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-on-surface-variant')}>
              {t(
                'feed.empty',
                {},
                { defaultValue: 'Nothing here yet \u2014 be the first to mark a path.' },
              )}
            </p>
          ) : (
            posts.map((p, i) => (
              <LinkPostCard
                key={p.id}
                post={p}
                rank={i + 1}
                onVote={handleVote}
                onSave={handleSave}
              />
            ))
          )}
        </section>
        <aside className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <section
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xs' }),
              cm.sp('p', 5),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
            )}
          >
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('feed.trendingEyebrow', {}, { defaultValue: 'Trending subs' })}
            </p>
            {trendingSubs.map((s) => (
              <SubBadge key={s.slug} sub={s} variant="row" />
            ))}
          </section>
        </aside>
      </div>
    </div>
  )
}

function voteDelta(prev: 'up' | 'down' | null, next: 'up' | 'down' | null): number {
  const v = (d: 'up' | 'down' | null) => (d === 'up' ? 1 : d === 'down' ? -1 : 0)
  return v(next) - v(prev)
}

function normalizePosts(payload: unknown): LinkPost[] {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown[] })?.data)
      ? (payload as { data: unknown[] }).data
      : []
  return list.map((row) => {
    const r = row as Record<string, unknown>
    return {
      id: String(r.id ?? ''),
      title: String(r.title ?? ''),
      url: typeof r.url === 'string' ? r.url : null,
      domain: typeof r.domain === 'string' ? r.domain : null,
      text: typeof r.text === 'string' ? r.text : null,
      submitter_id: String(r.submitter_id ?? r.submitterId ?? ''),
      submitter_name: typeof r.submitter_name === 'string' ? r.submitter_name : undefined,
      sub_slug: typeof r.sub_slug === 'string' ? r.sub_slug : undefined,
      sub_name: typeof r.sub_name === 'string' ? r.sub_name : undefined,
      points: Number(r.points ?? 0),
      comment_count: Number(r.comment_count ?? r.commentCount ?? 0),
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      saved: Boolean(r.saved),
      user_vote: r.user_vote === 'up' || r.user_vote === 'down' ? r.user_vote : null,
      created_at: String(r.created_at ?? r.createdAt ?? new Date().toISOString()),
    }
  })
}

export default Feed
