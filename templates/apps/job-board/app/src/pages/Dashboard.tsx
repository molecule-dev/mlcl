import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { CompanyProfile } from '../components/CompanyProfileCard.js'
import { CompanyProfileCard } from '../components/CompanyProfileCard.js'
import type { JobListing } from '../components/JobListingRow.js'
import { JobListingRow } from '../components/JobListingRow.js'
import { OpportunitiesHero } from '../components/OpportunitiesHero.js'
import { OpportunityKpiCard } from '../components/OpportunityKpiCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApplicationRow {
  id: string
  job_id: string
  applicant_id: string
  status: string
  created_at?: string
}

// Time-of-day greeting key for the design's "Good morning, Alex" welcome
// heading — same convention as lms WelcomeBanner. Never reuse a shared
// catalog key: these are dashboard-specific.
function getGreeting(): { key: string; defaultValue: string } {
  const hour = new Date().getHours()
  if (hour < 12) return { key: 'dashboard.greetingMorning', defaultValue: 'Good morning, {{name}}' }
  if (hour < 18)
    return { key: 'dashboard.greetingAfternoon', defaultValue: 'Good afternoon, {{name}}' }
  return { key: 'dashboard.greetingEvening', defaultValue: 'Good evening, {{name}}' }
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<{ name?: string; email?: string }>()
  const http = useHttpClient()
  const [jobs, setJobs] = useState<JobListing[]>([])
  const [companies, setCompanies] = useState<CompanyProfile[]>([])
  const [applications, setApplications] = useState<ApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/jobs/published?limit=8').catch(() => null),
      http.get('/api/companies?limit=4').catch(() => null),
      http.get('/api/applications?limit=20').catch(() => null),
    ])
      .then(([jRes, cRes, aRes]) => {
        if (cancelled) return
        setJobs(unwrapList<JobListing>(jRes))
        setCompanies(unwrapList<CompanyProfile>(cRes))
        setApplications(unwrapList<ApplicationRow>(aRes))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('nav.failedToLoadDashboard', {}, { defaultValue: 'Failed to load dashboard.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const interviews = applications.filter((a) => a.status === 'interview').length
  const offered = applications.filter((a) => a.status === 'offered').length
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000
  const postedThisWeek = jobs.filter(
    (j) => j.created_at && Date.now() - new Date(j.created_at).getTime() < WEEK_MS,
  ).length

  // Welcome greeting (design: "Good morning, Alex") — real signed-in identity,
  // never a hardcoded sample name: display-name first word, else email prefix,
  // else the guest fallback.
  const greeting = getGreeting()
  const firstName =
    (user?.name && user.name.split(' ')[0]) ||
    (user?.email ? user.email.split('@')[0] : '') ||
    t('dashboard.greetingGuest', {}, { defaultValue: 'there' })

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('dashboard.loading', {}, { defaultValue: 'Loading\u2026' })}
      </div>
    )
  }

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
            {t('status.thisWeek', {}, { defaultValue: 'This week' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t(greeting.key, { name: firstName }, { defaultValue: greeting.defaultValue })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface')}>
            {t('dashboard.heading', {}, { defaultValue: 'Your hiring momentum' })}
          </p>
          <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
            {t(
              'dashboard.subheading',
              {},
              {
                defaultValue: 'Open roles, fresh applications, and the companies hiring right now.',
              },
            )}
          </p>
        </div>
        <Link
          to="/post-job"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
            add
          </span>
          {t('dashboard.postJobCta', {}, { defaultValue: 'Post a job' })}
        </Link>
      </header>

      {error ? (
        <div
          role="alert"
          className={cm.cn(cm.sp('p', 4), 'rounded-xl bg-error/10 text-error font-semibold')}
        >
          {error}
        </div>
      ) : null}

      <OpportunitiesHero totalRoles={jobs.length} deltaRoles={postedThisWeek} />

      <div className={cm.grid({ cols: 4, gap: 'md' })}>
        <OpportunityKpiCard
          icon="work"
          label={t('dashboard.kpi.openJobs', {}, { defaultValue: 'Active roles' })}
          value={jobs.length}
          hint={
            jobs.length === 0
              ? t(
                  'dashboard.kpi.openJobsEmpty',
                  {},
                  { defaultValue: 'Post a role to get started.' },
                )
              : undefined
          }
        />
        <OpportunityKpiCard
          icon="send"
          label={t('dashboard.kpi.applications', {}, { defaultValue: 'Applications' })}
          value={applications.length}
          hint={
            applications.length === 0
              ? t(
                  'dashboard.kpi.applicationsEmpty',
                  {},
                  { defaultValue: 'Awaiting first applicant.' },
                )
              : undefined
          }
        />
        <OpportunityKpiCard
          icon="event"
          label={t('dashboard.kpi.interviews', {}, { defaultValue: 'Interviews' })}
          value={interviews}
          hint={
            interviews === 0
              ? t(
                  'dashboard.kpi.interviewsEmptyHint',
                  {},
                  { defaultValue: 'No interviews scheduled.' },
                )
              : t('dashboard.kpi.interviewsHint', {}, { defaultValue: 'Scheduled this week.' })
          }
        />
        <OpportunityKpiCard
          icon="celebration"
          label={t('dashboard.kpi.offers', {}, { defaultValue: 'Offers out' })}
          value={offered}
          hint={
            offered === 0
              ? t('dashboard.kpi.offersEmptyHint', {}, { defaultValue: 'No offers extended yet.' })
              : t('dashboard.kpi.offersHint', {}, { defaultValue: 'Awaiting candidate decision.' })
          }
        />
      </div>

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <section className={cm.cn('lg:col-span-8')}>
          <header
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
          >
            <div>
              <p
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('dashboard.recentJobsEyebrow', {}, { defaultValue: 'Fresh on the board' })}
              </p>
              <h2
                className={cm.cn(
                  cm.sp('mt', 1),
                  cm.textSize('lg'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {t('dashboard.recentJobsHeading', {}, { defaultValue: 'Recently posted roles' })}
              </h2>
            </div>
            <Link
              to="/jobs"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'inline-flex min-h-[32px] items-center text-primary hover:text-primary-container transition-colors',
              )}
            >
              {t('dashboard.viewAllJobs', {}, { defaultValue: 'All jobs \u2192' })}
            </Link>
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
                'dashboard.recentJobsEmpty',
                {},
                { defaultValue: 'No published roles yet \u2014 be the first to post.' },
              )}
            </p>
          ) : (
            <ul className={cm.stack(3)}>
              {jobs.slice(0, 6).map((j) => (
                <li key={j.id}>
                  <JobListingRow job={j} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
        >
          <header
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 5))}
          >
            <h2
              className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t('dashboard.featuredCompaniesHeading', {}, { defaultValue: 'Hiring this week' })}
            </h2>
            <Link
              to="/companies"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'inline-flex min-h-[32px] items-center text-primary hover:text-primary-container transition-colors',
              )}
            >
              {t('dashboard.viewAllCompanies', {}, { defaultValue: 'All \u2192' })}
            </Link>
          </header>
          {companies.length === 0 ? (
            <p
              className={cm.cn(
                cm.sp('py', 6),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t('dashboard.featuredCompaniesEmpty', {}, { defaultValue: 'No companies yet.' })}
            </p>
          ) : (
            <ul className={cm.stack(4)}>
              {companies.slice(0, 3).map((c) => (
                <li key={c.id}>
                  <CompanyProfileCard company={c} variant="compact" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
