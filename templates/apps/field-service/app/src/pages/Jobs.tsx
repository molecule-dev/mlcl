import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { JOB_TONE, StatusBadge } from '../components/StatusBadge.js'
import { dayKey, dayKeyOffset, formatDateTime } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface Job {
  id: string
  customer: string
  title: string
  status: string
  scheduled_start: string | null
  technician: string | null
}

const STATUSES = ['all', 'scheduled', 'en_route', 'in_progress', 'completed', 'cancelled'] as const
type StatusFilter = (typeof STATUSES)[number]

const DAYS = [
  { key: 'all', label: 'All days' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week', label: 'This week' },
] as const
type DayFilter = (typeof DAYS)[number]['key']

export function Jobs() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Job[]>([])
  const [status, setStatus] = useState<StatusFilter>('all')
  const [day, setDay] = useState<DayFilter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/jobs')
      .then((res) => {
        if (!cancelled) setList(unwrapList<Job>(res))
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

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const today = dayKeyOffset(0)
    const tomorrow = dayKeyOffset(1)
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 7)
    return list.filter((j) => {
      if (status !== 'all' && j.status !== status) return false
      const key = dayKey(j.scheduled_start)
      if (day === 'today' && key !== today) return false
      if (day === 'tomorrow' && key !== tomorrow) return false
      if (day === 'week') {
        const at = j.scheduled_start ? Date.parse(j.scheduled_start) : 0
        if (!at || at < weekStart.getTime()) return false
      }
      if (q && !j.customer.toLowerCase().includes(q) && !j.title.toLowerCase().includes(q))
        return false
      return true
    })
  }, [list, status, day, search])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('jobs.heading', {}, { defaultValue: 'Jobs' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'jobs.subheading',
              { count: visible.length, total: list.length },
              { defaultValue: '{{count}} of {{total}} jobs' },
            )}
          </p>
        </div>
        <Link
          to="/dispatch"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'border border-outline-variant rounded-md',
          )}
        >
          {t('dashboard.openDispatch', {}, { defaultValue: 'Open dispatch' })}
        </Link>
      </header>

      <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('jobs.searchPlaceholder', {}, { defaultValue: 'Customer or title…' })}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'border border-outline-variant rounded-md flex-1 max-w-md',
            cm.textSize('sm'),
          )}
        />
        <label className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('jobs.dayFilterLabel', {}, { defaultValue: 'Day' })}
          </span>
          <select
            value={day}
            onChange={(e) => setDay(e.target.value as DayFilter)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'border border-outline-variant rounded-md',
            )}
          >
            {DAYS.map((d) => (
              <option key={d.key} value={d.key}>
                {t(`jobs.day.${d.key}`, {}, { defaultValue: d.label })}
              </option>
            ))}
          </select>
        </label>
        <nav
          aria-label={t('jobs.filterLabel', {}, { defaultValue: 'Filter jobs by status' })}
          className={cm.flex({ gap: 'xs', align: 'center', wrap: 'wrap' })}
        >
          {STATUSES.map((s) => {
            const active = status === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
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
                  `jobs.status.${s}`,
                  {},
                  {
                    defaultValue: s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                  },
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('jobs.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('jobs.empty', {}, { defaultValue: 'No jobs match.' })}
        </p>
      ) : (
        <div className={cm.cn(cm.card(), 'overflow-x-auto')}>
          <table className={'w-full text-left text-sm'}>
            <thead>
              <tr className={'border-b border-outline-variant'}>
                <Th>{t('jobs.col.customer', {}, { defaultValue: 'Customer' })}</Th>
                <Th>{t('jobs.col.title', {}, { defaultValue: 'Job' })}</Th>
                <Th>{t('jobs.col.scheduled', {}, { defaultValue: 'Scheduled' })}</Th>
                <Th>{t('jobs.col.technician', {}, { defaultValue: 'Technician' })}</Th>
                <Th>{t('nav.status', {}, { defaultValue: 'Status' })}</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((j) => (
                <tr
                  key={j.id}
                  className={'border-b border-outline-variant hover:bg-surface-container'}
                >
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.fontWeight('medium'))}>
                    <Link to={`/jobs/${j.id}`}>{j.customer}</Link>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    <Link to={`/jobs/${j.id}`}>{j.title}</Link>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {formatDateTime(j.scheduled_start) ||
                      t('jobs.unscheduled', {}, { defaultValue: 'Unscheduled' })}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    {j.technician ?? (
                      <span className={'text-warning font-medium'}>
                        {t('dashboard.needsTech', {}, { defaultValue: 'needs a tech' })}
                      </span>
                    )}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <StatusBadge
                      status={j.status}
                      tone={JOB_TONE[j.status] ?? 'neutral'}
                      translationKeyPrefix="jobs.status"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <th
      className={cm.cn(
        cm.sp('px', 4),
        cm.sp('py', 3),
        cm.textSize('xs'),
        cm.fontWeight('semibold'),
        'text-on-surface-variant',
        'uppercase tracking-wider',
      )}
    >
      {children}
    </th>
  )
}
