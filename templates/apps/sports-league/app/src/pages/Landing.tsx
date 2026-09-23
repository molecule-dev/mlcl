import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
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
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40',
        )}
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
          <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0 shrink')}>
            <span
              aria-hidden="true"
              className={cm.cn(
                'inline-flex items-center justify-center w-9 h-9 rounded-lg shadow-md shadow-primary/30 shrink-0',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
              }}
            >
              <span
                className={cm.cn('material-symbols-outlined text-white text-xl')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                shield
              </span>
            </span>
            <span
              className={cm.cn(
                cm.textSize('xl'),
                'font-extrabold tracking-tight truncate whitespace-nowrap',
              )}
            >
              {APP_NAME}
            </span>
          </Link>
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'shrink-0 whitespace-nowrap')}
          >
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  'rounded-full text-white hover:opacity-90 transition-colors',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                }}
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
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    'rounded-full text-white hover:opacity-90 transition-colors',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                  }}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Join the league' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn('absolute inset-0 pointer-events-none')}
            style={{
              background:
                'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-bg) 50%, var(--color-surface) 100%)',
            }}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'py-16 md:py-24 lg:py-28 relative',
            )}
          >
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-12 items-center')}>
              <div className={cm.cn('lg:col-span-7')}>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mb', 4),
                    'font-black uppercase tracking-[0.28em] text-primary',
                  )}
                >
                  {t(
                    'landing.eyebrow',
                    {},
                    { defaultValue: 'Built for fans, coaches, and league organizers' },
                  )}
                </p>
                <h1
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95]',
                  )}
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}.' },
                  )}
                </h1>
                <p
                  className={cm.cn(
                    cm.textSize('lg'),
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
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('bold'),
                      'rounded-full text-white inline-flex items-center gap-2 hover:opacity-95 transition-colors shadow-lg shadow-primary/30',
                    )}
                    style={{
                      background:
                        'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                    }}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Join the league' })}
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/login"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('semibold'),
                      'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
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
                        className={cm.cn('text-3xl font-extrabold tabular-nums text-primary')}
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {s.v}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className={cm.cn('lg:col-span-5')}>
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

            <div className={cm.cn(cm.sp('mt', 12))}>
              <p
                className={cm.cn(
                  'text-[11px] font-black uppercase tracking-[0.28em] text-on-surface-variant mb-3',
                )}
              >
                {t('landing.scoreboardLabel', {}, { defaultValue: 'Tonight around the league' })}
              </p>
              <ScoreboardTicker games={SAMPLE_GAMES} />
            </div>
          </div>
        </section>

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
                  'bg-surface-container-lowest rounded-2xl hover:shadow-xl hover:shadow-on-surface/5 transition-all group',
                )}
              >
                <div
                  className={cm.cn(
                    cm.sp('p', 3),
                    'inline-flex bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
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
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                cm.fontWeight('bold'),
                'rounded-full text-white inline-flex items-center gap-2 hover:opacity-95 transition-colors',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
              }}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Join the league' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.sp('py', 8),
          cm.textCenter,
          cm.textSize('sm'),
          'bg-surface text-on-surface-variant border-t border-outline-variant',
        )}
      >
        <p>
          {t(
            'landing.copyright',
            { year, app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Chase the standing.' },
          )}
        </p>
      </footer>
    </div>
  )
}
