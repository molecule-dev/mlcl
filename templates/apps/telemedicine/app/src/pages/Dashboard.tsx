import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AppointmentsTriad } from '../components/AppointmentsTriad.js'
import { ClinicalNotesEditorial } from '../components/ClinicalNotesEditorial.js'
import { NextAppointmentCard } from '../components/NextAppointmentCard.js'
import { PatientVitalsHero } from '../components/PatientVitalsHero.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

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
}

interface Vitals {
  patient_count: number
  visits_today: number
  avg_rating: number
  pending_messages: number
  open_prescriptions: number
}

interface Vital {
  label: string
  value: string
  unit: string
  state: 'good' | 'warn' | 'urgent'
}

interface Patient {
  id: string
  name: string
  dob: string
  age: number
  sex: 'M' | 'F' | 'X'
  primary_concern: string
  last_visit: string | null
  next_visit: string | null
  flag: 'none' | 'urgent' | 'new' | 'overdue'
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [vitals, setVitals] = useState<Vitals | null>(null)
  const [vitalsSnapshot, setVitalsSnapshot] = useState<Vital[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [profile, setProfile] = useState<{ name?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/appointments?filter=today').catch(() => null),
      http.get('/api/reports/vitals').catch(() => null),
      http.get('/api/reports/vitals-snapshot').catch(() => null),
      http.get('/api/patients').catch(() => null),
      http.get('/api/profile/me').catch(() => null),
    ])
      .then(([a, v, vs, p, me]) => {
        if (cancelled) return
        setAppointments(unwrapList<Appointment>(a))
        setVitals(unwrapSingle<Vitals>(v))
        const snapshot = unwrapList<Vital>(vs)
        setVitalsSnapshot(snapshot)
        setPatients(unwrapList<Patient>(p))
        setProfile(unwrapSingle<{ name?: string }>(me))
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

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return t('dashboard.morning', {}, { defaultValue: 'Good morning' })
    if (hour < 18) return t('dashboard.afternoon', {}, { defaultValue: 'Good afternoon' })
    return t('dashboard.evening', {}, { defaultValue: 'Good evening' })
  }, [t])

  const displayName = profile?.name || t('dashboard.fallbackName', {}, { defaultValue: 'there' })

  const upcoming = useMemo(
    () => appointments.filter((a) => a.status === 'scheduled' || a.status === 'in_progress'),
    [appointments],
  )

  const nextAppt = useMemo(() => {
    const inProgress = appointments.find((a) => a.status === 'in_progress')
    if (inProgress) return inProgress
    const sorted = upcoming.slice().sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for))
    return sorted[0] ?? null
  }, [upcoming, appointments])

  const minutesUntilNext = useMemo(() => {
    if (!nextAppt) return undefined
    const diff = (new Date(nextAppt.scheduled_for).getTime() - Date.now()) / 60000
    return Math.round(diff)
  }, [nextAppt])

  const flaggedPatients = useMemo(
    () => patients.filter((p) => p.flag !== 'none').slice(0, 6),
    [patients],
  )

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight mt-1')}>
          {t(
            'dashboard.headingPersonal',
            { greeting, name: displayName },
            {
              defaultValue: '{{greeting}}, {{name}}',
            },
          )}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'dashboard.subheading',
            {},
            {
              defaultValue:
                "Care without the commute. Today's queue and patient vitals at a glance.",
            },
          )}
        </p>
      </header>

      <PatientVitalsHero
        patientCount={vitals?.patient_count ?? 0}
        visitsToday={vitals?.visits_today ?? 0}
        pendingMessages={vitals?.pending_messages ?? 0}
        openPrescriptions={vitals?.open_prescriptions ?? 0}
        vitals={vitalsSnapshot}
        providerName={displayName}
        greeting={greeting}
        vitalsPatientLabel={patients[0]?.name}
      />

      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
            {t('dashboard.upNextHeading', {}, { defaultValue: 'Up next today' })}
          </h2>
          <Link
            to="/appointments"
            className={cm.cn(cm.sp('py', 2), 'text-sm font-bold text-primary hover:underline')}
          >
            {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
          </Link>
        </div>
        <AppointmentsTriad appointments={upcoming} />
      </section>

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <div className={'lg:col-span-2'}>
          <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
            <h2 className={'text-xl font-bold'}>
              {t('dashboard.flaggedHeading', {}, { defaultValue: 'Flagged patients' })}
            </h2>
            <Link
              to="/patients"
              className={cm.cn(cm.sp('py', 2), 'text-sm font-bold text-primary hover:underline')}
            >
              {t('dashboard.viewAllPatients', {}, { defaultValue: 'All patients →' })}
            </Link>
          </div>
          <p className={'text-sm text-on-surface-variant mt-1 mb-4'}>
            {t(
              'dashboard.flaggedSubtitle',
              { count: flaggedPatients.length },
              { defaultValue: '{{count}} patients need follow-up or are due for review' },
            )}
          </p>
          <ClinicalNotesEditorial patients={flaggedPatients} />
        </div>

        <aside>
          <h2 className={'text-xl font-bold mb-4'}>
            {t('form.priority', {}, { defaultValue: 'Priority' })}
          </h2>
          <NextAppointmentCard appointment={nextAppt} minutesUntil={minutesUntilNext} />
        </aside>
      </section>
    </div>
  )
}
