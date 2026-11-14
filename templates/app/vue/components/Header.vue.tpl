<script setup lang="ts">
import { AppHeader } from '@molecule/app-header-vue'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import UserMenu from './UserMenu.vue'
</script>

<template>
  <AppHeader :app-name="APP_NAME" :logo-size="LOGO_SIZE">
    <template #userMenu>
      <UserMenu />
    </template>
  </AppHeader>
</template>
