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
      // `res.ok` proves only that the route answered. The body is not a
      // contract: a route that is mounted without its handler (or a mock API
      // server with no fixture for it) answers 200 with an empty object, and
      // `window.location.href = undefined` navigates the browser to
      // `/undefined` — the error state below is never reached. Validate the
      // value before it becomes a navigation target.
      const { url } = (await res.json().catch(() => ({}))) as { url?: unknown }
      if (typeof url !== 'string' || url.length === 0) {
        setError(
          t('billing.portalFailed', undefined, {
            defaultValue: 'Could not open the billing portal — try again.',
          }),
        )
        return
      }
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
