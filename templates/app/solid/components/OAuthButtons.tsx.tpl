import { createSignal, For, Show } from 'solid-js'
import { createOAuth, useTranslate } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { OAuthProviderLogo } from './oauth-logos.js'
import { oauthConfig } from '../config.js'

/**
 * Canonical i18n key + English default for each supported provider (matches
 * the shared `PROVIDER_LABELS` used by the config-driven OAuth button row).
 */
const PROVIDER_LABELS: Readonly<Record<string, { key: string; default: string }>> = {
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
}

/**
 * Returns the i18n entry (key + English default) for a provider id.
 * Unknown providers still render with a sensible English label rather than
 * a raw key string.
 */
const getProviderLabel = (provider: string): { key: string; default: string } =>
  PROVIDER_LABELS[provider] ?? {
    key: `oauthButtons.provider.${provider}`,
    default: provider.charAt(0).toUpperCase() + provider.slice(1),
  }

/** De-duplicates a provider list while preserving the caller's order. */
const dedupeProviders = (providers: readonly string[]): string[] => [...new Set(providers)]

/**
 * Config-driven OAuth provider button row rendered beneath a login/signup
 * form.
 *
 * Composes the "or continue with" divider above the provider button row
 * (canonical brand logos, brand-neutral button chrome from the wired
 * ClassMap). `createOAuth` also owns the CALLBACK half of the page-based
 * flow: it detects `?code&state` on the page this row is mounted on,
 * exchanges the code, and reports the outcome here — a failed exchange
 * (forged/expired code, state mismatch, provider rejection) renders a
 * VISIBLE inline error (`data-mol-id="oauth-error"`, `role="alert"`)
 * instead of failing silently, and a success clears it.
 */
export function OAuthButtons() {
  const cm = getClassMap()
  const t = useTranslate()
  const [error, setError] = createSignal<string | null>(null)
  const { providers, redirect } = createOAuth({
    ...oauthConfig,
    onSuccess: () => {
      setError(null)
    },
    onError: (message: string) => {
      // The message is the api's (localized) error body or the hook's
      // fallback — render it so a failed callback is never invisible.
      setError(message)
    },
  })

  const ordered = () => dedupeProviders(providers())

  return (
    <Show when={ordered().length > 0}>
      <div>
        <div class={cm.cn(cm.oauthDivider, cm.flex({ align: 'center', gap: 4 }))}>
          <span class={cm.cn(cm.flex1, cm.separator())} />
          <span>{t('oauth.orContinueWith', undefined, { defaultValue: 'or continue with' })}</span>
          <span class={cm.cn(cm.flex1, cm.separator())} />
        </div>
        <Show when={error()}>
          <div class={cm.authFormError} role="alert" data-mol-id="oauth-error">
            {error()}
          </div>
        </Show>
        <div
          class={cm.oauthButtonGroup}
          role="group"
          aria-label={t('oauthButtons.groupLabel', undefined, {
            defaultValue: 'Continue with another account',
          })}
          data-mol-id="oauth-buttons"
          data-layout="horizontal"
        >
          <For each={ordered()}>
            {(provider) => {
              const label = getProviderLabel(provider)
              const localizedName = t(label.key, undefined, { defaultValue: label.default })
              return (
                <button
                  type="button"
                  // A full-page redirect returns void; the flow completes on
                  // the callback page, where this row's exchange handler
                  // reports the outcome.
                  onClick={() => redirect(provider)}
                  aria-label={t(
                    'oauthButtons.continueWith',
                    { provider: localizedName },
                    { defaultValue: 'Continue with {{provider}}' },
                  )}
                  class={cm.oauthButton}
                  data-mol-id={`oauth-button-${provider}`}
                  data-provider={provider}
                >
                  <span class={cm.oauthButtonIcon}>
                    <OAuthProviderLogo provider={provider} size={30} mode="brand" ariaLabel="" />
                  </span>
                </button>
              )
            }}
          </For>
        </div>
      </div>
    </Show>
  )
}
