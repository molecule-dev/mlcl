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
    bodyDefault: `${APP_NAME} exists to end the 5pm dinner panic. Deciding once a week and shopping once a week is calmer, cheaper, and wastes less — so we built the tool that does the deciding and the shopping list for you.`,
  },
  {
    id: 'contact',
    titleKey: 'about.contact.title',
    titleDefault: 'Talk to us',
    bodyKey: 'about.contact.body',
    bodyDefault:
      'Have feedback, found a bug, or want to suggest a feature? Email hello@simmer.app — every message reaches a real person on the team.',
  },
]

interface Feature {
  id: string
  labelKey: string
  labelDefault: string
}

const FEATURES: Feature[] = [
  {
    id: 'recipes',
    labelKey: 'about.features.recipes',
    labelDefault:
      'A recipe box that holds your own recipes alongside a starter catalog — searchable by title, tag, and total time.',
  },
  {
    id: 'plan',
    labelKey: 'about.features.plan',
    labelDefault:
      'A drag-free weekly grid: drop recipes onto breakfast, lunch, and dinner slots and move them around as the week changes.',
  },
  {
    id: 'groceries',
    labelKey: 'about.features.groceries',
    labelDefault:
      "A grocery list that writes itself from the week's plan — ingredients scaled by servings, merged across recipes, and grouped by aisle.",
  },
  {
    id: 'pantry',
    labelKey: 'about.features.pantry',
    labelDefault:
      'Pantry tracking that flags the ingredients you already have, so you stop buying your third jar of cumin.',
  },
  {
    id: 'scaler',
    labelKey: 'about.features.scaler',
    labelDefault:
      'A servings scaler on every recipe that rescales the whole ingredient list for the crowd you are actually feeding.',
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
      title={t('about.title', {}, { defaultValue: 'Cook less. Plan once.' })}
      subtitle={t(
        'about.intro',
        { app: APP_NAME },
        {
          defaultValue: `${APP_NAME} is a weekly meal planner and recipe box. Save the recipes you love, plan the week on one screen, and shop from a grocery list that builds itself — scaled to your household and checked against your pantry.`,
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
