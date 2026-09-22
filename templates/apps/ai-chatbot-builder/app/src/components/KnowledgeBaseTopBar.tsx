import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import MobileNavMenu, { useMainNavItems } from './MobileNavMenu.js'
import UserMenu from './UserMenu.js'
function KnowledgeBaseTopBar() {
  const cm = getClassMap()
  const navItems = useMainNavItems()
  const { t } = useTranslation()

  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 4),
        cm.h(16),
        cm.w('full'),
        'sticky top-0 z-40 bg-surface/80 backdrop-blur-md shadow-sm md:px-8',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4 min-w-0')}>
        {/* Mobile hamburger + drawer (fleet pattern) */}
        <MobileNavMenu items={navItems} />
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'tracking-widest text-outline uppercase hidden sm:block',
          )}
        >
          {t('nav.workspace', {}, { defaultValue: 'Workspace' })}
        </span>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            'material-symbols-outlined text-outline-variant hidden sm:block',
          )}
          data-icon="chevron_right"
        >
          chevron_right
        </span>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.sp('py', 1),
            'font-inter tracking-wide text-indigo-600 border-b-2 border-indigo-600 whitespace-nowrap',
          )}
        >
          {t('knowledgeBaseTopBar.currentPage', {}, { defaultValue: 'Knowledge Base' })}
        </span>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
        <Link
          className={cm.cn(
            'px-4 py-1.5 text-sm font-semibold text-foreground-secondary hover:text-indigo-500 transition-all duration-200 hidden sm:block',
          )}
          to="/test-chat"
        >
          {t('knowledgeBaseTopBar.test', {}, { defaultValue: 'Test' })}
        </Link>
        <Link
          className={cm.cn(
            'px-5 py-1.5 bg-gradient-to-br from-primary to-primary-container text-on-primary text-sm font-semibold rounded-lg shadow-md shadow-primary/20 hover:opacity-90 transition-all duration-200',
          )}
          to="/bots"
        >
          {t('knowledgeBaseTopBar.deploy', {}, { defaultValue: 'Deploy' })}
        </Link>
        <div className={cm.cn(cm.h(6), cm.sp('mx', 2), 'w-[1px] bg-border hidden sm:block')}></div>
        <UserMenu />
      </div>
    </header>
  )
}

export default KnowledgeBaseTopBar
export { KnowledgeBaseTopBar }
