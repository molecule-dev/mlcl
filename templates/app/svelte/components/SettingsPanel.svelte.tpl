<script lang="ts">
  import { goto } from '$app/navigation'
  import {
    createAuthStores,
    createChangePasswordStore,
    createI18nStores,
    createPushStores,
    createDeviceStores,
    createVersionStores,
  } from '@molecule/app-svelte'
  import { getClient } from '@molecule/app-http'
  import { getClassMap } from '@molecule/app-ui'
  import Icon from './Icon.svelte'
  import Footer from './Footer.svelte'
  import {
    getButtonClasses,
    getInputClasses,
    getAlertClasses,
    getFlexClasses,
    getSwitchClasses,
    getSeparatorClasses,
    getModalOverlayClass,
    getModalWrapperClass,
    getModalContentClasses,
    getModalHeaderClass,
    getModalTitleClass,
    modalBodyClass,
    cn,
  } from '@molecule/app-ui-svelte'

  interface Device {
    id: string
    name: string
    platform: string
    lastSeen?: string
  }

  let { onClose }: { onClose: () => void } = $props()

  const cm = getClassMap()
  const http = getClient()
  const { t } = createI18nStores()
  const { user, logout } = createAuthStores()
  const { state: versionState } = createVersionStores()
  const { permission, requestPermission, register: registerPush, unregister: unregisterPush } = createPushStores()
  const { deviceInfo } = createDeviceStores()
  const pwStore = createChangePasswordStore()

  // Email editing
  let email = $state($user?.email || '')
  let emailSaving = $state(false)
  let emailError = $state('')

  // Password change
  let showPasswordModal = $state(false)
  let currentPassword = $state('')
  let newPassword = $state('')

  // 2FA
  let twoFactorEnabled = $state(false)
  let twoFactorLoading = $state(false)

  // Devices
  let devices = $state<Device[]>([])
  let devicesLoading = $state(true)

  // Plan
  let plan = $state('Free')

  // Delete account
  let showDeleteModal = $state(false)
  let deletePassword = $state('')
  let deleteLoading = $state(false)
  let deleteError = $state('')

  // Push notifications
  let pushEnabled = $state($permission === 'granted')

  const loadDevices = async () => {
    try {
      const response = await http.get<{ data: Device[] }>('/devices')
      devices = response.data.data || []
    } catch {
      // Devices may not be available
    } finally {
      devicesLoading = false
    }
  }

  $effect(() => {
    loadDevices()
  })

  const handleEmailBlur = async () => {
    if (email === $user?.email || !email) return
    emailSaving = true
    emailError = ''
    try {
      await http.patch(`/users/${$user?.id}`, { data: { email } })
    } catch (err) {
      emailError = err instanceof Error ? err.message : $t('settings.failedToUpdateEmail')
      email = $user?.email || ''
    } finally {
      emailSaving = false
    }
  }

  const handlePasswordChange = async (e: SubmitEvent) => {
    e.preventDefault()
    try {
      await pwStore.call(currentPassword, newPassword)
      showPasswordModal = false
      currentPassword = ''
      newPassword = ''
    } catch {
      // Error tracked in store state
    }
  }

  const handleToggle2FA = async (enabled: boolean) => {
    twoFactorLoading = true
    try {
      await http.patch(`/users/${$user?.id}`, { data: { twoFactorEnabled: enabled } })
      twoFactorEnabled = enabled
    } catch {
      // Revert on failure
    } finally {
      twoFactorLoading = false
    }
  }

  const handleTogglePush = async (enabled: boolean) => {
    try {
      if (enabled) {
        await requestPermission()
        await registerPush()
        pushEnabled = true
      } else {
        await unregisterPush()
        pushEnabled = false
      }
    } catch {
      // Permission may be denied
    }
  }

  const handleLogout = async () => {
    await logout()
    onClose()
    goto('/login')
  }

  const handleDeleteAccount = async (e: SubmitEvent) => {
    e.preventDefault()
    deleteLoading = true
    deleteError = ''
    try {
      await http.delete(`/users/${$user?.id}`, { data: { password: deletePassword } })
      await logout()
      onClose()
      goto('/login')
    } catch (err) {
      deleteError = err instanceof Error ? err.message : $t('settings.failedToDeleteAccount')
    } finally {
      deleteLoading = false
    }
  }
</script>

<div class={cm.cn(cm.sp('p', 6), cm.stack(6))}>
  <!-- Account -->
  <section>
    <div class={cm.cn(getFlexClasses({ align: 'center', gap: 'sm' }), cm.sp('mb', 3))}>
      <h3 class={cm.sectionHeading}>
        {$t('settings.account')}
      </h3>
      {#if emailSaving}
        <span class={cm.cn(cm.textSize('xs'), cm.textSubtle)}>{$t('settings.saving')}</span>
      {/if}
    </div>
    <div>
      <label for="settings-email" class={cm.formLabelSmall}>{$t('settings.email')}</label>
      <input
        id="settings-email"
        type="email"
        bind:value={email}
        onblur={handleEmailBlur}
        class={getInputClasses({ size: 'sm' })}
      />
      {#if emailError}
        <p class={cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))}>{emailError}</p>
      {/if}
    </div>
  </section>

  <!-- Authentication — hidden for OAuth users -->
  {#if !($user as Record<string, unknown>)?.oauthServer}
    <section>
      <h3 class={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
        {$t('settings.authentication')}
      </h3>
      <div class={cm.stack(3)}>
        <button
          type="button"
          class={getButtonClasses({ variant: 'outline', size: 'sm' })}
          onclick={() => showPasswordModal = true}
        >
          {$t('settings.changePassword')}
        </button>
        <div class={cn(getFlexClasses({ align: 'center', justify: 'between' }))}>
          <span class={cm.textSize('sm')}>{$t('settings.twoFactor')}</span>
          <button
            type="button"
            role="switch"
            aria-checked={twoFactorEnabled}
            disabled={twoFactorLoading}
            class={getSwitchClasses({ checked: twoFactorEnabled, size: 'sm' })}
            onclick={() => handleToggle2FA(!twoFactorEnabled)}
          >
            <span style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0;">{$t('settings.toggleTwoFactor')}</span>
          </button>
        </div>
      </div>
    </section>
  {/if}

  <!-- Notifications -->
  <section>
    <h3 class={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
      {$t('settings.notifications')}
    </h3>
    <div class={cn(getFlexClasses({ align: 'center', justify: 'between' }))}>
      <span class={cm.textSize('sm')}>{$t('settings.pushNotifications')}</span>
      <button
        type="button"
        role="switch"
        aria-checked={pushEnabled}
        class={getSwitchClasses({ checked: pushEnabled, size: 'sm' })}
        onclick={() => handleTogglePush(!pushEnabled)}
      >
        <span style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0;">{$t('settings.togglePushNotifications')}</span>
      </button>
    </div>
  </section>

  <!-- Billing -->
  <section>
    <h3 class={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
      {$t('settings.billing')}
    </h3>
    <div class={cn(getFlexClasses({ align: 'center', justify: 'between' }))}>
      <span class={cm.textSize('sm')}>{$t('settings.plan')}: <strong>{plan}</strong></span>
      <button type="button" class={getButtonClasses({ variant: 'outline', size: 'sm' })}>
        {$t('settings.upgrade')}
      </button>
    </div>
  </section>

  <!-- Devices -->
  <section>
    <div class={cm.cn(getFlexClasses({ align: 'center', gap: 'sm' }), cm.sp('mb', 3))}>
      <h3 class={cm.sectionHeading}>
        {$t('settings.devices')}
      </h3>
      {#if devicesLoading}
        <span class={cm.cn(cm.textSize('xs'), cm.textSubtle)}>{$t('common.loading')}</span>
      {/if}
    </div>
    {#if devices.length > 0}
      <ul class={cm.stack(2)}>
        {#each devices as device}
          <li class={cm.cn(getFlexClasses({ align: 'center', justify: 'between' }), cm.textSize('sm'), cm.sp('py', 1))}>
            <span>{device.name || device.platform}</span>
            <Icon name="chevron-right" size={16} class={cm.textSubtle} />
          </li>
        {/each}
      </ul>
    {:else if !devicesLoading}
      <p class={cm.cn(cm.textSize('sm'), cm.textMuted)}>{$t('settings.noDevices')}</p>
    {/if}
  </section>

  <!-- This Device -->
  <section>
    <h3 class={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
      {$t('settings.thisDevice')}
    </h3>
    <dl class={cm.cn(cm.stack(1), cm.textSize('sm'))}>
      <div class={getFlexClasses({ justify: 'between' })}>
        <dt class={cm.textMuted}>{$t('settings.platform')}</dt>
        <dd>{$deviceInfo.os.name || $t('settings.unknown')}</dd>
      </div>
      <div class={getFlexClasses({ justify: 'between' })}>
        <dt class={cm.textMuted}>{$t('settings.browser')}</dt>
        <dd>{$deviceInfo.browser.name || $t('settings.unknown')}</dd>
      </div>
      <div class={getFlexClasses({ justify: 'between' })}>
        <dt class={cm.textMuted}>{$t('settings.network')}</dt>
        <dd>{typeof navigator !== 'undefined' && navigator.onLine ? $t('settings.online') : $t('settings.offline')}</dd>
      </div>
    </dl>
  </section>

  <div class={getSeparatorClasses({})}></div>

  <!-- Actions -->
  <section class={cm.stack(3)}>
    <button
      type="button"
      class={getButtonClasses({ color: 'error', fullWidth: true })}
      onclick={handleLogout}
    >
      {$t('settings.logOut')}
    </button>
    <button
      type="button"
      class={getButtonClasses({ variant: 'ghost', fullWidth: true })}
      onclick={() => showDeleteModal = true}
    >
      {$t('settings.deleteAccount')}
    </button>
  </section>

  <Footer />
</div>

<!-- Password Change Modal -->
{#if showPasswordModal}
  <button
    type="button"
    class={getModalOverlayClass()}
    onclick={() => { showPasswordModal = false }}
    aria-label={$t('common.close')}
  />
  <div class={getModalWrapperClass()}>
    <div role="dialog" aria-modal="true" class={getModalContentClasses({ size: 'md' })}>
      <div class={getModalHeaderClass()}>
        <h2 class={getModalTitleClass()}>{$t('settings.changePasswordModal.title')}</h2>
      </div>
      <div class={modalBodyClass}>
      {#if $pwStore.error}
        <div class={cm.cn(getAlertClasses({ status: 'error' }), cm.sp('mb', 4))}>
          {$pwStore.error.message || $t('settings.changePasswordModal.error')}
        </div>
      {/if}
      <form onsubmit={handlePasswordChange} class={cm.stack(4)}>
        <div>
          <label for="current-pw" class={cm.formLabel}>{$t('settings.changePasswordModal.currentPassword')}</label>
          <input
            id="current-pw"
            type="password"
            bind:value={currentPassword}
            autocomplete="current-password"
            required
            class={getInputClasses({})}
          />
        </div>
        <div>
          <label for="new-pw" class={cm.formLabel}>{$t('settings.changePasswordModal.newPassword')}</label>
          <input
            id="new-pw"
            type="password"
            bind:value={newPassword}
            autocomplete="new-password"
            required
            class={getInputClasses({})}
          />
        </div>
        <button
          type="submit"
          disabled={$pwStore.status === 'pending'}
          class={getButtonClasses({ fullWidth: true })}
        >
          {$pwStore.status === 'pending' ? $t('settings.changePasswordModal.changing') : $t('settings.changePasswordModal.submit')}
        </button>
      </form>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Account Modal -->
{#if showDeleteModal}
  <button
    type="button"
    class={getModalOverlayClass()}
    onclick={() => showDeleteModal = false}
    aria-label={$t('common.close')}
  />
  <div class={getModalWrapperClass()}>
    <div role="dialog" aria-modal="true" class={getModalContentClasses({ size: 'md' })}>
      <div class={getModalHeaderClass()}>
        <h2 class={getModalTitleClass()}>{$t('settings.deleteAccountModal.title')}</h2>
      </div>
      <div class={modalBodyClass}>
      <p class={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mb', 4))}>
        {$t('settings.deleteAccountModal.warning')}
      </p>
      {#if deleteError}
        <div class={cm.cn(getAlertClasses({ status: 'error' }), cm.sp('mb', 4))}>
          {deleteError}
        </div>
      {/if}
      <form onsubmit={handleDeleteAccount} class={cm.stack(4)}>
        <div>
          <label for="delete-pw" class={cm.formLabel}>{$t('settings.deleteAccountModal.password')}</label>
          <input
            id="delete-pw"
            type="password"
            bind:value={deletePassword}
            required
            class={getInputClasses({})}
          />
        </div>
        <button
          type="submit"
          disabled={deleteLoading}
          class={getButtonClasses({ color: 'error', fullWidth: true })}
        >
          {deleteLoading ? $t('settings.deleteAccountModal.deleting') : $t('settings.deleteAccountModal.submit')}
        </button>
      </form>
      </div>
    </div>
  </div>
{/if}
