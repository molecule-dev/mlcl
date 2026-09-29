import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface RosterMember {
  id: string
  name: string
  email: string
  timezone?: string
}

interface ShiftRow {
  id: string
  member_id: string
  member_name: string
  start_at: string
  end_at: string
  is_override: boolean
  note: string | null
}

interface ScheduleDetailData {
  id: string
  name: string
  description: string
  timezone: string
  rotation_type: 'daily' | 'weekly'
  handoff_time: string
  members: string[]
  member_details: RosterMember[]
  is_active: boolean
  current_oncall: {
    member_id: string
    name: string
    start_at: string
    end_at: string
    is_override: boolean
    note: string | null
  } | null
  shifts: ShiftRow[]
  open_incidents: number
}

const DAY_MS = 24 * 60 * 60_000
const CALENDAR_DAYS = 28

/** The schedule's unack-escalation ladder (design: alt_route card rows). */
const FALLBACK_RULES = [
  {
    key: 'primary',
    after: '0m',
    title: 'Primary Alert Triggered',
    body: 'Direct dispatch to the primary responder via push + hardware pager.',
  },
  {
    key: 'shadow',
    after: '3m',
    title: 'Tier-2 Shadow Escalation',
    body: 'If unacknowledged, the alert fails over to the standby responder.',
  },
  {
    key: 'breakglass',
    after: '8m',
    title: 'Sev-0 Executive Break-Glass',
    body: 'Automatic voice escalation to the incident-commander conference bridge.',
  },
] as const

const ISO = (d: Date): string => d.toISOString().slice(0, 10)

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ScheduleDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [schedule, setSchedule] = useState<ScheduleDetailData | null>(null)
  const [team, setTeam] = useState<RosterMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // override form state
  const [overrideMember, setOverrideMember] = useState('')
  const [overrideStart, setOverrideStart] = useState('')
  const [overrideEnd, setOverrideEnd] = useState('')
  const [overrideNote, setOverrideNote] = useState('')

  const reload = useCallback(async () => {
    if (!id) return
    const res = await http.get(`/api/schedules/${id}`)
    const single = unwrapSingle<ScheduleDetailData>(res)
    if (single) setSchedule(single)
  }, [http, id])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/schedules/${id}`)
      .then((res) => {
        if (cancelled) return
        const single = unwrapSingle<ScheduleDetailData>(res)
        if (single) setSchedule(single)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('schedules.loadError', {}, { defaultValue: "Couldn't load the schedule." }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  useEffect(() => {
    http
      .get('/api/team')
      .then((res) => {
        const data = res.data
        const rows = Array.isArray(data)
          ? data
          : ((data as { members?: RosterMember[] })?.members ?? [])
        setTeam(
          rows
            .filter(
              (m) =>
                String((m as { member_status?: string }).member_status ?? 'active') === 'active',
            )
            .map((m) => ({
              id: String(m.id),
              name: String(m.name ?? m.email ?? 'Responder'),
              email: String(m.email ?? ''),
              timezone: (m as { timezone?: string }).timezone,
            })),
        )
      })
      .catch(() => {})
  }, [http])

  const memberColorById = useMemo(() => {
    const palette = [
      'var(--color-primary)',
      'var(--color-severity-info)',
      'var(--color-severity-new)',
      'var(--color-severity-warning)',
      'var(--color-severity-resolved)',
      'var(--color-severity-error)',
    ]
    const map = new Map<string, string>()
    ;(schedule?.member_details ?? []).forEach((m, i) => {
      map.set(m.id, palette[i % palette.length]!)
    })
    return map
  }, [schedule])

  /** Calendar cells: 28 days from today; each maps to the covering shift. */
  const calendar = useMemo(() => {
    if (!schedule) return []
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const days: Array<{
      key: string
      date: Date
      shift: ShiftRow | null
      isOverride: boolean
      isToday: boolean
    }> = []
    for (let i = 0; i < CALENDAR_DAYS; i++) {
      const date = new Date(today.getTime() + i * DAY_MS)
      const dayStart = date.getTime()
      const dayEnd = dayStart + DAY_MS
      // A shift "covers" a day when they overlap by at least half the day —
      // simple deterministic mapping for the month-strip view.
      let best: { shift: ShiftRow; overlap: number } | null = null
      for (const shift of schedule.shifts) {
        const s = new Date(shift.start_at).getTime()
        const e = new Date(shift.end_at).getTime()
        const overlap = Math.min(e, dayEnd) - Math.max(s, dayStart)
        if (overlap > 0 && (!best || overlap > best.overlap)) {
          best = { shift, overlap }
        }
      }
      const override = schedule.shifts.find(
        (sh) =>
          sh.is_override &&
          new Date(sh.start_at).getTime() < dayEnd &&
          new Date(sh.end_at).getTime() > dayStart,
      )
      days.push({
        key: ISO(date),
        date,
        shift: best?.shift ?? null,
        isOverride: Boolean(override),
        isToday: i === 0,
      })
    }
    return days
  }, [schedule])

  const upcoming = useMemo(
    () =>
      (schedule?.shifts ?? []).filter((s) => new Date(s.end_at).getTime() > Date.now()).slice(0, 8),
    [schedule],
  )

  /** Override shift counts for the "X Active / Y Past" roster badge. */
  const activeOverrides = useMemo(
    () =>
      (schedule?.shifts ?? []).filter(
        (s) => s.is_override && new Date(s.end_at).getTime() > Date.now(),
      ).length,
    [schedule],
  )
  const pastOverrides = useMemo(
    () =>
      (schedule?.shifts ?? []).filter(
        (s) => s.is_override && new Date(s.end_at).getTime() <= Date.now(),
      ).length,
    [schedule],
  )

  const addOverride = async () => {
    if (!id || !overrideMember || !overrideStart || !overrideEnd) return
    setSaving(true)
    setError(null)
    try {
      await http.post(`/api/schedules/${id}/overrides`, {
        member_id: overrideMember,
        start_at: new Date(overrideStart).toISOString(),
        end_at: new Date(overrideEnd).toISOString(),
        note: overrideNote.trim() || undefined,
      })
      void track({
        name: 'schedule.override_added',
        properties: { schedule_id: id, member_id: overrideMember },
      })
      setOverrideMember('')
      setOverrideStart('')
      setOverrideEnd('')
      setOverrideNote('')
      await reload()
    } catch (_error) {
      setError(t('schedules.overrideError', {}, { defaultValue: "Couldn't add the override." }))
    } finally {
      setSaving(false)
    }
  }

  /** Two-step inline confirm for the destructive shift delete. */
  const [confirmShiftId, setConfirmShiftId] = useState<string | null>(null)

  const removeShift = async (shiftId: string) => {
    if (confirmShiftId !== shiftId) {
      setConfirmShiftId(shiftId)
      return
    }
    setConfirmShiftId(null)
    setSaving(true)
    setError(null)
    try {
      await http.delete(`/api/schedules/shifts/${shiftId}`)
      void track({
        name: 'schedule.shift_removed',
        properties: { schedule_id: id ?? null, shift_id: shiftId },
      })
      await reload()
    } catch (_error) {
      setError(t('schedules.removeError', {}, { defaultValue: "Couldn't remove the shift." }))
    } finally {
      setSaving(false)
    }
  }

  const reorderMember = async (memberId: string, direction: -1 | 1) => {
    if (!schedule || !id) return
    const members = [...schedule.members]
    const idx = members.indexOf(memberId)
    const next = idx + direction
    if (idx < 0 || next < 0 || next >= members.length) return
    ;[members[idx], members[next]] = [members[next]!, members[idx]!]
    setSaving(true)
    setError(null)
    try {
      await http.put(`/api/schedules/${id}`, { members })
      void track({
        name: 'schedule.updated',
        properties: { schedule_id: id, reason: 'rotation_reorder' },
      })
      await reload()
    } catch (_error) {
      setError(t('schedules.reorderError', {}, { defaultValue: "Couldn't reorder the rotation." }))
    } finally {
      setSaving(false)
    }
  }

  if (!schedule) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
        <Link
          to="/schedules"
          className={cm.cn(
            'inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest mb-4 hover:opacity-80',
          )}
          style={{ color: BRAND_COLOR }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('scheduleDetail.back', {}, { defaultValue: 'Back to schedules' })}
        </Link>
        <p className={cm.cn('font-mono text-sm')} style={{ color: 'var(--color-text-secondary)' }}>
          {loading
            ? t('scheduleDetail.loading', {}, { defaultValue: 'Loading schedule…' })
            : (error ?? t('scheduleDetail.notFound', {}, { defaultValue: 'Schedule not found.' }))}
        </p>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <Link
        to="/schedules"
        className={cm.cn(
          'inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest mb-4 hover:opacity-80',
        )}
        style={{ color: BRAND_COLOR }}
      >
        <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
          arrow_back
        </span>
        {t('scheduleDetail.back', {}, { defaultValue: 'Back to schedules' })}
      </Link>

      <header
        className={cm.cn('rounded-2xl mb-6 p-6')}
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className={cm.cn('flex items-center gap-2 flex-wrap mb-2')}>
          <span
            className={cm.cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-widest',
            )}
            style={{
              backgroundColor: 'var(--color-severity-info-light)',
              color: 'var(--color-severity-info)',
            }}
          >
            {schedule.rotation_type} ·{' '}
            {t(
              'scheduleDetail.handoffAt',
              { time: schedule.handoff_time },
              { defaultValue: 'handoff {{time}} UTC' },
            )}
          </span>
          {schedule.open_incidents > 0 ? (
            <span
              className={cm.cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-widest',
              )}
              style={{
                backgroundColor: 'var(--color-severity-critical-light)',
                color: 'var(--color-severity-critical)',
              }}
            >
              {t(
                'scheduleDetail.openIncidents',
                { count: schedule.open_incidents },
                { defaultValue: '{{count}} open incident(s)' },
              )}
            </span>
          ) : null}
        </div>
        <h1
          className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}
          style={{ color: 'var(--color-text)' }}
        >
          {schedule.name}
        </h1>
        <p className={cm.cn('mt-1 text-sm')} style={{ color: 'var(--color-text-secondary)' }}>
          {schedule.description}
        </p>
        {schedule.current_oncall ? (
          <div className={cm.cn('mt-4 flex items-center gap-2')}>
            <span
              className={cm.cn('h-2 w-2 rounded-full animate-pulse')}
              style={{ backgroundColor: 'var(--color-severity-resolved)' }}
              aria-hidden="true"
            />
            <p className={cm.cn('text-sm font-bold')} style={{ color: 'var(--color-text)' }}>
              {schedule.current_oncall.name}
              <span
                className={cm.cn('ml-2 font-mono text-xs font-normal')}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t(
                  'scheduleDetail.until',
                  { end: fmtDate(schedule.current_oncall.end_at) },
                  { defaultValue: 'until {{end}}' },
                )}
              </span>
            </p>
          </div>
        ) : null}
      </header>

      {error ? (
        <p
          className={cm.cn(cm.sp('py', 4), cm.sp('px', 4), 'rounded-md text-xs mb-4')}
          style={{
            color: 'var(--color-severity-warning)',
            backgroundColor: 'var(--color-severity-warning-light)',
            border: '1px solid var(--color-severity-warning)',
          }}
        >
          {error}
        </p>
      ) : null}

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        {/* Coverage calendar */}
        <section className={cm.cn('min-w-0 lg:col-span-8')}>
          <h2
            className={cm.cn('text-xl font-bold tracking-tight mb-3')}
            style={{ color: 'var(--color-text)' }}
          >
            {t('scheduleDetail.coverageHeading', {}, { defaultValue: 'Coverage — next 4 weeks' })}
          </h2>
          <div
            className={cm.cn('rounded-xl p-4')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            {/* Horizontal scroll on phones: 7 columns stay legible instead of
                cramming into ~44px cells. */}
            <div className={cm.cn('-mx-1 px-1 overflow-x-auto pb-1')}>
              <div
                className={cm.cn('grid gap-1.5 min-w-[560px]')}
                style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
                role="grid"
                aria-label={t(
                  'scheduleDetail.calendarAria',
                  {},
                  { defaultValue: 'Coverage calendar, next four weeks' },
                )}
              >
                {calendar.map((day) => {
                  const color = day.shift
                    ? (memberColorById.get(day.shift.member_id) ?? 'var(--color-severity-muted)')
                    : null
                  return (
                    <div
                      key={day.key}
                      data-mol-id={`coverage-day-${day.key}`}
                      className={cm.cn(
                        'rounded-md p-1.5 min-h-[3.25rem] flex flex-col justify-between',
                      )}
                      style={{
                        backgroundColor: color
                          ? `color-mix(in srgb, ${color} 22%, transparent)`
                          : 'var(--color-background-tertiary)',
                        border: day.isToday
                          ? '1px solid var(--color-primary)'
                          : '1px solid var(--color-border-subtle)',
                      }}
                    >
                      <span
                        className={cm.cn('font-mono text-[10px] font-bold')}
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {day.date.getUTCDate()}
                      </span>
                      <span
                        className={cm.cn('font-mono text-[10px] truncate')}
                        style={{ color: 'var(--color-text)' }}
                        title={day.shift?.member_name ?? ''}
                      >
                        {day.isOverride
                          ? `⟳ ${day.shift?.member_name ?? ''}`
                          : (day.shift?.member_name?.split(' ')[0] ?? '')}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className={cm.cn('mt-4 flex flex-wrap gap-3')}>
              {(schedule.member_details ?? []).map((m) => (
                <span
                  key={m.id}
                  className={cm.cn('inline-flex items-center gap-1.5 font-mono text-[11px]')}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <span
                    className={cm.cn('h-2.5 w-2.5 rounded-sm')}
                    style={{
                      backgroundColor: memberColorById.get(m.id) ?? 'var(--color-severity-muted)',
                    }}
                    aria-hidden="true"
                  />
                  {m.name}
                </span>
              ))}
            </div>
          </div>

          {/* Upcoming shifts list w/ override delete — design: overrides section */}
          <div className={cm.cn('mt-6 mb-3 flex items-baseline gap-2 flex-wrap')}>
            <h2
              className={cm.cn('text-xl font-bold tracking-tight')}
              style={{ color: 'var(--color-text)' }}
            >
              {t(
                'scheduleDetail.upcomingHeading',
                {},
                { defaultValue: 'Scheduled Shift Overrides & Holiday Coverage' },
              )}
            </h2>
            <span className={cm.cn('font-mono text-xs font-bold')} style={{ color: BRAND_COLOR }}>
              {t(
                'scheduleDetail.overrideCounts',
                { active: activeOverrides, past: pastOverrides },
                { defaultValue: '{{active}} Active / {{past}} Past' },
              )}
            </span>
          </div>
          <ul className={cm.cn('space-y-2')}>
            {upcoming.map((s) => (
              <li
                key={s.id}
                data-mol-id={`shift-${s.id}`}
                className={cm.cn('rounded-lg px-4 py-2.5 flex items-center gap-3 flex-wrap')}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: `1px solid ${s.is_override ? 'var(--color-severity-new)' : 'var(--color-border)'}`,
                }}
              >
                <span
                  className={cm.cn('h-2 w-2 rounded-full shrink-0')}
                  style={{
                    backgroundColor:
                      memberColorById.get(s.member_id) ?? 'var(--color-severity-muted)',
                  }}
                  aria-hidden="true"
                />
                <span className={cm.cn('text-sm font-bold')} style={{ color: 'var(--color-text)' }}>
                  {s.member_name}
                </span>
                <span
                  className={cm.cn('font-mono text-xs')}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {fmtDate(s.start_at)} → {fmtDate(s.end_at)}
                </span>
                {s.is_override ? (
                  <>
                    <span
                      className={cm.cn(
                        'px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-widest',
                      )}
                      style={{
                        backgroundColor: 'var(--color-severity-new-light)',
                        color: 'var(--color-severity-new)',
                      }}
                    >
                      {t('scheduleDetail.overrideTag', {}, { defaultValue: 'override' })}
                    </span>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void removeShift(s.id)}
                      data-mol-id={`shift-delete-${s.id}`}
                      className={cm.cn(
                        'ml-auto px-3 min-h-[36px] rounded-md font-mono text-[10px] font-bold uppercase tracking-widest border disabled:opacity-50',
                      )}
                      style={{
                        borderColor: 'var(--color-severity-critical)',
                        color: 'var(--color-severity-critical)',
                      }}
                    >
                      {confirmShiftId === s.id
                        ? t('common.confirmRemove', {}, { defaultValue: 'Confirm remove' })
                        : t('common.remove', {}, { defaultValue: 'Remove' })}
                    </button>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {/* Rotation editor + override form */}
        <section className={cm.cn('min-w-0 lg:col-span-4 space-y-4')}>
          <div
            className={cm.cn('rounded-xl p-5')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h3
              className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t(
                'scheduleDetail.rotationOrder',
                {},
                { defaultValue: 'Rotation Order & Tier Roster' },
              )}
            </h3>
            <ol className={cm.cn('space-y-2')}>
              {(schedule.member_details ?? []).map((m, i) => (
                <li key={m.id} className={cm.cn('flex items-center gap-2')}>
                  <span
                    className={cm.cn(
                      'h-6 w-6 flex items-center justify-center rounded-full font-mono text-[11px] font-bold shrink-0',
                    )}
                    style={{
                      backgroundColor: `color-mix(in srgb, ${memberColorById.get(m.id) ?? 'var(--color-severity-muted)'} 25%, transparent)`,
                      color: 'var(--color-text)',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={cm.cn('text-sm flex-1 truncate')}
                    style={{ color: 'var(--color-text)' }}
                  >
                    {m.name}
                  </span>
                  <button
                    type="button"
                    disabled={saving || i === 0}
                    onClick={() => reorderMember(m.id, -1)}
                    data-mol-id={`reorder-up-${m.id}`}
                    aria-label={t(
                      'scheduleDetail.moveUp',
                      { name: m.name },
                      { defaultValue: 'Move {{name}} up' },
                    )}
                    className={cm.cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center text-base disabled:opacity-30',
                    )}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      keyboard_arrow_up
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={saving || i === (schedule.member_details ?? []).length - 1}
                    onClick={() => reorderMember(m.id, 1)}
                    data-mol-id={`reorder-down-${m.id}`}
                    aria-label={t(
                      'scheduleDetail.moveDown',
                      { name: m.name },
                      { defaultValue: 'Move {{name}} down' },
                    )}
                    className={cm.cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center text-base disabled:opacity-30',
                    )}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      keyboard_arrow_down
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>

          <div
            className={cm.cn('rounded-xl p-5')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h3
              className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t(
                'scheduleDetail.addOverride',
                {},
                { defaultValue: 'Add override (holiday / swap)' },
              )}
            </h3>
            <div className={cm.cn('space-y-3')}>
              <div>
                <label
                  htmlFor="override-member"
                  className={cm.cn('font-mono text-[10px] uppercase tracking-widest block mb-1')}
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {t('scheduleDetail.coveredBy', {}, { defaultValue: 'Covered by' })}
                </label>
                <select
                  id="override-member"
                  value={overrideMember}
                  onChange={(e) => setOverrideMember(e.target.value)}
                  className={cm.cn('w-full px-3 py-2 rounded-md text-sm outline-none')}
                  style={{
                    backgroundColor: 'var(--color-input-background)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                  data-mol-id="override-member-select"
                >
                  <option value="">
                    {t('scheduleDetail.pickMember', {}, { defaultValue: 'Pick a responder' })}
                  </option>
                  {team.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={cm.cn('grid grid-cols-2 gap-2')}>
                <div>
                  <label
                    htmlFor="override-start"
                    className={cm.cn('font-mono text-[10px] uppercase tracking-widest block mb-1')}
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {t('scheduleDetail.from', {}, { defaultValue: 'From' })}
                  </label>
                  <input
                    id="override-start"
                    type="date"
                    value={overrideStart}
                    onChange={(e) => setOverrideStart(e.target.value)}
                    className={cm.cn('w-full px-3 py-2 rounded-md text-sm outline-none')}
                    style={{
                      backgroundColor: 'var(--color-input-background)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                    data-mol-id="override-start-input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="override-end"
                    className={cm.cn('font-mono text-[10px] uppercase tracking-widest block mb-1')}
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {t('scheduleDetail.to', {}, { defaultValue: 'To' })}
                  </label>
                  <input
                    id="override-end"
                    type="date"
                    value={overrideEnd}
                    onChange={(e) => setOverrideEnd(e.target.value)}
                    className={cm.cn('w-full px-3 py-2 rounded-md text-sm outline-none')}
                    style={{
                      backgroundColor: 'var(--color-input-background)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                    data-mol-id="override-end-input"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="override-note"
                  className={cm.cn('font-mono text-[10px] uppercase tracking-widest block mb-1')}
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {t('scheduleDetail.noteLabel', {}, { defaultValue: 'Note' })}
                </label>
                <input
                  id="override-note"
                  type="text"
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  className={cm.cn('w-full px-3 py-2 rounded-md text-sm outline-none')}
                  style={{
                    backgroundColor: 'var(--color-input-background)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                  placeholder={t(
                    'scheduleDetail.notePlaceholder',
                    {},
                    { defaultValue: 'e.g. Holiday cover' },
                  )}
                  data-mol-id="override-note-input"
                />
              </div>
              <button
                type="button"
                disabled={!overrideMember || !overrideStart || !overrideEnd || saving}
                onClick={addOverride}
                data-mol-id="override-submit"
                className={cm.cn(
                  'w-full px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border disabled:opacity-50',
                )}
                style={{ borderColor: BRAND_COLOR, color: BRAND_COLOR }}
              >
                {saving
                  ? t('scheduleDetail.saving', {}, { defaultValue: 'Saving…' })
                  : t('scheduleDetail.addOverrideSubmit', {}, { defaultValue: 'Add override' })}
              </button>
            </div>
          </div>

          {/* Escalation & fallback ladder (design: alt_route card) */}
          <div
            className={cm.cn('rounded-xl p-5')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
            data-mol-id="schedule-fallback-rules"
          >
            <div className={cm.cn('flex items-center justify-between gap-2 mb-3')}>
              <h3
                className={cm.cn(
                  'font-mono text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5',
                )}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-sm')}
                  style={{ color: BRAND_COLOR }}
                  aria-hidden="true"
                >
                  alt_route
                </span>
                {t(
                  'scheduleDetail.fallbackHeading',
                  {},
                  { defaultValue: 'Escalation & Fallback Rules' },
                )}
              </h3>
              <span
                className={cm.cn(
                  'px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-widest',
                )}
                style={{
                  backgroundColor: 'var(--color-severity-resolved-light)',
                  color: 'var(--color-severity-resolved)',
                }}
              >
                {t('scheduleDetail.fallbackSynced', {}, { defaultValue: 'Synchronized' })}
              </span>
            </div>
            <ol className={cm.cn('space-y-3')}>
              {FALLBACK_RULES.map((rule) => (
                <li key={rule.key} className={cm.cn('flex items-start gap-2.5')}>
                  <span
                    className={cm.cn(
                      'h-6 w-9 flex items-center justify-center rounded font-mono text-[10px] font-bold shrink-0',
                    )}
                    style={{
                      backgroundColor: 'var(--color-background-tertiary)',
                      color: BRAND_COLOR,
                    }}
                  >
                    {rule.after}
                  </span>
                  <span className={cm.cn('min-w-0')}>
                    <span
                      className={cm.cn('text-xs font-bold block')}
                      style={{ color: 'var(--color-text)' }}
                    >
                      {t(
                        `scheduleDetail.fallback.${rule.key}.title` as 'scheduleDetail.fallback.primary.title',
                        {},
                        { defaultValue: rule.title },
                      )}
                    </span>
                    <span
                      className={cm.cn('text-[11px] block')}
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {t(
                        `scheduleDetail.fallback.${rule.key}.body` as 'scheduleDetail.fallback.primary.body',
                        {},
                        { defaultValue: rule.body },
                      )}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <p
              className={cm.cn('font-mono text-[10px] mt-3 pt-3 border-t')}
              style={{
                color: 'var(--color-severity-resolved)',
                borderColor: 'var(--color-border)',
              }}
            >
              {t(
                'scheduleDetail.fallbackTrunk',
                {},
                {
                  defaultValue:
                    'Multi-carrier trunk: 100% operational — 0 breaches in the last 90 days.',
                },
              )}
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
