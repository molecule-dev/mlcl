import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { CompanyProfile } from '../components/CompanyProfileCard.js'
import type { JobListing } from '../components/JobListingRow.js'
import { JobListingRow } from '../components/JobListingRow.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

export function CompanyDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [company, setCompany] = useState<CompanyProfile | null>(null)
  const [jobs, setJobs] = useState<JobListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/companies/${id}`).catch(() => null),
      http
        .get(`/api/jobs?company_id=${encodeURIComponent(id)}&status=published&limit=50`)
        .catch(() => null),
    ])
      .then(([cRes, jRes]) => {
        if (cancelled) return
        setCompany(unwrapSingle<CompanyProfile>(cRes))
        setJobs(unwrapList<JobListing>(jRes))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id])

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('companyDetail.loading', {}, { defaultValue: 'Loading\u2026' })}
      </div>
    )
  }
  if (!company) {
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.stack(4))}>
        <p className={cm.cn('text-error font-semibold')}>
          {t('companyDetail.notFound', {}, { defaultValue: 'Company not found.' })}
        </p>
        <Link to="/companies" className={cm.cn('text-primary font-bold hover:underline')}>
          {t('companyDetail.backToCompanies', {}, { defaultValue: '\u2190 Back to companies' })}
        </Link>
      </div>
    )
  }

  const initial = (company.name || '?').slice(0, 1).toUpperCase()

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <div className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        <Link to="/companies" className={cm.cn('hover:text-primary transition-colors')}>
          {t('companyDetail.crumbs', {}, { defaultValue: 'Companies' })}
        </Link>
        <span className={cm.cn('mx-2 opacity-50')}>/</span>
        <span className={cm.cn('text-on-surface font-semibold')}>{company.name}</span>
      </div>

      <header
        className={cm.cn(
          cm.sp('p', 8),
          'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/20',
        )}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -top-20 h-80 w-80 rounded-full bg-surface/10 blur-3xl',
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
          className={cm.cn('relative z-10', cm.flex({ align: 'start', gap: 'lg', wrap: 'wrap' }))}
        >
          {company.logo_url ? (
            <img
              src={company.logo_url}
              alt=""
              className={cm.cn('h-24 w-24 shrink-0 rounded-2xl bg-surface object-cover shadow-md')}
            />
          ) : (
            <span
              aria-hidden="true"
              className={cm.cn(
                'grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-surface/15 backdrop-blur-md border border-surface/20 text-4xl font-extrabold',
              )}
            >
              {initial}
            </span>
          )}
          <div>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-white/70')}>
              {company.industry ??
                t('companyDetail.companyEyebrow', {}, { defaultValue: 'Featured employer' })}
            </p>
            <h1 className={cm.cn('mt-1 text-4xl font-extrabold tracking-tight')}>{company.name}</h1>
            <div
              className={cm.cn(
                'mt-3 flex flex-wrap items-center gap-3 text-sm font-medium text-white/85',
              )}
            >
              {company.location ? (
                <span className={cm.cn('inline-flex items-center gap-1')}>
                  <span
                    className={cm.cn('material-symbols-outlined text-[16px]')}
                    aria-hidden="true"
                  >
                    place
                  </span>
                  {company.location}
                </span>
              ) : null}
              {company.employee_count ? (
                <>
                  <span className={cm.cn('opacity-50')}>·</span>
                  <span className={cm.cn('inline-flex items-center gap-1 tabular-nums')}>
                    <span
                      className={cm.cn('material-symbols-outlined text-[16px]')}
                      aria-hidden="true"
                    >
                      groups
                    </span>
                    {t(
                      'companyDetail.employees',
                      { count: company.employee_count.toLocaleString() },
                      { defaultValue: '{{count}} employees' },
                    )}
                  </span>
                </>
              ) : null}
              {company.website ? (
                <>
                  <span className={cm.cn('opacity-50')}>·</span>
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cm.cn(
                      'inline-flex items-center gap-1 underline-offset-2 hover:underline',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-[16px]')}
                      aria-hidden="true"
                    >
                      language
                    </span>
                    {t('companyDetail.websiteLabel', {}, { defaultValue: 'Website' })}
                  </a>
                </>
              ) : null}
            </div>
            {company.description ? (
              <p
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.maxW('2xl'),
                  'text-base leading-relaxed text-white/85',
                )}
              >
                {company.description}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <section>
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
            {t(
              'companyDetail.openRolesHeading',
              { count: jobs.length },
              { defaultValue: 'Open roles ({{count}})' },
            )}
          </h2>
        </header>
        {jobs.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('py', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/30 text-on-surface-variant',
            )}
          >
            {t(
              'companyDetail.openRolesEmpty',
              { name: company.name },
              {
                defaultValue:
                  '{{name}} isn\u2019t hiring publicly right now \u2014 follow to get notified.',
              },
            )}
          </p>
        ) : (
          <ul className={cm.stack(3)}>
            {jobs.map((j) => (
              <li key={j.id}>
                <JobListingRow job={{ ...j, company_name: company.name }} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
