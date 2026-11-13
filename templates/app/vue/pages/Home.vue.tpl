<script setup lang="ts">
/**
 * A page: one component per route, registered in the router.
 *
 * Load data with `useQuery` from `@molecule/app-query-vue` (add `@molecule/app-query` and a
 * bond such as `@molecule/app-query-memory`, which the scaffold's `src/bonds/` wires), not with a
 * hand-written watcher + `fetch`: a watcher that sets a `cancelled` flag in its cleanup and
 * early-returns on a guard cancels its own request whenever a dependency is rebuilt each
 * render, and the answer is then dropped on a slow (deployed) server although it always
 * arrives in time on localhost.
 */
import type { UserProfile } from '@molecule/app-auth'
import { getClassMap } from '@molecule/app-ui'
import { useAuth, useTranslation } from '@molecule/app-vue'

const { t } = useTranslation()
const cm = getClassMap()
const { user } = useAuth<UserProfile>()
</script>

<template>
  <div :class="cm.cn(cm.textCenter, cm.sp('py', 12))">
    <h1 :class="cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))">
      {{ t('home.greeting') }}{{ user?.name || user?.email || t('home.world') }}!
    </h1>
  </div>
</template>
