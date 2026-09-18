import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { TutorCard } from '../components/TutorCard.js'

type TutorRow = {
  id: string
  name?: string
  display_name?: string
  headline?: string
  subjects?: string[]
  rate_per_hour_cents?: number
  hourly_rate?: number | string
  rating_average?: number | string
  rating_count?: number
  verified?: boolean
  top_rated?: boolean
  online?: boolean
}

function rateToDollars(t: TutorRow): number {
  if (typeof t.hourly_rate === 'number') return t.hourly_rate
  if (typeof t.hourly_rate === 'string') {
    const n = Number(t.hourly_rate)
    if (!Number.isNaN(n)) return n
  }
  if (typeof t.rate_per_hour_cents === 'number') return Math.round(t.rate_per_hour_cents / 100)
  return 0
}

function ratingNumber(t: TutorRow): number {
  if (typeof t.rating_average === 'number') return t.rating_average
  if (typeof t.rating_average === 'string') {
    const n = Number(t.rating_average)
    if (!Number.isNaN(n)) return n
  }
  return 0
}

function tutorName(t: TutorRow): string {
  return t.display_name ?? t.name ?? ''
}

const SUBJECT_FILTERS = [
  { key: 'math', label: 'Mathematics' },
  { key: 'science', label: 'Science' },
  { key: 'languages', label: 'Languages' },
  { key: 'testPrep', label: 'Test prep' },
  { key: 'music', label: 'Music' },
  { key: 'coding', label: 'Coding' },
] as const

const RATING_FILTERS = [
  { key: 'any', label: 'Any rating', min: 0 },
  { key: 'good', label: '4★ +', min: 4 },
  { key: 'great', label: '4.5★ +', min: 4.5 },
  { key: 'top', label: '4.8★ +', min: 4.8 },
] as const

const FALLBACK_TUTORS: TutorRow[] = [
  {
    id: 'demo-rivera',
    name: 'Dr. Maya Rivera',
    headline: 'PhD physics. Builds intuition from first principles.',
    subjects: ['Physics', 'Calculus', 'AP Physics C'],
    rate_per_hour_cents: 9500,
    rating_average: 4.95,
    rating_count: 312,
    verified: true,
    top_rated: true,
    online: true,
  },
  {
    id: 'demo-okafor',
    name: 'Adaeze Okafor',
    headline: 'Bilingual writing coach for IELTS, TOEFL & college essays.',
    subjects: ['English', 'IELTS', 'TOEFL', 'Essay coaching'],
    rate_per_hour_cents: 6000,
    rating_average: 4.88,
    rating_count: 184,
    verified: true,
  },
  {
    id: 'demo-tanaka',
    name: 'Kenji Tanaka',
    headline: 'Software engineer turned tutor — Python, algorithms, ML.',
    subjects: ['Python', 'Algorithms', 'Machine learning'],
    rate_per_hour_cents: 11000,
    rating_average: 4.92,
    rating_count: 247,
    verified: true,
    top_rated: true,
    online: true,
  },
  {
    id: 'demo-bauer',
    name: 'Ana Bauer',
    headline: 'Spanish & Portuguese tutor — conversational and immersive.',
    subjects: ['Spanish', 'Portuguese'],
    rate_per_hour_cents: 4500,
    rating_average: 4.79,
    rating_count: 96,
    verified: true,
  },
  {
    id: 'demo-thoma',
    name: 'Eli Thoma',
    headline: 'Economics & data — clear graphs, sharper intuition.',
    subjects: ['Economics', 'Statistics', 'AP Macro'],
    rate_per_hour_cents: 7500,
    rating_average: 4.84,
    rating_count: 132,
    verified: true,
    online: true,
  },
  {
    id: 'demo-ramirez',
    name: 'Sofia Ramirez',
    headline: 'Cellist & music theory — Royal Conservatory L8 prep.',
    subjects: ['Music theory', 'Cello'],
    rate_per_hour_cents: 8200,
    rating_average: 4.93,
    rating_count: 88,
    verified: true,
    top_rated: true,
  },
]

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [params] = useSearchParams()

  const initialQuery = params.get('q') ?? ''
  const initialSubject = params.get('subject') ?? ''

  const [query, setQuery] = useState(initialQuery)
  const [subject, setSubject] = useState(initialSubject)
  const [minRating, setMinRating] = useState<number>(0)
  const [tutors, setTutors] = useState<TutorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setErrored(false)
    const url = `/api/tutors${query ? `?search=${encodeURIComponent(query)}` : ''}`
    http
      .get<TutorRow[]>(url)
      .then((res: { data?: TutorRow[] | null }) => {
        if (!active) return
        // When the search bond serves ?search=, /api/tutors returns the
        // normalized @molecule/api-search SearchResult
        // ({ hits: [{ id, document }], … }), not a bare array — treating it
        // as one dropped every server hit and the page silently showed the
        // sample tutors instead. Map hits back to tutor rows; the plain-list
        // path (no search, or DB fallback) is unchanged.
        const body: unknown = res?.data ?? res
        const hits = (body as { hits?: Array<{ id: string; document: Record<string, unknown> }> })
          ?.hits
        const list = hits
          ? hits.map((hit) => ({ id: hit.id, ...hit.document }) as unknown as TutorRow)
          : Array.isArray(res?.data)
            ? res.data
            : []
        const rows = list.length > 0 ? list : FALLBACK_TUTORS
        setTutors(rows)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setErrored(true)
        setTutors(FALLBACK_TUTORS)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [http, query])

  const filtered = useMemo(() => {
    return tutors.filter((tutor) => {
      if (
        subject &&
        !(tutor.subjects ?? []).map((s) => s.toLowerCase()).includes(subject.toLowerCase())
      ) {
        const subjectKeyMap: Record<string, string[]> = {
          math: ['math', 'mathematics', 'calculus'],
          science: ['science', 'physics', 'chemistry', 'biology'],
          languages: ['english', 'spanish', 'portuguese', 'languages'],
          testPrep: ['ielts', 'toefl', 'sat', 'act'],
          music: ['music', 'cello', 'piano'],
          coding: ['python', 'algorithms', 'machine learning'],
        }
        const aliases = subjectKeyMap[subject] ?? []
        if (!(tutor.subjects ?? []).some((s) => aliases.some((a) => s.toLowerCase().includes(a)))) {
          return false
        }
      }
      if (minRating > 0 && ratingNumber(tutor) < minRating) return false
      return true
    })
  }, [tutors, subject, minRating])

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.stack(8))}>
      <header
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'md' }),
          'md:flex-row md:items-end md:justify-between',
        )}
      >
        <div className={cm.stack(2)}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('search.eyebrow', { appName: APP_NAME }, { defaultValue: 'Browse {{appName}}' })}
          </p>
          <h1
            className={cm.cn(
              cm.fontWeight('bold'),
              'font-display text-4xl md:text-5xl tracking-tight',
            )}
          >
            {t('search.title', {}, { defaultValue: 'Find a tutor that clicks' })}
          </h1>
          <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant max-w-xl')}>
            {t(
              'search.subtitle',
              {},
              {
                defaultValue: 'Filter by subject, rating, and availability. Verified tutors only.',
              },
            )}
          </p>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className={cm.cn('relative w-full md:max-w-md')}>
          <span
            aria-hidden="true"
            className={cm.cn(
              'material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant',
            )}
          >
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'search.searchPlaceholder',
              {},
              { defaultValue: 'Subject, name, or topic…' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.textSize('sm'),
              'rounded-full border border-outline-variant/40 bg-surface-container-lowest pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow',
            )}
          />
        </form>
      </header>

      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-[280px_1fr]')}>
        <aside
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(6),
            'bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm self-start',
          )}
        >
          <div className={cm.stack(3)}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('search.filter.subject', {}, { defaultValue: 'Subject' })}
            </p>
            <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }))}>
              <button
                type="button"
                onClick={() => setSubject('')}
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'rounded-full px-3 py-1.5 transition-colors',
                  subject === ''
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high',
                )}
              >
                {t('status.all', {}, { defaultValue: 'All' })}
              </button>
              {SUBJECT_FILTERS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSubject(s.key)}
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('medium'),
                    'rounded-full px-3 py-1.5 transition-colors',
                    subject === s.key
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high',
                  )}
                >
                  {t(`search.filter.subject.${s.key}`, {}, { defaultValue: s.label })}
                </button>
              ))}
            </div>
          </div>

          <div className={cm.stack(3)}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('search.filter.rating', {}, { defaultValue: 'Rating' })}
            </p>
            <div className={cm.stack(2)}>
              {RATING_FILTERS.map((r) => (
                <label
                  key={r.key}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.textSize('sm'),
                    'cursor-pointer',
                  )}
                >
                  <input
                    type="radio"
                    name="rating"
                    checked={minRating === r.min}
                    onChange={() => setMinRating(r.min)}
                    className={cm.cn('accent-primary')}
                  />
                  {t(`search.filter.rating.${r.key}`, {}, { defaultValue: r.label })}
                </label>
              ))}
            </div>
          </div>

          <div
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-xl border border-dashed border-outline-variant/40',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('search.filter.availability', {}, { defaultValue: 'Availability' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}>
              {t(
                'search.filter.availabilityHint',
                {},
                {
                  defaultValue:
                    'Schedule sync coming soon — for now use the slot picker on each tutor profile.',
                },
              )}
            </p>
          </div>
        </aside>

        <section className={cm.stack(4)}>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {loading
                ? t('search.results.loading', {}, { defaultValue: 'Loading tutors…' })
                : t(
                    'search.results.count',
                    { count: filtered.length },
                    {
                      defaultValue: '{{count}} tutors match your filters',
                    },
                  )}
            </p>
            {errored && (
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'rounded-full px-3 py-1 bg-warning-light text-warning',
                )}
              >
                {t('search.results.fallback', {}, { defaultValue: 'Showing curated demo tutors' })}
              </span>
            )}
          </div>
          {!loading && filtered.length === 0 && (
            <div
              className={cm.cn(
                cm.sp('p', 10),
                cm.textCenter,
                'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant')}>
                search_off
              </span>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('lg'),
                  cm.sp('mt', 3),
                  'font-display',
                )}
              >
                {t('search.empty.title', {}, { defaultValue: 'No tutors match yet.' })}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mt', 1),
                  'text-on-surface-variant max-w-md mx-auto',
                )}
              >
                {t(
                  'search.empty.body',
                  {},
                  {
                    defaultValue:
                      'Try widening the subject filter or relaxing the rating threshold.',
                  },
                )}
              </p>
            </div>
          )}
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'sm:grid-cols-2 xl:grid-cols-3')}>
            {filtered.map((tutor) => (
              <TutorCard
                key={tutor.id}
                id={tutor.id}
                name={tutorName(tutor)}
                avatarSeed={tutor.id}
                headline={tutor.headline ?? ''}
                subjects={tutor.subjects ?? []}
                ratePerHour={rateToDollars(tutor)}
                rating={ratingNumber(tutor)}
                reviewCount={tutor.rating_count ?? 0}
                verified={Boolean(tutor.verified)}
                topRated={Boolean(tutor.top_rated)}
                online={Boolean(tutor.online)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
