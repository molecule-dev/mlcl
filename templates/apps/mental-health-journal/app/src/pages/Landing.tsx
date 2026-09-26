import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { MoodHeroCard } from '../components/MoodHeroCard.js'
import { PublicNav } from '../components/PublicNav.js'

const FEATURES = [
  {
    key: 'gentle',
    defaultTitle: 'Gentle daily prompts',
    defaultBody: 'Start each entry with a thoughtful prompt — never a blank page.',
    icon: 'lightbulb',
  },
  {
    key: 'mood',
    defaultTitle: 'Mood-aware patterns',
    defaultBody: 'Track how you feel over time and surface what helps you thrive.',
    icon: 'monitoring',
  },
  {
    key: 'private',
    defaultTitle: 'Private and encrypted',
    defaultBody: 'End-to-end encryption and passcode lock. Your words stay yours.',
    icon: 'lock',
  },
  {
    key: 'insights',
    defaultTitle: 'AI-powered reflections',
    defaultBody: 'Discover triggers, themes, and gratitudes — without losing your voice.',
    icon: 'auto_awesome',
  },
] as const

const STATS = [
  { key: 'entries', defaultLabel: 'Entries this month', value: '24' },
  { key: 'streak', defaultLabel: 'Longest streak', value: '52 days' },
  { key: 'mood', defaultLabel: 'Average mood', value: 'Good' },
  { key: 'mindful', defaultLabel: 'Mindful minutes', value: '410' },
]

const SOCIAL_PROOF = [
  { value: '38k+', label: 'Quiet reflections daily' },
  { value: '4.9★', label: 'iOS App Store rating' },
  { value: '94%', label: 'Feel calmer after a week' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <PublicNav />

      <main>
        <section className={cm.cn(cm.sp('py', 24), 'relative overflow-hidden')}>
          <div
            className={cm.cn(
              'absolute -top-40 -right-40 w-[28rem] h-[28rem] rounded-full blur-3xl',
            )}
            style={{ background: 'rgba(99, 102, 241, 0.22)' }}
          />
          <div
            className={cm.cn(
              'absolute -bottom-40 -left-40 w-[28rem] h-[28rem] rounded-full blur-3xl',
            )}
            style={{ background: 'rgba(167, 139, 250, 0.22)' }}
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
                cm.fontWeight('bold'),
                'inline-flex items-center gap-2 rounded-full text-xs uppercase tracking-widest',
              )}
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--mol-color-primary)',
              }}
            >
              <span
                className={cm.cn('material-symbols-outlined text-base')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                spa
              </span>
              {t('landing.eyebrow', {}, { defaultValue: 'A gentle daily practice' })}
            </span>
            <h1
              className={cm.cn(
                'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold',
              )}
            >
              {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}.' })}
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
                { app: APP_NAME },
                {
                  defaultValue:
                    '{{app}} is a gentle, private journal for daily reflection, mood tracking, and gratitude — with thoughtful prompts and quiet patterns to help you understand yourself better.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
                'flex-wrap gap-y-3',
              )}
            >
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('bold'),
                  cm.textSize('base'),
                  'whitespace-nowrap shrink-0',
                  'text-white rounded-full shadow-lg hover:shadow-xl transition-shadow inline-flex items-center gap-2',
                )}
                style={{
                  background:
                    'linear-gradient(90deg, var(--mol-color-primary), var(--mol-color-secondary))',
                }}
              >
                {t('landing.heroCta', {}, { defaultValue: 'Begin your first entry' })}
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 4),
                  cm.fontWeight('semibold'),
                  cm.textSize('base'),
                  'whitespace-nowrap shrink-0',
                  'rounded-full border-2 border-outline-variant hover:border-primary hover:bg-primary-container/30 transition-colors',
                )}
              >
                {t('landing.heroCtaSecondary', {}, { defaultValue: 'See it in action' })}
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
                  <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('extrabold'))}>
                    {s.value}
                  </span>
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

        {/* Sample auth'd hero — mirrors the Home MoodHeroCard so a logged-out
            visitor sees what the app looks like inside. */}
        <section className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('pb', 16), cm.mxAuto)}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 3),
              'uppercase tracking-widest text-on-surface-variant text-center',
            )}
          >
            {t(
              'landing.previewLabel',
              { appName: APP_NAME },
              { defaultValue: 'A peek inside {{appName}}' },
            )}
          </p>
          <MoodHeroCard
            mood="good"
            streakDays={12}
            entriesThisWeek={5}
            reflectionPrompt={t(
              'landing.previewPrompt',
              {},
              { defaultValue: 'What is one small thing you’re grateful for today?' },
            )}
          />
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
          <div className={cm.grid({ cols: 4, gap: 'md' })}>
            {STATS.map((s) => (
              <div
                key={s.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl shadow-sm border-l-4 border-primary text-center hover:-translate-y-0.5 transition-transform',
                )}
              >
                <p
                  className={cm.cn('text-4xl font-extrabold tracking-tight')}
                  style={{ color: 'var(--mol-color-primary)' }}
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

        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 16), cm.mxAuto)}>
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 12))}>
            <h2 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight')}>
              {t('landing.featuresTitle', {}, { defaultValue: 'Built for honest reflection' })}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 3),
                'text-on-surface-variant',
                cm.maxW('2xl'),
                cm.mxAuto,
              )}
            >
              {t(
                'landing.featuresBody',
                {},
                {
                  defaultValue:
                    'Gentle prompts, private encryption, and quiet pattern-finding — designed to help, not nag.',
                },
              )}
            </p>
          </div>
          <div className={cm.grid({ cols: 4, gap: 'md' })}>
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl shadow-sm border-t-4 border-secondary hover:-translate-y-0.5 transition-transform',
                )}
              >
                <span
                  className="material-symbols-outlined text-3xl"
                  aria-hidden="true"
                  style={{ color: 'var(--mol-color-primary)', fontVariationSettings: "'FILL' 1" }}
                >
                  {f.icon}
                </span>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 3))}>
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 16), cm.mxAuto)}>
          <div
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              'rounded-[2rem] text-white relative overflow-hidden',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-secondary) 100%)',
            }}
          >
            <div
              className={cm.cn(
                'absolute -right-20 -top-20 w-64 h-64 rounded-full bg-surface/10 blur-3xl',
              )}
            />
            <div
              className={cm.cn('absolute -left-20 -bottom-20 w-64 h-64 rounded-full blur-3xl')}
              style={{ background: 'rgba(167, 139, 250, 0.4)' }}
            />
            <h2
              className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight relative z-10')}
            >
              {t(
                'landing.ctaTitle',
                {},
                { defaultValue: 'A few quiet minutes a day. That’s all.' },
              )}
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
                    'Free to get started. Pro unlocks data export, a bigger journal, and a full year of history.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 8),
                cm.sp('py', 4),
                cm.sp('mt', 8),
                cm.fontWeight('bold'),
                'inline-flex items-center gap-2 rounded-full bg-surface text-primary shadow-lg hover:shadow-xl transition-shadow relative z-10',
              )}
            >
              {t('landing.ctaButton', {}, { defaultValue: 'Begin your first entry' })}
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.sp('py', 8),
          cm.textCenter,
          cm.textSize('sm'),
          'bg-surface border-t border-outline-variant text-on-surface-variant',
        )}
      >
        <p>
          {t(
            'common.copyrightBuiltWithMolecule',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Built with Molecule.' },
          )}
        </p>
        {/* Shared public-page footer: About link + Privacy/Terms + language picker,
            identical chrome to the About/Privacy/Terms pages. */}
        <Footer />
      </footer>
    </div>
  )
}
