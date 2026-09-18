/**
 * Image-led cuisine discovery card — full-bleed `4:3` photograph with a
 * dark gradient scrim, large serif cuisine name bottom-left, and a small
 * accent saffron-gold pill in the top-left for editorial framing
 * ("trending", "comfort", "celebration").
 *
 * Translated from hotel-booking's DestinationDiscoveryCard.tsx (full-
 * bleed image + dark overlay + bottom-anchored title) — same chrome,
 * but the brand pill uses Morsel's saffron-gold accent and the CTA
 * reveals on hover with the brand crimson.
 */

import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Cuisine {
  id: string
  name: string
  subtitle: string
  thumbnail: string
  pill?: string
  emoji?: string
  href?: string
}

export function CuisineDiscoveryCard({ cuisine }: { cuisine: Cuisine }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const href = cuisine.href ?? `/discover?q=${encodeURIComponent(cuisine.name)}`
  return (
    <Link
      to={href}
      className={cm.cn(
        'group relative aspect-[4/3] block overflow-hidden rounded-2xl shadow-sm hover:shadow-2xl transition-all',
      )}
    >
      <img
        src={cuisine.thumbnail}
        alt={t(
          'cuisineDiscoveryCard.imageAlt',
          { name: cuisine.name },
          { defaultValue: '{{name}} cuisine' },
        )}
        className={cm.cn(
          cm.w('full'),
          cm.h('full'),
          'absolute inset-0 object-cover transition-transform duration-700 group-hover:scale-110',
        )}
      />
      <div
        className={cm.cn(
          'absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent',
        )}
        aria-hidden="true"
      />
      {cuisine.pill ? (
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'absolute top-4 left-4 uppercase tracking-widest rounded-full bg-accent text-on-secondary backdrop-blur-md shadow-sm',
          )}
        >
          {cuisine.pill}
        </span>
      ) : null}
      <div className={cm.cn('absolute inset-x-0 bottom-0', cm.sp('p', 6))}>
        <h3
          className={cm.cn(cm.textSize('3xl'), 'text-white leading-tight')}
          style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
        >
          {cuisine.emoji ? <span className={'mr-2'}>{cuisine.emoji}</span> : null}
          {cuisine.name}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-white/85 line-clamp-2')}>
          {cuisine.subtitle}
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
          {t('cuisineDiscoveryCard.exploreCta', {}, { defaultValue: 'Browse spots' })}
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            arrow_forward
          </span>
        </span>
      </div>
    </Link>
  )
}
