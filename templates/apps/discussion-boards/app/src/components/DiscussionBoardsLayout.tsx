/**
 * Discussion Boards layout — sidebar + content shell used by every
 * authenticated route. Sidebar holds primary navigation (Categories,
 * Compose, Bookmarks, Notifications, Search, Settings) plus the
 * Moderation Queue link for moderators. Top of the shell uses the
 * shared @molecule/app-header-react chrome and the shared Footer.
 *
 * Translated from blog's BlogLayout (sidebar + main + chrome) but
 * routed through getClassMap helpers + brand tokens (no inline styles).
 */
import { NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { AppShellLayout } from '@molecule/app-shell-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { Footer } from './Footer.js'
import { Header } from './Header.js'

interface NavItem {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
  end?: boolean
}

const PRIMARY_NAV: NavItem[] = [
  {
    to: '/c',
    icon: 'dashboard',
    labelKey: 'nav.categories',
    defaultLabel: 'Categories',
    end: true,
  },
  { to: '/compose', icon: 'edit_note', labelKey: 'nav.compose', defaultLabel: 'New thread' },
  { to: '/search', icon: 'search', labelKey: 'nav.search', defaultLabel: 'Search' },
  { to: '/bookmarks', icon: 'bookmark', labelKey: 'nav.bookmarks', defaultLabel: 'Bookmarks' },
  {
    to: '/notifications',
    icon: 'notifications',
    labelKey: 'nav.notifications',
    defaultLabel: 'Notifications',
  },
]

const SECONDARY_NAV: NavItem[] = [
  {
    to: '/moderation',
    icon: 'gavel',
    labelKey: 'nav.moderation',
    defaultLabel: 'Moderation queue',
  },
  { to: '/settings', icon: 'settings', labelKey: 'nav.settings', defaultLabel: 'Settings' },
]

export function DiscussionBoardsLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <AppShellLayout header={<Header />} footer={<Footer />}>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'mx-auto w-full max-w-[1200px] gap-8 px-4 py-8 lg:flex-row lg:items-start lg:px-8',
        )}
      >
        <aside className={cm.cn(cm.stack(6), 'shrink-0 lg:sticky lg:top-24 lg:w-[260px]')}>
          <nav className={cm.cn(cm.stack(1))}>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('px', 3),
                cm.sp('mb', 2),
                'text-[10px] uppercase tracking-[0.25em] text-on-surface-variant',
              )}
            >
              {t('nav.browseHeader', {}, { defaultValue: 'Browse' })}
            </p>
            {PRIMARY_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.fontWeight(isActive ? 'bold' : 'medium'),
                    'rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                  )
                }
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden>
                  {item.icon}
                </span>
                {t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
              </NavLink>
            ))}
          </nav>
          <div className={cm.cn(cm.stack(1), 'border-t border-outline-variant/30 pt-4')}>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('px', 3),
                cm.sp('mb', 2),
                'text-[10px] uppercase tracking-[0.25em] text-on-surface-variant',
              )}
            >
              {t('common.manage', {}, { defaultValue: 'Manage' })}
            </p>
            {SECONDARY_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.fontWeight(isActive ? 'bold' : 'medium'),
                    'rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                  )
                }
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden>
                  {item.icon}
                </span>
                {t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
              </NavLink>
            ))}
          </div>
          <div
            className={cm.cn(
              cm.sp('p', 4),
              cm.stack(2),
              'rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/15',
            )}
          >
            <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-primary')}>
              {t('nav.communityGuidelinesTitle', {}, { defaultValue: 'Community guidelines' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'nav.communityGuidelinesBody',
                {},
                {
                  defaultValue:
                    'Be considered. Quote sources. Mark solutions. Lift the conversation.',
                },
              )}
            </p>
          </div>
        </aside>
        <div className={cm.cn(cm.flex1, cm.stack(8), 'min-w-0')}>
          <Outlet />
        </div>
      </div>
    </AppShellLayout>
  )
}

export default DiscussionBoardsLayout
