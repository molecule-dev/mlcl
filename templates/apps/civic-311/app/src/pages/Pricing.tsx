import { useEffect, useState } from 'react'

import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * Public pricing page — Stitch design design-civic-311-pricing.
 * Statutory licensing story: annual/monthly billing toggle, the four
 * municipal tiers (Resident Portal → Regional Consortium), the interactive
 * dispatch-ROI calculator, the compliance feature matrix, the RFP packet
 * band, and the municipal FAQ. The live resident billing ladder (Stripe
 * checkout via /api/billing/tiers) is preserved at the bottom.
 *
 * The limits object comes back from `/api/billing/tiers` typed as
 * `unknown` here — we read fields by name so this app-side page does
 * not have to import across the api/app stack boundary at compile time.
 *
 * @returns The rendered pricing page.
 */

/** Municipal license tier card. */
interface CivicTier {
  id: string
  badge: string
  badgeTone: 'muted' | 'accent' | 'primary'
  icon: string
  title: string
  body: string
  priceAnnual: number | null
  priceMonthly: number | null
  priceNote: string
  featured?: boolean
  cta: string
  ctaHref: string
  features: Array<{ bold?: string; text: string }>
}

const CIVIC_TIERS: CivicTier[] = [
  {
    id: 'resident',
    badge: 'Civic Right',
    badgeTone: 'muted',
    icon: 'public',
    title: 'Resident & Community Portal',
    body: 'Open civic utility for verified residents, community boards, and local ward watch groups.',
    priceAnnual: 0,
    priceMonthly: 0,
    priceNote: 'Guaranteed by Riverton Charter § 4-101',
    cta: 'Access Resident Portal',
    ctaHref: '/signup',
    features: [
      { text: 'Public incident tracking & status logs' },
      { text: 'Self-service 311 incident submission' },
      { text: 'Geofenced neighborhood SMS updates' },
      { text: 'One-click public-records export' },
      { text: 'Council public docket notifications' },
    ],
  },
  {
    id: 'departmental',
    badge: 'Standard Ward',
    badgeTone: 'accent',
    icon: 'local_shipping',
    title: 'Departmental Operations',
    body: 'Built for mid-size public works bureaus, street maintenance, and local park crews.',
    priceAnnual: 1850,
    priceMonthly: 2180,
    priceNote: 'Billed annually ($22,200/yr)',
    cta: 'Request Ward License',
    ctaHref: 'mailto:procurement@rivertonpa.gov?subject=Ward%20License',
    features: [
      { bold: '10 Field Crew', text: ' mobile dispatch seats' },
      { text: 'Automated spatial geocoding & deduplication' },
      { text: 'Configurable SLA escalation routing engine' },
      { text: 'Citizen automated dispatch SMS alerts' },
      { text: 'Standard DPW fleet docket synchronization' },
    ],
  },
  {
    id: 'enterprise',
    badge: 'City-Wide Precinct',
    badgeTone: 'primary',
    icon: 'verified_user',
    title: 'Municipal Enterprise & Council',
    body: 'Unified operational platform across all departmental divisions and Ward Council seats.',
    priceAnnual: 3950,
    priceMonthly: 4650,
    priceNote: 'Billed annually ($47,400/yr)',
    featured: true,
    cta: 'Procure Precinct License',
    ctaHref: 'mailto:procurement@rivertonpa.gov?subject=Precinct%20License',
    features: [
      { bold: 'Unlimited', text: ' DPW, Parks & Traffic crew seats' },
      { bold: 'Council Member Ward Oversight', text: ' dashboard' },
      { text: 'Live spatial GIS cadastre & ESRI connector' },
      { bold: 'SHA-256 Ledger', text: ' cryptographic seal' },
      { text: 'Emergency 15-minute priority hot-patch SLA' },
      { text: '99.99% statutory uptime commitment' },
    ],
  },
  {
    id: 'regional',
    badge: 'County & Regional',
    badgeTone: 'muted',
    icon: 'hub',
    title: 'Regional Authority Consortium',
    body: 'County-level governance, mutual-aid pacts, and multi-jurisdiction shared emergency infrastructure.',
    priceAnnual: null,
    priceMonthly: null,
    priceNote: 'Inter-governmental agreement rate',
    cta: 'Schedule Inter-Agency Demo',
    ctaHref: 'mailto:procurement@rivertonpa.gov?subject=Inter-Agency%20Demo',
    features: [
      { text: 'Inter-agency mutual aid coordination grid' },
      { text: 'Regional county-wide GIS layer federation' },
      { text: 'Dedicated on-call municipal systems engineer' },
      { text: 'Air-gapped data retention & sovereign backup' },
      { text: 'Custom legal FOIA redaction pipeline' },
    ],
  },
]

/** Feature-matrix row: category headers vs capability rows. */
interface MatrixRow {
  category?: string
  capability?: string
  resident?: string
  departmental?: string
  enterprise?: string
  enterpriseStrong?: boolean
}

const FEATURE_MATRIX: MatrixRow[] = [
  { category: '1. Dispatch & Field Telemetry' },
  {
    capability: 'Field Crew Mobile Accounts',
    resident: 'N/A (Citizen only)',
    departmental: '10 Named Seats',
    enterprise: 'Unlimited Seats',
    enterpriseStrong: true,
  },
  {
    capability: 'Real-Time GPS AVL Vehicle Integration',
    resident: '—',
    departmental: 'Batch Sync (15m)',
    enterprise: 'Real-Time Sub-Second',
    enterpriseStrong: true,
  },
  {
    capability: 'Automated Spatial Deduplication',
    resident: '—',
    departmental: '✓',
    enterprise: '✓',
    enterpriseStrong: true,
  },
  {
    capability: 'SLA Dynamic Escalation Workflows',
    resident: '—',
    departmental: 'Standard 3-Tier',
    enterprise: 'Custom Unlimited',
    enterpriseStrong: true,
  },
  { category: '2. Citizen Engagement & Transparency' },
  {
    capability: 'Public Incident Docket Tracker',
    resident: '✓',
    departmental: '✓',
    enterprise: '✓',
    enterpriseStrong: true,
  },
  {
    capability: 'SMS / WhatsApp Status Notifications',
    resident: 'Basic SMS',
    departmental: '5,000 / mo',
    enterprise: 'Unlimited Broadcasts',
    enterpriseStrong: true,
  },
  {
    capability: 'Ward Council Oversight Portal',
    resident: '—',
    departmental: '—',
    enterprise: '✓',
    enterpriseStrong: true,
  },
  { category: '3. GIS & Geospatial Routing' },
  {
    capability: 'ESRI ArcGIS Enterprise Connector',
    resident: '—',
    departmental: 'Read-Only Layer',
    enterprise: 'Bidirectional Sync',
    enterpriseStrong: true,
  },
  {
    capability: 'County Cadastre Parcel Overlay',
    resident: '—',
    departmental: '✓',
    enterprise: '✓',
    enterpriseStrong: true,
  },
  { category: '4. Compliance & Statutory Security' },
  {
    capability: 'Open-Records Audit Logs',
    resident: 'Export only',
    departmental: '1-Year Storage',
    enterprise: '7-Year Statutory Vault',
    enterpriseStrong: true,
  },
  {
    capability: 'Cryptographic SHA-256 Record Tamper Seal',
    resident: '—',
    departmental: '—',
    enterprise: '✓',
    enterpriseStrong: true,
  },
  {
    capability: 'Law-Enforcement Data Boundary',
    resident: '—',
    departmental: '—',
    enterprise: 'Certified Included',
    enterpriseStrong: true,
  },
  {
    capability: 'Uptime SLA Guarantee',
    resident: 'Best Effort',
    departmental: '99.9%',
    enterprise: '99.99% Guaranteed',
    enterpriseStrong: true,
  },
]

/** FAQ accordion entry. */
const FAQS: Array<{ id: string; q: string; a: string }> = [
  {
    id: 'fiscal',
    q: 'How does billing align with municipal fiscal year appropriations?',
    a: 'CivicPulse accommodates statutory municipal budgeting cycles (July 1 or October 1 fiscal year starts). Encumbrance vouchers, split-year purchase orders, and multi-year city council appropriations are standard. Invoices can be issued with Net-45 or Net-60 terms upon certified warrant approval.',
  },
  {
    id: 'freeData',
    q: 'Is resident public data truly free, and how is privacy preserved?',
    a: 'Yes. The Resident & Community Portal is statutorily zero-cost for all residents. To safeguard privacy under state Sunshine guidelines, personal resident identity metadata (caller names, phone numbers, exact apartment addresses) is automatically hashed and redacted from the public docket while preserving precise geographic street coordinates for road repairs.',
  },
  {
    id: 'avl',
    q: 'How does field telemetry integrate with existing DPW fleet AVL systems?',
    a: 'CivicPulse includes bi-directional connectors for Trimble, Samsara, Geotab, and ESRI Fleet telemetry. In-cab tablets receive dispatched 311 work tickets directly onto route itineraries, updating the public status badge to "Crew Dispatched" automatically upon geofence entry.',
  },
  {
    id: 'sla',
    q: 'What is the statutory SLA guarantee for public emergency reroutes?',
    a: 'Critical infrastructure emergencies submitted via 311 (such as live downed wires, gas main breaks, or open sinkholes) trigger automated threshold escalations that route to Riverton 911 dispatch within 90 seconds, satisfying all county Emergency Management Agency standards.',
  },
]

export function Pricing() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const [annual, setAnnual] = useState(true)
  const [tickets, setTickets] = useState(12_500)
  const [crews, setCrews] = useState(24)
  const [rate, setRate] = useState(62)

  useEffect(() => {
    document.title = t(
      'pricing.pageTitle',
      { appName: APP_NAME },
      { defaultValue: 'Pricing — {{appName}}' },
    )
  }, [t])

  // Comptroller model: 12.5% of submitted tickets are redundant duplicates;
  // each avoided duplicate saves ~1.25 hours of truck mobilization.
  const duplicatesAvoided = Math.round(tickets * 0.125)
  const hoursSaved = duplicatesAvoided * 1.25
  const dollarSavings = Math.round(hoursSaved * rate)
  const fmt = (n: number): string => n.toLocaleString('en-US')

  const tr = (key: string, def: string, values?: Record<string, string>): string =>
    t(key, values ?? {}, { defaultValue: def })
  const h2 = cm.cn(cm.textSize('2xl'), cm.fontWeight('semibold'), 'text-on-surface')
  const eyebrow = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('bold'),
    'uppercase tracking-wider text-primary',
  )
  const badgeTone: Record<string, string> = {
    muted: 'bg-surface-container text-on-surface-variant',
    accent: 'bg-secondary-container text-on-secondary-container',
    primary: 'bg-primary-fixed text-on-primary-fixed',
  }

  return (
    <ContentPageShell
      bare
      containerSize="xl"
      dataMolId="page-pricing"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t(
        'pricing.eyebrow',
        {},
        { defaultValue: 'MUNICIPAL TRANSPARENCY & CIVIC TECHNOLOGY LICENSING' },
      )}
      title={tr(
        'pricing.title',
        'Predictable, statutory pricing for civic accountability & 311 operations.',
      )}
      subtitle={tr(
        'pricing.intro',
        'CivicPulse delivers end-to-end municipal incident dispatch, real-time public telemetry, and Sunshine-Law compliant open records. Designed for departmental efficiency and audit-grade resident trust.',
      )}
    >
      <div className={cm.stack(16)}>
        {/* Billing period toggle */}
        <div className={cm.stack(3)}>
          <div
            className={cm.cn(
              'mx-auto inline-flex items-center rounded-xl border border-outline-variant/40 bg-surface-container p-1 shadow-sm',
            )}
          >
            <button
              data-mol-id="pricing-billing-annual"
              className={cnToggle(cm, annual)}
              onClick={() => setAnnual(true)}
              type="button"
            >
              <span>{tr('pricing.annual', 'Annual Municipal Fiscal Budget')}</span>
              <span
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  'rounded-full bg-on-primary-container text-[11px] font-bold uppercase tracking-wider text-on-primary-fixed',
                )}
              >
                {tr('pricing.annualSave', 'Save 15% + GIS Audit')}
              </span>
            </button>
            <button
              data-mol-id="pricing-billing-monthly"
              className={cnToggle(cm, !annual)}
              onClick={() => setAnnual(false)}
              type="button"
            >
              <span>{tr('pricing.monthly', 'Monthly Operational')}</span>
            </button>
          </div>
          <p className={cm.cn(cm.textCenter, cm.textSize('xs'), 'text-on-surface-variant')}>
            {tr(
              'pricing.fiscalNote',
              'Fiscal Year 2025/2026 encumbrance vouchers supported via Standard Municipal PO.',
            )}
          </p>
        </div>

        {/* Municipal tier grid */}
        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 xl:grid-cols-4">
          {CIVIC_TIERS.map((tier) => (
            <div
              key={tier.id}
              data-mol-id={`pricing-tier-${tier.id}`}
              className={cm.cn(
                cm.flex({ direction: 'col', justify: 'between' }),
                cm.sp('p', 6),
                'relative rounded-xl',
                tier.featured
                  ? 'border-2 border-primary bg-surface-container-lowest shadow-md'
                  : 'border border-outline-variant/40 bg-surface-container-lowest',
              )}
            >
              {tier.featured && (
                <div className={cnFeaturedBadge(cm)}>
                  {tr('pricing.featuredBadge', 'Most Popular Civic Choice')}
                </div>
              )}
              <div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mb', 4),
                    tier.featured ? cm.sp('mt', 2) : '',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'rounded-full',
                      badgeTone[tier.badgeTone],
                    )}
                  >
                    {tr(`pricing.tier.${tier.id}.badge`, tier.badge)}
                  </span>
                  <span
                    className={cm.cn(
                      'material-symbols-outlined text-[20px]',
                      tier.id === 'regional' ? 'text-tertiary' : 'text-primary',
                    )}
                  >
                    {tier.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('semibold'),
                    cm.sp('mb', 1),
                    'text-on-surface',
                  )}
                >
                  {tr(`pricing.tier.${tier.id}.title`, tier.title)}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 5), 'text-on-surface-variant')}>
                  {tr(`pricing.tier.${tier.id}.body`, tier.body)}
                </p>
                <div className={cm.cn(cm.sp('mb', 6), 'border-b border-outline-variant/40 pb-6')}>
                  <div className={cm.flex({ align: 'baseline', gap: 1 })}>
                    {tier.priceAnnual === null ? (
                      <span className={cnPrice(cm, 'text-3xl')}>
                        {tr('pricing.customRfp', 'Custom RFP')}
                      </span>
                    ) : (
                      <span className={cnPrice(cm, 'text-4xl', tier.featured)}>
                        ${fmt(annual ? tier.priceAnnual : (tier.priceMonthly ?? tier.priceAnnual))}
                      </span>
                    )}
                    {tier.priceAnnual !== null && (
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {tier.priceAnnual === 0
                          ? tr('pricing.foreverFree', '/ forever free')
                          : tr('pricing.perMonth', '/ month')}
                      </span>
                    )}
                  </div>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('mt', 1),
                      tier.id === 'resident'
                        ? 'font-medium text-primary'
                        : 'text-on-surface-variant',
                    )}
                  >
                    {tr(`pricing.tier.${tier.id}.priceNote`, tier.priceNote)}
                  </p>
                </div>
                <ul
                  className={cm.cn(
                    cm.stack(3),
                    cm.textSize('sm'),
                    cm.sp('mb', 6),
                    'text-on-surface-variant',
                  )}
                >
                  {tier.features.map((f, i) => (
                    <li key={i} className={cm.flex({ align: 'start', gap: 'sm' })}>
                      <span className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] text-primary">
                        check_circle
                      </span>
                      <span>
                        {f.bold && (
                          <strong className="text-on-surface">
                            {tr(`pricing.tier.${tier.id}.f${i}Bold`, f.bold)}
                          </strong>
                        )}
                        {tr(`pricing.tier.${tier.id}.f${i}`, f.text)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <a
                data-mol-id={`pricing-tier-${tier.id}-cta`}
                className={cnTierCta(
                  cm,
                  Boolean(tier.featured),
                  tier.id === 'resident',
                  tier.id === 'regional',
                )}
                href={tier.ctaHref}
              >
                {tr(`pricing.tier.${tier.id}.cta`, tier.cta)}
              </a>
            </div>
          ))}
        </div>

        {/* Resident billing ladder (live Stripe tiers) */}
        <section data-mol-id="pricing-resident-ladder">
          <PricingPage
            period={annual ? 'year' : 'month'}
            headlineFontFamily="var(--font-display)"
            headingKey="pricing.heading"
            headingDefault={`Choose your ${APP_NAME} resident plan`}
            renderLimits={(limits) => (
              <LimitsList>
                <LimitsItem>
                  {formatNum(read(limits, 'maxOpenIssues'))}{' '}
                  {t('pricing.openIssues', {}, { defaultValue: 'open reports' })}
                </LimitsItem>
                <LimitsItem>
                  {formatNum(read(limits, 'maxWatchAreas'))}{' '}
                  {t('pricing.watchAreas', {}, { defaultValue: 'watch areas' })}
                </LimitsItem>
                <LimitsItem>
                  {t('pricing.photoAttachments', {}, { defaultValue: 'Photo attachments' })}:{' '}
                  {read(limits, 'photoAttachments') ? '✓' : '—'}
                </LimitsItem>
                <LimitsItem>
                  {t('pricing.duplicateDetection', {}, { defaultValue: 'Duplicate detection' })}:{' '}
                  {read(limits, 'duplicateDetection') ? '✓' : '—'}
                </LimitsItem>
                <LimitsItem>
                  {t('pricing.watchAreaAlerts', {}, { defaultValue: 'Watch-area alerts' })}:{' '}
                  {read(limits, 'watchAreaAlerts') ? '✓' : '—'}
                </LimitsItem>
                <LimitsItem>
                  {t('pricing.exportHistory', {}, { defaultValue: 'Report-history export' })}:{' '}
                  {read(limits, 'exportHistory') ? '✓' : '—'}
                </LimitsItem>
              </LimitsList>
            )}
          />
        </section>

        {/* Interactive ROI calculator */}
        <section
          data-mol-id="pricing-roi"
          className={cnSection(
            cm,
            'border-y border-outline-variant/40 bg-surface-container-low py-16',
          )}
        >
          <div className={cnSectionHead(cm)}>
            <span className={eyebrow}>
              {tr('pricing.roi.eyebrow', 'Riverton Comptroller Financial Model')}
            </span>
            <h2 className={cm.cn(h2, cm.sp('mt', 1), cm.sp('mb', 3))}>
              {tr('pricing.roi.title', 'Interactive Municipal Efficiency & Dispatch ROI')}
            </h2>
            <p className={cnSectionBody(cm)}>
              {tr(
                'pricing.roi.subtitle',
                'Simulate tangible taxpayer savings through spatial dispatch deduplication, automated citizen notifications, and expedited departmental closeouts.',
              )}
            </p>
          </div>
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            {/* Ward parameter sliders */}
            <div
              className={cm.cn(
                cm.stack(6),
                'rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm lg:col-span-5',
              )}
            >
              <h3
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.textSize('lg'),
                  cm.fontWeight('semibold'),
                  'text-on-surface',
                )}
              >
                <span className="material-symbols-outlined text-primary">tune</span>
                {tr('pricing.roi.params', 'Ward Parameters')}
              </h3>
              <label className={cm.stack(2)}>
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <span className={cnSliderLabel(cm)}>
                    {tr('pricing.roi.tickets', 'Annual 311 Incident Reports')}
                  </span>
                  <span className={cnSliderValue(cm)} data-mol-id="pricing-roi-tickets">
                    {fmt(tickets)}
                  </span>
                </div>
                <input
                  aria-label={tr('pricing.roi.tickets', 'Annual 311 Incident Reports')}
                  className={cm.w('full')}
                  max={60_000}
                  min={2_000}
                  step={500}
                  type="range"
                  value={tickets}
                  onChange={(e) => setTickets(Number(e.target.value))}
                />
                <div
                  className={cm.cn(
                    cm.flex({ justify: 'between' }),
                    cm.textSize('xs'),
                    'font-mono text-on-surface-variant',
                  )}
                >
                  <span>{tr('pricing.roi.ticketsMin', '2k (Borough)')}</span>
                  <span>{tr('pricing.roi.ticketsMid', '25k (Ward)')}</span>
                  <span>{tr('pricing.roi.ticketsMax', '60k (Metro)')}</span>
                </div>
              </label>
              <label className={cm.stack(2)}>
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <span className={cnSliderLabel(cm)}>
                    {tr('pricing.roi.crews', 'Dispatched Field Units (DPW/Parks)')}
                  </span>
                  <span className={cnSliderValue(cm)}>
                    {fmt(crews)} {tr('pricing.roi.units', 'Units')}
                  </span>
                </div>
                <input
                  aria-label={tr('pricing.roi.crews', 'Dispatched Field Units (DPW/Parks)')}
                  className={cm.w('full')}
                  max={120}
                  min={5}
                  step={1}
                  type="range"
                  value={crews}
                  onChange={(e) => setCrews(Number(e.target.value))}
                />
                <div
                  className={cm.cn(
                    cm.flex({ justify: 'between' }),
                    cm.textSize('xs'),
                    'font-mono text-on-surface-variant',
                  )}
                >
                  <span>5</span>
                  <span>50</span>
                  <span>120</span>
                </div>
              </label>
              <label className={cm.stack(2)}>
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <span className={cnSliderLabel(cm)}>
                    {tr('pricing.roi.rate', 'Fully Loaded Crew Labor Rate')}
                  </span>
                  <span className={cnSliderValue(cm)}>${rate} / hr</span>
                </div>
                <input
                  aria-label={tr('pricing.roi.rate', 'Fully Loaded Crew Labor Rate')}
                  className={cm.w('full')}
                  max={110}
                  min={40}
                  step={2}
                  type="range"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                />
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {tr(
                    'pricing.roi.rateNote',
                    'Includes municipal benefits, equipment mobilization, and fuel allowance.',
                  )}
                </p>
              </label>
              <div className={cnWell(cm)}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mb', 2),
                    'block font-medium text-on-surface-variant',
                  )}
                >
                  {tr('pricing.roi.presets', 'Riverton Precinct Benchmarks:')}
                </span>
                <div className={cm.flex({ gap: 'sm', wrap: 'wrap' })}>
                  {(
                    [
                      ['ward1', 'Ward 1 (Rural)', 6_200, 12, 58],
                      ['ward2', 'Ward 2 (Commercial)', 18_400, 36, 68],
                      ['ward3', 'Ward 3 (High-Density)', 34_000, 75, 74],
                    ] as const
                  ).map(([id, label, tv, cv, rv]) => (
                    <button
                      key={id}
                      className={cnPreset(cm)}
                      data-mol-id={`pricing-roi-preset-${id}`}
                      type="button"
                      onClick={() => {
                        setTickets(tv)
                        setCrews(cv)
                        setRate(rv)
                      }}
                    >
                      {tr(`pricing.roi.preset.${id}`, label)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* ROI metric bentos */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col', justify: 'between' }),
                  'rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm sm:col-span-2',
                )}
              >
                <div className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}>
                  <div>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'uppercase tracking-wider text-on-surface-variant',
                      )}
                    >
                      {tr('pricing.roi.savingsLabel', 'Estimated Annual Fiscal Recovery')}
                    </span>
                    <div
                      className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }), cm.sp('mt', 1))}
                    >
                      <span
                        className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'text-primary')}
                        data-mol-id="pricing-roi-savings"
                      >
                        ${fmt(dollarSavings)}
                      </span>
                      <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                        {tr('pricing.roi.perFiscalYear', '/ municipal fiscal yr')}
                      </span>
                    </div>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-container text-on-primary">
                    <span className="material-symbols-outlined text-[24px]">savings</span>
                  </div>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('mt', 4),
                    'border-t border-outline-variant/40 pt-4 text-xs text-on-surface-variant',
                  )}
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    verified
                  </span>
                  <span>
                    {tr(
                      'pricing.roi.savingsNote',
                      'Calculated based on 12.5% duplicate dispatch prevention via AI geocoding.',
                    )}
                  </span>
                </div>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col', justify: 'between' }),
                  'rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm',
                )}
              >
                <div>
                  <span className={cm.cn(cm.textSize('xs'), 'font-medium text-on-surface-variant')}>
                    {tr('pricing.roi.rollsLabel', 'Duplicate Truck Rolls Avoided')}
                  </span>
                  <p
                    className={cm.cn(
                      cm.textSize('xl'),
                      cm.fontWeight('bold'),
                      cm.sp('mt', 1),
                      'text-on-surface',
                    )}
                  >
                    {fmt(duplicatesAvoided)} {tr('pricing.roi.rolls', 'rolls')}
                  </p>
                </div>
                <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 3), 'text-on-surface-variant')}>
                  {tr(
                    'pricing.roi.rollsNote',
                    'Saves ~1,870 staff hours in unnecessary travel and redundant on-site assessments.',
                  )}
                </p>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col', justify: 'between' }),
                  'rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm',
                )}
              >
                <div>
                  <span className={cm.cn(cm.textSize('xs'), 'font-medium text-on-surface-variant')}>
                    {tr('pricing.roi.turnaroundLabel', 'Turnaround SLA Improvement')}
                  </span>
                  <p
                    className={cm.cn(
                      cm.textSize('xl'),
                      cm.fontWeight('bold'),
                      cm.sp('mt', 1),
                      'text-primary',
                    )}
                  >
                    {tr('pricing.roi.turnaround', '-42.4% Faster')}
                  </p>
                </div>
                <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 3), 'text-on-surface-variant')}>
                  {tr(
                    'pricing.roi.turnaroundNote',
                    'From 6.2 day average down to 3.5 days for Tier-2 road and pothole repairs.',
                  )}
                </p>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                  'rounded-xl border border-outline-variant/40 bg-surface-container p-5 sm:col-span-2',
                )}
              >
                <div className={cm.flex({ align: 'center', gap: 'md' })}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-outline-variant/40 bg-surface-container-lowest text-primary">
                    <span className="material-symbols-outlined text-[20px]">description</span>
                  </span>
                  <div>
                    <h4
                      className={cm.cn(
                        cm.textSize('base'),
                        cm.fontWeight('semibold'),
                        'text-on-surface',
                      )}
                    >
                      {tr('pricing.roi.sunshine.title', 'Sunshine Act Automation')}
                    </h4>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {tr(
                        'pricing.roi.sunshine.body',
                        'Averages 340 staff hours saved on public FOIA record redactions per quarter.',
                      )}
                    </p>
                  </div>
                </div>
                <a
                  data-mol-id="pricing-roi-audit-cta"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'shrink-0 rounded-lg border border-primary text-sm font-semibold text-primary transition-colors hover:bg-surface-container-lowest',
                  )}
                  href="mailto:comptroller@rivertonpa.gov?subject=Audit%20Memo"
                >
                  {tr('pricing.roi.sunshine.cta', 'View Audit Memo')}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Comprehensive feature matrix */}
        <section data-mol-id="pricing-matrix" className={cnSection(cm)}>
          <div className={cnSectionHead(cm)}>
            <span className={eyebrow}>
              {tr('pricing.matrix.eyebrow', 'Statutory Specifications')}
            </span>
            <h2 className={cm.cn(h2, cm.sp('mt', 1), cm.sp('mb', 3))}>
              {tr('pricing.matrix.title', 'Comprehensive Feature Matrix')}
            </h2>
            <p className={cnSectionBody(cm)}>
              {tr(
                'pricing.matrix.subtitle',
                'Detailed functional compliance across municipal tiers. Designed to fulfill public tender requirement rubrics.',
              )}
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant/40 bg-surface-container text-on-surface">
                  <th
                    className={cm.cn(
                      cm.sp('py', 4),
                      cm.sp('px', 6),
                      cm.textSize('sm'),
                      cm.fontWeight('bold'),
                    )}
                  >
                    {tr('pricing.matrix.th1', 'Capability & Service Standard')}
                  </th>
                  <th className={cnTh(cm)}>{tr('pricing.matrix.th2', 'Resident Portal')}</th>
                  <th className={cnTh(cm)}>{tr('pricing.matrix.th3', 'Departmental')}</th>
                  <th className={cnTh(cm, 'bg-primary-container/10 text-primary')}>
                    {tr('pricing.matrix.th4', 'Precinct Enterprise')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-sm text-on-surface-variant">
                {FEATURE_MATRIX.map((row, i) =>
                  row.category ? (
                    <tr
                      key={i}
                      className="bg-surface-container-low text-xs font-bold text-on-surface"
                    >
                      <td
                        className={cm.cn(
                          cm.sp('py', 3),
                          cm.sp('px', 6),
                          'uppercase tracking-wider',
                        )}
                        colSpan={4}
                      >
                        {tr(`pricing.matrix.cat${i}`, row.category)}
                      </td>
                    </tr>
                  ) : (
                    <tr key={i} className="transition-colors hover:bg-surface-container-low">
                      <td
                        className={cm.cn(
                          cm.sp('py', 4),
                          cm.sp('px', 6),
                          cm.fontWeight('medium'),
                          'text-on-surface',
                        )}
                      >
                        {tr(`pricing.matrix.r${i}.cap`, row.capability ?? '')}
                      </td>
                      <td className={cnTd(cm)}>
                        {tr(`pricing.matrix.r${i}.res`, row.resident ?? '')}
                      </td>
                      <td className={cnTd(cm)}>
                        {tr(`pricing.matrix.r${i}.dep`, row.departmental ?? '')}
                      </td>
                      <td className={cnTd(cm, 'bg-primary-container/5 text-primary font-semibold')}>
                        {tr(`pricing.matrix.r${i}.ent`, row.enterprise ?? '')}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* RFP packet band */}
        <section data-mol-id="pricing-rfp" id="rfp" className={cnSection(cm)}>
          <div
            className={cm.cn(
              cm.sp('p', 8),
              cm.flex({ direction: 'col', align: 'center', justify: 'between', gap: 'lg' }),
              'rounded-2xl border border-outline-variant/40 bg-surface-container lg:flex-row',
            )}
          >
            <div className={cm.stack(4)}>
              <div className={cm.flex({ gap: 'sm', wrap: 'wrap' })}>
                {(
                  [
                    ['gsa', 'GSA Schedule 70'],
                    ['title65', 'PA Title 65 Compliant'],
                    ['cjis', 'CJIS Level 3 Certified'],
                    ['soc2', 'SOC-2 Type II Certified'],
                  ] as const
                ).map(([id, badge]) => (
                  <span
                    key={id}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      'rounded-md border border-outline-variant/40 bg-surface-container-lowest font-mono font-medium text-on-surface-variant',
                    )}
                  >
                    {tr(`pricing.rfp.badge.${id}`, badge)}
                  </span>
                ))}
              </div>
              <h2
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), 'text-on-surface')}
              >
                {tr('pricing.rfp.title', 'Sole Source Justification & Municipal RFP Packet')}
              </h2>
              <p className={cnSectionBody(cm, 'text-left')}>
                {tr(
                  'pricing.rfp.body',
                  'Riverton City Managers, Ward Comptrollers, and DPW Directors can download pre-populated procurement justifications, contract boilerplate, and municipal budget line-item codes (Object Class 3110 / Software Services).',
                )}
              </p>
            </div>
            <div className={cm.cn(cm.stack(3), 'w-full shrink-0 sm:w-auto')}>
              <a
                data-mol-id="pricing-rfp-download"
                className={cnBtnPrimary(cm)}
                href="mailto:procurement@rivertonpa.gov?subject=RFP%20Packet"
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
                {tr('pricing.rfp.download', 'Download RFP & Sole Source Packet')}
              </a>
              <a
                data-mol-id="pricing-rfp-briefing"
                className={cnBtnOutline(cm)}
                href="mailto:procurement@rivertonpa.gov?subject=Briefing"
              >
                <span className="material-symbols-outlined text-[20px]">schedule</span>
                {tr('pricing.rfp.briefing', 'Schedule Legal/Procurement Briefing')}
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section data-mol-id="pricing-faq" className={cnSection(cm)}>
          <div className={cnSectionHead(cm)}>
            <span className={eyebrow}>{tr('pricing.faq.eyebrow', 'Municipal Inquiries')}</span>
            <h2 className={cm.cn(h2, cm.sp('mt', 1), cm.sp('mb', 2))}>
              {tr('pricing.faq.title', 'Frequently Answered Questions')}
            </h2>
            <p className={cnSectionBody(cm)}>
              {tr(
                'pricing.faq.subtitle',
                'Common procedural questions regarding Riverton municipal contracting and technical deployment.',
              )}
            </p>
          </div>
          <div className={cm.stack(4)}>
            {FAQS.map((faq, i) => (
              <details
                key={faq.id}
                className="group rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 transition-all [&_summary::-webkit-details-marker]:hidden"
                open={i === 0}
              >
                <summary
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                    'cursor-pointer text-base font-semibold text-on-surface',
                  )}
                >
                  <span>{tr(`pricing.faq.${faq.id}.q`, faq.q)}</span>
                  <span className="material-symbols-outlined shrink-0 text-on-surface-variant transition-transform group-open:rotate-180">
                    expand_more
                  </span>
                </summary>
                <div
                  className={cm.cn(
                    cm.sp('mt', 4),
                    'border-t border-outline-variant/40 pt-2 text-sm leading-relaxed text-on-surface-variant',
                  )}
                >
                  {tr(`pricing.faq.${faq.id}.a`, faq.a)}
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </ContentPageShell>
  )
}

/* ── small class helpers ── */

const cnToggle = (cm: ReturnType<typeof getClassMap>, active: boolean): string =>
  cm.cn(
    cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
    cm.sp('px', 5),
    cm.sp('py', 3),
    cm.roundedFull,
    'text-sm transition-all',
    active
      ? 'bg-surface-container-lowest font-semibold text-primary shadow-sm'
      : 'font-medium text-on-surface-variant hover:text-on-surface',
  )

const cnPrice = (cm: ReturnType<typeof getClassMap>, size: string, primary = false): string =>
  cm.cn(size, cm.fontWeight('bold'), primary ? 'text-primary' : 'text-on-surface')

const cnFeaturedBadge = (cm: ReturnType<typeof getClassMap>): string =>
  cm.cn(
    cm.sp('px', 3),
    cm.sp('py', 1),
    'absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary text-xs font-bold uppercase tracking-wide text-on-primary shadow-sm',
  )

const cnTierCta = (
  cm: ReturnType<typeof getClassMap>,
  featured: boolean,
  free: boolean,
  regional: boolean,
): string =>
  cm.cn(
    cm.w('full'),
    cm.textCenter,
    cm.sp('px', 4),
    cm.sp('py', 3),
    'rounded-lg',
    cm.textSize('sm'),
    cm.fontWeight('semibold'),
    'transition-colors',
    featured
      ? 'bg-primary text-on-primary shadow-sm hover:bg-primary-container'
      : free
        ? 'border border-primary text-primary hover:bg-surface-container-low'
        : regional
          ? 'border border-secondary text-secondary hover:bg-surface-container hover:text-on-surface'
          : 'bg-surface-container text-on-surface hover:bg-surface-container-high',
  )

const cnSection = (cm: ReturnType<typeof getClassMap>, extra = ''): string =>
  cm.cn(extra || 'py-16')

const cnSectionHead = (cm: ReturnType<typeof getClassMap>): string =>
  cm.cn('mx-auto mb-12 max-w-3xl text-center')

const cnSectionBody = (cm: ReturnType<typeof getClassMap>, extra = ''): string =>
  cm.cn(cm.textSize('base'), 'text-on-surface-variant', extra)

const cnSliderLabel = (cm: ReturnType<typeof getClassMap>): string =>
  cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')

const cnSliderValue = (cm: ReturnType<typeof getClassMap>): string =>
  cm.cn(cm.textSize('sm'), 'font-mono font-bold text-primary')

const cnWell = (cm: ReturnType<typeof getClassMap>): string =>
  cm.cn('border-t border-outline-variant/40 pt-4')

const cnPreset = (cm: ReturnType<typeof getClassMap>): string =>
  cm.cn(
    cm.sp('px', 3),
    cm.sp('py', 1),
    cm.textSize('xs'),
    cm.fontWeight('medium'),
    'rounded-md bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface',
  )

const cnTh = (cm: ReturnType<typeof getClassMap>, extra = ''): string =>
  cm.cn(
    cm.sp('py', 4),
    cm.sp('px', 4),
    cm.textSize('sm'),
    cm.fontWeight('semibold'),
    'text-center',
    extra,
  )

const cnTd = (cm: ReturnType<typeof getClassMap>, extra = ''): string =>
  cm.cn(cm.sp('py', 4), cm.sp('px', 4), 'text-center', extra)

const cnBtnPrimary = (cm: ReturnType<typeof getClassMap>): string =>
  cm.cn(
    cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
    cm.sp('px', 6),
    cm.sp('py', 3),
    'rounded-lg',
    cm.textSize('sm'),
    cm.fontWeight('semibold'),
    'bg-primary text-on-primary shadow-sm transition-colors hover:bg-primary-container',
  )

const cnBtnOutline = (cm: ReturnType<typeof getClassMap>): string =>
  cm.cn(
    cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
    cm.sp('px', 6),
    cm.sp('py', 3),
    'rounded-lg',
    cm.textSize('sm'),
    cm.fontWeight('semibold'),
    'border border-outline-variant bg-surface-container-lowest text-on-surface transition-colors hover:bg-surface-container',
  )

const formatNum = (n: number): string => (n >= 999_999 ? '∞' : n.toLocaleString())

const read = (limits: unknown, key: string): never => {
  if (limits != null && typeof limits === 'object' && key in (limits as Record<string, unknown>)) {
    return (limits as Record<string, unknown>)[key] as never
  }
  return 0 as never
}
