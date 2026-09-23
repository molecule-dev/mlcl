/**
 * Gradient hero card with embedded property-search form for the Landing
 * page — `from-primary` deep-teal to `primary-container` lighter teal,
 * 2rem rounded radii, decorative blurred orbs, frosted-glass guests pill,
 * and a DM Sans display headline (per travel-booking DESIGN.md).
 *
 * Translated from hotel-booking's SojournHeroSearchCard.tsx (which was
 * itself a translation of personal-finance's NetWorthCard treatment) —
 * adapted to travel-booking's wanderlust voice ("Wander without worry"),
 * teal/coral palette, and the mandate that the search form is the page's
 * single most important UI surface.
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
    <section
      className={cm.cn(
        cm.sp('p', 10),
        cm.flex({ direction: 'col', justify: 'between' }),
        'min-h-[520px] bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden',
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
          'absolute -left-20 -bottom-20 bg-accent/40 blur-3xl',
        )}
        aria-hidden="true"
      />

      <div className={cm.cn('relative z-10', cm.maxW('2xl'))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.sp('mb', 4),
            cm.flex({ align: 'center', gap: 'sm' }),
            'tracking-[0.25em] uppercase',
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
            'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold',
          )}
          style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
        >
          {t('sojournHeroSearchCard.title', {}, { defaultValue: 'Wander without worry' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), cm.maxW('xl'), 'text-white/85 leading-relaxed')}>
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

      <form
        onSubmit={search}
        className={cm.cn(
          cm.sp('p', 3),
          cm.sp('mt', 8),
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
              cm.fontWeight('semibold'),
              'bg-transparent border-0 outline-none placeholder:text-on-surface-variant/60',
            )}
            aria-label={t('sojournHeroSearchCard.destAria', {}, { defaultValue: 'Destination' })}
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
            {t('form.checkIn', {}, { defaultValue: 'Check in' })}
          </span>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('semibold'),
              'bg-transparent border-0 outline-none',
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
            {t('form.checkOut', {}, { defaultValue: 'Check out' })}
          </span>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('semibold'),
              'bg-transparent border-0 outline-none',
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
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('semibold'),
              'bg-transparent border-0 outline-none',
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
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
            'bg-accent text-on-accent rounded-xl hover:bg-accent-hover transition-colors shadow-lg',
          )}
        >
          <span className={'material-symbols-outlined text-xl'} aria-hidden="true">
            search
          </span>
          {t('common.search', {}, { defaultValue: 'Search' })}
        </button>
      </form>

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
            'text-white/85',
          )}
        >
          <span
            className="material-symbols-outlined text-white"
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
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('sm'),
            'text-white/85',
          )}
        >
          <span className="material-symbols-outlined text-white" aria-hidden="true">
            shield_lock
          </span>
          {t(
            'sojournHeroSearchCard.trustProtected',
            {},
            { defaultValue: 'Free cancellation, fully protected' },
          )}
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('sm'),
            'text-white/85',
          )}
        >
          <span className="material-symbols-outlined text-white" aria-hidden="true">
            workspace_premium
          </span>
          {t(
            'sojournHeroSearchCard.trustLoyalty',
            {},
            { defaultValue: 'Earn miles on every itinerary' },
          )}
        </div>
      </div>
    </section>
  )
}
