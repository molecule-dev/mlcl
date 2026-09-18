import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Appointment {
  id: string
  patient_name: string
  patient_age: number
  type: 'video' | 'phone' | 'in_person'
  reason: string
  scheduled_for: string
  duration_minutes: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
}

interface NextAppointmentCardProps {
  appointment: Appointment | null
  /** How many minutes from now the appt is. Negative = in progress / past. */
  minutesUntil?: number
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/**
 * Gradient highlight card pinned to the right of the dashboard with the
 * very next consult — large patient name, video CTA, vitals snapshot
 * link. Translated from fleet/crm's "AlertsHighlightCard" / "AiInsightCard"
 * pattern, recoloured to Solace's teal-indigo gradient.
 */
export function NextAppointmentCard({ appointment, minutesUntil }: NextAppointmentCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (!appointment) {
    return (
      <div
        className={
          'relative overflow-hidden rounded-2xl p-6 text-on-primary shadow-xl shadow-primary/10'
        }
        style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
        }}
      >
        <div className="relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-90">
            {t('nextAppointmentCard.noneTitle', {}, { defaultValue: 'No more appointments' })}
          </p>
          <p className={'text-lg font-bold mt-3'}>
            {t(
              'nextAppointmentCard.noneBody',
              {},
              { defaultValue: 'Schedule clear · catch up on charts' },
            )}
          </p>
        </div>
        <div
          className={'absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-surface/10 blur-3xl'}
        />
      </div>
    )
  }

  const isLive = appointment.status === 'in_progress'
  const inProgress =
    isLive ||
    (typeof minutesUntil === 'number' &&
      minutesUntil < 0 &&
      minutesUntil > -appointment.duration_minutes)

  return (
    <div
      className={
        'relative overflow-hidden rounded-2xl p-6 text-on-primary shadow-xl shadow-primary/10'
      }
      style={{
        background:
          'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 50%, var(--color-accent) 100%)',
      }}
    >
      <div className="relative z-10">
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-90">
            {inProgress
              ? t('status.inProgress', {}, { defaultValue: 'In progress' })
              : t('status.upNext', {}, { defaultValue: 'Up next' })}
          </p>
          {inProgress && (
            <span className={'relative flex h-2.5 w-2.5'} aria-hidden="true">
              <span
                className={
                  'absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping'
                }
              />
              <span className={'relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500'} />
            </span>
          )}
        </div>

        <h3 className={'text-2xl font-extrabold tracking-tight mt-3 leading-tight'}>
          {appointment.patient_name}
        </h3>
        <p className={'text-[11px] font-mono opacity-90 tabular-nums mt-0.5'}>
          {t(
            'nextAppointmentCard.patientMeta',
            {
              age: appointment.patient_age,
              type: appointment.type,
              time: fmtTime(appointment.scheduled_for),
              duration: appointment.duration_minutes,
            },
            { defaultValue: 'age {{age}} · {{type}} · {{time}} · {{duration}} min' },
          )}
        </p>
        <p className={'text-sm mt-3 opacity-90 line-clamp-2 leading-relaxed'}>
          {appointment.reason}
        </p>

        {typeof minutesUntil === 'number' && !inProgress && (
          <p
            className={
              'text-[11px] font-bold uppercase tracking-widest mt-3 bg-surface/15 backdrop-blur-md inline-block px-3 py-1 rounded-full'
            }
          >
            {minutesUntil <= 0
              ? t('nextAppointmentCard.startingNow', {}, { defaultValue: 'Starting now' })
              : t(
                  'nextAppointmentCard.startsIn',
                  { mins: minutesUntil },
                  { defaultValue: 'Starts in {{mins}} min' },
                )}
          </p>
        )}

        <Link
          to={`/consult/${appointment.id}`}
          className={
            'mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-surface text-on-surface hover:bg-surface/90 transition-colors shadow-lg'
          }
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            {appointment.type === 'video'
              ? 'video_call'
              : appointment.type === 'phone'
                ? 'phone'
                : 'meeting_room'}
          </span>
          {inProgress
            ? t('nextAppointmentCard.rejoinCta', {}, { defaultValue: 'Rejoin consult' })
            : t('nextAppointmentCard.joinCta', {}, { defaultValue: 'Join consult' })}
        </Link>
      </div>

      <div
        className={'absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-surface/10 blur-3xl'}
        aria-hidden="true"
      />
      <div
        className={'absolute right-8 top-8 w-12 h-12 rounded-full bg-surface/15 blur-xl'}
        aria-hidden="true"
      />
    </div>
  )
}
