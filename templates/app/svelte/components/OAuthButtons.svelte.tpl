<script lang="ts">
  import { oauthConfig } from '$lib/config.js'

  import { createOAuthHelpers } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import OAuthDivider from './OAuthDivider.svelte'
  import OAuthProviderButtons from './OAuthProviderButtons.svelte'

  /**
   * Config-driven OAuth provider button row rendered beneath a login/signup
   * form — the convenience layer that injects this app's `oauthConfig`
   * (`src/lib/config.ts`). The shared pieces handle the "or continue with"
   * divider, brand logos, and accessibility labels.
   *
   * This component also owns the CALLBACK half of the page-based flow: the
   * OAuth helpers detect `?code&state` on the page this row is mounted on,
   * exchange the code, and report the outcome here — a failed exchange
   * (forged/expired code, state mismatch, provider rejection) renders a
   * VISIBLE inline error (`data-mol-id="oauth-error"`, `role="alert"`)
   * instead of failing silently, and a success clears it so the host can
   * navigate into the app.
   */
  let {
    class: className = undefined,
    iconSize = 30,
    iconMode = 'brand',
    showLabels = false,
    dividerKey = 'oauth.orContinueWith',
    dividerDefault = 'or continue with',
  }: {
    /** Extra class applied to the outer wrapper. */
    class?: string
    /** Icon size in pixels. */
    iconSize?: number
    /** Logo color mode — `'brand'` (default, official multi-color) or `'mono'`. */
    iconMode?: 'brand' | 'mono'
    /** When true, render the provider label text next to the logo. */
    showLabels?: boolean
    /** Override the default "or continue with" divider text. */
    dividerKey?: string
    dividerDefault?: string
  } = $props()

  const cm = getClassMap()

  let error = $state<string | null>(null)

  const { providers, redirect: oauthRedirect } = createOAuthHelpers({
    ...oauthConfig,
    onSuccess: () => {
      error = null
    },
    onError: (message: string) => {
      // The message is the api's (localized) error body or the helper's
      // fallback — render it so a failed callback is never invisible.
      error = message
    },
  })
</script>

{#if $providers.length > 0}
  <div class={className}>
    <OAuthDivider labelKey={dividerKey} labelDefault={dividerDefault} />
    {#if error}
      <div class={cm.authFormError} role="alert" data-mol-id="oauth-error">
        {error}
      </div>
    {/if}
    <OAuthProviderButtons
      providers={$providers}
      onSelect={(provider) => oauthRedirect(provider)}
      {iconSize}
      {iconMode}
      {showLabels}
    />
  </div>
{/if}
