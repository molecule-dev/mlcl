/**
 * Help — public help center landing.
 */
import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function Help() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-help"
      header={<Header />}
      footer={<Footer />}
      title={t('help.title', {}, { defaultValue: 'Help center' })}
    >
      <div className={cm.cn(cm.prose, cm.stack(4))}>
        <p>
          {t(
            'help.intro',
            {},
            {
              defaultValue:
                'Find answers to common questions about building workflows, configuring connections, and interpreting run output. The most common topics are listed below; for anything not covered, reach out to your workspace administrator.',
            },
          )}
        </p>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mt', 6))}>
          {t('help.gettingStarted.title', {}, { defaultValue: 'Getting started' })}
        </h2>
        <p>
          {t(
            'help.gettingStarted.body',
            {},
            {
              defaultValue:
                'New workflows can be installed from the templates library or built from scratch in the workflow builder. Each workflow has a trigger (manual, webhook, or cron) and a sequence of steps that run in order.',
            },
          )}
        </p>
        <p>
          <Link
            to="/templates"
            className={cm.cn(cm.fontWeight('bold'))}
            style={{ color: 'var(--color-accent-violet)' }}
          >
            {t('help.gettingStarted.cta', {}, { defaultValue: 'Browse the templates library →' })}
          </Link>
        </p>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mt', 6))}>
          {t('help.connections.title', {}, { defaultValue: 'Connecting providers' })}
        </h2>
        <p>
          {t(
            'help.connections.body',
            {},
            {
              defaultValue:
                'AI, email, and storage steps require provider keys to be set in the api/.env file. Once a key is configured, the corresponding integration appears as connected on the Connections page.',
            },
          )}
        </p>
        <p>
          <Link
            to="/connections"
            className={cm.cn(cm.fontWeight('bold'))}
            style={{ color: 'var(--color-accent-violet)' }}
          >
            {t('help.connections.cta', {}, { defaultValue: 'Open connections →' })}
          </Link>
        </p>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mt', 6))}>
          {t('help.runs.title', {}, { defaultValue: 'Reading run output' })}
        </h2>
        <p>
          {t(
            'help.runs.body',
            {},
            {
              defaultValue:
                'Every run logs each step independently with status (success, failure, skipped) and a snippet of output. The execution detail page shows the full step-by-step trace plus inferred metrics.',
            },
          )}
        </p>
        <p>
          <Link
            to="/executions"
            className={cm.cn(cm.fontWeight('bold'))}
            style={{ color: 'var(--color-accent-violet)' }}
          >
            {t('help.runs.cta', {}, { defaultValue: 'Open executions →' })}
          </Link>
        </p>
      </div>
    </ContentPageShell>
  )
}

export default Help
export { Help as HelpPage }
