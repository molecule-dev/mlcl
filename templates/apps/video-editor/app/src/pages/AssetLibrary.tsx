import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { RushesLayout } from '../components/RushesLayout.js'
import { StatusPill } from '../components/StatusPill.js'

type AssetKind = 'video' | 'audio' | 'image' | 'text'

interface AssetRow {
  id: string
  name: string
  kind: AssetKind
  source_url?: string | null
  thumbnail_url?: string | null
  duration_ms?: number | null
  width?: number | null
  height?: number | null
  size_bytes?: number | string | null
  created_at?: string | null
  updated_at?: string | null
}

const SWATCH_BY_KIND: Record<AssetKind, string> = {
  video: 'linear-gradient(135deg, var(--video-cta-from), var(--video-cta-to))',
  audio: 'linear-gradient(135deg, var(--mol-color-info), var(--mol-color-secondary))',
  image: 'linear-gradient(135deg, var(--mol-color-warning), var(--video-cta-to))',
  text: 'linear-gradient(135deg, var(--video-cta-to), var(--video-link-hover))',
}
const ICON_BY_KIND: Record<AssetKind, string> = {
  video: 'videocam',
  audio: 'graphic_eq',
  image: 'image',
  text: 'text_fields',
}

function arrayFrom<T>(res: unknown): T[] {
  const d = (res as { data?: unknown })?.data
  if (Array.isArray(d)) return d as T[]
  if (Array.isArray(res)) return res as T[]
  return []
}

function formatSize(bytes?: number | string | null): string {
  const n = typeof bytes === 'string' ? Number(bytes) : (bytes ?? 0)
  if (!n || Number.isNaN(n)) return '0 KB'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function formatDuration(ms?: number | null): string | undefined {
  if (!ms || ms <= 0) return undefined
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function timeAgo(iso?: string | null): string {
  if (!iso) return ''
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return ''
  const sec = Math.max(1, Math.floor((Date.now() - ts) / 1000))
  if (sec < 60) return `${sec}s ago`
  const m = Math.floor(sec / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

const FILTERS: Array<{ id: 'all' | AssetKind; label: string; defaultLabel: string }> = [
  { id: 'all', label: 'assetLibrary.filter.all', defaultLabel: 'All' },
  { id: 'video', label: 'assetLibrary.filter.video', defaultLabel: 'Video' },
  { id: 'audio', label: 'assetLibrary.filter.audio', defaultLabel: 'Audio' },
  { id: 'image', label: 'assetLibrary.filter.image', defaultLabel: 'Image' },
  { id: 'text', label: 'assetLibrary.filter.text', defaultLabel: 'Text' },
]

export function AssetLibrary() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [assets, setAssets] = useState<AssetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState<'all' | AssetKind>('all')
  const [query, setQuery] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [uploadKind, setUploadKind] = useState<AssetKind>('video')
  const [uploadUrl, setUploadUrl] = useState('')
  const formRef = useRef<HTMLFormElement | null>(null)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get('/api/assets')
      setAssets(arrayFrom<AssetRow>(res))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      const matchesFilter = filter === 'all' || a.kind === filter
      const matchesQuery = !query.trim() || a.name.toLowerCase().includes(query.toLowerCase())
      return matchesFilter && matchesQuery
    })
  }, [assets, filter, query])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (creating) return
    if (!uploadName.trim() || !uploadUrl.trim()) return
    setCreating(true)
    setError(null)
    try {
      await http.post('/api/assets', {
        name: uploadName.trim(),
        kind: uploadKind,
        source_url: uploadUrl.trim(),
      })
      setUploadName('')
      setUploadUrl('')
      setShowUpload(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <RushesLayout
      title={t('assetLibrary.title', {}, { defaultValue: 'Assets' })}
      breadcrumb="// library"
    >
      <div className={cm.stack(6)}>
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 4 }))}>
          <div>
            <h2
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                'text-[var(--video-text-primary)] tracking-tight',
              )}
            >
              {t('assetLibrary.heading', {}, { defaultValue: 'Asset library' })}
            </h2>
            <p
              data-mol-id="assets-subtitle"
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 1),
                'text-[var(--video-text-muted-alt)]',
              )}
            >
              {loading
                ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
                : t(
                    'assetLibrary.subhead',
                    { count: assets.length },
                    {
                      defaultValue:
                        '{{count}} clips, audio beds, and graphics ready to drop on the timeline.',
                    },
                  )}
            </p>
          </div>
          <button
            type="button"
            data-mol-id="assets-upload"
            onClick={() => setShowUpload((v) => !v)}
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-lg bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] text-white hover:opacity-90 transition-opacity',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>
              {showUpload ? 'close' : 'upload'}
            </span>
            <span>
              {showUpload
                ? t('common.close', {}, { defaultValue: 'Close' })
                : t('assetLibrary.upload', {}, { defaultValue: 'Add asset' })}
            </span>
          </button>
        </header>

        {showUpload && (
          <form
            ref={formRef}
            onSubmit={handleUpload}
            data-mol-id="asset-form"
            className={cm.cn(
              cm.sp('p', 5),
              cm.stack(4),
              'rounded-xl bg-[var(--video-panel-bg)] border border-[var(--video-cta-from)]/30',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-[var(--video-text-primary)]',
              )}
            >
              {t('assetLibrary.formTitle', {}, { defaultValue: 'Register a new asset' })}
            </h3>
            <p className={cm.cn(cm.textSize('xs'), 'text-[var(--video-text-muted-alt)]')}>
              {t(
                'assetLibrary.formHint',
                {},
                {
                  defaultValue:
                    'Provide a hosted source URL — direct uploads land via the file picker once your storage bond is wired.',
                },
              )}
            </p>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-3')}>
              <label className={cm.stack(1)}>
                <span
                  className={cm.cn(
                    'font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-muted-alt)]',
                  )}
                >
                  {t('form.name', {}, { defaultValue: 'Name' })}
                </span>
                <input
                  type="text"
                  required
                  data-mol-id="asset-form-name"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-md bg-[var(--video-input-bg)] text-[var(--video-text-primary)] border border-[var(--video-border-subtle)] focus:border-[var(--video-cta-from)] focus:outline-none transition-colors text-sm',
                  )}
                  placeholder="opening-aerial-4k.mp4"
                />
              </label>
              <label className={cm.stack(1)}>
                <span
                  className={cm.cn(
                    'font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-muted-alt)]',
                  )}
                >
                  {t('form.kind', {}, { defaultValue: 'Kind' })}
                </span>
                <select
                  data-mol-id="asset-form-kind"
                  value={uploadKind}
                  onChange={(e) => setUploadKind(e.target.value as AssetKind)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-md bg-[var(--video-input-bg)] text-[var(--video-text-primary)] border border-[var(--video-border-subtle)] focus:border-[var(--video-cta-from)] focus:outline-none transition-colors text-sm',
                  )}
                >
                  <option value="video">
                    {t('assetLibrary.filter.video', {}, { defaultValue: 'Video' })}
                  </option>
                  <option value="audio">
                    {t('assetLibrary.filter.audio', {}, { defaultValue: 'Audio' })}
                  </option>
                  <option value="image">
                    {t('assetLibrary.filter.image', {}, { defaultValue: 'Image' })}
                  </option>
                  <option value="text">
                    {t('assetLibrary.filter.text', {}, { defaultValue: 'Text' })}
                  </option>
                </select>
              </label>
              <label className={cm.stack(1)}>
                <span
                  className={cm.cn(
                    'font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-muted-alt)]',
                  )}
                >
                  {t('assetLibrary.formUrl', {}, { defaultValue: 'Source URL' })}
                </span>
                <input
                  type="url"
                  required
                  data-mol-id="asset-form-url"
                  value={uploadUrl}
                  onChange={(e) => setUploadUrl(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-md bg-[var(--video-input-bg)] text-[var(--video-text-primary)] border border-[var(--video-border-subtle)] focus:border-[var(--video-cta-from)] focus:outline-none transition-colors text-sm',
                  )}
                  placeholder="https://cdn.example.com/clip.mp4"
                />
              </label>
            </div>
            <div className={cm.cn(cm.flex({ justify: 'end', gap: 2 }))}>
              <button
                type="submit"
                data-mol-id="asset-form-submit"
                disabled={creating}
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-lg bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] text-white hover:opacity-90 transition-opacity disabled:opacity-50',
                )}
              >
                {creating
                  ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                  : t('assetLibrary.formSave', {}, { defaultValue: 'Add asset' })}
              </button>
            </div>
          </form>
        )}

        {error && (
          <p
            role="alert"
            data-mol-id="assets-error"
            className={cm.cn(cm.textSize('sm'), 'text-[var(--video-error-text)] font-mono')}
          >
            {error}
          </p>
        )}

        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 4 }), 'flex-wrap')}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'flex-wrap')}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                data-mol-id={`assets-filter-${f.id}`}
                aria-pressed={filter === f.id}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  'font-mono text-[10px] uppercase tracking-widest rounded-full border transition-colors',
                  filter === f.id
                    ? 'bg-[var(--video-cta-from)]/15 text-[var(--video-link)] border-[var(--video-cta-from)]/40'
                    : 'border-[var(--video-border-subtle)] text-[var(--video-text-muted-alt)] hover:border-[var(--video-cta-from)]/40 hover:text-[var(--video-link)]',
                )}
              >
                {t(f.label, {}, { defaultValue: f.defaultLabel })}
              </button>
            ))}
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'relative')}>
            <span
              className={cm.cn(
                'material-symbols-outlined text-[16px] text-[var(--video-text-dim)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none',
              )}
            >
              search
            </span>
            <input
              type="search"
              data-mol-id="assets-search"
              placeholder={t(
                'assetLibrary.searchPlaceholder',
                {},
                { defaultValue: 'Search assets' },
              )}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={cm.cn(
                cm.sp('pl', 8),
                cm.sp('pr', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'w-72 rounded-full bg-[var(--video-panel-bg)] text-[var(--video-text-primary)] border border-[var(--video-border-subtle)] focus:border-[var(--video-cta-from)] focus:outline-none transition-colors placeholder:text-[var(--video-text-dim)]',
              )}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div
            data-mol-id="assets-empty"
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              'rounded-xl border border-dashed border-[var(--video-border-subtle)] bg-[var(--video-panel-bg)]/40',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-5xl text-[var(--video-text-dim)]')}
            >
              video_library
            </span>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 4), cm.textMuted)}>
              {assets.length === 0
                ? t(
                    'assetLibrary.empty',
                    {},
                    { defaultValue: 'No assets yet — register one with the upload button.' },
                  )
                : t(
                    'assetLibrary.emptyFiltered',
                    {},
                    { defaultValue: 'No assets match those filters yet.' },
                  )}
            </p>
          </div>
        ) : (
          <div
            data-mol-id="assets-grid"
            className={cm.cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4')}
          >
            {filtered.map((a) => {
              const swatch = SWATCH_BY_KIND[a.kind] ?? SWATCH_BY_KIND.video
              const icon = ICON_BY_KIND[a.kind] ?? 'video_library'
              const dur = formatDuration(a.duration_ms)
              return (
                <Link
                  key={a.id}
                  to={`/assets/${a.id}`}
                  data-mol-id={`asset-${a.id}`}
                  className={cm.cn(
                    'group block rounded-xl border border-[var(--video-border-subtle)] bg-[var(--video-panel-bg)] overflow-hidden hover:border-[var(--video-cta-from)]/50 transition-all hover:-translate-y-0.5',
                  )}
                >
                  <div
                    className={cm.cn('relative aspect-video flex items-center justify-center')}
                    style={{ background: swatch }}
                  >
                    <span className={cm.cn('material-symbols-outlined text-white/80 text-[28px]')}>
                      {icon}
                    </span>
                    {dur && (
                      <span
                        className={cm.cn(
                          'absolute bottom-2 right-2 font-mono text-[10px] tracking-widest text-white bg-foreground/60 backdrop-blur px-1.5 py-0.5 rounded',
                        )}
                      >
                        {dur}
                      </span>
                    )}
                    <span
                      className={cm.cn(
                        'absolute top-2 left-2 font-mono text-[9px] uppercase tracking-widest text-white/90 bg-foreground/40 backdrop-blur px-1.5 py-0.5 rounded',
                      )}
                    >
                      {a.kind}
                    </span>
                  </div>
                  <div className={cm.cn(cm.sp('p', 3), cm.stack(2))}>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('medium'),
                        'text-[var(--video-text-primary)] truncate group-hover:text-[var(--video-link)] transition-colors font-mono',
                      )}
                    >
                      {a.name}
                    </p>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.textSize('xs'),
                      )}
                    >
                      <span
                        className={cm.cn(
                          'font-mono text-[10px] text-[var(--video-text-dim)] uppercase tracking-widest',
                        )}
                      >
                        {formatSize(a.size_bytes)}
                      </span>
                      <StatusPill status="ready" label={a.kind} />
                    </div>
                    <span
                      className={cm.cn(
                        'font-mono text-[10px] text-[var(--video-text-dim)] uppercase tracking-widest',
                      )}
                    >
                      {timeAgo(a.created_at)}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </RushesLayout>
  )
}

export default AssetLibrary
