import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import MobileBottomNav from '../components/MobileBottomNav.js'
import UploadDropzone from '../components/UploadDropzone.js'
import UploadPageHeader from '../components/UploadPageHeader.js'
import UploadQueueList, { type QueueItem } from '../components/UploadQueueList.js'
import UploadSideNavBar from '../components/UploadSideNavBar.js'
import UploadTopBar from '../components/UploadTopBar.js'

const ACCEPTED_FORMATS = new Set(['glb', 'gltf', 'obj', 'fbx', 'stl'])

function inferFormat(name: string): string {
  const ext = name.toLowerCase().split('.').pop() ?? ''
  return ACCEPTED_FORMATS.has(ext) ? ext : 'glb'
}

/**
 * Upload page — single source of truth for the per-session upload queue.
 *
 * Each dropped/picked file is registered in `queue` immediately so the user
 * sees their action take effect, then a model row is created via POST /api/models
 * with the file's metadata. We deliberately don't ship binary bytes to S3
 * here — flagship installs may not have S3 credentials wired — but the model
 * record IS persisted so the library, dashboard counters, and edit pages all
 * react to the upload as a real event.
 *
 * On success the queue entry switches to status="ready" with a working
 * "Open in editor" link to /models/:id/edit. Failures stay in the queue with
 * status="error" and an inline message so users see what went wrong instead
 * of a silent miss.
 */
function Upload() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [queue, setQueue] = useState<QueueItem[]>([])

  const removeItem = useCallback((id: string) => {
    setQueue((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const clearQueue = useCallback(() => {
    setQueue([])
  }, [])

  const onFilesAdded = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      const newItems: QueueItem[] = files.map((f) => ({
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        sizeBytes: f.size,
        format: inferFormat(f.name),
        status: 'uploading',
        progress: 30,
        modelId: null,
        error: null,
      }))
      setQueue((prev) => [...newItems, ...prev])

      // Create models in parallel; the per-row progress updates come from the
      // promise transitions, not an actual upload pipeline (no S3 streaming
      // here — see file header comment).
      await Promise.all(
        newItems.map(async (item) => {
          try {
            // Synthetic file_url: for flagship demo runs we don't actually upload
            // the bytes to S3; the file_url field is required by the schema, so
            // we encode the filename. A real installation with S3 wiring would
            // replace this with `getProvider().upload()` results.
            const file_url = `local://${encodeURIComponent(item.name)}`
            const response = await http.post<{ id: string }>('/api/models', {
              name: item.name.replace(/\.[a-z0-9]+$/i, ''),
              file_url,
              format: item.format,
              file_size: item.sizeBytes,
              polygon_count: 0,
              visibility: 'private',
            })
            const body =
              response && typeof response === 'object' && 'data' in response
                ? (response as { data?: { id?: string } }).data
                : (response as { id?: string } | undefined)
            const modelId = body?.id ?? null
            // Domain event: the upload funnel's success point.
            void track({
              name: 'model.uploaded',
              properties: {
                modelId,
                format: item.format,
                sizeBytes: item.sizeBytes,
              },
            })
            setQueue((prev) =>
              prev.map((q) =>
                q.id === item.id ? { ...q, status: 'ready', progress: 100, modelId } : q,
              ),
            )
          } catch (err) {
            const message =
              err instanceof Error
                ? err.message
                : t('upload.failed', {}, { defaultValue: 'Upload failed' })
            setQueue((prev) =>
              prev.map((q) =>
                q.id === item.id ? { ...q, status: 'error', progress: 0, error: message } : q,
              ),
            )
          }
        }),
      )
    },
    [http, t],
  )

  const goToLibrary = useCallback(() => {
    navigate('/models')
  }, [navigate])

  return (
    <div
      className={cm.cn(cm.flex({}), cm.minH('screen'), 'bg-surface text-on-surface font-body')}
      aria-label={t('upload.title', {}, { defaultValue: 'Upload a model' })}
    >
      <UploadSideNavBar />
      <main
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.flex1,
          cm.minH('screen'),
          'md:ml-[260px] bg-surface',
        )}
      >
        <UploadTopBar />
        <div
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            cm.flex1,
            cm.sp('p', 8),
            cm.maxW('5xl'),
            cm.mxAuto,
            cm.w('full'),
          )}
        >
          <UploadPageHeader
            queueCount={queue.length}
            onClear={clearQueue}
            onViewLibrary={goToLibrary}
          />
          <UploadDropzone onFilesAdded={onFilesAdded} />
          <UploadQueueList items={queue} onRemove={removeItem} />
        </div>
      </main>
      <MobileBottomNav />
    </div>
  )
}

export default Upload
export { Upload, Upload as UploadPage }
