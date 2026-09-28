import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

const FEATURED_CUISINES = [
  {
    key: 'sushi',
    name: 'Sakura Sushi',
    cuisine: 'Japanese',
    rating: 4.8,
    eta: '25–35',
    icon: 'ramen_dining',
    gradient: 'food-grad-sushi',
    freeDelivery: true,
    fee: '$0.00',
  },
  {
    key: 'italian',
    name: 'Bella Italia',
    cuisine: 'Italian',
    rating: 4.7,
    eta: '30–40',
    icon: 'restaurant',
    gradient: 'food-grad-italian',
    freeDelivery: false,
    fee: '$2.99',
  },
  {
    key: 'indian',
    name: 'Spice Route',
    cuisine: 'Indian',
    rating: 4.6,
    eta: '20–30',
    icon: 'ramen_dining',
    gradient: 'food-grad-indian',
    freeDelivery: false,
    fee: '$1.49',
  },
] as const

// Icon names must be members of the fleet SUBSET icon font
// (scripts/subset-flagship-icon-fonts.mjs breadth-ranked top-350) — long-tail
// names only render via the async runtime healer and flash raw text on first paint.
const CATEGORIES = [
  { key: 'pizza', label: 'Pizza', icon: 'restaurant' },
  { key: 'burgers', label: 'Burgers', icon: 'lunch_dining' },
  { key: 'sushi', label: 'Sushi', icon: 'ramen_dining' },
  { key: 'tacos', label: 'Tacos', icon: 'lunch_dining' },
  { key: 'ramen', label: 'Ramen', icon: 'ramen_dining' },
  { key: 'salads', label: 'Salads', icon: 'eco' },
  { key: 'desserts', label: 'Desserts', icon: 'local_cafe' },
  { key: 'healthy', label: 'Healthy', icon: 'restaurant' },
] as const

const STEPS = [
  {
    key: 'browse',
    icon: 'storefront',
    defaultTitle: 'Browse',
    defaultBody: 'Find restaurants and dishes you love.',
  },
  {
    key: 'order',
    icon: 'shopping_bag',
    defaultTitle: 'Order',
    defaultBody: 'Pay securely and track your order in real time.',
  },
  {
    key: 'enjoy',
    icon: 'restaurant',
    defaultTitle: 'Enjoy',
    defaultBody: 'Receive your meal hot at your door.',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const year = new Date().getFullYear()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={
          'sticky top-0 z-50 bg-surface/95 backdrop-blur-md shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)]'
        }
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
          )}
        >
          <Link
            to="/"
            className={
              'text-2xl font-black italic tracking-tighter text-primary [font-family:var(--font-headline)]'
            }
          >
            {APP_NAME}
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/restaurants"
                data-mol-id="landing-nav-dashboard"
                className={
                  'px-5 py-2 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary-hover transition-colors'
                }
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  data-mol-id="landing-nav-sign-in"
                  className={'text-sm font-medium text-on-surface-variant hover:text-primary'}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="landing-nav-get-started"
                  className={
                    'px-5 py-2 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary-hover transition-colors'
                  }
                >
                  {t('common.getStarted', {}, { defaultValue: 'Get started' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — brand gradient band, DM Sans display headline, address pill */}
        <section className="landing-hero-grad relative overflow-hidden">
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'relative z-10 py-20')}>
            <div className={'grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'}>
              <div className="space-y-8">
                <div className="space-y-4">
                  <h1
                    className={
                      'text-5xl md:text-[56px] leading-[1.1] font-black tracking-tight text-white [font-family:var(--font-headline)]'
                    }
                  >
                    {t(
                      'landing.heroTitle',
                      { tagline: APP_TAGLINE },
                      { defaultValue: '{{tagline}}' },
                    )}
                  </h1>
                  <p
                    className={
                      'text-lg md:text-xl font-bold text-white/95 max-w-md leading-relaxed'
                    }
                  >
                    {t(
                      'landing.heroSubtitle',
                      {},
                      {
                        defaultValue:
                          'Order from hundreds of local restaurants. Track every bite from kitchen to door. Hot, fresh, fast.',
                      },
                    )}
                  </p>
                </div>

                {/* Address pill → restaurant browsing */}
                <div
                  className={
                    'bg-surface p-2 rounded-full flex items-center shadow-2xl h-16 w-full max-w-[500px]'
                  }
                >
                  <span
                    className="material-symbols-outlined text-primary pl-4 pr-2"
                    aria-hidden="true"
                  >
                    location_on
                  </span>
                  <input
                    type="text"
                    aria-label={t(
                      'landing.addressPlaceholder',
                      {},
                      { defaultValue: 'Enter delivery address' },
                    )}
                    placeholder={t(
                      'landing.addressPlaceholder',
                      {},
                      { defaultValue: 'Enter delivery address' },
                    )}
                    className={
                      'flex-1 min-w-0 bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant font-medium h-full'
                    }
                  />
                  <Link
                    to="/restaurants"
                    data-mol-id="landing-hero-find-food"
                    className={
                      'bg-success text-white px-6 md:px-8 h-full rounded-full font-semibold flex items-center hover:opacity-90 transition-opacity shrink-0'
                    }
                  >
                    {t('landing.findFood', {}, { defaultValue: 'Find food' })}
                  </Link>
                </div>

                {/* Trust chips */}
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <span className={'flex items-center gap-1 text-sm font-semibold text-white/95'}>
                    <span className="material-symbols-outlined text-base" aria-hidden="true">
                      restaurant
                    </span>
                    {t('landing.trust.restaurants', {}, { defaultValue: '500+ local restaurants' })}
                  </span>
                  <span className="w-1 h-1 bg-white/50 rounded-full" aria-hidden="true" />
                  <span className={'flex items-center gap-1 text-sm font-semibold text-white/95'}>
                    <span className="material-symbols-outlined text-base" aria-hidden="true">
                      timer
                    </span>
                    {t('landing.trust.avgDelivery', {}, { defaultValue: '25 min avg delivery' })}
                  </span>
                </div>
              </div>

              {/* Sample restaurant hero card */}
              <div className={'hidden lg:block'}>
                <div
                  className={
                    'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-black/30'
                  }
                  style={{ backgroundColor: 'var(--color-hero-mid)', minHeight: '420px' }}
                >
                  <div
                    className={
                      'absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-surface/15 blur-3xl'
                    }
                    aria-hidden="true"
                  />
                  <div
                    className={
                      'absolute right-12 top-16 w-32 h-32 rounded-full border-4 border-surface/20'
                    }
                    aria-hidden="true"
                  />
                  <div
                    className={
                      'absolute right-20 top-32 w-20 h-20 rounded-full border-2 border-surface/30'
                    }
                    aria-hidden="true"
                  />

                  <div className={'relative z-10 p-7 flex flex-col justify-between min-h-[420px]'}>
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span
                        className={
                          'inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-surface/20 backdrop-blur-md'
                        }
                      >
                        <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                          location_on
                        </span>
                        {t('landing.sample.deliverTo', {}, { defaultValue: 'Home · 215 Elm' })}
                      </span>
                      <span
                        className={
                          'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface/20 backdrop-blur-md'
                        }
                      >
                        {t('landing.sample.openNow', {}, { defaultValue: 'Open now' })}
                      </span>
                    </div>

                    <div
                      className={
                        'bg-surface text-on-surface rounded-2xl p-4 my-4 shadow-2xl shadow-black/20'
                      }
                    >
                      <div className={cm.flex({ align: 'start', gap: 'md' })}>
                        <div
                          className={
                            'w-16 h-16 rounded-xl flex items-center justify-center shrink-0 food-grad-sushi'
                          }
                          aria-hidden="true"
                        >
                          <span className="material-symbols-outlined text-3xl text-white">
                            ramen_dining
                          </span>
                        </div>
                        <div className={'flex-1 min-w-0'}>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                            {t('landing.sample.cuisine', {}, { defaultValue: 'Japanese' })}
                          </p>
                          <h3 className={'text-base font-extrabold tracking-tight'}>
                            {t('landing.sample.restaurant', {}, { defaultValue: 'Sakura Sushi' })}
                          </h3>
                          <div
                            className={
                              'flex items-center gap-2 mt-1 text-[11px] text-on-surface-variant'
                            }
                          >
                            <span className={'inline-flex items-center gap-0.5'}>
                              <span
                                className="material-symbols-outlined text-[12px] text-warning"
                                aria-hidden="true"
                              >
                                star
                              </span>
                              <span className="font-semibold tabular-nums">4.8</span>
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {t('landing.sample.eta', {}, { defaultValue: '25–35 min' })}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="text-success font-bold">
                              {t('landing.sample.freeDelivery', {}, { defaultValue: 'Free' })}
                            </span>
                          </div>
                        </div>
                        <span
                          className="material-symbols-outlined text-on-surface-variant"
                          aria-hidden="true"
                        >
                          favorite
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-white/85">
                        {t('landing.sample.trending', {}, { defaultValue: 'Trending tonight' })}
                      </p>
                      <p className={'text-2xl font-extrabold mt-1'}>
                        {t(
                          'landing.sample.delivering',
                          { count: 142 },
                          { defaultValue: '{{count}} restaurants delivering' },
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Category pill strip */}
        <section className="bg-[var(--color-landing-band)] border-b border-outline-variant/40">
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-6')}>
            <div className={'flex overflow-x-auto gap-4 pb-2'}>
              {CATEGORIES.map((c, i) => (
                <Link
                  key={c.key}
                  to={`/restaurants?cuisine=${encodeURIComponent(c.key)}`}
                  data-mol-id={`landing-category-${c.key}`}
                  className={
                    'flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap shrink-0 transition-colors ' +
                    (i === 0
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface text-on-surface hover:bg-surface-hover shadow-sm')
                  }
                >
                  <span className={'material-symbols-outlined text-lg'} aria-hidden="true">
                    {c.icon}
                  </span>
                  {t(`landing.category.${c.key}`, {}, { defaultValue: c.label })}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Popular near you */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
              cm.sp('mb', 8),
            )}
          >
            <div>
              <h2
                className={'text-3xl font-bold tracking-tight [font-family:var(--font-headline)]'}
              >
                {t('landing.featuredHeading', {}, { defaultValue: "Tonight's favorites" })}
              </h2>
              <p className={'text-on-surface-variant mt-1'}>
                {t(
                  'landing.featuredSubheading',
                  {},
                  { defaultValue: 'Highly rated local favorites.' },
                )}
              </p>
            </div>
            <Link
              to="/restaurants"
              data-mol-id="landing-view-all"
              className={
                'text-primary font-semibold hover:opacity-80 flex items-center gap-1 group'
              }
            >
              {t('landing.viewAll', {}, { defaultValue: 'View all' })}
              <span
                className={
                  'material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform'
                }
                aria-hidden="true"
              >
                arrow_forward
              </span>
            </Link>
          </div>
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
            {FEATURED_CUISINES.map((r) => (
              <div
                key={r.key}
                className={
                  'rounded-2xl overflow-hidden bg-surface shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:shadow-xl hover:-translate-y-1 transition-all group'
                }
              >
                <div
                  className={'relative aspect-[16/9] flex items-center justify-center'}
                  aria-hidden="true"
                >
                  <span className={`absolute inset-0 ${r.gradient}`} />
                  <span
                    className={
                      'relative material-symbols-outlined text-[80px] text-white/40 group-hover:scale-110 transition-transform'
                    }
                  >
                    {r.icon}
                  </span>
                  <span
                    className={
                      'absolute top-4 right-4 bg-surface/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-on-surface flex items-center gap-1 shadow-sm'
                    }
                  >
                    <span
                      className="material-symbols-outlined text-[14px] text-primary"
                      aria-hidden="true"
                    >
                      schedule
                    </span>
                    <span className="tabular-nums">{r.eta} min</span>
                  </span>
                </div>
                <div className={'p-5'}>
                  <div className={cm.flex({ align: 'start', justify: 'between', gap: 'sm' })}>
                    <h3 className="text-xl font-bold tracking-tight [font-family:var(--font-headline)] group-hover:text-primary transition-colors">
                      {t(`landing.featured.${r.key}.name`, {}, { defaultValue: r.name })}
                    </h3>
                    <span
                      className={
                        'flex items-center bg-surface-container px-2 py-1 rounded-lg shrink-0'
                      }
                    >
                      <span className="material-symbols-outlined text-[14px] text-warning mr-1">
                        star
                      </span>
                      <span className="font-semibold text-sm tabular-nums">
                        {r.rating.toFixed(1)}
                      </span>
                    </span>
                  </div>
                  <p className="text-on-surface-variant text-sm font-medium mt-2">
                    {r.cuisine}
                    <span className="mx-2" aria-hidden="true">
                      •
                    </span>
                    {r.freeDelivery ? (
                      <span className="text-success font-semibold">
                        {t('landing.card.freeDelivery', {}, { defaultValue: 'Free delivery' })}
                      </span>
                    ) : (
                      <span className="tabular-nums">
                        {t('landing.card.fee', { price: r.fee }, { defaultValue: '{{price}} fee' })}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Limited-time offer banner */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'mb-16')}>
          <div
            className={
              'landing-offer-grad rounded-[2rem] p-10 flex flex-col md:flex-row items-center justify-between overflow-hidden relative shadow-lg'
            }
          >
            <div
              className={
                'absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3'
              }
              aria-hidden="true"
            />
            <div className={'relative z-10 max-w-lg mb-8 md:mb-0'}>
              <span
                className={
                  'inline-block bg-[var(--color-primary-deep)] text-white text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider'
                }
              >
                {t('landing.offer.chip', {}, { defaultValue: 'Limited time' })}
              </span>
              <h2
                className={'text-4xl font-black leading-tight [font-family:var(--font-headline)]'}
              >
                {t('landing.offer.heading', {}, { defaultValue: 'Save 20% on your first order' })}
              </h2>
              <p className={'text-lg text-on-surface-variant font-medium mt-4 mb-8'}>
                {t(
                  'landing.offer.body',
                  { app: APP_NAME },
                  {
                    defaultValue:
                      'Use the code below at checkout to claim your discount on participating local spots.',
                  },
                )}
                <span
                  className={
                    'font-bold text-on-primary-container bg-surface px-2 py-1 rounded tabular-nums ml-2 whitespace-nowrap'
                  }
                >
                  CHARIOT20
                </span>
              </p>
              <Link
                to="/signup"
                data-mol-id="landing-offer-cta"
                className={
                  'inline-block bg-success text-white px-8 py-4 rounded-full font-bold text-lg hover:opacity-90 transition-opacity shadow-md'
                }
              >
                {t('landing.offer.cta', {}, { defaultValue: 'Claim offer' })}
              </Link>
            </div>
            <div
              className={
                'relative z-10 w-64 h-64 rounded-full food-grad-italian shadow-2xl border-8 border-surface -rotate-6 flex items-center justify-center shrink-0'
              }
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-[96px] text-white/50">
                shopping_bag
              </span>
            </div>
          </div>
        </section>

        {/* How it works — circular step bubbles with connector line */}
        <section className="bg-[var(--color-landing-band)]">
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20 text-center')}>
            <h2
              className={
                'mb-16 text-3xl font-bold tracking-tight [font-family:var(--font-headline)]'
              }
            >
              {t(
                'landing.stepsHeading',
                { appName: APP_NAME },
                { defaultValue: 'How {{appName}} delivers' },
              )}
            </h2>
            <div
              className={cm.cn(
                cm.grid({ gap: 'lg' }),
                'grid-cols-1 md:grid-cols-3 max-w-5xl mx-auto relative',
              )}
            >
              <div
                className={
                  'hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-primary/20'
                }
                aria-hidden="true"
              />
              {STEPS.map((s, i) => (
                <div key={s.key} className="relative z-10 flex flex-col items-center group">
                  <div
                    className={
                      'w-24 h-24 bg-surface rounded-full shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex items-center justify-center mb-6 group-hover:-translate-y-2 transition-transform'
                    }
                  >
                    <span
                      className={'material-symbols-outlined text-4xl text-primary relative z-10'}
                      aria-hidden="true"
                    >
                      {s.icon}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 [font-family:var(--font-headline)]">
                    {i + 1}.{' '}
                    {t(`landing.step.${s.key}.title`, {}, { defaultValue: s.defaultTitle })}
                  </h3>
                  <p className="text-on-surface-variant font-medium max-w-xs">
                    {t(`landing.step.${s.key}.body`, {}, { defaultValue: s.defaultBody })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={'border-t border-outline-variant/40'}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3 className={'text-3xl font-extrabold tracking-tight mb-4'}>
              {t('landing.ctaHeading', {}, { defaultValue: 'Hot, fresh, fast.' })}
            </h3>
            <p className={'text-base text-on-surface-variant max-w-xl mx-auto mb-8'}>
              {t(
                'landing.ctaBody',
                {},
                { defaultValue: 'Free delivery on your first order. No subscription required.' },
              )}
            </p>
            <Link
              to="/signup"
              data-mol-id="landing-footer-cta"
              className={
                'inline-flex items-center gap-2 px-10 py-4 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary-hover transition-colors'
              }
            >
              {t('landing.heroCta', {}, { defaultValue: 'Order now' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-[var(--color-footer-bg)] rounded-t-[2rem] border-t border-outline-variant/40">
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'py-12 flex flex-col md:flex-row justify-between items-center gap-6',
          )}
        >
          <div className="flex flex-col gap-2 items-center md:items-start">
            <span
              className={
                'text-2xl font-black italic tracking-tighter text-primary [font-family:var(--font-headline)]'
              }
            >
              {APP_NAME}
            </span>
            <p className="text-on-surface-variant text-sm max-w-xs text-center md:text-left">
              {t('landing.footerTagline', {}, { defaultValue: 'Hot, fresh, fast — at your door.' })}
            </p>
          </div>
          <p className="text-sm text-on-surface-variant text-center">
            {t(
              'common.copyrightAllRightsReserved',
              { year, app: APP_NAME },
              { defaultValue: '© {{year}} {{app}}. All rights reserved.' },
            )}
            {' — Built with '}
            <a
              href="https://molecule.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-medium"
            >
              Molecule.dev
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
