<script lang="ts">
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'

  import type { UserProfile } from '@molecule/app-auth'
  import { getClient } from '@molecule/app-http'
  import { createAuthStores, createI18nStores } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Alert, Button, Input, Modal } from '@molecule/app-ui-svelte'

  import { getSettingsPanelContext } from '../../lib/settings-panel-context.js'

  // Bottom actions section — Log out + Delete account.
  //
  // Owns the delete-account modal internally (the trigger lives in the same
  // section so the modal lives here too). Reads `onClose` from the
  // `<SettingsContainer>` context to dismiss the panel after either action
  // and navigates to `/login`.

  const cm = getClassMap()
  const { t } = createI18nStores()
  const { user, logout } = createAuthStores<UserProfile>()
  const http = getClient()
  const { onClose } = getSettingsPanelContext()

  let showModal = $state(false)
  let password = $state('')
  let loading = $state(false)
  let error = $state('')

  async function handleLogout(): Promise<void> {
    await logout()
    onClose()
    goto(resolve('/login'))
  }

  async function handleDelete(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    loading = true
    error = ''
    try {
      await http.delete(`/api/users/${$user?.id}`, { data: { password } })
      await logout()
      onClose()
      goto(resolve('/login'))
    } catch (err) {
      error = err instanceof Error ? err.message : $t('settings.failedToDeleteAccount')
    } finally {
      loading = false
    }
  }
</script>

<section class={cm.stack(3)}>
  <Button color="error" fullWidth onClick={handleLogout} data-mol-id="user-menu-logout">
    {$t('settings.logOut', undefined, { defaultValue: 'Sign out' })}
  </Button>
  <Button
    variant="ghost"
    fullWidth
    onClick={() => (showModal = true)}
    data-mol-id="user-menu-delete-account"
  >
    {$t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' })}
  </Button>
</section>

<Modal
  open={showModal}
  onClose={() => (showModal = false)}
  title={$t('settings.deleteAccountModal.title')}
>
  <p class={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mb', 4))}>
    {$t('settings.deleteAccountModal.warning')}
  </p>
  {#if error}
    <Alert status="error" className={cm.sp('mb', 4)}>
      {error}
    </Alert>
  {/if}
  <form onsubmit={handleDelete} class={cm.stack(4)}>
    <div>
      <label for="delete-pw" class={cm.formLabel}>
        {$t('settings.deleteAccountModal.password')}
      </label>
      <Input
        id="delete-pw"
        type="password"
        value={password}
        onChange={(event) => (password = (event.target as HTMLInputElement).value)}
        required
      />
    </div>
    <Button type="submit" color="error" fullWidth {loading}>
      {loading ? $t('settings.deleteAccountModal.deleting') : $t('settings.deleteAccount')}
    </Button>
  </form>
</Modal>
