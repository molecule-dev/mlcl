import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

const FEATURES = [
  {
    key: 'roster',
    icon: 'calendar_month',
    defaultTitle: 'Weekly rosters',
    defaultBody:
      'A staff-by-day grid for the whole week — shift blocks with role and time range, week navigation, and one-click publish when the schedule is ready.',
  },
  {
    key: 'swaps',
    icon: 'swap_horiz',
    defaultTitle: 'Swap & drop approvals',
    defaultBody:
      'Someone offers a shift to a teammate or asks to drop it. You approve in a click and the assignment moves atomically — the server refuses double-booking outright.',
  },
  {
    key: 'open',
    icon: 'bolt',
    defaultTitle: 'Open-shift claiming',
    defaultBody:
      'Unassigned published shifts become a marketplace your team can claim. Approve the first qualified claim; the rest are declined automatically.',
  },
  {
    key: 'availability',
    icon: 'event_available',
    defaultTitle: 'Availability that warns, not blocks',
    defaultBody:
      'Recurring weekly windows plus black-out dates per person. Scheduling outside them is allowed but flagged, so surprises surface before publish — not on the floor.',
  },
] as const

// Mirrors the live tier ladder in api/src/tiers.ts (names, prices, limits).
const PRICING = [
  {
    key: 'free',
    title: 'Free',
    price: '$0',
    blurb: 'For a first crew finding its rhythm.',
    bullets: [
      '15 staff on the roster',
      '60 shifts per week',
      '90-day data retention',
      'Rosters, swaps, open shifts',
    ],
    cta: 'Start free',
  },
  {
    key: 'pro',
    title: 'Pro',
    price: '$19',
    period: '/mo · $190/yr',
    blurb: 'For busy locations that live and die by coverage.',
    bullets: [
      'Up to 200 staff & 750 weekly shifts',
      'Advanced features — timesheet exports',
      'Data export (CSV)',
      '1-year data retention',
    ],
    cta: 'Upgrade to Pro',
    featured: true,
  },
  {
    key: 'team',
    title: 'Team',
    price: '$59',
    period: '/mo · $590/yr',
    blurb: 'For multi-site operators who never want a limit.',
    bullets: [
      'Everything in Pro',
      'Unlimited staff & weekly shifts',
      'Unlimited data retention',
      'Data export (CSV)',
    ],
    cta: 'Go Team',
  },
] as const

/* Floor-operations bento (design: "Engineered to eradicate scheduling
   headaches") — the four operational cards under the how-it-works grid. */
const FLOOR_FEATURES: {
  key: string
  icon: string
  tone: 'primary' | 'tertiary'
  defaultTitle: string
  defaultBody: string
  defaultStat?: string
}[] = [
  {
    key: 'autoSchedule',
    icon: 'auto_awesome',
    tone: 'primary',
    defaultTitle: '1-Click Auto-Scheduling',
    defaultBody:
      'Generate a compliant week from availability, roles, and max-hour caps in one pass — then adjust the edges by hand.',
  },
  {
    key: 'absenceAlerts',
    icon: 'notifications_active',
    tone: 'primary',
    defaultTitle: 'Real-Time Absence Alerts',
    defaultBody:
      'A call-out pings every qualified, available teammate at once — the first claim fills the floor before the rush.',
    defaultStat: 'Under 3 min fill rate',
  },
  {
    key: 'mobileCrew',
    icon: 'smartphone',
    tone: 'primary',
    defaultTitle: 'Mobile Crew App',
    defaultBody:
      'Swaps, drops, claims, and the published roster in every pocket — with push notifications for changes.',
    defaultStat: '92% crew adoption',
  },
  {
    key: 'geofence',
    icon: 'pin_drop',
    tone: 'tertiary',
    defaultTitle: 'Geofenced GPS Timeclock',
    defaultBody:
      'Eliminate buddy punching. Staff can only clock in while physically inside the store geofence, or sync with a standard tablet kiosk.',
    defaultStat: 'Accurate to 15 meters',
  },
]

/* Schedule-grid preview — the design's signature product shot. A static
   two-staff week rendered as decorative art (aria-hidden); chips use the
   primary tint/border/text trio from the design system. */
const GRID_DAYS = ['Mon 21', 'Tue 22', 'Wed 23', 'Thu 24', 'Fri 25', 'Sat 26', 'Sun 27'] as const

const GRID_STAFF = [
  {
    key: 'maya',
    defaultName: 'Maya Rodriguez',
    defaultRole: 'Shift Lead',
    initials: 'MR',
    total: '40.0h',
    days: [
      { kind: 'shift', time: '06:00–14:30', sub: 'Open • 8.5h' },
      { kind: 'shift', time: '06:00–14:30', sub: 'Open • 8.5h' },
      { kind: 'shift', time: '06:00–14:30', sub: 'Open • 8.5h' },
      { kind: 'off' },
      { kind: 'shift', time: '06:00–14:30', sub: 'Open • 8.5h' },
      { kind: 'shift', time: '07:00–13:00', sub: 'Lead • 6.0h' },
      { kind: 'off' },
    ],
  },
  {
    key: 'alex',
    defaultName: 'Alex Morales',
    defaultRole: 'Senior Barista',
    initials: 'AM',
    total: '38.5h',
    days: [
      { kind: 'off' },
      { kind: 'shift', time: '14:00–21:00', sub: 'Close • 7.0h' },
      { kind: 'shift', time: '14:00–21:00', sub: 'Close • 7.0h' },
      { kind: 'shift', time: '14:00–21:00', sub: 'Close • 7.0h' },
      { kind: 'shift', time: '14:00–21:00', sub: 'Close • 7.0h' },
      { kind: 'shift', time: '09:00–16:30', sub: 'Mid • 7.5h' },
      { kind: 'shift', time: '09:00–14:00', sub: 'AM • 5.0h' },
    ],
  },
] as const

const SOCIAL_PROOF = [
  { defaultLabel: 'Cedar & Bean Coffee · 4 locations', key: 'cedar' },
  { defaultLabel: 'Harborside Kitchen', key: 'harborside' },
  { defaultLabel: 'Northgate Books', key: 'northgate' },
  { defaultLabel: 'Riverside Cycle Co.', key: 'riverside' },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-50 border-b border-outline-variant/40 bg-surface/90 shadow-sm backdrop-blur-md',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.flex({ align: 'center', justify: 'between' }),
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <Link
              to="/"
              data-mol-id="landing-brand"
              className={cm.flex({ align: 'center', gap: 'sm' })}
            >
              <BrandWordmark as="span" size="lg" />
            </Link>
            <span
              className={cm.cn(
                cm.sp('px', 2),
                'hidden items-center gap-1 rounded-full border border-outline-variant/60 bg-surface-container-high px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant sm:inline-flex',
              )}
            >
              <span className={cm.cn('h-1.5 w-1.5 rounded-full bg-tertiary')} aria-hidden="true" />
              {t('landing.workforceOsBadge', {}, { defaultValue: 'Workforce OS' })}
            </span>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'inline-flex items-center rounded-lg text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link
              to="/about"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'hidden sm:inline text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="nav-go-to-dashboard"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2.5),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  cm.flex({ align: 'center', gap: 1 }),
                  'rounded-xl bg-primary text-on-primary shadow-sm shadow-primary/25 hover:bg-primary-dark transition-colors',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'text-on-surface-variant hover:text-primary transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="landing-nav-cta"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2.5),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    cm.flex({ align: 'center', gap: 1 }),
                    'rounded-xl bg-primary text-on-primary shadow-sm shadow-primary/25 hover:bg-primary-dark transition-colors',
                  )}
                >
                  {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
                  <span
                    className={cm.cn('material-symbols-outlined text-[16px]')}
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
        {/* Hero — centered like the design: live badge, headline with primary
            accent line, CTA pair, microcopy, and the trusted-by strip */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute inset-0 bg-[radial-gradient(circle_at_top,var(--color-surface-container-low)_0%,transparent_60%)]',
            )}
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              cm.sp('pt', 12),
              cm.sp('pb', 16),
              'relative lg:pt-20 lg:pb-24',
            )}
          >
            <div className={cm.cn(cm.maxW('3xl'), cm.mxAuto, cm.textCenter)}>
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1.5),
                  'mb-6 inline-flex items-center gap-2 rounded-full border border-outline-variant/60 bg-surface-container-high text-[11px] font-semibold text-on-surface-variant shadow-sm',
                )}
              >
                <span className={cm.cn('relative flex h-2 w-2')} aria-hidden="true">
                  <span
                    className={cm.cn(
                      'absolute inline-flex h-full w-full animate-ping rounded-full bg-tertiary opacity-75',
                    )}
                  />
                  <span
                    className={cm.cn('relative inline-flex h-2 w-2 rounded-full bg-tertiary')}
                  />
                </span>
                {t('landing.eyebrow', {}, { defaultValue: 'Scheduling — without the group chat' })}
              </span>
              <h1
                className={cm.cn(
                  'text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-on-surface font-display',
                )}
              >
                {t('landing.heroTitle', {}, { defaultValue: 'Smarter shift scheduling.' })}{' '}
                <span className={cm.cn('text-primary')}>
                  {t('landing.heroAccent', {}, { defaultValue: 'Zero chaos on the floor.' })}
                </span>
              </h1>
              <p
                className={cm.cn(
                  cm.sp('mt', 5),
                  cm.textSize('lg'),
                  cm.maxW('2xl'),
                  cm.mxAuto,
                  'leading-relaxed text-on-surface-variant',
                )}
              >
                {t(
                  'landing.heroSubtitle',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      '{{appName}} is a shift-scheduling workspace for hourly teams. Build the week on a roster grid, publish it, and let swaps, drops, and open-shift claims flow through approvals — not through eleven text messages.',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.sp('mt', 8),
                  cm.flex({ align: 'center', gap: 'md', justify: 'center', wrap: 'wrap' }),
                )}
              >
                <Link
                  to="/signup"
                  data-mol-id="landing-hero-cta"
                  className={cm.cn(
                    'px-7',
                    'py-3.5',
                    cm.fontWeight('semibold'),
                    cm.flex({ align: 'center', gap: 2, justify: 'center' }),
                    'rounded-xl bg-primary text-on-primary shadow-md shadow-primary/25 hover:bg-primary-dark transition-colors active:scale-[0.98]',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[18px]')}
                    aria-hidden="true"
                  >
                    bolt
                  </span>
                  {t('landing.heroCta', {}, { defaultValue: 'Start free for 30 days' })}
                </Link>
                <Link
                  to="/dashboard"
                  className={cm.cn(
                    cm.sp('px', 6),
                    'py-3.5',
                    cm.fontWeight('semibold'),
                    cm.flex({ align: 'center', gap: 2, justify: 'center' }),
                    'rounded-xl border border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low transition-colors active:scale-[0.98]',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[20px] text-primary')}
                    aria-hidden="true"
                  >
                    play_circle
                  </span>
                  {t('landing.heroSecondary', {}, { defaultValue: 'See live demo' })}
                </Link>
              </div>
              <p
                className={cm.cn(
                  cm.sp('mt', 3),
                  cm.textSize('xs'),
                  'font-medium text-on-surface-variant',
                )}
              >
                {t(
                  'landing.heroProof',
                  {},
                  { defaultValue: 'No credit card. Cancel anytime. CSV payroll export on Pro.' },
                )}
              </p>

              {/* Trusted-by strip */}
              <div
                className={cm.cn(
                  cm.sp('mt', 12),
                  cm.sp('pt', 8),
                  'border-t border-outline-variant/30',
                )}
              >
                <p
                  className={cm.cn(
                    cm.sp('mb', 5),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-wider text-on-surface-variant',
                  )}
                >
                  {t('landing.socialEyebrow', {}, { defaultValue: 'Keeping teams on shift at' })}
                </p>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center', gap: 'lg', wrap: 'wrap' }),
                    'opacity-75 grayscale',
                  )}
                >
                  {SOCIAL_PROOF.map((s) => (
                    <span
                      key={s.key}
                      className={cm.cn(
                        cm.textSize('sm'),
                        'font-bold tracking-tight text-on-surface',
                      )}
                    >
                      {t(`landing.social.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Signature schedule-grid preview */}
            <div className={cm.cn('relative mx-auto mt-14 max-w-6xl')} id="grid-preview">
              <div
                className={cm.cn(
                  'absolute -top-4 left-4 z-20 hidden items-center gap-2 rounded-xl border border-outline-variant bg-surface/95 px-4 py-2.5 shadow-lg backdrop-blur-md md:flex',
                )}
                aria-hidden="true"
              >
                <span className="text-[18px]">⚡</span>
                <div>
                  <p className={cm.cn('text-[11px] font-semibold text-on-surface')}>
                    {t('landing.gridBadgeFast', {}, { defaultValue: 'Schedule created in 4 mins' })}
                  </p>
                  <p className={cm.cn('text-[10px] tabular-nums text-on-surface-variant')}>
                    {t('landing.gridBadgeFastSub', {}, { defaultValue: 'Saved 3.8 hrs this week' })}
                  </p>
                </div>
              </div>
              <div
                className={cm.cn(
                  'absolute -bottom-4 right-6 z-20 hidden items-center gap-2.5 rounded-xl border border-outline-variant bg-surface/95 px-4 py-2.5 shadow-lg backdrop-blur-md md:flex',
                )}
                aria-hidden="true"
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-7 w-7 rounded-lg bg-tertiary/10 text-tertiary',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-[18px]')}>shield</span>
                </span>
                <div>
                  <p className={cm.cn('text-[11px] font-semibold text-on-surface')}>
                    {t('landing.gridBadgeOvertime', {}, { defaultValue: 'Overtime risk averted' })}
                  </p>
                  <p className={cm.cn('text-[10px] font-semibold tabular-nums text-tertiary')}>
                    {t(
                      'landing.gridBadgeOvertimeSub',
                      {},
                      { defaultValue: '-$380.00 / projected leak' },
                    )}
                  </p>
                </div>
              </div>

              <div
                className={cm.cn(
                  'overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xl',
                )}
                aria-hidden="true"
              >
                {/* Mock controls bar */}
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' }),
                    cm.sp('px', 5),
                    'py-3.5',
                    'gap-4 border-b border-outline-variant bg-surface-container-low',
                  )}
                >
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <div className="flex items-center rounded-lg border border-outline-variant bg-surface-container-lowest p-0.5">
                      <span
                        className={cm.cn(cm.sp('px', 2), cm.sp('py', 1), 'text-on-surface-variant')}
                      >
                        <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                          chevron_left
                        </span>
                      </span>
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          'text-xs font-medium tabular-nums text-on-surface',
                        )}
                      >
                        {t('landing.gridWeek', {}, { defaultValue: 'Oct 21 – Oct 27, 2025' })}
                      </span>
                      <span
                        className={cm.cn(cm.sp('px', 2), cm.sp('py', 1), 'text-on-surface-variant')}
                      >
                        <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                          chevron_right
                        </span>
                      </span>
                    </div>
                    <span
                      className={cm.cn(
                        'inline-flex items-center gap-1.5 rounded-full bg-secondary-fixed px-2.5 py-1 text-[11px] font-semibold text-on-secondary-container',
                      )}
                    >
                      <span
                        className={cm.cn('h-1.5 w-1.5 rounded-full bg-secondary')}
                        aria-hidden="true"
                      />
                      {t(
                        'landing.gridLocation',
                        {},
                        { defaultValue: 'Location: Downtown Roastery #04' },
                      )}
                    </span>
                  </div>
                  <div className={cm.flex({ align: 'center', gap: 2 })}>
                    <span
                      className={cm.cn(
                        cm.sp('mr', 2),
                        'hidden text-xs tabular-nums text-on-surface-variant lg:inline',
                      )}
                    >
                      {t(
                        'landing.gridForecast',
                        {},
                        { defaultValue: 'Labor Forecast: 158.5 hrs / $3,487' },
                      )}
                    </span>
                    <span className="flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs text-on-surface">
                      <span className={cm.cn('material-symbols-outlined text-[16px]')}>
                        auto_awesome
                      </span>
                      {t('landing.gridAutoFill', {}, { defaultValue: 'Auto-Fill' })}
                    </span>
                    <span className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs text-on-primary">
                      <span className={cm.cn('material-symbols-outlined text-[16px]')}>send</span>
                      {t('landing.gridPublish', {}, { defaultValue: 'Publish 18 Shifts' })}
                    </span>
                  </div>
                </div>

                {/* Schedule grid */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[840px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-outline-variant/60 bg-surface-container/30 text-[11px] font-semibold text-on-surface-variant">
                        <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'w-48 text-left')}>
                          {t('landing.grid.staffColumn', {}, { defaultValue: 'Staff Member' })}
                        </th>
                        {GRID_DAYS.map((d) => (
                          <th
                            key={d}
                            className={cm.cn(cm.sp('px', 2), cm.sp('py', 3), 'text-center')}
                          >
                            {t(`landing.grid.day.${d}`, {}, { defaultValue: d })}
                          </th>
                        ))}
                        <th className={cm.cn(cm.sp('px', 3), cm.sp('py', 3), 'text-right')}>
                          {t('landing.grid.totalColumn', {}, { defaultValue: 'Total' })}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {GRID_STAFF.map((person) => (
                        <tr key={person.key}>
                          <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                            <div className={cm.flex({ align: 'center', gap: 2 })}>
                              <span
                                className={cm.cn(
                                  cm.flex({ align: 'center', justify: 'center' }),
                                  'h-8 w-8 rounded-full bg-primary/10 text-xs font-bold text-primary',
                                )}
                              >
                                {person.initials}
                              </span>
                              <div>
                                <div className={cm.cn('text-xs font-semibold text-on-surface')}>
                                  {t(
                                    `landing.grid.staff.${person.key}.name`,
                                    {},
                                    { defaultValue: person.defaultName },
                                  )}
                                </div>
                                <div className={cm.cn('text-[11px] text-on-surface-variant')}>
                                  {t(
                                    `landing.grid.staff.${person.key}.role`,
                                    {},
                                    { defaultValue: person.defaultRole },
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          {person.days.map((cell, i) => (
                            <td key={i} className="p-1.5">
                              {cell.kind === 'shift' ? (
                                <div className="rounded-lg border border-primary/20 bg-primary/10 p-1.5 text-center text-primary">
                                  <span className="block text-[11px] font-bold tabular-nums">
                                    {cell.time}
                                  </span>
                                  {/* Full text-primary #4f46e5 on the cell bg
                                      (#edecfc = primary/10 over white) = 5.39:1
                                      (was `opacity-75`: blends to #7770eb =
                                      3.39:1, axe serious). */}
                                  <span className="text-[10px]">{cell.sub}</span>
                                </div>
                              ) : (
                                <span className="block py-3 text-center text-[11px] text-on-surface-variant">
                                  {t('landing.grid.off', {}, { defaultValue: 'OFF' })}
                                </span>
                              )}
                            </td>
                          ))}
                          <td
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.sp('py', 3),
                              'text-right text-xs font-semibold tabular-nums text-on-surface',
                            )}
                          >
                            {person.total}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 16))}>
          <div className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.textCenter, cm.sp('mb', 12))}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-wider text-primary',
              )}
            >
              {t('landing.featuresEyebrow', {}, { defaultValue: 'How it works' })}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mt', 3),
                cm.textSize('3xl'),
                'font-bold tracking-tight text-on-surface font-display',
              )}
            >
              {t('landing.featuresHeading', {}, { defaultValue: 'Build. Publish. Breathe.' })}
            </h2>
            <p className={cm.cn(cm.sp('mt', 3), cm.textSize('base'), 'text-on-surface-variant')}>
              {t(
                'landing.featuresSubheading',
                {},
                {
                  defaultValue:
                    'Four surfaces that take a manager from a blank week to a published roster — and keep it standing when life happens.',
                },
              )}
            </p>
          </div>
          <div className={cm.grid({ cols: 4, gap: 'md' })}>
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'flex flex-col rounded-2xl border border-outline-variant/40 bg-surface-container-lowest hover:shadow-md transition-shadow',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-12 w-12 rounded-xl bg-primary/10 text-primary',
                  )}
                  aria-hidden="true"
                >
                  <span className={cm.cn('material-symbols-outlined text-[26px]')}>{f.icon}</span>
                </span>
                <h3
                  className={cm.cn(
                    cm.sp('mt', 5),
                    cm.sp('mb', 2),
                    cm.textSize('lg'),
                    'font-bold tracking-tight text-on-surface font-display',
                  )}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface-variant')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Floor-operations bento (design: "Engineered to eradicate scheduling headaches") */}
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 16),
            'border-t border-outline-variant/40 bg-surface-container-lowest/60',
          )}
        >
          <div className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.textCenter, cm.sp('mb', 12))}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-wider text-primary',
              )}
            >
              {t(
                'landing.floorEyebrow',
                {},
                { defaultValue: 'Built for store managers & floor crews' },
              )}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mt', 3),
                cm.textSize('3xl'),
                'font-bold tracking-tight text-on-surface font-display',
              )}
            >
              {t(
                'landing.floorHeading',
                {},
                { defaultValue: 'Engineered to eradicate scheduling headaches' },
              )}
            </h2>
            <p className={cm.cn(cm.sp('mt', 3), cm.textSize('base'), 'text-on-surface-variant')}>
              {t(
                'landing.floorSubheading',
                {},
                {
                  defaultValue:
                    'Spreadsheets break the moment a shift changes in real time. Rosters, availability, and compliance live in one calm, automated system.',
                },
              )}
            </p>
          </div>
          <div className={cm.grid({ cols: 4, gap: 'md' })}>
            {FLOOR_FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'flex flex-col justify-between rounded-2xl border border-outline-variant/40 bg-surface-container-lowest hover:shadow-md transition-shadow',
                )}
              >
                <div>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-12 w-12 rounded-xl',
                      f.tone === 'tertiary'
                        ? 'bg-secondary-container/40 text-secondary-dark'
                        : 'bg-primary/10 text-primary',
                    )}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined text-[26px]')}>{f.icon}</span>
                  </span>
                  <h3
                    className={cm.cn(
                      cm.sp('mt', 5),
                      cm.sp('mb', 2),
                      cm.textSize('lg'),
                      'font-bold tracking-tight text-on-surface font-display',
                    )}
                  >
                    {t(`landing.floorFeature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface-variant')}
                  >
                    {t(`landing.floorFeature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                  </p>
                </div>
                {f.defaultStat ? (
                  <div
                    className={cm.cn(
                      cm.sp('mt', 6),
                      cm.sp('pt', 4),
                      cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'border-t border-outline-variant/40 text-primary-dark',
                    )}
                  >
                    <span>
                      {t(
                        `landing.floorFeature.${f.key}.stat`,
                        {},
                        { defaultValue: f.defaultStat ?? '' },
                      )}
                    </span>
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('pb', 20))}>
          <div className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.textCenter, cm.sp('mb', 12))}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-wider text-primary',
              )}
            >
              {t('landing.pricingEyebrow', {}, { defaultValue: 'Pricing' })}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mt', 3),
                cm.textSize('3xl'),
                'font-bold tracking-tight text-on-surface font-display',
              )}
            >
              {t('landing.pricingHeading', {}, { defaultValue: 'Plans for every crew size.' })}
            </h2>
          </div>
          <div className={cm.grid({ cols: 3, gap: 'md' })}>
            {PRICING.map((p) => {
              const featured = 'featured' in p && p.featured
              return (
                <div
                  key={p.key}
                  className={cm.cn(
                    cm.sp('p', 6),
                    'rounded-2xl border transition-all',
                    featured
                      ? 'border-primary bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md shadow-primary/25'
                      : 'border-outline-variant/40 bg-surface-container-lowest hover:shadow-md',
                  )}
                >
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-wider',
                      featured ? 'text-on-primary/80' : 'text-on-surface-variant',
                    )}
                  >
                    {t(`landing.plan.${p.key}.label`, {}, { defaultValue: p.title })}
                  </p>
                  <p className={cm.cn(cm.sp('mt', 3), cm.flex({ align: 'baseline', gap: 'sm' }))}>
                    <span
                      className={cm.cn(
                        cm.textSize('4xl'),
                        'font-bold tracking-tight tabular-nums',
                        featured ? 'text-on-primary' : 'text-on-surface',
                      )}
                    >
                      {p.price}
                    </span>
                    {'period' in p && p.period ? (
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          featured ? 'text-on-primary/80' : 'text-on-surface-variant',
                        )}
                      >
                        {p.period}
                      </span>
                    ) : null}
                  </p>
                  <p
                    className={cm.cn(
                      cm.sp('mt', 2),
                      cm.textSize('sm'),
                      featured ? 'text-on-primary/80' : 'text-on-surface-variant',
                    )}
                  >
                    {t(`landing.plan.${p.key}.blurb`, {}, { defaultValue: p.blurb })}
                  </p>
                  <ul className={cm.cn(cm.sp('mt', 6), cm.stack(3))}>
                    {p.bullets.map((b, i) => (
                      <li
                        key={i}
                        className={cm.cn(
                          cm.flex({ align: 'start', gap: 'sm' }),
                          cm.textSize('sm'),
                          featured ? 'text-on-primary' : 'text-on-surface',
                        )}
                      >
                        <span
                          className={cm.cn(
                            'material-symbols-outlined mt-0.5 text-[18px]',
                            featured ? 'text-on-primary/80' : 'text-primary',
                          )}
                          aria-hidden="true"
                        >
                          check_circle
                        </span>
                        <span>
                          {t(`landing.plan.${p.key}.bullet${i}`, {}, { defaultValue: b })}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.sp('mt', 8),
                      cm.sp('py', 3),
                      cm.sp('px', 4),
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      cm.textCenter,
                      'block rounded-xl transition-colors',
                      featured
                        ? 'bg-surface text-primary hover:bg-surface-container-low'
                        : 'bg-primary/10 text-primary hover:bg-primary/15',
                    )}
                  >
                    {t(`landing.plan.${p.key}.cta`, {}, { defaultValue: p.cta })}
                  </Link>
                </div>
              )
            })}
          </div>
        </section>
      </main>

      {/* Footer — the design's multi-column band with a live status line */}
      <footer className="border-t border-outline-variant/50 bg-surface-container-lowest pt-16 pb-12">
        <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6))}>
          <div className={cm.cn('grid grid-cols-2 gap-8 md:grid-cols-5', cm.sp('mb', 12))}>
            <div className="col-span-2">
              {/* footer lockup: shared BrandWordmark (footer variant keeps the
                  per-page brand-wordmark e2e contract header-scoped) */}
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <BrandWordmark as="span" size="md" footer />
              </div>
              <p
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.textSize('sm'),
                  cm.maxW('sm'),
                  'text-on-surface-variant',
                )}
              >
                {t(
                  'landing.footerBlurb',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'The weekly roster workspace for hourly teams — build, publish, and let swaps and open shifts flow through approvals.',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.sp('mt', 6),
                  cm.flex({ align: 'center', gap: 2 }),
                  'text-xs font-semibold text-tertiary',
                )}
              >
                <span className={cm.cn('h-2 w-2 rounded-full bg-tertiary')} aria-hidden="true" />
                {t('landing.footerStatus', {}, { defaultValue: 'All systems operational' })}
              </div>
            </div>
            <div>
              <h4
                className={cm.cn(
                  cm.sp('mb', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-on-surface',
                )}
              >
                {t('landing.footer.product', {}, { defaultValue: 'Product' })}
              </h4>
              <ul className={cm.cn(cm.stack(2), cm.textSize('sm'))}>
                <li>
                  <a
                    href="#grid-preview"
                    className="text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {t('landing.footer.shiftBuilder', {}, { defaultValue: 'Schedule grid' })}
                  </a>
                </li>
                <li>
                  <a
                    href="#features"
                    className="text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {t('landing.footer.howItWorks', {}, { defaultValue: 'How it works' })}
                  </a>
                </li>
                <li>
                  <Link
                    to="/pricing"
                    className="text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4
                className={cm.cn(
                  cm.sp('mb', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-on-surface',
                )}
              >
                {t('landing.footer.company', {}, { defaultValue: 'Company' })}
              </h4>
              <ul className={cm.cn(cm.stack(2), cm.textSize('sm'))}>
                <li>
                  <Link
                    to="/about"
                    className="text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {t('nav.about', {}, { defaultValue: 'About' })}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {t('nav.terms', {}, { defaultValue: 'Terms' })}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/privacy"
                    className="text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div
            className={cm.cn(
              cm.sp('pt', 8),
              cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
              'border-t border-outline-variant/30 text-xs text-on-surface-variant',
            )}
          >
            <p>
              {t(
                'landing.copyright',
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
            <p className={cm.sp('mt', 2) + ' sm:mt-0'}>
              {t(
                'landing.footerCredits',
                { appName: APP_NAME },
                { defaultValue: 'Engineered with precision for frontline workers.' },
              )}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
