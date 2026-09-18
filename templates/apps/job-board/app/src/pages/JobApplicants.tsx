import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { ApplicationStatus } from '../components/ApplicationStatusPill.js'
import { ApplicationStatusPill } from '../components/ApplicationStatusPill.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface JobMeta {
  id: string
  title: string
  company_id?: string
  status?: string
  application_count?: number
}

interface ApplicantRow {
  id: string
  applicant_id: string
  applicant_name?: string
  applicant_email?: string
  status: string
  resume_url?: string | null
  created_at?: string
}

const STAGES: ApplicationStatus[] = ['submitted', 'reviewing', 'interview', 'offered', 'rejected']

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

export function JobApplicants() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [job, setJob] = useState<JobMeta | null>(null)
  const [applicants, setApplicants] = useState<ApplicantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/jobs/${id}`).catch(() => null),
      http.get(`/api/applications?job_id=${encodeURIComponent(id)}&limit=100`).catch(() => null),
    ])
      .then(([jRes, aRes]) => {
        if (cancelled) return
        setJob(unwrapSingle<JobMeta>(jRes))
        setApplicants(unwrapList<ApplicantRow>(aRes))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id])

  async function moveTo(applicationId: string, status: ApplicationStatus) {
    setUpdating(applicationId)
    const wireStatus = status === 'reviewing' ? 'reviewed' : status
    try {
      await http.put(`/api/applications/${applicationId}/status`, { status: wireStatus })
      setApplicants((rows) =>
        rows.map((r) => (r.id === applicationId ? { ...r, status: wireStatus } : r)),
      )
    } catch (_error) {
      // surface in row UI via stale data; non-blocking
    } finally {
      setUpdating(null)
    }
  }

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
  applicants.forEach((a) => {
    counts[normalizeStatus(a.status)] = (counts[normalizeStatus(a.status)] ?? 0) + 1
  })

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('jobApplicants.loading', {}, { defaultValue: 'Loading\u2026' })}
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <div className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        <Link to="/dashboard" className={cm.cn('hover:text-primary transition-colors')}>
          {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
        </Link>
        <span className={cm.cn('mx-2 opacity-50')}>/</span>
        <Link to={`/jobs/${id}`} className={cm.cn('hover:text-primary transition-colors')}>
          {job?.title ?? t('jobApplicants.crumbsJob', {}, { defaultValue: 'Job' })}
        </Link>
        <span className={cm.cn('mx-2 opacity-50')}>/</span>
        <span className={cm.cn('text-on-surface font-semibold')}>
          {t('jobApplicants.crumbsCurrent', {}, { defaultValue: 'Applicants' })}
        </span>
      </div>

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
            {t('jobApplicants.eyebrow', {}, { defaultValue: 'Employer view' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t(
              'jobApplicants.heading',
              {
                title:
                  job?.title ?? t('jobApplicants.roleFallback', {}, { defaultValue: 'this role' }),
              },
              { defaultValue: 'Applicants for {{title}}' },
            )}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
            {t(
              'jobApplicants.subheading',
              { count: applicants.length },
              {
                defaultValue:
                  'Review resumes, advance candidates, send offers \u2014 {{count}} in motion.',
              },
            )}
          </p>
        </div>
      </header>

      <section className={cm.grid({ cols: 5, gap: 'sm' })}>
        {STAGES.map((stage) => (
          <div
            key={stage}
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            )}
          >
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <ApplicationStatusPill status={stage} size="xs" />
              <span className={cm.cn('text-2xl font-extrabold tabular-nums text-on-surface')}>
                {counts[stage]}
              </span>
            </div>
          </div>
        ))}
      </section>

      <section
        className={cm.cn(
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm overflow-hidden',
        )}
      >
        {applicants.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('py', 12),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            {t('jobApplicants.empty', {}, { defaultValue: 'No applications yet for this role.' })}
          </p>
        ) : (
          <ul className={cm.cn('divide-y divide-outline-variant/20')}>
            {applicants.map((a) => {
              const s = normalizeStatus(a.status)
              const initial = (a.applicant_name || a.applicant_email || a.applicant_id || '?')
                .slice(0, 1)
                .toUpperCase()
              return (
                <li
                  key={a.id}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 4),
                    cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn(
                      'grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-bold',
                    )}
                  >
                    {initial}
                  </span>
                  <div className={cm.cn('min-w-0 flex-1')}>
                    <p className={cm.cn('text-sm font-bold tracking-tight text-on-surface')}>
                      {a.applicant_name ?? a.applicant_email ?? a.applicant_id}
                    </p>
                    <p className={cm.cn('text-xs text-on-surface-variant')}>
                      {a.applicant_email || ''}
                    </p>
                  </div>
                  <ApplicationStatusPill status={s} size="xs" />
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
                  <select
                    value={s}
                    disabled={updating === a.id}
                    onChange={(e) => moveTo(a.id, e.target.value as ApplicationStatus)}
                    className={cm.cn(
                      'rounded-full border border-outline-variant/30 bg-surface-container-lowest px-3 py-1 text-xs font-bold text-on-surface outline-none focus:border-primary',
                    )}
                  >
                    {STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {t(
                          `jobApplicants.action.${stage}`,
                          {},
                          {
                            defaultValue:
                              stage === 'submitted'
                                ? 'Mark applied'
                                : stage === 'reviewing'
                                  ? 'Move to review'
                                  : stage === 'interview'
                                    ? 'Move to interview'
                                    : stage === 'offered'
                                      ? 'Send offer'
                                      : 'Reject',
                          },
                        )}
                      </option>
                    ))}
                  </select>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
