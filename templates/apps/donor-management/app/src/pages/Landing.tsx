import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

const FEATURES = [
  {
    key: 'donors',
    defaultTitle: 'Intelligent Donor CRM',
    defaultBody:
      'Complete giving histories, touchpoint timelines, pledge schedules, and wealth screening. Never misplace notes from coffee meetings or board member introductions.',
    icon: 'group_add',
  },
  {
    key: 'gifts',
    defaultTitle: 'Automated Year-End Receipts',
    defaultBody:
      'Zero manual paperwork in January. Batch generate IRS-compliant PDFs with your signature, custom letterhead disclaimers, and 1-click bulk email delivery.',
    icon: 'mark_email_read',
  },
  {
    key: 'campaigns',
    defaultTitle: 'Real-Time Gift & Pledge Tracking',
    defaultBody:
      'Automatic bank reconciliation, smart card updater for expiring recurring gifts, and instant ACH clearing without surprise 5-day settlement delays.',
    icon: 'sync_saved_locally',
  },
  {
    key: 'receipts',
    defaultTitle: 'Campaign & Goal Analytics',
    defaultBody:
      'Visual progress tracking, amber goal meters, donor retention cohort analysis, and life-cycle tags that equip executive boards with clear financial answers.',
    icon: 'trending_up',
  },
] as const

const STEPS = [
  {
    key: 'connect',
    defaultTitle: 'Connect Your Data',
    defaultBody:
      'Sync your Stripe account, import your checks CSV, or sync bank transactions. Givingly merges identical donors across multiple addresses automatically.',
    icon: 'link',
    defaultNote: 'Zero-error deduplication engine',
  },
  {
    key: 'customize',
    defaultTitle: 'Customize Receipt PDF',
    defaultBody:
      "Upload your organization's logo, insert an authentic board signature, and draft a heartfelt donor thank-you paragraph for the header.",
    icon: 'verified_user',
    defaultNote: 'Pre-audited 501(c)(3) legal text defaults',
  },
  {
    key: 'deliver',
    defaultTitle: 'Click “Deliver 2024 Receipts”',
    defaultBody:
      'One tap sends personalized cumulative statements to thousands of supporters simultaneously, complete with download tracking and email open alerts.',
    icon: 'mark_email_read',
    defaultNote: 'Cryptographic delivery audit log',
  },
] as const

const TESTIMONIALS = [
  {
    key: 'elena',
    initials: 'ER',
    quoteKey: 'landing.testimonials.elena',
    defaultQuote:
      '“We used to spend all of January printing, folding, and mailing 2,000 tax statements. Givingly delivered them digitally in under four minutes. It saved our small team over 110 work hours.”',
    nameKey: 'landing.testimonials.elenaName',
    defaultName: 'Elena Rostova',
    titleKey: 'landing.testimonials.elenaTitle',
    defaultTitle: 'Executive Director, Clean Oceans Alliance',
  },
  {
    key: 'marcus',
    initials: 'MV',
    quoteKey: 'landing.testimonials.marcus',
    defaultQuote:
      '“The recurring gift updater alone recovered $28,000 in lapsed sustainer pledges that would have slipped away. For an arts nonprofit of our size, that pays for Givingly 30 times over.”',
    nameKey: 'landing.testimonials.marcusName',
    defaultName: 'Marcus Vance',
    titleKey: 'landing.testimonials.marcusTitle',
    defaultTitle: 'VP of Development, Urban Arts Foundation',
  },
  {
    key: 'sarah',
    initials: 'SJ',
    quoteKey: 'landing.testimonials.sarah',
    defaultQuote:
      '“Donors love the self-service tax portal. Instead of emailing us in April when they can’t find their receipt, they log in, click download, and get back to their day. Remarkable software.”',
    nameKey: 'landing.testimonials.sarahName',
    defaultName: 'Sarah Jenkins, CPA',
    titleKey: 'landing.testimonials.sarahTitle',
    defaultTitle: 'Treasurer, Evergreen Conservation Trust',
  },
] as const

const TIERS = [
  {
    key: 'seed',
    defaultName: 'Seed',
    defaultAudience: 'For small charities & grassroots initiatives',
    price: '$49',
    defaultFeatures: [
      'Up to 500 active donors',
      'Automated IRS 170(f)(8) PDF receipts',
      'Stripe & credit card processing sync',
      'Standard email support',
    ],
  },
  {
    key: 'growth',
    defaultName: 'Growth',
    defaultAudience: 'For established nonprofits expanding recurring giving',
    price: '$119',
    defaultFeatures: [
      'Up to 2,500 active donors',
      '1-Click January batch email dispatch',
      'Smart credit card churn recovery',
      'Self-service donor tax portal',
    ],
  },
  {
    key: 'scale',
    defaultName: 'Scale',
    defaultAudience: 'For institutions, universities & foundations',
    price: '$249',
    defaultFeatures: [
      'Unlimited donors & contacts',
      'Automated donor wealth screening',
      'Custom CRM API & webhook connectors',
      'Dedicated account manager & phone SLA',
    ],
  },
] as const

const PROOF = [
  { key: 'hope', icon: 'eco', defaultLabel: 'Hope Horizon' },
  { key: 'evergreen', icon: 'park', defaultLabel: 'Evergreen Trust' },
  { key: 'urbanArts', icon: 'palette', defaultLabel: 'Urban Arts Fdn' },
  { key: 'cleanOceans', icon: 'waves', defaultLabel: 'Clean Oceans' },
  { key: 'beacon', icon: 'school', defaultLabel: 'Beacon Youth' },
]

const LEDGER_ROWS = [
  {
    initials: 'CW',
    nameKey: 'landing.showcase.row1Name',
    defaultName: 'Catherine Wright',
    detailKey: 'landing.showcase.row1Detail',
    defaultDetail: 'Major Gift • Direct ACH • Dec 28, 2024',
    amount: '$5,000.00',
    statusKey: 'landing.showcase.row1Status',
    defaultStatus: 'Receipt Dispatched',
  },
  {
    initials: 'HL',
    nameKey: 'landing.showcase.row2Name',
    defaultName: 'Dr. Harrison Lee',
    detailKey: 'landing.showcase.row2Detail',
    defaultDetail: 'Monthly Sustainer (12/12) • Stripe • Dec 24, 2024',
    amount: '$250.00',
    statusKey: 'landing.showcase.row2Status',
    defaultStatus: 'Annual Statement Sent',
  },
  {
    initials: 'MS',
    nameKey: 'landing.showcase.row3Name',
    defaultName: 'Margaret Sterling',
    detailKey: 'landing.showcase.row3Detail',
    defaultDetail: 'Endowment Memorial • Check #2041 • Dec 19, 2024',
    amount: '$500.00',
    statusKey: 'landing.showcase.row3Status',
    defaultStatus: 'Receipt Dispatched',
  },
  {
    initials: 'AS',
    nameKey: 'landing.showcase.row4Name',
    defaultName: 'Amara & Kaelen Scott',
    detailKey: 'landing.showcase.row4Detail',
    defaultDetail: 'General Operating • Apple Pay • Dec 15, 2024',
    amount: '$125.00',
    statusKey: 'landing.showcase.row4Status',
    defaultStatus: 'Delivered',
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const serif = { fontFamily: 'var(--font-headline)' }

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40'
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
          <BrandWordmark />
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={
                  'px-4 py-2 text-sm font-semibold bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors shadow-sm'
                }
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/pricing"
                  className={
                    'px-3 py-2 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors'
                  }
                >
                  {t('landing.pricingLink', {}, { defaultValue: 'Pricing' })}
                </Link>
                <Link
                  to="/login"
                  className={
                    'px-3 py-2 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors'
                  }
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign In' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 2 }),
                    'px-4 py-2 text-sm font-semibold bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors shadow-sm',
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Start Free Trial' })}
                  <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — centered serif display with trust pill and proof ribbon. */}
        <section className={cm.cn(cm.sp('pt', 16), cm.sp('pb', 20), cm.sp('px', 6), 'relative')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, 'relative text-center')}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.sp('mb', 8),
                cm.roundedFull,
                cm.mxAuto,
                'inline-flex bg-surface-container border border-outline-variant/40',
              )}
            >
              <span
                className={cm.cn('w-2 h-2 rounded-full bg-primary animate-pulse')}
                aria-hidden="true"
              />
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-wider text-primary-dark',
                )}
              >
                {t(
                  'landing.eyebrow',
                  {},
                  { defaultValue: 'Purpose-built for 501(c)(3) nonprofits & charities' },
                )}
              </span>
            </span>
            <h1
              className={cm.cn(
                cm.sp('mb', 6),
                'text-4xl md:text-6xl font-medium tracking-tight leading-tight text-on-surface max-w-4xl mx-auto',
              )}
              style={serif}
            >
              {t(
                'landing.heroTitle',
                {},
                {
                  defaultValue:
                    'Cultivate deeper donor relationships. Automate every year-end receipt.',
                },
              )}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mb', 10),
                'text-on-surface-variant max-w-2xl mx-auto leading-relaxed',
              )}
            >
              {t(
                'landing.heroSubtitle',
                { appName: APP_NAME },
                {
                  defaultValue:
                    '{{appName}} unites donor CRM, recurring gift management, and one-click IRS-compliant tax receipting into one calm, delightful platform.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' }),
                cm.sp('mb', 16),
                'flex-col sm:flex-row',
              )}
            >
              <Link
                to="/signup"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'w-full sm:w-auto px-6 py-4 rounded-lg bg-primary text-on-primary shadow-md hover:bg-primary-hover transition-colors',
                )}
              >
                {t('landing.heroCta', {}, { defaultValue: 'Start Free Trial (No credit card)' })}
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  check_circle
                </span>
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'w-full sm:w-auto px-6 py-4 rounded-lg bg-surface border border-outline-variant/60 text-primary hover:bg-surface-container-low transition-colors',
                )}
              >
                <span
                  className={'material-symbols-outlined text-base text-primary'}
                  aria-hidden="true"
                >
                  play_circle
                </span>
                {t('landing.watchDemo', {}, { defaultValue: 'Watch 3-Min Interactive Demo' })}
              </Link>
            </div>
            {/* Trust ribbon */}
            <div
              className={cm.cn(
                cm.sp('pt', 8),
                'border-t border-outline-variant/40 max-w-5xl mx-auto',
              )}
            >
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  cm.sp('mb', 6),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t(
                  'landing.trustLine',
                  {},
                  {
                    defaultValue:
                      'Trusted by 1,800+ mission-driven organizations raising over $140M annually',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.grid({ gap: 'md' }),
                  'grid-cols-2 md:grid-cols-5 items-center opacity-75 grayscale',
                )}
              >
                {PROOF.map((p) => (
                  <div
                    key={p.key}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                      cm.textSize('sm'),
                      cm.fontWeight('bold'),
                      'text-on-surface-variant',
                    )}
                  >
                    <span
                      className={'material-symbols-outlined text-primary text-lg'}
                      aria-hidden="true"
                    >
                      {p.icon}
                    </span>
                    {t(`landing.proof.${p.key}`, {}, { defaultValue: p.defaultLabel })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Live app showcase — browser mockup of the year-end ledger. */}
        <section className={cm.cn(cm.sp('px', 6), cm.sp('pb', 24))}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto)}>
            <div
              className={cm.cn(
                'bg-surface rounded-xl border border-outline-variant/60 shadow-xl overflow-hidden',
              )}
            >
              {/* Browser mockup bar */}
              <div
                className={cm.cn(
                  'bg-surface-container-low px-4 py-3 border-b border-outline-variant/60',
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'min-w-0')}>
                  <span
                    className={cm.cn('w-3 h-3 rounded-full bg-outline-variant/60')}
                    aria-hidden="true"
                  />
                  <span
                    className={cm.cn('w-3 h-3 rounded-full bg-outline-variant/60')}
                    aria-hidden="true"
                  />
                  <span
                    className={cm.cn('w-3 h-3 rounded-full bg-outline-variant/60')}
                    aria-hidden="true"
                  />
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 2 }),
                      cm.textSize('xs'),
                      'ml-2 px-3 py-1 rounded bg-surface border border-outline-variant/60 text-on-surface-variant truncate',
                    )}
                  >
                    <span className={'material-symbols-outlined text-xs'} aria-hidden="true">
                      lock
                    </span>
                    <span className="truncate">
                      {t(
                        'landing.showcase.url',
                        { appName: APP_NAME.toLowerCase() },
                        { defaultValue: 'app.{{appName}}.org/dashboard/annual-ledger-2024' },
                      )}
                    </span>
                  </span>
                </div>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('medium'),
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    'rounded bg-surface-container text-primary whitespace-nowrap hidden sm:inline-block',
                  )}
                >
                  {t('landing.showcase.mode', {}, { defaultValue: 'Annual Tax Season Mode' })}
                </span>
              </div>

              <div className={cm.cn(cm.sp('p', 6), 'lg:p-8')}>
                {/* Metric cards */}
                <div
                  className={cm.cn(
                    cm.grid({ gap: 'md' }),
                    'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8',
                  )}
                >
                  {[
                    {
                      labelKey: 'landing.showcase.metric1Label',
                      defaultLabel: 'Total Contributions (YTD)',
                      value: '$1,428,950',
                      deltaKey: 'landing.showcase.metric1Delta',
                      defaultDelta: '+18.4%',
                      noteKey: 'landing.showcase.metric1Note',
                      defaultNote: 'vs. previous calendar year',
                      valueTone: 'text-on-surface',
                      deltaTone: 'text-primary',
                    },
                    {
                      labelKey: 'landing.showcase.metric2Label',
                      defaultLabel: 'Active Donors',
                      value: '3,842',
                      deltaKey: 'landing.showcase.metric2Delta',
                      defaultDelta: '92% retention',
                      noteKey: 'landing.showcase.metric2Note',
                      defaultNote: '1,120 monthly sustainer pledges',
                      valueTone: 'text-on-surface',
                      deltaTone: 'text-primary',
                    },
                    {
                      labelKey: 'landing.showcase.metric3Label',
                      defaultLabel: 'Year-End Receipts Dispatched',
                      value: '3,810',
                      deltaKey: 'landing.showcase.metric3Delta',
                      defaultDelta: '/ 3,842',
                      noteKey: '',
                      defaultNote: '',
                      valueTone: 'text-primary',
                      deltaTone: 'text-on-surface-variant',
                    },
                    {
                      labelKey: 'landing.showcase.metric4Label',
                      defaultLabel: 'Average Gift Size',
                      value: '$372.00',
                      deltaKey: 'landing.showcase.metric4Delta',
                      defaultDelta: '+$44.50',
                      noteKey: 'landing.showcase.metric4Note',
                      defaultNote: 'IRS 170(f)(8) sub-totaled',
                      valueTone: 'text-on-surface',
                      deltaTone: 'text-warning',
                    },
                  ].map((m) => (
                    <div
                      key={m.labelKey}
                      className={cm.cn(
                        cm.sp('p', 4),
                        'rounded-lg bg-surface border border-outline-variant/60',
                      )}
                    >
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          cm.sp('mb', 1),
                          'text-on-surface-variant',
                        )}
                      >
                        {t(m.labelKey, {}, { defaultValue: m.defaultLabel })}
                      </p>
                      <div className={cm.cn(cm.flex({ align: 'baseline', gap: 2 }))}>
                        <span
                          className={cm.cn(
                            cm.textSize('2xl'),
                            cm.fontWeight('semibold'),
                            m.valueTone,
                          )}
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {m.value}
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            m.deltaTone,
                          )}
                        >
                          {t(m.deltaKey, {}, { defaultValue: m.defaultDelta })}
                        </span>
                      </div>
                      {m.noteKey ? (
                        <p
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.sp('mt', 1),
                            'text-on-surface-variant',
                          )}
                        >
                          {t(m.noteKey, {}, { defaultValue: m.defaultNote })}
                        </p>
                      ) : (
                        <div
                          className={cm.cn(
                            'w-full bg-surface-container h-1.5 rounded-full mt-2 overflow-hidden',
                          )}
                        >
                          <div
                            className={cm.cn('bg-primary h-full rounded-full')}
                            style={{ width: '99.2%' }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Split view: ledger + receipt sheet */}
                <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12')}>
                  {/* Verified gift ledger */}
                  <div
                    className={cm.cn(
                      'lg:col-span-7 bg-surface rounded-lg border border-outline-variant/60 p-5',
                    )}
                  >
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                        cm.sp('mb', 4),
                        cm.sp('pb', 3),
                        'border-b border-outline-variant/40 flex-wrap',
                      )}
                    >
                      <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                        <span
                          className={'material-symbols-outlined text-primary text-xl'}
                          aria-hidden="true"
                        >
                          receipt_long
                        </span>
                        <h3
                          className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}
                          style={serif}
                        >
                          {t(
                            'landing.showcase.ledgerTitle',
                            {},
                            { defaultValue: 'Verified Gift Ledger' },
                          )}
                        </h3>
                      </div>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          'landing.showcase.ledgerSync',
                          {},
                          { defaultValue: 'Real-Time Bank & Stripe Sync' },
                        )}
                      </span>
                    </div>
                    <div className={cm.cn(cm.stack(3))}>
                      {LEDGER_ROWS.map((row) => (
                        <div
                          key={row.initials}
                          className={cm.cn(
                            cm.sp('p', 3),
                            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                            'rounded border border-outline-variant/40 hover:bg-surface-container-low transition-colors',
                          )}
                        >
                          <div
                            className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
                          >
                            <span
                              className={cm.cn(
                                cm.flex({ align: 'center', justify: 'center' }),
                                cm.textSize('xs'),
                                cm.fontWeight('bold'),
                                'w-9 h-9 rounded-full bg-surface-container text-primary shrink-0',
                              )}
                              aria-hidden="true"
                            >
                              {row.initials}
                            </span>
                            <div className="min-w-0">
                              <p
                                className={cm.cn(
                                  cm.textSize('sm'),
                                  cm.fontWeight('semibold'),
                                  'truncate',
                                )}
                              >
                                {t(row.nameKey, {}, { defaultValue: row.defaultName })}
                              </p>
                              <p
                                className={cm.cn(
                                  cm.textSize('xs'),
                                  'text-on-surface-variant truncate',
                                )}
                              >
                                {t(row.detailKey, {}, { defaultValue: row.defaultDetail })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p
                              className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}
                              style={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                              {row.amount}
                            </p>
                            <span
                              className={cm.cn(
                                cm.sp('px', 2),
                                cm.sp('py', 1),
                                cm.textSize('xs'),
                                cm.fontWeight('bold'),
                                'inline-block rounded uppercase tracking-wider bg-surface-container-low text-primary',
                              )}
                            >
                              {t(row.statusKey, {}, { defaultValue: row.defaultStatus })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div
                      className={cm.cn(
                        cm.sp('mt', 4),
                        cm.sp('pt', 3),
                        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                        cm.textSize('xs'),
                        'border-t border-outline-variant/40 flex-wrap',
                      )}
                    >
                      <span className="text-on-surface-variant">
                        {t(
                          'landing.showcase.ledgerCount',
                          {},
                          { defaultValue: 'Showing 4 of 3,842 records in active fiscal year' },
                        )}
                      </span>
                      <Link
                        to="/dashboard"
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 2 }),
                          cm.fontWeight('semibold'),
                          'text-primary hover:underline',
                        )}
                      >
                        {t(
                          'landing.showcase.openLedger',
                          {},
                          { defaultValue: 'Open Full Master Ledger' },
                        )}
                        <span className={'material-symbols-outlined text-xs'} aria-hidden="true">
                          chevron_right
                        </span>
                      </Link>
                    </div>
                  </div>

                  {/* Tax receipt sheet */}
                  <div className={cm.cn('lg:col-span-5 flex flex-col justify-between')}>
                    <div
                      className={cm.cn(
                        'relative overflow-hidden bg-surface border border-outline-variant/60 rounded-lg p-5 shadow-sm',
                      )}
                    >
                      {/* Watermark emblem */}
                      <span
                        className={cm.cn(
                          'absolute -right-6 -bottom-6 opacity-5 pointer-events-none text-primary',
                        )}
                        aria-hidden="true"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '160px' }}>
                          verified
                        </span>
                      </span>
                      <div
                        className={cm.cn(
                          'relative',
                          cm.sp('pb', 3),
                          cm.sp('mb', 4),
                          'border-b border-primary/30',
                        )}
                      >
                        <div
                          className={cm.cn(
                            cm.flex({ align: 'start', justify: 'between', gap: 'sm' }),
                            'flex-wrap',
                          )}
                        >
                          <div>
                            <h4
                              className={cm.cn(
                                cm.textSize('base'),
                                cm.fontWeight('bold'),
                                'text-primary',
                              )}
                              style={serif}
                            >
                              {t(
                                'landing.showcase.orgName',
                                { appName: APP_NAME },
                                { defaultValue: '{{appName}} Foundation' },
                              )}
                            </h4>
                            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                              {t(
                                'landing.showcase.ein',
                                {},
                                { defaultValue: 'EIN: 84-1928374 • 501(c)(3) Public Charity' },
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={cm.cn(
                                cm.textSize('xs'),
                                cm.fontWeight('bold'),
                                cm.sp('px', 2),
                                cm.sp('py', 1),
                                'inline-block rounded uppercase bg-surface-container text-primary',
                              )}
                            >
                              {t(
                                'landing.showcase.irsSection',
                                {},
                                { defaultValue: 'IRS Sec. 170(f)(8)' },
                              )}
                            </span>
                            <p
                              className={cm.cn(
                                cm.textSize('xs'),
                                cm.sp('mt', 1),
                                'text-on-surface-variant',
                              )}
                            >
                              {t(
                                'landing.showcase.docId',
                                {},
                                { defaultValue: 'Doc ID: #REC-2024-8821' },
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className={cm.cn(cm.sp('mb', 4), 'relative')}>
                        <p
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            'uppercase tracking-wider text-on-surface-variant',
                          )}
                        >
                          {t(
                            'landing.showcase.statementTo',
                            {},
                            { defaultValue: 'Donor Statement To' },
                          )}
                        </p>
                        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                          {t(
                            'landing.showcase.donorName',
                            {},
                            { defaultValue: 'Catherine Wright' },
                          )}
                        </p>
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {t(
                            'landing.showcase.donorAddress',
                            {},
                            { defaultValue: '424 Commonwealth Ave, Boston, MA 02215' },
                          )}
                        </p>
                      </div>
                      <div
                        className={cm.cn(
                          cm.stack(2),
                          cm.sp('py', 3),
                          cm.sp('mb', 4),
                          cm.textSize('xs'),
                          'border-y border-outline-variant/60',
                        )}
                      >
                        {[
                          {
                            k: 'landing.showcase.line1',
                            dk: '2024 Cumulative Contributions:',
                            v: '$5,000.00',
                            tone: 'text-on-surface',
                          },
                          {
                            k: 'landing.showcase.line2',
                            dk: 'Value of Goods or Services Provided:',
                            v: '$0.00',
                            tone: 'text-on-surface',
                          },
                        ].map((line) => (
                          <div
                            key={line.k}
                            className={cm.cn(cm.flex({ justify: 'between', gap: 'sm' }))}
                          >
                            <span className="text-on-surface-variant">
                              {t(line.k, {}, { defaultValue: line.dk })}
                            </span>
                            <span
                              className={cm.cn(cm.fontWeight('semibold'), line.tone)}
                              style={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                              {line.v}
                            </span>
                          </div>
                        ))}
                        <div
                          className={cm.cn(
                            cm.flex({ justify: 'between', gap: 'sm' }),
                            'text-primary font-semibold',
                          )}
                        >
                          <span>
                            {t(
                              'landing.showcase.line3',
                              {},
                              { defaultValue: 'Total Net Eligible Tax Deduction:' },
                            )}
                          </span>
                          <span
                            className={cm.fontWeight('bold')}
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                          >
                            $5,000.00
                          </span>
                        </div>
                      </div>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          'leading-relaxed text-on-surface-variant italic mb-4',
                        )}
                      >
                        {t(
                          'landing.showcase.disclaimer',
                          {},
                          {
                            defaultValue:
                              '"No goods or services were provided in exchange for this contribution other than intangible religious or charitable benefits."',
                          },
                        )}
                      </p>
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'end', justify: 'between', gap: 'sm' }),
                          cm.sp('pt', 2),
                          'border-t border-dashed border-outline-variant/60',
                        )}
                      >
                        <div>
                          <div
                            className={cm.cn(
                              cm.textSize('sm'),
                              'italic text-primary font-semibold',
                            )}
                            style={serif}
                          >
                            {t(
                              'landing.showcase.signatory',
                              {},
                              { defaultValue: 'Julian Morales' },
                            )}
                          </div>
                          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                            {t(
                              'landing.showcase.signatoryTitle',
                              {},
                              { defaultValue: 'Treasurer & CFO, Board of Directors' },
                            )}
                          </p>
                        </div>
                        <span
                          className={cm.cn(
                            cm.flex({ align: 'center', gap: 2 }),
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            cm.sp('px', 2),
                            cm.sp('py', 1),
                            'uppercase bg-surface-container text-primary rounded',
                          )}
                        >
                          <span className={'material-symbols-outlined text-xs'} aria-hidden="true">
                            done_all
                          </span>
                          {t(
                            'landing.showcase.certified',
                            {},
                            { defaultValue: 'Digitally Certified' },
                          )}
                        </span>
                      </div>
                    </div>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                        cm.sp('mt', 4),
                        'flex-wrap',
                      )}
                    >
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          'landing.showcase.templateNote',
                          {},
                          { defaultValue: 'Dynamic template updates automatically' },
                        )}
                      </span>
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 2 }),
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          'rounded bg-primary text-on-primary',
                        )}
                      >
                        <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                          picture_as_pdf
                        </span>
                        {t(
                          'landing.showcase.downloadPdf',
                          {},
                          { defaultValue: 'Download Sample PDF' },
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          className={cm.cn(
            'bg-surface-container-low/60 border-y border-outline-variant/40',
            cm.sp('py', 20),
          )}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6))}>
            <div className={cm.cn('text-center max-w-3xl mx-auto', cm.sp('mb', 16))}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-wider text-primary',
                )}
              >
                {t(
                  'landing.featuresEyebrow',
                  {},
                  { defaultValue: 'Built Specifically For Development Directors' },
                )}
              </p>
              <h2
                className={cm.cn(
                  cm.sp('mt', 2),
                  cm.sp('mb', 4),
                  'text-3xl md:text-4xl font-medium tracking-tight text-on-surface',
                )}
                style={serif}
              >
                {t(
                  'landing.featuresHeading',
                  {},
                  {
                    defaultValue:
                      'Everything your stewardship workflow needs. Nothing bloated or distracting.',
                  },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
                {t(
                  'landing.featuresSubtitle',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'Ditch generic small-business accounting and bulky legacy CRMs. {{appName}} provides an integrated suite fine-tuned for modern donors.',
                  },
                )}
              </p>
            </div>
            <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2')}>
              {FEATURES.map((f) => (
                <div
                  key={f.key}
                  className={cm.cn(
                    cm.sp('p', 8),
                    'bg-surface rounded-xl border border-outline-variant/60 shadow-sm hover:shadow-md transition-shadow',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.sp('mb', 6),
                      'w-12 h-12 rounded-lg bg-surface-container text-primary',
                    )}
                  >
                    <span className="material-symbols-outlined text-2xl" aria-hidden="true">
                      {f.icon}
                    </span>
                  </div>
                  <h3
                    className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 3))}
                    style={serif}
                  >
                    {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
                  >
                    {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The January Rescue System — 3-step year-end workflow. */}
        <section className={cm.cn('bg-surface', cm.sp('py', 20), cm.sp('px', 6))}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto)}>
            <div className={cm.cn('text-center max-w-3xl mx-auto', cm.sp('mb', 12))}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-wider text-primary',
                )}
              >
                {t('landing.rescueEyebrow', {}, { defaultValue: 'The January Rescue System' })}
              </p>
              <h2
                className={cm.cn(
                  cm.sp('mt', 2),
                  cm.sp('mb', 4),
                  'text-3xl md:text-4xl font-medium tracking-tight text-on-surface',
                )}
                style={serif}
              >
                {t(
                  'landing.rescueHeading',
                  {},
                  {
                    defaultValue: 'Turn your hardest month of the year into a 15-minute victory.',
                  },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
                {t(
                  'landing.rescueSubtitle',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'Nonprofit leaders routinely lose weeks each January manually cross-checking spreadsheets, mailing paper receipts, and fielding frantic donor calls. With {{appName}}, year-end receipting is completely automated.',
                  },
                )}
              </p>
            </div>
            <ol className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
              {STEPS.map((s, i) => (
                <li
                  key={s.key}
                  className={cm.cn(
                    cm.sp('p', 8),
                    'bg-surface-container-low/60 rounded-xl border border-outline-variant/60',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mb', 5))}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'w-10 h-10 rounded-full bg-primary text-on-primary font-bold shrink-0',
                      )}
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'w-10 h-10 rounded-lg bg-surface-container text-primary shrink-0',
                      )}
                      aria-hidden="true"
                    >
                      <span className="material-symbols-outlined text-xl">{s.icon}</span>
                    </span>
                  </div>
                  <h3
                    className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 3))}
                    style={serif}
                  >
                    {t(`landing.step.${s.key}.title`, {}, { defaultValue: s.defaultTitle })}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
                  >
                    {t(`landing.step.${s.key}.body`, {}, { defaultValue: s.defaultBody })}
                  </p>
                  <p
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 2 }),
                      cm.sp('mt', 4),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'text-primary',
                    )}
                  >
                    <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                      check_circle
                    </span>
                    {t(`landing.step.${s.key}.note`, {}, { defaultValue: s.defaultNote })}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Voices of stewardship — testimonials. */}
        <section
          className={cm.cn(
            'bg-surface-container-low/60 border-y border-outline-variant/40',
            cm.sp('py', 20),
            cm.sp('px', 6),
          )}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto)}>
            <h2
              className={cm.cn(
                cm.sp('mb', 12),
                'text-3xl md:text-4xl font-medium tracking-tight text-center text-on-surface',
              )}
              style={serif}
            >
              {t(
                'landing.testimonialsHeading',
                {},
                { defaultValue: 'Trusted by nonprofit leaders doing life-changing work.' },
              )}
            </h2>
            <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
              {TESTIMONIALS.map((q) => (
                <figure
                  key={q.key}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'md' }),
                    cm.sp('p', 8),
                    'bg-surface rounded-xl border border-outline-variant/60 shadow-sm',
                  )}
                >
                  <span
                    className={cm.flex({ gap: 1 })}
                    aria-label={t(
                      'landing.testimonials.fiveStars',
                      {},
                      { defaultValue: 'Rated five out of five stars' },
                    )}
                  >
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={'material-symbols-outlined text-warning text-base'}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                        aria-hidden="true"
                      >
                        star
                      </span>
                    ))}
                  </span>
                  <blockquote
                    className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface')}
                  >
                    {t(q.quoteKey, {}, { defaultValue: q.defaultQuote })}
                  </blockquote>
                  <figcaption
                    className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 2))}
                  >
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'w-9 h-9 rounded-full bg-surface-container text-primary shrink-0',
                      )}
                      aria-hidden="true"
                    >
                      {q.initials}
                    </span>
                    <span>
                      <span
                        className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'block')}
                      >
                        {t(q.nameKey, {}, { defaultValue: q.defaultName })}
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(q.titleKey, {}, { defaultValue: q.defaultTitle })}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing teaser — three tiers, one link to the full page. */}
        <section className={cm.cn('bg-surface', cm.sp('py', 20), cm.sp('px', 6))}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto)}>
            <div className={cm.cn('text-center max-w-3xl mx-auto', cm.sp('mb', 12))}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-wider text-primary',
                )}
              >
                {t('landing.pricingEyebrow', {}, { defaultValue: 'Transparent & Predictable' })}
              </p>
              <h2
                className={cm.cn(
                  cm.sp('mt', 2),
                  cm.sp('mb', 4),
                  'text-3xl md:text-4xl font-medium tracking-tight text-on-surface',
                )}
                style={serif}
              >
                {t(
                  'landing.pricingTeaserHeading',
                  {},
                  { defaultValue: 'Simple pricing designed to scale with your mission.' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
                {t(
                  'landing.pricingTeaserSubtitle',
                  {},
                  {
                    defaultValue:
                      'No percentage penalty fees on your hard-earned donations. No surprise contact tiers.',
                  },
                )}
              </p>
            </div>
            <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
              {TIERS.map((tier) => (
                <div
                  key={tier.key}
                  className={cm.cn(
                    cm.flex({ direction: 'col' }),
                    cm.sp('p', 8),
                    'rounded-xl border border-outline-variant/60 bg-surface shadow-sm',
                  )}
                >
                  <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))} style={serif}>
                    {t(`landing.tier.${tier.key}.name`, {}, { defaultValue: tier.defaultName })}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 4))}
                  >
                    {t(
                      `landing.tier.${tier.key}.audience`,
                      {},
                      { defaultValue: tier.defaultAudience },
                    )}
                  </p>
                  <p className={cm.cn(cm.sp('mb', 6))}>
                    <span className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
                      {tier.price}
                    </span>
                    <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {' '}
                      {t('landing.tier.perMonth', {}, { defaultValue: '/ month billed annually' })}
                    </span>
                  </p>
                  <ul className={cm.cn(cm.stack(2), cm.flex1, cm.sp('mb', 6))}>
                    {tier.defaultFeatures.map((f) => (
                      <li
                        key={f}
                        className={cm.cn(
                          cm.flex({ align: 'start', gap: 2 }),
                          cm.textSize('sm'),
                          'text-on-surface-variant',
                        )}
                      >
                        <span
                          className={'material-symbols-outlined text-primary text-base'}
                          aria-hidden="true"
                        >
                          check
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      cm.textCenter,
                      'px-4 py-3 rounded-lg border border-outline-variant/60 text-primary hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('landing.tier.cta', {}, { defaultValue: 'Start Free 14-Day Trial' })}
                  </Link>
                </div>
              ))}
            </div>
            <p className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
              <Link
                to="/pricing"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-primary hover:underline',
                )}
              >
                {t(
                  'landing.pricingTeaserLink',
                  {},
                  { defaultValue: 'Compare every plan feature →' },
                )}
              </Link>
            </p>
          </div>
        </section>

        {/* CTA banner */}
        <section
          className={cm.cn('bg-primary text-on-primary relative overflow-hidden', cm.sp('py', 20))}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'text-center relative')}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.sp('mb', 6),
                'w-14 h-14 rounded-xl bg-surface/15 mx-auto',
              )}
              aria-hidden="true"
            >
              <span
                className="material-symbols-outlined text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                favorite
              </span>
            </div>
            <h2
              className={cm.cn(
                cm.sp('mb', 4),
                'text-3xl md:text-4xl font-medium tracking-tight max-w-2xl mx-auto',
              )}
              style={serif}
            >
              {t(
                'landing.ctaHeading',
                {},
                { defaultValue: 'Never spend another January buried in tax spreadsheets.' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), cm.sp('mb', 8), 'max-w-xl mx-auto opacity-90')}>
              {t(
                'landing.ctaBody',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Join over 1,800 nonprofits building deeper donor trust with {{appName}}. Your first 14 days are completely free.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' }),
                'flex-col sm:flex-row',
              )}
            >
              <Link
                to="/signup"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'w-full sm:w-auto px-8 py-4 rounded-lg bg-surface text-primary shadow-lg hover:bg-surface-container-lowest transition-colors',
                )}
              >
                {t('landing.ctaPrimary', {}, { defaultValue: 'Start Free Trial' })}
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'w-full sm:w-auto px-8 py-4 rounded-lg bg-surface/10 border border-surface/30 hover:bg-surface/20 transition-colors',
                )}
              >
                {t('landing.ctaSecondary', {}, { defaultValue: 'Book a 1-on-1 Walkthrough' })}
              </Link>
            </div>
            <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 6), 'opacity-80')}>
              {t(
                'landing.ctaFinePrint',
                {},
                {
                  defaultValue:
                    'No credit card required • Instant setup in under 5 minutes • Export data anytime',
                },
              )}
            </p>
          </div>
        </section>
      </main>

      <footer
        className={
          'py-8 text-center text-sm bg-surface text-on-surface-variant border-t border-outline-variant'
        }
      >
        <p>
          {t(
            'common.copyrightBuiltWithMolecule',
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
      </footer>
    </div>
  )
}

export default Landing
