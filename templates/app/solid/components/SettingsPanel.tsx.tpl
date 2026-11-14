import { A } from '@solidjs/router'

import {
  AccountSection,
  AuthSection,
  BillingSection,
  DevicesSection,
  LogOutDeleteSection,
  NotificationsSection,
  SettingsContainer,
  ThisDeviceSection,
} from '@molecule/app-settings-panel-solid'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Separator } from '@molecule/app-ui-solid'

import { Footer } from './Footer.js'

export function SettingsPanel(props: { onClose: () => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <SettingsContainer onClose={props.onClose}>
      {/* The full profile page: the drawer's sections update one field at a time, while
          `/settings` edits the whole profile as one native form (and is where the app's
          own profile fields belong). Close the drawer first so navigation is not hidden. */}
      <A
        href="/settings"
        onClick={props.onClose}
        class={cm.cn(cm.button({ variant: 'outline' }), cm.sp('mb', 3))}
        data-mol-id="settings-page-link"
      >
        {t('settings.openProfilePage', undefined, { defaultValue: 'Edit your profile' })}
      </A>
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
