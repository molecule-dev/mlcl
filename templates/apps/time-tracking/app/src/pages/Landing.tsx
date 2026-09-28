import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { PublicTopNav } from '../components/PublicTopNav.js'
import { loadContent } from '../config.js'

const FEATURES = [
  {
    key: 'one_click',
    defaultTitle: 'One-click timer',
    defaultBody:
      'Start tracking on any project from any screen — keyboard shortcuts and a sticky timer bar mean you never lose a billable minute.',
    icon: 'timer',
    tile: 'bg-primary-fixed text-primary',
  },
  {
    key: 'projects',
    defaultTitle: 'Projects with budgets',
    defaultBody:
      'Color-coded projects, hourly rates, and live budget burn-down so you know the moment a scope creep starts costing you.',
    icon: 'folder_open',
    tile: 'bg-secondary-fixed text-secondary',
  },
  {
    key: 'reports',
    defaultTitle: 'Reports clients love',
    defaultBody:
      'Drill-down by project, client, or tag. Export CSV in one click. Send a report your client can actually skim.',
    icon: 'analytics',
    tile: 'bg-tertiary-fixed-dim text-tertiary-container',
  },
  {
    key: 'invoices',
    defaultTitle: 'Invoices, automatically',
    defaultBody:
      'Tracked hours roll up into Stripe-backed invoices with one tap. Send, mark paid, and get back to work.',
    icon: 'receipt_long',
    tile: 'bg-primary-fixed text-primary',
  },
] as const

const INTEGRATIONS = ['Slack', 'Trello', 'Jira', 'Asana'] as const

/** Splits the headline so the trailing phrase carries the design's gradient
 * text ("Every second," + "accounted for."). Works for any locale. */
function splitHeadlineAccent(title: string): { lead: string; accent: string } {
  // Prefer the full trailing phrase after the last comma ("Every second," +
  // "accounted for."); fall back to the final word.
  const comma = title.lastIndexOf(',')
  if (comma >= 0 && comma < title.length - 1) {
    return { lead: title.slice(0, comma + 1), accent: title.slice(comma + 1).trim() }
  }
  const idx = title.lastIndexOf(' ')
  if (idx <= 0) return { lead: title, accent: '' }
  return { lead: title.slice(0, idx), accent: title.slice(idx + 1) }
}

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const headline = splitHeadlineAccent(
    t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' }),
  )

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}>
      <PublicTopNav />

      <main className="pt-28 pb-24">
        {/* Hero — centered precision statement with the kinetic timer bar */}
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'mb-32 flex flex-col pt-12 text-center lg:pt-24',
          )}
        >
          <h1 className="mx-auto mb-6 max-w-4xl text-5xl font-bold leading-[1.1] tracking-[-0.04em] md:text-6xl lg:text-7xl">
            {headline.lead}{' '}
            {headline.accent && <span className="text-gradient">{headline.accent}</span>}
          </h1>
          <p className="mx-auto mb-12 max-w-2xl leading-relaxed text-on-surface-variant">
            {t(
              'landing.heroSubtitle',
              {},
              {
                defaultValue:
                  'Track billable hours across clients, watch budgets in real-time, and turn every minute into a Stripe-backed invoice. Built for freelancers, consultants, and agencies.',
              },
            )}
          </p>
          <div className="mx-auto mb-16 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row">
            <Link
              to="/signup"
              data-mol-id="landing-hero-cta"
              className="btn-gradient shadow-ambient transition-glide inline-flex w-full items-center justify-center rounded-xl px-8 py-3.5 font-medium text-white hover:opacity-90 sm:w-auto"
            >
              {t('landing.heroCta', {}, { defaultValue: 'Start tracking — free' })}
            </Link>
            <Link
              to="/login"
              className="transition-glide inline-flex w-full items-center justify-center rounded-xl bg-surface-container-highest px-8 py-3.5 font-medium text-on-surface hover:bg-surface-variant sm:w-auto"
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xl', wrap: 'wrap' }),
              'mb-20 justify-center',
            )}
          >
            <div className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span className={cm.cn('material-symbols-outlined text-success')}>check_circle</span>
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant font-medium')}>
                {t('landing.proof.freeTier', {}, { defaultValue: 'Free for up to 3 projects' })}
              </span>
            </div>
            <div className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span className={cm.cn('material-symbols-outlined text-success')}>check_circle</span>
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant font-medium')}>
                {t('landing.proof.noCard', {}, { defaultValue: 'No credit card required' })}
              </span>
            </div>
            <div className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span className={cm.cn('material-symbols-outlined text-success')}>check_circle</span>
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant font-medium')}>
                {t('landing.proof.export', {}, { defaultValue: 'CSV export anytime' })}
              </span>
            </div>
          </div>

          {/* Kinetic timer bar preview */}
          <div
            data-testid="landing-timer-bar"
            className="shadow-ambient transition-glide group relative mx-auto flex w-full max-w-2xl items-center justify-between overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4 hover:shadow-lg"
          >
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                <span className="material-symbols-outlined text-lg" aria-hidden="true">
                  play_arrow
                </span>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-medium text-on-surface">
                  {t('landing.timer.project', {}, { defaultValue: 'Website Redesign' })}
                </span>
                <span className="text-xs text-on-surface-variant">
                  {t('landing.timer.phase', {}, { defaultValue: 'Design Phase' })}
                </span>
              </div>
            </div>
            <div className="relative z-10 flex items-center gap-6">
              <span className="text-xl font-semibold tracking-tight text-on-surface">02:14:36</span>
              <span
                aria-hidden="true"
                className="transition-glide flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-sm">stop</span>
              </span>
            </div>
            {/* Time-strip progress */}
            <div
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-1 w-[45%] bg-gradient-to-r from-primary to-tertiary opacity-70 transition-glide group-hover:opacity-100"
            />
          </div>
        </section>

        {/* Integrations row — no opacity on the text: opacity-60 dropped
            text-on-surface-variant to #8e9099 (3.18:1 on white, axe fail).
            The token at full strength (#434655) is 9.4:1. */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'mb-32')}>
          <p className="mb-8 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            {t('landing.integrations.eyebrow', {}, { defaultValue: 'Works alongside your stack' })}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 sm:gap-24">
            {INTEGRATIONS.map((name) => (
              <span key={name} className="text-xl font-bold text-on-surface-variant">
                {name}
              </span>
            ))}
          </div>
        </section>

        {/* Feature cards */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'mb-32')}>
          <h2
            className={cm.cn(
              cm.sp('mb', 4),
              cm.textCenter,
              'text-3xl md:text-4xl font-bold tracking-tight',
            )}
          >
            {t('landing.featuresHeading', {}, { defaultValue: 'Built for billable work' })}
          </h2>
          <p
            className={cm.cn(
              cm.sp('mb', 12),
              cm.textCenter,
              cm.textSize('lg'),
              'text-on-surface-variant mx-auto max-w-2xl',
            )}
          >
            {t(
              'landing.featuresBody',
              {},
              {
                defaultValue:
                  'From the first click of the timer to the final invoice — every step is built around the way independents actually work.',
              },
            )}
          </p>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className="shadow-ambient transition-glide rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-8 shadow-sm hover:shadow-lg"
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(12),
                    cm.h(12),
                    'mb-6 rounded-xl',
                    f.tile,
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.sp('mt', 5),
                    cm.sp('mb', 2),
                    'font-medium tracking-tight text-on-surface',
                  )}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface-variant')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Dashboard preview — window-chrome mockup over a skewed wash */}
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'relative mb-32 overflow-hidden',
          )}
          aria-hidden="true"
        >
          <div className="absolute inset-0 -z-10 scale-105 -skew-y-2 rounded-3xl bg-surface-container-low" />
          <div className="shadow-ambient overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4">
            <div className="mb-4 flex items-center justify-between border-b border-outline-variant/15 pb-4">
              <div className="flex gap-2">
                <div className="h-3 w-3 rounded-full bg-error-container" />
                <div className="h-3 w-3 rounded-full bg-surface-variant" />
                <div className="h-3 w-3 rounded-full bg-tertiary-fixed" />
              </div>
              <div className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {APP_NAME}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="hidden flex-col gap-3 lg:flex">
                <div className="h-8 w-full rounded-lg bg-surface-container-high" />
                <div className="h-8 w-3/4 rounded-lg bg-surface-container-low" />
                <div className="h-8 w-5/6 rounded-lg bg-surface-container-low" />
              </div>
              <div className="col-span-2 flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex h-24 flex-col justify-between rounded-xl bg-surface-container-low p-4">
                    <span className="text-xs uppercase text-on-surface-variant">
                      {t('landing.preview.totalHours', {}, { defaultValue: 'Total hours' })}
                    </span>
                    <span className="text-2xl font-bold text-on-surface">42.5h</span>
                  </div>
                  <div className="flex h-24 flex-col justify-between rounded-xl bg-surface-container-low p-4">
                    <span className="text-xs uppercase text-on-surface-variant">
                      {t('landing.preview.billable', {}, { defaultValue: 'Billable' })}
                    </span>
                    <span className="text-2xl font-bold text-tertiary-container">$3,400</span>
                  </div>
                </div>
                <div className="flex h-48 items-end gap-2 overflow-hidden rounded-xl bg-surface-container-low p-4">
                  <div className="h-[30%] w-full rounded-t-sm bg-primary-fixed" />
                  <div className="h-[60%] w-full rounded-t-sm bg-primary-fixed" />
                  <div className="h-[40%] w-full rounded-t-sm bg-primary-fixed" />
                  <div className="h-[80%] w-full rounded-t-sm bg-primary-container" />
                  <div className="h-[50%] w-full rounded-t-sm bg-primary-fixed" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social proof — testimonial strip (app-needed; not in the design) */}
        <section
          className={cm.cn('border-y border-outline-variant/40 bg-surface-container-low py-20')}
        >
          <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), cm.textCenter)}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'font-bold uppercase tracking-widest text-primary mb-6',
              )}
            >
              {t('landing.testimonial.eyebrow', {}, { defaultValue: 'Trusted by independents' })}
            </p>
            <p
              className={cm.cn(
                'text-2xl font-bold leading-snug tracking-tight text-on-surface md:text-3xl',
              )}
            >
              {t(
                'landing.testimonial.quote',
                {},
                {
                  defaultValue:
                    "\u201cI moved off Toggl in 30 minutes. The budget burn-down alone has paid for itself \u2014 I've stopped under-quoting two weeks running.\u201d",
                },
              )}
            </p>
            <p
              className={cm.cn(cm.sp('mt', 6), cm.textSize('sm'), 'font-semibold text-on-surface')}
            >
              {t(
                'landing.testimonial.attribution',
                {},
                { defaultValue: 'Maya R. · Brand strategist, Brooklyn' },
              )}
            </p>
          </div>
        </section>

        {/* CTA strip */}
        <section className={cm.cn('border-t border-outline-variant/40')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20 text-center')}>
            <h3
              className={cm.cn(
                cm.textSize('3xl'),
                cm.sp('mb', 4),
                'font-bold tracking-tight text-on-surface',
              )}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Start tracking in under a minute' })}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('base'),
                cm.sp('mb', 8),
                'text-on-surface-variant mx-auto max-w-xl',
              )}
            >
              {t(
                'landing.ctaBody',
                {},
                { defaultValue: 'Free for up to 3 projects. Upgrade when your client list does.' },
              )}
            </p>
            <Link
              to="/signup"
              className="btn-gradient shadow-ambient transition-glide inline-flex items-center justify-center rounded-xl px-10 py-4 font-medium text-white hover:opacity-90"
            >
              {t('landing.heroCta', {}, { defaultValue: 'Start tracking — free' })}
              <span
                className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}
                aria-hidden="true"
              >
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer — tonal shift, no top border */}
      <footer className="bg-surface-container-low py-12">
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.flex({ direction: 'col', align: 'center', justify: 'between', gap: 8 }),
            'md:flex-row',
          )}
        >
          <div className="text-lg font-bold text-on-surface">{APP_NAME}</div>
          <nav
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
              'flex-wrap',
            )}
          >
            <LegalModalLinks
              linkClassName={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                // inline-flex + min-h-11 keeps the footer links at a 44px tap
                // target on touch viewports without changing their text size.
                'inline-flex items-center min-h-11 px-2 text-on-surface-variant hover:text-on-surface transition-colors',
              )}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
            />
          </nav>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'landing.copyright',
              { year: new Date().getFullYear(), app: APP_NAME },
              { defaultValue: '© {{year}} {{app}}. Every second, accounted for.' },
            )}
            {' — Built with '}
            <a
              href="https://molecule.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline"
            >
              Molecule.dev
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Landing
export { Landing as LandingPage }
