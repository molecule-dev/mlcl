<script lang="ts">
  import { goto } from '$app/navigation'
  import { createI18nStores, createLoginStore, createOAuthHelpers, createThemeStores } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { oauthConfig } from '$lib/config.js'
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
  const loginStore = createLoginStore()
  const { providers, redirect: oauthRedirect } = createOAuthHelpers(oauthConfig)
  const { mode, toggleTheme } = createThemeStores()

  let email = $state('')
  let password = $state('')
  let twoFactorToken = $state('')

  const isLoggingIn = $derived($loginStore.status === 'pending')

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    try {
      await loginStore.call({ email, password })
      goto('/')
    } catch {
      // Error tracked in store state
    }
  }

  const providerLabels: Record<string, string> = $derived({
    github: $t('oauth.github'),
    google: $t('oauth.google'),
    gitlab: $t('oauth.gitlab'),
    twitter: $t('oauth.twitter'),
  })
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
            autofocus
            required
            placeholder={$t('auth.login.email')}
          />
        </div>
        <div class={cm.authField}>
          <FloatingInput
            type="password"
            bind:value={password}
            autocomplete="current-password"
            required
            placeholder={$t('auth.login.password')}
          />
        </div>
        <div class={cm.authField}>
          <FloatingInput
            type="number"
            bind:value={twoFactorToken}
            autocomplete="one-time-code"
            placeholder={$t('auth.login.twoFactor')}
          />
        </div>
        <div class={cm.authButtonRow}>
          <button
            type="button"
            class={cn(getButtonClasses({ size: 'lg' }), isLoggingIn ? cm.authHidden : cm.authLoginSignup)}
            disabled={isLoggingIn}
            onclick={() => goto('/signup')}
          >
            {$t('auth.login.signUp')}
          </button>
          <button
            type="submit"
            disabled={isLoggingIn}
            class={cn(getButtonClasses({ size: 'lg', color: 'success' }), isLoggingIn ? cm.authLoginSubmitFull : cm.authLoginSubmit)}
          >
            {isLoggingIn ? $t('auth.login.loggingIn') : $t('auth.login.logIn')}
          </button>
        </div>
      </form>
      {#if $loginStore.error}
        <div class={cm.authFormError}>
          {$loginStore.error.message}
        </div>
      {/if}
      <div class={cm.authAfterSubmit}>
        <button
          type="button"
          onclick={() => goto('/forgot-password')}
          class={cm.forgotPasswordLink}
        >
          {$t('auth.login.forgotPassword')}
        </button>
      </div>

      {#if $providers.length > 0}
        <div class={cm.oauthDivider}>
          <div class={cm.oauthDividerLine}></div>
          <span class={cm.oauthDividerText}>
            {$t('oauth.orContinueWith')}
          </span>
        </div>
        <div class={cm.oauthButtonGroup}>
          {#each $providers as provider}
            <button
              type="button"
              class={cm.oauthButton}
              onclick={() => oauthRedirect(provider)}
              aria-label={$t('oauth.continueWith', { provider: providerLabels[provider] || provider })}
            >
              <span class={cm.oauthButtonIcon}>
                {#if provider === 'github'}
                  <Icon name="github" size={30} />
                {:else if provider === 'google'}
                  <Icon name="google" size={30} />
                {:else if provider === 'gitlab'}
                  <Icon name="gitlab" size={30} />
                {:else if provider === 'twitter'}
                  <Icon name="twitter" size={30} />
                {:else}
                  <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{providerLabels[provider] || provider}</span>
                {/if}
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
  <Footer />
</div>
