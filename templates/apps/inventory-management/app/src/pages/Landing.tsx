import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { InventoryHeroCard } from '../components/InventoryHeroCard.js'
import { InventoryKpiCard } from '../components/InventoryKpiCard.js'

const SAMPLE_TREND = [820, 860, 905, 880, 940, 990, 1020, 1080, 1110, 1095, 1140, 1180]

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
      icon: 'inventory_2',
      titleKey: 'landing.features.skuTitle',
      titleDefault: 'SKU truth across every site',
      bodyKey: 'landing.features.skuBody',
      bodyDefault:
        'A single ledger from receiving to shipment. Bin-level accuracy, audit-ready movement history, and zero double counting.',
    },
    {
      icon: 'qr_code_scanner',
      titleKey: 'landing.features.scanTitle',
      titleDefault: 'Scan-first floor flow',
      bodyKey: 'landing.features.scanBody',
      bodyDefault:
        'Stock transfers, cycle counts, and putaway driven by handheld scanners with offline-tolerant sync.',
    },
    {
      icon: 'monitoring',
      titleKey: 'landing.features.forecastTitle',
      titleDefault: 'Forecasts that earn their keep',
      bodyKey: 'landing.features.forecastBody',
      bodyDefault:
        'Reorder points adapt to seasonality and lead time. Buyers see what to order, not what shipped last month.',
    },
  ]

  type Proof = { metric: string; labelKey: string; labelDefault: string }
  const proof: Proof[] = [
    { metric: '128', labelKey: 'landing.proof.warehouses', labelDefault: 'Warehouses live' },
    { metric: '42M', labelKey: 'landing.proof.movements', labelDefault: 'Movements / month' },
    { metric: '99.7%', labelKey: 'landing.proof.accuracy', labelDefault: 'Cycle-count accuracy' },
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
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow shadow-primary/30',
            )}
          >
            <span className="material-symbols-outlined" data-icon="inventory_2">
              inventory_2
            </span>
          </span>
          <span
            className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {APP_NAME}
          </span>
        </Link>
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'hidden md:flex')}>
          <a
            href="#features"
            className={cm.cn('text-sm font-semibold text-on-surface-variant hover:text-on-surface')}
          >
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <a
            href="#proof"
            className={cm.cn('text-sm font-semibold text-on-surface-variant hover:text-on-surface')}
          >
            {t('landing.nav.proof', { appName: APP_NAME }, { defaultValue: 'Why {{appName}}' })}
          </a>
          <a
            href="#preview"
            className={cm.cn('text-sm font-semibold text-on-surface-variant hover:text-on-surface')}
          >
            {t('landing.nav.preview', {}, { defaultValue: 'Inside the console' })}
          </a>
          <Link
            to="/pricing"
            className={cm.cn('text-sm font-semibold text-on-surface-variant hover:text-on-surface')}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
        </nav>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white shadow shadow-primary/30 hover:opacity-95 transition-all',
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
                  'rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white shadow shadow-primary/30 hover:opacity-95 transition-all',
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
              {t('landing.eyebrow', {}, { defaultValue: 'Inventory · Operations · Truth' })}
            </span>
            <h1
              className={cm.cn(
                'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] text-on-surface',
              )}
            >
              {APP_TAGLINE}.
            </h1>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-xl')}>
              {t(
                'landing.lede',
                { appName: APP_NAME },
                {
                  defaultValue:
                    '{{appName}} brings every SKU, every warehouse, and every movement into one console — designed for ops leads who count what counts and refuse to lose a unit between systems.',
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
                  'rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/30 hover:opacity-95 transition-all',
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
                {t('landing.cta.secondary', {}, { defaultValue: 'See it in motion' })}
              </a>
            </div>
            <div
              className={cm.cn(
                cm.flex({ gap: 'md', align: 'center' }),
                'flex-wrap text-xs text-on-surface-variant',
              )}
            >
              <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                <span
                  className={cm.cn('material-symbols-outlined text-[16px]')}
                  data-icon="check_circle"
                  style={{ color: 'var(--color-secondary)' }}
                >
                  check_circle
                </span>
                {t('landing.proof.line1', {}, { defaultValue: 'No credit card required' })}
              </span>
              <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                <span
                  className={cm.cn('material-symbols-outlined text-[16px]')}
                  data-icon="check_circle"
                  style={{ color: 'var(--color-secondary)' }}
                >
                  check_circle
                </span>
                {t('landing.proof.line2', {}, { defaultValue: 'Imports CSV / Shopify / NetSuite' })}
              </span>
              <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                <span
                  className={cm.cn('material-symbols-outlined text-[16px]')}
                  data-icon="check_circle"
                  style={{ color: 'var(--color-secondary)' }}
                >
                  check_circle
                </span>
                {t('landing.proof.line3', {}, { defaultValue: 'Live in under a day' })}
              </span>
            </div>
          </div>

          <div className={cm.cn('relative', cm.stack(4))} id="preview">
            <InventoryHeroCard
              totalUnits={42318}
              uniqueSkus={1284}
              changePercent={3.2}
              trend={SAMPLE_TREND}
              periodLabel={t('landing.heroCard.period', {}, { defaultValue: 'Last 12 weeks' })}
            />
            <div className={cm.cn('grid grid-cols-2 gap-3')}>
              <InventoryKpiCard
                label={t('landing.kpis.lowStock', {}, { defaultValue: 'Low-stock SKUs' })}
                value="18"
                tone="warning"
                icon="warning"
                hint={t('landing.kpis.lowStockHint', {}, { defaultValue: 'Below reorder point' })}
              />
              <InventoryKpiCard
                label={t('landing.kpis.incoming', {}, { defaultValue: 'Inbound today' })}
                value="3,240"
                tone="info"
                icon="local_shipping"
                hint={t(
                  'landing.kpis.incomingHint',
                  {},
                  { defaultValue: '4 trucks · 2 PO numbers' },
                )}
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
            {t('landing.features.eyebrow', {}, { defaultValue: 'Built for operators' })}
          </p>
          <h2 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
            {t('landing.features.title', {}, { defaultValue: 'Three rails of inventory truth.' })}
          </h2>
          <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
            {t(
              'landing.features.body',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Operations runs on the boring stuff: counts, movements, alerts. {{appName}} makes the boring stuff fast, observable, and impossible to fake.',
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
                {t(feature.bodyKey, {}, { defaultValue: feature.bodyDefault })}
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
          className={cm.cn('rounded-3xl text-white shadow-xl shadow-primary/20', cm.sp('p', 10))}
          style={{
            background:
              'linear-gradient(135deg, var(--color-sidebar) 0%, var(--color-primary-dark) 80%, var(--color-primary) 100%)',
          }}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
              cm.sp('mb', 8),
            )}
          >
            <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-white/60')}>
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
                { defaultValue: 'Numbers operators trust because they ship every day.' },
              )}
            </h2>
          </div>
          <div className={cm.cn('grid grid-cols-2 md:grid-cols-4 gap-6')}>
            {proof.map((item) => (
              <div key={item.labelKey} className={cm.cn(cm.stack(1), 'text-center')}>
                <p
                  className={cm.cn(
                    'text-4xl md:text-5xl font-extrabold tracking-tighter tabular-nums',
                  )}
                >
                  {item.metric}
                </p>
                <p
                  className={cm.cn(
                    'text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70',
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
            {t('landing.cta.title', {}, { defaultValue: 'Bring inventory under one roof.' })}
          </h2>
          <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant max-w-xl mx-auto')}>
            {t(
              'landing.cta.body',
              {},
              {
                defaultValue:
                  'Plug in your warehouses, import SKUs, and have your team running scan-driven cycle counts within a day.',
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
                'rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/30 hover:opacity-95 transition-all',
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

      <footer
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('px', 6),
          cm.sp('py', 6),
          'border-t border-outline-variant/60 text-xs text-on-surface-variant',
        )}
      >
        <p>
          {t(
            'landing.footer.copy',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}} · Inventory under control.' },
          )}
        </p>
        <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
          <Link to="/pricing" className={cm.cn('hover:text-on-surface')}>
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <Link to="/about" className={cm.cn('hover:text-on-surface')}>
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
          <Link to="/login" className={cm.cn('hover:text-on-surface')}>
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
          <Link to="/signup" className={cm.cn('hover:text-on-surface')}>
            {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
          </Link>
        </div>
      </footer>
    </div>
  )
}

export default Landing
