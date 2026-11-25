import { useEffect, useState } from 'react'
import { serverErrorMessage } from '@molecule/app-http'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Flex, Modal } from '@molecule/app-ui-react-native'
import { openUrl } from '@molecule/app-utilities'

/** The user's plan, as `GET /billing/status` reports it. */
interface BillingStatus {
  planKey?: string
  name?: string
  isFree?: boolean
}

/** One tier, as `GET /billing/tiers` lists it. A price without an id is not for sale. */
interface PricingTier {
  key: string
  name: string
  prices: Array<{ stripePriceId: string | null; period: string; price: string }>
}

/**
 * The settings panel's billing section: the user's plan, an Upgrade button when something is
 * for sale (a price the server lists with a price id), and Cancel for a paid plan. Subscribe
 * starts a checkout and leaves for the URL the server returns; after a cancel the plan is read
 * again, since the server decides what it is now.
 */
export function BillingSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [tiers, setTiers] = useState<PricingTier[]>([])
  const [statusVersion, setStatusVersion] = useState(0)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [upgradeError, setUpgradeError] = useState('')
  const [cancelError, setCancelError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      // A failed read keeps what the section shows; there is nothing to guess in its place.
      http.get<BillingStatus>('/billing/status').catch((_error) => null),
      http.get<{ data?: PricingTier[] }>('/billing/tiers').catch((_error) => null),
    ]).then(([statusRes, tiersRes]) => {
      if (cancelled) return
      if (statusRes?.data) setStatus(statusRes.data)
      if (Array.isArray(tiersRes?.data?.data)) setTiers(tiersRes.data.data)
    })
    return () => {
      cancelled = true
    }
  }, [http, statusVersion])

  const isFree = status?.isFree ?? true
  const forSale = tiers
    .filter((tier) => tier.key !== status?.planKey)
    .flatMap((tier) =>
      tier.prices.flatMap((price) =>
        price.stripePriceId ? [{ tier, price, priceId: price.stripePriceId }] : [],
      ),
    )

  const subscribe = async (priceId: string) => {
    setUpgradeError('')
    setLoading(priceId)
    try {
      const res = await http.post<{ checkoutUrl?: string; updated?: boolean }>(
        '/billing/checkout',
        { priceId },
      )
      if (res.data?.checkoutUrl) {
        openUrl(res.data.checkoutUrl)
        return
      }
      if (res.data?.updated) {
        setShowUpgrade(false)
        setStatusVersion((version) => version + 1)
        return
      }
      setUpgradeError(t('settings.billing.checkoutFailed'))
    } catch (err) {
      setUpgradeError(serverErrorMessage(err) ?? t('settings.billing.checkoutFailed'))
    } finally {
      setLoading(null)
    }
  }

  const cancel = async () => {
    setCancelError('')
    setLoading('cancel')
    try {
      await http.post('/billing/cancel', {})
      setShowCancel(false)
      setStatusVersion((version) => version + 1)
    } catch (err) {
      setShowCancel(false)
      setCancelError(serverErrorMessage(err) ?? t('settings.billing.cancelFailed'))
    } finally {
      setLoading(null)
    }
  }

  return (
    <section>
      <h3 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>{t('settings.billing')}</h3>
      <Flex align="center" justify="between">
        {status?.name ? (
          <span className={cm.textSize('sm')}>
            {t('settings.plan')}
            <strong>{status.name}</strong>
          </span>
        ) : (
          <span />
        )}
        {isFree ? (
          forSale.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => setShowUpgrade(true)}>
              {t('settings.upgrade')}
            </Button>
          ) : null
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCancel(true)}
            testId="billing-cancel-subscription"
          >
            {t('settings.billing.cancel')}
          </Button>
        )}
      </Flex>
      {cancelError ? (
        <Alert status="error" className={cm.sp('mt', 3)}>
          {cancelError}
        </Alert>
      ) : null}

      <Modal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title={t('settings.billing.upgradeTitle')}
      >
        {upgradeError ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {upgradeError}
          </Alert>
        ) : null}
        <ul className={cm.stack(3)}>
          {forSale.map(({ tier, price, priceId }) => (
            <li key={`${tier.key}-${priceId}`} className={cm.sp('p', 4)}>
              <Flex align="center" justify="between">
                <div>
                  <p className={cm.fontWeight('semibold')}>
                    {tier.name} ({price.period})
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>{price.price}</p>
                </div>
                <Button size="sm" loading={loading === priceId} onClick={() => subscribe(priceId)}>
                  {t('settings.billing.subscribe')}
                </Button>
              </Flex>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        title={t('settings.billing.cancelConfirm')}
      >
        <Flex justify="end">
          <Button
            color="error"
            loading={loading === 'cancel'}
            onClick={cancel}
            testId="billing-cancel-confirm"
          >
            {t('settings.billing.cancel')}
          </Button>
        </Flex>
      </Modal>
    </section>
  )
}
