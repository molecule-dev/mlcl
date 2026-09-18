/**
 * Editorial job-listing row — company-initial logo square (Placement cyan
 * gradient), title, company line, salary in tabular-nums, location/type
 * meta row, status pill cluster, tag chips, hover-lift transition.
 *
 * Translated from personal-finance's AccountRecentTransactions row pattern
 * + DESIGN.md "Job Card (List View)" anatomy (border-l-4, salary in tabular
 * nums, tag pills). Used on the Jobs list and the Dashboard recent-jobs
 * section.
 */
import { Link } from 'react-router'

import type { TranslateFunction } from '@molecule/app-i18n'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { ApplicationStatus } from './ApplicationStatusPill.js'
import { ApplicationStatusPill } from './ApplicationStatusPill.js'

export interface JobListing {
  id: string
  title: string
  company_id?: string
  company_name?: string
  location?: string | null
  type?: string
  salary_min?: number | null
  salary_max?: number | null
  status?: string
  tags?: string[]
  created_at?: string
  application_count?: number
}

interface JobListingRowProps {
  job: JobListing
  /** Optional override badges (defaults to derived from status / created_at). */
  badges?: ApplicationStatus[]
  /** Hide the "Apply" CTA when used in employer / dashboard contexts. */
  hideApplyCta?: boolean
}

function formatSalary(min: number | null | undefined, max: number | null | undefined): string {
  if (!min && !max) return ''
  if (min && max) return `$${min.toLocaleString()} – $${max.toLocaleString()}`
  if (min) return `From $${min.toLocaleString()}`
  return `Up to $${max!.toLocaleString()}`
}

function formatRelative(t: TranslateFunction, iso?: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const diffH = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60))
  if (diffH < 1) return t('timeAgo.justNow', {}, { defaultValue: 'just now' })
  if (diffH < 24) return t('timeAgo.hours', { count: diffH }, { defaultValue: '{{count}}h ago' })
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return t('timeAgo.days', { count: diffD }, { defaultValue: '{{count}}d ago' })
  return t('timeAgo.weeks', { count: Math.floor(diffD / 7) }, { defaultValue: '{{count}}w ago' })
}

export function JobListingRow({ job, badges, hideApplyCta }: JobListingRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const initial = (job.company_name || job.title).slice(0, 1).toUpperCase()
  const salary = formatSalary(job.salary_min, job.salary_max)
  const relative = formatRelative(t, job.created_at)

  const derivedBadges: ApplicationStatus[] = badges ?? deriveBadges(job)

  return (
    <Link
      to={`/jobs/${job.id}`}
      className={cm.cn(
        cm.sp('p', 5),
        'group block rounded-2xl bg-surface-container-lowest border border-outline-variant/20 border-l-4 border-l-transparent shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-l-primary transition-all',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'start', gap: 'md', wrap: 'wrap' }))}>
        <span
          aria-hidden="true"
          className={cm.cn(
            'grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary font-extrabold text-on-primary text-lg shadow-md shadow-primary/20',
          )}
        >
          {initial}
        </span>

        <div className={cm.cn('min-w-0 flex-1')}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
            <h3
              className={cm.cn(
                'text-lg font-extrabold tracking-tight text-on-surface group-hover:text-primary transition-colors',
              )}
            >
              {job.title}
            </h3>
            {derivedBadges.map((b) => (
              <ApplicationStatusPill key={b} status={b} size="xs" />
            ))}
          </div>
          <p className={cm.cn('mt-1 text-sm font-semibold text-on-surface-variant')}>
            <span style={{ color: 'var(--color-company)' }}>
              {job.company_name ??
                job.company_id ??
                t('form.company', {}, { defaultValue: 'Company' })}
            </span>
            <span className={cm.cn('mx-2 opacity-50')}>·</span>
            <span>{job.location || t('jobListingRow.remote', {}, { defaultValue: 'Remote' })}</span>
            {job.type ? (
              <>
                <span className={cm.cn('mx-2 opacity-50')}>·</span>
                <span className={cm.cn('capitalize')}>
                  {job.type.replace(/_/g, '-').replace('-', ' ')}
                </span>
              </>
            ) : null}
          </p>
          {salary ? (
            <p
              className={cm.cn('mt-2 text-base font-bold tabular-nums')}
              style={{ color: 'var(--color-salary)' }}
            >
              {salary}
            </p>
          ) : null}
          {Array.isArray(job.tags) && job.tags.length > 0 ? (
            <div className={cm.cn('mt-3 flex flex-wrap gap-2')}>
              {job.tags.slice(0, 6).map((tag) => (
                <span
                  key={tag}
                  className={cm.cn(
                    'inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary',
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col', align: 'end', gap: 'xs' }), 'shrink-0')}>
          {relative ? (
            <span
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {relative}
            </span>
          ) : null}
          {typeof job.application_count === 'number' ? (
            <span className={cm.cn('text-xs font-semibold text-on-surface-variant tabular-nums')}>
              {t(
                'jobListingRow.applicants',
                { count: job.application_count },
                { defaultValue: '{{count}} applicants' },
              )}
            </span>
          ) : null}
          {!hideApplyCta ? (
            <span
              className={cm.cn(
                'mt-1 inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-xs font-bold text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors',
              )}
            >
              {t('jobListingRow.apply', {}, { defaultValue: 'Apply' })}
              <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                arrow_forward
              </span>
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

function deriveBadges(job: JobListing): ApplicationStatus[] {
  const out: ApplicationStatus[] = []
  if (job.status === 'closed') out.push('closed')
  if (job.status === 'published' || job.status === 'active') out.push('active')
  if (typeof job.created_at === 'string') {
    const ageH = (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60)
    if (ageH < 48 && out[0] !== 'closed') out.push('new')
  }
  return out
}
