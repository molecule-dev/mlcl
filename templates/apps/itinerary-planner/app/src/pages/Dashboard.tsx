/**
 * Dashboard — the auth'd landing page. Renders the gradient
 * `<TripCountdownHeroCard>` for the next-up trip, a quad of
 * `<BudgetSpendCard>` KPIs aggregated from /api/expenses, and an
 * editorial grid of `<TripCoverCard>` thumbnails for live/planning
 * trips that aren't the upcoming one.
 *
 * Empty-state when no trips: a CTA to plan one.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  type BudgetCategory,
  type BudgetSpend,
  BudgetSpendCard,
} from '../components/BudgetSpendCard.js'
import { TripCountdownHeroCard } from '../components/TripCountdownHeroCard.js'
import { TripCoverCard } from '../components/TripCoverCard.js'
import {
  type ExpenseRow,
  pickUpcomingTrip,
  type TripRow,
  tripRowToSummary,
  tripRowToUpcoming,
} from '../lib/api.js'

const KNOWN_CATS: BudgetCategory[] = [
  'accommodation',
  'food',
  'sightseeing',
  'transport',
  'activity',
  'shopping',
  'other',
]

function categoryFor(s: string): BudgetCategory {
  const lower = (s || '').toLowerCase()
  if (lower === 'lodging' || lower === 'accommodation') return 'accommodation'
  if (lower === 'food' || lower === 'meals') return 'food'
  if (lower === 'sightseeing') return 'sightseeing'
  if (lower === 'transport' || lower === 'transit') return 'transport'
  if (lower === 'activities' || lower === 'activity') return 'activity'
  if (lower === 'shopping') return 'shopping'
  return 'other'
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [trips, setTrips] = useState<TripRow[]>([])
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http
        .get<TripRow[]>('/trips')
        .then((r) => (Array.isArray(r.data) ? r.data : []))
        .catch(() => [] as TripRow[]),
      http
        .get<ExpenseRow[]>('/expenses')
        .then((r) => (Array.isArray(r.data) ? r.data : []))
        .catch(() => [] as ExpenseRow[]),
    ])
      .then(([tripsRows, expRows]) => {
        if (cancelled) return
        setTrips(tripsRows)
        setExpenses(expRows)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const upcomingRow = useMemo(() => pickUpcomingTrip(trips), [trips])
  const livePlanningSummaries = useMemo(() => {
    if (!upcomingRow) return [] as ReturnType<typeof tripRowToSummary>[]
    return trips
      .filter((r) => r.id !== upcomingRow.id)
      .map(tripRowToSummary)
      .filter(
        (s) => s.status === 'in_progress' || s.status === 'tentative' || s.status === 'confirmed',
      )
      .slice(0, 3)
  }, [trips, upcomingRow])

  const budgetSpends: BudgetSpend[] = useMemo(() => {
    if (expenses.length === 0) return []
    const totalBudget = trips.reduce((acc, t) => acc + Number(t.budget_total_cents ?? 0), 0)
    const byCat = new Map<BudgetCategory, { spent: number; count: number }>()
    for (const exp of expenses) {
      const cat = categoryFor(exp.category)
      const cur = byCat.get(cat) ?? { spent: 0, count: 0 }
      cur.spent += Number(exp.amount_cents ?? 0)
      cur.count += 1
      byCat.set(cat, cur)
    }
    const totalSpent = Array.from(byCat.values()).reduce((a, b) => a + b.spent, 0)
    const cats = KNOWN_CATS.filter((k) => byCat.has(k))
    if (cats.length === 0) return []
    return cats
      .map((category) => {
        const stats = byCat.get(category)!
        const share = totalSpent > 0 ? stats.spent / totalSpent : 0
        const slice = Math.max(stats.spent, Math.round(totalBudget * share))
        return {
          category,
          spent_cents: stats.spent,
          budget_cents: slice > 0 ? slice : Math.max(stats.spent, 1000),
          recent_count: stats.count,
        }
      })
      .slice(0, 4)
  }, [expenses, trips])

  return (
    <div
      className={cm.cn(
        cm.maxW('7xl'),
        cm.sp('px', 8),
        cm.sp('py', 10),
        cm.mxAuto,
        cm.flex({ direction: 'col', gap: 'lg' }),
      )}
    >
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary',
            )}
          >
            {t('dashboard.eyebrow', {}, { defaultValue: 'Mission control' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 2),
              'leading-tight tracking-tight',
            )}
            style={{ fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif' }}
          >
            {t(
              'dashboard.heading',
              {},
              { defaultValue: 'Your next adventure, in one quiet corner.' },
            )}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('base'),
              cm.sp('mt', 2),
              cm.maxW('2xl'),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'dashboard.subheading',
              {},
              {
                defaultValue:
                  'A countdown to the next trip, today\u2019s spending pulse, and a quick glance at every itinerary in motion.',
              },
            )}
          </p>
        </div>
        <Link
          to="/trips/new"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'sm' }),
            'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-md',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            add
          </span>
          {t('dashboard.newTripCta', {}, { defaultValue: 'Start a new trip' })}
        </Link>
      </header>

      {!loading && trips.length === 0 ? (
        <section
          data-testid="dashboard-empty"
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-3xl bg-surface-container-low border border-outline-variant/40',
          )}
        >
          <span
            className="material-symbols-outlined text-4xl text-on-surface-variant"
            aria-hidden="true"
          >
            flight_takeoff
          </span>
          <h2
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 3),
              'tracking-tight',
            )}
            style={{ fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif' }}
          >
            {t(
              'dashboard.empty.heading',
              {},
              { defaultValue: 'No trips yet — your atlas is blank.' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'dashboard.empty.body',
              {},
              {
                defaultValue:
                  'Plan your first trip and your dashboard will fill with day-by-day timelines, budget pulse, and bookings.',
              },
            )}
          </p>
          <Link
            to="/trips/new"
            className={cm.cn(
              cm.sp('mt', 4),
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              'inline-block rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors',
            )}
          >
            {t('dashboard.empty.cta', {}, { defaultValue: 'Plan your first trip' })}
          </Link>
        </section>
      ) : null}

      {upcomingRow ? <TripCountdownHeroCard trip={tripRowToUpcoming(upcomingRow)} /> : null}

      {budgetSpends.length > 0 ? (
        <section className={cm.flex({ direction: 'col', gap: 'sm' })}>
          <div
            className={cm.cn(
              cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'sm' }),
            )}
          >
            <h2
              className={cm.cn(cm.textSize('xl'), cm.fontWeight('extrabold'), 'tracking-tight')}
              style={{ fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif' }}
            >
              {t('dashboard.budgetHeading', {}, { defaultValue: 'Budget pulse' })}
            </h2>
            <Link
              to="/expenses"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline',
              )}
            >
              {t('dashboard.viewAllExpenses', {}, { defaultValue: 'View every expense' })}
            </Link>
          </div>
          <div
            data-testid="dashboard-budget"
            className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5')}
          >
            {budgetSpends.map((spend, i) => (
              <BudgetSpendCard key={`${spend.category}-${i}`} spend={spend} />
            ))}
          </div>
        </section>
      ) : null}

      {livePlanningSummaries.length > 0 ? (
        <section className={cm.flex({ direction: 'col', gap: 'sm' })}>
          <div
            className={cm.cn(
              cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'sm' }),
            )}
          >
            <h2
              className={cm.cn(cm.textSize('xl'), cm.fontWeight('extrabold'), 'tracking-tight')}
              style={{ fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif' }}
            >
              {t('dashboard.tripsHeading', {}, { defaultValue: 'Trips in motion' })}
            </h2>
            <Link
              to="/trips"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline',
              )}
            >
              {t('dashboard.viewAllTrips', {}, { defaultValue: 'See every trip' })}
            </Link>
          </div>
          <div
            data-testid="dashboard-trips"
            className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')}
          >
            {livePlanningSummaries.map((trip) => (
              <TripCoverCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
