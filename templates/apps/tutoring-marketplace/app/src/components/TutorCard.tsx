import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Featured/result tutor card — circular avatar overlapping a soft surface
 * card, headline, verified pill, subject pills (max 3 + "+N"), star rating,
 * hourly rate. Hover lifts the card and deepens the shadow.
 *
 * Translated from personal-finance's account triad pattern + lms's CourseCard
 * hover treatment.
 */

export type TutorCardProps = {
  id: string
  name: string
  avatarSeed?: string
  headline: string
  subjects: string[]
  ratePerHour: number
  rating: number
  reviewCount: number
  verified?: boolean
  topRated?: boolean
  online?: boolean
}

export function TutorCard({
  id,
  name,
  avatarSeed,
  headline,
  subjects,
  ratePerHour,
  rating,
  reviewCount,
  verified = false,
  topRated = false,
  online = false,
}: TutorCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visibleSubjects = subjects.slice(0, 3)
  const overflow = Math.max(0, subjects.length - 3)
  const seed = avatarSeed ?? id

  return (
    <Link
      to={`/tutor/${id}`}
      data-mol-id={`tutor-card-${id}`}
      className={cm.cn(
        'relative group bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg pt-12 pb-6 px-6 mt-12 block',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center' }),
          'absolute -top-10 left-1/2 -translate-x-1/2',
        )}
      >
        <div
          className={cm.cn(
            'relative rounded-full ring-4 ring-surface-container-lowest shadow-md overflow-hidden',
          )}
          style={{ width: 80, height: 80 }}
        >
          <img
            src={`https://i.pravatar.cc/160?u=${encodeURIComponent(seed)}`}
            alt={t('tutorCard.avatarAlt', { name }, { defaultValue: 'Portrait of {{name}}' })}
            className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
          />
          {online && (
            <span
              aria-hidden="true"
              className={cm.cn(
                'absolute bottom-1 right-1 w-3 h-3 rounded-full ring-2 ring-surface-container-lowest',
              )}
              style={{ backgroundColor: 'var(--chalk-available)' }}
            />
          )}
        </div>
      </div>

      <div className={cm.cn(cm.textCenter, cm.stack(2))}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'xs' }))}>
          <h3
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('lg'),
              'font-display tracking-tight',
            )}
          >
            {name}
          </h3>
          {verified && (
            <span
              aria-label={t('tutorCard.verified', {}, { defaultValue: 'Verified tutor' })}
              className={cm.cn('material-symbols-outlined text-base')}
              style={{ color: 'var(--chalk-verified)', fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
          )}
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant line-clamp-2 min-h-10')}>
          {headline}
        </p>

        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.sp('mt', 1),
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-base')}
            style={{ color: 'var(--chalk-top-rated)', fontVariationSettings: "'FILL' 1" }}
          >
            star
          </span>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
            {rating.toFixed(1)}
          </span>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            (
            {t(
              'common.countReviews',
              { count: reviewCount },
              { defaultValue: '{{count}} reviews' },
            )}
            )
          </span>
        </div>

        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            'flex-wrap',
            cm.sp('mt', 3),
          )}
        >
          {visibleSubjects.map((subject) => (
            <span
              key={subject}
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'rounded-full px-3 py-1',
              )}
              style={{
                backgroundColor: 'var(--chalk-booked-light)',
                color: 'var(--mol-color-primary-dark)',
              }}
            >
              {subject}
            </span>
          ))}
          {overflow > 0 && (
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'rounded-full px-3 py-1 bg-surface-container text-on-surface-variant',
              )}
            >
              {t('tutorCard.subjectOverflow', { count: overflow }, { defaultValue: '+{{count}}' })}
            </span>
          )}
        </div>

        <div
          className={cm.cn(
            cm.flex({ align: 'baseline', justify: 'between' }),
            cm.sp('mt', 5),
            cm.sp('pt', 4),
            'border-t border-outline-variant/30',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'xs' }))}>
            <span
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                'font-display tracking-tight tabular-nums',
              )}
            >
              ${ratePerHour}
            </span>
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('tutorCard.perHour', {}, { defaultValue: '/ hr' })}
            </span>
          </div>
          {topRated && (
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'rounded-full px-2 py-0.5 uppercase tracking-widest',
              )}
              style={{
                backgroundColor: 'var(--chalk-top-rated-light)',
                color: 'var(--chalk-top-rated)',
                fontSize: '0.625rem',
              }}
            >
              {t('tutorCard.topRated', {}, { defaultValue: 'Top rated' })}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default TutorCard
