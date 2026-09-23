/**
 * Dark-indigo brand sidebar for Dendrite — bolt brand-mark up top, grouped
 * navigation with Material Symbols icons, active-state purple accent stripe.
 *
 * Translated from ai-chatbot-builder's BotsListSideNavBar.tsx, retuned to the
 * Dendrite palette (indigo-950 surface, violet active, cyan accent eyebrow).
 */
import { useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SafeLink } from './SafeLink.js'

interface NavItem {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
  molId: string
}

interface NavGroup {
  labelKey: string
  defaultLabel: string
  items: NavItem[]
}

/** Nav groups shared by the desktop sidebar and the mobile drawer. */
export const GROUPS: NavGroup[] = [
  {
    labelKey: 'workflowSidebar.workspace',
    defaultLabel: 'Workspace',
    items: [
      {
        to: '/dashboard',
        icon: 'space_dashboard',
        labelKey: 'workflowSidebar.dashboard',
        defaultLabel: 'Dashboard',
        molId: 'nav-dashboard',
      },
      {
        to: '/workflows',
        icon: 'account_tree',
        labelKey: 'workflowSidebar.workflows',
        defaultLabel: 'Workflows',
        molId: 'nav-workflows',
      },
      {
        to: '/executions',
        icon: 'history',
        labelKey: 'workflowSidebar.executions',
        defaultLabel: 'Executions',
        molId: 'nav-executions',
      },
      {
        to: '/templates',
        icon: 'auto_awesome_motion',
        labelKey: 'workflowSidebar.templates',
        defaultLabel: 'Templates',
        molId: 'nav-templates',
      },
    ],
  },
  {
    labelKey: 'workflowSidebar.connect',
    defaultLabel: 'Connect',
    items: [
      {
        to: '/connections',
        icon: 'hub',
        labelKey: 'workflowSidebar.connections',
        defaultLabel: 'Connections',
        molId: 'nav-connections',
      },
      {
        to: '/notifications',
        icon: 'notifications',
        labelKey: 'workflowSidebar.notifications',
        defaultLabel: 'Notifications',
        molId: 'nav-notifications',
      },
    ],
  },
  {
    labelKey: 'workflowSidebar.account',
    defaultLabel: 'Account',
    items: [
      {
        to: '/billing',
        icon: 'credit_card',
        labelKey: 'workflowSidebar.billing',
        defaultLabel: 'Billing',
        molId: 'nav-billing',
      },
      {
        to: '/settings',
        icon: 'settings',
        labelKey: 'workflowSidebar.settings',
        defaultLabel: 'Settings',
        molId: 'nav-settings',
      },
    ],
  },
]

export function WorkflowSidebar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const isActive = (to: string) =>
    to === '/dashboard'
      ? location.pathname === '/' || location.pathname === '/dashboard'
      : location.pathname === to || location.pathname.startsWith(`${to}/`)

  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        // Desktop-only: below `md` the MobileNavMenu drawer is the nav.
        'hidden md:flex fixed inset-y-0 left-0 w-[260px] z-30 border-r',
      )}
      style={{
        background: 'var(--color-sidebar)',
        borderColor: 'var(--color-sidebar-border)',
      }}
    >
      {/* Brand */}
      <div
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('px', 5), cm.sp('py', 5))}
        style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}
      >
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'rounded-xl shadow-lg')}
          style={{
            width: 36,
            height: 36,
            background:
              'linear-gradient(135deg, var(--color-node-trigger), var(--color-node-condition))',
            boxShadow: '0 4px 12px color-mix(in srgb, var(--color-node-trigger) 40%, transparent)',
          }}
        >
          <span
            className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}
            style={{ color: 'white', fontVariationSettings: "'FILL' 1" }}
          >
            bolt
          </span>
        </div>
        <div className={cm.cn(cm.flex({ direction: 'col' }))}>
          <span
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'))}
            style={{ color: 'var(--color-sidebar-text)', letterSpacing: '-0.01em' }}
          >
            {t('workflowSidebar.brand', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </span>
          <span className={cm.textSize('xs')} style={{ color: 'var(--color-sidebar-text-muted)' }}>
            {t('workflowSidebar.tagline', {}, { defaultValue: 'Intelligence in motion' })}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className={cm.cn(cm.sp('p', 3), 'flex-1 overflow-y-auto')}>
        {GROUPS.map((group) => (
          <div key={group.labelKey} className={cm.sp('mb', 5)}>
            <div
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('mb', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest',
              )}
              style={{ color: 'var(--color-sidebar-eyebrow)' }}
            >
              {t(group.labelKey, {}, { defaultValue: group.defaultLabel })}
            </div>
            <ul className={cm.cn(cm.flex({ direction: 'col' }), 'gap-1')}>
              {group.items.map((item) => {
                const active = isActive(item.to)
                return (
                  <li key={item.to}>
                    <SafeLink
                      to={item.to}
                      data-mol-id={item.molId}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        'rounded-lg transition-colors relative',
                      )}
                      style={{
                        color: active
                          ? 'var(--color-sidebar-text)'
                          : 'var(--color-sidebar-text-muted)',
                        background: active ? 'var(--color-sidebar-active-bg)' : 'transparent',
                      }}
                    >
                      {active && (
                        <span
                          className={'absolute left-0 top-2 bottom-2 rounded-r'}
                          style={{ width: 3, background: 'var(--color-sidebar-active-stripe)' }}
                        />
                      )}
                      <span
                        className={cm.cn('material-symbols-outlined', cm.textSize('xl'))}
                        style={{
                          color: active
                            ? 'var(--color-sidebar-text)'
                            : 'var(--color-sidebar-text-muted)',
                        }}
                      >
                        {item.icon}
                      </span>
                      <span>{t(item.labelKey, {}, { defaultValue: item.defaultLabel })}</span>
                    </SafeLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer status */}
      <div
        className={cm.cn(cm.sp('p', 4))}
        style={{ borderTop: '1px solid var(--color-sidebar-border)' }}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={'rounded-full'}
            style={{
              width: 8,
              height: 8,
              background: 'var(--color-sidebar-status-dot)',
              boxShadow: '0 0 12px var(--color-sidebar-status-dot)',
            }}
          />
          <span className={cm.textSize('xs')} style={{ color: 'var(--color-sidebar-text-muted)' }}>
            {t('workflowSidebar.status', {}, { defaultValue: 'All systems running' })}
          </span>
        </div>
      </div>
    </aside>
  )
}
