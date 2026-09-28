/**
 * Full-bleed gradient hero band + overlapping property-search card for the
 * Landing page — `from-secondary` deep-teal to `primary` teal gradient with
 * a 20%-opacity photo overlay in `mix-blend-overlay`, centered DM Sans
 * display headline, and a white search card pulled up over the band's bottom
 * edge (per design-travel-booking-landing: hero → search → content flow).
 *
 * The search form is the page's single most important UI surface: destination,
 * check-in, check-out, and guests feed /search's query string; the coral
 * (`bg-accent`) submit button matches the design's coral CTAs.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE } from '../branding.js'

export function SojournHeroSearchCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [destination, setDestination] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(2)

  function search(e: React.FormEvent) {
    e.preventDefault()
    const q = new URLSearchParams()
    if (destination) q.set('q', destination)
    if (checkIn) q.set('check_in', checkIn)
    if (checkOut) q.set('check_out', checkOut)
    q.set('guests', String(guests))
    navigate(`/search?${q.toString()}`)
  }

  return (
    <>
      <header
        className={cm.cn(
          'relative w-full overflow-hidden bg-gradient-to-br from-secondary to-primary',
        )}
      >
        <div
          className={cm.cn(
            'absolute inset-0 opacity-20 mix-blend-overlay bg-cover bg-center',
            "bg-[url('https://picsum.photos/seed/sojourn-tb-hero/2074/900')]",
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            cm.w(64),
            cm.h(64),
            cm.roundedFull,
            'absolute -left-20 -top-20 bg-coral/30 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'relative z-10 flex flex-col items-center text-center',
            cm.mxAuto,
            cm.maxW('4xl'),
            cm.sp('px', 6),
            cm.sp('pt', 16),
            'pb-44',
          )}
        >
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              cm.sp('mb', 4),
              cm.flex({ align: 'center', gap: 'sm' }),
              'tracking-[0.25em] uppercase text-white',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              explore
            </span>
            {t(
              'sojournHeroSearchCard.eyebrow',
              {},
              { defaultValue: 'Curated stays · Members-only rates' },
            )}
          </span>
          <h1
            className={cm.cn(
              cm.sp('mb', 4),
              'font-headline text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold text-white drop-shadow-sm',
            )}
          >
            {t('sojournHeroSearchCard.title', {}, { defaultValue: 'Wander without worry' })}
          </h1>
          <p className={cm.cn(cm.textSize('lg'), cm.maxW('2xl'), 'text-white/90 leading-relaxed')}>
            {t(
              'sojournHeroSearchCard.subtitle',
              { tagline: APP_TAGLINE },
              {
                defaultValue:
                  'Inspiration, trustworthy stays, and a frictionless path from daydream to booked — across 14 countries and 200+ hand-vetted properties.',
              },
            )}
          </p>
        </div>
      </header>

      <div className={cm.cn('relative z-20', cm.mxAuto, cm.maxW('4xl'), cm.sp('px', 6), '-mt-28')}>
        <form
          onSubmit={search}
          className={cm.cn(
            cm.sp('p', 3),
            'grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_0.9fr_auto] gap-2 rounded-xl bg-surface shadow-lg text-on-surface',
          )}
        >
          <label
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'group flex flex-col items-start rounded-lg bg-background transition-colors hover:bg-surface-container-low',
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.sp('mb', 1),
                'uppercase tracking-wider text-on-surface-variant group-hover:text-primary transition-colors',
              )}
            >
              {t('sojournHeroSearchCard.destLabel', {}, { defaultValue: 'Where' })}
            </span>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={t(
                'sojournHeroSearchCard.destPlaceholder',
                {},
                { defaultValue: 'City, region, or property' },
              )}
              className={cm.cn(
                cm.textSize('base'),
                cm.fontWeight('medium'),
                'w-full border-0 bg-transparent p-0 outline-none placeholder:text-on-surface-variant/60',
              )}
              aria-label={t('sojournHeroSearchCard.destAria', {}, { defaultValue: 'Destination' })}
            />
          </label>
          <label
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'group flex flex-col items-start rounded-lg bg-background transition-colors hover:bg-surface-container-low md:rounded-none md:border-l md:border-outline-variant/40',
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.sp('mb', 1),
                'uppercase tracking-wider text-on-surface-variant group-hover:text-primary transition-colors',
              )}
            >
              {t('form.checkIn', {}, { defaultValue: 'Check in' })}
            </span>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className={cm.cn(
                cm.textSize('base'),
                cm.fontWeight('medium'),
                'w-full border-0 bg-transparent p-0 outline-none',
              )}
              aria-label={t(
                'sojournHeroSearchCard.checkInAria',
                {},
                { defaultValue: 'Check-in date' },
              )}
            />
          </label>
          <label
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'group flex flex-col items-start rounded-lg bg-background transition-colors hover:bg-surface-container-low md:rounded-none md:border-l md:border-outline-variant/40',
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.sp('mb', 1),
                'uppercase tracking-wider text-on-surface-variant group-hover:text-primary transition-colors',
              )}
            >
              {t('form.checkOut', {}, { defaultValue: 'Check out' })}
            </span>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className={cm.cn(
                cm.textSize('base'),
                cm.fontWeight('medium'),
                'w-full border-0 bg-transparent p-0 outline-none',
              )}
              aria-label={t(
                'sojournHeroSearchCard.checkOutAria',
                {},
                { defaultValue: 'Check-out date' },
              )}
            />
          </label>
          <label
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'group flex flex-col items-start rounded-lg bg-background transition-colors hover:bg-surface-container-low md:rounded-none md:border-l md:border-outline-variant/40',
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.sp('mb', 1),
                'uppercase tracking-wider text-on-surface-variant group-hover:text-primary transition-colors',
              )}
            >
              {t('nav.guests', {}, { defaultValue: 'Guests' })}
            </span>
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className={cm.cn(
                cm.textSize('base'),
                cm.fontWeight('medium'),
                'w-full border-0 bg-transparent p-0 outline-none',
              )}
              aria-label={t('nav.guests', {}, { defaultValue: 'Guests' })}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {t('sojournHeroSearchCard.guestsOption', { n }, { defaultValue: '{{n}} guests' })}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            aria-label={t('common.search', {}, { defaultValue: 'Search' })}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.sp('p', 4),
              'w-full rounded-lg bg-accent text-on-accent shadow-sm transition-colors hover:bg-accent-hover md:ml-2 md:w-auto',
            )}
          >
            <span className={'material-symbols-outlined text-2xl'} aria-hidden="true">
              search
            </span>
          </button>
        </form>
      </div>

      <div
        className={cm.cn(
          cm.mxAuto,
          cm.maxW('4xl'),
          cm.sp('px', 6),
          cm.sp('mt', 6),
          cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap', justify: 'center' }),
          cm.textSize('sm'),
          'text-on-surface-variant',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className="material-symbols-outlined text-primary"
            aria-hidden="true"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            verified
          </span>
          {t(
            'sojournHeroSearchCard.trustVetted',
            {},
            { defaultValue: 'Hand-vetted properties only' },
          )}
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span className="material-symbols-outlined text-primary" aria-hidden="true">
            shield_lock
          </span>
          {t(
            'sojournHeroSearchCard.trustProtected',
            {},
            { defaultValue: 'Free cancellation, fully protected' },
          )}
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span className="material-symbols-outlined text-primary" aria-hidden="true">
            workspace_premium
          </span>
          {t(
            'sojournHeroSearchCard.trustLoyalty',
            {},
            { defaultValue: 'Earn miles on every itinerary' },
          )}
        </div>
      </div>
    </>
  )
}
