<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { createI18nStores, createPasswordResetStores, createLoginStore, createThemeStores } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import Icon from '../../components/Icon.svelte'
  import Footer from '../../components/Footer.svelte'
  import FloatingInput from '../../components/FloatingInput.svelte'
  import {
    getButtonClasses,
    getFlexClasses,
    cn,
  } from '@molecule/app-ui-svelte'
  import { APP_NAME, LOGO_SIZE } from '$lib/branding.js'

  const cm = getClassMap()
  const { t } = createI18nStores()
  const { confirm } = createPasswordResetStores()
  const loginStore = createLoginStore()
  const { mode, toggleTheme } = createThemeStores()

  let token = $state($page.url.searchParams.get('token') || '')
  let email = $state($page.url.searchParams.get('email') || '')
  let password = $state('')
  let twoFactorToken = $state('')

  const isLoggingIn = $derived($confirm.status === 'pending')

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    try {
      await confirm.call({ token, password })
      await loginStore.call({ email, password })
      goto('/')
    } catch {
      // Error tracked in store state
    }
  }
</script>

<div class={cm.cn(cm.page, cm.flex({ direction: 'col' }))}>
  <header class={cm.headerBar}>
    <div class={cm.authHeaderInner}>
      <div class={cm.cn(getFlexClasses({ align: 'center', justify: 'between' }), cm.h('full'))}>
        <div class={getFlexClasses({ align: 'center', gap: 'xs' })}>
          <img src="/logo.svg" width={LOGO_SIZE} height={LOGO_SIZE} alt="" class={cm.logoIcon} />
          <span class={cm.logoText}>{APP_NAME}</span>
        </div>
        <button
          type="button"
          class={cm.themeToggleButton}
          onclick={toggleTheme}
          aria-label={$t('theme.toggle')}
        >
          {#if $mode === 'dark'}
            <Icon name="moon" size={20} />
          {:else}
            <Icon name="sun" size={20} />
          {/if}
        </button>
      </div>
    </div>
  </header>
  <div class={cm.authPageBody}>
    <div class={cm.authFormWrapper}>
      <form onsubmit={handleSubmit}>
        <div class={cm.authField}>
          <FloatingInput
            type="email"
            bind:value={email}
            autocomplete="email"
            autofocus={!email}
            required
            placeholder={$t('auth.resetPassword.email')}
          />
        </div>
        <div class={cm.authField}>
          <FloatingInput
            type="password"
            bind:value={token}
            autofocus={!!email && !token}
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
          <button
            type="button"
            class={cn(getButtonClasses({ size: 'lg', color: 'secondary' }), cm.authBackButton)}
            onclick={() => goto('/login')}
            aria-label={$t('common.goBack')}
          >
            <Icon name="arrow-left" size={25} />
          </button>
          <button
            type="submit"
            disabled={isLoggingIn}
            class={cn(getButtonClasses({ size: 'lg', color: 'success' }), cm.authSubmitButton)}
          >
            {isLoggingIn ? $t('auth.resetPassword.loggingIn') : $t('auth.resetPassword.submit')}
          </button>
        </div>
      </form>
      {#if $confirm.error}
        <div class={cm.authFormError}>
          {$confirm.error.message}
        </div>
      {/if}
    </div>
  </div>
  <Footer />
</div>
