import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

const FEATURES = [
  {
    key: 'visits',
    defaultTitle: 'Virtual visits in minutes',
    defaultBody:
      'Connect with a board-certified clinician without scheduling, transit, or waiting-room time.',
    icon: 'videocam',
  },
  {
    key: 'records',
    defaultTitle: 'Records in one place',
    defaultBody:
      'Lab results, prescriptions, visit notes, vitals — all merged into a single chronological timeline.',
    icon: 'folder_shared',
  },
  {
    key: 'rx',
    defaultTitle: 'Send prescriptions same-day',
    defaultBody:
      'E-prescriptions delivered to the pharmacy of your choice. Refills resolve in under 60 seconds.',
    icon: 'medication',
  },
  {
    key: 'continuity',
    defaultTitle: 'Continuity of care',
    defaultBody:
      'Build a longitudinal relationship with your provider. They see your history; nothing repeats.',
    icon: 'chronic',
  },
] as const

const TRUST_STATS = [
  { key: 'visits', defaultLabel: 'Visits this year', value: '4.2M' },
  { key: 'wait', defaultLabel: 'Avg wait time', value: '4 min' },
  { key: 'satisfied', defaultLabel: 'Member satisfied', value: '97%' },
  { key: 'states', defaultLabel: 'Licensed in', value: '50 states' },
]

/** Design's trust avatars — initials on token-tinted circles (no external images). */
const TRUST_AVATARS = [
  { initials: 'MC', className: 'bg-primary-fixed text-on-primary-fixed' },
  { initials: 'JO', className: 'bg-secondary-fixed text-on-secondary-fixed' },
  { initials: 'AS', className: 'bg-tertiary-fixed text-on-tertiary-fixed' },
]

/** Splits the headline so the last word carries the design's gradient text
 * ("Care without the" + "commute."). Works for any locale's translation. */
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
  const isAuthenticated = useIsAuthenticated()
  const headline = splitHeadlineAccent(
    t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' }),
  )

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav className={'fixed inset-x-0 top-0 z-50 bg-surface/70 backdrop-blur-xl'}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
          )}
        >
          <Link to="/" className={'text-2xl font-bold tracking-tighter text-primary'}>
            {APP_NAME}
          </Link>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 8 }), 'hidden md:flex')}>
            <Link
              to="/providers"
              className={cm.cn(
                cm.sp('py', 2),
                'text-sm font-medium tracking-tight text-on-surface-variant transition-colors hover:text-primary',
              )}
            >
              {t('nav.providers', {}, { defaultValue: 'For Providers' })}
            </Link>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.sp('py', 2),
                'text-sm font-medium tracking-tight text-on-surface-variant transition-colors hover:text-primary',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
          </div>
          <div className={cm.flex({ align: 'center', gap: 4 })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={
                  'flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-primary text-on-primary hover:opacity-90 transition-opacity'
                }
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 18 }}
                  aria-hidden="true"
                >
                  arrow_forward
                </span>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.sp('py', 2),
                    'text-sm font-medium text-primary transition-opacity hover:opacity-80',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="landing-nav-cta"
                  className={
                    'flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-primary text-on-primary hover:opacity-90 transition-opacity'
                  }
                >
                  {t('landing.navCta', {}, { defaultValue: 'Get Care Now' })}
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18 }}
                    aria-hidden="true"
                  >
                    arrow_forward
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-20">
        {/* Hero — 60/40 asymmetry: calm copy left, care card right */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'relative mb-32')}>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7 lg:pr-12">
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  'mb-6 w-fit rounded-full bg-surface-container-high px-4 py-1.5',
                )}
              >
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide text-on-surface">
                  {t('landing.eyebrow', {}, { defaultValue: 'Available 24/7 nationwide' })}
                </span>
              </div>
              <h1 className="mb-6 text-5xl font-bold leading-[1.1] tracking-tight lg:text-7xl">
                {headline.lead}{' '}
                {headline.accent && <span className="gradient-text">{headline.accent}</span>}
              </h1>
              <p className="mb-10 max-w-2xl text-xl leading-relaxed text-on-surface-variant">
                {t(
                  'landing.heroSubtitle',
                  {},
                  {
                    defaultValue:
                      'Experience compassionate, high-quality healthcare from the comfort of your home. Connect with board-certified doctors in minutes, not days.',
                  },
                )}
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/signup"
                  data-mol-id="landing-hero-cta"
                  className="ambient-shadow hero-gradient inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-lg font-semibold text-on-primary transition-opacity hover:opacity-90"
                >
                  {t('landing.heroCta', {}, { defaultValue: 'Start a visit now' })}
                  <span className="material-symbols-outlined" aria-hidden="true">
                    video_call
                  </span>
                </Link>
                <Link
                  to="/providers"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-8 py-4 text-lg font-semibold text-primary transition-colors hover:bg-surface-container-high"
                >
                  {t('landing.heroCtaSecondary', {}, { defaultValue: 'Meet our doctors' })}
                </Link>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 4 }),
                  'mt-8 text-sm text-on-surface-variant',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center' }), '-space-x-2')}>
                  {TRUST_AVATARS.map((a) => (
                    <span
                      key={a.initials}
                      aria-hidden="true"
                      className={
                        'flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface text-[10px] font-bold ' +
                        a.className
                      }
                    >
                      {a.initials}
                    </span>
                  ))}
                </div>
                <p>{t('landing.trust', {}, { defaultValue: 'Trusted by 10,000+ patients' })}</p>
              </div>
            </div>

            {/* Care card — gradient panel with the live provider card + glass
                status chip standing in for the design's photo */}
            <div className="relative overflow-hidden lg:col-span-5">
              <div
                aria-hidden="true"
                className="absolute -right-10 -top-10 -z-10 h-64 w-64 rounded-full bg-primary-fixed/30 blur-3xl"
              />
              <div
                className={
                  'hero-gradient relative flex min-h-[420px] flex-col justify-between overflow-hidden rounded-2xl p-6 ambient-shadow'
                }
              >
                <svg
                  className="absolute left-0 right-0 top-10 w-full text-primary-fixed opacity-40"
                  height="60"
                  viewBox="0 0 600 60"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M0,30 L150,30 L160,15 L170,45 L180,5 L190,45 L200,30 L350,30 L360,15 L370,45 L380,5 L390,45 L400,30 L600,30"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>

                <div className="relative z-10 my-auto">
                  <div className="rounded-2xl bg-surface p-4 text-on-surface shadow-2xl shadow-black/20">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed font-bold"
                        aria-hidden="true"
                      >
                        MC
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          {t('landing.card.specialty', {}, { defaultValue: 'Internal medicine' })}
                        </p>
                        <h3 className="text-base font-bold tracking-tight">
                          {t('landing.card.doctor', {}, { defaultValue: 'Dr. Mira Chen' })}
                        </h3>
                        <p className="mt-1 text-[11px] text-on-surface-variant">
                          {t(
                            'landing.card.credLine',
                            {},
                            { defaultValue: '12 yrs · 1,800+ visits · 4.9 ★' },
                          )}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-success">
                        {t('landing.card.inNetwork', {}, { defaultValue: 'In network' })}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-success/10 p-2">
                        <p className="text-[9px] font-bold uppercase text-on-surface-variant">
                          {t('landing.card.bp', {}, { defaultValue: 'BP' })}
                        </p>
                        <p className="text-sm font-bold tabular-nums text-success">118/76</p>
                      </div>
                      <div className="rounded-lg bg-success/10 p-2">
                        <p className="text-[9px] font-bold uppercase text-on-surface-variant">
                          {t('landing.card.hr', {}, { defaultValue: 'HR' })}
                        </p>
                        <p className="text-sm font-bold tabular-nums text-success">68</p>
                      </div>
                      <div className="rounded-lg bg-success/10 p-2">
                        <p className="text-[9px] font-bold uppercase text-on-surface-variant">
                          {t('landing.card.spo2', {}, { defaultValue: 'SpO2' })}
                        </p>
                        <p className="text-sm font-bold tabular-nums text-success">98%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating glass element — vital chip */}
                <div className="glass-panel relative z-10 flex items-center gap-4 rounded-xl border border-outline-variant/15 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-fixed">
                    <span className="material-symbols-outlined text-secondary" aria-hidden="true">
                      favorite
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                      {t('landing.card.statusLabel', {}, { defaultValue: 'Current status' })}
                    </p>
                    <p className="text-sm font-medium text-on-surface">
                      {t(
                        'landing.card.statusValue',
                        {},
                        { defaultValue: 'Dr. Sarah Jenkins is available' },
                      )}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="ml-auto h-3 w-3 animate-pulse rounded-full bg-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats (app-needed; the design has no stats band) */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-12')}>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 md:grid-cols-4')}>
            {TRUST_STATS.map((s) => (
              <div
                key={s.key}
                className={
                  'rounded-2xl bg-surface-container-lowest p-6 text-center transition-shadow hover:shadow-lg'
                }
              >
                <p
                  className={
                    'text-3xl font-bold tracking-tight text-primary tabular-nums md:text-4xl'
                  }
                >
                  {s.value}
                </p>
                <p
                  className={
                    'mt-2 text-xs font-semibold uppercase tracking-widest text-on-surface-variant'
                  }
                >
                  {t(`landing.stat.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features — calm bento cards with mint icon tiles */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              {t(
                'landing.featuresHeading',
                {},
                { defaultValue: 'Comprehensive care, simplified.' },
              )}
            </h2>
            <p className="text-lg text-on-surface-variant">
              {t(
                'landing.featuresSubheading',
                {},
                {
                  defaultValue:
                    'Everything you need to manage your health, seamlessly integrated into one calm experience.',
                },
              )}
            </p>
          </div>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={
                  'rounded-2xl border border-outline-variant/15 bg-surface-container-low p-8 transition-colors duration-300 hover:bg-surface-container-high'
                }
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-fixed">
                  <span
                    className="material-symbols-outlined text-2xl text-on-primary-fixed"
                    aria-hidden="true"
                  >
                    {f.icon}
                  </span>
                </div>
                <h3 className="mb-3 text-xl font-medium">
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className="leading-relaxed text-on-surface-variant">
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-outline-variant/40">
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3 className="mb-4 text-3xl font-bold tracking-tight">
              {t('landing.ctaHeading', {}, { defaultValue: 'Visit a doctor today' })}
            </h3>
            <p className="mx-auto mb-8 max-w-xl text-base text-on-surface-variant">
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'No commute. No waiting room. Most insurance accepted; cash visits start at $59.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className="hero-gradient inline-flex items-center gap-2 rounded-xl px-10 py-4 font-semibold text-on-primary transition-opacity hover:opacity-90"
            >
              {t('landing.heroCta', {}, { defaultValue: 'Start a visit now' })}
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-surface-container-low py-12">
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.flex({ direction: 'col', gap: 8 }),
            'md:flex-row md:items-start md:justify-between',
          )}
        >
          <div>
            <div className="mb-4 text-lg font-bold text-primary">{APP_NAME}</div>
            <p className="text-xs leading-relaxed tracking-wide text-on-surface-variant">
              {t(
                'landing.copyright',
                { year: new Date().getFullYear(), app: APP_NAME },
                { defaultValue: '© {{year}} {{app}}' },
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
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 6 }),
              'text-xs leading-relaxed tracking-wide text-on-surface-variant md:flex-row md:justify-end',
            )}
          >
            <Link to="/privacy" className="transition-colors hover:text-primary hover:underline">
              {t('nav.privacy', {}, { defaultValue: 'Privacy Policy' })}
            </Link>
            <Link to="/terms" className="transition-colors hover:text-primary hover:underline">
              {t('nav.terms', {}, { defaultValue: 'Terms of Service' })}
            </Link>
            <Link to="/pricing" className="transition-colors hover:text-primary hover:underline">
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link to="/providers" className="transition-colors hover:text-primary hover:underline">
              {t('nav.providers', {}, { defaultValue: 'For Providers' })}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
