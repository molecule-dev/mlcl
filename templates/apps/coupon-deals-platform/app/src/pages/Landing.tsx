import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { DealCard, type DealCardDeal } from '../components/DealCard.js'
import { HotDealsRow } from '../components/HotDealsRow.js'
import { SafeLink } from '../components/SafeLink.js'
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

/* Hero collage — the Stitch design floats three rotated coupon cards with
   scissor-cut bottom edges next to the headline. Static sample data; the
   real feed renders one section below via HotDealsRow. */
const HERO_CARDS = [
  {
    key: 'pizzeria',
    glyph: 'restaurant',
    placement: 'top-0 right-0 rotate-6 z-10',
    badgeKey: 'expiring',
    off: '50% OFF',
    save: 'Save $14',
  },
  {
    key: 'kicks',
    glyph: 'shopping_bag',
    placement: 'top-48 -left-2 -rotate-3 z-20',
    badgeKey: null,
    off: '30% OFF',
    save: 'Save $45',
  },
  {
    key: 'cafe',
    glyph: 'local_cafe',
    placement: 'bottom-2 right-12 rotate-2 z-30',
    badgeKey: null,
    off: 'BOGO',
    save: 'Save $6',
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

  const navLinkClass = cm.cn(
    'font-headline font-bold tracking-tight text-on-surface-variant opacity-80 hover:opacity-100 hover:text-primary transition-colors',
  )

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface font-body antialiased')}>
      <nav data-mol-id="landing-nav" className={cm.cn('sticky top-0 z-50 bg-surface shadow-sm')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.mxAuto,
            'max-w-screen-2xl',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
            <SafeLink to="/">
              <BrandWordmark as="span" />
            </SafeLink>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'hidden lg:flex')}>
              <SafeLink
                to="/deals"
                className={cm.cn(navLinkClass, 'text-primary border-b-2 border-primary pb-1')}
              >
                {t('nav.deals', {}, { defaultValue: 'Deals' })}
              </SafeLink>
              <SafeLink to="/merchants" className={navLinkClass}>
                {t('nav.merchants', {}, { defaultValue: 'Merchants' })}
              </SafeLink>
              <SafeLink to="/near-me" className={navLinkClass}>
                {t('nav.nearMe', {}, { defaultValue: 'Near Me' })}
              </SafeLink>
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="landing-nav-dashboard"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  'font-headline font-bold rounded-xl pulse-gradient text-on-primary shadow-ambient hover:opacity-90 transition-opacity',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'font-headline font-bold text-primary hover:bg-surface-container rounded-lg transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="landing-nav-cta"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    'font-headline font-bold rounded-xl pulse-gradient text-on-primary shadow-ambient hover:opacity-90 active:scale-95 transition-all',
                  )}
                >
                  {t('landing.navCta', {}, { defaultValue: 'Get the app' })}
                  <span
                    className={cm.cn('material-symbols-outlined text-sm icon-fill')}
                    aria-hidden="true"
                  >
                    download
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className={cm.cn(cm.sp('px', 6), 'py-20 lg:py-32')}>
          <div
            className={cm.cn(
              cm.mxAuto,
              cm.grid({ gap: 'lg' }),
              'max-w-screen-2xl grid-cols-1 lg:grid-cols-2 gap-16 items-center',
            )}
          >
            <div className={cm.cn('relative z-10 space-y-8')}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'inline-flex w-fit items-center bg-surface-container px-4 py-2 rounded-full',
                )}
              >
                <span className={cm.cn('relative flex h-3 w-3')} aria-hidden="true">
                  <span
                    className={cm.cn(
                      'animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75',
                    )}
                  />
                  <span
                    className={cm.cn('relative inline-flex rounded-full h-3 w-3 bg-secondary')}
                  />
                </span>
                <span className={cm.cn('font-headline font-bold text-sm text-on-surface')}>
                  {t('landing.eyebrow', {}, { defaultValue: '$4.2M saved this month' })}
                </span>
              </div>
              <h1
                className={cm.cn(
                  'font-headline text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-tight text-on-surface',
                )}
              >
                {t('landing.heroTitleTop', {}, { defaultValue: 'Grab it before' })} <br />
                <span className={cm.cn('text-primary relative inline-block')}>
                  {t('landing.heroTitleAccent', {}, { defaultValue: "it's gone." })}
                  <span
                    aria-hidden="true"
                    className={cm.cn(
                      'absolute -bottom-2 left-0 w-full h-4 bg-primary-container/30 -z-10 -rotate-2',
                    )}
                  />
                </span>
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.maxW('lg'),
                  'text-on-surface-variant leading-relaxed max-w-lg',
                )}
              >
                {t(
                  'landing.heroSubtitle',
                  {},
                  {
                    defaultValue:
                      'The hunt is on. Discover flash sales, exclusive merchant deals, and massive discounts in your city — redeem with a QR and never pay full price.',
                  },
                )}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), 'pt-4')}>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    'font-headline font-bold text-lg rounded-xl pulse-gradient text-on-primary shadow-ambient hover:-translate-y-1 active:scale-95 transition-transform flex items-center',
                  )}
                >
                  {t('landing.heroCta', {}, { defaultValue: 'Start Hunting' })}
                  <span className={cm.cn('material-symbols-outlined icon-fill')} aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  to="/deals"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    'font-headline font-bold text-lg rounded-xl bg-surface-container-lowest text-on-surface shadow-ambient hover:bg-surface-container transition-colors',
                  )}
                >
                  {t('landing.browseCta', {}, { defaultValue: 'Browse Map' })}
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
                      className={cm.cn(
                        'material-symbols-outlined text-base text-secondary icon-fill',
                      )}
                    >
                      {proof.glyph}
                    </span>
                    {t(`landing.socialProof.${proof.glyph}`, {}, { defaultValue: proof.label })}
                  </span>
                ))}
              </div>
            </div>

            <div className={cm.cn('relative h-[600px] hidden lg:block')} data-mol-id="hero-collage">
              {HERO_CARDS.map((card) => (
                <div
                  key={card.key}
                  className={cm.cn(
                    'absolute w-72 bg-surface-container-lowest rounded-xl shadow-ambient scissor-cut-bottom',
                    card.placement,
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'relative h-40 bg-surface-container-high rounded-t-xl overflow-hidden',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cm.cn('material-symbols-outlined text-7xl text-primary/60')}
                      style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}
                    >
                      {card.glyph}
                    </span>
                    {card.badgeKey === 'expiring' && (
                      <span
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          'absolute top-3 left-3 bg-error text-on-error rounded-full font-headline font-bold text-xs',
                        )}
                      >
                        {t('landing.heroCardExpiring', {}, { defaultValue: 'Expiring Soon' })}
                      </span>
                    )}
                  </div>
                  <div className={cm.cn(cm.sp('p', 5), 'bg-surface-container-lowest')}>
                    <h3
                      className={cm.cn(
                        'font-headline font-bold text-lg leading-tight mb-1 text-on-surface',
                      )}
                    >
                      {t(
                        `landing.heroCard.${card.key}.name`,
                        {},
                        {
                          defaultValue:
                            card.key === 'pizzeria'
                              ? "Luigi's Pizzeria"
                              : card.key === 'kicks'
                                ? 'Urban Kicks'
                                : 'Morning Grind',
                        },
                      )}
                    </h3>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mb-4')}>
                      {t(
                        `landing.heroCard.${card.key}.item`,
                        {},
                        {
                          defaultValue:
                            card.key === 'pizzeria'
                              ? 'Any Large Pizza'
                              : card.key === 'kicks'
                                ? 'Select Footwear'
                                : 'Artisan Lattes',
                        },
                      )}
                    </p>
                    <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                      <div className={cm.cn('font-headline font-extrabold text-2xl text-primary')}>
                        {card.off}
                      </div>
                      <div
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          'bg-secondary text-on-secondary rounded-full font-headline font-bold text-sm',
                        )}
                      >
                        {card.save}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.sp('px', 6), 'my-12')}>
          <div
            className={cm.cn(
              cm.mxAuto,
              'max-w-screen-2xl bg-surface-container-low rounded-[2rem] px-6 py-12 md:px-12 md:py-20',
            )}
          >
            <HotDealsRow
              eyebrow={t('landing.trendingEyebrow', {}, { defaultValue: "Don't blink" })}
              heading={t('landing.trendingHeading', {}, { defaultValue: "Today's Hottest Deals" })}
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
          </div>
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
              'font-headline text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
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
                  'rounded-xl bg-surface-container-lowest shadow-ambient transition-all hover:-translate-y-1 hover:shadow-md',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-12 w-12 rounded-xl bg-primary-container/30 text-on-primary-container',
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
                    'font-headline font-bold text-on-surface tracking-tight',
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
              'relative max-w-screen-xl rounded-[2rem] pulse-gradient text-on-primary text-center overflow-hidden shadow-ambient',
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
                'relative font-headline text-3xl md:text-5xl font-extrabold tracking-tight leading-tight',
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
                'font-headline font-bold text-base whitespace-nowrap',
                'relative inline-flex rounded-xl bg-surface-container-lowest text-primary hover:opacity-95 active:scale-95 transition-all shadow-ambient',
              )}
            >
              {t('landing.ctaButton', {}, { defaultValue: 'Create my free account' })}
              <span className={cm.cn('material-symbols-outlined icon-fill')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer className={cm.cn(cm.sp('px', 6), 'bg-surface-container py-12 mt-20')}>
        <div
          className={cm.cn(
            cm.mxAuto,
            cm.grid({ gap: 'lg' }),
            'max-w-screen-2xl grid-cols-1 md:grid-cols-4 gap-8',
          )}
        >
          <div className={cm.cn('col-span-1 md:col-span-2')}>
            <div className={cm.sp('mb', 4)}>
              <BrandWordmark as="span" footer />
            </div>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'leading-relaxed text-on-surface-variant opacity-80 max-w-sm',
              )}
            >
              {t(
                'landing.footerTagline',
                { tagline: APP_TAGLINE },
                {
                  defaultValue:
                    '{{tagline}} — discover, snag, and save on the best experiences and products around you.',
                },
              )}
            </p>
          </div>
          <div>
            <h3 className={cm.cn('font-headline font-bold text-primary mb-4')}>
              {t('landing.footerExplore', {}, { defaultValue: 'Explore' })}
            </h3>
            <ul className={cm.cn('space-y-2')}>
              <li>
                <SafeLink to="/deals" className={footerLinkClass}>
                  {t('nav.deals', {}, { defaultValue: 'Browse Deals' })}
                </SafeLink>
              </li>
              <li>
                <SafeLink to="/merchants" className={footerLinkClass}>
                  {t('nav.merchants', {}, { defaultValue: 'Top Merchants' })}
                </SafeLink>
              </li>
              <li>
                <SafeLink to="/near-me" className={footerLinkClass}>
                  {t('nav.nearMe', {}, { defaultValue: 'Near Me' })}
                </SafeLink>
              </li>
            </ul>
          </div>
          <div>
            <h3 className={cm.cn('font-headline font-bold text-primary mb-4')}>
              {t('landing.footerCompany', {}, { defaultValue: 'Company' })}
            </h3>
            <ul className={cm.cn('space-y-2')}>
              <li>
                <Link to="/about" className={footerLinkClass}>
                  {t('nav.about', {}, { defaultValue: 'About' })}
                </Link>
              </li>
              <li>
                <Link to="/pricing" className={footerLinkClass}>
                  {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
                </Link>
              </li>
              <li className={cm.cn('flex flex-wrap gap-4')}>
                <LegalModalLinks
                  linkClassName={footerLinkClass}
                  appName={APP_NAME}
                  loadContent={loadContent}
                  privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
                  termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
                />
              </li>
            </ul>
          </div>
        </div>
        <div
          className={cm.cn(
            cm.mxAuto,
            cm.sp('mt', 12),
            cm.sp('pt', 8),
            cm.textSize('sm'),
            'max-w-screen-2xl border-t border-outline-variant/40 text-on-surface-variant opacity-80',
          )}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant opacity-80')}>
            {t(
              'common.copyrightBuiltWithMolecule',
              { year: new Date().getFullYear(), app: APP_NAME },
              { defaultValue: '© {{year}} {{app}}. All rights reserved. Built with Molecule.dev.' },
            )}
          </p>
        </div>
      </footer>
    </div>
  )
}
