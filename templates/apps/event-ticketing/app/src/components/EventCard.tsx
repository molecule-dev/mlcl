import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Event grid card — 16:9 cover image with stacked rose date badge in the
 * top-left corner (per DESIGN.md "Event Card" recipe), category chip in
 * the top-right, gradient overlay, body with title + venue + price.
 *
 * Translated from auction-platform's AuctionCard.tsx — same image-first
 * card anatomy, with violet/rose ticketing palette and a stacked date
 * badge in place of the "bid count" chip.
 */
export interface EventSummary {
  id: string
  title: string
  category: string
  start_date: string
  start_time?: string
  venue_name: string
  city: string
  cover_image?: string
  min_price?: number
  is_free?: boolean
  is_sold_out?: boolean
  tickets_sold?: number
}

interface EventCardProps {
  event: EventSummary
  variant?: 'default' | 'compact'
}

function fmtPrice(cents?: number): string {
  if (typeof cents !== 'number') return '—'
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function dateParts(iso: string): { month: string; day: string; weekday: string } {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { month: '—', day: '—', weekday: '' }
  return {
    month: d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    day: String(d.getDate()).padStart(2, '0'),
    weekday: d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase(),
  }
}

export function EventCard({ event, variant = 'default' }: EventCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { month, day, weekday } = dateParts(event.start_date)
  const compact = variant === 'compact'
  const placeholder = !event.cover_image

  return (
    <Link
      to={`/events/${event.id}`}
      className={cm.cn(
        'group relative overflow-hidden bg-surface rounded-2xl border border-outline-variant/40',
        'shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all',
      )}
    >
      <div className={cm.cn('relative aspect-[16/9] bg-surface-container overflow-hidden')}>
        {placeholder ? (
          <div
            className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'w-full h-full')}
            aria-hidden="true"
            style={{
              background:
                'linear-gradient(135deg, var(--color-background-tertiary), var(--color-border-secondary))',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-7xl text-primary/50')}>
              festival
            </span>
          </div>
        ) : (
          <img
            src={event.cover_image}
            alt={event.title}
            className={cm.cn(
              'absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500',
            )}
          />
        )}

        {/* Bottom darken gradient */}
        <div
          className={cm.cn('absolute inset-0 pointer-events-none')}
          aria-hidden="true"
          style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(30,10,60,0.7))' }}
        />

        {/* Stacked rose date badge */}
        <div
          className={cm.cn('absolute top-3 left-3 px-3 py-2 rounded-xl text-white text-center')}
          style={{
            background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))',
            boxShadow: '0 10px 24px -8px color-mix(in srgb, var(--color-accent) 45%, transparent)',
          }}
        >
          <div
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest leading-none opacity-90',
            )}
          >
            {month}
          </div>
          <div className={cm.cn('text-xl font-extrabold tabular-nums leading-none mt-0.5')}>
            {day}
          </div>
        </div>

        {/* Category chip */}
        <div
          className={cm.cn(
            'absolute top-3 right-3 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-sm',
          )}
          style={{ background: 'rgba(255,255,255,0.92)', color: 'var(--color-primary-dark)' }}
        >
          {event.category}
        </div>

        {/* Sold-out overlay */}
        {event.is_sold_out ? (
          <div
            className={cm.cn(
              'absolute inset-x-3 bottom-3 px-3 py-1.5 rounded-md text-center text-[11px] font-black uppercase tracking-widest text-white shadow-md',
            )}
            style={{ background: 'var(--color-error)' }}
          >
            {t('eventCard.soldOut', {}, { defaultValue: 'Sold out' })}
          </div>
        ) : null}
      </div>

      <div className={cm.cn(cm.sp('p', compact ? 4 : 5), cm.stack(2))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            'font-bold uppercase tracking-wider text-on-surface-variant',
          )}
        >
          {weekday} {event.start_time ? `· ${event.start_time}` : null}
        </p>
        <h3
          className={cm.cn(
            cm.textSize(compact ? 'base' : 'lg'),
            'font-extrabold tracking-tight leading-snug line-clamp-2 text-on-surface',
          )}
        >
          {event.title}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant line-clamp-1')}>
          <span
            className={cm.cn('material-symbols-outlined text-sm align-text-bottom')}
            aria-hidden="true"
          >
            place
          </span>{' '}
          {event.venue_name} · {event.city}
        </p>
        <div
          className={cm.cn(
            cm.flex({ align: 'baseline', justify: 'between' }),
            cm.sp('pt', 2),
            'border-t border-outline-variant/40',
          )}
        >
          <span
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {event.is_free
              ? t('eventCard.priceFree', {}, { defaultValue: 'Free entry' })
              : t('eventCard.priceFrom', {}, { defaultValue: 'From' })}
          </span>
          {!event.is_free ? (
            <span
              className={cm.cn('text-xl font-extrabold tabular-nums tracking-tight')}
              style={{ color: 'var(--color-primary)' }}
            >
              {fmtPrice(event.min_price)}
            </span>
          ) : (
            <span
              className={cm.cn('text-sm font-extrabold tracking-widest uppercase')}
              style={{ color: 'var(--color-success)' }}
            >
              {t('eventCard.rsvp', {}, { defaultValue: 'RSVP' })}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default EventCard
