import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { unwrapSingle } from '../lib/unwrap.js'

const MAX_PHOTOS = 8

/** Design "Tips for great reviews" accordion — static advice, i18n-keyed. */
const REVIEW_TIPS: Array<{ summaryKey: string; summary: string; bodyKey: string; body: string }> = [
  {
    summaryKey: 'writeReview.tips.flavorsSummary',
    summary: 'Be specific about flavors',
    bodyKey: 'writeReview.tips.flavorsBody',
    body: 'Instead of "it was good," try describing the texture and dominant spices. Was it crispy? Savory? Bright with citrus?',
  },
  {
    summaryKey: 'writeReview.tips.serviceSummary',
    summary: 'Mention the service and vibe',
    bodyKey: 'writeReview.tips.serviceBody',
    body: 'Did the staff make great recommendations? Was the lighting romantic or bright and energetic?',
  },
  {
    summaryKey: 'writeReview.tips.contextSummary',
    summary: 'Include context',
    bodyKey: 'writeReview.tips.contextBody',
    body: 'Was this a special occasion dinner, a quick work lunch, or a family gathering? Context helps others decide.',
  },
  {
    summaryKey: 'writeReview.tips.photosSummary',
    summary: 'Upload clear photos',
    bodyKey: 'writeReview.tips.photosBody',
    body: 'Photos taken in natural light or with steady hands in dim light are immensely helpful to other diners.',
  },
]

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
  const [photos, setPhotos] = useState<string[]>(initial?.photoUrls ?? [])
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState<string | null>(null)

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

  const addPhoto = () => {
    const url = photoUrl.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url)) {
      setPhotoError(
        t(
          'writeReview.photoUrlInvalid',
          {},
          { defaultValue: 'Enter a full image URL (https://…).' },
        ),
      )
      return
    }
    if (photos.length >= MAX_PHOTOS) {
      setPhotoError(
        t('writeReview.photoLimit', { max: MAX_PHOTOS }, { defaultValue: 'Up to {{max}} photos.' }),
      )
      return
    }
    setPhotoError(null)
    setPhotos((prev) => [...prev, url])
    setPhotoUrl('')
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
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
        void track({
          name: 'review.updated',
          properties: { review_id: initial.reviewId, restaurant_id: restaurantId, rating },
        })
      } else {
        if (!restaurantId) throw new Error('No restaurant id available')
        const created = await http.post('/api/reviews', {
          restaurant_id: restaurantId,
          rating,
          body,
          photos,
        })
        const createdId =
          unwrapSingle<{ id: string }>(created)?.id ??
          (restaurantId ? `${restaurantId}:new` : 'unknown')
        void track({
          name: 'review.created',
          properties: { review_id: createdId, restaurant_id: restaurantId, rating },
        })
        void track({
          name: 'rating.submitted',
          properties: { restaurant_id: restaurantId, rating },
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
    if (!initial?.reviewId) return
    try {
      await http.delete(`/api/reviews/${initial.reviewId}`)
      void track({
        name: 'review.deleted',
        properties: { review_id: initial.reviewId, restaurant_id: restaurantId },
      })
      navigate(`/restaurants/${restaurantId ?? ''}`, { replace: true })
    } catch (err) {
      console.error('[WriteReview] delete failed', err)
      setSubmitError(t('writeReview.deleteError', {}, { defaultValue: 'Could not delete review.' }))
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
            htmlFor="write-review-photo-url"
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
                key={`${url}-${i}`}
                className={cm.cn(
                  'relative block',
                  cm.w(20),
                  cm.h(20),
                  'rounded-lg overflow-hidden border border-outline-variant shrink-0',
                )}
              >
                <img
                  src={url}
                  alt={t('writeReview.photoAlt', { n: i + 1 }, { defaultValue: 'Photo {{n}}' })}
                  className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  aria-label={t(
                    'writeReview.photoRemove',
                    { n: i + 1 },
                    { defaultValue: 'Remove photo {{n}}' },
                  )}
                  className={cm.cn(
                    cm.w(7),
                    cm.h(7),
                    cm.flex({ align: 'center', justify: 'center' }),
                    'absolute top-0.5 right-0.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors',
                  )}
                >
                  <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                    close
                  </span>
                </button>
              </span>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <span
                className={cm.cn(
                  cm.w(20),
                  cm.h(20),
                  cm.flex({ align: 'center', justify: 'center' }),
                  'rounded-lg border-2 border-dashed border-outline-variant text-on-surface-variant shrink-0',
                )}
                aria-hidden={photoUrl.length > 0 ? undefined : true}
              >
                <span className={'material-symbols-outlined text-2xl'} aria-hidden="true">
                  add_a_photo
                </span>
              </span>
            ) : null}
          </div>
          <div className={cm.cn(cm.flex({ gap: 'xs' }), cm.sp('mt', 3))}>
            <input
              id="write-review-photo-url"
              type="url"
              inputMode="url"
              value={photoUrl}
              onChange={(e) => {
                setPhotoUrl(e.target.value)
                if (photoError) setPhotoError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addPhoto()
                }
              }}
              data-testid="write-review-photo-url"
              placeholder={t(
                'writeReview.photoUrlPlaceholder',
                {},
                { defaultValue: 'Paste an image URL (https://…)' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'flex-1 min-w-0 bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
              )}
            />
            <button
              type="button"
              onClick={addPhoto}
              disabled={photos.length >= MAX_PHOTOS}
              data-testid="write-review-photo-add"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50',
              )}
            >
              {t('writeReview.photoAdd', {}, { defaultValue: 'Add' })}
            </button>
          </div>
          {photoError ? (
            <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-error')} role="alert">
              {photoError}
            </p>
          ) : null}
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'writeReview.photosHint',
              { max: MAX_PHOTOS },
              { defaultValue: 'Up to {{max}} photos — paste image links from the web.' },
            )}
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
              <ConfirmButton
                label={t('writeReview.deleteReview', {}, { defaultValue: 'Delete review' })}
                confirmLabel={t(
                  'writeReview.confirmDelete',
                  {},
                  { defaultValue: 'Delete this review? This cannot be undone.' },
                )}
                pendingLabel={t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })}
                onConfirm={handleDelete}
                disarmSeconds={6}
                color="error"
                size="sm"
                data-testid="write-review-delete"
              />
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

      <aside
        data-testid="review-tips"
        aria-labelledby="review-tips-title"
        className={cm.cn(
          cm.sp('mt', 8),
          'rounded-xl bg-surface-container p-5 border border-outline-variant/60',
        )}
      >
        <h2
          id="review-tips-title"
          className={cm.cn(
            cm.textSize('base'),
            cm.fontWeight('semibold'),
            'flex items-center gap-2',
          )}
        >
          <span className="material-symbols-outlined text-accent" aria-hidden="true">
            lightbulb
          </span>
          {t('writeReview.tipsTitle', {}, { defaultValue: 'Tips for great reviews' })}
        </h2>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('mt', 4))}>
          {REVIEW_TIPS.map((tip) => (
            <details
              key={tip.summaryKey}
              className="group border-b border-outline-variant/40 pb-2 last:border-0"
            >
              <summary
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'xs' }),
                  'cursor-pointer list-none text-sm font-medium text-on-surface hover:text-primary transition-colors',
                )}
              >
                {t(tip.summaryKey, {}, { defaultValue: tip.summary })}
                <span
                  className="material-symbols-outlined text-sm transition-transform group-open:rotate-180"
                  aria-hidden="true"
                >
                  expand_more
                </span>
              </summary>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mt', 2),
                  'text-on-surface-variant leading-relaxed',
                )}
              >
                {t(tip.bodyKey, {}, { defaultValue: tip.body })}
              </p>
            </details>
          ))}
        </div>
      </aside>
    </main>
  )
}
