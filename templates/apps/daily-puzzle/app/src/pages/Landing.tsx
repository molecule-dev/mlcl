import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { LexletLogo } from '../components/LexletLogo.js'
import { type BoardGuess, PuzzleBoard } from '../components/PuzzleBoard.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

/** Static demo board — landing never calls /api (asserted by its spec). */
const DEMO_GUESSES: BoardGuess[] = [
  { word: 'slate', feedback: ['absent', 'present', 'absent', 'correct', 'absent'] },
  { word: 'clout', feedback: ['absent', 'correct', 'absent', 'absent', 'correct'] },
  { word: 'flint', feedback: ['absent', 'correct', 'absent', 'present', 'correct'] },
  { word: 'plant', feedback: ['correct', 'correct', 'correct', 'correct', 'correct'] },
]

/** Color-coded QWERTY preview under the demo board (design: tactile keys). */
const KEYBOARD_ROWS = [
  'Q:absent W:none E:absent R:none T:correct Y:none U:absent I:absent O:absent P:correct',
  'A:correct S:absent D:none F:absent G:none H:none J:none K:none L:correct',
] as const

const KEY_STYLES: Record<string, string> = {
  correct: 'bg-primary text-on-primary',
  present: 'bg-secondary text-on-secondary',
  absent: 'bg-[var(--puzzle-tile-absent)] text-white',
  none: 'bg-surface-container-high text-on-surface',
}

const SHARE_PREVIEW = ['⬛⬛⬛🟩🟩', '⬛⬛⬛🟩🟩', '⬛⬛🟩⬛🟩', '🟩🟩🟩🟩🟩']

/** Guess distribution bars (design: mini chart in the stats card). */
const GUESS_DISTRIBUTION = [
  { tries: 1, count: 1, pct: 4 },
  { tries: 2, count: 6, pct: 18 },
  { tries: 3, count: 15, pct: 45 },
  { tries: 4, count: 28, pct: 85, today: true },
  { tries: 5, count: 9, pct: 28 },
  { tries: 6, count: 2, pct: 8 },
]

const RULE_CARDS = [
  {
    letter: 'W',
    tile: 'bg-primary text-on-primary',
    dot: 'bg-primary',
    key: 'landing.rules.correct',
    title: 'Green means spot on',
    body: 'The letter is in the secret word and in the exact right coordinate. Keep it locked for your next guess.',
  },
  {
    letter: 'I',
    tile: 'bg-secondary text-on-secondary',
    dot: 'bg-secondary',
    key: 'landing.rules.present',
    title: 'Amber means close',
    body: 'The letter belongs in today’s word, but in a different position. Try shifting it into a new tile coordinate next turn.',
  },
  {
    letter: 'N',
    tile: 'bg-[var(--puzzle-tile-absent)] text-white',
    dot: 'bg-[var(--puzzle-tile-absent)]',
    key: 'landing.rules.absent',
    title: 'Gray means let it go',
    body: 'The letter is absent from today’s secret word entirely. It will automatically dim on your keyboard to preserve focus.',
  },
] as const

const TESTIMONIALS = [
  {
    key: 'landing.community.one',
    quote:
      'My wife and I do Lexlet together before turning on any morning news. It has completely replaced frantic social media scrolling with a calm, tactile puzzle ritual.',
    name: 'Marcus & Rebecca',
    place: 'Portland, OR',
    streak: '82 Days',
  },
  {
    key: 'landing.community.two',
    quote:
      'The physical button feel on mobile keyboards is astonishingly good. It feels like pressing real keys on a portable typewriter during my morning metro ride.',
    name: 'Sarah Lin',
    place: 'Architect, Toronto',
    streak: '45 Days',
  },
  {
    key: 'landing.community.three',
    quote:
      'Our engineering team has a daily Slack thread for the grid emojis. Nobody spoils the letters, but the friendly breakfast rivalry is fiercely competitive.',
    name: 'David Kim',
    place: 'Tech Lead, London',
    streak: '120 Days',
  },
] as const

/** Shared tactile keycap affordance — hard bottom shadow that presses down. */
const KEY_TACTILE = { boxShadow: '0 2px 0 0 var(--color-outline-variant)' } as const
const TILE_SHADOW = { boxShadow: 'inset 0 -2px 0 0 rgba(0, 0, 0, 0.08)' } as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const playToday = t('landing.nav.playToday', {}, { defaultValue: 'Play Today’s Puzzle' })
  const navPlayButtonClass = cm.cn(
    cm.flex({ align: 'center', justify: 'center' }),
    cm.sp('px', 4),
    cm.sp('py', 2),
    cm.textSize('xs'),
    cm.fontWeight('bold'),
    'hidden sm:inline-flex bg-primary text-on-primary hover:bg-[var(--puzzle-primary-hover)] rounded-lg shadow-sm transition',
  )

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'bg-background text-on-surface antialiased flex flex-col',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          'sticky top-0 z-30 w-full bg-surface/95 backdrop-blur-sm shadow-sm border-b border-outline-variant px-4 md:px-4 py-3 max-w-7xl mx-auto',
        )}
      >
        <Link to="/" aria-label={`${APP_NAME} home`} className={cm.cn('group')}>
          <LexletLogo size="md" />
        </Link>
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 5 }), 'hidden md:flex')}>
          {/* Section anchors — the icon actions to the right cover the routes
              (/how-to-play, /leaderboard, /settings). */}
          <a
            href="#how"
            className={cm.cn(
              cm.textSize('sm'),
              'font-semibold text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('landing.nav.how', {}, { defaultValue: 'How it works' })}
          </a>
          <a
            href="#streaks"
            className={cm.cn(
              cm.textSize('sm'),
              'font-semibold text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('landing.nav.streaks', {}, { defaultValue: 'Streaks & stats' })}
          </a>
          <a
            href="#community"
            className={cm.cn(
              cm.textSize('sm'),
              'font-semibold text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('landing.nav.community', {}, { defaultValue: 'Leaderboard' })}
          </a>
        </nav>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
          {/* Live streak pill */}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1.5 }),
              'px-3 py-1 bg-[var(--color-error-container)] border border-error/30 rounded-full text-on-error-container',
            )}
            title={t(
              'landing.streakPill.title',
              {},
              { defaultValue: '14-Day Consecutive Daily Streak' },
            )}
          >
            <span aria-hidden="true" className={cm.cn(cm.textSize('sm'), 'select-none')}>
              🔥
            </span>
            <span className={cm.cn(cm.textSize('xs'), 'font-bold tracking-wide')}>
              {t('landing.streakPill.label', { count: 14 }, { defaultValue: 'STREAK 14' })}
            </span>
          </div>
          {/* Trailing icon actions */}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              'border-l border-outline-variant pl-2 ml-1',
            )}
          >
            <Link
              to="/leaderboard"
              aria-label={t(
                'landing.icon.leaderboard',
                {},
                { defaultValue: 'Leaderboard & Statistics' },
              )}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'w-9 h-9 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition',
              )}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                leaderboard
              </span>
            </Link>
            <Link
              to="/how-to-play"
              aria-label={t('landing.icon.help', {}, { defaultValue: 'Help and Rules' })}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'w-9 h-9 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition',
              )}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                help_outline
              </span>
            </Link>
            <Link
              to="/settings"
              aria-label={t('landing.icon.settings', {}, { defaultValue: 'Game Settings' })}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'w-9 h-9 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition',
              )}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                settings
              </span>
            </Link>
          </div>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link to="/play" className={navPlayButtonClass} data-mol-id="landing-nav-play">
              {playToday}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  cm.textSize('sm'),
                  'hidden sm:inline-flex font-semibold text-on-surface-variant hover:text-primary transition-colors',
                )}
                data-mol-id="landing-nav-signin"
              >
                {t('nav.signIn', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link to="/signup" className={navPlayButtonClass} data-mol-id="landing-nav-play">
                {t('nav.getStarted', {}, { defaultValue: 'Get started' })}
              </Link>
            </>
          )}
        </div>
      </header>

      <main className={cm.cn('flex-grow')}>
        {/* Hero — 12-col split: value copy left, tactile demo board right */}
        <section className={cm.cn('max-w-7xl mx-auto px-4 py-8 lg:py-16')}>
          <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-8 items-center')}>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'start', gap: 5 }),
                'lg:col-span-6',
              )}
            >
              {/* Live indicator pill */}
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  'inline-flex px-3.5 py-1.5 bg-surface border border-outline-variant rounded-full',
                )}
              >
                <span
                  className={cm.cn('w-2 h-2 rounded-full bg-primary animate-pulse')}
                  aria-hidden="true"
                />
                <span className={cm.cn(cm.textSize('xs'), 'font-bold text-on-surface')}>
                  {t(
                    'landing.hero.live',
                    { number: 428 },
                    { defaultValue: "TODAY'S PUZZLE #428 IS LIVE" },
                  )}
                </span>
                <span aria-hidden="true" className={cm.cn('text-outline')}>
                  •
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant font-medium')}>
                  {t('landing.hero.nextIn', {}, { defaultValue: 'Next in 14h 22m' })}
                </span>
              </div>
              {/* Headline */}
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
                <h1
                  className={cm.cn(
                    cm.textSize('5xl'),
                    cm.fontWeight('extrabold'),
                    'text-on-surface tracking-tight leading-tight',
                  )}
                >
                  {t('landing.hero.headline.a', {}, { defaultValue: 'One word. Every day.' })}
                  <br />
                  <span
                    className={cm.cn(
                      'text-primary underline decoration-[4px] underline-offset-[6px] decoration-primary-container',
                    )}
                  >
                    {t('landing.hero.headline.b', {}, { defaultValue: 'Six tries.' })}
                  </span>
                </h1>
                <p
                  className={cm.cn(
                    cm.textSize('base'),
                    'text-on-surface-variant pt-2 max-w-xl leading-relaxed',
                  )}
                >
                  {t(
                    'landing.hero.subhead',
                    {},
                    {
                      defaultValue:
                        'A clean two-minute word ritual crafted for morning coffee, daily commutes, and friendly breakfast rivalries. Completely spoiler-free.',
                    },
                  )}
                </p>
              </div>
              {/* Actions */}
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'stretch', gap: 3 }),
                  'sm:flex-row sm:items-center w-full sm:w-auto',
                )}
              >
                <Link
                  to={isAuthenticated ? '/play' : '/signup'}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                    cm.sp('px', 6),
                    cm.textSize('lg'),
                    cm.fontWeight('bold'),
                    'bg-primary text-on-primary hover:bg-[var(--puzzle-primary-hover)] rounded-lg shadow-sm hover:shadow-md transition-all py-3.5',
                  )}
                  data-mol-id="landing-hero-cta"
                >
                  <span>
                    {isAuthenticated
                      ? t('landing.hero.cta.play', {}, { defaultValue: 'Play Today’s Puzzle' })
                      : t('landing.hero.cta.start', {}, { defaultValue: 'Start playing free' })}
                  </span>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    arrow_forward
                  </span>
                </Link>
                <Link
                  to="/how-to-play"
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                    cm.sp('px', 5),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'bg-surface border border-outline-variant hover:bg-surface-container text-on-surface rounded-lg transition-colors py-3.5',
                  )}
                  data-mol-id="landing-hero-how"
                >
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                    play_circle
                  </span>
                  {t('landing.hero.cta.how', {}, { defaultValue: 'How to play' })}
                </Link>
              </div>
              {/* Micro-copy */}
              <p
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.textSize('xs'),
                  'text-outline font-bold tracking-wide',
                )}
              >
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>
                  check_circle
                </span>
                {t(
                  'landing.hero.microcopy',
                  {},
                  { defaultValue: 'No account required. Free forever in your browser.' },
                )}
              </p>
              {/* Social proof grid */}
              <div
                className={cm.cn(
                  'pt-5 border-t border-outline-variant w-full grid grid-cols-3 gap-4',
                )}
              >
                <div>
                  <div className={cm.cn(cm.flex({ align: 'center' }), 'text-warning mb-0.5')}>
                    {[0, 1, 2, 3, 4].map((star) => (
                      <span
                        key={star}
                        className="material-symbols-outlined"
                        style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    ))}
                  </div>
                  <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
                    {t('landing.proof.rating', {}, { defaultValue: '4.9 / 5' })}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-bold tracking-wide text-on-surface-variant',
                    )}
                  >
                    {t('landing.proof.thinkers', {}, { defaultValue: '85k+ thinkers' })}
                  </p>
                </div>
                <div>
                  <div className={cm.cn(cm.textSize('sm'), 'mb-0.5')} aria-hidden="true">
                    🔥
                  </div>
                  <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
                    {t('landing.proof.streaks', {}, { defaultValue: '1.2M+' })}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-bold tracking-wide text-on-surface-variant',
                    )}
                  >
                    {t('landing.proof.streaksLabel', {}, { defaultValue: 'Active streaks' })}
                  </p>
                </div>
                <div>
                  <div className={cm.cn(cm.flex({ align: 'center' }), 'text-primary mb-0.5')}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                      block
                    </span>
                  </div>
                  <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
                    {t('landing.proof.noAds', {}, { defaultValue: 'Zero Ads' })}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-bold tracking-wide text-on-surface-variant',
                    )}
                  >
                    {t('landing.proof.focus', {}, { defaultValue: 'Pure mental focus' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Tactile demo board card */}
            <div className={cm.cn('lg:col-span-6 flex justify-center')} id="game-demo">
              <div
                className={cm.cn(
                  'w-full max-w-[480px] bg-surface border-2 border-outline-variant rounded-xl p-5 shadow-lg relative overflow-hidden',
                )}
              >
                {/* Masthead */}
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    'pb-3 mb-4 border-b border-outline-variant',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                    <span
                      className={cm.cn('w-2.5 h-2.5 rounded-full bg-primary animate-pulse')}
                      aria-hidden="true"
                    />
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'tracking-wider text-on-surface uppercase',
                      )}
                    >
                      {t(
                        'landing.demo.masthead',
                        { number: 428 },
                        { defaultValue: 'Daily Lexlet #428' },
                      )}
                    </span>
                  </div>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 0.5),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'bg-primary-container/15 text-primary rounded',
                      )}
                    >
                      {t('landing.demo.solvedIn', { tries: 4 }, { defaultValue: 'SOLVED IN 4' })}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'font-mono text-on-surface-variant flex items-center gap-1',
                      )}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        timer
                      </span>
                      01:42
                    </span>
                  </div>
                </div>
                {/* Board */}
                <div className={cm.cn('max-w-[320px] mx-auto mb-4')}>
                  <PuzzleBoard guesses={DEMO_GUESSES} animate={false} />
                </div>
                {/* Victory bar */}
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    'mb-4 bg-primary-container/30 border border-primary/20 rounded-lg p-3',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                    <span className={cm.cn(cm.textSize('lg'))} aria-hidden="true">
                      🎉
                    </span>
                    <div>
                      <p
                        className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-primary')}
                      >
                        {t('landing.demo.victory', {}, { defaultValue: 'Splendid! Solved in 4/6' })}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t('landing.demo.secret.before', {}, { defaultValue: 'Today’s secret:' })}{' '}
                        <strong className={cm.cn('text-on-surface')}>
                          {t('landing.demo.secret.word', {}, { defaultValue: 'PLANT' })}
                        </strong>
                      </p>
                    </div>
                  </div>
                  <Link
                    to={isAuthenticated ? '/play' : '/signup'}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 1 }),
                      cm.sp('px', 3),
                      cm.sp('py', 1.5),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'bg-primary text-on-primary hover:bg-primary-container rounded shadow-sm transition',
                    )}
                    data-mol-id="landing-demo-share"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                      share
                    </span>
                    {t('landing.demo.share', {}, { defaultValue: 'Share Grid' })}
                  </Link>
                </div>
                {/* Color-coded keyboard preview */}
                <div
                  aria-label={t(
                    'landing.demo.keyboard',
                    {},
                    { defaultValue: 'Simulated tactile keyboard' },
                  )}
                  className={cm.cn(cm.sp('pt', 1), 'select-none')}
                >
                  {KEYBOARD_ROWS.map((row, rowIndex) => (
                    <div
                      key={rowIndex}
                      className={cm.cn(cm.flex({ justify: 'center', gap: 1 }), 'mb-1')}
                    >
                      {row.split(' ').map((entry) => {
                        const [letter, state] = entry.split(':')
                        return (
                          <span
                            key={letter}
                            style={KEY_TACTILE}
                            className={cm.cn(
                              cm.flex({ align: 'center', justify: 'center' }),
                              'w-7 h-9 text-xs font-bold rounded-sm',
                              KEY_STYLES[state] ?? KEY_STYLES.none,
                            )}
                          >
                            {letter}
                          </span>
                        )
                      })}
                    </div>
                  ))}
                  <div className={cm.cn(cm.flex({ justify: 'center', gap: 1 }))}>
                    <span
                      style={KEY_TACTILE}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'px-2 h-9 bg-surface-container text-on-surface text-[10px] font-bold tracking-wider rounded-sm',
                      )}
                    >
                      {t('landing.demo.enter', {}, { defaultValue: 'ENTER' })}
                    </span>
                    {['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map((letter) => {
                      const state = letter === 'C' ? 'absent' : letter === 'N' ? 'correct' : 'none'
                      return (
                        <span
                          key={letter}
                          style={KEY_TACTILE}
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'center' }),
                            'w-7 h-9 text-xs font-bold rounded-sm',
                            KEY_STYLES[state],
                          )}
                        >
                          {letter}
                        </span>
                      )
                    })}
                    <span
                      role="img"
                      aria-label={t('landing.demo.backspace', {}, { defaultValue: 'Backspace' })}
                      style={KEY_TACTILE}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'px-2 h-9 bg-surface-container text-on-surface rounded-sm',
                      )}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        backspace
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Rules — three letter-tile mechanic cards on a banded strip */}
        <section
          id="how"
          className={cm.cn('bg-surface-container-low border-y border-outline-variant py-16')}
        >
          <div className={cm.cn('max-w-7xl mx-auto px-4')}>
            <div className={cm.cn('text-center max-w-2xl mx-auto mb-12')}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-primary mb-2',
                )}
              >
                {t('landing.rules.eyebrow', {}, { defaultValue: 'Tactile Feedback' })}
              </p>
              <h2
                className={cm.cn(cm.textSize('4xl'), cm.fontWeight('extrabold'), 'text-on-surface')}
              >
                {t('landing.how.title', {}, { defaultValue: 'A tiny daily ritual' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-2')}>
                {t(
                  'landing.rules.subtitle',
                  {},
                  {
                    defaultValue:
                      'Every guess must be a valid 5-letter word. After submitting, each tile flips to reveal how close your intuition was.',
                  },
                )}
              </p>
            </div>
            <div className={cm.cn(cm.grid({ cols: 1, gap: 6 }), 'md:grid-cols-3')}>
              {RULE_CARDS.map((rule) => (
                <div
                  key={rule.key}
                  className={cm.cn(
                    cm.flex({ direction: 'col', align: 'start' }),
                    'bg-surface p-6 rounded-xl border border-outline-variant shadow-sm',
                  )}
                >
                  <div
                    style={TILE_SHADOW}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'w-14 h-14 rounded-lg text-3xl font-extrabold shadow-sm mb-4',
                      rule.tile,
                    )}
                    aria-hidden="true"
                  >
                    {rule.letter}
                  </div>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'mb-2')}>
                    <span
                      className={cm.cn('w-2.5 h-2.5 rounded-full', rule.dot)}
                      aria-hidden="true"
                    />
                    <h3
                      className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}
                    >
                      {t(rule.key, {}, { defaultValue: rule.title })}
                    </h3>
                  </div>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
                  >
                    {t(`${rule.key}Body`, {}, { defaultValue: rule.body })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature bento — 4 rich cards (share, streaks, stats, offline) */}
        <section id="streaks" className={cm.cn('max-w-7xl mx-auto px-4 py-16 lg:py-24')}>
          <div className={cm.cn('max-w-2xl mb-12')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-primary mb-2',
              )}
            >
              {t('landing.features.eyebrow', {}, { defaultValue: 'Thoughtful Craft' })}
            </p>
            <h2
              className={cm.cn(cm.textSize('4xl'), cm.fontWeight('extrabold'), 'text-on-surface')}
            >
              {t(
                'landing.features.title',
                {},
                { defaultValue: 'Everything you want. Nothing to distract you.' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-2')}>
              {t(
                'landing.features.subtitle',
                {},
                {
                  defaultValue:
                    'Designed with newspaper editorial purity. No paywalls, no pop-up video interruptions, and no algorithmic rabbit holes.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn('grid grid-cols-1 md:grid-cols-12 gap-6')}>
            {/* Spoiler-free share grids */}
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', justify: 'between' }),
                'md:col-span-6 bg-surface border border-outline-variant rounded-xl p-6 shadow-sm',
              )}
            >
              <div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-10 h-10 rounded-lg bg-surface-container text-primary mb-4',
                  )}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    share
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('2xl'),
                    cm.fontWeight('bold'),
                    'text-on-surface mb-2',
                  )}
                >
                  {t(
                    'landing.features.share.title',
                    {},
                    { defaultValue: 'Spoiler-Free Share Grids' },
                  )}
                </h3>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-on-surface-variant leading-relaxed mb-6',
                  )}
                >
                  {t(
                    'landing.features.share.body',
                    {},
                    {
                      defaultValue:
                        'Brag with dignity. Your morning victory copies as pure emoji color blocks with zero leaked letters, preserving the puzzle for friends who haven’t had their coffee yet.',
                    },
                  )}
                </p>
              </div>
              <div
                className={cm.cn(
                  'p-4 bg-surface-container-low rounded-lg border border-outline-variant font-mono text-sm',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'text-on-surface-variant pb-2 border-b border-outline-variant/60 mb-1',
                  )}
                >
                  <span>
                    {t(
                      'landing.features.share.previewTitle',
                      {},
                      { defaultValue: 'Lexlet #428 4/6' },
                    )}
                  </span>
                  <span className={cm.cn(cm.flex({ align: 'center', gap: 1 }), 'text-primary')}>
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                      content_copy
                    </span>
                    {t('landing.features.share.copy', {}, { defaultValue: 'Tap to copy result' })}
                  </span>
                </div>
                {SHARE_PREVIEW.map((line, i) => (
                  <p key={`${i}-${line}`} className={cm.cn(cm.textSize('base'), 'pt-1')}>
                    {line}
                  </p>
                ))}
                <p className={cm.cn(cm.textSize('sm'), 'pt-1')}>
                  🔥 {t('landing.features.share.streak', { count: 12 }, { defaultValue: '12' })}
                </p>
              </div>
            </div>
            {/* Streaks that matter */}
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', justify: 'between' }),
                'md:col-span-6 bg-surface border border-outline-variant rounded-xl p-6 shadow-sm',
              )}
            >
              <div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-10 h-10 rounded-lg bg-[var(--color-error-container)] text-error mb-4',
                  )}
                  aria-hidden="true"
                >
                  <span className={cm.cn(cm.textSize('xl'))}>🔥</span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('2xl'),
                    cm.fontWeight('bold'),
                    'text-on-surface mb-2',
                  )}
                >
                  {t('landing.streaks.title', {}, { defaultValue: 'Streaks you hate to break' })}
                </h3>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-on-surface-variant leading-relaxed mb-6',
                  )}
                >
                  {t(
                    'landing.features.streaks.body',
                    {},
                    {
                      defaultValue:
                        'Consecutive days build habits. With smart local time zone detection and a compassionate 24-hour buffer, an unexpected late flight won’t shatter your hard-earned pride.',
                    },
                  )}
                </p>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  'p-4 bg-[var(--color-error-container)] rounded-lg border border-error/30',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'w-12 h-12 bg-surface rounded-full border border-error/30 text-2xl shadow-sm',
                    )}
                    aria-hidden="true"
                  >
                    🔥
                  </div>
                  <div>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'text-on-error-container uppercase tracking-wider',
                      )}
                    >
                      {t(
                        'landing.features.streaks.current',
                        {},
                        { defaultValue: 'Current Streak' },
                      )}
                    </span>
                    <p
                      className={cm.cn(
                        cm.textSize('2xl'),
                        cm.fontWeight('bold'),
                        'text-on-surface',
                      )}
                    >
                      {t(
                        'landing.features.streaks.days',
                        { count: 14 },
                        { defaultValue: '14 Days Clean' },
                      )}
                    </p>
                  </div>
                </div>
                <div className={cm.cn('text-right')}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 1 }),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'text-error bg-surface px-2 py-1 rounded border border-error/30 inline-flex',
                    )}
                  >
                    <span
                      className={cm.cn('w-1.5 h-1.5 rounded-full bg-success')}
                      aria-hidden="true"
                    />
                    {t('landing.features.streaks.protected', {}, { defaultValue: 'Protected 18h' })}
                  </span>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-1')}>
                    {t(
                      'landing.features.streaks.best',
                      { count: 42 },
                      { defaultValue: 'Best: 42 Days' },
                    )}
                  </p>
                </div>
              </div>
            </div>
            {/* Deep performance stats */}
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', justify: 'between' }),
                'md:col-span-7 bg-surface border border-outline-variant rounded-xl p-6 shadow-sm',
              )}
            >
              <div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-10 h-10 rounded-lg bg-surface-container text-primary mb-4',
                  )}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    bar_chart
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('2xl'),
                    cm.fontWeight('bold'),
                    'text-on-surface mb-2',
                  )}
                >
                  {t(
                    'landing.features.stats.title',
                    {},
                    { defaultValue: 'Deep Performance Statistics' },
                  )}
                </h3>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-on-surface-variant leading-relaxed mb-6',
                  )}
                >
                  {t(
                    'landing.features.stats.body',
                    {},
                    {
                      defaultValue:
                        'Track your cognitive growth across weeks and seasons. Analyze your guess distribution curve, win percentage, and average solve time without logging into any third-party network.',
                    },
                  )}
                </p>
              </div>
              <div
                className={cm.cn(
                  cm.sp('p', 4),
                  'bg-surface-container-low p-4 rounded-lg border border-outline-variant',
                )}
              >
                <div
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'text-on-surface-variant uppercase tracking-wider pb-1',
                  )}
                >
                  {t(
                    'landing.features.stats.distribution',
                    {},
                    { defaultValue: 'Guess Distribution' },
                  )}
                </div>
                {GUESS_DISTRIBUTION.map((row) => (
                  <div
                    key={row.tries}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 2 }),
                      cm.textSize('xs'),
                      'font-mono mt-2',
                    )}
                  >
                    <span
                      className={cm.cn(
                        'w-3',
                        row.today ? 'text-primary font-bold' : 'text-on-surface-variant',
                      )}
                    >
                      {row.tries}
                    </span>
                    <div
                      style={{ width: `${row.pct}%` }}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'end' }),
                        'h-5 rounded-sm px-1.5 text-xs font-bold min-w-[20px]',
                        row.today
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-high text-on-surface',
                      )}
                    >
                      {row.today
                        ? t(
                            'landing.features.stats.today',
                            { count: row.count },
                            { defaultValue: `${row.count} (Today)` },
                          )
                        : row.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Commuter & offline ready */}
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', justify: 'between' }),
                'md:col-span-5 bg-surface border border-outline-variant rounded-xl p-6 shadow-sm',
              )}
            >
              <div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-10 h-10 rounded-lg bg-surface-container text-primary mb-4',
                  )}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    subway
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('2xl'),
                    cm.fontWeight('bold'),
                    'text-on-surface mb-2',
                  )}
                >
                  {t(
                    'landing.features.offline.title',
                    {},
                    { defaultValue: 'Commuter & Offline Ready' },
                  )}
                </h3>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-on-surface-variant leading-relaxed mb-6',
                  )}
                >
                  {t(
                    'landing.features.offline.body',
                    {},
                    {
                      defaultValue:
                        'Subway tunnels, airplane cabins, or countryside retreats. Lexlet caches each day’s challenge seamlessly. Play with zero cellular bars—it syncs when you reconnect.',
                    },
                  )}
                </p>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  'p-4 bg-surface-container-low rounded-lg border border-outline-variant',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 2.5 }))}>
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                    wifi_off
                  </span>
                  <div>
                    <p
                      className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-on-surface')}
                    >
                      {t(
                        'landing.features.offline.engine',
                        {},
                        { defaultValue: 'Offline PWA Engine' },
                      )}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'landing.features.offline.footprint',
                        {},
                        { defaultValue: 'Under 250kb footprint' },
                      )}
                    </p>
                  </div>
                </div>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'text-primary bg-primary-container/30 border border-primary/20 px-2 py-1 rounded',
                  )}
                >
                  {t('landing.features.offline.instant', {}, { defaultValue: 'Instant' })}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Community — testimonials with streak chips */}
        <section
          id="community"
          className={cm.cn('bg-surface-container-low border-t border-outline-variant py-16')}
        >
          <div className={cm.cn('max-w-7xl mx-auto px-4')}>
            <div className={cm.cn('text-center max-w-2xl mx-auto mb-12')}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-primary mb-2',
                )}
              >
                {t('landing.community.eyebrow', {}, { defaultValue: 'Morning Society' })}
              </p>
              <h2
                className={cm.cn(cm.textSize('4xl'), cm.fontWeight('extrabold'), 'text-on-surface')}
              >
                {t(
                  'landing.community.title',
                  {},
                  { defaultValue: 'Loved by breakfast thinkers everywhere.' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-2')}>
                {t(
                  'landing.community.subtitle',
                  {},
                  {
                    defaultValue:
                      'Because everyone plays the same word, the leaderboard is a daily group portrait: how many solved it, in how many guesses, and which streaks are still standing. Over one million daily solvers start their morning mental gears turning with Lexlet.',
                  },
                )}
              </p>
            </div>
            <div className={cm.cn(cm.flex({ justify: 'center' }), 'mb-10')}>
              <Link
                to={isAuthenticated ? '/leaderboard' : '/signup'}
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'bg-primary text-on-primary hover:bg-[var(--puzzle-primary-hover)] rounded-lg shadow-sm transition',
                )}
                data-mol-id="landing-community-cta"
              >
                {t('landing.community.cta', {}, { defaultValue: 'See the leaderboard' })}
              </Link>
            </div>
            <div className={cm.cn(cm.grid({ cols: 1, gap: 6 }), 'md:grid-cols-3')}>
              {TESTIMONIALS.map((item) => (
                <div
                  key={item.key}
                  className={cm.cn(
                    cm.flex({ direction: 'col', justify: 'between' }),
                    'bg-surface p-6 rounded-xl border border-outline-variant shadow-sm',
                  )}
                >
                  <blockquote
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface leading-relaxed mb-6')}
                  >
                    “{t(item.key, {}, { defaultValue: item.quote })}”
                  </blockquote>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      'border-t border-outline-variant/60 pt-4',
                    )}
                  >
                    <div>
                      <h4
                        className={cm.cn(
                          cm.textSize('lg'),
                          cm.fontWeight('bold'),
                          'text-on-surface',
                        )}
                      >
                        {item.name}
                      </h4>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {item.place}
                      </p>
                    </div>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'bg-[var(--color-error-container)] border border-error/30 rounded text-on-error-container',
                      )}
                    >
                      🔥 {item.streak}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA — dark rounded band with glow blobs */}
        <section className={cm.cn('max-w-7xl mx-auto px-4 py-16')}>
          <div
            className={cm.cn(
              'bg-inverse-surface text-inverse-on-surface rounded-2xl p-8 md:p-14 relative overflow-hidden shadow-xl',
            )}
          >
            <div
              className={cm.cn(
                'absolute -right-20 -top-20 w-80 h-80 bg-primary/20 rounded-full blur-3xl pointer-events-none',
              )}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                'absolute -left-20 -bottom-20 w-80 h-80 bg-secondary/15 rounded-full blur-3xl pointer-events-none',
              )}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center' }),
                'relative z-10 max-w-2xl mx-auto text-center',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'rounded-full bg-white/10 text-primary-container border border-white/15 mb-6',
                )}
              >
                <span aria-hidden="true">🔥</span>
                <span>
                  {t('landing.cta.reset', {}, { defaultValue: 'DAILY RESET IN 14H 22M' })}
                </span>
              </div>
              <h2
                className={cm.cn(
                  cm.textSize('5xl'),
                  cm.fontWeight('extrabold'),
                  'tracking-tight mb-4 text-white',
                )}
              >
                {t('landing.cta.title', {}, { defaultValue: 'Ready for today’s mystery?' })}
                <br />
                <span className={cm.cn('text-primary-container')}>
                  {t(
                    'landing.cta.subtitle',
                    { number: 428 },
                    { defaultValue: 'Puzzle #428 is waiting.' },
                  )}
                </span>
              </h2>
              <p className={cm.cn(cm.textSize('base'), 'text-surface-dim max-w-lg mb-8')}>
                {t(
                  'landing.cta.body',
                  {},
                  {
                    defaultValue:
                      'Join 85,000+ minds solving right now. Six rows, five letters, infinite fun. No sign-up barrier. Six tries. No spoilers. See you tomorrow.',
                  },
                )}
              </p>
              <Link
                to={isAuthenticated ? '/play' : '/signup'}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 3 }),
                  cm.sp('px', 8),
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'bg-primary text-on-primary hover:bg-[var(--puzzle-primary-hover)] rounded-xl shadow-lg transition-all py-4',
                )}
                data-mol-id="landing-bottom-cta"
              >
                <span>
                  {isAuthenticated
                    ? t('landing.cta.play', {}, { defaultValue: 'Start Playing Now — Free' })
                    : t('landing.cta.start', {}, { defaultValue: 'Play your first word' })}
                </span>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default Landing
