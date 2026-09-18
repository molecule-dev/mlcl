import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { QuizCard } from '../components/QuizCard.js'
import { SparqLogo } from '../components/SparqLogo.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

const SAMPLE_QUIZZES = [
  {
    id: 'sample-1',
    title: 'World Capitals: Sprint Edition',
    category: 'Geography',
    questions: 12,
    plays: 4280,
    durationMinutes: 5,
    difficulty: 'easy' as const,
    iconGlyph: 'public',
    hue: 'sky' as const,
    authorName: 'Maya Pereira',
    authorAvatarSeed: 'maya',
  },
  {
    id: 'sample-2',
    title: 'Music Theory: Chords & Cadences',
    category: 'Music',
    questions: 20,
    plays: 1890,
    durationMinutes: 9,
    difficulty: 'medium' as const,
    iconGlyph: 'music_note',
    hue: 'rose' as const,
    authorName: 'Jules Okafor',
    authorAvatarSeed: 'jules',
  },
  {
    id: 'sample-3',
    title: 'Periodic Table Speed Drill',
    category: 'Science',
    questions: 30,
    plays: 9120,
    durationMinutes: 12,
    difficulty: 'hard' as const,
    iconGlyph: 'science',
    hue: 'emerald' as const,
    authorName: 'Dr. Lin Tao',
    authorAvatarSeed: 'lintao',
  },
]

const FEATURE_TILES = [
  {
    glyph: 'bolt',
    title: 'Live multiplayer',
    body: 'Spin up a lobby, share a 6-letter code, and watch the leaderboard ignite in real time.',
  },
  {
    glyph: 'auto_awesome',
    title: 'AI quiz builder',
    body: 'Paste your notes — {{appName}} drafts question banks with answer keys you can edit in seconds.',
  },
  {
    glyph: 'local_fire_department',
    title: 'Streaks & badges',
    body: 'Earn streak multipliers, claim daily flames, and chase achievements across every category.',
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
          <SparqLogo size="md" />
        </Link>
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 6 }), 'hidden md:flex')}>
          <a
            href="#features"
            className={cm.cn(
              cm.textSize('sm'),
              'font-semibold text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <a
            href="#popular"
            className={cm.cn(
              cm.textSize('sm'),
              'font-semibold text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('landing.nav.popular', {}, { defaultValue: 'Popular quizzes' })}
          </a>
          <a
            href="#hosts"
            className={cm.cn(
              cm.textSize('sm'),
              'font-semibold text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('landing.nav.hosts', {}, { defaultValue: 'For hosts' })}
          </a>
        </nav>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/discover"
              data-mol-id="landing-go-to-dashboard"
              className={cm.cn(
                cm.textSize('sm'),
                'font-extrabold px-4 py-2 rounded-xl bg-primary text-white shadow-md shadow-primary/30 hover:bg-primary/90 transition-colors',
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
                  'font-semibold px-4 py-2 rounded-xl text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.textSize('sm'),
                  'font-extrabold px-4 py-2 rounded-xl bg-primary text-white shadow-md shadow-primary/30 hover:bg-primary/90 transition-colors',
                )}
              >
                {t('common.getStarted', {}, { defaultValue: 'Get started' })}
              </Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section
          className={cm.cn(
            'relative overflow-hidden',
            cm.sp('px', 8),
            cm.sp('pt', 16),
            cm.sp('pb', 12),
          )}
        >
          <span
            className={cm.cn(
              'absolute -top-32 -right-24 w-[480px] h-[480px] rounded-full bg-gradient-to-br from-primary/30 to-amber-400/20 blur-3xl',
            )}
            aria-hidden="true"
          />
          <span
            className={cm.cn(
              'absolute -bottom-24 -left-32 w-[420px] h-[420px] rounded-full bg-tertiary/30 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div className={cm.cn('relative z-10 mx-auto', cm.maxW('2xl'))}>
            <span
              className={cm.cn(
                'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest',
                'bg-primary-container/40 text-primary border border-primary/20',
                cm.sp('mb', 6),
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                bolt
              </span>
              {t('landing.eyebrow', {}, { defaultValue: 'Ignite every answer' })}
            </span>
            <h1
              className={cm.cn(
                'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold mb-6 text-on-surface',
              )}
            >
              {t('landing.hero.line1', {}, { defaultValue: 'Quizzes that actually' })}
              <span
                className={cm.cn(
                  'block bg-gradient-to-r from-primary via-tertiary to-amber-500 bg-clip-text text-transparent',
                )}
              >
                {t('landing.hero.line2', {}, { defaultValue: 'spark the room.' })}
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                'text-on-surface-variant max-w-2xl mb-8 leading-relaxed',
              )}
            >
              {t(
                'landing.hero.subhead',
                {},
                {
                  defaultValue:
                    'Build playful question packs, host live games with a join code, and watch your classroom or game night light up with streaks, badges, and leaderboards.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), 'flex-wrap mb-10')}>
              <Link
                to="/signup"
                className={cm.cn(
                  'inline-flex items-center gap-2 px-7 py-3 rounded-2xl text-sm font-extrabold uppercase tracking-widest text-white',
                  'bg-gradient-to-r from-primary to-tertiary shadow-xl shadow-primary/30 hover:scale-[1.02] transition-transform',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                  rocket_launch
                </span>
                {t('landing.hero.ctaPrimary', {}, { defaultValue: 'Start hosting free' })}
              </Link>
              <Link
                to="/discover"
                className={cm.cn(
                  'inline-flex items-center gap-2 px-7 py-3 rounded-2xl text-sm font-extrabold uppercase tracking-widest',
                  'bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                  travel_explore
                </span>
                {t('landing.hero.ctaSecondary', {}, { defaultValue: 'Try a sample quiz' })}
              </Link>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 6 }),
                'flex-wrap text-xs text-on-surface-variant',
              )}
            >
              <span className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                <span className={cm.cn('flex -space-x-2')}>
                  {['p1', 'p2', 'p3', 'p4'].map((seed) => (
                    <img
                      key={seed}
                      src={`https://picsum.photos/seed/${seed}/64/64`}
                      alt=""
                      className={cm.cn('w-7 h-7 rounded-full ring-2 ring-surface object-cover')}
                    />
                  ))}
                </span>
                <span className={cm.cn('font-semibold')}>
                  {t(
                    'landing.hero.proofUsers',
                    { count: '12,400' },
                    { defaultValue: '{{count}} hosts running games this week' },
                  )}
                </span>
              </span>
              <span className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
                <span
                  className={cm.cn('material-symbols-outlined text-warning text-[18px]')}
                  aria-hidden="true"
                >
                  star
                </span>
                <span className={cm.cn('font-bold')}>4.9</span>{' '}
                {t('landing.hero.proofRating', {}, { defaultValue: 'on app stores' })}
              </span>
            </div>
          </div>
        </section>

        <section
          id="features"
          className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.maxW('2xl'), 'mx-auto')}
        >
          <div className={cm.sp('mb', 10)}>
            <span
              className={cm.cn('text-[10px] uppercase tracking-widest font-black text-primary')}
            >
              {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
            </span>
            <h2 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mt-2')}>
              {t(
                'landing.features.heading',
                {},
                { defaultValue: 'A quiz studio that fits the way you teach and play.' },
              )}
            </h2>
          </div>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-3')}>
            {FEATURE_TILES.map((tile) => (
              <div
                key={tile.glyph}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-3xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm hover:-translate-y-0.5 transition-transform',
                )}
              >
                <span
                  className={cm.cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary to-tertiary text-white shadow-lg shadow-primary/20',
                    cm.sp('mb', 4),
                  )}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">{tile.glyph}</span>
                </span>
                <h3 className={cm.cn('text-lg font-extrabold tracking-tight mb-2')}>
                  {t(`landing.features.${tile.glyph}.title`, {}, { defaultValue: tile.title })}
                </h3>
                <p className={cm.cn('text-sm text-on-surface-variant leading-relaxed')}>
                  {t(
                    `landing.features.${tile.glyph}.body`,
                    { appName: APP_NAME },
                    { defaultValue: tile.body },
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="popular"
          className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.maxW('2xl'), 'mx-auto')}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'end', justify: 'between' }),
              cm.sp('mb', 8),
              'flex-wrap gap-4',
            )}
          >
            <div>
              <span
                className={cm.cn('text-[10px] uppercase tracking-widest font-black text-primary')}
              >
                {t('landing.popular.eyebrow', {}, { defaultValue: 'Popular this week' })}
              </span>
              <h2 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mt-2')}>
                {t(
                  'landing.popular.heading',
                  {},
                  { defaultValue: 'Drop into a quiz hosts are running today.' },
                )}
              </h2>
            </div>
            <Link
              to="/discover"
              className={cm.cn('text-sm font-bold text-primary hover:underline')}
            >
              {t('landing.popular.viewAll', {}, { defaultValue: 'Browse all categories →' })}
            </Link>
          </div>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-3')}>
            {SAMPLE_QUIZZES.map((q) => (
              <QuizCard key={q.id} {...q} ctaTo="/login" />
            ))}
          </div>
        </section>

        <section
          id="hosts"
          className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.maxW('2xl'), 'mx-auto')}
        >
          <div
            className={cm.cn(
              'relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary via-primary to-[--quiz-gradient-to] text-white shadow-2xl shadow-primary/30',
              cm.sp('p', 12),
            )}
          >
            <span
              className={cm.cn(
                'absolute -right-32 -bottom-32 w-[420px] h-[420px] rounded-full bg-amber-400/30 blur-3xl',
              )}
              aria-hidden="true"
            />
            <span
              className={cm.cn(
                'absolute -left-24 -top-24 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
              )}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                'relative z-10',
                cm.flex({ direction: 'col', gap: 4 }),
                'lg:flex-row lg:items-center lg:justify-between',
              )}
            >
              <div className={cm.maxW('lg')}>
                <span
                  className={cm.cn(
                    'inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest mb-4',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[14px]')}
                    aria-hidden="true"
                  >
                    school
                  </span>
                  {t('landing.cta.eyebrow', {}, { defaultValue: 'Free for educators' })}
                </span>
                <h2
                  className={cm.cn(
                    'text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-3',
                  )}
                >
                  {t(
                    'landing.cta.heading',
                    {},
                    { defaultValue: 'Bring the spark to every lesson.' },
                  )}
                </h2>
                <p className={cm.cn('text-white/85 text-lg max-w-xl')}>
                  {t(
                    'landing.cta.subhead',
                    {},
                    {
                      defaultValue:
                        'Sign up in 30 seconds. Host unlimited live games, draft quizzes with AI, and keep every player on a streak.',
                    },
                  )}
                </p>
              </div>
              <Link
                to="/signup"
                className={cm.cn(
                  'inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-amber-400 text-amber-950 font-extrabold text-sm uppercase tracking-widest shadow-xl shadow-amber-400/30 hover:bg-amber-300 transition-colors flex-shrink-0',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                  bolt
                </span>
                {t('landing.cta.button', {}, { defaultValue: 'Create your first quiz' })}
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
