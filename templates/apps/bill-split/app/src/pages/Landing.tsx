import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

/* Stitch's four value cards — titles match the design verbatim. The mini
 * visuals below are keyed by index and pair 1:1 with these cards. */
const FEATURES = [
  {
    key: 'minimizer',
    icon: 'insights',
    tileClass:
      'bg-[color-mix(in_srgb,var(--color-secondary-container)_40%,transparent)] text-primary',
    defaultTitle: 'Smart Debt Minimizer',
    defaultBody:
      'Equal, exact amounts, or weighted shares — {{app}} collapses every messy cross-debt into the fewest transfers, computed to the cent.',
  },
  {
    key: 'receipt',
    icon: 'document_scanner',
    tileClass: 'bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-primary',
    defaultTitle: 'Receipt Scan & Auto-Split',
    defaultBody:
      'Snap the receipt and {{app}} reads the line items, pro-rates tax and tip, and splits each share automatically.',
  },
  {
    key: 'nudges',
    icon: 'notifications',
    tileClass: 'bg-[color-mix(in_srgb,var(--color-tertiary)_10%,transparent)] text-tertiary',
    defaultTitle: 'Zero Awkward Conversations',
    defaultBody:
      'Polite automated nudges chase the balance for you — warm, low-pressure reminders instead of group-text standoffs.',
  },
  {
    key: 'currency',
    icon: 'currency_exchange',
    tileClass:
      'bg-[color-mix(in_srgb,var(--color-secondary-fixed-dim)_30%,transparent)] text-on-secondary-fixed',
    defaultTitle: 'Multi-Currency & Offline Ready',
    defaultBody:
      'Log expenses in any currency and settle in your own — 0% FX markup, and everything works offline until you reconnect.',
  },
] as const

/* Stitch "How Evenly Works" — the three-step onboarding strip. */
const HOW_IT_WORKS = [
  {
    icon: 'group_add',
    title: 'Create your circle',
    body: 'Spin up a group for the cabin trip, the flat share, or the weekly dinner club — invites take one tap.',
  },
  {
    icon: 'receipt_long',
    title: 'Drop in expenses as you go',
    body: 'Add what was paid the moment it happens — equal, exact, or weighted splits, in any currency.',
  },
  {
    icon: 'handshake',
    title: 'Settle in a single tap',
    body: 'The Smart Debt Minimizer reduces everyone’s IOUs to the fewest direct transfers and settles them in one tap.',
  },
] as const

/* Stitch "Dinner splits without the awkward side-eye." mockup — an
 * itemized restaurant receipt the Smart Debt Minimizer has already divided. */
const DINNER_ITEMS = [
  { label: 'Truffle pasta', amount: '$32.00' },
  { label: 'Share plates · 4 kinds', amount: '$58.00' },
  { label: 'Wine (2 bottles)', amount: '$76.00' },
  { label: 'Tax (8.875%) & tip (20%)', amount: '$29.53' },
] as const

/* Stitch hero mockup — "Lake Tahoe Weekend Cabin" expense stream. */
const MOCK_EXPENSES = [
  {
    icon: 'cottage',
    tile: 'bg-[color-mix(in_srgb,var(--color-tertiary-fixed)_50%,transparent)] text-tertiary',
    name: 'Airbnb 3 Nights',
    pill: 'Receipt verified',
    paidBy: 'Sam',
    note: 'Split equally across 5',
    amount: '$1,200.00',
    perShare: '$240.00 / person',
  },
  {
    icon: 'shopping_basket',
    tile: 'bg-[color-mix(in_srgb,var(--color-secondary-container)_50%,transparent)] text-secondary',
    name: 'Costco Groceries & BBQ',
    pill: 'Itemized split',
    paidBy: 'Maya',
    note: 'Maya, Leo, Sam, Dev',
    amount: '$410.00',
    perShare: 'Custom shares',
  },
  {
    icon: 'local_gas_station',
    tile: 'bg-surface-container-high text-on-surface-variant',
    name: 'Gas & Bay Bridge Tolls',
    pill: null,
    paidBy: 'Sam',
    note: 'Split by carpool riders (4)',
    amount: '$230.00',
    perShare: '$57.50 / rider',
  },
] as const

/* Stitch "Smart Debt Minimizer" settlement rows. */
const MOCK_SETTLEMENTS = [
  { from: 'CK', fromName: 'Clara', to: 'Sam', amount: '$184.00', rail: 'Venmo' },
  { from: 'DP', fromName: 'Dev', to: 'Sam', amount: '$184.00', rail: 'Cash App' },
  { from: 'DP', fromName: 'Dev', to: 'Maya', amount: '$92.00', rail: 'Zelle' },
] as const

/* Stitch social-proof scenario chips. */
const SCENARIOS = [
  { icon: 'home', label: 'Rent & Flatmate Utilities' },
  { icon: 'flight_takeoff', label: 'Road Trips & Flights' },
  { icon: 'favorite', label: 'Couples & Date Nights' },
  { icon: 'celebration', label: 'Bachelor & Bachelorette Parties' },
  { icon: 'restaurant', label: 'Weekly Dinner Clubs' },
] as const

/* Stitch testimonials — "Loved by roommates, couples & trip organizers". */
const TESTIMONIALS = [
  {
    name: 'Elena Rostova',
    initials: 'ER',
    tile: 'bg-primary-fixed text-on-primary-fixed',
    role: 'Flatmates of 4 · Chicago',
    quote:
      'Our rent-and-utilities group text went from 40 messages a month to zero. The nudges are so polite nobody minds them.',
  },
  {
    name: 'Marcus Vance',
    initials: 'MV',
    tile: 'bg-secondary-fixed text-on-secondary-fixed',
    role: 'Trip organizer · Lake Tahoe',
    quote:
      'Ten of us, one ski cabin, fourteen expenses. The minimizer turned it into three transfers. I will never build a spreadsheet again.',
  },
  {
    name: 'Chloe & Jordan',
    initials: 'CJ',
    tile: 'bg-tertiary-fixed text-on-tertiary-fixed',
    role: 'Couple · 12 shared trips',
    quote:
      'We split everything with weighted shares so Jordan covers the ski passes and I cover dinners. It just… always adds up.',
  },
] as const

const REASSURANCES = [
  { icon: 'check', label: 'Free forever for friends' },
  { icon: 'credit_card_off', label: 'No credit card required' },
  { icon: 'lock', label: 'Bank-level 256-bit encryption' },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      data-mol-id="page-landing"
      className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}
    >
      <nav
        className={cm.cn(
          'sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/30',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('[1200px]'),
            cm.sp('px', 6),
            cm.flex({ align: 'center', justify: 'between' }),
            'h-20 mx-auto w-full',
          )}
        >
          <BrandWordmark size="lg" />
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2.5),
                  cm.fontWeight('semibold'),
                  'rounded-lg bg-primary text-on-primary hover:bg-[color:var(--color-primary-hover)] shadow-sm transition-colors',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'rounded-lg text-on-surface-variant hover:text-primary transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    cm.sp('px', 5),
                    cm.sp('py', 2.5),
                    'rounded-lg bg-primary text-on-primary hover:bg-[color:var(--color-primary-hover)] shadow-sm transition-colors',
                  )}
                >
                  {t('common.startFree', {}, { defaultValue: 'Get Started Free' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — Stitch centers everything over the subtle grid + glows */}
        <section className={cm.cn('relative overflow-hidden bg-grid-subtle')}>
          <div
            aria-hidden="true"
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[320px] bg-[color-mix(in_srgb,var(--color-secondary-container)_20%,transparent)] blur-[100px] rounded-full pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute top-36 right-10 w-[380px] h-[380px] bg-[color-mix(in_srgb,var(--color-tertiary-fixed)_30%,transparent)] blur-[90px] rounded-full pointer-events-none"
          />
          <div className={cm.cn('relative', cm.maxW('[1200px]'), 'mx-auto', cm.sp('px', 6))}>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center' }),
                'text-center max-w-3xl mx-auto',
                cm.sp('pt', 12),
                cm.sp('pb', 16),
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 4),
                  cm.sp('py', 1.5),
                  cm.sp('mb', 6),
                  'self-center rounded-full bg-surface-container-lowest border border-outline-variant/50 text-primary shadow-sm',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-base')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  auto_awesome
                </span>
                <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                  {t(
                    'landing.badge',
                    {},
                    { defaultValue: 'Smarter group expenses · Zero math required' },
                  )}
                </span>
              </div>
              <h1 className="hidden md:block text-5xl lg:text-6xl font-extrabold tracking-tight text-on-background mb-6 leading-[1.1]">
                {t('landing.heroTitle', {}, { defaultValue: 'Shared costs, settled simply.' })}
              </h1>
              <h1 className="block md:hidden text-4xl font-extrabold tracking-tight text-on-background mb-6 leading-[1.15]">
                {t('landing.heroTitle', {}, { defaultValue: 'Shared costs, settled simply.' })}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  'text-on-surface-variant max-w-2xl mb-8 leading-relaxed',
                )}
              >
                {t(
                  'landing.heroSubtitle',
                  { app: APP_NAME },
                  {
                    defaultValue:
                      'Tired of chaotic spreadsheets and awkward "who owes what" group texts? {{app}} tracks shared expenses for roommates, trips, and dinners — minimizing transactions so everyone settles up in one tap.',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 4, wrap: 'wrap' }),
                  cm.sp('mb', 8),
                  'justify-center w-full sm:w-auto',
                )}
              >
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.fontWeight('semibold'),
                    cm.flex({ align: 'center', gap: 2 }),
                    'rounded-xl bg-primary text-on-primary shadow-lg shadow-primary/20 hover:bg-[color:var(--color-primary-hover)] transition-colors',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
                    bolt
                  </span>
                  {t('landing.ctaPrimary', {}, { defaultValue: 'Start Splitting Free' })}
                </Link>
                <a
                  href="#demo"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 4),
                    cm.fontWeight('semibold'),
                    cm.flex({ align: 'center', gap: 2 }),
                    'rounded-xl bg-surface-container-lowest border border-outline-variant/60 text-on-surface hover:border-outline shadow-sm transition-colors',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-xl text-primary')}
                    aria-hidden="true"
                  >
                    play_circle
                  </span>
                  {t('landing.ctaSecondary', {}, { defaultValue: 'Explore Live Demo' })}
                </a>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2, wrap: 'wrap' }),
                  'justify-center text-on-surface-variant',
                )}
              >
                <span className={cm.flex({ gap: 0.5 })} aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={cm.cn('material-symbols-outlined text-base text-amber-500')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  ))}
                </span>
                <span
                  className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-on-surface')}
                >
                  4.9/5
                </span>
                <span className={cm.textSize('xs')}>
                  {t(
                    'landing.trustRating',
                    {},
                    { defaultValue: 'from 140,000+ flatmates and travelers' },
                  )}
                </span>
                <span className="text-outline-variant hidden sm:inline" aria-hidden="true">
                  •
                </span>
                <span
                  className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'text-primary')}
                >
                  {t('landing.trustFree', {}, { defaultValue: 'Free forever for personal groups' })}
                </span>
              </div>
            </div>

            {/* Hero interactive preview card */}
            <HeroPreviewCard cm={cm} t={t} />
          </div>
        </section>

        {/* Social proof — Stitch's scenario strip */}
        <section className="py-8 bg-surface-container-low border-y border-outline-variant/30">
          <div className={cm.cn(cm.maxW('[1200px]'), 'mx-auto', cm.sp('px', 6))}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' }),
                'flex-col md:flex-row gap-6',
              )}
            >
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-wider text-on-surface-variant text-center md:text-left',
                )}
              >
                {t(
                  'landing.scenariosLabel',
                  {},
                  { defaultValue: 'Trusted daily for every shared life scenario' },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', wrap: 'wrap', gap: 2.5 }),
                  'justify-center md:justify-end',
                )}
              >
                {SCENARIOS.map((s) => (
                  <span
                    key={s.icon}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 1.5 }),
                      cm.sp('px', 4),
                      cm.sp('py', 1.5),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'rounded-full bg-surface-container-lowest border border-outline-variant/40 text-on-surface',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-lg text-primary')}
                      aria-hidden="true"
                    >
                      {s.icon}
                    </span>
                    {t(`landing.scenario.${s.icon}`, {}, { defaultValue: s.label })}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          className={cm.cn('bg-surface', cm.maxW('[1200px]'), 'mx-auto', cm.sp('px', 6), 'py-24')}
        >
          <div
            className={cm.cn(
              'max-w-2xl mx-auto text-center',
              cm.sp('mb', 16),
              cm.flex({ direction: 'col', gap: 3 }),
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-wider text-primary',
              )}
            >
              {t(
                'landing.featuresEyebrow',
                {},
                { defaultValue: 'Fintech precision with zero friction' },
              )}
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface">
              {t(
                'landing.featuresHeading',
                { app: APP_NAME },
                { defaultValue: 'Why groups prefer {{app}} over spreadsheets' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
              {t(
                'landing.featuresSubheading',
                {},
                {
                  defaultValue:
                    'Built specifically for humans sharing life together. No complex ledger jargon, no endless back-and-forth messaging.',
                },
              )}
            </p>
          </div>
          {/* Bento grid — Stitch's 2×2 value cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {FEATURES.map((f, i) => (
              <article
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 8),
                  cm.flex({ direction: 'col', justify: 'between' }),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm hover:shadow-md transition-shadow',
                )}
              >
                <div>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(12),
                      cm.h(12),
                      'rounded-xl mb-6',
                      f.tileClass,
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-2xl')}
                      aria-hidden="true"
                    >
                      {f.icon}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-on-surface mb-3">
                    {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                  </h3>
                  <p
                    className={cm.cn(
                      cm.textSize('base'),
                      'text-on-surface-variant mb-6 leading-relaxed',
                    )}
                  >
                    {t(
                      `landing.feature.${f.key}.body`,
                      { app: APP_NAME },
                      { defaultValue: f.defaultBody },
                    )}
                  </p>
                </div>
                {/* Mini visual — Stitch pairs every card with a small diagram */}
                <div
                  className={cm.cn(
                    cm.sp('p', 4),
                    'rounded-xl bg-surface-container-low border border-outline-variant/30',
                    i === 0 ? '' : cm.flex({ align: 'center', justify: 'between', gap: 2 }),
                  )}
                  aria-hidden="true"
                >
                  {i === 0 && (
                    <>
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'between' }),
                          cm.textSize('xs'),
                          cm.sp('mb', 2),
                        )}
                      >
                        <span className="text-error font-medium">
                          {t(
                            'landing.mini.standard',
                            {},
                            { defaultValue: 'Standard App (12 Transfers)' },
                          )}
                        </span>
                        <span className="text-primary font-bold">
                          {t(
                            'landing.mini.app',
                            { app: APP_NAME },
                            { defaultValue: '{{app}} (2 Transfers)' },
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-surface-container-highest rounded-full h-3 flex overflow-hidden">
                        <div className="bg-error/70 h-full w-[85%]" />
                        <div className="bg-primary h-full w-[15%]" />
                      </div>
                      <p
                        className={cm.cn(cm.textSize('xs'), 'text-outline-variant mt-2 text-right')}
                      >
                        {t(
                          'landing.mini.reduction',
                          {},
                          { defaultValue: '83% reduction in payment notifications' },
                        )}
                      </p>
                    </>
                  )}
                  {i === 1 && (
                    <>
                      <span className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                        <span
                          className={cm.cn('material-symbols-outlined text-primary')}
                          aria-hidden="true"
                        >
                          document_scanner
                        </span>
                        <span>
                          <span
                            className={cm.cn(
                              cm.textSize('xs'),
                              cm.fontWeight('semibold'),
                              'text-on-surface block',
                            )}
                          >
                            {t(
                              'landing.mini.receipt',
                              {},
                              { defaultValue: 'Truffle Pasta & Cocktails' },
                            )}
                          </span>
                          <span className={cm.cn(cm.textSize('xs'), 'text-outline')}>
                            {t(
                              'landing.mini.receiptNote',
                              {},
                              { defaultValue: 'Tax (8.875%) & Tip (20%) auto-pro-rated' },
                            )}
                          </span>
                        </span>
                      </span>
                      <span
                        className={cm.cn(
                          cm.sp('px', 2.5),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'rounded-full bg-[color-mix(in_srgb,var(--color-secondary-container)_50%,transparent)] text-primary',
                        )}
                      >
                        {t('landing.mini.scanned', {}, { defaultValue: 'Scanned' })}
                      </span>
                    </>
                  )}
                  {i === 2 && (
                    <>
                      <span className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                        <span
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'center' }),
                            'h-8 w-8 rounded-full bg-surface text-primary text-sm font-bold',
                          )}
                          aria-hidden="true"
                        >
                          🔔
                        </span>
                        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface')}>
                          {t(
                            'landing.mini.reminder',
                            {},
                            {
                              defaultValue:
                                '"Hey! Sam settled the WiFi bill ($45). Settle when free ✨"',
                            },
                          )}
                        </span>
                      </span>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'text-primary whitespace-nowrap',
                        )}
                      >
                        {t('landing.mini.oneTap', {}, { defaultValue: '1-Tap Settle' })}
                      </span>
                    </>
                  )}
                  {i === 3 && (
                    <>
                      <span
                        className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.textSize('xs'))}
                      >
                        <span className="px-2 py-0.5 bg-surface-container-lowest rounded border border-outline-variant/30 text-on-surface">
                          ¥18,400 JPY
                        </span>
                        <span
                          className={cm.cn('material-symbols-outlined text-primary text-sm')}
                          aria-hidden="true"
                        >
                          sync_alt
                        </span>
                        <span className="px-2 py-0.5 bg-surface-container-lowest rounded border border-outline-variant/30 text-on-surface">
                          $121.50 USD
                        </span>
                      </span>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'text-primary',
                        )}
                      >
                        {t('landing.mini.fx', {}, { defaultValue: '0% FX Markup' })}
                      </span>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* How it works — Stitch's three-step strip */}
        <section
          id="how-it-works"
          data-mol-id="landing-how-it-works"
          className="bg-surface-container-low border-y border-outline-variant/30"
        >
          <div className={cm.cn(cm.maxW('[1200px]'), 'mx-auto', cm.sp('px', 6), 'py-24')}>
            <div
              className={cm.cn(
                'max-w-2xl mx-auto text-center',
                cm.sp('mb', 16),
                cm.flex({ direction: 'col', gap: 3 }),
              )}
            >
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-wider text-primary',
                )}
              >
                {t(
                  'landing.howEyebrow',
                  {},
                  { defaultValue: 'From the bill to settled in three steps' },
                )}
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface">
                {t('landing.howHeading', { app: APP_NAME }, { defaultValue: 'How {{app}} Works' })}
              </h2>
            </div>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {HOW_IT_WORKS.map((step, i) => (
                <li
                  key={step.title}
                  className={cm.cn(
                    cm.sp('p', 8),
                    cm.flex({ direction: 'col', gap: 4 }),
                    'relative rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(12),
                      cm.h(12),
                      'rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-primary',
                    )}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined text-2xl')}>{step.icon}</span>
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'text-outline-variant uppercase tracking-widest',
                    )}
                    aria-hidden="true"
                  >
                    {t('landing.howStepLabel', { step: i + 1 }, { defaultValue: 'Step {{step}}' })}
                  </span>
                  <h3 className="text-base font-bold text-on-surface">
                    {t(`landing.howStep.${i + 1}.title`, {}, { defaultValue: step.title })}
                  </h3>
                  <p
                    className={cm.cn(
                      cm.textSize('base'),
                      'text-on-surface-variant leading-relaxed',
                    )}
                  >
                    {t(`landing.howStep.${i + 1}.body`, {}, { defaultValue: step.body })}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Dinner scenario — Stitch's itemized-receipt mockup */}
        <section
          data-mol-id="landing-dinner"
          className={cm.cn('bg-surface', cm.maxW('[1200px]'), 'mx-auto', cm.sp('px', 6), 'py-24')}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 4 }))}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 4),
                  cm.sp('py', 1.5),
                  'self-start rounded-full bg-surface-container-lowest border border-outline-variant/50 text-primary shadow-sm',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  restaurant
                </span>
                <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                  {t('landing.dinner.pill', {}, { defaultValue: 'The Friday-night scenario' })}
                </span>
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface">
                {t(
                  'landing.dinner.heading',
                  {},
                  { defaultValue: 'Dinner splits without the awkward side-eye.' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant leading-relaxed')}>
                {t(
                  'landing.dinner.body',
                  { app: APP_NAME },
                  {
                    defaultValue:
                      'One person pays, everyone else opens the app. {{app}} itemizes the receipt, prorates the tax and tip, and hands back exactly what each person owes — no mental math, no "just round it" losses.',
                  },
                )}
              </p>
              <ul className={cm.cn(cm.stack(2), cm.sp('mt', 2))}>
                {['itemizedReceipt', 'fairTipSplit', 'oneTapRail'].map((row, i) => (
                  <li key={row} className={cm.flex({ align: 'center', gap: 2 })}>
                    <span
                      className={cm.cn('material-symbols-outlined text-lg text-primary')}
                      aria-hidden="true"
                    >
                      check_circle
                    </span>
                    <span className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                      {t(
                        `landing.dinner.point.${row}`,
                        {},
                        {
                          defaultValue: [
                            'Every line item visible to the whole table',
                            'Tip split fairly across whoever dined',
                            'Payback links for Venmo, Cash App & Zelle',
                          ][i],
                        },
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Itemized receipt mockup card */}
            <div
              className={cm.cn(
                cm.sp('p', 6),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-xl',
              )}
              aria-hidden="true"
            >
              <div className={cm.flex({ align: 'center', justify: 'between', gap: 2 })}>
                <h3
                  className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'text-on-surface')}
                >
                  {t('landing.dinner.receiptTitle', {}, { defaultValue: 'Osteria Morini Dinner' })}
                </h3>
                <span
                  className={cm.cn(
                    cm.sp('px', 2.5),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'rounded-full bg-[color-mix(in_srgb,var(--color-secondary-container)_50%,transparent)] text-primary',
                  )}
                >
                  {t('landing.dinner.autoSplit', {}, { defaultValue: 'Auto-split' })}
                </span>
              </div>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}>
                {t(
                  'landing.dinner.receiptMeta',
                  {},
                  { defaultValue: '6 people · Friday 8:12 PM · Scanned receipt' },
                )}
              </p>
              <ul
                className={cm.cn(
                  cm.stack(2),
                  cm.sp('mt', 4),
                  'border-t border-outline-variant/30 pt-4',
                )}
              >
                {DINNER_ITEMS.map((item) => (
                  <li
                    key={item.label}
                    className={cm.flex({ align: 'center', justify: 'between', gap: 2 })}
                  >
                    <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t(`landing.dinner.item.${item.label}`, {}, { defaultValue: item.label })}
                    </span>
                    <span className={cm.cn(cm.textSize('sm'), 'text-on-surface tabular-nums')}>
                      {item.amount}
                    </span>
                  </li>
                ))}
              </ul>
              <div
                className={cm.flex({ align: 'center', justify: 'between' })}
                data-mol-id="landing-dinner-total"
              >
                <span
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                >
                  {t('landing.dinner.perPerson', {}, { defaultValue: '$32.59 / person' })}
                </span>
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1.5),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'rounded-lg bg-primary text-on-primary shadow-sm',
                  )}
                >
                  {t('landing.dinner.settled', {}, { defaultValue: 'Settled in one tap' })}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials — Stitch's social-proof cards */}
        <section
          data-mol-id="landing-testimonials"
          className="bg-surface-container-low border-y border-outline-variant/30"
        >
          <div className={cm.cn(cm.maxW('[1200px]'), 'mx-auto', cm.sp('px', 6), 'py-24')}>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface text-center max-w-3xl mx-auto">
              {t(
                'landing.testimonials.heading',
                {},
                { defaultValue: 'Loved by roommates, couples & trip organizers' },
              )}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
              {TESTIMONIALS.map((review) => (
                <figure
                  key={review.name}
                  className={cm.cn(
                    cm.sp('p', 8),
                    cm.flex({ direction: 'col', gap: 4 }),
                    'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm',
                  )}
                >
                  <span className={cm.flex({ gap: 0.5 })} aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={cm.cn('material-symbols-outlined text-base text-amber-500')}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    ))}
                  </span>
                  <blockquote
                    className={cm.cn(cm.textSize('base'), 'text-on-surface leading-relaxed')}
                  >
                    “
                    {t(
                      `landing.testimonial.${review.name}.quote`,
                      {},
                      { defaultValue: review.quote },
                    )}
                    ”
                  </blockquote>
                  <figcaption
                    className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mt', 2))}
                  >
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'h-10 w-10 rounded-full text-xs font-bold',
                        review.tile,
                      )}
                      aria-hidden="true"
                    >
                      {review.initials}
                    </span>
                    <span>
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                          'text-on-surface block',
                        )}
                      >
                        {t(
                          `landing.testimonial.${review.name}.name`,
                          {},
                          { defaultValue: review.name },
                        )}
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          `landing.testimonial.${review.name}.role`,
                          {},
                          { defaultValue: review.role },
                        )}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* High-conversion CTA banner — Stitch's gradient rounded-3xl block */}
        <section
          className={cm.cn('bg-surface', cm.maxW('[1200px]'), 'mx-auto', cm.sp('px', 6), 'py-20')}
        >
          <div
            className={cm.cn(
              'relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary to-[color:var(--color-surface-tint)] text-on-primary shadow-2xl text-center',
              cm.sp('p', 8),
              'md:p-16',
            )}
          >
            <div
              aria-hidden="true"
              className="absolute -right-20 -bottom-20 w-80 h-80 bg-[color-mix(in_srgb,var(--color-secondary-container)_20%,transparent)] rounded-full blur-3xl pointer-events-none"
            />
            <div
              aria-hidden="true"
              className="absolute -left-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"
            />
            <div className="relative max-w-2xl mx-auto flex flex-col items-center">
              <span
                className={cm.cn(
                  'inline-block px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold mb-6',
                )}
              >
                {t('landing.ctaPill', {}, { defaultValue: 'Zero Fees for Personal Groups' })}
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
                {t(
                  'landing.ctaHeading',
                  {},
                  { defaultValue: 'Never argue about the dinner bill again.' },
                )}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  'text-on-primary-container mb-8 leading-relaxed',
                )}
              >
                {t(
                  'landing.ctaBody',
                  { app: APP_NAME },
                  {
                    defaultValue:
                      'Join over 140,000 roommates, vacationers, and friends who have simplified group expenses with {{app}}.',
                  },
                )}
              </p>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-xl bg-on-primary text-primary shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform inline-flex items-center gap-2',
                )}
              >
                {t('common.startFree', {}, { defaultValue: 'Get Started Free' })}
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
              <div
                className={cm.cn(
                  cm.flex({ wrap: 'wrap', justify: 'center', gap: 6 }),
                  'text-on-primary-container text-xs font-medium mt-8',
                )}
              >
                {REASSURANCES.map((r) => (
                  <span key={r.icon} className={cm.flex({ align: 'center', gap: 1.5 })}>
                    <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                      {r.icon}
                    </span>
                    {t(`landing.reassurance.${r.icon}`, {}, { defaultValue: r.label })}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-surface-container-low border-t border-outline-variant/30">
        <div
          className={cm.cn(
            cm.maxW('[1200px]'),
            'mx-auto',
            cm.sp('px', 6),
            cm.sp('py', 16),
            cm.flex({ direction: 'col', gap: 12 }),
          )}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            <div className={cm.cn('md:col-span-5', cm.stack(4))}>
              <BrandWordmark as="span" size="sm" footer />
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-sm')}>
                {t(
                  'landing.footerTagline',
                  { tagline: APP_TAGLINE, appName: APP_NAME },
                  {
                    defaultValue:
                      'Shared costs, settled simply. The modern social expense tracker built for roommates, travel groups, and dinners.',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  'text-xs text-primary font-medium',
                )}
              >
                <span
                  className={cm.cn('h-2 w-2 rounded-full bg-primary animate-pulse')}
                  aria-hidden="true"
                />
                {t('landing.footerStatus', {}, { defaultValue: 'All systems operational' })}
              </div>
            </div>
            <div className={cm.cn('md:col-span-4', cm.stack(3))}>
              <h4
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-wider text-on-surface',
                )}
              >
                {t('landing.footerProduct', {}, { defaultValue: 'Product' })}
              </h4>
              <ul className={cm.cn(cm.stack(2.5), cm.textSize('sm'))}>
                <li>
                  <a
                    href="#demo"
                    className="text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {t('landing.ctaSecondary', {}, { defaultValue: 'Explore Live Demo' })}
                  </a>
                </li>
                <li>
                  <Link
                    to="/signup"
                    className="text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {t('common.startFree', {}, { defaultValue: 'Get Started Free' })}
                  </Link>
                </li>
              </ul>
            </div>
            <div className={cm.cn('md:col-span-3', cm.stack(3))}>
              <h4
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-wider text-on-surface',
                )}
              >
                {t('landing.footerLegal', {}, { defaultValue: 'Legal' })}
              </h4>
              <ul className={cm.cn(cm.stack(2.5), cm.textSize('sm'))}>
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
                    to="/privacy"
                    className="text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {t('nav.privacy', {}, { defaultValue: 'Privacy Policy' })}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {t('nav.terms', {}, { defaultValue: 'Terms of Service' })}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div
            className={cm.cn(
              cm.sp('pt', 8),
              'border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-4',
            )}
          >
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'landing.copyright',
                { year: new Date().getFullYear(), app: APP_NAME },
                { defaultValue: '© {{year}} {{app}}. All rights reserved.' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-outline')}>
              {t(
                'landing.footerCrafted',
                {},
                { defaultValue: 'Crafted with precision for frictionless sharing' },
              )}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

type ClassMap = ReturnType<typeof getClassMap>
type Translate = ReturnType<typeof useTranslation>['t']

/**
 * Hero interactive preview card — the Stitch "Lake Tahoe Weekend Cabin"
 * mockup: expense stream on the left, Smart Debt Minimizer on the right.
 * Entirely presentational; anchors the hero the way the design does.
 */
function HeroPreviewCard({ cm, t }: { cm: ClassMap; t: Translate }) {
  return (
    <div
      id="demo"
      className={cm.cn(
        'relative rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-2xl backdrop-blur-xl',
        cm.sp('p', 4),
        'md:p-8',
        cm.maxW('5xl'),
        'mx-auto',
        cm.sp('mb', 20),
      )}
    >
      {/* Mockup top bar */}
      <div
        className={cm.cn(
          cm.flex({ justify: 'between' }),
          'flex-col md:flex-row md:items-center gap-4 pb-6 mb-6 border-b border-outline-variant/20',
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 3 })}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-12 w-12 rounded-xl bg-[color-mix(in_srgb,var(--color-secondary-container)_40%,transparent)] text-secondary border border-secondary-container',
            )}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-2xl')}>cabin</span>
          </span>
          <div className={cm.stack(1)}>
            <div className={cm.flex({ align: 'center', gap: 2 })}>
              <h2 className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                {t('landing.demo.tripName', {}, { defaultValue: 'Lake Tahoe Weekend Cabin' })}
              </h2>
              <span
                className={cm.cn(
                  cm.sp('px', 2.5),
                  cm.sp('py', 0.5),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'rounded-full bg-secondary-container text-on-secondary-container',
                )}
              >
                {t('landing.demo.activeTrip', {}, { defaultValue: 'Active Trip' })}
              </span>
            </div>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'landing.demo.tripMeta',
                {},
                { defaultValue: '5 members · Organized by Sam M. · Oct 18–21' },
              )}
            </p>
          </div>
        </div>
        <div className={cm.flex({ align: 'center', gap: 6 })}>
          <div className="text-right">
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-wider text-outline block',
              )}
            >
              {t('landing.demo.totalLabel', {}, { defaultValue: 'Total Group Spend' })}
            </span>
            <span
              className={cm.cn(cm.textSize('2xl'), cm.fontWeight('extrabold'), 'text-on-surface')}
            >
              $1,840.00
            </span>
          </div>
          <span
            className={cm.cn(
              'hidden',
              'sm:flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold transition-all shadow-sm',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              add
            </span>
            {t('landing.demo.addCost', {}, { defaultValue: 'Add Cost' })}
          </span>
        </div>
      </div>

      {/* 2-column mockup grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Expense stream */}
        <div className="lg:col-span-7">
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 1),
              cm.sp('mb', 3),
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-wider text-outline',
              )}
            >
              {t('landing.demo.activityLabel', {}, { defaultValue: 'Live Expense Activity' })}
            </span>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-primary')}>
              {t('landing.demo.verified', {}, { defaultValue: '3 of 3 verified' })}
            </span>
          </div>
          <div className={cm.stack(3)}>
            {MOCK_EXPENSES.map((e) => (
              <div
                key={e.name}
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({ align: 'center', justify: 'between', gap: 4 }),
                  'rounded-xl bg-surface border border-outline-variant/30',
                )}
              >
                <div className={cm.flex({ align: 'center', gap: 4 })}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-10 w-10 rounded-lg shrink-0',
                      e.tile,
                    )}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined text-xl')}>{e.icon}</span>
                  </span>
                  <div>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'flex-wrap')}>
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'text-on-surface',
                        )}
                      >
                        {t(`landing.demo.expense.${e.name}`, {}, { defaultValue: e.name })}
                      </span>
                      {e.pill && (
                        <span
                          className={cm.cn(
                            cm.sp('px', 2),
                            cm.sp('py', 0.5),
                            cm.textSize('xs'),
                            cm.fontWeight('medium'),
                            'rounded-full bg-surface-container-high text-on-surface-variant',
                          )}
                        >
                          {e.pill}
                        </span>
                      )}
                    </div>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t(
                        'landing.demo.paidBy',
                        { name: e.paidBy },
                        { defaultValue: 'Paid by {{name}}' },
                      )}{' '}
                      · {e.note}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={cm.cn(
                      cm.textSize('base'),
                      cm.fontWeight('bold'),
                      'text-on-surface block',
                    )}
                  >
                    {e.amount}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-outline')}>{e.perShare}</span>
                </div>
              </div>
            ))}
          </div>
          {/* Avatar cluster */}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('pt', 2),
              cm.sp('px', 2),
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center' }), '-space-x-2')}>
              {['SM', 'ML', 'LT', 'CK', 'DP'].map((initials, i) => (
                <span
                  key={initials}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-8 w-8 rounded-full text-xs font-bold ring-2 ring-surface-container-lowest',
                    AVATAR_TILES[i % AVATAR_TILES.length],
                  )}
                  aria-hidden="true"
                >
                  {initials}
                </span>
              ))}
            </div>
            <span className={cm.cn(cm.textSize('sm'), 'text-outline')}>
              {t('landing.demo.synced', {}, { defaultValue: '5 balances synced live' })}
            </span>
          </div>
        </div>

        {/* Smart Debt Minimizer */}
        <div className="lg:col-span-5 rounded-xl bg-gradient-to-b from-surface-container-low to-surface border border-outline-variant/40 p-5 shadow-sm">
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.sp('mb', 3))}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'h-7 w-7 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-primary',
              )}
              aria-hidden="true"
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>insights</span>
            </span>
            <h3 className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
              {t('landing.demo.minimizerTitle', {}, { defaultValue: 'Smart Debt Minimizer' })}
            </h3>
          </div>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mb-4')}>
            {t(
              'landing.demo.minimizerBody',
              {},
              {
                defaultValue: '10 messy transfers condensed into just 3 direct settlements:',
              },
            )}
          </p>
          <div className={cm.stack(2.5)}>
            {MOCK_SETTLEMENTS.map((s) => (
              <div
                key={`${s.from}-${s.to}-${s.amount}`}
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.flex({ align: 'center', justify: 'between' }),
                  'bg-surface-container-lowest rounded-lg border border-outline-variant/30',
                )}
              >
                <span className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.textSize('xs'))}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-6 w-6 rounded-full bg-surface-container-highest text-on-surface text-xs font-bold',
                    )}
                    aria-hidden="true"
                  >
                    {s.from}
                  </span>
                  <span className="text-on-surface font-semibold">{s.fromName}</span>
                  <span
                    className={cm.cn('material-symbols-outlined text-primary text-sm')}
                    aria-hidden="true"
                  >
                    arrow_forward
                  </span>
                  <span className="text-on-surface font-semibold">{s.to}</span>
                </span>
                <span className={cm.flex({ align: 'center', gap: 2 })}>
                  <span
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                  >
                    {s.amount}
                  </span>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 0.5),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'rounded bg-[color-mix(in_srgb,var(--color-secondary-container)_40%,transparent)] text-primary',
                    )}
                  >
                    {s.rail}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <span
            className={cm.cn(
              cm.sp('py', 3),
              cm.sp('mt', 4),
              cm.flex({ align: 'center', justify: 'center', gap: 2 }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'w-full rounded-lg bg-primary text-on-primary shadow-sm',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-lg')} aria-hidden="true">
              account_balance_wallet
            </span>
            {t('landing.demo.settleUp', {}, { defaultValue: 'Settle up with Venmo / Cash App' })}
          </span>
          <p className={cm.cn(cm.textSize('xs'), 'text-outline mt-2 text-center')}>
            {t(
              'landing.demo.settleNote',
              {},
              { defaultValue: 'No transaction fee · Direct app deep links' },
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

/* Initials avatar tiles for the mockup avatar cluster. */
const AVATAR_TILES = [
  'bg-primary-fixed text-on-primary-fixed',
  'bg-secondary-fixed text-on-secondary-fixed',
  'bg-tertiary-fixed text-on-tertiary-fixed',
  'bg-surface-container-highest text-on-surface',
  'bg-surface-dim text-on-surface',
] as const

export default Landing
