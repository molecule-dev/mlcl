import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

// Mirrors api/src/tiers.ts (Free / Pro / Team) — keep names, prices, and
// limits in sync with getPricingTiers() and the /pricing page.
const PRICING = [
  {
    key: 'free',
    title: 'Free',
    price: '$0',
    period: '/mo',
    blurb: 'Search every public role, track applications, and post your first jobs.',
    bullets: [
      'Unlimited job search',
      'Track up to 5 applications',
      'Post up to 5 jobs',
      '90 days of history',
    ],
    cta: 'Start for free',
  },
  {
    key: 'pro',
    title: 'Pro',
    price: '$15',
    period: '/mo',
    blurb: 'For employers and busy seekers who need more room to work.',
    bullets: [
      'Up to 500 job postings',
      'Up to 500 tracked applications',
      'Advanced features + data export',
      '1 year of history',
    ],
    cta: 'Upgrade to Pro',
    featured: true,
  },
  {
    key: 'team',
    title: 'Team',
    price: '$49',
    period: '/mo',
    blurb: 'For talent teams that hire at scale.',
    bullets: [
      'Everything in Pro',
      'Unlimited jobs + applications',
      'Unlimited companies',
      'Unlimited history',
    ],
    cta: 'Choose Team',
  },
] as const

const STATS = [
  { key: 'roles', icon: 'work', value: '48K+', defaultLabel: 'Open roles' },
  { key: 'companies', icon: 'business', value: '12K+', defaultLabel: 'Companies' },
  { key: 'candidates', icon: 'group', value: '2.4M', defaultLabel: 'Candidates' },
  { key: 'salary', icon: 'payments', value: '$115K', defaultLabel: 'Avg salary' },
] as const

const FEATURED_JOBS = [
  {
    key: 'frontend',
    companyInitial: 'T',
    badge: 'New',
    defaultTitle: 'Senior Frontend Engineer',
    defaultCompany: 'TechFlow Inc.',
    defaultLocation: 'Remote',
    defaultType: 'Full-time',
    tags: ['React', 'TypeScript', 'Tailwind'],
    defaultSalary: '$140k - $180k',
  },
  {
    key: 'designer',
    companyInitial: 'N',
    badge: null,
    defaultTitle: 'Product Designer',
    defaultCompany: 'Nexus Systems',
    defaultLocation: 'New York, NY',
    defaultType: 'Hybrid',
    tags: ['Figma', 'UI/UX'],
    defaultSalary: '$120k - $150k',
  },
  {
    key: 'backend',
    companyInitial: 'D',
    badge: null,
    defaultTitle: 'Backend Engineer',
    defaultCompany: 'DataCore',
    defaultLocation: 'San Francisco, CA',
    defaultType: 'Full-time',
    tags: ['Python', 'Django', 'AWS'],
    defaultSalary: '$150k - $190k',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const navigate = useNavigate()
  const [searchTitle, setSearchTitle] = useState('')
  const [searchLocation, setSearchLocation] = useState('')

  function onHeroSearch(e: FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchTitle.trim()) params.set('q', searchTitle.trim())
    if (searchLocation.trim()) params.set('location', searchLocation.trim())
    const qs = params.toString()
    navigate(qs ? `/jobs?${qs}` : '/jobs')
  }

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      {/* Top nav — solid surface bar with hairline divider (design: white h-20 bar) */}
      <nav className={cm.cn('sticky top-0 z-50 border-b border-outline-variant/30 bg-surface')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'flex h-16 items-center justify-between md:h-20',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
            <Link
              to="/"
              className={cm.cn(
                cm.textSize('xl'),
                'shrink-0 whitespace-nowrap font-black tracking-tight text-primary',
              )}
            >
              {APP_NAME}
            </Link>
            <div className={cm.cn('hidden gap-6 md:flex')}>
              <Link
                to="/jobs"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant transition-colors hover:text-primary',
                )}
              >
                {t('landing.navFindJobs', {}, { defaultValue: 'Find Jobs' })}
              </Link>
              <Link
                to="/companies"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant transition-colors hover:text-primary',
                )}
              >
                {t('landing.navCompanies', {}, { defaultValue: 'Companies' })}
              </Link>
              <Link
                to="/pricing"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant transition-colors hover:text-primary',
                )}
              >
                {t('landing.pricingEyebrow', {}, { defaultValue: 'Pricing' })}
              </Link>
            </div>
          </div>
          <div className={cm.cn('hidden items-center gap-4 md:flex')}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="nav-go-to-dashboard"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-primary transition-colors hover:text-primary-dark',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <Link
                to="/login"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-primary transition-colors hover:text-primary-dark',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            )}
            <Link
              to="/post-job"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant transition-colors hover:text-primary',
              )}
            >
              {t('landing.navPostJob', {}, { defaultValue: 'Post a Job' })}
            </Link>
            <Link
              to="/signup"
              data-mol-id="nav-get-started"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2.5),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'rounded-lg bg-primary text-on-primary shadow-sm transition-colors hover:bg-primary-hover active:scale-95',
              )}
            >
              {t('common.getStarted', {}, { defaultValue: 'Get started' })}
            </Link>
          </div>
          {/* Mobile: single compact CTA keeps the bar to one row */}
          <div className={cm.cn('md:hidden')}>
            <Link
              to="/signup"
              data-mol-id="nav-get-started-mobile"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'rounded-lg bg-primary text-on-primary transition-colors hover:bg-primary-hover',
              )}
            >
              {t('common.getStarted', {}, { defaultValue: 'Get started' })}
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Search hero — navy gradient band, centered headline + dual-field search card */}
        <section
          className={cm.cn(
            'relative overflow-hidden px-6 pb-32 pt-20',
            'bg-[linear-gradient(to_bottom_right,var(--color-hero-from),var(--color-hero-to))]',
          )}
        >
          <div
            className={cm.cn(
              'pointer-events-none absolute -top-20 -right-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              'pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-success/10 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div className={cm.cn(cm.maxW('4xl'), cm.mxAuto, 'relative z-10', cm.textCenter)}>
            <h1
              className={cm.cn(
                cm.sp('mb', 6),
                'text-4xl font-black tracking-tight text-white md:text-6xl',
              )}
            >
              {t('landing.heroTitle', {}, { defaultValue: 'Where talent meets momentum.' })}
            </h1>
            <p
              className={cm.cn(
                cm.sp('mb', 10),
                cm.mxAuto,
                cm.maxW('2xl'),
                'text-lg font-medium text-[var(--color-hero-subtle)] md:text-xl',
              )}
            >
              {t(
                'landing.heroSubtitle',
                { tagline: APP_TAGLINE },
                {
                  defaultValue:
                    'Discover modern, opportunity-forward roles curated for ambitious professionals.',
                },
              )}
            </p>
            <form
              onSubmit={onHeroSearch}
              className={cm.cn(
                cm.mxAuto,
                cm.maxW('3xl'),
                cm.flex({ direction: 'col', gap: 'sm' }),
                'rounded-lg bg-surface p-2 shadow-xl md:flex-row',
              )}
            >
              <label
                className={cm.cn(
                  cm.flex({ align: 'center' }),
                  'flex-1',
                  cm.sp('px', 4),
                  'rounded border border-outline-variant bg-background transition-colors focus-within:border-primary',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined mr-2 text-on-surface-variant')}
                  aria-hidden="true"
                >
                  search
                </span>
                <input
                  type="text"
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                  aria-label={t(
                    'landing.searchTitleLabel',
                    {},
                    { defaultValue: 'Job title, keyword, or company' },
                  )}
                  placeholder={t(
                    'landing.searchTitleLabel',
                    {},
                    { defaultValue: 'Job title, keyword, or company' },
                  )}
                  className={cm.cn(
                    'w-full border-none bg-transparent py-4 text-on-surface outline-none placeholder:text-on-surface-variant',
                  )}
                />
              </label>
              <label
                className={cm.cn(
                  cm.flex({ align: 'center' }),
                  'flex-1',
                  cm.sp('px', 4),
                  'rounded border border-outline-variant bg-background transition-colors focus-within:border-primary',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined mr-2 text-on-surface-variant')}
                  aria-hidden="true"
                >
                  location_on
                </span>
                <input
                  type="text"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  aria-label={t(
                    'landing.searchLocationLabel',
                    {},
                    { defaultValue: 'City, state, or Remote' },
                  )}
                  placeholder={t(
                    'landing.searchLocationLabel',
                    {},
                    { defaultValue: 'City, state, or Remote' },
                  )}
                  className={cm.cn(
                    'w-full border-none bg-transparent py-4 text-on-surface outline-none placeholder:text-on-surface-variant',
                  )}
                />
              </label>
              <button
                type="submit"
                data-mol-id="hero-search-jobs"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('bold'),
                  'rounded bg-primary text-on-primary shadow-md transition-colors hover:bg-primary-hover',
                )}
              >
                {t('landing.searchCta', {}, { defaultValue: 'Search' })}
              </button>
            </form>
          </div>
        </section>

        {/* Stat strip — white card overlapping the hero (-mt-12), mono numerals */}
        <section
          className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'relative z-20 -mt-12')}
        >
          <div
            className={cm.cn(
              'grid grid-cols-2 gap-8 rounded-xl border border-outline-variant/40 bg-surface p-8 shadow-lg md:grid-cols-4',
              'md:divide-x md:divide-outline-variant/30',
            )}
          >
            {STATS.map((s) => (
              <div key={s.key} className={cm.cn(cm.sp('px', 4), cm.textCenter)}>
                <span
                  className={cm.cn('material-symbols-outlined mb-2 text-[30px] text-primary')}
                  aria-hidden="true"
                >
                  {s.icon}
                </span>
                <div className={cm.cn('font-mono text-3xl font-bold text-on-surface')}>
                  {s.value}
                </div>
                <div
                  className={cm.cn(
                    cm.sp('mt', 1),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'uppercase tracking-wider text-on-surface-variant',
                  )}
                >
                  {t(`landing.stat.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Featured jobs — three cards with logo tile, meta, tags, mono salary */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 24))}>
          <div className={cm.cn(cm.sp('mb', 10), cm.flex({ justify: 'between', align: 'end' }))}>
            <div>
              <h2 className={cm.cn(cm.sp('mb', 2), 'text-3xl font-black text-on-surface')}>
                {t('landing.featuredHeading', {}, { defaultValue: 'Hot Opportunities' })}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
                {t(
                  'landing.featuredSubheading',
                  {},
                  { defaultValue: 'Curated roles from top tech companies.' },
                )}
              </p>
            </div>
            <Link
              to="/jobs"
              className={cm.cn(
                'hidden items-center font-semibold text-primary transition-colors hover:text-primary-dark md:flex',
              )}
            >
              {t('landing.featuredViewAll', {}, { defaultValue: 'View all jobs' })}
              <span className={cm.cn('material-symbols-outlined ml-1 text-sm')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
          <div className={cm.grid({ cols: 3, gap: 'md' })}>
            {FEATURED_JOBS.map((job) => (
              <div
                key={job.key}
                className={cm.cn(
                  'group relative rounded-xl border border-outline-variant/60 bg-surface p-6 shadow-sm transition-all duration-200 hover:border-primary hover:shadow-md',
                )}
              >
                <span
                  className={cm.cn(
                    'absolute top-0 left-0 h-1 w-full rounded-t-xl bg-primary opacity-0 transition-opacity group-hover:opacity-100',
                  )}
                  aria-hidden="true"
                />
                <div
                  className={cm.cn(cm.sp('mb', 4), cm.flex({ justify: 'between', align: 'start' }))}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-12 w-12 overflow-hidden rounded border border-outline-variant/60 bg-surface-container-lowest',
                    )}
                  >
                    {/* Deliberate non-replication: the design hotlinks stock logo
                        imagery; we render a monogram tile instead. */}
                    <span className={cm.cn('text-xl font-black text-primary')} aria-hidden="true">
                      {job.companyInitial}
                    </span>
                  </div>
                  {'badge' in job && job.badge ? (
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'rounded bg-primary-container text-on-primary-container',
                      )}
                    >
                      {t('landing.jobBadgeNew', {}, { defaultValue: 'New' })}
                    </span>
                  ) : null}
                </div>
                <h3
                  className={cm.cn(
                    cm.sp('mb', 1),
                    cm.textSize('xl'),
                    cm.fontWeight('bold'),
                    'text-on-surface transition-colors group-hover:text-primary',
                  )}
                >
                  {t(
                    `landing.featuredJob.${job.key}.title`,
                    {},
                    { defaultValue: job.defaultTitle },
                  )}
                </h3>
                <p className={cm.cn(cm.sp('mb', 4), cm.fontWeight('semibold'), 'text-primary')}>
                  {t(
                    `landing.featuredJob.${job.key}.company`,
                    {},
                    { defaultValue: job.defaultCompany },
                  )}
                </p>
                <div
                  className={cm.cn(
                    cm.sp('mb', 4),
                    cm.flex({ wrap: 'wrap', gap: 'sm' }),
                    cm.textSize('sm'),
                    'text-on-surface-variant',
                  )}
                >
                  <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                    <span
                      className={cm.cn('material-symbols-outlined text-[16px]')}
                      aria-hidden="true"
                    >
                      location_on
                    </span>
                    {t(
                      `landing.featuredJob.${job.key}.location`,
                      {},
                      { defaultValue: job.defaultLocation },
                    )}
                  </span>
                  <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                    <span
                      className={cm.cn('material-symbols-outlined text-[16px]')}
                      aria-hidden="true"
                    >
                      schedule
                    </span>
                    {t(
                      `landing.featuredJob.${job.key}.type`,
                      {},
                      { defaultValue: job.defaultType },
                    )}
                  </span>
                </div>
                <div className={cm.cn(cm.sp('mb', 5), 'flex flex-wrap gap-2')}>
                  {job.tags.map((tag) => (
                    <span
                      key={tag}
                      className={cm.cn(
                        cm.sp('px', 2.5),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        cm.fontWeight('medium'),
                        'rounded-full bg-surface-container text-on-surface-variant',
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div
                  className={cm.cn(
                    cm.sp('pt', 4),
                    cm.flex({ align: 'center', justify: 'between' }),
                    'border-t border-outline-variant/40',
                  )}
                >
                  <span className={cm.cn('font-mono font-bold text-success')}>
                    {t(
                      `landing.featuredJob.${job.key}.salary`,
                      {},
                      { defaultValue: job.defaultSalary },
                    )}
                  </span>
                  {/* Deliberate non-replication: the design's bookmark toggle is a
                      dead control on a marketing surface — rendered inert. */}
                  <span className={cm.cn('text-on-surface-variant')} aria-hidden="true">
                    <span className={cm.cn('material-symbols-outlined')}>bookmark_border</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className={cm.cn(cm.sp('mt', 8), cm.textCenter, 'md:hidden')}>
            <Link
              to="/jobs"
              className={cm.cn(
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'inline-flex w-full items-center justify-center rounded-lg bg-surface-container text-on-surface transition-colors hover:bg-surface-container-high',
              )}
            >
              {t('landing.featuredViewAll', {}, { defaultValue: 'View all jobs' })}
            </Link>
          </div>
        </section>

        {/* Pricing — kept from the app surface (the design omits it); card
            language aligned to the design (rounded-xl, hairline borders). */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 16))}>
          <div className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.textCenter, cm.sp('mb', 12))}>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
              {t('landing.pricingEyebrow', {}, { defaultValue: 'Pricing' })}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mt', 3),
                cm.textSize('4xl'),
                'font-black tracking-tight text-on-surface',
              )}
            >
              {t(
                'landing.pricingHeading',
                {},
                { defaultValue: 'Simple plans for every team size.' },
              )}
            </h2>
          </div>
          <div className={cm.grid({ cols: 3, gap: 'md' })}>
            {PRICING.map((p) => {
              const featured = 'featured' in p && p.featured
              return (
                <div
                  key={p.key}
                  className={cm.cn(
                    cm.sp('p', 6),
                    'rounded-xl border transition-all',
                    featured
                      ? 'border-primary bg-gradient-to-br from-primary to-secondary text-on-primary shadow-md shadow-primary/20'
                      : 'border-outline-variant/40 bg-surface hover:-translate-y-0.5 hover:shadow-md',
                  )}
                >
                  <p
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest',
                      featured ? 'text-white/80' : 'text-on-surface-variant',
                    )}
                  >
                    {t(`landing.plan.${p.key}.label`, {}, { defaultValue: p.title })}
                  </p>
                  <p className={cm.cn(cm.sp('mt', 3), 'flex items-baseline gap-2')}>
                    <span
                      className={cm.cn(
                        cm.textSize('4xl'),
                        'font-black tracking-tight tabular-nums',
                        featured ? 'text-on-primary' : 'text-on-surface',
                      )}
                    >
                      {p.price}
                    </span>
                    {'period' in p && p.period ? (
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          featured ? 'text-white/80' : 'text-on-surface-variant',
                        )}
                      >
                        {p.period}
                      </span>
                    ) : null}
                  </p>
                  <p
                    className={cm.cn(
                      cm.sp('mt', 2),
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      featured ? 'text-white/80' : 'text-on-surface-variant',
                    )}
                  >
                    {t(`landing.plan.${p.key}.blurb`, {}, { defaultValue: p.blurb })}
                  </p>
                  <ul className={cm.cn(cm.sp('mt', 6), cm.stack(3))}>
                    {p.bullets.map((b, i) => (
                      <li
                        key={i}
                        className={cm.cn(
                          cm.flex({ align: 'start', gap: 'sm' }),
                          cm.textSize('sm'),
                          featured ? 'text-on-primary' : 'text-on-surface',
                        )}
                      >
                        <span
                          className={cm.cn(
                            'material-symbols-outlined mt-0.5 text-[18px]',
                            featured ? 'text-white/80' : 'text-primary',
                          )}
                          aria-hidden="true"
                        >
                          check_circle
                        </span>
                        <span>
                          {t(`landing.plan.${p.key}.bullet${i}`, {}, { defaultValue: b })}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.sp('mt', 8),
                      cm.sp('py', 3),
                      cm.sp('px', 4),
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      cm.textCenter,
                      'block rounded-lg transition-all',
                      featured
                        ? 'bg-surface/95 text-primary hover:bg-surface'
                        : 'bg-primary/10 text-primary hover:bg-primary/15',
                    )}
                  >
                    {t(`landing.plan.${p.key}.cta`, {}, { defaultValue: p.cta })}
                  </Link>
                </div>
              )
            })}
          </div>
        </section>

        {/* Final CTA band — navy panel, dual buttons */}
        <section className={cm.cn('bg-secondary px-6 py-20')}>
          <div className={cm.cn(cm.maxW('4xl'), cm.mxAuto, cm.textCenter)}>
            <h2 className={cm.cn(cm.sp('mb', 6), 'text-3xl font-black text-white md:text-4xl')}>
              {t(
                'landing.ctaHeading',
                {},
                { defaultValue: 'Ready to find your next great opportunity?' },
              )}
            </h2>
            <p
              className={cm.cn(
                cm.sp('mb', 10),
                cm.mxAuto,
                cm.maxW('2xl'),
                cm.textSize('lg'),
                'text-[var(--color-hero-subtle)]',
              )}
            >
              {t(
                'landing.ctaSubheading',
                { app: APP_NAME },
                {
                  defaultValue:
                    'Join thousands of professionals finding their momentum on {{app}}.',
                },
              )}
            </p>
            <div className={cm.cn('flex flex-col justify-center gap-4 sm:flex-row')}>
              <Link
                to="/signup"
                data-mol-id="cta-create-profile"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'rounded-lg bg-primary text-on-primary shadow-lg transition-colors hover:bg-primary-hover',
                )}
              >
                {t('landing.ctaPrimary', {}, { defaultValue: 'Create a Profile' })}
              </Link>
              <Link
                to="/post-job"
                data-mol-id="cta-post-job"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'rounded-lg border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20',
                )}
              >
                {t('landing.navPostJob', {}, { defaultValue: 'Post a Job' })}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          'border-t border-outline-variant/30 bg-surface-container-low text-on-surface-variant',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('py', 12),
            cm.sp('px', 6),
            cm.flex({ direction: 'col', gap: 'lg' }),
            'items-center justify-between md:flex-row',
          )}
        >
          <div className={cm.cn(cm.textCenter, 'md:text-left')}>
            <Link
              to="/"
              className={cm.cn(cm.sp('mb', 2), cm.textSize('xl'), 'block font-black text-primary')}
            >
              {APP_NAME}
            </Link>
            <p className={cm.cn(cm.textSize('sm'))}>
              {t(
                'landing.copyright',
                { year: new Date().getFullYear(), app: APP_NAME },
                { defaultValue: '\u00a9 {{year}} {{app}}' },
              )}
              {' — Built with '}
              <a
                href="https://molecule.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline font-medium"
              >
                Molecule.dev
              </a>
            </p>
          </div>
          <div className={cm.cn('flex flex-wrap justify-center gap-6 text-sm font-medium')}>
            <Link to="/about" className={cm.cn('transition-colors hover:text-success')}>
              {t('landing.footerAbout', {}, { defaultValue: 'About' })}
            </Link>
            <Link to="/privacy" className={cm.cn('transition-colors hover:text-success')}>
              {t('landing.footerPrivacy', {}, { defaultValue: 'Privacy Policy' })}
            </Link>
            <Link to="/terms" className={cm.cn('transition-colors hover:text-success')}>
              {t('landing.footerTerms', {}, { defaultValue: 'Terms of Service' })}
            </Link>
            <Link to="/pricing" className={cm.cn('transition-colors hover:text-success')}>
              {t('landing.pricingEyebrow', {}, { defaultValue: 'Pricing' })}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
