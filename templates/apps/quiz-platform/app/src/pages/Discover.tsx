import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { QuizCard, type QuizCardProps } from '../components/QuizCard.js'

const CATEGORIES = [
  { key: 'all', label: 'All', glyph: 'auto_awesome' },
  { key: 'science', label: 'Science', glyph: 'science' },
  { key: 'geography', label: 'Geography', glyph: 'public' },
  { key: 'history', label: 'History', glyph: 'menu_book' },
  { key: 'arts', label: 'Arts & Music', glyph: 'palette' },
  { key: 'sports', label: 'Sports', glyph: 'sports_soccer' },
  { key: 'pop', label: 'Pop Culture', glyph: 'theater_comedy' },
] as const

const CATEGORY_GLYPH: Record<string, string> = {
  geography: 'public',
  science: 'science',
  history: 'history_edu',
  arts: 'palette',
  sports: 'sports_soccer',
  pop: 'theater_comedy',
  general: 'auto_awesome',
}
const CATEGORY_HUE: Record<string, NonNullable<QuizCardProps['hue']>> = {
  geography: 'sky',
  science: 'tertiary',
  history: 'emerald',
  arts: 'rose',
  sports: 'amber',
  pop: 'rose',
  general: 'sky',
}

interface QuizRow {
  id: string
  title: string
  description?: string | null
  category?: string | null
  status: string
  cover_url?: string | null
  time_per_question_s?: number
  play_count?: number
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

function quizRowToCard(q: QuizRow): QuizCardProps & { categoryKey: string } {
  const cat = (q.category ?? 'general').toLowerCase()
  return {
    id: q.id,
    title: q.title,
    category: q.category ?? 'General',
    categoryKey: cat,
    questions: 0,
    plays: q.play_count ?? 0,
    durationMinutes: Math.max(1, Math.round(((q.time_per_question_s ?? 20) * 5) / 60)),
    difficulty: 'medium',
    iconGlyph: CATEGORY_GLYPH[cat] ?? 'auto_awesome',
    hue: CATEGORY_HUE[cat] ?? 'sky',
    ctaTo: `/quiz/${q.id}`,
  }
}

export function Discover() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [pendingSearch, setPendingSearch] = useState('')
  const [quizzes, setQuizzes] = useState<QuizRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const params = new URLSearchParams()
      if (activeCategory !== 'all') params.set('category', activeCategory)
      if (pendingSearch.trim()) params.set('search', pendingSearch.trim())
      const url = `/api/quizzes${params.toString() ? `?${params.toString()}` : ''}`
      const res = await http.get(url)
      // When ?search= is set, /api/quizzes returns the normalized
      // @molecule/api-search SearchResult ({ hits: [{ id, document }], … }),
      // not a bare list — treating it as one yielded [] and the grid
      // rendered zero results for every query. Map hits back to quiz rows;
      // the non-search list path is unchanged.
      const body = unwrap<
        QuizRow[] | { hits?: Array<{ id: string; document: Record<string, unknown> }> }
      >(res)
      const list = Array.isArray(body)
        ? body
        : (body?.hits ?? []).map((hit) => ({ id: hit.id, ...hit.document }) as unknown as QuizRow)
      setQuizzes(list)
    } catch (_error) {
      // Failed fetch must not render as an empty library — surface a banner.
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [http, activeCategory, pendingSearch])

  useEffect(() => {
    void refresh()
  }, [refresh])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPendingSearch(search)
  }

  const filtered = quizzes
    .map(quizRowToCard)
    .filter((q) => activeCategory === 'all' || q.categoryKey === activeCategory)

  return (
    <div className={cm.cn(cm.stack(10), cm.sp('py', 8))}>
      <section
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-primary/30 bg-gradient-to-br from-primary via-tertiary to-[var(--quiz-gradient-to)]',
          cm.sp('p', 10),
        )}
      >
        <span
          className={cm.cn(
            'absolute -right-24 -bottom-24 w-72 h-72 rounded-full bg-amber-400/30 blur-3xl',
          )}
          aria-hidden="true"
        />
        <span
          className={cm.cn(
            'absolute -left-20 -top-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div className={cm.cn('relative z-10', cm.maxW('lg'))}>
          <span
            className={cm.cn(
              'inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest',
              cm.sp('mb', 4),
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
              travel_explore
            </span>
            {t('nav.discover', {}, { defaultValue: 'Discover' })}
          </span>
          <h1
            className={cm.cn(
              'text-4xl md:text-5xl font-extrabold tracking-tight leading-[0.95] mb-3',
            )}
          >
            {t('discover.headline', {}, { defaultValue: 'Find your next favourite quiz.' })}
          </h1>
          <p className={cm.cn('text-white/85 text-base max-w-md mb-6')}>
            {t(
              'discover.subhead',
              {},
              {
                defaultValue:
                  'Browse the full library, filter by category, or search by title. Hit a card to play solo or host live.',
              },
            )}
          </p>
          <form
            onSubmit={handleSearchSubmit}
            className={cm.cn(
              'flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface/15 backdrop-blur-md border border-surface/20 focus-within:ring-2 focus-within:ring-amber-300/70',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              search
            </span>
            <input
              type="search"
              name="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(
                'discover.searchPlaceholder',
                {},
                { defaultValue: 'Search quizzes by title…' },
              )}
              className={cm.cn(
                'flex-1 bg-transparent placeholder-white/60 text-white outline-none text-sm',
              )}
            />
            <button
              type="submit"
              className={cm.cn(
                'min-h-[40px] px-4 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-widest flex-shrink-0',
              )}
            >
              {t('common.search', {}, { defaultValue: 'Search' })}
            </button>
          </form>
        </div>
      </section>

      <section>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.sp('mb', 6), 'flex-wrap')}>
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.key
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                className={cm.cn(
                  'inline-flex items-center gap-2 px-4 min-h-[40px] rounded-full text-[11px] font-black uppercase tracking-widest transition-colors',
                  active
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                  {cat.glyph}
                </span>
                {t(`discover.category.${cat.key}`, {}, { defaultValue: cat.label })}
              </button>
            )
          })}
        </div>
        {loading ? (
          <p className={cm.cn('text-sm text-on-surface-variant')}>
            {t('discover.loading', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : error ? (
          <LoadErrorBanner
            onRetry={refresh}
            message={t(
              'common.loadError',
              {},
              { defaultValue: 'Something went wrong loading this content.' },
            )}
          />
        ) : filtered.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              'rounded-3xl border border-dashed border-outline-variant/40 text-on-surface-variant',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-4xl text-primary mb-3 inline-block')}
            >
              search_off
            </span>
            <p className={cm.cn('font-bold text-base mb-1')}>
              {t('discover.empty.title', {}, { defaultValue: 'No quizzes match yet.' })}
            </p>
            <p className={cm.cn('text-sm')}>
              {t(
                'discover.empty.body',
                {},
                { defaultValue: 'Try a different category or clear the search.' },
              )}
            </p>
          </div>
        ) : (
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 lg:grid-cols-3')}>
            {filtered.map((q) => (
              <QuizCard key={q.id} {...q} />
            ))}
          </div>
        )}
      </section>

      <section
        className={cm.cn(
          'rounded-3xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          cm.sp('p', 8),
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('discover.collections.title', {}, { defaultValue: 'Browse by category' })}
          </h2>
          <Link
            to="/my-quizzes"
            className={cm.cn('text-sm font-bold text-primary hover:underline')}
          >
            {t('discover.collections.viewAll', {}, { defaultValue: 'See your library →' })}
          </Link>
        </div>
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-3')}>
          {[
            { glyph: 'school', title: 'Classroom Starters', categoryKey: 'science' },
            { glyph: 'celebration', title: 'Game Night Hits', categoryKey: 'pop' },
            {
              glyph: 'workspace_premium',
              title: 'Geography Tournaments',
              categoryKey: 'geography',
            },
          ].map((c) => {
            const count = quizzes.filter(
              (q) => (q.category ?? '').toLowerCase() === c.categoryKey,
            ).length
            return (
              <button
                key={c.title}
                type="button"
                onClick={() => setActiveCategory(c.categoryKey)}
                className={cm.cn(
                  'rounded-2xl p-5 bg-gradient-to-br from-surface-container-low to-surface-container text-left hover:from-primary-container/40 hover:to-primary-container/20 transition-colors',
                )}
              >
                <span
                  className={cm.cn(
                    'inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary mb-3',
                  )}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">{c.glyph}</span>
                </span>
                <p className={cm.cn('font-extrabold text-base mb-1')}>
                  {t(`discover.collections.${c.glyph}.title`, {}, { defaultValue: c.title })}
                </p>
                <p className={cm.cn('text-xs text-on-surface-variant')}>
                  {t(
                    `discover.collections.${c.glyph}.count`,
                    { count },
                    { defaultValue: '{{count}} quizzes' },
                  )}
                </p>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default Discover
