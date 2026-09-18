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
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  'rounded-full bg-primary text-on-primary hover:scale-[1.02] transition-transform shadow-[0_8px_16px_-4px_rgba(37,99,235,0.3)]',
                )}
              >
                {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
              </Link>
              <a
                href="#features"
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.flex({ align: 'center', gap: 2 }),
                  'rounded-full border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors',
                )}
              >
                {t('landing.hero.ctaSecondary', {}, { defaultValue: 'See how it works' })}
                <span className={'material-symbols-outlined text-base'}>arrow_forward</span>
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

        {/* Feature triad */}
        <section id="features" className={cm.cn(cm.maxW('[1200px]'), cm.mxAuto, cm.sp('py', 16))}>
          <div
            className={cm.cn(cm.textCenter, cm.sp('mb', 12), cm.flex({ direction: 'col', gap: 3 }))}
          >
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-3xl md:text-4xl tracking-tight text-on-background',
              )}
            >
              {t('landing.features.title', {}, { defaultValue: 'Built for the messy middle' })}
            </h2>
            <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant max-w-xl mx-auto')}>
              {t(
                'landing.features.subtitle',
                {},
                {
                  defaultValue: 'A console for teams who refuse to choose between fast and human.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 6 }), 'md:grid-cols-3')}>
            {FEATURES.map((f) => (
              <div
                key={f.icon}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.flex({ direction: 'col', gap: 4 }),
                  'rounded-2xl bg-surface-container-lowest border-l-4 border-primary hover:-translate-y-0.5 transition-transform shadow-sm',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(12),
                    cm.h(12),
                    'rounded-xl bg-primary/10 text-primary',
                  )}
                >
                  <span className={'material-symbols-outlined text-2xl'}>{f.icon}</span>
                </div>
                <h3
                  className={cm.cn(cm.fontWeight('semibold'), cm.textSize('lg'), 'text-on-surface')}
                >
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(f.bodyKey, { appName: APP_NAME }, { defaultValue: f.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing CTA */}
        <section id="pricing" className={cm.cn(cm.maxW('[900px]'), cm.mxAuto, cm.sp('py', 16))}>
          <div
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              cm.flex({ direction: 'col', gap: 6 }),
              'rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-[0_30px_60px_-15px_rgba(37,99,235,0.4)]',
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
