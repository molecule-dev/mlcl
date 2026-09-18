import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface Feature {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    id: 'envelopes',
    titleKey: 'about.feature.envelopes.title',
    titleDefault: 'Envelope budgeting',
    bodyKey: 'about.feature.envelopes.body',
    bodyDefault:
      'Give every dollar a job before the month begins. Assign income into category envelopes so you spend on purpose instead of wondering where it all went.',
  },
  {
    id: 'goals',
    titleKey: 'about.feature.goals.title',
    titleDefault: 'Goal tracking',
    bodyKey: 'about.feature.goals.body',
    bodyDefault:
      'Save toward an emergency fund, a vacation, or a big purchase with monthly contribution targets and progress you can actually see.',
  },
  {
    id: 'reports',
    titleKey: 'about.feature.reports.title',
    titleDefault: 'Spending insight',
    bodyKey: 'about.feature.reports.body',
    bodyDefault:
      'Trend lines and category breakdowns show where the money really went — not just where you thought it did.',
  },
  {
    id: 'import',
    titleKey: 'about.feature.import.title',
    titleDefault: 'CSV import',
    bodyKey: 'about.feature.import.body',
    bodyDefault:
      'Drag in statements from any bank. We dedupe, map payees, and apply your category rules automatically so reconciling is quick.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.title', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.intro',
        { app: APP_NAME },
        {
          defaultValue: `${APP_NAME} is envelope budgeting that gives every dollar a job — built for households who plan their month before it spends them.`,
        },
      )}
    >
      <div className={cm.cn(cm.stack(10))}>
        <section data-mol-id="about-mission" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Budgeting should feel calm, not punishing. We built zero-based, envelope-style budgeting that makes a plan you can actually keep — income in, jobs assigned, every category accounted for. No ads, no selling your data, no dark patterns.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(4))}>
            {FEATURES.map((f) => (
              <li key={f.id} data-mol-id={`about-feature-${f.id}`} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Have feedback, found a bug, or want to suggest a feature? Reach out from your account settings — every message goes to a real person on the team.',
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
