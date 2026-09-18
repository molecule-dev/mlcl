import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

const DIETARY_TAGS = [
  { value: 'vegetarian', label: 'Vegetarian-friendly' },
  { value: 'vegan', label: 'Vegan options' },
  { value: 'gluten_free', label: 'Gluten-free' },
  { value: 'kid_friendly', label: 'Kid-friendly' },
  { value: 'date_night', label: 'Date night' },
  { value: 'group', label: 'Group dining' },
] as const

interface ApiRestaurant {
  id: string
  name: string
}

interface WriteReviewProps {
  /** Pre-fills the form for the EditReview derivation. */
  initial?: {
    rating?: number
    body?: string
    title?: string
    tags?: string[]
    photoUrls?: string[]
    headingOverride?: string
    submitOverride?: string
    showDelete?: boolean
    /** When set, PUT /api/reviews/:reviewId instead of POSTing a new review. */
    reviewId?: string
    /** When set, restaurant is fixed (no need to look up from URL) — used by EditReview. */
    restaurantId?: string
  }
}

export function WriteReview({ initial }: WriteReviewProps = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id: routeId } = useParams<{ id: string }>()
  const restaurantId = initial?.restaurantId ?? routeId
  const navigate = useNavigate()
  const http = useHttpClient()
  const [rating, setRating] = useState<number>(initial?.rating ?? 0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [body, setBody] = useState(initial?.body ?? '')
  const [tags, setTags] = useState<Set<string>>(new Set(initial?.tags ?? []))
  const [photos] = useState<string[]>(initial?.photoUrls ?? [])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Hydrate restaurant name so the page reads "Tasting notes for X" instead
  // of just an opaque id.
  useEffect(() => {
    if (!restaurantId) return
    let cancelled = false
    http
      .get(`/api/restaurants/${restaurantId}`)
      .then((res) => {
        if (cancelled) return
        const r = unwrapSingle<ApiRestaurant>(res)
        if (r) setRestaurantName(r.name)
      })
      .catch(() => {
        /* tolerate — heading will fall back to default */
      })
    return () => {
      cancelled = true
    }
  }, [http, restaurantId])

  const charCount = body.length
  const maxChars = 4000

  const toggleTag = (v: string) => {
    setTags((prev) => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v)
      else next.add(v)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0 || body.length < 30 || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      if (initial?.reviewId) {
        await http.put(`/api/reviews/${initial.reviewId}`, {
          rating,
          body,
          photos,
        })
      } else {
        if (!restaurantId) throw new Error('No restaurant id available')
        await http.post('/api/reviews', {
          restaurant_id: restaurantId,
          rating,
          body,
          photos,
        })
      }
      navigate(`/restaurants/${restaurantId ?? ''}`, { replace: true })
    } catch (err) {
      console.error('[WriteReview] submit failed', err)
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        setSubmitError(
          t(
            'writeReview.duplicate',
            {},
            {
              defaultValue:
                'You already reviewed this restaurant. Edit your existing review instead.',
            },
          ),
        )
      } else {
        setSubmitError(
          t(
            'writeReview.error',
            {},
            { defaultValue: 'Could not post your review. Please try again.' },
          ),
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!initial?.reviewId || deleting) return
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        t(
          'writeReview.confirmDelete',
          {},
          { defaultValue: 'Delete this review? This cannot be undone.' },
        ),
      )
    ) {
      return
    }
    setDeleting(true)
    try {
      await http.delete(`/api/reviews/${initial.reviewId}`)
      navigate(`/restaurants/${restaurantId ?? ''}`, { replace: true })
    } catch (err) {
      console.error('[WriteReview] delete failed', err)
      setSubmitError(t('writeReview.deleteError', {}, { defaultValue: 'Could not delete review.' }))
    } finally {
      setDeleting(false)
    }
  }

  const heading =
    initial?.headingOverride ??
    (restaurantName
      ? t(
          'writeReview.headingFor',
          { name: restaurantName },
          { defaultValue: 'Write a review · {{name}}' },
        )
      : t('writeReview.heading', {}, { defaultValue: 'Write a review' }))

  return (
    <main className={cm.cn(cm.maxW('2xl'), cm.sp('px', 6), cm.sp('py', 10), cm.mxAuto)}>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-[0.3em] text-primary',
        )}
      >
        {t('writeReview.eyebrow', {}, { defaultValue: 'Tasting notes' })}
      </p>
      <h1
        data-testid="write-review-heading"
        className={cm.cn(cm.textSize('5xl'), cm.sp('mt', 2), 'leading-tight')}
        style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
      >
        {heading}
      </h1>
      <p
        className={cm.cn(
          cm.textSize('base'),
          cm.sp('mt', 3),
          cm.maxW('xl'),
          'text-on-surface-variant leading-relaxed',
        )}
      >
        {t(
          'writeReview.subheading',
          {},
          {
            defaultValue:
              'Be specific and useful — what did you order, what surprised you, what would you order again?',
          },
        )}
      </p>

      <form
        onSubmit={handleSubmit}
        className={cm.cn(cm.sp('mt', 8), cm.flex({ direction: 'col', gap: 'lg' }))}
      >
        <section>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant block',
            )}
          >
            {t('writeReview.ratingLabel', {}, { defaultValue: 'Your rating' })}
          </label>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.sp('mt', 2))}>
            {[1, 2, 3, 4, 5].map((n) => {
              const active = (hoverRating || rating) >= n
              return (
                <button
                  key={n}
                  type="button"
                  data-testid={`write-review-star-${n}`}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={t(
                    'writeReview.starAria',
                    { n },
                    { defaultValue: 'Rate {{n}} out of 5' },
                  )}
                  className={cm.cn(
                    'p-1 rounded-md transition-transform hover:scale-110',
                    active ? 'text-accent-on-surface' : 'text-on-surface-variant/75',
                  )}
                >
                  <span
                    className="material-symbols-outlined text-[32px]"
                    aria-hidden="true"
                    style={{
                      fontVariationSettings: active
                        ? "'FILL' 1, 'wght' 700"
                        : "'FILL' 0, 'wght' 500",
                    }}
                  >
                    star
                  </span>
                </button>
              )
            })}
            <span className={cm.cn(cm.textSize('sm'), cm.sp('ml', 3), 'text-on-surface-variant')}>
              {rating > 0
                ? t(
                    `writeReview.label.${rating}`,
                    {},
                    {
                      defaultValue:
                        ['Bad', 'Poor', 'Average', 'Good', 'Excellent'][rating - 1] ?? '',
                    },
                  )
                : t('writeReview.tapToRate', {}, { defaultValue: 'Tap to rate' })}
            </span>
          </div>
        </section>

        <section>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant block',
            )}
          >
            {t('writeReview.bodyLabel', {}, { defaultValue: 'Your review' })}
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, maxChars))}
            data-testid="write-review-body"
            rows={10}
            placeholder={t(
              'writeReview.bodyPlaceholder',
              {},
              { defaultValue: 'What did you order? What stood out? Would you go back?' },
            )}
            className={cm.cn(
              cm.sp('mt', 2),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'w-full bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors leading-relaxed',
            )}
            style={{ fontFamily: '"Lora", Georgia, serif' }}
          />
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 2),
              cm.flex({ justify: 'between' }),
              'text-on-surface-variant',
            )}
          >
            <span>
              {t('writeReview.minLength', {}, { defaultValue: 'At least 30 characters.' })}
            </span>
            <span className="tabular-nums">
              {charCount.toLocaleString()} / {maxChars.toLocaleString()}
            </span>
          </p>
        </section>

        <section>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant block',
            )}
          >
            {t('writeReview.tagsLabel', {}, { defaultValue: 'Add useful tags' })}
          </label>
          <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }), cm.sp('mt', 3))}>
            {DIETARY_TAGS.map((tag) => {
              const active = tags.has(tag.value)
              return (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleTag(tag.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-full transition-colors',
                    active
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container',
                  )}
                >
                  {t(`writeReview.tag.${tag.value}`, {}, { defaultValue: tag.label })}
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant block',
            )}
          >
            {t('writeReview.photosLabel', {}, { defaultValue: 'Add photos' })}
          </label>
          <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }), cm.sp('mt', 3))}>
            {photos.map((url, i) => (
              <span
                key={i}
                className={cm.cn(
                  cm.w(20),
                  cm.h(20),
                  'rounded-lg overflow-hidden border border-outline-variant shrink-0',
                )}
              >
                <img
                  src={url}
                  alt=""
                  className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                />
              </span>
            ))}
            <button
              type="button"
              className={cm.cn(
                cm.w(20),
                cm.h(20),
                cm.flex({ align: 'center', justify: 'center' }),
                'rounded-lg border-2 border-dashed border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors',
              )}
              aria-label={t('writeReview.uploadAria', {}, { defaultValue: 'Upload photos' })}
            >
              <span className={'material-symbols-outlined text-2xl'} aria-hidden="true">
                add_a_photo
              </span>
            </button>
          </div>
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t('writeReview.photosHint', {}, { defaultValue: 'Up to 8 photos. JPG or PNG.' })}
          </p>
        </section>

        {submitError ? (
          <p data-testid="write-review-error" className={cm.cn('text-error text-sm')}>
            {submitError}
          </p>
        ) : null}

        <footer
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
            cm.sp('mt', 4),
          )}
        >
          <div>
            {initial?.showDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                data-testid="write-review-delete"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-primary hover:underline disabled:opacity-50',
                )}
              >
                {deleting
                  ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
                  : t('writeReview.deleteReview', {}, { defaultValue: 'Delete review' })}
              </button>
            ) : (
              <Link
                to={`/restaurants/${restaurantId ?? ''}`}
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant hover:text-primary',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </Link>
            )}
          </div>
          <button
            type="submit"
            disabled={rating === 0 || body.length < 30 || submitting}
            data-testid="write-review-submit"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 'xs', justify: 'center' }),
              'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              check
            </span>
            {submitting
              ? t('common.postingEllipsis', {}, { defaultValue: 'Posting…' })
              : (initial?.submitOverride ??
                t('writeReview.submit', {}, { defaultValue: 'Post review' }))}
          </button>
        </footer>
      </form>
    </main>
  )
}
