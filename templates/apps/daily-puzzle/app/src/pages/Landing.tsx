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
  { word: 'stone', feedback: ['absent', 'absent', 'absent', 'correct', 'correct'] },
  { word: 'crane', feedback: ['absent', 'absent', 'absent', 'correct', 'correct'] },
  { word: 'ocean', feedback: ['absent', 'absent', 'correct', 'absent', 'correct'] },
  { word: 'range', feedback: ['correct', 'correct', 'correct', 'correct', 'correct'] },
]

const SHARE_CARD = [
  'Daily Puzzle #259 ✅ 4/6',
  '⬛⬛⬛🟩🟩',
  '⬛⬛⬛🟩🟩',
  '⬛⬛🟩⬛🟩',
  '🟩🟩🟩🟩🟩',
  '🔥 12',
]

const FEATURE_TILES = [
  {
    glyph: 'calendar_month',
    title: 'A new word every day',
    body: 'One five-letter word per calendar day, the same for everyone. Solve it in six tries — then come back tomorrow.',
  },
  {
    glyph: 'local_fire_department',
    title: 'Streaks & stats',
    body: 'Track your win rate, current and max streak, and your full guess distribution. Every solved day feeds the fire.',
  },
  {
    glyph: 'emoji_events',
    title: 'Global leaderboard',
    body: 'See how the whole field fared today — solve distribution attempt by attempt — and who is riding the longest streaks.',
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 4),
          'sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30',
        )}
      >
        <Link to="/" aria-label={`${APP_NAME} home`}>
          <LexletLogo size="md" />
        </Link>
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 6 }), 'hidden md:flex')}>
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
          <Link
            to="/pricing"
            className={cm.cn(
              cm.textSize('sm'),
              'font-semibold text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
        </nav>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/play"
              className={cm.button({ variant: 'solid', color: 'primary', size: 'md' })}
              data-mol-id="landing-go-to-play"
            >
              {t('landing.nav.playToday', {}, { defaultValue: 'Play today' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  cm.textSize('sm'),
                  'font-semibold text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('nav.signIn', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.button({ variant: 'solid', color: 'primary', size: 'md' })}
                data-mol-id="landing-signup"
              >
                {t('nav.getStarted', {}, { defaultValue: 'Get started' })}
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 6 }),
          'relative overflow-hidden px-6 pt-16 pb-20',
        )}
      >
        <div
          className={cm.cn(
            'absolute inset-0 -z-10 bg-gradient-to-b from-primary-container/40 via-surface to-surface',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 3 }),
            'text-center max-w-2xl',
          )}
        >
          <span className={cm.cn(cm.badge({ variant: 'primary' }), 'uppercase tracking-widest')}>
            {t('landing.hero.badge', {}, { defaultValue: 'A new word every day' })}
          </span>
          <h1
            className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {t('landing.hero.headline', {}, { defaultValue: 'One word. Every day. Six tries.' })}
          </h1>
          <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
            {t(
              'landing.hero.subhead',
              {},
              {
                defaultValue:
                  'Guess the hidden five-letter word, watch the tiles flip, and keep your streak alive — the whole world plays the same word each day.',
              },
            )}
          </p>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('pt', 2))}>
            <Link
              to={isAuthenticated ? '/play' : '/signup'}
              className={cm.button({ variant: 'solid', color: 'primary', size: 'lg' })}
              data-mol-id="landing-hero-cta"
            >
              {isAuthenticated
                ? t('landing.hero.cta.play', {}, { defaultValue: 'Play today’s puzzle' })
                : t('landing.hero.cta.start', {}, { defaultValue: 'Start playing free' })}
            </Link>
            <Link
              to="/how-to-play"
              className={cm.button({ variant: 'outline', color: 'secondary', size: 'lg' })}
              data-mol-id="landing-hero-how"
            >
              {t('landing.hero.cta.how', {}, { defaultValue: 'How to play' })}
            </Link>
          </div>
        </div>
        <div className={cm.cn(cm.card(), cm.cardPadding('lg'), 'shadow-xl shadow-primary/10')}>
          <PuzzleBoard guesses={DEMO_GUESSES} animate={false} />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className={cm.cn(cm.container({ size: 'lg' }), 'py-16')}>
        <h2
          className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'text-center mb-10')}
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {t('landing.how.title', {}, { defaultValue: 'A tiny daily ritual' })}
        </h2>
        <div className={cm.cn(cm.grid({ cols: 3 }), 'gap-6')}>
          {FEATURE_TILES.map((feature) => (
            <article
              key={feature.glyph}
              className={cm.cn(cm.card(), cm.cardPadding('lg'), 'text-center')}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'w-12 h-12 mx-auto rounded-2xl bg-primary-container text-on-primary-container text-2xl',
                )}
                aria-hidden="true"
                data-molecule-icon={feature.glyph}
              >
                ●
              </span>
              <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'mt-3')}>
                {t(`landing.how.${feature.glyph}.title`, {}, { defaultValue: feature.title })}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-2')}>
                {t(`landing.how.${feature.glyph}.body`, {}, { defaultValue: feature.body })}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Streaks & share */}
      <section id="streaks" className={cm.cn(cm.container({ size: 'lg' }), 'py-16')}>
        <div className={cm.cn(cm.grid({ cols: 2 }), 'gap-10 items-center')}>
          <div>
            <h2
              className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t('landing.streaks.title', {}, { defaultValue: 'Streaks you hate to break' })}
            </h2>
            <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant mt-3 mb-4')}>
              {t(
                'landing.streaks.body',
                {},
                {
                  defaultValue:
                    'Every solved day adds one to your streak. Miss a day and it resets — the quiet pressure that brings players back each morning. Track win rate, streaks, and your guess distribution on the Stats page, and replay any past day from the Archive as streak-safe practice.',
                },
              )}
            </p>
            <Link
              to="/how-to-play"
              className={cm.button({ variant: 'outline', color: 'secondary', size: 'md' })}
              data-mol-id="landing-streaks-how"
            >
              {t('landing.streaks.cta', {}, { defaultValue: 'See how it works' })}
            </Link>
          </div>
          <div className={cm.cn(cm.card(), cm.cardPadding('md'), 'font-mono text-sm')}>
            {SHARE_CARD.map((line, i) => (
              <div key={i} className={i === 0 ? 'font-bold mb-2' : 'leading-relaxed'}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community */}
      <section id="community" className={cm.cn(cm.container({ size: 'lg' }), 'py-16')}>
        <div className={cm.cn(cm.grid({ cols: 2 }), 'gap-10 items-center')}>
          <div className={cm.cn(cm.card(), cm.cardPadding('md'))}>
            <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
              {t('landing.community.card.title', {}, { defaultValue: 'Today at a glance' })}
            </h3>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }), 'mt-4')}>
              {[42, 87, 64, 31, 12, 4].map((value, i) => (
                <div key={i} className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                  <span className={cm.cn(cm.textSize('sm'), 'w-4 text-on-surface font-bold')}>
                    {i + 1}
                  </span>
                  <div
                    className={cm.cn(
                      'flex-1 h-5 bg-surface-container-high rounded overflow-hidden',
                    )}
                  >
                    <div
                      className="h-full rounded bg-primary"
                      style={{ width: `${(100 * value) / 87}%` }}
                    />
                  </div>
                  <span
                    className={cm.cn(cm.textSize('xs'), 'w-8 text-right text-on-surface-variant')}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2
              className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t('landing.community.title', {}, { defaultValue: 'The whole field, one word' })}
            </h2>
            <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant mt-3 mb-4')}>
              {t(
                'landing.community.body',
                {},
                {
                  defaultValue:
                    'Because everyone plays the same word, the leaderboard is a daily group portrait: how many solved it, in how many guesses, and which streaks are still standing. Jump in — the word is waiting.',
                },
              )}
            </p>
            <Link
              to={isAuthenticated ? '/leaderboard' : '/signup'}
              className={cm.button({ variant: 'solid', color: 'primary', size: 'md' })}
              data-mol-id="landing-community-cta"
            >
              {t('landing.community.cta', {}, { defaultValue: 'See the leaderboard' })}
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className={cm.cn(cm.container({ size: 'md' }), 'py-16 text-center')}>
        <h2
          className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {t('landing.cta.title', {}, { defaultValue: 'Today’s word is live.' })}
        </h2>
        <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant mt-2 mb-6')}>
          {t('landing.cta.body', {}, { defaultValue: 'Six tries. No spoilers. See you tomorrow.' })}
        </p>
        <Link
          to={isAuthenticated ? '/play' : '/signup'}
          className={cm.button({ variant: 'solid', color: 'primary', size: 'lg' })}
          data-mol-id="landing-bottom-cta"
        >
          {isAuthenticated
            ? t('landing.cta.play', {}, { defaultValue: 'Play today’s puzzle' })
            : t('landing.cta.start', {}, { defaultValue: 'Play your first word' })}
        </Link>
      </section>

      <Footer />
    </div>
  )
}

export default Landing
