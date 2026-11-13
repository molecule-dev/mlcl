<script lang="ts">
  import type { UserProfile } from '@molecule/app-auth'
  import { getClient } from '@molecule/app-http'
  import { createAuthStores, createChangePasswordStore } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { createAppI18nStores } from '../../lib/i18n.js'
  import Alert from '../Alert.svelte'
  import Button from '../Button.svelte'
  import Flex from '../Flex.svelte'
  import Input from '../Input.svelte'
  import Modal from '../Modal.svelte'

  /** The enrollment payload returned by the setup action (`action: 'setup'`). */
  interface TwoFactorSetup {
    QRImageUrl?: string
    keyUrl?: string
    secret?: string
  }

  // Authentication section — change password (modal) + two-factor (TOTP) setup.
  //
  // Two-factor uses the real enrollment flow against the user resource's
  // `POST /users/:id/verify-two-factor` endpoint:
  // - Enable → `{action:'setup'}` returns a QR code + secret to scan into an
  //   authenticator app → user enters the 6-digit code → `{action:'enable', token}`.
  // - Disable → user enters a current code → `{action:'disable', token}`.
  // The current status is read from `/users/me`. Auto-hides for OAuth-only
  // users (`user.oauthServer` truthy) since password / 2FA wouldn't apply. If
  // the app's API has no two-factor provider bonded, setup fails gracefully
  // with an inline message.

  const cm = getClassMap()
  const { t } = createAppI18nStores()
  const { user } = createAuthStores<UserProfile>()
  const http = getClient()
  const pwStore = createChangePasswordStore()

  let showModal = $state(false)
  let currentPassword = $state('')
  let newPassword = $state('')

  let userId = $derived($user?.id)

  let twoFactorEnabled = $state(false)
  let tfModal = $state<null | 'enable' | 'disable'>(null)
  let tfSetup = $state<TwoFactorSetup | null>(null)
  let tfToken = $state('')
  let tfLoading = $state(false)
  let tfError = $state('')

  // OAuth-only users skip this section entirely.
  let isOAuthUser = $derived($user !== null && 'oauthServer' in $user && Boolean($user.oauthServer))

  // Read the persisted 2FA status from /users/me on mount.
  $effect(() => {
    let cancelled = false
    http
      .get<{ props?: { twoFactorEnabled?: boolean }; twoFactorEnabled?: boolean }>('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const body = res.data ?? res
        const account = (body as { props?: { twoFactorEnabled?: boolean } }).props ?? body
        twoFactorEnabled = Boolean(account?.twoFactorEnabled)
      })
      .catch((_error) => {
        // Status read is best-effort; defaults to disabled.
      })
    return () => {
      cancelled = true
    }
  })

  function closeTf(): void {
    tfModal = null
    tfSetup = null
    tfToken = ''
    tfError = ''
  }

  async function startEnable(): Promise<void> {
    tfError = ''
    tfLoading = true
    tfModal = 'enable'
    try {
      const res = await http.post<TwoFactorSetup>(`/api/users/${userId}/verify-two-factor`, {
        action: 'setup',
      })
      tfSetup = res.data ?? res
    } catch (err) {
      tfError =
        err instanceof Error
          ? err.message
          : $t('settings.twoFactorUnavailable', undefined, {
              defaultValue: 'Two-factor authentication is not available for this app.',
            })
    } finally {
      tfLoading = false
    }
  }

  async function submitTf(action: 'enable' | 'disable'): Promise<void> {
    tfError = ''
    tfLoading = true
    try {
      await http.post(`/api/users/${userId}/verify-two-factor`, { action, token: tfToken })
      twoFactorEnabled = action === 'enable'
      closeTf()
    } catch (err) {
      tfError =
        err instanceof Error
          ? err.message
          : $t('settings.twoFactorInvalidCode', undefined, { defaultValue: 'Invalid code' })
    } finally {
      tfLoading = false
    }
  }

  async function handleChangePassword(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    try {
      await pwStore.call(currentPassword, newPassword)
      showModal = false
      currentPassword = ''
      newPassword = ''
      pwStore.reset()
    } catch (_error) {
      // Error tracked in store state — the change-password store surfaces it via `$pwStore.error`.
    }
  }
</script>

{#if !isOAuthUser}
  <section>
    <h3 class={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>{$t('settings.authentication')}</h3>
    <div class={cm.stack(3)}>
      <Button variant="outline" size="sm" onclick={() => (showModal = true)}>
        {$t('settings.changePassword')}
      </Button>
      <Flex align="center" justify="between">
        <span class={cm.textSize('sm')}>
          {$t('settings.twoFactor')}
          {#if twoFactorEnabled}
            <span class={cm.cn(cm.textSize('xs'), cm.textSubtle, cm.sp('ml', 2))}>
              {$t('settings.twoFactorOn', undefined, { defaultValue: 'On' })}
            </span>
          {/if}
        </span>
        {#if twoFactorEnabled}
          <Button
            variant="outline"
            size="sm"
            onclick={() => {
              tfError = ''
              tfToken = ''
              tfModal = 'disable'
            }}
            data-mol-id="two-factor-disable"
          >
            {$t('settings.twoFactorDisable', undefined, { defaultValue: 'Disable' })}
          </Button>
        {:else}
          <Button variant="outline" size="sm" onclick={startEnable} data-mol-id="two-factor-enable">
            {$t('settings.twoFactorEnable', undefined, { defaultValue: 'Enable' })}
          </Button>
        {/if}
      </Flex>
    </div>
  </section>

  <Modal
    open={showModal}
    onClose={() => {
      showModal = false
      pwStore.reset()
    }}
    title={$t('settings.changePasswordModal.title')}
  >
    {#if $pwStore.error}
      <Alert status="error" class={cm.sp('mb', 4)}>
        {$pwStore.error.message || $t('settings.changePasswordModal.error')}
      </Alert>
    {/if}
    <form onsubmit={handleChangePassword} class={cm.stack(4)}>
      <div>
        <label for="current-pw" class={cm.formLabel}>
          {$t('settings.changePasswordModal.currentPassword')}
        </label>
        <Input
          id="current-pw"
          type="password"
          bind:value={currentPassword}
          autocomplete="current-password"
          required
        />
      </div>
      <div>
        <label for="new-pw" class={cm.formLabel}>
          {$t('settings.changePasswordModal.newPassword')}
        </label>
        <Input
          id="new-pw"
          type="password"
          bind:value={newPassword}
          autocomplete="new-password"
          required
        />
      </div>
      <Button type="submit" fullWidth loading={$pwStore.status === 'pending'}>
        {$pwStore.status === 'pending'
          ? $t('settings.changePasswordModal.changing')
          : $t('settings.changePassword')}
      </Button>
    </form>
  </Modal>

  <Modal
    open={tfModal !== null}
    onClose={closeTf}
    title={tfModal === 'disable'
      ? $t('settings.twoFactorDisableTitle', undefined, {
          defaultValue: 'Disable two-factor authentication',
        })
      : $t('settings.twoFactorEnableTitle', undefined, {
          defaultValue: 'Enable two-factor authentication',
        })}
  >
    {#if tfError}
      <Alert status="error" class={cm.sp('mb', 4)}>
        {tfError}
      </Alert>
    {/if}
    {#if tfModal === 'enable' && tfSetup?.QRImageUrl}
      <div class={cm.cn(cm.stack(3), cm.sp('mb', 4))}>
        <p class={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {$t('settings.twoFactorScan', undefined, {
            defaultValue:
              'Scan this QR code with your authenticator app, then enter the 6-digit code.',
          })}
        </p>
        <img
          src={tfSetup.QRImageUrl}
          alt={$t('settings.twoFactorQrAlt', undefined, { defaultValue: 'Two-factor QR code' })}
          class={cm.cn(cm.mxAuto, cm.maxW('xs'))}
        />
        {#if tfSetup.secret}
          <p class={cm.cn(cm.textSize('xs'), cm.textSubtle, cm.settingsPanelTwoFactorSecret)}>
            {tfSetup.secret}
          </p>
        {/if}
      </div>
    {/if}
    {#if tfModal === 'disable' || tfSetup}
      <form
        onsubmit={(event) => {
          event.preventDefault()
          void submitTf(tfModal === 'disable' ? 'disable' : 'enable')
        }}
        class={cm.stack(4)}
      >
        <div>
          <label for="tf-token" class={cm.formLabel}>
            {$t('settings.twoFactorCode', undefined, { defaultValue: 'Authentication code' })}
          </label>
          <Input
            id="tf-token"
            type="text"
            bind:value={tfToken}
            autocomplete="one-time-code"
            required
          />
        </div>
        <Button
          type="submit"
          color={tfModal === 'disable' ? 'error' : undefined}
          fullWidth
          loading={tfLoading}
        >
          {tfModal === 'disable'
            ? $t('settings.twoFactorDisable', undefined, { defaultValue: 'Disable' })
            : $t('settings.twoFactorVerify', undefined, { defaultValue: 'Verify & enable' })}
        </Button>
      </form>
    {/if}
  </Modal>
{/if}
