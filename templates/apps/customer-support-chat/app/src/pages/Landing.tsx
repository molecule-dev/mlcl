import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ChatBubble } from '../components/ChatBubble.js'
import { InboxHeroCard } from '../components/InboxHeroCard.js'
import { KpiStatCard } from '../components/KpiStatCard.js'

function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface-secondary text-on-surface')}>
      {/* Top nav band */}
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          cm.maxW('7xl'),
          cm.mxAuto,
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              'bg-gradient-to-br from-primary to-secondary text-white',
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              forum
            </span>
          </span>
          <span className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
            {APP_NAME}
          </span>
        </Link>
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 6 }), 'hidden md:flex')}>
          <a
            href="#product"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('nav.product', {}, { defaultValue: 'Product' })}
          </a>
          <a
            href="#solutions"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('landing.nav.solutions', {}, { defaultValue: 'Solutions' })}
          </a>
          <Link
            to="/pricing"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
        </nav>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
          {isAuthenticated ? (
            <Link
              to="/inbox"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-md bg-gradient-to-r from-primary to-secondary text-white shadow-md hover:shadow-lg transition-all',
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
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-md bg-gradient-to-r from-primary to-secondary text-white shadow-md hover:shadow-lg transition-all',
                )}
              >
                {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 6 }),
          cm.sp('px', 6),
          cm.sp('py', 16),
          cm.maxW('5xl'),
          cm.mxAuto,
          'text-center',
        )}
      >
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.roundedFull,
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest bg-primary/15 text-primary-dark',
          )}
        >
          {t('landing.hero.badge', {}, { defaultValue: 'Conversational support workspace' })}
        </span>
        <h1
          className={cm.cn(
            'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold',
          )}
        >
          {t('landing.hero.title', {}, { defaultValue: 'Every message matters.' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('lg'),
            cm.maxW('2xl'),
            'text-on-surface-variant leading-relaxed',
          )}
        >
          {t(
            'landing.hero.subtitle',
            {},
            {
              defaultValue:
                'The empathetic support workspace built for modern teams. Connect with your customers like humans, not tickets.',
            },
          )}
        </p>
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 3 }), 'flex-wrap')}
        >
          <Link
            to="/signup"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'rounded-md bg-gradient-to-r from-primary to-secondary text-white shadow-md hover:shadow-lg transition-all',
            )}
          >
            {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
          </Link>
          <a
            href="#product"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'rounded-md text-primary-dark hover:bg-primary/10 transition-colors',
            )}
          >
            {t('landing.hero.secondary', {}, { defaultValue: 'Book a demo' })}
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              arrow_forward
            </span>
          </a>
        </div>
      </section>

      {/* Sample dashboard preview — mirrors auth'd hero */}
      <section
        id="solutions"
        className={cm.cn(cm.maxW('6xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('pb', 16))}
      >
        <InboxHeroCard
          activeConversations={42}
          changeLabel={t('landing.preview.heroChange', {}, { defaultValue: '+12 since 9 AM' })}
          slaPercent={97}
          avgFirstResponse={t('landing.preview.firstReply', {}, { defaultValue: '2m 14s' })}
        />
        <div className={cm.cn(cm.grid({ cols: 1, gap: 4 }), cm.sp('mt', 6), 'sm:grid-cols-3')}>
          <KpiStatCard
            label={t('landing.preview.kpiResolved', {}, { defaultValue: 'Resolved today' })}
            value="184"
            trend={t('landing.preview.kpiResolvedTrend', {}, { defaultValue: '+18% vs yesterday' })}
            icon="verified"
            accent="success"
            trendTone="up"
          />
          <KpiStatCard
            label={t('landing.preview.kpiCsat', {}, { defaultValue: 'CSAT score' })}
            value="4.8 / 5"
            trend={t('landing.preview.kpiCsatTrend', {}, { defaultValue: 'Up from 4.6 last week' })}
            icon="star"
            accent="warning"
            trendTone="up"
          />
          <KpiStatCard
            label={t('landing.preview.kpiBot', {}, { defaultValue: 'Auto-resolved by bot' })}
            value="38%"
            trend={t(
              'landing.preview.kpiBotTrend',
              {},
              { defaultValue: 'Saving 22 agent hours / week' },
            )}
            icon="smart_toy"
            accent="bot"
            trendTone="up"
          />
        </div>
      </section>

      {/* Conversation sample */}
      <section
        id="product"
        className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('pb', 20))}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 6 }),
            cm.sp('p', 8),
            'bg-surface rounded-[1.5rem] shadow-sm border border-[color:var(--color-border)]',
          )}
        >
          <header className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-primary-dark',
              )}
            >
              {t('landing.sample.eyebrow', {}, { defaultValue: 'Live conversation' })}
            </span>
            <h2 className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight')}>
              {t('landing.sample.title', {}, { defaultValue: 'Three voices, one workspace.' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
              {t(
                'landing.sample.description',
                {},
                {
                  defaultValue:
                    'Bots triage, agents resolve, and team-mates leave private notes — all without ever leaving the conversation.',
                },
              )}
            </p>
          </header>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
            <ChatBubble speaker="customer" name="Maya R." timestamp="2m ago">
              {t(
                'landing.sample.customer',
                {},
                { defaultValue: 'Hi! My invoice still shows last month — can you double-check?' },
              )}
            </ChatBubble>
            <ChatBubble speaker="bot" name={`${APP_NAME} Bot`} timestamp="2m ago">
              {t(
                'landing.sample.bot',
                {},
                {
                  defaultValue:
                    'I pulled up your account — looks like the renewal posted under a separate invoice. Want me to merge them?',
                },
              )}
            </ChatBubble>
            <ChatBubble speaker="note">
              {t(
                'landing.sample.note',
                {},
                {
                  defaultValue:
                    'Heads up — Maya is on the Pro plan, churn risk score 0.21. Worth a personal touch.',
                },
              )}
            </ChatBubble>
            <ChatBubble speaker="agent" name="Sarah J. — Senior Agent" timestamp="just now">
              {t(
                'landing.sample.agent',
                {},
                {
                  defaultValue:
                    'Hey Maya — merging those now and crediting the duplicate. You should see the new invoice in a minute.',
                },
              )}
            </ChatBubble>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 8),
          cm.maxW('7xl'),
          cm.mxAuto,
          cm.textSize('xs'),
          'text-on-surface-variant flex-wrap gap-3 border-t border-[color:var(--color-border)]',
        )}
      >
        <span>
          {t(
            'landing.footer.copyright',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}}. All rights reserved.' },
          )}
        </span>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
          <Link to="/privacy" className={'hover:text-primary transition-colors'}>
            {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          </Link>
          <Link to="/terms" className={'hover:text-primary transition-colors'}>
            {t('nav.terms', {}, { defaultValue: 'Terms' })}
          </Link>
        </div>
      </footer>
    </div>
  )
}

export default Landing
export { Landing, Landing as LandingPage }
