<script setup lang="ts">
import { OAuthButtons as MoleculeOAuthButtons } from '@molecule/app-auth-ui-vue'

import { oauthConfig } from '../config.js'

/**
 * Thin wrapper around the shared `OAuthButtons` that injects this
 * app's `oauthConfig`. The shared package handles the "or continue with"
 * divider, brand logos, and accessibility labels.
 */
</script>

<template>
  <MoleculeOAuthButtons :oauth-config="oauthConfig" />
</template>
