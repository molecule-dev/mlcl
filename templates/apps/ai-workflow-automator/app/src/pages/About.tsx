/**
 * About — public marketing page describing the workflow automator.
 */
import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function About() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      title={t('about.title', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
    >
      <div className={cm.cn(cm.prose, cm.stack(4))}>
        <p>
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue:
                '{{appName}} is a workflow automation platform that wires triggers, AI conditions, and multi-step actions together so teams can move work between systems without writing glue code.',
            },
          )}
        </p>
        <p>
          {t(
            'about.philosophy',
            {},
            {
              defaultValue:
                'Every workflow is a graph of small, observable steps. Each step records its inputs, outputs, and timing so it can be inspected, replayed, or rolled back. Compose them visually, version them like code.',
            },
          )}
        </p>
      </div>
      <nav className={cm.cn(cm.sp('mt', 8), cm.flex({ gap: 'md' }))}>
        <Link to="/" data-mol-id="about-back">
          {t('auth.backToHomeArrow', {}, { defaultValue: '← Back to home' })}
        </Link>
      </nav>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
