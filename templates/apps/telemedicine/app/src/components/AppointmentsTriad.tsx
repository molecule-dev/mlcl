import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

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

interface AppointmentsTriadProps {
  appointments: Appointment[]
}

const TYPE_TINT: Record<Appointment['type'], string> = {
  video: 'text-primary',
  phone: 'text-info',
  in_person: 'text-tertiary',
}

const TYPE_ICON: Record<Appointment['type'], string> = {
  video: 'video_call',
  phone: 'phone',
  in_person: 'meeting_room',
}

const STATUS_PILL: Record<Appointment['status'], string> = {
  scheduled: 'bg-info/10 text-info',
  in_progress: 'bg-success/10 text-success',
  completed: 'bg-on-surface-variant/10 text-on-surface-variant',
  cancelled: 'bg-error/10 text-error',
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/**
 * Three-up next-up appointment cards. Translated from banking's
 * AccountsTriad pattern with Solace's medical density: type icon chip,
 * tiny age/sex meta, primary concern as truncated body, scheduled-time
 * + duration + status pill.
 */
export function AppointmentsTriad({ appointments }: AppointmentsTriadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const featured = appointments.slice(0, 3)

  if (featured.length === 0) {
    return (
      <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant text-sm')}>
        {t('appointmentsTriad.empty', {}, { defaultValue: 'No more appointments today.' })}
      </p>
    )
  }

  return (
    <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
      {featured.map((a) => (
        <Link
          key={a.id}
          to={`/consult/${a.id}`}
          className={
            'group block bg-surface-container-low rounded-2xl p-6 hover:bg-surface-container-lowest hover:shadow-2xl hover:shadow-on-surface/5 transition-all'
          }
        >
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
            <div
              className={cm.cn(
                cm.sp('p', 3),
                TYPE_TINT[a.type],
                'bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
              )}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {TYPE_ICON[a.type]}
              </span>
            </div>
            <span
              className={cm.cn(
                'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest',
                STATUS_PILL[a.status],
              )}
            >
              {a.status.replace('_', ' ')}
            </span>
          </div>

          <p className={'text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1'}>
            {fmtTime(a.scheduled_for)} · {a.duration_minutes} min
          </p>
          <h3
            className={
              'text-lg font-extrabold tracking-tight text-on-surface line-clamp-1 group-hover:text-primary transition-colors'
            }
          >
            {a.patient_name}
          </h3>
          <p className={'text-xs font-mono text-on-surface-variant mt-0.5 tabular-nums'}>
            {t(
              'appointmentsTriad.patientMeta',
              { age: a.patient_age, type: a.type },
              { defaultValue: 'age {{age}} · {{type}}' },
            )}
          </p>
          <p className={'text-sm text-on-surface-variant line-clamp-2 leading-relaxed mt-3'}>
            {a.reason}
          </p>

          <div
            className={
              'mt-4 inline-flex items-center gap-1 text-[12px] font-bold text-primary group-hover:underline'
            }
          >
            {a.status === 'in_progress'
              ? t('appointmentsTriad.joinCta', {}, { defaultValue: 'Join consult →' })
              : a.status === 'scheduled'
                ? t('appointmentsTriad.openCta', {}, { defaultValue: 'Open chart →' })
                : t('appointmentsTriad.reviewCta', {}, { defaultValue: 'Review notes →' })}
          </div>
        </Link>
      ))}
    </section>
  )
}
