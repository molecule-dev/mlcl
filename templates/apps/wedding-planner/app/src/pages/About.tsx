import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Feature {
  id: string
  key: string
  defaultValue: string
}

const FEATURES: Feature[] = [
  {
    id: 'guests',
    key: 'about.feature.guests',
    defaultValue:
      'A guest list that thinks — sides, groups, contact details, meals, and plus-one allowances in one calm table.',
  },
  {
    id: 'rsvp',
    key: 'about.feature.rsvp',
    defaultValue:
      'RSVPs without the chase — share one code, guests confirm on a public page with no account, and your tally updates live.',
  },
  {
    id: 'budget',
    key: 'about.feature.budget',
    defaultValue:
      'Budget clarity — estimate every line from venue to stationery, log actuals as deposits land, and see the over/under at a glance.',
  },
  {
    id: 'vendors',
    key: 'about.feature.vendors',
    defaultValue:
      'A vendor pipeline — researching, contacted, booked, paid — so nothing falls through the cracks.',
  },
  {
    id: 'seating',
    key: 'about.feature.seating',
    defaultValue:
      'A seating chart that does the math — tables with capacities, an unseated pool, and over-capacity warnings before the reception does.',
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
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} is a wedding planner for couples who would rather enjoy being engaged than babysit fourteen spreadsheets. Keep the guest list, collect RSVPs with one shareable code, track the budget, book vendors, and seat everyone — from one calm dashboard.',
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'We think planning one of the best days of your life should not feel like project management with a deadline. Couples deserve one place where the guest list, the money, the vendors, and the seating chart agree with each other — and guests deserve an RSVP that takes thirty seconds, not an account signup.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6 text-on-surface-variant')}>
            {FEATURES.map((f) => (
              <li key={f.id} className={cm.cn(cm.prose)}>
                {t(f.key, {}, { defaultValue: f.defaultValue })}
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Questions or feedback? Reach the team from your account settings — every message goes to a real person who works on {{app}}.',
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
