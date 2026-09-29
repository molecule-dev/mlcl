import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BookCover } from '../components/BookCover.js'
import { Footer } from '../components/Footer.js'
import { LandingNav } from '../components/LandingNav.js'

const PILLARS = [
  {
    key: 'noStreakShaming',
    icon: 'hotel_class',
    meta: 'Flexible tempos • Ambient reading logs',
  },
  {
    key: 'messyReality',
    icon: 'shelves',
    meta: 'DNF with dignity • Multi-surface libraries',
  },
  {
    key: 'futureSelf',
    icon: 'ink_pen',
    meta: 'Text quotes • Marginalia • Searchable memories',
  },
] as const

const CADENCE_BARS = [
  { key: 'w1', height: 30, tone: 'bg-surface-container-low', label: 'text-outline' },
  { key: 'w2', height: 60, tone: 'bg-surface-container', label: 'text-outline' },
  // Opaque sage — translucent fills dropped the white in-bar label under
  // 4.5:1 (axe color-contrast, serious).
  { key: 'w3', height: 88, tone: 'bg-secondary', label: 'text-on-secondary' },
  { key: 'w4', height: 100, tone: 'bg-primary', label: 'text-on-primary' },
  { key: 'w5', height: 40, tone: 'bg-surface-container', label: 'text-outline' },
  { key: 'w6', height: 70, tone: 'bg-secondary-container', label: 'text-on-secondary-fixed' },
] as const

const INTENT_SHELVES = [
  { key: 'thematic', count: '8 books', title: 'Autumn Rain Reads' },
  { key: 'intellectual', count: '5 books', title: 'Philosophy of Science' },
  { key: 'ledger', count: '12 volumes', title: 'Books Borrowed & Returned' },
  { key: 'archival', count: '3 volumes', title: 'Abandoned with Respect' },
] as const

const PILLAR_DEFAULTS = {
  noStreakShaming: {
    title: 'No streak shaming',
    body: 'Life happens. Work swells, illness arrives, or summer invites you outdoors. There are no punitive red flames, no resetting counters, and no algorithmic alerts telling you that you have failed your book.',
  },
  messyReality: {
    title: 'Shelves for messy reality',
    body: 'We never read one solitary book strictly from chapter one to index. Track the paperback in your coat pocket, the heavy folio on your desk, the poetry collection read out of sequence, and books abandoned with intellectual grace.',
  },
  futureSelf: {
    title: 'For your future self',
    body: 'Condensing six hundred pages into a rushed four-star review erases genuine nuance. The shelf archives the sentences that arrested you, the season you read them in, and reflections you will actually appreciate in ten years.',
  },
} as const

const PACING_CHECK_DEFAULTS = {
  gentleRhythm: 'Gentle pages-per-day rhythm based on books you actually love',
  seasonalSpreads: 'Visual seasonal spreads instead of red overdue alerts',
  driftingDates: 'Estimated finish dates that drift forward without judgment',
} as const

const INTENT_SHELF_KIND_DEFAULTS = {
  thematic: 'Thematic shelf',
  intellectual: 'Intellectual shelf',
  ledger: 'Physical ledger',
  archival: 'Archival shelf',
} as const

const INTENT_SHELF_BODY_DEFAULTS = {
  thematic: 'Fireside essays, Irish novels, and damp country estate mysteries.',
  intellectual: 'Slow reads to accompany seminar notebooks and morning walks.',
  ledger: 'Remembering whose shelf it came from, and which note you tucked inside.',
  archival: 'Not every book meets its season. Archived without regret or guilt.',
} as const

const STATS = [
  { key: 'challenge', defaultLabel: 'Reading challenges finished', value: '31k+' },
  { key: 'pages', defaultLabel: 'Pages logged', value: '9.2M' },
  { key: 'reviews', defaultLabel: 'Reviews written', value: '480k' },
  { key: 'rating', defaultLabel: 'Average member rating', value: '4.7★' },
]

const SOCIAL_PROOF = [
  { value: '61k+', label: 'Readers tracking' },
  { value: '4.8★', label: 'iOS App Store rating' },
  { value: '88%', label: 'Hit their goal' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <LandingNav />

      <main>
        <section className={cm.cn(cm.sp('py', 24), 'relative overflow-hidden')}>
          <div
            className={cm.cn(
              'absolute -top-40 -right-40 w-[28rem] h-[28rem] rounded-full blur-3xl',
            )}
            style={{ background: 'color-mix(in srgb, var(--color-primary) 18%, transparent)' }}
          />
          <div
            className={cm.cn(
              'absolute -bottom-40 -left-40 w-[28rem] h-[28rem] rounded-full blur-3xl',
            )}
            style={{ background: 'color-mix(in srgb, var(--color-secondary) 18%, transparent)' }}
          />
          <div
            className={cm.cn(
              cm.maxW('5xl'),
              cm.sp('px', 6),
              cm.mxAuto,
              cm.textCenter,
              'relative z-10',
            )}
          >
            <span
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.sp('mb', 6),
                'inline-flex items-center gap-2 rounded-full bg-surface-container border border-outline-variant text-secondary text-[11px] font-semibold uppercase tracking-wider',
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" aria-hidden="true" />
              {t('landing.eyebrow', {}, { defaultValue: 'Every book. Every page. One shelf.' })}
            </span>
            <h1
              className={cm.cn(
                'text-4xl md:text-5xl font-normal tracking-[-0.02em] leading-[1.15] text-primary max-w-4xl mx-auto',
              )}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}.' })}
              <br className="hidden md:block" />
              <span className="italic text-secondary">
                {t(
                  'landing.heroTitleAccent',
                  {},
                  { defaultValue: 'Build a reading life worth remembering.' },
                )}
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                cm.sp('mt', 6),
                cm.sp('mb', 8),
                'text-on-surface-variant',
                cm.maxW('2xl'),
                cm.mxAuto,
              )}
            >
              {t(
                'landing.heroSubtitle',
                {},
                {
                  defaultValue:
                    'Shelve what you are reading, log the page you stopped on, rate it when it is done — and watch the yearly challenge ring close, book by book.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'md' }))}>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'py-3.5 text-on-primary rounded hover:opacity-90 transition-all inline-flex items-center gap-2 shadow-sm',
                )}
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {t('landing.heroCta', {}, { defaultValue: 'Start your library' })}
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'py-3.5 rounded border border-outline text-on-surface hover:bg-surface-container transition-colors',
                )}
              >
                {t('landing.heroCtaSecondary', {}, { defaultValue: 'See it live' })}
              </Link>
            </div>
            <div
              className={cm.cn(
                cm.sp('mt', 12),
                cm.flex({ align: 'center', justify: 'center', gap: 'lg' }),
                'flex-wrap',
              )}
            >
              {SOCIAL_PROOF.map((s) => (
                <div key={s.label} className={cm.cn(cm.flex({ align: 'baseline', gap: 'xs' }))}>
                  <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>{s.value}</span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'text-on-surface-variant uppercase tracking-widest',
                    )}
                  >
                    {t(`landing.proof.${s.label}`, {}, { defaultValue: s.label })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Desk-library showcase — the active shelf with status chips */}
        <section className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('pb', 16), cm.mxAuto)}>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 md:p-8">
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
                'border-b border-outline-variant pb-5 mb-8 text-left',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                <div className="p-2 rounded bg-surface-container-low text-primary">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    menu_book
                  </span>
                </div>
                <div>
                  <h2
                    className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-primary')}
                    style={{ fontFamily: 'var(--font-headline)' }}
                  >
                    {t('landing.shelfTitle', {}, { defaultValue: 'Desk library · late autumn' })}
                  </h2>
                  <p className="text-[12px] font-semibold tracking-wide text-on-surface-variant">
                    {t(
                      'landing.shelfSubtitle',
                      {},
                      { defaultValue: 'The current stacks on your table' },
                    )}
                  </p>
                </div>
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                <span className="px-2.5 py-1 rounded bg-secondary-container text-on-secondary-fixed text-[11px] font-semibold">
                  {t('landing.shelfChipInProgress', {}, { defaultValue: '3 in progress' })}
                </span>
                <span className="px-2.5 py-1 rounded bg-surface-container text-on-surface-variant text-[11px] font-semibold">
                  {t('landing.shelfChipPaused', {}, { defaultValue: '1 paused guilt-free' })}
                </span>
              </div>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'end', justify: 'center', gap: 'lg' }),
                // Four lg covers overflow a 390px viewport — wrap like a real
                // shelf instead of widening the page.
                'flex-wrap',
              )}
            >
              <BookCover
                title="The Left Hand of Darkness"
                author="Ursula K. Le Guin"
                coverStyle="indigo"
                size="lg"
              />
              <BookCover title="Piranesi" author="Susanna Clarke" coverStyle="teal" size="lg" />
              <BookCover
                title="Braiding Sweetgrass"
                author="Robin Wall Kimmerer"
                coverStyle="forest"
                size="lg"
              />
              <BookCover title="Babel" author="R. F. Kuang" coverStyle="plum" size="lg" />
            </div>
            {/* Margin-note strip */}
            <div className="mt-8 pt-6 border-t border-outline-variant flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-surface-container-low p-4 rounded-lg text-left">
              <div className={cm.cn(cm.flex({ align: 'start', gap: 3 }))}>
                <span
                  className="material-symbols-outlined text-secondary mt-0.5"
                  aria-hidden="true"
                >
                  edit_note
                </span>
                <div>
                  <p
                    className={cm.cn(cm.textSize('base'), 'text-primary italic')}
                    style={{ fontFamily: 'var(--font-headline)' }}
                  >
                    {t(
                      'landing.marginQuote',
                      {},
                      {
                        defaultValue:
                          'There is no great feeling like picking up a volume you laid aside four months ago, and sliding in as though it were yesterday.',
                      },
                    )}
                  </p>
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-on-surface-variant mt-1 block">
                    {t(
                      'landing.marginSource',
                      {},
                      { defaultValue: 'Margin log · autumn notebook' },
                    )}
                  </span>
                </div>
              </div>
              <a
                href="#features"
                className="shrink-0 text-[12px] font-semibold text-secondary hover:text-primary flex items-center gap-1"
              >
                {t('landing.marginLink', {}, { defaultValue: 'View your margin notes' })}
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  chevron_right
                </span>
              </a>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
          <div className={cm.grid({ cols: 4, gap: 'md' })}>
            {STATS.map((s) => (
              <div
                key={s.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant text-center hover:-translate-y-0.5 transition-transform',
                )}
              >
                <p
                  className={cm.cn('text-3xl font-medium tracking-tight')}
                  style={{ fontFamily: 'var(--font-headline)', color: 'var(--color-primary)' }}
                >
                  {s.value}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.sp('mt', 2),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(`landing.stat.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* The Shelf Philosophy — three pillars */}
        <section
          id="philosophy"
          className={cm.cn(
            'border-y border-outline-variant bg-surface-container-low',
            cm.sp('py', 20),
          )}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.mxAuto)}>
            <div className={cm.maxW('2xl')}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary mb-2">
                {t('landing.philosophyEyebrow', {}, { defaultValue: 'The core principles' })}
              </p>
              <h2
                className={cm.cn(
                  'text-3xl md:text-4xl font-medium tracking-[-0.01em] text-primary',
                )}
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                {t('landing.philosophyTitle', {}, { defaultValue: 'Reading is a sanctuary,' })}{' '}
                <span className="italic">
                  {t(
                    'landing.philosophyTitleAccent',
                    {},
                    { defaultValue: 'not an algorithmic sprint.' },
                  )}
                </span>
              </h2>
              <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 3), 'text-on-surface-variant')}>
                {t(
                  'landing.philosophyBody',
                  { app: APP_NAME },
                  {
                    defaultValue:
                      'Most book trackers borrow mechanisms from corporate sales quotas and fitness rings. {{app}} is built on classic book preservation and human curiosity.',
                  },
                )}
              </p>
            </div>
            <div className={cm.cn(cm.grid({ cols: 3, gap: 'lg' }), cm.sp('mt', 12))}>
              {PILLARS.map((p) => (
                <div
                  key={p.key}
                  className={cm.cn(
                    cm.sp('p', 8),
                    'bg-surface-container-lowest rounded-xl border border-outline-variant text-left',
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary mb-6">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {p.icon}
                    </span>
                  </div>
                  <h3
                    className={cm.cn(
                      cm.textSize('base'),
                      cm.fontWeight('semibold'),
                      'text-primary',
                      cm.sp('mb', 3),
                    )}
                  >
                    {t(
                      `landing.pillar.${p.key}.title`,
                      {},
                      { defaultValue: PILLAR_DEFAULTS[p.key].title },
                    )}
                  </h3>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      'text-on-surface-variant leading-relaxed',
                      cm.sp('mb', 4),
                    )}
                  >
                    {t(
                      `landing.pillar.${p.key}.body`,
                      { app: APP_NAME },
                      { defaultValue: PILLAR_DEFAULTS[p.key].body },
                    )}
                  </p>
                  <div className="pt-4 border-t border-outline-variant text-[11px] font-semibold text-secondary">
                    {t(`landing.pillar.${p.key}.meta`, {}, { defaultValue: p.meta })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Crafted instruments — feature deep-divives */}
        <section
          id="features"
          className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto)}
        >
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 16), cm.maxW('2xl'), cm.mxAuto)}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary mb-2">
              {t(
                'landing.instrumentsEyebrow',
                {},
                { defaultValue: 'Instruments of quiet reflection' },
              )}
            </p>
            <h2
              className={cm.cn('text-3xl md:text-4xl font-medium tracking-[-0.01em] text-primary')}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t(
                'landing.instrumentsTitle',
                {},
                { defaultValue: 'Crafted instruments for thoughtful readers' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 3), 'text-on-surface-variant')}>
              {t(
                'landing.instrumentsBody',
                { app: APP_NAME },
                {
                  defaultValue:
                    'Every screen in {{app}} is measured against physical stationery, linen book covers, and the quiet satisfaction of library rooms.',
                },
              )}
            </p>
          </div>

          {/* Feature 1 — pacing without performance */}
          <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }), 'items-center', cm.sp('mb', 20))}>
            <div className="md:col-span-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
                {t('landing.pacingEyebrow', {}, { defaultValue: 'Pacing without performance' })}
              </p>
              <h3
                className={cm.cn(
                  'text-2xl md:text-3xl font-medium tracking-[-0.01em] text-primary',
                  cm.sp('mt', 2),
                  cm.sp('mb', 4),
                )}
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                {t(
                  'landing.pacingTitle',
                  {},
                  { defaultValue: 'Reading velocity, not annual anxiety' },
                )}
              </h3>
              <p
                className={cm.cn(
                  cm.textSize('base'),
                  'text-on-surface-variant leading-relaxed',
                  cm.sp('mb', 6),
                )}
              >
                {t(
                  'landing.pacingBody',
                  {},
                  {
                    defaultValue:
                      'Rather than demanding a mechanical "50 books a year," the shelf maps the cadence of your reading life. See when you were engrossed in deep Victorian realism, when you grazed essays, and when you took restorative breaks.',
                  },
                )}
              </p>
              <ul className={cm.cn(cm.sp('mt', 0), 'space-y-3')}>
                {(['gentleRhythm', 'seasonalSpreads', 'driftingDates'] as const).map((k) => (
                  <li
                    key={k}
                    className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('sm'))}
                  >
                    <span
                      className="material-symbols-outlined text-secondary text-base"
                      aria-hidden="true"
                    >
                      check
                    </span>
                    <span>
                      {t(
                        `landing.pacingCheck.${k}`,
                        {},
                        { defaultValue: PACING_CHECK_DEFAULTS[k] },
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6">
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
                  'border-b border-outline-variant pb-4 mb-6',
                )}
              >
                <span
                  className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'text-primary')}
                >
                  {t('landing.cadenceRange', {}, { defaultValue: 'October — November cadence' })}
                </span>
                <span className="text-[11px] font-semibold text-secondary bg-surface-container-low px-2.5 py-1 rounded">
                  {t('landing.cadenceAvg', {}, { defaultValue: '22.4 pages avg / quiet day' })}
                </span>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'end', justify: 'between', gap: 'sm' }),
                  'h-44 border-b border-outline-variant px-2 pb-2',
                )}
                aria-hidden="true"
              >
                {CADENCE_BARS.map((b) => (
                  <div
                    key={b.key}
                    className={cm.cn(
                      'w-full rounded-t flex flex-col justify-end items-center pb-1',
                      b.tone,
                    )}
                    style={{ height: `${b.height}%` }}
                  >
                    <span className={cm.cn('text-[10px] font-semibold', b.label)}>
                      {b.key.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  cm.sp('mt', 4),
                )}
              >
                <span>
                  {t(
                    'landing.cadenceFlow',
                    {},
                    { defaultValue: 'Steady flow through a long classic' },
                  )}
                </span>
                <span className="italic text-secondary">
                  {t(
                    'landing.cadenceRest',
                    {},
                    { defaultValue: 'A slow weekend in the country (0 pages logged — restful)' },
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Feature 2 — shelves that speak your dialect */}
          <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }), 'items-center', cm.sp('mb', 20))}>
            <div className="md:col-span-7 order-2 md:order-1 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6">
              <div className={cm.grid({ cols: 2, gap: 'md' })}>
                {INTENT_SHELVES.map((s) => (
                  <div
                    key={s.key}
                    className={cm.cn(
                      cm.sp('p', 4),
                      'rounded-lg bg-surface-container-low border border-outline-variant text-left',
                    )}
                  >
                    <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' })}>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
                        {t(
                          `landing.intentShelf.${s.key}.kind`,
                          {},
                          { defaultValue: INTENT_SHELF_KIND_DEFAULTS[s.key] },
                        )}
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(`landing.intentShelf.${s.key}.count`, {}, { defaultValue: s.count })}
                      </span>
                    </div>
                    <h4
                      className={cm.cn(
                        cm.textSize('base'),
                        cm.fontWeight('semibold'),
                        'text-primary',
                        cm.sp('mt', 1),
                        cm.sp('mb', 1),
                      )}
                    >
                      {t(`landing.intentShelf.${s.key}.title`, {}, { defaultValue: s.title })}
                    </h4>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t(
                        `landing.intentShelf.${s.key}.body`,
                        {},
                        { defaultValue: INTENT_SHELF_BODY_DEFAULTS[s.key] },
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:col-span-5 order-1 md:order-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
                {t('landing.taxonomiesEyebrow', {}, { defaultValue: 'Custom taxonomies' })}
              </p>
              <h3
                className={cm.cn(
                  'text-2xl md:text-3xl font-medium tracking-[-0.01em] text-primary',
                  cm.sp('mt', 2),
                  cm.sp('mb', 4),
                )}
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                {t(
                  'landing.shelvesDialectTitle',
                  {},
                  { defaultValue: 'Shelves that speak your dialect' },
                )}
              </h3>
              <p
                className={cm.cn(
                  cm.textSize('base'),
                  'text-on-surface-variant leading-relaxed',
                  cm.sp('mb', 6),
                )}
              >
                {t(
                  'landing.shelvesDialectBody',
                  {},
                  {
                    defaultValue:
                      'Conventional book apps lock you into three rigid buckets: want to read, currently reading, and read. Here, shelves mirror the physical piles on your nightstand, desk, and carry-on bag.',
                  },
                )}
              </p>
              <p
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.textSize('base'),
                  cm.fontWeight('medium'),
                  'text-primary',
                )}
              >
                {t(
                  'landing.shelvesDialectNote',
                  {},
                  { defaultValue: 'Organize by mood, geography, or decade' },
                )}
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  arrow_forward
                </span>
              </p>
            </div>
          </div>

          {/* Feature 3 — capture the sentence */}
          <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }), 'items-center')}>
            <div className="md:col-span-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
                {t('landing.marginaliaEyebrow', {}, { defaultValue: 'Deep marginalia' })}
              </p>
              <h3
                className={cm.cn(
                  'text-2xl md:text-3xl font-medium tracking-[-0.01em] text-primary',
                  cm.sp('mt', 2),
                  cm.sp('mb', 4),
                )}
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                {t(
                  'landing.marginaliaTitle',
                  {},
                  { defaultValue: 'Capture the sentence that stopped your heart' },
                )}
              </h3>
              <p
                className={cm.cn(
                  cm.textSize('base'),
                  'text-on-surface-variant leading-relaxed',
                  cm.sp('mb', 6),
                )}
              >
                {t(
                  'landing.marginaliaBody',
                  {},
                  {
                    defaultValue:
                      'Snap a photo of the printed page or type out a paragraph before turning the leaf. The app transforms physical ink into crisp, searchable archival notes connected directly to edition and page number.',
                  },
                )}
              </p>
              <div className="p-4 bg-surface-container-low border-l-2 border-secondary rounded-r">
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface italic')}>
                  {t(
                    'landing.marginaliaQuote',
                    {},
                    {
                      defaultValue:
                        '"I used to underline in pencil and forget. Now my library is an indexed commonwealth of my own thoughts."',
                    },
                  )}
                </p>
              </div>
            </div>
            <div className="md:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-8">
              <div
                className={cm.flex({
                  align: 'center',
                  justify: 'between',
                  wrap: 'wrap',
                  gap: 'sm',
                })}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'text-primary',
                  )}
                >
                  <span className="material-symbols-outlined text-secondary" aria-hidden="true">
                    bookmark
                  </span>
                  {t(
                    'landing.captureSource',
                    {},
                    { defaultValue: 'Middlemarch · Book VIII, Chapter 83' },
                  )}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-outline')}>
                  {t('landing.capturePage', {}, { defaultValue: 'Page 838' })}
                </span>
              </div>
              <blockquote
                className={cm.cn(
                  'text-xl md:text-2xl text-primary italic leading-relaxed border-l-4 pl-4',
                  cm.sp('mt', 6),
                  cm.sp('mb', 6),
                )}
                style={{
                  fontFamily: 'var(--font-headline)',
                  borderColor: 'var(--color-secondary-container)',
                }}
              >
                {t(
                  'landing.captureQuote',
                  {},
                  {
                    defaultValue:
                      'For the growing good of the world is partly dependent on unhistoric acts; and that things are not so ill with you and me as they might have been, is half owing to the number who lived faithfully a hidden life, and rest in unvisited tombs.',
                  },
                )}
              </blockquote>
              <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant">
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 2 }),
                    'text-secondary',
                    cm.sp('mb', 1),
                  )}
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">
                    edit
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide">
                    {t(
                      'landing.captureAnnotationLabel',
                      {},
                      { defaultValue: 'Personal annotation' },
                    )}
                  </span>
                </div>
                <p className={cm.cn(cm.textSize('base'), 'text-on-surface')}>
                  {t(
                    'landing.captureAnnotation',
                    {},
                    {
                      defaultValue:
                        "Dorothea's ending always makes me pause in the quiet of the morning. Re-read on a blustery November evening with mint tea.",
                    },
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 16), cm.mxAuto)}>
          <div
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              'rounded-2xl text-on-primary relative overflow-hidden shadow-lg',
            )}
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <div
              className={cm.cn(
                'absolute -right-20 -top-20 w-64 h-64 rounded-full bg-surface/10 blur-3xl',
              )}
            />
            <div
              className={cm.cn('absolute -left-20 -bottom-20 w-64 h-64 rounded-full blur-3xl')}
              style={{ background: 'rgba(217, 119, 6, 0.3)' }}
            />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary-fixed relative z-10 mb-3">
              {t('landing.ctaEyebrow', {}, { defaultValue: 'Sanctuary awaits' })}
            </p>
            <h2
              className={cm.cn('text-3xl md:text-4xl font-medium tracking-[-0.01em] relative z-10')}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t('landing.ctaTitle', {}, { defaultValue: 'One page tonight. Then another.' })}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 4),
                'text-white/85 relative z-10',
                cm.maxW('xl'),
                cm.mxAuto,
              )}
            >
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Free forever for up to five books. Pro unlocks unlimited shelves, full yearly stats, and exports.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('mt', 8),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'py-3.5 inline-flex items-center gap-2 rounded bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface transition-colors relative z-10',
              )}
            >
              {t('landing.ctaButton', {}, { defaultValue: 'Start your library' })}
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
            <div
              className={cm.cn(
                cm.sp('mt', 6),
                cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' }),
                'relative z-10 text-xs text-surface-container-high',
              )}
            >
              {[
                'No credit card required',
                'Free tier with generous limits',
                'Import your Goodreads CSV',
              ].map((chip) => (
                <span key={chip} className={cm.cn(cm.flex({ align: 'center', gap: 1.5 }))}>
                  <span
                    className="material-symbols-outlined text-sm text-secondary-fixed"
                    aria-hidden="true"
                  >
                    check_circle
                  </span>
                  {t(`landing.ctaChip.${chip}`, {}, { defaultValue: chip })}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
