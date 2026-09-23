import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

type Stage = 'screening' | 'interview' | 'offer'

interface Interview {
  id: string
  candidate_id: string
  candidate_name: string
  job_title: string
  scheduled_at: string
  duration_minutes: number
  panel?: string[]
  stage: Stage
  outcome?: 'scheduled' | 'completed' | 'no_show'
}

const STAGE_FG: Record<Stage, string> = {
  screening: 'var(--color-stage-screening)',
  interview: 'var(--color-stage-interview)',
  offer: 'var(--color-stage-offer)',
}

const STAGE_BG: Record<Stage, string> = {
  screening: 'var(--color-stage-screening-bg)',
  interview: 'var(--color-stage-interview-bg)',
  offer: 'var(--color-stage-offer-bg)',
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function fmtDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function dayKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfWeek(d: Date): Date {
  const result = new Date(d)
  const dow = result.getDay() // Sun=0, Mon=1, ...
  const diff = (dow + 6) % 7 // make Mon=0
  result.setDate(result.getDate() - diff)
  result.setHours(0, 0, 0, 0)
  return result
}

export function Interviews() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/interviews')
      .then((res) => {
        if (!cancelled) setInterviews(unwrapList<Interview>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('interviews.loadError', {}, { defaultValue: 'Failed to load interviews.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  if (loading)
    return (
      <div
        data-mol-id="page-interviews"
        className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}
      >
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error)
    return (
      <div data-mol-id="page-interviews" className={cm.cn(cm.sp('p', 8), 'text-error')}>
        {error}
      </div>
    )

  const weekStart = startOfWeek(new Date())
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    days.push(d)
  }

  return (
    <div data-mol-id="page-interviews" className={cm.cn(cm.sp('py', 8), 'px-4 md:px-8 space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('interviews.heading', {}, { defaultValue: 'Interviews' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'interviews.weekOf',
              { date: fmtDayLabel(weekStart.toISOString()) },
              { defaultValue: 'Week of {{date}}' },
            )}
          </p>
        </div>
      </header>

      <section className={cm.cn(cm.card(), 'overflow-hidden')}>
        {/* 7 day columns: horizontal scroll below md so the columns keep a
            usable width instead of cramming into the viewport (playbook:
            horizontal scroll is acceptable when it is a real scroll area). */}
        <div className={cm.cn('overflow-x-auto')}>
          <div
            className={cm.cn('grid grid-cols-7 gap-2 md:gap-3 min-w-[760px]', cm.sp('p', 4))}
            data-mol-id="interviews-week-grid"
          >
            {days.map((d) => {
              const dk = dayKey(d.toISOString())
              const todays = interviews
                .filter((iv) => dayKey(iv.scheduled_at) === dk)
                .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
              const isToday = dk === dayKey(new Date().toISOString())
              return (
                <div
                  key={dk}
                  className={cm.cn(
                    'min-h-[220px] md:min-h-[280px]',
                    cm.sp('p', 3),
                    'rounded-md',
                    isToday ? 'bg-primary-container' : 'bg-surface-container',
                  )}
                >
                  <header
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'uppercase tracking-wide whitespace-nowrap',
                      isToday ? cm.textPrimary : 'text-on-surface-variant',
                    )}
                  >
                    {fmtDayLabel(d.toISOString())}
                  </header>
                  <ul className={cm.cn(cm.sp('mt', 3), 'space-y-2')}>
                    {todays.length === 0 ? (
                      <li className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>—</li>
                    ) : (
                      todays.map((iv) => (
                        <li key={iv.id}>
                          <Link
                            to={`/candidates/${iv.candidate_id}`}
                            className={cm.cn(cm.sp('p', 2), 'block rounded-md hover:opacity-90')}
                            style={{
                              backgroundColor: STAGE_BG[iv.stage],
                              borderLeft: `3px solid ${STAGE_FG[iv.stage]}`,
                            }}
                          >
                            <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                              {fmtTime(iv.scheduled_at)} · {iv.duration_minutes}m
                            </p>
                            <p
                              className={cm.cn(
                                cm.textSize('xs'),
                                cm.fontWeight('semibold'),
                                'truncate',
                              )}
                            >
                              {iv.candidate_name}
                            </p>
                            <p className={cm.cn(cm.textSize('xs'), 'truncate')}>{iv.job_title}</p>
                            <p
                              className={cm.cn(
                                cm.textSize('xs'),
                                'text-on-surface-variant',
                                'truncate',
                              )}
                            >
                              w/ {(iv.panel ?? []).join(', ')}
                            </p>
                          </Link>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
