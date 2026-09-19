import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import LandingFooter from '../components/LandingFooter.js'
import LandingTopNavBar from '../components/LandingTopNavBar.js'

interface FaqEntry {
  id: string
  qKey: string
  qDefault: string
  aKey: string
  aDefault: string
}

const FAQS: FaqEntry[] = [
  {
    id: 'getting-started',
    qKey: 'help.faq.gettingStarted.q',
    qDefault: 'How do I publish my first post?',
    aKey: 'help.faq.gettingStarted.a',
    aDefault:
      'Create an account from the Get started link in the header, then click "New post" on your dashboard. The editor autosaves every keystroke; hit Publish when you are ready, or Schedule for a later date.',
  },
  {
    id: 'analytics',
    qKey: 'help.faq.analytics.q',
    qDefault: 'How does the analytics page work?',
    aKey: 'help.faq.analytics.a',
    aDefault:
      'Every published post tracks views, claps, comments, and reading time in real time. The /analytics page rolls them up into a 30-day chart plus a top-posts table; numbers come straight from the backend, never from sample data.',
  },
  {
    id: 'rss',
    qKey: 'help.faq.rss.q',
    qDefault: 'Is there an RSS feed?',
    aKey: 'help.faq.rss.a',
    aDefault:
      'Yes — every {{appName}} site exposes /api/feed/rss (RSS 2.0) and /api/feed/json (JSON Feed). Both list the most recent published posts with full content for offline readers.',
  },
  {
    id: 'pricing',
    qKey: 'help.faq.pricing.q',
    qDefault: 'What does the Pro tier add?',
    aKey: 'help.faq.pricing.a',
    aDefault:
      'Pro unlocks unlimited drafts, post scheduling, custom-domain hosting, AI summaries, advanced analytics retention, and priority support. You can compare plans on the Pricing page.',
  },
  {
    id: 'support',
    qKey: 'help.faq.support.q',
    qDefault: 'How do I contact support?',
    aKey: 'help.faq.support.a',
    aDefault:
      'Email support@writeflow.example and a real person on the team will get back to you. Pro members get a guaranteed first-response time of one business day.',
  },
]

export function Help() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <>
      <LandingTopNavBar />
      <main
        data-mol-id="page-help"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 12))}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
          {t('help.title', {}, { defaultValue: 'Help & FAQ' })}
        </h1>
        <p
          data-mol-id="help-intro"
          className={cm.cn(cm.textSize('base'), cm.sp('mb', 8), 'text-on-surface-variant')}
        >
          {t(
            'help.intro',
            {},
            {
              defaultValue:
                'A few of the questions we hear most. Cannot find what you need? Email support@writeflow.example and a real person on the team will get back to you.',
            },
          )}
        </p>
        <div id="rss" data-mol-id="help-faq-list" className={cm.stack(8)}>
          {FAQS.map((faq) => (
            <section key={faq.id} data-mol-id={`help-faq-${faq.id}`} className={cm.cn(cm.stack(2))}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t(faq.qKey, {}, { defaultValue: faq.qDefault })}
              </h2>
              <p className="text-on-surface-variant">
                {t(faq.aKey, { appName: APP_NAME }, { defaultValue: faq.aDefault })}
              </p>
            </section>
          ))}
        </div>
      </main>
      <LandingFooter />
    </>
  )
}

export default Help
export { Help as HelpPage }
