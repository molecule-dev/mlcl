/**
 * Gradient hero card — Waypoint's Dashboard centerpiece. Renders the
 * upcoming trip with a 6xl-extrabold day countdown, frosted-glass status
 * pill, decorative blurred orbs in the corners, and an inline SVG flight
 * path sparkline that hints at the journey itself.
 *
 * Translated from personal-finance's NetWorthCard.tsx (gradient hero +
 * decorative orbs + 6xl numeric value) and travel-booking's
 * SojournHeroSearchCard.tsx (deep-teal `from-primary` to
 * `primary-container` palette + Plus Jakarta Sans display headline) —
 * adapted for itinerary-planner's "Every stop tells a story" voice and
 * the trip-countdown framing that's the most useful thing a traveler can
 * see when they open Waypoint.
 *
 * Props match the inline `Trip` shape used by Dashboard/Trips pages
 * (no fixtures yet — see TODO in Dashboard.tsx).
 */

import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE } from '../branding.js'

export interface UpcomingTrip {
  id: string
  destination: string
  country: string
  start_iso: string
  end_iso: string
  cover_url?: string
  status: 'confirmed' | 'tentative' | 'in_progress'
  collaborator_count: number
  budget_used_cents: number
  budget_total_cents: number
}

const STATUS_LABEL: Record<UpcomingTrip['status'], string> = {
  confirmed: 'Confirmed',
  tentative: 'Tentative',
  in_progress: 'In progress',
}

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

function fmtDateRange(start: string, end: string): string {
  const a = new Date(start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const b = new Date(end).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${a} – ${b}`
}

function tripDuration(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)))
}

function fmtMoney(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

export function TripCountdownHeroCard({ trip }: { trip: UpcomingTrip }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const days = daysUntil(trip.start_iso)
  const nights = tripDuration(trip.start_iso, trip.end_iso)
  const budgetPct =
    trip.budget_total_cents > 0
      ? Math.min(100, Math.round((trip.budget_used_cents / trip.budget_total_cents) * 100))
      : 0

  return (
    <section
      className={cm.cn(
        cm.sp('p', 10),
        cm.flex({ direction: 'col', justify: 'between' }),
        'min-h-[520px] bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-on-primary relative overflow-hidden',
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
            'tracking-[0.25em] uppercase text-accent',
          )}
        >
          <span
            className={'material-symbols-outlined text-base'}
            aria-hidden="true"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            flight_takeoff
          </span>
          {t(
            'tripCountdownHeroCard.eyebrow',
            { tagline: APP_TAGLINE },
            { defaultValue: 'Next adventure · {{tagline}}' },
          )}
        </span>
        <h1
          className={cm.cn(
            cm.sp('mb', 4),
            'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold',
          )}
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {trip.destination}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), cm.maxW('xl'), 'text-on-primary leading-relaxed')}>
          {t(
            'tripCountdownHeroCard.subtitle',
            { country: trip.country, dates: fmtDateRange(trip.start_iso, trip.end_iso), nights },
            {
              defaultValue:
                '{{country}} · {{dates}} · {{nights}} nights — your itinerary is ready to travel.',
            },
          )}
        </p>
      </div>

      <div
        className={cm.cn(
          'relative z-10',
          cm.sp('mt', 8),
          cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
        )}
      >
        <div className={cm.cn(cm.flex({ direction: 'col' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-on-primary/70',
            )}
          >
            {t('tripCountdownHeroCard.countdownLabel', {}, { defaultValue: 'Countdown' })}
          </span>
          <span
            className={cm.cn(
              'text-6xl md:text-7xl tabular-nums tracking-tighter font-extrabold leading-none',
              cm.sp('mt', 1),
            )}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {days}
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.sp('mt', 1),
              'text-on-primary',
            )}
          >
            {t(
              'tripCountdownHeroCard.daysLabel',
              { days },
              { defaultValue: '{{days}} days to go' },
            )}
          </span>
        </div>

        <div className={cm.cn('h-20 w-px bg-surface/20 hidden md:block')} aria-hidden="true" />

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'uppercase tracking-widest rounded-full bg-surface/20 backdrop-blur-md text-on-primary w-fit',
            )}
          >
            <span
              className={'material-symbols-outlined text-sm'}
              aria-hidden="true"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {trip.status === 'confirmed'
                ? 'check_circle'
                : trip.status === 'tentative'
                  ? 'schedule'
                  : 'flight_land'}
            </span>
            {t(
              `tripCountdownHeroCard.status.${trip.status}`,
              {},
              { defaultValue: STATUS_LABEL[trip.status] },
            )}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('sm'),
              'text-on-primary',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              group
            </span>
            {t(
              'tripCountdownHeroCard.collaborators',
              { count: trip.collaborator_count },
              { defaultValue: '{{count}} travelers' },
            )}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('sm'),
              'text-on-primary tabular-nums',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              payments
            </span>
            {t(
              'tripCountdownHeroCard.budget',
              {
                used: fmtMoney(trip.budget_used_cents),
                total: fmtMoney(trip.budget_total_cents),
                pct: budgetPct,
              },
              { defaultValue: '{{used}} of {{total}} ({{pct}}% of budget)' },
            )}
          </span>
        </div>

        <svg
          viewBox="0 0 320 80"
          aria-hidden="true"
          className={cm.cn('hidden md:block flex-1 max-w-md', cm.h(20))}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waypointSparkFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
            </linearGradient>
          </defs>
          <path
            d="M 0 60 Q 60 10, 110 35 T 220 30 T 320 18 L 320 80 L 0 80 Z"
            fill="url(#waypointSparkFill)"
          />
          <path
            d="M 0 60 Q 60 10, 110 35 T 220 30 T 320 18"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="2 6"
          />
          {[0, 110, 220, 320].map((x, i) => (
            <circle
              key={i}
              cx={x}
              cy={i === 0 ? 60 : i === 1 ? 35 : i === 2 ? 30 : 18}
              r="4"
              fill="white"
            />
          ))}
        </svg>
      </div>

      <div
        className={cm.cn(
          'relative z-10',
          cm.sp('mt', 8),
          cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
        )}
      >
        <Link
          to={`/trips/${trip.id}`}
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'sm' }),
            'rounded-full bg-accent text-on-accent hover:bg-accent-hover transition-colors shadow-lg',
          )}
        >
          {t('tripCountdownHeroCard.ctaPrimary', {}, { defaultValue: 'Open itinerary' })}
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            arrow_forward
          </span>
        </Link>
        <Link
          to="/trips/new"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'rounded-full border border-on-primary/40 text-on-primary hover:bg-on-primary/10 transition-colors',
          )}
        >
          {t('tripCountdownHeroCard.ctaSecondary', {}, { defaultValue: 'Plan another trip' })}
        </Link>
      </div>
    </section>
  )
}
