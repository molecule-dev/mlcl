import { useNavigate } from '@solidjs/router'
import { createSignal, onCleanup, onMount } from 'solid-js'

import { createHttpHelpers, useTranslate } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex } from '@molecule/app-ui-solid'

/**
 * Billing section — current plan + Upgrade button.
 *
 * Fetches `/api/billing/status` on mount and uses the returned plan
 * name as a more accurate label than the parent-supplied default.
 * The `plan` prop remains a fallback (e.g. for offline rendering or
 * apps that don't expose `/billing/status`).
 *
 * The Upgrade button navigates to `upgradeTo` (default `/settings`).
 * Pass `upgradeTo="/billing"` or `upgradeTo="/pricing"` if your app
 * routes elsewhere. Apps with a multi-tier checkout flow should use
 * a tiers upgrade section instead.
 */
export function BillingSection({
  plan = 'Free',
  upgradeTo = '/settings',
}: { plan?: string; upgradeTo?: string } = {}) {
  const cm = getClassMap()
  const t = useTranslate()
  const navigate = useNavigate()
  const http = createHttpHelpers()
  const [livePlan, setLivePlan] = createSignal<string | null>(null)

  // Refresh the current plan from the bonded entitlements/billing
  // status endpoint on mount. Fire-and-forget; the prop-supplied
  // `plan` is the fallback if the fetch fails.
  onMount(() => {
    let cancelled = false
    onCleanup(() => {
      cancelled = true
    })
    http
      .get<{ name?: string }>('/api/billing/status')
      .then((res) => {
        if (cancelled) return
        const body =
          (res as { data?: { name?: string }; name?: string }).data ?? (res as { name?: string })
        const name = body?.name
        if (typeof name === 'string' && name) setLivePlan(name)
      })
      .catch((_error) => {
        /* fallback to the prop-supplied plan label */
      })
  })

  return (
    <section>
      <h3 class={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>{t('settings.billing')}</h3>
      <Flex align="center" justify="between">
        <span class={cm.textSize('sm')}>
          {t('settings.plan')}
          <strong>{livePlan() ?? plan}</strong>
        </span>
        <Button variant="outline" size="sm" onClick={() => navigate(upgradeTo)}>
          {t('settings.upgrade')}
        </Button>
      </Flex>
    </section>
  )
}
