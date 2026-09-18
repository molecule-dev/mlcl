import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { GpaHeroCard } from '../components/GpaHeroCard.js'
import { loadContent } from '../config.js'

const FEATURES = [
  {
    key: 'schedule',
    icon: 'event',
    tint: 'text-primary',
    defaultTitle: 'One schedule, every class',
    defaultBody:
      'See today’s periods at a glance with subject-coloured cards, room numbers, and bell timing.',
  },
  {
    key: 'grades',
    icon: 'grade',
    tint: 'text-secondary',
    defaultTitle: 'Live grade book',
    defaultBody:
      'Letter and percentage grades stay in sync with the teacher’s rubric — no more end-of-term surprises.',
  },
  {
    key: 'assignments',
    icon: 'assignment',
    tint: 'text-tertiary',
    defaultTitle: 'Smart assignment queue',
    defaultBody:
      'Sort by due date, status, or class. Submit drafts, attach resources, and track teacher feedback.',
  },
  {
    key: 'family',
    icon: 'family_restroom',
    tint: 'text-info',
    defaultTitle: 'Built for families too',
    defaultBody:
      'Parents share a single dashboard with attendance, messages, and tier-controlled visibility.',
  },
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
          'sticky top-0 z-50 bg-surface/85 backdrop-blur-md border-b border-outline-variant/40',
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
              cm.textSize('xl'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'font-extrabold tracking-tight text-primary',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
              menu_book
            </span>
            {APP_NAME}
          </Link>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="nav-go-to-dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors',
                  )}
                >
                  {t('common.getStarted', {}, { defaultValue: 'Get started' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn(
              'absolute inset-0 bg-gradient-to-br from-primary-container via-surface to-surface pointer-events-none',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'py-20 md:py-28 lg:py-32 relative',
            )}
          >
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-12 items-center')}>
              <div className={cm.cn('lg:col-span-7')}>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mb', 4),
                    'font-bold uppercase tracking-widest text-primary',
                  )}
                >
                  {t('landing.eyebrow', {}, { defaultValue: 'For middle & high schoolers' })}
                </p>
                <h1
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95]',
                  )}
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}' },
                  )}
                </h1>
                <p
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.sp('mb', 10),
                    'text-on-surface-variant max-w-xl leading-relaxed',
                  )}
                >
                  {t(
                    'landing.heroSubtitle',
                    { appName: APP_NAME },
                    {
                      defaultValue:
                        '{{appName}} pulls every class, grade, assignment, and message into one calm dashboard so you can spend less time hunting and more time learning.',
                    },
                  )}
                </p>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }))}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      'inline-flex items-center gap-2 font-semibold rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors',
                    )}
                  >
                    {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/login"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('semibold'),
                      'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
                    cm.sp('mt', 10),
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

              <div className={cm.cn('lg:col-span-5')}>
                <GpaHeroCard
                  gpa="3.92"
                  changeLabel="+0.21"
                  termLabel={t('landing.sampleTerm', {}, { defaultValue: 'Spring' })}
                  classesToday={6}
                />
              </div>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2
            className={cm.cn(
              cm.sp('mb', 12),
              cm.textCenter,
              'text-3xl md:text-4xl font-extrabold tracking-tight',
            )}
          >
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'A school day organized around the student' },
            )}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all group',
                )}
              >
                <span
                  className={cm.cn(
                    cm.sp('p', 3),
                    'inline-flex bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-3xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </span>
                <h3
                  className={cm.cn(cm.textSize('lg'), cm.sp('mt', 5), cm.sp('mb', 2), 'font-bold')}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn('border-t border-outline-variant/40')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn(cm.textSize('3xl'), cm.sp('mb', 4), 'font-extrabold tracking-tight')}
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
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                'inline-flex items-center gap-2 font-semibold rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors',
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

      <footer
        className={cm.cn(
          cm.sp('py', 8),
          cm.textCenter,
          cm.textSize('sm'),
          'bg-surface text-on-surface-variant border-t border-outline-variant',
        )}
      >
        <p>
          {t(
            'landing.copyright',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Built for students, made for families.' },
          )}
        </p>
        {/* Privacy/Terms open IN-PLACE modals instead of navigating away — the
            standalone /privacy and /terms routes still exist for deep links. */}
        <nav
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
            cm.sp('mt', 3),
          )}
        >
          <LegalModalLinks
            linkClassName={legalLinkClass}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
          />
        </nav>
      </footer>
    </div>
  )
}
