import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import MobileBottomNav from '../components/MobileBottomNav.js'
import ModelEditActionBar from '../components/ModelEditActionBar.js'
import ModelEditMetadataPanel from '../components/ModelEditMetadataPanel.js'
import ModelEditPreviewPanel from '../components/ModelEditPreviewPanel.js'
import ModelEditRenderSettingsCard from '../components/ModelEditRenderSettingsCard.js'
import ModelEditSharingCard from '../components/ModelEditSharingCard.js'
import ModelEditSideNavBar from '../components/ModelEditSideNavBar.js'
import ModelEditTopBar from '../components/ModelEditTopBar.js'

export type ViewMode = 'Solid' | 'Wireframe' | 'Textured' | 'Matcap'

const VIEW_MODE_VALUES: ViewMode[] = ['Solid', 'Wireframe', 'Textured', 'Matcap']

function normalizeViewMode(env: unknown): ViewMode {
  if (typeof env !== 'string' || env.length === 0) return 'Textured'
  const candidate = (env.charAt(0).toUpperCase() + env.slice(1).toLowerCase()) as ViewMode
  return VIEW_MODE_VALUES.includes(candidate) ? candidate : 'Textured'
}

function ModelEdit() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const http = useHttpClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [hydrated, setHydrated] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('Textured')
  const [polycount, setPolycount] = useState(0)
  const [cameraPos, setCameraPos] = useState({ x: '0.000', y: '1.000', z: '3.000' })
  const [isPublic, setIsPublic] = useState(false)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/models/${id}`)
      .then((res: unknown) => {
        if (cancelled) return
        const model = ((res as { data?: Record<string, unknown> })?.data ?? res) as Record<
          string,
          unknown
        > | null
        if (!model || typeof model !== 'object') {
          setError(t('modelEdit.notFound', {}, { defaultValue: 'Model not found.' }))
          return
        }
        setName(typeof model.name === 'string' ? model.name : '')
        setDescription(typeof model.description === 'string' ? model.description : '')
        setCategory(typeof model.category === 'string' ? model.category : '')
        setTags(Array.isArray(model.tags) ? (model.tags as string[]) : [])
        setPolycount(Number(model.polygon_count ?? 0))
        setViewMode(normalizeViewMode(model.environment))
        setIsPublic(model.visibility === 'public')
        const camera = (model.camera_position ?? {}) as {
          x?: number | string
          y?: number | string
          z?: number | string
        }
        setCameraPos({
          x: Number(camera.x ?? 0).toFixed(3),
          y: Number(camera.y ?? 0).toFixed(3),
          z: Number(camera.z ?? 0).toFixed(3),
        })
        setHydrated(true)
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t('modelEdit.loadFailed', {}, { defaultValue: 'Failed to load model.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
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
        name,
        description,
        polygon_count: polycount,
        visibility: isPublic ? 'public' : 'private',
        environment: viewMode.toLowerCase(),
        camera_position: {
          x: Number(cameraPos.x),
          y: Number(cameraPos.y),
          z: Number(cameraPos.z),
        },
        category: category || null,
        tags,
      }
      await http.put(`/api/models/${id}`, payload)
      // Domain event: metadata save commits.
      void track({
        name: 'model.updated',
        properties: { modelId: id, visibility: isPublic ? 'public' : 'private' },
      })
      setSavedAt(Date.now())
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('modelEdit.saveFailed', {}, { defaultValue: 'Save failed' }),
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    if (!window.confirm(t('modelEdit.deleteConfirm', {}, { defaultValue: 'Delete this model?' })))
      return
    try {
      await http.delete(`/api/models/${id}`)
      // Domain event: destructive action committed.
      void track({ name: 'model.deleted', properties: { modelId: id } })
      navigate('/models')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('modelEdit.deleteFailed', {}, { defaultValue: 'Delete failed' }),
      )
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({}),
        cm.minH('screen'),
        'bg-background text-on-background overflow-hidden',
      )}
    >
      <ModelEditSideNavBar />
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.flex1,
          cm.h('screen'),
          'md:ml-[260px] overflow-hidden',
        )}
      >
        <ModelEditTopBar modelName={name} />
        <main
          className={cm.cn(cm.flex1, cm.sp('p', 8), 'overflow-y-auto pb-32')}
          data-mol-id="model-edit-main"
        >
          <div className={cm.cn(cm.maxW('6xl'), cm.mxAuto, cm.flex({ direction: 'col', gap: 8 }))}>
            {loading ? (
              <p
                data-mol-id="model-edit-loading"
                className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
              >
                {t('modelEdit.loading', {}, { defaultValue: 'Loading model…' })}
              </p>
            ) : null}
            {!loading && error && !hydrated ? (
              <p
                data-mol-id="model-edit-error"
                role="alert"
                className={cm.cn(cm.textSize('sm'), 'text-error')}
              >
                {error}
              </p>
            ) : null}
            {hydrated ? (
              <>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 8 }), 'lg:flex-row')}>
                  <ModelEditPreviewPanel />
                  <ModelEditMetadataPanel
                    name={name}
                    setName={setName}
                    description={description}
                    setDescription={setDescription}
                    category={category}
                    setCategory={setCategory}
                    tags={tags}
                    setTags={setTags}
                  />
                </div>
                <ModelEditRenderSettingsCard
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  polycount={polycount}
                  setPolycount={setPolycount}
                  cameraPos={cameraPos}
                  setCameraPos={setCameraPos}
                />
                <ModelEditSharingCard isPublic={isPublic} setIsPublic={setIsPublic} />
                <div className={cm.h(8)}></div>
              </>
            ) : null}
          </div>
        </main>
        {hydrated ? (
          <ModelEditActionBar
            onSave={handleSave}
            onCancel={() => navigate('/models')}
            onDelete={handleDelete}
            saving={saving}
            savedAt={savedAt}
            error={error}
          />
        ) : null}
      </div>
      {/* Mobile chrome: bottom tab bar below md */}
      <MobileBottomNav />
    </div>
  )
}

export default ModelEdit
export { ModelEdit, ModelEdit as ModelEditPage }
