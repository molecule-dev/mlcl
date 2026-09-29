import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { FulfillmentHeroCard } from '../components/FulfillmentHeroCard.js'
import { FulfillmentKpiCard } from '../components/FulfillmentKpiCard.js'

const SAMPLE_TREND = [780, 820, 870, 905, 880, 940, 1010, 1080, 1110, 1145, 1190, 1284]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  type Feature = {
    icon: string
    titleKey: string
    titleDefault: string
    bodyKey: string
    bodyDefault: string
  }
  const features: Feature[] = [
    {
      icon: 'qr_code_scanner',
      titleKey: 'landing.features.scanTitle',
      titleDefault: 'Scan-first floor flow',
      bodyKey: 'landing.features.scanBody',
      bodyDefault:
        'Pickers, packers, and dock leads move through orders with a handheld scanner. Every action is captured the moment it happens.',
    },
    {
      icon: 'route',
      titleKey: 'landing.features.routeTitle',
      titleDefault: 'Wave-aware pick paths',
      bodyKey: 'landing.features.routeBody',
      bodyDefault:
        '{{appName}} batches orders into waves and threads bins so a picker walks the floor once, not five times. Cut steps. Cut errors.',
    },
    {
      icon: 'verified',
      titleKey: 'landing.features.slaTitle',
      titleDefault: 'SLAs you can defend',
      bodyKey: 'landing.features.slaBody',
      bodyDefault:
        'Rush, express, and standard lanes never get crossed. Live ETA boards on every dock door so the team always knows what ships next.',
    },
  ]

  type Proof = { metric: string; labelKey: string; labelDefault: string }
  const proof: Proof[] = [
    { metric: '128', labelKey: 'landing.proof.docks', labelDefault: 'Dock doors live' },
    { metric: '6.4M', labelKey: 'landing.proof.orders', labelDefault: 'Orders / month' },
    { metric: '99.4%', labelKey: 'landing.proof.onTime', labelDefault: 'On-time ship rate' },
    { metric: '< 4s', labelKey: 'landing.proof.scan', labelDefault: 'Median scan latency' },
  ]

  return (
    <div className={cm.cn('bg-background min-h-screen text-on-surface')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('px', 6),
          cm.sp('py', 5),
          'sticky top-0 z-30 border-b border-outline-variant/60 bg-surface/80 backdrop-blur-md',
        )}
      >
        <BrandWordmark size="md" />
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'hidden md:flex')}>
          <a
            href="#features"
            className={cm.cn(
              'inline-flex items-center px-3 py-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <a
            href="#proof"
            className={cm.cn(
              'inline-flex items-center px-3 py-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t('landing.nav.proof', { appName: APP_NAME }, { defaultValue: 'Why {{appName}}' })}
          </a>
          <a
            href="#preview"
            className={cm.cn(
              'inline-flex items-center px-3 py-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t('landing.nav.preview', {}, { defaultValue: 'Inside the dock' })}
          </a>
          <Link
            to="/pricing"
            className={cm.cn(
              'inline-flex items-center px-3 py-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
        </nav>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="nav-go-to-dashboard"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-lg bg-gradient-to-br from-primary to-primary-dark text-on-primary shadow shadow-primary/30 hover:opacity-95 transition-all',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              <span
                className={cm.cn('material-symbols-outlined text-[16px]')}
                data-icon="arrow_forward"
              >
                arrow_forward
              </span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant hover:text-on-surface px-3 py-2 rounded-md',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-lg bg-gradient-to-br from-primary to-primary-dark text-on-primary shadow shadow-primary/30 hover:opacity-95 transition-all',
                )}
              >
                {t('common.startFree', {}, { defaultValue: 'Start free' })}
                <span
                  className={cm.cn('material-symbols-outlined text-[16px]')}
                  data-icon="arrow_forward"
                >
                  arrow_forward
                </span>
              </Link>
            </>
          )}
        </div>
      </header>

      <section
        className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'relative mx-auto max-w-[1280px]')}
      >
        <div
          aria-hidden="true"
          className={cm.cn(
            'pointer-events-none absolute -top-32 right-0 h-80 w-80 rounded-full bg-primary/15 blur-3xl',
          )}
        />
        <div className={cm.cn('grid lg:grid-cols-2 gap-12 items-center')}>
          <div className={cm.stack(6)}>
            <span
              className={cm.cn(
                'inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-primary',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[14px]')} data-icon="bolt">
                bolt
              </span>
              {t('landing.eyebrow', {}, { defaultValue: 'Pick · Pack · Ship' })}
            </span>
            <h1
              className={cm.cn(
                'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] text-on-surface',
                '[font-family:var(--font-headline)]',
              )}
            >
              {(() => {
                // Stitch design: the headline's final word carries the cyan brand
                // stop ("Fulfillment without friction.") — works for any locale
                // because the highlight follows the translated string's last word.
                const headline = t(
                  'landing.headline',
                  { tagline: APP_TAGLINE },
                  { defaultValue: `${APP_TAGLINE}.` },
                )
                const trailing = headline.endsWith('.') ? '.' : ''
                const body = trailing ? headline.slice(0, -1) : headline
                const idx = body.lastIndexOf(' ')
                if (idx <= 0) return headline
                return (
                  <>
                    {body.slice(0, idx + 1)}
                    <span className="text-primary">{body.slice(idx + 1)}</span>
                    {trailing}
                  </>
                )
              })()}
            </h1>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-xl')}>
              {t(
                'landing.lede',
                { appName: APP_NAME },
                {
                  defaultValue:
                    '{{appName}} puts every order, every wave, and every dock door into one operator-grade console — designed for fulfillment teams that ship rush, express, and standard without ever crossing the lanes.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 6),
                  cm.h(12),
                  cm.fontWeight('bold'),
                  'rounded-xl bg-gradient-to-br from-primary to-primary-dark text-on-primary shadow-lg shadow-primary/30 hover:opacity-95 transition-all',
                )}
              >
                {t('landing.cta.primary', {}, { defaultValue: 'Start a free trial' })}
                <span
                  className={cm.cn('material-symbols-outlined text-[18px]')}
                  data-icon="arrow_forward"
                >
                  arrow_forward
                </span>
              </Link>
              <a
                href="#preview"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 6),
                  cm.h(12),
                  cm.fontWeight('bold'),
                  'rounded-xl border border-outline-variant text-on-surface hover:bg-background-secondary transition-colors',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[18px]')}
                  data-icon="play_circle"
                >
                  play_circle
                </span>
                {t('landing.cta.secondary', {}, { defaultValue: 'See it on the dock' })}
              </a>
            </div>
            <div
              className={cm.cn(
                cm.flex({ gap: 'md', align: 'center' }),
                'flex-wrap text-xs text-on-surface-variant',
              )}
            >
              {[
                { key: 'landing.proof.line1', def: 'No credit card required' },
                { key: 'landing.proof.line2', def: 'CSV / Shopify / NetSuite imports' },
                { key: 'landing.proof.line3', def: 'Live in under a day' },
              ].map((line) => (
                <span key={line.key} className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                  <span
                    className={cm.cn(
                      'material-symbols-outlined text-[16px] text-[var(--color-secondary)]',
                    )}
                    data-icon="check_circle"
                  >
                    check_circle
                  </span>
                  {t(line.key, {}, { defaultValue: line.def })}
                </span>
              ))}
            </div>
          </div>

          <div className={cm.cn('relative', cm.stack(4))} id="preview">
            <FulfillmentHeroCard
              ordersShipped={1284}
              unitsShipped={42318}
              onTimePercent={99.4}
              trend={SAMPLE_TREND}
              periodLabel={t('landing.heroCard.period', {}, { defaultValue: 'Last 12 shifts' })}
            />
            <div className={cm.cn('grid grid-cols-2 gap-3')}>
              <FulfillmentKpiCard
                label={t('landing.kpis.rush', {}, { defaultValue: 'Rush queue' })}
                value="6"
                tone="rush"
                icon="bolt"
                hint={t('landing.kpis.rushHint', {}, { defaultValue: 'Cut by 22:00' })}
              />
              <FulfillmentKpiCard
                label={t('landing.kpis.docks', {}, { defaultValue: 'Open docks' })}
                value="8 / 12"
                tone="info"
                icon="dock"
                hint={t('landing.kpis.docksHint', {}, { defaultValue: '4 staged for outbound' })}
              />
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'mx-auto max-w-[1280px]')}
      >
        <div className={cm.cn(cm.stack(3), cm.sp('mb', 10), 'text-center max-w-2xl mx-auto')}>
          <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
            {t('landing.features.eyebrow', {}, { defaultValue: 'Built for the floor' })}
          </p>
          <h2 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
            {t('landing.features.title', {}, { defaultValue: 'Three rails of fulfillment truth.' })}
          </h2>
          <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
            {t(
              'landing.features.body',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Operations runs on the boring stuff — picks, packs, and shipped labels. {{appName}} makes the boring stuff fast, observable, and impossible to fake.',
              },
            )}
          </p>
        </div>
        <div className={cm.cn('grid md:grid-cols-3 gap-6')}>
          {features.map((feature) => (
            <article
              key={feature.titleKey}
              className={cm.cn(
                cm.stack(3),
                cm.sp('p', 6),
                'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest hover:border-primary/30 hover:shadow-md transition-all',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-12 w-12 rounded-xl bg-primary/10 text-primary',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[24px]')}
                  data-icon={feature.icon}
                >
                  {feature.icon}
                </span>
              </span>
              <h3 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
                {t(feature.titleKey, {}, { defaultValue: feature.titleDefault })}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(feature.bodyKey, { appName: APP_NAME }, { defaultValue: feature.bodyDefault })}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="proof"
        className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'mx-auto max-w-[1280px]')}
      >
        <div
          className={cm.cn(
            'rounded-3xl bg-[var(--color-primary)] text-on-primary shadow-xl shadow-primary/20',
            cm.sp('p', 10),
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
              cm.sp('mb', 8),
            )}
          >
            <p
              className={cm.cn(
                /* /95 — /60 composites to 2.96:1 on the #0e7490 proof band
                   (axe color-contrast serious); /95 composites to 5.00:1. */
                'text-[11px] font-bold uppercase tracking-[0.22em] text-on-primary/95',
              )}
            >
              {t(
                'landing.proof.eyebrow',
                { appName: APP_NAME },
                { defaultValue: 'Across the {{appName}} network' },
              )}
            </p>
            <h2 className={cm.cn(cm.textSize('3xl'), 'font-extrabold text-center tracking-tight')}>
              {t(
                'landing.proof.title',
                {},
                { defaultValue: 'Numbers operators trust because they ship every shift.' },
              )}
            </h2>
          </div>
          <div className={cm.cn('grid grid-cols-2 md:grid-cols-4 gap-6')}>
            {proof.map((item) => (
              <div key={item.labelKey} className={cm.cn(cm.stack(1), 'text-center')}>
                <p
                  className={cm.cn(
                    'font-mono text-4xl md:text-5xl font-bold tracking-tighter tabular-nums',
                    'text-[var(--wf-stat-number)]',
                  )}
                >
                  {item.metric}
                </p>
                <p
                  className={cm.cn(
                    /* /95 — /70 composites to 3.46:1 on the #0e7490 proof
                       band (axe color-contrast serious); /95 is 5.00:1. */
                    'text-[11px] font-semibold uppercase tracking-[0.18em] text-on-primary/95',
                  )}
                >
                  {t(item.labelKey, {}, { defaultValue: item.labelDefault })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={cm.cn(cm.sp('px', 6), cm.sp('pb', 20))}>
        <div
          className={cm.cn(
            'mx-auto max-w-[1080px] rounded-3xl border border-outline-variant/60 bg-surface-container-lowest text-center',
            cm.sp('p', 10),
            cm.stack(4),
          )}
        >
          <h2 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
            {t('landing.cta.title', {}, { defaultValue: 'Bring fulfillment under one roof.' })}
          </h2>
          <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant max-w-xl mx-auto')}>
            {t(
              'landing.cta.body',
              {},
              {
                defaultValue:
                  'Plug in your warehouses, import SKUs, and have your team picking, packing, and shipping with scanners within a day.',
              },
            )}
          </p>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
              'flex-wrap',
            )}
          >
            <Link
              to="/signup"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 6),
                cm.h(12),
                cm.fontWeight('bold'),
                'rounded-xl bg-gradient-to-br from-primary to-primary-dark text-on-primary shadow-lg shadow-primary/30 hover:opacity-95 transition-all',
              )}
            >
              {t('common.startFree', {}, { defaultValue: 'Start free' })}
              <span
                className={cm.cn('material-symbols-outlined text-[18px]')}
                data-icon="arrow_forward"
              >
                arrow_forward
              </span>
            </Link>
            <Link
              to="/login"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 6),
                cm.h(12),
                cm.fontWeight('semibold'),
                'rounded-xl border border-outline-variant text-on-surface hover:bg-background-secondary transition-colors',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </div>
        </div>
      </section>

      <footer className={cm.cn('bg-[var(--color-sidebar)]')}>
        <div
          className={cm.cn(
            'mx-auto max-w-[1280px] px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8',
          )}
        >
          <div className={cm.cn(cm.stack(3), 'col-span-2 md:col-span-1')}>
            {/* footer lockup: shared BrandWordmark (footer variant keeps the
                per-page brand-wordmark e2e contract header-scoped) */}
            <BrandWordmark as="span" size="md" footer />
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'text-[var(--wf-footer-muted)] max-w-xs leading-relaxed',
              )}
            >
              {t(
                'landing.footer.tagline',
                { appName: APP_NAME },
                { defaultValue: 'Industrial-grade fulfillment software for modern warehouses.' },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.stack(3))}>
            <h4
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-[var(--wf-footer-fg)]',
              )}
            >
              {t('landing.footer.productHeading', {}, { defaultValue: 'Product' })}
            </h4>
            <ul className={cm.cn(cm.stack(2))}>
              <li>
                <a
                  href="#features"
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-[var(--wf-footer-muted)] hover:text-[var(--wf-footer-fg)] transition-colors',
                  )}
                >
                  {t('nav.features', {}, { defaultValue: 'Features' })}
                </a>
              </li>
              <li>
                <Link
                  to="/pricing"
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-[var(--wf-footer-muted)] hover:text-[var(--wf-footer-fg)] transition-colors',
                  )}
                >
                  {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
                </Link>
              </li>
              <li>
                <a
                  href="#preview"
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-[var(--wf-footer-muted)] hover:text-[var(--wf-footer-fg)] transition-colors',
                  )}
                >
                  {t('landing.footer.preview', {}, { defaultValue: 'Inside the dock' })}
                </a>
              </li>
            </ul>
          </div>
          <div className={cm.cn(cm.stack(3))}>
            <h4
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-[var(--wf-footer-fg)]',
              )}
            >
              {t('landing.footer.accountHeading', {}, { defaultValue: 'Account' })}
            </h4>
            <ul className={cm.cn(cm.stack(2))}>
              <li>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-[var(--wf-footer-muted)] hover:text-[var(--wf-footer-fg)] transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-[var(--wf-footer-muted)] hover:text-[var(--wf-footer-fg)] transition-colors',
                  )}
                >
                  {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className={cm.cn('mx-auto max-w-[1280px] px-6')}>
          <div
            className={cm.cn(
              'border-t border-white/10 py-6 flex flex-col sm:flex-row justify-between gap-2',
              cm.textSize('xs'),
              'text-[var(--wf-footer-muted)]',
            )}
          >
            <p>
              {t(
                'landing.footer.copy',
                { year: new Date().getFullYear(), appName: APP_NAME },
                { defaultValue: '© {{year}} {{appName}} · Fulfillment without friction.' },
              )}
              {' — Built with '}
              <a
                href="https://molecule.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline font-medium text-[var(--wf-footer-fg)]"
              >
                Molecule.dev
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
