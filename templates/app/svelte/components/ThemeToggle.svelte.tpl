<script lang="ts">
  import type { IconName } from '@molecule/app-icons'
  import { createI18nStores, createThemeStores } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import Icon from './Icon.svelte'

  let {
    ariaLabelKey = 'theme.toggle',
    ariaLabelDefault = 'Toggle theme',
    darkIcon = 'moon' as IconName,
    lightIcon = 'sun' as IconName,
    iconSize = 20,
    class: className = undefined,
  }: {
    /** i18n key for the aria-label. */
    ariaLabelKey?: string
    /** Fallback aria-label if the i18n key is missing. */
    ariaLabelDefault?: string
    /** Icon name to render in dark mode. */
    darkIcon?: IconName
    /** Icon name to render in light mode. */
    lightIcon?: IconName
    /** Pixel size for the rendered icon. */
    iconSize?: number
    class?: string
  } = $props()

  const cm = getClassMap()
  const { t } = createI18nStores()
  const { mode, toggleTheme } = createThemeStores()
</script>

<button
  type="button"
  data-mol-id="theme-toggle"
  data-mode={$mode}
  aria-pressed={$mode === 'dark'}
  aria-label={$t(ariaLabelKey, {}, { defaultValue: ariaLabelDefault })}
  onclick={toggleTheme}
  class={cm.cn(cm.themeToggleButton, className)}
>
  {#if $mode === 'dark'}
    <Icon name={darkIcon} size={iconSize} />
  {:else}
    <Icon name={lightIcon} size={iconSize} />
  {/if}
</button>
