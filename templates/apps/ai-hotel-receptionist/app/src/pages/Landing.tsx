import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

const LANGUAGE_CHIPS = [
  'EN · English',
  'FR · Français',
  'DE · Deutsch',
  'ES · Español',
  'JA · 日本語',
  'ZH · 中文',
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
    valueTone: 'primary' as const,
    title: 'Direct Phone Calls Missed',
    body: 'Occurs during peak arrival hours (3:00–5:30 PM) and graveyard shifts (midnight–6:00 AM). When the line rings busy, luxury guests do not leave voicemails.',
    bench: 'BENCHMARK: 38-CALL DAILY INBOUND AVERAGE',
  },
  {
    icon: 'trending_down',
    key: 'leakage',
    value: '$18,400',
    valueSuffix: '',
    valueTone: 'secondary' as const,
    title: 'Monthly Direct Revenue Leakage',
    body: 'Unanswered callers immediately click over to OTAs, inflicting an 18–22% commission penalty — or choose a neighboring boutique hotel instead.',
    bench: 'ESTIMATED LEAKAGE PER 50-KEY PROPERTY',
  },
  {
    icon: 'savings',
    key: 'payroll',
    value: '$62,000',
    valueSuffix: '/yr',
    valueTone: 'primary' as const,
    title: 'Night Auditor Payroll Recaptured',
    body: 'The overnight desk role has an 82% annual turnover rate. {{appName}} acts as the untiring, fluent night auditor — zero graveyard burnout.',
    bench: 'ZERO NIGHT SHIFT TURNOVER OVERHEAD',
  },
] as const

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

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

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
      <Header />

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
                  className={cm.cn('material-symbols-outlined fill text-[20px]')}
                  aria-hidden="true"
                >
                  phone_callback
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
                <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                  login
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
                    className={cm.cn('material-symbols-outlined text-secondary text-[20px]')}
                    aria-hidden="true"
                  >
                    {spec.icon}
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
                    className={cm.cn('material-symbols-outlined text-[14px] text-secondary')}
                    aria-hidden="true"
                  >
                    timer
                  </span>
                  <span className={cm.cn('text-[11px] text-primary font-mono')}>
                    {t('landing.console.latency', {}, { defaultValue: '318ms RTT' })}
                  </span>
                </div>
              </div>

              {/* Caller profile */}
              <div
                className={cm.cn(
                  'py-3 px-3.5 my-3 bg-surface-container-low/60 rounded-lg lp-hairline flex items-center justify-between',
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
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white lp-hairline text-[11px] font-mono text-primary font-medium',
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
                    <div className={cm.cn('flex items-center gap-0.5 h-4 px-1')} aria-hidden="true">
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <div
                          key={n}
                          className={cm.cn(
                            `lp-wave-bar lp-wave-bar-${n} w-0.5 bg-secondary rounded-full`,
                          )}
                          style={{ height: 10 }}
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
              <div className={cm.cn('p-3 bg-white rounded-lg lp-hairline space-y-2')}>
                <div className={cm.cn('flex items-center justify-between text-xs')}>
                  <span
                    className={cm.cn(
                      'flex items-center gap-1.5 text-[11px] text-primary font-semibold',
                    )}
                  >
                    <span
                      className={cm.cn(
                        'material-symbols-outlined fill text-[16px] text-emerald-700',
                      )}
                      aria-hidden="true"
                    >
                      check_circle
                    </span>
                    {t('landing.console.pmsLock', {}, { defaultValue: 'PMS 2-Way Lock Applied' })}
                  </span>
                  <span
                    className={cm.cn(
                      'font-mono text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded lp-hairline',
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
                    className={cm.cn('material-symbols-outlined text-[16px]')}
                    aria-hidden="true"
                  >
                    hearing
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
                    className={cm.cn('material-symbols-outlined text-[14px]')}
                    aria-hidden="true"
                  >
                    call_merge
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
      <section className={cm.cn('py-20 bg-surface-container-low lp-hairline-b')}>
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
                      'Independent boutique hotels lose direct room reservations simply because the phone rings while the desk is handing over keys — or during overnight gaps.',
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
                      'w-10 h-10 rounded flex items-center justify-center mb-6',
                      s.key === 'leakage' ? 'bg-secondary/10 text-secondary' : '',
                      s.key === 'payroll' ? 'bg-tertiary-container text-tertiary-fixed' : '',
                      s.key === 'missed' ? 'bg-surface-container text-primary' : '',
                    )}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined text-[22px]')}>{s.icon}</span>
                  </div>
                  <div
                    className={cm.cn(
                      'lp-serif text-4xl md:text-5xl tracking-tight mb-2',
                      s.valueTone === 'secondary' ? 'text-secondary' : 'text-primary',
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
      <section className={cm.cn('py-20 bg-surface lp-hairline-b')} id="intelligence">
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
                { defaultValue: 'The front desk that never sleeps' },
              )}
            </h2>
            <p className={cm.cn('text-base text-on-surface-variant mt-3')}>
              {t(
                'landing.features.subheading',
                {},
                {
                  defaultValue:
                    'One workspace for the phone line and the property: the voice agent works the same availability and pricing rules your staff do.',
                },
              )}
            </p>
            {/* Language pills */}
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

          <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-8')}>
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
                      'landing.features.scenarioLabel',
                      { num: f.num },
                      { defaultValue: 'SCENARIO {{num}}' },
                    )}
                  </span>
                  <span
                    className={cm.cn(
                      'w-8 h-8 rounded bg-white flex items-center justify-center text-primary',
                    )}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined text-[18px]')}>{f.icon}</span>
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

      {/* ===================== DARK CTA BANNER ===================== */}
      <section className={cm.cn('py-20 bg-primary text-surface relative overflow-hidden')}>
        <div
          className={cm.cn(
            'absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-secondary to-transparent',
          )}
          aria-hidden="true"
        />
        <div className={cm.cn('max-w-3xl mx-auto px-6 md:px-10 text-center')}>
          <div
            className={cm.cn(
              'inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/10 text-secondary-fixed text-[11px] font-semibold uppercase tracking-wider mb-4',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
              call
            </span>
            <span>
              {t(
                'landing.cta.badge',
                {},
                { defaultValue: 'Zero-commitment live audio experience' },
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
              { appName: APP_NAME },
              {
                defaultValue:
                  'Experience the natural pacing firsthand — {{appName}} answers in the caller\u2019s language, books the room, and writes the folio while your staff sleep.',
              },
            )}
          </p>
          <div className={cm.cn('flex flex-wrap items-center justify-center gap-4')}>
            <Link
              to="/signup"
              className={cm.cn(
                'inline-flex items-center gap-2 bg-secondary text-white text-sm font-semibold px-6 py-3.5 rounded-lg hover:opacity-90 transition-all duration-150 active:scale-95 shadow-md',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined fill text-[18px]')}
                aria-hidden="true"
              >
                phone_in_talk
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
              className={cm.cn(
                'inline-flex items-center gap-2 bg-surface/10 text-surface text-sm font-semibold px-5 py-3.5 rounded-lg lp-hairline hover:bg-surface/20 transition-colors',
              )}
            >
              <span>
                {t('landing.hero.ctaSecondary', {}, { defaultValue: 'Sign in to the front desk' })}
              </span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
