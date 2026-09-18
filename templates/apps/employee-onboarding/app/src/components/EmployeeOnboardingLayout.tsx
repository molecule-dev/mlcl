import { NavLink, Outlet, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Sidebar + top bar shell shared by all authed Embark screens.
 *
 * Translated from crm/AppLayout.tsx + DashboardSideNavBar.tsx — sidebar nav with
 * primary/accent active rail, top bar with greeting + user menu. Embark teal/purple
 * palette and Material Symbols glyphs throughout.
 */

interface NavItem {
  to: string
  iconKey: string
  labelKey: string
  defaultLabel: string
}

const NAV_PRIMARY: NavItem[] = [
  {
    to: '/dashboard',
    iconKey: 'space_dashboard',
    labelKey: 'nav.dashboard',
    defaultLabel: 'Dashboard',
  },
  { to: '/checklist', iconKey: 'checklist', labelKey: 'nav.checklist', defaultLabel: 'Checklist' },
  { to: '/timeline', iconKey: 'timeline', labelKey: 'nav.timeline', defaultLabel: '30/60/90' },
  { to: '/training', iconKey: 'school', labelKey: 'nav.training', defaultLabel: 'Training' },
  {
    to: '/documents',
    iconKey: 'description',
    labelKey: 'nav.documents',
    defaultLabel: 'Documents',
  },
]

const NAV_PEOPLE: NavItem[] = [
  { to: '/team', iconKey: 'groups', labelKey: 'nav.team', defaultLabel: 'Team' },
  { to: '/profile', iconKey: 'person', labelKey: 'nav.profile', defaultLabel: 'My Profile' },
  {
    to: '/notifications',
    iconKey: 'notifications',
    labelKey: 'nav.notifications',
    defaultLabel: 'Notifications',
  },
  { to: '/settings', iconKey: 'settings', labelKey: 'nav.settings', defaultLabel: 'Settings' },
]

function NavSection({
  cm,
  t,
  heading,
  items,
}: {
  cm: ReturnType<typeof getClassMap>
  t: ReturnType<typeof useTranslation>['t']
  heading: string
  items: NavItem[]
}) {
  return (
    <div className={cm.sp('mb', 6)}>
      <p
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('mb', 2),
          'text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant',
        )}
      >
        {heading}
      </p>
      <ul className={cm.cn(cm.flex({ direction: 'col' }), cm.sp('px', 2))}>
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/10 text-primary border-l-[3px] border-primary'
                    : 'text-on-surface hover:bg-surface-container-low',
                )
              }
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                {item.iconKey}
              </span>
              <span>{t(item.labelKey, {}, { defaultValue: item.defaultLabel })}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function EmployeeOnboardingLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div
      className={cm.cn(cm.flex(), cm.minH('screen'), 'bg-background text-on-surface antialiased')}
    >
      {/* Sidebar */}
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'bg-surface border-r border-outline-variant',
        )}
        style={{ width: '260px', flexShrink: 0 }}
      >
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('px', 5), cm.sp('py', 5))}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-xl shadow-md',
            )}
            style={{
              width: '36px',
              height: '36px',
              background:
                'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-secondary) 100%)',
              color: 'var(--mol-color-surface)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              rocket_launch
            </span>
          </div>
          <div>
            <p className={cm.cn(cm.fontWeight('bold'), 'text-base tracking-tight')}>{APP_NAME}</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
              {t('layout.tagline', {}, { defaultValue: APP_TAGLINE })}
            </p>
          </div>
        </div>
        <nav className={cm.cn(cm.flex1, cm.sp('py', 4))}>
          <NavSection
            cm={cm}
            t={t}
            heading={t('layout.section.onboarding', {}, { defaultValue: 'Onboarding' })}
            items={NAV_PRIMARY}
          />
          <NavSection
            cm={cm}
            t={t}
            heading={t('nav.you', {}, { defaultValue: 'You' })}
            items={NAV_PEOPLE}
          />
        </nav>
      </aside>

      {/* Main column */}
      <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1)} style={{ minWidth: 0 }}>
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 8),
            'bg-surface border-b border-outline-variant',
          )}
          style={{ height: '64px', flexShrink: 0 }}
        >
          <form
            className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
            role="search"
            onSubmit={(e) => {
              e.preventDefault()
              const q = new FormData(e.currentTarget).get('q')
              if (typeof q === 'string' && q.trim()) {
                navigate(`/team?q=${encodeURIComponent(q.trim())}`)
                e.currentTarget.reset()
              }
            }}
          >
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: '20px' }}
            >
              search
            </span>
            <input
              type="search"
              name="q"
              data-mol-id="layout-search-input"
              placeholder={t(
                'layout.searchTeammates',
                {},
                { defaultValue: 'Search teammates by name or role…' },
              )}
              className="bg-transparent outline-none"
              style={{ width: '320px' }}
            />
          </form>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main className={cm.cn(cm.flex1, cm.sp('p', 8))} style={{ overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
