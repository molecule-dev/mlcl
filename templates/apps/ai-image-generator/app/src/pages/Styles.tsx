import { useCallback, useEffect, useRef, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AiImageGeneratorLayout } from '../components/AiImageGeneratorLayout.js'
import { AiImageGeneratorTopBar } from '../components/AiImageGeneratorTopBar.js'
import { type StylePreset, StylePresetCard } from '../components/StylePresetCard.js'
import { adaptStyle } from '../lib/api-adapters.js'

interface StyleRow extends Record<string, unknown> {
  id?: string
  name?: string
}

export function Styles() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [active, setActive] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [rows, setRows] = useState<StyleRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refetch = useCallback(async () => {
    try {
      const res = await http.get<StyleRow[]>('/api/styles')
      if (!mountedRef.current) return
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (e: unknown) {
      if (!mountedRef.current) return
      setError(e instanceof Error ? e.message : 'Failed to load styles')
      setRows([])
    }
  }, [http])

  useEffect(() => {
    refetch().catch(() => {})
  }, [refetch])

  const select = useCallback(
    async (presetId: string, dbId: string) => {
      setActive(presetId)
      setPendingId(presetId)
      try {
        await http.post(`/api/styles/${dbId}/activate`, {})
      } catch (error) {
        logError('styles.select', error)
      } finally {
        setPendingId(null)
      }
    },
    [http],
  )

  const presets: { row: StyleRow; preset: StylePreset }[] = (rows ?? []).map((row) => ({
    row,
    preset: adaptStyle(row),
  }))

  return (
    <AiImageGeneratorLayout>
      <AiImageGeneratorTopBar
        title={t('styles.title', {}, { defaultValue: 'Style library' })}
        subtitle={t(
          'styles.subtitle',
          { appName: APP_NAME },
          { defaultValue: 'Curated visual presets crafted by the {{appName}} studio team' },
        )}
      />
      <div className={cm.cn(cm.sp('p', 8), cm.flex({ direction: 'col', gap: 'lg' }))}>
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            cm.sp('p', 6),
            'rounded-3xl bg-gradient-to-br from-primary-container/40 via-surface-container-lowest to-secondary-container/30 border border-outline-variant/10',
          )}
        >
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('styles.eyebrow', {}, { defaultValue: 'Curated' })}
          </span>
          <h2 className={cm.cn(cm.fontWeight('bold'), 'text-2xl tracking-tight text-on-surface')}>
            {t(
              'styles.headline',
              {},
              { defaultValue: 'Conjure faster with reusable visual presets' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-2xl')}>
            {t(
              'styles.body',
              {},
              {
                defaultValue:
                  'Each preset bundles its own model, sampler, prompt scaffolding and style chips. Activate one to lock the entire studio into that mood — perfect for series work.',
              },
            )}
          </p>
        </section>

        {rows === null ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('styles.loading', {}, { defaultValue: 'Loading style library…' })}
          </p>
        ) : error ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p>
        ) : presets.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'styles.empty',
              {},
              { defaultValue: 'No style presets yet — they will appear after first sign-in.' },
            )}
          </p>
        ) : (
          <div className={cm.cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4')}>
            {presets.map(({ row, preset }) => (
              <StylePresetCard
                key={String(row.id ?? preset.id)}
                preset={preset}
                active={preset.id === active}
                pending={pendingId === preset.id}
                onSelect={(id) => select(id, String(row.id ?? '')).catch(() => {})}
              />
            ))}
          </div>
        )}
      </div>
    </AiImageGeneratorLayout>
  )
}

export default Styles
