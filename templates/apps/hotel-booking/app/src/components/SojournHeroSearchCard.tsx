/**
 * Full-bleed image hero with floating pill search bar for the Landing
 * page — the design's coastal-resort photo under a slate scrim, centered
 * serif headline, and a white rounded-full search bar overlapping the
 * hero's bottom edge (in flow on mobile, floating on md+).
 *
 * The search form is the top of the booking funnel: destination text,
 * check-in/check-out dates, a guests combobox, and a round gold submit
 * button. Every submission emits the `room.searched` analytics event and
 * navigates to /search with the query string.
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
    <section className={cm.cn('relative w-full isolate flex flex-col')} aria-label="Hero search">
      {/* Background image + scrim */}
      <div className={cm.cn('absolute inset-0 z-0')} aria-hidden="true">
        <img
          alt=""
          src="https://picsum.photos/seed/sojourn-hero-coast/1920/1080"
          className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
        />
        <div
          className={cm.cn('absolute inset-0')}
          style={{
            backgroundImage:
              'linear-gradient(to bottom, color-mix(in oklab, var(--color-hero-scrim) 60%, transparent) 0%, color-mix(in oklab, var(--color-hero-scrim) 35%, transparent) 45%, color-mix(in oklab, var(--color-hero-scrim) 70%, transparent) 100%)',
          }}
        />
      </div>

      {/* Hero copy */}
      <div
        className={cm.cn(
          'relative z-10 flex flex-col items-center',
          cm.sp('px', 4),
          'pt-28 md:pt-40 pb-12 md:pb-28',
        )}
      >
        <div className={cm.cn(cm.textCenter, cm.maxW('4xl'))}>
          <h1
            className={cm.cn(
              cm.sp('mb', 4),
              'text-5xl md:text-7xl text-white font-medium tracking-tight',
            )}
            style={{ fontFamily: 'var(--font-headline)', fontVariationSettings: "'opsz' 72" }}
          >
            {t('sojournHeroSearchCard.title', {}, { defaultValue: 'Stay somewhere extraordinary' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('xl'),
              'md:text-2xl text-white/90 font-light max-w-2xl mx-auto',
            )}
          >
            {t(
              'sojournHeroSearchCard.subtitle',
              { tagline: APP_TAGLINE },
              { defaultValue: 'Handpicked hotels, private villas and design retreats.' },
            )}
          </p>
          {/* Trust strip */}
          <div
            className={cm.cn(
              cm.sp('mt', 6),
              cm.flex({ align: 'center', justify: 'center', gap: 'lg', wrap: 'wrap' }),
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
              <span
                className="material-symbols-outlined text-accent"
                aria-hidden="true"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
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
              <span
                className="material-symbols-outlined text-accent"
                aria-hidden="true"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                workspace_premium
              </span>
              {t(
                'sojournHeroSearchCard.trustLoyalty',
                {},
                { defaultValue: 'Earn points on every stay' },
              )}
            </div>
          </div>
        </div>

        {/* Floating search bar — pill overlapping the hero's bottom edge on
            md+; in flow (still overlapping via negative margin) on mobile. */}
        <form
          onSubmit={search}
          className={cm.cn(
            cm.sp('p', 2),
            'mt-10 md:mt-0 w-full max-w-5xl',
            'md:absolute md:bottom-0 md:left-1/2 md:-translate-x-1/2 md:translate-y-1/2',
            'relative z-20 flex flex-col md:flex-row items-stretch md:items-center gap-1 md:gap-0',
            'bg-surface rounded-full shadow-[0_8px_30px] shadow-on-surface/15',
            'divide-y divide-outline-variant/40 md:divide-y-0 md:divide-x',
          )}
        >
          <label
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              'flex flex-col flex-1 rounded-full hover:bg-surface-container-low transition-colors text-left',
            )}
          >
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
              {t('sojournHeroSearchCard.destLabel', {}, { defaultValue: 'Destination' })}
            </span>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={t(
                'sojournHeroSearchCard.destPlaceholder',
                {},
                { defaultValue: 'Where are you going?' },
              )}
              className={cm.cn(
                cm.textSize('base'),
                'bg-transparent border-0 outline-none font-light text-on-surface placeholder:text-on-surface-variant/70',
              )}
              aria-label={t('sojournHeroSearchCard.destAria', {}, { defaultValue: 'Destination' })}
            />
          </label>
          <label
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              'flex flex-col flex-1 md:border-l md:border-outline-variant/40 rounded-full hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
              {t('form.checkIn', {}, { defaultValue: 'Check-in' })}
            </span>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className={cm.cn(
                cm.textSize('base'),
                'bg-transparent border-0 outline-none font-light text-on-surface',
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
              cm.sp('px', 6),
              cm.sp('py', 3),
              'flex flex-col flex-1 md:border-l md:border-outline-variant/40 rounded-full hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
              {t('form.checkOut', {}, { defaultValue: 'Check-out' })}
            </span>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className={cm.cn(
                cm.textSize('base'),
                'bg-transparent border-0 outline-none font-light text-on-surface',
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
              cm.sp('px', 6),
              cm.sp('py', 3),
              'flex flex-col flex-1 md:border-l md:border-outline-variant/40 rounded-full hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
              {t('nav.guests', {}, { defaultValue: 'Guests' })}
            </span>
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className={cm.cn(
                cm.textSize('base'),
                'bg-transparent border-0 outline-none font-light text-on-surface',
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
          <div className={cm.cn(cm.sp('p', 2), 'w-full md:w-auto')}>
            <button
              type="submit"
              data-mol-id="landing-hero-search"
              aria-label={t('common.search', {}, { defaultValue: 'Search' })}
              className={cm.cn(
                cm.w('full'),
                'md:w-auto bg-accent text-on-accent p-4 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-md shadow-accent/30',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
                search
              </span>
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
