import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { PublicNav } from '../components/PublicNav.js'

interface Feature {
  id: string
  icon: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    id: 'drafting',
    icon: 'auto_awesome',
    titleKey: 'about.featureDrafting.title',
    titleDefault: 'AI drafting in your voice',
    bodyKey: 'about.featureDrafting.body',
    bodyDefault:
      'Turn a one-line brief into a complete, on-message draft — subject line included — powered by Claude and ready for you to refine and send.',
  },
  {
    id: 'tone',
    icon: 'tune',
    titleKey: 'about.featureTone.title',
    titleDefault: 'Tone you can dial in',
    bodyKey: 'about.featureTone.body',
    bodyDefault: `Switch between Formal, Friendly, Persuasive, and Concise in one tap. ${APP_NAME} rewrites without losing your meaning.`,
  },
  {
    id: 'templates',
    icon: 'dashboard_customize',
    titleKey: 'about.featureTemplates.title',
    titleDefault: 'Reusable templates',
    bodyKey: 'about.featureTemplates.body',
    bodyDefault:
      'Save your best-performing emails as templates with variables, and start from proven sales, recruiting, and executive playbooks.',
  },
  {
    id: 'analytics',
    icon: 'insights',
    titleKey: 'about.featureAnalytics.title',
    titleDefault: 'Send and learn',
    bodyKey: 'about.featureAnalytics.body',
    bodyDefault: `Send straight from ${APP_NAME} and track opens, replies, and bounces so you learn which words actually land.`,
  },
]

/**
 * Public "About" page for Signet — wrapped in the shared public chrome
 * (PublicNav + Footer) so the brand stays consistent across marketing
 * surfaces. Content is grounded in the app's purpose: AI-assisted drafting,
 * tone control, reusable templates, and send + analytics.
 *
 * @returns The rendered About page.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<PublicNav />}
      footer={<Footer />}
      containerSize="lg"
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'Our story' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.pageSubtitle',
        {},
        { defaultValue: 'Every word, perfected — for the emails that actually matter.' },
      )}
    >
      <div className={cm.cn(cm.stack(10))}>
        <p
          data-mol-id="about-intro"
          className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant leading-relaxed')}
        >
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a refined AI writing companion for the emails that carry weight — sales outreach, recruiting, executive intros, and every high-stakes reply where the wording matters. Describe what you need to say and ${APP_NAME} returns a polished draft in your voice, ready to refine and send.`,
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn('text-on-surface-variant leading-relaxed')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue: `The hardest part of email isn't typing — it's finding the right words under pressure. ${APP_NAME} exists to take the friction out of high-stakes writing so you can focus on the relationship, not the phrasing. Every draft, tone, and template is built to sound like you on your best day.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(5))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2')}>
            {FEATURES.map((f) => (
              <div
                key={f.id}
                data-mol-id={`about-feature-${f.id}`}
                className={cm.cn(
                  cm.sp('p', 5),
                  'bg-surface-container-lowest rounded-2xl border border-outline-variant/40',
                )}
              >
                <span
                  className={cm.cn(
                    cm.sp('p', 3),
                    cm.roundedFull,
                    'inline-flex bg-primary/10 text-primary',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </span>
                <h3
                  className={cm.cn(cm.textSize('lg'), cm.sp('mt', 4), cm.sp('mb', 2), 'font-bold')}
                >
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn('text-on-surface-variant leading-relaxed')}>
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue: `Have feedback, a feature request, or a tricky email you wish ${APP_NAME} handled better? We read every note — reach the team from your account settings, and a real person will get back to you.`,
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
