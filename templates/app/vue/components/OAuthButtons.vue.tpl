<script setup lang="ts">
import { computed, ref } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useOAuth, useTranslation } from '@molecule/app-vue'

import { oauthConfig } from '../config.js'
import OAuthProviderLogo from './OAuthProviderLogo.vue'

/**
 * Config-driven OAuth provider button row rendered beneath a login/signup
 * form: the "or continue with" divider above the provider button row. The
 * composable also owns the CALLBACK half of the page-based flow — a failed
 * callback exchange renders a VISIBLE inline error (`data-mol-id="oauth-error"`,
 * `role="alert"`) instead of failing silently.
 */
const { t } = useTranslation()
const cm = getClassMap()

/** Canonical i18n key + English default per provider (mirrors `labels.ts`). */
const PROVIDER_LABELS: Readonly<Record<string, { key: string; default: string }>> = Object.freeze({
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
})

/**
 * The i18n entry for a provider id. Falls back to a synthesized entry for
 * unknown ids so unrecognized providers still render a sensible English
 * label rather than a raw key string.
 */
function getProviderLabel(provider: string): { key: string; default: string } {
  const entry = PROVIDER_LABELS[provider]
  if (entry) return entry
  return {
    key: `oauthButtons.provider.${provider}`,
    default: provider.charAt(0).toUpperCase() + provider.slice(1),
  }
}

/**
 * The button's accessible name: the provider's localized brand name wrapped in
 * the shared "Continue with {{provider}}" phrase (the same key the React row
 * uses). A raw provider name would drop the action from the label.
 *
 * @param provider - Canonical provider id (e.g. `'google'`).
 * @returns The translated `aria-label` for that provider's button.
 */
function providerAriaLabel(provider: string): string {
  const label = getProviderLabel(provider)
  const localizedName = t(label.key, undefined, { defaultValue: label.default })
  return t(
    'oauthButtons.continueWith',
    { provider: localizedName },
    {
      defaultValue: 'Continue with {{provider}}',
    },
  )
}

const error = ref('')

const { providers, redirect } = useOAuth({
  ...oauthConfig,
  onSuccess: () => {
    error.value = ''
  },
  onError: (message: string) => {
    // The message is the api's (localized) error body or the hook's
    // fallback — render it so a failed callback is never invisible.
    error.value = message
  },
})

// De-duplicate the provider list while preserving the caller's order.
const ordered = computed(() => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const provider of providers.value) {
    if (!seen.has(provider)) {
      seen.add(provider)
      out.push(provider)
    }
  }
  return out
})

const dividerText = computed(() =>
  t('oauth.orContinueWith', {}, { defaultValue: 'or continue with' }),
)
</script>

<template>
  <div v-if="ordered.length > 0">
    <!-- "or continue with" rule above the provider row -->
    <div :class="cm.cn(cm.oauthDivider, cm.flex({ align: 'center', gap: 4 }))">
      <span :class="cm.cn(cm.flex1, cm.separator())" />
      <span>{{ dividerText }}</span>
      <span :class="cm.cn(cm.flex1, cm.separator())" />
    </div>
    <div v-if="error" role="alert" :class="cm.authFormError" data-mol-id="oauth-error">
      {{ error }}
    </div>
    <div
      :class="cm.oauthButtonGroup"
      role="group"
      :aria-label="
        t('oauthButtons.groupLabel', undefined, {
          defaultValue: 'Continue with another account',
        })
      "
      data-mol-id="oauth-buttons"
      data-layout="horizontal"
    >
      <button
        v-for="provider in ordered"
        :key="provider"
        type="button"
        :aria-label="providerAriaLabel(provider)"
        :class="cm.oauthButton"
        :data-mol-id="`oauth-button-${provider}`"
        :data-provider="provider"
        @click="redirect(provider)"
      >
        <span :class="cm.oauthButtonIcon">
          <OAuthProviderLogo :provider="provider" :size="30" aria-label="" />
        </span>
      </button>
    </div>
  </div>
</template>
