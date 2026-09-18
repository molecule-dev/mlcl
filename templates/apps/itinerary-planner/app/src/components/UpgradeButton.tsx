import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex } from '@molecule/app-ui-react'

interface TierPriceShape {
  stripePriceId: string | null
  period: string
  price: string
}

interface TierShape {
  key: string
  name: string
  prices: TierPriceShape[]
}

/**
 * Direct-checkout upgrade button used in the Settings panel.
 *
 * Fetches `/api/billing/tiers` on mount, then renders a single
 * "Upgrade" button that — on click — POSTs `/api/billing/checkout`
 * with the first available paid `stripePriceId` and redirects to
 * the returned Stripe Checkout URL.
 */
export function UpgradeButton() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [planKey, setPlanKey] = useState<string>('free')
  const [planName, setPlanName] = useState<string>('Free')
  const [firstPriceId, setFirstPriceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get<{ planKey?: string; name?: string }>('/api/billing/status').catch(() => null),
      http.get<{ data?: TierShape[] }>('/api/billing/tiers').catch(() => null),
    ])
      .then(([statusRes, tiersRes]) => {
        if (cancelled) return
        const status =
          (statusRes as { data?: { planKey?: string; name?: string } } | null)?.data ??
          (statusRes as { planKey?: string; name?: string } | null)
        if (status?.planKey) setPlanKey(status.planKey)
        if (status?.name) setPlanName(status.name)
        const list =
          (tiersRes as { data?: { data?: TierShape[] } } | null)?.data?.data ??
          (tiersRes as { data?: TierShape[] } | null)?.data ??
          []
        const priced = (Array.isArray(list) ? list : [])
          .filter((tier) => tier.key !== 'free')
          .flatMap((tier) => tier.prices || [])
          .find((p) => typeof p.stripePriceId === 'string' && p.stripePriceId.length > 0)
        if (priced?.stripePriceId) setFirstPriceId(priced.stripePriceId)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http])

  const handleClick = async () => {
    if (!firstPriceId) return
    setLoading(true)
    try {
      const res = await http.post<{ checkoutUrl?: string }>('/api/billing/checkout', {
        priceId: firstPriceId,
      })
      const data =
        (res as { data?: { checkoutUrl?: string } }).data ?? (res as { checkoutUrl?: string })
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (_error) {
      /* surfaced by global error boundary */
    } finally {
      setLoading(false)
    }
  }

  if (planKey !== 'free') return null

  return (
    <Flex align="center" justify="between" className={cm.sp('mt', 3)}>
      <span className={cm.textSize('sm')} data-mol-id="settings-plan-name">
        {planName}
      </span>
      <Button
        variant="solid"
        size="sm"
        loading={loading}
        disabled={!firstPriceId}
        onClick={handleClick}
        testId="settings-upgrade-button"
        data-mol-id="settings-upgrade-button"
      >
        {t('settings.upgrade', undefined, { defaultValue: 'Upgrade' })}
      </Button>
    </Flex>
  )
}
