/**
 * Dashboard top-bar CONTENT — breadcrumbs (left) and search/notifications/
 * help actions (right), rendered into `<ResponsiveAppShell.TopBar>` slots by
 * `RapportLayout`.
 *
 * The hamburger button, the mobile drawer overlay and its open state are
 * GONE: `ResponsiveAppShell.TopBar` renders the menu trigger itself and the
 * shell owns the drawer, the escape/backdrop handling and the auto-close on
 * navigation.
 */
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/** Current-page breadcrumb labels — keys match the SideNavLinks nav items. */
const PAGE_LABELS: Array<{ prefix: string; labelKey: string; labelDefault: string }> = [
  { prefix: '/dashboard', labelKey: 'sideNavBar.dashboard', labelDefault: 'Dashboard' },
  { prefix: '/conversations', labelKey: 'sideNavBar.conversations', labelDefault: 'Conversations' },
  { prefix: '/knowledge', labelKey: 'sideNavBar.knowledge', labelDefault: 'Knowledge' },
  { prefix: '/analytics', labelKey: 'sideNavBar.analytics', labelDefault: 'Analytics' },
  { prefix: '/settings', labelKey: 'sideNavBar.settings', labelDefault: 'Settings' },
  { prefix: '/profile', labelKey: 'sideNavBar.profile', labelDefault: 'Profile' },
  { prefix: '/notifications', labelKey: 'settings.notifications', labelDefault: 'Notifications' },
]

/** Left cluster — breadcrumb trail (desktop) and page title (mobile). */
export function DashboardBreadcrumbs() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const currentPage =
    PAGE_LABELS.find((p) => location.pathname.startsWith(p.prefix)) ?? PAGE_LABELS[0]

  return (
    <div className={cm.flex({ align: 'center', gap: 4 })}>
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
          className={cm.cn(cm.fontWeight('semibold'), 'text-primary dark:text-primary-container')}
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
  )
}

/** Right cluster — knowledge search, notifications link, help button. */
export function DashboardTopBarActions() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const { t } = useTranslation()
  const cm = getClassMap()

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const term = search.trim()
    if (term) {
      navigate(`/knowledge?q=${encodeURIComponent(term)}`)
    }
  }

  return (
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
  )
}
