import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { MeridianHeroPreview } from '../components/MeridianHeroPreview.js'
import { loadContent } from '../config.js'

const FEATURES = [
  {
    key: 'smart_filters',
    icon: 'filter_list',
    tone: 'bg-primary/10 text-primary-dark',
    defaultTitle: 'Smart filters',
    defaultBody:
      'Newsletters, receipts, and notifications route themselves out of your primary view automatically.',
  },
  {
    key: 'unified_inbox',
    icon: 'all_inbox',
    tone: 'bg-secondary/10 text-secondary',
    defaultTitle: 'Unified inbox',
    defaultBody:
      'Bring every account into one calm interface — without mixing work and personal contexts.',
  },
  {
    key: 'send_later',
    icon: 'schedule_send',
    tone: 'bg-primary-100 text-primary-dark',
    defaultTitle: 'Schedule send',
    defaultBody:
      'Respect boundaries — write now and deliver during the recipient\u2019s working hours.',
  },
  {
    key: 'keyboard',
    icon: 'keyboard',
    tone: 'bg-secondary/10 text-secondary',
    defaultTitle: 'Keyboard-native',
    defaultBody:
      'Triage thousands of threads a week with single-key shortcuts, designed for muscle memory.',
  },
] as const

const SOCIAL_PROOF = [
  { name: 'Acme Corp', icon: 'change_history' },
  { name: 'Globex', icon: 'interests' },
  { name: 'Initech', icon: 'hive' },
  { name: 'Soylent', icon: 'spa' },
  { name: 'Massive Dynamic', icon: 'widgets' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const legalLinkClass = cm.cn(
    cm.textSize('sm'),
    'text-on-surface-variant hover:text-on-surface transition-colors',
  )

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
          )}
        >
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label={t('landing.brand.scrollTop', {}, { defaultValue: 'Back to top' })}
            className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.cursorPointer)}
          >
            <span
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                'text-primary tracking-tight',
              )}
            >
              {t('meridian.brand.appName', {}, { defaultValue: APP_NAME })}
            </span>
          </button>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/inbox"
                data-mol-id="landing-nav-dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  'rounded-lg bg-primary text-on-primary shadow-sm hover:bg-primary/90 transition-colors',
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
                    'text-on-surface-variant hover:text-on-surface transition-colors',
                  )}
                >
                  {t('landing.signIn', {}, { defaultValue: 'Log In' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('medium'),
                    'rounded-lg bg-primary text-on-primary shadow-sm hover:bg-primary/90 transition-colors',
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
        <section className="relative overflow-hidden">
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'py-20 md:py-28 relative grid grid-cols-1 lg:grid-cols-12 gap-12 items-center',
            )}
          >
            <div className={'lg:col-span-6'}>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 4),
                  'uppercase tracking-widest text-primary',
                )}
              >
                {t('landing.eyebrow', {}, { defaultValue: 'Email for focused work' })}
              </p>
              <h1
                className={cm.cn(
                  cm.sp('mb', 6),
                  'text-5xl md:text-6xl font-extrabold tracking-tight leading-tight',
                )}
              >
                {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })}
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
                      '{{appName}} is a calm three-pane inbox built for knowledge workers who want to process information, not react to it.',
                  },
                )}
              </p>
              <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.textSize('lg'),
                    cm.fontWeight('semibold'),
                    'inline-flex items-center rounded-lg bg-primary text-on-primary shadow-sm hover:bg-primary/90 transition-colors',
                  )}
                >
                  {t('common.startFree', {}, { defaultValue: 'Start free' })}
                </Link>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.fontWeight('medium'),
                    'inline-flex items-center gap-2 rounded-lg border border-outline-variant text-on-surface bg-surface hover:bg-surface-container-low transition-colors',
                  )}
                >
                  <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                    play_circle
                  </span>
                  {t('landing.heroDemo', {}, { defaultValue: 'Watch demo' })}
                </Link>
              </div>
            </div>
            <div className={'lg:col-span-6'}>
              <MeridianHeroPreview />
            </div>
          </div>
        </section>

        <section
          className={cm.cn(
            cm.sp('py', 12),
            'border-y border-outline-variant/40 bg-surface-container-lowest',
          )}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.textCenter)}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.sp('mb', 6),
                'tracking-widest uppercase text-on-surface-variant',
              )}
            >
              {t('landing.proof', {}, { defaultValue: 'Trusted by focused teams worldwide' })}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'lg', wrap: 'wrap' }),
                // muted by token color, not opacity — opacity-50 on text fails
                // the axe contrast gate (wordmarks are text, not images)
                'grayscale text-on-surface-variant',
              )}
            >
              {SOCIAL_PROOF.map((s) => (
                <span
                  key={s.name}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.fontWeight('bold'),
                    cm.textSize('lg'),
                  )}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {s.icon}
                  </span>
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.sp('py', 16), 'bg-surface')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6))}>
            <div className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.sp('mb', 12), cm.textCenter)}>
              <h2
                className={cm.cn(
                  cm.sp('mb', 4),
                  'text-3xl md:text-4xl font-extrabold tracking-tight',
                )}
              >
                {t('landing.featuresTitle', {}, { defaultValue: 'Designed for deep work' })}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
                {t(
                  'landing.featuresBody',
                  {},
                  { defaultValue: 'Stop managing your inbox and start getting work done.' },
                )}
              </p>
            </div>
            <div
              className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4')}
            >
              {FEATURES.map((f) => (
                <article
                  key={f.key}
                  className={cm.cn(
                    cm.sp('p', 6),
                    'rounded-xl bg-surface-container-low border border-outline-variant/40 shadow-sm hover:shadow-md transition-shadow',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.w(12),
                      cm.h(12),
                      cm.sp('mb', 4),
                      cm.flex({ align: 'center', justify: 'center' }),
                      'rounded-xl',
                      f.tone,
                    )}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {f.icon}
                    </span>
                  </div>
                  <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
                    {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
                  >
                    {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.sp('py', 20), 'bg-surface-container-lowest')}>
          <div className={cm.cn(cm.maxW('4xl'), cm.mxAuto, cm.sp('px', 6), cm.textCenter)}>
            <h2
              className={cm.cn(
                cm.sp('mb', 4),
                'text-3xl md:text-4xl font-extrabold tracking-tight',
              )}
            >
              {t('landing.ctaTitle', {}, { defaultValue: 'Process more, react less.' })}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), cm.sp('mb', 10), 'text-on-surface-variant')}>
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Join thousands of professionals who finished their inbox before lunch.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 5),
                cm.fontWeight('semibold'),
                cm.textSize('lg'),
                'inline-flex items-center gap-2 rounded-lg bg-primary text-on-primary shadow-md hover:bg-primary/90 transition-colors',
              )}
            >
              {t(
                'landing.ctaButton',
                { appName: APP_NAME },
                { defaultValue: 'Open your {{appName}} inbox' },
              )}
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer className={'border-t border-outline-variant/40 bg-surface'}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 12),
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          )}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'landing.copyright',
              { year: new Date().getFullYear(), appName: APP_NAME },
              { defaultValue: '© {{year}} {{appName}} — Built for focus.' },
            )}
          </p>
          <nav className={cm.flex({ align: 'center', gap: 'lg' })}>
            <LegalModalLinks
              linkClassName={legalLinkClass}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
            />
            <Link
              to="/help"
              className={cm.cn(
                cm.textSize('sm'),
                'text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('landing.help', {}, { defaultValue: 'Help' })}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

export default Landing
