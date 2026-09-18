import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import EmbedCodeSnippet from '../components/EmbedCodeSnippet.js'
import EmbedDimensionsPanel from '../components/EmbedDimensionsPanel.js'
import EmbedInteractionPanel from '../components/EmbedInteractionPanel.js'
import EmbedPageHeader from '../components/EmbedPageHeader.js'
import EmbedPreviewPanel from '../components/EmbedPreviewPanel.js'
import EmbedSideNavBar from '../components/EmbedSideNavBar.js'
import EmbedThemePanel from '../components/EmbedThemePanel.js'
import EmbedTopBar from '../components/EmbedTopBar.js'

interface ExistingEmbed {
  id: string
  width: number
  height: number
  auto_rotate: boolean
  show_annotations: boolean
  theme: 'light' | 'dark'
}

function Embed() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [modelName, setModelName] = useState<string>('')
  const [embedId, setEmbedId] = useState<string | null>(null)
  const [width, setWidth] = useState(640)
  const [height, setHeight] = useState(480)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [autoRotate, setAutoRotate] = useState(true)
  const [showAnnotations, setShowAnnotations] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([
      http.get(`/api/models/${id}`).catch(() => null),
      http.get(`/api/embeds?model_id=${id}`).catch(() => []),
    ]).then(([model, embeds]: [unknown, unknown]) => {
      if (cancelled) return
      if (model && typeof model === 'object') {
        const m =
          (model as { data?: { name?: string; title?: string }; name?: string; title?: string })
            .data ?? (model as { name?: string; title?: string })
        setModelName(m?.name ?? m?.title ?? '')
      }
      const list = Array.isArray(embeds)
        ? embeds
        : Array.isArray((embeds as { data?: unknown[] })?.data)
          ? (embeds as { data: ExistingEmbed[] }).data
          : []
      const existing = list[0] as ExistingEmbed | undefined
      if (existing) {
        setEmbedId(existing.id)
        setWidth(Number(existing.width) || 640)
        setHeight(Number(existing.height) || 480)
        setTheme(existing.theme === 'light' ? 'light' : 'dark')
        setAutoRotate(Boolean(existing.auto_rotate))
        setShowAnnotations(Boolean(existing.show_annotations))
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (savedAt === null) return
    const timer = setTimeout(() => setSavedAt(null), 2500)
    return () => clearTimeout(timer)
  }, [savedAt])

  async function handleSave() {
    if (!id || saving) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        width,
        height,
        theme,
        auto_rotate: autoRotate,
        show_annotations: showAnnotations,
      }
      if (embedId) {
        await http.put(`/api/embeds/${embedId}`, payload)
      } else {
        const created = (await http.post('/api/embeds', { model_id: id, ...payload })) as {
          id?: string
          data?: { id?: string }
        }
        const newId = created?.id ?? created?.data?.id
        if (newId) setEmbedId(newId)
      }
      setSavedAt(Date.now())
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('embed.saveFailed', {}, { defaultValue: 'Save failed' }),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({}),
        cm.h('screen'),
        'bg-surface text-on-surface overflow-hidden antialiased',
      )}
      aria-label={t('embed.title', {}, { defaultValue: 'Embed model' })}
    >
      <EmbedSideNavBar />
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.flex1,
          'min-w-0 overflow-hidden relative bg-surface',
        )}
      >
        <EmbedTopBar modelName={modelName} modelId={id ?? ''} />
        <main
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            cm.flex1,
            cm.sp('p', 8),
            'overflow-y-auto',
          )}
        >
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <EmbedPageHeader />
            <button
              type="button"
              data-mol-id="embed-save"
              onClick={handleSave}
              disabled={saving || !id}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-xl bg-primary text-on-primary hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : embedId
                  ? t('common.saveChanges', {}, { defaultValue: 'Save changes' })
                  : t('embed.publish', {}, { defaultValue: 'Publish embed' })}
            </button>
          </div>
          {savedAt ? (
            <p
              data-mol-id="embed-saved"
              className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-primary')}
            >
              {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
            </p>
          ) : null}
          {error ? (
            <p
              data-mol-id="embed-error"
              role="alert"
              className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-error')}
            >
              {error}
            </p>
          ) : null}
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 8 }),
              cm.flex1,
              cm.sp('mb', 8),
              cm.minH('[0]'),
              'lg:flex-row',
            )}
          >
            <EmbedPreviewPanel />
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 6 }),
                cm.w('full'),
                cm.sp('pl', 0),
                'lg:w-2/5 lg:pl-4',
              )}
            >
              <EmbedDimensionsPanel
                width={width}
                height={height}
                setWidth={setWidth}
                setHeight={setHeight}
              />
              <EmbedInteractionPanel
                autoRotate={autoRotate}
                showAnnotations={showAnnotations}
                setAutoRotate={setAutoRotate}
                setShowAnnotations={setShowAnnotations}
              />
              <EmbedThemePanel theme={theme} setTheme={setTheme} />
            </div>
          </div>
          <EmbedCodeSnippet width={width} height={height} embedId={embedId} modelId={id ?? ''} />
        </main>
      </div>
    </div>
  )
}

export default Embed
export { Embed, Embed as EmbedPage }
