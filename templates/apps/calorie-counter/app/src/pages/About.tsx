import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const SECTIONS: Section[] = [
  {
    id: 'mission',
    titleKey: 'about.mission.title',
    titleDefault: 'Our mission',
    bodyKey: 'about.mission.body',
    bodyDefault: `${APP_NAME} exists to make calorie and nutrition tracking feel friendly instead of punishing. We help you focus on nourishment, not just numbers — so you can hit your goals and build a healthier relationship with food, without the guilt.`,
  },
  {
    id: 'contact',
    titleKey: 'about.contact.title',
    titleDefault: 'Talk to us',
    bodyKey: 'about.contact.body',
    bodyDefault:
      'Have feedback, found a bug, or want to suggest a feature? Email hello@nosh.app — every message reaches a real person on the team.',
  },
]

interface Feature {
  id: string
  labelKey: string
  labelDefault: string
}

const FEATURES: Feature[] = [
  {
    id: 'database',
    labelKey: 'about.features.database',
    labelDefault:
      'A food database with millions of items plus barcode scanning, so logging a meal takes seconds.',
  },
  {
    id: 'macros',
    labelKey: 'about.features.macros',
    labelDefault:
      'Automatic macro tracking that balances protein, carbs, and fat against the goals you set.',
  },
  {
    id: 'recipes',
    labelKey: 'about.features.recipes',
    labelDefault: 'A recipe builder that saves your favorite meals for one-tap logging.',
  },
  {
    id: 'goals',
    labelKey: 'about.features.goals',
    labelDefault:
      'Personalized daily nutrition goals and a Smart Calorie Ring that adapts to your activity.',
  },
  {
    id: 'progress',
    labelKey: 'about.features.progress',
    labelDefault:
      'Weight tracking and progress charts that show how your daily habits add up over time.',
  },
]

export function About() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-about"
      footer={<Footer />}
      eyebrow={t('about.eyebrow', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      title={t('about.title', {}, { defaultValue: 'Every bite, balanced' })}
      subtitle={t(
        'about.intro',
        { app: APP_NAME },
        {
          defaultValue: `${APP_NAME} is a friendly food log that helps you hit your nutrition goals without the guilt. Track calories and macros, scan barcodes, build recipes, set daily goals, and watch your progress — all in one calm, focused place.`,
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.features.title', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6 text-on-surface-variant')}>
            {FEATURES.map((f) => (
              <li key={f.id} data-mol-id={`about-feature-${f.id}`}>
                {t(f.labelKey, {}, { defaultValue: f.labelDefault })}
              </li>
            ))}
          </ul>
        </section>
        {SECTIONS.map((s) => (
          <section key={s.id} data-mol-id={`about-${s.id}`} className={cm.cn(cm.stack(2))}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
              {t(s.titleKey, {}, { defaultValue: s.titleDefault })}
            </h2>
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(s.bodyKey, {}, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
