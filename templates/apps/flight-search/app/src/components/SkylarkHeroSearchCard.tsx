/**
 * Skylark gradient hero search card — deep-blue Skylark palette
 * (`#1e3a5f` → `#2a5298`), 2rem rounded radii, decorative blurred orbs,
 * trip-type pill tabs, frosted-glass white search row with origin /
 * destination / dates / passengers / submit, and a trust strip below.
 *
 * Translated from hotel-booking's SojournHeroSearchCard.tsx (gradient
 * brand-panel + decorative orbs + frosted-glass search overlay) with
 * the airline-specific shape laid out in DESIGN.md §"Search Form
 * (Hero)" — round-trip / one-way / multi-city tabs, origin-destination
 * swap motif, and a Skylark-orange (#e86a2e) accent CTA.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE } from '../branding.js'

type TripType = 'roundtrip' | 'oneway' | 'multicity'

const TRIP_TYPES: ReadonlyArray<{ id: TripType; defaultLabel: string }> = [
  { id: 'roundtrip', defaultLabel: 'Round trip' },
  { id: 'oneway', defaultLabel: 'One way' },
  { id: 'multicity', defaultLabel: 'Multi-city' },
]

interface MultiCityLeg {
  origin: string
  destination: string
  date: string
}

const MAX_MULTI_LEGS = 6
const INITIAL_MULTI_LEGS: MultiCityLeg[] = [
  { origin: '', destination: '', date: '' },
  { origin: '', destination: '', date: '' },
]

export function SkylarkHeroSearchCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [tripType, setTripType] = useState<TripType>('roundtrip')
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [passengers, setPassengers] = useState(1)
  const [legs, setLegs] = useState<MultiCityLeg[]>(INITIAL_MULTI_LEGS)
  const [legsError, setLegsError] = useState('')

  function search(e: React.FormEvent) {
    e.preventDefault()
    if (tripType === 'multicity') {
      const cleaned = legs
        .map((l) => ({
          origin: l.origin.trim().toUpperCase(),
          destination: l.destination.trim().toUpperCase(),
          date: l.date,
        }))
        .filter((l) => l.origin && l.destination && l.date)
      if (cleaned.length < 2) {
        setLegsError(
          t(
            'skylarkHeroSearchCard.multi.minLegs',
            {},
            { defaultValue: 'Add at least two legs to compare a multi-city itinerary.' },
          ),
        )
        return
      }
      setLegsError('')
      const q = new URLSearchParams()
      q.set('multi', '1')
      q.set('passengers', String(passengers))
      q.set('trip_type', 'multicity')
      cleaned.forEach((l, idx) => {
        q.set(`l${idx + 1}`, `${l.origin},${l.destination},${l.date}`)
      })
      navigate(`/search?${q.toString()}`)
      return
    }
    const q = new URLSearchParams()
    if (origin) q.set('origin', origin)
    if (destination) q.set('destination', destination)
    if (departureDate) q.set('departure_date', departureDate)
    if (returnDate && tripType === 'roundtrip') q.set('return_date', returnDate)
    q.set('passengers', String(passengers))
    q.set('trip_type', tripType)
    navigate(`/search?${q.toString()}`)
  }

  function swap() {
    setOrigin(destination)
    setDestination(origin)
  }

  function updateLeg(idx: number, patch: Partial<MultiCityLeg>) {
    setLegs((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
    setLegsError('')
  }

  function addLeg() {
    setLegs((prev) =>
      prev.length >= MAX_MULTI_LEGS ? prev : [...prev, { origin: '', destination: '', date: '' }],
    )
  }

  function removeLeg(idx: number) {
    setLegs((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== idx)))
  }

  return (
    <section
      className={cm.cn(
        cm.sp('p', 10),
        cm.flex({ direction: 'col', justify: 'between' }),
        'min-h-[520px] bg-gradient-to-br from-primary via-secondary to-primary-container rounded-[2rem] text-white relative overflow-hidden',
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
            travel_explore
          </span>
          {t(
            'skylarkHeroSearchCard.eyebrow',
            {},
            { defaultValue: 'Compare every airline · Live fares' },
          )}
        </span>
        <h1
          className={cm.cn(
            cm.sp('mb', 4),
            'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold',
          )}
        >
          {t('skylarkHeroSearchCard.title', {}, { defaultValue: 'Every route, one search.' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), cm.maxW('xl'), 'text-white/85 leading-relaxed')}>
          {t(
            'skylarkHeroSearchCard.subtitle',
            { tagline: APP_TAGLINE },
            {
              defaultValue:
                'Compare hundreds of airlines on a single screen, track fares for the routes you watch, and book the trip — without 14 tabs and a calculator.',
            },
          )}
        </p>
      </div>

      {/* Trip-type pill tabs */}
      <div className={cm.cn('relative z-10', cm.sp('mt', 8), cm.flex({ gap: 'sm', wrap: 'wrap' }))}>
        {TRIP_TYPES.map((tt) => (
          <button
            key={tt.id}
            type="button"
            onClick={() => setTripType(tt.id)}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full transition-colors',
              tripType === tt.id
                ? 'bg-surface text-primary shadow-md'
                : 'bg-surface/10 text-white hover:bg-surface/20 ring-1 ring-white/20',
            )}
            aria-pressed={tripType === tt.id}
          >
            {t(`skylarkHeroSearchCard.tripType.${tt.id}`, {}, { defaultValue: tt.defaultLabel })}
          </button>
        ))}
      </div>

      {/* Search bar overlay */}
      <form
        onSubmit={search}
        data-testid={tripType === 'multicity' ? 'multi-city-form' : 'single-search-form'}
        className={cm.cn(
          cm.sp('p', 3),
          cm.sp('mt', 4),
          tripType === 'multicity'
            ? 'relative z-10 flex flex-col gap-3 bg-surface/95 backdrop-blur-xl rounded-2xl shadow-2xl text-on-surface'
            : 'relative z-10 grid grid-cols-1 md:grid-cols-[1.1fr_auto_1.1fr_1fr_1fr_0.85fr_auto] gap-2 bg-surface/95 backdrop-blur-xl rounded-2xl shadow-2xl text-on-surface',
        )}
      >
        {tripType === 'multicity' ? (
          <>
            {legs.map((leg, idx) => (
              <div
                key={idx}
                data-testid={`multi-city-leg-${idx}`}
                className={cm.cn(
                  cm.sp('p', 2),
                  'grid grid-cols-1 md:grid-cols-[1.1fr_1.1fr_1fr_auto] gap-2 items-end',
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
                    {t(
                      'skylarkHeroSearchCard.multi.legFrom',
                      { n: idx + 1 },
                      { defaultValue: 'Leg {{n}} · From' },
                    )}
                  </span>
                  <input
                    type="text"
                    value={leg.origin}
                    onChange={(e) => updateLeg(idx, { origin: e.target.value.toUpperCase() })}
                    placeholder={t(
                      'skylarkHeroSearchCard.fromPlaceholder',
                      {},
                      { defaultValue: 'JFK · New York' },
                    )}
                    className={cm.cn(
                      cm.textSize('lg'),
                      cm.fontWeight('bold'),
                      'bg-transparent border-0 outline-none uppercase tracking-wide placeholder:text-on-surface-variant/60 placeholder:font-medium placeholder:normal-case',
                    )}
                    aria-label={t(
                      'skylarkHeroSearchCard.multi.legFromAria',
                      { n: idx + 1 },
                      { defaultValue: 'Leg {{n}} origin airport' },
                    )}
                  />
                </label>
                <label className={cm.cn(cm.sp('px', 4), cm.sp('py', 2), 'flex flex-col')}>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('skylarkHeroSearchCard.multi.legTo', {}, { defaultValue: 'To' })}
                  </span>
                  <input
                    type="text"
                    value={leg.destination}
                    onChange={(e) => updateLeg(idx, { destination: e.target.value.toUpperCase() })}
                    placeholder={t(
                      'skylarkHeroSearchCard.toPlaceholder',
                      {},
                      { defaultValue: 'CDG · Paris' },
                    )}
                    className={cm.cn(
                      cm.textSize('lg'),
                      cm.fontWeight('bold'),
                      'bg-transparent border-0 outline-none uppercase tracking-wide placeholder:text-on-surface-variant/60 placeholder:font-medium placeholder:normal-case',
                    )}
                    aria-label={t(
                      'skylarkHeroSearchCard.multi.legToAria',
                      { n: idx + 1 },
                      { defaultValue: 'Leg {{n}} destination airport' },
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
                    {t('skylarkHeroSearchCard.departLabel', {}, { defaultValue: 'Depart' })}
                  </span>
                  <input
                    type="date"
                    value={leg.date}
                    onChange={(e) => updateLeg(idx, { date: e.target.value })}
                    className={cm.cn(
                      cm.textSize('base'),
                      cm.fontWeight('semibold'),
                      'bg-transparent border-0 outline-none',
                    )}
                    aria-label={t(
                      'skylarkHeroSearchCard.multi.legDateAria',
                      { n: idx + 1 },
                      { defaultValue: 'Leg {{n}} departure date' },
                    )}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeLeg(idx)}
                  disabled={legs.length <= 2}
                  data-testid={`multi-city-remove-${idx}`}
                  aria-label={t(
                    'skylarkHeroSearchCard.multi.removeLeg',
                    { n: idx + 1 },
                    { defaultValue: 'Remove leg {{n}}' },
                  )}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'self-center rounded-full bg-surface-container ring-1 ring-outline-variant text-on-surface-variant hover:text-error transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                  )}
                >
                  <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                    remove_circle_outline
                  </span>
                </button>
              </div>
            ))}
            <div
              className={cm.cn(
                cm.sp('px', 2),
                cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
              )}
            >
              <button
                type="button"
                onClick={addLeg}
                disabled={legs.length >= MAX_MULTI_LEGS}
                data-testid="multi-city-add-leg"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'rounded-full bg-surface-container text-on-surface ring-1 ring-outline-variant hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  add
                </span>
                {t('skylarkHeroSearchCard.multi.addLeg', {}, { defaultValue: 'Add another leg' })}
              </button>
              <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('skylarkHeroSearchCard.passengersLabel', {}, { defaultValue: 'Passengers' })}
                </span>
                <select
                  value={passengers}
                  onChange={(e) => setPassengers(Number(e.target.value))}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'bg-surface-container ring-1 ring-outline-variant rounded-full outline-none focus:ring-primary',
                  )}
                  aria-label={t(
                    'skylarkHeroSearchCard.passengersAria',
                    {},
                    { defaultValue: 'Passenger count' },
                  )}
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {t(
                        'skylarkHeroSearchCard.passengersOption',
                        { n },
                        { defaultValue: '{{n}} traveler' },
                      )}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                data-testid="multi-city-submit"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
                  'bg-accent text-on-accent rounded-xl hover:bg-accent/90 transition-colors shadow-lg',
                )}
              >
                <span className={'material-symbols-outlined text-xl'} aria-hidden="true">
                  search
                </span>
                {t('skylarkHeroSearchCard.multi.submit', {}, { defaultValue: 'Search itinerary' })}
              </button>
            </div>
            {legsError ? (
              <p className={cm.cn(cm.sp('px', 4), cm.textSize('xs'), 'text-error')}>{legsError}</p>
            ) : null}
          </>
        ) : (
          <>
            <label className={cm.cn(cm.sp('px', 4), cm.sp('py', 2), 'flex flex-col')}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('skylarkHeroSearchCard.fromLabel', {}, { defaultValue: 'From' })}
              </span>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                placeholder={t(
                  'skylarkHeroSearchCard.fromPlaceholder',
                  {},
                  { defaultValue: 'JFK · New York' },
                )}
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'bg-transparent border-0 outline-none uppercase tracking-wide placeholder:text-on-surface-variant/60 placeholder:font-medium placeholder:normal-case',
                )}
                aria-label={t(
                  'skylarkHeroSearchCard.fromAria',
                  {},
                  { defaultValue: 'Origin airport' },
                )}
              />
            </label>
            <button
              type="button"
              onClick={swap}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(10),
                cm.h(10),
                cm.roundedFull,
                'self-center justify-self-center bg-surface-container-low ring-1 ring-outline-variant/40 hover:ring-primary hover:text-primary transition-colors',
              )}
              aria-label={t(
                'skylarkHeroSearchCard.swapAria',
                {},
                { defaultValue: 'Swap origin and destination' },
              )}
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                swap_horiz
              </span>
            </button>
            <label className={cm.cn(cm.sp('px', 4), cm.sp('py', 2), 'flex flex-col')}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('skylarkHeroSearchCard.toLabel', {}, { defaultValue: 'To' })}
              </span>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value.toUpperCase())}
                placeholder={t(
                  'skylarkHeroSearchCard.toPlaceholder',
                  {},
                  { defaultValue: 'CDG · Paris' },
                )}
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'bg-transparent border-0 outline-none uppercase tracking-wide placeholder:text-on-surface-variant/60 placeholder:font-medium placeholder:normal-case',
                )}
                aria-label={t(
                  'skylarkHeroSearchCard.toAria',
                  {},
                  { defaultValue: 'Destination airport' },
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
                {t('skylarkHeroSearchCard.departLabel', {}, { defaultValue: 'Depart' })}
              </span>
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className={cm.cn(
                  cm.textSize('base'),
                  cm.fontWeight('semibold'),
                  'bg-transparent border-0 outline-none',
                )}
                aria-label={t(
                  'skylarkHeroSearchCard.departAria',
                  {},
                  { defaultValue: 'Departure date' },
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
                {t('skylarkHeroSearchCard.returnLabel', {}, { defaultValue: 'Return' })}
              </span>
              <input
                type="date"
                value={returnDate}
                disabled={tripType === 'oneway'}
                onChange={(e) => setReturnDate(e.target.value)}
                className={cm.cn(
                  cm.textSize('base'),
                  cm.fontWeight('semibold'),
                  'bg-transparent border-0 outline-none disabled:opacity-40',
                )}
                aria-label={t(
                  'skylarkHeroSearchCard.returnAria',
                  {},
                  { defaultValue: 'Return date' },
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
                {t('skylarkHeroSearchCard.passengersLabel', {}, { defaultValue: 'Passengers' })}
              </span>
              <select
                value={passengers}
                onChange={(e) => setPassengers(Number(e.target.value))}
                className={cm.cn(
                  cm.textSize('base'),
                  cm.fontWeight('semibold'),
                  'bg-transparent border-0 outline-none',
                )}
                aria-label={t(
                  'skylarkHeroSearchCard.passengersAria',
                  {},
                  { defaultValue: 'Passenger count' },
                )}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {t(
                      'skylarkHeroSearchCard.passengersOption',
                      { n },
                      { defaultValue: '{{n}} traveler' },
                    )}
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
                'bg-accent text-on-accent rounded-xl hover:bg-accent/90 transition-colors shadow-lg',
              )}
            >
              <span className={'material-symbols-outlined text-xl'} aria-hidden="true">
                search
              </span>
              {t('common.search', {}, { defaultValue: 'Search' })}
            </button>
          </>
        )}
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
          {t('skylarkHeroSearchCard.trustNoFees', {}, { defaultValue: 'No booking fees, ever' })}
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('sm'),
            'text-white/85',
          )}
        >
          <span className="material-symbols-outlined text-accent" aria-hidden="true">
            trending_down
          </span>
          {t(
            'skylarkHeroSearchCard.trustAlerts',
            {},
            { defaultValue: 'Free price alerts on every route' },
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
            workspace_premium
          </span>
          {t(
            'skylarkHeroSearchCard.trustLoyalty',
            {},
            { defaultValue: 'Earn miles across 40+ airlines' },
          )}
        </div>
      </div>
    </section>
  )
}
