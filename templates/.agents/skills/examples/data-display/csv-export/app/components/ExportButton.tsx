import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-react'

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
  const href = `${endpoint}${qs.toString() ? `?${qs.toString()}` : ''}`

  return (
    <a href={href} download className={cm.button({ variant: 'outline' })}>
      {t('export.csv', undefined, { defaultValue: 'Export CSV' })}
    </a>
  )
}
