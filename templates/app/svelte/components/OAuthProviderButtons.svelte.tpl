<script lang="ts">
  import { createI18nStores } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import OAuthProviderLogo from './OAuthProviderLogo.svelte'

  /**
   * Per-provider brand background/foreground colors used as inline styles.
   *
   * These are values ClassMap cannot express — they are exact brand-spec
   * colors mandated by each provider's developer guidelines (e.g. Google's
   * `#ffffff`, GitHub's `#24292f`). Layout, padding, radius, and sizing all
   * come from the wired ClassMap — only the brand color is inline. Off by
   * default; `brandButtons` turns it on.
   */
  const BRAND_STYLES: Readonly<
    Record<string, { background: string; color: string; borderColor?: string }>
  > = Object.freeze({
    google: { background: '#ffffff', color: '#1f1f1f', borderColor: '#dadce0' },
    github: { background: '#24292f', color: '#ffffff' },
    gitlab: { background: '#fc6d26', color: '#ffffff' },
    twitter: { background: '#1da1f2', color: '#ffffff' },
    x: { background: '#000000', color: '#ffffff' },
    apple: { background: '#000000', color: '#ffffff' },
    facebook: { background: '#1877f2', color: '#ffffff' },
    microsoft: { background: '#2f2f2f', color: '#ffffff' },
    linkedin: { background: '#0a66c2', color: '#ffffff' },
    discord: { background: '#5865f2', color: '#ffffff' },
  })

  /** Canonical i18n key + English default for each supported provider. */
  const PROVIDER_LABELS: Readonly<Record<string, { key: string; default: string }>> = Object.freeze(
    {
      github: { key: 'oauthButtons.provider.github', default: 'GitHub' },
      gitlab: { key: 'oauthButtons.provider.gitlab', default: 'GitLab' },
      google: { key: 'oauthButtons.provider.google', default: 'Google' },
      twitter: { key: 'oauthButtons.provider.twitter', default: 'Twitter' },
      x: { key: 'oauthButtons.provider.x', default: 'X' },
      apple: { key: 'oauthButtons.provider.apple', default: 'Apple' },
      facebook: { key: 'oauthButtons.provider.facebook', default: 'Facebook' },
      microsoft: { key: 'oauthButtons.provider.microsoft', default: 'Microsoft' },
      linkedin: { key: 'oauthButtons.provider.linkedin', default: 'LinkedIn' },
      discord: { key: 'oauthButtons.provider.discord', default: 'Discord' },
    },
  )

  /**
   * Returns the i18n entry for a provider id, synthesizing one for unknown ids
   * so unrecognized providers still render a sensible English label.
   */
  function getProviderLabel(provider: string): { key: string; default: string } {
    const entry = PROVIDER_LABELS[provider]
    if (entry) return entry
    return {
      key: `oauthButtons.provider.${provider}`,
      default: provider.charAt(0).toUpperCase() + provider.slice(1),
    }
  }

  /** De-duplicates a provider list while preserving the caller's order. */
  function dedupeProviders(providers: readonly string[]): string[] {
    const seen: string[] = []
    const out: string[] = []
    for (const p of providers) {
      if (!seen.includes(p)) {
        seen.push(p)
        out.push(p)
      }
    }
    return out
  }

  /**
   * Inline-style overlay applied on top of `cm.oauthButtonGroup` for a layout
   * variant: the single CSS property each variant needs to flip its direction
   * (a value the fixed `cm.oauthButtonGroup` token does not express).
   */
  function getLayoutStyle(layout: string, providerCount: number): string | undefined {
    switch (layout) {
      case 'vertical':
        return 'flex-direction: column; flex-wrap: nowrap;'
      case 'grid': {
        const columns = providerCount > 4 ? 2 : Math.min(providerCount, 4)
        return `display: grid; grid-template-columns: repeat(${columns}, minmax(0, 1fr));`
      }
      default:
        return undefined
    }
  }

  /** In 'vertical' mode each button stretches to fill the column. */
  function getButtonLayoutStyle(layout: string): string | undefined {
    if (layout === 'vertical') return 'width: 100%;'
    return undefined
  }

  /** Inline brand-spec style payload for one provider button. */
  function getBrandStyle(provider: string): string | undefined {
    const entry = BRAND_STYLES[provider]
    if (!entry) return undefined
    let style = `background: ${entry.background}; color: ${entry.color};`
    if (entry.borderColor) {
      style += ` border-color: ${entry.borderColor}; border-style: solid; border-width: 1px;`
    }
    return style
  }

  let {
    providers,
    onSelect = undefined,
    onSuccess = undefined,
    layout = 'horizontal',
    iconSize = 30,
    iconMode = 'brand',
    brandButtons = false,
    showLabels = false,
    class: className = undefined,
  }: {
    providers: readonly string[]
    onSelect?: (provider: string) => void
    onSuccess?: (provider: string) => void
    layout?: 'horizontal' | 'vertical' | 'grid'
    iconSize?: number
    iconMode?: 'brand' | 'mono'
    brandButtons?: boolean
    showLabels?: boolean
    class?: string
  } = $props()

  const cm = getClassMap()
  const { t } = createI18nStores()

  let ordered = $derived(dedupeProviders(providers))
  let wrapperStyle = $derived(getLayoutStyle(layout, ordered.length))
  let buttonStyle = $derived(getButtonLayoutStyle(layout))

  /**
   * Activate a provider button: start the flow via onSelect, and — for an
   * inline handler that resolves the handshake in place (popup/PKCE) — fire
   * onSuccess(provider) on completion. A full-page redirect onSelect never
   * resolves here, so onSuccess correctly never fires (that flow's completion
   * is observed on the callback page instead). A rejected handshake does not
   * fire onSuccess either; surfacing the error is the initiating onSelect
   * handler's responsibility.
   */
  async function activate(provider: string): Promise<void> {
    if (!onSelect) return
    try {
      const result: unknown = onSelect(provider)
      if (result instanceof Promise) {
        await result
        onSuccess?.(provider)
      }
    } catch (_error) {
      // The handshake failed/aborted — onSuccess must NOT fire. Surfacing the
      // error is the initiating onSelect handler's responsibility; this
      // presentational row only reports success.
    }
  }
</script>

{#if ordered.length > 0}
  <div
    class={cm.cn(cm.oauthButtonGroup, className)}
    role="group"
    aria-label={$t('oauthButtons.groupLabel', undefined, {
      defaultValue: 'Continue with another account',
    })}
    style={wrapperStyle}
    data-mol-id="oauth-buttons"
    data-layout={layout}
  >
    {#each ordered as provider (provider)}
      {@const localized = $t(getProviderLabel(provider).key, undefined, {
        defaultValue: getProviderLabel(provider).default,
      })}
      {@const brandStyle = brandButtons ? getBrandStyle(provider) : undefined}
      <button
        type="button"
        onclick={() => activate(provider)}
        aria-label={$t(
          'oauthButtons.continueWith',
          { provider: localized },
          {
            defaultValue: 'Continue with {{provider}}',
          },
        )}
        class={cm.oauthButton}
        data-mol-id={`oauth-button-${provider}`}
        data-provider={provider}
        style={[brandStyle, buttonStyle].filter(Boolean).join(' ') || undefined}
      >
        <span class={cm.oauthButtonIcon}>
          <OAuthProviderLogo {provider} size={iconSize} mode={iconMode} ariaLabel="" />
        </span>
        {#if showLabels}
          <span class={cm.oauthProviderLabel}>{localized}</span>
        {/if}
      </button>
    {/each}
  </div>
{/if}
