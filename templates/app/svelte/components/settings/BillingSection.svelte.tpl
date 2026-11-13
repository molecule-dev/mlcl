<script lang="ts">
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import type { RouteIdWithSearchOrHash } from '$app/types'

  import { getClient } from '@molecule/app-http'
  import { getClassMap } from '@molecule/app-ui'

  import { createAppI18nStores } from '../../lib/i18n.js'
  import Button from '../Button.svelte'
  import Flex from '../Flex.svelte'

  // Billing section — current plan + Upgrade button.
  //
  // Fetches `/api/billing/status` on mount and uses the returned plan name as
  // a more accurate label than the default. The `plan` prop remains a fallback
  // (e.g. for offline rendering or apps that don't expose `/billing/status`).
  // The Upgrade button navigates to `upgradeTo` (default `/settings`); pass
  // `/billing` or `/pricing` if your app routes elsewhere.

  let {
    plan = 'Free',
    upgradeTo = '/settings',
  }: {
    /** Fallback plan label when the billing status endpoint has no name. */
    plan?: string
    /** Where the Upgrade button navigates. */
    upgradeTo?: RouteIdWithSearchOrHash
  } = $props()

  const cm = getClassMap()
  const { t } = createAppI18nStores()
  const http = getClient()

  let livePlan = $state<string | null>(null)

  // Refresh the current plan from the bonded entitlements/billing status
  // endpoint on mount. Fire-and-forget; the `plan` prop is the fallback if
  // the fetch fails.
  $effect(() => {
    let cancelled = false
    http
      .get<{ data?: { name?: string }; name?: string }>('/api/billing/status')
      .then((res) => {
        if (cancelled) return
        const body = res.data ?? res
        const name = body?.name
        if (typeof name === 'string' && name) livePlan = name
      })
      .catch((_error) => {
        // Fallback to the prop-supplied plan label.
      })
    return () => {
      cancelled = true
    }
  })
</script>

<section>
  <h3 class={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>{$t('settings.billing')}</h3>
  <Flex align="center" justify="between">
    <span class={cm.textSize('sm')}>
      {$t('settings.plan')}
      <strong>{livePlan ?? plan}</strong>
    </span>
    <Button variant="outline" size="sm" onclick={() => goto(resolve(upgradeTo))}>
      {$t('settings.upgrade')}
    </Button>
  </Flex>
</section>
