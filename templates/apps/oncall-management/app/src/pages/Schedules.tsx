import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { unwrapList } from '../lib/unwrap.js'

interface RosterMember {
  id: string
  name: string
  email: string
}

interface ScheduleRow {
  id: string
  name: string
  description: string
  timezone: string
  rotation_type: 'daily' | 'weekly'
  handoff_time: string
  members: string[]
  member_details?: RosterMember[]
  is_active: boolean
  current_oncall: {
    member_id: string
    name: string
    start_at: string
    end_at: string
    is_override: boolean
  } | null
}

export function Schedules() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [team, setTeam] = useState<RosterMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [rotationType, setRotationType] = useState<'weekly' | 'daily'>('weekly')
  const [handoff, setHandoff] = useState('09:00')
  const [members, setMembers] = useState<string[]>([])

  const refetch = useCallback(() => {
    setLoading(true)
    return http
      .get('/api/schedules')
      .then((res) => setSchedules(unwrapList<ScheduleRow>(res)))
      .catch(() =>
        setError(t('schedules.loadError', {}, { defaultValue: "Couldn't load schedules." })),
      )
      .finally(() => setLoading(false))
  }, [http, t])

  useEffect(() => {
    refetch()
  }, [refetch])

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
            })),
        )
      })
      .catch(() => {})
  }, [http])

  const onCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    try {
      await http.post('/api/schedules', {
        name: name.trim(),
        rotation_type: rotationType,
        handoff_time: handoff,
        members,
      })
      void track({
        name: 'schedule.created',
        properties: { rotation_type: rotationType, member_count: members.length },
      })
      setName('')
      setMembers([])
      await refetch()
    } catch (_error) {
      setError(t('schedules.createError', {}, { defaultValue: "Couldn't create the schedule." }))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-8')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t('schedules.eyebrow', {}, { defaultValue: '$ klaxon rotations ls' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t('nav.schedules', {}, { defaultValue: 'Schedules' })}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t(
              'schedules.subheading',
              {},
              { defaultValue: 'Rotations, handoffs, and who holds the pager right now.' },
            )}
          </p>
        </div>
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

      {loading ? (
        <p
          className={cm.cn(cm.sp('py', 16), cm.textCenter)}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('schedules.loading', {}, { defaultValue: 'Loading schedules…' })}
        </p>
      ) : (
        <ul className={cm.cn('grid gap-4 grid-cols-1 lg:grid-cols-2 mb-8')}>
          {schedules.map((s) => (
            <li key={s.id}>
              <Link
                to={`/schedules/${s.id}`}
                data-mol-id={`schedule-card-${s.id}`}
                className={cm.cn(
                  'block rounded-xl p-5 transition-all hover:-translate-y-0.5 h-full',
                )}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className={cm.cn('flex items-center justify-between gap-2 flex-wrap')}>
                  <h2
                    className={cm.cn('text-lg font-bold tracking-tight')}
                    style={{ color: 'var(--color-text)' }}
                  >
                    {s.name}
                  </h2>
                  <span
                    className={cm.cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-widest',
                    )}
                    style={{
                      backgroundColor: 'var(--color-severity-info-light)',
                      color: 'var(--color-severity-info)',
                    }}
                  >
                    {s.rotation_type} · {s.handoff_time}
                  </span>
                </div>
                <p
                  className={cm.cn('mt-1 text-sm')}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {s.description}
                </p>
                <div className={cm.cn('mt-4 flex items-center gap-2 flex-wrap')}>
                  {s.current_oncall ? (
                    <>
                      <span
                        className={cm.cn('h-2 w-2 rounded-full animate-pulse')}
                        style={{ backgroundColor: 'var(--color-severity-resolved)' }}
                        aria-hidden="true"
                      />
                      <span
                        className={cm.cn('text-sm font-bold')}
                        style={{ color: 'var(--color-text)' }}
                      >
                        {s.current_oncall.name}
                      </span>
                      <span
                        className={cm.cn('font-mono text-[11px]')}
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {t('schedules.onCallNow', {}, { defaultValue: 'on call now' })}
                      </span>
                      {s.current_oncall.is_override ? (
                        <span
                          className={cm.cn(
                            'px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-widest',
                          )}
                          style={{
                            backgroundColor: 'var(--color-severity-new-light)',
                            color: 'var(--color-severity-new)',
                          }}
                        >
                          {t('schedules.override', {}, { defaultValue: 'override' })}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span
                      className={cm.cn('font-mono text-xs')}
                      style={{ color: 'var(--color-severity-warning)' }}
                    >
                      {t(
                        'schedules.noCoverageNow',
                        {},
                        { defaultValue: 'no coverage window right now' },
                      )}
                    </span>
                  )}
                </div>
                <p
                  className={cm.cn('mt-3 font-mono text-[11px]')}
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {(s.member_details ?? []).map((m) => m.name).join(' → ') ||
                    t('schedules.noMembers', {}, { defaultValue: 'no members yet' })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Create schedule */}
      <section
        className={cm.cn('rounded-xl p-5')}
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <h2
          className={cm.cn('text-lg font-bold tracking-tight mb-4')}
          style={{ color: 'var(--color-text)' }}
        >
          {t('schedules.createNew', {}, { defaultValue: 'Create Rotation Schedule' })}
        </h2>
        <div className={cm.cn('grid gap-4 md:grid-cols-3')}>
          <div>
            <label
              htmlFor="schedule-name"
              className={cm.cn(
                'font-mono text-[10px] font-black uppercase tracking-widest block mb-1.5',
              )}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('schedules.nameLabel', {}, { defaultValue: 'Name' })}
            </label>
            <input
              id="schedule-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cm.cn('w-full px-3 py-2 rounded-md text-sm outline-none')}
              style={{
                backgroundColor: 'var(--color-input-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              placeholder={t(
                'schedules.namePlaceholder',
                {},
                { defaultValue: 'e.g. Payments on-call' },
              )}
              data-mol-id="schedule-name-input"
            />
          </div>
          <div>
            <label
              htmlFor="schedule-cadence"
              className={cm.cn(
                'font-mono text-[10px] font-black uppercase tracking-widest block mb-1.5',
              )}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('schedules.cadenceLabel', {}, { defaultValue: 'Cadence' })}
            </label>
            <select
              id="schedule-cadence"
              value={rotationType}
              onChange={(e) => setRotationType(e.target.value as 'weekly' | 'daily')}
              className={cm.cn('w-full px-3 py-2 rounded-md text-sm outline-none')}
              style={{
                backgroundColor: 'var(--color-input-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              data-mol-id="schedule-cadence-select"
            >
              <option value="weekly">
                {t('schedules.weekly', {}, { defaultValue: 'Weekly' })}
              </option>
              <option value="daily">{t('schedules.daily', {}, { defaultValue: 'Daily' })}</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="schedule-handoff"
              className={cm.cn(
                'font-mono text-[10px] font-black uppercase tracking-widest block mb-1.5',
              )}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('schedules.handoffLabel', {}, { defaultValue: 'Handoff (UTC)' })}
            </label>
            <input
              id="schedule-handoff"
              type="time"
              value={handoff}
              onChange={(e) => setHandoff(e.target.value)}
              className={cm.cn('w-full px-3 py-2 rounded-md text-sm outline-none')}
              style={{
                backgroundColor: 'var(--color-input-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              data-mol-id="schedule-handoff-input"
            />
          </div>
        </div>

        <div className={cm.cn('mt-4')}>
          <p
            className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-2')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('schedules.membersLabel', {}, { defaultValue: 'Rotation members (in order)' })}
          </p>
          <div className={cm.cn('flex flex-wrap gap-2')}>
            {team.map((m) => {
              const idx = members.indexOf(m.id)
              const selected = idx >= 0
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    setMembers((prev) =>
                      selected ? prev.filter((x) => x !== m.id) : [...prev, m.id],
                    )
                  }
                  data-mol-id={`schedule-member-${m.id}`}
                  className={cm.cn(
                    'px-3 py-1.5 rounded-full font-mono text-xs border transition-colors',
                  )}
                  style={{
                    backgroundColor: selected
                      ? 'var(--color-severity-resolved-light)'
                      : 'transparent',
                    borderColor: selected
                      ? 'var(--color-severity-resolved)'
                      : 'var(--color-border-secondary)',
                    color: selected ? 'var(--color-severity-resolved)' : 'var(--color-text)',
                  }}
                >
                  {selected ? `${idx + 1}. ` : ''}
                  {m.name}
                </button>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          disabled={!name.trim() || members.length === 0 || creating}
          onClick={onCreate}
          data-mol-id="schedule-create-submit"
          className={cm.cn(
            'mt-5 px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border disabled:opacity-50',
          )}
          style={{
            backgroundColor: 'transparent',
            borderColor: BRAND_COLOR,
            color: BRAND_COLOR,
          }}
        >
          {creating
            ? t('schedules.creating', {}, { defaultValue: 'Creating…' })
            : t('schedules.createSubmit', {}, { defaultValue: 'Create schedule' })}
        </button>
      </section>
    </div>
  )
}
