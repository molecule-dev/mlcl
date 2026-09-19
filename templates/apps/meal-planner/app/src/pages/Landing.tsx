import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
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
    icon: 'menu_book',
    titleKey: 'simmer.landing.features.recipes.title',
    defaultTitle: 'Recipe box',
    bodyKey: 'simmer.landing.features.recipes.body',
    defaultBody: 'Your recipes and a starter catalog, searchable by tag and total time.',
  },
  {
    icon: 'shopping_cart',
    titleKey: 'simmer.landing.features.groceries.title',
    defaultTitle: 'Self-writing grocery list',
    bodyKey: 'simmer.landing.features.groceries.body',
    defaultBody: 'Ingredients scaled and merged across the week, grouped by aisle.',
  },
  {
    icon: 'kitchen',
    titleKey: 'simmer.landing.features.pantry.title',
    defaultTitle: 'Pantry memory',
    bodyKey: 'simmer.landing.features.pantry.body',
    defaultBody: 'Flags what you already have so you stop re-buying staples.',
  },
]

const AISLES: { emoji: string; key: string; defaultLabel: string; tone: string }[] = [
  {
    emoji: '🥬',
    key: 'produce',
    defaultLabel: 'Produce',
    tone: 'bg-primary-container border-primary/20 text-on-primary-container',
  },
  {
    emoji: '🍗',
    key: 'meat',
    defaultLabel: 'Meat',
    tone: 'bg-orange-50 border-orange-100 text-orange-800',
  },
  {
    emoji: '🐟',
    key: 'seafood',
    defaultLabel: 'Seafood',
    tone: 'bg-blue-50 border-blue-100 text-blue-800',
  },
  {
    emoji: '🥛',
    key: 'dairy',
    defaultLabel: 'Dairy & eggs',
    tone: 'bg-yellow-50 border-yellow-100 text-yellow-800',
  },
  {
    emoji: '🥖',
    key: 'bakery',
    defaultLabel: 'Bakery',
    tone: 'bg-amber-50 border-amber-100 text-amber-800',
  },
  {
    emoji: '🥫',
    key: 'pantry',
    defaultLabel: 'Pantry',
    tone: 'bg-slate-50 border-slate-100 text-slate-700',
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
          <SafeLink
            to="/"
            data-mol-id="landing-nav-brand"
            className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-primary')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              soup_kitchen
            </span>
            <span className={cm.cn(cm.fontWeight('bold'), 'text-2xl text-primary tracking-tight')}>
              {APP_NAME}
            </span>
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
                to="/plan"
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
              {t('simmer.landing.hero.eyebrow', {}, { defaultValue: 'Weekly meal planning' })}
            </span>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-5xl md:text-6xl tracking-tight text-on-surface leading-tight',
              )}
            >
              {t('simmer.landing.hero.title1', {}, { defaultValue: 'Cook less.' })}
              <br />
              <span className={cm.cn('text-primary')}>
                {t('simmer.landing.hero.title2', {}, { defaultValue: 'Plan once.' })}
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                'text-on-surface-variant max-w-lg leading-relaxed',
              )}
            >
              {t(
                'simmer.landing.hero.body',
                {},
                {
                  defaultValue:
                    'Save the recipes you love, drop them onto the week, and shop from a grocery list that writes itself. The 5pm dinner panic is over.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'sm:flex-row')}>
              <Link
                to="/signup"
                data-mol-id="landing-cta-signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('lg'),
                  'bg-accent text-on-accent rounded-full hover:bg-accent/90 transition-colors shadow-md',
                )}
              >
                {t('simmer.landing.hero.primary', {}, { defaultValue: 'Get started — free' })}
              </Link>
              <a
                href="#features"
                data-mol-id="landing-cta-features"
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
                {t('simmer.landing.hero.secondary', {}, { defaultValue: 'See how it works' })}
              </a>
            </div>
          </div>

          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'relative max-w-md mx-auto w-full',
            )}
          >
            <div
              className={cm.cn(
                'absolute inset-0 bg-primary-container rounded-full blur-3xl opacity-50',
              )}
              aria-hidden="true"
            />
            {/* Mini week preview — a static echo of the real plan grid. */}
            <div
              className={cm.cn(
                'relative z-10 w-full bg-surface rounded-2xl shadow-xl border border-primary-container p-5',
              )}
            >
              <div
                className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
              >
                <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                  {t('simmer.landing.hero.cardTitle', {}, { defaultValue: 'This week' })}
                </p>
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'rounded-full bg-primary-container text-on-primary-container',
                  )}
                >
                  {t('simmer.landing.hero.cardBadge', {}, { defaultValue: '7 dinners planned' })}
                </span>
              </div>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                {(
                  [
                    { emoji: '🍝', label: 'Mon' },
                    { emoji: '🍗', label: 'Tue' },
                    { emoji: '🌮', label: 'Wed' },
                    { emoji: '🐟', label: 'Thu' },
                  ] as const
                ).map((row) => (
                  <div
                    key={row.label}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'rounded-lg bg-surface-variant/60',
                    )}
                  >
                    <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant w-8')}>
                      {row.label}
                    </span>
                    <span aria-hidden="true">{row.emoji}</span>
                    <span className={cm.cn('flex-1 h-2 rounded-full bg-primary/20')} />
                    <span
                      aria-hidden="true"
                      className={cm.cn('material-symbols-outlined text-base text-primary')}
                    >
                      check_circle
                    </span>
                  </div>
                ))}
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('mt', 4),
                  cm.sp('pt', 4),
                  'border-t border-outline/40',
                )}
              >
                <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('simmer.landing.hero.listHint', {}, { defaultValue: 'Grocery list ready' })}
                </span>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'text-primary',
                  )}
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                    shopping_cart
                  </span>
                  23
                </span>
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
              { value: '50,000+', key: 'households', defaultLabel: 'households planning' },
              { value: '3.2M', key: 'meals', defaultLabel: 'meals planned' },
              { value: '4h', key: 'saved', defaultLabel: 'saved per week on average' },
            ].map((s) => (
              <div key={s.key} className={cm.cn('pt-6 md:pt-0')}>
                <p className={cm.cn('text-4xl font-black tabular-nums tracking-tight')}>
                  {s.value}
                </p>
                <p className={cm.cn('text-white/80 mt-2 font-medium')}>
                  {t(`simmer.landing.stats.${s.key}`, {}, { defaultValue: s.defaultLabel })}
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
                'simmer.landing.features.heading',
                {},
                { defaultValue: 'From recipe box to shopping cart' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
              {t(
                'simmer.landing.features.body',
                {},
                {
                  defaultValue:
                    'One calm loop: save a recipe, plan it onto the week, shop the list it generates, tick items off.',
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
                  calendar_month
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
                  calendar_month
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
                  'simmer.landing.features.weekGrid.title',
                  {},
                  { defaultValue: 'The week on one screen' },
                )}
              </h3>
              <p className={cm.cn('text-on-surface-variant relative z-10 max-w-md')}>
                {t(
                  'simmer.landing.features.weekGrid.body',
                  {},
                  {
                    defaultValue:
                      'A seven-day grid with breakfast, lunch, and dinner slots. Drop a recipe into any slot, scale it to your household, and swap days around as plans change — the grocery list keeps up automatically.',
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
          </div>
        </section>

        {/* Aisles */}
        <section
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 6), 'max-w-7xl mx-auto overflow-hidden')}
        >
          <div className={cm.cn(cm.flex({ gap: 'sm' }), 'overflow-x-auto pb-4 hide-scrollbar')}>
            {AISLES.map((c) => (
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
                {t(`simmer.landing.aisles.${c.key}`, {}, { defaultValue: c.defaultLabel })}
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
                  cm.fontWeight('bold'),
                  'text-4xl md:text-5xl text-on-surface tracking-tight',
                )}
              >
                {t(
                  'simmer.landing.cta.title',
                  {},
                  { defaultValue: 'This week, planned in five minutes' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('xl'), 'text-on-surface-variant max-w-xl mx-auto')}>
                {t(
                  'simmer.landing.cta.body',
                  { app: APP_NAME },
                  {
                    defaultValue: 'Get {{app}} free today and take the deciding out of dinner.',
                  },
                )}
              </p>
              <div className={cm.cn(cm.flex({ justify: 'center', gap: 'sm' }))}>
                <Link
                  to="/signup"
                  data-mol-id="landing-cta-bottom-signup"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    'bg-accent text-on-accent rounded-full hover:bg-accent/90 transition-colors shadow-sm',
                  )}
                >
                  {t(
                    'simmer.landing.cta.primary',
                    {},
                    { defaultValue: 'Create your free account' },
                  )}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 12),
          'bg-surface-secondary border-t border-primary-container',
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
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                cm.textSize('xl'),
                'text-primary',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn('material-symbols-outlined')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                soup_kitchen
              </span>
              {APP_NAME}
            </span>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'simmer.landing.footer.tagline',
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
