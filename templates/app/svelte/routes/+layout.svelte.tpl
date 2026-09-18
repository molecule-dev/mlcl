<script lang="ts">
  import '../index.css'
  import type { Snippet } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { setMoleculeContext, createAuthStores, createI18nStores, createThemeStores } from '@molecule/app-svelte'
  import { getClient as getHttpClient } from '@molecule/app-http'
  import { getProvider as getStorageProvider } from '@molecule/app-storage'
  import { getClassMap } from '@molecule/app-ui'
  import { authClient, i18nProvider, themeProvider } from '$lib/bonds/index.js'
  import Icon from '../components/Icon.svelte'
  import SettingsPanel from '../components/SettingsPanel.svelte'
  import Footer from '../components/Footer.svelte'
  import { APP_NAME, LOGO_SIZE } from '$lib/branding.js'
  import {
    getButtonClasses,
    getFlexClasses,
    cn,
  } from '@molecule/app-ui-svelte'

  let { children }: { children: Snippet } = $props()

  const cm = getClassMap()

  setMoleculeContext({
    auth: authClient,
    i18n: i18nProvider,
    theme: themeProvider,
    http: getHttpClient(),
    storage: getStorageProvider(),
  })

  const { state: authState, isAuthenticated, user, logout } = createAuthStores()
  const { t } = createI18nStores()
  const { mode, toggleTheme } = createThemeStores()

  let settingsOpen = $state(false)

  const publicRoutes = ['/login', '/signup', '/about', '/forgot-password', '/reset-password']

  $effect(() => {
    if ($authState.initialized && !$isAuthenticated && !publicRoutes.includes($page.url.pathname)) {
      goto('/login')
    }
  })
</script>

{#if !$authState.initialized}
  <div class={cm.cn(getFlexClasses({ align: 'center', justify: 'center' }), cm.page)}>
    <p class={cm.textMuted}>{$t('common.loading')}</p>
  </div>
{:else if publicRoutes.includes($page.url.pathname)}
  {@render children()}
{:else if $isAuthenticated}
  <div class={cm.cn(cm.page, cm.appLayout)}>
    <header class={cm.headerBar}>
      <div class={cm.headerInner}>
        <div class={cm.cn(getFlexClasses({ align: 'center', justify: 'between' }), cm.h('full'))}>
          <a href="/" class={getFlexClasses({ align: 'center', gap: 'xs' })}>
            <img src="/logo.svg" width={LOGO_SIZE} height={LOGO_SIZE} alt="" />
            <span class={cm.logoText}>{APP_NAME}</span>
          </a>
          <div class={getFlexClasses({ align: 'center', gap: 'sm' })}>
            <button
              type="button"
              class={getButtonClasses({ variant: 'ghost', size: 'sm' })}
              onclick={toggleTheme}
              aria-label={$t('theme.toggle')}
            >
              {#if $mode === 'dark'}
                <Icon name="moon" size={20} />
              {:else}
                <Icon name="sun" size={20} />
              {/if}
            </button>
            <button
              type="button"
              class={getButtonClasses({ variant: 'ghost', size: 'sm' })}
              onclick={() => settingsOpen = true}
              aria-label={$t('userMenu.open')}
            >
              <Icon name="user" size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
    <main>
      {@render children()}
    </main>
    <Footer />
  </div>

  {#if settingsOpen}
    <button type="button" class={cm.overlay} onclick={() => settingsOpen = false} aria-label={$t('common.close')} />
    <div class={cm.cn(cm.drawer, cm.surface)}>
      <SettingsPanel onClose={() => settingsOpen = false} />
    </div>
  {/if}
{/if}
