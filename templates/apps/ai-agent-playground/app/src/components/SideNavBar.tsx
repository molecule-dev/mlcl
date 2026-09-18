// Pattern source: ai-chatbot-builder/components/SideNavBar.tsx
// Adapted for Neuron — dark contrast aside with mono labels and brand violet accent.
import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface NavItem {
  path: string
  label: string
  icon: string
  matcher?: (pathname: string) => boolean
}

export function SideNavBar() {
  const cm = getClassMap()
  const location = useLocation()
  const { t } = useTranslation()

  const items: NavItem[] = [
    {
      path: '/dashboard',
      label: t('nav.dashboard', {}, { defaultValue: 'Dashboard' }),
      icon: 'dashboard',
    },
    {
      path: '/agents',
      label: t('sideNav.agents', {}, { defaultValue: 'Agents' }),
      icon: 'smart_toy',
      matcher: (p) => p.startsWith('/agents'),
    },
    {
      path: '/tools',
      label: t('sideNav.tools', {}, { defaultValue: 'Tools' }),
      icon: 'build',
    },
    {
      path: '/runs',
      label: t('sideNav.runs', {}, { defaultValue: 'Runs' }),
      icon: 'memory',
      matcher: (p) => p.startsWith('/runs'),
    },
    {
      path: '/datasets',
      label: t('sideNav.datasets', {}, { defaultValue: 'Datasets' }),
      icon: 'dataset',
    },
    {
      path: '/knowledge-bases',
      label: t('sideNav.knowledgeBases', {}, { defaultValue: 'Knowledge' }),
      icon: 'storage',
    },
    {
      path: '/models',
      label: t('nav.models', {}, { defaultValue: 'Models' }),
      icon: 'hub',
    },
    {
      path: '/notifications',
      label: t('settings.notifications', {}, { defaultValue: 'Notifications' }),
      icon: 'notifications',
    },
    {
      path: '/settings',
      label: t('nav.settings', {}, { defaultValue: 'Settings' }),
      icon: 'settings',
    },
  ]

  function isActive(item: NavItem): boolean {
    if (item.matcher) return item.matcher(location.pathname)
    return location.pathname === item.path
  }

  const activeClass = cm.cn(
    cm.flex({ align: 'center' }),
    cm.sp('px', 4),
    cm.sp('py', 3),
    'rounded text-tertiary-fixed border-l-2 border-primary bg-surface/5 transition-colors duration-200',
  )
  const inactiveClass = cm.cn(
    cm.flex({ align: 'center' }),
    cm.sp('px', 4),
    cm.sp('py', 3),
    'rounded text-foreground-secondary hover:text-foreground-tertiary hover:bg-surface/5 transition-colors duration-200',
  )

  return (
    <nav
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.h('screen'),
        cm.sp('py', 6),
        'w-[260px] fixed left-0 top-0 bg-on-tertiary-fixed dark:bg-surface-container-lowest z-40 surface contrast border-r border-outline-variant/15',
      )}
    >
      <div className={cm.cn(cm.sp('px', 6), cm.sp('mb', 8))}>
        <Link to="/dashboard">
          <h1
            className={cm.cn(cm.textSize('xl'), 'font-black text-tertiary-fixed tracking-widest')}
          >
            {t(
              'sideNav.brandName',
              { appName: APP_NAME.toUpperCase() },
              { defaultValue: '{{appName}}' },
            )}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 1),
              'font-mono uppercase tracking-wider text-foreground-secondary',
            )}
          >
            {t('sideNav.brandVersion', {}, { defaultValue: 'V2.0.4' })}
          </p>
        </Link>
      </div>
      <ul
        className={cm.cn(
          cm.flex1,
          cm.sp('px', 4),
          cm.fontWeight('medium'),
          cm.textSize('sm'),
          'space-y-1 font-body tracking-tight overflow-y-auto',
        )}
      >
        {items.map((item) => (
          <li key={item.path}>
            <Link className={isActive(item) ? activeClass : inactiveClass} to={item.path}>
              <span
                className={cm.cn(
                  cm.sp('mr', 3),
                  'material-symbols-outlined',
                  isActive(item) ? 'text-primary' : '',
                )}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default SideNavBar
