import { Link } from 'react-router'

import { useTranslation, useUser } from '@molecule/app-react'
import {
  AccountSection,
  AuthSection,
  BillingSection,
  DevicesSection,
  LogOutDeleteSection,
  NotificationsSection,
  SettingsContainer,
  ThisDeviceSection,
} from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { Separator } from '@molecule/app-ui-react'

import { Footer } from './Footer.js'

interface QuickLinkUser {
  id: string
}

/**
 * Account navigation for the user-menu drawer — links to the pages that
 * aren't in the primary top-nav (own profile, My reviews, the full
 * Settings page). Each link dismisses the drawer on click so the target
 * page isn't rendered underneath an open panel.
 */
function QuickLinks({ onNavigate }: { onNavigate: () => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const user = useUser<QuickLinkUser>()
  const rowClass = cm.cn(
    cm.sp('px', 3),
    cm.sp('py', 2),
    cm.flex({ align: 'center', gap: 'sm' }),
    cm.textSize('sm'),
    cm.fontWeight('semibold'),
    'rounded-xl text-on-surface hover:bg-surface-container transition-colors',
  )
  const icon = (name: string) => (
    <span className={'material-symbols-outlined text-xl text-primary'} aria-hidden="true">
      {name}
    </span>
  )
  return (
    <nav
      aria-label={t('userMenu.accountNav', {}, { defaultValue: 'Account navigation' })}
      className={cm.flex({ direction: 'col', gap: 'xs' })}
    >
      {user?.id ? (
        <Link to={`/users/${user.id}`} onClick={onNavigate} className={rowClass}>
          {icon('person')}
          {t('userMenu.profile', {}, { defaultValue: 'My profile' })}
        </Link>
      ) : null}
      <Link to="/my-reviews" onClick={onNavigate} className={rowClass}>
        {icon('rate_review')}
        {t('userMenu.myReviews', {}, { defaultValue: 'My reviews' })}
      </Link>
      <Link to="/settings" onClick={onNavigate} className={rowClass}>
        {icon('settings')}
        {t('userMenu.settings', {}, { defaultValue: 'Settings' })}
      </Link>
    </nav>
  )
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  return (
    <SettingsContainer onClose={onClose}>
      <QuickLinks onNavigate={onClose} />
      <Separator />
      <AccountSection />
      <AuthSection />
      <NotificationsSection />
      <BillingSection />
      <DevicesSection />
      <ThisDeviceSection />
      <Separator />
      <LogOutDeleteSection />
      <Footer />
    </SettingsContainer>
  )
}
