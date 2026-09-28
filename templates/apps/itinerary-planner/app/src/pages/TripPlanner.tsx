/**
 * TripPlanner — multi-step builder for a brand-new trip. Renders three
 * stacked cards: cover & dates, traveler & budget, and a starter day
 * timeline that previews the editorial DayTimelineRow once the trip is
 * saved. Side panel surfaces the live preview of the cover card and a
 * checklist of remaining steps.
 */

import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { TripCoverCard } from '../components/TripCoverCard.js'
import type { TripRow } from '../lib/api.js'

const PALETTE = ['iceland', 'japan', 'portugal', 'oaxaca', 'faroe', 'morocco'] as const

type FormState = {
  destination: string
  country: string
  startIso: string
  endIso: string
  travelers: number
  budget: number
}

const DEFAULT_FORM: FormState = {
  destination: '',
  country: '',
  startIso: '',
  endIso: '',
  travelers: 2,
  budget: 4000,
}

function fmtMoney(amount: number): string {
  return `$${amount.toLocaleString()}`
}

export function TripPlanner() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Prefill from query params (Destinations card → "Add to a trip" deep
  // link). This is the user's expected outcome of clicking the CTA: the
  // planner opens with the destination already filled in.
  const prefillDestination = searchParams.get('destination') ?? ''
  const prefillCountry = searchParams.get('country') ?? ''
  const [form, setForm] = useState<FormState>(() => ({
    ...DEFAULT_FORM,
    destination: prefillDestination,
    country: prefillCountry,
  }))
  const [seed] = useState(() => PALETTE[Math.floor(Math.random() * PALETTE.length)])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const previewTrip = useMemo(
    () => ({
      id: 'preview',
      destination:
        form.destination ||
        t(
          'tripPlanner.preview.placeholderDestination',
          {},
          { defaultValue: 'Your next adventure' },
        ),
      country:
        form.country ||
        t('tripPlanner.preview.placeholderCountry', {}, { defaultValue: 'Pick a country' }),
      cover_url: `https://picsum.photos/seed/waypoint-${seed}/1200/675`,
      start_iso: form.startIso || new Date().toISOString(),
      end_iso: form.endIso || new Date(Date.now() + 7 * 86_400_000).toISOString(),
      status: 'tentative' as const,
      collaborators: [
        { id: 'me', name: 'You' },
        { id: 'team', name: 'Travel Co.' },
      ],
      stop_count: 0,
      budget_used_cents: 0,
      budget_total_cents: form.budget * 100,
    }),
    [form, seed, t],
  )

  const checklist = [
    { key: 'destination', done: !!form.destination, label: 'Name the destination' },
    { key: 'dates', done: !!(form.startIso && form.endIso), label: 'Pick travel dates' },
    { key: 'travelers', done: form.travelers > 0, label: 'Confirm traveler count' },
    { key: 'budget', done: form.budget > 0, label: 'Set a starting budget' },
  ]

  const canSubmit = !!form.destination && !!form.startIso && !!form.endIso && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      const body = {
        name: form.destination,
        destination: form.destination,
        country: form.country || null,
        cover_url: previewTrip.cover_url,
        start_date: form.startIso,
        end_date: form.endIso,
        status: 'planning',
        budget_total_cents: form.budget * 100,
        visibility: 'private',
      }
      const resp = await http.post<TripRow>('/trips', body)
      const trip = resp.data
      if (trip && trip.id) {
        // Fire-and-forget: track() no-ops without a bonded provider.
        void track({
          name: 'trip.created',
          properties: {
            trip_id: trip.id,
            destination: trip.destination,
            budget_total_cents: body.budget_total_cents,
          },
        })
        navigate(`/trips/${trip.id}`)
      } else {
        setError(
          t('tripPlanner.errors.noId', {}, { defaultValue: 'Trip created but no id returned.' }),
        )
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(
        msg ||
          t(
            'tripPlanner.errors.generic',
            {},
            { defaultValue: 'Could not create trip — try again.' },
          ),
      )
    } finally {
      setSubmitting(false)
    }
  }

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
            {t('tripPlanner.eyebrow', {}, { defaultValue: 'New itinerary' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 2),
              'leading-tight tracking-tight',
            )}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {t('tripPlanner.heading', {}, { defaultValue: 'Sketch a trip in under a minute.' })}
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
              'tripPlanner.subheading',
              {},
              {
                defaultValue:
                  'Drop the basics in below \u2014 you can always invite collaborators, drag in stops, and forward bookings later.',
              },
            )}
          </p>
        </div>
        <Link
          to="/trips"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-primary hover:underline',
          )}
        >
          <span className={cm.flex({ align: 'center', gap: 'xs' })}>
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              arrow_back
            </span>
            {t('tripPlanner.backToTrips', {}, { defaultValue: 'Back to all trips' })}
          </span>
        </Link>
      </header>

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-8')}>
        <form
          onSubmit={handleSubmit}
          className={cm.cn('lg:col-span-7', cm.flex({ direction: 'col', gap: 'md' }))}
        >
          {error ? (
            <div
              role="alert"
              data-testid="trip-planner-error"
              className={cm.cn(
                cm.sp('p', 4),
                'rounded-xl bg-error/10 text-error border border-error/30',
              )}
            >
              {error}
            </div>
          ) : null}
          <section
            className={cm.cn(
              cm.sp('p', 6),
              cm.accentCard({ tone: 'primary' }),
              'bg-surface rounded-2xl shadow-sm border border-outline-variant/40',
            )}
          >
            <h2
              className={cm.cn(cm.textSize('lg'), cm.fontWeight('extrabold'), 'tracking-tight')}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t('tripPlanner.section1.title', {}, { defaultValue: 'Where & when' })}
            </h2>
            <div className={cm.cn(cm.sp('mt', 4), 'grid grid-cols-1 md:grid-cols-2 gap-4')}>
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('tripPlanner.fields.destinationLabel', {}, { defaultValue: 'Destination' })}
                </span>
                <input
                  type="text"
                  required
                  data-testid="trip-planner-destination"
                  value={form.destination}
                  onChange={(e) => update('destination', e.target.value)}
                  placeholder={t(
                    'tripPlanner.fields.destinationPlaceholder',
                    {},
                    { defaultValue: 'e.g. Reykjav\u00edk & the Ring Road' },
                  )}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
                  )}
                />
              </label>
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('tripPlanner.fields.countryLabel', {}, { defaultValue: 'Country / region' })}
                </span>
                <input
                  type="text"
                  data-testid="trip-planner-country"
                  value={form.country}
                  onChange={(e) => update('country', e.target.value)}
                  placeholder={t(
                    'tripPlanner.fields.countryPlaceholder',
                    {},
                    { defaultValue: 'e.g. Iceland' },
                  )}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
                  )}
                />
              </label>
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.startDate', {}, { defaultValue: 'Start date' })}
                </span>
                <input
                  type="date"
                  required
                  data-testid="trip-planner-start"
                  value={form.startIso ? form.startIso.slice(0, 10) : ''}
                  onChange={(e) =>
                    update('startIso', e.target.value ? new Date(e.target.value).toISOString() : '')
                  }
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
                  )}
                />
              </label>
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('tripPlanner.fields.endLabel', {}, { defaultValue: 'End date' })}
                </span>
                <input
                  type="date"
                  required
                  data-testid="trip-planner-end"
                  value={form.endIso ? form.endIso.slice(0, 10) : ''}
                  onChange={(e) =>
                    update('endIso', e.target.value ? new Date(e.target.value).toISOString() : '')
                  }
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
                  )}
                />
              </label>
            </div>
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              cm.accentCard({ tone: 'custom' }),
              'bg-surface rounded-2xl shadow-sm border border-outline-variant/40',
            )}
            style={{ ['--mol-accent' as string]: 'var(--color-accent)' }}
          >
            <h2
              className={cm.cn(cm.textSize('lg'), cm.fontWeight('extrabold'), 'tracking-tight')}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t('tripPlanner.section2.title', {}, { defaultValue: 'Travelers & budget' })}
            </h2>
            <div className={cm.cn(cm.sp('mt', 4), 'grid grid-cols-1 md:grid-cols-2 gap-4')}>
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('tripPlanner.fields.travelersLabel', {}, { defaultValue: 'Travelers' })}
                </span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  data-testid="trip-planner-travelers"
                  value={form.travelers}
                  onChange={(e) => update('travelers', Math.max(1, Number(e.target.value) || 1))}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors tabular-nums',
                  )}
                />
              </label>
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(
                    'tripPlanner.fields.budgetLabel',
                    { amount: fmtMoney(form.budget) },
                    { defaultValue: 'Budget \u00b7 {{amount}}' },
                  )}
                </span>
                <input
                  type="range"
                  min={500}
                  max={20000}
                  step={250}
                  data-testid="trip-planner-budget"
                  value={form.budget}
                  onChange={(e) => update('budget', Number(e.target.value))}
                  className={cm.cn(cm.w('full'), 'accent-primary')}
                />
              </label>
            </div>
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface-container-low rounded-2xl border border-dashed border-outline-variant',
            )}
          >
            <h2
              className={cm.cn(cm.textSize('lg'), cm.fontWeight('extrabold'), 'tracking-tight')}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t('tripPlanner.section3.title', {}, { defaultValue: 'Day plan starter' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {t(
                'tripPlanner.section3.body',
                {},
                {
                  defaultValue:
                    'Once the trip is saved, drag stops in from your inbox or the Destinations browser \u2014 each one snaps into a day.',
                },
              )}
            </p>
            <ol className={cm.cn(cm.sp('mt', 4), 'space-y-3')}>
              {[1, 2, 3].map((d) => (
                <li
                  key={d}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('p', 4),
                    cm.accentCard({ tone: 'custom' }),
                    'rounded-xl bg-surface',
                  )}
                  style={{ ['--mol-accent' as string]: 'var(--color-cyan-700)' }}
                >
                  <span
                    className={cm.cn(
                      'w-8 h-8 rounded-full bg-primary/10 text-primary tabular-nums flex items-center justify-center font-extrabold',
                    )}
                  >
                    {d}
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      `tripPlanner.section3.day${d}`,
                      { day: d },
                      {
                        defaultValue: 'Day {{day}} \u2014 add stops, transport, and bookings here.',
                      },
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <div className={cm.cn(cm.flex({ align: 'center', justify: 'end', gap: 'sm' }))}>
            <Link
              to="/trips"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'rounded-full border border-outline-variant text-on-surface hover:border-primary hover:text-primary transition-colors',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </Link>
            <button
              type="submit"
              disabled={!canSubmit}
              data-testid="trip-planner-submit"
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.flex({ align: 'center', gap: 'sm' }),
                'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {submitting
                ? t('tripPlanner.submitting', {}, { defaultValue: 'Creating\u2026' })
                : t('tripPlanner.submit', {}, { defaultValue: 'Create trip' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </div>
        </form>

        <aside className={cm.cn('lg:col-span-5', cm.flex({ direction: 'col', gap: 'md' }))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary',
            )}
          >
            {t('tripPlanner.preview.eyebrow', {}, { defaultValue: 'Live preview' })}
          </p>
          <TripCoverCard trip={previewTrip} />
          <section
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface rounded-2xl shadow-sm border border-outline-variant/40',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('tripPlanner.checklist.heading', {}, { defaultValue: 'Quick checklist' })}
            </h3>
            <ul className={cm.cn(cm.sp('mt', 3), 'space-y-2')}>
              {checklist.map((step) => (
                <li key={step.key} className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span
                    aria-hidden="true"
                    className={cm.cn(
                      'material-symbols-outlined text-base',
                      step.done ? 'text-primary' : 'text-on-surface-variant',
                    )}
                    style={step.done ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {step.done ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      step.done ? 'text-on-surface' : 'text-on-surface-variant',
                    )}
                  >
                    {t(`tripPlanner.checklist.${step.key}`, {}, { defaultValue: step.label })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
