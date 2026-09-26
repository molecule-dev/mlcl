import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import type { TroveProduct } from '../components/TroveProductCard.js'
import { TroveProductCard } from '../components/TroveProductCard.js'

const FEATURED: TroveProduct[] = [
  {
    id: 'p_aurora_ui',
    slug: 'aurora-ui-kit',
    name: 'Aurora UI Kit — Figma + Code',
    description: '120+ components, dark/light themes, Figma plus React/TS code.',
    priceCents: 6900,
    originalPriceCents: 9900,
    pricingModel: 'paid',
    fileType: 'FIGMA + ZIP',
    coverImage: 'https://picsum.photos/seed/aurora-ui-kit/800/500',
    totalSales: 1284,
    badge: 'bestseller',
  },
  {
    id: 'p_lumen_icons',
    slug: 'lumen-icon-set',
    name: 'Lumen Icon Set — 540 Icons',
    description: 'Optical-corrected outline icons. SVG + PNG.',
    priceCents: 3200,
    pricingModel: 'paid',
    fileType: 'SVG ZIP',
    coverImage: 'https://picsum.photos/seed/lumen-icons/800/500',
    totalSales: 642,
    badge: 'new',
  },
  {
    id: 'p_focus_handbook',
    slug: 'focus-handbook',
    name: 'The Focus Handbook',
    description: '180-page guide for makers who ship. PDF + EPUB.',
    priceCents: 1900,
    pricingModel: 'paid',
    fileType: 'PDF + EPUB',
    coverImage: 'https://picsum.photos/seed/focus-handbook/800/500',
    totalSales: 2341,
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.page, cm.flex({ direction: 'col' }), 'min-h-screen')}>
      <Header />
      <main>
        <section
          className={cm.cn('relative overflow-hidden')}
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-bg-secondary) 50%, var(--color-accent-light) 100%)',
          }}
        >
          <div
            className={cm.cn('absolute -right-32 -top-32 rounded-full bg-primary/20 blur-3xl')}
            style={{ width: 400, height: 400 }}
          />
          <div
            className={cm.cn('absolute -left-20 bottom-0 rounded-full bg-accent/15 blur-3xl')}
            style={{ width: 320, height: 320 }}
          />
          <div
            className={cm.cn(cm.mxAuto, cm.sp('px', 6), cm.sp('py', 16), 'relative max-w-[1200px]')}
          >
            <div
              className={cm.cn(cm.grid({ gap: 'xl' }), 'grid-cols-1 lg:grid-cols-2 items-center')}
            >
              <div>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    cm.sp('mb', 4),
                    'inline-block uppercase tracking-widest text-primary-dark',
                  )}
                >
                  {t(
                    'landing.eyebrow',
                    { appName: APP_NAME },
                    { defaultValue: '{{appName}} — for indie creators' },
                  )}
                </span>
                <h1
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.sp('mb', 6),
                    'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold text-on-surface',
                  )}
                >
                  {t('landing.headlinePart1', {}, { defaultValue: 'Your creations,' })}{' '}
                  <span className="text-primary">
                    {t('landing.headlinePart2', {}, { defaultValue: 'delivered instantly.' })}
                  </span>
                </h1>
                <p
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.sp('mb', 8),
                    'text-on-surface-variant leading-relaxed max-w-xl',
                  )}
                >
                  {t(
                    'landing.subtitle',
                    {},
                    {
                      defaultValue:
                        'A fast, branded storefront for digital products. License keys, instant downloads, and clear revenue dashboards — without the marketplace fees.',
                    },
                  )}
                </p>
                <div className={cm.cn(cm.flex({ gap: 'md' }), 'flex-wrap')}>
                  {isAuthenticated ? (
                    <Link
                      to="/dashboard"
                      data-mol-id="landing-cta-dashboard"
                      className={cm.cn(
                        cm.sp('px', 8),
                        cm.sp('py', 4),
                        cm.fontWeight('bold'),
                        'inline-flex items-center gap-2 bg-primary text-on-primary rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-hover hover:-translate-y-0.5 transition-all',
                      )}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                        dashboard
                      </span>
                      {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
                    </Link>
                  ) : (
                    <Link
                      to="/signup"
                      data-mol-id="landing-cta-signup"
                      className={cm.cn(
                        cm.sp('px', 8),
                        cm.sp('py', 4),
                        cm.fontWeight('bold'),
                        'inline-flex items-center gap-2 bg-primary text-on-primary rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-hover hover:-translate-y-0.5 transition-all',
                      )}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                        rocket_launch
                      </span>
                      {t('landing.ctaPrimary', {}, { defaultValue: 'Start selling free' })}
                    </Link>
                  )}
                  <Link
                    to="/shop"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('bold'),
                      'inline-flex items-center gap-2 bg-surface text-on-surface rounded-xl border border-border hover:border-primary hover:text-primary transition-colors',
                    )}
                  >
                    {t('landing.ctaSecondary', {}, { defaultValue: 'Browse the storefront' })}
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      arrow_forward
                    </span>
                  </Link>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ gap: 'lg' }),
                    cm.sp('mt', 10),
                    'flex-wrap text-on-surface-variant',
                  )}
                >
                  {[
                    {
                      icon: 'verified',
                      label: t('landing.trust.fees', {}, { defaultValue: '0% transaction fees' }),
                    },
                    {
                      icon: 'bolt',
                      label: t('landing.trust.delivery', {}, { defaultValue: 'Instant delivery' }),
                    },
                    {
                      icon: 'lock',
                      label: t(
                        'landing.trust.licenses',
                        {},
                        { defaultValue: 'License keys included' },
                      ),
                    },
                  ].map((item) => (
                    <span
                      key={item.icon}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                      )}
                    >
                      <span
                        className="material-symbols-outlined text-primary"
                        style={{ fontSize: 18 }}
                      >
                        {item.icon}
                      </span>
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className={cm.cn('relative')}>
                <div
                  className={cm.cn(
                    cm.sp('p', 8),
                    // bg-primary-dark is the fallback base: if the gradient
                    // endpoints ever fail to compile, white text must still sit
                    // on a dark field, never on the pale page background.
                    'rounded-[2rem] bg-primary-dark bg-gradient-to-br from-primary to-accent text-white shadow-2xl shadow-primary/20 overflow-hidden relative',
                  )}
                >
                  <div
                    className={cm.cn(
                      'absolute -right-16 -bottom-16 rounded-full bg-surface/15 blur-3xl w-48 h-48',
                    )}
                  />
                  <div className={cm.cn('relative z-10')}>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.sp('mb', 2),
                        'uppercase tracking-widest text-white/80',
                      )}
                    >
                      {t(
                        'landing.previewLabel',
                        { appName: APP_NAME },
                        { defaultValue: 'This week on {{appName}}' },
                      )}
                    </p>
                    <p
                      className={cm.cn('text-5xl font-extrabold tracking-tighter')}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {t('landing.previewRevenue', {}, { defaultValue: '$48,274' })}
                    </p>
                    <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-white/85')}>
                      {t(
                        'landing.previewSubtitle',
                        {},
                        { defaultValue: 'paid out to creators in the last 7 days' },
                      )}
                    </p>
                    <div className={cm.cn(cm.sp('mt', 6), cm.flex({ gap: 'md' }), 'flex-wrap')}>
                      {[
                        {
                          label: t('landing.preview.sold', {}, { defaultValue: 'Items sold' }),
                          value: '2,184',
                        },
                        {
                          label: t(
                            'landing.preview.creators',
                            {},
                            { defaultValue: 'Active creators' },
                          ),
                          value: '317',
                        },
                        {
                          label: t('landing.preview.countries', {}, { defaultValue: 'Countries' }),
                          value: '42',
                        },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className={cm.cn(
                            cm.sp('px', 4),
                            cm.sp('py', 3),
                            'rounded-2xl bg-surface/15 backdrop-blur-md flex-1 min-w-[120px]',
                          )}
                        >
                          <p
                            className={cm.cn(
                              cm.textSize('xs'),
                              'uppercase tracking-widest text-white/80',
                            )}
                          >
                            {stat.label}
                          </p>
                          <p
                            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                          >
                            {stat.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.mxAuto, cm.sp('px', 6), cm.sp('py', 16), 'max-w-[1200px]')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'end', justify: 'between' }),
              cm.sp('mb', 8),
              'flex-wrap gap-4',
            )}
          >
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-primary-dark',
                )}
              >
                {t('landing.featured.eyebrow', {}, { defaultValue: 'Featured this week' })}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mt', 1),
                  'text-on-surface',
                )}
              >
                {t(
                  'landing.featured.title',
                  {},
                  { defaultValue: 'Indie products our buyers love' },
                )}
              </h2>
            </div>
            <Link
              to="/shop"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'text-primary-dark hover:text-primary-hover',
              )}
            >
              {t('landing.featured.viewAll', {}, { defaultValue: 'See the full storefront' })}
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                arrow_forward
              </span>
            </Link>
          </div>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}
          >
            {FEATURED.map((product) => (
              <TroveProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section
          className={cm.cn(cm.sp('py', 16))}
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          <div className={cm.cn(cm.mxAuto, cm.sp('px', 6), 'max-w-[1200px]')}>
            <div className={cm.cn('text-center', cm.sp('mb', 12))}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-primary-dark',
                )}
              >
                {t(
                  'landing.how.eyebrow',
                  { appName: APP_NAME },
                  { defaultValue: 'How {{appName}} works' },
                )}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mt', 2),
                  'text-on-surface',
                )}
              >
                {t('landing.how.title', {}, { defaultValue: 'Three steps from upload to payout' })}
              </h2>
            </div>
            <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
              {[
                {
                  icon: 'cloud_upload',
                  title: t('landing.how.step1Title', {}, { defaultValue: 'Upload your files' }),
                  body: t(
                    'landing.how.step1Body',
                    {},
                    {
                      defaultValue:
                        'Drop in ZIPs, PDFs, or Figma files. We host them, version them, and generate license keys per buyer.',
                    },
                  ),
                },
                {
                  icon: 'storefront',
                  title: t('landing.how.step2Title', {}, { defaultValue: 'Brand your storefront' }),
                  body: t(
                    'landing.how.step2Body',
                    {},
                    {
                      defaultValue:
                        'Pick fonts, colors, and a hero image. Your shop lives at trove.shop/yourname or your own domain.',
                    },
                  ),
                },
                {
                  icon: 'paid',
                  title: t('landing.how.step3Title', {}, { defaultValue: 'Get paid the next day' }),
                  body: t(
                    'landing.how.step3Body',
                    {},
                    {
                      defaultValue:
                        'Stripe-backed payouts, daily. We never hold your money — buyers download, you get paid.',
                    },
                  ),
                },
              ].map((step, idx) => (
                <div
                  key={step.icon}
                  className={cm.cn(
                    cm.sp('p', 8),
                    'rounded-2xl bg-surface shadow-sm border border-border-light hover:shadow-md transition-shadow',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.sp('p', 3),
                      cm.roundedFull,
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.sp('mb', 5),
                      'bg-primary-light text-primary w-14 h-14',
                    )}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
                      {step.icon}
                    </span>
                  </div>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('landing.how.stepLabel', { n: idx + 1 }, { defaultValue: 'Step {{n}}' })}
                  </p>
                  <h3
                    className={cm.cn(
                      cm.textSize('xl'),
                      cm.fontWeight('bold'),
                      cm.sp('mt', 1),
                      cm.sp('mb', 3),
                      'text-on-surface',
                    )}
                  >
                    {step.title}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
                  >
                    {step.body}
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
