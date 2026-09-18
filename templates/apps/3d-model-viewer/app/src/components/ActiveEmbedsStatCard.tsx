import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ActiveEmbedsStatCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/embeds')
      .then((res: unknown) => {
        if (cancelled) return
        const r = res as { data?: unknown[] } | unknown[]
        const list = Array.isArray(r)
          ? r
          : Array.isArray((r as { data?: unknown[] })?.data)
            ? (r as { data: unknown[] }).data
            : []
        setCount(list.length)
      })
      .catch((_error) => {
        // best-effort stat — silently show 0 on fetch failure
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      data-mol-id="stat-embeds"
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
          <span className="material-symbols-outlined">code</span>
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
          {t('activeEmbedsStatCard.label', {}, { defaultValue: 'Active Embeds' })}
        </p>
        <p
          data-mol-id="stat-embeds-value"
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('semibold'),
            'font-headline text-on-surface',
          )}
        >
          {count.toLocaleString()}
        </p>
      </div>
    </div>
  )
}

export default ActiveEmbedsStatCard
export { ActiveEmbedsStatCard }
