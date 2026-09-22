/**
 * Primary navigation for the signed-in shell.
 *
 * The app shipped with NO persistent navigation — pages only cross-linked to
 * each other, so there was no way to jump between Dashboard / Jobs /
 * Applications / Companies without backing out through breadcrumbs. This is
 * the fleet-standard template-local mobile shell, split by breakpoint:
 *
 * - Below 768px: a fixed bottom tab bar (thumb-reachable, flex-1 items so
 *   every target is ~55px wide, ≥48px tall, safe-area padding so
 *   home-indicator devices don't clip the labels, active route carries
 *   `aria-current="page"`).
 * - 768px and up: a sticky chip rail under the header.
 */
import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const NAV_ITEMS = [
  {
    to: '/dashboard',
    icon: 'space_dashboard',
    labelKey: 'nav.dashboard',
    defaultLabel: 'Dashboard',
    molId: 'nav-chip-dashboard',
  },
  {
    to: '/jobs',
    icon: 'work',
    labelKey: 'nav.jobs',
    defaultLabel: 'Jobs',
    molId: 'nav-chip-jobs',
  },
  {
    to: '/applications',
    icon: 'description',
    labelKey: 'nav.applications',
    defaultLabel: 'Pipelines',
    molId: 'nav-chip-applications',
  },
  {
    to: '/companies',
    icon: 'apartment',
    labelKey: 'nav.companies',
    defaultLabel: 'Companies',
    molId: 'nav-chip-companies',
  },
  {
    to: '/post-job',
    icon: 'add_circle',
    labelKey: 'nav.postJob',
    defaultLabel: 'Post job',
    molId: 'nav-chip-post-job',
  },
  {
    to: '/notifications',
    icon: 'notifications',
    labelKey: 'nav.notifications',
    defaultLabel: 'Alerts',
    molId: 'nav-chip-notifications',
  },
] as const

export function NavChipBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`)

  return (
    <>
      {/* Mobile: fixed bottom tab bar */}
      <nav
        aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
        className={cm.cn(
          cm.flex({ align: 'stretch' }),
          cm.sp('px', 1),
          'fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-outline-variant/20 bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]',
        )}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              data-mol-id={item.molId.replace('nav-chip-', 'nav-tab-')}
              aria-current={active ? 'page' : undefined}
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'xs' }),
                'flex-1 min-w-0 min-h-[48px] rounded-xl transition-colors active:scale-95',
                active ? 'text-primary font-semibold' : 'text-on-surface-variant font-medium',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn('material-symbols-outlined text-[22px] leading-none')}
              >
                {item.icon}
              </span>
              <span className={cm.cn('text-[10px] leading-tight', 'truncate max-w-full px-0.5')}>
                {t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Desktop: sticky chip rail under the header */}
      <nav
        aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
        className={cm.cn(
          'sticky top-0 z-30 hidden border-b border-outline-variant/20 bg-surface/95 backdrop-blur md:block',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.sp('px', 4))}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                data-mol-id={item.molId}
                aria-current={active ? 'page' : undefined}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.textSize('sm'),
                  'my-2 min-h-[40px] items-center whitespace-nowrap rounded-full font-bold transition-colors',
                  active
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                  {item.icon}
                </span>
                {t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
