import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Feature {
  id: string
  key: string
  default: string
}

const FEATURES: Feature[] = [
  {
    id: 'editor',
    key: 'about.featureEditor',
    default:
      'A focused deck editor with drag-and-drop slides, reusable layouts, and brand themes that restyle every slide in seconds.',
  },
  {
    id: 'motion',
    key: 'about.featureMotion',
    default:
      'Cinematic animations and a keyframe timeline to choreograph reveals without ever leaving the deck.',
  },
  {
    id: 'collab',
    key: 'about.featureCollab',
    default:
      'Live collaboration — cursor presence, inline comments, and version history so your whole team builds together.',
  },
  {
    id: 'present',
    key: 'about.featurePresent',
    default:
      'Presenter mode with a timer, speaker notes, and dual-screen rehearsal tuned for the live room.',
  },
  {
    id: 'export',
    key: 'about.featureExport',
    default:
      'One-click PDF export, shareable public links, and view analytics so you know how each deck performs.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(6))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a presentation studio built for people who have to walk on stage and win the room — founders pitching investors, teams running keynotes, leaders delivering the quarterly update. Design, rehearse, and present polished decks from one stage-ready workspace.`,
            },
          )}
        </p>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 4),
            'font-display',
          )}
        >
          {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
        </h2>
        <p data-mol-id="about-mission" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.missionBody',
            { appName: APP_NAME },
            {
              defaultValue: `We think the moment you present matters as much as the slides themselves. ${APP_NAME} pairs a fast, themeable deck editor with real presenter tools — timers, speaker notes, dual-screen rehearsal — so the technology disappears and your story lands.`,
            },
          )}
        </p>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 4),
            'font-display',
          )}
        >
          {t('about.whatYouGetTitle', {}, { defaultValue: 'What you get' })}
        </h2>
        <ul data-mol-id="about-features" className={cm.cn(cm.stack(3), 'list-disc pl-6')}>
          {FEATURES.map((f) => (
            <li key={f.id} className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(f.key, {}, { defaultValue: f.default })}
            </li>
          ))}
        </ul>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 4),
            'font-display',
          )}
        >
          {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
        </h2>
        <p data-mol-id="about-contact" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.contactBody',
            {},
            {
              defaultValue:
                'Questions, feedback, or a feature you wish we had? Reach the team from your account settings — a real person reads every message.',
            },
          )}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
