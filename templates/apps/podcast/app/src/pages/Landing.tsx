import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

/**
 * Landing — translated from reference/flagship-apps-designs/design-podcast-landing.html
 * ("Wavelength"): orange-on-warm-paper broadcast identity. Fixed blurred nav
 * with an icon brand mark and active-link underline, a hero with a
 * "Premium Audio" badge pill, huge Sora headline with the italic-orange
 * accent line, dark pill CTA + listener avatars, and a rotated glass
 * episode card with progress bar and floating chips over concentric rings;
 * an "Editor's Picks" 4-card grid; a categories + trending bento; a violet
 * creator banner; and a mono-uppercase multi-column footer with a
 * mini-player chip. Show/episode covers render as gradient stand-ins from
 * the existing `--color-cover-*` artwork tokens (no raster assets ship with
 * the template).
 */

const PICKS = [
  {
    key: 'creative-code',
    cover: 'var(--color-cover-1)',
    categoryKey: 'landing.pick.cat.design',
    categoryDefault: 'Design & Tech',
    categoryTint: 'text-accent',
    titleKey: 'landing.pick.creativeCode.title',
    titleDefault: 'The Creative Code',
    authorKey: 'landing.pick.creativeCode.author',
    authorDefault: 'by Sarah Jenkins',
  },
  {
    key: 'night-owls',
    cover: 'var(--color-cover-4)',
    categoryKey: 'landing.pick.cat.comedy',
    categoryDefault: 'Comedy',
    categoryTint: 'text-primary',
    titleKey: 'landing.pick.nightOwls.title',
    titleDefault: 'Late Night Owls',
    authorKey: 'landing.pick.nightOwls.author',
    authorDefault: 'by The Comedy Crew',
  },
  {
    key: 'orbital',
    cover: 'var(--color-cover-2)',
    categoryKey: 'landing.pick.cat.science',
    categoryDefault: 'Science',
    categoryTint: 'text-info',
    titleKey: 'landing.pick.orbital.title',
    titleDefault: 'Orbital Mechanics',
    authorKey: 'landing.pick.orbital.author',
    authorDefault: 'by Dr. E. Vance',
  },
  {
    key: 'market-movers',
    cover: 'var(--color-cover-7)',
    categoryKey: 'landing.pick.cat.business',
    categoryDefault: 'Business',
    categoryTint: 'text-success',
    titleKey: 'landing.pick.marketMovers.title',
    titleDefault: 'Market Movers',
    authorKey: 'landing.pick.marketMovers.author',
    authorDefault: 'by Financial Times',
  },
] as const

const CATEGORIES = [
  {
    key: 'news',
    label: 'News',
    icon: 'newspaper',
    cover: 'var(--color-cover-11)',
    overlay: 'from-black/80 via-black/30 to-transparent',
  },
  {
    key: 'comedy',
    label: 'Comedy',
    icon: 'theater_comedy',
    cover: 'var(--color-cover-5)',
    overlay: '',
  },
  {
    key: 'true-crime',
    label: 'True Crime',
    icon: 'dark_mode',
    cover: 'var(--color-cover-4)',
    overlay: 'from-black/80 via-black/30 to-transparent',
  },
  {
    key: 'business',
    label: 'Business',
    icon: 'trending_up',
    cover: 'var(--color-cover-9)',
    overlay: '',
  },
  {
    key: 'science',
    label: 'Science',
    icon: 'science',
    cover: 'var(--color-cover-2)',
    overlay: 'from-black/80 via-black/30 to-transparent',
  },
  {
    key: 'society',
    label: 'Society',
    icon: 'groups',
    cover: 'var(--color-cover-0)',
    overlay: '',
  },
] as const

const TRENDING = [
  {
    rank: 1,
    cover: 'var(--color-cover-0)',
    icon: null,
    titleDefault: 'Echoes of the Valley',
    subDefault: 'True Crime Weekly',
  },
  {
    rank: 2,
    cover: null,
    icon: 'science',
    titleDefault: 'Daily Science',
    subDefault: 'Dr. Vance',
  },
  {
    rank: 3,
    cover: 'var(--color-cover-4)',
    icon: null,
    titleDefault: 'Late Night Owls',
    subDefault: 'Comedy Central',
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
          'sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-outline-variant shadow-sm transition-all duration-300'
        }
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
            'flex-wrap gap-x-6 gap-y-2',
          )}
        >
          <BrandWordmark size="lg" />
          <div
            className={cm.cn(
              'hidden md:flex items-center gap-8 text-sm font-medium tracking-tight',
            )}
          >
            <Link
              to="/discover"
              className={
                'text-primary border-b-2 border-primary pb-1 active:scale-95 transition-transform'
              }
            >
              {t('landing.nav.discover', {}, { defaultValue: 'Discover' })}
            </Link>
            <Link
              to="/search"
              className={
                'text-on-surface-variant hover:text-primary transition-colors duration-300 active:scale-95'
              }
            >
              {t('landing.nav.search', {}, { defaultValue: 'Search' })}
            </Link>
            <Link
              to="/pricing"
              className={
                'text-on-surface-variant hover:text-primary transition-colors duration-300 active:scale-95'
              }
            >
              {t('landing.nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/discover"
                data-mol-id="nav-go-to-dashboard"
                className={
                  'flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary text-sm font-semibold shadow-md hover:shadow-lg hover:bg-primary-hover transition-all active:scale-95'
                }
              >
                <span className={'material-symbols-outlined text-[18px]'} aria-hidden="true">
                  play_arrow
                </span>
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={
                    'hidden md:block text-sm font-medium text-on-surface hover:text-primary transition-colors'
                  }
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={
                    'flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary text-sm font-semibold shadow-md hover:shadow-lg hover:bg-primary-hover transition-all active:scale-95'
                  }
                >
                  <span className={'material-symbols-outlined text-[18px]'} aria-hidden="true">
                    play_arrow
                  </span>
                  {t('landing.getStarted', {}, { defaultValue: 'Try free' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — warm gradient, concentric rings, badge, glass episode card */}
        <section className="relative pt-16 pb-24 overflow-hidden">
          <div
            className={
              'absolute inset-0 -z-10 bg-gradient-to-br from-background via-background to-primary-light/40'
            }
            aria-hidden="true"
          />
          <div
            className={
              'absolute top-1/2 right-[-10%] -translate-y-1/2 w-[800px] h-[800px] rounded-full border-[40px] border-primary/5 -z-10'
            }
            aria-hidden="true"
          />
          <div
            className={
              'absolute top-1/2 right-[0%] -translate-y-1/2 w-[600px] h-[600px] rounded-full border-[30px] border-primary/10 -z-10'
            }
            aria-hidden="true"
          />
          <div
            className={
              'absolute top-1/2 right-[10%] -translate-y-1/2 w-[400px] h-[400px] rounded-full border-[20px] border-primary/20 -z-10'
            }
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'grid grid-cols-1 md:grid-cols-2 gap-12 items-center',
            )}
          >
            <div className={'space-y-8 z-10'}>
              <div
                className={cm.cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-outline-variant shadow-sm text-xs font-semibold text-accent uppercase tracking-wider',
                )}
              >
                <span className={'material-symbols-outlined text-[14px]'} aria-hidden="true">
                  new_releases
                </span>
                {t('landing.premiumBadge', {}, { defaultValue: 'Introducing Premium Audio' })}
              </div>
              <h1
                className={
                  'text-5xl md:text-[64px] lg:text-[72px] font-extrabold leading-[1.1] tracking-tight'
                }
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                {t('landing.heroLine1', {}, { defaultValue: 'Tune into' })}
                <br />
                <span className={'text-primary italic pr-4'}>
                  {t('landing.heroLine2', {}, { defaultValue: 'every story.' })}
                </span>
              </h1>
              <p className={'text-xl text-on-surface-variant max-w-lg leading-relaxed'}>
                {t(
                  'landing.heroSubtitle',
                  { app: APP_NAME },
                  {
                    defaultValue:
                      'Experience broadcast-warm, cinematic soundscapes. {{app}} curates pro-quality podcasts for the immersive listener — with transcripts and chapters on every episode.',
                  },
                )}
              </p>
              <div className={cm.cn(cm.flex({ gap: 'md' }), 'flex-col sm:flex-row gap-4 pt-4')}>
                <Link
                  to="/signup"
                  data-mol-id="hero-cta"
                  className={
                    'flex items-center justify-center gap-3 px-8 py-4 rounded-full font-semibold bg-on-surface text-background shadow-xl hover:shadow-2xl hover:bg-black transition-all active:scale-95'
                  }
                >
                  <span className={'material-symbols-outlined'} aria-hidden="true">
                    explore
                  </span>
                  {t('landing.heroCta', {}, { defaultValue: 'Start listening — free' })}
                </Link>
                <Link
                  to="/login"
                  className={
                    'flex items-center justify-center gap-3 px-8 py-4 rounded-full font-semibold bg-surface border border-outline-variant text-on-surface shadow-sm hover:shadow-md transition-all active:scale-95'
                  }
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  'items-center gap-4 pt-8 border-t border-outline-variant/60 max-w-sm',
                )}
              >
                <div className={'flex -space-x-3'}>
                  {['var(--color-cover-1)', 'var(--color-cover-5)', 'var(--color-cover-2)'].map(
                    (cover, i) => (
                      <span
                        key={i}
                        className={'w-10 h-10 rounded-full border-2 border-surface shadow-sm'}
                        style={{ background: cover }}
                        aria-hidden="true"
                      />
                    ),
                  )}
                </div>
                <p className={'text-sm text-on-surface-variant font-medium'}>
                  {t(
                    'landing.listenersLine',
                    { app: APP_NAME },
                    { defaultValue: 'Join 2M+ listeners on {{app}} today.' },
                  )}
                </p>
              </div>
            </div>

            {/* Floating glass episode card + decorative chips */}
            <div className={'relative z-10 hidden md:block'}>
              <div
                className={
                  'glass-card p-6 rounded-2xl shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500 max-w-sm mx-auto'
                }
              >
                <div
                  className={
                    'w-full aspect-square rounded-xl shadow-lg mb-6 flex items-center justify-center'
                  }
                  style={{ background: 'var(--color-cover-0)' }}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined text-7xl text-white/85">
                    graphic_eq
                  </span>
                </div>
                <div className={cm.cn(cm.flex({ justify: 'between', align: 'end' }), 'mb-4')}>
                  <div className={'min-w-0'}>
                    <p className={'text-xs font-bold text-accent uppercase tracking-widest mb-1'}>
                      {t('landing.cardCategory', {}, { defaultValue: 'True Crime' })}
                    </p>
                    <h3
                      className={'font-bold text-xl leading-tight truncate'}
                      style={{ fontFamily: 'var(--font-headline)' }}
                    >
                      {t(
                        'landing.cardTitle',
                        {},
                        { defaultValue: 'When clock skew broke our payment processor' },
                      )}
                    </h3>
                    <p className={'text-sm text-on-surface-variant mt-1 font-mono'}>
                      {t(
                        'landing.cardEpisode',
                        {},
                        { defaultValue: 'Ep 42 · Cortex Media · 45:20' },
                      )}
                    </p>
                  </div>
                  <span
                    className={
                      'w-12 h-12 shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg hover:scale-105 transition-transform'
                    }
                    aria-hidden="true"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      play_arrow
                    </span>
                  </span>
                </div>
                <div className={'w-full bg-outline-variant rounded-full h-1.5 mt-2'}>
                  <div className={'bg-primary h-1.5 rounded-full w-[45%]'} />
                </div>
              </div>
              <div
                className={
                  'absolute -top-6 -right-6 glass-card p-4 rounded-xl shadow-lg rotate-[-5deg]'
                }
                aria-hidden="true"
              >
                <span className={'material-symbols-outlined text-accent text-3xl'}>headphones</span>
              </div>
              <div
                className={
                  'absolute -bottom-10 -left-10 bg-surface p-4 rounded-2xl shadow-xl rotate-[5deg] flex items-center gap-3'
                }
              >
                <span
                  className={
                    'w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary'
                  }
                  aria-hidden="true"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                </span>
                <div>
                  <p className={'font-bold text-sm'}>
                    {t('landing.topRatedTitle', {}, { defaultValue: 'Top Rated' })}
                  </p>
                  <p className={'text-xs text-on-surface-variant'}>
                    {t('landing.topRatedSub', {}, { defaultValue: 'Audio Quality' })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Editor's Picks */}
        <section className="py-20 bg-surface">
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6))}>
            <div className={cm.cn(cm.flex({ justify: 'between', align: 'end' }), 'mb-10')}>
              <div>
                <h2
                  className={'font-bold text-3xl mb-2'}
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  {t('landing.picksHeading', {}, { defaultValue: "Editor's Picks" })}
                </h2>
                <p className={'text-on-surface-variant'}>
                  {t('landing.picksSub', {}, { defaultValue: 'Hand-selected audio experiences.' })}
                </p>
              </div>
              <Link
                to="/discover"
                className={
                  'text-primary font-semibold text-sm hover:underline flex items-center gap-1'
                }
              >
                {t('landing.viewAll', {}, { defaultValue: 'View all' })}
                <span className={'material-symbols-outlined text-[16px]'} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
            <div className={'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'}>
              {PICKS.map((pick) => (
                <Link
                  key={pick.key}
                  to="/discover"
                  className={
                    'group relative bg-background-secondary rounded-xl p-4 border border-outline-variant/60 hover:shadow-xl transition-all duration-300'
                  }
                >
                  <div className={'relative mb-4 overflow-hidden rounded-xl'}>
                    <div
                      className={
                        'w-full aspect-square group-hover:scale-105 transition-transform duration-500 flex items-center justify-center'
                      }
                      style={{ background: pick.cover }}
                      aria-hidden="true"
                    >
                      <span className="material-symbols-outlined text-5xl text-white/80">
                        podcasts
                      </span>
                    </div>
                    <div
                      className={
                        'absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center'
                      }
                    >
                      <span
                        className={
                          'w-14 h-14 rounded-full bg-surface/90 text-primary flex items-center justify-center shadow-lg translate-y-4 group-hover:translate-y-0 transition-all duration-300'
                        }
                        aria-hidden="true"
                      >
                        <span
                          className="material-symbols-outlined text-3xl"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          play_arrow
                        </span>
                      </span>
                    </div>
                  </div>
                  <p
                    className={cm.cn(
                      'text-xs font-semibold uppercase tracking-wider mb-1',
                      pick.categoryTint,
                    )}
                  >
                    {t(pick.categoryKey, {}, { defaultValue: pick.categoryDefault })}
                  </p>
                  <h3
                    className={
                      'font-bold text-lg leading-tight mb-1 truncate group-hover:text-primary transition-colors'
                    }
                    style={{ fontFamily: 'var(--font-headline)' }}
                  >
                    {t(pick.titleKey, {}, { defaultValue: pick.titleDefault })}
                  </h3>
                  <p className={'text-sm text-on-surface-variant'}>
                    {t(pick.authorKey, {}, { defaultValue: pick.authorDefault })}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Categories & trending bento */}
        <section className="py-20 bg-background">
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6))}>
            <div className={'grid grid-cols-1 lg:grid-cols-3 gap-8'}>
              <div className={'lg:col-span-2'}>
                <h2
                  className={'font-bold text-2xl mb-6'}
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  {t('landing.categoriesHeading', {}, { defaultValue: 'Explore by category' })}
                </h2>
                <div className={'grid grid-cols-2 md:grid-cols-3 gap-4'}>
                  {CATEGORIES.map((cat) => (
                    <Link
                      key={cat.key}
                      to="/discover"
                      className={
                        'group relative h-32 rounded-xl overflow-hidden flex items-end p-4 shadow-sm hover:shadow-md transition-shadow'
                      }
                    >
                      <div
                        className={'absolute inset-0'}
                        style={{ background: cat.cover }}
                        aria-hidden="true"
                      />
                      {cat.overlay ? (
                        <div
                          className={cm.cn('absolute inset-0 bg-gradient-to-t', cat.overlay)}
                          aria-hidden="true"
                        />
                      ) : null}
                      <span
                        className={
                          'relative z-10 text-white font-semibold text-lg group-hover:scale-105 transition-transform origin-left'
                        }
                        style={{ fontFamily: 'var(--font-headline)' }}
                      >
                        {t(`landing.cat.${cat.key}`, {}, { defaultValue: cat.label })}
                      </span>
                      <span
                        className={
                          'material-symbols-outlined absolute top-4 right-4 text-white/30 text-4xl'
                        }
                        aria-hidden="true"
                      >
                        {cat.icon}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
              <div
                className={'bg-surface rounded-xl p-6 border border-outline-variant/60 shadow-sm'}
              >
                <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), 'mb-6')}>
                  <h2
                    className={'font-bold text-2xl'}
                    style={{ fontFamily: 'var(--font-headline)' }}
                  >
                    {t('landing.trendingHeading', {}, { defaultValue: 'Top 10 Trending' })}
                  </h2>
                  <span className={'material-symbols-outlined text-primary'} aria-hidden="true">
                    local_fire_department
                  </span>
                </div>
                <ul className={'space-y-4'}>
                  {TRENDING.map((item) => (
                    <li key={item.rank}>
                      <Link
                        to="/discover"
                        className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'group')}
                      >
                        <span
                          className={
                            'font-bold text-xl text-on-surface-variant w-6 text-center group-hover:text-primary transition-colors'
                          }
                          style={{ fontFamily: 'var(--font-headline)' }}
                        >
                          {item.rank}
                        </span>
                        {item.cover ? (
                          <span
                            className={
                              'w-12 h-12 rounded-lg shrink-0 flex items-center justify-center'
                            }
                            style={{ background: item.cover }}
                            aria-hidden="true"
                          >
                            <span
                              className="material-symbols-outlined text-lg text-white/80"
                              aria-hidden="true"
                            >
                              graphic_eq
                            </span>
                          </span>
                        ) : (
                          <span
                            className={
                              'w-12 h-12 rounded-lg shrink-0 bg-surface-container-high flex items-center justify-center text-on-surface-variant'
                            }
                            aria-hidden="true"
                          >
                            <span className="material-symbols-outlined text-lg">{item.icon}</span>
                          </span>
                        )}
                        <span className={'flex-1 min-w-0'}>
                          <span
                            className={
                              'block font-semibold text-sm truncate group-hover:text-primary transition-colors'
                            }
                          >
                            {t(
                              `landing.trending.${item.rank}.title`,
                              {},
                              {
                                defaultValue: item.titleDefault,
                              },
                            )}
                          </span>
                          <span className={'block text-xs text-on-surface-variant truncate'}>
                            {t(
                              `landing.trending.${item.rank}.sub`,
                              {},
                              {
                                defaultValue: item.subDefault,
                              },
                            )}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link
                      to="/search"
                      className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'group')}
                    >
                      <span
                        className={
                          'font-bold text-xl text-on-surface-variant w-6 text-center group-hover:text-primary transition-colors'
                        }
                        style={{ fontFamily: 'var(--font-headline)' }}
                      >
                        4
                      </span>
                      <span
                        className={
                          'w-12 h-12 rounded-lg shrink-0 bg-surface-container-high flex items-center justify-center text-on-surface-variant'
                        }
                        aria-hidden="true"
                      >
                        <span className="material-symbols-outlined">more_horiz</span>
                      </span>
                      <span
                        className={
                          'text-sm text-on-surface-variant font-medium group-hover:text-primary transition-colors'
                        }
                      >
                        {t(
                          'landing.trending.viewFullChart',
                          {},
                          { defaultValue: 'View full chart' },
                        )}
                      </span>
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Creator banner */}
        <section className="py-24 px-6">
          <div
            className={
              'max-w-5xl mx-auto rounded-3xl overflow-hidden relative shadow-2xl bg-gradient-to-r from-accent to-violet-900'
            }
          >
            <div
              className={'absolute inset-0 opacity-20 pointer-events-none'}
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 150%, var(--color-surface) 0%, transparent 50%),' +
                  'radial-gradient(circle at 80% -50%, var(--color-primary) 0%, transparent 50%)',
              }}
              aria-hidden="true"
            />
            <div
              className={
                'relative z-10 px-8 py-16 md:px-16 md:py-20 flex flex-col md:flex-row items-center justify-between gap-10'
              }
            >
              <div className={'text-white max-w-xl'}>
                <span
                  className={
                    'inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold tracking-wider uppercase mb-4 backdrop-blur-sm'
                  }
                >
                  {t('landing.forCreators', {}, { defaultValue: 'For Creators' })}
                </span>
                <h2
                  className={'font-extrabold text-4xl md:text-5xl mb-4 leading-tight'}
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  {t('landing.creatorHeading', {}, { defaultValue: 'Start your own show.' })}
                </h2>
                <p className={'text-white/80 text-lg mb-8 leading-relaxed'}>
                  {t(
                    'landing.creatorBody',
                    { app: APP_NAME },
                    {
                      defaultValue:
                        'Join thousands of independent creators producing broadcast-quality audio. Host, distribute, and monetize your passion on {{app}}.',
                    },
                  )}
                </p>
                <Link
                  to="/signup"
                  data-mol-id="cta-creator"
                  className={
                    'inline-flex items-center gap-2 bg-surface text-accent px-8 py-4 rounded-full font-bold shadow-lg hover:shadow-xl transition-all active:scale-95'
                  }
                >
                  <span className={'material-symbols-outlined'} aria-hidden="true">
                    mic
                  </span>
                  {t('landing.creatorCta', {}, { defaultValue: 'Create Studio Account' })}
                </Link>
              </div>
              <div className={'hidden md:block w-64 h-64 relative'} aria-hidden="true">
                <div className={'absolute inset-0 bg-white/10 rounded-full blur-2xl'} />
                <div
                  className={
                    'w-full h-full border border-white/20 rounded-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/20 backdrop-blur-md shadow-2xl'
                  }
                >
                  <span
                    className="material-symbols-outlined text-white text-[120px] drop-shadow-lg"
                    aria-hidden="true"
                  >
                    podcasts
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer
        className={'w-full py-12 px-8 bg-background-secondary border-t border-outline-variant'}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            'grid grid-cols-2 md:grid-cols-4 gap-8 mb-12',
          )}
        >
          <div className={'col-span-2 md:col-span-1'}>
            <Link
              to="/"
              className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'items-center gap-2 mb-4')}
            >
              <BrandWordmark as="span" size="sm" footer />
            </Link>
          </div>
          <div
            className={
              'flex flex-col gap-3 font-mono text-xs uppercase tracking-widest text-on-surface-variant'
            }
          >
            <h4 className={'font-bold text-on-surface mb-2'}>
              {t('landing.footer.platform', {}, { defaultValue: 'Platform' })}
            </h4>
            <Link
              to="/about"
              className={'hover:text-primary underline transition-all hover:opacity-80'}
            >
              {t('about.eyebrow', {}, { defaultValue: 'About' })}
            </Link>
            <Link
              to="/discover"
              className={'hover:text-primary underline transition-all hover:opacity-80'}
            >
              {t('landing.nav.discover', {}, { defaultValue: 'Discover' })}
            </Link>
            <Link
              to="/pricing"
              className={'hover:text-primary underline transition-all hover:opacity-80'}
            >
              {t('landing.nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
          </div>
          <div
            className={
              'flex flex-col gap-3 font-mono text-xs uppercase tracking-widest text-on-surface-variant'
            }
          >
            <h4 className={'font-bold text-on-surface mb-2'}>
              {t('landing.footer.legal', {}, { defaultValue: 'Legal' })}
            </h4>
            <Link
              to="/privacy"
              className={'hover:text-primary underline transition-all hover:opacity-80'}
            >
              {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            </Link>
            <Link
              to="/terms"
              className={'hover:text-primary underline transition-all hover:opacity-80'}
            >
              {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            </Link>
          </div>
          <div
            className={
              'flex flex-col gap-3 font-mono text-xs uppercase tracking-widest text-on-surface-variant'
            }
          >
            <h4 className={'font-bold text-on-surface mb-2'}>
              {t('landing.footer.connect', {}, { defaultValue: 'Connect' })}
            </h4>
            <Link
              to="/about"
              className={'hover:text-primary underline transition-all hover:opacity-80'}
            >
              {t('landing.footer.support', {}, { defaultValue: 'Support' })}
            </Link>
          </div>
        </div>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.flex({ justify: 'between', align: 'center' }),
            'pt-8 border-t border-outline-variant flex-col md:flex-row gap-4',
          )}
        >
          {/* App-scoped key: the shared `common.copyrightBuiltWithMolecule`
              already contains ". Built with Molecule.dev", which duplicated
              the sibling link below. */}
          <p className={'font-mono text-xs uppercase tracking-widest text-on-surface-variant'}>
            {t(
              'landing.copyright',
              { year, app: APP_NAME },
              { defaultValue: '© {{year}} {{app}}' },
            )}
            {' — Built with '}
            <a
              href="https://molecule.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-medium normal-case"
            >
              Molecule.dev
            </a>
          </p>
          {/* Persistent mini-player chip (decorative on the marketing page) */}
          <div
            className={
              'hidden md:flex items-center gap-4 bg-surface px-4 py-2 rounded-full border border-outline-variant shadow-sm'
            }
            aria-hidden="true"
          >
            <div className={'flex items-center gap-2'}>
              <span
                className={
                  'w-8 h-8 rounded bg-primary flex items-center justify-center text-on-primary'
                }
              >
                <span className="material-symbols-outlined text-sm">play_arrow</span>
              </span>
              <div>
                <p
                  className={
                    'text-[10px] font-bold uppercase tracking-wider text-on-surface leading-none'
                  }
                >
                  {t('landing.nowPlayingBadge', {}, { defaultValue: 'Now Playing' })}
                </p>
                <p className={'text-xs text-on-surface-variant font-mono leading-none mt-1'}>
                  00:12:45
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
