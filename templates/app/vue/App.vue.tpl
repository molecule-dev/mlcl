<script setup lang="ts">
// Hold every page while the initial session status is 'loading', so public
// actions see the restored user when restoration succeeds. 'unavailable'
// also renders and may have a null user. Without a session hint, an anonymous
// visitor settles in microtasks without a request. Keep it.
import { SessionReady } from '@molecule/app-vue'
</script>

<template>
  <SessionReady>
    <RouterView />
  </SessionReady>
</template>
