import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CategoryTile } from '../components/CategoryTile.js'
import { SessionCard, type SessionCardItem } from '../components/SessionCard.js'
import { StillpointTopBar } from '../components/StillpointTopBar.js'
import type { ApiCategory, ApiSession } from '../lib/api.js'
import { toMinutes, toneFor } from '../lib/api.js'
import type { CategoryTone } from '../lib/categoryTone.js'

interface CategoryWithCount extends ApiCategory {
  session_count: number
}

function sessionToCard(s: ApiSession, categories: CategoryWithCount[]): SessionCardItem {
  const cat = categories.find((c) => c.id === s.category_id)
  const tone = toneFor(cat?.slug ?? null)
  return {
    id: s.slug || s.id,
    title: s.title,
    instructor: s.instructor_name ?? '',
    durationMinutes: toMinutes(s.duration_seconds),
    category: tone,
    categoryLabel: cat?.label ?? '',
    description: s.description ?? '',
  }
}

export function Library() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = (searchParams.get('category') ?? 'all') as CategoryTone | 'all'
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [sessions, setSessions] = useState<ApiSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get<CategoryWithCount[]>('/categories'),
      http.get<ApiSession[]>('/sessions?limit=100'),
    ])
      .then(([catsRes, sesRes]) => {
        if (cancelled) return
        setCategories(Array.isArray(catsRes.data) ? catsRes.data : [])
        setSessions(Array.isArray(sesRes.data) ? sesRes.data : [])
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const cardsAll = useMemo(
    () => sessions.map((s) => sessionToCard(s, categories)),
    [sessions, categories],
  )
  const visible = useMemo(
    () => (filter === 'all' ? cardsAll : cardsAll.filter((s) => s.category === filter)),
    [cardsAll, filter],
  )

  const featuredCats = useMemo(
    () =>
      categories
        .filter((c) => c.slug !== 'all')
        .slice(0, 4)
        .map((c) => ({
          tone: toneFor(c.slug),
          slug: c.slug,
          label: c.label,
          sessions: c.session_count,
          description: c.description ?? '',
        })),
    [categories],
  )

  const filterChips: { tone: CategoryTone | 'all'; key: string; label: string }[] = useMemo(
    () => [
      { tone: 'all', key: 'all', label: t('status.all', {}, { defaultValue: 'All' }) },
      ...categories.map((c) => ({
        tone: toneFor(c.slug),
        key: c.slug,
        label: c.label,
      })),
    ],
    [categories, t],
  )

  return (
    <>
      <StillpointTopBar
        title={t('nav.library', {}, { defaultValue: 'Library' })}
        eyebrow={
          <span data-testid="library-eyebrow">
            {t(
              'stillpoint.library.eyebrow',
              { count: cardsAll.length },
              { defaultValue: '{{count}} sessions, hand-picked' },
            )}
          </span>
        }
      />

      {error ? (
        <div
          data-testid="library-error"
          className={cm.cn(cm.sp('p', 6), 'rounded-2xl border border-error text-error')}
        >
          {t('stillpoint.library.loadError', {}, { defaultValue: "We couldn't load the library." })}
        </div>
      ) : null}

      {featuredCats.length > 0 ? (
        <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface tracking-tight')}>
            {t('stillpoint.library.featuredCats', {}, { defaultValue: 'Browse by mood' })}
          </h2>
          <div className={cm.cn('grid grid-cols-2 md:grid-cols-4 gap-4')}>
            {featuredCats.map((c) => (
              <CategoryTile
                key={c.slug}
                category={c.tone}
                label={c.label}
                sessionCount={c.sessions}
                description={c.description}
                to={`/library?category=${c.tone}`}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div
        data-testid="library-filters"
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}
      >
        {filterChips.map((c) => {
          const active = filter === c.tone
          return (
            <button
              key={c.key}
              type="button"
              data-testid={`library-filter-${c.key}`}
              onClick={() => {
                if (c.tone === 'all') setSearchParams({})
                else setSearchParams({ category: c.tone })
              }}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-full transition-colors uppercase tracking-widest text-[11px]',
                active
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-primary-container/60',
              )}
            >
              {c.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div
          data-testid="library-loading"
          className={cm.cn(cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      ) : visible.length === 0 ? (
        <div
          data-testid="library-empty"
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-2xl border border-dashed border-outline text-on-surface-variant',
          )}
        >
          {t('stillpoint.library.empty', {}, { defaultValue: 'No sessions in this category yet.' })}
        </div>
      ) : (
        <div
          data-testid="library-sessions"
          className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4')}
        >
          {visible.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      )}
    </>
  )
}
