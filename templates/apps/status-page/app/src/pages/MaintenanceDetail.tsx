import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatusPill } from '../components/StatusPill.js'
import { unwrapList } from '../lib/unwrap.js'

interface MaintenanceWindow {
  id: string
  title: string
  message?: string
  status: 'scheduled' | 'in_progress' | 'verifying' | 'completed'
  scheduled_for: string
  scheduled_until: string
  affected_components: string[]
  scheduled_by: string
  duration_minutes: number
}

const STATUS_LABEL: Record<MaintenanceWindow['status'], string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  verifying: 'Verifying',
  completed: 'Completed',
}

const STATUS_COLOR: Record<MaintenanceWindow['status'], string> = {
  scheduled: '#6366f1',
  in_progress: '#f59e0b',
  verifying: '#a78bfa',
  completed: '#10b981',
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })} ${d.getUTCDate()} · ${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')} UTC`
}

export function MaintenanceDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const [item, setItem] = useState<MaintenanceWindow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get('/api/maintenance')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<MaintenanceWindow>(res)
        setItem(list.find((w) => w.id === id) ?? list[0] ?? null)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id])

  if (loading) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}
      >
        {t('maintenanceDetail.loading', {}, { defaultValue: 'Loading window…' })}
      </div>
    )
  }
  if (!item) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.textCenter, 'text-error')}>
        {t('maintenanceDetail.notFound', {}, { defaultValue: 'Maintenance window not found.' })}
      </div>
    )
  }

  const accent = STATUS_COLOR[item.status]
  const statusLabel = STATUS_LABEL[item.status]

  const timelineSteps: {
    status: MaintenanceWindow['status']
    label: string
    ts: string
    message: string
  }[] = [
    {
      status: 'scheduled',
      label: STATUS_LABEL.scheduled,
      ts: item.scheduled_for,
      message: `Window scheduled by ${item.scheduled_by}.`,
    },
    {
      status: 'in_progress',
      label: STATUS_LABEL.in_progress,
      ts: item.scheduled_for,
      message: 'Maintenance has begun. Affected components may show degraded behaviour.',
    },
    {
      status: 'verifying',
      label: STATUS_LABEL.verifying,
      ts: item.scheduled_until,
      message: 'Maintenance work complete. Smoke tests in progress.',
    },
    {
      status: 'completed',
      label: STATUS_LABEL.completed,
      ts: item.scheduled_until,
      message: 'Maintenance window closed. All affected components verified healthy.',
    },
  ]
  const reachedIdx = ['scheduled', 'in_progress', 'verifying', 'completed'].indexOf(item.status)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))} data-mol-id="page-maintenance-detail">
      <nav className={cm.cn('mb-6')}>
        <Link
          to="/maintenance"
          className={cm.cn(
            'inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('maintenanceDetail.back', {}, { defaultValue: 'All maintenance' })}
        </Link>
      </nav>

      <header
        className={cm.cn('rounded-2xl p-8 mb-8 relative overflow-hidden')}
        style={{
          backgroundColor: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid var(--color-border-card)',
          borderLeft: `4px solid ${accent}`,
        }}
      >
        <div
          className={cm.cn(
            'absolute -right-24 -bottom-24 h-72 w-72 rounded-full blur-3xl pointer-events-none',
          )}
          style={{ backgroundColor: `${accent}33` }}
          aria-hidden="true"
        />
        <div className={cm.cn('relative')}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              className={cm.cn(
                'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('maintenanceDetail.id', { id: item.id }, { defaultValue: 'MN-{{id}}' })}
            </span>
            <StatusPill status="under_maintenance" emphasis label={statusLabel} />
          </div>
          <h1 className={cm.cn('mt-2 text-3xl md:text-4xl font-extrabold tracking-tight')}>
            {item.title}
          </h1>
          <p className={cm.cn('mt-3 max-w-2xl text-on-surface-variant')}>{item.message}</p>

          <dl className={cm.cn('mt-6 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3')}>
            <div>
              <dt
                className={cm.cn(
                  'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('maintenanceDetail.window', {}, { defaultValue: 'Window' })}
              </dt>
              <dd className={cm.cn('mt-1 font-mono text-sm font-extrabold')}>
                {fmtTimestamp(item.scheduled_for)} → {fmtTimestamp(item.scheduled_until)}
              </dd>
            </div>
            <div>
              <dt
                className={cm.cn(
                  'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.duration', {}, { defaultValue: 'Duration' })}
              </dt>
              <dd className={cm.cn('mt-1 font-mono text-sm font-extrabold')}>
                {item.duration_minutes} min
              </dd>
            </div>
            <div>
              <dt
                className={cm.cn(
                  'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('maintenanceDetail.scheduledBy', {}, { defaultValue: 'Scheduled by' })}
              </dt>
              <dd className={cm.cn('mt-1 font-mono text-sm font-extrabold')}>
                {item.scheduled_by}
              </dd>
            </div>
            <div>
              <dt
                className={cm.cn(
                  'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.type', {}, { defaultValue: 'Type' })}
              </dt>
              <dd className={cm.cn('mt-1 font-mono text-sm font-extrabold')}>
                Planned maintenance
              </dd>
            </div>
          </dl>

          <div className={cm.cn('mt-5')}>
            <p
              className={cm.cn(
                'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
              )}
            >
              {t('maintenanceDetail.affected', {}, { defaultValue: 'Affected components' })}
            </p>
            <div className={cm.cn('flex flex-wrap gap-2')}>
              {item.affected_components.map((c) => (
                <span
                  key={c}
                  className={cm.cn(
                    'inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-mono text-xs',
                  )}
                  style={{
                    backgroundColor: 'var(--color-border-card)',
                    color: 'var(--color-on-surface-high)',
                  }}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[12px]')}
                    aria-hidden="true"
                  >
                    lan
                  </span>
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section>
        <h2 className={cm.cn('text-xl font-extrabold tracking-tight mb-4')}>
          {t('maintenanceDetail.timelineHeading', {}, { defaultValue: 'Timeline' })}
        </h2>
        <ol
          className={cm.cn('relative pl-6')}
          style={{ borderLeft: '2px dotted var(--color-border-card)', marginLeft: 6 }}
        >
          {timelineSteps.map((step, idx) => {
            const reached = idx <= reachedIdx
            const active = idx === reachedIdx
            return (
              <li key={step.status} className={cm.cn('relative mb-7 last:mb-0')}>
                <span
                  className={`absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full ${active ? 'animate-pulse' : ''}`}
                  style={{
                    backgroundColor: reached
                      ? STATUS_COLOR[step.status]
                      : 'var(--mol-color-border-secondary)',
                    boxShadow: reached ? `0 0 0 4px ${STATUS_COLOR[step.status]}33` : undefined,
                  }}
                  aria-hidden="true"
                />
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span
                    className={cm.cn(
                      'font-mono text-[10px] font-extrabold uppercase tracking-widest',
                    )}
                    style={{
                      color: reached ? STATUS_COLOR[step.status] : 'var(--color-text-disabled)',
                    }}
                  >
                    {step.label}
                  </span>
                  <span className={cm.cn('font-mono text-[11px] text-on-surface-variant')}>
                    {fmtTimestamp(step.ts)}
                  </span>
                </div>
                <p
                  className={cm.cn('mt-1.5 text-sm leading-relaxed')}
                  style={{
                    color: reached ? 'var(--color-on-surface-high)' : 'var(--color-text-disabled)',
                  }}
                >
                  {step.message}
                </p>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
