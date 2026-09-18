// Pattern source: bespoke per Neuron DESIGN.md.
// Public landing — terminal-pattern hero, three feature columns, secondary CTA.
import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Feature {
  icon: string
  titleKey: string
  defaultTitle: string
  bodyKey: string
  defaultBody: string
}

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const features: Feature[] = [
    {
      icon: 'tune',
      titleKey: 'landing.feature1Title',
      defaultTitle: 'Compose every loop',
      bodyKey: 'landing.feature1Body',
      defaultBody:
        'Wire prompts, tools, and providers into deterministic agent graphs. Swap models without touching downstream contracts.',
    },
    {
      icon: 'memory',
      titleKey: 'landing.feature2Title',
      defaultTitle: 'Watch every step',
      bodyKey: 'landing.feature2Body',
      defaultBody:
        'Trace tool calls, token spend, and latency live. Inspect failures with a full execution log instead of a stack trace.',
    },
    {
      icon: 'verified',
      titleKey: 'landing.feature3Title',
      defaultTitle: 'Ship with evidence',
      bodyKey: 'landing.feature3Body',
      defaultBody:
        'Datasets, regression runs, and deployment gates ride alongside your agents — promote when the trace is green.',
    },
  ]

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface-container-lowest text-on-surface font-body',
      )}
    >
      <Header />
      <main className={cm.flex1}>
        <section
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('py', 16),
            'relative overflow-hidden bg-terminal-pattern',
          )}
        >
          <div
            className={cm.cn(
              cm.roundedFull,
              'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[120px] pointer-events-none',
            )}
          />
          <div
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 6),
              cm.textCenter,
              'max-w-[860px] relative z-10',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mb', 4),
                'font-mono uppercase tracking-widest text-secondary',
              )}
            >
              {t('landing.eyebrow', {}, { defaultValue: '// agent development workbench' })}
            </p>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('4xl'),
                cm.sp('mb', 4),
                'font-headline tracking-tighter text-on-surface',
              )}
            >
              {t(
                'landing.headline',
                { brand: APP_NAME },
                { defaultValue: '{{brand}} — wire intelligence, watch it run' },
              )}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mb', 8),
                'font-body text-on-surface-variant max-w-[640px] mx-auto',
              )}
            >
              {t(
                'landing.subhead',
                {},
                {
                  defaultValue:
                    'Build, test, and observe AI agents in one workbench. Compose tool graphs, swap providers, and ship traceable production agents.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ justify: 'center', gap: 4, align: 'center' }))}>
              {isAuthenticated ? (
                <Link
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.flex({ align: 'center', gap: 2 }),
                    'kinetic-gradient text-on-primary-fixed font-headline tracking-tight rounded-lg transition-all',
                  )}
                  data-mol-id="landing-go-to-dashboard"
                  to="/dashboard"
                >
                  <span>{t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              ) : (
                <>
                  <Link
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.sp('px', 6),
                      cm.sp('py', 3),
                      cm.flex({ align: 'center', gap: 2 }),
                      'kinetic-gradient text-on-primary-fixed font-headline tracking-tight rounded-lg transition-all',
                    )}
                    data-mol-id="landing-cta-signup"
                    to="/signup"
                  >
                    <span>{t('landing.ctaPrimary', {}, { defaultValue: 'Start building' })}</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>
                  <Link
                    className={cm.cn(
                      cm.fontWeight('medium'),
                      cm.sp('px', 6),
                      cm.sp('py', 3),
                      'text-on-surface font-body rounded-lg border border-outline-variant/30 hover:border-outline-variant transition-colors',
                    )}
                    data-mol-id="landing-cta-login"
                    to="/login"
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </>
              )}
            </div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mt', 6),
                'font-mono text-tertiary uppercase tracking-widest',
              )}
            >
              {t('landing.tagline', {}, { defaultValue: APP_TAGLINE })}
            </p>
          </div>
        </section>

        <section className={cm.cn(cm.sp('py', 16), 'bg-surface-container')}>
          <div className={cm.cn(cm.w('full'), cm.sp('px', 6), 'max-w-[1100px] mx-auto')}>
            <div className={cm.cn(cm.grid({ cols: 3, gap: 6 }))}>
              {features.map((feature) => (
                <div
                  key={feature.titleKey}
                  className={cm.cn(
                    cm.sp('p', 6),
                    'bg-surface-container-low rounded border border-outline-variant/15',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.w(10),
                      cm.h(10),
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.sp('mb', 4),
                      'rounded bg-surface-container-highest text-primary',
                    )}
                  >
                    <span className="material-symbols-outlined">{feature.icon}</span>
                  </div>
                  <h3
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('lg'),
                      cm.sp('mb', 2),
                      'font-headline text-on-surface',
                    )}
                  >
                    {t(feature.titleKey, {}, { defaultValue: feature.defaultTitle })}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
                  >
                    {t(feature.bodyKey, {}, { defaultValue: feature.defaultBody })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Landing
