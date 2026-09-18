import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
function IntegrationsSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.textSize('sm'),
        cm.w(64),
        cm.h('screen'),
        cm.fontWeight('medium'),
        "fixed left-0 top-0 h-full z-40 font-['Plus_Jakarta_Sans'] tracking-wide",
      )}
      style={{ backgroundColor: 'var(--color-editor-integrations-sidebar)' }}
      data-mol-id="nav-sidebar"
    >
      <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.flex({ align: 'center' }), 'gap-3')}>
        <div
          className={cm.cn(
            cm.w(8),
            cm.h(8),
            cm.flex({ align: 'center', justify: 'center' }),
            'ai-gradient-bg rounded-lg text-white',
          )}
        >
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            auto_awesome
          </span>
        </div>
        <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-background')}>
          {t(
            'integrationsSideNavBar.appName',
            { appName: APP_NAME },
            { defaultValue: '{{appName}}' },
          )}
        </span>
      </div>
      <nav className={cm.cn(cm.flex1, cm.sp('px', 4), cm.sp('mt', 4), 'space-y-1')}>
        <Link
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 text-foreground-secondary hover:text-[var(--color-border-active)] hover:bg-surface-container-high/50 transition-all duration-300 rounded-xl group',
          )}
          to="/"
        >
          <span
            className={cm.cn(
              'material-symbols-outlined transition-colors group-hover:text-primary',
            )}
          >
            dashboard
          </span>
          <span>{t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}</span>
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 text-foreground-secondary hover:text-[var(--color-border-active)] hover:bg-surface-container-high/50 transition-all duration-300 rounded-xl group',
          )}
          to="/"
        >
          <span
            className={cm.cn(
              'material-symbols-outlined transition-colors group-hover:text-primary',
            )}
          >
            forum
          </span>
          <span>{t('integrationsSideNavBar.navChatbots', {}, { defaultValue: 'My Bots' })}</span>
        </Link>
        {/* Active State: Integrations */}
        <Link
          className={cm.cn(
            "flex items-center gap-3 px-4 py-3 text-tertiary dark:text-tertiary-fixed-dim relative before:content-[''] before:absolute before:left-0 before:w-0.5 before:h-6 before:bg-tertiary dark:before:bg-tertiary-fixed-dim before:rounded-full bg-surface-container-high/50 rounded-xl",
          )}
          to="/integrations"
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            extension
          </span>
          <span className={cm.fontWeight('bold')}>
            {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 text-foreground-secondary hover:text-[var(--color-border-active)] hover:bg-surface-container-high/50 transition-all duration-300 rounded-xl group',
          )}
          to="/bots"
        >
          <span
            className={cm.cn(
              'material-symbols-outlined transition-colors group-hover:text-primary',
            )}
          >
            insights
          </span>
          <span>{t('nav.analytics', {}, { defaultValue: 'Analytics' })}</span>
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 text-foreground-secondary hover:text-[var(--color-border-active)] hover:bg-surface-container-high/50 transition-all duration-300 rounded-xl group',
          )}
          to="/settings"
        >
          <span
            className={cm.cn(
              'material-symbols-outlined transition-colors group-hover:text-primary',
            )}
          >
            settings
          </span>
          <span>{t('nav.settings', {}, { defaultValue: 'Settings' })}</span>
        </Link>
      </nav>
      <div className={cm.sp('p', 6)}>
        <div
          className={cm.cn(
            cm.sp('p', 4),
            cm.flex({ align: 'center' }),
            'rounded-2xl bg-surface-container-high/50 gap-3',
          )}
        >
          <div
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'shrink-0 bg-surface-container-highest text-on-surface-variant ring-2 ring-primary/10',
            )}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="workspaces">
              workspaces
            </span>
          </div>
          <div className={cm.cn('overflow-hidden')}>
            <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'truncate')}>
              {t('integrationsSideNavBar.workspaceName', {}, { defaultValue: 'My Workspace' })}
            </p>
            <p className={cm.cn('text-[10px] text-on-surface-variant truncate')}>
              {t('integrationsSideNavBar.planLabel', {}, { defaultValue: 'Premium Plan' })}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
export default IntegrationsSideNavBar
export { IntegrationsSideNavBar }
