import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

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

const FILTERS = ['upcoming', 'today', 'completed', 'cancelled', 'all'] as const
type Filter = (typeof FILTERS)[number]

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

export function Appointments() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [list, setList] = useState<Appointment[]>([])
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/appointments')
      .then((res) => {
        if (!cancelled) setList(unwrapList<Appointment>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('appointments.loadError', {}, { defaultValue: 'Failed to load appointments.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visible = useMemo(() => {
    const now = new Date()
    const today = now.toDateString()
    if (filter === 'all') return list
    if (filter === 'today')
      return list.filter((a) => new Date(a.scheduled_for).toDateString() === today)
    if (filter === 'upcoming')
      return list.filter((a) => new Date(a.scheduled_for) >= now && a.status !== 'cancelled')
    if (filter === 'completed') return list.filter((a) => a.status === 'completed')
    if (filter === 'cancelled') return list.filter((a) => a.status === 'cancelled')
    return list
  }, [list, filter])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('appointments.eyebrow', {}, { defaultValue: 'Scheduled visits' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('appointments.heading', {}, { defaultValue: 'Appointments' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'appointments.subheading',
              { count: visible.length },
              { defaultValue: '{{count}} appointments' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/providers')}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          + {t('nav.schedule', {}, { defaultValue: 'Schedule' })}
        </button>
      </header>

      <nav
        aria-label={t('appointments.filterLabel', {}, { defaultValue: 'Filter appointments' })}
        className={cm.cn(cm.flex({ gap: 'xs', align: 'center' }), 'flex-wrap')}
      >
        {FILTERS.map((f) => {
          const active = filter === f
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'rounded-full',
                active
                  ? 'bg-primary text-on-primary'
                  : cm.cn('bg-surface border border-outline-variant', 'text-on-surface-variant'),
              )}
              aria-pressed={active}
            >
              {t(
                `appointments.filter.${f}`,
                {},
                { defaultValue: f.charAt(0).toUpperCase() + f.slice(1) },
              )}
            </button>
          )
        })}
      </nav>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('appointments.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('appointments.empty', {}, { defaultValue: 'No appointments match this filter.' })}
        </p>
      ) : (
        <ul className={'space-y-2'}>
          {visible.map((a) => {
            const date = new Date(a.scheduled_for)
            const dateStr = date.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              weekday: 'short',
            })
            const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
            return (
              <li key={a.id}>
                <Link
                  to={
                    a.status === 'scheduled' || a.status === 'in_progress'
                      ? `/consult/${a.id}`
                      : `/patients/${a.patient_id}`
                  }
                  className={cm.cn(
                    cm.card(),
                    cm.sp('p', 4),
                    cm.flex({ align: 'center', gap: 'md' }),
                    'hover:bg-surface-container',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.h(11),
                      cm.w(11),
                      'rounded bg-primary-container text-on-primary-container shrink-0',
                    )}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {TYPE_ICON[a.type]}
                    </span>
                  </div>
                  <div className={cm.cn(cm.flex1, 'min-w-0')}>
                    <p
                      className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'truncate')}
                    >
                      {a.patient_name}{' '}
                      <span
                        className={cm.cn(
                          'text-on-surface-variant',
                          cm.fontWeight('normal'),
                          cm.textSize('sm'),
                        )}
                      >
                        · {a.patient_age}
                      </span>
                    </p>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'truncate')}>
                      {a.reason}
                    </p>
                  </div>
                  <div className={cm.cn(cm.shrink0, cm.textCenter)}>
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{dateStr}</p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {time} · {a.duration_minutes}m
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
    </div>
  )
}
