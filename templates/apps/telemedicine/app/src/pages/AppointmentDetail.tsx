import { type ReactNode, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Appointment {
  id: string
  patient_id: string
  patient_name: string
  patient_age: number
  patient_dob?: string
  type: 'video' | 'phone' | 'in_person'
  reason: string
  scheduled_for: string
  duration_minutes: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  provider: string
}

interface PatientHistory {
  id: string
  date: string
  type: 'visit' | 'lab' | 'rx' | 'note'
  summary: string
}

const STATUS_COLOR: Record<Appointment['status'], string> = {
  scheduled: 'bg-info-container text-on-info-container',
  in_progress: 'bg-success-container text-on-success-container',
  completed: 'bg-surface-container text-on-surface',
  cancelled: 'bg-error-container text-on-error-container',
}

const TYPE_ICON: Record<Appointment['type'], string> = {
  video: 'video_call',
  phone: 'phone',
  in_person: 'meeting_room',
}

const HISTORY_ICON: Record<PatientHistory['type'], string> = {
  visit: 'event',
  lab: 'science',
  rx: 'medication',
  note: 'description',
}

export function AppointmentDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id = '' } = useParams<{ id: string }>()
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [history, setHistory] = useState<PatientHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/appointments/${id}`),
      http.get(`/api/patient-history?appointment_id=${id}`),
    ])
      .then(([a, h]) => {
        if (cancelled) return
        setAppointment(unwrapSingle<Appointment>(a))
        setHistory(unwrapList<PatientHistory>(h))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('appointmentDetail.loadError', {}, { defaultValue: 'Failed to load appointment.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  if (!appointment) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}
      >
        <Link
          to="/appointments"
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'hover:text-on-surface')}
        >
          ← {t('appointmentDetail.backLink', {}, { defaultValue: 'All appointments' })}
        </Link>
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('appointmentDetail.notFound', {}, { defaultValue: 'Appointment not found.' })}
        </p>
      </div>
    )
  }

  const date = new Date(appointment.scheduled_for)
  const dateStr = date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const timeStr = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const isLive = appointment.status === 'scheduled' || appointment.status === 'in_progress'

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <Link
          to="/appointments"
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'hover:text-on-surface')}
        >
          ← {t('appointmentDetail.backLink', {}, { defaultValue: 'All appointments' })}
        </Link>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            'rounded-full',
            STATUS_COLOR[appointment.status],
          )}
        >
          {t(
            `appointments.status.${appointment.status}`,
            {},
            { defaultValue: appointment.status.replace('_', ' ') },
          )}
        </span>
      </div>

      <header className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <div className={cm.flex({ align: 'start', gap: 'md' })}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.h(14),
              cm.w(14),
              'rounded bg-primary-container text-on-primary-container shrink-0',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {TYPE_ICON[appointment.type]}
            </span>
          </div>
          <div className={cm.cn(cm.flex1, 'min-w-0')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t(
                `appointments.type.${appointment.type}`,
                {},
                { defaultValue: appointment.type.replace('_', ' ') },
              )}{' '}
              · {t('appointmentDetail.eyebrow', {}, { defaultValue: 'Appointment' })}
            </p>
            <h1
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 1),
                'tracking-tight',
              )}
            >
              {appointment.patient_name}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
              {appointment.reason}
            </p>
          </div>
          {isLive && (
            <Link
              to={`/consult/${appointment.id}`}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-md shrink-0',
              )}
            >
              {t('appointmentDetail.startConsult', {}, { defaultValue: 'Start consult' })}
            </Link>
          )}
        </div>
      </header>

      <section className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}>
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'uppercase tracking-wider text-on-surface-variant',
          )}
        >
          {t('nav.details', {}, { defaultValue: 'Details' })}
        </h2>
        <dl className={cm.grid({ cols: 2, gap: 'md' })}>
          <DetailRow
            label={t('appointmentDetail.scheduledFor', {}, { defaultValue: 'Scheduled' })}
            value={`${dateStr} · ${timeStr}`}
          />
          <DetailRow
            label={t('form.duration', {}, { defaultValue: 'Duration' })}
            value={t(
              'appointmentDetail.minutes',
              { count: appointment.duration_minutes },
              { defaultValue: '{{count}} minutes' },
            )}
          />
          <DetailRow
            label={t('appointmentDetail.provider', {}, { defaultValue: 'Provider' })}
            value={appointment.provider}
          />
          <DetailRow
            label={t('appointmentDetail.patientAge', {}, { defaultValue: 'Patient' })}
            value={
              <Link
                to={`/patients/${appointment.patient_id}`}
                className={cm.cn(cm.textPrimary, 'hover:underline')}
              >
                {appointment.patient_name} · {appointment.patient_age}
              </Link>
            }
          />
          {appointment.patient_dob && (
            <DetailRow
              label={t('appointmentDetail.patientDob', {}, { defaultValue: 'DOB' })}
              value={new Date(appointment.patient_dob).toLocaleDateString()}
            />
          )}
        </dl>
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'uppercase tracking-wider text-on-surface-variant',
            cm.sp('mb', 3),
          )}
        >
          {t('appointmentDetail.historyHeading', {}, { defaultValue: 'Recent history' })}
        </h2>
        {history.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'appointmentDetail.noHistory',
              {},
              { defaultValue: 'No prior history for this appointment.' },
            )}
          </p>
        ) : (
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
                    {new Date(h.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    · {t(`appointmentDetail.historyType.${h.type}`, {}, { defaultValue: h.type })}
                  </p>
                  <p className={cm.cn(cm.textSize('sm'))}>{h.summary}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  const cm = getClassMap()
  return (
    <div>
      <dt
        className={cm.cn(
          cm.textSize('xs'),
          'text-on-surface-variant',
          cm.fontWeight('medium'),
          'uppercase tracking-wider',
        )}
      >
        {label}
      </dt>
      <dd className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}>{value}</dd>
    </div>
  )
}
