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

const CATEGORY_CHIPS = [
  'Science',
  'History',
  'Pop Culture',
  'Geography',
  'Sports',
  'Art',
  'Tech',
  'Literature',
]

const HERO_MOCKUP_ANSWERS = [
  {
    letter: 'A',
    label: 'Sydney',
    bar: 'bg-primary',
    letter_text: 'text-primary',
    hover: 'group-hover:text-primary',
  },
  {
    letter: 'B',
    label: 'Melbourne',
    bar: 'bg-blue-500',
    letter_text: 'text-blue-600',
    hover: 'group-hover:text-blue-600',
  },
  {
    letter: 'C',
    label: 'Canberra',
    bar: 'bg-amber-400',
    letter_text: 'text-amber-700',
    hover: 'group-hover:text-amber-700',
  },
  {
    letter: 'D',
    label: 'Brisbane',
    bar: 'bg-emerald-500',
    letter_text: 'text-emerald-600',
    hover: 'group-hover:text-emerald-600',
  },
] as const

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
          <div
            className={cm.cn(
              'relative z-10 mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center',
              cm.maxW('7xl'),
            )}
          >
            <div>
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
                  'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-tight font-extrabold font-headline mb-6 text-on-background',
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
              <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), 'flex-wrap pt-2')}>
                <Link
                  to="/signup"
                  className={cm.cn(
                    'inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-lg font-headline font-bold text-on-primary',
                    'bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
                    play_arrow
                  </span>
                  {t('landing.hero.ctaPrimary', {}, { defaultValue: 'Start hosting free' })}
                </Link>
                <Link
                  to="/discover"
                  className={cm.cn(
                    'inline-flex items-center px-8 py-3.5 rounded-xl text-lg font-headline font-bold',
                    'bg-surface-container-highest text-primary hover:bg-surface-variant transition-colors',
                  )}
                >
                  {t('landing.hero.ctaSecondary', {}, { defaultValue: 'Try a sample quiz' })}
                </Link>
              </div>
              <div className={cm.sp('pt', 8)}>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-on-surface-variant tracking-wide uppercase',
                  )}
                >
                  {t(
                    'landing.hero.proofUsers',
                    { count: '50,000' },
                    { defaultValue: '{{count}}+ quizzes played daily' },
                  )}
                </p>
              </div>
            </div>

            {/* Game board mockup */}
            <div className={cm.cn('relative', cm.sp('px', 4), 'lg:px-0')}>
              <div
                className={cm.cn(
                  'bg-gradient-to-br from-primary to-primary-dark rounded-xl p-8 shadow-2xl shadow-primary/25 relative overflow-hidden',
                )}
                data-mol-id="hero-game-board"
              >
                {/* Timer bar */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-surface/20">
                  <div className="h-full bg-amber-400 w-3/4 rounded-r-full" />
                </div>
                <div className="bg-surface/70 backdrop-blur-xl p-6 rounded-xl mt-4 mb-8">
                  <h3 className={cm.cn('font-headline font-bold text-xl text-on-background mb-2')}>
                    {t(
                      'landing.mockup.question',
                      {},
                      { defaultValue: 'What is the capital of Australia?' },
                    )}
                  </h3>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'text-on-surface-variant',
                    )}
                  >
                    {t(
                      'landing.mockup.meta',
                      {
                        category: t('landing.mockup.category', {}, { defaultValue: 'Geography' }),
                        difficulty: t('landing.mockup.difficulty', {}, { defaultValue: 'Medium' }),
                      },
                      { defaultValue: '{{category}} • {{difficulty}}' },
                    )}
                  </p>
                </div>
                <div className={cm.cn(cm.grid({ cols: 1, gap: 3 }), 'sm:grid-cols-2 sm:gap-4')}>
                  {HERO_MOCKUP_ANSWERS.map((answer) => (
                    <div
                      key={answer.letter}
                      className={cm.cn(
                        'bg-surface-container-lowest p-4 rounded-xl shadow-sm flex items-center gap-3 relative overflow-hidden group',
                      )}
                    >
                      <div className={cm.cn('absolute left-0 top-0 bottom-0 w-1.5', answer.bar)} />
                      <span
                        className={cm.cn(
                          'w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-headline font-bold shrink-0',
                          answer.letter_text,
                        )}
                      >
                        {answer.letter}
                      </span>
                      <span
                        className={cm.cn(
                          cm.fontWeight('medium'),
                          answer.hover,
                          'transition-colors',
                        )}
                      >
                        {t(
                          `landing.mockup.answer${answer.letter}`,
                          {},
                          { defaultValue: answer.label },
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Floating XP badge */}
              <div
                className={cm.cn(
                  'absolute -right-2 lg:-right-4 -top-4 lg:-top-6 bg-amber-400 text-amber-950 px-4 py-2 rounded-xl font-headline font-bold text-sm rotate-6 shadow-lg',
                )}
              >
                {t('landing.mockup.xp', { xp: 150 }, { defaultValue: '+{{xp}} XP' })}
              </div>
            </div>
          </div>
        </section>

        {/* Categories row */}
        <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 12), cm.maxW('7xl'), 'mx-auto')}>
          <div className={cm.cn(cm.flex({ justify: 'center', wrap: 'wrap', gap: 3 }))}>
            {CATEGORY_CHIPS.map((chip) => (
              <Link
                key={chip}
                to="/discover"
                className={cm.cn(
                  'bg-surface-container-low text-primary px-5 py-2.5 rounded-full font-headline font-semibold text-sm',
                  'hover:bg-primary-container hover:text-on-primary-container transition-colors',
                )}
              >
                {t(`landing.category.${chip}`, {}, { defaultValue: chip })}
              </Link>
            ))}
          </div>
        </section>

        <section
          id="features"
          className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.maxW('7xl'), 'mx-auto')}
        >
          <div className={cm.sp('mb', 10)}>
            <span
              className={cm.cn('text-[10px] uppercase tracking-widest font-black text-primary')}
            >
              {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
            </span>
            <h2
              className={cm.cn(
                'text-3xl md:text-4xl font-extrabold font-headline tracking-tight mt-2',
              )}
            >
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
          className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.maxW('7xl'), 'mx-auto')}
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
              <h2
                className={cm.cn(
                  'text-3xl md:text-4xl font-extrabold font-headline tracking-tight mt-2',
                )}
              >
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
          className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.maxW('7xl'), 'mx-auto')}
        >
          <div
            className={cm.cn(
              'relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-300 to-amber-400 p-10 md:p-12 shadow-xl shadow-amber-400/25',
            )}
          >
            <span
              className={cm.cn(
                'absolute top-0 right-0 w-64 h-64 rounded-full bg-white/20 blur-3xl translate-x-1/2 -translate-y-1/2',
              )}
              aria-hidden="true"
            />
            <span
              className={cm.cn(
                'absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/20 blur-3xl -translate-x-1/2 translate-y-1/2',
              )}
              aria-hidden="true"
            />
            <div className={cm.cn('relative z-10 max-w-2xl mx-auto text-center')}>
              <h2
                className={cm.cn(
                  'text-3xl md:text-4xl font-extrabold font-headline text-amber-900 tracking-tight mb-6',
                )}
              >
                {t(
                  'landing.cta.heading',
                  {},
                  { defaultValue: 'Create your first quiz — free forever' },
                )}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('medium'),
                  'text-amber-900/80 mb-8',
                )}
              >
                {t(
                  'landing.cta.subhead',
                  {},
                  {
                    defaultValue:
                      'Join thousands of creators building engaging trivia experiences.',
                  },
                )}
              </p>
              <Link
                to="/signup"
                className={cm.cn(
                  'inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-lg font-headline font-bold',
                  'bg-amber-950 text-amber-200 hover:opacity-90 transition-opacity',
                )}
              >
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
