import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { CampaignCard } from '../components/CampaignCard.js'
import { CampaignHeroBanner } from '../components/CampaignHeroBanner.js'
import { CategoryFilterBar } from '../components/CategoryFilterBar.js'
import { Footer } from '../components/Footer.js'
import { api, type ApiCampaign, toCardData } from '../lib/api.js'

const CATEGORIES = ['Tech', 'Design', 'Film', 'Games', 'Music', 'Food', 'Art'] as const

const HOW_IT_WORKS = [
  {
    icon: 'add_circle',
    titleKey: 'create',
    defaultTitle: '1. Create',
    bodyKey: 'createBody',
    defaultBody: 'Build your campaign page, set your funding goal, and tell your story.',
  },
  {
    icon: 'share',
    titleKey: 'share',
    defaultTitle: '2. Share',
    bodyKey: 'shareBody',
    defaultBody: 'Launch to a global community and rally your network behind it.',
  },
  {
    icon: 'rocket_launch',
    titleKey: 'fund',
    defaultTitle: '3. Fund',
    bodyKey: 'fundBody',
    defaultBody: 'Hit your goal, receive funds securely, and bring your project to life.',
  },
] as const

const TRUST_STATS = [
  { value: '$240M', labelKey: 'raised', defaultLabel: 'Raised' },
  { value: '12.4k', labelKey: 'projectsFunded', defaultLabel: 'Projects funded' },
  { value: '1.8M', labelKey: 'backers', defaultLabel: 'Backers' },
  { value: '98%', labelKey: 'successRate', defaultLabel: 'Success rate' },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const isAuthenticated = useIsAuthenticated()
  const [featured, setFeatured] = useState<ApiCampaign[]>([])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        let list = await api.featuredCampaigns(http, 6)
        if (list.length === 0) {
          list = await api.listCampaigns(http, { status: 'active', sort: 'trending', limit: 6 })
        }
        if (alive) setFeatured(list)
      } catch (_error) {
        // Landing is publicly browseable; ignore failures and just show empty grid.
      }
    })()
    return () => {
      alive = false
    }
  }, [http])

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-on-surface',
      )}
      data-mol-id="landing"
    >
      {/* Top nav (public) */}
      <nav
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          'sticky top-0 z-40 bg-surface/90 backdrop-blur border-b border-outline-variant',
        )}
      >
        <BrandWordmark />
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <Link
            to="/discover"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'hidden md:inline text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('nav.discover', {}, { defaultValue: 'Discover' })}
          </Link>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="nav-go-to-dashboard"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-lg bg-primary text-white shadow-sm hover:shadow-md active:scale-95 transition-all',
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
                  'hidden md:inline text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-lg bg-primary text-white shadow-sm hover:shadow-md active:scale-95 transition-all',
                )}
              >
                {t('landing.nav.startProject', {}, { defaultValue: 'Start a project' })}
              </Link>
            </>
          )}
        </div>
      </nav>

      <CampaignHeroBanner
        eyebrow={t(
          'landing.hero.eyebrow',
          {},
          { defaultValue: 'Crowdfunding for ambitious creators' },
        )}
        heading={t('landing.hero.heading', {}, { defaultValue: APP_TAGLINE })}
        subheading={t(
          'landing.hero.subheading',
          {},
          {
            defaultValue:
              'Join thousands of creators funding the future. Ambition meets community here.',
          },
        )}
        primaryCta={{
          to: '/signup',
          label: t('landing.hero.startCampaign', {}, { defaultValue: 'Start a campaign' }),
        }}
        secondaryCta={{
          to: '/discover',
          label: t('landing.hero.explore', {}, { defaultValue: 'Explore campaigns' }),
        }}
      />

      <main
        className={cm.cn(
          cm.maxW('7xl'),
          cm.mxAuto,
          cm.w('full'),
          cm.sp('px', 6),
          cm.sp('py', 16),
          cm.stack(16),
        )}
      >
        {/* Featured campaigns */}
        <section className={cm.stack(8)}>
          <div
            className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }), 'flex-wrap gap-3')}
          >
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-primary',
                )}
              >
                {t('landing.featured.eyebrow', {}, { defaultValue: 'Featured this week' })}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mt', 2),
                  'tracking-tight',
                )}
              >
                {t('landing.featured.title', {}, { defaultValue: 'Campaigns gaining momentum' })}
              </h2>
            </div>
            <Link
              to="/discover"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'text-primary hover:underline',
              )}
            >
              {t('landing.featured.browseAll', {}, { defaultValue: 'Browse all campaigns →' })}
            </Link>
          </div>

          <CategoryFilterBar categories={[...CATEGORIES]} />

          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}
            data-mol-id="landing-featured"
          >
            {featured.map((c) => (
              <CampaignCard key={c.id} campaign={toCardData(c)} />
            ))}
          </div>
        </section>

        {/* Trust strip */}
        <section
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm',
          )}
          aria-label={t(
            'landing.trust.label',
            { appName: APP_NAME },
            { defaultValue: '{{appName}} by the numbers' },
          )}
        >
          <div
            className={cm.cn(
              cm.grid({ gap: 'lg' }),
              'grid-cols-2 md:grid-cols-4 text-center md:divide-x divide-outline-variant',
            )}
          >
            {TRUST_STATS.map((s) => (
              <div key={s.labelKey} className={cm.sp('px', 4)}>
                <p
                  className={cm.cn(
                    cm.textSize('4xl'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 2),
                    'text-primary tabular-nums',
                  )}
                >
                  {s.value}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(`landing.trust.${s.labelKey}`, {}, { defaultValue: s.defaultLabel })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className={cm.stack(10)}>
          <div className={cm.textCenter}>
            <h2 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
              {t(
                'landing.how.title',
                { appName: APP_NAME },
                { defaultValue: 'How {{appName}} works' },
              )}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 4),
                cm.maxW('2xl'),
                cm.mxAuto,
                'text-on-surface-variant',
              )}
            >
              {t(
                'landing.how.subtitle',
                {},
                { defaultValue: 'Turn your ambitious idea into reality in three simple steps.' },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
            {HOW_IT_WORKS.map((step) => (
              <article
                key={step.titleKey}
                className={cm.cn(
                  cm.sp('p', 8),
                  cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
                  cm.textCenter,
                  'rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm hover:shadow-md transition-all',
                )}
              >
                <div
                  className={cm.cn(
                    cm.w(16),
                    cm.h(16),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    'shadow-md shadow-primary/20',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                  }}
                >
                  <span
                    className="material-symbols-outlined text-3xl text-white"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    {step.icon}
                  </span>
                </div>
                <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                  {t(`landing.how.${step.titleKey}`, {}, { defaultValue: step.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(`landing.how.${step.bodyKey}`, {}, { defaultValue: step.defaultBody })}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section
          className={cm.cn(
            cm.sp('p', 10),
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
            cm.textCenter,
            'rounded-xl text-white relative overflow-hidden',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary-light) 100%)',
          }}
        >
          <div
            className={cm.cn(
              cm.w(64),
              cm.h(64),
              cm.roundedFull,
              'absolute -right-16 -bottom-16 bg-primary/30 blur-3xl',
            )}
            aria-hidden="true"
          />
          <h2
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tighter relative z-10',
            )}
          >
            {t('landing.cta.title', {}, { defaultValue: 'Ready to launch?' })}
          </h2>
          <p className={cm.cn(cm.textSize('lg'), cm.maxW('xl'), 'text-white/80 relative z-10')}>
            {t(
              'landing.cta.body',
              {},
              { defaultValue: 'Set up your campaign in minutes and start rallying backers today.' },
            )}
          </p>
          <Link
            to="/signup"
            className={cm.cn(
              cm.sp('px', 8),
              cm.sp('py', 4),
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              cm.sp('mt', 4),
              'rounded-lg bg-surface text-primary shadow-lg hover:shadow-xl active:scale-95 transition-all relative z-10',
            )}
          >
            {t('landing.cta.button', {}, { defaultValue: 'Start your campaign' })}
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default Landing
