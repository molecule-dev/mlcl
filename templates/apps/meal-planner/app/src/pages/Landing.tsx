import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { SafeLink } from '../components/SafeLink.js'

interface FeatureCard {
  icon: string
  titleKey: string
  defaultTitle: string
  bodyKey: string
  defaultBody: string
}

const FEATURES: FeatureCard[] = [
  {
    icon: 'menu_book',
    titleKey: 'simmer.landing.features.recipes.title',
    defaultTitle: 'Recipe box',
    bodyKey: 'simmer.landing.features.recipes.body',
    defaultBody: 'Your recipes and a starter catalog, searchable by tag and total time.',
  },
  {
    icon: 'shopping_cart',
    titleKey: 'simmer.landing.features.groceries.title',
    defaultTitle: 'Self-writing grocery list',
    bodyKey: 'simmer.landing.features.groceries.body',
    defaultBody: 'Ingredients scaled and merged across the week, grouped by aisle.',
  },
  {
    icon: 'kitchen',
    titleKey: 'simmer.landing.features.pantry.title',
    defaultTitle: 'Pantry memory',
    bodyKey: 'simmer.landing.features.pantry.body',
    defaultBody: 'Flags what you already have so you stop re-buying staples.',
  },
]

interface DemoDay {
  dayKey: string
  day: string
  emoji: string
  titleKey: string
  title: string
  bodyKey: string
  body: string
  metaKey: string
  meta: string
  meta2Key: string
  meta2: string
}

/** The design's showcase week — marketing copy, not live plan data. */
const DEMO_WEEK: DemoDay[] = [
  {
    dayKey: 'monday',
    day: 'Monday',
    emoji: '🍗',
    titleKey: 'simmer.landing.board.monday.title',
    title: 'One-Pot Lemon Braised Chicken',
    bodyKey: 'simmer.landing.board.monday.body',
    body: 'Caramelized shallots, thyme, and roasted potatoes in a cast-iron skillet.',
    metaKey: 'simmer.landing.board.monday.meta',
    meta: 'Batch prep × 2',
    meta2Key: 'simmer.landing.board.monday.meta2',
    meta2: '35m prep',
  },
  {
    dayKey: 'tuesday',
    day: 'Tuesday',
    emoji: '🥗',
    titleKey: 'simmer.landing.board.tuesday.title',
    title: 'Shredded Chicken Grain Salad',
    bodyKey: 'simmer.landing.board.tuesday.body',
    body: 'Farro, crisp cucumber, arugula, and a lemon-oregano vinaigrette.',
    metaKey: 'simmer.landing.board.tuesday.meta',
    meta: "Uses Monday's chicken",
    meta2Key: 'simmer.landing.board.tuesday.meta2',
    meta2: '10m quick',
  },
  {
    dayKey: 'wednesday',
    day: 'Wednesday',
    emoji: '🍅',
    titleKey: 'simmer.landing.board.wednesday.title',
    title: 'Sourdough Tartines & Soup',
    bodyKey: 'simmer.landing.board.wednesday.body',
    body: 'Heirloom tomatoes on crusty sourdough with a roasted tomato bisque.',
    metaKey: 'simmer.landing.board.wednesday.meta',
    meta: 'Vegetarian',
    meta2Key: 'simmer.landing.board.wednesday.meta2',
    meta2: '25m fresh',
  },
  {
    dayKey: 'thursday',
    day: 'Thursday',
    emoji: '🍝',
    titleKey: 'simmer.landing.board.thursday.title',
    title: 'Slow Cooker Beef Ragu',
    bodyKey: 'simmer.landing.board.thursday.body',
    body: 'Melt-in-your-mouth beef over fresh pappardelle with rosemary.',
    metaKey: 'simmer.landing.board.thursday.meta',
    meta: 'Slow cooker',
    meta2Key: 'simmer.landing.board.thursday.meta2',
    meta2: '5 hrs, hands-off',
  },
  {
    dayKey: 'friday',
    day: 'Friday',
    emoji: '🍕',
    titleKey: 'simmer.landing.board.friday.title',
    title: 'Sheet-Pan Pizza Night',
    bodyKey: 'simmer.landing.board.friday.body',
    body: 'Crispy olive-oil crust, fresh mozzarella, basil, and chili flakes.',
    metaKey: 'simmer.landing.board.friday.meta',
    meta: 'Kitchen ritual',
    meta2Key: 'simmer.landing.board.friday.meta2',
    meta2: '20m bake',
  },
]

interface TriadCard {
  icon: string
  stepKey: string
  step: string
  titleKey: string
  title: string
  bodyKey: string
  body: string
  noteKey: string
  note: string
}

/** The design's "Mindful Kitchen Triad" — clipper, week, market drawer. */
const TRIAD: TriadCard[] = [
  {
    icon: 'content_cut',
    stepKey: 'simmer.landing.triad.clipper.step',
    step: '01 · The clipper',
    titleKey: 'simmer.landing.triad.clipper.title',
    title: 'One-Click Recipe Cleaner',
    bodyKey: 'simmer.landing.triad.clipper.body',
    body: 'Paste any recipe link and get clean ingredients, scaling, and crisp steps — no ads, no pop-ups, no life story.',
    noteKey: 'simmer.landing.triad.clipper.note',
    note: 'Works on blogs and recipe sites',
  },
  {
    icon: 'view_week',
    stepKey: 'simmer.landing.triad.week.step',
    step: '02 · The visual horizon',
    titleKey: 'simmer.landing.triad.week.title',
    title: 'The Single-Screen Week',
    bodyKey: 'simmer.landing.triad.week.body',
    body: "See Monday through Sunday at once. Drop a roast chicken into Monday, then carry the leftovers into Tuesday's grain bowl.",
    noteKey: 'simmer.landing.triad.week.note',
    note: 'Leftover planning built in',
  },
  {
    icon: 'shopping_basket',
    stepKey: 'simmer.landing.triad.drawer.step',
    step: '03 · The market drawer',
    titleKey: 'simmer.landing.triad.drawer.title',
    title: 'Self-Consolidating Grocery List',
    bodyKey: 'simmer.landing.triad.drawer.body',
    body: 'Half a cup of parmesan on Tuesday plus a cup on Friday becomes one exact wedge — merged, scaled, and sorted by aisle.',
    noteKey: 'simmer.landing.triad.drawer.note',
    note: 'Never backtrack through the store',
  },
]

interface MarketBucket {
  emoji: string
  labelKey: string
  label: string
  items: string
}

/** The design's "Market Checklist" side card — three example buckets. */
const MARKET_BUCKETS: MarketBucket[] = [
  {
    emoji: '🥬',
    labelKey: 'simmer.landing.market.produce',
    label: 'Produce',
    items: 'Heirloom tomatoes · fresh rosemary & thyme · lemons',
  },
  {
    emoji: '🧀',
    labelKey: 'simmer.landing.market.dairy',
    label: 'Dairy & cheese',
    items: 'Parmigiano wedge (merged ×2) · fresh mozzarella',
  },
  {
    emoji: '🥖',
    labelKey: 'simmer.landing.market.bakery',
    label: 'Bakery & pantry',
    items: 'Country sourdough boule · pappardelle',
  },
]

interface TierCard {
  featured: boolean
  nameKey: string
  name: string
  price: string
  periodKey: string
  period: string
  blurbKey: string
  blurb: string
  features: { key: string; value: string }[]
  ctaKey: string
  cta: string
  ctaTo: string
  ctaId: string
}

/** The design's landing pricing pair — full tiers live on /pricing. */
const TIERS: TierCard[] = [
  {
    featured: false,
    nameKey: 'simmer.landing.pricing.free.name',
    name: 'Simmer Free',
    price: '$0',
    periodKey: 'simmer.landing.pricing.free.period',
    period: '/ forever',
    blurbKey: 'simmer.landing.pricing.free.blurb',
    blurb: 'For curious home cooks testing the waters.',
    features: [
      { key: 'free.f1', value: 'Up to 15 saved recipes' },
      { key: 'free.f2', value: 'Weekly visual planner board' },
      { key: 'free.f3', value: 'Standard grocery list' },
    ],
    ctaKey: 'simmer.landing.pricing.free.cta',
    cta: 'Get started free',
    ctaTo: '/signup',
    ctaId: 'landing-plan-free-cta',
  },
  {
    featured: true,
    nameKey: 'simmer.landing.pricing.plus.name',
    name: 'Simmer Plus',
    price: '$7',
    periodKey: 'simmer.landing.pricing.plus.period',
    period: '/ month',
    blurbKey: 'simmer.landing.pricing.plus.blurb',
    blurb: 'The full operating system for peaceful family dinners.',
    features: [
      { key: 'plus.f1', value: 'Unlimited recipe imports' },
      { key: 'plus.f2', value: 'One-click recipe cleaner' },
      { key: 'plus.f3', value: 'Self-consolidating grocery drawer' },
      { key: 'plus.f4', value: 'Live household sync' },
      { key: 'plus.f5', value: 'Pantry exclusion & leftover intelligence' },
    ],
    ctaKey: 'simmer.landing.pricing.plus.cta',
    cta: 'Start 14-day calm trial',
    ctaTo: '/signup',
    ctaId: 'landing-plan-plus-cta',
  },
]

interface Testimonial {
  quoteKey: string
  quote: string
  nameKey: string
  name: string
  roleKey: string
  role: string
}

/** The design's three household testimonials. */
const TESTIMONIALS: Testimonial[] = [
  {
    quoteKey: 'simmer.landing.testimonials.elena.quote',
    quote:
      'The recipe cleaner alone is magic. It pulls the recipe straight off the blog — Sunday planning takes twelve minutes now.',
    nameKey: 'simmer.landing.testimonials.elena.name',
    name: 'Elena Rostova',
    roleKey: 'simmer.landing.testimonials.elena.role',
    role: 'Mom of two · Seattle',
  },
  {
    quoteKey: 'simmer.landing.testimonials.marcus.quote',
    quote:
      'We used to toss wilted herbs and half-used jars every Friday. The consolidated grocery drawer cut our food waste by at least a third.',
    nameKey: 'simmer.landing.testimonials.marcus.name',
    name: 'Marcus Lin',
    roleKey: 'simmer.landing.testimonials.marcus.role',
    role: 'Architect & avid cook · Brooklyn',
  },
  {
    quoteKey: 'simmer.landing.testimonials.sarah.quote',
    quote:
      "That exhausting 5:45 PM text exchange — 'what do you want for dinner?' — is completely extinct in our house.",
    nameKey: 'simmer.landing.testimonials.sarah.name',
    name: 'Sarah Wheeler',
    roleKey: 'simmer.landing.testimonials.sarah.role',
    role: 'Product designer · Austin',
  },
]

const AISLES: { emoji: string; key: string; defaultLabel: string; tone: string }[] = [
  {
    emoji: '🥬',
    key: 'produce',
    defaultLabel: 'Produce',
    tone: 'bg-primary-container border-primary/20 text-on-primary-container',
  },
  {
    emoji: '🍗',
    key: 'meat',
    defaultLabel: 'Meat',
    tone: 'bg-orange-50 border-orange-100 text-orange-800',
  },
  {
    emoji: '🐟',
    key: 'seafood',
    defaultLabel: 'Seafood',
    tone: 'bg-blue-50 border-blue-100 text-blue-800',
  },
  {
    emoji: '🥛',
    key: 'dairy',
    defaultLabel: 'Dairy & eggs',
    tone: 'bg-yellow-50 border-yellow-100 text-yellow-800',
  },
  {
    emoji: '🥖',
    key: 'bakery',
    defaultLabel: 'Bakery',
    tone: 'bg-amber-50 border-amber-100 text-amber-800',
  },
  {
    emoji: '🥫',
    key: 'pantry',
    defaultLabel: 'Pantry',
    tone: 'bg-slate-50 border-slate-100 text-slate-700',
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      className={cm.cn(
        'bg-surface text-on-surface antialiased selection:bg-primary selection:text-on-primary',
      )}
    >
      <nav
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 4),
          'fixed top-0 inset-x-0 z-50 bg-surface/80 backdrop-blur-md border-b border-primary-container shadow-sm',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            'max-w-7xl mx-auto h-16',
          )}
        >
          <SafeLink
            to="/"
            data-mol-id="landing-nav-brand"
            className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
          >
            <BrandWordmark as="span" />
          </SafeLink>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'hidden md:flex')}>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.sp('py', 2),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link
              to="/about"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.sp('py', 2),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/plan"
                data-mol-id="nav-go-to-dashboard"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'bg-accent text-on-accent rounded-lg hover:bg-accent/90 transition-colors shadow-sm',
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
                    cm.fontWeight('medium'),
                    cm.sp('py', 2),
                    'text-on-surface-variant hover:text-primary transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 2),
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    'bg-accent text-on-accent rounded-lg hover:bg-accent/90 transition-colors shadow-sm',
                  )}
                >
                  {t('common.startFree', {}, { defaultValue: 'Start free' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className={cm.cn('pt-24 pb-16')}>
        {/* Hero — centered editorial composition (Stitch design) */}
        <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 12), 'max-w-4xl mx-auto md:py-20')}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
              'text-center',
            )}
          >
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'inline-flex w-fit px-3.5 py-1.5 rounded-full bg-primary-container text-on-primary-container',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn('w-2 h-2 rounded-full bg-secondary inline-block')}
              />
              {t('simmer.landing.hero.eyebrow', {}, { defaultValue: 'Weekly meal planning' })}
            </span>
            <h1
              className={cm.cn(
                cm.fontWeight('semibold'),
                'font-headline text-5xl md:text-6xl tracking-tight text-on-surface leading-tight',
              )}
            >
              {t('simmer.landing.hero.title1', {}, { defaultValue: 'Cook less.' })}{' '}
              <span className={cm.cn('italic font-normal text-primary')}>
                {t('simmer.landing.hero.title2', {}, { defaultValue: 'Plan once.' })}
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                'text-on-surface-variant max-w-2xl leading-relaxed',
              )}
            >
              {t(
                'simmer.landing.hero.body',
                {},
                {
                  defaultValue:
                    'Save the recipes you love, drop them onto the week, and shop from a grocery list that writes itself. The 5pm dinner panic is over.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                'sm:flex-row justify-center',
              )}
            >
              <Link
                to="/signup"
                data-mol-id="landing-cta-signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('lg'),
                  'bg-accent text-on-accent rounded-lg hover:bg-accent/90 transition-colors shadow-sm inline-flex items-center justify-center',
                )}
              >
                {t('simmer.landing.hero.primary', {}, { defaultValue: 'Get started — free' })}
              </Link>
              <a
                href="#features"
                data-mol-id="landing-cta-features"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('lg'),
                  'rounded-lg text-secondary bg-surface border-[1.5px] border-secondary hover:bg-secondary/10 transition-colors',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn('material-symbols-outlined text-secondary')}
                >
                  play_circle
                </span>
                {t('simmer.landing.hero.secondary', {}, { defaultValue: 'See how it works' })}
              </a>
            </div>
          </div>

          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'relative max-w-md mx-auto w-full mt-12',
            )}
          >
            <div
              className={cm.cn(
                'absolute inset-0 bg-primary-container rounded-full blur-3xl opacity-50',
              )}
              aria-hidden="true"
            />
            {/* Mini week preview — a static echo of the real plan grid. */}
            <div
              className={cm.cn(
                'relative z-10 w-full bg-surface rounded-2xl shadow-xl border border-primary-container p-5',
              )}
            >
              <div
                className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
              >
                <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                  {t('simmer.landing.hero.cardTitle', {}, { defaultValue: 'This week' })}
                </p>
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'rounded-full bg-primary-container text-on-primary-container',
                  )}
                >
                  {t('simmer.landing.hero.cardBadge', {}, { defaultValue: '7 dinners planned' })}
                </span>
              </div>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                {(
                  [
                    { emoji: '🍝', label: 'Mon' },
                    { emoji: '🍗', label: 'Tue' },
                    { emoji: '🌮', label: 'Wed' },
                    { emoji: '🐟', label: 'Thu' },
                  ] as const
                ).map((row) => (
                  <div
                    key={row.label}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'rounded-lg bg-surface-variant/60',
                    )}
                  >
                    <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant w-8')}>
                      {row.label}
                    </span>
                    <span aria-hidden="true">{row.emoji}</span>
                    <span className={cm.cn('flex-1 h-2 rounded-full bg-primary/20')} />
                    <span
                      aria-hidden="true"
                      className={cm.cn('material-symbols-outlined text-base text-primary')}
                    >
                      check_circle
                    </span>
                  </div>
                ))}
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('mt', 4),
                  cm.sp('pt', 4),
                  'border-t border-outline/40',
                )}
              >
                <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('simmer.landing.hero.listHint', {}, { defaultValue: 'Grocery list ready' })}
                </span>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'text-primary',
                  )}
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                    shopping_cart
                  </span>
                  23
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Demo board — the design's one-screen week showcase (static echo) */}
        <section
          id="demo-board"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 12),
            'bg-surface-secondary border-y border-outline/30',
          )}
        >
          <div className={cm.cn('max-w-7xl mx-auto')}>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.textCenter,
                cm.sp('mb', 10),
                'max-w-2xl mx-auto',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'inline-flex w-fit mx-auto px-3.5 py-1.5 rounded-full bg-primary-container text-on-primary-container',
                )}
              >
                <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                  calendar_month
                </span>
                {t('simmer.landing.board.eyebrow', {}, { defaultValue: 'The week at a glance' })}
              </span>
              <h2
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  'font-headline text-3xl md:text-4xl tracking-tight text-on-surface',
                )}
              >
                {t(
                  'simmer.landing.board.heading',
                  {},
                  { defaultValue: 'Five dinners, decided in one sitting' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
                {t(
                  'simmer.landing.board.body',
                  {},
                  {
                    defaultValue:
                      'Plan Sunday, coast all week — every dinner lands on one board with its time, batch notes, and ingredient count.',
                  },
                )}
              </p>
            </div>
            <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4')}>
              {DEMO_WEEK.map((day) => (
                <div
                  key={day.dayKey}
                  data-mol-id={`landing-demo-board-${day.dayKey}`}
                  className={cm.cn(
                    cm.sp('p', 5),
                    cm.flex({ direction: 'col', gap: 'sm' }),
                    'bg-surface rounded-2xl border border-outline/40 shadow-sm',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'uppercase tracking-wider text-on-surface-variant',
                      )}
                    >
                      {t(`simmer.landing.board.${day.dayKey}`, {}, { defaultValue: day.day })}
                    </span>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'rounded bg-secondary-container text-on-secondary-container',
                      )}
                    >
                      {t('simmer.landing.board.dinner', {}, { defaultValue: 'Dinner' })}
                    </span>
                  </div>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'w-14 h-14 rounded-xl bg-primary-container text-3xl',
                    )}
                    aria-hidden="true"
                  >
                    {day.emoji}
                  </div>
                  <h3 className={cm.cn(cm.fontWeight('bold'), 'text-on-surface leading-snug')}>
                    {t(day.titleKey, {}, { defaultValue: day.title })}
                  </h3>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant flex-1')}>
                    {t(day.bodyKey, {}, { defaultValue: day.body })}
                  </p>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'xs' }),
                      cm.sp('pt', 3),
                      'border-t border-outline/30',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'text-primary',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cm.cn('material-symbols-outlined text-sm')}
                      >
                        soup_kitchen
                      </span>
                      {t(day.metaKey, {}, { defaultValue: day.meta })}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(day.meta2Key, {}, { defaultValue: day.meta2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section
          className={cm.cn('bg-gradient-to-r from-primary-dark to-primary py-12 text-white')}
        >
          <div
            className={cm.cn(
              cm.sp('px', 6),
              'max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:divide-x divide-white/30',
            )}
          >
            {[
              { value: '50,000+', key: 'households', defaultLabel: 'households planning' },
              { value: '3.2M', key: 'meals', defaultLabel: 'meals planned' },
              { value: '4h', key: 'saved', defaultLabel: 'saved per week on average' },
            ].map((s) => (
              <div key={s.key} className={cm.cn('pt-6 md:pt-0')}>
                <p className={cm.cn('text-4xl font-black tabular-nums tracking-tight')}>
                  {s.value}
                </p>
                <p className={cm.cn('text-white/80 mt-2 font-medium')}>
                  {t(`simmer.landing.stats.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature grid */}
        <section
          id="features"
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 12), 'max-w-7xl mx-auto')}
        >
          <div
            className={cm.cn(
              cm.textCenter,
              cm.sp('mb', 12),
              cm.flex({ direction: 'col', gap: 'sm' }),
              'max-w-2xl mx-auto',
            )}
          >
            <h2
              className={cm.cn(
                cm.fontWeight('semibold'),
                'font-headline text-3xl md:text-4xl tracking-tight text-on-surface',
              )}
            >
              {t(
                'simmer.landing.features.heading',
                {},
                { defaultValue: 'From recipe box to shopping cart' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
              {t(
                'simmer.landing.features.body',
                {},
                {
                  defaultValue:
                    'One calm loop: save a recipe, plan it onto the week, shop the list it generates, tick items off.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-6')}>
            <div
              className={cm.cn(
                cm.sp('p', 8),
                'md:col-span-2 bg-surface-variant rounded-2xl border border-outline/50 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group',
              )}
            >
              <div
                className={cm.cn(
                  'absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity',
                )}
                aria-hidden="true"
              >
                <span
                  className={cm.cn('material-symbols-outlined text-9xl text-primary')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  calendar_month
                </span>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.sp('mb', 6),
                  'relative z-10 w-12 h-12 bg-surface rounded-full text-primary shadow-sm',
                )}
              >
                <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                  calendar_month
                </span>
              </div>
              <h3
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 2),
                  'text-on-surface relative z-10',
                )}
              >
                {t(
                  'simmer.landing.features.weekGrid.title',
                  {},
                  { defaultValue: 'The week on one screen' },
                )}
              </h3>
              <p className={cm.cn('text-on-surface-variant relative z-10 max-w-md')}>
                {t(
                  'simmer.landing.features.weekGrid.body',
                  {},
                  {
                    defaultValue:
                      'A seven-day grid with breakfast, lunch, and dinner slots. Drop a recipe into any slot, scale it to your household, and swap days around as plans change — the grocery list keeps up automatically.',
                  },
                )}
              </p>
            </div>
            {FEATURES.map((f) => (
              <div
                key={f.icon}
                className={cm.cn(
                  cm.sp('p', 8),
                  'bg-surface rounded-2xl border border-outline shadow-sm hover:shadow-md transition-shadow',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.sp('mb', 6),
                    'w-12 h-12 bg-primary-container rounded-full text-primary',
                  )}
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 2),
                    'text-on-surface',
                  )}
                >
                  {t(f.titleKey, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn('text-on-surface-variant')}>
                  {t(f.bodyKey, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* The Mindful Kitchen Triad — the design's three habits */}
        <section
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 12),
            'bg-surface-secondary border-y border-outline/30',
          )}
        >
          <div className={cm.cn('max-w-7xl mx-auto')}>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.textCenter,
                cm.sp('mb', 10),
                'max-w-2xl mx-auto',
              )}
            >
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-wider text-primary',
                )}
              >
                {t('simmer.landing.triad.eyebrow', {}, { defaultValue: 'Thoughtful architecture' })}
              </span>
              <h2
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  'font-headline text-3xl md:text-4xl tracking-tight text-on-surface',
                )}
              >
                {t(
                  'simmer.landing.triad.heading',
                  {},
                  { defaultValue: 'The Mindful Kitchen Triad' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
                {t(
                  'simmer.landing.triad.body',
                  {},
                  {
                    defaultValue:
                      'Built for how people actually cook — three habits, one calm weekly loop.',
                  },
                )}
              </p>
            </div>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-6')}>
              {TRIAD.map((card) => (
                <div
                  key={card.icon}
                  className={cm.cn(
                    cm.sp('p', 8),
                    cm.flex({ direction: 'col', gap: 'sm' }),
                    'bg-surface rounded-2xl border border-outline/40 shadow-sm',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'w-12 h-12 rounded-xl bg-primary-container text-primary',
                      )}
                    >
                      <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                        {card.icon}
                      </span>
                    </div>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'uppercase tracking-wider text-on-surface-variant',
                      )}
                    >
                      {t(card.stepKey, {}, { defaultValue: card.step })}
                    </span>
                  </div>
                  <h3
                    className={cm.cn(
                      cm.textSize('lg'),
                      cm.fontWeight('bold'),
                      'text-on-surface mt-2',
                    )}
                  >
                    {t(card.titleKey, {}, { defaultValue: card.title })}
                  </h3>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant flex-1')}>
                    {t(card.bodyKey, {}, { defaultValue: card.body })}
                  </p>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'text-secondary',
                    )}
                  >
                    <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-sm')}>
                      check_circle
                    </span>
                    {t(card.noteKey, {}, { defaultValue: card.note })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Smart aisle routing — walk in, grab, leave */}
        <section
          id="groceries"
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 12), 'max-w-7xl mx-auto')}
        >
          <div className={cm.cn('grid grid-cols-1 lg:grid-cols-2 gap-10 items-center')}>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-wider text-primary',
                )}
              >
                <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                  checklist
                </span>
                {t('simmer.landing.market.eyebrow', {}, { defaultValue: 'Smart aisle routing' })}
              </span>
              <h2
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  'font-headline text-3xl md:text-4xl tracking-tight text-on-surface leading-tight',
                )}
              >
                {t(
                  'simmer.landing.market.heading',
                  {},
                  {
                    defaultValue: 'Walk in, grab, leave. Zero zig-zagging back to produce.',
                  },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
                {t(
                  'simmer.landing.market.body',
                  {},
                  {
                    defaultValue:
                      'Paper lists scribble out of order, and phone notes make you scroll up and down the dairy aisle. Simmer compiles every planned dinner into clean, aisle-by-aisle buckets.',
                  },
                )}
              </p>
              <ul
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  'list-none',
                  cm.sp('mt', 2),
                )}
              >
                {(
                  [
                    {
                      key: 'merging',
                      strong: 'Intelligent unit merging —',
                      body: 'teaspoons, cups, and grams become real market package sizes.',
                    },
                    {
                      key: 'sync',
                      strong: 'Partner live sync —',
                      body: 'cross off lemons on your phone while your partner grabs olive oil.',
                    },
                    {
                      key: 'pantry',
                      strong: 'Pantry check —',
                      body: 'salt, pepper, and oil stay off the list unless you say otherwise.',
                    },
                  ] as const
                ).map((row) => (
                  <li
                    key={row.key}
                    className={cm.cn(
                      cm.flex({ align: 'start', gap: 'xs' }),
                      cm.textSize('sm'),
                      'text-on-surface-variant',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cm.cn('material-symbols-outlined text-base text-primary mt-0.5')}
                    >
                      check
                    </span>
                    <span>
                      <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                        {t(
                          `simmer.landing.market.${row.key}.strong`,
                          {},
                          { defaultValue: row.strong },
                        )}
                      </span>{' '}
                      {t(`simmer.landing.market.${row.key}.body`, {}, { defaultValue: row.body })}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                data-mol-id="landing-cta-grocery"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'w-fit bg-accent text-on-accent rounded-lg hover:bg-accent/90 transition-colors shadow-sm mt-2',
                )}
              >
                {t(
                  'simmer.landing.market.cta',
                  {},
                  { defaultValue: 'Experience the calm shopping drawer' },
                )}
                <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                  arrow_forward
                </span>
              </Link>
            </div>
            {/* Market checklist card */}
            <div
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface rounded-2xl border border-outline/40 shadow-sm',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                  cm.sp('pb', 4),
                  cm.sp('mb', 4),
                  'border-b border-outline/30',
                )}
              >
                <h3
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.textSize('lg'),
                    cm.fontWeight('bold'),
                    'text-on-surface',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn('material-symbols-outlined text-primary')}
                  >
                    checklist
                  </span>
                  {t('simmer.landing.market.cardTitle', {}, { defaultValue: 'Market Checklist' })}
                </h3>
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'rounded-full bg-have-it-light text-have-it',
                  )}
                >
                  {t('simmer.landing.market.collected', {}, { defaultValue: '14 of 21 collected' })}
                </span>
              </div>
              <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'list-none')}>
                {MARKET_BUCKETS.map((bucket) => (
                  <li
                    key={bucket.labelKey}
                    className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }))}
                  >
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'w-10 h-10 flex-none rounded-lg bg-surface-variant text-xl',
                      )}
                      aria-hidden="true"
                    >
                      {bucket.emoji}
                    </div>
                    <div>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'uppercase tracking-wider text-on-surface-variant',
                        )}
                      >
                        {t(bucket.labelKey, {}, { defaultValue: bucket.label })}
                      </p>
                      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>{bucket.items}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Aisles */}
        <section
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 6), 'max-w-7xl mx-auto overflow-hidden')}
        >
          <div className={cm.cn(cm.flex({ gap: 'sm' }), 'overflow-x-auto pb-4 hide-scrollbar')}>
            {AISLES.map((c) => (
              <span
                key={c.key}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('medium'),
                  'flex-none rounded-full border',
                  c.tone,
                )}
              >
                <span aria-hidden="true">{c.emoji}</span>
                {t(`simmer.landing.aisles.${c.key}`, {}, { defaultValue: c.defaultLabel })}
              </span>
            ))}
          </div>
        </section>

        {/* Testimonials — Calm Dinners, Real Tables */}
        <section
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 12),
            'bg-surface-secondary border-y border-outline/30',
          )}
        >
          <div className={cm.cn('max-w-7xl mx-auto')}>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.textCenter,
                cm.sp('mb', 10),
                'max-w-2xl mx-auto',
              )}
            >
              <h2
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  'font-headline text-3xl md:text-4xl tracking-tight text-on-surface',
                )}
              >
                {t(
                  'simmer.landing.testimonials.heading',
                  {},
                  { defaultValue: 'Calm Dinners, Real Tables' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
                {t(
                  'simmer.landing.testimonials.body',
                  {},
                  {
                    defaultValue:
                      'How one calm planning hour changes the atmosphere of weeknight cooking.',
                  },
                )}
              </p>
            </div>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-6')}>
              {TESTIMONIALS.map((item) => (
                <figure
                  key={item.nameKey}
                  className={cm.cn(
                    cm.sp('p', 8),
                    cm.flex({ direction: 'col', gap: 'md' }),
                    'bg-surface rounded-2xl border border-outline/40 shadow-sm',
                  )}
                >
                  <div
                    className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
                    aria-label={t(
                      'simmer.landing.testimonials.starsLabel',
                      {},
                      { defaultValue: 'Five star rating' },
                    )}
                  >
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        aria-hidden="true"
                        className={cm.cn('material-symbols-outlined text-base text-accent')}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    ))}
                  </div>
                  <blockquote
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface leading-relaxed flex-1')}
                  >
                    “{t(item.quoteKey, {}, { defaultValue: item.quote })}”
                  </blockquote>
                  <figcaption className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'w-10 h-10 rounded-full bg-primary-container text-primary font-bold',
                      )}
                      aria-hidden="true"
                    >
                      {item.name
                        .split(' ')
                        .map((w) => w[0])
                        .join('')}
                    </div>
                    <div>
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                          'text-on-surface',
                        )}
                      >
                        {t(item.nameKey, {}, { defaultValue: item.name })}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(item.roleKey, {}, { defaultValue: item.role })}
                      </p>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing teaser — Invest in kitchen sanity (full tiers on /pricing) */}
        <section
          id="pricing"
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 12), 'max-w-7xl mx-auto')}
        >
          <div className={cm.cn('max-w-7xl mx-auto')}>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.textCenter,
                cm.sp('mb', 10),
                'max-w-2xl mx-auto',
              )}
            >
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-wider text-primary',
                )}
              >
                {t('simmer.landing.pricing.eyebrow', {}, { defaultValue: 'Simple economics' })}
              </span>
              <h2
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  'font-headline text-3xl md:text-4xl tracking-tight text-on-surface',
                )}
              >
                {t(
                  'simmer.landing.pricing.heading',
                  {},
                  { defaultValue: 'Invest in kitchen sanity' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
                {t(
                  'simmer.landing.pricing.body',
                  {},
                  {
                    defaultValue:
                      'One wasted grocery run pays for a whole year of Simmer. Start free — no credit card required.',
                  },
                )}
              </p>
            </div>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto')}>
              {TIERS.map((tier) => (
                <div
                  key={tier.nameKey}
                  className={cm.cn(
                    cm.sp('p', 8),
                    cm.flex({ direction: 'col', gap: 'md' }),
                    'rounded-2xl border shadow-sm',
                    tier.featured
                      ? 'bg-primary-container border-primary/30'
                      : 'bg-surface border-outline/40',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                    <h3
                      className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}
                    >
                      {t(tier.nameKey, {}, { defaultValue: tier.name })}
                    </h3>
                    {tier.featured ? (
                      <span
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'uppercase tracking-wider rounded-full bg-accent text-on-accent',
                        )}
                      >
                        {t('simmer.landing.pricing.badge', {}, { defaultValue: 'Most calm' })}
                      </span>
                    ) : null}
                  </div>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(tier.blurbKey, {}, { defaultValue: tier.blurb })}
                  </p>
                  <p className={cm.cn(cm.flex({ align: 'baseline', gap: 'xs' }))}>
                    <span className={cm.cn('text-4xl font-black text-on-surface tracking-tight')}>
                      {tier.price}
                    </span>
                    <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t(tier.periodKey, {}, { defaultValue: tier.period })}
                    </span>
                  </p>
                  <ul
                    className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'list-none flex-1')}
                  >
                    {tier.features.map((f) => (
                      <li
                        key={f.key}
                        className={cm.cn(
                          cm.flex({ align: 'start', gap: 'xs' }),
                          cm.textSize('sm'),
                          'text-on-surface',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cm.cn(
                            'material-symbols-outlined text-base mt-0.5',
                            tier.featured ? 'text-primary' : 'text-have-it',
                          )}
                        >
                          check
                        </span>
                        {f.value}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={tier.ctaTo}
                    data-mol-id={tier.ctaId}
                    className={cm.cn(
                      cm.sp('py', 3),
                      cm.fontWeight('semibold'),
                      'rounded-lg text-center transition-colors shadow-sm',
                      tier.featured
                        ? 'bg-accent text-on-accent hover:bg-accent/90'
                        : 'bg-surface-variant text-on-surface hover:bg-outline',
                    )}
                  >
                    {t(tier.ctaKey, {}, { defaultValue: tier.cta })}
                  </Link>
                </div>
              ))}
            </div>
            <p className={cm.cn(cm.textCenter, cm.sp('mt', 6))}>
              <Link
                to="/pricing"
                data-mol-id="landing-pricing-link"
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'text-primary hover:underline',
                )}
              >
                {t(
                  'simmer.landing.pricing.compare',
                  {},
                  { defaultValue: 'Compare every plan and limit →' },
                )}
              </Link>
            </p>
          </div>
        </section>

        {/* CTA */}
        <section
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 12), 'max-w-4xl mx-auto text-center')}
        >
          <div
            className={cm.cn(
              cm.sp('p', 12),
              'bg-primary-container rounded-3xl border border-primary/20 shadow-sm relative overflow-hidden',
            )}
          >
            <div
              className={cm.cn(
                'absolute -top-24 -right-24 w-64 h-64 bg-primary/30 rounded-full mix-blend-multiply blur-3xl opacity-50',
              )}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                'absolute -bottom-24 -left-24 w-64 h-64 bg-accent/30 rounded-full mix-blend-multiply blur-3xl opacity-50',
              )}
              aria-hidden="true"
            />
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'relative z-10')}>
              <h2
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  'font-headline text-4xl md:text-5xl text-on-surface tracking-tight',
                )}
              >
                {t(
                  'simmer.landing.cta.title',
                  {},
                  { defaultValue: 'Reclaim your evenings this coming Sunday.' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('xl'), 'text-on-surface-variant max-w-xl mx-auto')}>
                {t(
                  'simmer.landing.cta.body',
                  {},
                  {
                    defaultValue:
                      'Join thousands of cooks who retired the 6 PM dinner panic. Plan once in fifteen minutes and coast through Friday.',
                  },
                )}
              </p>
              <div className={cm.cn(cm.flex({ justify: 'center', gap: 'sm' }))}>
                <Link
                  to="/signup"
                  data-mol-id="landing-cta-bottom-signup"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    'bg-accent text-on-accent rounded-lg hover:bg-accent/90 transition-colors shadow-sm',
                  )}
                >
                  {t(
                    'simmer.landing.cta.primary',
                    {},
                    { defaultValue: 'Create your free account' },
                  )}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 12),
          'bg-surface-secondary border-t border-primary-container',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'between', align: 'center', gap: 'lg' }),
            'max-w-7xl mx-auto md:flex-row',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
              'md:items-start',
            )}
          >
            <BrandWordmark as="span" size="sm" footer />
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'simmer.landing.footer.tagline',
                { app: APP_NAME, tagline: APP_TAGLINE },
                { defaultValue: '© {{app}} — {{tagline}}.' },
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
          </div>
          <div
            className={cm.cn(
              cm.flex({ wrap: 'wrap', justify: 'center', align: 'center', gap: 'lg' }),
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            <Link
              to="/about"
              className={cm.cn(cm.sp('py', 2), 'inline-block hover:text-primary transition-colors')}
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            <Link
              to="/pricing"
              className={cm.cn(cm.sp('py', 2), 'inline-block hover:text-primary transition-colors')}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link
              to="/terms"
              className={cm.cn(cm.sp('py', 2), 'inline-block hover:text-primary transition-colors')}
            >
              {t('nav.terms', {}, { defaultValue: 'Terms' })}
            </Link>
            <Link
              to="/privacy"
              className={cm.cn(cm.sp('py', 2), 'inline-block hover:text-primary transition-colors')}
            >
              {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            </Link>
            <Link
              to="/login"
              className={cm.cn(cm.sp('py', 2), 'inline-block hover:text-primary transition-colors')}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link
              to="/signup"
              className={cm.cn(cm.sp('py', 2), 'inline-block hover:text-primary transition-colors')}
            >
              {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
