import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const STORAGE_LIMIT_BYTES = 50 * 1024 * 1024 * 1024 // 50 GB free-tier ceiling

function StorageStatCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [usedBytes, setUsedBytes] = useState(0)

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
        const total = list.reduce(
          (sum: number, m: unknown) => sum + Number((m as { file_size?: unknown })?.file_size ?? 0),
          0,
        )
        setUsedBytes(total)
      })
      .catch((_error) => {
        // best-effort stat — silently show 0 on fetch failure
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const usedGB = usedBytes / (1024 * 1024 * 1024)
  const pct = STORAGE_LIMIT_BYTES > 0 ? (usedBytes / STORAGE_LIMIT_BYTES) * 100 : 0
  const usedDisplay = usedGB >= 1 ? usedGB.toFixed(1) : (usedBytes / (1024 * 1024)).toFixed(1)
  const unitLabel =
    usedGB >= 1
      ? t('storageStatCard.unit', {}, { defaultValue: 'GB' })
      : t('storageStatCard.unitMb', {}, { defaultValue: 'MB' })

  return (
    <div
      data-mol-id="stat-storage"
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
          <span className="material-symbols-outlined">sd_storage</span>
        </div>
        <span className={cm.cn(cm.textSize('xs'), 'font-mono text-secondary')}>
          {t(
            'storageStatCard.storageLimit',
            { limit: '50GB' },
            { defaultValue: '{{limit}} Limit' },
          )}
        </span>
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
          {t('storageStatCard.storageUsed', {}, { defaultValue: 'Storage Used' })}
        </p>
        <div className={cm.cn(cm.flex({ align: 'end', gap: 2 }), cm.sp('mb', 2))}>
          <p
            data-mol-id="stat-storage-value"
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('semibold'),
              'font-headline text-on-surface',
            )}
          >
            {usedDisplay}
            <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('medium'), 'text-secondary')}>
              {unitLabel}
            </span>
          </p>
        </div>
        <div className={cm.cn(cm.roundedFull, cm.w('full'), 'bg-surface-container-high h-1.5')}>
          <div
            className={cm.cn(cm.roundedFull, 'bg-primary h-1.5')}
            style={{ width: `${Math.min(100, pct).toFixed(1)}%` }}
          ></div>
        </div>
      </div>
    </div>
  )
}

export default StorageStatCard
export { StorageStatCard }
