import { useState } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-react'

const cm = getClassMap()

export function ManageSubscriptionButton() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  async function open(): Promise<void> {
    setLoading(true)
    const res = await fetch('/api/billing/portal', { method: 'POST' })
    setLoading(false)
    if (!res.ok) return
    const { url } = (await res.json()) as { url: string }
    window.location.href = url
  }

  return (
    <button onClick={open} disabled={loading} className={cm.button({ variant: 'outline' })}>
      {loading
        ? t('billing.opening', undefined, { defaultValue: 'Opening…' })
        : t('billing.manage', undefined, { defaultValue: 'Manage subscription' })}
    </button>
  )
}
