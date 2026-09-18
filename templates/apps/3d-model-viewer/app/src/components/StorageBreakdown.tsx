import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const STORAGE_LIMIT_BYTES = 50 * 1024 * 1024 * 1024 // 50 GB free-tier ceiling

function bytesToGB(bytes: number): number {
  return bytes / (1024 * 1024 * 1024)
}

function classify(model: unknown): 'models' | 'textures' | 'other' {
  const m = model as { name?: unknown; format?: unknown } | null
  const name = String(m?.name ?? '').toLowerCase()
  const fmt = String(m?.format ?? '').toLowerCase()
  if (
    /\.(glb|gltf|obj|fbx|stl|usdz)$/.test(name) ||
    ['glb', 'gltf', 'obj', 'fbx', 'stl', 'usdz'].includes(fmt)
  )
    return 'models'
  if (
    /\.(png|jpg|jpeg|webp|tga|exr|hdr|ktx2)$/.test(name) ||
    ['png', 'jpg', 'jpeg', 'webp', 'tga', 'exr', 'hdr', 'ktx2'].includes(fmt)
  )
    return 'textures'
  return 'other'
}

function StorageBreakdown() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [byBucket, setByBucket] = useState<{ models: number; textures: number; other: number }>({
    models: 0,
    textures: 0,
    other: 0,
  })

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
        const acc = { models: 0, textures: 0, other: 0 }
        for (const entry of list) {
          const size = Number((entry as { file_size?: unknown })?.file_size ?? 0)
          acc[classify(entry)] += size
        }
        setByBucket(acc)
      })
      .catch((_error) => {
        // best-effort breakdown — silently show zeros on fetch failure
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const total = byBucket.models + byBucket.textures + byBucket.other
  const pctOfLimit = STORAGE_LIMIT_BYTES > 0 ? Math.round((total / STORAGE_LIMIT_BYTES) * 100) : 0
  const slice = (n: number) => (total === 0 ? 0 : (n / total) * 100)
  const sliceModels = slice(byBucket.models)
  const sliceTextures = slice(byBucket.textures)
  const conic =
    total === 0
      ? 'conic-gradient(var(--color-surface-container-highest) 0% 100%)'
      : `conic-gradient(var(--color-primary) 0% ${sliceModels}%, var(--color-secondary) ${sliceModels}% ${sliceModels + sliceTextures}%, var(--color-inverse-primary) ${sliceModels + sliceTextures}% 100%)`

  return (
    <div
      data-mol-id="storage-breakdown"
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('p', 8),
        'bg-surface-container-low rounded-xl',
      )}
    >
      <h3 className={cm.cn(cm.textSize('lg'), cm.sp('mb', 6), 'font-headline text-on-surface')}>
        {t('storageBreakdown.title', {}, { defaultValue: 'Storage Breakdown' })}
      </h3>
      <div
        className={cm.cn(
          cm.flex1,
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        )}
      >
        <div
          className={cm.cn(cm.roundedFull, cm.w(40), cm.h(40), 'relative')}
          style={{ background: conic }}
        >
          <div
            className={cm.cn(
              cm.roundedFull,
              cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
              'absolute inset-2 bg-surface-container-low',
            )}
          >
            <span
              data-mol-id="storage-breakdown-percent"
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('semibold'),
                'font-headline text-on-surface',
              )}
            >
              {t(
                'storageBreakdown.usagePercent',
                { percent: pctOfLimit },
                { defaultValue: '{{percent}}%' },
              )}
            </span>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant uppercase tracking-wider',
              )}
            >
              {t('storageBreakdown.usedLabel', {}, { defaultValue: 'Used' })}
            </span>
          </div>
        </div>
      </div>
      <div className={cm.cn(cm.stack(3), cm.sp('mt', 8))}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('sm'))}>
          <div className={cm.flex({ align: 'center', gap: 2 })}>
            <div className={cm.cn(cm.roundedFull, cm.w(3), cm.h(3), 'bg-primary')}></div>
            <span className="text-on-surface">
              {t('storageBreakdown.models3dCategory', {}, { defaultValue: '3D Models (GLB/OBJ)' })}
            </span>
          </div>
          <span data-mol-id="storage-breakdown-models" className="font-mono text-secondary">
            {t(
              'storageBreakdown.modelsSize',
              { size: bytesToGB(byBucket.models).toFixed(2) },
              { defaultValue: '{{size}} GB' },
            )}
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('sm'))}>
          <div className={cm.flex({ align: 'center', gap: 2 })}>
            <div className={cm.cn(cm.roundedFull, cm.w(3), cm.h(3), 'bg-tertiary')}></div>
            <span className="text-on-surface">
              {t('storageBreakdown.texturesCategory', {}, { defaultValue: 'Textures (PNG/JPG)' })}
            </span>
          </div>
          <span data-mol-id="storage-breakdown-textures" className="font-mono text-secondary">
            {t(
              'storageBreakdown.texturesSize',
              { size: bytesToGB(byBucket.textures).toFixed(2) },
              { defaultValue: '{{size}} GB' },
            )}
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('sm'))}>
          <div className={cm.flex({ align: 'center', gap: 2 })}>
            <div className={cm.cn(cm.roundedFull, cm.w(3), cm.h(3), 'bg-inverse-primary')}></div>
            <span className="text-on-surface">
              {t('storageBreakdown.otherCategory', {}, { defaultValue: 'Other Assets' })}
            </span>
          </div>
          <span data-mol-id="storage-breakdown-other" className="font-mono text-secondary">
            {t(
              'storageBreakdown.otherSize',
              { size: bytesToGB(byBucket.other).toFixed(2) },
              { defaultValue: '{{size}} GB' },
            )}
          </span>
        </div>
      </div>
    </div>
  )
}

export default StorageBreakdown
export { StorageBreakdown }
