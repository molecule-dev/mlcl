import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SideNavFooter, SideNavLinks } from './SideNavBar.js'
import { UserMenu } from './UserMenu.js'

/**
 * Template-local mobile shell (fleet pattern): a sticky top bar + drawer for
 * viewports below 768px, where the fixed 260px sidebar and the desktop
 * TopNavBar are hidden. The bar carries the brand, the notification + theme
 * actions and the hamburger; the drawer carries the same nav links as the
 * desktop sidebar (SideNavLinks) plus the progress/user footer.
 *
 * Mobile-only action ids are suffixed `-mobile` so desktop e2e locators
 * (`btn-notifications`, `btn-theme-toggle`) never double-match.
 */
export type MobileNavAction = {
  label: string
  onClick: () => void
  icon?: string
}

/**
 * Optional primary action (e.g. "New thread") surfaced at the top of the
 * drawer for pages whose only action button lives in the desktop sidebar.
 */
export function MobileNav({ action }: { action?: MobileNavAction } = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  // Close on Escape while the drawer is open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Lock body scroll behind the drawer.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  const iconButton = cm.cn(
    cm.sp('p', 2),
    cm.roundedFull,
    'text-foreground-secondary hover:bg-surface-secondary transition-colors',
  )

  return (
    <>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 2 }),
          cm.sp('px', 4),
          cm.h(14),
          'sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border md:hidden',
        )}
      >
        <button
          type="button"
          className={cm.cn(
            iconButton,
            'min-h-[40px] min-w-[40px] flex items-center justify-center',
          )}
          data-mol-id="btn-mobile-menu"
          aria-label={t('mobileNav.openMenu', {}, { defaultValue: 'Open navigation menu' })}
          aria-expanded={open}
          aria-controls="mobile-nav-drawer"
          onClick={() => setOpen(true)}
        >
          <span className={cm.cn('material-symbols-outlined')}>menu</span>
        </button>
        <Link
          to="/dashboard"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.fontWeight('bold'),
            cm.textSize('lg'),
            'text-primary dark:text-[#a78bfa] min-w-0 truncate',
          )}
          data-mol-id="mobile-nav-brand"
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            school
          </span>
          <span className="truncate">{APP_NAME}</span>
        </Link>
        <div className={cm.cn(cm.flex({ align: 'center' }))}>
          <UserMenu dataMolId="user-menu-mobile" />
          <button
            type="button"
            className={cm.cn(
              iconButton,
              'relative min-h-[40px] min-w-[40px] flex items-center justify-center',
            )}
            data-mol-id="btn-notifications-mobile"
            aria-label={t('mobileNav.notifications', {}, { defaultValue: 'Notifications menu' })}
            onClick={() => navigate('/notifications')}
          >
            <span className={cm.cn('material-symbols-outlined')}>notifications</span>
            <span
              className={cm.cn(
                cm.w(2),
                cm.h(2),
                cm.roundedFull,
                'absolute top-2 right-2 bg-error border-2 border-surface',
              )}
            ></span>
          </button>
          <button
            type="button"
            className={cm.cn(
              iconButton,
              'min-h-[40px] min-w-[40px] flex items-center justify-center',
            )}
            data-mol-id="btn-theme-toggle-mobile"
            aria-label={t('mobileNav.toggleTheme', {}, { defaultValue: 'Toggle color theme' })}
            onClick={() => setTheme(theme?.mode === 'dark' ? 'light' : 'dark')}
          >
            <span className={cm.cn('material-symbols-outlined')}>
              {theme?.mode === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" data-mol-id="mobile-nav-overlay">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t('mobileNav.menuLabel', {}, { defaultValue: 'Navigation menu' })}
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              cm.sp('p', 6),
              'absolute inset-y-0 left-0 w-[280px] max-w-[85vw] overflow-y-auto bg-surface-secondary shadow-xl',
            )}
          >
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}
            >
              <span
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  'text-primary dark:text-[#a78bfa]',
                )}
              >
                {t('sideNavBar.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
              </span>
              <button
                type="button"
                className={cm.cn(
                  iconButton,
                  'min-h-[40px] min-w-[40px] flex items-center justify-center',
                )}
                data-mol-id="btn-mobile-menu-close"
                aria-label={t('mobileNav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
                onClick={() => setOpen(false)}
              >
                <span className={cm.cn('material-symbols-outlined')}>close</span>
              </button>
            </div>
            {action && (
              <button
                type="button"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                  cm.sp('py', 3),
                  cm.sp('mb', 4),
                  cm.w('full'),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-lg scholar-gradient text-on-primary',
                )}
                data-mol-id="btn-mobile-drawer-action"
                onClick={() => {
                  setOpen(false)
                  action.onClick()
                }}
              >
                {action.icon && (
                  <span
                    className={cm.cn('material-symbols-outlined text-[1.2rem]')}
                    aria-hidden="true"
                  >
                    {action.icon}
                  </span>
                )}
                {action.label}
              </button>
            )}
            <SideNavLinks onNavigate={() => setOpen(false)} />
            <SideNavFooter />
          </aside>
        </div>
      )}
    </>
  )
}

export default MobileNav
