import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { loadContent } from '../config.js'

/**
 * Marketing landing — mirrors design-student-portal-landing.html:
 * indigo + amber Material-3 surface, "Your academic day, decoded." hero
 * beside a schedule-card interface mock, a bento feature grid, and a GPA
 * focus section with the progress-arc card. All copy stays in t(); all
 * colors resolve through theme tokens (no raw hex/rgba in JSX).
 */

const GRADIENT_CTA =
  'bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-landing-cta'

const FEATURES = [
  {
    key: 'schedule',
    icon: 'calendar_month',
    tile: 'bg-primary-container text-on-primary-container',
    defaultTitle: 'Smart Schedule',
    defaultBody:
      'Visualize your day with intuitive subject chips and contextual reminders that respect your time.',
  },
  {
    key: 'grades',
    icon: 'analytics',
    tile: 'bg-secondary-container text-on-secondary-container',
    defaultTitle: 'Live Grades',
    defaultBody:
      'Track your academic standing with elegant progress arcs instead of clinical, stressful bar charts.',
  },
  {
    key: 'assignments',
    icon: 'checklist',
    tile: 'bg-tertiary-container text-on-tertiary-container',
    defaultTitle: 'Assignment Tracker',
    defaultBody:
      'Prioritize tasks naturally with smart sorting and unobtrusive nudges for upcoming deadlines.',
  },
  {
    key: 'family',
    icon: 'family_restroom',
    tile: 'bg-surface-container-high text-on-surface-variant',
    defaultTitle: 'Built for families too',
    defaultBody:
      'Parents share a single dashboard with attendance, messages, and tier-controlled visibility.',
  },
] as const

const HERO_CHIPS = [
  {
    key: 'math',
    icon: 'calculate',
    accent: 'var(--color-info)',
    tileTint: 'text-info',
    defaultTitle: 'Calculus II',
    defaultTime: '09:00 AM — Room 302',
  },
  {
    key: 'science',
    icon: 'science',
    accent: 'var(--color-success)',
    tileTint: 'text-success',
    defaultTitle: 'Biology Lab',
    defaultTime: '11:30 AM — Science Wing',
  },
  {
    key: 'history',
    icon: 'history_edu',
    accent: 'var(--color-warning)',
    tileTint: 'text-warning',
    defaultTitle: 'World History',
    defaultTime: '02:00 PM — Room 104',
  },
] as const

const GPA_POINTS = [
  'Real-time GPA calculation based on live syllabus weighting.',
  'Historical trends to visualize academic improvement over terms.',
  'Goal setting tools to map out required grades for target GPAs.',
] as const

const GPA_SUBJECTS = [
  { key: 'math', defaultName: 'Mathematics', defaultGrade: 'A-' },
  { key: 'science', defaultName: 'Science', defaultGrade: 'B+' },
  { key: 'english', defaultName: 'English', defaultGrade: 'A' },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const legalLinkClass = cm.cn(
    cm.textSize('sm'),
    cm.fontWeight('semibold'),
    'text-on-surface-variant hover:text-primary transition-colors',
  )

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface-container-low/60 backdrop-blur-md shadow-landing-nav',
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
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xl' }))}>
            <Link to="/" className={cm.cn('scale-95 active:scale-90 transition-transform rounded')}>
              <BrandWordmark as="span" />
            </Link>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'hidden md:flex')}>
              <a
                href="#features"
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'text-primary border-b-2 border-secondary pb-1 hover:opacity-80 transition-all duration-300',
                )}
              >
                {t('landing.nav.features', {}, { defaultValue: 'Features' })}
              </a>
              <Link
                to="/pricing"
                className={cm.cn(
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'text-on-surface-variant hover:text-primary transition-all duration-300',
                )}
              >
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </Link>
              <Link
                to="/about"
                className={cm.cn(
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'text-on-surface-variant hover:text-primary transition-all duration-300',
                )}
              >
                {t('nav.about', {}, { defaultValue: 'About' })}
              </Link>
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="nav-go-to-dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-lg font-headline',
                  GRADIENT_CTA,
                  'hover:opacity-80 transition-all duration-300',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  data-mol-id="landing-nav-signin"
                  className={cm.cn(
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    'text-primary hover:opacity-80 transition-all duration-300',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="landing-nav-cta"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'rounded-lg',
                    GRADIENT_CTA,
                    'hover:opacity-80 transition-all duration-300 scale-95 active:scale-90',
                  )}
                >
                  {t('common.getStarted', {}, { defaultValue: 'Get Started' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — copy left, interface-mock card right, soft color blobs behind */}
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'pt-16 pb-24 lg:pt-24 overflow-x-clip',
          )}
        >
          <div
            className={cm.cn(cm.grid({ gap: 'xl' }), 'grid-cols-1 lg:grid-cols-2 lg:items-center')}
          >
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'items-start')}>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-secondary',
                )}
              >
                {t('landing.eyebrow', {}, { defaultValue: 'For middle & high schoolers' })}
              </p>
              <h1 className="text-5xl lg:text-7xl font-extrabold font-headline tracking-[-0.02em] leading-[1.1] text-on-surface">
                {t('landing.heroTitlePrefix', {}, { defaultValue: 'Your academic day,' })}{' '}
                <span className="text-primary">
                  {t('landing.heroTitleAccent', {}, { defaultValue: 'decoded.' })}
                </span>
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant leading-relaxed max-w-lg',
                )}
              >
                {t(
                  'landing.heroSubtitle',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      '{{appName}} pulls every class, grade, assignment, and message into one calm sanctuary so you can stay organized and visualize progress without the clinical dashboard feel.',
                  },
                )}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }))}>
                <Link
                  to="/signup"
                  data-mol-id="landing-hero-cta"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    'inline-flex items-center gap-2 rounded-lg font-bold text-lg font-headline',
                    GRADIENT_CTA,
                    'hover:opacity-90 transition-opacity',
                  )}
                >
                  {t('common.startFreeTrial', {}, { defaultValue: 'Sign up for free' })}
                </Link>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    'inline-flex items-center gap-2 rounded-lg font-bold text-lg font-headline text-primary border border-outline-variant/40 hover:bg-surface-container-low transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
                  cm.sp('mt', 4),
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                )}
              >
                <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                  <span
                    className={cm.cn('material-symbols-outlined text-success')}
                    aria-hidden="true"
                  >
                    verified_user
                  </span>
                  {t('landing.proof.privacy', {}, { defaultValue: 'FERPA-compliant by default' })}
                </span>
                <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                  <span
                    className={cm.cn('material-symbols-outlined text-warning')}
                    aria-hidden="true"
                  >
                    star
                  </span>
                  {t('landing.proof.rating', {}, { defaultValue: '4.8 across 12k families' })}
                </span>
              </div>
            </div>

            {/* Interface mock — the design's abstract schedule card */}
            <div className={cm.cn('relative w-full')}>
              <div
                className={cm.cn(
                  'bg-surface-container-lowest rounded-2xl shadow-landing-card p-6 w-full max-w-md mx-auto relative z-10 border border-surface-container-low',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mb', 8),
                  )}
                >
                  <div>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-on-surface-variant uppercase tracking-widest',
                      )}
                    >
                      {t('landing.mock.greeting', {}, { defaultValue: 'Good Morning' })}
                    </p>
                    <h3
                      className={cm.cn(
                        cm.textSize('2xl'),
                        'font-bold tracking-tight text-on-surface',
                      )}
                    >
                      {t('landing.mock.studentName', {}, { defaultValue: 'Alex' })}
                    </h3>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low">
                    <span className="font-bold text-primary">A</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {HERO_CHIPS.map((chip) => (
                    <div
                      key={chip.key}
                      className={cm.cn(
                        cm.accentCard({ tone: 'custom' }),
                        'bg-surface-container-low rounded-lg p-4 flex items-center gap-4',
                      )}
                      style={{ ['--mol-accent' as string]: chip.accent }}
                    >
                      <div
                        className={cm.cn(
                          'bg-surface-container-lowest p-2 rounded-lg shadow-sm flex items-center justify-center',
                          chip.tileTint,
                        )}
                      >
                        <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                          {chip.icon}
                        </span>
                      </div>
                      <div>
                        <h4 className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                          {t(
                            `landing.mock.chip.${chip.key}.title`,
                            {},
                            { defaultValue: chip.defaultTitle },
                          )}
                        </h4>
                        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                          {t(
                            `landing.mock.chip.${chip.key}.time`,
                            {},
                            { defaultValue: chip.defaultTime },
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div
                className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-primary-container/20 blur-3xl z-0"
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-secondary-container/20 blur-2xl z-0"
                aria-hidden="true"
              />
            </div>
          </div>
        </section>

        {/* Feature grid — bento cards with container-tinted icon tiles */}
        <section
          id="features"
          className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'pb-24 scroll-mt-24')}
        >
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'text-secondary uppercase tracking-widest mb-2 text-center',
            )}
          >
            {t('landing.featuresEyebrow', {}, { defaultValue: 'Core Features' })}
          </p>
          <h2
            className={cm.cn(
              cm.textSize('3xl'),
              'font-extrabold font-headline tracking-tight text-on-surface mb-12 text-center',
            )}
          >
            {t('landing.featuresHeading', {}, { defaultValue: 'Tools for deeper focus' })}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  'bg-surface-container-low rounded-2xl p-8 flex flex-col gap-6 hover:-translate-y-1 transition-transform duration-300',
                )}
              >
                <div
                  className={cm.cn('flex h-12 w-12 items-center justify-center rounded-xl', f.tile)}
                >
                  <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <div>
                  <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
                    {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
                  >
                    {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Feature focus — GPA progress-arc card + supportive copy */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'pb-24')}>
          <div className="bg-surface-container-low rounded-3xl p-8 md:p-12 lg:p-20 overflow-hidden relative">
            <div
              className={cm.cn(
                cm.grid({ gap: 'xl' }),
                'grid-cols-1 lg:grid-cols-2 lg:items-center relative z-10',
              )}
            >
              <div className={cm.cn('w-full flex justify-center')}>
                <div className="bg-surface-container-lowest rounded-2xl shadow-landing-soft p-8 w-full max-w-sm flex flex-col items-center gap-6">
                  <h4
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('bold'),
                      'text-on-surface-variant uppercase tracking-widest',
                    )}
                  >
                    {t('landing.gpa.label', {}, { defaultValue: 'Cumulative GPA' })}
                  </h4>
                  {/* Progress arc mock — track + clipped amber sweep. The
                      clip-path is geometry only; colors are tokens. */}
                  <div className="relative w-48 h-24 overflow-hidden mb-4">
                    <div className="absolute inset-0 rounded-t-full border-8 border-surface-container-high border-b-0" />
                    <div
                      className="absolute inset-0 rounded-t-full border-8 border-secondary border-b-0"
                      style={{ clipPath: 'polygon(0 0, 80% 0, 80% 100%, 0 100%)' }}
                    />
                    <div className="absolute bottom-0 left-0 w-full text-center flex flex-col pb-2">
                      <span className="text-5xl font-black font-headline text-on-surface tracking-[-0.02em]">
                        3.8
                      </span>
                    </div>
                  </div>
                  <div className="w-full space-y-3">
                    {GPA_SUBJECTS.map((s) => (
                      <div key={s.key} className="flex justify-between text-sm">
                        <span className="text-on-surface-variant">
                          {t(`landing.gpa.subject.${s.key}`, {}, { defaultValue: s.defaultName })}
                        </span>
                        <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                          {s.defaultGrade}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
                <h3 className="text-3xl lg:text-4xl font-extrabold font-headline tracking-tight text-on-surface leading-tight">
                  {t(
                    'landing.gpa.heading',
                    {},
                    { defaultValue: 'Know exactly where you stand, without the anxiety.' },
                  )}
                </h3>
                <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant leading-relaxed')}>
                  {t(
                    'landing.gpa.body',
                    {},
                    {
                      defaultValue:
                        'We replaced the anxiety-inducing gradebook with a supportive academic overview. See your progress through soft arcs and gentle trends that focus on growth, not just numbers.',
                    },
                  )}
                </p>
                <ul className="space-y-4">
                  {GPA_POINTS.map((point, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className={cm.cn('material-symbols-outlined text-primary mt-1')}
                        aria-hidden="true"
                      >
                        check_circle
                      </span>
                      <span className={cm.cn(cm.fontWeight('medium'), 'text-on-surface')}>
                        {t(`landing.gpa.point${i + 1}`, {}, { defaultValue: point })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className={cm.cn('border-t border-outline-variant/40')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn(
                cm.textSize('3xl'),
                cm.sp('mb', 4),
                'font-extrabold font-headline tracking-tight',
              )}
            >
              {t(
                'landing.ctaHeading',
                {},
                { defaultValue: 'A calmer school day starts in minutes' },
              )}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('base'),
                cm.sp('mb', 8),
                'text-on-surface-variant max-w-xl mx-auto',
              )}
            >
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Free for the first 30 days, no credit card required. Districts can roll out a school-wide tier in a single afternoon.',
                },
              )}
            </p>
            <Link
              to="/signup"
              data-mol-id="landing-cta-signup"
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                'inline-flex items-center gap-2 rounded-lg font-bold text-lg font-headline',
                GRADIENT_CTA,
                'hover:opacity-90 transition-opacity',
              )}
            >
              {t('landing.ctaButton', {}, { defaultValue: 'Create your portal' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-surface-container-low border-t border-outline-variant/40">
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'py-12 flex flex-col md:flex-row justify-between items-center gap-6',
          )}
        >
          <div>
            <BrandWordmark as="span" footer />
          </div>
          <nav
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' }),
            )}
          >
            <Link to="/about" className={legalLinkClass}>
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            {/* Privacy/Terms open IN-PLACE modals instead of navigating away — the
                standalone /privacy and /terms routes still exist for deep links. */}
            <LegalModalLinks
              linkClassName={legalLinkClass}
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
              { defaultValue: '© {{year}} {{app}}' },
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
      </footer>
    </div>
  )
}
