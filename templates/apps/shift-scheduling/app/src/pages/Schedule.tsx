import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

export interface ScheduleShift {
  id: string
  staff_id: string | null
  staff_name: string
  staff_initial: string
  is_open: boolean
  role: string
  starts_at: string
  ends_at: string
  date: string
  start_time: string
  end_time: string
  time_label: string
  duration_hours: number
  published: boolean
  notes: string
  availability_warning: string | null
}

interface StaffOption {
  id: string
  name: string
  avatar_initial: string
  role: string
}

const ROLE_COLOR: Record<string, string> = {
  'Shift Lead': 'var(--color-role-lead)',
  Barista: 'var(--color-role-barista)',
  Cashier: 'var(--color-role-cashier)',
  Cook: 'var(--color-role-cook)',
}

function roleColor(role: string): string {
  return ROLE_COLOR[role] ?? 'var(--color-role-general)'
}

/** Monday-based week helpers mirrored from the API (single source: week math is stable). */
function isoWeekStart(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day))
  return d.toISOString().slice(0, 10)
}

function shiftWeeks(weekStart: string, weeks: number): string {
  const d = new Date(`${weekStart}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${weekStart}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

function weekLabelParts(weekStart: string): { start: string; end: string } {
  const start = new Date(`${weekStart}T00:00:00Z`)
  const end = new Date(`${weekStart}T00:00:00Z`)
  end.setUTCDate(end.getUTCDate() + 6)
  const fmt = (d: Date): string =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return { start: fmt(start), end: fmt(end) }
}

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export function Schedule() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [weekStart, setWeekStart] = useState(() => isoWeekStart(new Date()))
  const [shifts, setShifts] = useState<ScheduleShift[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [draft, setDraft] = useState({
    staff_id: '',
    role: 'Barista',
    date: '',
    start_time: '09:00',
    end_time: '17:00',
    notes: '',
  })

  const dates = useMemo(() => weekDates(weekStart), [weekStart])
  const label = weekLabelParts(weekStart)

  const rows = useMemo(() => {
    // Every staff row (including inactive ones holding shifts this week) + a
    // trailing "Open shifts" pseudo-row for the unassigned blocks.
    const seen = new Set<string>()
    const list: { key: string; id: string | null; name: string; initial: string }[] = []
    for (const s of staff) {
      if (s.id == null) continue
      list.push({ key: s.id, id: s.id, name: s.name, initial: s.avatar_initial })
      seen.add(String(s.id))
    }
    for (const sh of shifts) {
      if (sh.staff_id && !seen.has(String(sh.staff_id))) {
        list.push({
          key: sh.staff_id,
          id: sh.staff_id,
          name: sh.staff_name || 'Unknown',
          initial: sh.staff_initial || '?',
        })
        seen.add(String(sh.staff_id))
      }
    }
    list.push({
      key: '__open__',
      id: null,
      name: t('schedule.openRow', {}, { defaultValue: 'Open shifts' }),
      initial: '?',
    })
    return list
  }, [staff, shifts, t])

  const publishedCount = shifts.filter((s) => s.published).length
  const draftCount = shifts.length - publishedCount
  const allPublished = shifts.length > 0 && draftCount === 0

  function refresh(): Promise<void> {
    return Promise.all([http.get(`/api/shifts?week_start=${weekStart}`), http.get('/api/staff')])
      .then(([sRes, eRes]) => {
        setShifts(unwrapList<ScheduleShift>(sRes))
        setStaff(unwrapList<StaffOption>(eRes))
      })
      .catch(() => {
        setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/shifts?week_start=${weekStart}`).catch(() => null),
      http.get('/api/staff').catch(() => null),
    ])
      .then(([sRes, eRes]) => {
        if (cancelled) return
        setShifts(unwrapList<ScheduleShift>(sRes))
        setStaff(unwrapList<StaffOption>(eRes))
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
  }, [http, t, weekStart])

  async function submitNew(): Promise<void> {
    setSubmitError(null)
    if (!draft.date || !draft.start_time || !draft.end_time) {
      setSubmitError(
        t('schedule.dateRequired', {}, { defaultValue: 'Date, start, and end time are required.' }),
      )
      return
    }
    setSubmitting(true)
    try {
      await http.post('/api/shifts', {
        staff_id: draft.staff_id || null,
        role: draft.role,
        date: draft.date,
        start_time: draft.start_time,
        end_time: draft.end_time,
        notes: draft.notes || '',
      })
      setComposing(false)
      setDraft({
        staff_id: '',
        role: 'Barista',
        date: '',
        start_time: '09:00',
        end_time: '17:00',
        notes: '',
      })
      await refresh()
    } catch (err) {
      const msg =
        (err && typeof err === 'object' && 'message' in err ? String(err.message) : '') ||
        t('schedule.submitFailed', {}, { defaultValue: 'Failed to create the shift.' })
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function togglePublish(publish: boolean): Promise<void> {
    setPublishing(true)
    setError(null)
    try {
      await http.post('/api/shifts/publish', { week_start: weekStart, published: publish })
      await refresh()
    } catch (_err) {
      setError(t('schedule.publishFailed', {}, { defaultValue: 'Publish failed.' }))
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(6))}>
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary-dark')}
          >
            {t('schedule.eyebrow', {}, { defaultValue: 'Roster' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('schedule.heading', {}, { defaultValue: 'Weekly schedule' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
            {t(
              'schedule.subheading',
              {},
              { defaultValue: 'Assign shifts, leave gaps open, publish when the week is ready.' },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <button
            type="button"
            data-mol-id="schedule-add-shift"
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
              {composing ? 'close' : 'add'}
            </span>
            {composing
              ? t('common.cancel', {}, { defaultValue: 'Cancel' })
              : t('schedule.addShift', {}, { defaultValue: 'Add shift' })}
          </button>
          <button
            type="button"
            data-mol-id="schedule-publish"
            onClick={() => togglePublish(!allPublished)}
            disabled={publishing || shifts.length === 0}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'inline-flex items-center gap-2 rounded-xl border transition-all disabled:opacity-50',
              allPublished
                ? 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
                : 'bg-[color:var(--color-published)] text-white border-transparent shadow-md hover:opacity-90',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
              {allPublished ? 'unpublish' : 'publish'}
            </span>
            {allPublished
              ? t('schedule.unpublish', {}, { defaultValue: 'Unpublish week' })
              : t('schedule.publishWeek', {}, { defaultValue: 'Publish week' })}
          </button>
        </div>
      </header>

      {composing ? (
        <section
          data-mol-id="schedule-compose"
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
            {t('schedule.compose.heading', {}, { defaultValue: 'New shift' })}
          </h2>
          <div className={cm.cn(cm.sp('mt', 4), cm.grid({ cols: 5, gap: 'md' }))}>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <span
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('schedule.compose.assignee', {}, { defaultValue: 'Assign to' })}
              </span>
              <select
                value={draft.staff_id}
                onChange={(e) => setDraft({ ...draft, staff_id: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary outline-none text-sm font-medium text-on-surface',
                )}
              >
                <option value="">
                  {t('schedule.compose.openShift', {}, { defaultValue: 'Open shift (unassigned)' })}
                </option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.role}
                  </option>
                ))}
              </select>
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
                list="schedule-roles"
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary outline-none text-sm font-medium text-on-surface',
                )}
              />
              <datalist id="schedule-roles">
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
                {t('form.date', {}, { defaultValue: 'Date' })}
              </span>
              <input
                type="date"
                value={draft.date}
                min={dates[0]}
                max={dates[6]}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
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
                {t('schedule.compose.start', {}, { defaultValue: 'Starts' })}
              </span>
              <input
                type="time"
                value={draft.start_time}
                onChange={(e) => setDraft({ ...draft, start_time: e.target.value })}
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
                {t('schedule.compose.end', {}, { defaultValue: 'Ends' })}
              </span>
              <input
                type="time"
                value={draft.end_time}
                onChange={(e) => setDraft({ ...draft, end_time: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary outline-none text-sm font-medium text-on-surface',
                )}
              />
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'col-span-5')}>
              <span
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('schedule.compose.notes', {}, { defaultValue: 'Notes (optional)' })}
              </span>
              <input
                type="text"
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary outline-none text-sm font-medium text-on-surface',
                )}
              />
            </label>
          </div>
          {submitError ? (
            <p
              data-mol-id="schedule-compose-error"
              className={cm.cn(cm.sp('mt', 3), 'text-error text-sm font-semibold')}
            >
              {submitError}
            </p>
          ) : null}
          <div className={cm.cn(cm.sp('mt', 4), cm.flex({ align: 'center', gap: 'sm' }))}>
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
                : t('schedule.compose.submit', {}, { defaultValue: 'Add shift' })}
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
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
            cm.sp('mb', 4),
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <button
              type="button"
              data-mol-id="schedule-prev-week"
              onClick={() => setWeekStart((w) => shiftWeeks(w, -1))}
              aria-label={t('schedule.prevWeek', {}, { defaultValue: 'Previous week' })}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low transition-colors material-symbols-outlined text-[20px]',
              )}
            >
              chevron_left
            </button>
            <h2
              data-mol-id="schedule-week-label"
              className={cm.cn(
                cm.textSize('lg'),
                'font-extrabold tracking-tight text-on-surface tabular-nums px-2',
              )}
            >
              {t('schedule.weekRange', label, { defaultValue: '{{start}} – {{end}}' })}
            </h2>
            <button
              type="button"
              data-mol-id="schedule-next-week"
              onClick={() => setWeekStart((w) => shiftWeeks(w, 1))}
              aria-label={t('schedule.nextWeek', {}, { defaultValue: 'Next week' })}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low transition-colors material-symbols-outlined text-[20px]',
              )}
            >
              chevron_right
            </button>
            <button
              type="button"
              data-mol-id="schedule-this-week"
              onClick={() => setWeekStart(isoWeekStart(new Date()))}
              className={cm.cn(
                cm.sp('ml', 2),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-colors uppercase tracking-widest',
              )}
            >
              {t('schedule.thisWeek', {}, { defaultValue: 'Today' })}
            </button>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'rounded-full uppercase tracking-wider',
                allPublished
                  ? 'bg-[color:var(--color-published-bg)] text-[color:var(--color-published)]'
                  : 'bg-[color:var(--color-draft-bg)] text-[color:var(--color-draft)]',
              )}
              data-mol-id="schedule-publish-state"
            >
              {allPublished
                ? t('schedule.state.published', {}, { defaultValue: 'Published' })
                : t(
                    'schedule.state.draftCount',
                    { count: draftCount },
                    { defaultValue: 'Draft · {{count}} unpublished' },
                  )}
            </span>
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
              {t(
                'schedule.shiftCount',
                { count: shifts.length },
                { defaultValue: '{{count}} shifts' },
              )}
            </span>
          </div>
        </header>

        {loading ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : error ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-error')}>{error}</p>
        ) : (
          <div className={cm.cn('overflow-x-auto')}>
            <table
              className={cm.cn('w-full min-w-[900px] border-separate')}
              style={{ borderSpacing: '0 2px' }}
            >
              <thead>
                <tr>
                  <th
                    scope="col"
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant w-44',
                    )}
                  >
                    {t('schedule.staffColumn', {}, { defaultValue: 'Staff' })}
                  </th>
                  {dates.map((d, i) => (
                    <th
                      key={d}
                      scope="col"
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 2),
                        'text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t(`schedule.weekday.${DAY_KEYS[i]}`, {}, { defaultValue: DAY_LABELS[i] })}{' '}
                      <span className="tabular-nums font-semibold">
                        {new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, {
                          day: 'numeric',
                          timeZone: 'UTC',
                        })}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.key}
                    className={cm.cn(row.id == null ? 'bg-surface-container-low/60' : '')}
                  >
                    <th
                      scope="row"
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        'text-left align-middle rounded-l-xl',
                        row.id == null ? 'bg-primary/5' : '',
                      )}
                    >
                      <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                        <span
                          className={cm.cn(
                            'grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold',
                            row.id == null
                              ? 'bg-primary/10 text-primary-dark'
                              : 'bg-surface-container-low text-on-surface-variant',
                          )}
                        >
                          {row.initial}
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('semibold'),
                            row.id == null ? 'text-primary-dark' : 'text-on-surface',
                          )}
                        >
                          {row.name}
                        </span>
                      </span>
                    </th>
                    {dates.map((d) => {
                      const cells = shifts.filter(
                        (s) => (s.staff_id ?? null) === (row.id ?? null) && s.date === d,
                      )
                      return (
                        <td
                          key={d}
                          className={cm.cn(
                            cm.sp('px', 1),
                            cm.sp('py', 1),
                            'align-top rounded-r-xl',
                          )}
                        >
                          <div className={cm.cn(cm.stack(1))}>
                            {cells.map((s) => (
                              <Link
                                key={s.id}
                                to={`/shifts/${s.id}`}
                                data-mol-id={`schedule-shift-${s.id}`}
                                title={`${s.role} · ${s.time_label}${s.availability_warning ? ' · ⚠' : ''}`}
                                className={cm.cn(
                                  cm.sp('px', 2),
                                  cm.sp('py', 1),
                                  'block rounded-lg text-[11px] font-bold tracking-tight truncate',
                                  s.is_open
                                    ? 'border border-dashed border-outline-variant/60 text-on-surface-variant bg-surface-container-lowest'
                                    : 'text-on-primary',
                                  !s.published ? 'opacity-60' : '',
                                )}
                                style={
                                  s.is_open ? undefined : { backgroundColor: roleColor(s.role) }
                                }
                              >
                                {s.availability_warning ? (
                                  <span aria-hidden="true" className="mr-1">
                                    ⚠
                                  </span>
                                ) : null}
                                {s.is_open ? `${s.role} · open` : `${s.role} · ${s.time_label}`}
                              </Link>
                            ))}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
