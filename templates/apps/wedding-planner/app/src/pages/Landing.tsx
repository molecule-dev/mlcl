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
    tint: 'text-primary',
  },
  {
    key: 'rsvp',
    defaultTitle: 'RSVPs without the chase',
    defaultBody:
      'Share one code. Guests confirm on a public page — no accounts, no emails — and your tally updates live.',
    icon: 'mark_email_read',
    tint: 'text-tertiary',
  },
  {
    key: 'budget',
    defaultTitle: 'Budget under control',
    defaultBody:
      'Estimate every line, log actuals as deposits land, and see exactly where the plan stands.',
    icon: 'savings',
    tint: 'text-success',
  },
  {
    key: 'vendors',
    defaultTitle: 'Vendor pipeline',
    defaultBody:
      'Researching, contacted, booked, paid — a clear checklist for every florist, band, and caterer.',
    icon: 'storefront',
    tint: 'text-secondary',
  },
  {
    key: 'tasks',
    defaultTitle: 'Timeline checklist',
    defaultBody:
      'A dated countdown of everything left to do, from save-the-dates to final headcount.',
    icon: 'checklist',
    tint: 'text-primary',
  },
  {
    key: 'seating',
    defaultTitle: 'Seating chart',
    defaultBody:
      'Draw your tables, set capacities, and drag guests from the unseated pool into their seats.',
    icon: 'table_restaurant',
    tint: 'text-tertiary',
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

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.mxAuto)}>
        <nav
          className={cm.cn(
            'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40',
          )}
        >
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.sp('px', 6),
              cm.sp('py', 4),
              cm.flex({ align: 'center', justify: 'between' }),
              cm.mxAuto,
            )}
          >
            <Link
              to="/"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.textSize('xl'),
                'font-extrabold tracking-tighter',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'w-9 h-9 rounded-xl text-white shadow-md shadow-primary/30',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                }}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-lg')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  favorite
                </span>
              </span>
              <span style={{ color: 'var(--color-primary)' }}>{APP_NAME}</span>
            </Link>
            <div className={cm.flex({ align: 'center', gap: 'md' })}>
              <Link
                to="/about"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'hidden md:inline text-on-surface-variant hover:text-on-surface',
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
                    'px-4 py-2 rounded-xl font-bold text-white shadow-md shadow-primary/30',
                  )}
                  style={{ background: 'var(--color-primary)' }}
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
                      cm.fontWeight('medium'),
                      'text-on-surface-variant hover:text-on-surface',
                    )}
                  >
                    {t('nav.logIn', {}, { defaultValue: 'Log in' })}
                  </Link>
                  <Link
                    to="/signup"
                    data-mol-id="nav-signup"
                    className={cm.cn(
                      cm.textSize('sm'),
                      'px-4 py-2 rounded-xl font-bold text-white shadow-md shadow-primary/30',
                    )}
                    style={{ background: 'var(--color-primary)' }}
                  >
                    {t('nav.startPlanning', {}, { defaultValue: 'Start planning' })}
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn(
              'absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full opacity-20 blur-3xl',
            )}
            style={{ background: 'var(--color-primary)' }}
            aria-hidden="true"
          />
          <div className={cm.cn(cm.maxW('3xl'), 'py-20 md:py-28 relative z-10')}>
            <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary mb-4')}>
              {t('landing.eyebrow', {}, { defaultValue: 'Free to start · Built for two' })}
            </p>
            <h1
              className={cm.cn(
                'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95]',
              )}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t('landing.title', {}, { defaultValue: 'The whole wedding,' })}
              <span style={{ color: 'var(--color-primary)' }}>
                {t('landing.titleAccent', {}, { defaultValue: 'beautifully planned' })}
              </span>
            </h1>
            <p className={cm.cn('text-lg text-on-surface-variant max-w-xl leading-relaxed mt-6')}>
              {t(
                'landing.subtitle',
                {},
                {
                  defaultValue:
                    'Guest list, RSVP collection, budget, vendors, tasks, and seating — one calm place for you two and everyone helping.',
                },
              )}
            </p>

            <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  data-mol-id="hero-dashboard"
                  className={cm.cn(
                    cm.textSize('lg'),
                    'px-6 py-3 rounded-2xl font-bold text-white shadow-lg shadow-primary/30',
                  )}
                  style={{ background: 'var(--color-primary)' }}
                >
                  {t('landing.ctaDashboard', {}, { defaultValue: 'Open your planner' })}
                </Link>
              ) : (
                <Link
                  to="/signup"
                  data-mol-id="hero-signup"
                  className={cm.cn(
                    cm.textSize('lg'),
                    'px-6 py-3 rounded-2xl font-bold text-white shadow-lg shadow-primary/30',
                  )}
                  style={{ background: 'var(--color-primary)' }}
                >
                  {t('landing.cta', {}, { defaultValue: 'Start planning — it’s free' })}
                </Link>
              )}
              <Link
                to="/about"
                data-mol-id="hero-about"
                className={cm.cn(
                  cm.textSize('lg'),
                  'px-6 py-3 rounded-2xl font-bold border border-outline-variant/60 hover:bg-surface-hover',
                )}
              >
                {t('landing.secondary', {}, { defaultValue: 'See how it works' })}
              </Link>
            </div>

            <div
              className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'mt-12 flex-wrap gap-6')}
            >
              <div>
                <p className={cm.cn('text-2xl font-extrabold tabular-nums tracking-tight')}>
                  {t('landing.statGuests', {}, { defaultValue: 'Unlimited' })}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('landing.statGuestsLabel', {}, { defaultValue: 'Guest list' })}
                </p>
              </div>
              <div>
                <p className={cm.cn('text-2xl font-extrabold tabular-nums tracking-tight')}>
                  {t('landing.statRsvp', {}, { defaultValue: '1 code' })}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('landing.statRsvpLabel', {}, { defaultValue: 'RSVP collection' })}
                </p>
              </div>
              <div>
                <p className={cm.cn('text-2xl font-extrabold tabular-nums tracking-tight')}>
                  {t('landing.statBudget', {}, { defaultValue: '$0' })}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('landing.statBudgetLabel', {}, { defaultValue: 'To begin' })}
                </p>
              </div>
            </div>
          </div>

          {/* RSVP code card — the guest entrance */}
          <div
            className={cm.cn(
              cm.maxW('3xl'),
              cm.sp('p', 8),
              'rounded-3xl bg-surface border border-outline-variant/40 shadow-lg relative z-10',
            )}
            data-mol-id="landing-rsvp-card"
          >
            <p
              className={cm.cn('text-xs font-black uppercase tracking-widest mb-3')}
              style={{ color: 'var(--color-accent)' }}
            >
              {t('landing.rsvpEyebrow', {}, { defaultValue: 'Got an invitation?' })}
            </p>
            <h2 className={cm.cn('text-2xl font-extrabold tracking-tight mb-2')}>
              {t('landing.rsvpTitle', {}, { defaultValue: 'RSVP with your code' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mb-5 max-w-lg')}>
              {t(
                'landing.rsvpBody',
                {},
                {
                  defaultValue:
                    'The couple’s code is on your invitation. Enter it to find your name and answer once — no account needed.',
                },
              )}
            </p>
            <form
              onSubmit={goToRsvp}
              className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}
            >
              <input
                type="text"
                value={rsvpCode}
                onChange={(e) => setRsvpCode(e.target.value)}
                placeholder={t('landing.rsvpPlaceholder', {}, { defaultValue: 'ROSE-GARDEN-417' })}
                aria-label={t('landing.rsvpAriaLabel', {}, { defaultValue: 'RSVP code' })}
                data-mol-id="landing-rsvp-code-input"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl border border-outline-variant/60 bg-input-background font-mono uppercase tracking-widest',
                  'focus:outline-none focus:ring-2 focus:ring-primary/40 w-full max-w-xs',
                )}
              />
              <button
                type="submit"
                data-mol-id="landing-rsvp-submit"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  'rounded-xl font-bold text-white shadow-md shadow-primary/30',
                )}
                style={{ background: 'var(--color-accent)' }}
              >
                {t('landing.rsvpSubmit', {}, { defaultValue: 'Find my invitation' })}
              </button>
            </form>
          </div>
        </section>

        {/* Signature flow */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary mb-3')}>
            {t('landing.flowEyebrow', {}, { defaultValue: 'The signature flow' })}
          </p>
          <h2 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mb-10')}>
            {t('landing.flowTitle', {}, { defaultValue: 'From guest list to seated dinner' })}
          </h2>
          <ol className={cm.cn('grid gap-6 md:grid-cols-2 lg:grid-cols-4')}>
            {STEPS.map((step, i) => (
              <li
                key={step.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
                )}
                data-mol-id={`landing-step-${step.key}`}
              >
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'w-8 h-8 rounded-full text-white text-sm font-black tabular-nums',
                    )}
                    style={{ background: 'var(--color-primary)' }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={cm.cn('material-symbols-outlined text-2xl')}
                    style={{ color: 'var(--color-primary)' }}
                    aria-hidden="true"
                  >
                    {step.icon}
                  </span>
                </div>
                <h3 className={cm.cn('text-lg font-bold mt-4')}>{step.defaultTitle}</h3>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-on-surface-variant leading-relaxed mt-2',
                  )}
                >
                  {step.defaultBody}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Feature grid */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'end', justify: 'between' }),
              'mb-10 flex-wrap gap-4',
            )}
          >
            <div>
              <p
                className={cm.cn('text-xs font-black uppercase tracking-widest text-primary mb-2')}
              >
                {t('landing.featuresEyebrow', {}, { defaultValue: 'Everything in one place' })}
              </p>
              <h2 className={cm.cn('text-3xl font-extrabold tracking-tight')}>
                {t('landing.featuresTitle', {}, { defaultValue: 'Six tools, zero spreadsheets' })}
              </h2>
            </div>
          </div>
          <div className={cm.cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-3')}>
            {FEATURES.map((feature) => (
              <article
                key={feature.key}
                data-mol-id={`landing-feature-${feature.key}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-3xl mb-3 block', feature.tint)}
                  aria-hidden="true"
                >
                  {feature.icon}
                </span>
                <h3 className={cm.cn('text-lg font-bold mb-2')}>
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

        {/* Couple CTA */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16')}>
          <div
            className={cm.cn(cm.sp('p', 10), 'rounded-3xl text-white relative overflow-hidden')}
            style={{
              background:
                'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-mid) 50%, var(--color-secondary) 100%)',
            }}
            data-mol-id="landing-couple-cta"
          >
            <div
              className={cm.cn(
                'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/10 blur-2xl',
              )}
              aria-hidden="true"
            />
            <div className={cm.cn('relative z-10 max-w-xl')}>
              <p className={cm.cn('text-xs font-black uppercase tracking-widest mb-3 opacity-70')}>
                {t('landing.ctaEyebrow', {}, { defaultValue: 'For the couple' })}
              </p>
              <h2 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mb-4')}>
                {t(
                  'landing.ctaTitle',
                  {},
                  { defaultValue: 'Enjoy being engaged. We’ll hold the checklist.' },
                )}
              </h2>
              <p className={cm.cn('text-base text-white/80 max-w-md leading-relaxed mb-6')}>
                {t(
                  'landing.ctaBody',
                  {},
                  {
                    defaultValue:
                      'Start free, invite your guests with one code, and upgrade only when your list outgrows the free tier.',
                  },
                )}
              </p>
              <Link
                to={isAuthenticated ? '/dashboard' : '/signup'}
                data-mol-id="landing-bottom-cta"
                className={cm.cn('inline-flex px-6 py-3 rounded-2xl font-bold bg-white shadow-lg')}
                style={{ color: 'var(--color-primary)' }}
              >
                {isAuthenticated
                  ? t('landing.ctaDashboard', {}, { defaultValue: 'Open your planner' })
                  : t('landing.cta', {}, { defaultValue: 'Start planning — it’s free' })}
              </Link>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
