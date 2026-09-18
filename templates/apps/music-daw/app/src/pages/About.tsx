import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { PublicNav } from '../components/PublicNav.js'

const FEATURES = [
  {
    key: 'tracks',
    defaultValue:
      'Unlimited multi-track arrangement — layer audio, MIDI, and instrument lanes with one-keystroke mute, solo, and arm.',
  },
  {
    key: 'samples',
    defaultValue:
      'A 20,000-sample royalty-free library — loops, one-shots, vocals, and foley, tagged by key and BPM and ready to drag onto the timeline.',
  },
  {
    key: 'mixer',
    defaultValue:
      'A studio-grade mixer — channel strips, send routing, FX racks, and meters that update at 60 Hz.',
  },
  {
    key: 'pianoRoll',
    defaultValue:
      'A piano roll with built-in instruments for writing melodies, basslines, and drums note by note.',
  },
  {
    key: 'export',
    defaultValue:
      'Real-time collaboration and one-click export — render finished tracks in the cloud with no watermarks on any plan.',
  },
] as const

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <PublicNav />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 16))}
      >
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight mb-6')}>
          {t('about.pageTitle', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
        </h1>

        <div className={cm.cn(cm.stack(5), 'text-on-surface-variant leading-relaxed')}>
          <p data-mol-id="about-intro" className={cm.cn('text-lg')}>
            {t(
              'about.intro',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} is a studio-grade digital audio workstation that runs entirely in your browser. Layer audio, MIDI, and instrument tracks, mix on a full channel-strip console, sketch melodies in the piano roll, and export finished songs — no plugins to install, no projects to lose.',
              },
            )}
          </p>

          <h2 className={cm.cn('text-2xl font-bold tracking-tight text-on-surface mt-8')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p data-mol-id="about-mission">
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'We built {{app}} so producers can go from an idea to a finished track without fighting their tools. Every edit is non-destructive, every project auto-saves, and every render happens in the cloud — so the only thing between you and a finished song is the music itself.',
              },
            )}
          </p>

          <h2 className={cm.cn('text-2xl font-bold tracking-tight text-on-surface mt-8')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul data-mol-id="about-features" className={cm.cn(cm.stack(3), 'list-disc pl-6')}>
            {FEATURES.map((f) => (
              <li key={f.key}>
                {t(`about.feature.${f.key}`, {}, { defaultValue: f.defaultValue })}
              </li>
            ))}
          </ul>

          <h2 className={cm.cn('text-2xl font-bold tracking-tight text-on-surface mt-8')}>
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p data-mol-id="about-contact">
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Questions, feature requests, or a bug to report? Reach the {{app}} team from your account settings — a real person reads every message.',
              },
            )}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default About
export { About as AboutPage }
