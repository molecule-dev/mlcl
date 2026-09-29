import { Link, useNavigate } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { InventoryHeroCard } from '../components/InventoryHeroCard.js'
import { InventoryKpiCard } from '../components/InventoryKpiCard.js'

const SAMPLE_TREND = [820, 860, 905, 880, 940, 990, 1020, 1080, 1110, 1095, 1140, 1180]

const TRUSTED = [
  { icon: 'local_shipping', label: 'FreightOS' },
  { icon: 'conveyor_belt', label: 'LogisSync' },
  { icon: 'warehouse', label: 'StoreLine' },
  { icon: 'inventory', label: 'PackerCo' },
  { icon: 'forklift', label: 'MoveIt' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const navigate = useNavigate()

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
        <BrandWordmark />
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
                'rounded-md bg-primary text-on-primary shadow-sm transition-all hover:bg-primary-hover active:scale-95',
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
                  'rounded-md bg-primary text-on-primary shadow-sm transition-all hover:bg-primary-hover active:scale-95',
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

      {/* Hero — dark navy operations band with a radial cyan glow
          (design: bg-navy + radial primary/20 at top right). */}
      <section
        className={cm.cn('relative overflow-hidden')}
        id="preview"
        style={{ backgroundColor: 'var(--color-sidebar)' }}
      >
        <div
          aria-hidden="true"
          className={cm.cn('absolute inset-0 opacity-70')}
          style={{
            background:
              'radial-gradient(ellipse at top right, var(--color-sidebar-active) 0%, transparent 55%)',
          }}
        />
        <div
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('pt', 20),
            cm.sp('pb', 16),
            'relative mx-auto max-w-[1280px] md:pt-28 md:pb-24',
          )}
        >
          <div className={cm.cn('grid items-center gap-12 lg:grid-cols-2 lg:gap-20')}>
            <div className={cm.stack(6)}>
              <span
                className={cm.cn(
                  'inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-secondary')}
                />
                <span className={cm.cn(cm.textSize('sm'), 'font-medium text-white/70')}>
                  {t('landing.eyebrow', {}, { defaultValue: 'Inventory · Operations · Truth' })}
                </span>
              </span>
              <h1
                className={cm.cn(
                  'text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-white',
                )}
              >
                {APP_TAGLINE}.
              </h1>
              <p className={cm.cn(cm.textSize('lg'), 'leading-relaxed text-white/60 max-w-xl')}>
                {t(
                  'landing.lede',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      '{{appName}} brings every SKU, every warehouse, and every movement into one console — designed for ops leads who count what counts and refuse to lose a unit between systems.',
                  },
                )}
              </p>
              {/* Email-capture form — the design's hero lead-in. Submitting
                  routes into the real signup flow. */}
              <form
                className={cm.cn(cm.flex({ gap: 'sm' }), 'max-w-md flex-col sm:flex-row')}
                onSubmit={(e) => {
                  e.preventDefault()
                  navigate('/signup')
                }}
              >
                <input
                  type="email"
                  required
                  data-testid="landing-email-input"
                  placeholder={t(
                    'landing.emailPlaceholder',
                    {},
                    { defaultValue: 'Enter work email' },
                  )}
                  aria-label={t(
                    'landing.emailPlaceholder',
                    {},
                    { defaultValue: 'Enter work email' },
                  )}
                  className={cm.cn(
                    'flex-1 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 transition-shadow focus:border-transparent focus:ring-2 focus:ring-primary focus:outline-none',
                  )}
                />
                <button
                  type="submit"
                  data-mol-id="landing-hero-start-trial"
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    'whitespace-nowrap rounded-md bg-primary text-on-primary shadow-sm transition-all hover:bg-primary-hover active:scale-95',
                  )}
                >
                  {t('landing.cta.primary', {}, { defaultValue: 'Start a free trial' })}
                  <span
                    className={cm.cn('material-symbols-outlined text-sm')}
                    data-icon="arrow_forward"
                  >
                    arrow_forward
                  </span>
                </button>
              </form>
              <p className={cm.cn(cm.textSize('xs'), 'text-white/50')}>
                {t(
                  'landing.trialNote',
                  {},
                  { defaultValue: '14-day free trial. No credit card required.' },
                )}
              </p>
            </div>

            <div className={cm.cn('relative', cm.stack(4))}>
              {/* Browser-chrome frame — the design presents the product shot
                  in a dark mac-style window. */}
              <div
                className={cm.cn(
                  'overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'h-8 border-b border-white/10 bg-white/5 px-4',
                  )}
                  aria-hidden="true"
                >
                  <span className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-error/80')} />
                  <span className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-warning/80')} />
                  <span className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-success/80')} />
                </div>
                <div className={cm.cn(cm.sp('p', 4))}>
                  <InventoryHeroCard
                    totalUnits={42318}
                    uniqueSkus={1284}
                    changePercent={3.2}
                    trend={SAMPLE_TREND}
                    periodLabel={t(
                      'landing.heroCard.period',
                      {},
                      { defaultValue: 'Last 12 weeks' },
                    )}
                  />
                  <div className={cm.cn('mt-3 grid grid-cols-2 gap-3')}>
                    <InventoryKpiCard
                      label={t('landing.kpis.lowStock', {}, { defaultValue: 'Low-stock SKUs' })}
                      value="18"
                      tone="warning"
                      icon="warning"
                      hint={t(
                        'landing.kpis.lowStockHint',
                        {},
                        { defaultValue: 'Below reorder point' },
                      )}
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
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar — grayscale wordmark strip under the hero. */}
      <section
        className={cm.cn(
          cm.sp('py', 10),
          cm.sp('px', 6),
          'border-b border-outline-variant/60 bg-surface',
        )}
      >
        <p
          className={cm.cn(
            cm.sp('mb', 6),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-center uppercase tracking-wider text-on-surface-variant',
          )}
        >
          {t('landing.trustedBy', {}, { defaultValue: 'Trusted by operations teams at' })}
        </p>
        <div
          className={cm.cn(
            cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'xl' }),
            'opacity-60 grayscale',
          )}
        >
          {TRUSTED.map((brand) => (
            <span
              key={brand.label}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                'text-on-surface',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[22px]')}
                data-icon={brand.icon}
                aria-hidden="true"
              >
                {brand.icon}
              </span>
              {brand.label}
            </span>
          ))}
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
                'rounded-xl border border-outline-variant/60 bg-surface-container-lowest hover:border-primary/30 hover:shadow-md transition-all',
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

      {/* Metrics band — navy with emerald tabular numbers (design). */}
      <section
        id="proof"
        className={cm.cn('border-y border-white/10', cm.sp('py', 16), cm.sp('px', 6))}
        style={{ backgroundColor: 'var(--color-sidebar)' }}
      >
        <div className={cm.cn('mx-auto max-w-[1280px]')}>
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
            <h2
              className={cm.cn(
                cm.textSize('3xl'),
                'font-extrabold text-center tracking-tight text-white',
              )}
            >
              {t(
                'landing.proof.title',
                {},
                { defaultValue: 'Numbers operators trust because they ship every day.' },
              )}
            </h2>
          </div>
          <div
            className={cm.cn(
              'grid grid-cols-1 gap-8 text-center md:grid-cols-4 md:divide-x md:divide-white/10',
            )}
          >
            {proof.map((item) => (
              <div key={item.labelKey} className={cm.cn(cm.stack(1), 'p-4 text-center')}>
                <p
                  className={cm.cn(
                    'text-4xl font-bold tracking-tight text-secondary tabular-nums md:text-5xl',
                  )}
                >
                  {item.metric}
                </p>
                <p
                  className={cm.cn(
                    'text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60',
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
            'mx-auto max-w-[1080px] rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-center',
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
                'rounded-md bg-primary text-on-primary shadow-sm transition-all hover:bg-primary-hover active:scale-95',
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
          {' — Built with '}
          <a
            href="https://molecule.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline"
          >
            Molecule.dev
          </a>
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
