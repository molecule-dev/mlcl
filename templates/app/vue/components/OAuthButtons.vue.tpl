<script setup lang="ts">
import { useOAuth, useTranslation } from '@molecule/app-vue'
import { getClassMap } from '@molecule/app-ui'
import Icon from './Icon.vue'
import { oauthConfig } from '../config.js'

const { t } = useTranslation()
const cm = getClassMap()

const providerLabels: Record<string, string> = {
  github: t('oauth.github'),
  google: t('oauth.google'),
  gitlab: t('oauth.gitlab'),
  twitter: t('oauth.twitter'),
}

const { providers, redirect } = useOAuth(oauthConfig)
</script>

<template>
  <div v-if="providers.length">
    <div :class="cm.oauthDivider">
      <div :class="cm.oauthDividerLine" />
      <span :class="cm.oauthDividerText">
        {{ t('oauth.orContinueWith') }}
      </span>
    </div>
    <div :class="cm.oauthButtonGroup">
      <button
        v-for="provider in providers"
        :key="provider"
        type="button"
        :aria-label="t('oauth.continueWith', { provider: providerLabels[provider] || provider })"
        :class="cm.oauthButton"
        @click="redirect(provider)"
      >
        <span :class="cm.oauthButtonIcon">
          <!-- GitHub -->
          <Icon v-if="provider === 'github'" name="github" :size="30" />
          <!-- Google -->
          <Icon v-else-if="provider === 'google'" name="google" :size="30" />
          <!-- GitLab -->
          <Icon v-else-if="provider === 'gitlab'" name="gitlab" :size="30" />
          <!-- Twitter -->
          <Icon v-else-if="provider === 'twitter'" name="twitter" :size="30" />
          <!-- Fallback -->
          <span v-else :class="cm.oauthProviderLabel">{{ providerLabels[provider] || provider }}</span>
        </span>
      </button>
    </div>
  </div>
</template>
