import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * Public "About" page for Embark. Reuses the same public chrome as the
 * Pricing page (Header + Footer inside the branded ContentPageShell) so
 * the brand stays consistent across every public surface.
 *
 * @returns The rendered About page.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const features: {
    id: string
    titleKey: string
    titleDefault: string
    bodyKey: string
    bodyDefault: string
  }[] = [
    {
      id: 'checklist',
      titleKey: 'about.featureChecklist.title',
      titleDefault: 'A guided checklist',
      bodyKey: 'about.featureChecklist.body',
      bodyDefault:
        'Every onboarding task — paperwork, account setup, and introductions — is pre-staged with due dates and the right owner, so nothing slips through the cracks on day one.',
    },
    {
      id: 'documents',
      titleKey: 'about.featureDocuments.title',
      titleDefault: 'Documents in one place',
      bodyKey: 'about.featureDocuments.body',
      bodyDefault:
        'Offer letters, policies, and forms live in a single secure home. New hires read, sign, and track required documents without chasing email threads.',
    },
    {
      id: 'training',
      titleKey: 'about.featureTraining.title',
      titleDefault: 'Role-aware training',
      bodyKey: 'about.featureTraining.body',
      bodyDefault:
        'Training modules unlock at the 30/60/90-day milestones and are tuned to the role and team a hire is joining, with progress and quiz scores tracked along the way.',
    },
    {
      id: 'team',
      titleKey: 'about.featureTeam.title',
      titleDefault: 'Real introductions',
      bodyKey: 'about.featureTeam.body',
      bodyDefault:
        'A buddy, a manager, and cross-functional introductions are scheduled from the start — so every new teammate has a face to turn to, not a help desk.',
    },
    {
      id: 'progress',
      titleKey: 'about.featureProgress.title',
      titleDefault: 'Progress you can see',
      bodyKey: 'about.featureProgress.body',
      bodyDefault:
        'A live timeline and completion ring keep new hires, buddies, and managers aligned on what is done, what is next, and how the first 90 days are going.',
    },
  ]

  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
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
              defaultValue: `${APP_NAME} is an employee onboarding portal that turns a new hire's first 90 days into a clear, welcoming journey. Task checklists, documents, training, team introductions, and progress tracking all live in one calm, confident place — so people can focus on getting started, not on figuring out what to do next.`,
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
                defaultValue: `First impressions compound. We believe every new teammate deserves a welcome that is organized, human, and unhurried. ${APP_NAME} gives HR and managers a repeatable way to deliver that — and gives new hires the credit, context, and connections they need to do their best work sooner.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.stack(6))}>
            {features.map((f) => (
              <div key={f.id} data-mol-id={`about-feature-${f.id}`} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
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
                  'Want to roll out a warmer onboarding for your team, found a bug, or have feedback? Reach out from your account settings — every message goes to a real human who can help.',
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
