import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

export function ExportButton({
  endpoint,
  filterParams = {},
}: {
  endpoint: string
  filterParams?: Record<string, string | undefined>
}) {
  const { t } = useTranslation()

  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(filterParams)) {
    if (value) qs.set(key, value)
  }
  // The endpoint may already carry a query string (`/api/orders/export?format=csv`):
  // appending an unconditional `?` made everything after it part of the LAST
  // parameter's value, so the download hit a different query than the one asked
  // for.
  const query = qs.toString()
  const href = `${endpoint}${query ? (endpoint.includes('?') ? '&' : '?') + query : ''}`

  return (
    <a href={href} download className={cm.button({ variant: 'outline' })}>
      {t('export.csv', undefined, { defaultValue: 'Export CSV' })}
    </a>
  )
}
