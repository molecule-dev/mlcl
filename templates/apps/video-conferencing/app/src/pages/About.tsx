import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingTopNav } from '../components/LandingTopNav.js'

const FEATURES: ReadonlyArray<{ key: string; def: string }> = [
  {
    key: 'about.featureMedia',
    def: 'Studio-grade meetings — 4K video and 48 kHz audio with adaptive bitrate so every face stays sharp, even on flaky Wi-Fi.',
  },
  {
    key: 'about.featureJoin',
    def: 'Frictionless join — one tap from email, Slack, or calendar invite. No downloads, no PIN codes, no waiting rooms.',
  },
  {
    key: 'about.featureRecordings',
    def: 'Recordings that talk back — auto-transcribed, chaptered playback so anyone who missed the call can skim it in minutes.',
  },
  {
    key: 'about.featureCollab',
    def: 'Live collaboration — side-by-side chat, reactions, polls, and screen sharing without ever leaving the call.',
  },
  {
    key: 'about.featureSchedule',
    def: 'Scheduling built in — recurring meetings, calendar sync, and email invites keep your whole team in one room.',
  },
  {
    key: 'about.featureWorkspaces',
    def: 'Team workspaces — shared meeting history, recordings, and member roles, with free, pro, and team plans that grow with you.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface-container-lowest text-on-surface')}>
      <LandingTopNav />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 16))}
      >
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 4),
            'inline-block uppercase tracking-widest text-primary',
          )}
        >
          {t('about.eyebrow', {}, { defaultValue: 'About us' })}
        </span>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight', cm.sp('mb', 6))}>
          {t('about.pageTitle', {}, { defaultValue: `Meet ${APP_NAME}` })}
        </h1>

        <div className={cm.cn(cm.stack(6), 'text-on-surface-variant leading-relaxed')}>
          <p data-mol-id="about-intro" className={cm.textSize('lg')}>
            {t(
              'about.intro',
              {},
              {
                defaultValue: `${APP_NAME} is a video meeting platform for distributed teams — crisp HD video, screen sharing, recordings, live chat, and scheduling brought together in one calm workspace. Built on WebRTC, it runs in the browser with nothing to install.`,
              },
            )}
          </p>

          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 4),
              'text-on-surface',
            )}
          >
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p data-mol-id="about-mission">
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'Remote teams deserve meetings that feel present, not exhausting. We obsess over media quality, instant joins, and recordings that make every conversation searchable — so your team can be in the same room from anywhere in the world.',
              },
            )}
          </p>

          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 4),
              'text-on-surface',
            )}
          >
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul data-mol-id="about-features" className={cm.cn(cm.stack(3))}>
            {FEATURES.map((feature) => (
              <li key={feature.key} className={cm.cn(cm.flex({ align: 'start', gap: 3 }))}>
                <span
                  className={cm.cn(
                    cm.textSize('base'),
                    'material-symbols-outlined text-primary shrink-0',
                  )}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                <span>{t(feature.key, {}, { defaultValue: feature.def })}</span>
              </li>
            ))}
          </ul>

          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 4),
              'text-on-surface',
            )}
          >
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p data-mol-id="about-contact">
            {t(
              'about.contactBody',
              {},
              {
                defaultValue: `Questions, feedback, or want a demo for your team? Reach the ${APP_NAME} team from your workspace settings or start a meeting and see it for yourself — every message goes to a real human.`,
              },
            )}
          </p>
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}

export default About
export { About as AboutPage }
