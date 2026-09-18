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
              {t('landing.title', {}, { defaultValue: 'Where teams come alive' })}
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
                  cm.roundedFull,
                  'bg-gradient-to-r from-primary to-secondary text-on-primary shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/50 transition-all',
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
                  cm.roundedFull,
                  'bg-surface text-on-surface border border-outline-variant hover:border-primary hover:text-primary transition-colors',
                )}
              >
                {t('landing.secondaryCta', {}, { defaultValue: 'See it in action' })}
              </Link>
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
                  cm.sp('p', 6),
                  'group bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all border-l-4 border-primary/40 hover:border-primary',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-12 h-12 rounded-xl bg-primary-container/40 text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors mb-4',
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
      </main>

      <LandingFooter />
    </div>
  )
}
