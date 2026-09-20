import {
  AccountSection,
  AuthSection,
  DevicesSection,
  LogOutDeleteSection,
  NotificationsSection,
  SettingsContainer,
  ThisDeviceSection,
  TiersUpgradeSection,
} from '@molecule/app-settings-panel-react'
import { Separator } from '@molecule/app-ui-react'

import { Footer } from './Footer.js'

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  return (
    <SettingsContainer onClose={onClose}>
      <AccountSection />
      <AuthSection />
      <NotificationsSection />
      <TiersUpgradeSection />
      <DevicesSection />
      <ThisDeviceSection />
      <Separator />
      <LogOutDeleteSection />
      <Footer />
    </SettingsContainer>
  )
}
