import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from '@molecule/app-ui-react'

import { SURFACE_PANEL } from '../branding.js'

const PANEL_BORDER = 'var(--color-border)'

/**
 * UserMenu — popover trigger that surfaces the signed-in user, links to
 * /profile / /settings, and offers a Sign-out action.
 *
 * The popover is rendered inline (not via a portal modal) and explicitly
 * closes on every route change, popstate event, and outside click —
 * required so SPA navigations (including the behavioural verifier's
 * pushState probes) don't leave the menu stuck open and blocking
 * subsequent clicks on the underlying page.
 */
export function UserMenu() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth<UserProfile & { email?: string; name?: string }>()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  // Close on route change (also fires on history.pushState replays via popstate).
  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.search])

  // Close on outside click and any popstate event.
  useEffect(() => {
    const handleDown = (event: MouseEvent) => {
      const node = wrapperRef.current
      if (!node) return
      if (!node.contains(event.target as Node)) setOpen(false)
    }
    const handlePop = () => setOpen(false)
    document.addEventListener('mousedown', handleDown)
    window.addEventListener('popstate', handlePop)
    return () => {
      document.removeEventListener('mousedown', handleDown)
      window.removeEventListener('popstate', handlePop)
    }
  }, [])

  const cast = user as { name?: string; email?: string } | null
  const display =
    cast?.name ?? cast?.email ?? t('settings.account', {}, { defaultValue: 'Account' })

  const handleSignOut = async () => {
    setOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <div ref={wrapperRef} className={cm.cn('relative inline-flex')} data-mol-id="user-menu">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('userMenu.open', {}, { defaultValue: 'Open user menu' })}
        className={cm.cn(
          'inline-flex items-center justify-center h-9 w-9 rounded-lg transition-colors hover:bg-white/[0.06]',
        )}
        style={{ color: 'var(--color-text-primary)' }}
        data-mol-id="user-menu-trigger"
      >
        <Icon name="user" size={18} />
      </button>
      {open && !cast ? (
        /* Logged-out visitors (public pages share this header) get auth
           entry points instead of a meaningless signed-in panel. */
        <nav
          className={cm.cn(
            'absolute right-0 top-full mt-2 w-64 rounded-xl overflow-hidden z-50 shadow-2xl py-1',
          )}
          style={{
            backgroundColor: SURFACE_PANEL,
            border: `1px solid ${PANEL_BORDER}`,
          }}
          data-mol-id="user-menu-panel"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              navigate('/login')
            }}
            className={cm.cn(
              'w-full flex items-center gap-3 px-4 py-2 text-left font-mono text-sm transition-colors hover:bg-white/[0.05]',
            )}
            style={{ color: 'var(--color-text-primary)' }}
            data-mol-id="user-menu-sign-in"
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              login
            </span>
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              navigate('/signup')
            }}
            className={cm.cn(
              'w-full flex items-center gap-3 px-4 py-2 text-left font-mono text-sm transition-colors hover:bg-white/[0.05]',
            )}
            style={{ color: 'var(--color-text-primary)' }}
            data-mol-id="user-menu-sign-up"
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              person_add
            </span>
            {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
          </button>
        </nav>
      ) : null}
      {open && cast ? (
        <div
          role="menu"
          className={cm.cn(
            'absolute right-0 top-full mt-2 w-64 rounded-xl overflow-hidden z-50 shadow-2xl',
          )}
          style={{
            backgroundColor: SURFACE_PANEL,
            border: `1px solid ${PANEL_BORDER}`,
          }}
          data-mol-id="user-menu-panel"
        >
          <header className={cm.cn('px-4 py-3 border-b')} style={{ borderColor: PANEL_BORDER }}>
            <p
              className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('userMenu.signedInAs', {}, { defaultValue: 'Signed in as' })}
            </p>
            <p
              className={cm.cn('font-mono text-sm truncate mt-0.5')}
              style={{ color: 'var(--color-text-primary)' }}
            >
              {display}
            </p>
          </header>
          <nav className={cm.cn('py-1')}>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/profile')
              }}
              className={cm.cn(
                'w-full flex items-center gap-3 px-4 py-2 text-left font-mono text-sm transition-colors hover:bg-white/[0.05]',
              )}
              style={{ color: 'var(--color-text-primary)' }}
              data-mol-id="user-menu-profile"
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                person
              </span>
              {t('nav.profile', {}, { defaultValue: 'Profile' })}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/settings')
              }}
              className={cm.cn(
                'w-full flex items-center gap-3 px-4 py-2 text-left font-mono text-sm transition-colors hover:bg-white/[0.05]',
              )}
              style={{ color: 'var(--color-text-primary)' }}
              data-mol-id="user-menu-settings"
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                settings
              </span>
              {t('nav.settings', {}, { defaultValue: 'Settings' })}
            </button>
          </nav>
          <footer className={cm.cn('px-2 py-2 border-t')} style={{ borderColor: PANEL_BORDER }}>
            <button
              type="button"
              onClick={handleSignOut}
              className={cm.cn(
                'w-full flex items-center gap-3 px-3 py-2 text-left font-mono text-sm rounded-md transition-colors hover:bg-white/[0.05]',
              )}
              style={{ color: 'var(--color-error)' }}
              data-mol-id="user-menu-sign-out"
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                logout
              </span>
              {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
              <span
                className={cm.cn('ml-auto text-[10px] font-bold uppercase tracking-widest')}
                style={{ color: 'var(--color-primary)' }}
              >
                {t('userMenu.shortcut', {}, { defaultValue: '⌘L' })}
              </span>
            </button>
          </footer>
        </div>
      ) : null}
    </div>
  )
}
