import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import SideNavBar from './SideNavBar.js'

interface DashboardTopBarProps {
  onOpenMobileNav?: () => void
}

/** Current-page breadcrumb labels — keys match the SideNavBar nav items. */
const PAGE_LABELS: Array<{ prefix: string; labelKey: string; labelDefault: string }> = [
  { prefix: '/dashboard', labelKey: 'sideNavBar.dashboard', labelDefault: 'Dashboard' },
  { prefix: '/conversations', labelKey: 'sideNavBar.conversations', labelDefault: 'Conversations' },
  { prefix: '/knowledge', labelKey: 'sideNavBar.knowledge', labelDefault: 'Knowledge' },
  { prefix: '/analytics', labelKey: 'sideNavBar.analytics', labelDefault: 'Analytics' },
  { prefix: '/settings', labelKey: 'sideNavBar.settings', labelDefault: 'Settings' },
  { prefix: '/profile', labelKey: 'sideNavBar.profile', labelDefault: 'Profile' },
  { prefix: '/notifications', labelKey: 'settings.notifications', labelDefault: 'Notifications' },
]

function DashboardTopBar({ onOpenMobileNav }: DashboardTopBarProps = {}) {
  const [search, setSearch] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const cm = getClassMap()

  const currentPage =
    PAGE_LABELS.find((p) => location.pathname.startsWith(p.prefix)) ?? PAGE_LABELS[0]

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const term = search.trim()
    if (term) {
      navigate(`/knowledge?q=${encodeURIComponent(term)}`)
    }
  }

  return (
    <>
      {mobileNavOpen && (
        <div data-mol-id="mobile-nav-drawer" className="fixed inset-0 z-50 md:hidden">
          <div
            role="presentation"
            aria-hidden="true"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative z-10 h-full">
            <SideNavBar overlay onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}
      <header
        data-mol-id="dashboard-topbar"
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('px', 8),
          cm.w('full'),
          cm.h(16),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          "sticky top-0 z-40 bg-surface-container-lowest no-border tonal-shift flat no-shadows font-['Inter'] tracking-tight text-primary",
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 4 })}>
          <button
            data-mol-id="topbar-mobile-menu"
            aria-label={t('dashboardTopBar.openMenuAria', {}, { defaultValue: 'Open menu' })}
            aria-expanded={mobileNavOpen}
            className="md:hidden text-on-background/60 hover:text-primary transition-colors"
            type="button"
            onClick={() => (onOpenMobileNav ? onOpenMobileNav() : setMobileNavOpen(true))}
          >
            <span className="material-symbols-outlined" data-icon="menu">
              menu
            </span>
          </button>
          <nav
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              'hidden md:flex text-on-background/60',
            )}
          >
            <span>{t('dashboardTopBar.support', {}, { defaultValue: 'Support' })}</span>
            <span className="material-symbols-outlined text-[16px]" data-icon="chevron_right">
              chevron_right
            </span>
            <span
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-primary dark:text-primary-container',
              )}
            >
              {t(currentPage.labelKey, {}, { defaultValue: currentPage.labelDefault })}
            </span>
          </nav>
          <span
            className={cm.cn(
              cm.textSize('lg'),
              'md:hidden font-black text-primary dark:text-primary-container',
            )}
          >
            {t(currentPage.labelKey, {}, { defaultValue: currentPage.labelDefault })}
          </span>
        </div>
        <div className={cm.flex({ align: 'center', gap: 6 })}>
          <form
            onSubmit={handleSearchSubmit}
            className={cm.cn(cm.w(64), 'relative hidden sm:block')}
            data-mol-id="topbar-search-form"
          >
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none"
              data-icon="search"
            >
              search
            </span>
            <input
              data-mol-id="topbar-search"
              className={cm.cn(
                cm.w('full'),
                cm.roundedFull,
                cm.sp('py', 2),
                cm.sp('pl', 10),
                cm.sp('pr', 4),
                cm.textSize('sm'),
                'bg-surface-container-low border-none text-on-surface focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-lowest transition-all placeholder:text-outline',
              )}
              placeholder={t(
                'dashboardTopBar.searchPlaceholder',
                {},
                { defaultValue: 'Search knowledge…' },
              )}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
          <Link
            data-mol-id="nav-notifications"
            to="/notifications"
            aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            className="text-on-background/60 hover:text-primary dark:hover:text-primary-container transition-colors subtle scale-95 duration-200"
          >
            <span className="material-symbols-outlined" data-icon="notifications">
              notifications
            </span>
          </Link>
          <button
            data-mol-id="topbar-help"
            aria-label={t('dashboardTopBar.helpAria', {}, { defaultValue: 'Help' })}
            className="text-on-background/60 hover:text-primary dark:hover:text-primary-container transition-colors subtle scale-95 duration-200"
            type="button"
            onClick={() => navigate('/knowledge')}
          >
            <span className="material-symbols-outlined" data-icon="help_outline">
              help_outline
            </span>
          </button>
        </div>
      </header>
    </>
  )
}

export default DashboardTopBar
export { DashboardTopBar }
