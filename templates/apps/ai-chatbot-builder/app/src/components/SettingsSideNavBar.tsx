import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
function SettingsSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('py', 8),
        cm.sp('px', 6),
        'h-screen w-64 fixed left-0 top-0 bg-surface-container-low gap-y-4',
      )}
    >
      <div
        className={cm.cn(cm.sp('mb', 10), cm.sp('px', 2), cm.flex({ align: 'center' }), 'gap-3')}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-10 h-10 rounded-xl primary-gradient text-white shadow-lg',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            bolt
          </span>
        </div>
        <div>
          <h1
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('lg'),
              "font-['Plus_Jakarta_Sans'] text-on-surface tracking-tight",
            )}
          >
            {t(
              'settingsSideNavBar.appName',
              { appName: APP_NAME },
              { defaultValue: '{{appName}}' },
            )}
          </h1>
          <p
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-on-surface-variant')}
          >
            {t('settingsSideNavBar.appTagline', {}, { defaultValue: 'AI Studio' })}
          </p>
        </div>
      </div>
      <nav className={cm.cn(cm.flex({ direction: 'col' }), 'gap-y-1')}>
        {/* Dashboard */}
        <Link
          className={cm.cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl text-foreground-secondary font-medium font-['Inter'] text-sm tracking-wide hover:bg-surface-container-high transition-colors duration-200 cursor-pointer active:scale-95",
          )}
          to="/"
        >
          <span className={cm.cn('material-symbols-outlined')}>dashboard</span>

          {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
        </Link>
        {/* My Bots */}
        <Link
          className={cm.cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl text-foreground-secondary font-medium font-['Inter'] text-sm tracking-wide hover:bg-surface-container-high transition-colors duration-200 cursor-pointer active:scale-95",
          )}
          to="/bots"
        >
          <span className={cm.cn('material-symbols-outlined')}>smart_toy</span>

          {t('settingsSideNavBar.myBots', {}, { defaultValue: 'My Bots' })}
        </Link>
        {/* Integrations */}
        <Link
          className={cm.cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl text-foreground-secondary font-medium font-['Inter'] text-sm tracking-wide hover:bg-surface-container-high transition-colors duration-200 cursor-pointer active:scale-95",
          )}
          to="/integrations"
        >
          <span className={cm.cn('material-symbols-outlined')}>extension</span>

          {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
        </Link>
        {/* Knowledge Base */}
        <Link
          className={cm.cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl text-foreground-secondary font-medium font-['Inter'] text-sm tracking-wide hover:bg-surface-container-high transition-colors duration-200 cursor-pointer active:scale-95",
          )}
          to="/knowledge-base"
        >
          <span className={cm.cn('material-symbols-outlined')}>database</span>

          {t('settingsSideNavBar.knowledgeBase', {}, { defaultValue: 'Knowledge Base' })}
        </Link>
        {/* Test Chat */}
        <Link
          className={cm.cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl text-foreground-secondary font-medium font-['Inter'] text-sm tracking-wide hover:bg-surface-container-high transition-colors duration-200 cursor-pointer active:scale-95",
          )}
          to="/test-chat"
        >
          <span className={cm.cn('material-symbols-outlined')}>chat_bubble</span>

          {t('settingsSideNavBar.testChat', {}, { defaultValue: 'Test Chat' })}
        </Link>
        {/* Settings (ACTIVE) */}
        <Link
          className={cm.cn(
            "relative flex items-center gap-3 px-4 py-3 rounded-xl font-bold font-['Inter'] text-sm tracking-wide cursor-pointer active:scale-95 transition-colors duration-200 text-indigo-700 before:content-[''] before:absolute before:left-[-8px] before:w-[2px] before:h-6 before:bg-tertiary before:rounded-full",
          )}
          to="/settings"
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            settings
          </span>

          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </Link>
      </nav>
    </aside>
  )
}

export default SettingsSideNavBar
export { SettingsSideNavBar }
