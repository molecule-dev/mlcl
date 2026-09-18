import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BookSitterModal } from '../components/BookSitterModal.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface ApiSitter {
  id: string
  display_name?: string
  bio?: string
  avg_rating?: number | string
  total_bookings?: number
  hourly_rate_cents?: number
  services?: string[]
  is_active?: boolean
  is_verified?: boolean
  location_city?: string
  photo_url?: string
}

interface ApiReview {
  id: string
  reviewer_user_id?: string
  reviewer_name?: string
  rating: number
  body?: string
  created_at?: string
}

/** English defaults for known service keys — rendered through t() below. */
const SPECIALTY_LABELS: Record<string, string> = {
  walks: 'Dog walking',
  drop_in: 'Drop-in visits',
  overnight: 'Overnight',
  boarding: 'Boarding',
  medication: 'Medication',
}

function StarRow({ rating }: { rating: number }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <span
      className={cm.cn(cm.flex({ align: 'center' }))}
      aria-label={t('sitterDetail.ratingAria', { rating }, { defaultValue: '{{rating}} out of 5' })}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const filled = rating >= i + 1
        const half = !filled && rating >= i + 0.5
        return (
          <span
            key={i}
            className={cm.cn('material-symbols-outlined')}
            style={{
              color: filled || half ? 'var(--color-pet-attention)' : 'var(--color-star-empty)',
              fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0",
              fontSize: '20px',
            }}
            aria-hidden="true"
          >
            {half ? 'star_half' : 'star'}
          </span>
        )
      })}
    </span>
  )
}

export function SitterDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [sitter, setSitter] = useState<ApiSitter | null>(null)
  const [reviews, setReviews] = useState<ApiReview[]>([])
  const [loading, setLoading] = useState(true)
  const [bookOpen, setBookOpen] = useState(false)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/sitters/${id}`)
      .then((res) => {
        if (cancelled) return
        setSitter(unwrapSingle<ApiSitter>(res))
      })
      .catch((err: unknown) => {
        console.error('[SitterDetail] failed to load sitter', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    http
      .get(`/api/sitters/${id}/reviews`)
      .then((res) => {
        if (cancelled) return
        setReviews(unwrapList<ApiReview>(res))
      })
      .catch((err: unknown) => {
        console.error('[SitterDetail] failed to load reviews', err)
      })
    return () => {
      cancelled = true
    }
  }, [http, id])

  if (loading && !sitter) {
    return (
      <div className={cm.cn(cm.maxW('6xl'), cm.mxAuto, cm.sp('p', 8))}>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('sitterDetail.loading', {}, { defaultValue: 'Loading sitter…' })}
        </p>
      </div>
    )
  }
  if (!sitter) {
    return (
      <div className={cm.cn(cm.maxW('6xl'), cm.mxAuto, cm.sp('p', 8))}>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('sitterDetail.notFound', {}, { defaultValue: 'Sitter not found.' })}
        </p>
        <Link to="/sitters" className={cm.cn(cm.sp('mt', 4), 'text-primary')}>
          {t('sitterDetail.back', {}, { defaultValue: 'Back to sitters' })}
        </Link>
      </div>
    )
  }

  const name = sitter.display_name ?? t('sitters.unnamed', {}, { defaultValue: 'Unnamed sitter' })
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  const rating =
    typeof sitter.avg_rating === 'string' ? Number(sitter.avg_rating) : (sitter.avg_rating ?? 0)
  const reviewCount = sitter.total_bookings ?? 0
  const hourlyRate = sitter.hourly_rate_cents ? Math.round(sitter.hourly_rate_cents / 100) : 0
  const isAvailable = sitter.is_active !== false
  const specialties = (sitter.services ?? []).map((s) =>
    t(`sitters.services.${s}`, {}, { defaultValue: SPECIALTY_LABELS[s] ?? s }),
  )

  return (
    <div
      className={cm.cn(cm.maxW('6xl'), cm.mxAuto, cm.sp('p', 8))}
      data-mol-id="page-sitter-detail"
    >
      <Link
        to="/sitters"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          cm.sp('mb', 4),
          'inline-flex text-on-surface-variant hover:text-primary',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
        {t('sitterDetail.back', {}, { defaultValue: 'Back to sitters' })}
      </Link>

      <section
        className={cm.cn(cm.sp('p', 8), 'rounded-2xl bg-surface-container-lowest shadow-sm')}
      >
        <div className={cm.cn(cm.flex({ align: 'start', gap: 'lg', wrap: 'wrap' }))}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'overflow-hidden text-white text-2xl font-bold shadow-md',
            )}
            style={{
              width: '96px',
              height: '96px',
              background:
                'linear-gradient(135deg, var(--color-pet-booked), var(--color-pet-healthy))',
            }}
            aria-hidden="true"
          >
            {sitter.photo_url ? (
              <img
                src={sitter.photo_url}
                alt={name}
                className={cm.cn('w-full h-full object-cover')}
              />
            ) : (
              initials
            )}
          </div>
          <div className={cm.cn(cm.flex1, 'min-w-0')}>
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-widest text-primary-dark dark:text-primary mb-1',
              )}
            >
              {t('sitterDetail.eyebrow', {}, { defaultValue: 'Sitter profile' })}
            </p>
            <h1
              className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
              data-mol-id="sitter-name"
            >
              {name}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {sitter.location_city || '—'}
              {sitter.is_verified
                ? ` · ${t('sitterDetail.verified', {}, { defaultValue: 'Verified' })}`
                : ''}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.sp('mt', 2))}>
              <StarRow rating={rating} />
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant tabular-nums',
                )}
              >
                {rating.toFixed(2)} · {reviewCount}{' '}
                {t('sitterDetail.bookingsLabel', {}, { defaultValue: 'bookings' })}
              </span>
            </div>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', align: 'end', gap: 'xs' }))}>
            {hourlyRate > 0 && (
              <p
                className={cm.cn(
                  cm.textSize('2xl'),
                  cm.fontWeight('bold'),
                  'text-primary tabular-nums',
                )}
              >
                ${hourlyRate}/hr
              </p>
            )}
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'px-3 py-1 text-[10px] uppercase tracking-widest rounded-full',
                isAvailable
                  ? 'bg-success-container text-on-success-container'
                  : 'bg-surface-container-high text-on-surface-variant',
              )}
            >
              {isAvailable
                ? t('sitterDetail.available', {}, { defaultValue: 'Available' })
                : t('sitterDetail.unavailable', {}, { defaultValue: 'Unavailable' })}
            </span>
          </div>
        </div>

        {sitter.bio && (
          <p
            className={cm.cn(
              cm.textSize('base'),
              cm.sp('mt', 5),
              'text-on-surface leading-relaxed',
            )}
          >
            {sitter.bio}
          </p>
        )}

        {specialties.length > 0 && (
          <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }), cm.sp('mt', 4))}>
            {specialties.map((sp) => (
              <span
                key={sp}
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'px-3 py-1 rounded-full bg-primary-container text-on-primary-container',
                )}
              >
                {sp}
              </span>
            ))}
          </div>
        )}

        <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }), cm.sp('mt', 6))}>
          <button
            type="button"
            onClick={() => setBookOpen(true)}
            disabled={!isAvailable}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-xl text-white hover:shadow-lg active:scale-95 transition-all disabled:opacity-50',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--color-pet-booked), var(--color-pet-healthy))',
            }}
            data-mol-id="cta-book-sitter"
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>event_available</span>
            {t('sitterDetail.bookCta', {}, { defaultValue: 'Book a visit' })}
          </button>
        </div>
      </section>

      {/* Reviews */}
      <section className={cm.cn(cm.sp('mt', 8))}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
          {t(
            'sitterDetail.reviewsTitle',
            { count: reviews.length },
            { defaultValue: 'Recent reviews · {{count}}' },
          )}
        </h2>
        {reviews.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'sitterDetail.noReviews',
              {},
              { defaultValue: 'No reviews yet — be the first to book.' },
            )}
          </p>
        ) : (
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {reviews.map((r) => (
              <article
                key={r.id}
                className={cm.cn(cm.sp('p', 5), 'rounded-xl bg-surface-container-lowest shadow-sm')}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mb', 2),
                  )}
                >
                  <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                    <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                      {r.reviewer_name ??
                        t('sitterDetail.anonymousReviewer', {}, { defaultValue: 'Anonymous' })}
                    </span>
                    <StarRow rating={r.rating} />
                  </span>
                  {r.created_at && (
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {new Date(r.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
                {r.body && <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>{r.body}</p>}
              </article>
            ))}
          </div>
        )}
      </section>

      <BookSitterModal
        sitter={sitter}
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        onCreated={(bookingId) => {
          navigate(`/bookings/${bookingId}`)
        }}
      />
    </div>
  )
}
