import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { CairnTrailHero } from '../components/CairnTrailHero.js'

const FEATURES = [
  {
    key: 'spaces',
    icon: 'folder_special',
    defaultTitle: 'Spaces for every team',
    defaultBody:
      'Engineering, People Ops, Legal — each team gets a curated space with custom permissions and a navigable hierarchy.',
  },
  {
    key: 'search',
    icon: 'search',
    defaultTitle: 'Find before you forget',
    defaultBody:
      'Type ⌘K from anywhere. Full-text search across every article, with filters for space, status, and recency.',
  },
  {
    key: 'editor',
    icon: 'edit_note',
    defaultTitle: 'A block editor that just writes',
    defaultBody:
      'Slash-command for tables, callouts, code, and embeds. Markdown-friendly. Ships with sane defaults so you write, not configure.',
  },
  {
    key: 'durable',
    icon: 'history',
    defaultTitle: 'Durable, not disposable',
    defaultBody:
      'Versioned history, restore, and review requests. Articles outlive the Slack thread that spawned them.',
  },
] as const

const PROOF = [
  { key: 'engineering', defaultLabel: 'Platform Engineering' },
  { key: 'peopleOps', defaultLabel: 'People Operations' },
  { key: 'legal', defaultLabel: 'Legal & Compliance' },
  { key: 'support', defaultLabel: 'Customer Support' },
]

const STATS = [
  { key: 'pages', value: '10k+', defaultLabel: 'Pages created' },
  { key: 'teams', value: '30+', defaultLabel: 'Studious teams' },
  { key: 'uptime', value: '99.9%', defaultLabel: 'Uptime' },
  { key: 'answers', value: '0', defaultLabel: 'Lost answers' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-50 border-b border-outline-variant bg-surface/90 backdrop-blur',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
            'mx-auto',
          )}
        >
          <Link
            to="/"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              'text-xl md:text-2xl',
              cm.fontWeight('extrabold'),
              'tracking-tight text-on-surface',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-primary')}
              style={{ fontSize: '1.75rem' }}
              aria-hidden="true"
            >
              stack
            </span>
            {APP_NAME}
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {/* Compact screens reach Pricing via the page footer — the inline
                link only fits from `sm` up. */}
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'hidden text-on-surface-variant hover:text-on-surface sm:block',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/home"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'rounded-lg bg-primary text-on-primary shadow-sm transition-colors hover:bg-primary-dark',
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
                    'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    'rounded-lg bg-primary text-on-primary shadow-sm transition-colors hover:bg-primary-dark',
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Start a workspace' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            aria-hidden="true"
            className={cm.cn(
              'pointer-events-none absolute left-1/2 top-0 h-96 w-full -translate-x-1/2 bg-gradient-to-b from-primary/10 to-transparent blur-3xl',
            )}
          />

          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.sp('px', 6),
              cm.sp('pt', 24),
              cm.sp('pb', 16),
              'mx-auto text-center',
            )}
          >
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('semibold'),
                'inline-block rounded-full border border-primary/20 bg-primary-light/20 text-[10px] uppercase tracking-widest text-primary',
              )}
            >
              {t('landing.eyebrow', {}, { defaultValue: 'For ops, engineering, and people teams' })}
            </span>
            <h1
              className={cm.cn(
                cm.sp('mt', 5),
                cm.fontWeight('extrabold'),
                cm.maxW('4xl'),
                'mx-auto whitespace-pre-line text-5xl tracking-tight text-on-surface md:text-6xl lg:text-7xl leading-[1.05]',
              )}
            >
              {t('landing.heroTitle', {}, { defaultValue: 'Stack knowledge.\nFind your way.' })}
            </h1>
            <p
              className={cm.cn(
                cm.sp('mt', 6),
                cm.textSize('xl'),
                cm.maxW('2xl'),
                'mx-auto leading-relaxed text-on-surface-variant',
              )}
            >
              {t(
                'landing.heroSubtitle',
                { tagline: APP_TAGLINE },
                {
                  defaultValue:
                    'A durable internal knowledge base for runbooks, policies, decision records, and onboarding — with a search bar that actually finds things.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.sp('mt', 10),
                cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' }),
              )}
            >
              <Link
                to="/signup"
                data-mol-id="landing-hero-start-workspace"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'rounded-lg bg-primary text-on-primary shadow-sm transition-colors hover:bg-primary-dark',
                )}
              >
                {t('landing.heroCta', {}, { defaultValue: 'Start a workspace' })}
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface text-on-surface shadow-sm transition-colors hover:border-outline',
                )}
              >
                <span className="material-symbols-outlined text-xl text-primary" aria-hidden="true">
                  play_circle
                </span>
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </div>

            <div
              className={cm.cn(
                cm.sp('mt', 12),
                cm.sp('pt', 8),
                'border-t border-outline-variant/40',
              )}
            >
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t(
                  'landing.proofHeading',
                  {},
                  { defaultValue: 'Trusted by teams that write things down' },
                )}
              </p>
              <ul
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.flex({ wrap: 'wrap', gap: 'md', justify: 'center' }),
                )}
              >
                {PROOF.map((p) => (
                  <li
                    key={p.key}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'rounded-full bg-surface-container text-on-surface-variant',
                    )}
                  >
                    {t(`landing.proof.${p.key}`, {}, { defaultValue: p.defaultLabel })}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Product preview — the design frames the app home in browser
            chrome below the hero; the CairnTrailHero stat card stands in
            for the mockup's "Recent updates" pane. */}
        <section
          className={cm.cn(cm.sp('px', 6), cm.maxW('6xl'), 'relative z-10 mx-auto mb-24 -mt-4')}
        >
          <div
            className={cm.cn(
              'overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-2xl shadow-primary/10 ring-1 ring-on-surface/5',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                'border-b border-outline-variant bg-surface-container-low px-4 py-3',
              )}
            >
              <div className={cm.cn(cm.flex({ gap: 'xs' }))} aria-hidden="true">
                <span
                  className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-outline-variant/50')}
                />
                <span
                  className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-outline-variant/50')}
                />
                <span
                  className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-outline-variant/50')}
                />
              </div>
              <div
                className={cm.cn(
                  'mx-auto w-1/3 truncate rounded-md border border-outline-variant bg-surface px-3 py-1 text-center font-mono text-xs text-on-surface-variant',
                )}
              >
                app.cairn.so/acme/home
              </div>
              <span className={cm.cn(cm.w(10), 'shrink-0')} aria-hidden="true" />
            </div>
            <CairnTrailHero articlesUpdatedToday={12} readersToday={486} draftsInFlight={4} />
          </div>
        </section>

        <section className={cm.cn('border-t border-outline-variant bg-surface-container-low')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 20), 'mx-auto')}>
            <div className={cm.cn(cm.maxW('2xl'), 'mx-auto text-center')}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('extrabold'),
                  'uppercase tracking-widest text-secondary',
                )}
              >
                {t('landing.featuresEyebrow', {}, { defaultValue: 'What you get' })}
              </p>
              <h2
                className={cm.cn(
                  cm.sp('mt', 3),
                  cm.textSize('4xl'),
                  cm.fontWeight('extrabold'),
                  'tracking-tight text-on-surface',
                )}
              >
                {t('landing.featuresHeading', {}, { defaultValue: 'A library, not a chat log.' })}
              </h2>
              <p className={cm.cn(cm.sp('mt', 4), cm.textSize('lg'), 'text-on-surface-variant')}>
                {t(
                  'landing.featuresSubtitle',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      '{{appName}} is built around the article — versioned, searchable, and durable past the next reorg.',
                  },
                )}
              </p>
            </div>

            <div className={cm.cn(cm.sp('mt', 12), cm.grid({ cols: 4, gap: 'md' }))}>
              {FEATURES.map((f) => (
                <div
                  key={f.key}
                  className={cm.cn(
                    cm.sp('p', 6),
                    'flex h-full flex-col rounded-lg border border-outline-variant bg-surface shadow-sm transition-shadow hover:shadow-md',
                  )}
                >
                  {/* Tile is a separate flex box — sizing/centering on the glyph span
                      loses the cascade to the icon class's display:inline-block. */}
                  <span
                    className={cm.cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary-light/30',
                    )}
                    aria-hidden="true"
                  >
                    <span
                      className="material-symbols-outlined text-primary"
                      style={{ fontSize: '1.5rem' }}
                    >
                      {f.icon}
                    </span>
                  </span>
                  <h3
                    className={cm.cn(cm.sp('mt', 4), cm.textSize('lg'), cm.fontWeight('extrabold'))}
                  >
                    {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                  </h3>
                  <p
                    className={cm.cn(
                      cm.sp('mt', 2),
                      cm.sp('mb', 3),
                      cm.textSize('sm'),
                      'leading-relaxed text-on-surface-variant',
                    )}
                  >
                    {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats strip — four bordered stat cards (design: pages created /
            teams / uptime / lost answers). */}
        <section className={cm.cn('border-y border-outline-variant/40')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 12), 'mx-auto')}>
            <div className={cm.cn(cm.grid({ cols: 4, gap: 'md' }))}>
              {STATS.map((s) => (
                <div
                  key={s.key}
                  className={cm.cn(
                    cm.sp('p', 6),
                    'rounded-xl border border-outline-variant bg-surface text-center shadow-sm transition-colors hover:border-primary/30',
                  )}
                >
                  <div className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'text-primary')}>
                    {s.value}
                  </div>
                  <div
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'uppercase tracking-wide text-on-surface-variant',
                    )}
                  >
                    {t(`landing.stat.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={cm.cn('border-t border-primary/20 bg-primary-light/20')}>
          <div
            className={cm.cn(
              cm.maxW('4xl'),
              cm.sp('px', 6),
              cm.sp('py', 24),
              'mx-auto text-center',
            )}
          >
            <h2
              className={cm.cn(
                cm.textSize('4xl'),
                cm.fontWeight('extrabold'),
                'tracking-tight text-on-surface',
              )}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Stack the first stone today.' })}
            </h2>
            <p className={cm.cn(cm.sp('mt', 4), cm.textSize('lg'), 'text-on-surface-variant')}>
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Free for solo authors. Team plans for distributed teams that ship runbooks, decisions, and onboarding.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.sp('mt', 8),
                cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
              )}
            >
              <Link
                to="/signup"
                data-mol-id="landing-final-cta"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'inline-block rounded-lg bg-primary text-on-primary shadow-md transition-all hover:bg-primary-dark hover:shadow-lg',
                )}
              >
                {t('landing.ctaPrimary', {}, { defaultValue: 'Start a workspace' })}
              </Link>
            </div>
            <p
              className={cm.cn(
                cm.sp('mt', 4),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-primary/80',
              )}
            >
              {t(
                'landing.ctaNote',
                {},
                { defaultValue: 'No credit card required. Free for solo authors.' },
              )}
            </p>
          </div>
        </section>
      </main>

      <footer className={cm.cn('border-t border-outline-variant bg-surface-container-low')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 8),
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
            'mx-auto',
          )}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'landing.copyright',
              { year: new Date().getFullYear(), app: APP_NAME },
              { defaultValue: '\u00a9 {{year}} {{app}}' },
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
          <ul
            className={cm.cn(
              cm.flex({ gap: 'md', align: 'center', wrap: 'wrap' }),
              cm.textSize('sm'),
            )}
          >
            <li>
              <Link to="/about" className={cm.cn('text-on-surface-variant hover:text-on-surface')}>
                {t('nav.about', {}, { defaultValue: 'About' })}
              </Link>
            </li>
            <li>
              <Link
                to="/pricing"
                className={cm.cn('text-on-surface-variant hover:text-on-surface')}
              >
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </Link>
            </li>
            <li>
              <Link to="/terms" className={cm.cn('text-on-surface-variant hover:text-on-surface')}>
                {t('nav.terms', {}, { defaultValue: 'Terms' })}
              </Link>
            </li>
            <li>
              <Link
                to="/privacy"
                className={cm.cn('text-on-surface-variant hover:text-on-surface')}
              >
                {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              </Link>
            </li>
            <li>
              <Link to="/login" className={cm.cn('text-on-surface-variant hover:text-on-surface')}>
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </li>
            <li>
              <Link to="/signup" className={cm.cn('text-on-surface-variant hover:text-on-surface')}>
                {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
              </Link>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  )
}

export default Landing
