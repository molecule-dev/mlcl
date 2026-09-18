<script lang="ts">
  import { createAuthStores, createI18nStores, createThemeStores } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import Icon from '../../components/Icon.svelte'
  import Footer from '../../components/Footer.svelte'
  import {
    getButtonClasses,
    getFlexClasses,
    getContainerClasses,
    cn,
  } from '@molecule/app-ui-svelte'
  import { APP_NAME, LOGO_SIZE } from '$lib/branding.js'

  const cm = getClassMap()
  const { state: authState } = createAuthStores()
  const { t } = createI18nStores()
  const { mode, toggleTheme } = createThemeStores()
</script>

{#if !$authState.initialized}
  <div class={cm.cn(getFlexClasses({ align: 'center', justify: 'center' }), cm.sp('py', 12))}>
    <p class={cm.textMuted}>{$t('common.loading')}</p>
  </div>
{:else}
  <div class={cm.cn(cm.page, cm.flex({ direction: 'col' }))}>
    <header class={cm.headerBar}>
      <div class={cm.cn(getContainerClasses({ maxWidth: 'xl' }), cm.h(16))}>
        <div class={cm.cn(getFlexClasses({ align: 'center', justify: 'between' }), cm.h('full'))}>
          <div class={cm.cn(getFlexClasses({ align: 'center', gap: 'sm' }), cm.textSize('xl'), cm.fontWeight('bold'))}>
            <img src="/logo.svg" width={LOGO_SIZE} height={LOGO_SIZE} alt="" />
            {APP_NAME}
          </div>
          <button
            type="button"
            class={getButtonClasses({ variant: 'ghost', size: 'sm' })}
            onclick={toggleTheme}
            aria-label={$t('theme.toggle')}
          >
            {#if $mode === 'light'}
              <Icon name="moon" size={20} />
            {:else}
              <Icon name="sun" size={20} />
            {/if}
          </button>
        </div>
      </div>
    </header>
    <div class={cm.cn(getFlexClasses({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('px', 4), cm.sp('py', 8))}>
      <div class={cm.cn(cm.w('full'), cm.maxW('sm'))}>
        <div class={cm.cn(cm.textCenter, cm.sp('py', 12))}>
          <h2 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>{$t('planUpdated.message')}</h2>
          <h2 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8))}>{$t('planUpdated.thankYou')}</h2>
          <a href="/">
            <button type="button" class={getButtonClasses({})}>
              {$t('planUpdated.returnHome')}
            </button>
          </a>
        </div>
        <Footer />
      </div>
    </div>
  </div>
{/if}
