import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { PublicNav } from '../components/PublicNav.js'

const FEATURES = [
  {
    key: 'compose',
    defaultTitle: 'Compose with intent',
    defaultBody: `Tell ${APP_NAME} what you're trying to say — it returns a polished draft in your voice, every time.`,
    icon: 'auto_awesome',
    accent: 'primary' as const,
  },
  {
    key: 'tone',
    defaultTitle: 'Tune the tone',
    defaultBody: `Switch between Formal, Friendly, and Persuasive with one tap. ${APP_NAME} rewrites without losing your meaning.`,
    icon: 'tune',
    accent: 'secondary' as const,
  },
  {
    key: 'templates',
    defaultTitle: 'Ready-to-send templates',
    defaultBody:
      'Start from sales, recruiting, and executive playbooks battle-tested by top performers.',
    icon: 'dashboard_customize',
    accent: 'tertiary' as const,
  },
  {
    key: 'analytics',
    defaultTitle: 'Open and reply analytics',
    defaultBody: `See which templates land and which fall flat. ${APP_NAME} learns from your wins and improves every draft.`,
    icon: 'insights',
    accent: 'success' as const,
  },
] as const

const ACCENT_BG = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/15 text-secondary-dark',
  tertiary: 'bg-tertiary/15 text-tertiary',
  success: 'bg-success/15 text-success',
}

const TONE_PREVIEWS = [
  { tone: 'Formal', icon: 'gavel', tint: 'text-info' },
  { tone: 'Friendly', icon: 'favorite', tint: 'text-secondary-dark' },
  { tone: 'Persuasive', icon: 'auto_awesome', tint: 'text-primary' },
  { tone: 'Concise', icon: 'short_text', tint: 'text-on-surface-variant' },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <PublicNav />

      <main>
        {/* Hero */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn('absolute inset-0 pointer-events-none')}
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(circle at 15% 0%, color-mix(in srgb, var(--color-primary) 18%, transparent) 0%, transparent 45%), radial-gradient(circle at 90% 30%, color-mix(in srgb, var(--color-secondary) 12%, transparent) 0%, transparent 50%)',
            }}
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              'mx-auto',
              cm.sp('px', 6),
              'py-20 md:py-28 lg:py-32 relative',
            )}
          >
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-12 items-center')}>
              <div className={cm.cn('lg:col-span-7')}>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mb', 4),
                    'font-bold uppercase tracking-widest',
                  )}
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('landing.eyebrow', {}, { defaultValue: 'AI email composer' })}
                </p>
                <h1
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[0.95]',
                  )}
                >
                  {t(
                    'landing.heroTitle',
                    {},
                    {
                      defaultValue: 'Every word, perfected.',
                    },
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
                    { tagline: APP_TAGLINE, app: APP_NAME },
                    {
                      defaultValue: `${APP_NAME} writes high-stakes emails with you — sales outreach, recruiting, executive intros — in the tone you want, the moment you need it.`,
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('semibold'),
                      cm.flex({ align: 'center', gap: 'xs' }),
                      'inline-flex text-white rounded-full transition-all hover:shadow-xl active:scale-95',
                    )}
                    style={{
                      background:
                        'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #a78bfa))',
                      boxShadow:
                        '0 8px 24px color-mix(in srgb, var(--color-primary) 28%, transparent)',
                    }}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Start writing' })}
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
                      'rounded-full border border-outline hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                    cm.sp('mt', 8),
                  )}
                >
                  {TONE_PREVIEWS.map((tone) => (
                    <span
                      key={tone.tone}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.roundedFull,
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'bg-surface-container-low border border-outline-variant/40',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-base', tone.tint)}
                        aria-hidden="true"
                      >
                        {tone.icon}
                      </span>
                      {tone.tone}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sample composer card on the right — mirrors authenticated hero treatment */}
              <div className={cm.cn('lg:col-span-5')}>
                <div
                  className={cm.cn(
                    cm.flex({ direction: 'col', justify: 'between' }),
                    cm.sp('p', 8),
                    'min-h-[360px] rounded-[2rem] text-white relative overflow-hidden',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 70%, #a78bfa) 60%, color-mix(in srgb, var(--color-primary) 85%, #000) 100%)',
                    boxShadow:
                      '0 24px 64px -12px color-mix(in srgb, var(--color-primary) 45%, transparent)',
                  }}
                >
                  <div className={cm.cn('relative z-10')}>
                    <p
                      className={cm.cn(
                        'font-bold text-[10px] uppercase tracking-widest text-white/70 mb-3',
                      )}
                    >
                      {t(
                        'landing.sampleCardLabel',
                        { app: APP_NAME },
                        { defaultValue: `${APP_NAME} Composer · Live` },
                      )}
                    </p>
                    <p
                      className={cm.cn('text-2xl font-extrabold tracking-tight mb-3')}
                      style={{ fontFamily: 'Newsreader, Georgia, serif' }}
                    >
                      Re: Q3 partnership opportunity
                    </p>
                    <p
                      className={cm.cn(cm.textSize('sm'), 'text-white/85 leading-relaxed')}
                      style={{ fontFamily: 'Newsreader, Georgia, serif' }}
                    >
                      Hi Sarah — following up on our discussion last week. I sketched a quick
                      framework for the Q3 integration and would love your thoughts before our next
                      call…
                    </p>
                  </div>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                      'relative z-10 mt-6',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.roundedFull,
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'bg-surface/20 backdrop-blur-md',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-sm')}
                        aria-hidden="true"
                      >
                        auto_awesome
                      </span>
                      {t('landing.sampleAiBadge', {}, { defaultValue: 'AI · Persuasive' })}
                    </span>
                    <span
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 2),
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.fontWeight('bold'),
                        cm.textSize('sm'),
                        'rounded-full text-white pointer-events-none',
                      )}
                      style={{
                        background: 'var(--color-secondary)',
                        color: 'var(--color-on-secondary)',
                      }}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-base')}
                        aria-hidden="true"
                      >
                        send
                      </span>
                      {t('common.send', {}, { defaultValue: 'Send' })}
                    </span>
                  </div>
                  <div
                    className={cm.cn(
                      'absolute -right-16 -bottom-16 w-64 h-64 rounded-full blur-3xl',
                    )}
                    style={{
                      background:
                        'rgba(255,255,255,0.12)' /* white shimmer on brand card — intentional */,
                    }}
                    aria-hidden="true"
                  />
                  <div
                    className={cm.cn('absolute right-8 top-8 w-16 h-16 rounded-full blur-xl')}
                    style={{
                      background: 'color-mix(in srgb, var(--color-secondary) 35%, transparent)',
                    }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className={cm.cn(cm.maxW('7xl'), 'mx-auto', cm.sp('px', 6), 'py-20')}>
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 12))}>
            <h2 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tighter mb-3')}>
              {t('landing.featuresHeading', {}, { defaultValue: 'Built for high-stakes outreach' })}
            </h2>
            <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant max-w-2xl mx-auto')}>
              {t(
                'landing.featuresSubheading',
                { app: APP_NAME },
                {
                  defaultValue: `${APP_NAME} handles the wording so you can focus on the relationship.`,
                },
              )}
            </p>
          </div>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all group',
                )}
              >
                <span
                  className={cm.cn(
                    cm.sp('p', 3),
                    cm.roundedFull,
                    'inline-flex group-hover:scale-110 transition-transform',
                    ACCENT_BG[f.accent],
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </span>
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

        {/* CTA strip */}
        <section className={cm.cn('border-t border-outline-variant/40')}>
          <div className={cm.cn(cm.maxW('5xl'), 'mx-auto', cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn(
                cm.sp('mb', 4),
                'text-3xl md:text-4xl font-extrabold tracking-tighter',
              )}
            >
              {t(
                'landing.ctaHeading',
                {},
                { defaultValue: 'Send your next reply with confidence' },
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
                  defaultValue: 'Free for the first 50 sends. No credit card required.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                cm.fontWeight('semibold'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'inline-flex text-white rounded-full transition-all hover:shadow-xl active:scale-95',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #a78bfa))',
                boxShadow: '0 8px 24px color-mix(in srgb, var(--color-primary) 28%, transparent)',
              }}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Start writing' })}
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
        <Footer />
        <p className={cm.sp('mt', 4)}>
          {t(
            'landing.copyright',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Composed with care.' },
          )}
        </p>
      </footer>
    </div>
  )
}

export default Landing
export { Landing as LandingPage }
