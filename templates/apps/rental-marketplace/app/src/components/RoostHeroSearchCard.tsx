/**
 * Full-bleed image hero with the design's white search pill — scenic
 * rental photo under a deep ink scrim, DM Sans display headline centered,
 * and a rounded-pill search form (Location / Check-in / Check-out / Guests
 * + a round teal submit) that navigates to /search with query params.
 *
 * Restyled to the Stitch landing design (photo hero); the search behavior
 * and field contract are unchanged from the earlier gradient card.
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
      className={cm.cn('relative flex items-center justify-center pt-28 pb-20 min-h-[640px]')}
      data-mol-id="hero-search"
    >
      {/* Scenic backdrop + scrim. The scrim is heavier than the design's
         black/30 so the small nav and subtitle text clear 4.5:1 over an
         arbitrary photo (axe gates this page at serious/critical). */}
      <img
        src="https://picsum.photos/seed/roost-hero-villa/2000/1200"
        alt=""
        aria-hidden="true"
        className={cm.cn('absolute inset-0 w-full h-full object-cover')}
      />
      <div className={cm.cn('absolute inset-0 bg-on-surface/70')} aria-hidden="true" />

      <div
        className={cm.cn(
          'relative z-10 flex flex-col items-center justify-center text-center px-4 w-full max-w-5xl',
        )}
      >
        <h1
          className={cm.cn(
            cm.sp('mb', 4),
            'font-headline text-5xl md:text-7xl leading-tight text-white font-bold drop-shadow-lg',
          )}
        >
          {t('roostHeroSearchCard.title', {}, { defaultValue: APP_TAGLINE })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('medium'),
            cm.sp('mb', 12),
            'text-white/90 drop-shadow-md',
          )}
        >
          {t(
            'roostHeroSearchCard.subtitle',
            {},
            { defaultValue: 'Handpicked homes in 180+ destinations.' },
          )}
        </p>

        {/* Search pill */}
        <form
          onSubmit={search}
          className={cm.cn(
            'bg-surface rounded-2xl md:rounded-full shadow-2xl w-full max-w-4xl flex flex-col md:flex-row md:items-center text-left divide-y md:divide-y-0 md:divide-x divide-outline-variant/40',
          )}
        >
          <label
            className={cm.cn(
              'flex-1 w-full px-6 py-3 md:py-2 hover:bg-surface-container-low rounded-t-2xl md:rounded-l-full md:rounded-tr-none flex flex-col',
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-wider text-on-surface',
              )}
            >
              {t('roostHeroSearchCard.destLabel', {}, { defaultValue: 'Location' })}
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
                cm.textSize('sm'),
                'w-full bg-transparent border-0 p-0 outline-none text-on-surface-variant placeholder:text-on-surface-variant/70 mt-0.5 truncate',
              )}
              aria-label={t('roostHeroSearchCard.destAria', {}, { defaultValue: 'Destination' })}
            />
          </label>
          <label
            className={cm.cn(
              'flex-1 w-full px-6 py-3 md:py-2 hover:bg-surface-container-low flex flex-col',
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-wider text-on-surface',
              )}
            >
              {t('form.checkIn', {}, { defaultValue: 'Check in' })}
            </span>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className={cm.cn(
                cm.textSize('sm'),
                'bg-transparent border-0 p-0 outline-none text-on-surface-variant mt-0.5',
              )}
              aria-label={t(
                'roostHeroSearchCard.checkInAria',
                {},
                { defaultValue: 'Check-in date' },
              )}
            />
          </label>
          <label
            className={cm.cn(
              'flex-1 w-full px-6 py-3 md:py-2 hover:bg-surface-container-low flex flex-col',
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-wider text-on-surface',
              )}
            >
              {t('form.checkOut', {}, { defaultValue: 'Check out' })}
            </span>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className={cm.cn(
                cm.textSize('sm'),
                'bg-transparent border-0 p-0 outline-none text-on-surface-variant mt-0.5',
              )}
              aria-label={t(
                'roostHeroSearchCard.checkOutAria',
                {},
                { defaultValue: 'Check-out date' },
              )}
            />
          </label>
          <div
            className={cm.cn(
              'flex-1 w-full pl-6 pr-2 py-3 md:py-2 flex items-center justify-between rounded-b-2xl md:rounded-r-full md:rounded-bl-none',
            )}
          >
            <label className={cm.cn('flex flex-col')}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-wider text-on-surface',
                )}
              >
                {t('nav.guests', {}, { defaultValue: 'Guests' })}
              </span>
              <select
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className={cm.cn(
                  cm.textSize('sm'),
                  'bg-transparent border-0 p-0 outline-none text-on-surface-variant mt-0.5',
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
                cm.w(12),
                cm.h(12),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-primary text-white hover:bg-primary-dark transition-colors shadow-md ml-4 shrink-0',
              )}
              aria-label={t('common.search', {}, { defaultValue: 'Search' })}
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

export default RoostHeroSearchCard
export { RoostHeroSearchCard as RoostHeroSearch }
