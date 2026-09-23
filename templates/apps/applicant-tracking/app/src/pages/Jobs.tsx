import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Job {
  id: string
  title: string
  department?: string | null
  location?: string | null
  status: 'open' | 'filled' | 'paused' | 'closed' | 'draft'
  applicants_count?: number
  days_open?: number
  by_stage?: Partial<{
    sourced: number
    screening: number
    interview: number
    offer: number
    hired: number
  }>
}

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-success/15 text-success',
  filled: 'bg-info/15 text-info',
  paused: 'bg-warning/15 text-warning',
  closed: 'bg-surface-container line-through',
  draft: 'bg-surface-container text-on-surface-variant',
}

const STATUS_DEFAULT_LABEL: Record<string, string> = {
  open: 'Open',
  filled: 'Filled',
  paused: 'Paused',
  closed: 'Closed',
  draft: 'Draft',
}

export function Jobs() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/jobs')
      .then((res) => {
        if (!cancelled) setJobs(unwrapList<Job>(res))
      })
      .catch(() => {
        if (!cancelled) setError(t('jobs.loadError', {}, { defaultValue: 'Failed to load jobs.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div data-mol-id="page-jobs" className={cm.cn(cm.sp('py', 8), 'px-4 md:px-8 space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('jobs.heading', {}, { defaultValue: 'Jobs' })}
        </h1>
        <Link
          to="/jobs/new"
          data-mol-id="jobs-new"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          {t('jobs.newCta', {}, { defaultValue: 'Post job' })}
        </Link>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : jobs.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('jobs.empty', {}, { defaultValue: 'No jobs yet.' })}
        </p>
      ) : (
        <section className={cm.cn(cm.card(), 'overflow-hidden')}>
          <table className={cm.cn('w-full')}>
            <thead
              className={cm.cn(
                'bg-surface-container',
                cm.textSize('xs'),
                'uppercase tracking-wide',
                'text-on-surface-variant',
              )}
            >
              <tr>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('jobs.col.title', {}, { defaultValue: 'Job' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('jobs.col.department', {}, { defaultValue: 'Dept' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('form.location', {}, { defaultValue: 'Location' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('jobs.col.applicants', {}, { defaultValue: 'Applicants' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('jobs.col.stages', {}, { defaultValue: 'By stage' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('nav.status', {}, { defaultValue: 'Status' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('jobs.col.daysOpen', {}, { defaultValue: 'Days open' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant')}>
              {jobs.map((j) => {
                const stage = j.by_stage ?? {}
                return (
                  <tr
                    key={j.id}
                    data-mol-id="jobs-row"
                    className={cm.cn('hover:bg-surface-container')}
                  >
                    <td
                      className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.fontWeight('semibold'))}
                    >
                      <Link
                        to={`/jobs/${j.id}`}
                        data-mol-id="jobs-row-link"
                        className={cm.cn('hover:text-primary')}
                      >
                        {j.title}
                      </Link>
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.textSize('sm'))}>
                      {j.department ?? '\u2014'}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'text-on-surface-variant',
                      )}
                    >
                      {j.location ?? '\u2014'}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'text-right tabular-nums',
                        cm.fontWeight('semibold'),
                      )}
                    >
                      {j.applicants_count ?? 0}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                        'tabular-nums',
                      )}
                    >
                      {stage.sourced ?? 0}
                      {'\u00b7'}
                      {stage.screening ?? 0}
                      {'\u00b7'}
                      {stage.interview ?? 0}
                      {'\u00b7'}
                      {stage.offer ?? 0}
                      {'\u00b7'}
                      {stage.hired ?? 0}
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          cm.roundedFull,
                          STATUS_COLOR[j.status] ?? STATUS_COLOR.draft,
                        )}
                      >
                        {t(
                          `jobDetail.status.${j.status}`,
                          {},
                          { defaultValue: STATUS_DEFAULT_LABEL[j.status] ?? j.status },
                        )}
                      </span>
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'text-right tabular-nums',
                        'text-on-surface-variant',
                      )}
                    >
                      {j.days_open ?? 0}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
