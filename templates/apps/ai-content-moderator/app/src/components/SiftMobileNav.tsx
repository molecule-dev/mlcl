import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SafeLink } from './SafeLink.js'
import { useSiftNavBadges } from './useSiftNavBadges.js'

interface SiftMobileNavProps {
  open: boolean
  onClose: () => void
}

interface MobileLink {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
  match?: (pathname: string) => boolean
}

const LINKS: MobileLink[] = [
  { to: '/dashboard', icon: 'dashboard', labelKey: 'sidebar.dashboard', defaultLabel: 'Dashboard' },
  {
    to: '/queue',
    icon: 'inventory_2',
    labelKey: 'sidebar.queue',
    defaultLabel: 'Queue',
    match: (p) => p.startsWith('/queue'),
  },
  { to: '/rules', icon: 'rule', labelKey: 'sidebar.rules', defaultLabel: 'Rules' },
  { to: '/analytics', icon: 'analytics', labelKey: 'sidebar.analytics', defaultLabel: 'Analytics' },
  {
    to: '/notifications',
    icon: 'notifications_active',
    labelKey: 'sidebar.notifications',
    defaultLabel: 'Notifications',
  },
  { to: '/settings', icon: 'settings', labelKey: 'sidebar.settings', defaultLabel: 'Settings' },
]

/**
 * Mobile navigation drawer for the Sift console shell (<768px, where the
 * fixed sidebar is hidden). Slides in from the left over a dimming
 * overlay; closes on overlay tap, Escape, or link activation. The
 * hamburger trigger lives in SiftTopBar.
 */
export function SiftMobileNav({ open, onClose }: SiftMobileNavProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { queued, unread } = useSiftNavBadges(open ? pathname : '')
  const closeRef = useRef<HTMLButtonElement>(null)

  // Move focus into the drawer when it opens, and put it back on close.
  useEffect(() => {
    if (open) closeRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const itemBase =
    'flex items-center gap-3 px-4 py-3 rounded-md font-inter tracking-tight text-base transition-colors duration-150'
  const inactive = `${itemBase} text-secondary-fixed-dim font-medium hover:bg-primary/10 hover:text-white`
  const active = `${itemBase} text-white font-bold bg-primary/15 border-l-2 border-primary`

  const badgeFor = (to: string): string | null => {
    if (to === '/queue' && queued && queued > 0) return String(queued)
    if (to === '/notifications' && unread && unread > 0) return String(unread)
    return null
  }

  return (
    <div className={cm.cn('md:hidden fixed inset-0 z-40')} data-mol-id="mobile-nav">
      {/* Overlay — click to dismiss. */}
      <div className={cm.cn('absolute inset-0 bg-black/60')} onClick={onClose} aria-hidden="true" />
      <nav
        aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'absolute inset-y-0 left-0 w-[280px] max-w-[85vw] py-6 px-3 overflow-y-auto',
        )}
        style={{ backgroundColor: 'var(--color-on-secondary-fixed)' }}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 4),
            cm.sp('mb', 6),
          )}
        >
          <span
            className={cm.cn(
              'text-2xl font-black tracking-tighter text-white uppercase font-inter leading-none',
            )}
          >
            {APP_NAME}
          </span>
          <button
            ref={closeRef}
            type="button"
            data-mol-id="mobile-nav-close"
            onClick={onClose}
            aria-label={t('common.closeMenu', {}, { defaultValue: 'Close navigation' })}
            className={cm.cn('text-secondary-fixed-dim hover:text-white p-2 -mr-2')}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-[24px]')}>
              close
            </span>
          </button>
        </div>
        <ul className={cm.cn(cm.stack(1))}>
          {LINKS.map((link) => {
            const isActive = link.match
              ? link.match(pathname)
              : pathname === link.to || pathname.startsWith(`${link.to}/`)
            const badge = badgeFor(link.to)
            return (
              <li key={link.to}>
                <SafeLink
                  to={link.to}
                  data-mol-id={`mobile-nav-${link.icon}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={isActive ? active : inactive}
                  onClick={onClose}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn('material-symbols-outlined text-[20px]')}
                    data-icon={link.icon}
                  >
                    {link.icon}
                  </span>
                  <span className={cm.cn(cm.flex1, 'truncate')}>
                    {t(link.labelKey, {}, { defaultValue: link.defaultLabel })}
                  </span>
                  {badge && (
                    <span
                      className={cm.cn(
                        'ml-auto inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-primary text-on-primary text-[10px] font-bold tracking-wide',
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </SafeLink>
              </li>
            )
          })}
        </ul>
        <div className={cm.cn('mt-6 border-t border-slate-800 pt-4')}>
          <SafeLink
            to="/profile"
            data-mol-id="mobile-nav-profile"
            className={pathname === '/profile' ? active : inactive}
            onClick={onClose}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-[20px]')}
              data-icon="account_circle"
            >
              account_circle
            </span>
            <span>{t('nav.profile', {}, { defaultValue: 'Profile' })}</span>
          </SafeLink>
        </div>
      </nav>
    </div>
  )
}
