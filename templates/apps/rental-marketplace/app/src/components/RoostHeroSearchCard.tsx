/**
 * Gradient hero card with embedded destination-search form for the Landing
 * page — `from-primary` deep-teal to `primary-container` lighter teal,
 * 2rem rounded radii, decorative blurred orbs, frosted-glass guests pill,
 * and a DM Sans display headline (per Roost DESIGN.md voice + palette).
 *
 * Translated from travel-booking's SojournHeroSearchCard.tsx — adapted to
 * Roost's "Stay like you belong" voice and the marketplace-specific trust
 * pillars (superhost, free cancellation, 24/7 support).
 */

import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE } from '../branding.js'

export function RoostHeroSearchCard() {
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
            'tracking-[0.25em] uppercase text-accent-on-surface',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            cottage
          </span>
          {t(
            'roostHeroSearchCard.eyebrow',
            {},
            { defaultValue: 'Hand-picked stays · Verified hosts' },
          )}
        </span>
        <h1
          className={cm.cn(
            cm.sp('mb', 4),
            'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold',
          )}
          style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
        >
          {t('roostHeroSearchCard.title', {}, { defaultValue: APP_TAGLINE })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), cm.maxW('xl'), 'text-white/85 leading-relaxed')}>
          {t(
            'roostHeroSearchCard.subtitle',
            {},
            {
              defaultValue:
                'Cabins, cottages, riads, and lofts — vetted by hosts who actually live there. Find a place that feels like home, wherever you wander.',
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
            {t('roostHeroSearchCard.destLabel', {}, { defaultValue: 'Where' })}
          </span>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder={t(
              'roostHeroSearchCard.destPlaceholder',
              {},
              { defaultValue: 'City, region, or property' },
            )}
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('semibold'),
              'bg-transparent border-0 outline-none placeholder:text-on-surface-variant/60',
            )}
            aria-label={t('roostHeroSearchCard.destAria', {}, { defaultValue: 'Destination' })}
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
            aria-label={t('roostHeroSearchCard.checkInAria', {}, { defaultValue: 'Check-in date' })}
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
              'roostHeroSearchCard.checkOutAria',
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
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {t('roostHeroSearchCard.guestsOption', { n }, { defaultValue: '{{n}} guests' })}
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
            'bg-accent text-on-primary rounded-xl hover:bg-accent-hover transition-colors shadow-lg',
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
            className="material-symbols-outlined text-accent"
            aria-hidden="true"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            workspace_premium
          </span>
          {t(
            'roostHeroSearchCard.trustSuperhost',
            {},
            { defaultValue: 'Superhost-verified properties' },
          )}
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('sm'),
            'text-white/85',
          )}
        >
          <span className="material-symbols-outlined text-accent" aria-hidden="true">
            shield_lock
          </span>
          {t(
            'roostHeroSearchCard.trustCancel',
            {},
            { defaultValue: 'Free cancellation up to 48h' },
          )}
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('sm'),
            'text-white/85',
          )}
        >
          <span className="material-symbols-outlined text-accent" aria-hidden="true">
            support_agent
          </span>
          {t('roostHeroSearchCard.trustSupport', {}, { defaultValue: '24/7 traveler support' })}
        </div>
      </div>
    </section>
  )
}
