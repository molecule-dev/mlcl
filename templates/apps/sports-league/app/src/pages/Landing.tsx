import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { PennantHeroCard } from '../components/PennantHeroCard.js'
import { ScoreboardTicker, type TickerGame } from '../components/ScoreboardTicker.js'

const FEATURES = [
  {
    key: 'standings',
    defaultTitle: 'Live standings',
    defaultBody:
      'Real-time win-loss-draw standings, points, win-pct, and the playoff line — refreshed at every whistle.',
    icon: 'leaderboard',
    tint: 'text-primary',
  },
  {
    key: 'scoreboard',
    defaultTitle: 'Scoreboard ticker',
    defaultBody:
      'A broadcast-grade scoreboard pinned to the top of every page so you never miss a goal.',
    icon: 'sports_score',
    tint: 'text-accent',
  },
  {
    key: 'rosters',
    defaultTitle: 'Rosters and stats',
    defaultBody:
      'Click any team to dive into the roster, season totals, hot/cold streaks, and head-to-head splits.',
    icon: 'shield',
    tint: 'text-secondary',
  },
  {
    key: 'alerts',
    defaultTitle: 'Score & trade alerts',
    defaultBody:
      'Push notifications for score updates, trade alerts, injury reports, and league announcements.',
    icon: 'notifications_active',
    tint: 'text-live',
  },
] as const

const SAMPLE_GAMES: TickerGame[] = [
  {
    id: 'demo-1',
    status: 'in_progress',
    home_abbr: 'ATL',
    away_abbr: 'BOS',
    home_score: 3,
    away_score: 2,
    clock: 'Q3 4:21',
  },
  {
    id: 'demo-2',
    status: 'final',
    home_abbr: 'CHI',
    away_abbr: 'DAL',
    home_score: 4,
    away_score: 1,
    clock: 'FINAL',
  },
  { id: 'demo-3', status: 'scheduled', home_abbr: 'PHX', away_abbr: 'SEA', clock: '7:30 PM' },
  {
    id: 'demo-4',
    status: 'in_progress',
    home_abbr: 'NYC',
    away_abbr: 'LAC',
    home_score: 1,
    away_score: 1,
    clock: 'Q2 0:48',
  },
  { id: 'demo-5', status: 'scheduled', home_abbr: 'MIA', away_abbr: 'TOR', clock: '8:15 PM' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const year = new Date().getFullYear()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface border-b border-outline-variant/60 shadow-sm',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            'flex-wrap gap-x-4 gap-y-2',
            cm.mxAuto,
          )}
        >
          <Link
            to="/"
            data-mol-id="nav-brand"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              'min-w-0 whitespace-nowrap shrink-0',
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn(
                'inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary shadow-md shadow-primary/30 shrink-0',
              )}
            >
              {/* Tile owns the sizing/centering — never the glyph span. */}
              <span
                className={cm.cn('material-symbols-outlined text-on-primary text-xl')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                shield
              </span>
            </span>
            <span className={cm.flex({ direction: 'col' })}>
              <span
                className={cm.cn(
                  cm.textSize('xl'),
                  'font-black uppercase tracking-tighter leading-none text-primary',
                )}
              >
                {APP_NAME}
              </span>
              <span
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-normal text-on-surface-variant mt-1',
                )}
              >
                {t('landing.brandTagline', {}, { defaultValue: 'Chase the standing' })}
              </span>
            </span>
          </Link>
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'min-w-0 whitespace-nowrap')}
          >
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'hidden sm:inline',
                'text-on-surface-variant hover:text-primary',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="nav-dashboard-cta"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  'rounded-lg bg-primary text-on-primary hover:brightness-110 transition-all',
                )}
              >
                <span className={cm.cn('hidden sm:inline')}>
                  {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
                </span>
                <span className={cm.cn('sm:hidden')}>
                  {t('common.dashboard', {}, { defaultValue: 'Dashboard' })}
                </span>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  data-mol-id="nav-signin"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'text-primary hover:brightness-110',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="nav-signup-cta"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    'rounded-lg bg-primary text-on-primary hover:brightness-110 transition-all',
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Join the league' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — copy + tilted live-ticker scoreboard card */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'pt-16 pb-24 md:pt-20 lg:pt-24 lg:pb-32 relative',
            )}
          >
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-2 gap-16 items-center')}>
              <div className={cm.cn(cm.maxW('2xl'))}>
                <div
                  className={cm.cn(
                    'inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-outline-variant',
                    cm.sp('mb', 6),
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn('w-2 h-2 rounded-full bg-accent animate-pulse')}
                  />
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {t('landing.seasonLive', {}, { defaultValue: 'Season 2026 is live' })}
                  </span>
                </div>
                <h1
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'text-5xl lg:text-6xl xl:text-7xl font-black tracking-tighter leading-[1.05]',
                  )}
                >
                  {t('landing.heroTitle', {}, { defaultValue: 'Chase the standing —' })}
                  <br />
                  <span className="text-primary">
                    {t('landing.heroTitleAccent', {}, { defaultValue: 'every game,' })}
                  </span>
                  <br />
                  {t('landing.heroTitleRest', {}, { defaultValue: 'every stat.' })}
                </h1>
                <p
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.sp('mb', 10),
                    'text-on-surface-variant max-w-xl leading-relaxed',
                  )}
                >
                  {t(
                    'landing.heroSubtitle',
                    { app: APP_NAME },
                    {
                      defaultValue:
                        '{{app}} ties standings, schedules, and statistical leaders into one broadcast-quality dashboard. Live scores. Real records. No clutter.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    data-mol-id="landing-hero-cta"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('bold'),
                      'rounded-lg bg-primary text-on-primary inline-flex items-center gap-2 hover:brightness-110 transition-all',
                    )}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Start your league' })}
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/matches"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('bold'),
                      'rounded-lg border-2 border-outline-variant hover:bg-surface-container-low transition-colors inline-flex items-center gap-2',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                      play_circle
                    </span>
                    {t('landing.heroCtaSecondary', {}, { defaultValue: 'Watch demo' })}
                  </Link>
                </div>
                <dl className={cm.cn(cm.sp('mt', 12), 'grid grid-cols-3 gap-6 max-w-lg')}>
                  {[
                    {
                      k: 'teams',
                      v: '32',
                      l: t('landing.statTeams', {}, { defaultValue: 'Teams tracked' }),
                    },
                    {
                      k: 'games',
                      v: '1.2k',
                      l: t('landing.statGames', {}, { defaultValue: 'Games this season' }),
                    },
                    {
                      k: 'fans',
                      v: '54k',
                      l: t('landing.statFans', {}, { defaultValue: 'Fans following' }),
                    },
                  ].map((s) => (
                    <div key={s.k}>
                      <dt
                        className={cm.cn(
                          'text-[11px] uppercase tracking-widest font-black text-on-surface-variant',
                        )}
                      >
                        {s.l}
                      </dt>
                      <dd
                        className={cm.cn('text-3xl font-bold tabular-nums text-primary')}
                        style={{ fontFamily: 'var(--font-family-mono)' }}
                      >
                        {s.v}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Tilted live-ticker scoreboard (design hero visual) — wraps the
                  real ScoreboardTicker games in a broadcast frame. */}
              <div className={cm.cn('relative')}>
                <div
                  aria-hidden="true"
                  className={cm.cn(
                    'absolute inset-0 rounded-full blur-3xl opacity-50 bg-gradient-to-br from-primary-light to-transparent',
                  )}
                />
                <div
                  className={cm.cn(
                    'relative w-full max-w-md ml-auto rounded-xl overflow-hidden shadow-2xl',
                    'bg-navy border border-navy-light -rotate-2 hover:rotate-0 transition-transform duration-500',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      'px-6 py-4 border-b border-navy-light bg-scoreboard',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'uppercase tracking-widest text-slate-400',
                      )}
                    >
                      {t('landing.liveTicker', {}, { defaultValue: 'Live Ticker' })}
                    </span>
                    <div className={cm.cn(cm.flex({ gap: 'xs' }))} aria-hidden="true">
                      <span className={cm.cn('w-2.5 h-2.5 rounded-full bg-slate-700')} />
                      <span className={cm.cn('w-2.5 h-2.5 rounded-full bg-slate-700')} />
                      <span className={cm.cn('w-2.5 h-2.5 rounded-full bg-slate-700')} />
                    </div>
                  </div>
                  <div className={cm.sp('p', 4)}>
                    <ScoreboardTicker games={SAMPLE_GAMES} />
                  </div>
                </div>
              </div>
            </div>

            {/* Standings snapshot — app content the design lacks; kept */}
            <div className={cm.cn(cm.sp('mt', 20))}>
              <p
                className={cm.cn(
                  'text-[11px] font-black uppercase tracking-[0.28em] text-on-surface-variant mb-3',
                )}
              >
                {t('landing.standingsLabel', {}, { defaultValue: 'Standings snapshot' })}
              </p>
              <PennantHeroCard
                leaderName="Atlas United"
                record="18-4-2"
                points={56}
                gamesAhead="+5"
                formString="W-W-L-W-W-W-D-W-W-L"
                trend={[2, 5, 8, 9, 12, 14, 18, 22, 25, 30, 34, 39, 41, 47, 50, 53, 56]}
              />
            </div>
          </div>
        </section>

        {/* Features — design has no grid section; kept (app content) */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2
            className={cm.cn(
              cm.sp('mb', 12),
              cm.textCenter,
              'text-3xl md:text-4xl font-extrabold tracking-tight',
            )}
          >
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'A front-row seat to every standing' },
            )}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-lg border border-outline-variant/60 hover:shadow-xl hover:shadow-on-surface/5 transition-all group',
                )}
              >
                <div
                  className={cm.cn(
                    cm.sp('p', 3),
                    'inline-flex bg-surface rounded-lg group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-3xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(cm.textSize('lg'), cm.sp('mt', 5), cm.sp('mb', 2), 'font-bold')}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA band — design has no equivalent; kept (app content) */}
        <section className={cm.cn('border-t border-outline-variant/40')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn(cm.textSize('3xl'), cm.sp('mb', 4), 'font-extrabold tracking-tight')}
            >
              {t(
                'landing.ctaHeading',
                {},
                { defaultValue: 'Stop refreshing third-party scoreboards' },
              )}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('base'),
                cm.sp('mb', 8),
                'text-on-surface-variant max-w-xl mx-auto',
              )}
            >
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Your league. Your standings. Your favorite team — pinned to the top. Two minutes to set up, free for the season.',
                },
              )}
            </p>
            <Link
              to="/signup"
              data-mol-id="landing-cta-band-button"
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                cm.fontWeight('bold'),
                'rounded-lg bg-primary text-on-primary inline-flex items-center gap-2 hover:brightness-110 transition-all',
              )}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Start your league' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer — design's dark broadcast slab (mode-independent). */}
      <footer
        className={cm.cn('bg-navy border-t border-navy-light', cm.sp('py', 12), cm.sp('px', 6))}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
            'md:flex-row md:justify-between md:items-start',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
              'md:items-start',
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('extrabold'),
                'font-black uppercase tracking-widest text-white',
              )}
            >
              {APP_NAME}
            </span>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-slate-400')}>
              {t(
                'landing.copyright',
                { year, app: APP_NAME },
                { defaultValue: '© {{year}} {{app}}. Chase the standing.' },
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
          <nav
            className={cm.cn(
              cm.flex({ wrap: 'wrap', align: 'center', gap: 'md' }),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
            )}
          >
            <Link to="/pricing" className={cm.cn('text-slate-400 hover:text-accent')}>
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link to="/privacy" className={cm.cn('text-slate-400 hover:text-accent')}>
              {t('landing.privacyLink', {}, { defaultValue: 'Privacy' })}
            </Link>
            <Link to="/terms" className={cm.cn('text-slate-400 hover:text-accent')}>
              {t('landing.termsLink', {}, { defaultValue: 'Terms' })}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
