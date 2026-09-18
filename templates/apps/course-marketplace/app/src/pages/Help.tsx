// Boilerplate page — scaffolded automatically because the design references a "Help" link.
// Replace the placeholder content with real Help copy; the route and i18n keys
// are already wired so translations and cross-links remain valid.

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
      title={t('help.title', {}, { defaultValue: 'Help' })}
    >
      <div className={cm.cn(cm.prose, cm.stack(4))}>
        <p>
          {t(
            'help.intro',
            {},
            { defaultValue: 'This is the Help page. Replace this placeholder with real content.' },
          )}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default Help
export { Help as HelpPage }
