<script setup lang="ts">
// Entry-point providers (moleculePlugin in main.ts) and access boundary, kept
// separate from page routes. The access policy lives in components/AuthGuard.ts.
//
// SessionReady holds every page until a returning visitor's session is restored
// (one request after a full page load), so public pages read the restored user
// when that request succeeds. An 'unavailable' session still renders and may
// have a null user; handle that status separately from sign-out.
// A visitor with no session to restore makes no request. Keep it.
import { SessionReady } from '@molecule/app-vue'

import { RouteAccess } from './components/AuthGuard.js'
</script>

<template>
  <SessionReady>
    <RouteAccess>
      <RouterView />
    </RouteAccess>
  </SessionReady>
</template>
