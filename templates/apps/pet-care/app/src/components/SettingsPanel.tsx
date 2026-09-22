import {
  AccountSection,
  AuthSection,
  DevicesSection,
  LogOutDeleteSection,
  NotificationsSection,
  SettingsContainer,
  ThisDeviceSection,
} from '@molecule/app-settings-panel-react'
import { Separator } from '@molecule/app-ui-react'

import { Footer } from './Footer.js'
import { UpgradeButton } from './UpgradeButton.js'

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  return (
    <SettingsContainer onClose={onClose}>
      <AccountSection />
      <AuthSection />
      <NotificationsSection />
      {/* Billing is rendered by <UpgradeButton> alone — the shared
          <BillingSection> would duplicate the row (its Upgrade button only
          navigates back to /settings, a no-op inside this panel). */}
      <UpgradeButton />
      <DevicesSection />
      <ThisDeviceSection />
      <Separator />
      <LogOutDeleteSection />
      <Footer />
    </SettingsContainer>
  )
}
