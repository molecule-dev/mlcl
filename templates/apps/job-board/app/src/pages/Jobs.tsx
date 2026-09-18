import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { JobListing } from '../components/JobListingRow.js'
import { JobListingRow } from '../components/JobListingRow.js'
import { unwrapList } from '../lib/unwrap.js'

const JOB_TYPES = [
  { value: '', defaultLabel: 'All types' },
  { value: 'full_time', defaultLabel: 'Full-time' },
  { value: 'part_time', defaultLabel: 'Part-time' },
  { value: 'contract', defaultLabel: 'Contract' },
  { value: 'internship', defaultLabel: 'Internship' },
] as const

export function Jobs() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [jobs, setJobs] = useState<JobListing[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [salaryMin, setSalaryMin] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ limit: '50' })
    if (typeFilter) params.set('type', typeFilter)
    if (locationFilter) params.set('location', locationFilter)
    if (salaryMin) params.set('salary_min', salaryMin)
    // Both public-board paths apply the SAME structured filters — attach them to
    // the search URL too. Previously the search path received only the query
    // text, so type/location/min-salary were silently dropped whenever the user
    // typed a keyword. Both endpoints now return a bare job list.
    const url = searchQuery.trim()
      ? `/api/jobs/search?q=${encodeURIComponent(searchQuery.trim())}&${params.toString()}`
      : `/api/jobs/published?${params.toString()}`
    http
      .get(url)
      .then((res) => {
        if (!cancelled) setJobs(unwrapList<JobListing>(res))
      })
      .catch(() => {
        if (!cancelled) setJobs([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, searchQuery, typeFilter, locationFilter, salaryMin])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const data = new FormData(form)
    setSearchQuery(String(data.get('q') ?? ''))
    setLocationFilter(String(data.get('location') ?? ''))
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <header
        className={cm.cn(
          cm.sp('p', 8),
          'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/20',
        )}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -top-20 h-64 w-64 rounded-full bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'absolute -left-12 -bottom-16 h-48 w-48 rounded-full bg-success/30 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div className={cm.cn('relative z-10')}>
          <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-white/70')}>
            {t('jobs.eyebrow', {}, { defaultValue: 'Search the board' })}
          </p>
          <h1 className={cm.cn('mt-2 text-4xl md:text-5xl font-extrabold tracking-tight')}>
            {t('jobs.heading', {}, { defaultValue: 'Find your next role.' })}
          </h1>
          <p
            className={cm.cn(
              cm.sp('mt', 3),
              cm.maxW('xl'),
              cm.textSize('base'),
              'font-medium text-white/85',
            )}
          >
            {t(
              'jobs.subheading',
              {},
              {
                defaultValue:
                  'Filter by skills, salary, and location. Saved searches keep new matches in your inbox.',
              },
            )}
          </p>

          <form
            onSubmit={handleSubmit}
            className={cm.cn(
              cm.sp('mt', 6),
              cm.sp('p', 2),
              'flex flex-col gap-2 rounded-2xl bg-surface/15 backdrop-blur-md border border-surface/20 md:flex-row md:items-center',
            )}
          >
            <div className={cm.cn('flex flex-1 items-center gap-2 px-3')}>
              <span
                className={cm.cn('material-symbols-outlined text-[20px] text-white/80')}
                aria-hidden="true"
              >
                search
              </span>
              <input
                type="search"
                name="q"
                defaultValue={searchQuery}
                placeholder={t(
                  'jobs.searchPlaceholder',
                  {},
                  { defaultValue: 'Job title, skill, or keyword' },
                )}
                className={cm.cn(
                  'w-full bg-transparent py-3 text-sm font-medium text-white placeholder:text-white/60 outline-none',
                )}
              />
            </div>
            <div className={cm.cn('hidden h-8 w-px bg-surface/20 md:block')} />
            <div className={cm.cn('flex flex-1 items-center gap-2 px-3')}>
              <span
                className={cm.cn('material-symbols-outlined text-[20px] text-white/80')}
                aria-hidden="true"
              >
                place
              </span>
              <input
                type="text"
                name="location"
                defaultValue={locationFilter}
                placeholder={t(
                  'jobs.locationPlaceholder',
                  {},
                  { defaultValue: 'City, region, or remote' },
                )}
                className={cm.cn(
                  'w-full bg-transparent py-3 text-sm font-medium text-white placeholder:text-white/60 outline-none',
                )}
              />
            </div>
            <button
              type="submit"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl bg-surface text-primary hover:opacity-90 transition-opacity',
              )}
            >
              {t('common.search', {}, { defaultValue: 'Search' })}
            </button>
          </form>
        </div>
      </header>

      <div
        className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), cm.textSize('sm'))}
      >
        <span
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('jobs.filterLabel', {}, { defaultValue: 'Filter' })}
        </span>
        <div className={cm.cn('flex flex-wrap gap-2')}>
          {JOB_TYPES.map((jt) => (
            <button
              key={jt.value}
              type="button"
              onClick={() => setTypeFilter(jt.value)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                'rounded-full font-bold transition-all',
                typeFilter === jt.value
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
              )}
            >
              {t(
                `jobs.type.${jt.value.replace('_', '-') || 'all'}`,
                {},
                { defaultValue: jt.defaultLabel },
              )}
            </button>
          ))}
        </div>
        <div className={cm.cn('flex items-center gap-2')}>
          <span
            className={cm.cn('material-symbols-outlined text-[16px] text-on-surface-variant')}
            aria-hidden="true"
          >
            payments
          </span>
          <input
            type="number"
            value={salaryMin}
            onChange={(e) => setSalaryMin(e.target.value)}
            placeholder={t('jobs.minSalaryPlaceholder', {}, { defaultValue: 'Min salary' })}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('sm'),
              'w-32 rounded-full border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary',
            )}
          />
        </div>
      </div>

      <section>
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
            {t(
              'jobs.resultsHeading',
              { count: jobs.length },
              { defaultValue: '{{count}} matching roles' },
            )}
          </h2>
        </header>
        {loading ? (
          <p
            className={cm.cn(
              cm.sp('py', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            {t('jobs.loading', {}, { defaultValue: 'Loading\u2026' })}
          </p>
        ) : jobs.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('py', 12),
              cm.textCenter,
              cm.textSize('sm'),
              'rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/30 text-on-surface-variant',
            )}
          >
            {t(
              'jobs.empty',
              {},
              { defaultValue: 'No roles match your filters \u2014 try widening the search.' },
            )}
          </p>
        ) : (
          <ul className={cm.stack(3)}>
            {jobs.map((j) => (
              <li key={j.id}>
                <JobListingRow job={j} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
