import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

const FEATURES = [
  {
    key: 'occupancy',
    defaultValue:
      'A live, unit-by-unit view of every property — occupied, vacant, and turning — so portfolio occupancy is never a mystery.',
  },
  {
    key: 'rentRoll',
    defaultValue:
      'Stripe-backed rent collection with automated invoices, reminders, and ledger-grade arrears reporting. No more spreadsheets.',
  },
  {
    key: 'maintenance',
    defaultValue:
      'Maintenance requests with priorities, assignments, photos, and a full message timeline — nothing slips through the cracks.',
  },
  {
    key: 'leases',
    defaultValue:
      'Lease tracking with renewal flagging, deposits, and tenant records that stay connected to the unit they belong to.',
  },
  {
    key: 'finances',
    defaultValue:
      'Income and expense tracking, exportable reports, and a finances dashboard that ties every payment back to a lease.',
  },
] as const

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', {}, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t('about.tagline', {}, { defaultValue: 'Every unit, under one roof.' })}
      containerSize="lg"
    >
      <div className={cm.cn(cm.stack(8))}>
        <p
          data-mol-id="about-intro"
          className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant leading-relaxed')}
        >
          {t(
            'about.intro',
            {},
            {
              defaultValue: `${APP_NAME} is property management software for landlords and property managers who want their whole portfolio in one calm place. Units, tenants, leases, rent collection, maintenance, and accounting all live together — so you spend less time chasing paperwork and more time running your buildings.`,
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
                  'We believe managing rental property should feel orderly, not overwhelming. Most managers stitch together spreadsheets, email threads, and a handful of disconnected tools. Our mission is to replace that with a single, dependable system where every unit, lease, and payment is exactly where you expect it.',
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
              <li key={f.key}>
                {t(`about.feature.${f.key}`, {}, { defaultValue: f.defaultValue })}
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
                defaultValue: `Have a question, found a bug, or want to move your existing rent roll over? Reach out from your account settings — every message reaches a real person on the ${APP_NAME} team.`,
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
