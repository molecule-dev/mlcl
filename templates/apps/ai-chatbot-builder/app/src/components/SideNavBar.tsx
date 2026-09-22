import { Link, useLocation } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
function SideNavBar() {
  const cm = getClassMap()
  const location = useLocation()
  const { t } = useTranslation()
  const { user } = useAuth<{ name?: string; email?: string }>()
  const activeClass = cm.cn(
    cm.flex({ align: 'center' }),
    cm.sp('px', 3),
    cm.fontWeight('bold'),
    'gap-3 py-3 rounded-xl border border-indigo-100 bg-sky-50 text-primary transition-colors duration-150 dark:border-indigo-900/40 dark:bg-indigo-950/50 dark:text-indigo-200',
  )
  const inactiveClass = cm.cn(
    cm.flex({ align: 'center' }),
    cm.sp('px', 3),
    'gap-3 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-colors duration-150',
  )
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.textSize('sm'),
        cm.fontWeight('medium'),
        'w-[240px] h-screen sticky left-0 top-0 h-full border-r border-border/20 bg-surface-secondary font-inter antialiased',
        // Mobile: the sidebar cannot fit next to content below md — the
        // hamburger drawer in TopNavBar carries the same links instead.
        'hidden md:flex',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('p', 6), 'gap-3')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(8),
            cm.h(8),
            'rounded-lg bg-primary text-white shadow-lg shadow-primary/20',
          )}
        >
          <span
            aria-label={t(
              'sideNavBar.brandIconAlt',
              { appName: APP_NAME },
              { defaultValue: '{{appName}}' },
            )}
            className={cm.cn('material-symbols-outlined text-[20px]')}
            data-icon="view_in_ar"
          >
            view_in_ar
          </span>
        </div>
        <div>
          <span
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-foreground leading-tight',
            )}
          >
            {t('sideNavBar.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </span>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-foreground-secondary',
            )}
          >
            {t('sideNavBar.brandTagline', {}, { defaultValue: 'AI Architect' })}
          </p>
        </div>
      </div>
      <nav className={cm.cn(cm.flex1, cm.sp('px', 3), cm.stack(1))}>
        <Link className={location.pathname === '/' ? activeClass : inactiveClass} to="/">
          <span className={cm.cn('material-symbols-outlined')} data-icon="dashboard">
            dashboard
          </span>
          <span>{t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}</span>
        </Link>
        <Link
          className={location.pathname.startsWith('/bots') ? activeClass : inactiveClass}
          to="/bots"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="smart_toy">
            smart_toy
          </span>
          <span>{t('sideNavBar.navMyBots', {}, { defaultValue: 'My Bots' })}</span>
        </Link>
        <Link
          className={location.pathname.startsWith('/knowledge-base') ? activeClass : inactiveClass}
          to="/knowledge-base"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="storage">
            storage
          </span>
          <span>{t('sideNavBar.navKnowledgeBase', {}, { defaultValue: 'Knowledge Base' })}</span>
        </Link>
        <Link
          className={location.pathname.startsWith('/test-chat') ? activeClass : inactiveClass}
          to="/test-chat"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="forum">
            forum
          </span>
          <span>{t('sideNavBar.navTestChat', {}, { defaultValue: 'Test Chat' })}</span>
        </Link>
        <Link
          className={location.pathname.startsWith('/integrations') ? activeClass : inactiveClass}
          to="/integrations"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="extension">
            extension
          </span>
          <span>{t('nav.integrations', {}, { defaultValue: 'Integrations' })}</span>
        </Link>
        <Link
          className={location.pathname === '/settings' ? activeClass : inactiveClass}
          to="/settings"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="settings">
            settings
          </span>
          <span>{t('nav.settings', {}, { defaultValue: 'Settings' })}</span>
        </Link>
      </nav>
      <div className={cm.cn(cm.sp('p', 4), 'mt-auto')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('p', 4),
            'bg-surface-container-low rounded-xl gap-3',
          )}
        >
          <div
            className={cm.cn(
              cm.roundedFull,
              cm.w(10),
              cm.h(10),
              cm.flex({ align: 'center', justify: 'center' }),
              'shrink-0 bg-surface-container-highest text-on-surface-variant',
            )}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="person">
              person
            </span>
          </div>
          <div className={cm.cn('overflow-hidden')}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'text-on-surface truncate',
              )}
            >
              {user?.name ||
                user?.email ||
                t('userMenu.guestName', {}, { defaultValue: 'Account' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
              {user?.name && user?.email
                ? user.email
                : t('sideNavBar.userRole', {}, { defaultValue: 'Pro Architect' })}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
export default SideNavBar
export { SideNavBar }
