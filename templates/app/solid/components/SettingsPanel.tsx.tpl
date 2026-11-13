import { A } from '@solidjs/router'
import { useTranslate } from '@molecule/app-solid'
import { Separator } from '@molecule/app-ui-solid'
import { getClassMap } from '@molecule/app-ui'
import { AccountSection } from './settings/AccountSection.js'
import { AuthSection } from './settings/AuthSection.js'
import { BillingSection } from './settings/BillingSection.js'
import { DevicesSection } from './settings/DevicesSection.js'
import { LogOutDeleteSection } from './settings/LogOutDeleteSection.js'
import { NotificationsSection } from './settings/NotificationsSection.js'
import { ThisDeviceSection } from './settings/ThisDeviceSection.js'
import { Footer } from './Footer.js'

/**
 * The settings drawer: the app's sections over the shared order — account,
 * auth, notifications, billing, devices, this device, then the destructive
 * actions and the footer.
 *
 * The full profile page (`/settings`) edits the whole profile as one native
 * form, while this drawer's sections update one field at a time. The
 * "Edit your profile" link closes the drawer first so navigation is not
 * hidden underneath it.
 */
export function SettingsPanel(props: { onClose: () => void }) {
  const cm = getClassMap()
  const t = useTranslate()

  return (
    <div class={cm.cn(cm.sp('p', 6), cm.stack(6))}>
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
      <LogOutDeleteSection onClose={props.onClose} />
      <Footer />
    </div>
  )
}
