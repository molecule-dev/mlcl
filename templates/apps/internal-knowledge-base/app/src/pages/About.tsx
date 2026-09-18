import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

interface AboutFeature {
  id: string
  icon: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: AboutFeature[] = [
  {
    id: 'spaces',
    icon: 'folder_special',
    titleKey: 'about.feature.spaces.title',
    titleDefault: 'Spaces for every team',
    bodyKey: 'about.feature.spaces.body',
    bodyDefault:
      'Engineering, People Ops, Legal — each team gets its own permissioned space with a navigable article hierarchy, so the right docs live where the right people look.',
  },
  {
    id: 'search',
    icon: 'search',
    titleKey: 'about.feature.search.title',
    titleDefault: 'Search that actually finds it',
    bodyKey: 'about.feature.search.body',
    bodyDefault:
      'Full-text search across every space and article, with filters for space, status, and recency — reachable with ⌘K from anywhere in the app.',
  },
  {
    id: 'editor',
    icon: 'edit_note',
    titleKey: 'about.feature.editor.title',
    titleDefault: 'A block editor that just writes',
    bodyKey: 'about.feature.editor.body',
    bodyDefault:
      'Markdown-friendly editing with tables, callouts, code, and embeds, plus AI-generated summaries so readers get the gist before they read the whole page.',
  },
  {
    id: 'durable',
    icon: 'history',
    titleKey: 'about.feature.durable.title',
    titleDefault: 'Durable, not disposable',
    bodyKey: 'about.feature.durable.body',
    bodyDefault:
      'Version history, restore, comments, reactions, and bookmarks keep knowledge reviewable and alive — an article outlives the reorg that wrote it.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <ContentPageShell
      dataMolId="page-about"
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p
          data-mol-id="about-intro"
          className={cm.cn(cm.textSize('lg'), 'leading-relaxed text-on-surface-variant')}
        >
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a durable internal knowledge base for the docs your team actually relies on — runbooks, policies, decision records, and onboarding. It keeps that knowledge findable long after the Slack thread that spawned it scrolled away.`,
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'leading-relaxed text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'We believe the knowledge that keeps a team running should not live in someone’s DMs or a dead wiki nobody trusts. {{appName}} gives every team a curated, permissioned space, a search bar that actually finds things, and version history so an article survives the next reorg.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('about.featuresTitle', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(4))}>
            {FEATURES.map((f) => (
              <li
                key={f.id}
                data-mol-id={`about-feature-${f.id}`}
                className={cm.cn(cm.flex({ gap: 'md', align: 'start' }))}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-primary')}
                  style={{ fontSize: '1.5rem' }}
                  aria-hidden="true"
                >
                  {f.icon}
                </span>
                <div className={cm.cn(cm.stack(1))}>
                  <h3 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                    {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface-variant')}
                  >
                    {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'leading-relaxed text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Have feedback, found a bug, or want a demo for your team? Reach out from your workspace Settings — every message goes to a real human on the team.',
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
