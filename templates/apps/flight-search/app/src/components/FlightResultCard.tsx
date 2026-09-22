/**
 * Flight result card — single-row editorial layout: airline mark + name |
 * departure/arrival times + dashed route connector with stop indicator |
 * tabular monospace duration | price + select CTA. Cheapest fares get a
 * green "Cheapest" pill, mid-priced ones an orange "Deal" pill,
 * expensive ones a muted "Expensive" tag. Hover lifts a half-step like
 * the polished-11 list rows.
 *
 * Translated from hotel-booking's PropertyListingCard.tsx (rounded-2xl
 * card, tabular price, hover lift) but reshaped to the airline result
 * row laid out in DESIGN.md §"Flight Result Card" — horizontal flow,
 * monospace duration, dashed route connector with circle endpoints, and
 * Skylark's deal/cheapest/expensive semantic palette.
 *
 * Props match `flights.json` fixture shape exactly (origin_code,
 * destination_code, departure_time, arrival_time, duration_minutes,
 * stops, stop_cities, price, airline, airline_logo, flight_number,
 * cabin_class).
 */

import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface FlightSummary {
  id: string
  airline: string
  airline_logo?: string
  flight_number: string
  origin_code: string
  origin_city?: string
  destination_code: string
  destination_city?: string
  departure_time: string
  arrival_time: string
  duration_minutes: number
  stops: number
  stop_cities?: string[]
  price: number
  cabin_class?: string
  deal_label?: 'cheapest' | 'deal' | 'expensive' | null
  bookmarked?: boolean
}

function fmtPrice(value: number): string {
  return `$${Math.round(value).toLocaleString()}`
}

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

const DEAL_THEME: Record<
  NonNullable<FlightSummary['deal_label']>,
  { bg: string; text: string; ring: string; label: string }
> = {
  cheapest: {
    bg: 'bg-cheapest-light',
    text: 'text-cheapest',
    ring: 'ring-cheapest/30',
    label: 'Cheapest',
  },
  deal: { bg: 'bg-deal-light', text: 'text-deal', ring: 'ring-deal/30', label: 'Deal' },
  expensive: {
    bg: 'bg-expensive-light',
    text: 'text-expensive',
    ring: 'ring-expensive/30',
    label: 'Expensive',
  },
}

export function FlightResultCard({
  flight,
  passengers = 1,
  onToggleBookmark,
}: {
  flight: FlightSummary
  passengers?: number
  onToggleBookmark?: (id: string) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const dealTheme = flight.deal_label ? DEAL_THEME[flight.deal_label] : null
  const stopsLabel =
    flight.stops === 0
      ? t('flightResultCard.nonstop', {}, { defaultValue: 'Nonstop' })
      : flight.stops === 1
        ? t('flightResultCard.oneStop', {}, { defaultValue: '1 stop' })
        : t(
            'flightResultCard.multiStop',
            { count: flight.stops },
            { defaultValue: '{{count}} stops' },
          )

  return (
    <article
      className={cm.cn(
        'group relative bg-surface rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all ring-1 ring-outline-variant/40 overflow-hidden',
      )}
    >
      {dealTheme ? (
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'absolute top-3 left-3 uppercase tracking-widest rounded-full ring-1',
            dealTheme.bg,
            dealTheme.text,
            dealTheme.ring,
          )}
        >
          {t(`flightResultCard.deal.${flight.deal_label}`, {}, { defaultValue: dealTheme.label })}
        </span>
      ) : null}

      {onToggleBookmark ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleBookmark(flight.id)
          }}
          className={cm.cn(
            cm.w(9),
            cm.h(9),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            'absolute top-3 right-3 bg-surface-container-low ring-1 ring-outline-variant/60 hover:scale-110 transition-transform',
          )}
          aria-label={t('flightResultCard.bookmarkAria', {}, { defaultValue: 'Save flight' })}
        >
          <span
            className={cm.cn('material-symbols-outlined text-accent text-lg')}
            style={{ fontVariationSettings: flight.bookmarked ? "'FILL' 1" : "'FILL' 0" }}
            aria-hidden="true"
          >
            favorite
          </span>
        </button>
      ) : null}

      <div
        className={cm.cn(
          cm.sp('p', 5),
          cm.sp('pt', dealTheme ? 12 : 5),
          'grid grid-cols-1 md:grid-cols-[1.4fr_2fr_1fr_auto] gap-6 items-center',
        )}
      >
        {/* Airline */}
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              'rounded-lg bg-primary/10 text-primary font-extrabold tracking-tight ring-1 ring-primary/20 text-sm',
            )}
            aria-hidden="true"
          >
            {flight.airline_logo ? (
              <img
                src={flight.airline_logo}
                alt=""
                className={cm.cn(cm.w('full'), cm.h('full'), 'rounded-lg object-cover')}
              />
            ) : (
              flight.airline.slice(0, 2).toUpperCase()
            )}
          </span>
          <div className={'min-w-0'}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface truncate',
              )}
            >
              {flight.airline}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
              {flight.flight_number}
              {flight.cabin_class
                ? ` · ${t(`flightResultCard.cabin.${flight.cabin_class}`, {}, { defaultValue: flight.cabin_class.replace('_', ' ') })}`
                : ''}
            </p>
          </div>
        </div>

        {/* Route + times */}
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          <div className="text-center">
            <p
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                'tabular-nums leading-none',
              )}
            >
              {fmtTime(flight.departure_time)}
            </p>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mt', 1),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {flight.origin_code}
            </p>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mt', 1),
                'text-on-surface-variant tabular-nums',
              )}
            >
              {fmtDate(flight.departure_time)}
            </p>
          </div>
          <div className={'flex-1 relative'}>
            <div
              className={
                'absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-outline'
              }
              aria-hidden="true"
            />
            <div
              className={'absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary'}
              aria-hidden="true"
            />
            <div
              className={
                'absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary'
              }
              aria-hidden="true"
            />
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'relative text-center bg-surface px-2 mx-auto w-fit uppercase tracking-widest',
                flight.stops === 0 ? 'text-nonstop' : 'text-layover',
              )}
            >
              {stopsLabel}
              {flight.stops > 0 && flight.stop_cities && flight.stop_cities.length > 0
                ? ` · ${flight.stop_cities.join(', ')}`
                : ''}
            </p>
          </div>
          <div className="text-center">
            <p
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                'tabular-nums leading-none',
              )}
            >
              {fmtTime(flight.arrival_time)}
            </p>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mt', 1),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {flight.destination_code}
            </p>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mt', 1),
                'text-on-surface-variant tabular-nums',
              )}
            >
              {fmtDate(flight.arrival_time)}
            </p>
          </div>
        </div>

        {/* Duration */}
        <div className={'text-center md:text-left'}>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'tabular-nums text-on-surface',
            )}
            style={{ fontFamily: '"DM Mono", SFMono-Regular, Menlo, monospace' }}
          >
            {fmtDuration(flight.duration_minutes)}
          </p>
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t('flightResultCard.totalLabel', {}, { defaultValue: 'Total time' })}
          </p>
        </div>

        {/* Price + CTA */}
        <div className={cm.cn(cm.flex({ direction: 'col', align: 'end', gap: 'xs' }), 'shrink-0')}>
          <p
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'tabular-nums leading-none',
              flight.deal_label === 'cheapest'
                ? 'text-cheapest'
                : flight.deal_label === 'deal'
                  ? 'text-deal'
                  : 'text-on-surface',
            )}
          >
            {fmtPrice(flight.price)}
          </p>
          <Link
            to={`/flight/${flight.id}?passengers=${passengers}`}
            onClick={() => {
              void track({
                name: 'flight.selected',
                properties: {
                  flight_id: flight.id,
                  airline: flight.airline,
                  origin: flight.origin_code,
                  destination: flight.destination_code,
                  price: flight.price,
                },
              })
            }}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'rounded-full bg-accent text-on-accent hover:bg-accent/90 transition-colors shadow-sm',
            )}
          >
            {t('flightResultCard.select', {}, { defaultValue: 'Select' })}
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </div>
      </div>
    </article>
  )
}
