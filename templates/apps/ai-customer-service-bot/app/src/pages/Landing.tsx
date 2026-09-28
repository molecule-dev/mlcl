/**
 * Landing — public marketing home for Rapport.
 * Top nav strip, editorial hero with text-7xl headline + dual CTA,
 * embedded LandingHeroChat preview (signature signature), feature triad,
 * social proof strip, footer.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingHeroChat } from '../components/LandingHeroChat.js'
import { LandingTopNavBar } from '../components/LandingTopNavBar.js'

const FEATURES = [
  {
    icon: 'auto_awesome',
    titleKey: 'landing.feature1.title',
    titleDefault: 'AI-first triage',
    bodyKey: 'landing.feature1.body',
    bodyDefault:
      '{{appName}} classifies intent, surfaces knowledge, and drafts a response before your team sees the ticket.',
  },
  {
    icon: 'support_agent',
    titleKey: 'landing.feature2.title',
    titleDefault: 'Warm handoff to humans',
    bodyKey: 'landing.feature2.body',
    bodyDefault:
      'When a conversation needs human empathy, {{appName}} hands off mid-thread with full context — no awkward restarts.',
  },
  {
    icon: 'insights',
    titleKey: 'landing.feature3.title',
    titleDefault: 'Honest analytics',
    bodyKey: 'landing.feature3.body',
    bodyDefault:
      'See what your bot resolves, what it punts, and what it misreads — in plain English, not vanity charts.',
  },
]

const PROOF_LOGOS = ['Velora', 'Northwind', 'Atlasware', 'Lumencove', 'Bywater']

const STATS = [
  {
    key: 'resolution',
    valueKey: 'landing.stats.resolution.value',
    defaultValue: '94%',
    labelKey: 'landing.stats.resolution.label',
    defaultLabel: 'Resolution Rate',
  },
  {
    key: 'response',
    valueKey: 'landing.stats.response.value',
    defaultValue: '2.3s',
    labelKey: 'landing.stats.response.label',
    defaultLabel: 'Avg Response Time',
  },
  {
    key: 'cost',
    valueKey: 'landing.stats.cost.value',
    defaultValue: '60%',
    labelKey: 'landing.stats.cost.label',
    defaultLabel: 'Cost Reduction',
  },
] as const

function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      data-mol-id="page-landing"
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-on-background antialiased',
      )}
    >
      <LandingTopNavBar />

      {/* Hero */}
      <main className={cm.cn(cm.sp('px', 6), 'md:px-12 lg:px-16')}>
        <section
          className={cm.cn(
            cm.maxW('[1200px]'),
            cm.mxAuto,
            cm.sp('py', 16),
            cm.grid({ cols: 1, gap: 12 }),
            'lg:grid-cols-2 lg:gap-20 items-center',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 6 }))}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.fontWeight('bold'),
                'self-start rounded-full bg-primary/10 text-primary px-3 py-1 text-[10px] tracking-widest uppercase',
              )}
            >
              <span className={'material-symbols-outlined text-base'}>spa</span>
              {t('landing.hero.eyebrow', {}, { defaultValue: 'Every conversation matters' })}
            </span>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] text-on-background',
              )}
            >
              {t('landing.hero.headlineLine1', {}, { defaultValue: 'Customer support' })}
              <br />
              <span className="text-primary">
                {t('landing.hero.headlineLine2', {}, { defaultValue: 'with rapport.' })}
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                'text-on-surface-variant max-w-md leading-relaxed',
              )}
            >
              {t(
                'landing.hero.subhead',
                { appName: APP_NAME },
                {
                  defaultValue:
                    '{{appName}} is an AI-first support console that resolves the routine, escalates the nuanced, and never loses the human thread.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ gap: 3, align: 'center' }), 'flex-wrap')}>
              <Link
                data-mol-id="landing-cta-primary"
                to="/signup"
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  'rounded-xl btn-gradient text-on-primary hover:scale-[1.03] transition-transform duration-300 ease-out shadow-ambient',
                )}
              >
                {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
              </Link>
              <a
                href="#features"
                className={cm.cn(
                  cm.fontWeight('medium'),
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.flex({ align: 'center', gap: 2 }),
                  'rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors duration-300',
                )}
              >
                <span className={'material-symbols-outlined text-xl'}>play_circle</span>
                {t('landing.hero.ctaSecondary', {}, { defaultValue: 'See how it works' })}
              </a>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 4 }),
                cm.textSize('xs'),
                'text-on-surface-variant',
              )}
            >
              <span className={cm.flex({ align: 'center', gap: 1 })}>
                <span
                  className={
                    'material-symbols-outlined text-base text-[var(--color-status-resolved-accent)]'
                  }
                >
                  check_circle
                </span>
                {t('landing.hero.trustNoCard', {}, { defaultValue: 'No credit card' })}
              </span>
              <span className={cm.flex({ align: 'center', gap: 1 })}>
                <span
                  className={
                    'material-symbols-outlined text-base text-[var(--color-status-resolved-accent)]'
                  }
                >
                  check_circle
                </span>
                {t('landing.hero.trustGdpr', {}, { defaultValue: 'GDPR + SOC 2' })}
              </span>
            </div>
          </div>
          <LandingHeroChat />
        </section>

        {/* Social proof */}
        <section
          id="testimonials"
          className={cm.cn(cm.maxW('[1200px]'), cm.mxAuto, cm.sp('py', 8))}
        >
          <p
            className={cm.cn(
              cm.textCenter,
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'tracking-widest uppercase text-on-surface-variant mb-6',
            )}
          >
            {t('landing.proof.label', {}, { defaultValue: 'Trusted by support teams at' })}
          </p>
          <div
            className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 8 }), 'flex-wrap')}
          >
            {PROOF_LOGOS.map((logo) => (
              <span
                key={logo}
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('lg'),
                  'tracking-tight text-outline',
                )}
              >
                {logo}
              </span>
            ))}
          </div>
        </section>

        {/* Feature triad — Stitch wraps the cards in a rounded tonal band */}
        <section
          id="features"
          className={cm.cn(
            cm.maxW('[1200px]'),
            cm.mxAuto,
            cm.sp('my', 16),
            cm.sp('py', 24),
            'rounded-[2rem] bg-surface-container-low',
          )}
        >
          <div className={cm.cn(cm.sp('px', 8), 'md:px-16')}>
            <div
              className={cm.cn(
                cm.textCenter,
                cm.sp('mb', 16),
                cm.flex({ direction: 'col', gap: 3 }),
              )}
            >
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-3xl md:text-4xl tracking-tight text-on-surface',
                )}
              >
                {t('landing.features.title', {}, { defaultValue: 'Built for the messy middle' })}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-2xl mx-auto')}>
                {t(
                  'landing.features.subtitle',
                  {},
                  {
                    defaultValue:
                      'A console for teams who refuse to choose between fast and human.',
                  },
                )}
              </p>
            </div>
            <div className={cm.cn(cm.grid({ cols: 1, gap: 8 }), 'md:grid-cols-3')}>
              {FEATURES.map((f) => (
                <div
                  key={f.icon}
                  className={cm.cn(
                    cm.sp('p', 8),
                    cm.flex({ direction: 'col', gap: 3 }),
                    'rounded-[1.5rem] bg-surface-container-lowest shadow-ambient hover:-translate-y-1 transition-transform duration-300',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(12),
                      cm.h(12),
                      cm.sp('mb', 3),
                      'rounded-xl bg-surface-container text-primary',
                    )}
                  >
                    <span className={'material-symbols-outlined text-2xl'}>{f.icon}</span>
                  </div>
                  <h3
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('xl'),
                      'text-on-surface',
                    )}
                  >
                    {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
                  >
                    {t(f.bodyKey, { appName: APP_NAME }, { defaultValue: f.bodyDefault })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats band — Stitch's resolution / response / cost strip */}
        <section
          className={cm.cn(cm.sp('py', 16), cm.maxW('[1200px]'), cm.mxAuto, cm.sp('px', 6))}
          aria-label={t('landing.stats.label', {}, { defaultValue: 'Rapport in numbers' })}
        >
          <div
            className={cm.cn(
              'relative overflow-hidden rounded-[2rem] bg-primary text-on-primary shadow-ambient',
              cm.sp('p', 12),
              'md:p-20',
            )}
          >
            <div
              aria-hidden="true"
              className={cm.cn(
                cm.roundedFull,
                'absolute -top-16 -right-16 w-64 h-64 bg-primary-container blur-3xl opacity-50 pointer-events-none',
              )}
            />
            <div
              aria-hidden="true"
              className={cm.cn(
                cm.roundedFull,
                'absolute -bottom-16 -left-16 w-64 h-64 bg-tertiary-container blur-3xl opacity-50 pointer-events-none',
              )}
            />
            <div
              className={cm.cn(
                'relative z-10 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left md:divide-x divide-primary-container/30',
              )}
            >
              {STATS.map((s) => (
                <div key={s.key} className={cm.cn('md:px-8', cm.stack(1))}>
                  <div className={cm.cn('text-5xl font-extrabold tracking-tight', cm.sp('mb', 2))}>
                    {t(s.valueKey, {}, { defaultValue: s.defaultValue })}
                  </div>
                  <div
                    className={cm.cn(
                      'text-on-primary/80 font-medium text-sm tracking-wide uppercase',
                    )}
                  >
                    {t(s.labelKey, {}, { defaultValue: s.defaultLabel })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing CTA */}
        <section id="pricing" className={cm.cn(cm.maxW('[900px]'), cm.mxAuto, cm.sp('py', 16))}>
          <div
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              cm.flex({ direction: 'col', gap: 6 }),
              'rounded-[2rem] btn-gradient text-on-primary shadow-ambient',
            )}
          >
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-3xl md:text-5xl tracking-tight leading-tight',
              )}
            >
              {t(
                'landing.cta2.title',
                {},
                { defaultValue: 'Start your first conversation in under 5 minutes.' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('base'), 'opacity-90 max-w-xl mx-auto')}>
              {t(
                'landing.cta2.subtitle',
                {},
                { defaultValue: '14-day free trial. No credit card. Cancel anytime.' },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 3 }),
                'flex-wrap',
              )}
            >
              <Link
                to="/signup"
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  'rounded-full bg-on-primary text-primary hover:scale-[1.02] transition-transform',
                )}
              >
                {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  'rounded-full border border-surface/40 text-on-primary hover:bg-surface/10 transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}

export default Landing
export { Landing, Landing as LandingPage }
