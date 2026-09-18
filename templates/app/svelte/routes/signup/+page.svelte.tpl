<script lang="ts">
  import { goto } from '$app/navigation'
  import { createI18nStores, createSignupStore, createThemeStores } from '@molecule/app-svelte'
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
  const signupStore = createSignupStore()
  const { mode, toggleTheme } = createThemeStores()

  let email = $state('')
  let password = $state('')
  let name = $state('')

  const isSigningUp = $derived($signupStore.status === 'pending')

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    try {
      await signupStore.call({ email, password, name: name || undefined })
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
            autofocus
            required
            placeholder={$t('auth.signup.email')}
          />
        </div>
        <div class={cm.authField}>
          <FloatingInput
            type="password"
            bind:value={password}
            autocomplete="new-password"
            required
            placeholder={$t('auth.signup.password')}
          />
        </div>
        <div class={cm.authField}>
          <FloatingInput
            type="text"
            bind:value={name}
            autocomplete="name"
            placeholder={$t('auth.signup.name')}
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
            disabled={isSigningUp}
            class={cn(getButtonClasses({ size: 'lg', color: 'success' }), cm.authSubmitButton)}
          >
            {isSigningUp ? $t('auth.signup.signingUp') : $t('auth.signup.signUp')}
          </button>
        </div>
      </form>
      {#if $signupStore.error}
        <div class={cm.authFormError}>
          {$signupStore.error.message}
        </div>
      {/if}
    </div>
  </div>
  <Footer />
</div>
