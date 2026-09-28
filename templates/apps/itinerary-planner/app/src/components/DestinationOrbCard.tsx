/**
 * Image-led destination discovery card — full-bleed `4:3` cover with a
 * dark gradient scrim, large Plus Jakarta Sans display title bottom-left,
 * and a coral accent pill in the top-left ("Editor pick", "Coastal",
 * "Adventure", etc.) for editorial framing.
 *
 * Translated from travel-booking's DestinationDiscoveryCard.tsx — same
 * full-bleed photographic treatment, but the type comes through Plus
 * Jakarta Sans (per Waypoint DESIGN.md), and the "Add to trip" CTA pill
 * appears on hover so a planner can pull a destination into a trip in a
 * single click.
 */

import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface Destination {
  id: string
  name: string
  region: string
  blurb: string
  thumbnail: string
  pill?: string
  trip_count?: number
}

export function DestinationOrbCard({ destination }: { destination: Destination }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Link
      to={`/trips/new?destination=${encodeURIComponent(destination.name)}&country=${encodeURIComponent(destination.region.split(/[·•]/)[0]?.trim() ?? '')}&from=${encodeURIComponent(destination.id)}`}
      className={cm.cn(
        'group relative aspect-[4/3] block overflow-hidden rounded-2xl shadow-sm hover:shadow-2xl transition-all',
      )}
      data-testid={`destination-orb-card-${destination.id}`}
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
      <div
        className={cm.cn(
          cm.w(40),
          cm.h(40),
          cm.roundedFull,
          'absolute -right-12 -top-12 bg-accent/30 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity',
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
            'absolute top-4 left-4 uppercase tracking-widest rounded-full bg-accent/95 text-on-primary backdrop-blur-md',
          )}
        >
          {destination.pill}
        </span>
      ) : null}
      {typeof destination.trip_count === 'number' && destination.trip_count > 0 ? (
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'xs' }),
            'absolute top-4 right-4 uppercase tracking-widest rounded-full bg-surface/95 text-on-surface backdrop-blur-md',
          )}
        >
          <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
            luggage
          </span>
          {t(
            'destinationOrbCard.tripCount',
            { count: destination.trip_count },
            { defaultValue: '{{count}} trips' },
          )}
        </span>
      ) : null}
      <div className={cm.cn('absolute inset-x-0 bottom-0', cm.sp('p', 6))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-white/80',
          )}
        >
          {destination.region}
        </p>
        <h3
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('extrabold'),
            cm.sp('mt', 1),
            'text-white leading-tight tracking-tight',
          )}
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {destination.name}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-white/85 line-clamp-2')}>
          {destination.blurb}
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
          {t('destinationOrbCard.exploreCta', {}, { defaultValue: 'Add to a trip' })}
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            add_circle
          </span>
        </span>
      </div>
    </Link>
  )
}
