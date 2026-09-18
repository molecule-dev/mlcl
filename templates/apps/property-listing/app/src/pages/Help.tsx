// Boilerplate page — scaffolded automatically because the design references a "Help" link.
// Replace the placeholder content with real Help copy; the route and i18n keys
// are already wired so translations and cross-links remain valid.

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function Help() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <main data-mol-id="page-help" className={cm.cn(cm.container({ size: 'md' }), cm.sp('py', 12))}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
        {t('help.title', {}, { defaultValue: 'Help' })}
      </h1>
      <div className={cm.cn(cm.prose, cm.stack(4))}>
        <p>
          {t(
            'help.intro',
            {},
            { defaultValue: 'This is the Help page. Replace this placeholder with real content.' },
          )}
        </p>
      </div>
    </main>
  )
}

export default Help
export { Help as HelpPage }
