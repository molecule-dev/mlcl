import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-react'

import { PhotoEditorLayout } from '../components/PhotoEditorLayout.js'
import { type ApiImage, imageToSamplePhoto } from '../lib/image-adapter.js'

const FORMATS = [
  { id: 'jpg', ext: 'JPG', description: 'Universal — fastest delivery' },
  { id: 'png', ext: 'PNG', description: 'Lossless · 24-bit alpha' },
  { id: 'webp', ext: 'WebP', description: 'Modern web · 25% smaller' },
  { id: 'avif', ext: 'AVIF', description: 'Next-gen · best compression' },
] as const

const SIZE_PRESETS = [
  { id: 'instagram', label: 'Instagram', dimensions: { width: 1080, height: 1080 } },
  { id: 'web-2k', label: 'Web 2K', dimensions: { width: 2048, height: 1366 } },
  { id: 'print-a3', label: 'Print A3', dimensions: { width: 4961, height: 3508 } },
  { id: 'original', label: 'Original', dimensions: { width: 0, height: 0 } },
] as const

type FormatId = (typeof FORMATS)[number]['id']
type SizePresetId = (typeof SIZE_PRESETS)[number]['id']

interface ExportRow {
  id: string
  user_id: string
  image_id: string
  format: string
  quality: number
  width: number
  height: number
  status: string
  output_url: string | null
  created_at: string
}

export function Export() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams] = useSearchParams()
  const photoId = searchParams.get('photo')

  const [images, setImages] = useState<ApiImage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [recentExports, setRecentExports] = useState<ExportRow[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [lastExport, setLastExport] = useState<ExportRow | null>(null)

  const [format, setFormat] = useState<FormatId>('jpg')
  const [quality, setQuality] = useState(92)
  const [sizePreset, setSizePreset] = useState<SizePresetId>('original')
  const [stripExif, setStripExif] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([http.get<ApiImage[]>('/images'), http.get<ExportRow[]>('/exports')])
      .then(([imgRes, expRes]) => {
        if (cancelled) return
        setImages(Array.isArray(imgRes.data) ? imgRes.data : [])
        setRecentExports(Array.isArray(expRes.data) ? expRes.data : [])
        setLoadError(null)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setLoadError(err.message ?? 'Could not load images.')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const selectedImage = useMemo(() => {
    if (!images.length) return null
    if (photoId) return images.find((i) => i.id === photoId) ?? images[0]
    return images[0]
  }, [images, photoId])

  const photo = selectedImage ? imageToSamplePhoto(selectedImage) : null

  const selectedDimensions = useMemo(() => {
    const preset = SIZE_PRESETS.find((s) => s.id === sizePreset)!
    if (preset.id === 'original') return photo?.dimensions ?? { width: 0, height: 0 }
    return preset.dimensions
  }, [sizePreset, photo])

  const estimateBytes = useMemo(() => {
    const pixels = selectedDimensions.width * selectedDimensions.height
    const bytesPerPixel =
      format === 'png' ? 4 : format === 'avif' ? 0.6 : format === 'webp' ? 0.9 : 1.5
    const qFactor = format === 'png' ? 1 : 0.4 + (quality / 100) * 0.6
    return Math.round(pixels * bytesPerPixel * qFactor)
  }, [selectedDimensions, format, quality])

  const fillPct = quality
  const trackBg = `linear-gradient(90deg, var(--photo-accent) 0%, var(--photo-danger) ${fillPct}%, var(--photo-slider-track) ${fillPct}%, var(--photo-slider-track) 100%)`

  const handleExport = async () => {
    if (!selectedImage) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await http.post<ExportRow>('/exports', {
        image_id: selectedImage.id,
        format,
        quality,
        width: selectedDimensions.width || undefined,
        height: selectedDimensions.height || undefined,
        strip_exif: stripExif,
      })
      const row = res.data
      setLastExport(row)
      setRecentExports((prev) => [row, ...prev])
      track({
        name: 'export.saved',
        properties: {
          export_id: row.id,
          image_id: row.image_id,
          format: row.format,
          quality: row.quality,
          status: row.status,
        },
      })
      if (row.output_url) {
        const a = document.createElement('a')
        a.href = row.output_url
        a.download = `${selectedImage.name.replace(/\s+/g, '-').toLowerCase()}.${format}`
        a.target = '_blank'
        a.rel = 'noopener'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Export failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PhotoEditorLayout
      title={t('common.export', {}, { defaultValue: 'Export' })}
      breadcrumb={t('export.breadcrumb', {}, { defaultValue: '// editor › export' })}
    >
      {loadError && (
        <div
          className={cm.cn('rounded-2xl border p-4 mb-6 text-sm')}
          style={{
            borderColor: 'var(--color-error-container)',
            backgroundColor: 'color-mix(in srgb, var(--mol-color-error) 15%, transparent)',
            color: 'var(--mol-color-error)',
          }}
          data-mol-id="export-load-error"
        >
          {loadError}
        </div>
      )}

      {!loading && !selectedImage ? (
        <div
          className={cm.cn('rounded-2xl border p-8 text-center')}
          style={{
            backgroundColor: 'var(--photo-panel-bg)',
            borderColor: 'var(--photo-panel-border)',
          }}
          data-mol-id="export-empty"
        >
          <span
            className={cm.cn('material-symbols-outlined text-[48px]')}
            style={{ color: 'var(--photo-panel-text-muted)' }}
            aria-hidden="true"
          >
            image_not_supported
          </span>
          <h2
            className={cm.cn('text-xl font-bold tracking-tight mt-3')}
            style={{ color: 'var(--photo-panel-text)' }}
          >
            {t('export.empty.title', {}, { defaultValue: 'Nothing to export yet' })}
          </h2>
          <p className={cm.cn('text-sm mt-2')} style={{ color: 'var(--photo-panel-text-muted)' }}>
            {t(
              'export.empty.body',
              {},
              { defaultValue: 'Add a frame to your library first, then come back to export it.' },
            )}
          </p>
          <Link
            to="/library"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'mx-auto mt-4 inline-flex px-4 py-2 rounded-md text-sm text-white hover:opacity-90 transition-opacity uppercase tracking-widest font-mono',
            )}
            style={{
              background: 'linear-gradient(to right, var(--photo-accent), var(--photo-danger))',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
              photo_library
            </span>
            {t('export.empty.cta', {}, { defaultValue: 'Open library' })}
          </Link>
        </div>
      ) : (
        <div className={cm.cn('grid grid-cols-1 xl:grid-cols-12 gap-6')}>
          <section className={cm.cn('xl:col-span-7')}>
            <div
              className={cm.cn('rounded-2xl overflow-hidden border')}
              style={{
                backgroundColor: 'var(--photo-panel-bg)',
                borderColor: 'var(--photo-panel-border)',
              }}
            >
              <div
                className={cm.cn('px-5 py-3 border-b flex items-center justify-between')}
                style={{ borderColor: 'var(--photo-panel-border)' }}
              >
                <p
                  className={cm.cn('text-[10px] font-mono font-bold uppercase tracking-widest')}
                  style={{ color: 'var(--photo-panel-text-accent)' }}
                >
                  {t('export.preview.eyebrow', {}, { defaultValue: '// preview' })}
                </p>
                <span
                  className={cm.cn('text-[10px] font-mono uppercase tracking-widest')}
                  style={{ color: 'var(--photo-panel-text-muted)' }}
                >
                  {selectedDimensions.width}×{selectedDimensions.height}
                </span>
              </div>
              <div
                className={cm.cn('relative aspect-[3/2] flex items-center justify-center')}
                style={{ backgroundColor: 'var(--photo-canvas-bg)' }}
              >
                <div
                  aria-hidden="true"
                  className={cm.cn('absolute inset-0 opacity-90')}
                  style={{
                    backgroundImage:
                      'linear-gradient(45deg, var(--photo-slider-track) 25%, transparent 25%), linear-gradient(-45deg, var(--photo-slider-track) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--photo-slider-track) 75%), linear-gradient(-45deg, transparent 75%, var(--photo-slider-track) 75%)',
                    backgroundSize: '24px 24px',
                    backgroundPosition: '0 0, 0 12px, 12px -12px, 12px 0',
                  }}
                />
                <div
                  className={cm.cn(
                    'relative max-w-[80%] max-h-[82%] aspect-[3/2] rounded-md overflow-hidden shadow-2xl shadow-black/60',
                  )}
                >
                  {selectedImage?.current_url || selectedImage?.original_url ? (
                    <img
                      src={selectedImage.current_url || selectedImage.original_url}
                      alt={selectedImage.name}
                      className={cm.cn('absolute inset-0 w-full h-full object-cover')}
                    />
                  ) : (
                    <div
                      className={cm.cn('absolute inset-0')}
                      style={{
                        background:
                          'linear-gradient(135deg, var(--color-secondary-container) 0%, var(--photo-accent) 30%, var(--color-error-container) 65%, var(--photo-danger) 100%)',
                      }}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={cm.cn(
                      'absolute top-3 left-3 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded bg-foreground/60 backdrop-blur text-white',
                    )}
                  >
                    {photo?.title}
                  </span>
                  <span
                    className={cm.cn(
                      'absolute bottom-3 right-3 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded bg-foreground/60 backdrop-blur text-white',
                    )}
                  >
                    {format.toUpperCase()} · Q{quality}
                  </span>
                </div>
              </div>
              <div
                className={cm.cn(
                  'px-5 py-4 border-t grid grid-cols-3 gap-4 text-[11px] font-mono uppercase tracking-widest',
                )}
                style={{ borderColor: 'var(--photo-panel-border)' }}
              >
                <div>
                  <p style={{ color: 'var(--photo-panel-text-muted)' }}>
                    {t('form.format', {}, { defaultValue: 'Format' })}
                  </p>
                  <p
                    className={cm.cn('text-sm tracking-tight font-bold mt-0.5 normal-case')}
                    style={{ color: 'var(--photo-panel-text)' }}
                  >
                    {FORMATS.find((f) => f.id === format)!.ext}
                  </p>
                </div>
                <div>
                  <p style={{ color: 'var(--photo-panel-text-muted)' }}>
                    {t('export.summary.size', {}, { defaultValue: 'Output size' })}
                  </p>
                  <p
                    className={cm.cn(
                      'text-sm tabular-nums tracking-tight font-bold mt-0.5 normal-case',
                    )}
                    style={{ color: 'var(--photo-panel-text-highlight)' }}
                  >
                    {selectedDimensions.width}×{selectedDimensions.height}
                  </p>
                </div>
                <div>
                  <p style={{ color: 'var(--photo-panel-text-muted)' }}>
                    {t('export.summary.estimate', {}, { defaultValue: 'Estimated' })}
                  </p>
                  <p
                    className={cm.cn(
                      'text-sm tabular-nums tracking-tight font-bold mt-0.5 normal-case',
                    )}
                    style={{ color: 'var(--photo-panel-text-cyan)' }}
                  >
                    ≈ {(estimateBytes / 1_000_000).toFixed(1)}MB
                  </p>
                </div>
              </div>
            </div>

            {recentExports.length > 0 && (
              <div
                className={cm.cn('rounded-2xl p-5 mt-6 border')}
                style={{
                  backgroundColor: 'var(--photo-panel-bg)',
                  borderColor: 'var(--photo-panel-border)',
                }}
                data-mol-id="export-recent"
              >
                <p
                  className={cm.cn('text-[10px] font-mono font-bold uppercase tracking-widest')}
                  style={{ color: 'var(--photo-panel-text-accent)' }}
                >
                  {t('export.recent.eyebrow', {}, { defaultValue: '// recent exports' })}
                </p>
                <ul
                  className={cm.cn('divide-y mt-3')}
                  style={{ borderColor: 'var(--photo-panel-border)' }}
                >
                  {recentExports.slice(0, 6).map((row) => (
                    <li
                      key={row.id}
                      className={cm.cn('flex items-center justify-between py-2 text-xs')}
                      data-mol-id={`export-recent-${row.id}`}
                      data-status={row.status}
                    >
                      <div>
                        <p
                          className={cm.cn('font-mono uppercase tracking-widest')}
                          style={{ color: 'var(--photo-panel-text)' }}
                        >
                          {row.format} · Q{row.quality} · {row.width}×{row.height}
                        </p>
                        <p
                          className={cm.cn('text-[10px] mt-0.5')}
                          style={{ color: 'var(--photo-panel-text-muted)' }}
                        >
                          {new Date(row.created_at).toLocaleString()}
                        </p>
                      </div>
                      {row.output_url ? (
                        <a
                          href={row.output_url}
                          target="_blank"
                          rel="noopener"
                          className={cm.cn('hover:underline font-bold uppercase tracking-widest')}
                          style={{ color: 'var(--photo-panel-text-accent)' }}
                          download
                        >
                          {t('common.download', {}, { defaultValue: 'Download' })}
                        </a>
                      ) : (
                        <span
                          className={cm.cn('font-mono uppercase tracking-widest text-[10px]')}
                          style={{ color: 'var(--photo-panel-text-muted)' }}
                        >
                          {row.status}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className={cm.cn('xl:col-span-5')}>
            <div
              className={cm.cn('rounded-2xl p-5 space-y-6 border')}
              style={{
                backgroundColor: 'var(--photo-panel-bg)',
                borderColor: 'var(--photo-panel-border)',
              }}
            >
              <div>
                <p
                  className={cm.cn('text-[10px] font-mono font-bold uppercase tracking-widest')}
                  style={{ color: 'var(--photo-panel-text-accent)' }}
                >
                  {t('export.format.eyebrow', {}, { defaultValue: '// format' })}
                </p>
                <h3
                  className={cm.cn('text-base font-bold tracking-tight mt-1')}
                  style={{ color: 'var(--photo-panel-text)' }}
                >
                  {t('export.format.title', {}, { defaultValue: 'Container & codec' })}
                </h3>
                <div className={cm.cn('grid grid-cols-2 gap-2 mt-3')}>
                  {FORMATS.map((f) => {
                    const active = format === f.id
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFormat(f.id)}
                        data-mol-id={`export-format-${f.id}`}
                        data-active={active ? 'true' : 'false'}
                        className={cm.cn('rounded-lg border px-3 py-3 text-left transition-colors')}
                        style={{
                          borderColor: active ? 'var(--photo-accent)' : 'var(--photo-panel-border)',
                          backgroundColor: active
                            ? 'color-mix(in srgb, var(--photo-accent) 15%, transparent)'
                            : undefined,
                        }}
                      >
                        <p
                          className={cm.cn('text-sm font-bold tracking-tight')}
                          style={{
                            color: active
                              ? 'var(--photo-panel-text-highlight)'
                              : 'var(--photo-panel-text)',
                          }}
                        >
                          {f.ext}
                        </p>
                        <p
                          className={cm.cn('text-[11px] mt-0.5')}
                          style={{ color: 'var(--photo-panel-text-muted)' }}
                        >
                          {t(`export.format.desc.${f.id}`, {}, { defaultValue: f.description })}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <div className={cm.cn('flex items-center justify-between mb-2')}>
                  <p
                    className={cm.cn('text-[10px] font-mono font-bold uppercase tracking-widest')}
                    style={{ color: 'var(--photo-panel-text-muted)' }}
                  >
                    {t('export.quality.label', {}, { defaultValue: 'Quality' })}
                  </p>
                  <span
                    className={cm.cn('text-xs font-mono tabular-nums')}
                    style={{ color: 'var(--photo-panel-text-highlight)' }}
                  >
                    {quality}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  aria-label={t('export.quality.label', {}, { defaultValue: 'Quality' })}
                  data-mol-id="export-quality"
                  className={cm.cn(
                    'lustra-slider w-full h-[14px] appearance-none bg-transparent cursor-pointer focus:outline-none',
                  )}
                  style={{
                    backgroundImage: trackBg,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '100% 4px',
                    backgroundPosition: 'center',
                  }}
                />
              </div>

              <div>
                <p
                  className={cm.cn(
                    'text-[10px] font-mono font-bold uppercase tracking-widest mb-2',
                  )}
                  style={{ color: 'var(--photo-panel-text-muted)' }}
                >
                  {t('export.size.label', {}, { defaultValue: 'Output size' })}
                </p>
                <div className={cm.cn('grid grid-cols-2 gap-2')}>
                  {SIZE_PRESETS.map((s) => {
                    const active = sizePreset === s.id
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSizePreset(s.id)}
                        data-mol-id={`export-size-${s.id}`}
                        data-active={active ? 'true' : 'false'}
                        className={cm.cn(
                          'rounded-md border px-3 py-2 text-[11px] font-mono uppercase tracking-widest transition-colors',
                        )}
                        style={{
                          borderColor: active ? 'var(--photo-accent)' : 'var(--photo-panel-border)',
                          color: active
                            ? 'var(--photo-panel-text-highlight)'
                            : 'var(--photo-panel-text-muted)',
                          backgroundColor: active
                            ? 'color-mix(in srgb, var(--photo-accent) 15%, transparent)'
                            : undefined,
                        }}
                      >
                        {t(`export.size.preset.${s.id}`, {}, { defaultValue: s.label })}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                  'cursor-pointer',
                )}
              >
                <span>
                  <span
                    className={cm.cn(
                      'block text-[11px] font-mono font-bold uppercase tracking-widest',
                    )}
                    style={{ color: 'var(--photo-panel-text-muted)' }}
                  >
                    {t('export.exif.label', {}, { defaultValue: 'Strip EXIF metadata' })}
                  </span>
                  <span
                    className={cm.cn('block text-[11px] mt-0.5')}
                    style={{ color: 'var(--photo-panel-text-muted)' }}
                  >
                    {t(
                      'export.exif.help',
                      {},
                      { defaultValue: 'Remove camera, GPS, and timestamp before sharing.' },
                    )}
                  </span>
                </span>
                <Switch
                  checked={stripExif}
                  onChange={(e) => setStripExif((e.target as HTMLInputElement).checked)}
                  size="sm"
                  aria-label={t('export.exif.label', {}, { defaultValue: 'Strip EXIF metadata' })}
                  data-mol-id="export-strip-exif"
                />
              </div>

              {submitError && (
                <p
                  className={cm.cn('text-xs')}
                  style={{ color: 'var(--mol-color-error)' }}
                  data-mol-id="export-error"
                >
                  {submitError}
                </p>
              )}

              <button
                type="button"
                onClick={handleExport}
                disabled={submitting || !selectedImage}
                data-mol-id="export-submit"
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  'w-full py-3.5 rounded-lg text-white text-sm uppercase tracking-widest font-mono',
                  'hover:opacity-90 transition-opacity',
                  'disabled:opacity-60 shadow-lg',
                )}
                style={{
                  background: 'linear-gradient(to right, var(--photo-accent), var(--photo-danger))',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                  {submitting ? 'progress_activity' : 'ios_share'}
                </span>
                <span>
                  {submitting
                    ? t('export.submitting', {}, { defaultValue: 'Encoding…' })
                    : t('export.submit', {}, { defaultValue: 'Export frame' })}
                </span>
              </button>

              {lastExport?.output_url && (
                <p
                  className={cm.cn('text-[11px]')}
                  style={{ color: 'var(--mol-color-success)' }}
                  data-mol-id="export-success"
                >
                  {t(
                    'export.success',
                    {},
                    { defaultValue: 'Export ready — check your downloads.' },
                  )}
                </p>
              )}

              <p
                className={cm.cn('text-[11px]')}
                style={{ color: 'var(--photo-panel-text-muted)' }}
              >
                {t(
                  'export.afterNote',
                  {},
                  { defaultValue: 'A copy will be saved to your library.' },
                )}{' '}
                <Link
                  to="/library"
                  className={cm.cn('hover:underline font-bold')}
                  style={{ color: 'var(--photo-panel-text-accent)' }}
                >
                  {t('export.gotoLibrary', {}, { defaultValue: 'Open library →' })}
                </Link>
              </p>
            </div>
          </section>
        </div>
      )}
    </PhotoEditorLayout>
  )
}

export default Export
