import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE, BRAND_GRADIENT } from '../branding.js'

const FEATURES = [
  {
    key: 'ocr',
    defaultTitle: 'Upload anything, extract everything',
    defaultBody:
      'Upload PDFs, scans, or phone photos — high-fidelity OCR with confidence scoring on every extracted field.',
    icon: 'document_scanner',
    tint: 'text-primary',
  },
  {
    key: 'classify',
    defaultTitle: 'Classify automatically',
    defaultBody:
      'Invoices, receipts, contracts, and forms routed to the right folder by an AI that learns your filing rules.',
    icon: 'category',
    tint: 'text-secondary',
  },
  {
    key: 'extract',
    defaultTitle: 'Structured fields, on tap',
    defaultBody:
      'Vendor, totals, tax, due dates — every relevant field extracted to a clean schema, ready to export to CSV or your ERP.',
    icon: 'data_object',
    tint: 'text-tertiary',
  },
  {
    key: 'audit',
    defaultTitle: 'Reviewable on every step',
    defaultBody:
      'Per-page provenance, confidence colors, and full audit history so a teammate can verify any decision in seconds.',
    icon: 'fact_check',
    tint: 'text-info',
  },
] as const

const PROOF_POINTS = [
  { key: 'pages', defaultLabel: 'Pages processed', defaultValue: '12.4M+' },
  { key: 'accuracy', defaultLabel: 'Average accuracy', defaultValue: '96.2%' },
  { key: 'time', defaultLabel: 'Saved per invoice', defaultValue: '4.7 min' },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40',
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
          <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <span
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.flex({ align: 'center', justify: 'center' }),
                'rounded-lg text-white',
              )}
              style={{ background: BRAND_GRADIENT }}
            >
              <span
                className={cm.cn('material-symbols-outlined')}
                style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                description
              </span>
            </span>
            <span
              className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-primary')}
            >
              {APP_NAME}
            </span>
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'rounded-full text-white hover:opacity-90 transition-opacity',
                )}
                style={{ background: BRAND_GRADIENT }}
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
                    'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    'rounded-full text-white hover:opacity-90 transition-opacity',
                  )}
                  style={{ background: BRAND_GRADIENT }}
                >
                  {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn(
              'absolute inset-0 bg-gradient-to-br from-primary-container/30 via-surface to-surface pointer-events-none',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'py-20 md:py-28 lg:py-32 relative',
            )}
          >
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-12 items-center')}>
              <div className={cm.cn('lg:col-span-7')}>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mb', 4),
                    'font-bold uppercase tracking-widest text-primary',
                  )}
                >
                  {t('landing.eyebrow', {}, { defaultValue: 'OCR · Extraction · AI filing' })}
                </p>
                <h1
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95]',
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
                    cm.textSize('lg'),
                    cm.sp('mb', 10),
                    'text-on-surface-variant max-w-xl leading-relaxed',
                  )}
                >
                  {t(
                    'landing.heroSubtitle',
                    { app: APP_NAME },
                    {
                      defaultValue:
                        'Drop in a stack of invoices, receipts, contracts, or forms. {{app}} classifies, extracts, and files them — with confidence colors so your team only reviews what really needs a human.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      'font-semibold rounded-full text-white hover:opacity-90 transition-opacity inline-flex items-center gap-2 shadow-md shadow-primary/30',
                    )}
                    style={{ background: BRAND_GRADIENT }}
                  >
                    {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/login"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('semibold'),
                      'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>

                <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'lg' }), cm.sp('mt', 12))}>
                  {PROOF_POINTS.map((p) => (
                    <div key={p.key} className={cm.cn(cm.flex({ direction: 'col' }))}>
                      <span
                        className={cm.cn(
                          cm.textSize('2xl'),
                          'font-extrabold tracking-tight text-primary tabular-nums',
                        )}
                      >
                        {t(`landing.proof.${p.key}.value`, {}, { defaultValue: p.defaultValue })}
                      </span>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'uppercase tracking-widest text-on-surface-variant font-semibold',
                        )}
                        style={{ fontSize: 10 }}
                      >
                        {t(`landing.proof.${p.key}.label`, {}, { defaultValue: p.defaultLabel })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={cm.cn('lg:col-span-5')}>
                <div
                  className={cm.cn(
                    cm.flex({ direction: 'col', justify: 'between' }),
                    cm.sp('p', 8),
                    'min-h-[320px] rounded-[2rem] text-white relative overflow-hidden shadow-2xl shadow-primary/20',
                  )}
                  style={{ background: BRAND_GRADIENT }}
                >
                  <div className={cm.cn('relative z-10')}>
                    <p
                      className={cm.cn(
                        'font-bold text-xs uppercase tracking-widest text-white/80 mb-2',
                      )}
                    >
                      {t(
                        'landing.sampleCardLabel',
                        {},
                        { defaultValue: 'Documents processed today' },
                      )}
                    </p>
                    <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
                      <span
                        className={cm.cn('text-5xl font-extrabold tracking-tighter tabular-nums')}
                      >
                        128
                      </span>
                      <span
                        className={cm.cn(
                          'px-2 py-1 rounded-full text-[11px] font-bold bg-surface/20 backdrop-blur-md inline-flex items-center gap-1',
                        )}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-sm')}
                          aria-hidden="true"
                        >
                          trending_up
                        </span>
                        +12%
                      </span>
                    </div>
                    <p className={cm.cn('mt-4 text-sm text-white/80')}>
                      {t(
                        'landing.sampleCardSubtitle',
                        {},
                        {
                          defaultValue: '96.2% avg accuracy across invoices, receipts, and forms.',
                        },
                      )}
                    </p>
                  </div>
                  <div className={cm.cn('relative z-10 mt-6')}>
                    <div className={cm.cn('flex items-end gap-1 h-20 w-full')}>
                      {[35, 48, 30, 64, 52, 78, 90].map((h, i) => (
                        <div
                          key={i}
                          className={cm.cn('flex-1 rounded-t-md bg-surface/30')}
                          style={{ height: `${h}%`, opacity: 0.55 + i * 0.06 }}
                        />
                      ))}
                    </div>
                    <p
                      className={cm.cn(
                        'text-[10px] uppercase tracking-widest text-white/70 mt-3 font-semibold',
                      )}
                    >
                      {t(
                        'landing.sampleCardChartLabel',
                        {},
                        { defaultValue: 'Daily volume · last 7 days' },
                      )}
                    </p>
                  </div>
                  <div
                    className={cm.cn(
                      'absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-surface/10 blur-3xl',
                    )}
                  />
                  <div
                    className={cm.cn(
                      'absolute right-8 top-8 w-16 h-16 rounded-full bg-surface/15 blur-xl',
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2
            className={cm.cn(
              cm.sp('mb', 12),
              cm.textCenter,
              'text-3xl md:text-4xl font-extrabold tracking-tight',
            )}
          >
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'Document intelligence that explains itself' },
            )}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 hover:shadow-2xl hover:shadow-primary/10 transition-all group',
                )}
              >
                <div
                  className={cm.cn(
                    cm.sp('p', 3),
                    'inline-flex bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-3xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(cm.textSize('lg'), cm.sp('mt', 5), cm.sp('mb', 2), 'font-bold')}
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

        <section className={cm.cn('border-t border-outline-variant/40')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn(cm.textSize('3xl'), cm.sp('mb', 4), 'font-extrabold tracking-tight')}
            >
              {t(
                'landing.ctaHeading',
                {},
                { defaultValue: 'Stop typing receipts. Start filing them.' },
              )}
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
                    '14-day trial. No card needed. Cancel any time. Built for ops teams that move fast and audit slow.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                'font-semibold rounded-full text-white hover:opacity-90 transition-opacity inline-flex items-center gap-2 shadow-md shadow-primary/30',
              )}
              style={{ background: BRAND_GRADIENT }}
            >
              {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.sp('py', 8),
          cm.textCenter,
          cm.textSize('sm'),
          'bg-surface text-on-surface-variant border-t border-outline-variant',
        )}
      >
        <p>
          {t(
            'landing.copyright',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Built for ops teams that audit every page.' },
          )}
        </p>
      </footer>
    </div>
  )
}
