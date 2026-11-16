/** Loaded form fields use the bonded form controller: edit setters mark dirty; fill setters preserve edits. */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useForm, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import ModelEditActionBar from '../components/ModelEditActionBar.js'
import ModelEditMetadataPanel from '../components/ModelEditMetadataPanel.js'
import ModelEditPreviewPanel from '../components/ModelEditPreviewPanel.js'
import ModelEditRenderSettingsCard from '../components/ModelEditRenderSettingsCard.js'
import ModelEditSharingCard from '../components/ModelEditSharingCard.js'
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

  const [name, setName, fillName] = useForm({
    defaultValues: { name: '' },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify([id]),
  }).asState('name')
  const [description, setDescription, fillDescription] = useForm({
    defaultValues: { description: '' },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify([id]),
  }).asState('description')
  const [category, setCategory, fillCategory] = useForm({
    defaultValues: { category: '' },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify([id]),
  }).asState('category')
  const [tags, setTags, fillTags] = useForm({
    defaultValues: { tags: [] as string[] },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify([id]),
  }).asState('tags')
  const [viewMode, setViewMode, fillViewMode] = useForm({
    defaultValues: { viewMode: 'Textured' as ViewMode },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify([id]),
  }).asState('viewMode')
  const [polycount, setPolycount, fillPolycount] = useForm({
    defaultValues: { polycount: 0 },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify([id]),
  }).asState('polycount')
  const [cameraPos, setCameraPos, fillCameraPos] = useForm({
    defaultValues: { x: '0.000', y: '1.000', z: '3.000' },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify([id]),
  }).asState()
  const [isPublic, setIsPublic, fillIsPublic] = useForm({
    defaultValues: { isPublic: false },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify([id]),
  }).asState('isPublic')

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
        fillName(typeof model.name === 'string' ? model.name : '')
        fillDescription(typeof model.description === 'string' ? model.description : '')
        fillCategory(typeof model.category === 'string' ? model.category : '')
        fillTags(Array.isArray(model.tags) ? (model.tags as string[]) : [])
        fillPolycount(Number(model.polygon_count ?? 0))
        fillViewMode(normalizeViewMode(model.environment))
        fillIsPublic(model.visibility === 'public')
        const camera = (model.camera_position ?? {}) as {
          x?: number | string
          y?: number | string
          z?: number | string
        }
        fillCameraPos({
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
  }, [
    id,
    fillName,
    fillDescription,
    fillCategory,
    fillTags,
    fillPolycount,
    fillViewMode,
    fillIsPublic,
    fillCameraPos,
  ])

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
    // Confirmation is handled by the shared ConfirmButton (arm → confirm) that
    // wraps this handler in ModelEditActionBar — no window.confirm here.
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
        cm.flex({ direction: 'col' }),
        cm.h('screen'),
        'bg-background text-on-background overflow-hidden',
      )}
    >
      {/* Page top bar — md+ chrome riding inside the shell's Content (the
          shell's mobile TopBar replaces it below the breakpoint). */}
      <ModelEditTopBar modelName={name} />
      <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-h-0 overflow-hidden')}>
        <div
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
        </div>
      </div>
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
  )
}

export default ModelEdit
export { ModelEdit, ModelEdit as ModelEditPage }
