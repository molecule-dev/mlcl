import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { KpiCard, KpiCardGrid } from '@molecule/app-kpi-card-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

interface DashboardSummary {
  wedding: {
    id: string
    partner_a_name: string
    partner_b_name: string
    wedding_date: string
    venue: string | null
    rsvp_code: string
  }
  days_until: number | null
  guests_total: number
  rsvp_tally: { pending: number; yes: number; no: number; maybe: number }
  plus_ones_confirmed: number
  headcount_confirmed: number
  budget: { estimated_total_cents: number; actual_total_cents: number; line_item_count: number }
  tasks: {
    total: number
    done: number
    overdue: number
    upcoming: Array<{ id: string; title: string; category: string; due_date: string | null }>
  }
  vendors: { total: number; booked: number }
}

interface GuestRow {
  id: string
  name: string
  rsvp_status: string
  responded_at: string | null
}

interface SeatingTable {
  id: string
  name: string
  capacity: number
  seated_count: number
  over_capacity: boolean
}

interface SeatingResponse {
  tables: SeatingTable[]
}

/** Time-of-day greeting for the dashboard headline (the design opens with
 *  "Good morning, Clara & Julian" — the salutation follows the viewer's
 *  clock, the names follow the wedding record). */
function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

/** KpiCard's `icon` slot is a ReactNode — pass a material-symbols glyph, not
 *  a bare string (a string renders its literal text, e.g. "event"). */
function matIcon(name: string) {
  return (
    <span
      className="material-symbols-outlined text-[20px] text-on-surface-variant"
      aria-hidden="true"
    >
      {name}
    </span>
  )
}

/** Formats a date-only `YYYY-MM-DD` (the API normalizes DATE columns to
 *  calendar strings). Parsed as UTC midnight and rendered with
 *  `timeZone: 'UTC'` so every visitor sees the same calendar day — without
 *  the pin, west-of-UTC browsers shift the date one day back. */
function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const RSVP_CHIP_STYLES: Record<string, { bg: string; fg: string }> = {
  pending: { bg: 'var(--color-rsvp-pending-bg)', fg: 'var(--color-rsvp-pending)' },
  yes: { bg: 'var(--color-rsvp-yes-bg)', fg: 'var(--color-rsvp-yes)' },
  no: { bg: 'var(--color-rsvp-no-bg)', fg: 'var(--color-rsvp-no)' },
  maybe: { bg: 'var(--color-rsvp-maybe-bg)', fg: 'var(--color-rsvp-maybe)' },
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [recentResponses, setRecentResponses] = useState<GuestRow[]>([])
  const [seatingTables, setSeatingTables] = useState<SeatingTable[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get('/api/dashboard/summary')
      setSummary(res.data as DashboardSummary)
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    load()
  }, [load])

  // Live-activity + seating snapshots. Non-fatal: the dashboard renders
  // without them (each panel carries its own empty state).
  useEffect(() => {
    let cancelled = false
    const cutoff = Date.now() - 48 * 60 * 60 * 1000
    async function loadSide() {
      try {
        const [guestsRes, seatingRes] = await Promise.all([
          http.get('/api/guests'),
          http.get('/api/seating').catch(() => ({ data: { tables: [] } })),
        ])
        if (cancelled) return
        const guests = (guestsRes.data as GuestRow[]) ?? []
        setRecentResponses(
          guests.filter(
            (g) =>
              g.responded_at &&
              g.rsvp_status !== 'pending' &&
              new Date(g.responded_at).getTime() >= cutoff,
          ),
        )
        setSeatingTables(((seatingRes.data as SeatingResponse)?.tables ?? []).slice(0, 4))
      } catch {
        if (!cancelled) {
          setRecentResponses([])
          setSeatingTables([])
        }
      }
    }
    loadSide()
    return () => {
      cancelled = true
    }
  }, [http, summary])

  async function regenerateCode() {
    setRegenerating(true)
    try {
      await http.put('/api/wedding/regenerate-code', {})
      void track({ name: 'rsvp.code_regenerated' })
      await load()
    } catch (e) {
      setError((e as Error).message ?? 'Could not regenerate the RSVP code')
    } finally {
      setRegenerating(false)
    }
  }

  if (loading && !summary) {
    return (
      <div
        className={cm.cn(cm.sp('p', 8), cm.stack(4), 'max-w-5xl w-full mx-auto')}
        data-mol-id="page-dashboard-loading"
      >
        <div className={cm.cn('h-8 w-64 rounded-lg bg-surface-container-high animate-pulse')} />
        <div className={cm.cn('h-40 rounded-2xl bg-surface-container-high animate-pulse')} />
      </div>
    )
  }

  if (error && !summary) {
    return (
      <LoadErrorBanner
        className={cm.cn(cm.sp('p', 8), 'max-w-5xl w-full mx-auto')}
        data-mol-id="page-dashboard-error"
        message={t('dashboard.errorTitle', {}, { defaultValue: 'Could not load your dashboard' })}
        detail={error}
        onRetry={load}
        retryLabel={t('common.retry', {}, { defaultValue: 'Try again' })}
        retryMolId="dashboard-retry"
      />
    )
  }

  if (!summary) return null

  const { wedding, days_until: daysUntil, rsvp_tally: tally, budget, tasks, vendors } = summary
  const invited = tally.pending + tally.yes + tally.no + tally.maybe
  const responded = tally.yes + tally.no + tally.maybe
  const respondPct = invited > 0 ? Math.round((responded / invited) * 100) : 0
  const spentPct =
    budget.estimated_total_cents > 0
      ? Math.min(100, Math.round((budget.actual_total_cents / budget.estimated_total_cents) * 100))
      : 0
  const overBudget = budget.actual_total_cents > budget.estimated_total_cents
  const taskPct = tasks.total > 0 ? Math.round((tasks.done / tasks.total) * 100) : 0

  return (
    <div
      className={cm.cn(cm.sp('p', 6), cm.sp('px', 8), 'max-w-6xl w-full mx-auto')}
      data-mol-id="page-dashboard"
    >
      <header className={cm.cn(cm.stack(2))}>
        <p
          className={cm.cn('text-xs font-black uppercase tracking-widest')}
          style={{ color: 'var(--color-accent)' }}
        >
          {t('dashboard.eyebrow', {}, { defaultValue: 'Your wedding' })}
        </p>
        <h1
          className={cm.cn('text-4xl font-extrabold tracking-tight')}
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {t(
            'dashboard.greeting',
            { greeting: timeGreeting(), a: wedding.partner_a_name, b: wedding.partner_b_name },
            { defaultValue: '{{greeting}}, {{a}} & {{b}}' },
          )}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {formatDate(wedding.wedding_date)}
          {wedding.venue ? ` · ${wedding.venue}` : ''}
          {daysUntil != null
            ? t(
                'dashboard.countdown',
                { count: daysUntil },
                { defaultValue: daysUntil === 1 ? ' · 1 day to go' : ' · {{count}} days to go' },
              )
            : ''}
        </p>
      </header>

      {/* RSVP share card — the collection mechanism */}
      <section
        className={cm.cn(
          cm.sp('p', 6),
          'mt-6 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' }),
        )}
        data-mol-id="dashboard-rsvp-share"
      >
        <div>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t(
              'dashboard.portalHeading',
              {},
              { defaultValue: 'Guest RSVP portal & live activity' },
            )}
          </h2>
          <p
            className={cm.cn(
              'text-xs font-black uppercase tracking-widest text-on-surface-variant mt-2',
            )}
          >
            {t('dashboard.rsvpCodeLabel', {}, { defaultValue: 'Your RSVP code' })}
          </p>
          <p className={cm.cn('text-2xl font-extrabold font-mono tracking-widest mt-1')}>
            {wedding.rsvp_code}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
            {t(
              'dashboard.rsvpCodeHelp',
              {},
              {
                defaultValue:
                  'Put this code on your invitations — guests confirm at /rsvp/' +
                  wedding.rsvp_code,
              },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <Link
            to={`/rsvp/${wedding.rsvp_code}`}
            data-mol-id="dashboard-view-rsvp-page"
            className={cm.cn(
              cm.textSize('sm'),
              'px-4 py-2 rounded-xl font-bold border border-outline-variant/60 hover:bg-surface-hover',
            )}
          >
            {t('dashboard.viewRsvpPage', {}, { defaultValue: 'View guest page' })}
          </Link>
          <button
            type="button"
            onClick={regenerateCode}
            disabled={regenerating}
            data-mol-id="dashboard-regenerate-code"
            className={cm.cn(
              cm.textSize('sm'),
              'px-4 py-2 rounded-xl font-bold text-white disabled:opacity-50',
            )}
            style={{ background: 'var(--color-secondary)' }}
          >
            {regenerating
              ? t('dashboard.regenerating', {}, { defaultValue: 'Minting…' })
              : t('dashboard.regenerate', {}, { defaultValue: 'New code' })}
          </button>
        </div>
      </section>

      {/* KPI row */}
      <KpiCardGrid columns={4}>
        <KpiCard
          title={t('dashboard.kpiDays', {}, { defaultValue: 'Days to go' })}
          value={daysUntil != null ? String(daysUntil) : '—'}
          icon={matIcon('event')}
          accentSide="left"
          accentColor="border-primary"
          upperLabel
          emphasizeValue
          dataMolId="dashboard-kpi-days"
        />
        <KpiCard
          title={t('dashboard.kpiHeadcount', {}, { defaultValue: 'Confirmed headcount' })}
          value={String(summary.headcount_confirmed)}
          icon={matIcon('how_to_reg')}
          accentSide="left"
          accentColor="border-primary"
          upperLabel
          emphasizeValue
          dataMolId="dashboard-kpi-headcount"
        />
        <KpiCard
          title={t('dashboard.kpiBudget', {}, { defaultValue: 'Spent of estimated' })}
          value={`${formatMoney(budget.actual_total_cents)} / ${formatMoney(budget.estimated_total_cents)}`}
          icon={matIcon('savings')}
          accentSide="left"
          accentColor={overBudget ? 'border-error' : 'border-success'}
          upperLabel
          emphasizeValue
          dataMolId="dashboard-kpi-budget"
        />
        <KpiCard
          title={t('dashboard.kpiTasks', {}, { defaultValue: 'Tasks done' })}
          value={`${tasks.done} / ${tasks.total}`}
          icon={matIcon('checklist')}
          accentSide="left"
          accentColor="border-primary"
          upperLabel
          emphasizeValue
          dataMolId="dashboard-kpi-tasks"
        />
      </KpiCardGrid>

      <div className={cm.cn('mt-8 grid gap-6 lg:grid-cols-2')}>
        {/* RSVP tally */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
          )}
          data-mol-id="dashboard-rsvp-tally"
        >
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <h2 className={cm.cn('text-lg font-bold')}>
              {t('dashboard.rsvpTitle', {}, { defaultValue: 'RSVP tally' })}
            </h2>
            <Link
              to="/guests"
              className={cm.cn(
                cm.textSize('sm'),
                'inline-flex items-center min-h-[36px] px-1 font-bold text-primary hover:underline',
              )}
            >
              {t('dashboard.openGuests', {}, { defaultValue: 'Guest list →' })}
            </Link>
          </div>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
            {t(
              'dashboard.rsvpResponded',
              { pct: respondPct, responded, invited },
              { defaultValue: '{{responded}} of {{invited}} responded · {{pct}}%' },
            )}
          </p>
          <div
            className={cm.cn('mt-4 h-2.5 w-full rounded-full overflow-hidden')}
            style={{ background: 'var(--color-toggle-off)' }}
            role="progressbar"
            aria-label={t('dashboard.rsvpProgressAria', {}, { defaultValue: 'RSVP response rate' })}
            aria-valuenow={respondPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cm.cn('h-full rounded-full')}
              style={{ width: `${respondPct}%`, background: 'var(--color-primary)' }}
            />
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }), 'mt-4')}>
            {(['yes', 'pending', 'maybe', 'no'] as const).map((status) => (
              <span
                key={status}
                data-mol-id={`dashboard-tally-${status}`}
                className={cm.cn(
                  'px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide',
                )}
                style={{
                  background: RSVP_CHIP_STYLES[status].bg,
                  color: RSVP_CHIP_STYLES[status].fg,
                }}
              >
                {t(`rsvp.status.${status}`, {}, { defaultValue: status })} {tally[status]}
              </span>
            ))}
            <span className={cm.cn('text-xs font-bold text-on-surface-variant ml-auto')}>
              {t(
                'dashboard.plusOnes',
                { count: summary.plus_ones_confirmed },
                { defaultValue: '+{{count}} plus-ones' },
              )}
            </span>
          </div>
        </section>

        {/* Budget rollup */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
          )}
          data-mol-id="dashboard-budget"
        >
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <h2 className={cm.cn('text-lg font-bold')}>
              {t('dashboard.budgetTitle', {}, { defaultValue: 'Budget health' })}
            </h2>
            <Link
              to="/budget"
              className={cm.cn(
                cm.textSize('sm'),
                'inline-flex items-center min-h-[36px] px-1 font-bold text-primary hover:underline',
              )}
            >
              {t('dashboard.openBudget', {}, { defaultValue: 'Budget →' })}
            </Link>
          </div>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
            {t(
              'dashboard.budgetLines',
              { count: budget.line_item_count },
              {
                defaultValue: budget.line_item_count === 1 ? '1 line item' : '{{count}} line items',
              },
            )}
          </p>
          <div
            className={cm.cn('mt-4 h-2.5 w-full rounded-full overflow-hidden')}
            style={{ background: 'var(--color-toggle-off)' }}
            role="progressbar"
            aria-label={t('dashboard.budgetProgressAria', {}, { defaultValue: 'Budget spent' })}
            aria-valuenow={spentPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cm.cn('h-full rounded-full')}
              style={{
                width: `${spentPct}%`,
                background: overBudget ? 'var(--color-error)' : 'var(--color-success)',
              }}
            />
          </div>
          <p
            className={cm.cn(cm.textSize('sm'), 'mt-3 font-bold')}
            style={{ color: overBudget ? 'var(--color-error)' : 'var(--color-success)' }}
            data-mol-id="dashboard-budget-delta"
          >
            {overBudget
              ? t(
                  'dashboard.budgetOver',
                  {
                    amount: formatMoney(budget.actual_total_cents - budget.estimated_total_cents),
                  },
                  { defaultValue: '{{amount}} over estimate' },
                )
              : t(
                  'dashboard.budgetUnder',
                  {
                    amount: formatMoney(budget.estimated_total_cents - budget.actual_total_cents),
                  },
                  { defaultValue: '{{amount}} still to spend' },
                )}
          </p>
        </section>

        {/* Upcoming tasks */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
          )}
          data-mol-id="dashboard-tasks"
        >
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <h2 className={cm.cn('text-lg font-bold')}>
              {t('dashboard.tasksTitle', {}, { defaultValue: 'Tasks & priorities this month' })}
            </h2>
            <Link
              to="/tasks"
              className={cm.cn(
                cm.textSize('sm'),
                'inline-flex items-center min-h-[36px] px-1 font-bold text-primary hover:underline',
              )}
            >
              {t('dashboard.openTasks', {}, { defaultValue: 'Tasks →' })}
            </Link>
          </div>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
            {t(
              'dashboard.tasksProgress',
              { pct: taskPct },
              { defaultValue: '{{pct}}% of the checklist complete' },
            )}
            {tasks.overdue > 0
              ? t(
                  'dashboard.tasksOverdue',
                  { count: tasks.overdue },
                  { defaultValue: ' · {{count}} overdue' },
                )
              : ''}
          </p>
          <ul className={cm.cn(cm.stack(2), 'mt-4')}>
            {tasks.upcoming.length === 0 ? (
              <li className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'dashboard.tasksAllDone',
                  {},
                  { defaultValue: 'Everything is done. Enjoy it. 🥂' },
                )}
              </li>
            ) : (
              tasks.upcoming.map((task) => (
                <li
                  key={task.id}
                  data-mol-id={`dashboard-task-${task.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    'px-3 py-2 rounded-lg bg-surface-container',
                  )}
                >
                  <span className={cm.cn(cm.textSize('sm'), 'font-medium')}>{task.title}</span>
                  <span
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}
                  >
                    {formatDate(task.due_date)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Vendor progress */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
          )}
          data-mol-id="dashboard-vendors"
        >
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <h2 className={cm.cn('text-lg font-bold')}>
              {t('dashboard.vendorsTitle', {}, { defaultValue: 'Vendor milestones' })}
            </h2>
            <Link
              to="/vendors"
              className={cm.cn(
                cm.textSize('sm'),
                'inline-flex items-center min-h-[36px] px-1 font-bold text-primary hover:underline',
              )}
            >
              {t('dashboard.openVendors', {}, { defaultValue: 'Vendors →' })}
            </Link>
          </div>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
            {t(
              'dashboard.vendorsBooked',
              { booked: vendors.booked, total: vendors.total },
              { defaultValue: '{{booked}} of {{total}} booked or paid' },
            )}
          </p>
          <div
            className={cm.cn('mt-4 h-2.5 w-full rounded-full overflow-hidden')}
            style={{ background: 'var(--color-toggle-off)' }}
            role="progressbar"
            aria-label={t('dashboard.vendorsProgressAria', {}, { defaultValue: 'Vendors booked' })}
            aria-valuenow={
              vendors.total > 0 ? Math.round((vendors.booked / vendors.total) * 100) : 0
            }
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cm.cn('h-full rounded-full')}
              style={{
                width: `${vendors.total > 0 ? Math.round((vendors.booked / vendors.total) * 100) : 0}%`,
                background: 'var(--color-tertiary)',
              }}
            />
          </div>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-3')}>
            {t(
              'dashboard.vendorsHint',
              {},
              { defaultValue: 'Researching → contacted → booked → paid' },
            )}
          </p>
        </section>

        {/* Recent responses — the live activity feed (past 48 hours) */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
          )}
          data-mol-id="dashboard-recent-responses"
        >
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <h2 className={cm.cn('text-lg font-bold')}>
              {t('dashboard.recentTitle', {}, { defaultValue: 'Recent responses (past 48 hours)' })}
            </h2>
            <span
              className={cm.cn('w-2.5 h-2.5 rounded-full bg-success inline-block shrink-0')}
              aria-hidden="true"
            />
          </div>
          {recentResponses.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-3')}>
              {t(
                'dashboard.recentEmpty',
                {},
                {
                  defaultValue:
                    'No responses in the last two days — new RSVPs will land here the moment guests answer.',
                },
              )}
            </p>
          ) : (
            <ul className={cm.cn(cm.stack(2), 'mt-4')}>
              {recentResponses.slice(0, 5).map((guest) => (
                <li
                  key={guest.id}
                  data-mol-id={`dashboard-recent-${guest.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    'px-3 py-2 rounded-lg bg-surface-container',
                  )}
                >
                  <span className={cm.cn(cm.textSize('sm'), 'font-medium truncate')}>
                    {guest.name}
                  </span>
                  <span
                    className={cm.cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide shrink-0',
                    )}
                    style={{
                      background: RSVP_CHIP_STYLES[guest.rsvp_status]?.bg,
                      color: RSVP_CHIP_STYLES[guest.rsvp_status]?.fg,
                    }}
                  >
                    {t(`rsvp.status.${guest.rsvp_status}`, {}, { defaultValue: guest.rsvp_status })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Seating studio snapshot — the floorplan at a glance */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
          )}
          data-mol-id="dashboard-seating"
        >
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <h2 className={cm.cn('text-lg font-bold')}>
              {t('dashboard.seatingTitle', {}, { defaultValue: 'Seating studio & terrace layout' })}
            </h2>
            <Link
              to="/seating"
              className={cm.cn(
                cm.textSize('sm'),
                'inline-flex items-center min-h-[36px] px-1 font-bold text-primary hover:underline',
              )}
            >
              {t('dashboard.openSeating', {}, { defaultValue: 'Seating →' })}
            </Link>
          </div>
          {seatingTables.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-3')}>
              {t(
                'dashboard.seatingEmpty',
                {},
                { defaultValue: 'No tables yet — open the seating studio to draw the floorplan.' },
              )}
            </p>
          ) : (
            <ul className={cm.cn('mt-4 grid gap-2 sm:grid-cols-2')}>
              {seatingTables.map((table) => (
                <li
                  key={table.id}
                  data-mol-id={`dashboard-table-${table.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    'px-3 py-2 rounded-lg bg-surface-container',
                  )}
                >
                  <span className={cm.cn(cm.textSize('sm'), 'font-medium truncate')}>
                    {table.name}
                  </span>
                  <span
                    className={cm.cn(cm.textSize('xs'), 'font-bold tabular-nums')}
                    style={{ color: table.over_capacity ? 'var(--color-error)' : undefined }}
                  >
                    {table.seated_count}/{table.capacity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
