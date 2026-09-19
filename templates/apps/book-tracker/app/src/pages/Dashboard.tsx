import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ChallengeHeroCard, type ChallengeSnapshot } from '../components/ChallengeHeroCard.js'
import { ReadingProgressRow } from '../components/ReadingProgressRow.js'
import { ReadingStatsTriad } from '../components/ReadingStatsTriad.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface CurrentlyReading {
  user_book_id: string
  book_id: string
  title: string
  author: string
  cover_style: string
  page_count: number
  current_page: number
  percent: number
  started_at: string | null
}

interface Today {
  date: string
  currently_reading: CurrentlyReading[]
  minutes_today: number
  pages_today: number
  challenge: ChallengeSnapshot
  motivational_message: string
}

interface Overview {
  finished_this_year: number
  pages_read: number
  avg_rating: number
  by_shelf: Record<string, number>
  weekly_pages: { week: string; pages: number }[]
  recent: {
    user_book_id: string
    book_id: string
    title: string
    author: string
    shelf: string
    rating: number | null
    finished_at: string | null
    updated_at: string
  }[]
}

const SHELF_TONE: Record<string, string> = {
  reading: 'bg-primary-container text-on-primary-container',
  read: 'bg-success-container text-on-success-container',
  want_to_read: 'bg-secondary-container text-on-secondary-container',
  dnf: 'bg-error-container text-on-error-container',
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [today, setToday] = useState<Today | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => {
    let cancelled = false
    setLoading(true)
    Promise.all([http.get('/api/reports/today'), http.get('/api/reports/overview')])
      .then(([todayData, overviewData]) => {
        if (cancelled) return
        setToday(unwrapSingle<Today>(todayData))
        setOverview(unwrapSingle<Overview>(overviewData))
      })
      .catch(() => {
        if (!cancelled) setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }

  useEffect(load, [http, t])

  const logProgress = async (book: CurrentlyReading, page: number) => {
    if (Number.isNaN(page) || page <= book.current_page) return
    setBusyId(book.book_id)
    try {
      await http.post(`/api/books/${book.book_id}/progress`, {
        current_page: page,
      })
      const todayResp = await http.get('/api/reports/today')
      setToday(unwrapSingle<Today>(todayResp))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setBusyId(null)
    }
  }

  const currentlyReading = today?.currently_reading ?? []
  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  if (error) {
    return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  }
  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-8')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {todayStr}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight', cm.sp('mt', 2))}>
          {t('dashboard.heading', {}, { defaultValue: 'Your reading today' })}
        </h1>
      </header>

      <ChallengeHeroCard
        challenge={today?.challenge}
        motivationalMessage={today?.motivational_message ?? ''}
        weeklyPages={overview?.weekly_pages}
      />

      {overview ? (
        <ReadingStatsTriad
          finishedThisYear={overview.finished_this_year}
          pagesRead={overview.pages_read}
          avgRating={overview.avg_rating}
          currentlyReading={currentlyReading.length}
        />
      ) : null}

      <section className={cm.cn('space-y-3')}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('dashboard.currentlyReading', {}, { defaultValue: 'Currently reading' })}
            {today && today.pages_today > 0
              ? t(
                  'dashboard.todaySuffix',
                  { pages: today.pages_today, minutes: today.minutes_today },
                  { defaultValue: ' · {{pages}} pp / {{minutes}} min today' },
                )
              : ''}
          </h2>
          <Link
            to="/books/new"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'inline-flex items-center gap-2 rounded-full text-on-primary shadow-sm hover:shadow-md transition-shadow uppercase tracking-widest',
            )}
            style={{
              background:
                'linear-gradient(90deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))',
            }}
            data-mol-id="dashboard-add-book"
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>add</span>
            {t('dashboard.newBookCta', {}, { defaultValue: 'Add book' })}
          </Link>
        </div>
        {currentlyReading.length === 0 ? (
          <p
            className={cm.cn(
              'bg-surface-container-lowest rounded-2xl shadow-sm',
              cm.sp('p', 12),
              cm.textCenter,
              'text-on-surface-variant',
            )}
          >
            {t(
              'dashboard.emptyReading',
              {},
              { defaultValue: 'Nothing in progress. Shelve a book as reading to start it.' },
            )}
          </p>
        ) : (
          <ul className={cm.cn('space-y-3')}>
            {currentlyReading.map((b) => (
              <li key={b.book_id}>
                <ReadingProgressRow
                  id={b.book_id}
                  title={b.title}
                  author={b.author}
                  coverStyle={b.cover_style}
                  pageCount={b.page_count}
                  currentPage={b.current_page}
                  percent={b.percent}
                  busy={busyId === b.book_id}
                  onLog={(page) => void logProgress(b, page)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('dashboard.recentActivity', {}, { defaultValue: 'Recent activity' })}
        </h2>
        {(overview?.recent ?? []).length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 3), 'text-on-surface-variant')}>
            {t('dashboard.recentEmpty', {}, { defaultValue: 'No shelf changes yet.' })}
          </p>
        ) : (
          <ul className={cm.cn('space-y-2', cm.sp('mt', 3))}>
            {(overview?.recent ?? []).slice(0, 6).map((r) => (
              <li
                key={r.user_book_id}
                className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('sm'))}
              >
                <Link
                  to={`/books/${r.book_id}`}
                  className={cm.cn(cm.fontWeight('medium'), 'text-on-surface hover:text-primary')}
                >
                  {r.title}
                </Link>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.fontWeight('bold'),
                    'text-[10px] py-0.5 rounded-full uppercase tracking-widest',
                    SHELF_TONE[r.shelf] ?? 'bg-surface-container text-on-surface-variant',
                  )}
                >
                  {t(`shelf.${r.shelf}`, {}, { defaultValue: r.shelf.replace(/_/g, ' ') })}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant ml-auto')}>
                  {new Date(r.updated_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <Link
          to="/books"
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), cm.textPrimary)}
        >
          {t('dashboard.viewAllBooks', {}, { defaultValue: 'Browse shelves →' })}
        </Link>
        <Link
          to="/stats"
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), cm.textPrimary)}
        >
          {t('dashboard.viewStats', {}, { defaultValue: 'See stats →' })}
        </Link>
      </div>
    </div>
  )
}
