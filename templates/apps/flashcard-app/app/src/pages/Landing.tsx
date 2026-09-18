import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { LandingTopNavBar } from '../components/LandingTopNavBar.js'

const FEATURES = [
  {
    key: 'spaced',
    icon: 'schedule',
    titleDefault: 'Spaced repetition that works',
    bodyDefault:
      'SuperMemo-2 algorithm. Cards you barely know come back tomorrow; cards you nail wait a week.',
  },
  {
    key: 'streaks',
    icon: 'local_fire_department',
    titleDefault: 'Streaks for the long game',
    bodyDefault:
      'Daily review counter, amber flame. Skip a day, the streak resets — but you keep all the cards.',
  },
  {
    key: 'authoring',
    icon: 'edit_note',
    titleDefault: 'Markdown + cloze deletion',
    bodyDefault:
      'Write cards in markdown. Hide any phrase with {{cloze::word}} and the back fills in.',
  },
  {
    key: 'shared',
    icon: 'unfold_more',
    titleDefault: 'Bring your own deck',
    bodyDefault:
      'Import from Anki .apkg or CSV. Export anytime. Your knowledge, your data, no lock-in.',
  },
] as const

const STATS = [
  { key: 'cards', valueDefault: '4,832', labelDefault: 'Cards reviewed today' },
  { key: 'retain', valueDefault: '92%', labelDefault: 'Avg retention' },
  { key: 'streak', valueDefault: '38d', labelDefault: 'Avg streak' },
  { key: 'minutes', valueDefault: '14m', labelDefault: 'Daily commitment' },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}>
      <LandingTopNavBar />

      <main>
        {/* Hero */}
        <section className={cm.cn('relative overflow-hidden', cm.sp('pt', 16), cm.sp('pb', 12))}>
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-3xl',
            )}
          />
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute -bottom-32 -left-40 h-96 w-96 rounded-full bg-tertiary/15 blur-3xl',
            )}
          />

          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'relative z-10 grid lg:grid-cols-[1.15fr_1fr] gap-12 items-center',
            )}
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                {t(
                  'landing.eyebrow',
                  {},
                  { defaultValue: 'Spaced repetition · 79 languages · open data' },
                )}
              </p>
              <h1
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('mt', 4),
                  'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold',
                )}
              >
                {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}.' })}
              </h1>
              <p
                className={cm.cn(
                  cm.sp('mt', 6),
                  'text-lg md:text-xl text-on-surface-variant max-w-xl leading-relaxed',
                )}
              >
                {t(
                  'landing.heroSubtitle',
                  {},
                  {
                    defaultValue:
                      'Spaced repetition makes the difference between cramming and remembering. Five minutes a day, year after year, and the language sticks.',
                  },
                )}
              </p>

              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('mt', 8),
                  'flex-wrap',
                )}
              >
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.fontWeight('bold'),
                    'rounded-2xl bg-primary text-on-primary text-base shadow-lg hover:scale-[1.02] transition-transform inline-flex items-center gap-2',
                  )}
                  data-mol-id="hero-cta-primary"
                >
                  {t('landing.heroCta', {}, { defaultValue: 'Start studying free' })}
                  <span className={cm.cn('material-symbols-outlined text-lg')} aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 4),
                    cm.fontWeight('semibold'),
                    'rounded-2xl border border-outline-variant text-sm text-on-surface hover:bg-surface-container transition-colors',
                  )}
                  data-mol-id="hero-cta-secondary"
                >
                  {t('landing.heroSecondary', {}, { defaultValue: 'I already have an account' })}
                </Link>
              </div>

              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('mt', 8),
                  'flex-wrap text-xs font-medium text-on-surface-variant',
                )}
              >
                <span className={cm.cn('inline-flex items-center gap-1.5')}>
                  <span
                    className={cm.cn('material-symbols-outlined text-base text-success')}
                    aria-hidden="true"
                  >
                    check_circle
                  </span>
                  {t('landing.proof.free', {}, { defaultValue: 'Free forever for personal use' })}
                </span>
                <span aria-hidden="true">·</span>
                <span className={cm.cn('inline-flex items-center gap-1.5')}>
                  <span
                    className={cm.cn('material-symbols-outlined text-base text-success')}
                    aria-hidden="true"
                  >
                    check_circle
                  </span>
                  {t('landing.proof.import', {}, { defaultValue: 'Import .apkg / CSV' })}
                </span>
                <span aria-hidden="true">·</span>
                <span className={cm.cn('inline-flex items-center gap-1.5')}>
                  <span
                    className={cm.cn('material-symbols-outlined text-base text-success')}
                    aria-hidden="true"
                  >
                    check_circle
                  </span>
                  {t('landing.proof.export', {}, { defaultValue: 'Open data, no lock-in' })}
                </span>
              </div>
            </div>

            {/* Sample card mirroring auth'd hero */}
            <SampleHero />
          </div>
        </section>

        {/* Stats */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 8))}>
          <div className={cm.grid({ cols: 4, gap: 'md' })}>
            {STATS.map((s) => (
              <div
                key={s.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 text-center',
                )}
              >
                <p
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-3xl md:text-4xl font-extrabold tracking-tight text-primary',
                  )}
                >
                  {t(`landing.stat.${s.key}.value`, {}, { defaultValue: s.valueDefault })}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mt', 2),
                    'font-semibold uppercase tracking-wider text-on-surface-variant',
                  )}
                >
                  {t(`landing.stat.${s.key}.label`, {}, { defaultValue: s.labelDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 16))}>
          <div className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.textCenter, cm.sp('mb', 12))}>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
              {t('landing.featuresEyebrow', {}, { defaultValue: 'Built for memory' })}
            </p>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mt', 3),
                'text-3xl md:text-4xl font-extrabold tracking-tight',
              )}
            >
              {t(
                'landing.featuresHeading',
                {},
                { defaultValue: 'A study tool that respects how memory actually works.' },
              )}
            </h2>
          </div>
          <div className={cm.cn('grid md:grid-cols-2 lg:grid-cols-4 gap-6')}>
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 hover:shadow-md transition-shadow',
                )}
              >
                <span
                  className={cm.cn(
                    'flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-container/60 text-primary',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </span>
                <h3
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.sp('mt', 5),
                    'text-lg font-extrabold tracking-tight',
                  )}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mt', 2),
                    'text-on-surface-variant leading-relaxed',
                  )}
                >
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('pb', 20))}>
          <div
            className={cm.cn(
              cm.sp('p', 12),
              'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-white text-center shadow-xl',
            )}
          >
            <div
              aria-hidden="true"
              className={cm.cn(
                'absolute -top-20 -right-16 h-64 w-64 rounded-full bg-surface/10 blur-3xl',
              )}
            />
            <div
              aria-hidden="true"
              className={cm.cn(
                'absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-tertiary/30 blur-3xl',
              )}
            />
            <p className="relative text-[10px] font-black uppercase tracking-[0.3em] text-white/85">
              {t('landing.finalEyebrow', {}, { defaultValue: '5 minutes a day' })}
            </p>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mt', 4),
                'relative text-3xl md:text-5xl font-extrabold tracking-tight',
              )}
            >
              {t('landing.finalHeading', {}, { defaultValue: 'Your future self will remember.' })}
            </h2>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 8),
                cm.sp('py', 4),
                cm.fontWeight('bold'),
                cm.sp('mt', 8),
                'relative inline-flex items-center gap-2 rounded-2xl bg-surface text-primary text-base shadow-lg hover:scale-[1.02] transition-transform',
              )}
              data-mol-id="final-cta"
            >
              {t('landing.finalCta', {}, { defaultValue: 'Start your first deck' })}
              <span className={cm.cn('material-symbols-outlined text-lg')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function SampleHero() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 8),
        'relative overflow-hidden rounded-[2rem] text-white shadow-2xl',
        'bg-gradient-to-br from-primary via-primary to-primary-container',
      )}
      aria-hidden="true"
    >
      <div
        className={cm.cn(
          'absolute -top-16 -right-16 h-56 w-56 rounded-full bg-surface/15 blur-3xl',
        )}
      />
      <div
        className={cm.cn(
          'absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-tertiary/40 blur-3xl',
        )}
      />
      <span className="material-symbols-outlined absolute -bottom-4 -right-2 text-[140px] text-white/10 select-none">
        psychology
      </span>

      <div className="relative">
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/85">
            {t('landing.sample.eyebrow', {}, { defaultValue: 'Today · Tuesday' })}
          </p>
          <span
            className={cm.cn(
              'rounded-full bg-surface/20 backdrop-blur-md px-3 py-1 text-xs font-bold inline-flex items-center gap-1',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>
              local_fire_department
            </span>
            {t('landing.sample.streak', { days: 47 }, { defaultValue: '{{days}}-day streak' })}
          </span>
        </div>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.sp('mt', 6),
            'text-5xl md:text-6xl tracking-tighter font-extrabold leading-[1.0]',
          )}
        >
          {t('landing.sample.due', { count: 24 }, { defaultValue: '{{count}} cards due' })}
        </p>
        <p className={cm.cn(cm.sp('mt', 3), 'text-base italic text-white/85')}>
          {t(
            'landing.sample.message',
            {},
            { defaultValue: 'Memory rewards consistency, not effort.' },
          )}
        </p>

        <div className={cm.cn(cm.sp('mt', 8))}>
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/75">
              {t('landing.sample.goalLabel', {}, { defaultValue: 'Daily goal' })}
            </span>
            <span className={cm.cn('text-xs font-bold text-white/90')}>
              {t('landing.sample.goalValue', {}, { defaultValue: '32 / 50' })}
            </span>
          </div>
          <div
            className={cm.cn('relative mt-2 h-2 w-full overflow-hidden rounded-full bg-surface/20')}
          >
            <div className={cm.cn('h-full rounded-full bg-surface/95')} style={{ width: '64%' }} />
          </div>
        </div>

        <div
          className={cm.cn(
            cm.sp('p', 5),
            cm.sp('mt', 6),
            'rounded-2xl bg-surface/15 backdrop-blur-md text-center',
          )}
        >
          <p
            className={cm.cn('text-2xl font-medium text-white')}
            style={{ fontFamily: 'var(--mol-font-serif)' }}
          >
            {t('landing.sample.cardFront', {}, { defaultValue: '“perspicacious”' })}
          </p>
          <p
            className={cm.cn('mt-2 text-sm italic text-white/80')}
            style={{ fontFamily: 'var(--mol-font-serif)' }}
          >
            {t('landing.sample.cardBack', {}, { defaultValue: 'having keen insight' })}
          </p>
        </div>
      </div>
    </div>
  )
}
