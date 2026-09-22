import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { unwrapSingle } from '@molecule/app-http'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { ApplicationStatus } from '../components/ApplicationStatusPill.js'
import { ApplicationStatusPill } from '../components/ApplicationStatusPill.js'
import type { CompanyProfile } from '../components/CompanyProfileCard.js'
import { formatSalary, type NumericLike } from '../lib/format.js'

interface JobWithCompany {
  id: string
  title: string
  description?: string
  location?: string | null
  type?: string
  /** Postgres NUMERIC serializes as a string ("120000.0000") — coerce before formatting. */
  salary_min?: NumericLike
  salary_max?: NumericLike
  status?: string
  tags?: string[]
  created_at?: string
  application_count?: number
  company?: CompanyProfile
  company_id?: string
}

interface SavedJobRow {
  id: string
  user_id: string
  job_id: string
}

export function JobDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [job, setJob] = useState<JobWithCompany | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [savedRowId, setSavedRowId] = useState<string | null>(null)
  const [savingPending, setSavingPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([http.get(`/api/jobs/${id}`), http.get('/api/saved-jobs').catch(() => null)])
      .then(([jobRes, savedRes]) => {
        if (cancelled) return
        setJob(unwrapSingle<JobWithCompany>(jobRes))
        const saved = (savedRes as { data?: SavedJobRow[] } | SavedJobRow[] | null) ?? []
        const savedList: SavedJobRow[] = Array.isArray(saved)
          ? saved
          : Array.isArray((saved as { data?: SavedJobRow[] }).data)
            ? (saved as { data: SavedJobRow[] }).data
            : []
        const match = savedList.find((s) => s.job_id === id)
        if (match) setSavedRowId(match.id)
      })
      .catch(() => setError(t('jobDetail.loadError', {}, { defaultValue: 'Job not found.' })))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  async function handleSaveToggle() {
    if (!job) return
    setSavingPending(true)
    setError(null)
    try {
      if (savedRowId) {
        await http.delete(`/api/saved-jobs/${savedRowId}`)
        setSavedRowId(null)
        track({ name: 'job.unsaved', properties: { job_id: job.id } })
      } else {
        const res = await http.post('/api/saved-jobs', { job_id: job.id })
        const row = unwrapSingle<SavedJobRow>(res.data)
        if (row && row.id) setSavedRowId(row.id)
        track({ name: 'job.saved', properties: { job_id: job.id } })
      }
    } catch (_error) {
      setError(t('jobDetail.saveError', {}, { defaultValue: 'Could not update saved jobs.' }))
    } finally {
      setSavingPending(false)
    }
  }

  async function handleApply() {
    if (!job) return
    setApplying(true)
    setError(null)
    try {
      await http.post('/api/applications', { job_id: job.id })
      setApplied(true)
      track({ name: 'application.submitted', properties: { job_id: job.id } })
    } catch (_error) {
      setError(t('jobDetail.applyError', {}, { defaultValue: 'Could not submit application.' }))
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('jobDetail.loading', {}, { defaultValue: 'Loading\u2026' })}
      </div>
    )
  }
  if (!job) {
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.stack(4))}>
        <p className={cm.cn('text-error font-semibold')}>
          {error ?? t('jobDetail.notFound', {}, { defaultValue: 'Job not found.' })}
        </p>
        <Link to="/jobs" className={cm.cn('text-primary font-bold hover:underline')}>
          {t('jobDetail.backToJobs', {}, { defaultValue: '\u2190 Back to all jobs' })}
        </Link>
      </div>
    )
  }

  const salary = formatSalary(job.salary_min, job.salary_max)
  const company = job.company
  const initial = (company?.name || job.title).slice(0, 1).toUpperCase()
  const statusBadge: ApplicationStatus | null =
    job.status === 'closed'
      ? 'closed'
      : job.status === 'published' || job.status === 'active'
        ? 'active'
        : null

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <div className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        <Link to="/jobs" className={cm.cn('hover:text-primary transition-colors')}>
          {t('jobDetail.crumbsJobs', {}, { defaultValue: 'Jobs' })}
        </Link>
        <span className={cm.cn('mx-2 opacity-50')}>/</span>
        <span className={cm.cn('text-on-surface font-semibold')}>{job.title}</span>
      </div>

      <header
        className={cm.cn(
          cm.sp('p', 8),
          'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/20',
        )}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -top-20 h-72 w-72 rounded-full bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'absolute -left-12 -bottom-16 h-48 w-48 rounded-full bg-success/30 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'relative z-10',
            cm.flex({ align: 'start', justify: 'between', wrap: 'wrap', gap: 'lg' }),
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'start', gap: 'lg' }))}>
            <span
              className={cm.cn(
                'grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-surface/15 backdrop-blur-md border border-surface/20 text-3xl font-extrabold',
              )}
              aria-hidden="true"
            >
              {initial}
            </span>
            <div>
              <p
                className={cm.cn('text-[10px] font-black uppercase tracking-widest text-white/70')}
              >
                {company?.name ?? t('form.company', {}, { defaultValue: 'Company' })}
              </p>
              <h1 className={cm.cn('mt-1 text-3xl md:text-4xl font-extrabold tracking-tight')}>
                {job.title}
              </h1>
              <div
                className={cm.cn(
                  cm.sp('mt', 3),
                  'flex flex-wrap items-center gap-3 text-sm font-medium text-white/85',
                )}
              >
                {job.location ? (
                  <span className={cm.cn('inline-flex items-center gap-1')}>
                    <span
                      className={cm.cn('material-symbols-outlined text-[16px]')}
                      aria-hidden="true"
                    >
                      place
                    </span>
                    {job.location}
                  </span>
                ) : (
                  <span className={cm.cn('inline-flex items-center gap-1')}>
                    <span
                      className={cm.cn('material-symbols-outlined text-[16px]')}
                      aria-hidden="true"
                    >
                      public
                    </span>
                    {t('jobDetail.remote', {}, { defaultValue: 'Remote' })}
                  </span>
                )}
                {job.type ? (
                  <>
                    <span className={cm.cn('opacity-50')}>·</span>
                    <span className={cm.cn('capitalize')}>{job.type.replace(/_/g, ' ')}</span>
                  </>
                ) : null}
                {salary ? (
                  <>
                    <span className={cm.cn('opacity-50')}>·</span>
                    <span className={cm.cn('font-bold tabular-nums')}>{salary}</span>
                  </>
                ) : null}
              </div>
              <div className={cm.cn('mt-4 flex flex-wrap items-center gap-2')}>
                {statusBadge ? <ApplicationStatusPill status={statusBadge} /> : null}
                {Array.isArray(job.tags) &&
                  job.tags.slice(0, 8).map((tag) => (
                    <span
                      key={tag}
                      className={cm.cn(
                        'inline-flex items-center rounded-full bg-surface/15 px-2.5 py-1 text-[11px] font-bold text-white',
                      )}
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          <div className={cm.cn(cm.flex({ direction: 'col', align: 'end', gap: 'sm' }))}>
            <button
              type="button"
              onClick={handleApply}
              disabled={applying || applied || job.status === 'closed'}
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('base'),
                'rounded-xl bg-surface text-primary shadow-md hover:opacity-90 transition-opacity disabled:opacity-60',
              )}
            >
              {applied
                ? t('jobDetail.applied', {}, { defaultValue: 'Application sent' })
                : applying
                  ? t('jobDetail.applying', {}, { defaultValue: 'Sending\u2026' })
                  : t('jobDetail.apply', {}, { defaultValue: 'Apply now' })}
            </button>
            <button
              type="button"
              onClick={handleSaveToggle}
              disabled={savingPending}
              aria-pressed={savedRowId !== null}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'inline-flex items-center gap-1 rounded-xl border transition-colors disabled:opacity-60',
                savedRowId
                  ? 'border-surface/40 bg-surface/15 text-white hover:bg-surface/25'
                  : 'border-surface/40 text-white hover:bg-surface/15',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                {savedRowId ? 'bookmark_added' : 'bookmark'}
              </span>
              {savedRowId
                ? t('common.saved', {}, { defaultValue: 'Saved' })
                : t('jobDetail.save', {}, { defaultValue: 'Save job' })}
            </button>
            {typeof job.application_count === 'number' ? (
              <p className={cm.cn('text-xs font-medium text-white/70 tabular-nums')}>
                {t(
                  'jobDetail.applicantCount',
                  { count: job.application_count },
                  { defaultValue: '{{count}} applicants so far' },
                )}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <article className={cm.cn('lg:col-span-8 space-y-6')}>
          <section
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            )}
          >
            <h2
              className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t('jobDetail.descriptionHeading', {}, { defaultValue: 'About the role' })}
            </h2>
            <p
              className={cm.cn(
                cm.sp('mt', 3),
                'whitespace-pre-line text-base leading-relaxed text-on-surface-variant',
              )}
            >
              {job.description ||
                t(
                  'jobDetail.noDescription',
                  {},
                  { defaultValue: 'The hiring team has not added a description yet.' },
                )}
            </p>
          </section>
        </article>

        <aside className={cm.cn('lg:col-span-4 space-y-6')}>
          <section
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            )}
          >
            <h3
              className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t('jobDetail.companyHeading', {}, { defaultValue: 'About the company' })}
            </h3>
            {company ? (
              <div className={cm.cn(cm.sp('mt', 4), cm.stack(3))}>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span
                    aria-hidden="true"
                    className={cm.cn(
                      'grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-on-primary font-extrabold text-lg shadow-md shadow-primary/20',
                    )}
                  >
                    {initial}
                  </span>
                  <div>
                    <p className={cm.cn('text-base font-extrabold tracking-tight text-on-surface')}>
                      {company.name}
                    </p>
                    {company.location ? (
                      <p className={cm.cn('text-xs text-on-surface-variant')}>{company.location}</p>
                    ) : null}
                  </div>
                </div>
                {company.description ? (
                  <p className={cm.cn('text-sm leading-relaxed text-on-surface-variant')}>
                    {company.description}
                  </p>
                ) : null}
                {company.id ? (
                  <Link
                    to={`/companies/${company.id}`}
                    className={cm.cn(
                      'text-xs font-bold text-primary hover:text-primary-container transition-colors',
                    )}
                  >
                    {t(
                      'jobDetail.companyLink',
                      {},
                      { defaultValue: 'View company profile \u2192' },
                    )}
                  </Link>
                ) : null}
              </div>
            ) : (
              <p className={cm.cn('mt-2 text-sm text-on-surface-variant')}>
                {t(
                  'jobDetail.noCompany',
                  {},
                  { defaultValue: 'No company information attached to this role.' },
                )}
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
