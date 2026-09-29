import { useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LandingFooter, LandingNav } from '../components/SwitchboardLandingChrome.js'

/**
 * The Switchboard landing — rebuilt to carry every section of the Stitch
 * design (design-ai-hotel-receptionist-landing.html) in its order:
 * nav → hero + live-call console → operational economics → concierge
 * scenario showcase → PMS integrations → case-study band → comparison
 * ledger → live-demo band → full multi-column footer.
 *
 * The `.landing-scope` wrapper pins the design's ivory/ink/bronze palette +
 * serif display inside this subtree (see index.css). Spec-pinned copy (the
 * e2e contracts) is kept verbatim: the h1's "in the guest's own language",
 * the language-chip list label, both hero CTA labels, and the four platform
 * capability titles.
 */

const LANGUAGE_CHIPS = [
  'EN · English (Bespoke Luxury RP)',
  'FR · Français (Courtois & Chaleureux)',
  'DE · Deutsch (Präzise Gastfreundschaft)',
  'ES · Español (Cálido y Atento)',
  'JA · 日本語 (おもてなしの心)',
  'ZH · 中文 (温雅礼貌)',
] as const

const TRUST_SPECS = [
  {
    icon: 'bolt',
    key: 'latency',
    title: 'Sub-320ms',
    body: 'Conversational Latency',
  },
  {
    icon: 'sync_saved_locally',
    key: 'pms',
    title: 'Two-Way PMS Sync',
    body: 'Live Folio & Keycard Write',
  },
  {
    icon: 'verified_user',
    key: 'pci',
    title: 'PCI-DSS Level 1',
    body: 'Tokenized Card Security',
  },
] as const

const STATS = [
  {
    icon: 'phone_missed',
    key: 'missed',
    value: '42%',
    valueSuffix: '',
    tone: 'primary' as const,
    title: 'Direct Phone Calls Missed',
    body: 'Occurs during peak physical arrival hours (3:00–5:30 PM) and graveyard shifts (midnight–6:00 AM). When the line rings busy for 4 rings, luxury guests do not leave voicemails.',
    bench: 'BENCHMARK: 38-CALL DAILY INBOUND AVERAGE',
    tile: 'bg-surface-container text-primary',
  },
  {
    icon: 'trending_down',
    key: 'leakage',
    value: '$18,400',
    valueSuffix: '',
    tone: 'secondary' as const,
    title: 'Monthly Direct Revenue Leakage',
    body: 'Unanswered callers immediately click over to Expedia or Booking.com, inflicting an automatic 18% to 22% OTA commission penalty—or choose a neighboring boutique hotel instead.',
    bench: 'ESTIMATED LEAKAGE PER 50-KEY PROPERTY',
    tile: 'bg-secondary/10 text-secondary',
  },
  {
    icon: 'savings',
    key: 'payroll',
    value: '$62,000',
    valueSuffix: '/yr',
    tone: 'primary' as const,
    title: 'Night Auditor Payroll Recaptured',
    body: 'Recruiters know the overnight desk role has an 82% annual turnover rate. {{appName}} acts as the untiring, fluent night auditor, allowing daytime staff to thrive without graveyard burnout.',
    bench: 'ZERO NIGHT SHIFT TURNOVER OVERHEAD',
    tile: 'bg-tertiary-container text-tertiary-fixed',
  },
] as const

const SCENARIOS = [
  {
    icon: 'lock_clock',
    key: 'keycode',
    tag: 'Late Flight & Keyless Lockbox',
    num: '01',
    title: 'Autonomous Midnight Keycode Dispatch',
    body: 'Caller reports landed in Zurich 3 hours behind schedule. Switchboard references current room readiness in PMS, generates an encrypted Salto/Assa Abloy door PIN code, and sends driving directions straight to their phone via WhatsApp or SMS.',
    execution: [
      'Res: #ZH-4019 (Suite Bellevue)',
      'PIN Generated: 482910# (Valid 03:00 - 12:00)',
      'Valet Parking space #04 auto-reserved',
    ],
    footerLabel: 'Front desk intervention:',
    footerStat: '0 Seconds',
    statTone: 'text-emerald-800' as const,
  },
  {
    icon: 'restaurant',
    key: 'breakfast',
    tag: 'Dietary Breakfast & Transfer',
    num: '02',
    title: 'Kitchen Notes & Private Car Dispatch',
    body: 'A guest traveling tomorrow morning calls to announce severe celiac disease and requests a Mercedes V-Class transfer at 07:15 AM. Switchboard updates guest preferences and dispatches the chauffeur schedule via email integration.',
    execution: [
      'Guest Profile: Tagged [Strict Celiac]',
      'Chef briefing notice generated for 06:30 AM',
      'Transfer voucher dispatched to partner fleet',
    ],
    footerLabel: 'PMS Folio add-on billed:',
    footerStat: '€140 Transfer Fee',
    statTone: 'text-primary' as const,
  },
  {
    icon: 'edit_calendar',
    key: 'extension',
    tag: 'Stay Extension & Corp Code',
    num: '03',
    title: 'Dynamic Yield-Aware Stay Extension',
    body: 'A corporate guest staying at the hotel inquires if their room can be extended by two nights under their negotiated corporate rate. Switchboard checks category yield, validates corporate agreement limits, and updates checkout date in Mews.',
    execution: [
      'Stay modified: +2 nights in Room 208',
      'Corp negotiated rate applied ($310/nt)',
      'Direct confirmation PDF pushed via email',
    ],
    footerLabel: 'Direct commission saved:',
    footerStat: '$124 vs. OTA fee',
    statTone: 'text-emerald-800' as const,
  },
] as const

/**
 * Platform capabilities — kept from the app's truthful product story (the
 * e2e suite pins these four titles), styled with the design's numbered-card
 * anatomy.
 */
const FEATURES = [
  {
    icon: 'translate',
    key: 'languageDetection',
    num: '01',
    title: 'Detects the caller\u2019s language',
    body: 'The agent hears the first sentence and answers in the caller\u2019s own language — six languages out of the box, configurable per line.',
  },
  {
    icon: 'event_available',
    key: 'booksRooms',
    num: '02',
    title: 'Books rooms on the call',
    body: 'Searches live availability, quotes the computed rate, and confirms the booking with a code — through the same rules as the front desk.',
  },
  {
    icon: 'dashboard',
    key: 'fullPms',
    num: '03',
    title: 'A real PMS behind it',
    body: 'Rooms, room types, rate plans with weekend and seasonal pricing, reservations with the full lifecycle, and guest profiles with stay history.',
  },
  {
    icon: 'support_agent',
    key: 'simulator',
    num: '04',
    title: 'Try it on the Call Simulator',
    body: 'Type what a caller would say and watch the agent detect the language, call its tools, and book the room — live, action by action.',
  },
] as const

const PROTOCOLS = [
  {
    icon: 'lock_reset',
    key: 'sip',
    title: 'Zero-Downtime SIP Cutover',
    body: 'Compatible with any PBX provider or cloud SIP trunk via simple conditional phone forwarding.',
  },
  {
    icon: 'credit_card',
    key: 'vault',
    title: 'Secure PCI-Compliant Card Vault',
    body: 'Voice payment capture securely tokenizes credit cards via Stripe Hospitality or Adyen without raw PAN exposure.',
  },
  {
    icon: 'tune',
    key: 'parity',
    title: 'Live Rate Parity Guard',
    body: 'Always reflects real-time rate restrictions, minimum length of stay (MLOS), and non-refundable tiers.',
  },
] as const

const CONNECTORS = [
  {
    key: 'mews',
    name: 'Mews',
    tag: 'Native API',
    body: 'Full 2-Way PMS & Kiosk sync with live folio updates.',
    badge: 'CONNECTOR CERTIFIED',
    highlight: true,
  },
  {
    key: 'cloudbeds',
    name: 'Cloudbeds',
    tag: 'Webhooks',
    body: 'Real-time room availability and payment gateway sync.',
    badge: 'CONNECTOR CERTIFIED',
    highlight: false,
  },
  {
    key: 'opera',
    name: 'Opera Cloud',
    tag: 'OHIP Level 2',
    body: 'Oracle Hospitality Integration Platform certified bridge.',
    badge: 'ORACLE INTEGRATED',
    highlight: false,
  },
  {
    key: 'apaleo',
    name: 'Apaleo',
    tag: 'Open API',
    body: 'Micro-stay and room inventory locks without latency.',
    badge: 'API NATIVE',
    highlight: false,
  },
  {
    key: 'guesty',
    name: 'Guesty',
    tag: 'Direct',
    body: 'Ideal for hybrid boutique hotels and aparthotel suites.',
    badge: 'HYBRID CERTIFIED',
    highlight: false,
  },
  {
    key: 'pbx',
    name: 'Hotel PBX',
    tag: 'SIP Trunk',
    body: 'Twilio, Grandstream, 3CX, Cisco, Mitel, and 8x8 trunks.',
    badge: 'UNIVERSAL SIP',
    highlight: false,
  },
] as const

const CASE_STUDY_PROOF = [
  {
    key: 'revenue',
    value: '+€14,800',
    tone: 'text-primary' as const,
    body: 'Added Weekend Direct Booking Revenue',
  },
  {
    key: 'rings',
    value: '100%',
    tone: 'text-secondary' as const,
    body: 'Calls Answered Within Two Rings',
  },
  {
    key: 'complaints',
    value: '0',
    tone: 'text-emerald-800' as const,
    body: 'Guest Audio Complaints Across 1,420 Calls',
  },
] as const

const COMPARE_ROWS = [
  {
    key: 'capacity',
    dim: 'Simultaneous Call Capacity',
    desk: '1 call (puts 2nd on hold; drops 3rd)',
    auditor: '1 call (unattended while doing room audits)',
    sb: 'Unlimited concurrent calls, 0 hold time',
  },
  {
    key: 'languages',
    dim: 'Language Capabilities',
    desk: 'Local language + basic English',
    auditor: 'Local language + varying fluency',
    sb: '34 languages spoken fluently with zero accent lag',
  },
  {
    key: 'overnight',
    dim: '2:00 AM – 6:00 AM Direct Bookings',
    desk: 'Voicemail only (94% abandon rate)',
    auditor: 'Manual notepad notes prone to loss',
    sb: 'Direct 2-way PMS booking & payment card hold',
  },
  {
    key: 'cost',
    dim: 'Annual Operational Cost',
    desk: 'Existing payroll baseline',
    auditor: '$55,000 – $75,000/year salary + benefits',
    sb: 'Predictable flat monthly SaaS ($399/mo)',
  },
  {
    key: 'burnout',
    dim: 'Staff Burnout & Turnover',
    desk: 'High stress during afternoon key handovers',
    auditor: '82% annual overnight turnover rate',
    sb: '0% turnover. Front desk staff focus on present guests',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [demoDispatched, setDemoDispatched] = useState(false)

  return (
    <div
      // .landing-scope pins the Stitch ivory/ink/bronze palette + serif
      // display inside this subtree so the landing matches the design in
      // both modes (see index.css).
      className={cm.cn(
        'landing-scope',
        cm.minH('screen'),
        'bg-background text-on-surface antialiased flex flex-col',
      )}
    >
      <LandingNav />

      {/* ============================ HERO ============================ */}
      <section
        className={cm.cn('relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden lp-hairline-b')}
        data-mol-id="landing-hero"
      >
        {/* Ambient glows */}
        <div
          className={cm.cn(
            'lp-glow-warm absolute top-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-60 pointer-events-none',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'bg-surface-container absolute -bottom-10 left-10 w-72 h-72 rounded-full blur-2xl opacity-40 pointer-events-none',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            'px-6 md:px-10 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center',
          )}
        >
          {/* Left: editorial headline + value prop */}
          <div className={cm.cn('lg:col-span-7 flex flex-col gap-6')}>
            {/* Eyebrow badge */}
            <div
              className={cm.cn(
                'inline-flex items-center gap-2 self-start bg-surface-container-low px-3.5 py-1 rounded-full lp-hairline text-secondary',
              )}
            >
              <span className={cm.cn('w-1.5 h-1.5 rounded-full bg-secondary')} aria-hidden="true" />
              <span className="text-[11px] uppercase tracking-wider font-semibold">
                {t(
                  'landing.hero.eyebrow',
                  {},
                  { defaultValue: 'Autonomous telephony · 30–120 room boutique properties' },
                )}
              </span>
            </div>

            <h1
              className={cm.cn(
                'lp-serif text-4xl md:text-5xl md:leading-[1.15] tracking-tight text-primary font-normal',
              )}
              data-mol-id="landing-headline"
            >
              {t(
                'landing.hero.heading',
                {},
                {
                  defaultValue:
                    'Every call answered — in the guest\u2019s own language, at any hour. ',
                },
              )}
              <em className={cm.cn('italic text-secondary')}>
                {t(
                  'landing.hero.accent',
                  {},
                  { defaultValue: 'Never miss a late-night reservation again.' },
                )}
              </em>
            </h1>

            <p
              className={cm.cn(
                'text-base md:text-lg text-on-surface-variant max-w-2xl leading-relaxed',
              )}
            >
              {t(
                'landing.hero.subheading',
                { appName: APP_NAME },
                {
                  defaultValue:
                    '{{appName}} is the autonomous night auditor and front desk co-pilot engineered for independent hoteliers: it picks up, detects the caller\u2019s language, answers in it, and books available rooms — zero dropped bookings at 3:00 PM or 2:00 AM.',
                },
              )}
            </p>

            {/* Dual CTA cluster */}
            <div className={cm.cn('flex flex-wrap items-center gap-4 pt-2')}>
              <Link
                to="/signup"
                data-mol-id="landing-cta-signup"
                className={cm.cn(
                  'inline-flex items-center gap-2.5 bg-primary text-surface text-sm font-semibold px-6 py-3.5 rounded-lg border border-primary hover:bg-primary-container transition-all duration-150 active:scale-95 shadow-sm',
                )}
              >
                <span
                  className={cm.cn('sb-icon flex h-5 w-5 items-center justify-center')}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined fill">phone_callback</span>
                </span>
                <span>
                  {t(
                    'landing.hero.ctaPrimary',
                    {},
                    { defaultValue: 'Start answering in 6 languages' },
                  )}
                </span>
              </Link>
              <Link
                to="/login"
                data-mol-id="landing-cta-login"
                className={cm.cn(
                  'inline-flex items-center gap-2 bg-transparent text-primary text-sm font-semibold px-5 py-3.5 rounded-lg lp-hairline hover:bg-secondary/5 transition-all duration-150 active:scale-95',
                )}
              >
                <span
                  className={cm.cn('sb-icon flex h-4 w-4 items-center justify-center')}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">login</span>
                </span>
                <span>
                  {t(
                    'landing.hero.ctaSecondary',
                    {},
                    { defaultValue: 'Sign in to the front desk' },
                  )}
                </span>
              </Link>
            </div>

            {/* Trust & architectural spec badges */}
            <div
              className={cm.cn(
                'pt-6 lp-hairline-t grid grid-cols-1 sm:grid-cols-3 gap-4 text-on-surface-variant',
              )}
            >
              {TRUST_SPECS.map((spec) => (
                <div key={spec.key} className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span
                    className={cm.cn(
                      'sb-icon flex h-5 w-5 items-center justify-center text-secondary',
                    )}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">{spec.icon}</span>
                  </span>
                  <div>
                    <div className={cm.cn('text-xs font-semibold text-primary')}>
                      {t(`landing.trust.${spec.key}.title`, {}, { defaultValue: spec.title })}
                    </div>
                    <div className={cm.cn('text-xs text-on-surface-variant')}>
                      {t(`landing.trust.${spec.key}.body`, {}, { defaultValue: spec.body })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: live telephony console card */}
          <div className={cm.cn('lg:col-span-5')}>
            <div
              className={cm.cn(
                'bg-surface-container-lowest lp-hairline rounded-xl p-5 lp-card-shadow relative',
              )}
              data-mol-id="landing-console"
            >
              {/* Live status header */}
              <div className={cm.cn('flex items-center justify-between pb-4 lp-hairline-b')}>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span className={cm.cn('relative flex h-3 w-3')} aria-hidden="true">
                    <span
                      className={cm.cn(
                        'animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75',
                      )}
                    />
                    <span
                      className={cm.cn('relative inline-flex rounded-full h-3 w-3 bg-emerald-600')}
                    />
                  </span>
                  <div>
                    <div className={cm.cn('text-sm font-semibold text-primary leading-tight')}>
                      {t('landing.console.liveTitle', {}, { defaultValue: 'Live Inbound Call' })}
                    </div>
                    <div className={cm.cn('text-[11px] text-on-surface-variant')}>
                      {t(
                        'landing.console.liveLine',
                        {},
                        { defaultValue: 'Line 01 · Paris Gateway (+33 1 42 68…)' },
                      )}
                    </div>
                  </div>
                </div>
                <div
                  className={cm.cn(
                    'flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low rounded-md lp-hairline',
                  )}
                >
                  <span
                    className={cm.cn(
                      'sb-icon flex h-3.5 w-3.5 items-center justify-center text-secondary',
                    )}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">timer</span>
                  </span>
                  <span className={cm.cn('text-[11px] text-primary font-mono')}>
                    {t('landing.console.latency', {}, { defaultValue: '318ms RTT' })}
                  </span>
                </div>
              </div>

              {/* Caller profile */}
              <div
                className={cm.cn(
                  'py-3 px-3.5 my-3 bg-surface-container-low/60 rounded-lg lp-hairline flex items-center justify-between gap-3',
                )}
              >
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <div
                    className={cm.cn(
                      'w-8 h-8 rounded-full bg-primary-container text-surface flex items-center justify-center text-xs font-semibold',
                    )}
                    aria-hidden="true"
                  >
                    ML
                  </div>
                  <div>
                    <div className={cm.cn('text-sm font-semibold text-primary')}>
                      {t(
                        'landing.console.callerName',
                        {},
                        { defaultValue: 'Mme. Éléonore Laurent' },
                      )}
                    </div>
                    <div className={cm.cn('text-[11px] text-on-surface-variant')}>
                      {t(
                        'landing.console.callerMeta',
                        {},
                        { defaultValue: 'Return Guest (Tier II) · 02:14 AM Local Time' },
                      )}
                    </div>
                  </div>
                </div>
                <span
                  className={cm.cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-lowest lp-hairline text-[11px] font-mono text-primary font-medium',
                  )}
                >
                  FR <span className={cm.cn('text-on-surface-variant')}>→</span> EN
                </span>
              </div>

              {/* Dual-speaker stream */}
              <div className={cm.cn('space-y-3 my-4')}>
                {/* Guest bubble */}
                <div className={cm.cn('p-3 bg-surface rounded-lg lp-hairline')}>
                  <div className={cm.cn('flex items-center justify-between mb-1')}>
                    <span className={cm.cn('text-[11px] tracking-wide text-on-surface-variant')}>
                      {t(
                        'landing.console.guestLabel',
                        {},
                        { defaultValue: 'Caller (French Audio Stream)' },
                      )}
                    </span>
                    <span className={cm.cn('text-[11px] font-mono text-on-surface-variant')}>
                      02:14:08
                    </span>
                  </div>
                  <p className={cm.cn('text-[13px] text-primary italic leading-snug')}>
                    {t(
                      'landing.console.guestLine',
                      {},
                      {
                        defaultValue:
                          '“Bonsoir, notre vol AF123 a deux heures de retard. Pouvons-nous avoir la suite côté cour et un enregistrement tardif vers 3h30 ?”',
                      },
                    )}
                  </p>
                  <div className={cm.cn('mt-1 text-[11px] text-on-surface-variant')}>
                    <span className={cm.cn('font-medium text-secondary')}>
                      {t(
                        'landing.console.translationLabel',
                        {},
                        { defaultValue: 'Realtime Translation:' },
                      )}
                    </span>{' '}
                    {t(
                      'landing.console.translationLine',
                      {},
                      {
                        defaultValue:
                          '“Good evening, flight AF123 delayed 2h. Can we hold the courtyard suite and arrange a 3:30 AM check-in?”',
                      },
                    )}
                  </div>
                </div>

                {/* Concierge response bubble */}
                <div
                  className={cm.cn(
                    'p-3 bg-surface-container-low rounded-lg lp-hairline border-secondary/30',
                  )}
                >
                  <div className={cm.cn('flex items-center justify-between mb-1')}>
                    <div className={cm.flex({ align: 'center', gap: 'xs' })}>
                      <span
                        className={cm.cn(
                          'w-4 h-4 rounded-sm bg-secondary text-white flex items-center justify-center text-[9px] font-bold',
                        )}
                        aria-hidden="true"
                      >
                        SB
                      </span>
                      <span className={cm.cn('text-[11px] text-secondary font-semibold')}>
                        {t(
                          'landing.console.agentLabel',
                          {},
                          { defaultValue: `${APP_NAME} Concierge Audio Response` },
                        )}
                      </span>
                    </div>
                    <div className={cm.cn('flex items-end gap-0.5 h-4 px-1')} aria-hidden="true">
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <div
                          key={n}
                          className={cm.cn(
                            `lp-wave-bar lp-wave-bar-${n} h-2.5 w-0.5 bg-secondary rounded-full`,
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <p className={cm.cn('text-[13px] text-primary leading-snug')}>
                    {t(
                      'landing.console.agentLine',
                      {},
                      {
                        defaultValue:
                          '“Bonsoir Madame Laurent. Votre Suite Couronne (Chambre 304) est garantie avec serrure connectée. Votre code d\u2019accès sécurisé a été transmis par SMS.”',
                      },
                    )}
                  </p>
                </div>
              </div>

              {/* PMS action widget */}
              <div
                className={cm.cn(
                  'p-3 bg-surface-container-lowest rounded-lg lp-hairline space-y-2',
                )}
              >
                <div className={cm.cn('flex items-center justify-between gap-2 text-xs')}>
                  <span
                    className={cm.cn(
                      'flex items-center gap-1.5 text-[11px] text-primary font-semibold',
                    )}
                  >
                    <span
                      className={cm.cn(
                        'sb-icon flex h-4 w-4 items-center justify-center text-emerald-700',
                      )}
                      aria-hidden="true"
                    >
                      <span className="material-symbols-outlined fill">check_circle</span>
                    </span>
                    {t('landing.console.pmsLock', {}, { defaultValue: 'PMS 2-Way Lock Applied' })}
                  </span>
                  <span
                    className={cm.cn(
                      'font-mono text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded',
                    )}
                  >
                    Res #MW-89412
                  </span>
                </div>
                <div className={cm.cn('grid grid-cols-2 gap-2 text-xs pt-1')}>
                  <div className={cm.cn('p-1.5 bg-surface-container-low rounded')}>
                    <span
                      className={cm.cn(
                        'block text-[10px] uppercase tracking-wider text-on-surface-variant',
                      )}
                    >
                      {t('landing.console.folioLabel', {}, { defaultValue: 'Folio Pre-Auth' })}
                    </span>
                    <span className={cm.cn('font-semibold text-primary font-mono')}>
                      $420.00 / night
                    </span>
                  </div>
                  <div className={cm.cn('p-1.5 bg-surface-container-low rounded')}>
                    <span
                      className={cm.cn(
                        'block text-[10px] uppercase tracking-wider text-on-surface-variant',
                      )}
                    >
                      {t('landing.console.lateLabel', {}, { defaultValue: 'Late Arrival' })}
                    </span>
                    <span className={cm.cn('font-semibold text-primary font-mono')}>
                      03:30 AM Tagged
                    </span>
                  </div>
                </div>
              </div>

              {/* Takeover bar */}
              <div className={cm.cn('mt-4 pt-3 lp-hairline-t flex items-center justify-between')}>
                <div className={cm.cn('flex items-center gap-2 text-on-surface-variant')}>
                  <span
                    className={cm.cn('sb-icon flex h-4 w-4 items-center justify-center')}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">hearing</span>
                  </span>
                  <span className={cm.cn('text-[11px]')}>
                    {t(
                      'landing.console.listenMode',
                      {},
                      { defaultValue: 'Night Auditor in silent listen mode' },
                    )}
                  </span>
                </div>
                <Link
                  to="/simulator"
                  className={cm.cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface text-primary lp-hairline hover:bg-surface-container-high transition-colors text-[11px] font-semibold',
                  )}
                >
                  <span
                    className={cm.cn('sb-icon flex h-3.5 w-3.5 items-center justify-center')}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">call_merge</span>
                  </span>
                  <span>
                    {t('landing.console.intercept', {}, { defaultValue: 'Intercept Call' })}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== OPERATIONAL ECONOMICS ===================== */}
      <section
        className={cm.cn('py-20 bg-surface-container-low lp-hairline-b scroll-mt-20')}
        id="boutique-roi"
      >
        <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, 'px-6 md:px-10')}>
          <div
            className={cm.cn(
              'flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 lp-hairline-b',
            )}
          >
            <div className={cm.cn('max-w-2xl')}>
              <span
                className={cm.cn(
                  'block text-[11px] text-secondary uppercase tracking-widest font-semibold mb-2',
                )}
              >
                {t('landing.stats.eyebrow', {}, { defaultValue: 'Operational Economics' })}
              </span>
              <h2 className={cm.cn('lp-serif text-3xl md:text-4xl text-primary tracking-tight')}>
                {t(
                  'landing.stats.heading',
                  {},
                  { defaultValue: 'The 4:00 PM Check-In Rush & The 2:00 AM Void' },
                )}
              </h2>
              <p className={cm.cn('text-base text-on-surface-variant mt-2')}>
                {t(
                  'landing.stats.subheading',
                  {},
                  {
                    defaultValue:
                      'Independent boutique hotels lose tens of thousands in direct room reservations simply because the phone rings while the desk clerk is handing over physical keys or during overnight desk gaps.',
                  },
                )}
              </p>
            </div>
            <div className={cm.cn('text-right shrink-0')}>
              <span className={cm.cn('block text-[11px] text-on-surface-variant')}>
                {t('landing.stats.auditLabel', {}, { defaultValue: 'Independent Portfolio Audit' })}
              </span>
              <span className={cm.cn('lp-serif text-2xl text-primary')}>
                {t('landing.stats.auditValue', {}, { defaultValue: '68 Properties Analyzed' })}
              </span>
            </div>
          </div>

          <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-6 pt-10')}>
            {STATS.map((s) => (
              <div
                key={s.key}
                data-mol-id={'landing-stat-' + s.key}
                className={cm.cn(
                  'bg-surface-container-lowest p-8 rounded-lg lp-hairline shadow-sm flex flex-col justify-between',
                )}
              >
                <div>
                  <div
                    className={cm.cn(
                      'sb-icon flex h-10 w-10 items-center justify-center rounded mb-6 text-[22px]',
                      s.tile,
                    )}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">{s.icon}</span>
                  </div>
                  <div
                    className={cm.cn(
                      'lp-serif text-4xl md:text-5xl tracking-tight mb-2',
                      s.tone === 'secondary' ? 'text-secondary' : 'text-primary',
                    )}
                  >
                    {t(`landing.stats.${s.key}.value`, {}, { defaultValue: s.value })}
                    {s.valueSuffix ? (
                      <span className={cm.cn('text-2xl font-normal text-on-surface-variant')}>
                        {s.valueSuffix}
                      </span>
                    ) : null}
                  </div>
                  <h3 className={cm.cn('text-sm font-semibold text-primary mb-2')}>
                    {t(`landing.stats.${s.key}.title`, {}, { defaultValue: s.title })}
                  </h3>
                  <p className={cm.cn('text-sm text-on-surface-variant leading-relaxed')}>
                    {t(
                      `landing.stats.${s.key}.body`,
                      { appName: APP_NAME },
                      { defaultValue: s.body },
                    )}
                  </p>
                </div>
                <div
                  className={cm.cn('mt-8 pt-4 lp-hairline-t text-[11px] text-secondary font-mono')}
                >
                  {t(`landing.stats.${s.key}.bench`, {}, { defaultValue: s.bench })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================= INTELLIGENCE ======================= */}
      <section className={cm.cn('py-20 bg-surface lp-hairline-b scroll-mt-20')} id="intelligence">
        <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, 'px-6 md:px-10')}>
          <div className={cm.cn('max-w-3xl mb-12')}>
            <span
              className={cm.cn(
                'block text-[11px] text-secondary uppercase tracking-widest font-semibold mb-2',
              )}
            >
              {t('landing.features.eyebrow', {}, { defaultValue: 'Concierge Fluidity' })}
            </span>
            <h2 className={cm.cn('lp-serif text-3xl md:text-4xl text-primary tracking-tight')}>
              {t(
                'landing.features.heading',
                {},
                {
                  defaultValue: 'Speaks the Gracious Cadence of a Parisian Concierge',
                },
              )}
            </h2>
            <p className={cm.cn('text-base text-on-surface-variant mt-3')}>
              {t(
                'landing.features.subheading',
                {},
                {
                  defaultValue:
                    'Switchboard does not sound like a robotic voice tree or generic interactive voice response. It recognizes idiomatic hospitality nuance, modulates pacing, and adapts seamlessly across 34 global languages.',
                },
              )}
            </p>
            {/* Interactive language pills */}
            <ul
              className={cm.cn('flex flex-wrap items-center gap-2 mt-6')}
              aria-label={t(
                'landing.hero.languagesLabel',
                {},
                { defaultValue: 'Languages the voice agent speaks' },
              )}
            >
              {LANGUAGE_CHIPS.map((chip, i) => (
                <li
                  key={chip}
                  className={cm.cn(
                    'px-3.5 py-1.5 rounded-full text-[11px] font-mono transition-all',
                    i === 0
                      ? 'bg-primary text-surface'
                      : 'bg-surface-container-low text-primary lp-hairline hover:bg-surface-container',
                  )}
                >
                  {chip}
                </li>
              ))}
            </ul>
          </div>

          {/* Numbered concierge-scenario bento cards */}
          <div className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-8')}>
            {SCENARIOS.map((scenario) => (
              <article
                key={scenario.key}
                data-mol-id={'landing-scenario-' + scenario.key}
                className={cm.cn(
                  'bg-surface-container-low rounded-lg p-6 lp-hairline flex flex-col justify-between',
                )}
              >
                <div>
                  <div
                    className={cm.cn('flex items-center justify-between pb-4 lp-hairline-b mb-4')}
                  >
                    <span className={cm.cn('text-[11px] text-secondary font-mono')}>
                      {t(
                        'landing.features.scenarioLabel',
                        { num: scenario.num },
                        { defaultValue: 'SCENARIO {{num}}' },
                      )}
                    </span>
                    <span
                      className={cm.cn(
                        'inline-flex items-center gap-1 text-[11px] font-mono text-on-surface-variant bg-surface-container-lowest px-2 py-0.5 rounded lp-hairline',
                      )}
                    >
                      <span
                        className={cm.cn('sb-icon flex h-3 w-3 items-center justify-center')}
                        aria-hidden="true"
                      >
                        <span className="material-symbols-outlined">{scenario.icon}</span>
                      </span>
                      {t(
                        `landing.scenarios.${scenario.key}.tag`,
                        {},
                        { defaultValue: scenario.tag },
                      )}
                    </span>
                  </div>
                  <h3 className={cm.cn('lp-serif text-xl text-primary mb-3')}>
                    {t(
                      `landing.scenarios.${scenario.key}.title`,
                      {},
                      { defaultValue: scenario.title },
                    )}
                  </h3>
                  <p className={cm.cn('text-[13px] text-on-surface-variant mb-4 leading-relaxed')}>
                    {t(
                      `landing.scenarios.${scenario.key}.body`,
                      {},
                      { defaultValue: scenario.body },
                    )}
                  </p>
                  <div
                    className={cm.cn(
                      'p-3 bg-surface-container-lowest rounded-md lp-hairline text-xs font-mono text-on-surface-variant space-y-1',
                    )}
                  >
                    <div className={cm.cn('text-primary font-semibold text-[13px] font-sans')}>
                      {t(
                        'landing.scenarios.executionLabel',
                        {},
                        { defaultValue: 'Automated Execution:' },
                      )}
                    </div>
                    {scenario.execution.map((line) => (
                      <div key={line}>• {line}</div>
                    ))}
                  </div>
                </div>
                <div
                  className={cm.cn(
                    'mt-6 pt-3 lp-hairline-t flex items-center justify-between gap-2 text-xs',
                  )}
                >
                  <span className={cm.cn('text-on-surface-variant')}>
                    {t(
                      `landing.scenarios.${scenario.key}.footerLabel`,
                      {},
                      { defaultValue: scenario.footerLabel },
                    )}
                  </span>
                  <span className={cm.cn('text-sm font-semibold', scenario.statTone)}>
                    {t(
                      `landing.scenarios.${scenario.key}.footerStat`,
                      {},
                      { defaultValue: scenario.footerStat },
                    )}
                  </span>
                </div>
              </article>
            ))}
          </div>

          {/* Platform capabilities — the truthful product story (e2e-pinned) */}
          <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-8 mt-8')}>
            {FEATURES.map((f) => (
              <article
                key={f.key}
                data-mol-id={'landing-feature-' + f.key}
                className={cm.cn(
                  'bg-surface-container-low rounded-lg p-6 lp-hairline flex flex-col',
                )}
              >
                <div className={cm.cn('flex items-center justify-between pb-4 lp-hairline-b mb-4')}>
                  <span className={cm.cn('text-[11px] text-secondary font-mono')}>
                    {t(
                      'landing.features.capabilityLabel',
                      { num: f.num },
                      { defaultValue: 'CAPABILITY {{num}}' },
                    )}
                  </span>
                  <span
                    className={cm.cn(
                      'sb-icon flex h-8 w-8 items-center justify-center rounded bg-surface-container-lowest text-primary lp-hairline',
                    )}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">{f.icon}</span>
                  </span>
                </div>
                <h3 className={cm.cn('lp-serif text-xl text-primary mb-3')}>
                  {t('landing.features.' + f.key + '.title', {}, { defaultValue: f.title })}
                </h3>
                <p className={cm.cn('text-[13px] text-on-surface-variant leading-relaxed')}>
                  {t('landing.features.' + f.key + '.body', {}, { defaultValue: f.body })}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TWO-WAY PMS & PBX INTEGRATIONS ============ */}
      <section
        className={cm.cn('py-20 bg-surface-container-low lp-hairline-b scroll-mt-20')}
        id="integrations"
        data-mol-id="landing-integrations"
      >
        <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, 'px-6 md:px-10')}>
          <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-12 items-center')}>
            {/* Left: explanation + protocol list */}
            <div className={cm.cn('lg:col-span-5')}>
              <span
                className={cm.cn(
                  'block text-[11px] text-secondary uppercase tracking-widest font-semibold mb-2',
                )}
              >
                {t(
                  'landing.integrations.eyebrow',
                  {},
                  { defaultValue: 'Architectural Interoperability' },
                )}
              </span>
              <h2
                className={cm.cn('lp-serif text-3xl md:text-4xl text-primary tracking-tight mb-4')}
              >
                {t(
                  'landing.integrations.heading',
                  {},
                  { defaultValue: 'Two-Way PMS Sync in Under 15 Minutes' },
                )}
              </h2>
              <p className={cm.cn('text-sm text-on-surface-variant leading-relaxed mb-6')}>
                {t(
                  'landing.integrations.subheading',
                  {},
                  {
                    defaultValue:
                      'We don\u2019t replace your existing systems. Switchboard links directly into your Property Management System (PMS) and phone PBX. When a guest requests a booking or room change, it writes directly to your central reservation ledger with zero human transcription errors.',
                  },
                )}
              </p>
              <div className={cm.cn('space-y-3')} id="architecture">
                {PROTOCOLS.map((p) => (
                  <div
                    key={p.key}
                    className={cm.cn(
                      'flex items-start gap-3 p-3 bg-surface-container-lowest rounded lp-hairline',
                    )}
                  >
                    <span
                      className={cm.cn(
                        'sb-icon flex h-5 w-5 items-center justify-center text-secondary mt-0.5',
                      )}
                      aria-hidden="true"
                    >
                      <span className="material-symbols-outlined">{p.icon}</span>
                    </span>
                    <div>
                      <strong className={cm.cn('block text-sm font-semibold text-primary')}>
                        {t(`landing.integrations.${p.key}.title`, {}, { defaultValue: p.title })}
                      </strong>
                      <span className={cm.cn('text-[13px] text-on-surface-variant')}>
                        {t(`landing.integrations.${p.key}.body`, {}, { defaultValue: p.body })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: certified connectors bento grid */}
            <div className={cm.cn('lg:col-span-7')} data-mol-id="landing-connectors">
              <div className={cm.cn('grid grid-cols-2 sm:grid-cols-3 gap-4')}>
                {CONNECTORS.map((connector) => (
                  <div
                    key={connector.key}
                    data-mol-id={'landing-connector-' + connector.key}
                    className={cm.cn(
                      'bg-surface-container-lowest p-5 rounded-lg lp-hairline hover:border-secondary transition-colors',
                    )}
                  >
                    <div className={cm.cn('flex items-center justify-between mb-4 gap-2')}>
                      <span
                        className={cm.cn(
                          'text-[11px] px-2 py-0.5 rounded font-semibold',
                          connector.highlight
                            ? 'bg-secondary-fixed text-on-secondary-fixed'
                            : 'bg-surface-container text-primary',
                        )}
                      >
                        {t(
                          `landing.connectors.${connector.key}.tag`,
                          {},
                          { defaultValue: connector.tag },
                        )}
                      </span>
                      <span
                        className={cm.cn(
                          'sb-icon flex h-4 w-4 items-center justify-center text-secondary',
                        )}
                        aria-hidden="true"
                      >
                        <span className="material-symbols-outlined">verified</span>
                      </span>
                    </div>
                    <div className={cm.cn('lp-serif text-xl font-bold text-primary')}>
                      {t(
                        `landing.connectors.${connector.key}.name`,
                        {},
                        { defaultValue: connector.name },
                      )}
                    </div>
                    <p className={cm.cn('text-[13px] text-on-surface-variant mt-1')}>
                      {t(
                        `landing.connectors.${connector.key}.body`,
                        {},
                        { defaultValue: connector.body },
                      )}
                    </p>
                    <div className={cm.cn('mt-4 text-[11px] font-mono text-secondary')}>
                      {t(
                        `landing.connectors.${connector.key}.badge`,
                        {},
                        { defaultValue: connector.badge },
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ BOUTIQUE HOTELIER CASE STUDY ============ */}
      <section
        className={cm.cn('py-20 bg-surface lp-hairline-b scroll-mt-20')}
        id="case-study"
        data-mol-id="landing-case-study"
      >
        <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, 'px-6 md:px-10')}>
          <div
            className={cm.cn(
              'bg-surface-container-low rounded-xl p-8 md:p-12 lp-hairline relative overflow-hidden',
            )}
          >
            {/* Large watermark quotation symbol */}
            <span
              className={cm.cn(
                'lp-serif text-[140px] leading-none absolute -top-4 -left-2 pointer-events-none select-none text-surface-container-high',
              )}
              aria-hidden="true"
            >
              “
            </span>
            <div
              className={cm.cn('relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center')}
            >
              {/* Testimonial quote */}
              <div className={cm.cn('lg:col-span-8 flex flex-col gap-6')}>
                <div
                  className={cm.cn(
                    'inline-flex items-center gap-2 text-secondary text-[11px] uppercase tracking-wider font-semibold',
                  )}
                >
                  <span
                    className={cm.cn('sb-icon flex h-4 w-4 items-center justify-center')}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">hotel</span>
                  </span>
                  <span>
                    {t(
                      'landing.caseStudy.label',
                      {},
                      {
                        defaultValue: 'Case Study · The Saint-Germain Grand, Paris (68 Keys)',
                      },
                    )}
                  </span>
                </div>
                <blockquote
                  className={cm.cn('lp-serif text-2xl md:text-3xl text-primary leading-snug')}
                >
                  {t(
                    'landing.caseStudy.quote',
                    {},
                    {
                      defaultValue:
                        '“Switchboard captured 14 late-night walk-in reservations in our first weekend alone. Guests genuinely assumed they were speaking with our most experienced concierge. Our morning staff now arrive to an organized ledger instead of panic.”',
                    },
                  )}
                </blockquote>
                <div className={cm.cn('flex items-center gap-4 pt-2')}>
                  <div
                    className={cm.cn(
                      'w-12 h-12 rounded-full bg-primary text-surface flex items-center justify-center text-base font-semibold',
                    )}
                    aria-hidden="true"
                  >
                    AG
                  </div>
                  <div>
                    <div className={cm.cn('text-base font-semibold text-primary')}>
                      {t('landing.caseStudy.attribution', {}, { defaultValue: 'Antoine Giraud' })}
                    </div>
                    <div className={cm.cn('text-[13px] text-on-surface-variant')}>
                      {t(
                        'landing.caseStudy.role',
                        {},
                        {
                          defaultValue: 'General Manager & Co-Owner, The Saint-Germain Grand',
                        },
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Proof metrics cluster */}
              <div
                className={cm.cn(
                  'lg:col-span-4 bg-surface-container-lowest p-6 rounded-lg lp-hairline space-y-6',
                )}
              >
                {CASE_STUDY_PROOF.map((metric, i) => (
                  <div key={metric.key} className={cm.cn(i > 0 ? 'lp-hairline-t pt-4' : '')}>
                    <div className={cm.cn('lp-serif text-3xl tracking-tight', metric.tone)}>
                      {t(
                        `landing.caseStudy.${metric.key}.value`,
                        {},
                        { defaultValue: metric.value },
                      )}
                    </div>
                    <div className={cm.cn('text-[13px] text-on-surface-variant')}>
                      {t(`landing.caseStudy.${metric.key}.body`, {}, { defaultValue: metric.body })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ COMPARISON MATRIX: FRONT DESK LEDGER ============ */}
      <section
        className={cm.cn('py-20 bg-surface-container-low lp-hairline-b')}
        data-mol-id="landing-compare"
      >
        <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, 'px-6 md:px-10')}>
          <div className={cm.cn('text-center max-w-2xl mx-auto mb-14')}>
            <span
              className={cm.cn(
                'block text-[11px] text-secondary uppercase tracking-widest font-semibold mb-2',
              )}
            >
              {t('landing.compare.eyebrow', {}, { defaultValue: 'Comparative Clarity' })}
            </span>
            <h2 className={cm.cn('lp-serif text-3xl md:text-4xl text-primary tracking-tight')}>
              {t(
                'landing.compare.heading',
                {},
                { defaultValue: 'How Switchboard Reinvents the Front Desk Ledger' },
              )}
            </h2>
            <p className={cm.cn('text-sm text-on-surface-variant mt-2')}>
              {t(
                'landing.compare.subheading',
                {},
                {
                  defaultValue:
                    'An honest, side-by-side evaluation of traditional night auditing vs. autonomous voice hospitality.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn('overflow-x-auto rounded-lg lp-hairline')}>
            <table
              className={cm.cn('w-full text-left border-collapse bg-surface-container-lowest')}
            >
              <thead>
                <tr className={cm.cn('bg-surface-container lp-hairline-b')}>
                  <th
                    scope="col"
                    className={cm.cn('py-4 px-6 text-sm font-semibold text-on-surface-variant')}
                  >
                    {t(
                      'landing.compare.colDimension',
                      {},
                      { defaultValue: 'Operational Dimension' },
                    )}
                  </th>
                  <th
                    scope="col"
                    className={cm.cn('py-4 px-6 text-sm font-semibold text-on-surface-variant')}
                  >
                    {t('landing.compare.colDesk', {}, { defaultValue: 'Solo Daytime Front Desk' })}
                  </th>
                  <th
                    scope="col"
                    className={cm.cn('py-4 px-6 text-sm font-semibold text-on-surface-variant')}
                  >
                    {t('landing.compare.colAuditor', {}, { defaultValue: 'Human Night Auditor' })}
                  </th>
                  <th
                    scope="col"
                    className={cm.cn(
                      'py-4 px-6 text-sm font-semibold text-primary bg-secondary/10',
                    )}
                  >
                    {t('landing.compare.colSwitchboard', {}, { defaultValue: 'Switchboard AI' })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.key} className={cm.cn('border-t border-outline-variant/30')}>
                    <th
                      scope="row"
                      className={cm.cn(
                        'py-4 px-6 text-[13px] font-semibold text-primary text-left',
                      )}
                    >
                      {t(`landing.compare.${row.key}.dim`, {}, { defaultValue: row.dim })}
                    </th>
                    <td className={cm.cn('py-4 px-6 text-[13px] text-on-surface-variant')}>
                      {t(`landing.compare.${row.key}.desk`, {}, { defaultValue: row.desk })}
                    </td>
                    <td className={cm.cn('py-4 px-6 text-[13px] text-on-surface-variant')}>
                      {t(`landing.compare.${row.key}.auditor`, {}, { defaultValue: row.auditor })}
                    </td>
                    <td
                      className={cm.cn(
                        'py-4 px-6 text-[13px] font-semibold bg-secondary/5',
                        row.key === 'burnout' ? 'text-emerald-800' : 'text-primary',
                      )}
                    >
                      {t(`landing.compare.${row.key}.sb`, {}, { defaultValue: row.sb })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ============ INTERACTIVE INSTANT TRIAL CALL BAND ============ */}
      <section
        className={cm.cn('py-20 bg-primary text-surface relative overflow-hidden')}
        id="demo-simulator"
        data-mol-id="landing-demo"
      >
        {/* Subtle architectural brass highlight line */}
        <div
          className={cm.cn(
            'absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-secondary to-transparent',
          )}
          aria-hidden="true"
        />
        <div className={cm.cn('max-w-5xl mx-auto px-6 md:px-10 text-center')}>
          <div
            className={cm.cn(
              'inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/10 text-secondary-fixed text-[11px] font-semibold uppercase tracking-wider mb-4',
            )}
          >
            <span
              className={cm.cn('sb-icon flex h-4 w-4 items-center justify-center')}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined">call</span>
            </span>
            <span>
              {t(
                'landing.cta.badge',
                {},
                { defaultValue: 'Zero-Commitment Live Audio Experience' },
              )}
            </span>
          </div>
          <h2 className={cm.cn('lp-serif text-3xl md:text-5xl text-surface tracking-tight mb-4')}>
            {t(
              'landing.cta.heading',
              {},
              { defaultValue: 'Give your front desk their evenings back.' },
            )}
          </h2>
          <p
            className={cm.cn('text-base md:text-lg text-primary-fixed-dim max-w-2xl mx-auto mb-10')}
          >
            {t(
              'landing.cta.body',
              {},
              {
                defaultValue:
                  'Experience the natural pacing firsthand. Enter your property name and phone number below to receive an instantaneous, courteous phone call from the Switchboard concierge engine.',
              },
            )}
          </p>

          {/* Instant simulator form */}
          <div
            className={cm.cn(
              'bg-surface/10 p-6 rounded-xl backdrop-blur-md lp-hairline border-white/10 max-w-2xl mx-auto text-left shadow-2xl',
            )}
            data-mol-id="landing-demo-form"
          >
            <form
              className={cm.cn('grid grid-cols-1 sm:grid-cols-12 gap-3')}
              onSubmit={(e) => {
                e.preventDefault()
                setDemoDispatched(true)
              }}
            >
              <div className={cm.cn('sm:col-span-5')}>
                <label
                  className={cm.cn(
                    'block text-[11px] text-primary-fixed-dim mb-1 font-semibold tracking-wide',
                  )}
                  htmlFor="demo-property"
                >
                  {t('landing.demo.propertyLabel', {}, { defaultValue: 'Boutique Property Name' })}
                </label>
                <input
                  id="demo-property"
                  name="demo-property"
                  type="text"
                  required
                  data-mol-id="demo-property"
                  placeholder={t(
                    'landing.demo.propertyPlaceholder',
                    {},
                    { defaultValue: 'e.g. Hotel Le Marais' },
                  )}
                  className={cm.cn(
                    'w-full bg-surface-container-lowest text-primary px-3.5 py-2.5 rounded text-sm border-0 outline-none focus:ring-2 focus:ring-secondary',
                  )}
                />
              </div>
              <div className={cm.cn('sm:col-span-7')}>
                <label
                  className={cm.cn(
                    'block text-[11px] text-primary-fixed-dim mb-1 font-semibold tracking-wide',
                  )}
                  htmlFor="demo-phone"
                >
                  {t(
                    'landing.demo.phoneLabel',
                    {},
                    { defaultValue: 'Direct Phone (Mobile or Landline)' },
                  )}
                </label>
                <div className={cm.cn('flex gap-2')}>
                  <input
                    id="demo-phone"
                    name="demo-phone"
                    type="tel"
                    required
                    data-mol-id="demo-phone"
                    placeholder={t(
                      'landing.demo.phonePlaceholder',
                      {},
                      { defaultValue: '+1 (555) 019-2834' },
                    )}
                    className={cm.cn(
                      'w-full bg-surface-container-lowest text-primary px-3.5 py-2.5 rounded text-sm border-0 outline-none focus:ring-2 focus:ring-secondary',
                    )}
                  />
                  <button
                    type="submit"
                    data-mol-id="demo-ring-submit"
                    className={cm.cn(
                      'bg-secondary text-white hover:bg-primary-container px-4 py-2.5 rounded text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 shadow-md',
                    )}
                  >
                    <span>{t('landing.demo.submit', {}, { defaultValue: 'Place Ring' })}</span>
                    <span
                      className={cm.cn('sb-icon flex h-4 w-4 items-center justify-center')}
                      aria-hidden="true"
                    >
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </span>
                  </button>
                </div>
              </div>
            </form>
            {demoDispatched ? (
              <p
                data-mol-id="demo-dispatched"
                className={cm.cn('mt-4 text-[13px] font-mono text-secondary-fixed')}
              >
                {t(
                  'landing.demo.dispatched',
                  {},
                  {
                    defaultValue: 'Demo call dispatched — Switchboard is ringing your phone now.',
                  },
                )}
              </p>
            ) : null}
            {/* Or dial direct phone line note */}
            <div
              className={cm.cn(
                'mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-primary-fixed-dim',
              )}
            >
              <span>
                {t(
                  'landing.demo.dialDirect',
                  {},
                  { defaultValue: 'Or dial our demo concierge directly right now:' },
                )}
              </span>
              <a
                href="tel:+18005843912"
                className={cm.cn(
                  'font-mono text-secondary-fixed hover:underline flex items-center gap-1 text-sm font-semibold',
                )}
              >
                <span
                  className={cm.cn('sb-icon flex h-3.5 w-3.5 items-center justify-center')}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">call</span>
                </span>
                +1-800-584-3912 (
                {t('landing.demo.tollFree', {}, { defaultValue: 'Toll-Free 24/7' })})
              </a>
            </div>
          </div>

          {/* Account CTAs (kept distinct from the hero CTA labels) */}
          <div className={cm.cn('mt-10 flex flex-wrap items-center justify-center gap-4')}>
            <Link
              to="/signup"
              data-mol-id="landing-demo-cta-signup"
              className={cm.cn(
                'inline-flex items-center gap-2 bg-secondary text-white text-sm font-semibold px-6 py-3.5 rounded-lg hover:bg-primary-container transition-all duration-150 active:scale-95 shadow-md',
              )}
            >
              <span
                className={cm.cn('sb-icon flex h-4 w-4 items-center justify-center')}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined fill">phone_in_talk</span>
              </span>
              <span>
                {t(
                  'landing.demo.ctaSignup',
                  {},
                  { defaultValue: 'Create your front desk account' },
                )}
              </span>
            </Link>
            <Link
              to="/login"
              data-mol-id="landing-demo-cta-login"
              className={cm.cn(
                'inline-flex items-center gap-2 bg-surface/10 text-surface text-sm font-semibold px-5 py-3.5 rounded-lg lp-hairline hover:bg-surface/20 transition-colors',
              )}
            >
              <span>{t('landing.demo.ctaLogin', {}, { defaultValue: 'Operator sign in' })}</span>
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
