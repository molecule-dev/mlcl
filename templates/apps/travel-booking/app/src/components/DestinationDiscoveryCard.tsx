/**
 * Image-led destination discovery card — full-bleed `4:3` hero image with
 * a dark gradient scrim, large DM Sans display title bottom-left, and a
 * coral accent pill in the top-left for editorial framing.
 *
 * Translated from hotel-booking's DestinationDiscoveryCard.tsx — same
 * full-bleed photographic treatment, but the accent moves from gold to
 * coral to match travel-booking's wanderlust palette.
 */

import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Destination {
  id: string
  name: string
  subtitle: string
  thumbnail: string
  pill?: string
  href?: string
}

export function DestinationDiscoveryCard({ destination }: { destination: Destination }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const href = destination.href ?? `/search?q=${encodeURIComponent(destination.name)}`
  return (
    <Link
      to={href}
      className={cm.cn(
        'group relative aspect-[4/5] block overflow-hidden rounded-lg shadow-sm hover:shadow-2xl transition-all',
      )}
    >
      <img
        src={destination.thumbnail}
        alt={t(
          'common.photographOf',
          { name: destination.name },
          { defaultValue: 'Photograph of {{name}}' },
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
      {destination.pill ? (
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'absolute top-4 left-4 uppercase tracking-widest rounded-full bg-accent/95 text-on-accent backdrop-blur-md',
          )}
        >
          {destination.pill}
        </span>
      ) : null}
      <div className={cm.cn('absolute inset-x-0 bottom-0', cm.sp('p', 6))}>
        <h3
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('extrabold'),
            'text-white leading-tight tracking-tight font-headline',
          )}
        >
          {destination.name}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-white/85 line-clamp-2')}>
          {destination.subtitle}
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
          {t('destinationDiscoveryCard.exploreCta', {}, { defaultValue: 'Explore stays' })}
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            arrow_forward
          </span>
        </span>
      </div>
    </Link>
  )
}
