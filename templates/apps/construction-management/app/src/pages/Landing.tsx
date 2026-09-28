import { useEffect } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * Public landing page (Stitch design: design-construction-management-landing).
 * Industrial "jobsite OS" flow: sticky app bar → field-telemetry ticker →
 * centered hero with CAD terminal mockup → ENR contractor social proof →
 * three module pillars with check lists → quantified-ROI metrics →
 * superintendent testimonial → conversion CTA → industrial footer.
 * The mockup, ticker and stats are presentational (design content); every
 * interactive element routes to a real page.
 */

const PILLARS = [
  {
    module: 'MODULE 01 // REPORTING',
    icon: 'event_available',
    tone: 'text-primary',
    hover: 'hover:border-primary',
    titleKey: 'landing.pillar.dailyLogs.title',
    titleDefault: 'Automated Daily Logs & Weather Sync',
    bodyKey: 'landing.pillar.dailyLogs.body',
    bodyDefault:
      'Track subcontractor headcount, trade hours, weather records, and equipment runtime automatically. Foremen speak notes into voice-to-text with auto-GPS pins.',
    checks: [
      'Hourly wind & temperature integration',
      'Automatic subcontractor roll call',
      'One-click owner PDF daily exports',
    ],
  },
  {
    module: 'MODULE 02 // CAD ENGINE',
    icon: 'layers',
    tone: 'text-secondary',
    hover: 'hover:border-secondary',
    titleKey: 'landing.pillar.rfis.title',
    titleDefault: 'Sub-Second Vector Sheets & Hyperlinked RFIs',
    bodyKey: 'landing.pillar.rfis.body',
    bodyDefault:
      'Open 1,200-sheet architectural drawing sets instantly with zero lag. Tap detail callouts to leap directly to referenced sheets, RFIs, and submittals.',
    checks: [
      'Offline native vector caching',
      'Auto-hyperlinked detail callout numbers',
      'Visual CAD revision slip-sheet differencing',
    ],
  },
  {
    module: 'MODULE 03 // QUALITY & SAFETY',
    icon: 'verified_user',
    tone: 'text-tertiary',
    hover: 'hover:border-tertiary',
    titleKey: 'landing.pillar.punch.title',
    titleDefault: 'Punch Lists & Safety Audits with Zero Friction',
    bodyKey: 'landing.pillar.punch.body',
    bodyDefault:
      'Pin photos directly to exact drawing coordinates. Alert trade foremen instantly. Close out issues with digital contractor verification sign-offs.',
    checks: [
      'OSHA inspection form templates',
      'Direct trade foreman mobile push alerts',
      'Photographic before/after audit trails',
    ],
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  useEffect(() => {
    document.title = `${APP_NAME} — ${APP_TAGLINE}`
  }, [])

  const streams = [
    {
      label: t('landing.stream1Label', {}, { defaultValue: 'RFI #142' }),
      when: t('landing.stream1When', {}, { defaultValue: '3m ago' }),
      title: t('landing.stream1Title', {}, { defaultValue: 'Shear Wall Rebar Clearance' }),
      body: t(
        'landing.stream1Body',
        {},
        { defaultValue: 'Structural Eng: Approved as noted. Proceed with pour.' },
      ),
      tone: 'border-primary',
    },
    {
      label: t('landing.stream2Label', {}, { defaultValue: 'SUB CLOCK-IN LOG' }),
      when: t('landing.stream2When', {}, { defaultValue: '07:15 AM' }),
      title: t('landing.stream2Title', {}, { defaultValue: 'Pacific Steel Trades' }),
      body: t(
        'landing.stream2Body',
        {},
        { defaultValue: '18 Ironworkers, 2 Foremen logged onsite.' },
      ),
      tone: 'border-secondary',
    },
    {
      label: t('landing.stream3Label', {}, { defaultValue: 'OSHA PRE-TASK PLAN' }),
      when: t('landing.stream3When', {}, { defaultValue: 'Daily' }),
      title: t('landing.stream3Title', {}, { defaultValue: 'Rigging & Crane Protocol' }),
      body: t('landing.stream3Body', {}, { defaultValue: 'Signed by Supt. J. Kowalski' }),
      tone: 'border-tertiary',
    },
  ]

  const stats = [
    {
      value: '4.2 hrs',
      tone: 'text-primary',
      title: t('landing.stat1Title', {}, { defaultValue: 'Saved Per Super Weekly' }),
      body: t(
        'landing.stat1Body',
        {},
        {
          defaultValue:
            'Eliminating double-entry between job trailer paper logs and spreadsheet schedules.',
        },
      ),
    },
    {
      value: '68%',
      tone: 'text-secondary',
      title: t('landing.stat2Title', {}, { defaultValue: 'Faster RFI Resolution' }),
      body: t(
        'landing.stat2Body',
        {},
        {
          defaultValue:
            'Direct architect linking cuts pending field clarifications from 9.4 days to under 72 hours.',
        },
      ),
    },
    {
      value: '$0',
      tone: 'text-tertiary',
      title: t('landing.stat3Title', {}, { defaultValue: 'Rework on Outdated Sets' }),
      body: t(
        'landing.stat3Body',
        {},
        {
          defaultValue:
            'Instant plan syncing prevents subs from roughing-in off superseded architectural sets.',
        },
      ),
    },
  ]

  return (
    <div className={cm.cn('min-h-screen bg-background text-on-background')}>
      {/* Top app bar */}
      <header
        className={cm.cn('sticky top-0 z-50 bg-surface shadow-sm border-b border-outline-variant')}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            'w-full px-4 md:px-8 max-w-7xl mx-auto h-16',
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/"
              data-mol-id="landing-brand"
              className={cm.flex({ align: 'center', gap: 'xs' })}
            >
              <span
                aria-hidden="true"
                className={cm.cn(
                  'material-symbols-outlined brand-gradient text-on-primary rounded-lg p-1.5',
                )}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                construction
              </span>
              <span className={cm.flex({ direction: 'col' })}>
                <span
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('bold'),
                    'tracking-tight text-primary',
                  )}
                >
                  {APP_NAME}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'text-on-surface-variant uppercase tracking-widest hidden sm:block',
                  )}
                  style={{ fontSize: '11px' }}
                >
                  {t('landing.brandSub', {}, { defaultValue: 'Jobsite OS' })}
                </span>
              </span>
            </Link>
            <nav
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'lg' }),
                'hidden md:flex items-center ml-6 pl-6 border-l border-outline-variant',
              )}
              aria-label={t('landing.navLabel', {}, { defaultValue: 'Main menu' })}
            >
              <a
                href="#product"
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-primary')}
              >
                {t('landing.navProduct', {}, { defaultValue: 'Product' })}
              </a>
              <a
                href="#features"
                className={cm.cn(
                  cm.textSize('sm'),
                  'text-on-surface hover:text-primary transition-colors',
                )}
              >
                {t('landing.navFieldTools', {}, { defaultValue: 'Field Tools' })}
              </a>
              <a
                href="#metrics"
                className={cm.cn(
                  cm.textSize('sm'),
                  'text-on-surface hover:text-primary transition-colors',
                )}
              >
                {t('landing.navProof', {}, { defaultValue: 'Field Proof' })}
              </a>
              <Link
                to="/pricing"
                className={cm.cn(
                  cm.textSize('sm'),
                  'text-on-surface hover:text-primary transition-colors',
                )}
              >
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </Link>
            </nav>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/login"
              data-mol-id="landing-login-link"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'hidden sm:inline-flex items-center text-on-surface hover:text-secondary px-3 py-1.5 transition-colors',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign In' })}
            </Link>
            <Link
              to="/signup"
              data-mol-id="landing-signup-link"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'inline-flex items-center rounded-lg brand-gradient text-on-primary shadow-sm hover:opacity-90 transition-transform active:scale-[0.98]',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                construction
              </span>
              <span>{t('landing.bookDemo', {}, { defaultValue: 'Book Demo' })}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Field telemetry ticker */}
      <section
        className={cm.cn(
          'bg-surface-container border-b border-outline-variant py-1.5 px-4 md:px-8',
        )}
        data-mol-id="landing-telemetry"
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            'max-w-7xl mx-auto gap-4 whitespace-nowrap',
          )}
          style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em' }}
        >
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <span
              className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5 text-tertiary font-bold')}
            >
              <span
                className={cm.cn('w-2 h-2 rounded-full bg-tertiary animate-pulse')}
                aria-hidden="true"
              />
              {t('landing.telemetryConnected', {}, { defaultValue: 'FIELD TELEMETRY CONNECTED' })}
            </span>
            <span className="text-outline" aria-hidden="true">
              |
            </span>
            <span className={cm.cn(cm.flex({ align: 'center' }), 'gap-1 text-on-surface-variant')}>
              <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                wb_sunny
              </span>
              <span>
                {t(
                  'landing.telemetryWeather',
                  {},
                  { defaultValue: 'PACIFIC NW SITES: 64°F HUMIDITY 42%' },
                )}
              </span>
            </span>
            <span className="text-outline hidden md:inline" aria-hidden="true">
              |
            </span>
            <span
              className={cm.cn(
                cm.flex({ align: 'center' }),
                'gap-1 text-on-surface-variant hidden md:flex',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                air
              </span>
              <span>
                {t(
                  'landing.telemetryWind',
                  {},
                  { defaultValue: 'WIND: 6 MPH NNE (CRANE RATED: CLEAR)' },
                )}
              </span>
            </span>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3 font-semibold')}>
            <span className="bg-surface-container-lowest px-2 py-0.5 rounded border border-outline-variant text-on-surface">
              {t('landing.telemetryLatency', {}, { defaultValue: 'SYS LATENCY: 18ms' })}
            </span>
            <span className="bg-surface-container-lowest px-2 py-0.5 rounded border border-outline-variant text-on-surface hidden md:inline">
              {t('landing.telemetryCache', {}, { defaultValue: 'OFFLINE CACHE: ACTIVE' })}
            </span>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Hero */}
        <section className="relative pt-12 pb-20 overflow-hidden" id="product">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <div
              className={cm.cn(
                cm.flex({ align: 'center' }),
                'inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant mb-6 shadow-sm',
              )}
            >
              <span className={cm.cn('w-2 h-2 rounded-full bg-tertiary')} aria-hidden="true" />
              <span
                className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface tracking-wider')}
                style={{ fontSize: '11px' }}
              >
                {t(
                  'landing.releaseBadge',
                  {},
                  { defaultValue: 'FIELD-READY CONSTRUCTION SAAS • RELEASE 4.2' },
                )}
              </span>
            </div>
            <h1
              data-mol-id="landing-headline"
              className={cm.cn(
                cm.fontWeight('bold'),
                'tracking-tight text-on-surface mb-6 text-4xl md:text-5xl',
              )}
            >
              {t('landing.headlineLead', {}, { defaultValue: 'Run the job from ' })}
              <span className="text-primary underline decoration-outline-variant decoration-4 underline-offset-8">
                {t('landing.headlineAccent', {}, { defaultValue: 'groundbreaking' })}
              </span>
              {t('landing.headlineTail', {}, { defaultValue: ' to closeout.' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                'text-on-surface-variant max-w-2xl mx-auto mb-8 leading-relaxed',
              )}
            >
              {t(
                'landing.subheadline',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Connect field superintendents, project engineers, and trade subcontractors on one ruggedized jobsite platform. Zero drawing lag, instant RFIs, and automated daily logs — {{appName}} keeps the whole crew on one record.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
                'flex-col sm:flex-row',
              )}
            >
              <Link
                to="/signup"
                data-mol-id="landing-cta-signup"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('px', 6),
                  cm.sp('py', 4),
                  cm.fontWeight('semibold'),
                  'w-full sm:w-auto inline-flex rounded-lg brand-gradient text-on-primary shadow-sm hover:opacity-90 transition-all active:scale-[0.98]',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-lg')} aria-hidden="true">
                  electric_bolt
                </span>
                <span>
                  {t('landing.ctaPrimary', {}, { defaultValue: 'Start 14-Day Free Trial' })}
                </span>
              </Link>
              <Link
                to="/pricing"
                data-mol-id="landing-cta-pricing"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('px', 6),
                  cm.sp('py', 4),
                  cm.fontWeight('semibold'),
                  'w-full sm:w-auto inline-flex rounded-lg bg-surface-container-lowest text-secondary border border-secondary hover:bg-surface-container transition-all active:scale-[0.98]',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-lg')} aria-hidden="true">
                  calendar_today
                </span>
                <span>
                  {t('landing.ctaSecondary', {}, { defaultValue: 'Schedule Field Demo' })}
                </span>
              </Link>
            </div>
          </div>

          {/* CAD field terminal mockup */}
          <div
            className={cm.cn(
              'relative max-w-5xl mx-auto bg-surface-container-lowest border border-outline-variant rounded-xl shadow-md overflow-hidden',
            )}
            data-mol-id="landing-terminal"
          >
            {/* Titlebar */}
            <div
              className={cm.cn(
                'bg-surface-container-high border-b border-outline-variant px-4 py-3 flex flex-wrap items-center justify-between gap-2',
              )}
            >
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span className={cm.flex({ gap: 'xs' })} aria-hidden="true">
                  <span className="w-3 h-3 rounded-full bg-error inline-block" />
                  <span className="w-3 h-3 rounded-full bg-secondary-container inline-block" />
                  <span className="w-3 h-3 rounded-full bg-tertiary inline-block" />
                </span>
                <span
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
                >
                  {t(
                    'landing.terminalJob',
                    {},
                    { defaultValue: 'JOB: 740 Pacific Tower — Phase 2 Substructure' },
                  )}
                </span>
                <span
                  className={cm.cn(
                    'bg-secondary-container text-on-surface px-2 py-0.5 rounded border border-secondary font-semibold',
                  )}
                  style={{ fontSize: '11px' }}
                >
                  {t('landing.terminalRev', {}, { defaultValue: 'REV 3.12 CAD' })}
                </span>
              </div>
              <div
                className={cm.flex({ align: 'center', gap: 'sm' })}
                style={{ fontSize: '11px', fontWeight: 600 }}
              >
                <span
                  className={cm.cn(cm.flex({ align: 'center' }), 'gap-1 text-tertiary font-bold')}
                >
                  <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                    check_circle
                  </span>
                  {t('landing.terminalClockedIn', {}, { defaultValue: '42 TRADES CLOCKED IN' })}
                </span>
                <span className="text-on-surface-variant hidden md:inline">
                  {t('landing.terminalSync', {}, { defaultValue: 'SYNC: 100% REAL-TIME' })}
                </span>
              </div>
            </div>

            {/* Split workspace */}
            <div className={cm.cn(cm.grid({ cols: 1, gap: 0 }), 'lg:grid-cols-12 min-h-[460px]')}>
              {/* Drawing canvas */}
              <div
                className={cm.cn(
                  cm.sp('p', 4),
                  'lg:col-span-8 bg-surface-container-low relative flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-outline-variant',
                )}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    opacity: 0.2,
                    backgroundImage:
                      'radial-gradient(color-mix(in srgb, var(--color-outline) 60%, transparent) 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                  }}
                />
                {/* CAD toolbar */}
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    'relative z-10 bg-surface-container-lowest/90 border border-outline-variant p-2 rounded-lg shadow-sm',
                  )}
                  style={{ fontSize: '11px', fontWeight: 600 }}
                >
                  <div className={cm.cn('flex items-center gap-2')}>
                    <span className="px-2 py-1 bg-surface-container rounded text-on-surface font-bold">
                      {t('landing.sheetChip', {}, { defaultValue: 'SHEET A-402' })}
                    </span>
                    <span className="text-on-surface-variant hidden sm:inline">
                      {t('landing.sheetName', {}, { defaultValue: 'FOUNDATION ANCHOR DETAILS' })}
                    </span>
                  </div>
                  <div className={cm.cn('flex items-center gap-1')} aria-hidden="true">
                    <span className="p-1 rounded text-on-surface">
                      <span className="material-symbols-outlined text-base">pan_tool</span>
                    </span>
                    <span className="p-1 rounded text-on-surface">
                      <span className="material-symbols-outlined text-base">straighten</span>
                    </span>
                    <span className="p-1 bg-primary text-on-primary rounded">
                      <span className="material-symbols-outlined text-base">push_pin</span>
                    </span>
                    <span className="p-1 rounded text-on-surface">
                      <span className="material-symbols-outlined text-base">layers</span>
                    </span>
                  </div>
                </div>
                {/* Canvas + annotation pins */}
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'relative my-8 h-64 border border-dashed border-outline rounded bg-surface-container-lowest/60',
                  )}
                >
                  <div className={cm.cn(cm.textCenter, 'text-on-surface-variant')}>
                    <span
                      className={cm.cn('material-symbols-outlined text-4xl text-outline mb-1')}
                      aria-hidden="true"
                    >
                      architecture
                    </span>
                    <p style={{ fontSize: '11px', fontWeight: 600 }}>
                      {t(
                        'landing.canvasEngine',
                        {},
                        { defaultValue: 'VECTOR SHEET RENDERING ENGINE • ZERO LATENCY' },
                      )}
                    </p>
                    <p className="text-outline" style={{ fontSize: '10px' }}>
                      {t(
                        'landing.canvasAxis',
                        {},
                        { defaultValue: 'GRID AXIS: B-14 / WALL ELEVATION 104\'-6"' },
                      )}
                    </p>
                  </div>
                  {/* Annotation pin 1 */}
                  <div className={cm.cn('absolute top-12 left-1/4 flex items-center gap-2 group')}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'w-7 h-7 rounded-full bg-primary text-on-primary shadow-md border-2 border-surface font-bold',
                      )}
                      style={{ fontSize: '12px' }}
                    >
                      14
                    </span>
                    <span
                      className={cm.cn(
                        'hidden group-hover:flex flex-col bg-surface-container-lowest border border-outline-variant p-2 rounded shadow-lg',
                      )}
                      style={{ fontSize: '11px' }}
                    >
                      <span className="text-primary font-bold">
                        {t('landing.pin1Label', {}, { defaultValue: 'RFI #142 LINKED' })}
                      </span>
                      <span className="text-on-surface">
                        {t('landing.pin1Body', {}, { defaultValue: 'Shear Wall Rebar Offset' })}
                      </span>
                    </span>
                  </div>
                  {/* Annotation pin 2 */}
                  <div className={cm.cn('absolute bottom-10 right-1/3 flex items-center gap-2')}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'w-7 h-7 rounded-full bg-tertiary text-on-tertiary shadow-md border-2 border-surface',
                      )}
                      aria-hidden="true"
                    >
                      <span className={cm.cn('material-symbols-outlined text-sm')}>check</span>
                    </span>
                    <span
                      className={cm.cn(
                        'bg-surface-container-lowest/90 px-1.5 py-0.5 rounded border border-outline-variant font-semibold',
                      )}
                      style={{ fontSize: '10px' }}
                    >
                      {t('landing.pin2Chip', {}, { defaultValue: 'POUR CLEARED' })}
                    </span>
                  </div>
                </div>
                {/* Canvas status footer */}
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    'relative z-10 text-on-surface-variant bg-surface-container-lowest/80 px-3 py-1.5 rounded border border-outline-variant',
                  )}
                  style={{ fontSize: '11px', fontWeight: 600 }}
                >
                  <span>
                    {t('landing.canvasScale', {}, { defaultValue: 'SCALE: 1/4" = 1\'-0"' })}
                  </span>
                  <span className="text-tertiary font-bold">
                    {t(
                      'landing.canvasSynced',
                      {},
                      { defaultValue: '● CLOUD SYNCED (LOCAL CACHE VERIFIED)' },
                    )}
                  </span>
                </div>
              </div>

              {/* Live field streams */}
              <div
                className={cm.cn(
                  cm.sp('p', 4),
                  'lg:col-span-4 flex flex-col justify-between bg-surface-container-lowest',
                )}
              >
                <div>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      'pb-3 mb-3 border-b border-outline-variant',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-on-surface',
                      )}
                    >
                      {t('landing.streamsTitle', {}, { defaultValue: 'ACTIVE FIELD STREAMS' })}
                    </span>
                    <span className="text-primary font-bold" style={{ fontSize: '11px' }}>
                      {t('landing.streamsLive', {}, { defaultValue: 'LIVE FEED' })}
                    </span>
                  </div>
                  {streams.map((s) => (
                    <div
                      key={s.label}
                      data-mol-id="landing-stream-card"
                      className={cm.cn(
                        'mb-3 p-3 bg-surface-container rounded border border-outline-variant border-l-4 last:mb-0',
                        s.tone,
                      )}
                    >
                      <div
                        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'mb-1')}
                        style={{ fontSize: '11px', fontWeight: 600 }}
                      >
                        <span className="text-secondary font-bold">{s.label}</span>
                        <span className="text-on-surface-variant">{s.when}</span>
                      </div>
                      <div
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'text-on-surface mb-1',
                        )}
                      >
                        {s.title}
                      </div>
                      <div className="text-on-surface-variant" style={{ fontSize: '11px' }}>
                        {s.body}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Quick action tray */}
                <div className={cm.cn('pt-4 mt-4 border-t border-outline-variant flex gap-2')}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                      'flex-1 py-2 bg-surface-container-high text-on-surface rounded border border-outline-variant font-semibold',
                    )}
                    style={{ fontSize: '11px' }}
                  >
                    <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                      mic
                    </span>
                    {t('landing.actionAudioLog', {}, { defaultValue: 'Audio Log' })}
                  </span>
                  <Link
                    to="/login"
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                      'flex-1 py-2 bg-primary text-on-primary rounded font-semibold shadow-sm',
                    )}
                    style={{ fontSize: '11px' }}
                  >
                    <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                      add
                    </span>
                    {t('landing.actionCreateRfi', {}, { defaultValue: 'Create RFI' })}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Social proof: ENR contractors */}
          <div className={cm.cn('mt-16 pt-10 border-t border-outline-variant text-center')}>
            <p
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-on-surface-variant uppercase tracking-wider mb-6',
              )}
              style={{ fontSize: '11px' }}
            >
              {t(
                'landing.socialProof',
                {},
                {
                  defaultValue: 'TRUSTED ON 12,000+ ACTIVE JOBSITES BY LEADING ENR 400 CONTRACTORS',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center' }),
                'flex-wrap items-center justify-center gap-8 md:gap-16 opacity-75 grayscale',
              )}
            >
              {[
                { glyph: 'domain', name: 'APEX COMMERCIAL', tone: 'text-primary' },
                { glyph: 'foundation', name: 'TURNER-VANCE', tone: 'text-secondary' },
                { glyph: 'apartment', name: 'SKYLINE BUILDERS', tone: 'text-primary' },
                {
                  glyph: 'precision_manufacturing',
                  name: 'BUILDCORE GROUP',
                  tone: 'text-tertiary',
                },
              ].map((logo) => (
                <span
                  key={logo.name}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.fontWeight('bold'),
                    cm.textSize('lg'),
                    'text-on-surface tracking-tight',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined', logo.tone)}
                    aria-hidden="true"
                  >
                    {logo.glyph}
                  </span>
                  {logo.name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Module pillars */}
        <section
          className={cm.cn(
            cm.sp('py', 20),
            '-mx-4 md:-mx-8 bg-surface-container-low border-y border-outline-variant',
          )}
          id="features"
        >
          <div className={cm.cn('max-w-7xl mx-auto px-4 md:px-8')}>
            <div className={cm.cn('max-w-3xl mb-12')}>
              <span
                className={cm.cn(cm.fontWeight('bold'), 'text-primary uppercase tracking-wider')}
                style={{ fontSize: '11px' }}
              >
                {t('landing.pillarsEyebrow', {}, { defaultValue: 'BUILT FOR RUGGEDIZED MOBILITY' })}
              </span>
              <h2
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.fontWeight('bold'),
                  'text-on-surface mt-2 mb-4 tracking-tight',
                )}
              >
                {t(
                  'landing.pillarsTitle',
                  {},
                  { defaultValue: 'Engineered for the job trailer, hardened for the mud.' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
                {t(
                  'landing.pillarsBody',
                  {},
                  {
                    defaultValue:
                      'No complex desktop bloat. Every module is stripped of friction so foremen and trade supers input clean data in under 15 seconds.',
                  },
                )}
              </p>
            </div>
            <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-3')}>
              {PILLARS.map((p) => (
                <article
                  key={p.module}
                  data-mol-id="landing-pillar"
                  className={cm.cn(
                    cm.flex({ direction: 'col', justify: 'between' }),
                    cm.sp('p', 6),
                    'bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm transition-all',
                    p.hover,
                  )}
                >
                  <div>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'w-12 h-12 rounded-lg bg-surface-container border border-outline-variant mb-6',
                        p.tone,
                      )}
                      aria-hidden="true"
                    >
                      <span className={cm.cn('material-symbols-outlined text-2xl')}>{p.icon}</span>
                    </span>
                    <div
                      className="text-on-surface-variant mb-1"
                      style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em' }}
                    >
                      {p.module}
                    </div>
                    <h3
                      className={cm.cn(
                        cm.textSize('lg'),
                        cm.fontWeight('semibold'),
                        'text-on-surface mb-3',
                      )}
                    >
                      {t(p.titleKey, {}, { defaultValue: p.titleDefault })}
                    </h3>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-on-surface-variant mb-6 leading-relaxed',
                      )}
                    >
                      {t(p.bodyKey, {}, { defaultValue: p.bodyDefault })}
                    </p>
                  </div>
                  <div className={cm.cn('border-t border-outline-variant pt-4')}>
                    <ul
                      className={cm.cn(cm.stack(2), 'text-on-surface')}
                      style={{ fontSize: '11px', fontWeight: 600 }}
                    >
                      {p.checks.map((check) => (
                        <li key={check} className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
                          <span
                            className={cm.cn('material-symbols-outlined text-sm text-tertiary')}
                            aria-hidden="true"
                          >
                            check
                          </span>
                          {check}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Quantified ROI metrics */}
        <section className={cm.cn(cm.sp('py', 16), 'bg-background')} id="metrics">
          <div className={cm.cn('max-w-7xl mx-auto')}>
            <div
              className={cm.cn(
                'bg-surface-container border border-outline-variant rounded-xl p-8 lg:p-12',
              )}
            >
              <div
                className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-4 items-center')}
              >
                <div
                  className={cm.cn(
                    'border-b lg:border-b-0 lg:border-r border-outline-variant pb-6 lg:pb-0 lg:pr-6',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-primary uppercase tracking-wider',
                    )}
                    style={{ fontSize: '11px' }}
                  >
                    {t('landing.metricsEyebrow', {}, { defaultValue: 'VERIFIED FIELD DATA' })}
                  </span>
                  <h3
                    className={cm.cn(
                      cm.textSize('xl'),
                      cm.fontWeight('semibold'),
                      'text-on-surface mt-1',
                    )}
                  >
                    {t(
                      'landing.metricsTitle',
                      {},
                      { defaultValue: 'Measured Impact on Commercial Sites' },
                    )}
                  </h3>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-2')}>
                    {t(
                      'landing.metricsBody',
                      {},
                      {
                        defaultValue:
                          'Aggregate metrics recorded across 2.4M sq.ft of cast-in-place and steel framing.',
                      },
                    )}
                  </p>
                </div>
                <div
                  className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'lg:col-span-3 sm:grid-cols-3')}
                >
                  {stats.map((s) => (
                    <div
                      key={s.value}
                      data-mol-id="landing-stat"
                      className={cm.cn(
                        cm.sp('p', 4),
                        'bg-surface-container-lowest rounded-lg border border-outline-variant',
                      )}
                    >
                      <div
                        className={cm.cn(
                          cm.textSize('4xl'),
                          cm.fontWeight('bold'),
                          'tracking-tight',
                          s.tone,
                        )}
                      >
                        {s.value}
                      </div>
                      <div
                        className={cm.cn(
                          cm.textSize('base'),
                          cm.fontWeight('semibold'),
                          'text-on-surface mt-1',
                        )}
                      >
                        {s.title}
                      </div>
                      <div className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
                        {s.body}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Superintendent testimonial */}
        <section
          className={cm.cn(
            cm.sp('py', 16),
            '-mx-4 md:-mx-8 bg-surface-container-low border-t border-outline-variant',
          )}
        >
          <div className={cm.cn('max-w-5xl mx-auto px-4 md:px-8')}>
            <div
              className={cm.cn(
                'bg-surface-container-lowest border border-outline-variant rounded-xl p-8 md:p-10 shadow-sm relative',
              )}
            >
              <span
                className={cm.cn(
                  'material-symbols-outlined text-5xl text-outline-variant absolute top-6 right-6',
                )}
                aria-hidden="true"
              >
                format_quote
              </span>
              <div className={cm.cn('max-w-3xl')}>
                <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-1 text-primary mb-4')}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={cm.cn('material-symbols-outlined text-sm')}
                      aria-hidden="true"
                    >
                      star
                    </span>
                  ))}
                  <span
                    className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface-variant ml-2')}
                    style={{ fontSize: '11px' }}
                  >
                    {t('landing.ratingLabel', {}, { defaultValue: 'JOB-TESTED RATING' })}
                  </span>
                </div>
                <blockquote
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('semibold'),
                    'text-on-surface tracking-tight leading-relaxed mb-6',
                  )}
                >
                  {t(
                    'landing.quote',
                    { appName: APP_NAME },
                    {
                      defaultValue:
                        '"Most construction software is created by people who have never worn work boots. {{appName}} is the first tool where my drywall, electrical, and concrete foremen actually picked it up without a four-hour training class in the trailer. We cut our punch turnaround time by half."',
                    },
                  )}
                </blockquote>
                <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'w-12 h-12 rounded-full bg-surface-container border border-outline-variant font-bold text-primary',
                    )}
                    aria-hidden="true"
                  >
                    MV
                  </span>
                  <div>
                    <div className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                      {t('landing.quoteName', {}, { defaultValue: 'Marcus Vance' })}
                    </div>
                    <div className="text-on-surface-variant" style={{ fontSize: '11px' }}>
                      {t(
                        'landing.quoteRole',
                        {},
                        { defaultValue: 'Senior General Superintendent — Apex Built' },
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom conversion CTA */}
        <section className={cm.cn(cm.sp('py', 20), 'bg-background')} id="demo">
          <div className={cm.cn('max-w-7xl mx-auto')}>
            <div
              className={cm.cn(
                'bg-surface-container-high border border-outline-variant rounded-2xl p-8 lg:p-16 text-center max-w-4xl mx-auto shadow-sm',
              )}
            >
              <span
                className={cm.cn(cm.fontWeight('bold'), 'text-primary uppercase tracking-widest')}
                style={{ fontSize: '11px' }}
              >
                {t('landing.ctaEyebrow', {}, { defaultValue: 'DEPLOY IN UNDER 20 MINUTES' })}
              </span>
              <h2
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.fontWeight('bold'),
                  'text-on-surface mt-2 mb-4 tracking-tight',
                )}
              >
                {t('landing.ctaTitle', {}, { defaultValue: 'Ready to modernize your jobsites?' })}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  'text-on-surface-variant max-w-xl mx-auto mb-8',
                )}
              >
                {t(
                  'landing.ctaBody',
                  {},
                  {
                    defaultValue:
                      'Upload your existing PDF drawing sets, invite your trade partners, and start managing daily logs immediately.',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col' }),
                  'sm:flex-row gap-3 max-w-md mx-auto mb-8',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex1,
                    'bg-surface-container-lowest border border-outline px-4 py-3 rounded-lg text-on-surface-variant text-left',
                  )}
                >
                  {t(
                    'landing.ctaEmailPlaceholder',
                    {},
                    { defaultValue: 'Enter your jobsite or company email...' },
                  )}
                </span>
                <Link
                  to="/signup"
                  data-mol-id="landing-cta-signup"
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'bg-primary text-on-primary px-6 py-3 rounded-lg font-bold shadow-sm whitespace-nowrap hover:opacity-90 transition-all active:scale-[0.98]',
                  )}
                >
                  {t('landing.ctaButton', {}, { defaultValue: 'Get Started Free' })}
                </Link>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'flex-wrap gap-6 text-on-surface-variant font-semibold',
                )}
                style={{ fontSize: '11px' }}
              >
                {[
                  t('landing.trust1', {}, { defaultValue: 'No credit card required' }),
                  t('landing.trust2', {}, { defaultValue: 'Instant mobile setup & PDF import' }),
                  t('landing.trust3', {}, { defaultValue: 'Dedicated onboarding engineer' }),
                ].map((line) => (
                  <span key={line} className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
                    <span
                      className={cm.cn('material-symbols-outlined text-base text-tertiary')}
                      aria-hidden="true"
                    >
                      check_circle
                    </span>
                    {line}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Industrial footer */}
      <footer
        className={cm.cn(
          'bg-surface-container-high border-t border-outline-variant w-full px-4 md:px-8 py-12',
        )}
      >
        <div
          className={cm.cn(
            cm.grid({ cols: 1, gap: 'lg' }),
            'max-w-7xl mx-auto w-full md:grid-cols-5 pb-8 border-b border-outline-variant',
          )}
        >
          <div className={cm.cn('md:col-span-2')}>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'mb-3')}>
              <span
                aria-hidden="true"
                className={cm.cn(
                  'material-symbols-outlined brand-gradient text-on-primary rounded-lg p-1.5',
                )}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                construction
              </span>
              <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-primary')}>
                {APP_NAME}
              </span>
            </div>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-sm mb-4')}>
              {t(
                'landing.footerBlurb',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Field-first construction management built for zero drawing lag, instant RFI workflows, and jobsite precision.',
                },
              )}
            </p>
            <div
              className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}
              style={{ fontSize: '11px', fontWeight: 600 }}
            >
              {['OSHA 1926', 'ISO 19650 BIM', 'SOC 2 TYPE II'].map((badge) => (
                <span
                  key={badge}
                  className="px-2 py-0.5 rounded bg-surface-container border border-outline-variant text-on-surface font-bold"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'text-on-surface mb-3 uppercase tracking-wider',
              )}
            >
              {t('landing.footerProduct', {}, { defaultValue: 'Product' })}
            </div>
            <ul className={cm.cn(cm.stack(2), cm.textSize('sm'), 'text-on-surface-variant')}>
              <li>
                <Link to="/dashboard" className="hover:text-primary transition-colors">
                  {t('landing.footerDailyLogs', {}, { defaultValue: 'Daily Field Logs' })}
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-primary transition-colors">
                  {t('landing.footerBlueprints', {}, { defaultValue: 'Blueprints & RFIs' })}
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-primary transition-colors">
                  {t('landing.footerPunch', {}, { defaultValue: 'Punch Lists' })}
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-primary transition-colors">
                  {t('landing.footerPricing', {}, { defaultValue: 'Pricing Plans' })}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'text-on-surface mb-3 uppercase tracking-wider',
              )}
            >
              {t('landing.footerCompany', {}, { defaultValue: 'Company' })}
            </div>
            <ul className={cm.cn(cm.stack(2), cm.textSize('sm'), 'text-on-surface-variant')}>
              <li>
                <Link to="/about" className="hover:text-primary transition-colors">
                  {t('landing.footerAbout', {}, { defaultValue: 'About' })}
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-primary transition-colors">
                  {t('landing.getStarted', {}, { defaultValue: 'Get started free' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="hover:text-primary transition-colors font-semibold text-primary"
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign In' })}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'text-on-surface mb-3 uppercase tracking-wider',
              )}
            >
              {t('landing.footerLegal', {}, { defaultValue: 'Legal & Standards' })}
            </div>
            <ul className={cm.cn(cm.stack(2), cm.textSize('sm'), 'text-on-surface-variant')}>
              <li>
                <Link to="/privacy" className="hover:text-primary transition-colors">
                  {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-primary transition-colors">
                  {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            'max-w-7xl mx-auto w-full flex-col sm:flex-row gap-4 text-on-surface-variant pt-6',
          )}
          style={{ fontSize: '13px' }}
        >
          <div>
            {t(
              'footer.copyright',
              { year: new Date().getFullYear(), appName: APP_NAME },
              {
                defaultValue:
                  '© {{year}} {{appName}} Technologies Inc. Built for jobsite precision.',
              },
            )}
          </div>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
            <span>
              {t('landing.footerStatus', {}, { defaultValue: 'STATUS: ALL CLOUD SYSTEMS NORMAL' })}
            </span>
            <span className="text-outline" aria-hidden="true">
              •
            </span>
            <span>{t('landing.footerLatency', {}, { defaultValue: 'LATENCY: 18ms' })}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
