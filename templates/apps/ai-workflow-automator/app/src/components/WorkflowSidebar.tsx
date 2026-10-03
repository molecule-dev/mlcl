/**
 * Dendrite brand sidebar nav — the shared `ResponsiveAppShell` consumes these
 * pieces: `WorkflowBrandBlock` (bolt mark + name + tagline) rides the Sidebar
 * children / Drawer header, `WorkflowNav` is the ONE grouped nav element both
 * the ≥768px Sidebar and the <768px Drawer receive (only the mounted
 * breakpoint instantiates it, so `nav-*` data-mol-ids stay unique), and
 * `WorkflowStatusFooter` fills the Sidebar/Drawer footer.
 *
 * The former hand-rolled `hidden md:flex fixed` aside and the portal-based
 * MobileNavMenu drawer are deleted with the migration.
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

/** Bolt brand mark — the gradient tile shared by the sidebar and the drawer. */
function BoltMark() {
  return (
    <div
      className={'flex items-center justify-center rounded-xl shadow-lg shrink-0'}
      style={{
        width: 36,
        height: 36,
        background:
          'linear-gradient(135deg, var(--color-node-trigger), var(--color-node-condition))',
        boxShadow: '0 4px 12px color-mix(in srgb, var(--color-node-trigger) 40%, transparent)',
      }}
    >
      <span
        className={'material-symbols-outlined text-lg'}
        style={{ color: 'white', fontVariationSettings: "'FILL' 1" }}
      >
        bolt
      </span>
    </div>
  )
}

/** Brand block: bolt mark + name + tagline. */
export function WorkflowBrandBlock() {
  const { t } = useTranslation()
  return (
    <div className={'flex items-center gap-3 min-w-0'}>
      <BoltMark />
      <div className={'flex flex-col min-w-0'}>
        <span
          className={'font-bold text-lg truncate'}
          style={{ color: 'var(--color-sidebar-text)', letterSpacing: '-0.01em' }}
        >
          {t('workflowSidebar.brand', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </span>
        <span className={'text-xs'} style={{ color: 'var(--color-sidebar-text-muted)' }}>
          {t('workflowSidebar.tagline', {}, { defaultValue: 'Intelligence in motion' })}
        </span>
      </div>
    </div>
  )
}

/** "All systems running" status row — sidebar/drawer footer. */
export function WorkflowStatusFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
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
  )
}

/**
 * The grouped nav links (Workspace / Connect / Account). Longest-prefix
 * active rule, with `/` lighting Dashboard. One element feeds both shells.
 */
export function WorkflowNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const isActive = (to: string) =>
    to === '/dashboard'
      ? location.pathname === '/' || location.pathname === '/dashboard'
      : location.pathname === to || location.pathname.startsWith(`${to}/`)

  return (
    <div className={cm.sp('p', 3)}>
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
                    aria-current={active ? 'page' : undefined}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.sp('px', 3),
                      'min-h-[40px] rounded-lg transition-colors relative text-sm font-medium',
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
                      className={cm.cn('material-symbols-outlined text-xl shrink-0')}
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
    </div>
  )
}
