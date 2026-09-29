import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ReviewCard } from '../components/ReviewCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface ReviewRow {
  id: string
  book_id: string
  title: string
  author: string
  cover_style: string
  rating: number | null
  review: string | null
  finished_at: string | null
}

const DRAFT_FRAGMENTS = [
  {
    key: 'sebald',
    title: 'The Rings of Saturn',
    stage: '2 drafts',
    note: 'Walking the Suffolk coastline — notes on melancholy and mapping.',
  },
  {
    key: 'carr',
    title: 'A Month in the Country',
    stage: 'Outline',
    note: 'Wall-painting restoration and one peaceful English summer.',
  },
] as const

export function Reviews() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/reviews')
      .then((res) => {
        if (!cancelled) setReviews(unwrapList<ReviewRow>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('reviews.loadError', {}, { defaultValue: 'Failed to load reviews.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('3xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('reviews.eyebrow', {}, { defaultValue: 'What stayed with you' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight', cm.sp('mt', 2))}>
          {t('reviews.heading', {}, { defaultValue: 'Reviews, Essays & Companion Reflections' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'reviews.subheading',
            { count: reviews.length },
            { defaultValue: '{{count}} written — every one yours.' },
          )}
        </p>
      </header>

      {reviews.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t(
            'reviews.empty',
            {},
            { defaultValue: 'No reviews yet. Finish a book, rate it, write two lines.' },
          )}{' '}
          <Link
            to="/books"
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textPrimary,
              'inline-flex items-center py-2.5',
            )}
          >
            {t('reviews.browseLink', {}, { defaultValue: 'Browse shelves →' })}
          </Link>
        </p>
      ) : (
        <ul className={cm.cn('space-y-4')}>
          {reviews.map((r) => (
            <li key={r.id}>
              <ReviewCard
                bookId={r.book_id}
                title={r.title}
                author={r.author}
                coverStyle={r.cover_style}
                rating={r.rating}
                review={r.review}
                finishedAt={r.finished_at}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Desk scraps & drafts — fragments not yet published to the feed */}
      <section className={cm.cn(cm.card(), cm.sp('p', 6))} data-mol-id="reviews-desk-scraps">
        <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' })}>
          <h2
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('base'),
              cm.fontWeight('semibold'),
              'text-primary',
            )}
          >
            <span className="material-symbols-outlined text-secondary text-lg" aria-hidden="true">
              ink_pen
            </span>
            {t('reviews.scrapsHeading', {}, { defaultValue: 'Desk Scraps & Drafts' })}
          </h2>
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'rounded bg-surface-container text-secondary',
            )}
          >
            {t(
              'reviews.scrapsChip',
              { count: DRAFT_FRAGMENTS.length },
              { defaultValue: '{{count}} in the tray' },
            )}
          </span>
        </div>
        <ul className={cm.cn('space-y-3', cm.sp('mt', 4))}>
          {DRAFT_FRAGMENTS.map((d) => (
            <li
              key={d.key}
              className={cm.cn(
                cm.sp('p', 4),
                'rounded-lg bg-surface-container-lowest border border-outline-variant',
              )}
            >
              <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                <p
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
                >
                  {t(`reviews.scrapsTitle.${d.key}`, {}, { defaultValue: d.title })}
                </p>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    'rounded bg-surface-container-low text-secondary shrink-0',
                  )}
                >
                  {t(`reviews.scrapsStage.${d.key}`, {}, { defaultValue: d.stage })}
                </span>
              </div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant truncate',
                  cm.sp('mt', 1),
                )}
              >
                {t(`reviews.scrapsNote.${d.key}`, {}, { defaultValue: d.note })}
              </p>
            </li>
          ))}
        </ul>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            'text-on-surface-variant',
            cm.sp('mt', 3),
            'leading-relaxed',
          )}
        >
          {t(
            'reviews.scrapsNote',
            {},
            {
              defaultValue:
                'A quiet tray for begun-but-unfinished reflections — they publish only when you say so.',
            },
          )}
        </p>
      </section>
    </div>
  )
}
