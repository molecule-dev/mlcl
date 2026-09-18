import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { PublicTopNav } from '../components/PublicTopNav.js'

const FEATURES = [
  {
    key: 'semantic',
    defaultValue:
      'Semantic search that understands intent, not just keywords — ask in plain language and get the relevant passages even when the words don’t match.',
  },
  {
    key: 'cited',
    defaultValue:
      'AI-generated answers with a citation chip on every claim, linking straight back to the exact paragraph in the source document.',
  },
  {
    key: 'connectors',
    defaultValue:
      'Sync from where work already happens — Notion, Google Drive, Confluence, Slack, GitHub, and web crawlers — plus drag-and-drop document uploads.',
  },
  {
    key: 'graph',
    defaultValue:
      'A live knowledge graph that shows how documents reinforce each other, which are orphaned, and where the gaps in your knowledge are.',
  },
  {
    key: 'team',
    defaultValue:
      'Shared collections, member roles, and notifications so your whole team queries the same trusted, always-fresh source of truth.',
  },
] as const

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <PublicTopNav />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 12))}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
          {t('about.pageTitle', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
        </h1>
        <div className={cm.cn(cm.stack(4))}>
          <p data-mol-id="about-intro" className={cm.cn('text-on-surface-variant leading-relaxed')}>
            {t(
              'about.intro',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} is a retrieval-augmented knowledge base. It indexes your team’s documents, wikis, and chat logs into a semantic memory, then answers questions in plain English — with citations linked back to the exact source on every answer.',
              },
            )}
          </p>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('semibold'),
              cm.sp('mt', 8),
              cm.sp('mb', 2),
            )}
          >
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p
            data-mol-id="about-mission"
            className={cm.cn('text-on-surface-variant leading-relaxed')}
          >
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'Knowledge shouldn’t be locked away in scattered tools or buried in search results no one trusts. We believe every answer should be instant, accurate, and verifiable — so teams can stop hunting through documents and start recalling what they already know.',
              },
            )}
          </p>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('semibold'),
              cm.sp('mt', 8),
              cm.sp('mb', 2),
            )}
          >
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul
            data-mol-id="about-features"
            className={cm.cn(cm.stack(2), 'list-disc pl-6 text-on-surface-variant leading-relaxed')}
          >
            {FEATURES.map((f) => (
              <li key={f.key}>
                {t(`about.feature.${f.key}`, {}, { defaultValue: f.defaultValue })}
              </li>
            ))}
          </ul>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('semibold'),
              cm.sp('mt', 8),
              cm.sp('mb', 2),
            )}
          >
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p
            data-mol-id="about-contact"
            className={cm.cn('text-on-surface-variant leading-relaxed')}
          >
            {t(
              'about.contactBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Have feedback, found a bug, or want a connector we don’t support yet? Reach the {{appName}} team from your account — every message goes to a real human who works on the product.',
              },
            )}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default About
export { About as AboutPage }
