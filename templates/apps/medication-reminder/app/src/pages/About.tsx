import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

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
      subtitle={t(
        'about.subtitle',
        {},
        { defaultValue: 'Every dose, on time — and everyone who cares about you in the loop.' },
      )}
    >
      <div data-mol-id="about-body" className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a medication adherence companion for patients, caregivers, and care teams. Build a dosing schedule once, get reminders that fit your day, track every pill you take, and never get caught short on a refill — all backed by an adherence record you can actually share.`,
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Missing a dose should never come down to a forgotten alarm or an empty bottle. We build calm, dependable tools that make sticking to a treatment plan feel effortless — and that quietly bring family and clinicians along, only as much as you allow.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('about.featuresTitle', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), cm.prose, 'list-disc pl-6 text-on-surface-variant')}>
            <li>
              {t(
                'about.featureSchedules',
                {},
                {
                  defaultValue:
                    'Flexible schedules — daily, interval, or specific days, with multiple times a day and with-food reminders.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureReminders',
                {},
                {
                  defaultValue:
                    'Reminders that respect you — snoozable push notifications that can escalate to a caregiver if a dose is missed.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureRefills',
                {},
                {
                  defaultValue:
                    'Refill alerts — real-time pill counts so you get a warning days before you run out, not after.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureAdherence',
                {},
                {
                  defaultValue:
                    'Adherence reports — weekly and monthly charts plus a dose-by-dose history you can export and share with your care team.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureCaregivers',
                {},
                {
                  defaultValue:
                    'Caregiver sharing — invite family or clinicians to a read-only view, and decide exactly what they can see.',
                },
              )}
            </li>
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Questions, feedback, or an idea that would help you stay on track? Reach out from your account settings — every message reaches a real person on the team.',
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
