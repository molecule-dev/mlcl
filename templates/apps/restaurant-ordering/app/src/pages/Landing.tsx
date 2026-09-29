import { useState } from 'react'
import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

const FEATURES = [
  {
    key: 'kitchen',
    defaultTitle: 'Kitchen display',
    defaultBody:
      'A glance-friendly board that turns chaos into a clean kanban — new, preparing, ready, served.',
    icon: 'soup_kitchen',
    tint: 'text-primary',
  },
  {
    key: 'tables',
    defaultTitle: 'Smart floor plan',
    defaultBody:
      'Drag a table, seat a party, watch ticket times tick. Available, occupied, reserved, dirty.',
    icon: 'table_restaurant',
    tint: 'text-tertiary',
  },
  {
    key: 'qr_ordering',
    defaultTitle: 'Table-side QR menus',
    defaultBody:
      'Guests order from their phones, kitchen sees it instantly, payments split themselves.',
    icon: 'qr_code_2',
    tint: 'text-secondary',
  },
  {
    key: 'analytics',
    defaultTitle: 'Service analytics',
    defaultBody:
      'Hourly revenue, top items, server leaderboards. Know which Sundays beat which Tuesdays.',
    icon: 'insights',
    tint: 'text-info',
  },
] as const

/* Kanban mockup columns — the design's kitchen board (New / Preparing / Ready)
   rendered as static product art for the hero. Classes are spelled out
   literally (no interpolation) so Tailwind's scanner picks them up; the
   bracketed var() values resolve to the kanban tokens in theme.css. */
const KANBAN_COLUMNS = [
  {
    key: 'new',
    defaultLabel: 'New',
    count: 3,
    card: 'bg-[var(--color-kanban-new-bg)] border-[var(--color-kanban-new-border)]',
    strong: 'text-[var(--color-kanban-new-text)]',
    tickets: [
      {
        id: '#4012',
        time: '2m',
        table: { key: 'table12', def: 'Table 12' },
        items: { key: 'itemsBurger', def: '2x Burger, 1x Fries' },
        done: false,
      },
      {
        id: '#4013',
        time: '0m',
        table: { key: 'tableTakeout', def: 'Takeout' },
        items: { key: 'itemsSalad', def: '1x Salad, 1x Soup' },
        done: false,
      },
    ],
  },
  {
    key: 'preparing',
    defaultLabel: 'Preparing',
    count: 2,
    card: 'bg-[var(--color-kanban-prep-bg)] border-[var(--color-kanban-prep-border)]',
    strong: 'text-[var(--color-kanban-prep-text)]',
    tickets: [
      {
        id: '#4009',
        time: '12:45',
        table: { key: 'table4', def: 'Table 4' },
        items: { key: 'itemsSteak', def: '3x Steak, 3x Wine' },
        done: false,
      },
    ],
  },
  {
    key: 'ready',
    defaultLabel: 'Ready',
    count: 1,
    card: 'bg-[var(--color-kanban-ready-bg)] border-[var(--color-kanban-ready-border)]',
    strong: 'text-[var(--color-kanban-ready-text)]',
    tickets: [
      {
        id: '#4005',
        time: '',
        table: { key: 'table8', def: 'Table 8' },
        items: { key: 'itemsDesserts', def: 'Desserts' },
        done: true,
      },
    ],
  },
] as const

const TRUSTED = [
  { key: 'trusted1', def: 'Pomodoro Pasta' },
  { key: 'trusted2', def: 'Maple & Smoke' },
  { key: 'trusted3', def: 'Mile End Bagels' },
  { key: 'trusted4', def: "Otto's Yakitori" },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const [subscribed, setSubscribed] = useState(false)

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-outline-variant/60 shadow-sm',
        )}
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
          <BrandWordmark size="lg" />
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              'hidden md:flex text-sm font-medium',
            )}
          >
            <a
              href="#features"
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              {t('landing.navFeatures', {}, { defaultValue: 'Features' })}
            </a>
            <Link
              to="/menu/guest"
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              {t('landing.tryGuestMenu', {}, { defaultValue: 'Guest menu demo' })}
            </Link>
            <Link
              to="/about"
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              {t('landing.navAbout', {}, { defaultValue: 'About' })}
            </Link>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="landing-nav-dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2.5),
                  cm.fontWeight('medium'),
                  'bg-primary text-on-primary rounded-full hover:bg-primary-hover transition-colors active:scale-95',
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
                    'text-on-surface-variant hover:text-on-surface hidden sm:block',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="landing-nav-cta"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2.5),
                    cm.fontWeight('medium'),
                    'bg-primary text-on-primary rounded-full hover:bg-primary-hover transition-colors active:scale-95',
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Open your kitchen' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — headline left, kitchen kanban mockup right */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20 lg:py-32 relative')}
          >
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-2 gap-16 items-center')}>
              <div className={cm.cn('max-w-2xl')}>
                <h1
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight font-display text-on-surface',
                  )}
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}' },
                  )}
                </h1>
                <p
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.sp('mb', 10),
                    'text-on-surface-variant leading-relaxed',
                  )}
                >
                  {t(
                    'landing.heroSubtitle',
                    { app: APP_NAME },
                    {
                      defaultValue:
                        '{{app}} replaces three half-broken systems with one warm, fast point of sale — kitchen display, table map, QR ordering, and analytics on every device.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    data-mol-id="landing-hero-cta"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.textSize('lg'),
                      cm.fontWeight('medium'),
                      'bg-primary text-on-primary rounded-full hover:bg-primary-hover transition-colors',
                    )}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Start a free 14-day kitchen' })}
                  </Link>
                  <Link
                    to="/menu/guest"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.textSize('lg'),
                      cm.fontWeight('medium'),
                      cm.flex({ align: 'center', gap: 'sm' }),
                      'text-on-surface bg-surface-container hover:bg-surface-container-high rounded-full transition-colors',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                      play_circle
                    </span>
                    {t('landing.guestDemoCta', {}, { defaultValue: 'See the guest view' })}
                  </Link>
                </div>
                <div
                  className={cm.cn(
                    cm.sp('pt', 8),
                    cm.sp('mt', 12),
                    'border-t border-outline-variant/60',
                  )}
                >
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      cm.sp('mb', 4),
                      'text-on-surface-variant uppercase tracking-wider',
                    )}
                  >
                    {t('landing.socialProof', {}, { defaultValue: 'Loved by service teams at' })}
                  </p>
                  <div className={cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' })}>
                    {TRUSTED.map((b) => (
                      <span
                        key={b.key}
                        className={cm.cn(
                          'font-display font-bold text-base text-on-surface-variant',
                        )}
                      >
                        {t(`landing.${b.key}`, {}, { defaultValue: b.def })}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Kitchen kanban mockup */}
              <div
                className={cm.cn(
                  'relative bg-surface-container-low rounded-3xl p-6 shadow-xl border border-outline-variant/60 lg:mr-[-3rem]',
                )}
                aria-hidden="true"
              >
                <div className={cm.flex({ gap: 'md' }) + ' overflow-x-auto pb-2'}>
                  {KANBAN_COLUMNS.map((col) => (
                    <div
                      key={col.key}
                      className={
                        'shrink-0 w-64 bg-surface rounded-2xl p-4 shadow-sm border border-outline-variant/40'
                      }
                    >
                      <div className={cm.flex({ align: 'center', justify: 'between' }) + ' mb-4'}>
                        <h3
                          className={cm.cn(
                            cm.fontWeight('semibold'),
                            'font-display text-on-surface',
                          )}
                        >
                          {t(
                            `landing.kanban.col.${col.key}`,
                            {},
                            { defaultValue: col.defaultLabel },
                          )}
                        </h3>
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            cm.sp('px', 2),
                            cm.sp('py', 1),
                            'rounded-full',
                            col.card,
                            col.strong,
                          )}
                        >
                          {col.count}
                        </span>
                      </div>
                      <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
                        {col.tickets.map((tk) => (
                          <div
                            key={tk.id}
                            className={cm.cn(cm.sp('p', 3), 'rounded-lg border', col.card)}
                          >
                            <div
                              className={cm.flex({ align: 'center', justify: 'between' }) + ' mb-2'}
                            >
                              <span className={cm.cn('font-mono text-sm font-bold', col.strong)}>
                                {tk.id}
                              </span>
                              {tk.done ? (
                                <span
                                  className={cm.cn(
                                    'material-symbols-outlined text-sm text-success',
                                  )}
                                >
                                  check_circle
                                </span>
                              ) : (
                                <span className={cm.cn(cm.textSize('xs'), col.strong)}>
                                  {tk.time}
                                </span>
                              )}
                            </div>
                            <div
                              className={cm.cn(
                                cm.textSize('sm'),
                                cm.fontWeight('medium'),
                                cm.sp('mb', 1),
                                'text-on-surface',
                              )}
                            >
                              {t(
                                `landing.kanban.${tk.table.key}`,
                                {},
                                { defaultValue: tk.table.def },
                              )}
                            </div>
                            <div className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                              {t(
                                `landing.kanban.${tk.items.key}`,
                                {},
                                { defaultValue: tk.items.def },
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}
        >
          <h2
            className={cm.cn(
              cm.sp('mb', 4),
              cm.textCenter,
              'text-3xl md:text-4xl font-bold tracking-tight font-display',
            )}
          >
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'One warm system. Every shift, every table.' },
            )}
          </h2>
          <p
            className={cm.cn(
              cm.sp('mb', 12),
              cm.textCenter,
              cm.maxW('2xl'),
              cm.mxAuto,
              'text-on-surface-variant',
            )}
          >
            {t(
              'landing.featuresSubheading',
              {},
              {
                defaultValue:
                  'Built for service-minded teams. No franchise lock-in, no clunky kiosks, no weekly reboots.',
              },
            )}
          </p>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface rounded-xl border border-outline-variant/60 hover:shadow-lg transition-shadow group',
                )}
              >
                <div
                  className={cm.cn(
                    cm.sp('p', 3),
                    'inline-flex bg-surface-container-low rounded-lg group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-3xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.sp('mt', 5),
                    cm.sp('mb', 2),
                    'font-bold font-display',
                  )}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn('border-t border-outline-variant/60')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn(
                cm.textSize('3xl'),
                cm.sp('mb', 4),
                'font-bold tracking-tight font-display',
              )}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Open your kitchen in under an hour' })}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('base'),
                cm.sp('mb', 8),
                'text-on-surface-variant max-w-xl mx-auto',
              )}
            >
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Plug in any tablet, scan the printer, drop in your menu. We will hand-import last week of orders so you start with real numbers.',
                },
              )}
            </p>
            <Link
              to="/signup"
              data-mol-id="landing-footer-cta"
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                cm.textSize('lg'),
                cm.fontWeight('medium'),
                'bg-primary text-on-primary rounded-full hover:bg-primary-hover transition-colors inline-flex items-center gap-2',
              )}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Start a free 14-day kitchen' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-surface-container-low border-t border-outline-variant/60 rounded-t-2xl mt-20">
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            'grid grid-cols-1 md:grid-cols-4 gap-12 px-8 py-16',
          )}
        >
          <div>
            {/* footer lockup: shared BrandWordmark (footer variant keeps the
                per-page brand-wordmark e2e contract header-scoped) */}
            <div className={cm.flex({ align: 'center', gap: 'sm' }) + ' mb-4'}>
              <BrandWordmark as="span" size="md" footer />
            </div>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mb-6')}>
              {t(
                'landing.footerBlurb',
                {},
                { defaultValue: 'Warmth in every order. Built for modern restaurants.' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {/* landing-scoped key: the shared `common.copyrightBuiltWithMolecule`
                  value already ends in plain-text "Built with Molecule.dev", which
                  would duplicate the linked sibling below. */}
              {t(
                'landing.copyright',
                { year: new Date().getFullYear(), app: APP_NAME },
                { defaultValue: '© {{year}} {{app}}' },
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
          <div>
            <h4
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'font-display text-on-surface',
              )}
            >
              {t('landing.footerCompany', {}, { defaultValue: 'Company' })}
            </h4>
            <ul className={cm.flex({ direction: 'col', gap: 'sm' })}>
              <li>
                <Link
                  to="/about"
                  className="text-sm text-on-surface-variant hover:text-on-surface underline decoration-tertiary underline-offset-4 transition-colors"
                >
                  {t('landing.footerAboutUs', {}, { defaultValue: 'About Us' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/signup"
                  className="text-sm text-on-surface-variant hover:text-on-surface underline decoration-tertiary underline-offset-4 transition-colors"
                >
                  {t('landing.footerPartner', {}, { defaultValue: 'Partner with Us' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/menu/guest"
                  className="text-sm text-on-surface-variant hover:text-on-surface underline decoration-tertiary underline-offset-4 transition-colors"
                >
                  {t('landing.tryGuestMenu', {}, { defaultValue: 'Guest menu demo' })}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'font-display text-on-surface',
              )}
            >
              {t('landing.footerLegal', {}, { defaultValue: 'Legal' })}
            </h4>
            <ul className={cm.flex({ direction: 'col', gap: 'sm' })}>
              <li>
                <Link
                  to="/privacy"
                  className="text-sm text-on-surface-variant hover:text-on-surface underline decoration-tertiary underline-offset-4 transition-colors"
                >
                  {t('landing.footerPrivacy', {}, { defaultValue: 'Privacy Policy' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-sm text-on-surface-variant hover:text-on-surface underline decoration-tertiary underline-offset-4 transition-colors"
                >
                  {t('landing.footerTerms', {}, { defaultValue: 'Terms of Service' })}
                </Link>
              </li>
              <li>
                <a
                  href="mailto:hello@molecule.dev"
                  className="text-sm text-on-surface-variant hover:text-on-surface underline decoration-tertiary underline-offset-4 transition-colors"
                >
                  {t('landing.footerContact', {}, { defaultValue: 'Contact' })}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'font-display text-on-surface',
              )}
            >
              {t('landing.footerSubscribe', {}, { defaultValue: 'Subscribe' })}
            </h4>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mb-4')}>
              {t(
                'landing.footerSubscribeBlurb',
                {},
                { defaultValue: 'Get the latest restaurant tech news.' },
              )}
            </p>
            <form
              className={cm.flex({ gap: 'sm' })}
              onSubmit={(e) => {
                e.preventDefault()
                setSubscribed(true)
              }}
            >
              <label className="sr-only" htmlFor="landing-subscribe-email">
                {t('landing.footerSubscribeLabel', {}, { defaultValue: 'Email address' })}
              </label>
              <input
                id="landing-subscribe-email"
                type="email"
                required
                placeholder={t(
                  'landing.footerSubscribePlaceholder',
                  {},
                  { defaultValue: 'Email address' },
                )}
                className="w-full px-4 py-2 rounded-lg bg-surface text-on-surface border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                data-mol-id="landing-footer-subscribe"
                aria-label={t('landing.footerSubscribe', {}, { defaultValue: 'Subscribe' })}
                className="bg-secondary text-on-secondary px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                  arrow_forward
                </span>
              </button>
            </form>
            {subscribed && (
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-success')}>
                {t('landing.footerSubscribed', {}, { defaultValue: 'Subscribed — thank you!' })}
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
