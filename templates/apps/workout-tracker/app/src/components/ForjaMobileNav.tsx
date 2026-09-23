import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type NavItem, PRIMARY_ITEMS, SECONDARY_ITEMS } from './ForjaSidebar.js'

interface ForjaMobileNavProps {
  open: boolean
  onClose: () => void
}

/**
 * Mobile navigation drawer for Forja's signed-in surfaces (<768px, where the
 * fixed left rail is hidden — which left phones with NO navigation at all).
 * Slides in from the left over a dimming overlay; closes on overlay tap,
 * Escape, or link activation. The hamburger trigger lives in the sticky
 * mobile top bar rendered by ForjaAppShell.
 *
 * Fleet pattern: see calorie-counter's NoshMobileNav and
 * ai-content-moderator's SiftMobileNav.
 */
export function ForjaMobileNav({ open, onClose }: ForjaMobileNavProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const closeRef = useRef<HTMLButtonElement>(null)

  // Move focus into the drawer when it opens, and close on Escape.
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

  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`)

  const renderItem = (item: NavItem) => {
    const active = isActive(item.to)
    return (
      <li key={item.to}>
        <Link
          to={item.to}
          data-mol-id={`mobile-nav-${item.icon}`}
          aria-current={active ? 'page' : undefined}
          onClick={onClose}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            'py-3 min-h-[48px] rounded-xl transition-colors duration-200 text-base',
            active
              ? 'bg-primary text-on-primary font-semibold'
              : 'text-white/80 font-medium hover:bg-surface/5 hover:text-white',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-[22px] shrink-0')}
            style={item.filledIcon ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {item.icon}
          </span>
          <span>{t(item.labelKey, {}, { defaultValue: item.defaultLabel })}</span>
        </Link>
      </li>
    )
  }

  return (
    <div className={cm.cn('md:hidden fixed inset-0 z-40')} data-mol-id="mobile-nav">
      {/* Overlay — click to dismiss. */}
      <div
        role="presentation"
        className={cm.cn('absolute inset-0 bg-black/60')}
        onClick={onClose}
      />
      <nav
        aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'md' }),
          cm.sp('p', 4),
          'absolute inset-y-0 left-0 w-[280px] max-w-[85vw] bg-accent overflow-y-auto',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <span className={cm.cn('text-2xl font-black tracking-tight text-primary')}>
            {APP_NAME}
          </span>
          <button
            ref={closeRef}
            type="button"
            data-mol-id="mobile-nav-close"
            onClick={onClose}
            aria-label={t('common.closeMenu', {}, { defaultValue: 'Close navigation' })}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-11 h-11 -mr-2 rounded-full text-white/80 hover:bg-surface/5 hover:text-white',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
              close
            </span>
          </button>
        </div>
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'list-none')}>
          {PRIMARY_ITEMS.map(renderItem)}
        </ul>
        <ul
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'xs' }),
            'list-none pt-4 border-t border-white/10',
          )}
        >
          {SECONDARY_ITEMS.map(renderItem)}
        </ul>
      </nav>
    </div>
  )
}
