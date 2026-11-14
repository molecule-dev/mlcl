<script lang="ts">
  import {
    AccountSection,
    AuthSection,
    BillingSection,
    DevicesSection,
    LogOutDeleteSection,
    NotificationsSection,
    SettingsContainer,
    ThisDeviceSection,
  } from '@molecule/app-settings-panel-svelte'
  import { Link, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Separator, usePanelClose } from '@molecule/app-ui-svelte'

  import Footer from './Footer.svelte'

  let { onClose = undefined }: { onClose?: () => void } = $props()

  const cm = getClassMap()
  const { t } = useTranslation()

  // Rendered inside UserMenu's drawer the close callback arrives via context
  // (no prop-threading from the trigger); standalone mounts pass it explicitly.
  // The context is read HERE, during component initialisation — `getContext`
  // throws anywhere else (an event handler runs after init) — and the closure
  // then calls the captured callback.
  const panelClose = usePanelClose()
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
  <Link
    to="/settings"
    onclick={close}
    class={cm.cn(cm.button({ variant: 'outline' }), cm.sp('mb', 3))}
    data-mol-id="settings-page-link"
  >
    {t('settings.openProfilePage', undefined, { defaultValue: 'Edit your profile' })}
  </Link>
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
