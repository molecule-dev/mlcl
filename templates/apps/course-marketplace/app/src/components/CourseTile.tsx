/**
 * Course marketplace tile — 16:9 cover image, optional badge, title,
 * instructor, star rating, review count, price (with optional sale
 * strikethrough). Bestseller / New / Free badges sit top-left absolute.
 *
 * Translated from lms's CourseCard.tsx (image-over-card editorial
 * treatment) into the Lectura purple/gold palette per DESIGN.md.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type CourseTileBadge = 'bestseller' | 'new' | 'free'

export type CourseTileProps = {
  id: string
  title: string
  instructor: string
  rating: number
  reviewCount: number
  priceCents?: number
  originalPriceCents?: number
  imageSeed?: string
  badge?: CourseTileBadge
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function StarRow({ rating }: { rating: number }) {
  const cm = getClassMap()
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  const stars: string[] = []
  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push('star')
    else if (i === full && half) stars.push('star_half')
    else stars.push('star_outline')
  }
  return (
    <div
      className={cm.cn(cm.flex({ align: 'center' }), 'text-[var(--market-star)]')}
      aria-hidden="true"
    >
      {stars.map((name, i) => (
        <span key={i} className={cm.cn('material-symbols-outlined filled-icon text-[16px]')}>
          {name}
        </span>
      ))}
    </div>
  )
}

export function CourseTile(props: CourseTileProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const seed = props.imageSeed ?? `course-${props.id}`
  const badgeMap: Record<CourseTileBadge, { label: string; cls: string }> = {
    bestseller: {
      label: t('courseTile.badge.bestseller', {}, { defaultValue: 'Bestseller' }),
      cls: 'bg-secondary-container text-on-secondary-container',
    },
    new: {
      label: t('status.new', {}, { defaultValue: 'New' }),
      cls: 'bg-primary text-on-primary',
    },
    free: {
      label: t('nav.free', {}, { defaultValue: 'Free' }),
      cls: 'bg-[var(--color-lectura-green)] text-white',
    },
  }
  const badge = props.badge ? badgeMap[props.badge] : null
  return (
    <Link
      to={`/courses/${props.id}`}
      data-mol-id={`course-tile-${props.id}`}
      className={cm.cn(
        'group flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-[0px_12px_32px_rgba(75,8,201,0.08)] transition-all duration-300',
      )}
    >
      <div className={cm.cn('relative aspect-video overflow-hidden')}>
        <img
          alt={props.title}
          className={cm.cn(
            'w-full h-full object-cover group-hover:scale-105 transition-transform duration-500',
          )}
          src={`https://picsum.photos/seed/${seed}/640/360`}
        />
        {badge && (
          <span
            className={cm.cn(
              'absolute top-3 left-3 px-2.5 py-1 rounded text-[10px] font-bold tracking-widest uppercase shadow-sm',
              badge.cls,
            )}
          >
            {badge.label}
          </span>
        )}
      </div>
      <div className={cm.cn(cm.sp('p', 5), 'flex flex-col flex-grow gap-2')}>
        <h3
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('base'),
            'leading-tight text-on-surface line-clamp-2 group-hover:text-primary transition-colors',
          )}
        >
          {props.title}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), 'text-primary-container font-medium')}>
          {props.instructor}
        </p>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.sp('mt', 1))}>
          <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-on-surface')}>
            {props.rating.toFixed(1)}
          </span>
          <StarRow rating={props.rating} />
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            ({props.reviewCount.toLocaleString()})
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 2 }), cm.sp('mt', 2))}>
          {props.priceCents === undefined ? (
            <span
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                'text-[var(--color-lectura-green)]',
              )}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {t('nav.free', {}, { defaultValue: 'Free' })}
            </span>
          ) : (
            <>
              <span
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatPrice(props.priceCents)}
              </span>
              {props.originalPriceCents !== undefined &&
                props.originalPriceCents > props.priceCents && (
                  <span
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant line-through')}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatPrice(props.originalPriceCents)}
                  </span>
                )}
            </>
          )}
        </div>
      </div>
    </Link>
  )
}

export default CourseTile
