import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
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
import { Flex, Icon } from '@molecule/app-ui-react'
import { Separator } from '@molecule/app-ui-react'

import { Footer } from './Footer.js'

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <SettingsContainer onClose={onClose}>
      <section>
        <Link
          to="/account"
          onClick={onClose}
          data-testid="settings-open-account"
          className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}
        >
          <Flex align="center" justify="between">
            <span className={cm.fontWeight('semibold')}>
              {t('settings.openAccount', undefined, { defaultValue: 'Open full account' })}
            </span>
            <Icon name="chevron-right" size={16} className={cm.textSubtle} />
          </Flex>
        </Link>
      </section>
      <AccountSection />
      <AuthSection />
      <NotificationsSection />
      <BillingSection upgradeTo="/pricing" />
      <DevicesSection />
      <ThisDeviceSection />
      <Separator />
      <LogOutDeleteSection />
      <Footer />
    </SettingsContainer>
  )
}
