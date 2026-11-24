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
import { Separator } from '@molecule/app-ui-react'

import { Footer } from './Footer.js'

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  return (
    <SettingsContainer onClose={onClose}>
      <AccountSection />
      <AuthSection />
      <NotificationsSection />
      <BillingSection upgradeTo="/billing" />
      <DevicesSection />
      <ThisDeviceSection />
      <Separator />
      <LogOutDeleteSection />
      <Footer />
    </SettingsContainer>
  )
}
