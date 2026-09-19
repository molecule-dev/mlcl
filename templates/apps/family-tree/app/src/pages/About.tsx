import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

interface Feature {
  id: string
  key: string
  default: string
}

const FEATURES: Feature[] = [
  {
    id: 'tree',
    key: 'about.featureTree',
    default:
      'A navigable family tree — expand any person to see parents, children, and partners as connected cards you can pan and zoom.',
  },
  {
    id: 'people',
    key: 'about.featurePeople',
    default:
      'A searchable directory of every relative with birth and death years, places, and research notes.',
  },
  {
    id: 'relationships',
    key: 'about.featureRelationships',
    default:
      'Add a parent, partner, child, or sibling and the link is created in both directions automatically — siblings derive from shared parents.',
  },
  {
    id: 'timeline',
    key: 'about.featureTimeline',
    default:
      'A life timeline for every person: birth, partnerships, children, and death, in chronological order.',
  },
  {
    id: 'private',
    key: 'about.featurePrivate',
    default:
      'Your tree is yours alone — every record is scoped to your account, never mined, never sold.',
  },
  {
    id: 'export',
    key: 'about.featureExport',
    default:
      'Export tools so your research can travel with you, wherever your family history takes you.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<AuthBrandHeader />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a private home for your family story. People, relationships, and a navigable tree live together in one place — so the branches you are researching stay connected, and the people behind the names stay remembered.`,
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'We believe family memory should not scatter across boxes, spreadsheets, and fading memories. Start with yourself, add one relative at a time, and let the tree keep the connections — so the next generation inherits the whole picture, not fragments.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6 text-on-surface-variant')}>
            {FEATURES.map((f) => (
              <li key={f.id} data-mol-id={`about-feature-${f.id}`} className={cm.prose}>
                {t(f.key, {}, { defaultValue: f.default })}
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Questions, feedback, or a branch you are stuck on? Reach our team from in-app Settings — every message goes to a real person who can help.',
              },
            )}
          </p>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
