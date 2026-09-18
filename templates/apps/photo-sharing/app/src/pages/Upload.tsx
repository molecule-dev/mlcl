import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  type Album,
  ApiError,
  createPhoto,
  listAlbums,
  type Photo,
  uploadPhoto,
  type UploadResult,
} from '../lib/api.js'

interface QueuedFile {
  id: string
  name: string
  size: number
  status: 'queued' | 'uploading' | 'persisting' | 'done' | 'error'
  progress: number
  message: string
  upload?: UploadResult
  photo?: Photo
  errorDetail?: string
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,image/tiff,image/avif'

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

export function Upload() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialAlbumId = searchParams.get('album_id') ?? ''
  const inputRef = useRef<HTMLInputElement>(null)
  const [queue, setQueue] = useState<QueuedFile[]>([])
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public')
  const [titlePrefix, setTitlePrefix] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [albums, setAlbums] = useState<Album[]>([])
  const [albumId, setAlbumId] = useState<string>(initialAlbumId)
  const [albumsLoading, setAlbumsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setAlbumsLoading(true)
    listAlbums({ owner: 'me' })
      .then((data) => {
        if (cancelled) return
        setAlbums(data)
        setAlbumsLoading(false)
        // If the URL pre-selected an album, keep it only if it belongs to the user.
        if (initialAlbumId && !data.some((a) => a.id === initialAlbumId)) {
          setAlbumId('')
        }
      })
      .catch(() => {
        if (cancelled) return
        setAlbumsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [initialAlbumId])

  const updateQueueItem = useCallback((id: string, patch: Partial<QueuedFile>) => {
    setQueue((q) => q.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }, [])

  const processFiles = useCallback(
    async (files: File[]) => {
      setGlobalError(null)
      const tags = tagsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const newQueue: QueuedFile[] = files.map((file, i) => ({
        id: `${Date.now()}-${i}-${file.name}`,
        name: file.name,
        size: file.size,
        status: 'queued',
        progress: 0,
        message: t('status.queued', {}, { defaultValue: 'Queued' }),
      }))
      setQueue((q) => [...q, ...newQueue])

      for (let i = 0; i < newQueue.length; i++) {
        const item = newQueue[i]
        const file = files[i]
        updateQueueItem(item.id, {
          status: 'uploading',
          progress: 25,
          message: t('upload.uploading', {}, { defaultValue: 'Uploading to storage…' }),
        })
        try {
          const upload = await uploadPhoto(file)
          updateQueueItem(item.id, {
            status: 'persisting',
            progress: 75,
            upload,
            message: t('upload.persisting', {}, { defaultValue: 'Creating photo record…' }),
          })
          const baseTitle = titlePrefix.trim() || file.name.replace(/\.[^.]+$/, '')
          const photo = await createPhoto({
            title: files.length > 1 ? `${baseTitle} ${i + 1}` : baseTitle,
            original_url: upload.url,
            large_url: upload.url,
            thumbnail_url: upload.url,
            width: upload.width ?? undefined,
            height: upload.height ?? undefined,
            tags,
            visibility,
            album_id: albumId || null,
          })
          updateQueueItem(item.id, {
            status: 'done',
            progress: 100,
            photo,
            message: t('upload.done', {}, { defaultValue: 'Uploaded' }),
          })
        } catch (err) {
          const detail =
            err instanceof ApiError
              ? `${err.status}: ${err.message}`
              : err instanceof Error
                ? err.message
                : String(err)
          updateQueueItem(item.id, {
            status: 'error',
            progress: 100,
            message: t('status.failed', {}, { defaultValue: 'Failed' }),
            errorDetail: detail,
          })
        }
      }
    },
    [titlePrefix, tagsInput, visibility, albumId, t, updateQueueItem],
  )

  const onFilesPicked = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const list = event.target.files
      if (!list || list.length === 0) return
      const files: File[] = []
      for (const f of Array.from(list)) {
        if (f.size > 25 * 1024 * 1024) {
          setGlobalError(
            t(
              'upload.fileTooLarge',
              { name: f.name },
              { defaultValue: '{{name}} is larger than 25MB and was skipped.' },
            ),
          )
          continue
        }
        files.push(f)
      }
      if (files.length === 0) return
      processFiles(files)
      event.target.value = ''
    },
    [processFiles, t],
  )

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const list = Array.from(e.dataTransfer?.files ?? [])
      const images = list.filter((f) => f.type.startsWith('image/'))
      if (images.length === 0) return
      processFiles(images)
    },
    [processFiles],
  )

  const allDone =
    queue.length > 0 && queue.every((f) => f.status === 'done' || f.status === 'error')
  const successCount = queue.filter((f) => f.status === 'done').length

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-10')}>
      <header className={'space-y-2'}>
        <p className="text-[11px] font-black uppercase tracking-widest text-primary">
          {t('upload.eyebrow', {}, { defaultValue: 'Upload' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            'font-extrabold tracking-tight leading-[1.05] md:text-5xl',
          )}
          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
        >
          {t('upload.heading', {}, { defaultValue: 'Bring your work in' })}
        </h1>
        <p className={'text-base text-on-surface-variant max-w-xl'}>
          {t(
            'upload.subheading',
            {},
            {
              defaultValue:
                'Pick or drop images here. We extract dimensions and store the original — your title, tags, and visibility are applied to each upload.',
            },
          )}
        </p>
      </header>

      <section className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <div className={'col-span-12 md:col-span-6 space-y-4'}>
          <label className="block">
            <span className="text-[11px] block font-black uppercase tracking-widest text-on-surface-variant mb-1">
              {t('upload.titleLabel', {}, { defaultValue: 'Title (or prefix)' })}
            </span>
            <input
              type="text"
              value={titlePrefix}
              onChange={(e) => setTitlePrefix(e.target.value)}
              placeholder={t(
                'upload.titlePlaceholder',
                {},
                { defaultValue: 'e.g. Reykjavík blue hour' },
              )}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'w-full border border-outline-variant rounded-md bg-surface focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors',
              )}
              data-testid="upload-title"
            />
          </label>
          <label className="block">
            <span className="text-[11px] block font-black uppercase tracking-widest text-on-surface-variant mb-1">
              {t('upload.tagsLabel', {}, { defaultValue: 'Tags (comma separated)' })}
            </span>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder={t(
                'upload.tagsPlaceholder',
                {},
                { defaultValue: 'landscape, twilight, iceland' },
              )}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'w-full border border-outline-variant rounded-md bg-surface focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors',
              )}
              data-testid="upload-tags"
            />
          </label>
        </div>
        <div className={'col-span-12 md:col-span-6 space-y-4'}>
          <div className="space-y-2">
            <span className="text-[11px] block font-black uppercase tracking-widest text-on-surface-variant mb-1">
              {t('upload.visibilityLabel', {}, { defaultValue: 'Visibility' })}
            </span>
            <div
              className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }))}
              role="radiogroup"
              aria-label={t('upload.visibilityLabel', {}, { defaultValue: 'Visibility' })}
            >
              {(['public', 'unlisted', 'private'] as const).map((v) => {
                const isActive = visibility === v
                return (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => setVisibility(v)}
                    data-testid={`upload-visibility-${v}`}
                    className={cm.cn(
                      cm.sp('px', 4),
                      'py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors',
                      isActive
                        ? 'bg-primary text-on-primary shadow'
                        : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                    )}
                  >
                    {t(`upload.visibility.${v}`, {}, { defaultValue: v })}
                  </button>
                )
              })}
            </div>
          </div>
          <label className="block">
            <span className="text-[11px] block font-black uppercase tracking-widest text-on-surface-variant mb-1">
              {t('upload.albumLabel', {}, { defaultValue: 'Add to album (optional)' })}
            </span>
            <select
              value={albumId}
              onChange={(e) => setAlbumId(e.target.value)}
              data-testid="upload-album-select"
              disabled={albumsLoading}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'w-full border border-outline-variant rounded-md bg-surface focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors disabled:opacity-50',
              )}
            >
              <option value="">
                {albumsLoading
                  ? t('upload.albumLoading', {}, { defaultValue: 'Loading albums…' })
                  : t('upload.albumNone', {}, { defaultValue: 'No album (uploads stand alone)' })}
              </option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
            {albumId && (
              <p
                className={'text-[11px] text-on-surface-variant mt-1'}
                data-testid="upload-album-selected"
              >
                {t(
                  'upload.albumSelected',
                  { title: albums.find((a) => a.id === albumId)?.title ?? albumId },
                  { defaultValue: 'New uploads will be added to "{{title}}".' },
                )}
              </p>
            )}
          </label>
        </div>
      </section>

      <section
        className={
          'relative rounded-[1.75rem] border-2 border-dashed border-primary/40 bg-primary/5 p-12 text-center hover:border-primary hover:bg-primary/10 transition-colors'
        }
        aria-label={t('upload.dropzoneLabel', {}, { defaultValue: 'Drop photos to upload' })}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        data-testid="upload-dropzone"
      >
        <div
          className={
            'absolute -right-12 -top-12 w-40 h-40 rounded-full bg-primary/20 blur-3xl pointer-events-none'
          }
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            cm.mxAuto,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(20),
            cm.h(20),
            'rounded-full bg-primary text-on-primary shadow-xl',
          )}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-[48px]">cloud_upload</span>
        </div>
        <h2
          className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight mt-6')}
          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
        >
          {t('upload.dropzoneHeading', {}, { defaultValue: 'Drop photos here' })}
        </h2>
        <p className={'text-sm text-on-surface-variant mt-2'}>
          {t('upload.dropzoneHint', {}, { defaultValue: 'or browse to select files' })}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          onChange={onFilesPicked}
          className="sr-only"
          data-testid="upload-input"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cm.cn(
            cm.sp('px', 6),
            'mt-6 py-3 rounded-full text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow',
          )}
          data-testid="upload-browse"
        >
          {t('upload.browseCta', {}, { defaultValue: 'Choose files' })}
        </button>
        <p className={'text-[11px] font-mono text-on-surface-variant mt-6 max-w-md mx-auto'}>
          {t(
            'upload.formats',
            {},
            { defaultValue: 'JPEG · PNG · WebP · HEIC · TIFF · AVIF. Up to 25 MB / file.' },
          )}
        </p>
      </section>

      {globalError && (
        <p
          className={'rounded-md bg-error/10 text-error text-sm px-4 py-2'}
          role="alert"
          data-testid="upload-error"
        >
          {globalError}
        </p>
      )}

      {queue.length > 0 && (
        <section className={'space-y-4'} data-testid="upload-queue">
          <header className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }))}>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                {t('upload.queueEyebrow', {}, { defaultValue: 'In flight' })}
              </p>
              <h2
                className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight mt-1')}
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              >
                {t('upload.queueHeading', {}, { defaultValue: 'Upload queue' })}
              </h2>
            </div>
            <span className={'text-xs font-mono tabular-nums text-on-surface-variant'}>
              {t(
                'upload.queueCount',
                { done: successCount, total: queue.length },
                { defaultValue: '{{done}} of {{total}} complete' },
              )}
            </span>
          </header>
          <ul
            className={
              'bg-surface-container-lowest rounded-2xl shadow-sm divide-y divide-outline-variant/40 overflow-hidden'
            }
          >
            {queue.map((file) => (
              <li
                key={file.id}
                className={cm.cn(cm.sp('px', 5), cm.sp('py', 4))}
                data-testid={`upload-row-${file.status}`}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(10),
                      cm.h(10),
                      'rounded-lg bg-primary/10 text-primary shrink-0',
                    )}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined text-[22px]">image</span>
                  </span>
                  <div className={'flex-1 min-w-0'}>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'baseline', justify: 'between', gap: 'sm' }),
                      )}
                    >
                      <p className={'text-sm font-bold font-mono text-on-surface truncate'}>
                        {file.name}
                      </p>
                      <p className="text-[11px] font-mono text-on-surface-variant tabular-nums shrink-0">
                        {fmtSize(file.size)}
                      </p>
                    </div>
                    <p className={'text-xs text-on-surface-variant mt-0.5'}>
                      {file.errorDetail ? `${file.message} — ${file.errorDetail}` : file.message}
                    </p>
                    <div className={'mt-2 h-1 rounded-full bg-surface-container overflow-hidden'}>
                      <div
                        className={cm.cn(
                          'h-full rounded-full transition-all',
                          file.status === 'error' ? 'bg-error' : 'bg-primary',
                        )}
                        style={{ width: `${file.progress}%` }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      'py-1 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0',
                      file.status === 'done'
                        ? 'bg-success/15 text-success-text'
                        : file.status === 'error'
                          ? 'bg-error/10 text-error'
                          : 'bg-primary/15 text-primary',
                    )}
                  >
                    {t(`upload.status.${file.status}`, {}, { defaultValue: file.status })}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {allDone && successCount > 0 && (
            <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }))}>
              {albumId ? (
                <button
                  type="button"
                  onClick={() => navigate(`/albums/${albumId}`)}
                  className={cm.cn(
                    cm.sp('px', 5),
                    'py-2.5 rounded-full text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow',
                  )}
                  data-testid="upload-go-album"
                >
                  {t('upload.viewInAlbum', {}, { defaultValue: 'View in album' })}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/my-photos')}
                  className={cm.cn(
                    cm.sp('px', 5),
                    'py-2.5 rounded-full text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow',
                  )}
                  data-testid="upload-go-myphotos"
                >
                  {t('upload.viewInPortfolio', {}, { defaultValue: 'View in My Photos' })}
                </button>
              )}
              <button
                type="button"
                onClick={() => setQueue([])}
                className={cm.cn(
                  cm.sp('px', 5),
                  'py-2.5 rounded-full text-sm font-bold border border-outline-variant text-on-surface hover:bg-surface-container transition-colors',
                )}
                data-testid="upload-reset"
              >
                {t('upload.uploadMore', {}, { defaultValue: 'Upload more' })}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
