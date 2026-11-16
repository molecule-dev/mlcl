<script setup lang="ts">
// Entry-point providers (moleculePlugin in main.ts) and access boundary, kept
// separate from page routes. The access policy lives in components/AuthGuard.ts.
//
// SessionReady waits only while auth status is 'loading'. A stored token AND
// cached user restore synchronously without a request; token-only and cookie-only
// sessions need an asynchronous current-user request. Public pages then read the
// restored user when restoration succeeds. An 'unavailable' session still renders
// and may have a null user; handle that status separately from sign-out.
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
