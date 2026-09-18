import { type ReactNode, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Patient {
  id: string
  name: string
  dob: string
  age: number
  sex: 'M' | 'F' | 'X'
  primary_concern: string
  last_visit: string | null
  next_visit: string | null
  flag: 'none' | 'overdue' | 'urgent' | 'new'
}

interface Appointment {
  id: string
  patient_id: string
  patient_name: string
  patient_age: number
  type: 'video' | 'phone' | 'in_person'
  reason: string
  scheduled_for: string
  duration_minutes: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  provider: string
}

interface Prescription {
  id: string
  patient_id: string
  drug: string
  dose: string
  frequency: string
  refills_left: number
  pharmacy: string
  prescribed_at: string
  status: 'active' | 'pending_pharmacy' | 'filled' | 'expired' | 'cancelled'
}

const FLAG_COLOR: Record<Patient['flag'], string> = {
  none: 'bg-surface-container text-on-surface',
  overdue: 'bg-warning-container text-on-warning-container',
  urgent: 'bg-error-container text-on-error-container',
  new: 'bg-info-container text-on-info-container',
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

const RX_STATUS_COLOR: Record<Prescription['status'], string> = {
  active: 'bg-success-container text-on-success-container',
  pending_pharmacy: 'bg-warning-container text-on-warning-container',
  filled: 'bg-info-container text-on-info-container',
  expired: 'bg-surface-container text-on-surface-variant',
  cancelled: 'bg-error-container text-on-error-container',
}

export function PatientDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id = '' } = useParams<{ id: string }>()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setPatient(null)
    Promise.all([
      http.get(`/api/patients/${id}`).catch(() => null),
      http.get(`/api/appointments`).catch(() => null),
      http.get(`/api/prescriptions`).catch(() => null),
    ])
      .then(([p, a, rx]) => {
        if (cancelled) return
        setPatient(unwrapSingle<Patient>(p))
        setAppointments(unwrapList<Appointment>(a).filter((x) => x.patient_id === id))
        setPrescriptions(unwrapList<Prescription>(rx).filter((x) => x.patient_id === id))
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
  if (!patient) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}
      >
        <Link
          to="/patients"
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'hover:text-on-surface')}
        >
          ← {t('patientDetail.backLink', {}, { defaultValue: 'All patients' })}
        </Link>
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('patientDetail.notFound', {}, { defaultValue: 'Patient not found.' })}
        </p>
      </div>
    )
  }

  const initials = patient.name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
  const upcoming = [...appointments]
    .filter((a) => new Date(a.scheduled_for) >= new Date() && a.status !== 'cancelled')
    .sort((x, y) => +new Date(x.scheduled_for) - +new Date(y.scheduled_for))
  const past = [...appointments]
    .filter(
      (a) =>
        !(new Date(a.scheduled_for) >= new Date()) ||
        a.status === 'completed' ||
        a.status === 'cancelled',
    )
    .sort((x, y) => +new Date(y.scheduled_for) - +new Date(x.scheduled_for))
  const activeRx = prescriptions.filter(
    (p) => p.status === 'active' || p.status === 'pending_pharmacy',
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <Link
          to="/patients"
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'hover:text-on-surface')}
        >
          ← {t('patientDetail.backLink', {}, { defaultValue: 'All patients' })}
        </Link>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            'rounded-full',
            FLAG_COLOR[patient.flag],
          )}
        >
          {t(`patients.flag.${patient.flag}`, {}, { defaultValue: patient.flag })}
        </span>
      </div>

      <header className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.h(16),
              cm.w(16),
              'rounded-full bg-primary-container text-on-primary-container shrink-0',
            )}
          >
            <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>{initials}</span>
          </div>
          <div className={cm.cn(cm.flex1, 'min-w-0')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('patientDetail.eyebrow', {}, { defaultValue: 'Patient chart' })}
            </p>
            <h1
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 1),
                'tracking-tight',
              )}
            >
              {patient.name}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
              {t(
                'patientDetail.demographics',
                {
                  age: patient.age,
                  sex: patient.sex,
                  dob: new Date(patient.dob).toLocaleDateString(),
                },
                { defaultValue: 'Age {{age}} · {{sex}} · DOB {{dob}}' },
              )}
            </p>
          </div>
          <Link
            to={`/records?patient_id=${patient.id}`}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md shrink-0',
            )}
          >
            {t('patientDetail.viewRecords', {}, { defaultValue: 'View records' })}
          </Link>
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
          {t('patientDetail.overviewHeading', {}, { defaultValue: 'Overview' })}
        </h2>
        <dl className={cm.grid({ cols: 2, gap: 'md' })}>
          <DetailRow
            label={t('patientDetail.primaryConcern', {}, { defaultValue: 'Primary concern' })}
            value={patient.primary_concern}
          />
          <DetailRow
            label={t('patientDetail.lastVisit', {}, { defaultValue: 'Last visit' })}
            value={
              patient.last_visit
                ? new Date(patient.last_visit).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : t('patientDetail.noVisits', {}, { defaultValue: 'No visits yet' })
            }
          />
          <DetailRow
            label={t('patientDetail.nextVisit', {}, { defaultValue: 'Next visit' })}
            value={
              patient.next_visit
                ? new Date(patient.next_visit).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : t('patientDetail.noScheduled', {}, { defaultValue: 'None scheduled' })
            }
          />
          <DetailRow
            label={t('patientDetail.activeRxCount', {}, { defaultValue: 'Active prescriptions' })}
            value={String(activeRx.length)}
          />
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
          {t('patientDetail.upcomingHeading', {}, { defaultValue: 'Upcoming appointments' })}
        </h2>
        {upcoming.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('patientDetail.noUpcoming', {}, { defaultValue: 'No upcoming appointments.' })}
          </p>
        ) : (
          <ul className={'space-y-2'}>
            {upcoming.map((a) => {
              const d = new Date(a.scheduled_for)
              return (
                <li key={a.id}>
                  <Link
                    to={`/appointments/${a.id}`}
                    className={cm.cn(
                      cm.sp('p', 3),
                      cm.flex({ align: 'center', gap: 'md' }),
                      'rounded border border-outline-variant hover:bg-surface-container',
                    )}
                  >
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.h(10),
                        cm.w(10),
                        'rounded bg-primary-container text-on-primary-container shrink-0',
                      )}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        {TYPE_ICON[a.type]}
                      </span>
                    </div>
                    <div className={cm.cn(cm.flex1, 'min-w-0')}>
                      <p
                        className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate')}
                      >
                        {a.reason}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {d.toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        · {d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        'rounded shrink-0',
                        STATUS_COLOR[a.status],
                      )}
                    >
                      {t(
                        `appointments.status.${a.status}`,
                        {},
                        { defaultValue: a.status.replace('_', ' ') },
                      )}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
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
          {t('patientDetail.medsHeading', {}, { defaultValue: 'Medications' })}
        </h2>
        {prescriptions.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('patientDetail.noMeds', {}, { defaultValue: 'No prescriptions on file.' })}
          </p>
        ) : (
          <ul className={'space-y-2'}>
            {prescriptions.map((rx) => (
              <li
                key={rx.id}
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.flex({ align: 'center', gap: 'md' }),
                  'rounded border border-outline-variant',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.h(10),
                    cm.w(10),
                    'rounded bg-secondary-container text-on-secondary-container shrink-0',
                  )}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    medication
                  </span>
                </div>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <p
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate')}
                    style={{ fontFamily: 'var(--mol-font-mono)' }}
                  >
                    {rx.drug} {rx.dose}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'truncate')}>
                    {rx.frequency} · {rx.pharmacy} ·{' '}
                    {t(
                      'patientDetail.refillsLeft',
                      { count: rx.refills_left },
                      { defaultValue: '{{count}} refills left' },
                    )}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    'rounded shrink-0',
                    RX_STATUS_COLOR[rx.status],
                  )}
                >
                  {t(
                    `prescriptions.status.${rx.status}`,
                    {},
                    { defaultValue: rx.status.replace('_', ' ') },
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
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
          {t('patientDetail.pastHeading', {}, { defaultValue: 'Past visits' })}
        </h2>
        {past.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('patientDetail.noPast', {}, { defaultValue: 'No past visits recorded.' })}
          </p>
        ) : (
          <ul className={'space-y-2'}>
            {past.slice(0, 8).map((a) => {
              const d = new Date(a.scheduled_for)
              return (
                <li key={a.id}>
                  <Link
                    to={`/appointments/${a.id}`}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'md' }),
                      cm.sp('p', 3),
                      'rounded hover:bg-surface-container',
                    )}
                  >
                    <span
                      className={'material-symbols-outlined text-base text-primary shrink-0'}
                      aria-hidden="true"
                    >
                      {TYPE_ICON[a.type]}
                    </span>
                    <div className={cm.cn(cm.flex1, 'min-w-0')}>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {d.toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      <p className={cm.cn(cm.textSize('sm'), 'truncate')}>{a.reason}</p>
                    </div>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        `appointments.status.${a.status}`,
                        {},
                        { defaultValue: a.status.replace('_', ' ') },
                      )}
                    </span>
                  </Link>
                </li>
              )
            })}
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
