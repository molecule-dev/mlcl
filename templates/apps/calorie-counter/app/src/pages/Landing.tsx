import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { SafeLink } from '../components/SafeLink.js'

interface FeatureCard {
  icon: string
  titleKey: string
  defaultTitle: string
  bodyKey: string
  defaultBody: string
}

const FEATURES: FeatureCard[] = [
  {
    icon: 'pie_chart',
    titleKey: 'nosh.landing.features.macros.title',
    defaultTitle: 'Macro tracking',
    bodyKey: 'nosh.landing.features.macros.body',
    defaultBody: 'Balance protein, carbs, and fat automatically.',
  },
  {
    icon: 'barcode_scanner',
    titleKey: 'nosh.landing.features.barcode.title',
    defaultTitle: 'Barcode scanner',
    bodyKey: 'nosh.landing.features.barcode.body',
    defaultBody: 'Scan over 3 million products instantly.',
  },
  {
    icon: 'blender',
    titleKey: 'nosh.landing.features.recipes.title',
    defaultTitle: 'Recipe builder',
    bodyKey: 'nosh.landing.features.recipes.body',
    defaultBody: 'Save your favorite meals for quick logging.',
  },
]

const CATEGORIES: { emoji: string; key: string; defaultLabel: string; tone: string }[] = [
  {
    emoji: '🍳',
    key: 'breakfast',
    defaultLabel: 'Breakfast',
    tone: 'bg-orange-50 border-orange-100 text-orange-800',
  },
  {
    emoji: '🥗',
    key: 'lunch',
    defaultLabel: 'Lunch',
    tone: 'bg-primary-container border-primary/20 text-on-primary-container',
  },
  {
    emoji: '🍝',
    key: 'dinner',
    defaultLabel: 'Dinner',
    tone: 'bg-indigo-50 border-indigo-100 text-indigo-800',
  },
  {
    emoji: '🥨',
    key: 'snacks',
    defaultLabel: 'Snacks',
    tone: 'bg-pink-50 border-pink-100 text-pink-800',
  },
  {
    emoji: '🥤',
    key: 'drinks',
    defaultLabel: 'Drinks',
    tone: 'bg-blue-50 border-blue-100 text-blue-800',
  },
  {
    emoji: '🍎',
    key: 'fruit',
    defaultLabel: 'Fruit',
    tone: 'bg-success-light border-green-100 text-success',
  },
  {
    emoji: '🥦',
    key: 'vegetables',
    defaultLabel: 'Vegetables',
    tone: 'bg-emerald-50 border-emerald-100 text-emerald-800',
  },
  {
    emoji: '🍗',
    key: 'protein',
    defaultLabel: 'Protein',
    tone: 'bg-purple-50 border-purple-100 text-purple-800',
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      className={cm.cn(
        'bg-surface text-on-surface antialiased selection:bg-primary selection:text-on-primary',
      )}
    >
      <nav
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 4),
          'fixed top-0 inset-x-0 z-50 bg-surface/80 backdrop-blur-md border-b border-primary-container shadow-sm',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            'max-w-7xl mx-auto h-16',
          )}
        >
          <SafeLink to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <BrandWordmark as="span" />
          </SafeLink>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'hidden md:flex')}>
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
            <Link
              to="/about"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/today"
                data-mol-id="nav-go-to-dashboard"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'bg-accent text-on-accent rounded-full hover:bg-accent/90 transition-colors shadow-sm',
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
                    cm.fontWeight('medium'),
                    'text-on-surface-variant hover:text-primary transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 2),
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    'bg-accent text-on-accent rounded-full hover:bg-accent/90 transition-colors shadow-sm',
                  )}
                >
                  {t('common.startFree', {}, { defaultValue: 'Start free' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className={cm.cn('pt-24 pb-16')}>
        {/* Hero */}
        <section
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 12),
            'max-w-7xl mx-auto md:py-24 grid md:grid-cols-2 gap-12 items-center',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'inline-flex w-fit rounded-full bg-primary-container text-on-primary-container',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-sm')}>
                stars
              </span>
              {t('nosh.landing.hero.eyebrow', {}, { defaultValue: 'Friendly calorie tracking' })}
            </span>
            <h1
              className={cm.cn(
                'font-extrabold',
                'text-5xl md:text-6xl tracking-tight text-on-surface leading-tight',
              )}
            >
              {t('nosh.landing.hero.title1', {}, { defaultValue: 'Every bite,' })}
              <br />
              <span className={cm.cn('text-primary')}>
                {t('nosh.landing.hero.title2', {}, { defaultValue: 'balanced.' })}
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                'text-on-surface-variant max-w-lg leading-relaxed',
              )}
            >
              {t(
                'nosh.landing.hero.body',
                {},
                {
                  defaultValue:
                    'A friendly food log that helps you hit your goals without the guilt. Focus on nourishment, not just numbers.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'sm:flex-row')}>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('lg'),
                  'bg-accent text-on-accent rounded-full hover:bg-accent/90 transition-colors shadow-md',
                )}
              >
                {t('nosh.landing.hero.primary', {}, { defaultValue: 'Get started — free' })}
              </Link>
              <a
                href="#features"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('lg'),
                  'rounded-full text-on-surface bg-surface border border-outline hover:bg-surface-variant transition-colors',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn('material-symbols-outlined text-primary')}
                >
                  play_circle
                </span>
                {t('nosh.landing.hero.secondary', {}, { defaultValue: 'See how it works' })}
              </a>
            </div>
            {/* Social proof — avatar cluster + member count */}
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                cm.textSize('sm'),
                'text-on-surface-variant pt-4',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center' }), '-space-x-2')}>
                {[
                  { initials: 'AK', tone: 'bg-teal-100 text-teal-700' },
                  { initials: 'JM', tone: 'bg-orange-100 text-orange-700' },
                  { initials: 'RS', tone: 'bg-indigo-100 text-indigo-700' },
                ].map((u) => (
                  <span
                    key={u.initials}
                    aria-hidden="true"
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'w-8 h-8 rounded-full border-2 border-white text-[10px] font-bold',
                      u.tone,
                    )}
                  >
                    {u.initials}
                  </span>
                ))}
              </div>
              <p>
                {t('nosh.landing.hero.join', {}, { defaultValue: 'Join ' })}
                <span className={cm.cn('font-bold text-on-surface tabular-nums')}>50,000+</span>
                {t('nosh.landing.hero.joinTail', {}, { defaultValue: ' happy users' })}
              </p>
            </div>
          </div>

          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'relative aspect-square max-w-md mx-auto w-full',
            )}
          >
            <div
              className={cm.cn(
                'absolute inset-0 bg-primary-container rounded-full blur-3xl opacity-50',
              )}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'relative w-72 h-72 rounded-full bg-surface shadow-xl border border-primary-container z-10',
              )}
            >
              <svg
                className={cm.cn('absolute inset-0 w-full h-full -rotate-90')}
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  r="45"
                  className={cm.cn('text-primary-container stroke-current')}
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  r="45"
                  className={cm.cn('text-primary stroke-current')}
                  strokeDasharray="283"
                  strokeDashoffset="100"
                  strokeLinecap="round"
                  strokeWidth="8"
                />
              </svg>
              <div className={cm.cn('text-center space-y-1')}>
                <p className={cm.cn('text-4xl font-black text-on-surface tabular-nums')}>1,247</p>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-on-surface-variant uppercase tracking-wide',
                  )}
                >
                  / 2,000 cal
                </p>
                <p className={cm.cn('text-primary font-semibold mt-2')}>
                  {t('nosh.landing.hero.remaining', {}, { defaultValue: 'Remaining' })}
                </p>
              </div>
            </div>

            {/* Floating meal cards — the design's orbiting log chips */}
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                'absolute top-10 -left-2 md:-left-6 bg-surface p-3 rounded-xl shadow-lg border border-outline z-20',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'w-10 h-10 rounded-full bg-accent-container text-accent',
                )}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined')}>coffee</span>
              </div>
              <div>
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
                  {t('nosh.landing.categories.breakfast', {}, { defaultValue: 'Breakfast' })}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
                  350 cal
                </p>
              </div>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                'absolute bottom-20 -right-2 md:-right-8 bg-surface p-3 rounded-xl shadow-lg border border-outline z-20',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'w-10 h-10 rounded-full bg-primary-container text-primary',
                )}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined')}>restaurant_menu</span>
              </div>
              <div>
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
                  {t('nosh.landing.categories.lunch', {}, { defaultValue: 'Lunch' })}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
                  403 cal
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section
          className={cm.cn('bg-gradient-to-r from-primary-dark to-primary py-12 text-white')}
        >
          <div
            className={cm.cn(
              cm.sp('px', 6),
              'max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:divide-x divide-white/30',
            )}
          >
            {[
              { value: '50,000+', key: 'users', defaultLabel: 'active users' },
              { value: '2.5M+', key: 'meals', defaultLabel: 'meals logged' },
              { value: '4.8 ★', key: 'rating', defaultLabel: 'App Store' },
            ].map((s) => (
              <div key={s.key} className={cm.cn('pt-6 md:pt-0')}>
                <p className={cm.cn('text-4xl font-black tabular-nums tracking-tight')}>
                  {s.value}
                </p>
                <p className={cm.cn('text-white/80 mt-2 font-medium')}>
                  {t(`nosh.landing.stats.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature grid */}
        <section
          id="features"
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 12), 'max-w-7xl mx-auto')}
        >
          <div
            className={cm.cn(
              cm.textCenter,
              cm.sp('mb', 12),
              cm.flex({ direction: 'col', gap: 'sm' }),
              'max-w-2xl mx-auto',
            )}
          >
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-3xl md:text-4xl tracking-tight text-on-surface',
              )}
            >
              {t(
                'nosh.landing.features.heading',
                {},
                { defaultValue: "Everything you need, nothing you don't" },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
              {t(
                'nosh.landing.features.body',
                {},
                {
                  defaultValue:
                    'Powerful tools designed to stay out of your way, so you can focus on enjoying your food.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-6')}>
            <div
              className={cm.cn(
                cm.sp('p', 8),
                'md:col-span-2 bg-surface-variant rounded-2xl border border-outline/50 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group',
              )}
            >
              <div
                className={cm.cn(
                  'absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity',
                )}
                aria-hidden="true"
              >
                <span
                  className={cm.cn('material-symbols-outlined text-9xl text-primary')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  donut_large
                </span>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.sp('mb', 6),
                  'relative z-10 w-12 h-12 bg-surface rounded-full text-primary shadow-sm',
                )}
              >
                <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                  donut_large
                </span>
              </div>
              <h3
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 2),
                  'text-on-surface relative z-10',
                )}
              >
                {t(
                  'nosh.landing.features.smartRing.title',
                  {},
                  { defaultValue: 'Smart Calorie Ring' },
                )}
              </h3>
              <p className={cm.cn('text-on-surface-variant relative z-10 max-w-md')}>
                {t(
                  'nosh.landing.features.smartRing.body',
                  {},
                  {
                    defaultValue:
                      'Our signature ring dynamically adjusts based on your activity, giving you a clear, visual snapshot of your day without making you do math.',
                  },
                )}
              </p>
            </div>
            {FEATURES.map((f) => (
              <div
                key={f.icon}
                className={cm.cn(
                  cm.sp('p', 8),
                  'bg-surface rounded-2xl border border-outline shadow-sm hover:shadow-md transition-shadow',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.sp('mb', 6),
                    'w-12 h-12 bg-primary-container rounded-full text-primary',
                  )}
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 2),
                    'text-on-surface',
                  )}
                >
                  {t(f.titleKey, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn('text-on-surface-variant')}>
                  {t(f.bodyKey, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
            {/* Double-width progress card with mini bar chart (design bento) */}
            <div
              className={cm.cn(
                cm.sp('p', 8),
                'md:col-span-2 bg-gradient-to-br from-primary-container to-surface rounded-2xl border border-primary/20 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center md:justify-between gap-6',
              )}
            >
              <div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.sp('mb', 6),
                    'w-12 h-12 bg-surface rounded-full text-primary shadow-sm',
                  )}
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                    insights
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 2),
                    'text-on-surface',
                  )}
                >
                  {t(
                    'nosh.landing.features.progress.title',
                    {},
                    { defaultValue: 'Progress charts' },
                  )}
                </h3>
                <p className={cm.cn('text-on-surface-variant max-w-sm')}>
                  {t(
                    'nosh.landing.features.progress.body',
                    {},
                    {
                      defaultValue:
                        'Visualize your journey with encouraging, non-judgmental trend lines over time.',
                    },
                  )}
                </p>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'end', justify: 'center', gap: 'xs' }),
                  'hidden md:flex w-32 h-24 bg-surface rounded-xl shadow-sm border border-outline p-2',
                )}
                aria-hidden="true"
              >
                <div className={cm.cn('w-4 bg-primary/20 rounded-t-sm h-8')} />
                <div className={cm.cn('w-4 bg-primary/30 rounded-t-sm h-12')} />
                <div className={cm.cn('w-4 bg-primary/40 rounded-t-sm h-10')} />
                <div className={cm.cn('w-4 bg-primary/60 rounded-t-sm h-16')} />
                <div className={cm.cn('w-4 bg-primary rounded-t-sm h-20')} />
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 6), 'max-w-7xl mx-auto overflow-hidden')}
        >
          <div className={cm.cn(cm.flex({ gap: 'sm' }), 'overflow-x-auto pb-4 hide-scrollbar')}>
            {CATEGORIES.map((c) => (
              <span
                key={c.key}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('medium'),
                  'flex-none rounded-full border',
                  c.tone,
                )}
              >
                <span aria-hidden="true">{c.emoji}</span>
                {t(`nosh.landing.categories.${c.key}`, {}, { defaultValue: c.defaultLabel })}
              </span>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 12), 'max-w-4xl mx-auto text-center')}
        >
          <div
            className={cm.cn(
              cm.sp('p', 12),
              'bg-primary-container rounded-3xl border border-primary/20 shadow-sm relative overflow-hidden',
            )}
          >
            <div
              className={cm.cn(
                'absolute -top-24 -right-24 w-64 h-64 bg-primary/30 rounded-full mix-blend-multiply blur-3xl opacity-50',
              )}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                'absolute -bottom-24 -left-24 w-64 h-64 bg-accent/30 rounded-full mix-blend-multiply blur-3xl opacity-50',
              )}
              aria-hidden="true"
            />
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'relative z-10')}>
              <h2
                className={cm.cn(
                  'font-black',
                  'text-4xl md:text-5xl text-on-surface tracking-tight',
                )}
              >
                {t('nosh.landing.cta.title', {}, { defaultValue: 'Start fueling smarter' })}
              </h2>
              <p className={cm.cn(cm.textSize('xl'), 'text-on-surface-variant max-w-xl mx-auto')}>
                {t(
                  'nosh.landing.cta.body',
                  { app: APP_NAME },
                  {
                    defaultValue:
                      'Get {{app}} free today and build a better relationship with your food.',
                  },
                )}
              </p>
              <div className={cm.cn(cm.flex({ justify: 'center', gap: 'sm' }))}>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    'bg-accent text-on-accent rounded-full hover:bg-accent/90 transition-colors shadow-sm',
                  )}
                >
                  {t('nosh.landing.cta.primary', {}, { defaultValue: 'Create your free account' })}
                </Link>
              </div>
              {/* Store badges — decorative chips per the design */}
              <div
                className={cm.cn(
                  cm.flex({ justify: 'center', align: 'center', gap: 'md' }),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant pt-2',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-lg border border-outline bg-surface',
                  )}
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-lg')}>
                    ios
                  </span>
                  {t('nosh.landing.cta.appStore', {}, { defaultValue: 'App Store' })}
                </span>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-lg border border-outline bg-surface',
                  )}
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-lg')}>
                    android
                  </span>
                  {t('nosh.landing.cta.playStore', {}, { defaultValue: 'Google Play' })}
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 12),
          'bg-primary-container border-t border-primary/20',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'between', align: 'center', gap: 'lg' }),
            'max-w-7xl mx-auto md:flex-row',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
              'md:items-start',
            )}
          >
            <BrandWordmark as="span" footer />
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'nosh.landing.footer.tagline',
                { app: APP_NAME, tagline: APP_TAGLINE },
                { defaultValue: '© {{app}} — {{tagline}}.' },
              )}
            </p>
          </div>
          <div
            className={cm.cn(
              cm.flex({ wrap: 'wrap', justify: 'center', gap: 'lg' }),
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            <Link to="/about" className={cm.cn('hover:text-primary transition-colors')}>
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            <Link to="/pricing" className={cm.cn('hover:text-primary transition-colors')}>
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link to="/terms" className={cm.cn('hover:text-primary transition-colors')}>
              {t('nav.terms', {}, { defaultValue: 'Terms' })}
            </Link>
            <Link to="/privacy" className={cm.cn('hover:text-primary transition-colors')}>
              {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            </Link>
            <Link to="/login" className={cm.cn('hover:text-primary transition-colors')}>
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link to="/signup" className={cm.cn('hover:text-primary transition-colors')}>
              {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
