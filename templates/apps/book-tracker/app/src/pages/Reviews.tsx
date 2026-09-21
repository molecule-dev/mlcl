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
          {t('reviews.heading', {}, { defaultValue: 'Your reviews' })}
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
    </div>
  )
}
