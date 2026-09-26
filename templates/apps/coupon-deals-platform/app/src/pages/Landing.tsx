import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { DealCard, type DealCardDeal } from '../components/DealCard.js'
import { HotDealsRow } from '../components/HotDealsRow.js'
import { SafeLink } from '../components/SafeLink.js'
import { TotalSavingsHero } from '../components/TotalSavingsHero.js'
import { loadContent } from '../config.js'
import { unwrapList } from '../lib/unwrap.js'

const FEATURES = [
  {
    key: 'local',
    icon: 'local_offer',
    defaultTitle: 'Local & online deals',
    defaultBody:
      'Hand-picked merchants in your city, plus exclusive online promo codes — refreshed every morning.',
  },
  {
    key: 'qr',
    icon: 'qr_code_scanner',
    defaultTitle: 'Scan-and-go QR',
    defaultBody:
      'Show one QR at the counter; the merchant marks the coupon redeemed in real time. No paper, no awkward "is this valid?".',
  },
  {
    key: 'savings',
    icon: 'savings',
    defaultTitle: 'Track every dollar saved',
    defaultBody:
      'Lifetime savings, expiring coupons, and your top-saving merchants — all on one Dashboard.',
  },
  {
    key: 'alerts',
    icon: 'alarm',
    defaultTitle: 'Expiry alerts that actually fire',
    defaultBody: 'Hot deals and saved coupons ping you 24h before they vanish — never miss a snag.',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const isAuthenticated = useIsAuthenticated()
  const [trendingDeals, setTrendingDeals] = useState<DealCardDeal[] | null>(null)
  const [trendingError, setTrendingError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get('/deals/public?limit=4')
      .then((res) => {
        if (cancelled) return
        setTrendingDeals(unwrapList<DealCardDeal>(res).slice(0, 4))
      })
      .catch(() => {
        if (cancelled) return
        setTrendingError(
          t('landing.trendingError', {}, { defaultValue: 'Could not load trending deals.' }),
        )
        setTrendingDeals([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const footerLinkClass = cm.cn(
    cm.fontWeight('semibold'),
    'inline-block py-1 hover:text-primary transition-colors',
  )

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'bg-gradient-to-b from-background via-surface to-surface-container-low text-on-surface antialiased',
      )}
    >
      <nav
        data-mol-id="landing-nav"
        className={cm.cn(
          'sticky top-0 z-50 border-b border-outline-variant/40 bg-surface/80 backdrop-blur-md',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
            'max-w-screen-2xl',
          )}
        >
          <SafeLink
            to="/"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('extrabold'),
              cm.textSize('xl'),
              'text-primary italic tracking-tighter',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-primary')} aria-hidden="true">
              local_activity
            </span>
            {APP_NAME}
          </SafeLink>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="landing-nav-dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-full bg-primary text-on-primary hover:opacity-90 transition-all shadow-sm',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.sp('py', 2),
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
                    'rounded-full bg-primary text-on-primary hover:opacity-90 transition-all shadow-sm',
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Sign up free' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className={cm.cn(cm.sp('py', 16), cm.sp('px', 6), 'lg:py-24')}>
          <div
            className={cm.cn(
              cm.maxW('xl'),
              cm.mxAuto,
              cm.grid({ cols: 12, gap: 'lg' }),
              'max-w-screen-xl items-center',
            )}
          >
            <div className={cm.cn('col-span-12 lg:col-span-7 space-y-6')}>
              <p
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'text-[10px] font-black uppercase tracking-widest text-primary',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn('h-2 w-2 rounded-full bg-primary animate-pulse')}
                />
                {t('landing.eyebrow', {}, { defaultValue: '50,000+ deals live right now' })}
              </p>
              <h1
                className={cm.cn(
                  'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] text-on-surface',
                )}
              >
                {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}.' })}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.maxW('xl'),
                  'text-on-surface-variant leading-relaxed',
                )}
              >
                {t(
                  'landing.heroSubtitle',
                  {},
                  {
                    defaultValue:
                      'Snag local restaurant, beauty, fitness, and online deals — redeem with a QR, track every dollar saved, and never miss an expiring coupon.',
                  },
                )}
              </p>
              <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.fontWeight('bold'),
                    cm.textSize('base'),
                    'rounded-full bg-primary text-on-primary hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20',
                  )}
                >
                  {t('landing.heroCta', {}, { defaultValue: 'Start saving free' })}
                  <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  to="/deals"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 4),
                    cm.fontWeight('semibold'),
                    cm.textSize('base'),
                    'rounded-full border border-outline-variant text-on-surface hover:bg-surface-container transition-colors',
                  )}
                >
                  {t('landing.browseCta', {}, { defaultValue: 'Browse deals' })}
                </Link>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
                  cm.sp('pt', 4),
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                )}
              >
                {[
                  { glyph: 'star', label: '4.8 / 5 in the App Store' },
                  { glyph: 'group', label: '120,000+ deal hunters' },
                  { glyph: 'verified', label: 'Verified merchants only' },
                ].map((proof) => (
                  <span
                    key={proof.glyph}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.fontWeight('medium'),
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cm.cn('material-symbols-outlined text-base text-secondary')}
                    >
                      {proof.glyph}
                    </span>
                    {t(`landing.socialProof.${proof.glyph}`, {}, { defaultValue: proof.label })}
                  </span>
                ))}
              </div>
            </div>

            <div className={cm.cn('col-span-12 lg:col-span-5')}>
              <TotalSavingsHero
                totalSavingsCents={18420}
                redeemedCount={12}
                savedCount={5}
                eyebrow={t('landing.heroPreviewEyebrow', {}, { defaultValue: 'Sample dashboard' })}
              />
            </div>
          </div>
        </section>

        <section
          className={cm.cn(
            cm.maxW('xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 12),
            'max-w-screen-xl',
          )}
        >
          <HotDealsRow
            eyebrow={t('landing.trendingEyebrow', {}, { defaultValue: 'Trending today' })}
            heading={t(
              'landing.trendingHeading',
              {},
              { defaultValue: 'Snag these before they vanish' },
            )}
            viewAllTo="/deals"
          >
            {trendingDeals === null ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('landing.trendingLoading', {}, { defaultValue: 'Loading trending deals…' })}
              </p>
            ) : trendingError ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{trendingError}</p>
            ) : trendingDeals.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'landing.trendingEmpty',
                  {},
                  { defaultValue: 'No deals are live right now — check back soon.' },
                )}
              </p>
            ) : (
              trendingDeals.map((deal) => <DealCard key={deal.id} deal={deal} linked={false} />)
            )}
          </HotDealsRow>
        </section>

        <section
          className={cm.cn(
            cm.maxW('xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 16),
            'max-w-screen-xl',
          )}
        >
          <p
            className={cm.cn(
              cm.textCenter,
              'text-[10px] font-black uppercase tracking-widest text-primary',
            )}
          >
            {t('landing.featuresEyebrow', { app: APP_NAME }, { defaultValue: 'Why {{app}}' })}
          </p>
          <h2
            className={cm.cn(
              cm.textCenter,
              cm.sp('mt', 2),
              cm.sp('mb', 12),
              'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('landing.featuresHeading', {}, { defaultValue: 'Built for serious deal hunters.' })}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <article
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm transition-all hover:-translate-y-1 hover:shadow-md',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-12 w-12 rounded-xl bg-primary/15 text-primary',
                  )}
                  aria-hidden="true"
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-2xl')}
                    style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}
                  >
                    {f.icon}
                  </span>
                </span>
                <h3
                  className={cm.cn(
                    cm.sp('mt', 4),
                    cm.textSize('lg'),
                    cm.fontWeight('extrabold'),
                    'text-on-surface tracking-tight',
                  )}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p
                  className={cm.cn(
                    cm.sp('mt', 2),
                    cm.textSize('sm'),
                    'text-on-surface-variant leading-relaxed',
                  )}
                >
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'relative overflow-hidden')}>
          <div
            className={cm.cn(
              cm.maxW('xl'),
              cm.mxAuto,
              cm.sp('p', 12),
              'relative max-w-screen-xl rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-on-primary text-center overflow-hidden',
            )}
          >
            <div
              aria-hidden="true"
              className={cm.cn(
                'absolute -right-20 -top-20 h-72 w-72 rounded-full bg-surface/10 blur-3xl pointer-events-none',
              )}
            />
            <div
              aria-hidden="true"
              className={cm.cn(
                'absolute -left-12 -bottom-20 h-64 w-64 rounded-full bg-secondary/30 blur-3xl pointer-events-none',
              )}
            />
            <h2
              className={cm.cn(
                'relative text-3xl md:text-5xl font-extrabold tracking-tight leading-tight',
              )}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Ready to grab your first deal?' })}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 4), 'relative text-on-primary/85')}>
              {t(
                'landing.ctaSubheading',
                {},
                { defaultValue: 'Sign up takes 30 seconds. No credit card.' },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('mt', 8),
                cm.sp('px', 8),
                cm.sp('py', 4),
                cm.fontWeight('bold'),
                cm.textSize('base'),
                'whitespace-nowrap',
                'relative inline-flex rounded-full bg-surface text-primary hover:opacity-95 active:scale-95 transition-all',
              )}
            >
              {t('landing.ctaButton', {}, { defaultValue: 'Create my free account' })}
              <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 10),
          'border-t border-outline-variant/40 bg-surface-container-low',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('xl'),
            cm.mxAuto,
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
            cm.textSize('sm'),
            'max-w-screen-2xl text-on-surface-variant',
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('extrabold'),
              'italic tracking-tighter text-primary',
            )}
          >
            {APP_NAME}
          </span>
          <nav className={cm.cn(cm.flex({ align: 'center', wrap: 'wrap', gap: 'md' }))}>
            <Link to="/about" className={footerLinkClass}>
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            <LegalModalLinks
              linkClassName={footerLinkClass}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
            />
          </nav>
          <span>
            {t(
              'common.copyrightBuiltWithMolecule',
              { year: new Date().getFullYear(), app: APP_NAME },
              { defaultValue: '© {{year}} {{app}}. Built with Molecule.' },
            )}
          </span>
        </div>
      </footer>
    </div>
  )
}
