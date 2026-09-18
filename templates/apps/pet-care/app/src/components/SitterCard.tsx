import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Sitter directory card — gradient avatar, star rating, specialties pill
 * row, availability pill, hourly price (extrabold primary), full-width
 * book CTA. Spec'd in DESIGN.md "Sitter Card".
 *
 * Translated from health-records' MedicationCard.tsx (rounded-2xl shell +
 * pill metadata) and from helpdesk-ticketing's TicketCard pattern, recoloured
 * to Nuzzle palette and re-shaped for a marketplace card with rating + price.
 */
export type SitterAvailability = 'available' | 'booked' | 'unavailable'

export interface SitterCardProps {
  id?: string
  name: string
  /** Optional avatar URL. */
  photoUrl?: string
  /** 0..5 rating, can be fractional. */
  rating: number
  reviewCount: number
  /** Specialty tags, e.g. ["Dog walking", "Overnight care"]. */
  specialties: ReadonlyArray<string>
  /** Hourly price in USD (no cents). */
  hourlyRate: number
  availability: SitterAvailability
  /** One-line bio summary. */
  bio?: string
  /** City / neighborhood, e.g. "Brooklyn, NY". */
  location?: string
}

const AVAILABILITY_PILL: Record<SitterAvailability, string> = {
  available: 'bg-success-container text-on-success-container',
  booked: 'bg-info-container text-on-info-container',
  unavailable: 'bg-surface-container-high text-on-surface-variant',
}

function StarRating({ rating }: { rating: number }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const stars = []
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) stars.push('full')
    else if (rating >= i - 0.5) stars.push('half')
    else stars.push('empty')
  }
  return (
    <span
      className={cm.cn(cm.flex({ align: 'center' }))}
      aria-label={t(
        'sitterCard.ratingAria',
        { rating },
        { defaultValue: 'Rating: {{rating}} out of 5' },
      )}
    >
      {stars.map((s, i) => (
        <span
          key={i}
          className={cm.cn('material-symbols-outlined text-base')}
          style={{
            color: s === 'empty' ? 'var(--color-star-empty)' : 'var(--color-pet-attention)',
            fontVariationSettings: s === 'empty' ? "'FILL' 0" : "'FILL' 1",
            fontSize: '18px',
          }}
          aria-hidden="true"
        >
          {s === 'half' ? 'star_half' : 'star'}
        </span>
      ))}
    </span>
  )
}

export function SitterCard({
  id,
  name,
  photoUrl,
  rating,
  reviewCount,
  specialties,
  hourlyRate,
  availability,
  bio,
  location,
}: SitterCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <article
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('p', 5),
        'rounded-2xl bg-surface-container-lowest shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all h-full',
      )}
    >
      <div className={cm.flex({ align: 'center', gap: 'md' })}>
        <div
          className={cm.cn(
            cm.shrink0,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            'overflow-hidden text-white text-base font-bold shadow-sm',
          )}
          style={{
            width: '56px',
            height: '56px',
            background: photoUrl
              ? undefined
              : 'linear-gradient(135deg, var(--color-pet-booked), var(--color-pet-healthy))',
          }}
          aria-hidden="true"
        >
          {photoUrl ? (
            <img src={photoUrl} alt={name} className={cm.cn('w-full h-full object-cover')} />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className={cm.cn(cm.flex1, 'min-w-0')}>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'truncate')}>{name}</p>
          {location && (
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
              {location}
            </p>
          )}
        </div>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.shrink0,
            'px-3 py-1 text-[10px] uppercase tracking-widest rounded-full',
            AVAILABILITY_PILL[availability],
          )}
        >
          {t(
            `sitterCard.availability.${availability}`,
            {},
            {
              defaultValue:
                availability === 'available'
                  ? 'Available'
                  : availability === 'booked'
                    ? 'Booked'
                    : 'Unavailable',
            },
          )}
        </span>
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.sp('mt', 3))}>
        <StarRating rating={rating} />
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'text-on-surface-variant tabular-nums',
          )}
        >
          {t(
            'sitterCard.ratingMeta',
            { rating: rating.toFixed(1), reviews: reviewCount },
            { defaultValue: '{{rating}} · {{reviews}} reviews' },
          )}
        </span>
      </div>

      {bio && (
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 3), 'text-on-surface line-clamp-2')}>
          {bio}
        </p>
      )}

      {specialties.length > 0 && (
        <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }), cm.sp('mt', 3))}>
          {specialties.slice(0, 4).map((s) => (
            <span
              key={s}
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'px-2.5 py-1 rounded-full bg-primary-container text-on-primary-container',
              )}
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mt', 5))}>
        <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-primary tabular-nums')}>
          {t('sitterCard.hourlyRate', { rate: hourlyRate }, { defaultValue: '${{rate}}/hr' })}
        </p>
        {id ? (
          <Link
            to={`/sitters/${id}`}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'text-white rounded-xl hover:shadow-lg active:scale-95 transition-all',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--color-pet-booked), var(--color-pet-healthy))',
            }}
          >
            {t('sitterCard.viewProfile', {}, { defaultValue: 'View profile' })}
          </Link>
        ) : null}
      </div>
    </article>
  )
}

export default SitterCard
