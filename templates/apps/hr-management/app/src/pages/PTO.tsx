import { useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { PtoStatus } from '../components/PtoStatusPill.js'
import { PtoStatusPill } from '../components/PtoStatusPill.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface PtoRequest {
  id: string
  employee_id: string
  employee_name: string
  employee_initial: string
  type: 'vacation' | 'sick' | 'personal' | 'bereavement' | 'holiday'
  type_label: string
  start_date: string
  end_date: string
  days: number
  status: PtoStatus
  reason: string
  manager_name: string
  submitted_at: string
}

interface EmployeeOption {
  id: string
  name: string
  avatar_initial: string
}

const STATUS_FILTERS: { key: 'all' | PtoStatus; defaultLabel: string }[] = [
  { key: 'all', defaultLabel: 'All' },
  { key: 'pending', defaultLabel: 'Pending' },
  { key: 'approved', defaultLabel: 'Approved' },
  { key: 'denied', defaultLabel: 'Denied' },
]

const TYPE_COLOR: Record<PtoRequest['type'], string> = {
  vacation: 'var(--color-pto-vacation)',
  sick: 'var(--color-pto-sick)',
  personal: 'var(--color-pto-personal)',
  bereavement: 'var(--color-pto-bereavement)',
  holiday: 'var(--color-pto-holiday)',
}

const STATUS_BORDER: Record<PtoStatus, string> = {
  approved: 'border-l-[color:var(--color-pto-approved)]',
  pending: 'border-l-[color:var(--color-pto-pending)]',
  denied: 'border-l-[color:var(--color-pto-denied)]',
}

const PTO_TYPES: { value: PtoRequest['type']; defaultLabel: string }[] = [
  { value: 'vacation', defaultLabel: 'Vacation' },
  { value: 'sick', defaultLabel: 'Sick' },
  { value: 'personal', defaultLabel: 'Personal' },
  { value: 'bereavement', defaultLabel: 'Bereavement' },
  { value: 'holiday', defaultLabel: 'Holiday' },
]

const WEEKDAYS: { key: string; defaultLabel: string }[] = [
  { key: 'sun', defaultLabel: 'Sun' },
  { key: 'mon', defaultLabel: 'Mon' },
  { key: 'tue', defaultLabel: 'Tue' },
  { key: 'wed', defaultLabel: 'Wed' },
  { key: 'thu', defaultLabel: 'Thu' },
  { key: 'fri', defaultLabel: 'Fri' },
  { key: 'sat', defaultLabel: 'Sat' },
]

export function PTO() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [requests, setRequests] = useState<PtoRequest[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]['key']>('pending')
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState({
    employee_id: '',
    type: 'vacation' as PtoRequest['type'],
    start_date: '',
    end_date: '',
    reason: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function refresh() {
    return Promise.all([http.get('/api/pto'), http.get('/api/employees')])
      .then(([pRes, eRes]) => {
        setRequests(unwrapList<PtoRequest>(pRes))
        setEmployees(unwrapList<EmployeeOption>(eRes))
      })
      .catch(() => {
        setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/pto').catch(() => null),
      http.get('/api/employees').catch(() => null),
    ])
      .then(([pRes, eRes]) => {
        if (cancelled) return
        setRequests(unwrapList<PtoRequest>(pRes))
        setEmployees(unwrapList<EmployeeOption>(eRes))
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

  async function approve(id: string) {
    setActingId(id)
    setError(null)
    try {
      const res = await http.patch(`/api/pto/${id}`, { status: 'approved' })
      const updated = unwrapSingle<PtoRequest>(res)
      track({
        name: 'leave.approved',
        properties: { pto_id: id, employee_id: updated?.employee_id, days: updated?.days },
      })
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)))
    } catch (_error) {
      // Error surfaced to the user via setError below; no additional logging needed.
      setError(t('pto.actionFailed', {}, { defaultValue: 'Action failed.' }))
    } finally {
      setActingId(null)
    }
  }

  async function deny(id: string) {
    setActingId(id)
    setError(null)
    try {
      const res = await http.patch(`/api/pto/${id}`, { status: 'denied' })
      const updated = unwrapSingle<PtoRequest>(res)
      track({
        name: 'leave.denied',
        properties: { pto_id: id, employee_id: updated?.employee_id, days: updated?.days },
      })
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)))
    } catch (_error) {
      // Error surfaced to the user via setError below; no additional logging needed.
      setError(t('pto.actionFailed', {}, { defaultValue: 'Action failed.' }))
    } finally {
      setActingId(null)
    }
  }

  async function submitNew() {
    setSubmitError(null)
    if (!draft.start_date || !draft.end_date) {
      setSubmitError(
        t('pto.dateRequired', {}, { defaultValue: 'Start and end date are required.' }),
      )
      return
    }
    setSubmitting(true)
    try {
      const res = await http.post('/api/pto', {
        employee_id: draft.employee_id || undefined,
        type: draft.type,
        start_date: draft.start_date,
        end_date: draft.end_date,
        reason: draft.reason || '',
        status: 'pending',
      })
      const created = unwrapSingle<PtoRequest>(res)
      track({
        name: 'leave.requested',
        properties: {
          pto_id: created?.id,
          employee_id: draft.employee_id || undefined,
          type: draft.type,
          status: 'pending',
        },
      })
      setComposing(false)
      setDraft({ employee_id: '', type: 'vacation', start_date: '', end_date: '', reason: '' })
      await refresh()
      setFilter('pending')
    } catch (err) {
      const msg =
        (err && typeof err === 'object' && 'message' in err ? String(err.message) : '') ||
        t('pto.submitFailed', {}, { defaultValue: 'Failed to submit request.' })
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return requests
    return requests.filter((r) => r.status === filter)
  }, [requests, filter])

  const monthLabel = t('pto.calendar.month', {}, { defaultValue: 'May 2026' })
  const calendarRange = useMemo(() => {
    const year = 2026
    const month = 4 // May (zero-indexed)
    const first = new Date(year, month, 1)
    const startWeekday = first.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: { date: number | null; iso: string | null }[] = []
    for (let i = 0; i < startWeekday; i += 1) cells.push({ date: null, iso: null })
    for (let d = 1; d <= daysInMonth; d += 1) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ date: d, iso })
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, iso: null })
    return cells
  }, [])

  function dayBlocks(iso: string) {
    return requests.filter((r) => r.status !== 'denied' && iso >= r.start_date && iso <= r.end_date)
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(6))}>
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary-dark')}
          >
            {t('pto.eyebrow', {}, { defaultValue: 'Time off' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('pto.heading', {}, { defaultValue: 'PTO calendar & requests' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
            {t(
              'pto.subheading',
              {},
              { defaultValue: 'Approve, deny, and see who’s out at a glance.' },
            )}
          </p>
        </div>
        <button
          type="button"
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
            : t('pto.requestCta', {}, { defaultValue: 'Request time off' })}
        </button>
      </header>

      {composing ? (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
            {t('pto.compose.heading', {}, { defaultValue: 'New time-off request' })}
          </h2>
          {/* Single column on phones, two from sm — a fixed 2-col grid
              crushes date inputs at 390px. */}
          <div className={cm.cn(cm.sp('mt', 4), 'grid gap-4 sm:grid-cols-2')}>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <span
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('pto.compose.employee', {}, { defaultValue: 'Employee' })}
              </span>
              <select
                value={draft.employee_id}
                onChange={(e) => setDraft({ ...draft, employee_id: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary outline-none text-sm font-medium text-on-surface',
                )}
              >
                <option value="">
                  {t('pto.compose.firstEmployee', {}, { defaultValue: 'First employee (default)' })}
                </option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
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
                {t('form.type', {}, { defaultValue: 'Type' })}
              </span>
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as PtoRequest['type'] })}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary outline-none text-sm font-medium text-on-surface',
                )}
              >
                {PTO_TYPES.map((ty) => (
                  <option key={ty.value} value={ty.value}>
                    {t(`pto.legend.${ty.value}`, {}, { defaultValue: ty.defaultLabel })}
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
                {t('form.startDate', {}, { defaultValue: 'Start date' })}
              </span>
              <input
                type="date"
                value={draft.start_date}
                onChange={(e) => setDraft({ ...draft, start_date: e.target.value })}
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
                {t('pto.compose.end', {}, { defaultValue: 'End date' })}
              </span>
              <input
                type="date"
                value={draft.end_date}
                onChange={(e) => setDraft({ ...draft, end_date: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary outline-none text-sm font-medium text-on-surface',
                )}
              />
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'sm:col-span-2')}>
              <span
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('pto.compose.reason', {}, { defaultValue: 'Reason' })}
              </span>
              <textarea
                value={draft.reason}
                onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
                rows={3}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary outline-none text-sm font-medium text-on-surface',
                )}
              />
            </label>
          </div>
          {submitError ? (
            <p className={cm.cn(cm.sp('mt', 3), 'text-error text-sm font-semibold')}>
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
                ? t('common.submittingEllipsis', {}, { defaultValue: 'Submitting…' })
                : t('pto.compose.submit', {}, { defaultValue: 'Submit request' })}
            </button>
          </div>
        </section>
      ) : null}

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            // min-w-0: without it this grid item's min-content width is the
            // 640px scrolling calendar, stretching the whole page at 390px.
            'min-w-0 lg:col-span-8 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
        >
          <header
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
          >
            <h2
              className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {monthLabel}
            </h2>
            <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
              {PTO_TYPES.map((ty) => (
                <span
                  key={ty.value}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn('inline-block h-2 w-2 rounded-full')}
                    style={{ backgroundColor: TYPE_COLOR[ty.value] }}
                  />
                  {t(`pto.legend.${ty.value}`, {}, { defaultValue: ty.defaultLabel })}
                </span>
              ))}
            </div>
          </header>
          {/* The 7-col month grid cannot compress to a 390px column —
              scroll it instead of crushing the day chips. */}
          <div className="overflow-x-auto">
            <div
              className={cm.cn(
                'grid min-w-[640px] grid-cols-7 gap-px rounded-xl bg-outline-variant/20 overflow-hidden border border-outline-variant/20',
              )}
            >
              {WEEKDAYS.map((d) => (
                <div
                  key={d.key}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'bg-surface-container-low text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(`pto.weekday.${d.key}`, {}, { defaultValue: d.defaultLabel })}
                </div>
              ))}
              {calendarRange.map((cell, i) => {
                const isWeekend = i % 7 === 0 || i % 7 === 6
                const blocks = cell.iso ? dayBlocks(cell.iso) : []
                return (
                  <div
                    key={i}
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 2),
                      'min-h-[7.5rem] flex flex-col gap-1',
                      isWeekend ? 'bg-surface-container-low' : 'bg-surface-container-lowest',
                    )}
                  >
                    {cell.date ? (
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'text-on-surface-variant tabular-nums',
                        )}
                      >
                        {cell.date}
                      </span>
                    ) : null}
                    <div className={cm.cn(cm.stack(1), 'flex-1')}>
                      {blocks.slice(0, 3).map((b) => (
                        <span
                          key={`${cell.iso}-${b.id}`}
                          className={cm.cn(
                            cm.sp('px', 2),
                            'h-6 rounded-md text-[10px] font-bold tracking-tight text-on-primary truncate flex items-center',
                          )}
                          style={{ backgroundColor: TYPE_COLOR[b.type] }}
                          title={`${b.employee_name} · ${b.type_label}`}
                        >
                          {b.employee_initial} {b.type_label.toLowerCase()}
                        </span>
                      ))}
                      {blocks.length > 3 ? (
                        <span
                          className={cm.cn(
                            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                          )}
                        >
                          {t(
                            'pto.moreCount',
                            { count: blocks.length - 3 },
                            { defaultValue: '+{{count}} more' },
                          )}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <aside
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
        >
          <header
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
          >
            <h2
              className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t('pto.requestsHeading', {}, { defaultValue: 'Requests' })}
            </h2>
          </header>
          <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cm.cn(
                  cm.sp('px', 3),
                  'inline-flex min-h-[36px] items-center rounded-full py-2 text-[10px] font-black uppercase tracking-widest transition-colors',
                  filter === f.key
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {t(`pto.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
              </button>
            ))}
          </div>

          {loading ? (
            <p className={cm.cn(cm.sp('mt', 4), 'text-on-surface-variant')}>
              {t('pto.loading', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : error ? (
            <p className={cm.cn(cm.sp('mt', 4), 'text-error')}>{error}</p>
          ) : (
            <ul className={cm.cn(cm.sp('mt', 4), cm.stack(3))}>
              {filtered.length === 0 ? (
                <li
                  className={cm.cn(
                    cm.sp('py', 6),
                    cm.textCenter,
                    cm.textSize('sm'),
                    'text-on-surface-variant',
                  )}
                >
                  {t('pto.empty', {}, { defaultValue: 'Nothing here.' })}
                </li>
              ) : (
                filtered.map((r) => (
                  <li
                    key={r.id}
                    className={cm.cn(
                      cm.sp('p', 4),
                      'rounded-xl bg-surface-container-low border border-outline-variant/20 border-l-4',
                      STATUS_BORDER[r.status],
                    )}
                  >
                    <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                      <span
                        className={cm.cn(
                          'grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary-dark font-bold',
                        )}
                      >
                        {r.employee_initial}
                      </span>
                      <div className={cm.cn('min-w-0 flex-1')}>
                        <p className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface')}>
                          {r.employee_name}
                        </p>
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {r.type_label} · {r.start_date} → {r.end_date}
                        </p>
                      </div>
                      <span
                        className={cm.cn(
                          cm.textSize('xl'),
                          'font-extrabold tabular-nums text-on-surface',
                        )}
                      >
                        {r.days}
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            'font-medium text-on-surface-variant',
                          )}
                        >
                          {' '}
                          d
                        </span>
                      </span>
                    </div>
                    <p
                      className={cm.cn(
                        cm.sp('mt', 2),
                        cm.textSize('xs'),
                        'leading-relaxed text-on-surface-variant',
                      )}
                    >
                      {r.reason}
                    </p>
                    <div
                      className={cm.cn(
                        cm.sp('mt', 3),
                        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                      )}
                    >
                      <PtoStatusPill status={r.status} />
                      {r.status === 'pending' ? (
                        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                          <button
                            type="button"
                            onClick={() => approve(r.id)}
                            disabled={actingId === r.id}
                            className={cm.cn(
                              cm.sp('px', 3),
                              'min-h-[36px] rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50',
                            )}
                          >
                            {t('pto.approve', {}, { defaultValue: 'Approve' })}
                          </button>
                          <button
                            type="button"
                            onClick={() => deny(r.id)}
                            disabled={actingId === r.id}
                            className={cm.cn(
                              'min-h-[36px] rounded-lg bg-error/10 px-4 py-2 text-xs font-bold text-error hover:bg-error/15 transition-colors disabled:opacity-50',
                            )}
                          >
                            {t('pto.deny', {}, { defaultValue: 'Deny' })}
                          </button>
                        </div>
                      ) : (
                        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {t('pto.manager', { name: r.manager_name }, { defaultValue: '{{name}}' })}
                        </span>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}
        </aside>
      </div>
    </div>
  )
}
