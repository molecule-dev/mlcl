/**
 * Editorial circular category tile — full-bleed `4:3` photograph with
 * dark gradient scrim, large category name in DM Sans bold bottom-left,
 * and a copper accent count pill in the top-right.
 *
 * Translated from hotel-booking's DestinationDiscoveryCard.tsx —
 * reused for Alcove's space-type browsing rail (Studios, Lofts, Gardens,
 * Rooftops, Banquet halls, Workshops).
 */

import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface VenueCategory {
  id: string
  name: string
  subtitle: string
  thumbnail: string
  count?: number
  href?: string
}

export function CategoryTile({ category }: { category: VenueCategory }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const href = category.href ?? `/search?type=${encodeURIComponent(category.id)}`
  return (
    <Link
      to={href}
      className={cm.cn(
        'group relative aspect-[4/3] block overflow-hidden rounded-2xl shadow-sm hover:shadow-2xl transition-all',
      )}
    >
      <img
        src={category.thumbnail}
        alt={t(
          'categoryTile.imageAlt',
          { name: category.name },
          { defaultValue: 'Photograph of a {{name}} space' },
        )}
        className={cm.cn(
          cm.w('full'),
          cm.h('full'),
          'absolute inset-0 object-cover transition-transform duration-700 group-hover:scale-110',
        )}
      />
      <div
        className={cm.cn(
          'absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent',
        )}
        aria-hidden="true"
      />
      {typeof category.count === 'number' ? (
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'absolute top-4 right-4 uppercase tracking-widest rounded-full bg-accent/95 text-on-primary backdrop-blur-md tabular-nums',
          )}
        >
          {t('categoryTile.count', { count: category.count }, { defaultValue: '{{count}} spaces' })}
        </span>
      ) : null}
      <div className={cm.cn('absolute inset-x-0 bottom-0', cm.sp('p', 6))}>
        <h3
          className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-white leading-tight')}
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '-0.02em' }}
        >
          {category.name}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-white/85 line-clamp-2')}>
          {category.subtitle}
        </p>
        <span
          className={cm.cn(
            cm.sp('mt', 3),
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-accent opacity-0 group-hover:opacity-100 transition-opacity',
          )}
        >
          {t('categoryTile.exploreCta', {}, { defaultValue: 'Browse spaces' })}
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            arrow_forward
          </span>
        </span>
      </div>
    </Link>
  )
}
