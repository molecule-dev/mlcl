/**
 * Editorial trip card — cover photograph in 16:9 aspect, status dot inline
 * with the destination title (per DESIGN.md "Status dot: 8px circle,
 * confirmed/tentative/cancelled color, inline with title"), date-range
 * pill in the top-left, stacked collaborator avatars bottom-right, and a
 * border-l-4 primary accent stripe to thread the rhythm of polished-11
 * card grids.
 *
 * Translated from travel-booking's TripItineraryRow.tsx (status pills,
 * tabular-nums totals, hover-lift transitions) and personal-finance's
 * AccountCard treatment (4px primary accent stripe down the left edge
 * for an editorial sidebar feel).
 *
 * Props match the inline `Trip` shape used by Trips/Dashboard pages
 * (no fixtures yet — see TODOs in pages).
 */

import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type TripStatus = 'confirmed' | 'tentative' | 'cancelled' | 'in_progress' | 'completed'

export interface TripSummary {
  id: string
  destination: string
  country: string
  cover_url?: string
  start_iso: string
  end_iso: string
  status: TripStatus
  collaborators: Array<{ id: string; name: string; avatar_url?: string }>
  stop_count: number
  budget_used_cents?: number
  budget_total_cents?: number
}

const STATUS_THEME: Record<
  TripStatus,
  { dot: string; label: string; pillBg: string; pillText: string }
> = {
  confirmed: {
    dot: 'bg-primary',
    label: 'Confirmed',
    pillBg: 'bg-cyan-100 dark:bg-cyan-900/40',
    pillText: 'text-cyan-800 dark:text-cyan-200',
  },
  tentative: {
    dot: 'bg-amber-500',
    label: 'Tentative',
    pillBg: 'bg-warning-light',
    pillText: 'text-warning',
  },
  in_progress: {
    dot: 'bg-emerald-500',
    label: 'In progress',
    pillBg: 'bg-success-light',
    pillText: 'text-success',
  },
  completed: {
    dot: 'bg-slate-400',
    label: 'Completed',
    pillBg: 'bg-surface-secondary',
    pillText: 'text-foreground',
  },
  cancelled: {
    dot: 'bg-rose-500',
    label: 'Cancelled',
    pillBg: 'bg-rose-100 dark:bg-rose-900/40',
    pillText: 'text-rose-800 dark:text-rose-200',
  },
}

function fmtRange(start: string, end: string): string {
  const a = new Date(start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const b = new Date(end).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const year = new Date(end).getFullYear()
  return `${a} – ${b}, ${year}`
}

function fmtMoney(cents?: number): string {
  if (typeof cents !== 'number') return ''
  return `$${Math.round(cents / 100).toLocaleString()}`
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function TripCoverCard({ trip }: { trip: TripSummary }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const theme = STATUS_THEME[trip.status]
  const showBudget = typeof trip.budget_total_cents === 'number' && trip.budget_total_cents > 0

  return (
    <Link
      to={`/trips/${trip.id}`}
      className={cm.cn(
        'group block bg-surface rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden border-l-4 border-primary',
      )}
    >
      <div className={cm.cn('relative aspect-[16/9] bg-surface-variant overflow-hidden')}>
        {trip.cover_url ? (
          <img
            src={trip.cover_url}
            alt={t(
              'common.photographOf',
              { name: trip.destination },
              { defaultValue: 'Photograph of {{name}}' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.h('full'),
              'object-cover transition-transform duration-500 group-hover:scale-105',
            )}
          />
        ) : null}
        <div
          className={cm.cn(
            'absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0',
          )}
          aria-hidden="true"
        />
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'absolute top-3 left-3 uppercase tracking-widest rounded bg-surface/95 text-on-surface backdrop-blur-md',
          )}
        >
          {fmtRange(trip.start_iso, trip.end_iso)}
        </span>
        <div className={cm.cn('absolute bottom-3 right-3', cm.flex({ align: 'center' }))}>
          {trip.collaborators.slice(0, 4).map((c, i) => (
            <span
              key={c.id}
              className={cm.cn(
                'w-7 h-7 rounded-full ring-2 ring-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-center bg-primary-container text-on-primary-container',
                i > 0 ? '-ml-2' : '',
              )}
              title={c.name}
              aria-label={c.name}
            >
              {c.avatar_url ? (
                <img
                  src={c.avatar_url}
                  alt=""
                  className={cm.cn(cm.w('full'), cm.h('full'), cm.roundedFull, 'object-cover')}
                />
              ) : (
                initials(c.name)
              )}
            </span>
          ))}
          {trip.collaborators.length > 4 ? (
            <span
              className={cm.cn(
                '-ml-2 w-7 h-7 rounded-full ring-2 ring-white text-[10px] font-bold tracking-wider flex items-center justify-center bg-surface-container text-on-surface',
              )}
            >
              +{trip.collaborators.length - 4}
            </span>
          ) : null}
        </div>
      </div>
      <div className={cm.cn(cm.sp('p', 5), cm.flex({ direction: 'col', gap: 'sm' }))}>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span className={cm.cn('w-2 h-2 rounded-full', theme.dot)} aria-hidden="true" />
          <h3
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('extrabold'),
              'leading-tight tracking-tight',
            )}
            style={{ fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif' }}
          >
            {trip.destination}
          </h3>
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'py-0.5 uppercase tracking-widest rounded-full ml-auto',
              theme.pillBg,
              theme.pillText,
            )}
          >
            {t(`tripCoverCard.status.${trip.status}`, {}, { defaultValue: theme.label })}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{trip.country}</p>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
            cm.textSize('xs'),
            'text-on-surface-variant tabular-nums',
          )}
        >
          {trip.stop_count > 0 ? (
            <span className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                place
              </span>
              {t(
                'tripCoverCard.stops',
                { count: trip.stop_count },
                { defaultValue: '{{count}} stops' },
              )}
            </span>
          ) : null}
          {trip.collaborators.length > 0 ? (
            <span className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                group
              </span>
              {t(
                'tripCoverCard.travelers',
                { count: trip.collaborators.length },
                { defaultValue: '{{count}} travelers' },
              )}
            </span>
          ) : null}
          {showBudget ? (
            <span className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                payments
              </span>
              {fmtMoney(trip.budget_used_cents ?? 0)} / {fmtMoney(trip.budget_total_cents)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
