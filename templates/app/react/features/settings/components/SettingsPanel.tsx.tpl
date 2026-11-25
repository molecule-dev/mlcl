import { Link } from 'react-router'

import {
  AccountSection,
  AuthSection,
  DevicesSection,
  LogOutDeleteSection,
  NotificationsSection,
  SettingsContainer,
  ThisDeviceSection,
{{#feature billing}}
  TiersUpgradeSection,
{{/feature}}
} from '@molecule/app-settings-panel-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Separator } from '@molecule/app-ui-react'

{{#feature footer}}
import { Footer } from './Footer.js'
{{/feature}}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <SettingsContainer onClose={onClose}>
      {/* The full profile page: the drawer's sections update one field at a time, while
          `/settings` edits the whole profile as one native form (and is where the app's
          own profile fields belong). Close the drawer first so navigation is not hidden. */}
      <Link
        to="/settings"
        onClick={onClose}
        className={cm.cn(cm.button({ variant: 'outline' }), cm.sp('mb', 3))}
        data-mol-id="settings-page-link"
      >
        {t('settings.openProfilePage', undefined, { defaultValue: 'Edit your profile' })}
      </Link>
      <AccountSection />
{{#feature two-factor}}
      <AuthSection />
{{/feature}}
{{^feature two-factor}}
      <AuthSection twoFactor={false} />
{{/feature}}
      <NotificationsSection />
{{#feature billing}}
      <TiersUpgradeSection />
{{/feature}}
      <DevicesSection />
      <ThisDeviceSection />
      <Separator />
      <LogOutDeleteSection />
{{#feature footer}}
      <Footer />
{{/feature}}
    </SettingsContainer>
  )
}
