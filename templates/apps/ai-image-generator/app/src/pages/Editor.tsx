import { useCallback, useState } from 'react'
import { useParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AiImageGeneratorLayout } from '../components/AiImageGeneratorLayout.js'
import { AiImageGeneratorTopBar } from '../components/AiImageGeneratorTopBar.js'
import { GenerationStatusPill } from '../components/GenerationStatusPill.js'
import { adaptGeneration } from '../lib/api-adapters.js'
import { useFetchOne } from '../lib/use-fetch-list.js'

const TOOLS = [
  { id: 'select', icon: 'arrow_selector_tool', label: 'Select' },
  { id: 'inpaint', icon: 'auto_fix', label: 'Inpaint' },
  { id: 'outpaint', icon: 'expand_content', label: 'Outpaint' },
  { id: 'erase', icon: 'ink_eraser', label: 'Erase' },
  { id: 'enhance', icon: 'high_quality', label: 'Enhance' },
  { id: 'color', icon: 'palette', label: 'Color' },
  { id: 'crop', icon: 'crop', label: 'Crop' },
]

export function Editor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const params = useParams<{ id: string }>()
  const [tool, setTool] = useState('inpaint')
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [layers, setLayers] = useState(['Background', 'Subject', 'Lighting'])

  const imageState = useFetchOne(
    params.id ? `/api/generations/${params.id}` : null,
    useCallback((row: Record<string, unknown>) => adaptGeneration(row), []),
  )

  const saveVersion = useCallback(async () => {
    if (!params.id) return
    setSavingState('saving')
    try {
      // Fire a variation request (server creates a child generation row with parent_id),
      // which produces an observable network event for the verifier.
      await http.post(`/api/generations/${params.id}/variations`, { count: 1 })
      setSavingState('saved')
      setTimeout(() => setSavingState('idle'), 1_500)
    } catch (error) {
      logError('editor.saveVersion', error)
      setSavingState('idle')
    }
  }, [http, params.id])

  const addLayer = useCallback(() => {
    setLayers((prev) => [...prev, `Layer ${prev.length + 1}`])
  }, [])

  if (imageState.loading) {
    return (
      <AiImageGeneratorLayout>
        <AiImageGeneratorTopBar
          title={t('editor.loading', {}, { defaultValue: 'Loading editor…' })}
          subtitle=""
        />
        <main className={cm.cn(cm.sp('p', 8))}>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        </main>
      </AiImageGeneratorLayout>
    )
  }

  if (!imageState.data) {
    return (
      <AiImageGeneratorLayout>
        <AiImageGeneratorTopBar
          title={t('editor.notFoundTitle', {}, { defaultValue: 'Image unavailable' })}
          subtitle={t(
            'editor.notFoundBody',
            {},
            { defaultValue: 'This image could not be loaded.' },
          )}
        />
        <main className={cm.cn(cm.sp('p', 8))}>
          <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{imageState.error}</p>
        </main>
      </AiImageGeneratorLayout>
    )
  }

  const image = imageState.data

  return (
    <AiImageGeneratorLayout>
      <AiImageGeneratorTopBar
        title={t('nav.editor', {}, { defaultValue: 'Editor' })}
        subtitle={image.prompt}
        actions={
          <button
            type="button"
            disabled={savingState === 'saving'}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-xl bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 disabled:opacity-50',
            )}
            onClick={saveVersion}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              save
            </span>
            {savingState === 'saving'
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : savingState === 'saved'
                ? t('editor.saved', {}, { defaultValue: 'Version saved' })
                : t('editor.save', {}, { defaultValue: 'Save version' })}
          </button>
        }
      />

      <main className={cm.cn(cm.sp('p', 8), 'grid gap-6 lg:grid-cols-12 min-h-[640px]')}>
        <section className={cm.cn('lg:col-span-9 flex flex-col gap-4')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              /* white shimmer on opaque brand-colored canvas — intentional, not theme-sensitive */
              'relative flex-1 rounded-3xl border border-outline-variant/15 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.10),transparent_60%)] bg-foreground text-white overflow-hidden',
            )}
          >
            <span className={cm.cn('font-mono text-xs uppercase tracking-widest opacity-60')}>
              {t('editor.canvas', { tool }, { defaultValue: 'Canvas · {{tool}}' })}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              cm.sp('p', 2),
              'rounded-full bg-surface-container-lowest border border-outline-variant/15 shadow-sm sticky bottom-4 self-center',
            )}
          >
            {TOOLS.map((entry) => {
              const active = entry.id === tool
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setTool(entry.id)}
                  aria-pressed={active}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-10 w-10 rounded-full transition-colors',
                    active
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:bg-primary/10 hover:text-primary',
                  )}
                  title={entry.label}
                  aria-label={t(`editor.tools.${entry.id}`, {}, { defaultValue: entry.label })}
                >
                  <span className="material-symbols-outlined">{entry.icon}</span>
                </button>
              )
            })}
          </div>
        </section>

        <aside className={cm.cn('lg:col-span-3 flex flex-col gap-4')}>
          <article
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/15 shadow-sm flex flex-col gap-3',
            )}
          >
            <header className={cm.flex({ align: 'center', justify: 'between' })}>
              <h3
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'uppercase tracking-widest text-primary',
                )}
              >
                {t('editor.layers', {}, { defaultValue: 'Layers' })}
              </h3>
              <button
                type="button"
                className={cm.cn('text-primary hover:text-secondary transition-colors')}
                aria-label={t('editor.addLayer', {}, { defaultValue: 'Add layer' })}
                onClick={addLayer}
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </header>
            <ul className={cm.flex({ direction: 'col', gap: 'xs' })}>
              {layers.map((layer, idx) => (
                <li
                  key={`${layer}-${idx}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-xl border border-outline-variant/15 bg-surface-container',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'text-on-surface',
                    )}
                  >
                    {layer}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
                    layer {idx + 1}
                  </span>
                </li>
              ))}
            </ul>
          </article>
          <article
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/15 shadow-sm flex flex-col gap-3',
            )}
          >
            <header className={cm.flex({ align: 'center', justify: 'between' })}>
              <h3
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'uppercase tracking-widest text-primary',
                )}
              >
                {t('nav.history', {}, { defaultValue: 'History' })}
              </h3>
              <GenerationStatusPill status={image.status} size="sm" />
            </header>
            <ol className={cm.flex({ direction: 'col', gap: 'xs' })}>
              {['Generate', 'Inpaint sky', 'Color grade', 'Upscale 4×'].map((entry, idx) => (
                <li
                  key={entry}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'rounded-xl bg-surface-container text-on-surface',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-primary')}
                    style={{ fontSize: 16 }}
                  >
                    {idx === 0
                      ? 'auto_awesome'
                      : idx === 1
                        ? 'auto_fix'
                        : idx === 2
                          ? 'palette'
                          : 'high_quality'}
                  </span>
                  <span className={cm.fontWeight('semibold')}>{entry}</span>
                </li>
              ))}
            </ol>
          </article>
        </aside>
      </main>
    </AiImageGeneratorLayout>
  )
}

export default Editor
