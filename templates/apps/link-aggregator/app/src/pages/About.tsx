import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
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
    id: 'submit',
    titleKey: 'about.feature.submit.title',
    titleDefault: 'Submit links',
    bodyKey: 'about.feature.submit.body',
    bodyDefault:
      'Post a URL or a text discussion to a community sub. Domains, tags, and previews are pulled in automatically so the front page stays scannable.',
  },
  {
    id: 'vote',
    titleKey: 'about.feature.vote.title',
    titleDefault: 'Vote and earn karma',
    bodyKey: 'about.feature.vote.body',
    bodyDefault:
      'Upvote what is worth marking and downvote what is not. Points rank the feed and build the karma that follows each submitter and commenter.',
  },
  {
    id: 'discuss',
    titleKey: 'about.feature.discuss.title',
    titleDefault: 'Discuss in threads',
    bodyKey: 'about.feature.discuss.body',
    bodyDefault:
      'Threaded comments keep conversations readable, and comment votes surface the most thoughtful replies instead of the loudest ones.',
  },
  {
    id: 'subs',
    titleKey: 'about.feature.subs.title',
    titleDefault: 'Join small subs',
    bodyKey: 'about.feature.subs.body',
    bodyDefault:
      'Subs are focused communities around a topic. Join the ones you care about and your feed becomes a calm, curated front page instead of an endless timeline.',
  },
  {
    id: 'organize',
    titleKey: 'about.feature.organize.title',
    titleDefault: 'Tag, save, and search',
    bodyKey: 'about.feature.organize.body',
    bodyDefault:
      'Tag submissions, bookmark anything to a saved list for later, and search across every link and discussion to find that thing you remember reading.',
  },
]

export function About() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
      subtitle={t(
        'about.intro',
        { app: APP_NAME },
        {
          defaultValue:
            '{{app}} is a community link aggregator — a small, slow place to collect, vote on, and discuss the links worth marking. Think a calmer front page, built by the people who read it.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'We believe the open web is at its best when communities, not algorithms, decide what rises to the top. {{app}} gives curious people a shared place to surface good links, argue in good faith, and build a reputation worth having — without ads, infinite scroll, or rage-bait.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.stack(6))}>
            {FEATURES.map((f) => (
              <div key={f.id} data-mol-id={`about-feature-${f.id}`} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
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
              { app: APP_NAME },
              {
                defaultValue:
                  'Have feedback, found a bug, or want to start a new sub? Reach the team at hello@{{app}}.example — every message goes to a real person who reads {{app}} too.',
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
