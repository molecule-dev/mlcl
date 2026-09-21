import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Window {
  id: string
  staff_id: string
  staff_name: string
  staff_initial: string
  weekday: number
  start_time: string
  end_time: string
}

interface Blackout {
  id: string
  staff_id: string
  staff_name: string
  staff_initial: string
  date: string
  reason: string
}

interface StaffOption {
  id: string
  name: string
  avatar_initial: string
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export function Availability() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [windows, setWindows] = useState<Window[]>([])
  const [blackouts, setBlackouts] = useState<Blackout[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [selectedStaff, setSelectedStaff] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState({ weekday: 1, start_time: '09:00', end_time: '17:00' })
  const [blackoutDraft, setBlackoutDraft] = useState({ date: '', reason: '' })
  const [submitError, setSubmitError] = useState<string | null>(null)

  function refresh(): Promise<void> {
    return Promise.all([
      http.get('/api/availabilities'),
      http.get('/api/availabilities/blackouts'),
      http.get('/api/staff'),
    ])
      .then(([wRes, bRes, sRes]) => {
        setWindows(unwrapList<Window>(wRes))
        setBlackouts(unwrapList<Blackout>(bRes))
        setStaff(unwrapList<StaffOption>(sRes))
      })
      .catch(() => {
        setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/availabilities').catch(() => null),
      http.get('/api/availabilities/blackouts').catch(() => null),
      http.get('/api/staff').catch(() => null),
    ])
      .then(([wRes, bRes, sRes]) => {
        if (cancelled) return
        setWindows(unwrapList<Window>(wRes))
        setBlackouts(unwrapList<Blackout>(bRes))
        setStaff(unwrapList<StaffOption>(sRes))
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

  const visibleWindows = selectedStaff
    ? windows.filter((w) => w.staff_id === selectedStaff)
    : windows
  const visibleBlackouts = selectedStaff
    ? blackouts.filter((b) => b.staff_id === selectedStaff)
    : blackouts

  async function addWindow(): Promise<void> {
    setSubmitError(null)
    if (!selectedStaff) {
      setSubmitError(
        t('availability.pickStaff', {}, { defaultValue: 'Pick a staff member first.' }),
      )
      return
    }
    try {
      const created = await http.post('/api/availabilities', {
        staff_id: selectedStaff,
        weekday: draft.weekday,
        start_time: draft.start_time,
        end_time: draft.end_time,
      })
      const createdWindow = unwrapSingle<{ id: string }>(created)
      void track({
        name: 'availability.window_added',
        properties: {
          window_id: createdWindow?.id,
          staff_id: selectedStaff,
          weekday: draft.weekday,
        },
      })
      await refresh()
    } catch (err) {
      const msg =
        (err && typeof err === 'object' && 'message' in err ? String(err.message) : '') ||
        t('availability.addFailed', {}, { defaultValue: 'Could not add the window.' })
      setSubmitError(msg)
    }
  }

  async function removeWindow(id: string): Promise<void> {
    try {
      await http.delete(`/api/availabilities/${id}`)
      void track({ name: 'availability.window_removed', properties: { window_id: id } })
    } catch (_err) {
      // Surface the failure — a silent no-op reads as "the button is broken".
      setSubmitError(
        t('availability.removeFailed', {}, { defaultValue: 'Could not remove the window.' }),
      )
    }
    await refresh()
  }

  async function addBlackout(): Promise<void> {
    setSubmitError(null)
    if (!selectedStaff || !blackoutDraft.date) {
      setSubmitError(
        t('availability.blackoutRequired', {}, { defaultValue: 'Pick a person and a date.' }),
      )
      return
    }
    try {
      const created = await http.post('/api/availabilities/blackouts', {
        staff_id: selectedStaff,
        date: blackoutDraft.date,
        reason: blackoutDraft.reason || '',
      })
      const blackout = unwrapSingle<{ id: string }>(created)
      void track({
        name: 'availability.blackout_added',
        properties: {
          blackout_id: blackout?.id,
          staff_id: selectedStaff,
          date: blackoutDraft.date,
        },
      })
      setBlackoutDraft({ date: '', reason: '' })
      await refresh()
    } catch (err) {
      const msg =
        (err && typeof err === 'object' && 'message' in err ? String(err.message) : '') ||
        t('availability.blackoutFailed', {}, { defaultValue: 'Could not add the black-out.' })
      setSubmitError(msg)
    }
  }

  async function removeBlackout(id: string): Promise<void> {
    try {
      await http.delete(`/api/availabilities/blackouts/${id}`)
      void track({ name: 'availability.blackout_removed', properties: { blackout_id: id } })
    } catch (_err) {
      setSubmitError(
        t(
          'availability.blackoutRemoveFailed',
          {},
          { defaultValue: 'Could not remove the black-out.' },
        ),
      )
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
            {t('availability.eyebrow', {}, { defaultValue: 'When people can work' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('availability.heading', {}, { defaultValue: 'Availability' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
            {t(
              'availability.subheading',
              {},
              {
                defaultValue:
                  'Recurring weekly windows and one-off black-out dates. Scheduling outside them is allowed but flagged.',
              },
            )}
          </p>
        </div>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <span
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('availability.showFor', {}, { defaultValue: 'Show' })}
          </span>
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            data-mol-id="availability-staff-select"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-xl border border-outline-variant/30 bg-surface-container-lowest focus:border-primary outline-none text-sm font-medium text-on-surface',
            )}
          >
            <option value="">{t('availability.everyone', {}, { defaultValue: 'Everyone' })}</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      {submitError ? (
        <p data-mol-id="availability-error" className={cm.cn('text-error text-sm font-semibold')}>
          {submitError}
        </p>
      ) : null}

      {loading ? (
        <p className={cm.cn('text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : error ? (
        <p className={cm.cn('text-error')}>{error}</p>
      ) : (
        <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
          <section
            className={cm.cn(
              cm.sp('p', 6),
              'lg:col-span-8 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            )}
          >
            <h2
              className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t('availability.windowsHeading', {}, { defaultValue: 'Weekly windows' })}
            </h2>
            {visibleWindows.length === 0 ? (
              <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'availability.windowsEmpty',
                  {},
                  { defaultValue: 'No windows declared — treated as fully flexible.' },
                )}
              </p>
            ) : (
              <ul className={cm.cn(cm.sp('mt', 4), 'divide-y divide-outline-variant/20')}>
                {visibleWindows.map((w) => (
                  <li
                    key={w.id}
                    data-mol-id={`availability-window-${w.id}`}
                    className={cm.cn(cm.sp('py', 3), cm.flex({ align: 'center', gap: 'md' }))}
                  >
                    <span
                      className={cm.cn(
                        'grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary-dark text-sm font-bold shrink-0',
                      )}
                    >
                      {w.staff_initial}
                    </span>
                    <div className={cm.cn('min-w-0 flex-1')}>
                      <p className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface')}>
                        {w.staff_name}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          `availability.day.${DAY_KEYS[w.weekday]}`,
                          {},
                          { defaultValue: DAY_LABELS[w.weekday] },
                        )}{' '}
                        · {w.start_time}–{w.end_time}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeWindow(w.id)}
                      aria-label={t('common.remove', {}, { defaultValue: 'Remove' })}
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        'rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors material-symbols-outlined text-[18px]',
                      )}
                    >
                      delete
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div
              className={cm.cn(
                cm.sp('mt', 6),
                cm.sp('p', 4),
                'rounded-xl bg-surface-container-low border border-outline-variant/20',
                cm.grid({ cols: 4, gap: 'md' }),
              )}
            >
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'col-span-2')}>
                <span
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('availability.newWindow.day', {}, { defaultValue: 'Day' })}
                </span>
                <select
                  value={draft.weekday}
                  onChange={(e) => setDraft({ ...draft, weekday: Number(e.target.value) })}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-xl border border-outline-variant/30 bg-surface-container-lowest focus:border-primary outline-none text-sm font-medium text-on-surface',
                  )}
                >
                  {DAY_LABELS.map((label, idx) => (
                    <option key={label} value={idx}>
                      {t(`availability.day.${DAY_KEYS[idx]}`, {}, { defaultValue: label })}
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
                  {t('schedule.compose.start', {}, { defaultValue: 'Starts' })}
                </span>
                <input
                  type="time"
                  value={draft.start_time}
                  onChange={(e) => setDraft({ ...draft, start_time: e.target.value })}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-xl border border-outline-variant/30 bg-surface-container-lowest focus:border-primary outline-none text-sm font-medium text-on-surface',
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
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-xl border border-outline-variant/30 bg-surface-container-lowest focus:border-primary outline-none text-sm font-medium text-on-surface',
                  )}
                />
              </label>
              <div className={cm.cn('col-span-4', cm.flex({ align: 'center', justify: 'end' }))}>
                <button
                  type="button"
                  data-mol-id="availability-add-window"
                  onClick={addWindow}
                  disabled={!selectedStaff}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50',
                  )}
                >
                  {t('availability.addWindow', {}, { defaultValue: 'Add window' })}
                </button>
              </div>
            </div>
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              'lg:col-span-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            )}
          >
            <h2
              className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t('availability.blackoutsHeading', {}, { defaultValue: 'Black-out dates' })}
            </h2>
            {visibleBlackouts.length === 0 ? (
              <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('availability.blackoutsEmpty', {}, { defaultValue: 'No black-out dates.' })}
              </p>
            ) : (
              <ul className={cm.cn(cm.sp('mt', 4), cm.stack(3))}>
                {visibleBlackouts.map((b) => (
                  <li
                    key={b.id}
                    data-mol-id={`availability-blackout-${b.id}`}
                    className={cm.cn(
                      cm.sp('p', 3),
                      'rounded-xl bg-surface-container-low border border-outline-variant/20',
                      cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    )}
                  >
                    <div className={cm.cn('min-w-0')}>
                      <p className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface')}>
                        {b.staff_name} · <span className="tabular-nums">{b.date}</span>
                      </p>
                      {b.reason ? (
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {b.reason}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBlackout(b.id)}
                      aria-label={t('common.remove', {}, { defaultValue: 'Remove' })}
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        'rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors material-symbols-outlined text-[18px]',
                      )}
                    >
                      delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div
              className={cm.cn(
                cm.sp('mt', 6),
                cm.sp('p', 4),
                'rounded-xl bg-surface-container-low border border-outline-variant/20',
                cm.stack(3),
              )}
            >
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
                  value={blackoutDraft.date}
                  onChange={(e) => setBlackoutDraft({ ...blackoutDraft, date: e.target.value })}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-xl border border-outline-variant/30 bg-surface-container-lowest focus:border-primary outline-none text-sm font-medium text-on-surface',
                  )}
                />
              </label>
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                <span
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('shiftDetail.noteLabel', {}, { defaultValue: 'Note' })}
                </span>
                <input
                  type="text"
                  value={blackoutDraft.reason}
                  onChange={(e) => setBlackoutDraft({ ...blackoutDraft, reason: e.target.value })}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-xl border border-outline-variant/30 bg-surface-container-lowest focus:border-primary outline-none text-sm font-medium text-on-surface',
                  )}
                />
              </label>
              <button
                type="button"
                data-mol-id="availability-add-blackout"
                onClick={addBlackout}
                disabled={!selectedStaff}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50',
                )}
              >
                {t('availability.addBlackout', {}, { defaultValue: 'Add black-out' })}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
