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
    gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #fb923c 100%)',
  },
  {
    key: 'italian',
    name: 'Bella Italia',
    cuisine: 'Italian',
    rating: 4.7,
    eta: '30–40',
    icon: 'restaurant',
    gradient: 'linear-gradient(135deg, #16a34a 0%, #dc2626 50%, #f59e0b 100%)',
  },
  {
    key: 'indian',
    name: 'Spice Route',
    cuisine: 'Indian',
    rating: 4.6,
    eta: '20–30',
    icon: 'ramen_dining',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 50%, #7c2d12 100%)',
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
    tint: 'text-primary',
  },
  {
    key: 'order',
    icon: 'shopping_bag',
    defaultTitle: 'Order',
    defaultBody: 'Pay securely and track your order in real time.',
    tint: 'text-success',
  },
  {
    key: 'enjoy',
    icon: 'restaurant',
    defaultTitle: 'Enjoy',
    defaultBody: 'Receive your meal hot at your door.',
    tint: 'text-warning',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40'
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
          <Link to="/" className={'text-xl font-extrabold tracking-tight'}>
            {APP_NAME}
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/restaurants"
                className={
                  'px-5 py-2 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
                }
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={'text-sm font-medium text-on-surface-variant hover:text-on-surface'}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={
                    'px-5 py-2 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
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
        {/* Hero — warm crimson-amber gradient with sample restaurant card on the right */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 25% 30%, rgba(232, 85, 45, 0.18), transparent 50%),' +
                'radial-gradient(circle at 78% 60%, rgba(245, 158, 11, 0.15), transparent 45%)',
            }}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'relative py-20 md:py-28 lg:py-32',
            )}
          >
            <div className={'grid grid-cols-1 lg:grid-cols-12 gap-12 items-center'}>
              <div className={'lg:col-span-7'}>
                <p className={'text-sm font-bold uppercase tracking-widest text-primary mb-4'}>
                  {t('landing.eyebrow', {}, { defaultValue: 'Local restaurants · live delivery' })}
                </p>
                <h1
                  className={
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] mb-6'
                  }
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}' },
                  )}
                </h1>
                <p className={'text-lg text-on-surface-variant max-w-xl leading-relaxed mb-10'}>
                  {t(
                    'landing.heroSubtitle',
                    {},
                    {
                      defaultValue:
                        'Order from hundreds of local restaurants. Track every bite from kitchen to door. Hot, fresh, fast.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={
                      'inline-flex items-center gap-2 px-8 py-4 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
                    }
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Order now' })}
                    <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/login"
                    className={
                      'px-8 py-4 font-semibold rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors'
                    }
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
              </div>

              {/* Sample restaurant hero card */}
              <div className={'lg:col-span-5'}>
                <div
                  className={
                    'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-primary/20'
                  }
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 50%, var(--color-star) 100%)',
                    minHeight: '420px',
                  }}
                >
                  <div
                    className={
                      'absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-surface/15 blur-3xl'
                    }
                  />
                  <div
                    className={
                      'absolute right-12 top-16 w-32 h-32 rounded-full border-4 border-surface/20'
                    }
                  />
                  <div
                    className={
                      'absolute right-20 top-32 w-20 h-20 rounded-full border-2 border-surface/30'
                    }
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
                            'w-16 h-16 rounded-xl flex items-center justify-center shrink-0'
                          }
                          style={{
                            background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
                          }}
                          aria-hidden="true"
                        >
                          <span className="material-symbols-outlined text-3xl text-white">
                            ramen_dining
                          </span>
                        </div>
                        <div className={'flex-1 min-w-0'}>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                            Japanese
                          </p>
                          <h3 className={'text-base font-extrabold tracking-tight'}>
                            Sakura Sushi
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
                      <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">
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

        {/* Cuisine grid */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-12')}>
          <h2 className={'mb-6 text-2xl md:text-3xl font-extrabold tracking-tight'}>
            {t('landing.exploreHeading', {}, { defaultValue: 'Explore by craving' })}
          </h2>
          <div className={'grid grid-cols-4 md:grid-cols-8 gap-3'}>
            {CATEGORIES.map((c) => (
              <Link
                key={c.key}
                to={`/restaurants?cuisine=${encodeURIComponent(c.key)}`}
                className={
                  'bg-surface-container-lowest rounded-2xl p-4 text-center hover:shadow-lg hover:bg-surface-container transition-all group'
                }
              >
                <div
                  className={
                    'w-12 h-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform'
                  }
                >
                  <span className={'material-symbols-outlined text-2xl'} aria-hidden="true">
                    {c.icon}
                  </span>
                </div>
                <p className={'text-xs font-bold mt-2 truncate'}>
                  {t(`landing.category.${c.key}`, {}, { defaultValue: c.label })}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured restaurants */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-12')}>
          <h2 className={'mb-6 text-2xl md:text-3xl font-extrabold tracking-tight'}>
            {t('landing.featuredHeading', {}, { defaultValue: "Tonight's favorites" })}
          </h2>
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
            {FEATURED_CUISINES.map((r) => (
              <div
                key={r.key}
                className={
                  'rounded-2xl overflow-hidden bg-surface-container-lowest hover:shadow-2xl hover:shadow-on-surface/5 transition-all group'
                }
              >
                <div
                  className={'aspect-[16/9] flex items-center justify-center'}
                  style={{ background: r.gradient }}
                  aria-hidden="true"
                >
                  <span
                    className={
                      'material-symbols-outlined text-[80px] text-white/40 group-hover:scale-110 transition-transform'
                    }
                  >
                    {r.icon}
                  </span>
                </div>
                <div className={'p-4'}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {r.cuisine}
                  </p>
                  <h3 className={'text-base font-extrabold tracking-tight mt-0.5'}>{r.name}</h3>
                  <div
                    className={'flex items-center gap-2 mt-2 text-[11px] text-on-surface-variant'}
                  >
                    <span className={'inline-flex items-center gap-0.5'}>
                      <span
                        className="material-symbols-outlined text-[12px] text-warning"
                        aria-hidden="true"
                      >
                        star
                      </span>
                      <span className="font-semibold tabular-nums">{r.rating.toFixed(1)}</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{r.eta} min</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2 className={'mb-12 text-center text-3xl md:text-4xl font-extrabold tracking-tight'}>
            {t(
              'landing.stepsHeading',
              { appName: APP_NAME },
              { defaultValue: 'How {{appName}} delivers' },
            )}
          </h2>
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                className={
                  'bg-surface-container-lowest rounded-2xl p-6 hover:shadow-2xl hover:shadow-on-surface/5 transition-all group relative'
                }
              >
                <span
                  className={
                    'absolute -top-3 -left-3 w-10 h-10 rounded-full bg-primary text-on-primary text-sm font-extrabold flex items-center justify-center shadow-lg'
                  }
                >
                  {i + 1}
                </span>
                <div
                  className={cm.cn(
                    'inline-flex p-3 bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                    s.tint,
                  )}
                >
                  <span className="material-symbols-outlined text-3xl" aria-hidden="true">
                    {s.icon}
                  </span>
                </div>
                <h3 className={'text-lg font-bold mt-5 mb-2'}>
                  {t(`landing.step.${s.key}.title`, {}, { defaultValue: s.defaultTitle })}
                </h3>
                <p className={'text-sm text-on-surface-variant leading-relaxed'}>
                  {t(`landing.step.${s.key}.body`, {}, { defaultValue: s.defaultBody })}
                </p>
              </div>
            ))}
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
              className={
                'inline-flex items-center gap-2 px-10 py-4 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
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

      <footer
        className={
          'py-8 text-center text-sm bg-surface text-on-surface-variant border-t border-outline-variant'
        }
      >
        <p>
          {t(
            'common.copyrightBuiltWithMolecule',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Built with Molecule.' },
          )}
        </p>
      </footer>
    </div>
  )
}
