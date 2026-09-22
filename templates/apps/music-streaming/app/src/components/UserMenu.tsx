import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, PanelCloseProvider, SidebarUserCard, usePanelClose } from '@molecule/app-ui-react'

export function UserMenu() {
  return (
    <SidebarUserCard ariaLabelKey="userMenu.open">
      <UserMenuPanel />
    </SidebarUserCard>
  )
}

function initialsOf(value: string | null | undefined): string {
  const source = (value ?? '').trim()
  if (!source) return '?'
  const parts = source.split(/\s+/).slice(0, 2)
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '?'
}

const POPOVER_FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

/**
 * Compact avatar-only account button for the mobile top bar. The sidebar
 * `SidebarUserCard` renders a full-width name+email card — correct in the
 * sidebar's bottom slot, but it crushes a 390px top bar's wordmark. This
 * variant is a 44px initials circle that opens the SAME panel content
 * (`UserMenuPanel`, wrapped in the shared `PanelCloseProvider` so its
 * links keep dismissing it).
 */
export function MobileUserMenu() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth<{ name?: string | null; email?: string | null }>()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const close = (): void => setOpen(false)

  // Route change, Escape, and outside click all dismiss the popover.
  useEffect(() => {
    setOpen(false)
  }, [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onPointer = (e: MouseEvent | TouchEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
    }
  }, [open])

  const displayName = auth.user?.name ?? auth.user?.email ?? undefined

  return (
    <div className={cm.cn('relative shrink-0')} ref={containerRef}>
      <button
        type="button"
        data-mol-id="mobile-user-menu"
        aria-label={t('userMenu.open', {}, { defaultValue: 'Open account menu' })}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.roundedFull,
          cm.shrink0,
          'h-11 w-11 hover:bg-surface-container transition-colors',
          POPOVER_FOCUS_RING,
        )}
      >
        <span
          aria-hidden="true"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'w-8 h-8 shrink-0',
          )}
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-on-primary, #ffffff)',
          }}
        >
          {initialsOf(displayName)}
        </span>
      </button>
      {open ? (
        <div
          data-mol-id="mobile-user-menu-panel"
          role="menu"
          aria-label={t('nav.accountMenu', {}, { defaultValue: 'Account menu' })}
          className={cm.cn(
            'absolute right-0 top-full mt-2 z-50 w-72 max-w-[85vw] rounded-xl border border-outline-variant/40 bg-surface-container-low shadow-xl overflow-hidden',
          )}
        >
          <PanelCloseProvider close={close}>
            <UserMenuPanel />
          </PanelCloseProvider>
        </div>
      ) : null}
    </div>
  )
}

interface AccountUser {
  name?: string | null
  email?: string | null
  plan?: string | null
}

function UserMenuPanel() {
  const onClose = usePanelClose()
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth<AccountUser>()
  const user = auth.user

  return (
    <div className={cm.cn(cm.sp('p', 5), 'space-y-4 w-72')}>
      <header className={cm.cn(cm.sp('pb', 4), 'border-b border-outline-variant')}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {user?.name ?? t('userMenu.guestName', {}, { defaultValue: 'Listener' })}
        </p>
        {user?.email ? (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{user.email}</p>
        ) : null}
        {user?.plan ? (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.textPrimary,
              cm.fontWeight('medium'),
              cm.sp('mt', 1),
            )}
          >
            {t('userMenu.plan', { plan: user.plan }, { defaultValue: '{{plan}} plan' })}
          </p>
        ) : null}
      </header>
      <nav
        className={cm.cn('space-y-1')}
        aria-label={t('nav.accountMenu', {}, { defaultValue: 'Account menu' })}
      >
        <Link
          to="/profile/me"
          onClick={onClose}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'block rounded-md hover:bg-surface-container',
          )}
        >
          {t('nav.yourProfile', {}, { defaultValue: 'Your profile' })}
        </Link>
        <Link
          to="/library"
          onClick={onClose}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'block rounded-md hover:bg-surface-container',
          )}
        >
          {t('nav.yourLibrary', {}, { defaultValue: 'Your library' })}
        </Link>
        <Link
          to="/settings"
          onClick={onClose}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'block rounded-md hover:bg-surface-container',
          )}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </Link>
      </nav>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          await auth.logout()
          onClose()
        }}
      >
        {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
      </Button>
    </div>
  )
}
