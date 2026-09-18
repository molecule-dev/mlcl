import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import type { TranslateFunction } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { ApplicationStatus } from '../components/ApplicationStatusPill.js'
import { ApplicationStatusPill } from '../components/ApplicationStatusPill.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApplicationRow {
  id: string
  job_id: string
  applicant_id?: string
  status: string
  resume_url?: string | null
  created_at?: string
  job?: { id: string; title: string; company_name?: string }
}

const STATUS_OPTIONS: Array<{ value: '' | ApplicationStatus; defaultLabel: string }> = [
  { value: '', defaultLabel: 'All' },
  { value: 'submitted', defaultLabel: 'Applied' },
  { value: 'reviewing', defaultLabel: 'Reviewing' },
  { value: 'interview', defaultLabel: 'Interview' },
  { value: 'offered', defaultLabel: 'Offered' },
  { value: 'rejected', defaultLabel: 'Rejected' },
]

const VISIBLE_PIPELINE: ApplicationStatus[] = ['submitted', 'reviewing', 'interview', 'offered']

function normalizeStatus(s: string): ApplicationStatus {
  if (s === 'reviewed') return 'reviewing'
  if (
    s === 'submitted' ||
    s === 'reviewing' ||
    s === 'interview' ||
    s === 'offered' ||
    s === 'rejected'
  ) {
    return s
  }
  return 'submitted'
}

function relativeTime(t: TranslateFunction, iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diffH = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60))
  if (diffH < 1) return t('timeAgo.justNow', {}, { defaultValue: 'just now' })
  if (diffH < 24) return t('timeAgo.hours', { count: diffH }, { defaultValue: '{{count}}h ago' })
  return t('timeAgo.days', { count: Math.floor(diffH / 24) }, { defaultValue: '{{count}}d ago' })
}

export function Applications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [apps, setApps] = useState<ApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'' | ApplicationStatus>('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ limit: '50' })
    if (filter) params.set('status', filter === 'reviewing' ? 'reviewed' : filter)
    http
      .get(`/api/applications?${params.toString()}`)
      .then((res) => {
        if (cancelled) return
        setApps(unwrapList<ApplicationRow>(res))
      })
      .catch(() => {
        if (!cancelled) setApps([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, filter])

  const counts: Record<ApplicationStatus, number> = {
    submitted: 0,
    reviewing: 0,
    interview: 0,
    offered: 0,
    rejected: 0,
    active: 0,
    urgent: 0,
    new: 0,
    closed: 0,
  }
  apps.forEach((a) => {
    const s = normalizeStatus(a.status)
    counts[s] = (counts[s] ?? 0) + 1
  })

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <header
        className={cm.flex({
          align: 'end',
          justify: 'between',
          wrap: 'wrap',
          gap: 'md',
        })}
      >
        <div>
          <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
            {t('applications.eyebrow', {}, { defaultValue: 'Your pipeline' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('applications.heading', {}, { defaultValue: 'My applications' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
            {t(
              'applications.subheading',
              {},
              {
                defaultValue:
                  'Every role you\u2019ve applied to, in motion. Filter by stage to focus.',
              },
            )}
          </p>
        </div>
        <Link
          to="/jobs"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'inline-flex items-center gap-2 rounded-xl border border-outline-variant/30 text-on-surface hover:bg-surface-container-low transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
            search
          </span>
          {t('applications.findMore', {}, { defaultValue: 'Find more roles' })}
        </Link>
      </header>

      <section className={cm.grid({ cols: 4, gap: 'md' })}>
        {VISIBLE_PIPELINE.map((stage) => (
          <div
            key={stage}
            className={cm.cn(
              cm.sp('p', 5),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            )}
          >
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <ApplicationStatusPill status={stage} size="xs" />
              <span className={cm.cn('text-3xl font-extrabold tabular-nums text-on-surface')}>
                {counts[stage]}
              </span>
            </div>
            <p className={cm.cn('mt-2 text-xs font-medium text-on-surface-variant')}>
              {t(
                `applications.kpi.${stage}`,
                {},
                {
                  defaultValue:
                    stage === 'submitted'
                      ? 'Awaiting first review'
                      : stage === 'reviewing'
                        ? 'Under hiring-team review'
                        : stage === 'interview'
                          ? 'In interview rounds'
                          : 'Offers extended',
                },
              )}
            </p>
          </div>
        ))}
      </section>

      <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
        <span
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('applications.filterLabel', {}, { defaultValue: 'Filter' })}
        </span>
        {STATUS_OPTIONS.map((o) => (
          <button
            key={o.value || 'all'}
            type="button"
            onClick={() => setFilter(o.value)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              'rounded-full font-bold transition-all',
              filter === o.value
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
            )}
          >
            {t(`applications.filter.${o.value || 'all'}`, {}, { defaultValue: o.defaultLabel })}
          </button>
        ))}
      </div>

      <section
        className={cm.cn(
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm overflow-hidden',
        )}
      >
        {loading ? (
          <p
            className={cm.cn(
              cm.sp('py', 12),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            {t('applications.loading', {}, { defaultValue: 'Loading\u2026' })}
          </p>
        ) : apps.length === 0 ? (
          <div className={cm.cn(cm.sp('py', 12), cm.textCenter, cm.textSize('sm'), cm.stack(3))}>
            <p className={cm.cn('text-on-surface-variant')}>
              {t(
                'applications.empty',
                {},
                {
                  defaultValue: 'No applications yet \u2014 the right role is one apply away.',
                },
              )}
            </p>
            <Link to="/jobs" className={cm.cn('text-primary font-bold hover:underline')}>
              {t('applications.emptyCta', {}, { defaultValue: 'Browse roles \u2192' })}
            </Link>
          </div>
        ) : (
          <ul className={cm.cn('divide-y divide-outline-variant/20')}>
            {apps.map((a) => {
              const s = normalizeStatus(a.status)
              return (
                <li
                  key={a.id}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 4),
                    cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                    'hover:bg-surface-container-low transition-colors',
                  )}
                >
                  <div className={cm.cn('min-w-0 flex-1')}>
                    <Link
                      to={a.job?.id ? `/jobs/${a.job.id}` : `/jobs/${a.job_id}`}
                      className={cm.cn(
                        'text-sm font-bold tracking-tight text-on-surface hover:text-primary transition-colors',
                      )}
                    >
                      {a.job?.title ||
                        t(
                          'applications.untitledRole',
                          { id: a.job_id },
                          { defaultValue: 'Role #{{id}}' },
                        )}
                    </Link>
                    {a.job?.company_name ? (
                      <p
                        className={cm.cn('text-xs font-semibold')}
                        style={{ color: 'var(--color-company)' }}
                      >
                        {a.job.company_name}
                      </p>
                    ) : null}
                  </div>
                  <ApplicationStatusPill status={s} size="xs" />
                  <span
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant tabular-nums',
                    )}
                  >
                    {relativeTime(t, a.created_at)}
                  </span>
                  {a.resume_url ? (
                    <a
                      href={a.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cm.cn(
                        'inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[14px]')}
                        aria-hidden="true"
                      >
                        description
                      </span>
                      {t('common.resume', {}, { defaultValue: 'Resume' })}
                    </a>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
