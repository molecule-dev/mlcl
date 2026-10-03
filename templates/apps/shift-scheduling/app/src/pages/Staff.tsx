import { useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface StaffRow {
  id: string
  name: string
  first_name: string
  last_name: string
  avatar_initial: string
  email: string
  phone: string
  role: string
  max_weekly_hours: number
  status: string
}

interface ShiftRow {
  id: string
  staff_id: string | null
  duration_hours: number
}

const STATUS_FILTERS: { key: 'all' | 'active' | 'inactive'; defaultLabel: string }[] = [
  { key: 'all', defaultLabel: 'All' },
  { key: 'active', defaultLabel: 'Active' },
  { key: 'inactive', defaultLabel: 'Inactive' },
]

function isoWeekStart(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day))
  return d.toISOString().slice(0, 10)
}

export function Staff() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [search, setSearch] = useState('')
  const [composing, setComposing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [draft, setDraft] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'Barista',
    max_weekly_hours: '20',
  })

  function refresh(): Promise<void> {
    return Promise.all([
      http.get('/api/staff'),
      http.get(`/api/shifts?week_start=${isoWeekStart(new Date())}`),
    ])
      .then(([sRes, shRes]) => {
        setStaff(unwrapList<StaffRow>(sRes))
        setShifts(unwrapList<ShiftRow>(shRes))
      })
      .catch(() => {
        setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/staff').catch(() => null),
      http.get(`/api/shifts?week_start=${isoWeekStart(new Date())}`).catch(() => null),
    ])
      .then(([sRes, shRes]) => {
        if (cancelled) return
        setStaff(unwrapList<StaffRow>(sRes))
        setShifts(unwrapList<ShiftRow>(shRes))
      })
      .catch(() => {
        if (!cancelled) setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const hoursByStaff = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of shifts) {
      if (!s.staff_id) continue
      map.set(String(s.staff_id), (map.get(String(s.staff_id)) ?? 0) + s.duration_hours)
    }
    return map
  }, [shifts])

  const filtered = staff
    .filter((s) => (filter === 'all' ? true : s.status === filter))
    .filter((s) =>
      search
        ? [s.name, s.email, s.role].some((v) => v.toLowerCase().includes(search.toLowerCase()))
        : true,
    )

  // Store staffing health (design card) — computed from the loaded roster
  // and the current week's shifts, never hardcoded.
  const health = useMemo(() => {
    const total = staff.length
    if (total === 0) return null
    const active = staff.filter((s) => s.status === 'active').length
    const withinCaps = staff.filter(
      (s) => s.max_weekly_hours <= 0 || (hoursByStaff.get(String(s.id)) ?? 0) <= s.max_weekly_hours,
    ).length
    const capacity = staff.reduce((sum, s) => sum + Math.max(s.max_weekly_hours, 0), 0)
    const scheduled = [...hoursByStaff.values()].reduce((sum, h) => sum + h, 0)
    const pct = (n: number) => Math.round((n / total) * 100)
    return {
      withinCapsPct: pct(withinCaps),
      activePct: pct(active),
      utilizationPct: capacity > 0 ? Math.min(100, Math.round((scheduled / capacity) * 100)) : 0,
    }
  }, [staff, hoursByStaff])

  async function submitNew(): Promise<void> {
    setSubmitError(null)
    if (!draft.first_name || !draft.last_name || !draft.email) {
      setSubmitError(
        t(
          'staff.fieldsRequired',
          {},
          { defaultValue: 'First name, last name, and email are required.' },
        ),
      )
      return
    }
    setSubmitting(true)
    try {
      const created = await http.post('/api/staff', {
        first_name: draft.first_name,
        last_name: draft.last_name,
        email: draft.email,
        role: draft.role,
        max_weekly_hours: Number(draft.max_weekly_hours) || 40,
      })
      const member = unwrapSingle<{ id: string }>(created)
      void track({
        name: 'staff.created',
        properties: { staff_id: member?.id, role: draft.role },
      })
      setComposing(false)
      setDraft({
        first_name: '',
        last_name: '',
        email: '',
        role: 'Barista',
        max_weekly_hours: '20',
      })
      await refresh()
    } catch (err) {
      const msg =
        (err && typeof err === 'object' && 'message' in err ? String(err.message) : '') ||
        t('staff.submitFailed', {}, { defaultValue: 'Failed to add the staff member.' })
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function setStatus(row: StaffRow, status: 'active' | 'inactive'): Promise<void> {
    setActionError(null)
    try {
      await http.patch(`/api/staff/${row.id}`, { status })
      void track({ name: 'staff.status_changed', properties: { staff_id: row.id, status } })
    } catch (_err) {
      // Surface the failure inline — a silent no-op reads as "the button is
      // broken", and the page-level error branch would blank the roster.
      setActionError(t('staff.statusFailed', {}, { defaultValue: 'Could not update the status.' }))
    }
    await refresh()
  }

  return (
    <div className={cm.cn('px-4 py-6 sm:px-8 sm:py-8', cm.stack(6))}>
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary-dark')}
          >
            {t('staff.eyebrow', {}, { defaultValue: 'The crew' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('staff.heading', {}, { defaultValue: 'Staff roster' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
            {t(
              'staff.subheading',
              {},
              {
                defaultValue:
                  'Roles, max weekly hours, and how much of this week each person carries.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          data-mol-id="staff-add"
          onClick={() => setComposing((v) => !v)}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
            {composing ? 'close' : 'person_add'}
          </span>
          {composing
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('staff.addCta', {}, { defaultValue: 'Add staff' })}
        </button>
      </header>

      {composing ? (
        <section
          data-mol-id="staff-compose"
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
            {t('staff.compose.heading', {}, { defaultValue: 'New staff member' })}
          </h2>
          <div className={cm.cn(cm.sp('mt', 4), cm.grid({ cols: 5, gap: 'md' }))}>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <span
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.firstName', {}, { defaultValue: 'First name' })}
              </span>
              <input
                type="text"
                value={draft.first_name}
                onChange={(e) => setDraft({ ...draft, first_name: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary outline-none text-sm font-medium text-on-surface',
                )}
              />
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <span
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.lastName', {}, { defaultValue: 'Last name' })}
              </span>
              <input
                type="text"
                value={draft.last_name}
                onChange={(e) => setDraft({ ...draft, last_name: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary outline-none text-sm font-medium text-on-surface',
                )}
              />
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <span
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.email', {}, { defaultValue: 'Email' })}
              </span>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary outline-none text-sm font-medium text-on-surface',
                )}
              />
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <span
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.role', {}, { defaultValue: 'Role' })}
              </span>
              <input
                type="text"
                list="staff-roles"
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary outline-none text-sm font-medium text-on-surface',
                )}
              />
              <datalist id="staff-roles">
                <option value="Shift Lead" />
                <option value="Barista" />
                <option value="Cashier" />
                <option value="Cook" />
              </datalist>
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <span
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('staff.maxHours', {}, { defaultValue: 'Max h/week' })}
              </span>
              <input
                type="number"
                min={1}
                max={168}
                value={draft.max_weekly_hours}
                onChange={(e) => setDraft({ ...draft, max_weekly_hours: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary outline-none text-sm font-medium text-on-surface tabular-nums',
                )}
              />
            </label>
          </div>
          {submitError ? (
            <p
              data-mol-id="staff-compose-error"
              className={cm.cn(cm.sp('mt', 3), 'text-error text-sm font-semibold')}
            >
              {submitError}
            </p>
          ) : null}
          <div className={cm.cn(cm.sp('mt', 4))}>
            <button
              type="button"
              onClick={submitNew}
              disabled={submitting}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50',
              )}
            >
              {submitting
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('staff.compose.submit', {}, { defaultValue: 'Add staff member' })}
            </button>
          </div>
        </section>
      ) : null}

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
            cm.sp('mb', 4),
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  'rounded-full text-[10px] font-black uppercase tracking-widest transition-colors',
                  filter === f.key
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {t(`staff.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              'staff.searchPlaceholder',
              {},
              { defaultValue: 'Search name, email, role…' },
            )}
            aria-label={t('staff.searchLabel', {}, { defaultValue: 'Search staff' })}
            data-mol-id="staff-search"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary outline-none text-sm font-medium text-on-surface w-72',
            )}
          />
        </div>

        {actionError ? (
          <p
            data-mol-id="staff-action-error"
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-error')}
          >
            {actionError}
          </p>
        ) : null}

        {loading ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : error ? (
          <LoadErrorBanner message={error} onRetry={refresh} />
        ) : filtered.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('staff.empty', {}, { defaultValue: 'No staff match.' })}
          </p>
        ) : (
          <div className={cm.cn('overflow-x-auto')}>
            <table className={cm.cn('w-full min-w-[720px] text-left')}>
              <thead>
                <tr
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    'border-b border-outline-variant/20',
                  )}
                >
                  <th scope="col" className={cm.cn(cm.sp('px', 3), cm.sp('py', 2))}>
                    {t('staff.column.name', {}, { defaultValue: 'Name' })}
                  </th>
                  <th scope="col" className={cm.cn(cm.sp('px', 3), cm.sp('py', 2))}>
                    {t('form.role', {}, { defaultValue: 'Role' })}
                  </th>
                  <th scope="col" className={cm.cn(cm.sp('px', 3), cm.sp('py', 2))}>
                    {t('staff.column.contact', {}, { defaultValue: 'Contact' })}
                  </th>
                  <th scope="col" className={cm.cn(cm.sp('px', 3), cm.sp('py', 2))}>
                    {t('staff.column.thisWeek', {}, { defaultValue: 'This week' })}
                  </th>
                  <th scope="col" className={cm.cn(cm.sp('px', 3), cm.sp('py', 2))}>
                    {t('staff.column.status', {}, { defaultValue: 'Status' })}
                  </th>
                </tr>
              </thead>
              <tbody className={cm.cn('divide-y divide-outline-variant/20')}>
                {filtered.map((s) => {
                  const hours = hoursByStaff.get(String(s.id)) ?? 0
                  const over = s.max_weekly_hours > 0 && hours > s.max_weekly_hours
                  return (
                    <tr key={s.id} data-mol-id={`staff-row-${s.id}`}>
                      <td className={cm.cn(cm.sp('px', 3), cm.sp('py', 3))}>
                        <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                          <span
                            className={cm.cn(
                              'grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary-dark font-bold text-sm',
                            )}
                          >
                            {s.avatar_initial}
                          </span>
                          <span
                            className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface')}
                          >
                            {s.name}
                          </span>
                        </span>
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 3),
                          cm.textSize('sm'),
                          'text-on-surface-variant',
                        )}
                      >
                        {s.role}
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 3),
                          cm.textSize('sm'),
                          'text-on-surface-variant',
                        )}
                      >
                        {s.email}
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 3),
                          cm.textSize('sm'),
                          'tabular-nums',
                        )}
                      >
                        <span
                          className={cm.cn('font-bold', over ? 'text-error' : 'text-on-surface')}
                        >
                          {Math.round(hours * 10) / 10}
                        </span>
                        <span className={cm.cn('text-on-surface-variant')}>
                          {' '}
                          / {s.max_weekly_hours}
                          {t(
                            'shiftDetail.hours',
                            { count: s.max_weekly_hours },
                            { defaultValue: 'h' },
                          )}
                        </span>
                      </td>
                      <td className={cm.cn(cm.sp('px', 3), cm.sp('py', 3))}>
                        <button
                          type="button"
                          onClick={() =>
                            setStatus(s, s.status === 'active' ? 'inactive' : 'active')
                          }
                          aria-label={t(
                            'staff.toggleStatus',
                            {},
                            { defaultValue: 'Toggle status' },
                          )}
                          className={cm.cn(
                            cm.sp('px', 2),
                            cm.sp('py', 1),
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            'rounded-full uppercase tracking-wider transition-colors',
                            s.status === 'active'
                              ? 'bg-[color:var(--color-status-active-bg)] text-[color:var(--color-status-active)]'
                              : 'bg-[color:var(--color-status-inactive-bg)] text-[color:var(--color-status-inactive)]',
                          )}
                        >
                          {s.status === 'active'
                            ? t('status.active', {}, { defaultValue: 'Active' })
                            : t('status.inactive', {}, { defaultValue: 'Inactive' })}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Store staffing health & compliance (design card) */}
      <section
        data-mol-id="staff-health"
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          cm.stack(4),
        )}
      >
        <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' })}>
          <h2
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('lg'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'h-8 w-8 rounded-lg bg-secondary-container/40 shrink-0',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-lg text-secondary-dark')}>
                security
              </span>
            </span>
            {t('staff.healthHeading', {}, { defaultValue: 'Store Staffing Health' })}
          </h2>
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'rounded-full bg-secondary-container/40 text-secondary-dark uppercase tracking-wider',
            )}
          >
            {t('staff.healthBadge', {}, { defaultValue: 'Fair Workweek' })}
          </span>
        </div>
        {health ? (
          <ul className={cm.stack(3)}>
            {(
              [
                {
                  labelKey: 'staff.health.withinCaps',
                  labelDefault: 'Crew within weekly hour caps',
                  value: health.withinCapsPct,
                },
                {
                  labelKey: 'staff.health.active',
                  labelDefault: 'Active roster share',
                  value: health.activePct,
                },
                {
                  labelKey: 'staff.health.utilization',
                  labelDefault: 'Scheduled hours vs. capacity',
                  value: health.utilizationPct,
                },
              ] as const
            ).map((row) => (
              <li key={row.labelKey}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    cm.sp('mb', 1),
                    cm.textSize('xs'),
                  )}
                >
                  <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface-variant')}>
                    {t(row.labelKey, {}, { defaultValue: row.labelDefault })}
                  </span>
                  <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface tabular-nums')}>
                    {row.value}%
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className={cm.cn('h-1.5 w-full rounded-full bg-surface-container-high')}
                >
                  <div
                    className={cm.cn('h-1.5 rounded-full bg-primary')}
                    style={{ width: `${Math.min(100, Math.max(0, row.value))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('staff.healthEmpty', {}, { defaultValue: 'Add staff to see staffing health.' })}
          </p>
        )}
      </section>
    </div>
  )
}
