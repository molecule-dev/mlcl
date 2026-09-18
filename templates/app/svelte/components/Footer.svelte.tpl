<script lang="ts">
  import { createVersionStores, createI18nStoresFromProvider } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { getProvider } from '@molecule/app-i18n'
  import Icon from '../components/Icon.svelte'
  import {
    getModalOverlayClass,
    getModalWrapperClass,
    getModalContentClasses,
    getModalHeaderClass,
    getModalTitleClass,
    getModalBodyClass,
  } from '@molecule/app-ui-svelte'
  import { loadContent } from '$lib/config.js'
  import { APP_NAME } from '$lib/branding.js'

  const cm = getClassMap()
  const { state: versionState } = createVersionStores()
  const { t, locale, setLocale, locales } = createI18nStoresFromProvider(getProvider()!)

  let privacyOpen = $state(false)
  let termsOpen = $state(false)
  let languageOpen = $state(false)

  const sortedLocales = $derived([...$locales].sort((a, b) => a.name.localeCompare(b.name)))

  const version = $derived(
    $versionState.version ? `v${$versionState.version}` : 'v1.0.0'
  )

  async function openPrivacy() {
    await loadContent('privacyPolicy')
    privacyOpen = true
  }

  async function openTerms() {
    await loadContent('termsOfService')
    termsOpen = true
  }
</script>

<section class={cm.footerBar}>
  <a href="/about" class={cm.footerLink}>
    {$t('footer.about', { appName: APP_NAME })}
  </a>
  <button
    type="button"
    onclick={openPrivacy}
    class={cm.footerButton}
  >
    {$t('footer.privacyPolicy')}
  </button>
  <button
    type="button"
    onclick={openTerms}
    class={cm.footerButton}
  >
    {$t('footer.termsOfService')}
  </button>
  <button
    type="button"
    onclick={() => languageOpen = true}
    class={cm.footerButton}
    aria-label={$t('footer.language')}
  >
    <Icon name="globe" size={14} />
    {sortedLocales.find(l => l.code === $locale)?.name}
  </button>
  <span class={cm.footerLink}>{version}</span>
</section>

<!-- Privacy Policy Modal -->
{#if privacyOpen}
  <div class={getModalOverlayClass()} aria-hidden="true"></div>
  <div
    class={getModalWrapperClass()}
    role="presentation"
    onclick={() => privacyOpen = false}
    onkeydown={(e) => e.key === 'Escape' && (privacyOpen = false)}
    tabindex="-1"
  >
  <div role="dialog" aria-modal="true" class={getModalContentClasses({ size: 'lg' })} onclick={(e) => e.stopPropagation()}>
    <div class={getModalHeaderClass()}>
      <h2 class={getModalTitleClass()}>{$t('footer.privacyPolicy')}</h2>
    </div>
    <div class={getModalBodyClass()}>
      <div class={cm.prose}>
        {@html $t('content.privacyPolicy', { appName: APP_NAME })}
      </div>
    </div>
  </div>
  </div>
{/if}

<!-- Terms of Service Modal -->
{#if termsOpen}
  <div class={getModalOverlayClass()} aria-hidden="true"></div>
  <div
    class={getModalWrapperClass()}
    role="presentation"
    onclick={() => termsOpen = false}
    onkeydown={(e) => e.key === 'Escape' && (termsOpen = false)}
    tabindex="-1"
  >
  <div role="dialog" aria-modal="true" class={getModalContentClasses({ size: 'lg' })} onclick={(e) => e.stopPropagation()}>
    <div class={getModalHeaderClass()}>
      <h2 class={getModalTitleClass()}>{$t('footer.termsOfService')}</h2>
    </div>
    <div class={getModalBodyClass()}>
      <div class={cm.prose}>
        {@html $t('content.termsOfService')}
      </div>
    </div>
  </div>
  </div>
{/if}

<!-- Language Selector Modal -->
{#if languageOpen}
  <div class={getModalOverlayClass()} aria-hidden="true"></div>
  <div
    class={getModalWrapperClass()}
    role="presentation"
    onclick={() => languageOpen = false}
    onkeydown={(e) => e.key === 'Escape' && (languageOpen = false)}
    tabindex="-1"
  >
  <div role="dialog" aria-modal="true" class={getModalContentClasses({ size: 'lg' })} onclick={(e) => e.stopPropagation()}>
    <div class={getModalHeaderClass()}>
      <h2 class={getModalTitleClass()}>{$t('footer.language')}</h2>
    </div>
    <div class={getModalBodyClass()}>
      <div class={cm.languageGrid}>
        {#each sortedLocales as l}
          <button
            type="button"
            onclick={async () => { await setLocale(l.code); languageOpen = false }}
            class={l.code === $locale ? cm.languageActive : cm.languageOption}
          >
            {l.name}
          </button>
        {/each}
      </div>
    </div>
  </div>
  </div>
{/if}
