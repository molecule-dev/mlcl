<script lang="ts">
  import { resolve } from '$app/paths'

  import { createI18nStores } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Separator } from '@molecule/app-ui-svelte'

  import { getPanelClose } from '../lib/panel-close.js'
  import Footer from './Footer.svelte'
  import AccountSection from './settings/AccountSection.svelte'
  import AuthSection from './settings/AuthSection.svelte'
  import BillingSection from './settings/BillingSection.svelte'
  import DevicesSection from './settings/DevicesSection.svelte'
  import LogOutDeleteSection from './settings/LogOutDeleteSection.svelte'
  import NotificationsSection from './settings/NotificationsSection.svelte'
  import SettingsContainer from './settings/SettingsContainer.svelte'
  import ThisDeviceSection from './settings/ThisDeviceSection.svelte'

  let {
    onClose = undefined,
  }: {
    /** Dismisses the panel; defaults to the drawer-close context from UserMenu. */
    onClose?: () => void
  } = $props()

  const cm = getClassMap()
  const { t } = createI18nStores()

  // Rendered inside UserMenu's drawer the close callback arrives via context
  // (no prop-threading from the trigger); standalone mounts pass it explicitly.
  // The context is read HERE, during component initialisation — `getContext`
  // throws anywhere else (an event handler runs after init) — and the closure
  // then calls the captured callback.
  const panelClose = getPanelClose()
  function close(): void {
    if (onClose) {
      onClose()
      return
    }
    panelClose()
  }
</script>

<SettingsContainer onClose={close}>
  <!-- The full profile page: the drawer's sections update one field at a time, while
      `/settings` edits the whole profile as one native form (and is where the app's
      own profile fields belong). Close the drawer first so navigation is not hidden. -->
  <a
    href={resolve('/settings')}
    onclick={close}
    class={cm.cn(cm.button({ variant: 'outline' }), cm.sp('mb', 3))}
    data-mol-id="settings-page-link"
  >
    {$t('settings.openProfilePage', undefined, { defaultValue: 'Edit your profile' })}
  </a>
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
