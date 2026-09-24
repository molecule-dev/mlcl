import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Appointment {
  id: string
  patient_id: string
  patient_name: string
  patient_age: number
  patient_dob: string
  type: 'video' | 'phone' | 'in_person'
  reason: string
  scheduled_for: string
  duration_minutes: number
  provider: string
  notes?: string | null
}

interface Vital {
  label: string
  value: string
  unit: string
  state: 'good' | 'warn' | 'bad'
}

interface PatientHistory {
  id: string
  date: string
  type: 'visit' | 'lab' | 'rx' | 'note'
  summary: string
}

const VITAL_COLOR: Record<Vital['state'], string> = {
  good: 'var(--color-vital-good)',
  warn: 'var(--color-vital-warn)',
  bad: 'var(--color-vital-bad)',
}

const HISTORY_ICON: Record<PatientHistory['type'], string> = {
  visit: 'event',
  lab: 'science',
  rx: 'medication',
  note: 'description',
}

export function Consult() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id = '' } = useParams<{ id: string }>()
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [vitals, setVitals] = useState<Vital[]>([])
  const [history, setHistory] = useState<PatientHistory[]>([])
  const [notes, setNotes] = useState('')
  const [notesSavedAt, setNotesSavedAt] = useState<number | null>(null)
  const [notesSaving, setNotesSaving] = useState(false)
  const lastPersistedNotes = useRef<string>('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [muted, setMuted] = useState(false)
  const [videoOn, setVideoOn] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [captionsOn, setCaptionsOn] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/appointments/${id}`),
      http.get(`/api/reports/vitals-snapshot`),
      http.get(`/api/patient-history?appointment_id=${id}`),
    ])
      .then(([a, v, h]) => {
        if (cancelled) return
        const appt = unwrapSingle<Appointment>(a)
        setAppointment(appt)
        setVitals(unwrapList<Vital>(v))
        setHistory(unwrapList<PatientHistory>(h))
        const initialNotes = appt && typeof appt.notes === 'string' ? appt.notes : ''
        setNotes(initialNotes)
        lastPersistedNotes.current = initialNotes
      })
      .catch(() => {
        if (!cancelled)
          setError(t('consult.loadError', {}, { defaultValue: 'Failed to load consult.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  useEffect(() => {
    const tid = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(tid)
  }, [])

  useEffect(() => {
    if (!id || loading) return
    if (notes === lastPersistedNotes.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        setNotesSaving(true)
        await http.put(`/api/appointments/${id}`, { notes })
        lastPersistedNotes.current = notes
        setNotesSavedAt(Date.now())
      } catch (_error) {
        // surface failure inline; transient errors get retried on next change
      } finally {
        setNotesSaving(false)
      }
    }, 600)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [http, id, loading, notes])

  const elapsedStr = `${Math.floor(elapsed / 60)
    .toString()
    .padStart(2, '0')}:${(elapsed % 60).toString().padStart(2, '0')}`

  const endCall = async () => {
    if (id) {
      try {
        if (notes && notes !== lastPersistedNotes.current) {
          await http.put(`/api/appointments/${id}`, { notes })
          lastPersistedNotes.current = notes
        }
        await http.post(`/api/appointments/${id}/complete`, { summary: notes })
        // Domain event — id only, never note content (health data).
        track({ name: 'consultation.completed', properties: { appointment_id: id } })
      } catch (_error) {
        // swallow — endCall must still navigate even if completion failed
      }
    }
    navigate('/appointments')
  }

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  if (!appointment)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('consult.notFound', {}, { defaultValue: 'Appointment not found.' })}
      </p>
    )

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 6), cm.maxW('7xl'), cm.mxAuto, 'space-y-4')}>
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <Link
          to="/appointments"
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'hover:text-on-surface')}
        >
          ← {t('consult.backLink', {}, { defaultValue: 'All appointments' })}
        </Link>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            'uppercase tracking-wider text-success',
          )}
        >
          ● {t('status.live', {}, { defaultValue: 'Live' })} · {elapsedStr}
        </p>
      </div>

      <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 lg:grid-cols-3')}>
        {/* Video panel — spans 2 of 3 columns on desktop */}
        <div className={'col-span-1 lg:col-span-2 space-y-3'}>
          <div
            className={cm.cn(
              'rounded-lg overflow-hidden relative',
              cm.flex({ align: 'center', justify: 'center' }),
            )}
            style={{
              backgroundColor: 'var(--color-consult-bg)',
              aspectRatio: '16/9',
              minHeight: 'min(380px, 56vw)',
            }}
          >
            <div className={cm.cn(cm.textCenter)} style={{ color: 'white' }}>
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
                style={{ fontSize: '4rem', opacity: 0.4 }}
              >
                account_circle
              </span>
              <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mt', 2))}>
                {appointment.patient_name}
              </p>
              <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1))} style={{ opacity: 0.7 }}>
                {t('consult.connected', {}, { defaultValue: 'Connected · 720p · stable' })}
              </p>
            </div>

            {/* Self-view tile */}
            <div
              className={'absolute bottom-3 right-3 rounded overflow-hidden'}
              style={{
                width: '120px',
                height: '90px',
                backgroundColor: 'var(--color-consult-surface)',
                border: '2px solid white',
              }}
            >
              <div
                className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'h-full w-full')}
                style={{ color: 'white', fontSize: '2rem', opacity: 0.6 }}
              >
                <span aria-hidden="true">👨‍⚕️</span>
              </div>
            </div>
          </div>

          {/* Call controls — wrap on narrow phones so the end-call button stays reachable */}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
              'flex-wrap',
              cm.sp('p', 3),
              'rounded-lg',
            )}
            style={{ backgroundColor: 'var(--color-consult-surface)' }}
          >
            <CallButton
              on={!muted}
              onIcon="mic"
              offIcon="mic_off"
              onClick={() => setMuted((m) => !m)}
              label={t('consult.mute', {}, { defaultValue: 'Mute' })}
            />
            <CallButton
              on={videoOn}
              onIcon="videocam"
              offIcon="videocam_off"
              onClick={() => setVideoOn((v) => !v)}
              label={t('consult.video', {}, { defaultValue: 'Video' })}
            />
            <CallButton
              on={sharing}
              onIcon="screen_share"
              offIcon="stop_screen_share"
              onClick={() => setSharing((s) => !s)}
              label={t('common.share', {}, { defaultValue: 'Share' })}
            />
            <CallButton
              on={captionsOn}
              onIcon="closed_caption"
              offIcon="closed_caption_disabled"
              onClick={() => setCaptionsOn((c) => !c)}
              label={t('consult.captions', {}, { defaultValue: 'Captions' })}
            />
            <ConfirmButton
              label={
                <>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    call_end
                  </span>
                  {t('consult.endCallLabel', {}, { defaultValue: 'End call' })}
                </>
              }
              confirmLabel={t('consult.endCallConfirm', {}, { defaultValue: 'End this consult?' })}
              onConfirm={endCall}
              disarmSeconds={6}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'rounded-full text-white',
              )}
              style={{ backgroundColor: 'var(--color-consult-end-call)' }}
            />
          </div>

          {/* Notes */}
          <div className={cm.cn(cm.card(), cm.sp('p', 4))}>
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 2))}
            >
              <h3
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-wider',
                  'text-on-surface-variant',
                )}
              >
                {t('consult.notesHeading', {}, { defaultValue: 'Visit notes (autosaves)' })}
              </h3>
              <span
                data-mol-id="consult-notes-status"
                className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
              >
                {notesSaving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : notesSavedAt
                    ? t('common.saved', {}, { defaultValue: 'Saved' })
                    : ''}
              </span>
            </div>
            <textarea
              data-mol-id="consult-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder={t(
                'consult.notesPlaceholder',
                {},
                { defaultValue: 'SOAP notes, observations, follow-up plan…' },
              )}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'w-full border border-outline-variant rounded-md',
              )}
              style={{ fontFamily: 'var(--font-family-mono)' }}
            />
          </div>
        </div>

        {/* Right: patient panel */}
        <aside className={'space-y-3'}>
          <header className={cm.cn(cm.card(), cm.sp('p', 4))}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {appointment.patient_name}
            </h2>
            {appointment.patient_dob ? (
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}>
                {t(
                  'consult.dob',
                  {
                    dob: new Date(appointment.patient_dob).toLocaleDateString(),
                    age: appointment.patient_age,
                  },
                  { defaultValue: 'DOB {{dob}} · age {{age}}' },
                )}
              </p>
            ) : null}
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2))}>{appointment.reason}</p>
          </header>

          <div className={cm.cn(cm.card(), cm.sp('p', 4), 'space-y-2')}>
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-wider',
                'text-on-surface-variant',
              )}
            >
              {t('consult.vitalsHeading', {}, { defaultValue: 'Vitals (last reading)' })}
            </h3>
            {vitals.map((v) => (
              <div key={v.label} className={cm.flex({ align: 'baseline', justify: 'between' })}>
                <span className={cm.cn(cm.textSize('sm'))}>{v.label}</span>
                <span
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
                  style={{ color: VITAL_COLOR[v.state], fontFamily: 'var(--font-family-mono)' }}
                >
                  {v.value}{' '}
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {v.unit}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <div className={cm.cn(cm.card(), cm.sp('p', 4))}>
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-wider',
                'text-on-surface-variant',
                cm.sp('mb', 2),
              )}
            >
              {t('consult.historyHeading', {}, { defaultValue: 'Recent history' })}
            </h3>
            <ul className={'space-y-2'}>
              {history.map((h) => (
                <li key={h.id} className={cm.flex({ align: 'start', gap: 'sm' })}>
                  <span
                    className={'material-symbols-outlined text-base text-primary shrink-0'}
                    aria-hidden="true"
                  >
                    {HISTORY_ICON[h.type]}
                  </span>
                  <div className={cm.cn(cm.flex1, 'min-w-0')}>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {new Date(h.date).toLocaleDateString()}
                    </p>
                    <p className={cm.cn(cm.textSize('sm'), 'truncate')}>{h.summary}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

function CallButton({
  on,
  onIcon,
  offIcon,
  onClick,
  label,
}: {
  on: boolean
  onIcon: string
  offIcon: string
  onClick: () => void
  label: string
}) {
  const cm = getClassMap()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
      className={cm.cn(
        cm.h(11),
        cm.w(11),
        cm.flex({ align: 'center', justify: 'center' }),
        'rounded-full text-white',
      )}
      style={{
        backgroundColor: on
          ? 'color-mix(in srgb, #ffffff 10%, transparent)'
          : 'color-mix(in srgb, var(--color-error) 50%, transparent)',
      }}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        {on ? onIcon : offIcon}
      </span>
    </button>
  )
}
