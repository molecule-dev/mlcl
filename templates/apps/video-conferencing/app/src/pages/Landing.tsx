import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingTopNav } from '../components/LandingTopNav.js'
import { MeetingHeroCard } from '../components/MeetingHeroCard.js'

const FEATURES: ReadonlyArray<{
  icon: string
  titleKey: string
  bodyKey: string
  titleDefault: string
  bodyDefault: string
}> = [
  {
    icon: 'high_quality',
    titleKey: 'landing.feature1Title',
    titleDefault: 'Studio-grade media',
    bodyKey: 'landing.feature1Body',
    bodyDefault:
      '4K video and 48 kHz audio with adaptive bitrate so every face stays sharp on flaky Wi-Fi.',
  },
  {
    icon: 'bolt',
    titleKey: 'landing.feature2Title',
    titleDefault: 'Frictionless join',
    bodyKey: 'landing.feature2Body',
    bodyDefault:
      'A single tap from email, Slack, or calendar — no downloads, no PIN codes, no friction.',
  },
  {
    icon: 'auto_stories',
    titleKey: 'landing.feature3Title',
    titleDefault: 'Recordings that talk',
    bodyKey: 'landing.feature3Body',
    bodyDefault:
      'Auto-transcribed, chaptered playback. Skim the meeting in two minutes, jump to the moment that matters.',
  },
  {
    icon: 'forum',
    titleKey: 'landing.feature4Title',
    titleDefault: 'Live collaboration',
    bodyKey: 'landing.feature4Body',
    bodyDefault:
      'Side-by-side chat, reactions, polls, and screen share — without leaving the call.',
  },
]

const TRUST_LOGOS = ['Lattice', 'Ramp', 'Notion', 'Linear', 'Replicate', 'Vercel']

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const sampleAttendees = [
    { id: '1', name: 'Sarah K' },
    { id: '2', name: 'David P' },
    { id: '3', name: 'Maya R' },
    { id: '4', name: 'Jose L' },
    { id: '5', name: 'Asha B' },
    { id: '6', name: 'Ryan T' },
    { id: '7', name: 'Mei W' },
    { id: '8', name: 'Liam O' },
  ]

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface-container-lowest text-on-surface')}>
      <LandingTopNav showSectionLinks />

      <main>
        <section className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), 'mx-auto max-w-[1400px]')}>
          <div className={cm.cn(cm.stack(8), cm.textCenter, cm.mxAuto, 'max-w-3xl')}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'self-center bg-primary-container/40 text-primary uppercase tracking-widest',
              )}
            >
              <span className={'w-1.5 h-1.5 rounded-full bg-primary animate-pulse'} />
              {t('landing.eyebrow', {}, { defaultValue: 'Distributed teams, end-to-end' })}
            </span>
            <h1
              className={cm.cn(
                'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95]',
              )}
            >
              {t('landing.titleLead', {}, { defaultValue: 'Where teams ' })}
              <span className="text-primary">
                {t('landing.titleAccent', {}, { defaultValue: 'come alive' })}
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                'text-on-surface-variant max-w-2xl mx-auto leading-relaxed',
              )}
            >
              {t(
                'landing.subtitle',
                {},
                {
                  defaultValue:
                    'Crisp video, pristine audio, and live collaboration surfaces — chat, screen share, and recordings — for every standup, client call, and workshop.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ justify: 'center', gap: 4 }), 'flex-wrap')}>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.textSize('base'),
                  cm.fontWeight('bold'),
                  'rounded-xl bg-primary text-on-primary shadow-md transition-all hover:bg-primary-dark hover:shadow-lg',
                )}
              >
                <span className={'material-symbols-outlined text-lg'}>videocam</span>
                {t('landing.primaryCta', {}, { defaultValue: 'Start a meeting' })}
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.textSize('base'),
                  cm.fontWeight('semibold'),
                  'rounded-xl border-2 border-outline-variant bg-surface text-on-surface hover:border-outline hover:text-primary transition-colors',
                )}
              >
                {t('landing.secondaryCta', {}, { defaultValue: 'See it in action' })}
              </Link>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'lg' }),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'flex-wrap text-on-surface-variant',
              )}
            >
              {['No credit card required', 'Free forever plan'].map((label, i) => (
                <span key={label} className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                  <span
                    className={'material-symbols-outlined text-base text-success'}
                    aria-hidden="true"
                  >
                    check_circle
                  </span>
                  {t(`landing.trustCheck${i + 1}`, {}, { defaultValue: label })}
                </span>
              ))}
            </div>
          </div>
          <div className={cm.cn(cm.sp('mt', 16), cm.mxAuto, 'max-w-5xl')}>
            <MeetingHeroCard
              title={t(
                'landing.sampleTitle',
                { appName: APP_NAME },
                { defaultValue: 'Today at {{appName}}' },
              )}
              startsAtLabel="Today, 2:00 PM PT — Q4 Strategy Sync"
              startsInLabel="3 min"
              status="starting"
              attendees={sampleAttendees}
              onJoin={() => {
                window.location.href = '/signup'
              }}
              onDetails={() => {
                window.location.href = '/login'
              }}
            />
          </div>
        </section>

        <section
          id="trust"
          className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), 'mx-auto max-w-[1400px]')}
        >
          <p
            className={cm.cn(
              cm.textCenter,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 8),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('landing.trust', {}, { defaultValue: 'Trusted by teams at' })}
          </p>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 8 }),
              // no opacity wrapper: it dimmed the logo names to 2.6:1 (axe fail);
              // the muted on-surface-variant token carries the de-emphasis alone
              'flex-wrap',
            )}
          >
            {TRUST_LOGOS.map((logo) => (
              <span
                key={logo}
                className={cm.cn(
                  cm.textSize('xl'),
                  'font-extrabold tracking-tighter text-on-surface-variant',
                )}
              >
                {logo}
              </span>
            ))}
          </div>
        </section>
        <section
          id="features"
          className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), 'bg-surface mx-auto max-w-[1400px]')}
        >
          <div
            className={cm.cn(cm.stack(4), cm.textCenter, cm.mxAuto, cm.sp('mb', 12), 'max-w-2xl')}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'inline-block uppercase tracking-widest text-primary',
              )}
            >
              {t('landing.navFeatures', {}, { defaultValue: 'Features' })}
            </span>
            <h2 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}>
              {t(
                'landing.featuresHeading',
                {},
                { defaultValue: 'Built for the way your team really meets' },
              )}
            </h2>
          </div>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 lg:grid-cols-4')}>
            {FEATURES.map((feature) => (
              <div
                key={feature.icon}
                className={cm.cn(
                  cm.sp('p', 8),
                  'group bg-surface-container-low rounded-xl border border-outline-variant/40 hover:shadow-md transition-shadow',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-14 h-14 rounded-xl bg-accent/10 text-accent mb-6',
                  )}
                >
                  <span className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')}>
                    {feature.icon}
                  </span>
                </div>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
                  {t(feature.titleKey, {}, { defaultValue: feature.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(feature.bodyKey, {}, { defaultValue: feature.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn('bg-primary text-on-primary')}>
          <div
            className={cm.cn(
              'mx-auto grid max-w-[1400px] grid-cols-2 gap-8 lg:grid-cols-4',
              cm.sp('px', 8),
              cm.sp('py', 16),
              cm.textCenter,
              'lg:divide-x lg:divide-outline-variant/30',
            )}
          >
            {(
              [
                {
                  value: '500k+',
                  label: t('landing.stat.meetings', {}, { defaultValue: 'Daily meetings' }),
                },
                {
                  value: '99.9%',
                  label: t('landing.stat.uptime', {}, { defaultValue: 'Uptime guarantee' }),
                },
                {
                  value: '52ms',
                  label: t('landing.stat.latency', {}, { defaultValue: 'Median latency' }),
                },
                {
                  value: '2.4M',
                  label: t('landing.stat.users', {}, { defaultValue: 'Active users' }),
                },
              ] as const
            ).map((stat) => (
              <div key={stat.label} className={cm.sp('p', 4)}>
                <p
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-4xl tracking-tight tabular-nums',
                    cm.sp('mb', 2),
                  )}
                >
                  {stat.value}
                </p>
                <p className={cm.cn(cm.fontWeight('medium'), 'text-on-primary/80')}>{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          className={cm.cn(
            'relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark text-on-primary',
          )}
        >
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-accent-hover/30 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-secondary-container/40 blur-3xl"
          />
          <div
            className={cm.cn(
              'relative z-10 mx-auto max-w-4xl',
              cm.sp('px', 6),
              cm.sp('py', 20),
              cm.textCenter,
            )}
          >
            <h2
              className={cm.cn(
                'text-4xl md:text-5xl font-extrabold tracking-tight',
                cm.sp('mb', 6),
              )}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Ready to bring your team to life?' })}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mb', 10),
                cm.mxAuto,
                cm.maxW('2xl'),
                'text-on-primary/90',
              )}
            >
              {t(
                'landing.ctaBody',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Join thousands of companies using {{appName}} to connect, collaborate, and create together.',
                },
              )}
            </p>
            <Link
              to="/signup"
              data-mol-id="cta-start-free"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                'inline-flex rounded-xl bg-accent px-10 py-4 text-on-accent shadow-lg transition-all hover:-translate-y-1 hover:bg-accent-dark',
              )}
            >
              {t('landing.ctaButton', {}, { defaultValue: 'Start free today' })}
              <span className={'material-symbols-outlined'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 6), 'text-on-primary/80')}>
              {t(
                'landing.ctaFinePrint',
                {},
                { defaultValue: 'No credit card required. Setup in 2 minutes.' },
              )}
            </p>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
