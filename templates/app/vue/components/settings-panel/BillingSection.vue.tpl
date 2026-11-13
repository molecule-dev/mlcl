<script setup lang="ts">
import { onScopeDispose, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getClassMap } from '@molecule/app-ui'
import { Button, Flex } from '@molecule/app-ui-vue'
import { useHttpClient, useTranslation } from '@molecule/app-vue'

const props = withDefaults(
  defineProps<{
    /** Fallback plan label (e.g. for offline rendering). */
    plan?: string
    /** Route the Upgrade button navigates to. */
    upgradeTo?: string
  }>(),
  {
    plan: 'Free',
    upgradeTo: '/settings',
  },
)

/**
 * Billing section — current plan + Upgrade button.
 *
 * Fetches `/api/billing/status` on mount and uses the returned plan
 * name as a more accurate label than the parent-supplied default.
 * The `plan` prop remains a fallback (e.g. for offline rendering or
 * apps that don't expose `/billing/status`).
 */
const { t } = useTranslation()
const cm = getClassMap()
const router = useRouter()
const http = useHttpClient()
const livePlan = ref<string | null>(null)

// Refresh the current plan from the bonded entitlements/billing
// status endpoint on mount. Fire-and-forget; the prop-supplied
// `plan` is the fallback if the fetch fails. The disposed flag
// mirrors the React section's `cancelled` effect guard.
let cancelled = false
onScopeDispose(() => {
  cancelled = true
})
http
  .get<{ name?: string }>('/api/billing/status')
  .then((res) => {
    if (cancelled) return
    const body =
      (res as { data?: { name?: string }; name?: string }).data ?? (res as { name?: string })
    const name = body?.name
    if (typeof name === 'string' && name) livePlan.value = name
  })
  .catch((_error) => {
    /* fallback to the prop-supplied plan label */
  })

function upgrade(): void {
  router.push(props.upgradeTo)
}
</script>

<template>
  <section>
    <h3 :class="cm.cn(cm.sectionHeading, cm.sp('mb', 3))">{{ t('settings.billing') }}</h3>
    <Flex align="center" justify="between">
      <span :class="cm.textSize('sm')">
        {{ t('settings.plan') }}
        <strong>{{ livePlan ?? plan }}</strong>
      </span>
      <Button variant="outline" size="sm" @click="upgrade">
        {{ t('settings.upgrade') }}
      </Button>
    </Flex>
  </section>
</template>
