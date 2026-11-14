<script lang="ts">
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { page } from '$app/stores'
  import { APP_NAME, LOGO_SIZE } from '$lib/branding.js'

  import {
    createI18nStores,
    createLoginStore,
    createPasswordResetStores,
  } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Flex } from '@molecule/app-ui-svelte'

  import FloatingInput from '../../components/FloatingInput.svelte'
  import Footer from '../../components/Footer.svelte'
  import Icon from '../../components/Icon.svelte'
  import ThemeToggle from '../../components/ThemeToggle.svelte'
  import { LOGO_SRC } from '../../lib/logo.js'

  const cm = getClassMap()
  const { t } = createI18nStores()
  const { confirm } = createPasswordResetStores()
  const loginStore = createLoginStore()

  let token = $state($page.url.searchParams.get('token') || '')
  let email = $state($page.url.searchParams.get('email') || '')
  let password = $state('')
  let twoFactorToken = $state('')

  let isLoggingIn = $derived($confirm.status === 'pending')

  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    try {
      await confirm.call({ token, password })
      await loginStore.call({ email, password })
      goto(resolve('/'), { replaceState: true })
    } catch (_error) {
      // Error tracked in store state
    }
  }
</script>

<div class={cm.cn(cm.page, cm.flex({ direction: 'col' }))}>
  <header class={cm.cn(cm.headerBar, cm.headerFixed)}>
    <div class={cm.authHeaderInner}>
      <Flex align="center" justify="between" className={cm.h('full')}>
        <Flex align="center" gap="xs">
          <img src={LOGO_SRC} width={LOGO_SIZE} height={LOGO_SIZE} alt="" class={cm.logoIcon} />
          <span class={cm.logoText}>{APP_NAME}</span>
        </Flex>
        <ThemeToggle />
      </Flex>
    </div>
  </header>
  <main class={cm.authPageBody}>
    <!-- Screen-reader-only page heading — every page needs exactly one h1
        (axe page-has-heading-one); the visual design has no heading. -->
    <h1 class={cm.srOnly}>{$t('auth.resetPassword.submit')}</h1>
    <div class={cm.authFormWrapper}>
      <form onsubmit={handleSubmit}>
        <div class={cm.authField}>
          <FloatingInput
            type="email"
            bind:value={email}
            autocomplete="email"
            required
            placeholder={$t('auth.resetPassword.email')}
          />
        </div>
        <div class={cm.authField}>
          <FloatingInput
            type="password"
            bind:value={token}
            required
            placeholder={$t('auth.resetPassword.token')}
          />
        </div>
        <div class={cm.authField}>
          <FloatingInput
            type="password"
            bind:value={password}
            autocomplete="new-password"
            required
            placeholder={$t('auth.resetPassword.newPassword')}
          />
        </div>
        <div class={cm.authField}>
          <FloatingInput
            type="number"
            bind:value={twoFactorToken}
            autocomplete="one-time-code"
            placeholder={$t('auth.resetPassword.twoFactor')}
          />
        </div>
        <div class={cm.authButtonRow}>
          <Button
            type="button"
            size="lg"
            color="secondary"
            className={cm.authBackButton}
            onClick={() => goto(resolve('/login'))}
            aria-label={$t('common.goBack')}
          >
            <Icon name="arrow-left" size={25} />
          </Button>
          <Button
            type="submit"
            size="lg"
            color="success"
            className={cm.authSubmitButton}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? $t('auth.resetPassword.loggingIn') : $t('auth.resetPassword.submit')}
          </Button>
        </div>
      </form>
      {#if $confirm.error}
        <div class={cm.authFormError} role="alert">
          {$confirm.error.message}
        </div>
      {/if}
    </div>
  </main>
  <Footer />
</div>
