import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Feature {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    id: 'discover',
    titleKey: 'about.featureDiscover.title',
    titleDefault: 'Discover by appetite',
    bodyKey: 'about.featureDiscover.body',
    bodyDefault:
      'Search and filter restaurants by cuisine, neighborhood, and price level, and see exactly where they sit on the map before you commit to a table.',
  },
  {
    id: 'reviews',
    titleKey: 'about.featureReviews.title',
    titleDefault: 'Reviews you can trust',
    bodyKey: 'about.featureReviews.body',
    bodyDefault:
      'Star ratings, photo-rich tasting notes, and a helpful-count so the most useful reviews from real diners rise to the top.',
  },
  {
    id: 'lists',
    titleKey: 'about.featureLists.title',
    titleDefault: 'Save and organize',
    bodyKey: 'about.featureLists.body',
    bodyDefault:
      'Bookmark your favorites and build curated lists — the weekend brunch shortlist, the date-night rotation, the out-of-town must-tries.',
  },
  {
    id: 'menus',
    titleKey: 'about.featureMenus.title',
    titleDefault: 'Menus and photos up front',
    bodyKey: 'about.featureMenus.body',
    bodyDefault:
      'Browse menus, prices, and galleries before you arrive, so there are no surprises when you sit down.',
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
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About us' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a restaurant review platform built for people who actually remember where they ate. Discover standout spots near you, read tasting notes from real diners, and keep a running map of the places worth a return visit.`,
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
              { app: APP_NAME },
              {
                defaultValue: `We think the best restaurant recommendation still comes from someone who sat at the table. ${APP_NAME} ranks places by visits, not vibes — every rating, photo, and review comes from a diner who showed up, ordered, and told the truth about the plate.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(3), 'list-disc pl-6 text-on-surface-variant')}>
            {FEATURES.map((f) => (
              <li key={f.id}>
                <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </span>
                {' — '}
                {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
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
                  'Found a bug, run a restaurant, or just want to tell us about a hidden gem? Reach the team from your Settings page — every message goes to a real person.',
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
