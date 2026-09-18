import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SessionCard, type SessionCardItem } from '../components/SessionCard.js'
import { StillpointTopBar } from '../components/StillpointTopBar.js'
import type { ApiCategory, ApiCourse, ApiSession } from '../lib/api.js'
import { toMinutes, toneFor } from '../lib/api.js'

const SUGGESTED_QUERIES = ['breath', 'sleep', 'morning', 'focus', 'walking']

function sessionToCard(s: ApiSession, categories: ApiCategory[]): SessionCardItem {
  const cat = categories.find((c) => c.id === s.category_id)
  const tone = toneFor(cat?.slug)
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

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [sessions, setSessions] = useState<ApiSession[]>([])
  const [courses, setCourses] = useState<ApiCourse[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<ApiCategory[]>('/categories')
      .then((res) => {
        if (cancelled) return
        setCategories(Array.isArray(res.data) ? res.data : [])
      })
      .catch(() => {
        // categories are non-critical; search still works
      })
    return () => {
      cancelled = true
    }
  }, [http])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebounced(q.trim()), 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q])

  useEffect(() => {
    if (debounced.length === 0) {
      setSessions([])
      setCourses([])
      setError(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    const encoded = encodeURIComponent(debounced)
    Promise.all([
      http.get<ApiSession[]>(`/sessions?q=${encoded}&limit=24`).catch(() => ({ data: [] })),
      http.get<ApiCourse[]>(`/courses`).catch(() => ({ data: [] })),
    ])
      .then(([s, c]) => {
        if (cancelled) return
        const sList = Array.isArray(s.data) ? s.data : []
        const cList = Array.isArray(c.data) ? c.data : []
        setSessions(sList)
        const lower = debounced.toLowerCase()
        setCourses(
          cList.filter(
            (course) =>
              course.title.toLowerCase().includes(lower) ||
              (course.description ?? '').toLowerCase().includes(lower),
          ),
        )
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
  }, [http, debounced])

  const sessionCards = useMemo(
    () => sessions.map((s) => sessionToCard(s, categories)),
    [sessions, categories],
  )

  return (
    <>
      <StillpointTopBar
        title={t('common.search', {}, { defaultValue: 'Search' })}
        eyebrow={
          <span data-testid="search-eyebrow">
            {t(
              'stillpoint.search.eyebrow',
              {},
              { defaultValue: 'Sessions, courses, and quiet practices.' },
            )}
          </span>
        }
      />

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('p', 4),
          'rounded-2xl bg-surface-container-lowest border border-outline/30 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-colors',
        )}
      >
        <span
          aria-hidden="true"
          className={cm.cn('material-symbols-outlined text-2xl text-on-surface-variant')}
        >
          search
        </span>
        <input
          type="search"
          data-testid="search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t(
            'stillpoint.search.placeholder',
            {},
            { defaultValue: 'Try "morning" or "sleep"' },
          )}
          className={cm.cn(
            cm.textSize('lg'),
            'flex-1 bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant',
          )}
        />
      </div>

      {debounced.length === 0 ? (
        <section
          data-testid="search-suggestions"
          className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('stillpoint.search.suggestionsHeading', {}, { defaultValue: 'Try searching for' })}
          </h2>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
            {SUGGESTED_QUERIES.map((s) => (
              <button
                key={s}
                type="button"
                data-testid={`search-suggestion-${s}`}
                onClick={() => setQ(s)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-full bg-primary-container text-on-primary-container hover:bg-primary-container/80 transition-colors',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </section>
      ) : loading ? (
        <div
          data-testid="search-loading"
          className={cm.cn(cm.sp('p', 8), cm.textCenter, 'text-on-surface-variant')}
        >
          {t('stillpoint.search.loading', {}, { defaultValue: 'Looking…' })}
        </div>
      ) : error ? (
        <div
          data-testid="search-error"
          className={cm.cn(cm.sp('p', 6), 'rounded-2xl border border-error text-error')}
        >
          {t('stillpoint.search.error', {}, { defaultValue: 'Search failed.' })}
        </div>
      ) : sessionCards.length === 0 && courses.length === 0 ? (
        <div
          data-testid="search-empty"
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-2xl border border-dashed border-outline text-on-surface-variant',
          )}
        >
          {t(
            'stillpoint.search.empty',
            { query: debounced },
            { defaultValue: 'Nothing for "{{query}}" yet. Try a softer word.' },
          )}
        </div>
      ) : (
        <>
          {courses.length > 0 ? (
            <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <h2
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('stillpoint.search.coursesHeading', {}, { defaultValue: 'Courses' })}
              </h2>
              <ul
                data-testid="search-courses"
                className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'list-none')}
              >
                {courses.map((c) => (
                  <li key={c.id}>
                    <Link
                      data-testid={`search-course-${c.slug}`}
                      to={`/courses/${c.slug}`}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.sp('p', 4),
                        'rounded-2xl bg-surface-container-lowest border border-outline/20 hover:border-primary/40 transition-colors',
                      )}
                    >
                      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                        <span
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'center' }),
                            cm.fontWeight('bold'),
                            'w-12 h-12 rounded-xl bg-primary-container text-on-primary-container',
                          )}
                          aria-hidden="true"
                        >
                          <span className={cm.cn('material-symbols-outlined')}>school</span>
                        </span>
                        <div>
                          <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                            {c.title}
                          </p>
                          {c.description ? (
                            <p
                              className={cm.cn(
                                cm.textSize('xs'),
                                'text-on-surface-variant line-clamp-1',
                              )}
                            >
                              {c.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'uppercase tracking-widest font-bold text-primary',
                        )}
                      >
                        {t(
                          'stillpoint.search.courseDays',
                          { count: c.day_count },
                          { defaultValue: '{{count}}-day' },
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {sessionCards.length > 0 ? (
            <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <h2
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('stillpoint.search.sessionsHeading', {}, { defaultValue: 'Sessions' })}
              </h2>
              <div
                data-testid="search-sessions"
                className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4')}
              >
                {sessionCards.map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </>
  )
}
