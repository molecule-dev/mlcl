import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AnimationToolLayout } from '../components/AnimationToolLayout.js'
import { type RenderJob, RenderQueueCard } from '../components/RenderQueueCard.js'

// Only formats the API can synchronously render are exposed. mp4 / gif
// require a video render bond that is not wired yet — see the
// matching restriction in api/src/handlers/exports.ts. Surfacing them
// in the UI without a backend renderer is the "Generate produces
// nothing" failure mode the production-ready contract is built to catch.
type Format = 'css' | 'lottie' | 'svg'

interface FormatOption {
  id: Format
  label: string
  icon: string
  description: string
}

interface ApiExport {
  id: string
  project_id: string
  format: string
  quality: string
  status: string
  output_url?: string | null
  created_at: string
}

const FORMATS: FormatOption[] = [
  {
    id: 'css',
    label: 'CSS Keyframes',
    icon: 'code',
    description: 'Plain @keyframes for web. Cubic-bezier preserved.',
  },
  {
    id: 'lottie',
    label: 'Lottie JSON',
    icon: 'data_object',
    description: 'Vector animation, perfect for Web/iOS/Android.',
  },
  {
    id: 'svg',
    label: 'Animated SVG',
    icon: 'shape_line',
    description: 'Inline SVG with SMIL animations — embed anywhere.',
  },
]

const PRESET_QUALITY: Record<Format, Array<{ id: string; label: string }>> = {
  css: [
    { id: 'compressed', label: 'Compressed' },
    { id: 'pretty', label: 'Pretty-printed' },
  ],
  lottie: [
    { id: 'standard', label: 'Standard' },
    { id: 'optimized', label: 'Optimized' },
  ],
  svg: [
    { id: 'inline', label: 'Inline' },
    { id: 'standalone', label: 'Standalone' },
  ],
}

const QUALITY_TO_API: Record<string, 'low' | 'medium' | 'high'> = {
  compressed: 'medium',
  pretty: 'high',
  standard: 'high',
  optimized: 'medium',
  inline: 'medium',
  standalone: 'high',
}

function formatTimeAgo(iso: string | undefined): string {
  if (!iso) return ''
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return ''
  const seconds = Math.floor((Date.now() - then) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function exportFilename(e: ApiExport): string {
  const ext = e.format === 'lottie' ? 'json' : e.format
  return `export-${e.id.slice(0, 8)}.${ext}`
}

export function Export() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [format, setFormat] = useState<Format>('lottie')
  const [quality, setQuality] = useState<string>('standard')
  const [exports, setExports] = useState<ApiExport[] | null>(null)
  const [exportsError, setExportsError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    http
      .get<ApiExport[] | { data: ApiExport[] }>(`/api/exports?projectId=${encodeURIComponent(id)}`)
      .then((res) => {
        if (cancelled) return
        const arr = Array.isArray(res.data)
          ? (res.data as ApiExport[])
          : ((res.data as { data?: ApiExport[] }).data ?? [])
        setExports(arr)
      })
      .catch(() => {
        if (cancelled) return
        setExportsError(t('export.fetchError', {}, { defaultValue: 'Could not load exports.' }))
        setExports([])
      })
    return () => {
      cancelled = true
    }
  }, [id, http, t])

  async function handleStartExport() {
    if (!id || submitting) return
    setSubmitting(true)
    try {
      const res = await http.post<ApiExport>('/api/exports', {
        projectId: id,
        format,
        quality: QUALITY_TO_API[quality] ?? 'high',
      })
      const created = res.data as ApiExport | null
      if (created && 'id' in created) {
        setExports((prev) => (prev ? [created, ...prev] : [created]))
      } else {
        const refresh = await http.get<ApiExport[] | { data: ApiExport[] }>(
          `/api/exports?projectId=${encodeURIComponent(id)}`,
        )
        const arr = Array.isArray(refresh.data)
          ? (refresh.data as ApiExport[])
          : ((refresh.data as { data?: ApiExport[] }).data ?? [])
        setExports(arr)
      }
    } catch (error) {
      logError('export.startExport', error)
      setExportsError(t('export.startError', {}, { defaultValue: 'Could not start export.' }))
    } finally {
      setSubmitting(false)
    }
  }

  const queue = useMemo<RenderJob[]>(() => {
    if (!exports) return []
    return exports
      .filter((e) => e.status !== 'completed' && e.status !== 'failed')
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        filename: exportFilename(e),
        progress: e.status === 'rendering' ? 50 : null,
      }))
  }, [exports])

  const recent = useMemo(() => {
    if (!exports) return []
    return exports.slice(0, 3)
  }, [exports])

  return (
    <AnimationToolLayout
      title={t('export.title', {}, { defaultValue: 'Export' })}
      breadcrumb={t(
        'export.crumb',
        { format, quality },
        { defaultValue: '// projects › export · {{format}}/{{quality}}' },
      )}
    >
      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}>
        <div className={cm.cn('lg:col-span-2', cm.stack(6))}>
          <header>
            <h2
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                'font-headline text-[var(--anim-text)] tracking-tight',
              )}
            >
              {t('export.heading', {}, { defaultValue: 'Render & export' })}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 1),
                'text-[var(--anim-text-secondary)]',
              )}
            >
              {t(
                'export.subhead',
                {},
                { defaultValue: 'Pick a format, tune the quality, and watch the queue.' },
              )}
            </p>
          </header>

          <section className={cm.stack(3)}>
            <h3
              className={cm.cn(
                'font-mono text-[10px] uppercase tracking-widest text-[var(--anim-primary)]',
              )}
            >
              {t('export.formatHeader', {}, { defaultValue: '// format' })}
            </h3>
            <div
              className={cm.cn(
                cm.flex({ gap: 2 }),
                'rounded-full p-1 bg-[var(--anim-surface)] border border-[var(--anim-border)] w-fit',
              )}
            >
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
                  data-mol-id={`format-${f.id}`}
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.flex({ align: 'center', gap: 1 }),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('xs'),
                    'rounded-full uppercase tracking-widest font-mono transition-all',
                    format === f.id
                      ? 'bg-gradient-to-r from-[var(--anim-primary)] to-[var(--anim-secondary)] text-white'
                      : 'text-[var(--anim-text-secondary)] hover:text-[var(--anim-primary)]',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-[14px]')}>{f.icon}</span>
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
            <p className={cm.cn(cm.textSize('xs'), 'text-[var(--anim-text-secondary)]')}>
              {FORMATS.find((f) => f.id === format)?.description}
            </p>
          </section>

          <section className={cm.stack(3)}>
            <h3
              className={cm.cn(
                'font-mono text-[10px] uppercase tracking-widest text-[var(--anim-primary)]',
              )}
            >
              {t('export.qualityHeader', {}, { defaultValue: '// quality' })}
            </h3>
            <div className={cm.cn(cm.flex({ gap: 2 }), 'flex-wrap')}>
              {PRESET_QUALITY[format].map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setQuality(q.id)}
                  data-mol-id={`quality-${q.id}`}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    'font-mono text-[10px] uppercase tracking-widest rounded-full border transition-colors',
                    quality === q.id
                      ? 'bg-[color-mix(in_srgb,var(--anim-primary)_15%,transparent)] text-[var(--anim-primary)] border-[color-mix(in_srgb,var(--anim-primary)_40%,transparent)]'
                      : 'border-[var(--anim-border)] text-[var(--anim-text-secondary)] hover:border-[color-mix(in_srgb,var(--anim-primary)_40%,transparent)] hover:text-[var(--anim-primary)]',
                  )}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'rounded-2xl bg-[var(--anim-surface)] border border-[var(--anim-border)]',
            )}
          >
            <h3
              className={cm.cn(
                'font-mono text-[10px] uppercase tracking-widest text-[var(--anim-primary)]',
              )}
            >
              {t('export.previewHeader', {}, { defaultValue: '// preview' })}
            </h3>
            <div
              className={cm.cn(
                'aspect-video rounded-xl border border-[var(--anim-border)] bg-[var(--anim-canvas-bg)] flex items-center justify-center',
              )}
              style={{
                backgroundImage:
                  'linear-gradient(45deg, color-mix(in srgb, var(--anim-primary) 10%, transparent) 25%, transparent 25%), linear-gradient(-45deg, color-mix(in srgb, var(--anim-primary) 10%, transparent) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, color-mix(in srgb, var(--anim-primary) 10%, transparent) 75%), linear-gradient(-45deg, transparent 75%, color-mix(in srgb, var(--anim-primary) 10%, transparent) 75%)',
                backgroundSize: '32px 32px',
                backgroundPosition: '0 0, 0 16px, 16px -16px, -16px 0',
              }}
            >
              <button
                type="button"
                onClick={() => setPreviewing((v) => !v)}
                data-mol-id="export-preview-toggle"
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  'rounded-full bg-gradient-to-r from-[var(--anim-primary)] to-[var(--anim-secondary)] text-white shadow-[0_20px_50px_-10px_color-mix(in_srgb,var(--anim-primary)_60%,transparent)]',
                )}
              >
                <span className="material-symbols-outlined">
                  {previewing ? 'pause' : 'play_arrow'}
                </span>
                <span>
                  {previewing
                    ? t('export.previewPause', {}, { defaultValue: 'Pause preview' })
                    : t('export.previewPlay', {}, { defaultValue: 'Play preview' })}
                </span>
              </button>
            </div>
            <button
              type="button"
              onClick={handleStartExport}
              disabled={submitting || !id}
              data-mol-id="export-start"
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('semibold'),
                cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                cm.sp('py', 3),
                'rounded-lg bg-gradient-to-r from-[var(--anim-primary)] to-[var(--anim-secondary)] text-white hover:opacity-90 transition-opacity disabled:opacity-60',
              )}
            >
              <span className="material-symbols-outlined">download</span>
              <span>
                {submitting
                  ? t('common.startingEllipsis', {}, { defaultValue: 'Starting…' })
                  : t(
                      'export.start',
                      { format: format.toUpperCase() },
                      { defaultValue: 'Export as {{format}}' },
                    )}
              </span>
            </button>
            {exportsError ? (
              <p
                role="alert"
                className={cm.cn(cm.textSize('xs'), 'text-[var(--anim-danger)] font-mono')}
              >
                {exportsError}
              </p>
            ) : null}
          </section>
        </div>

        <aside className={cm.stack(6)}>
          <RenderQueueCard jobs={queue} loading={exports === null} error={exportsError} />
          <section
            className={cm.cn(
              cm.sp('p', 5),
              cm.stack(3),
              'rounded-xl bg-[var(--anim-surface)] border border-[var(--anim-border)]',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-[var(--anim-text)]',
              )}
            >
              {t('export.recentTitle', {}, { defaultValue: 'Recent exports' })}
            </h3>
            {exports === null ? (
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-[var(--anim-text-secondary)] font-mono uppercase tracking-widest',
                )}
              >
                {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
              </p>
            ) : recent.length === 0 ? (
              <p className={cm.cn(cm.textSize('xs'), 'text-[var(--anim-text-secondary)]')}>
                {t(
                  'export.recentEmpty',
                  {},
                  { defaultValue: 'No exports yet — kick off your first render.' },
                )}
              </p>
            ) : (
              recent.map((item) => (
                <div
                  key={item.id}
                  data-mol-id={`export-row-${item.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 2 }),
                    cm.sp('py', 2),
                    cm.textSize('xs'),
                    'border-b border-[var(--anim-border)] last:border-0',
                  )}
                >
                  <span className={cm.cn('text-[var(--anim-text)] font-mono truncate pr-2 flex-1')}>
                    {exportFilename(item)}
                  </span>
                  {item.status === 'completed' && item.output_url ? (
                    <a
                      href={item.output_url}
                      download={exportFilename(item)}
                      data-mol-id={`export-download-${item.id}`}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 1 }),
                        'font-mono text-[10px] uppercase tracking-widest text-[var(--anim-primary)] hover:text-[var(--anim-secondary)] transition-colors',
                      )}
                    >
                      <span className="material-symbols-outlined text-[12px]">download</span>
                      <span>{t('common.download', {}, { defaultValue: 'Download' })}</span>
                    </a>
                  ) : (
                    <span
                      className={cm.cn(
                        'font-mono text-[10px] uppercase tracking-widest text-[var(--anim-text-secondary)]',
                      )}
                    >
                      {item.status}
                    </span>
                  )}
                  <span
                    className={cm.cn(
                      'text-[var(--anim-text-secondary)] font-mono uppercase tracking-widest text-[10px] pl-2',
                    )}
                  >
                    {formatTimeAgo(item.created_at)}
                  </span>
                </div>
              ))
            )}
          </section>
        </aside>
      </div>
    </AnimationToolLayout>
  )
}

export default Export
