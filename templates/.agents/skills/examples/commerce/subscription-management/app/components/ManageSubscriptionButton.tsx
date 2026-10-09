import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

export function ManageSubscriptionButton() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function open(): Promise<void> {
    setLoading(true)
    setError(null)
    // finally clears the busy state on EVERY path — a rejected fetch (offline,
    // server restart) must not leave the button disabled forever; the catch
    // surfaces the failure instead of a silently dead button.
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      if (!res.ok) {
        setError(
          t('billing.portalFailed', undefined, {
            defaultValue: 'Could not open the billing portal — try again.',
          }),
        )
        return
      }
      const { url } = (await res.json()) as { url: string }
      window.location.href = url
    } catch (_error) {
      setError(
        t('billing.portalFailed', undefined, {
          defaultValue: 'Could not open the billing portal — try again.',
        }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
      <button onClick={open} disabled={loading} className={cm.button({ variant: 'outline' })}>
        {loading
          ? t('billing.opening', undefined, { defaultValue: 'Opening…' })
          : t('billing.manage', undefined, { defaultValue: 'Manage subscription' })}
      </button>
      {error ? <p className={cm.textError}>{error}</p> : null}
    </div>
  )
}
