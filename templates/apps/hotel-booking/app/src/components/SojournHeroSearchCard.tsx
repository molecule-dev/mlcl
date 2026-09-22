/**
 * Gradient hero card with embedded property-search form for the Landing
 * page — `from-primary` deep-teal to `primary-container` lighter teal,
 * 2rem rounded radii, decorative blurred orbs, frosted-glass guests pill,
 * and an inline serif headline in the brand `DM Serif Display` family.
 *
 * Translated from personal-finance's NetWorthCard.tsx treatment (gradient
 * brand-panel + decorative orbs) with online-store HeroBanner's CTA and
 * search-form overlay layered on top to support the search-first booking
 * funnel called out in DESIGN.md.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
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
    // Domain event: a search leaves the hero — the top of the booking funnel.
    void track({
      name: 'room.searched',
      properties: {
        query: destination,
        check_in: checkIn || null,
        check_out: checkOut || null,
        guests,
      },
    })
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
      {/* Decorative orbs */}
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

      {/* Eyebrow + headline + tagline */}
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
            'sojournHeroSearchCard.eyebrow',
            {},
            { defaultValue: 'Curated stays · Members-only rates' },
          )}
        </span>
        <h1
          className={cm.cn(
            cm.sp('mb', 4),
            'font-serif text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold',
          )}
          style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
        >
          {t('sojournHeroSearchCard.title', {}, { defaultValue: 'Stay somewhere extraordinary' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), cm.maxW('xl'), 'text-white/85 leading-relaxed')}>
          {t(
            'sojournHeroSearchCard.subtitle',
            { tagline: APP_TAGLINE },
            {
              defaultValue:
                'A curated collection of boutique hotels, design-forward properties, and rare-find retreats — transparently priced, beautifully presented.',
            },
          )}
        </p>
      </div>

      {/* Search bar overlay — frosted glass on the gradient */}
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
            'bg-primary text-on-primary rounded-xl hover:bg-primary-container transition-colors shadow-lg',
          )}
        >
          <span className={'material-symbols-outlined text-xl'} aria-hidden="true">
            search
          </span>
          {t('common.search', {}, { defaultValue: 'Search' })}
        </button>
      </form>

      {/* Trust strip */}
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
          <span className="material-symbols-outlined text-accent" aria-hidden="true">
            price_check
          </span>
          {t('sojournHeroSearchCard.trustNoFees', {}, { defaultValue: 'No hidden fees, ever' })}
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('sm'),
            'text-white/85',
          )}
        >
          <span className="material-symbols-outlined text-accent" aria-hidden="true">
            workspace_premium
          </span>
          {t(
            'sojournHeroSearchCard.trustLoyalty',
            {},
            { defaultValue: 'Earn points on every stay' },
          )}
        </div>
      </div>
    </section>
  )
}
