/**
 * Landing — Toolbelt marketing home (Stitch "mission-control" design).
 *
 * Sections: sticky nav → hero (headline + field-metrics card) → live
 * dispatch-board mock → 7-step quote-to-cash pipeline → trade-hardened
 * feature cards → dark proof band → testimonials → flat pricing → final
 * CTA → trade footer. Decorative controls are non-interactive by design.
 */
import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

const PIPELINE = [
  {
    num: '01',
    icon: 'description',
    titleKey: 'landing.pipeline.q1.title',
    title: 'Quote Fast',
    bodyKey: 'landing.pipeline.q1.body',
    body: 'Itemized parts and labor generated in 60s with margin locks.',
    chipKey: 'landing.pipeline.q1.chip',
    chip: 'Preset pricing',
  },
  {
    num: '02',
    icon: 'draw',
    titleKey: 'landing.pipeline.q2.title',
    title: 'Send & Accept',
    bodyKey: 'landing.pipeline.q2.body',
    body: 'Direct SMS quote link. Client approves with one-tap digital signature.',
    chipKey: 'landing.pipeline.q2.chip',
    chip: 'Instant signoff',
  },
  {
    num: '03',
    icon: 'calendar_month',
    titleKey: 'landing.pipeline.q3.title',
    title: 'Auto-Schedule',
    bodyKey: 'landing.pipeline.q3.body',
    body: 'Approved quotes instantly populate the crew board without retyping.',
    chipKey: 'landing.pipeline.q3.chip',
    chip: 'Zero re-entry',
  },
  {
    num: '04',
    icon: 'near_me',
    titleKey: 'landing.pipeline.q4.title',
    title: 'Dispatch',
    bodyKey: 'landing.pipeline.q4.body',
    body: 'Pushes route, gate codes, equipment history, and notes to technician app.',
    chipKey: 'landing.pipeline.q4.chip',
    chip: 'Turn-by-turn',
  },
  {
    num: '05',
    icon: 'photo_camera',
    titleKey: 'landing.pipeline.q5.title',
    title: 'Field Proof',
    bodyKey: 'landing.pipeline.q5.body',
    body: 'Mandatory before/after photos and wiring verification checks.',
    chipKey: 'landing.pipeline.q5.chip',
    chip: 'Liability proof',
  },
  {
    num: '06',
    icon: 'receipt_long',
    titleKey: 'landing.pipeline.q6.title',
    title: 'Single-Tap Bill',
    bodyKey: 'landing.pipeline.q6.body',
    body: 'Convert finished checklist straight to finished invoice right at the truck.',
    chipKey: 'landing.pipeline.q6.chip',
    chip: 'Line items locked',
  },
  {
    num: '07',
    icon: 'payments',
    titleKey: 'landing.pipeline.q7.title',
    title: 'Next-Day Cash',
    bodyKey: 'landing.pipeline.q7.body',
    body: 'Phone tap-to-pay, card, or instant bank deposit into your checking account.',
    chipKey: 'landing.pipeline.q7.chip',
    chip: 'Settled • 1.9%',
  },
]

const TECHS = [
  {
    key: 'dave',
    initials: 'DM',
    name: 'Dave Miller (Van #2)',
    address: '842 Ridgewood Rd, Oak Valley',
    note: 'DIAGNOSTIC: Dual-Run Capacitor 45/5 & Contactor',
    lines: ['Part Pulled from Van Stock', '$218.00 APPROVED'],
    chips: ['Signoff Captured', 'READY TO INVOICE'],
    tone: 'ready' as const,
  },
  {
    key: 'marcus',
    initials: 'MK',
    name: 'Marcus King (Truck #4)',
    address: '1104 Pine Crest Ter, Westford',
    note: 'CLIENT NOTE: Gate Code #4491 • Dogs in Garage',
    lines: ['City Permit #E-2024-88', '$3,450.00 ESTIMATE'],
    chips: ['Permit PDF Attached', 'MAP ROUTE ACTIVE'],
    tone: 'active' as const,
  },
  {
    key: 'carlos',
    initials: 'CR',
    name: 'Carlos Ramos (Van #1)',
    address: '329 North St, Apt 4B',
    note: 'COLLECTED VIA PHONE TAP: $425.00',
    lines: ['ACH Cleared Instant', 'SETTLED'],
    chips: ['Receipt Sent via SMS', 'CLOSED TICKET'],
    tone: 'done' as const,
  },
]

const TESTIMONIALS = [
  {
    key: 'brett',
    quote:
      '"Before Toolbelt, my guys were texting me messy handwritten chicken scratch from the driveway. Now they itemize the compressor right on their phone, hand the phone to the homeowner for signature, and the money is in my bank before the truck leaves the driveway."',
    name: 'Brett Callahan',
    role: 'Owner, Apex Heating & Cooling (7 Vans)',
    trade: 'HVAC Contractor',
  },
  {
    key: 'ray',
    quote:
      '"We tried the corporate field software. It cost an arm and a leg and required 15 hours of video training. My journeymen hated it. Toolbelt took my team 10 minutes to understand. No fluff, just routes, quotes, and tap-to-pay."',
    name: 'Ray Gallagher',
    role: 'Master Electrician, Vanguard Electrical (11 Techs)',
    trade: 'Electrical',
  },
]

const PLANS = [
  {
    key: 'solo',
    labelKey: 'landing.pricing.solo.label',
    label: 'Solo Operator',
    tierKey: 'landing.pricing.solo.tier',
    tier: '1 TRUCK',
    price: '$49',
    featured: false,
    features: [
      'Unlimited quotes & invoices',
      'Tap-to-pay card reader built-in',
      'Customer signoffs & SMS links',
      'QuickBooks Online 2-way sync',
    ],
  },
  {
    key: 'crew',
    labelKey: 'landing.pricing.crew.label',
    label: 'Crew & Dispatch',
    tierKey: 'landing.pricing.crew.tier',
    tier: 'UP TO 5 TRUCKS',
    price: '$129',
    featured: true,
    features: [
      'Everything in Solo Operator',
      'Live dispatch board & GPS fleet tracking',
      'Field photo checklists & liability logs',
      'Individual technician wage/margin tracking',
      'Extra trucks only +$20/mo each',
    ],
  },
]

interface FooterLink {
  key: string
  label: string
  href?: string
  to?: '/pricing' | '/terms' | '/privacy'
}

const FOOTER_COLS: Array<{ titleKey: string; title: string; links: FooterLink[] }> = [
  {
    titleKey: 'landing.footer.product',
    title: 'Product',
    links: [
      { key: 'landing.footer.features', label: 'Features', href: '#features' },
      { key: 'landing.footer.quoteToCash', label: 'Quote-to-Cash', href: '#workflow' },
      { key: 'landing.footer.calculator', label: 'Pricing Calculator', to: '/pricing' as const },
      { key: 'landing.footer.dispatch', label: 'HVAC & Plumbing Dispatch', href: '#workflow' },
    ],
  },
  {
    titleKey: 'landing.footer.trust',
    title: 'Contractor Trust',
    links: [
      { key: 'landing.footer.security', label: 'Security & Reliability', href: '#features' },
      { key: 'landing.footer.terms', label: 'Terms of Service', to: '/terms' as const },
      { key: 'landing.footer.privacy', label: 'Privacy Policy', to: '/privacy' as const },
    ],
  },
  {
    titleKey: 'landing.footer.trades',
    title: 'Trades Served',
    links: [
      { key: 'landing.footer.hvac', label: 'HVAC Heating & Cooling', href: '#features' },
      { key: 'landing.footer.plumbing', label: 'Residential Plumbing', href: '#features' },
      { key: 'landing.footer.electrical', label: 'Licensed Electricians', href: '#features' },
      { key: 'landing.footer.roofing', label: 'Roofing & Siding', href: '#features' },
      { key: 'landing.footer.handyman', label: 'General Handyman', href: '#features' },
    ],
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const monoLabel = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('bold'),
    'uppercase tracking-widest font-mono',
  )

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      {/* Sticky nav */}
      <nav
        className={
          'sticky top-0 z-50 bg-surface-container-lowest border-b border-outline-variant shadow-sm'
        }
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.mxAuto,
          )}
        >
          <BrandWordmark />
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'lg' }),
              'hidden md:flex whitespace-nowrap',
            )}
          >
            <a
              href="#features"
              className="text-sm font-medium text-on-surface hover:text-primary px-1"
            >
              {t('landing.navFeatures', {}, { defaultValue: 'Features' })}
            </a>
            <a
              href="#workflow"
              className="text-sm font-medium text-on-surface hover:text-primary px-1"
            >
              {t('landing.navWorkflow', {}, { defaultValue: 'Quote-to-Cash' })}
            </a>
            <Link
              to="/pricing"
              className="text-sm font-medium text-on-surface hover:text-primary px-1"
            >
              {t('landing.pricingLink', {}, { defaultValue: 'Pricing Calculator' })}
            </Link>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0')}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 text-sm font-semibold bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors"
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  data-mol-id="landing-nav-login"
                  className="px-3 py-2 text-sm font-medium text-on-surface hover:text-primary whitespace-nowrap"
                >
                  {t('landing.logIn', {}, { defaultValue: 'Log In' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="landing-signup-cta"
                  className="px-4 py-2 text-sm font-semibold bg-primary text-on-primary rounded-lg shadow-sm hover:bg-primary/90 transition-colors whitespace-nowrap"
                >
                  {t('landing.trialCta', {}, { defaultValue: 'Start 14-Day Free Trial' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — headline + field metrics, dispatch board below */}
        <section
          className={cm.cn(
            'relative overflow-hidden border-b border-outline-variant bg-surface-bright',
            cm.sp('pt', 12),
            cm.sp('pb', 16),
          )}
        >
          <div className={cm.cn('max-w-7xl', cm.mxAuto, cm.sp('px', 6))}>
            {/* Live pulse + eyebrow */}
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.sp('mb', 4))}>
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: 'var(--color-live-orange)' }}
                aria-hidden="true"
              />
              <span className={cm.cn(monoLabel)} style={{ color: 'var(--color-live-deep)' }}>
                {t('landing.heroEyebrow', {}, { defaultValue: 'Live: crews on the clock' })}
              </span>
            </div>
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12')}>
              <div className="lg:col-span-8">
                <h1
                  className={cm.cn(
                    'text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-4',
                  )}
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}.' },
                  )}
                </h1>
                <p
                  className={cm.cn(
                    cm.textSize('lg'),
                    'text-on-surface-variant max-w-2xl leading-relaxed',
                  )}
                >
                  {t(
                    'landing.heroSubtitle',
                    {},
                    {
                      defaultValue:
                        'Built specifically for trade contractors who quote the work, run the trucks, and collect the check. Stop chasing paperwork, messy clipboards, and lost billable hours.',
                    },
                  )}
                </p>
                <div
                  className={cm.cn(
                    cm.flex({ wrap: 'wrap', align: 'center', gap: 'md' }),
                    cm.sp('mt', 8),
                  )}
                >
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('px', 6),
                      cm.sp('py', 3),
                      'font-semibold bg-primary text-on-primary rounded-lg shadow-sm hover:bg-primary/90 transition-colors',
                    )}
                  >
                    <span className="material-symbols-outlined text-base" aria-hidden="true">
                      bolt
                    </span>
                    {t('landing.trialCta', {}, { defaultValue: 'Start 14-Day Free Trial' })}
                  </Link>
                  <a
                    href="#workflow"
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('px', 6),
                      cm.sp('py', 3),
                      'font-semibold rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    <span className="material-symbols-outlined text-base" aria-hidden="true">
                      play_circle
                    </span>
                    {t('landing.demoCta', {}, { defaultValue: 'Watch 2-Min Demo' })}
                  </a>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('mt', 6),
                    cm.textSize('xs'),
                    'text-on-surface-variant',
                  )}
                >
                  <span
                    className="material-symbols-outlined text-base"
                    style={{ color: 'var(--color-success)' }}
                    aria-hidden="true"
                  >
                    verified
                  </span>
                  {t(
                    'landing.heroTrust',
                    {},
                    {
                      defaultValue:
                        'Set up in 10 minutes • No credit card required • Works on any phone or tablet',
                    },
                  )}
                </div>
              </div>

              {/* Direct field metrics card */}
              <div className="lg:col-span-4">
                <div
                  className={cm.cn(
                    'bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm',
                    cm.sp('p', 5),
                  )}
                >
                  <div
                    className={cm.cn(
                      monoLabel,
                      cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                      'mb-3 pb-2 border-b border-outline-variant',
                    )}
                    style={{ color: 'var(--color-outline)' }}
                  >
                    <span>
                      {t('landing.metricsTitle', {}, { defaultValue: 'Direct Field Metrics' })}
                    </span>
                    <span className="material-symbols-outlined text-base" aria-hidden="true">
                      monitoring
                    </span>
                  </div>
                  <div>
                    <p
                      className={cm.cn(
                        cm.textSize('2xl'),
                        cm.fontWeight('bold'),
                        'text-on-surface',
                      )}
                    >
                      {t('landing.metric1.value', {}, { defaultValue: '60 sec' })}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'landing.metric1.label',
                        {},
                        { defaultValue: 'Average Quote Generation Time' },
                      )}
                    </p>
                  </div>
                  <div
                    className={cm.cn(
                      cm.sp('pt', 3),
                      cm.sp('mt', 3),
                      'border-t border-outline-variant',
                    )}
                  >
                    <p
                      className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}
                      style={{ color: 'var(--color-primary)' }}
                    >
                      {t('landing.metric2.value', {}, { defaultValue: '1.9% Flat' })}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'landing.metric2.label',
                        {},
                        { defaultValue: 'Direct Next-Day Card Pay, Zero Markup' },
                      )}
                    </p>
                  </div>
                  <div
                    className={cm.cn(
                      cm.sp('pt', 3),
                      cm.sp('mt', 3),
                      'border-t border-outline-variant',
                    )}
                  >
                    <p
                      className={cm.cn(
                        cm.textSize('2xl'),
                        cm.fontWeight('bold'),
                        'text-on-surface',
                      )}
                    >
                      {t('landing.metric3.value', {}, { defaultValue: 'Zero Double Entry' })}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'landing.metric3.label',
                        {},
                        { defaultValue: 'Parts feed into invoices into bank payout' },
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dispatch board mock */}
            <div
              className="bg-surface-container-lowest border rounded-lg shadow-sm overflow-hidden"
              style={{ borderColor: 'var(--color-outline)' }}
              data-mol-id="landing-dispatch-mock"
            >
              {/* Window chrome */}
              <div
                className={cm.cn(
                  'bg-surface-container px-4 py-3 border-b border-outline-variant',
                  cm.flex({ wrap: 'wrap', align: 'center', justify: 'between', gap: 'md' }),
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <div className={cm.cn(cm.flex({ gap: 'xs' }))} aria-hidden="true">
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: 'var(--color-outline-variant)' }}
                      />
                    ))}
                  </div>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'uppercase font-semibold tracking-wider ml-2 flex items-center gap-1.5',
                    )}
                  >
                    <span
                      className="material-symbols-outlined text-sm"
                      style={{ color: 'var(--color-primary)' }}
                      aria-hidden="true"
                    >
                      terminal
                    </span>
                    {t('landing.boardTitle', {}, { defaultValue: 'GPS SYNCED: 6 TRUCKS LIVE' })}
                  </span>
                </div>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.textSize('xs'))}>
                  <span
                    className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'text-on-surface')}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: 'var(--color-live-orange)' }}
                      aria-hidden="true"
                    />
                    {t('landing.boardBilled', {}, { defaultValue: 'Billed today' })}
                  </span>
                  <span
                    className="px-3 py-1 rounded border bg-surface-bright font-semibold"
                    style={{ borderColor: 'var(--color-outline-variant)' }}
                  >
                    {t('landing.boardTotal', {}, { defaultValue: '$7,490.00' })}
                  </span>
                </div>
              </div>
              {/* Technician cards */}
              <div
                className={cm.cn(
                  'grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface-container-low p-4 md:p-6',
                )}
              >
                {TECHS.map((tech) => (
                  <div
                    key={tech.key}
                    className={cm.cn(
                      'bg-surface-container-lowest border border-outline-variant rounded shadow-sm flex flex-col justify-between p-4',
                    )}
                  >
                    <div>
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'between', gap: 'xs' }),
                          'mb-2',
                        )}
                      >
                        <span
                          className="text-on-surface font-semibold"
                          style={{
                            fontSize: 11,
                            borderRadius: 4,
                            paddingBlock: 2,
                            paddingInline: 8,
                            backgroundColor: 'var(--color-surface-container-high)',
                            color: 'var(--color-primary)',
                          }}
                        >
                          {t(`landing.tech.${tech.key}.route`, {}, { defaultValue: 'ROUTE A' })}
                        </span>
                        <span
                          className="font-semibold"
                          style={{
                            fontSize: 11,
                            borderRadius: 4,
                            paddingBlock: 2,
                            paddingInline: 8,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: 'var(--color-surface-variant)',
                            color: 'var(--color-primary)',
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full animate-ping"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                            aria-hidden="true"
                          />
                          {t('landing.tech.live', {}, { defaultValue: 'LIVE' })}
                        </span>
                      </div>
                      <p
                        className={cm.cn(
                          cm.textSize('base'),
                          cm.fontWeight('semibold'),
                          'text-on-surface mb-1',
                        )}
                      >
                        {t(`landing.tech.${tech.key}.name`, {}, { defaultValue: tech.name })}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(`landing.tech.${tech.key}.address`, {}, { defaultValue: tech.address })}
                      </p>
                      <p
                        className={cm.cn(cm.textSize('xs'), 'font-mono mt-3 p-2 rounded border')}
                        style={{
                          backgroundColor: 'var(--color-surface-bright)',
                          borderColor: 'var(--color-outline-variant)',
                        }}
                      >
                        {t(`landing.tech.${tech.key}.note`, {}, { defaultValue: tech.note })}
                      </p>
                      <div className={cm.cn(cm.sp('mt', 2), cm.textSize('xs'), 'font-mono')}>
                        {tech.lines.map((line, li) => (
                          <div
                            key={line}
                            className={cm.cn(
                              cm.flex({ align: 'center', justify: 'between', gap: 'xs' }),
                              'text-on-surface font-medium',
                            )}
                          >
                            <span>
                              {t(
                                `landing.tech.${tech.key}.line${li + 1}`,
                                {},
                                { defaultValue: line },
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div
                      className={cm.cn(
                        cm.flex({ wrap: 'wrap', align: 'center', justify: 'between', gap: 'xs' }),
                        cm.sp('mt', 4),
                        cm.sp('pt', 3),
                        'border-t border-outline-variant',
                      )}
                    >
                      {tech.chips.map((chip, ci) => (
                        <span
                          key={chip}
                          className={cm.cn(cm.textSize('xs'), 'font-mono font-bold')}
                          style={{
                            color:
                              tech.tone === 'done'
                                ? 'var(--color-success)'
                                : tech.tone === 'active'
                                  ? 'var(--color-primary)'
                                  : 'var(--color-live-deep)',
                          }}
                        >
                          {t(`landing.tech.${tech.key}.chip${ci + 1}`, {}, { defaultValue: chip })}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {/* Board footer */}
              <div
                className={cm.cn(
                  'bg-surface-container-lowest px-4 py-2.5 border-t border-outline-variant',
                  cm.flex({ wrap: 'wrap', align: 'center', justify: 'between', gap: 'sm' }),
                  cm.textSize('xs'),
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'text-on-surface-variant',
                  )}
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">
                    sync
                  </span>
                  {t(
                    'landing.boardSync',
                    {},
                    {
                      defaultValue:
                        'All mobile logs synced with QuickBooks Online • Ledger accurate to the penny',
                    },
                  )}
                </span>
                <span style={{ color: 'var(--color-primary)' }} className={cm.fontWeight('medium')}>
                  {t(
                    'landing.boardProgress',
                    {},
                    { defaultValue: 'Shift Progress: 7 of 11 jobs finished' },
                  )}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Quote-to-cash pipeline */}
        <section
          id="workflow"
          className={cm.cn(
            'border-b border-outline-variant bg-surface-container-lowest py-16 md:py-24',
          )}
        >
          <div className={cm.cn('max-w-7xl', cm.mxAuto, cm.sp('px', 6))}>
            <div className={cm.cn('max-w-3xl mb-12')}>
              <span
                className={cm.cn(monoLabel, 'block mb-2')}
                style={{ color: 'var(--color-primary)' }}
              >
                {t('landing.pipelineEyebrow', {}, { defaultValue: 'Direct Pipeline' })}
              </span>
              <h2 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mb-3')}>
                {t(
                  'landing.pipelineTitle',
                  {},
                  { defaultValue: 'From scratch pad to settled bank deposit.' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
                {t(
                  'landing.pipelineSubtitle',
                  {},
                  {
                    defaultValue:
                      'Seven clean steps. Zero redundant data entry. Everything your lead technician inputs in the field flows straight through to your books.',
                  },
                )}
              </p>
            </div>
            <div
              className={cm.cn(
                cm.grid({ gap: 'md' }),
                'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7',
              )}
            >
              {PIPELINE.map((step) => (
                <div
                  key={step.num}
                  className={cm.cn(
                    cm.flex({ direction: 'col', justify: 'between', gap: 'md' }),
                    cm.sp('p', 4),
                    'rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm',
                  )}
                >
                  <div>
                    <span
                      className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'font-mono')}
                      style={{ color: 'var(--color-primary)' }}
                    >
                      {step.num}
                    </span>
                    <h3
                      className={cm.cn(
                        cm.textSize('base'),
                        cm.fontWeight('semibold'),
                        'text-on-surface mt-1',
                      )}
                    >
                      {t(step.titleKey, {}, { defaultValue: step.title })}
                    </h3>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant mt-2 leading-relaxed',
                      )}
                    >
                      {t(step.bodyKey, {}, { defaultValue: step.body })}
                    </p>
                  </div>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                    )}
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                      {step.icon}
                    </span>
                    {t(step.chipKey, {}, { defaultValue: step.chip })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trade-hardened features */}
        <section
          id="features"
          className={cm.cn('border-b border-outline-variant bg-surface-bright py-16 md:py-24')}
        >
          <div className={cm.cn('max-w-7xl', cm.mxAuto, cm.sp('px', 6))}>
            <div className={cm.cn('max-w-3xl mb-12')}>
              <span
                className={cm.cn(monoLabel, 'block mb-2')}
                style={{ color: 'var(--color-primary)' }}
              >
                {t('landing.featuresEyebrow', {}, { defaultValue: 'Built for Hard Work' })}
              </span>
              <h2 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mb-3')}>
                {t(
                  'landing.featuresTitle',
                  {},
                  { defaultValue: 'Tools made for truck cabs, not corporate boardrooms.' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
                {t(
                  'landing.featuresSubtitle',
                  {},
                  {
                    defaultValue:
                      'Designed with large touch-targets, daylight visibility, and offline reliability so your team actually uses it on site.',
                  },
                )}
              </p>
            </div>
            <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2')}>
              {/* Estimating card */}
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm',
                )}
              >
                <span
                  className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), monoLabel, 'mb-3')}
                  style={{ color: 'var(--color-live-deep)' }}
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    calculate
                  </span>
                  {t('landing.feature.estimating.tag', {}, { defaultValue: 'ESTIMATING' })}
                </span>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('semibold'),
                    'text-on-surface mb-4',
                  )}
                >
                  {t(
                    'landing.feature.estimating.title',
                    {},
                    { defaultValue: 'Quotes That Win Jobs Fast' },
                  )}
                </h3>
                <div
                  className={cm.cn(
                    'rounded-lg border border-outline-variant bg-surface-bright overflow-hidden',
                    cm.textSize('xs'),
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.grid({ gap: 'sm' }),
                      'grid-cols-[1fr_auto_auto] px-3 py-2 border-b border-outline-variant font-mono uppercase tracking-wider',
                    )}
                    style={{ color: 'var(--color-outline)' }}
                  >
                    <span>
                      {t('landing.feature.estimating.colItem', {}, { defaultValue: 'Item' })}
                    </span>
                    <span>
                      {t('landing.feature.estimating.colRate', {}, { defaultValue: 'Rate / Qty' })}
                    </span>
                    <span>
                      {t('landing.feature.estimating.colMargin', {}, { defaultValue: 'Margin %' })}
                    </span>
                  </div>
                  {[
                    {
                      item: 'Carrier 3-Ton 16 SEER Condenser',
                      rate: '$2,450.00 x 1',
                      margin: '48.2%',
                    },
                    { item: 'R-410A Freon Top-Off (4 lbs)', rate: '$280.00 x 1', margin: '62.0%' },
                  ].map((row) => (
                    <div
                      key={row.item}
                      className={cm.cn(
                        cm.grid({ gap: 'sm' }),
                        'grid-cols-[1fr_auto_auto] px-3 py-2 border-b border-outline-variant last:border-b-0 items-center',
                      )}
                    >
                      <span className="text-on-surface font-medium">{row.item}</span>
                      <span className="text-on-surface-variant font-mono">{row.rate}</span>
                      <span
                        className="font-mono font-bold"
                        style={{ color: 'var(--color-success)' }}
                      >
                        {row.margin}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fleet GPS card */}
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm',
                )}
              >
                <span
                  className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), monoLabel, 'mb-3')}
                  style={{ color: 'var(--color-live-deep)' }}
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    alt_route
                  </span>
                  {t('landing.feature.gps.tag', {}, { defaultValue: 'FLEET GPS' })}
                </span>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('semibold'),
                    'text-on-surface mb-4',
                  )}
                >
                  {t(
                    'landing.feature.gps.title',
                    {},
                    { defaultValue: 'Live Dispatch & Route Sync' },
                  )}
                </h3>
                <div
                  className={cm.cn(
                    cm.sp('p', 4),
                    'rounded-lg border border-outline-variant bg-surface-bright',
                  )}
                >
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'uppercase tracking-wider mb-2 text-on-surface-variant',
                    )}
                  >
                    {t('landing.feature.gps.label', {}, { defaultValue: 'Customer Notification' })}
                  </p>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                    {t(
                      'landing.feature.gps.message',
                      {},
                      {
                        defaultValue: '"Dave M. is 12 mins away in Truck #2. Track his van live."',
                      },
                    )}
                  </p>
                </div>
              </div>

              {/* Quality control card */}
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm',
                )}
              >
                <span
                  className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), monoLabel, 'mb-3')}
                  style={{ color: 'var(--color-live-deep)' }}
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    checklist
                  </span>
                  {t('landing.feature.qc.tag', {}, { defaultValue: 'QUALITY CONTROL' })}
                </span>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('semibold'),
                    'text-on-surface mb-4',
                  )}
                >
                  {t(
                    'landing.feature.qc.title',
                    {},
                    { defaultValue: 'Bulletproof Field Checklists' },
                  )}
                </h3>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                  {[
                    'Sub-panel torque verify (50 in-lbs)',
                    'Refrigerant leak sniffer scan: Pass',
                  ].map((item, qi) => (
                    <div
                      key={item}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.sp('p', 3),
                        'rounded-lg border border-outline-variant bg-surface-bright',
                      )}
                    >
                      <span
                        className="material-symbols-outlined text-[18px]"
                        style={{ color: 'var(--color-success)' }}
                        aria-hidden="true"
                      >
                        check_box
                      </span>
                      <span className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                        {t(`landing.feature.qc.item${qi + 1}`, {}, { defaultValue: item })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payments card */}
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm',
                )}
              >
                <span
                  className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), monoLabel, 'mb-3')}
                  style={{ color: 'var(--color-live-deep)' }}
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    contactless
                  </span>
                  {t('landing.feature.pay.tag', {}, { defaultValue: 'PAYMENTS' })}
                </span>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('semibold'),
                    'text-on-surface mb-4',
                  )}
                >
                  {t(
                    'landing.feature.pay.title',
                    {},
                    { defaultValue: 'Tap to Pay on Phone • Zero Hardware' },
                  )}
                </h3>
                <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-3')}>
                  {[
                    { v: '1.9%', l: 'Flat card fee', accent: false },
                    { v: 'Next-Day', l: 'Direct ACH', accent: false },
                    { v: '$0 Dongle', l: 'No hardware needed', accent: true },
                  ].map((s) => (
                    <div
                      key={s.v}
                      className={cm.cn(
                        cm.sp('p', 3),
                        'rounded-lg border border-outline-variant bg-surface-bright',
                      )}
                    >
                      <p
                        className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}
                        style={{ color: s.accent ? 'var(--color-primary)' : 'var(--color-text)' }}
                      >
                        {t(`landing.feature.pay.${s.v}`, {}, { defaultValue: s.v })}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(`landing.feature.pay.${s.l}`, {}, { defaultValue: s.l })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dark proof band */}
        <section
          className={cm.sp('py', 16) + ' md:py-20'}
          style={{ backgroundColor: 'var(--color-band-blue)' }}
        >
          <div className={cm.cn('max-w-7xl', cm.mxAuto, cm.sp('px', 6))}>
            <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2')}>
              {[
                {
                  v: '$42,000,000+',
                  k: 'landing.proof1.body',
                  body: 'In trade jobs quoted, dispatched, and paid into contractor accounts this calendar year.',
                },
                {
                  v: '3,400+',
                  k: 'landing.proof2.body',
                  body: 'Active trade business owner-operators running trucks daily across North America.',
                },
              ].map((stat) => (
                <div key={stat.v}>
                  <p
                    className={cm.cn(
                      'text-3xl md:text-5xl font-extrabold tracking-tight mb-2 text-white',
                    )}
                  >
                    {t(`landing.proof.${stat.v}`, {}, { defaultValue: stat.v })}
                  </p>
                  <p
                    className={cm.cn(cm.textSize('lg'))}
                    style={{ color: 'var(--color-on-band-blue)' }}
                  >
                    {t(stat.k, {}, { defaultValue: stat.body })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section
          className={cm.cn(
            'border-b border-outline-variant bg-surface-container-lowest py-16 md:py-24',
          )}
        >
          <div className={cm.cn('max-w-7xl', cm.mxAuto, cm.sp('px', 6))}>
            <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2')}>
              {TESTIMONIALS.map((tst) => (
                <div
                  key={tst.key}
                  className={cm.cn(
                    cm.sp('p', 8),
                    'rounded-xl border border-outline-variant bg-surface-bright shadow-sm flex flex-col',
                  )}
                >
                  <div className={cm.cn(cm.flex({ gap: 'xs' }), 'mb-4')} aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((n) => (
                      <span
                        key={n}
                        className="material-symbols-outlined text-[18px]"
                        style={{
                          color: 'var(--color-live-orange)',
                          fontVariationSettings: "'FILL' 1",
                        }}
                      >
                        star
                      </span>
                    ))}
                  </div>
                  <p
                    className={cm.cn(
                      cm.textSize('lg'),
                      'text-on-surface mb-6 italic leading-relaxed flex-1',
                    )}
                  >
                    {t(`landing.testimonial.${tst.key}.quote`, {}, { defaultValue: tst.quote })}
                  </p>
                  <div>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-on-surface',
                      )}
                    >
                      {t(`landing.testimonial.${tst.key}.name`, {}, { defaultValue: tst.name })}
                    </p>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t(`landing.testimonial.${tst.key}.role`, {}, { defaultValue: tst.role })}
                    </p>
                    <span
                      className={cm.cn(monoLabel, 'inline-block mt-2')}
                      style={{ color: 'var(--color-live-deep)' }}
                    >
                      {t(`landing.testimonial.${tst.key}.trade`, {}, { defaultValue: tst.trade })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className={cm.cn('border-b border-outline-variant bg-surface-bright py-16 md:py-24')}
        >
          <div className={cm.cn('max-w-7xl', cm.mxAuto, cm.sp('px', 6))}>
            <div className={cm.cn('text-center max-w-2xl mx-auto mb-12')}>
              <span
                className={cm.cn(monoLabel, 'block mb-2')}
                style={{ color: 'var(--color-primary)' }}
              >
                {t('landing.pricingEyebrow', {}, { defaultValue: 'Straightforward Pricing' })}
              </span>
              <h2 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mb-3')}>
                {t(
                  'landing.pricingTitle',
                  {},
                  { defaultValue: 'No setup fees. No contracts. Cancel anytime.' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
                {t(
                  'landing.pricingSubtitle',
                  {},
                  { defaultValue: 'Priced to pay for itself on your very first job of the month.' },
                )}
              </p>
            </div>
            <div className={cm.cn('grid gap-6 grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto')}>
              {PLANS.map((plan) => (
                <div
                  key={plan.key}
                  className={cm.cn(
                    cm.sp('p', 8),
                    'rounded-xl border flex flex-col',
                    plan.featured
                      ? 'bg-primary text-on-primary shadow-lg'
                      : 'bg-surface-container-lowest border-outline-variant shadow-sm',
                  )}
                  style={
                    plan.featured ? undefined : { borderColor: 'var(--color-outline-variant)' }
                  }
                >
                  <div
                    className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}
                  >
                    <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                      {t(plan.labelKey, {}, { defaultValue: plan.label })}
                    </span>
                    <span
                      className={cm.cn(monoLabel)}
                      style={{
                        color: plan.featured
                          ? 'var(--color-primary-light)'
                          : 'var(--color-on-surface-variant)',
                      }}
                    >
                      {t(plan.tierKey, {}, { defaultValue: plan.tier })}
                    </span>
                  </div>
                  <p className={cm.sp('mt', 4)}>
                    <span className={cm.cn('text-4xl font-extrabold tracking-tight')}>
                      {plan.price}
                    </span>
                    <span
                      className={cm.cn(cm.textSize('sm'))}
                      style={{
                        color: plan.featured
                          ? 'var(--color-on-band-blue)'
                          : 'var(--color-on-surface-variant)',
                      }}
                    >
                      {' '}
                      /{t('landing.pricing.month', {}, { defaultValue: 'month' })}
                    </span>
                  </p>
                  <ul
                    className={cm.cn(
                      cm.sp('mt', 6),
                      cm.flex({ direction: 'col', gap: 'sm' }),
                      'flex-1',
                    )}
                  >
                    {plan.features.map((f, fi) => (
                      <li
                        key={f}
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          cm.textSize('sm'),
                        )}
                      >
                        <span
                          className="material-symbols-outlined text-[16px] shrink-0"
                          style={{
                            color: plan.featured
                              ? 'var(--color-primary-light)'
                              : 'var(--color-success)',
                          }}
                          aria-hidden="true"
                        >
                          check
                        </span>
                        {t(`landing.pricing.${plan.key}.f${fi + 1}`, {}, { defaultValue: f })}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.sp('mt', 8),
                      'block w-full text-center px-4 py-3 rounded-lg font-semibold transition-colors',
                      plan.featured
                        ? 'bg-surface text-primary hover:bg-surface-container-lowest'
                        : 'bg-primary text-on-primary hover:bg-primary/90',
                    )}
                  >
                    {t('landing.pricing.cta', {}, { defaultValue: 'Start Free Trial' })}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className={cm.cn('bg-surface-container-low py-16 md:py-20')}>
          <div className={cm.cn('max-w-3xl mx-auto text-center', cm.sp('px', 6))}>
            <span
              className={cm.cn(monoLabel, 'block mb-3')}
              style={{ color: 'var(--color-live-deep)' }}
            >
              {t('landing.ctaEyebrow', {}, { defaultValue: 'READY TO GET ORGANIZED?' })}
            </span>
            <h2 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mb-4')}>
              {t(
                'landing.ctaTitle',
                {},
                { defaultValue: 'Get your crew on the same page by Monday morning.' },
              )}
            </h2>
            <p
              className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-xl mx-auto mb-8')}
            >
              {t(
                'landing.ctaSubtitle',
                {},
                {
                  defaultValue:
                    'Import your price book, assign your first work order, and send out an invoice in under 15 minutes.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                'sm:flex-row max-w-md mx-auto',
              )}
            >
              <input
                type="email"
                className={cm.cn(
                  cm.flex1,
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-lg border bg-surface-container-lowest text-on-surface w-full',
                )}
                style={{ borderColor: 'var(--color-outline-variant)' }}
                placeholder={t(
                  'landing.ctaEmailPlaceholder',
                  {},
                  { defaultValue: 'Work email address...' },
                )}
                aria-label={t(
                  'landing.ctaEmailPlaceholder',
                  {},
                  { defaultValue: 'Work email address...' },
                )}
              />
              <Link
                to="/signup"
                data-mol-id="landing-cta-signup"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-lg bg-primary text-on-primary shadow-sm whitespace-nowrap hover:bg-primary/90 transition-colors',
                )}
              >
                {t('landing.ctaButton', {}, { defaultValue: 'Start 14-Day Free Trial' })}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className={cm.cn(
          'bg-surface-container border-t border-outline-variant',
          cm.sp('py', 12),
          cm.sp('px', 6),
        )}
      >
        <div className={cm.cn('max-w-7xl', cm.mxAuto)}>
          <div className={cm.cn('grid gap-8 grid-cols-1 md:grid-cols-4')}>
            <div>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'mb-3')}>
                <BrandWordmark as="span" size="sm" footer />
              </div>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'font-mono uppercase tracking-wider',
                )}
                style={{ color: 'var(--color-success)' }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: 'var(--color-success)' }}
                  aria-hidden="true"
                />
                {t('landing.footer.operational', {}, { defaultValue: '100% OPERATIONAL' })}
              </span>
            </div>
            {FOOTER_COLS.map((col) => (
              <div key={col.title}>
                <h4
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'text-on-surface mb-3',
                  )}
                >
                  {t(col.titleKey, {}, { defaultValue: col.title })}
                </h4>
                <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                  {col.links.map((l) => (
                    <li key={l.key}>
                      {l.to ? (
                        <Link
                          to={l.to}
                          className={cm.cn(
                            cm.textSize('sm'),
                            'text-on-surface-variant hover:text-primary transition-colors',
                          )}
                        >
                          {t(l.key, {}, { defaultValue: l.label })}
                        </Link>
                      ) : (
                        <a
                          href={l.href}
                          className={cm.cn(
                            cm.textSize('sm'),
                            'text-on-surface-variant hover:text-primary transition-colors',
                          )}
                        >
                          {t(l.key, {}, { defaultValue: l.label })}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div
            className={cm.cn(
              cm.flex({ wrap: 'wrap', align: 'center', justify: 'between', gap: 'sm' }),
              cm.textSize('xs'),
              'text-on-surface-variant border-t border-outline-variant mt-10 pt-6',
            )}
          >
            <span>
              {t(
                'landing.footer.meta',
                {},
                { defaultValue: 'Austin, TX • SOC-2 Certified • Stripe Verified Partner' },
              )}
            </span>
            <span>
              {t(
                'common.copyrightBuiltWithMolecule',
                { year: new Date().getFullYear(), app: APP_NAME },
                { defaultValue: '© {{year}} {{app}} — Built with ' },
              )}
              <a
                href="https://molecule.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline font-medium"
              >
                Molecule.dev
              </a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
