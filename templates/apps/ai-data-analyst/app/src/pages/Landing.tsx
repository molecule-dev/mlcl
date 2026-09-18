import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { InsightHeroCard } from '../components/InsightHeroCard.js'
import { KpiTileGrid } from '../components/KpiTileGrid.js'
import { PublicFooter } from '../components/PublicFooter.js'
import { SafeLink } from '../components/SafeLink.js'

const FEATURES = [
  {
    key: 'nlquery',
    icon: 'mic',
    defaultTitle: 'Ask in plain English',
    defaultBody:
      '“Show top 10 customers by Q3 revenue” returns a chart, a table, and the SQL that ran.',
  },
  {
    key: 'autocharts',
    icon: 'auto_graph',
    defaultTitle: 'Charts that pick themselves',
    defaultBody:
      'Bar, line, scatter, heatmap — {{appName}} picks the right encoding for each query and tunes the axes.',
  },
  {
    key: 'insights',
    icon: 'auto_awesome',
    defaultTitle: 'AI-noticed anomalies',
    defaultBody:
      'Drift, outlier, and correlation alerts surface as cards in your feed — not buried in dashboards.',
  },
  {
    key: 'lineage',
    icon: 'account_tree',
    defaultTitle: 'Defensible lineage',
    defaultBody:
      'Every chart traces back through every transform to the original CSV row. Always reproducible.',
  },
] as const

const SAMPLE_KPIS = [
  {
    key: 'queries',
    label: 'Queries this month',
    value: '184',
    delta_pct: 12.4,
    sparkline: [12, 14, 18, 21, 28, 24, 32, 28],
  },
  {
    key: 'datasets',
    label: 'Active datasets',
    value: '12',
    delta_pct: 0.0,
    sparkline: [10, 11, 11, 11, 12, 12, 12, 12],
  },
  {
    key: 'insights',
    label: 'Insights surfaced',
    value: '42',
    delta_pct: 18.2,
    sparkline: [4, 6, 8, 12, 18, 24, 32, 42],
  },
  {
    key: 'shared',
    label: 'Shared reports',
    value: '8',
    delta_pct: 4.0,
    sparkline: [2, 3, 4, 4, 6, 6, 7, 8],
  },
]

const SAMPLE_HERO_SPARK = [4, 6, 8, 12, 18, 24, 32, 42]

const PROOF_POINTS = [
  { key: 'queries', icon: 'query_stats', defaultLabel: 'Million queries answered' },
  { key: 'datasets', icon: 'database', defaultLabel: 'Datasets indexed' },
  { key: 'teams', icon: 'groups', defaultLabel: 'Analytics teams onboard' },
  { key: 'lineage', icon: 'account_tree', defaultLabel: 'Lineage on every chart' },
  { key: 'soc2', icon: 'verified_user', defaultLabel: 'SOC 2 type II audited' },
  { key: 'export', icon: 'download', defaultLabel: 'One-click CSV export' },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'bg-background text-on-surface antialiased relative overflow-hidden',
      )}
    >
      <span
        aria-hidden="true"
        className={
          'absolute -top-40 -right-40 w-[36rem] h-[36rem] rounded-full bg-primary/10 blur-3xl pointer-events-none'
        }
      />
      <span
        aria-hidden="true"
        className={
          'absolute top-[40%] -left-40 w-[28rem] h-[28rem] rounded-full bg-secondary/15 blur-3xl pointer-events-none'
        }
      />

      <nav
        className={
          'sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-outline-variant/40'
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
          <SafeLink to="/" className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-sm',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                auto_awesome
              </span>
            </span>
            <span
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                'font-headline tracking-tight',
              )}
            >
              {APP_NAME}
            </span>
          </SafeLink>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
            <a
              href="#features"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface transition-colors hidden sm:inline',
              )}
            >
              {t('nav.features', {}, { defaultValue: 'Features' })}
            </a>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface transition-colors hidden sm:inline',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="landing-nav-dashboard"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 1 }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  cm.roundedFull,
                  'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-sm hover:opacity-90 transition-opacity',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
                <span
                  className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
                  aria-hidden="true"
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
                    cm.fontWeight('medium'),
                    'text-on-surface-variant hover:text-on-surface transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 1 }),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    cm.roundedFull,
                    'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-sm hover:opacity-90 transition-opacity',
                  )}
                >
                  {t('landing.nav.tryFree', {}, { defaultValue: 'Try free' })}
                  <span
                    className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
                    aria-hidden="true"
                  >
                    arrow_forward
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — editorial headline + sample dashboard preview */}
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('pt', 16),
            cm.sp('pb', 12),
            cm.mxAuto,
            'relative z-10',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 6 }),
              cm.textCenter,
              cm.maxW('4xl'),
              cm.mxAuto,
            )}
          >
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('px', 4),
                cm.sp('py', 1),
                cm.roundedFull,
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'bg-secondary/10 text-secondary uppercase tracking-widest',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}
                aria-hidden="true"
              >
                bolt
              </span>
              {t(
                'landing.hero.eyebrow',
                {},
                { defaultValue: 'AI Data Analyst · for product & ops teams' },
              )}
            </span>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                'font-headline text-5xl md:text-6xl lg:text-7xl tracking-tighter leading-[0.95] text-on-surface',
              )}
            >
              {t('landing.hero.title', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}.' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                'text-on-surface-variant max-w-2xl leading-relaxed',
              )}
            >
              {t(
                'landing.hero.subtitle',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Upload a dataset, ask questions in plain English, get the right chart back. {{appName}} handles the SQL, the schema discovery, and the lineage — so analysts can ship 10× faster.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ wrap: 'wrap', justify: 'center', gap: 3 }),
                cm.sp('mt', 2),
              )}
            >
              <Link
                to="/signup"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.textSize('base'),
                  cm.roundedFull,
                  'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-[0_18px_40px_rgba(53,37,205,0.28)] hover:opacity-90 transition-opacity',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}
                  aria-hidden="true"
                >
                  auto_awesome
                </span>
                {t(
                  'landing.hero.primaryCta',
                  { appName: APP_NAME },
                  { defaultValue: 'Try {{appName}} free for 14 days' },
                )}
              </Link>
              <a
                href="#preview"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('base'),
                  cm.roundedFull,
                  'bg-surface-container-lowest text-on-surface border border-outline-variant hover:border-primary/50 transition-colors',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}
                  aria-hidden="true"
                >
                  play_circle
                </span>
                {t('landing.hero.secondaryCta', {}, { defaultValue: 'See a sample query' })}
              </a>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 3 }),
                cm.sp('mt', 2),
                cm.textSize('xs'),
                'text-on-surface-variant',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
                <span
                  className={cm.cn('material-symbols-outlined', cm.textSize('sm'), 'text-success')}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                {t('landing.hero.trust1', {}, { defaultValue: 'No credit card' })}
              </div>
              <span className={'opacity-30'}>·</span>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
                <span
                  className={cm.cn('material-symbols-outlined', cm.textSize('sm'), 'text-success')}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                {t('landing.hero.trust2', {}, { defaultValue: 'SOC 2 type II' })}
              </div>
              <span className={'opacity-30'}>·</span>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
                <span
                  className={cm.cn('material-symbols-outlined', cm.textSize('sm'), 'text-success')}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                {t('landing.hero.trust3', {}, { defaultValue: 'Lineage on every chart' })}
              </div>
            </div>
          </div>
        </section>

        {/* Sample dashboard preview — mirrors the auth'd hero card */}
        <section
          id="preview"
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('pb', 16),
            cm.mxAuto,
            'relative z-10',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 5 }))}>
            <InsightHeroCard
              label={t(
                'landing.preview.label',
                {},
                { defaultValue: 'Insights surfaced this month' },
              )}
              value="42"
              deltaPct={18.2}
              sparkline={SAMPLE_HERO_SPARK}
              ctaLabel={t('landing.preview.cta', {}, { defaultValue: 'Try a query' })}
              ctaTo="/signup"
            />
            <KpiTileGrid tiles={SAMPLE_KPIS} />
          </div>
        </section>

        {/* Trust strip — feature pillars instead of fake-logo cosplay */}
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 8),
            cm.mxAuto,
            'relative z-10',
          )}
        >
          <p
            className={cm.cn(
              cm.textCenter,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.22em] text-on-surface-variant',
              cm.sp('mb', 6),
            )}
          >
            {t('landing.proof.heading', {}, { defaultValue: 'Built for serious analytics teams' })}
          </p>
          <div
            className={cm.cn(
              cm.flex({ wrap: 'wrap', justify: 'center', align: 'center', gap: 6 }),
              'text-on-surface-variant',
            )}
          >
            {PROOF_POINTS.map((p) => (
              <span
                key={p.key}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                )}
              >
                <span
                  className={cm.cn(
                    'material-symbols-outlined',
                    cm.textSize('base'),
                    'text-primary',
                  )}
                  aria-hidden="true"
                >
                  {p.icon}
                </span>
                {t(`landing.proof.${p.key}`, {}, { defaultValue: p.defaultLabel })}
              </span>
            ))}
          </div>
        </section>

        {/* Features quad */}
        <section
          id="features"
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 16),
            cm.mxAuto,
            'relative z-10',
          )}
        >
          <header
            className={cm.cn(
              cm.textCenter,
              cm.maxW('2xl'),
              cm.mxAuto,
              cm.sp('mb', 12),
              cm.flex({ direction: 'col', gap: 3 }),
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-[0.22em] text-primary',
              )}
            >
              {t(
                'landing.features.eyebrow',
                { appName: APP_NAME },
                { defaultValue: 'How {{appName}} works' },
              )}
            </span>
            <h2
              className={cm.cn(
                cm.textSize('4xl'),
                cm.fontWeight('bold'),
                'font-headline tracking-tight leading-tight text-on-surface',
              )}
            >
              {t(
                'landing.features.heading',
                {},
                { defaultValue: 'Drop a CSV. Ask a question. Get the answer.' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant leading-relaxed')}>
              {t(
                'landing.features.subhead',
                {},
                {
                  defaultValue:
                    'No SQL required. No dashboard sprawl. Every answer is a chart, a table, and the SQL that ran — exportable in one click.',
                },
              )}
            </p>
          </header>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 5 }), 'sm:grid-cols-2 lg:grid-cols-4')}>
            {FEATURES.map((f) => (
              <article
                key={f.key}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 3 }),
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 transition-all duration-200',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(12),
                    cm.h(12),
                    'rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/15 text-primary',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined', cm.textSize('xl'))}
                    aria-hidden="true"
                  >
                    {f.icon}
                  </span>
                </span>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('bold'),
                    'font-headline tracking-tight text-on-surface leading-snug',
                  )}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface-variant')}>
                  {t(
                    `landing.feature.${f.key}.body`,
                    { appName: APP_NAME },
                    { defaultValue: f.defaultBody },
                  )}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Closing CTA band */}
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 16),
            cm.mxAuto,
            'relative z-10',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 5 }),
              cm.textCenter,
              cm.sp('p', 12),
              'rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-[0_24px_60px_rgba(53,37,205,0.25)] relative overflow-hidden',
            )}
          >
            <span
              aria-hidden="true"
              className={'absolute -top-24 -right-24 w-72 h-72 rounded-full bg-surface/10 blur-3xl'}
            />
            <span
              aria-hidden="true"
              className={
                'absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-secondary/30 blur-3xl'
              }
            />
            <h2
              className={cm.cn(
                'text-4xl md:text-5xl font-extrabold tracking-tighter leading-tight relative z-10',
              )}
            >
              {t(
                'landing.closing.heading',
                {},
                { defaultValue: 'Stop building dashboards. Start asking questions.' },
              )}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('base'),
                'text-on-primary/80 max-w-xl leading-relaxed relative z-10',
              )}
            >
              {t(
                'landing.closing.subhead',
                {},
                {
                  defaultValue:
                    'Free for 14 days. Bring one CSV, get your first three insights in under five minutes.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('base'),
                cm.roundedFull,
                'bg-surface text-primary hover:bg-surface/90 transition-colors shadow-sm relative z-10',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}
                aria-hidden="true"
              >
                auto_awesome
              </span>
              {t(
                'landing.closing.cta',
                { appName: APP_NAME },
                { defaultValue: 'Try {{appName}} free' },
              )}
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}

export default Landing
