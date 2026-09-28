/**
 * Forest-teal gradient hero with embedded venue search form for the
 * Landing and Search pages. Decorative copper-orb glow, frosted-glass
 * search bar overlay, brand-headline in DM Sans extrabold, and a trust
 * strip naming the things venue planners actually care about.
 *
 * Translated from hotel-booking's SojournHeroSearchCard.tsx — same
 * gradient + decorative-orb composition, with the search-form segments
 * adapted to Alcove's space-type / capacity / hourly-or-daily axes
 * called out in DESIGN.md.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

const SPACE_TYPES = [
  { value: '', labelKey: 'any', defaultLabel: 'Any space' },
  { value: 'studio', labelKey: 'studio', defaultLabel: 'Studio' },
  { value: 'loft', labelKey: 'loft', defaultLabel: 'Loft' },
  { value: 'rooftop', labelKey: 'rooftop', defaultLabel: 'Rooftop' },
  { value: 'garden', labelKey: 'garden', defaultLabel: 'Garden' },
  { value: 'banquet', labelKey: 'banquet', defaultLabel: 'Banquet hall' },
] as const

export function AlcoveHeroSearchCard({ compact = false }: { compact?: boolean }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [location, setLocation] = useState('')
  const [spaceType, setSpaceType] = useState('')
  const [date, setDate] = useState('')
  const [guests, setGuests] = useState(20)

  function search(e: React.FormEvent) {
    e.preventDefault()
    const q = new URLSearchParams()
    if (location) q.set('q', location)
    if (spaceType) q.set('type', spaceType)
    if (date) q.set('date', date)
    q.set('guests', String(guests))
    navigate(`/search?${q.toString()}`)
  }

  return (
    <section
      className={cm.cn(
        cm.sp('p', compact ? 6 : 10),
        cm.flex({ direction: 'col', justify: 'between' }),
        compact ? 'min-h-[200px]' : 'min-h-[520px]',
        'bg-gradient-to-br from-forest-deep to-primary rounded-[2rem] text-on-primary relative overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-24 -top-24 bg-surface/10 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          cm.w(64),
          cm.h(64),
          cm.roundedFull,
          'absolute -left-20 -bottom-20 bg-accent/30 blur-3xl',
        )}
        aria-hidden="true"
      />

      {!compact ? (
        <div className={cm.cn('relative z-10', cm.maxW('2xl'))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              cm.sp('mb', 4),
              cm.flex({ align: 'center', gap: 'sm' }),
              'tracking-[0.25em] uppercase text-accent',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              auto_awesome
            </span>
            {t(
              'alcoveHeroSearchCard.eyebrow',
              {},
              { defaultValue: 'Hand-vetted spaces · Instant booking' },
            )}
          </span>
          <h1
            className={cm.cn(
              cm.sp('mb', 4),
              'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold',
            )}
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            {t('alcoveHeroSearchCard.title', {}, { defaultValue: 'Every space, a story.' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.maxW('xl'),
              'text-on-primary/85 leading-relaxed',
            )}
          >
            {t(
              'alcoveHeroSearchCard.subtitle',
              { tagline: APP_TAGLINE },
              {
                defaultValue:
                  'Curated venues for meetings, photoshoots, workshops, and gatherings — transparently priced by the hour or by the day.',
              },
            )}
          </p>
        </div>
      ) : null}

      <form
        onSubmit={search}
        className={cm.cn(
          cm.sp('p', 3),
          cm.sp('mt', compact ? 0 : 8),
          'relative z-10 grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_0.9fr_auto] gap-2 bg-surface/95 backdrop-blur-xl rounded-2xl shadow-2xl text-on-surface',
        )}
      >
        <label className={cm.cn(cm.sp('px', 4), cm.sp('py', 2), 'flex flex-col')}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('alcoveHeroSearchCard.locationLabel', {}, { defaultValue: 'Where' })}
          </span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t(
              'alcoveHeroSearchCard.locationPlaceholder',
              {},
              { defaultValue: 'City or neighborhood' },
            )}
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('semibold'),
              'bg-transparent border-0 outline-none placeholder:text-on-surface-variant/60',
            )}
            aria-label={t('form.location', {}, { defaultValue: 'Location' })}
          />
        </label>
        <label
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            'flex flex-col border-l border-outline-variant/40',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('alcoveHeroSearchCard.typeLabel', {}, { defaultValue: 'Space' })}
          </span>
          <select
            value={spaceType}
            onChange={(e) => setSpaceType(e.target.value)}
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('semibold'),
              'bg-transparent border-0 outline-none',
            )}
            aria-label={t('alcoveHeroSearchCard.typeAria', {}, { defaultValue: 'Space type' })}
          >
            {SPACE_TYPES.map((s) => (
              <option key={s.value || 'any'} value={s.value}>
                {t(`alcoveHeroSearchCard.type.${s.labelKey}`, {}, { defaultValue: s.defaultLabel })}
              </option>
            ))}
          </select>
        </label>
        <label
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            'flex flex-col border-l border-outline-variant/40',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('alcoveHeroSearchCard.dateLabel', {}, { defaultValue: 'Date' })}
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('semibold'),
              'bg-transparent border-0 outline-none',
            )}
            aria-label={t('alcoveHeroSearchCard.dateAria', {}, { defaultValue: 'Booking date' })}
          />
        </label>
        <label
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            'flex flex-col border-l border-outline-variant/40',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('nav.guests', {}, { defaultValue: 'Guests' })}
          </span>
          <input
            type="number"
            value={guests}
            onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 1))}
            min={1}
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('semibold'),
              'bg-transparent border-0 outline-none',
            )}
            aria-label={t('alcoveHeroSearchCard.guestsAria', {}, { defaultValue: 'Guest count' })}
          />
        </label>
        <button
          type="submit"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
            'bg-primary text-on-primary rounded-xl hover:bg-primary-container transition-colors shadow-lg',
          )}
        >
          <span className={'material-symbols-outlined text-xl'} aria-hidden="true">
            search
          </span>
          {t('common.search', {}, { defaultValue: 'Search' })}
        </button>
      </form>

      {!compact ? (
        <div
          className={cm.cn(
            'relative z-10',
            cm.sp('mt', 6),
            cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('sm'),
              'text-on-primary/85',
            )}
          >
            <span
              className="material-symbols-outlined text-accent"
              aria-hidden="true"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
            {t(
              'alcoveHeroSearchCard.trustVetted',
              { appName: APP_NAME },
              { defaultValue: 'Personally vetted by {{appName}} editors' },
            )}
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('sm'),
              'text-on-primary/85',
            )}
          >
            <span className="material-symbols-outlined text-accent" aria-hidden="true">
              bolt
            </span>
            {t(
              'alcoveHeroSearchCard.trustInstant',
              {},
              { defaultValue: 'Instant confirmation on most spaces' },
            )}
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('sm'),
              'text-on-primary/85',
            )}
          >
            <span className="material-symbols-outlined text-accent" aria-hidden="true">
              price_check
            </span>
            {t(
              'alcoveHeroSearchCard.trustNoFees',
              {},
              { defaultValue: 'Hourly or daily pricing — no surprises' },
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
