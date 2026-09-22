// Phase 1 baseline — verbatim JSX of design-3d-model-viewer-model-viewer.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { debug as logDebug } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AnnotationPin from '../components/AnnotationPin.js'
import AnnotationPin2 from '../components/AnnotationPin2.js'
import AnnotationPin3 from '../components/AnnotationPin3.js'
import AnnotationPin4 from '../components/AnnotationPin4.js'
import InspectorPanel from '../components/InspectorPanel.js'
import ModelViewerBackground from '../components/ModelViewerBackground.js'
import ModelViewerNavBar from '../components/ModelViewerNavBar.js'
import PlaybackHUD from '../components/PlaybackHUD.js'
import TelemetryHUD from '../components/TelemetryHUD.js'
import ViewerToolbar from '../components/ViewerToolbar.js'
interface Model {
  id: string
  name: string
  polygon_count?: number
}

function ModelViewer() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [model, setModel] = useState<Model | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    http
      .get<Model | { data: Model }>(`/api/models/${id}`)
      .then((res) => {
        // The API may wrap the row as { data } — accept either shape.
        const body = res.data
        setModel((body && 'data' in body ? body.data : body) ?? null)
      })
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : t('modelViewer.loadError', {}, { defaultValue: 'Failed to load model' }),
        ),
      )
      .finally(() => setLoading(false))
    // Record the view so the dashboard's "Views This Month" stat reflects
    // real viewer opens (the API logs it as a 'rendered' activity row).
    // Domain event: the viewer funnel's success point (model opened).
    void track({ name: 'model.viewed', properties: { modelId: id } })
    http.post(`/api/models/${id}/render`, {}).catch((error: unknown) => {
      // Best-effort telemetry — a failed ping must never break the viewer.
      logDebug('modelViewer.renderPing failed', error)
    })
  }, [http, id, t])

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={t('modelViewer.loading', {}, { defaultValue: 'Loading model…' })}
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.w('screen'),
          cm.h('screen'),
          'bg-surface-container-low text-on-surface font-body overflow-hidden antialiased',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('4xl'),
            'material-symbols-outlined text-primary animate-spin',
          )}
        >
          progress_activity
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div
        role="alert"
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 4 }),
          cm.w('screen'),
          cm.h('screen'),
          'bg-surface-container-low text-on-surface font-body overflow-hidden antialiased',
        )}
      >
        <p className="text-on-surface-variant">{error}</p>
      </div>
    )
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.w('screen'),
        cm.h('screen'),
        'bg-surface-container-low text-on-surface font-body overflow-hidden antialiased selection:bg-primary-container selection:text-on-primary-container',
      )}
    >
      {/* TopNavBar (Shared Component Override) */}
      <ModelViewerNavBar modelName={model?.name} />
      {/* Main Viewport Canvas */}
      <main className={cm.cn(cm.flex1, cm.w('full'), cm.h('full'), 'relative pt-[48px]')}>
        {/* 3D Environment Background Placeholder */}
        <ModelViewerBackground />
        {/* Annotation Pins */}
        {/* Pin 1 */}
        <AnnotationPin />
        {/* Pin 2 */}
        <AnnotationPin2 />
        {/* Pin 3 */}
        <AnnotationPin3 />
        {/* Pin 4 */}
        <AnnotationPin4 />
        {/* Top Right Telemetry HUD */}
        <TelemetryHUD triangles={model?.polygon_count} />
        {/* Bottom Left Playback HUD */}
        <PlaybackHUD />
        {/* Bottom Center Toolbar */}
        <ViewerToolbar />
        {/* Right SideNavBar (Inspector Overlay) - Shared Component Override Style */}
        <InspectorPanel modelName={model?.name} modelId={model?.id} />
      </main>
    </div>
  )
}

export default ModelViewer
export { ModelViewer, ModelViewer as ModelViewerPage }
