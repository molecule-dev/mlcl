import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function StatCard() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const http = useHttpClient()
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/models')
      .then((res: unknown) => {
        if (cancelled) return
        const list = Array.isArray(res)
          ? res
          : Array.isArray((res as { data?: unknown[] })?.data)
            ? (res as { data: unknown[] }).data
            : []
        setCount(list.length)
      })
      .catch((_error) => {
        // best-effort stat — show 0 on fetch failure
        if (!cancelled) setCount(0)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const display = count ?? 0
  return (
    <div
      data-mol-id="stat-models-total"
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-xl shadow-[0_12px_40px_rgba(15,15,35,0.06)]',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(10),
            cm.h(10),
            cm.textPrimary,
            'rounded-xl bg-surface-container-low',
          )}
        >
          <span className="material-symbols-outlined">view_in_ar</span>
        </div>
      </div>
      <div>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.sp('mb', 1),
            'text-on-surface-variant',
          )}
        >
          {t('statCard.label', {}, { defaultValue: 'Total Models' })}
        </p>
        <p
          data-mol-id="stat-models-total-value"
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('semibold'),
            'font-headline text-on-surface',
          )}
        >
          {display.toLocaleString()}
        </p>
      </div>
    </div>
  )
}
export { StatCard }
