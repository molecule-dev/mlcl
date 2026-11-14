<script lang="ts">
  import { resolve } from '$app/paths'
  import type { RouteIdWithSearchOrHash } from '$app/types'
  import type { Snippet } from 'svelte'

  import { createI18nStores, createThemeStores } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Flex } from '@molecule/app-ui-svelte'

  import { LOGO_SRC } from '../lib/logo.js'
  import ThemeToggle from './ThemeToggle.svelte'

  let {
    appName,
    logoSrc = LOGO_SRC,
    logoSize = 30,
    brandTo = '/',
    userMenu = undefined,
    themeToggle = undefined,
    extraActions = undefined,
    fixed = true,
    class: className = undefined,
    dataMolId = undefined,
  }: {
    /** Brand display name shown next to the logo. */
    appName: string
    /** Logo image source. */
    logoSrc?: string
    /** Logo size in pixels (square). */
    logoSize?: number
    /** Path the brand link navigates to (an app route; `resolve()` base-paths it). */
    brandTo?: RouteIdWithSearchOrHash
    /** Slot for the right-side user menu. */
    userMenu?: Snippet
    /**
     * Theme toggle slot. Defaults to a resilient wrapper around ThemeToggle
     * that renders ONLY when theme + i18n context are both mounted above the
     * header, and omits it (never throws) when they are not. Pass nothing to
     * use the default; render your own in the slot to override.
     */
    themeToggle?: Snippet
    /** Optional extra actions rendered between the theme toggle and the user menu. */
    extraActions?: Snippet
    /** Apply cm.headerFixed for sticky/fixed positioning. */
    fixed?: boolean
    class?: string
    /** data-mol-id for AI-agent selectors. */
    dataMolId?: string
  } = $props()

  const cm = getClassMap()

  // Resilient default for the themeToggle slot, mirroring the framework
  // package: ThemeToggle reads theme + i18n context, both of which THROW when
  // they are not mounted above the header. Probe them at init and render the
  // real toggle only when BOTH resolve — without them the slot is silently
  // omitted, so `<AppHeader appName="…" />` renders out of the box even
  // before an app has wired theme/i18n.
  let hasTheme = true
  let hasI18n = true
  try {
    createThemeStores()
  } catch (_error) {
    // Theme provider not mounted above the header — omit the default toggle.
    hasTheme = false
  }
  try {
    createI18nStores()
  } catch (_error) {
    // i18n provider not mounted above the header — omit the default toggle.
    hasI18n = false
  }
  let showDefaultToggle = hasTheme && hasI18n

  let headerClass = $derived(cm.cn(cm.headerBar, fixed ? cm.headerFixed : '', className))
</script>

<header class={headerClass} data-mol-id={dataMolId}>
  <div class={cm.headerInner}>
    <Flex align="center" justify="between" className={cm.h('full')}>
      <a href={resolve(brandTo)}>
        <Flex align="center" gap="xs">
          <!-- `logo` defaults to the scaffold's `static/logo.svg` (`LOGO_SRC`),
               the same `/logo.svg` the React scaffold renders. -->
          <img src={logoSrc} width={logoSize} height={logoSize} alt="" />
          <span class={cm.logoText}>{appName}</span>
        </Flex>
      </a>
      <Flex align="center" gap="sm">
        {#if themeToggle}
          {@render themeToggle()}
        {:else if showDefaultToggle}
          <ThemeToggle />
        {/if}
        {#if extraActions}
          {@render extraActions()}
        {/if}
        {#if userMenu}
          {@render userMenu()}
        {/if}
      </Flex>
    </Flex>
  </div>
</header>
