import { Link } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, SidebarUserCard, usePanelClose } from '@molecule/app-ui-react'

/**
 * The account card + panel. `dataMolId` lets the mobile top bar render a
 * second instance without colliding with the sidebar's
 * `sidebar-user-card` selector (locators double-match otherwise).
 * `compact` drops the email line and caps the width for the mobile top
 * bar, where the full sidebar card (name + email, `w-full`) would wrap.
 */
export function UserMenu({
  dataMolId,
  compact = false,
}: {
  dataMolId?: string
  compact?: boolean
}) {
  const card = (
    <SidebarUserCard
      ariaLabelKey="userMenu.open"
      dataMolId={dataMolId}
      secondaryLine={compact ? '' : undefined}
    >
      <UserMenuPanel />
    </SidebarUserCard>
  )
  if (!compact) return card
  return <div className="max-w-[150px]">{card}</div>
}

interface AccountUser {
  name?: string | null
  email?: string | null
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
      </header>
      <nav
        className={'space-y-1'}
        aria-label={t('nav.accountMenu', {}, { defaultValue: 'Account menu' })}
      >
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
          to="/profile"
          onClick={onClose}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'block rounded-md hover:bg-surface-container',
          )}
        >
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
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
