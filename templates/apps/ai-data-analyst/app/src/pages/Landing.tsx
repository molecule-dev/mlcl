import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
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

/* Placeholder customer wordmarks for the social-proof band (per the Stitch
   design — typographic stand-ins, grayscale + dimmed). */
const PROOF_LOGOS = [
  { name: 'ACME CORP', className: 'font-extrabold tracking-tighter' },
  { name: 'Globex', className: 'font-bold tracking-widest uppercase' },
  { name: 'Soylent', className: 'font-medium tracking-tight' },
  { name: 'Initech', className: 'font-bold italic' },
  { name: 'Umbrella', className: 'font-extrabold uppercase' },
  { name: 'Stark Ind.', className: 'font-bold tracking-tighter' },
] as const

/* Hero mock chart — region bars mirroring the Stitch design (APAC highlighted). */
const HERO_BARS = [
  { region: 'NA', heightPct: 40, highlighted: false, value: '$1.2M' },
  { region: 'EMEA', heightPct: 60, highlighted: false, value: '$1.8M' },
  { region: 'APAC', heightPct: 90, highlighted: true, value: '$2.7M' },
  { region: 'LATAM', heightPct: 30, highlighted: false, value: '$0.9M' },
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
      <nav
        className={
          'sticky top-0 z-30 backdrop-blur-md bg-surface-container-lowest/80 border-b border-outline-variant/40'
        }
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            'md:px-12',
            cm.h(20),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 8 }))}>
            <SafeLink to="/" className={cm.cn('shrink-0')} aria-label={APP_NAME}>
              <BrandWordmark as="span" size="lg" />
            </SafeLink>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 6 }), cm.hiddenBelow('md'))}>
              <a
                href="#features"
                className={cm.cn(
                  cm.fontWeight('medium'),
                  'tracking-tight text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('nav.features', {}, { defaultValue: 'Product' })}
              </a>
              <Link
                to="/pricing"
                className={cm.cn(
                  cm.fontWeight('medium'),
                  'tracking-tight text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </Link>
              <SafeLink
                to="/about"
                className={cm.cn(
                  cm.fontWeight('medium'),
                  'tracking-tight text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('nav.about', {}, { defaultValue: 'Docs' })}
              </SafeLink>
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="landing-nav-dashboard"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 5),
                  cm.sp('py', 2.5),
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'rounded-md tracking-tight',
                  'bg-gradient-to-br from-primary to-primary-container text-on-primary hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all',
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
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    'tracking-tight text-on-surface-variant hover:text-primary transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign In' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 1 }),
                    cm.sp('px', 5),
                    cm.sp('py', 2.5),
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    'rounded-md tracking-tight',
                    'bg-gradient-to-br from-primary to-primary-container text-on-primary hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all',
                  )}
                >
                  {t('landing.nav.tryFree', {}, { defaultValue: 'Get Started' })}
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
        {/* Hero — left copy + right sample-query visual, blurred blob behind */}
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            'md:px-12',
            cm.sp('pt', 16),
            cm.sp('pb', 24),
            cm.mxAuto,
            'relative overflow-hidden',
          )}
        >
          <div
            aria-hidden="true"
            className={
              'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl pointer-events-none -z-10 bg-gradient-to-tr from-primary/5 to-secondary/10'
            }
          />
          <div className={cm.cn(cm.grid({ cols: 2, gap: 8 }), 'lg:gap-16 lg:items-center')}>
            <div className={cm.cn(cm.maxW('2xl'))}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 4),
                  cm.sp('py', 1),
                  cm.roundedFull,
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'bg-secondary/10 text-secondary uppercase tracking-widest',
                  cm.sp('mb', 6),
                  'inline-flex',
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
                  cm.fontWeight('extrabold'),
                  'font-headline text-5xl md:text-[64px] font-black leading-[1.1] tracking-[-0.02em] text-on-surface',
                  cm.sp('mb', 6),
                )}
              >
                {t(
                  'landing.hero.title',
                  { tagline: APP_TAGLINE },
                  { defaultValue: '{{tagline}}.' },
                )}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('xl'),
                  'text-on-surface-variant leading-relaxed',
                  cm.sp('mb', 10),
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
              <div className={cm.cn(cm.flex({ wrap: 'wrap', align: 'center', gap: 4 }))}>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 2 }),
                    cm.sp('px', 8),
                    cm.sp('py', 3),
                    cm.fontWeight('medium'),
                    cm.textSize('base'),
                    'rounded-md tracking-tight',
                    'bg-gradient-to-br from-primary to-primary-container text-on-primary hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all',
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
                    cm.sp('px', 8),
                    cm.sp('py', 3),
                    cm.fontWeight('medium'),
                    cm.textSize('base'),
                    'rounded-md tracking-tight',
                    'bg-surface-container-high text-on-surface hover:bg-surface-variant active:scale-95 transition-all',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}
                    aria-hidden="true"
                  >
                    play_circle
                  </span>
                  {t('landing.hero.secondaryCta', {}, { defaultValue: 'Watch demo' })}
                </a>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', wrap: 'wrap', gap: 3 }),
                  cm.sp('mt', 6),
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
                  <span
                    className={cm.cn(
                      'material-symbols-outlined',
                      cm.textSize('sm'),
                      'text-success',
                    )}
                    aria-hidden="true"
                  >
                    check_circle
                  </span>
                  {t('landing.hero.trust1', {}, { defaultValue: 'No credit card' })}
                </div>
                <span className={'opacity-30'}>·</span>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
                  <span
                    className={cm.cn(
                      'material-symbols-outlined',
                      cm.textSize('sm'),
                      'text-success',
                    )}
                    aria-hidden="true"
                  >
                    check_circle
                  </span>
                  {t('landing.hero.trust2', {}, { defaultValue: 'SOC 2 type II' })}
                </div>
                <span className={'opacity-30'}>·</span>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
                  <span
                    className={cm.cn(
                      'material-symbols-outlined',
                      cm.textSize('sm'),
                      'text-success',
                    )}
                    aria-hidden="true"
                  >
                    check_circle
                  </span>
                  {t('landing.hero.trust3', {}, { defaultValue: 'Lineage on every chart' })}
                </div>
              </div>
            </div>

            {/* Sample query + chart mock — the Stitch hero visual */}
            <div className="relative mt-4 lg:mt-0">
              <div
                data-mol-id="hero-query-preview"
                className={cm.cn(
                  'relative z-10 translate-x-4 translate-y-4',
                  'bg-surface-container-lowest rounded-xl border border-outline-variant/25 p-6 shadow-[0_12px_40px_rgba(25,28,30,0.06)]',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 3 }),
                    'bg-surface-container-low rounded-lg p-4',
                    cm.sp('mb', 6),
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-secondary', cm.textSize('lg'))}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    bolt
                  </span>
                  <span
                    className={cm.cn(cm.fontWeight('medium'), 'tracking-tight text-on-surface')}
                  >
                    {t(
                      'landing.hero.sampleQuery',
                      {},
                      { defaultValue: 'Show me revenue by region last quarter' },
                    )}
                  </span>
                </div>
                <div
                  className={cm.cn(
                    'relative border border-outline-variant/25 rounded-lg p-6 bg-surface-container-lowest',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 1 }),
                      'absolute -top-3 -right-3 bg-secondary/15 text-secondary text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur-md',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-[14px]')}
                      aria-hidden="true"
                    >
                      auto_awesome
                    </span>
                    AI
                  </div>
                  <div
                    className={cm.cn(
                      cm.flex({ justify: 'between', align: 'start' }),
                      cm.sp('mb', 6),
                    )}
                  >
                    <div>
                      <h3
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                          'uppercase tracking-[0.05em] text-on-surface-variant',
                          cm.sp('mb', 1),
                        )}
                      >
                        {t('landing.hero.chartTitle', {}, { defaultValue: 'Q3 Revenue' })}
                      </h3>
                      <div className="text-3xl font-mono text-on-surface font-bold tabular-nums">
                        $4.2M
                      </div>
                    </div>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 1 }),
                        'bg-surface-container-low px-3 py-1 rounded-md text-sm font-medium text-secondary',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[16px]')}
                        aria-hidden="true"
                      >
                        trending_up
                      </span>
                      +12%
                    </div>
                  </div>
                  <div className={cm.cn(cm.flex({ align: 'end', gap: 4 }), 'h-32', cm.sp('mt', 4))}>
                    {HERO_BARS.map((bar) => (
                      <div
                        key={bar.region}
                        className={cm.cn(
                          cm.w('full'),
                          'relative rounded-t-sm',
                          bar.highlighted
                            ? 'bg-gradient-to-t from-primary-container to-primary shadow-sm'
                            : 'bg-surface-container-high',
                        )}
                        style={{ height: `${bar.heightPct}%` }}
                      >
                        {bar.highlighted ? (
                          <span
                            className={cm.cn(
                              'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-inverse-surface text-inverse-on-surface text-xs py-1 px-2 rounded whitespace-nowrap font-mono',
                            )}
                          >
                            {bar.value}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <div
                    className={cm.cn(
                      cm.flex({ justify: 'between' }),
                      'mt-3 text-xs uppercase tracking-wider font-bold text-on-surface-variant',
                    )}
                  >
                    {HERO_BARS.map((bar) => (
                      <span
                        key={bar.region}
                        className={bar.highlighted ? 'text-primary' : undefined}
                      >
                        {bar.region}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {/* Offset decorative backing card */}
              <div
                aria-hidden="true"
                className="absolute top-0 left-0 w-full h-full bg-surface-container-high rounded-xl border border-outline-variant/15 -z-10 translate-x-8 translate-y-8 opacity-50"
              />
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

        {/* Social-proof band — logo row over the proof-point strip */}
        <section
          className={cm.cn(
            'border-y border-outline-variant/20 bg-surface-container-low/50',
            cm.sp('py', 12),
            cm.sp('px', 6),
            'relative z-10',
          )}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.textCenter)}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
                cm.sp('mb', 8),
              )}
            >
              {t(
                'landing.proof.heading',
                {},
                { defaultValue: 'Built for serious analytics teams' },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ wrap: 'wrap', justify: 'center', gap: 8 }),
                'opacity-60 grayscale',
                cm.sp('mb', 8),
              )}
            >
              {PROOF_LOGOS.map((logo) => (
                <span
                  key={logo.name}
                  className={cm.cn(cm.textSize('xl'), logo.className, 'text-on-surface')}
                >
                  {logo.name}
                </span>
              ))}
            </div>
            <div
              className={cm.cn(
                cm.flex({ wrap: 'wrap', justify: 'center', align: 'center', gap: 6 }),
                'text-on-surface-variant opacity-80',
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
          <div
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
          </div>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 5 }), 'sm:grid-cols-2 lg:grid-cols-4')}>
            {FEATURES.map((f) => (
              <article
                key={f.key}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 3 }),
                  cm.sp('p', 6),
                  'rounded-xl bg-surface-container-lowest border border-outline-variant/40 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 transition-all duration-200',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(12),
                    cm.h(12),
                    'rounded-lg bg-primary/10 text-primary',
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
              'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-[0_24px_60px_rgba(53,37,205,0.25)] relative overflow-hidden',
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
                'rounded-md',
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
