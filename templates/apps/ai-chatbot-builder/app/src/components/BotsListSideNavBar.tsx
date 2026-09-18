import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
function BotsListSideNavBar() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <>
      {/* SideNavBar (Authority: JSON) */}
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.h('full'),
          cm.sp('p', 4),
          'fixed left-0 top-0 w-64 z-40 bg-[var(--mol-color-background)] border-none',
        )}
      >
        <div
          className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 10), cm.sp('px', 2), 'gap-3')}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(8),
              cm.h(8),
              'rounded-lg bg-primary',
            )}
          >
            <span
              className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined text-white')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              neurology
            </span>
          </div>
          <div className={cm.flex({ direction: 'col' })}>
            <span
              className={cm.cn(
                cm.textSize('xl'),
                'font-bold text-primary dark:text-[var(--color-border-active)] tracking-tighter',
              )}
            >
              {t(
                'botsListSideNavBar.appName',
                { appName: APP_NAME },
                { defaultValue: '{{appName}}' },
              )}
            </span>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant opacity-60',
              )}
            >
              {t('botsListSideNavBar.appTagline', {}, { defaultValue: 'AI Builder' })}
            </span>
          </div>
        </div>
        <nav className={cm.cn(cm.flex1, cm.stack(1))}>
          {/* Dashboard */}
          <Link
            className={cm.cn(
              'flex items-center gap-3 px-4 py-3 transition-all duration-200 text-on-surface-variant hover:bg-surface/50 rounded-xl group',
            )}
            to="/"
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="dashboard">
              dashboard
            </span>
            <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
              {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
            </span>
          </Link>
          {/* My Bots (Active) */}
          <Link
            className={cm.cn(
              'flex items-center gap-3 px-4 py-3 bg-surface text-primary dark:text-[var(--mol-color-primary-light)] font-bold rounded-xl group',
            )}
            to="/bots"
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              data-icon="smart_toy"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              smart_toy
            </span>
            <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
              {t('botsListSideNavBar.navMyBots', {}, { defaultValue: 'My Bots' })}
            </span>
          </Link>
          {/* Knowledge Base */}
          <Link
            className={cm.cn(
              'flex items-center gap-3 px-4 py-3 transition-all duration-200 text-on-surface-variant hover:bg-surface/50 rounded-xl group',
            )}
            to="/knowledge-base"
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="database">
              database
            </span>
            <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
              {t('botsListSideNavBar.navKnowledgeBase', {}, { defaultValue: 'Knowledge Base' })}
            </span>
          </Link>
          {/* Test Chat */}
          <Link
            className={cm.cn(
              'flex items-center gap-3 px-4 py-3 transition-all duration-200 text-on-surface-variant hover:bg-surface/50 rounded-xl group',
            )}
            to="/test-chat"
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="chat">
              chat
            </span>
            <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
              {t('botsListSideNavBar.navTestChat', {}, { defaultValue: 'Test Chat' })}
            </span>
          </Link>
          {/* Integrations */}
          <Link
            className={cm.cn(
              'flex items-center gap-3 px-4 py-3 transition-all duration-200 text-on-surface-variant hover:bg-surface/50 rounded-xl group',
            )}
            to="/integrations"
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="extension">
              extension
            </span>
            <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
              {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
            </span>
          </Link>
          {/* Settings */}
          <Link
            className={cm.cn(
              'flex items-center gap-3 px-4 py-3 transition-all duration-200 text-on-surface-variant hover:bg-surface/50 rounded-xl group',
            )}
            to="/settings"
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="settings">
              settings
            </span>
            <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
              {t('nav.settings', {}, { defaultValue: 'Settings' })}
            </span>
          </Link>
        </nav>
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('p', 2),
            'mt-auto bg-surface-container rounded-xl gap-3',
          )}
        >
          <img
            alt={t(
              'botsListSideNavBar.logoAlt',
              { appName: APP_NAME },
              { defaultValue: '{{appName}} Logo' },
            )}
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              'object-cover ring-2 ring-primary/10 bg-surface-container-highest',
            )}
            src="https://picsum.photos/seed/BotsListSideNavBar-1/1200/800"
          />
          <div className={cm.cn(cm.flex({ direction: 'col' }), 'overflow-hidden')}>
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'truncate')}>
              {t('botsListSideNavBar.userName', {}, { defaultValue: 'Alex Chen' })}
            </span>
            <span className={cm.cn('text-[10px] text-on-surface-variant truncate')}>
              {t('botsListSideNavBar.userPlan', {}, { defaultValue: 'Pro Plan' })}
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}

export default BotsListSideNavBar
export { BotsListSideNavBar }
