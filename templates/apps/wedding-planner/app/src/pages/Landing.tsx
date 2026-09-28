import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

const FEATURES = [
  {
    key: 'guests',
    defaultTitle: 'Guest list that thinks',
    defaultBody:
      'Track sides, groups, meals, and plus-ones. Filter by RSVP status and find anyone in a keystroke.',
    icon: 'group',
    tile: 'bg-secondary-container/50 text-secondary',
    pillar: '01',
  },
  {
    key: 'rsvp',
    defaultTitle: 'RSVPs without the chase',
    defaultBody:
      'Share one code. Guests confirm on a public page — no accounts, no emails — and your tally updates live.',
    icon: 'mark_email_read',
    tile: 'bg-primary-fixed/60 text-primary',
    pillar: '02',
  },
  {
    key: 'budget',
    defaultTitle: 'Budget under control',
    defaultBody:
      'Estimate every line, log actuals as deposits land, and see exactly where the plan stands.',
    icon: 'savings',
    tile: 'bg-surface-container-high text-on-surface-variant',
    pillar: '03',
  },
  {
    key: 'vendors',
    defaultTitle: 'Vendor pipeline',
    defaultBody:
      'Researching, contacted, booked, paid — a clear checklist for every florist, band, and caterer.',
    icon: 'storefront',
    tile: 'bg-secondary-container/40 text-secondary',
    pillar: '04',
  },
  {
    key: 'tasks',
    defaultTitle: 'Timeline checklist',
    defaultBody:
      'A dated countdown of everything left to do, from save-the-dates to final headcount.',
    icon: 'checklist',
    tile: 'bg-primary-fixed/40 text-primary',
    pillar: '05',
  },
  {
    key: 'seating',
    defaultTitle: 'Seating chart',
    defaultBody:
      'Draw your tables, set capacities, and drag guests from the unseated pool into their seats.',
    icon: 'table_restaurant',
    tile: 'bg-tertiary-container text-on-tertiary-container',
    pillar: '06',
  },
] as const

const STEPS = [
  {
    key: 'add',
    defaultTitle: 'Add your guests',
    defaultBody: 'Names, sides, groups, contact details, plus-one allowances — in one calm list.',
    icon: 'person_add',
  },
  {
    key: 'share',
    defaultTitle: 'Share your RSVP code',
    defaultBody:
      'Put the code on your invitations. Guests open the link, find their name, and answer once.',
    icon: 'share',
  },
  {
    key: 'watch',
    defaultTitle: 'Watch the tally fill in',
    defaultBody:
      'Yes / no / maybe counts, meals, and confirmed headcount update on your dashboard.',
    icon: 'insights',
  },
  {
    key: 'seat',
    defaultTitle: 'Seat everyone',
    defaultBody:
      'Assign confirmed guests to tables with live capacity checks — no overbooked tables.',
    icon: 'event_seat',
  },
] as const

/* Editorial couple monogram tiles (the design's avatar stack, rebuilt with
   initials so no external photography is shipped). */
const COUPLES = [
  { initials: 'CH', names: 'Clara & Julian' },
  { initials: 'MJ', names: 'Maya & Jordan' },
  { initials: 'EM', names: 'Elena & Marcus' },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isAuthenticated = useIsAuthenticated()
  const [rsvpCode, setRsvpCode] = useState('')

  function goToRsvp(e: React.FormEvent) {
    e.preventDefault()
    const code = rsvpCode.trim().toUpperCase()
    if (code) navigate(`/rsvp/${encodeURIComponent(code)}`)
  }

  const ctaTo = isAuthenticated ? '/dashboard' : '/signup'

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      {/* Top navigation */}
      <header className="sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 shadow-sm">
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
          )}
        >
          <Link
            to="/"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              'text-2xl text-on-surface hover:text-primary transition-colors',
              'font-headline italic tracking-tight',
            )}
          >
            {APP_NAME}
            <span
              className="w-1.5 h-1.5 rounded-full bg-primary-container inline-block mb-1"
              aria-hidden="true"
            />
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/about"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'hidden md:inline text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="nav-dashboard"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'px-5 py-2.5 rounded-full bg-primary text-on-primary hover:bg-primary-dark transition-all shadow-sm',
                )}
              >
                {t('nav.dashboard', {}, { defaultValue: 'Go to dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  data-mol-id="nav-login"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'text-on-surface-variant hover:text-primary transition-colors',
                  )}
                >
                  {t('nav.logIn', {}, { defaultValue: 'Log in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="nav-signup"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'px-5 py-2.5 rounded-full bg-primary text-on-primary hover:bg-primary-dark transition-all shadow-sm',
                  )}
                >
                  {t('nav.startPlanning', {}, { defaultValue: 'Start planning' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero with embedded guest RSVP portal */}
        <section className="relative overflow-hidden border-b border-outline-variant/20">
          <div
            className="absolute -top-32 right-1/4 w-96 h-96 bg-primary-fixed/25 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 left-10 w-80 h-80 bg-secondary-container/40 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'relative pt-12 pb-20 md:pt-20 md:pb-28',
            )}
          >
            <div
              className={cm.cn(
                cm.grid({ gap: 'lg' }),
                'grid-cols-1 lg:grid-cols-12 gap-12 items-center',
              )}
            >
              {/* Editorial hero pitch */}
              <div className="lg:col-span-7 space-y-6">
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary-container/40 border border-secondary/20 gap-2',
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" aria-hidden="true" />
                  <span className="text-[11px] uppercase tracking-widest font-semibold text-secondary">
                    {t('landing.eyebrow', {}, { defaultValue: 'Serene wedding platform' })}
                  </span>
                </div>
                <h1 className="font-headline text-5xl md:text-6xl lg:text-7xl leading-[1.12] tracking-tight">
                  {t('landing.title', {}, { defaultValue: 'The whole wedding,' })}
                  <br className="hidden sm:inline" />
                  <span className="italic text-primary">
                    {' '}
                    {t('landing.titleAccent', {}, { defaultValue: 'beautifully planned' })}
                  </span>
                  .
                </h1>
                <p className="text-lg text-on-surface-variant max-w-xl leading-relaxed">
                  {t(
                    'landing.subtitle',
                    {},
                    {
                      defaultValue:
                        'Guest list, RSVP collection, budget, vendors, tasks, and seating — one calm place for you two and everyone helping.',
                    },
                  )}
                </p>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                    'flex-col sm:flex-row gap-4 pt-2',
                  )}
                >
                  {isAuthenticated ? (
                    <Link
                      to="/dashboard"
                      data-mol-id="hero-dashboard"
                      className={cm.cn(
                        cm.textSize('base'),
                        cm.fontWeight('semibold'),
                        'inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-primary text-on-primary hover:bg-primary-dark transition-all shadow-md hover:shadow-lg',
                      )}
                    >
                      {t('landing.ctaDashboard', {}, { defaultValue: 'Open your planner' })}
                      <span className="material-symbols-outlined text-lg" aria-hidden="true">
                        arrow_forward
                      </span>
                    </Link>
                  ) : (
                    <Link
                      to="/signup"
                      data-mol-id="hero-signup"
                      className={cm.cn(
                        cm.textSize('base'),
                        cm.fontWeight('semibold'),
                        'inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-primary text-on-primary hover:bg-primary-dark transition-all shadow-md hover:shadow-lg',
                      )}
                    >
                      {t('landing.cta', {}, { defaultValue: 'Start planning — it’s free' })}
                      <span className="material-symbols-outlined text-lg" aria-hidden="true">
                        arrow_forward
                      </span>
                    </Link>
                  )}
                  <Link
                    to="/about"
                    data-mol-id="hero-about"
                    className={cm.cn(
                      cm.textSize('base'),
                      cm.fontWeight('semibold'),
                      'inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 text-on-surface hover:text-primary transition-all',
                    )}
                  >
                    <span
                      className="material-symbols-outlined text-lg text-primary"
                      aria-hidden="true"
                    >
                      play_circle
                    </span>
                    {t('landing.secondary', {}, { defaultValue: 'See how it works' })}
                  </Link>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    'gap-2 text-on-surface-variant text-sm pt-1',
                  )}
                >
                  <span
                    className="material-symbols-outlined text-secondary text-base"
                    aria-hidden="true"
                  >
                    verified
                  </span>
                  <span>
                    {t(
                      'landing.microTrust',
                      {},
                      {
                        defaultValue:
                          'No credit card required · Free 14-day full trial · Unlimited guest list',
                      },
                    )}
                  </span>
                </div>
                {/* Couple monograms & trust metric */}
                <div className="pt-6 border-t border-outline-variant/30 flex items-center gap-4">
                  <div className="flex -space-x-2.5">
                    {COUPLES.map((c) => (
                      <span
                        key={c.initials}
                        title={t(
                          'landing.coupleNames',
                          { names: c.names },
                          { defaultValue: c.names },
                        )}
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          'h-10 w-10 rounded-full ring-2 ring-surface bg-secondary-container text-secondary text-xs font-semibold',
                        )}
                      >
                        {c.initials}
                      </span>
                    ))}
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'h-10 w-10 rounded-full ring-2 ring-surface bg-surface-container-high text-primary text-xs font-semibold',
                      )}
                    >
                      +45k
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        'flex items-center gap-0.5 text-primary',
                      )}
                    >
                      {[0, 1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className="material-symbols-outlined text-sm"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                          aria-hidden="true"
                        >
                          star
                        </span>
                      ))}
                    </div>
                    <span className="text-sm text-on-surface-variant">
                      {t(
                        'landing.trustLine',
                        {},
                        { defaultValue: 'Over 45,000 weddings celebrated with calm joy.' },
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Guest RSVP portal card — the guest entrance */}
              <div className="lg:col-span-5" id="guest-rsvp-box">
                <div
                  className={cm.cn(
                    cm.sp('p', 8),
                    'relative bg-surface-container-lowest rounded-2xl p-7 md:p-8 border border-outline-variant/30 ambient-glow-lg',
                  )}
                  data-mol-id="landing-rsvp-card"
                >
                  <div
                    className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-primary-container/60 to-transparent"
                    aria-hidden="true"
                  />
                  <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20">
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        'flex items-center gap-2',
                      )}
                    >
                      <span
                        className="material-symbols-outlined text-primary text-xl"
                        aria-hidden="true"
                      >
                        mark_email_read
                      </span>
                      <span className="text-[11px] uppercase tracking-wider text-primary font-semibold">
                        {t('landing.rsvpEyebrow', {}, { defaultValue: 'Guest portal access' })}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-medium">
                      {t('landing.rsvpInstant', {}, { defaultValue: 'Instant response' })}
                    </span>
                  </div>
                  <h2 className="font-headline text-xl pt-4">
                    {t('landing.rsvpTitle', {}, { defaultValue: 'Attending a celebration?' })}
                  </h2>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      'text-on-surface-variant pt-2 leading-relaxed',
                    )}
                  >
                    {t(
                      'landing.rsvpBody',
                      {},
                      {
                        defaultValue:
                          'The couple’s code is on your invitation. Enter it to find your name and answer once — no account needed.',
                      },
                    )}
                  </p>
                  <form onSubmit={goToRsvp} className="mt-6 space-y-4">
                    <div>
                      <label
                        htmlFor="landing-rsvp-code"
                        className="block text-xs text-on-surface-variant mb-1.5 uppercase tracking-wider font-semibold"
                      >
                        {t('landing.rsvpLabel', {}, { defaultValue: 'Passkey or couple code' })}
                      </label>
                      <div className="relative">
                        <span
                          className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-lg"
                          aria-hidden="true"
                        >
                          key
                        </span>
                        <input
                          type="text"
                          id="landing-rsvp-code"
                          value={rsvpCode}
                          onChange={(e) => setRsvpCode(e.target.value)}
                          placeholder={t(
                            'landing.rsvpPlaceholder',
                            {},
                            { defaultValue: 'WEDD1NG202' },
                          )}
                          aria-label={t('landing.rsvpAriaLabel', {}, { defaultValue: 'RSVP code' })}
                          data-mol-id="landing-rsvp-code-input"
                          className={cm.cn(
                            cm.sp('py', 3),
                            'w-full pl-11 pr-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/60',
                            'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
                            'font-mono uppercase tracking-wider',
                          )}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      data-mol-id="landing-rsvp-submit"
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                        'w-full flex items-center justify-center gap-2 bg-on-surface text-background py-3.5 rounded-xl font-semibold hover:bg-primary hover:text-on-primary transition-all shadow-sm',
                      )}
                    >
                      <span>
                        {t('landing.rsvpSubmit', {}, { defaultValue: 'Find my invitation' })}
                      </span>
                      <span className="material-symbols-outlined text-base" aria-hidden="true">
                        arrow_forward
                      </span>
                    </button>
                  </form>
                  <div className="mt-6 pt-4 border-t border-outline-variant/20 flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">
                      {t(
                        'landing.rsvpCoupleHint',
                        {},
                        { defaultValue: 'Looking for your couple login?' },
                      )}
                    </span>
                    <Link
                      to="/login"
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        'text-primary hover:underline text-sm font-semibold gap-0.5',
                      )}
                    >
                      {t('landing.rsvpCouplePortal', {}, { defaultValue: 'Couple portal' })}
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">
                        north_east
                      </span>
                    </Link>
                  </div>
                  <div className="mt-3.5 p-3 rounded-lg bg-surface-container-high/60 flex items-center justify-between text-xs text-on-surface-variant">
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        'flex items-center gap-1.5',
                      )}
                    >
                      <span className="w-2 h-2 rounded-full bg-secondary" aria-hidden="true" />
                      {t('landing.rsvpSampleHint', {}, { defaultValue: 'Try guest sample code:' })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRsvpCode('WEDD1NG202')}
                      className="font-mono bg-surface px-2 py-0.5 rounded border border-outline-variant/40 hover:text-primary transition-colors"
                    >
                      WEDD1NG202
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Signature flow */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <p className="text-[11px] uppercase tracking-widest text-primary font-semibold mb-3">
            {t('landing.flowEyebrow', {}, { defaultValue: 'The signature flow' })}
          </p>
          <h2 className="font-headline text-3xl md:text-4xl mb-10">
            {t('landing.flowTitle', {}, { defaultValue: 'From guest list to seated dinner' })}
          </h2>
          <ol className={cm.cn('grid gap-8 sm:grid-cols-2 lg:grid-cols-4 gap-6')}>
            {STEPS.map((step, i) => (
              <li
                key={step.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm',
                )}
                data-mol-id={`landing-step-${step.key}`}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    'flex items-center gap-3',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'w-8 h-8 rounded-full text-white text-sm font-semibold tabular-nums bg-primary',
                    )}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="material-symbols-outlined text-2xl text-primary"
                    aria-hidden="true"
                  >
                    {step.icon}
                  </span>
                </div>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'mt-4')}>
                  {t(`landing.step.${step.key}.title`, {}, { defaultValue: step.defaultTitle })}
                </h3>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-on-surface-variant leading-relaxed mt-2',
                  )}
                >
                  {t(`landing.step.${step.key}.body`, {}, { defaultValue: step.defaultBody })}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Feature pillars */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'end', justify: 'between' }),
              'mb-10 flex-wrap gap-4',
            )}
          >
            <div>
              <p className="text-[11px] uppercase tracking-widest text-primary font-semibold mb-2">
                {t('landing.featuresEyebrow', {}, { defaultValue: 'Everything in one place' })}
              </p>
              <h2 className="font-headline text-3xl md:text-4xl">
                {t('landing.featuresTitle', {}, { defaultValue: 'Six tools, zero spreadsheets' })}
              </h2>
            </div>
          </div>
          <div className={cm.cn('grid gap-8 sm:grid-cols-2 lg:grid-cols-3 gap-6')}>
            {FEATURES.map((feature) => (
              <article
                key={feature.key}
                data-mol-id={`landing-feature-${feature.key}`}
                className={cm.cn(
                  cm.sp('p', 8),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 ambient-glow hover:border-primary/40 transition-all hover:-translate-y-0.5',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
                    feature.tile,
                  )}
                >
                  <span className="material-symbols-outlined text-2xl" aria-hidden="true">
                    {feature.icon}
                  </span>
                </div>
                <span className="text-[11px] uppercase tracking-wider text-primary font-bold">
                  {t(
                    `landing.featurePillar.${feature.pillar}`,
                    { pillar: feature.pillar },
                    { defaultValue: 'PILLAR {{pillar}}' },
                  )}
                </span>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'mt-1 mb-2')}>
                  {t(
                    `landing.feature.${feature.key}.title`,
                    {},
                    { defaultValue: feature.defaultTitle },
                  )}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(
                    `landing.feature.${feature.key}.body`,
                    {},
                    { defaultValue: feature.defaultBody },
                  )}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section
          className="border-t border-outline-variant/30 bg-surface-container-low relative overflow-hidden"
          data-mol-id="landing-couple-cta"
        >
          <div
            className={cm.cn(
              cm.maxW('5xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'py-20 text-center relative z-10',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                'inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-outline-variant/40 text-primary text-[11px] uppercase tracking-wider font-semibold mb-6',
              )}
            >
              {t('landing.ctaEyebrow', {}, { defaultValue: 'For the couple' })}
            </div>
            <h2 className="font-headline text-4xl md:text-5xl mb-6">
              {t(
                'landing.ctaTitle',
                {},
                { defaultValue: 'Enjoy being engaged. We’ll hold the checklist.' },
              )}
            </h2>
            <p className="text-lg text-on-surface-variant max-w-2xl mx-auto mb-8">
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Start free, invite your guests with one code, and upgrade only when your list outgrows the free tier.',
                },
              )}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={ctaTo}
                data-mol-id="landing-bottom-cta"
                className={cm.cn(
                  cm.textSize('base'),
                  cm.fontWeight('semibold'),
                  'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-9 py-4 rounded-full bg-primary text-on-primary hover:bg-primary-dark transition-all shadow-md hover:shadow-lg',
                )}
              >
                {isAuthenticated
                  ? t('landing.ctaDashboard', {}, { defaultValue: 'Open your planner' })
                  : t('landing.cta', {}, { defaultValue: 'Start planning — it’s free' })}
                <span className="material-symbols-outlined text-lg" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
              <a
                href="#guest-rsvp-box"
                className={cm.cn(
                  cm.textSize('base'),
                  cm.fontWeight('semibold'),
                  'w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-full bg-surface hover:bg-surface-container-high text-on-surface border border-outline-variant/40 transition-all',
                )}
              >
                {t('landing.rsvpAnchorCta', {}, { defaultValue: 'I have an invitation code' })}
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
