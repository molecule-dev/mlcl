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
        {/* Hero — flat warm surface with a soft radial glow top-right. */}
        <section className={cm.cn('relative overflow-hidden', 'py-20 md:py-32')}>
          <div
            className={cm.cn('absolute inset-0 z-0')}
            style={{
              background:
                'radial-gradient(circle at top right, color-mix(in srgb, var(--color-primary) 6%, transparent), transparent 40%)',
            }}
          />
          <div className={cm.cn(cm.mxAuto, cm.sp('px', 6), 'relative z-10 max-w-[1200px]')}>
            <div
              className={cm.cn(cm.grid({ gap: 'xl' }), 'grid-cols-1 lg:grid-cols-2 items-center')}
            >
              <div className={cm.cn(cm.stack(8))}>
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
                    cm.fontWeight('extrabold'),
                    cm.sp('mb', 6),
                    'text-5xl md:text-7xl tracking-tight leading-tight text-on-surface',
                  )}
                >
                  {t('landing.headlinePart1', {}, { defaultValue: 'Your creations,' })}{' '}
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {t('landing.headlinePart2', {}, { defaultValue: 'delivered instantly' })}
                  </span>
                </h1>
                <p
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.sp('mb', 8),
                    'text-on-surface-variant leading-relaxed max-w-lg',
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
                <div className={cm.cn(cm.flex({ gap: 'md' }), 'flex-col sm:flex-row flex-wrap')}>
                  {isAuthenticated ? (
                    <Link
                      to="/dashboard"
                      data-mol-id="landing-cta-dashboard"
                      className={cm.cn(
                        cm.sp('px', 8),
                        cm.sp('py', 4),
                        cm.fontWeight('bold'),
                        cm.textSize('lg'),
                        'inline-flex items-center justify-center gap-2 bg-primary text-on-primary rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors',
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
                        cm.textSize('lg'),
                        'inline-flex items-center justify-center gap-2 bg-primary text-on-primary rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors',
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
                      cm.fontWeight('semibold'),
                      cm.textSize('lg'),
                      'inline-flex items-center justify-center gap-2 bg-surface text-on-surface rounded-xl border border-border shadow-sm hover:border-primary hover:text-primary transition-colors',
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
              {/* Floating product card — tilted white card over a blurred
                  brand-gradient halo (the "delivered product" moment). */}
              <div className={cm.cn('relative lg:ml-12')}>
                <div
                  className={cm.cn(
                    'absolute inset-0 bg-gradient-to-tr from-primary/10 to-accent/10 rounded-3xl blur-lg',
                    'rotate-3 scale-105',
                  )}
                />
                <div
                  className={cm.cn(
                    cm.sp('p', 8),
                    'relative z-10 bg-surface rounded-3xl shadow-2xl border border-border-light max-w-md mx-auto',
                    '-rotate-2 hover:rotate-0 transition-transform duration-500',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'start', justify: 'between' }),
                      cm.sp('mb', 6),
                    )}
                  >
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'w-12 h-12 rounded-xl bg-bg-secondary border border-primary-light',
                      )}
                    >
                      <span
                        className="material-symbols-outlined text-primary"
                        style={{ fontSize: 24 }}
                      >
                        folder_zip
                      </span>
                    </div>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.roundedFull,
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'bg-success-light text-success',
                      )}
                    >
                      <span className={cm.cn('w-2 h-2 rounded-full bg-success')} />
                      {t('landing.preview.downloadReady', {}, { defaultValue: 'Download ready' })}
                    </span>
                  </div>
                  <h3
                    className={cm.cn(
                      cm.textSize('2xl'),
                      cm.fontWeight('bold'),
                      cm.sp('mb', 2),
                      'text-on-surface',
                    )}
                  >
                    {t('landing.preview.productName', {}, { defaultValue: 'SaaS UI Kit Pro' })}
                  </h3>
                  <p className={cm.cn(cm.sp('mb', 6), 'text-on-surface-variant line-clamp-2')}>
                    {t(
                      'landing.preview.productDesc',
                      {},
                      {
                        defaultValue:
                          'Complete design system and component library for your next indie hacker project.',
                      },
                    )}
                  </p>
                  <div
                    className={cm.cn(
                      cm.sp('p', 4),
                      cm.sp('mb', 6),
                      'rounded-lg bg-bg-secondary border border-border-light',
                    )}
                  >
                    <div
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        cm.sp('mb', 1),
                        'uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('landing.preview.licenseLabel', {}, { defaultValue: 'License Key' })}
                    </div>
                    <div
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('bold'),
                        'text-accent tracking-wider',
                      )}
                      style={{ fontFamily: 'var(--font-family-mono)' }}
                    >
                      {t(
                        'landing.preview.licenseValue',
                        {},
                        { defaultValue: 'TRV-A1B2-CDEF-GHIJ' },
                      )}
                    </div>
                  </div>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('mt', 8),
                      cm.sp('pt', 4),
                      'border-t border-border-light',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.textSize('3xl'),
                        cm.fontWeight('bold'),
                        'text-on-surface',
                      )}
                      style={{
                        fontFamily: 'var(--font-family-mono)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {t('landing.preview.price', {}, { defaultValue: '$29' })}
                    </span>
                    <Link
                      to="/shop"
                      data-mol-id="landing-preview-buy"
                      className={cm.cn(
                        cm.sp('px', 6),
                        cm.sp('py', 3),
                        cm.fontWeight('bold'),
                        'bg-primary text-on-primary rounded-xl hover:bg-primary-hover transition-colors shadow-sm',
                      )}
                    >
                      {t('landing.preview.buyNow', {}, { defaultValue: 'Buy now' })}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stat strip — warm brand band, mono figures. */}
        <section
          className={cm.cn('border-y', cm.sp('py', 12))}
          style={{
            backgroundColor: 'var(--color-primary-container)',
            borderColor: 'var(--color-primary-light)',
          }}
        >
          <div className={cm.cn(cm.mxAuto, cm.sp('px', 6), 'max-w-[1200px]')}>
            <div className={cm.cn(cm.grid({ gap: 8 }), 'grid-cols-2 md:grid-cols-4')}>
              {[
                {
                  value: t('landing.stats.paid', {}, { defaultValue: '$24M' }),
                  label: t('landing.stats.paidLabel', {}, { defaultValue: 'Paid to creators' }),
                  tone: 'text-primary',
                },
                {
                  value: t('landing.stats.sold', {}, { defaultValue: '180k+' }),
                  label: t('landing.stats.soldLabel', {}, { defaultValue: 'Products sold' }),
                  tone: 'text-on-surface',
                },
                {
                  value: t('landing.stats.countries', {}, { defaultValue: '97' }),
                  label: t('landing.stats.countriesLabel', {}, { defaultValue: 'Countries' }),
                  tone: 'text-on-surface',
                },
                {
                  value: t('landing.stats.fee', {}, { defaultValue: '0%' }),
                  label: t('landing.stats.feeLabel', {}, { defaultValue: 'Platform fee' }),
                  tone: 'text-accent',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={cm.cn(cm.flex({ direction: 'col' }), 'items-center md:items-start')}
                >
                  <div
                    className={cm.cn(
                      cm.textSize('4xl'),
                      cm.fontWeight('bold'),
                      cm.sp('mb', 2),
                      stat.tone,
                    )}
                    style={{
                      fontFamily: 'var(--font-family-mono)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-on-surface-variant uppercase tracking-wide',
                    )}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works — numbered watermark cards on the page surface. */}
        <section className={cm.cn(cm.sp('py', 24), cm.sp('px', 6))}>
          <div className={cm.cn(cm.mxAuto, 'max-w-[1200px]')}>
            <div className={cm.cn('text-center', cm.sp('mb', 16))}>
              <h2
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 4),
                  'tracking-tight text-on-surface',
                )}
              >
                {t('landing.how.title', {}, { defaultValue: 'From file to revenue in minutes' })}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-2xl mx-auto')}>
                {t(
                  'landing.how.subtitle',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'Skip the complex setups. {{appName}} gives you a beautiful checkout page instantly.',
                  },
                )}
              </p>
            </div>
            <div className={cm.cn(cm.grid({ gap: 8 }), 'grid-cols-1 md:grid-cols-3')}>
              {[
                {
                  icon: 'cloud_upload',
                  title: t('landing.how.step1Title', {}, { defaultValue: 'Upload your file' }),
                  body: t(
                    'landing.how.step1Body',
                    {},
                    {
                      defaultValue:
                        'Drag and drop your digital product. We handle the secure hosting and delivery automatically.',
                    },
                  ),
                },
                {
                  icon: 'sell',
                  title: t('landing.how.step2Title', {}, { defaultValue: 'Set your price' }),
                  body: t(
                    'landing.how.step2Body',
                    {},
                    {
                      defaultValue:
                        'Choose one-time payment or subscription. Offer discounts or let customers pay what they want.',
                    },
                  ),
                },
                {
                  icon: 'payments',
                  title: t('landing.how.step3Title', {}, { defaultValue: 'Get paid directly' }),
                  body: t(
                    'landing.how.step3Body',
                    {},
                    {
                      defaultValue:
                        'Connect your Stripe or PayPal account. Money goes straight to you, no waiting periods.',
                    },
                  ),
                },
              ].map((step, idx) => (
                <div
                  key={step.icon}
                  className={cm.cn(
                    cm.sp('p', 8),
                    'group relative overflow-hidden rounded-xl bg-surface border border-primary-light shadow-sm hover:shadow-lg transition-shadow',
                  )}
                >
                  <span
                    className={cm.cn(
                      'absolute top-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity text-primary',
                      cm.fontWeight('extrabold'),
                    )}
                    style={{
                      fontFamily: 'var(--font-family-mono)',
                      fontSize: '6rem',
                      lineHeight: 1,
                      padding: '1rem',
                    }}
                    aria-hidden="true"
                  >
                    {idx + 1}
                  </span>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.sp('mb', 6),
                      'relative z-10 w-14 h-14 rounded-full bg-primary-container',
                    )}
                  >
                    <span
                      className="material-symbols-outlined text-primary"
                      style={{ fontSize: 24 }}
                    >
                      {step.icon}
                    </span>
                  </div>
                  <h3
                    className={cm.cn(
                      cm.textSize('xl'),
                      cm.fontWeight('bold'),
                      cm.sp('mb', 3),
                      'relative z-10 text-on-surface',
                    )}
                  >
                    {step.title}
                  </h3>
                  <p
                    className={cm.cn(
                      cm.textSize('base'),
                      'relative z-10 text-on-surface-variant leading-relaxed',
                    )}
                  >
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured products — live commerce slice from the storefront. */}
        <section className={cm.cn(cm.mxAuto, cm.sp('px', 6), cm.sp('pb', 24), 'max-w-[1200px]')}>
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
      </main>
      <Footer />
    </div>
  )
}

export default Landing
