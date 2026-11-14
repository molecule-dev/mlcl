<script lang="ts">
  import { resolve } from '$app/paths'
  import type { RouteIdWithSearchOrHash } from '$app/types'

  import { createI18nStores, createVersionStores } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Modal } from '@molecule/app-ui-svelte'

  import Icon from './Icon.svelte'

  let {
    appName,
    aboutHref,
    legalMode = 'modal',
    loadContent = undefined,
    privacyTo = '/privacy',
    termsTo = '/terms',
    class: className = undefined,
    dataMolId = undefined,
  }: {
    /** Display name interpolated into the "About {{appName}}" link. */
    appName: string
    /**
     * URL or path for the About link. URLs starting with http/https render as
     * an external `<a target="_blank">`; other values render as an internal link.
     */
    aboutHref: string
    /**
     * How privacy/terms surfaces are presented: 'modal' (default) opens
     * in-place modals with HTML from the bonded i18n catalog
     * (content.privacyPolicy / content.termsOfService); 'route' renders links
     * for apps that put the legal pages on their own routes.
     */
    legalMode?: 'modal' | 'route'
    /** Optional preloader called immediately before the privacy/terms modals open. */
    loadContent?: (key: 'privacyPolicy' | 'termsOfService') => Promise<void> | void
    /** Path for the Privacy Policy route (legalMode 'route' only). */
    privacyTo?: string
    /** Path for the Terms of Service route (legalMode 'route' only). */
    termsTo?: string
    class?: string
    /** data-mol-id for AI-agent selectors. */
    dataMolId?: string
  } = $props()

  const cm = getClassMap()
  const { t, locale, setLocale, locales } = createI18nStores()
  const { state: versionState } = createVersionStores()

  let privacyOpen = $state(false)
  let termsOpen = $state(false)
  let languageOpen = $state(false)

  let sortedLocales = $derived([...$locales].sort((a, b) => a.name.localeCompare(b.name)))

  let version = $derived(
    $t(
      'footer.version',
      { version: $versionState.version || '1.0.0' },
      { defaultValue: 'v{{version}}' },
    ),
  )

  let aboutLabel = $derived($t('footer.about', { appName }, { defaultValue: 'About {{appName}}' }))

  let legalNotConfigured = $derived(
    $t(
      'footer.legalNotConfigured',
      {},
      { defaultValue: 'This content has not been configured yet. The app owner must provide it.' },
    ),
  )

  /**
   * HTML-escapes an interpolation value before it enters a translation whose
   * result is rendered as HTML ({@html}). Svelte escapes text children
   * automatically but NOT values interpolated into HTML strings — an appName
   * containing markup would otherwise execute inside the legal content.
   */
  function escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  }

  function isExternalHref(href: string): boolean {
    return /^https?:\/\//i.test(href)
  }

  // The About and legal targets are props — an app may point them at pages
  // this scaffold does not declare — so the route-id type cannot be proven
  // here; `resolve()` still applies the configured base path at runtime.
  // Type them locally so each `resolve()` call below stays the direct call the
  // no-navigation-without-resolve rule looks for.
  type AppPath = RouteIdWithSearchOrHash

  /**
   * The legal HTML from the i18n catalog, or — when the app has registered
   * none (the bond ships content.* empty by design) — a clear placeholder.
   * Never a silently-blank modal, and never fabricated legal text.
   */
  let privacyHtml = $derived(
    $t('content.privacyPolicy', { appName: escapeHtml(appName) }, { defaultValue: '' }).trim(),
  )
  let termsHtml = $derived(
    $t('content.termsOfService', { appName: escapeHtml(appName) }, { defaultValue: '' }).trim(),
  )

  async function openPrivacy(): Promise<void> {
    if (loadContent) await loadContent('privacyPolicy')
    privacyOpen = true
  }

  async function openTerms(): Promise<void> {
    if (loadContent) await loadContent('termsOfService')
    termsOpen = true
  }
</script>

<!-- A `<footer>` (contentinfo landmark), not a bare <section> — axe's
     `region` rule requires all page content inside landmarks, and
     screen-reader users jump to the footer by landmark. -->
<footer class={cm.cn(cm.footerBar, className)} data-mol-id={dataMolId}>
  {#if isExternalHref(aboutHref)}
    <!-- rel="external" is SvelteKit's marker for a link the client router must
         leave alone (the href is a full URL); the linter requires it here. -->
    <a href={aboutHref} target="_blank" rel="external noopener noreferrer" class={cm.footerLink}>
      {aboutLabel}
    </a>
  {:else}
    <!-- An internal href is an app route by contract (everything else matched
         the external test above); `resolve()` base-paths it. -->
    <a href={resolve(aboutHref as AppPath)} class={cm.footerLink}>
      {aboutLabel}
    </a>
  {/if}
  {#if legalMode === 'modal'}
    <button type="button" onclick={openPrivacy} class={cm.footerButton}>
      {$t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
    </button>
    <button type="button" onclick={openTerms} class={cm.footerButton}>
      {$t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
    </button>
  {:else}
    <a href={resolve(privacyTo as AppPath)} class={cm.footerButton}>
      {$t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
    </a>
    <a href={resolve(termsTo as AppPath)} class={cm.footerButton}>
      {$t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
    </a>
  {/if}
  <button
    type="button"
    onclick={() => (languageOpen = true)}
    class={cm.footerButton}
    aria-label={$t('footer.language', {}, { defaultValue: 'Language' })}
  >
    <Icon name="globe" size={14} />
    {$locales.find((l) => l.code === $locale)?.name}
  </button>
  <span class={cm.footerLink}>{version}</span>
</footer>

{#if legalMode === 'modal'}
  <Modal
    open={privacyOpen}
    onClose={() => (privacyOpen = false)}
    title={$t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
    size="lg"
  >
    {#if privacyHtml}
      <div class={cm.prose}>{@html privacyHtml}</div>
    {:else}
      <p class={cm.prose}>{legalNotConfigured}</p>
    {/if}
  </Modal>
  <Modal
    open={termsOpen}
    onClose={() => (termsOpen = false)}
    title={$t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
    size="lg"
  >
    {#if termsHtml}
      <div class={cm.prose}>{@html termsHtml}</div>
    {:else}
      <p class={cm.prose}>{legalNotConfigured}</p>
    {/if}
  </Modal>
{/if}

<Modal
  open={languageOpen}
  onClose={() => (languageOpen = false)}
  title={$t('footer.language', {}, { defaultValue: 'Language' })}
  size="lg"
>
  <div class={cm.languageGrid}>
    {#each sortedLocales as l (l.code)}
      <button
        type="button"
        onclick={async () => {
          await setLocale(l.code)
          languageOpen = false
        }}
        class={l.code === $locale ? cm.languageActive : cm.languageOption}
      >
        {l.name}
      </button>
    {/each}
  </div>
</Modal>
