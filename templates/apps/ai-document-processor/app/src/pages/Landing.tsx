import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE, BRAND_GRADIENT } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

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

const EXTRACTED_FIELDS = [
  {
    key: 'vendor',
    defaultLabel: 'Vendor name',
    defaultValue: 'Acme Corporation',
    confidence: '99%',
    tone: 'text-primary bg-primary/10',
  },
  {
    key: 'date',
    defaultLabel: 'Invoice date',
    defaultValue: 'Oct 24, 2026',
    confidence: '95%',
    tone: 'text-primary bg-primary/10',
  },
  {
    key: 'total',
    defaultLabel: 'Total amount',
    defaultValue: '$12,450.00',
    confidence: '88%',
    tone: 'text-tertiary bg-tertiary/10',
  },
] as const

const LINE_ITEMS = [
  { key: 'hosting', defaultLabel: 'Server hosting (Q3)', defaultValue: '$4,500' },
  { key: 'license', defaultLabel: 'Database license', defaultValue: '$2,100' },
  { key: 'consulting', defaultLabel: 'Consulting hours', defaultValue: '$5,850' },
] as const

const TRUST_AVATARS = ['OM', 'JT', 'AS'] as const

function ExtractionPreview() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'relative min-h-[420px] lg:min-h-[600px] rounded-[2rem] bg-surface-container shadow-lift p-6 overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('mb', 6),
          cm.sp('pb', 4),
          'border-b border-outline-variant/20',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
          <div className="w-3 h-3 rounded-full bg-error/50" />
          <div className="w-3 h-3 rounded-full bg-tertiary/50" />
          <div className="w-3 h-3 rounded-full bg-primary/50" />
        </div>
        <div className="font-mono text-xs text-on-surface-variant px-3 py-1 bg-surface-container-lowest rounded-md">
          {t('landing.preview.fileName', {}, { defaultValue: 'processing_invoice_492.pdf' })}
        </div>
      </div>
      <div className={cm.cn(cm.flex1, 'grid grid-cols-5 gap-6 min-h-0')}>
        {/* Document page with field highlights */}
        <div className="col-span-2 bg-surface-container-lowest rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="w-full h-8 bg-surface-variant/30 rounded mb-4" />
          <div className="w-3/4 h-4 bg-surface-variant/30 rounded mb-2" />
          <div className="w-1/2 h-4 bg-surface-variant/30 rounded mb-8" />
          <div className="absolute top-20 left-4 right-8 h-8 border border-primary/40 bg-primary/5 rounded-md" />
          <div className="absolute top-36 left-4 right-12 h-24 border border-tertiary/40 bg-tertiary/5 rounded-md" />
          <div className="absolute bottom-16 right-4 w-32 h-10 border border-primary/40 bg-primary/5 rounded-md" />
        </div>
        {/* Extraction results */}
        <div className="col-span-3 flex flex-col gap-3 min-h-0">
          {EXTRACTED_FIELDS.map((field) => (
            <div
              key={field.key}
              className={cm.cn(
                'bg-surface-container-lowest rounded-xl p-3 shadow-sm flex items-center justify-between',
              )}
            >
              <div className={cm.flex({ direction: 'col' })}>
                <span className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">
                  {t(
                    `landing.preview.${field.key}.label`,
                    {},
                    { defaultValue: field.defaultLabel },
                  )}
                </span>
                <span className="font-medium text-sm text-on-surface">
                  {t(
                    `landing.preview.${field.key}.value`,
                    {},
                    { defaultValue: field.defaultValue },
                  )}
                </span>
              </div>
              <div className={cm.cn('font-mono text-xs px-2 py-1 rounded', field.tone)}>
                {field.confidence}
              </div>
            </div>
          ))}
          <div className="mt-4 flex-1 bg-surface-container-lowest rounded-xl p-3 shadow-sm border border-outline-variant/10 min-h-0">
            <span className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant mb-2 block">
              {t(
                'landing.preview.lineItems',
                { count: LINE_ITEMS.length },
                { defaultValue: 'Line items (3)' },
              )}
            </span>
            <div className="space-y-2">
              {LINE_ITEMS.map((item) => (
                <div
                  key={item.key}
                  className="flex justify-between items-center text-xs pb-2 border-b border-surface-container last:border-b-0 last:pb-0"
                >
                  <span className="text-on-surface">
                    {t(
                      `landing.preview.lineItem.${item.key}`,
                      {},
                      { defaultValue: item.defaultLabel },
                    )}
                  </span>
                  <span className="font-mono text-on-surface-variant">
                    {t(
                      `landing.preview.lineItem.${item.key}.amount`,
                      {},
                      { defaultValue: item.defaultValue },
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

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
            'flex-wrap gap-x-4 gap-y-2',
            cm.mxAuto,
          )}
        >
          <Link
            to="/"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              'min-w-0 whitespace-nowrap shrink-0',
            )}
          >
            <BrandWordmark as="span" />
          </Link>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'min-w-0')}>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'hidden sm:inline whitespace-nowrap',
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
                  cm.sp('py', 2.5),
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'whitespace-nowrap shrink-0',
                  'rounded-xl text-white hover:opacity-90 transition-opacity',
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
                    'whitespace-nowrap',
                    'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2.5),
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    'whitespace-nowrap shrink-0',
                    'rounded-xl text-white hover:opacity-90 transition-opacity',
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
        {/* Hero — left copy + right document-extraction preview */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn(
              'absolute inset-0 bg-gradient-to-br from-primary/5 to-surface-container-high/20 rounded-[3rem] blur-3xl opacity-50 pointer-events-none mx-4',
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
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center')}>
              <div className={cm.cn('max-w-2xl')}>
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
                    'text-5xl md:text-[64px] font-extrabold leading-[1.1] tracking-[-0.02em] text-on-surface',
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
                      'font-semibold text-lg rounded-xl text-white hover:opacity-90 transition-opacity inline-flex items-center gap-2 shadow-lift',
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
                      cm.textSize('lg'),
                      'inline-flex items-center gap-2 rounded-xl border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      login
                    </span>
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), cm.sp('mt', 12))}>
                  <div className="flex -space-x-3">
                    {TRUST_AVATARS.map((initials) => (
                      <span
                        key={initials}
                        aria-hidden="true"
                        className={cm.cn(
                          cm.w(10),
                          cm.h(10),
                          cm.flex({ align: 'center', justify: 'center' }),
                          'rounded-full border-2 border-surface-container-lowest shadow-sm bg-primary-container text-on-primary-container text-xs font-bold',
                        )}
                      >
                        {initials}
                      </span>
                    ))}
                  </div>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant font-medium')}>
                    {t(
                      'landing.trustedBy',
                      {},
                      { defaultValue: 'Trusted by ops teams at 200+ companies' },
                    )}
                  </p>
                </div>
              </div>

              <div className={cm.cn('lg:col-span-1')}>
                <ExtractionPreview />
              </div>
            </div>
          </div>
        </section>

        {/* Stats band */}
        <section className="border-y border-outline-variant/20 bg-surface-container-lowest">
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-10')}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-outline-variant/20">
              {PROOF_POINTS.map((p) => (
                <div
                  key={p.key}
                  className={cm.cn(cm.flex({ direction: 'col', gap: 2 }), 'py-4 md:py-0')}
                >
                  <span className="font-mono text-4xl font-bold text-primary tracking-tight tabular-nums">
                    {t(`landing.proof.${p.key}.value`, {}, { defaultValue: p.defaultValue })}
                  </span>
                  <span className="text-sm uppercase tracking-widest text-on-surface-variant font-medium">
                    {t(`landing.proof.${p.key}.label`, {}, { defaultValue: p.defaultLabel })}
                  </span>
                </div>
              ))}
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
                'font-semibold text-lg rounded-xl text-white hover:opacity-90 transition-opacity inline-flex items-center gap-2 shadow-lift',
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
