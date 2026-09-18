import { useEffect, useMemo, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AnimationToolLayout } from '../components/AnimationToolLayout.js'
import { MotionStatTile } from '../components/MotionStatTile.js'

type AssetType = 'all' | 'image' | 'svg' | 'video' | 'audio' | 'font'

interface ApiAsset {
  id: string
  name: string
  kind: 'image' | 'svg' | 'video' | 'audio' | 'font'
  size_bytes: number | string
  url: string
  created_at: string
}

interface AssetSummary {
  total: number
  totalSizeBytes: number
  counts: Record<Exclude<AssetType, 'all'>, number>
}

const SWATCHES: Record<Exclude<AssetType, 'all'>, string> = {
  image: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  svg: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
  video: 'linear-gradient(135deg, #ef4444, #f59e0b)',
  audio: 'linear-gradient(135deg, #22c55e, #06b6d4)',
  font: 'linear-gradient(135deg, #a78bfa, #f472b6)',
}

const GLYPHS: Record<Exclude<AssetType, 'all'>, string> = {
  image: 'image',
  svg: 'shape_line',
  video: 'play_circle',
  audio: 'graphic_eq',
  font: 'text_format',
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
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const FILTERS: Array<{ id: AssetType; label: string; defaultLabel: string }> = [
  { id: 'all', label: 'assets.filter.all', defaultLabel: 'All' },
  { id: 'image', label: 'assets.filter.image', defaultLabel: 'Images' },
  { id: 'svg', label: 'assets.filter.svg', defaultLabel: 'SVG' },
  { id: 'video', label: 'assets.filter.video', defaultLabel: 'Video' },
  { id: 'audio', label: 'assets.filter.audio', defaultLabel: 'Audio' },
  { id: 'font', label: 'assets.filter.font', defaultLabel: 'Fonts' },
]

export function Assets() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [assets, setAssets] = useState<ApiAsset[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<AssetSummary | null>(null)
  const [filter, setFilter] = useState<AssetType>('all')
  const [selected, setSelected] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionInFlight, setActionInFlight] = useState(false)
  const [latestProject, setLatestProject] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<ApiAsset[] | { data: ApiAsset[] }>('/api/assets')
      .then((res) => {
        if (cancelled) return
        const arr = Array.isArray(res.data)
          ? (res.data as ApiAsset[])
          : ((res.data as { data?: ApiAsset[] }).data ?? [])
        setAssets(arr)
        if (arr.length > 0) setSelected(arr[0]!.id)
      })
      .catch(() => {
        if (cancelled) return
        setError(t('assets.fetchError', {}, { defaultValue: 'Could not load assets.' }))
        setAssets([])
      })
    http
      .get<AssetSummary | { data: AssetSummary }>('/api/assets/summary')
      .then((res) => {
        if (cancelled) return
        const data = (res.data as { data?: AssetSummary }).data ?? (res.data as AssetSummary)
        setSummary(data)
      })
      .catch(() => {
        // Summary is best-effort; falls back to derived totals.
      })
    http
      .get<Array<{ id: string; name: string }> | { data: Array<{ id: string; name: string }> }>(
        '/api/projects?limit=1',
      )
      .then((res) => {
        if (cancelled) return
        const arr = Array.isArray(res.data)
          ? (res.data as Array<{ id: string; name: string }>)
          : ((res.data as { data?: Array<{ id: string; name: string }> }).data ?? [])
        setLatestProject(arr[0] ?? null)
      })
      .catch(() => {
        if (cancelled) return
        setLatestProject(null)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function handleUseInProject(asset: ApiAsset) {
    if (actionInFlight) return
    setActionMessage(null)
    setActionError(null)
    if (!latestProject) {
      setActionError(
        t(
          'assets.useNeedProject',
          {},
          { defaultValue: 'Create a project first — assets need a canvas to land on.' },
        ),
      )
      return
    }
    setActionInFlight(true)
    try {
      const layerType: 'image' | 'shape' | 'text' =
        asset.kind === 'image' || asset.kind === 'svg' || asset.kind === 'video'
          ? 'image'
          : asset.kind === 'font'
            ? 'text'
            : 'shape'
      await http.post('/api/layers', {
        projectId: latestProject.id,
        name: asset.name,
        type: layerType,
        transform: { assetId: asset.id, assetUrl: asset.url, kind: asset.kind },
      })
      setActionMessage(
        t(
          'assets.useAssetConfirm',
          { name: asset.name, project: latestProject.name },
          {
            defaultValue: 'Added "{{name}}" to project {{project}} as a new layer.',
          },
        ),
      )
    } catch (error) {
      logError('assets.useInProject', error)
      setActionError(
        t(
          'assets.useAssetError',
          {},
          { defaultValue: 'Could not add asset — try again, or open the project.' },
        ),
      )
    } finally {
      setActionInFlight(false)
    }
  }

  const visible = useMemo(() => {
    if (!assets) return []
    return filter === 'all' ? assets : assets.filter((a) => a.kind === filter)
  }, [assets, filter])

  const detail = useMemo(() => {
    if (!assets || assets.length === 0) return null
    return assets.find((a) => a.id === selected) ?? assets[0] ?? null
  }, [assets, selected])

  const totalCount = summary?.total ?? assets?.length ?? 0
  const totalSize =
    summary?.totalSizeBytes ?? assets?.reduce((acc, a) => acc + Number(a.size_bytes ?? 0), 0) ?? 0
  const imageCount = summary?.counts.image ?? assets?.filter((a) => a.kind === 'image').length ?? 0
  const videoCount = summary?.counts.video ?? assets?.filter((a) => a.kind === 'video').length ?? 0

  return (
    <AnimationToolLayout
      title={t('assets.title', {}, { defaultValue: 'Assets' })}
      breadcrumb={t(
        'assets.crumb',
        { filter: filter as string },
        { defaultValue: '// assets · {{filter}}' },
      )}
    >
      <div className={cm.stack(6)}>
        <div className={cm.cn('grid grid-cols-2 md:grid-cols-4 gap-4')}>
          <MotionStatTile
            label={t('assets.statStorage', {}, { defaultValue: 'Storage used' })}
            value={formatBytes(totalSize).split(' ')[0] ?? '0'}
            unit={formatBytes(totalSize).split(' ')[1] ?? 'B'}
            accent="accent"
            icon="storage"
          />
          <MotionStatTile
            label={t('assets.statTotal', {}, { defaultValue: 'Total assets' })}
            value={String(totalCount)}
            accent="primary"
            icon="folder"
          />
          <MotionStatTile
            label={t('assets.statImages', {}, { defaultValue: 'Images' })}
            value={String(imageCount)}
            accent="secondary"
            icon="image"
          />
          <MotionStatTile
            label={t('assets.statVideos', {}, { defaultValue: 'Videos' })}
            value={String(videoCount)}
            accent="warning"
            icon="movie"
          />
        </div>

        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'flex-wrap')}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              data-mol-id={`assets-filter-${f.id}`}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                'font-mono text-[10px] uppercase tracking-widest rounded-full border transition-colors',
                filter === f.id
                  ? 'bg-[color-mix(in_srgb,var(--anim-primary)_15%,transparent)] text-[var(--anim-primary)] border-[color-mix(in_srgb,var(--anim-primary)_40%,transparent)]'
                  : 'border-[var(--anim-border)] text-[var(--anim-text-secondary)] hover:border-[color-mix(in_srgb,var(--anim-primary)_40%,transparent)] hover:text-[var(--anim-primary)]',
              )}
            >
              {t(f.label, {}, { defaultValue: f.defaultLabel })}
            </button>
          ))}
        </div>

        {assets === null ? (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'text-[var(--anim-text-secondary)] font-mono uppercase tracking-widest',
            )}
          >
            {t('assets.loading', {}, { defaultValue: 'Loading assets…' })}
          </p>
        ) : error ? (
          <p
            role="alert"
            className={cm.cn(cm.textSize('sm'), 'text-[var(--anim-danger)] font-mono')}
          >
            {error}
          </p>
        ) : assets.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              'rounded-xl border border-dashed border-[var(--anim-border)] bg-[var(--anim-surface)]/40',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-5xl text-[var(--anim-text-muted)]')}
            >
              collections
            </span>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 4),
                'text-[var(--anim-text-secondary)]',
              )}
            >
              {t(
                'assets.empty',
                {},
                {
                  defaultValue:
                    'No assets yet — upload images, audio, or fonts to start your library.',
                },
              )}
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              'rounded-xl border border-dashed border-[var(--anim-border)] bg-[var(--anim-surface)]/40',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-5xl text-[var(--anim-text-muted)]')}
            >
              filter_alt_off
            </span>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 4),
                'text-[var(--anim-text-secondary)]',
              )}
            >
              {t('assets.emptyFilter', {}, { defaultValue: 'No assets match that filter.' })}
            </p>
          </div>
        ) : (
          <div className={cm.cn('grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6')}>
            <div className={cm.cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3')}>
              {visible.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelected(a.id)}
                  data-mol-id={`asset-${a.id}`}
                  className={cm.cn(
                    'rounded-xl overflow-hidden border bg-[var(--anim-surface)] text-left transition-all hover:-translate-y-0.5',
                    selected === a.id
                      ? 'border-[color-mix(in_srgb,var(--anim-secondary)_60%,transparent)] shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--anim-secondary)_50%,transparent)]'
                      : 'border-[var(--anim-border)] hover:border-[color-mix(in_srgb,var(--anim-primary)_40%,transparent)]',
                  )}
                >
                  <div
                    className={cm.cn('aspect-square relative')}
                    style={{ background: SWATCHES[a.kind] }}
                  >
                    <span
                      className={cm.cn(
                        'material-symbols-outlined absolute inset-0 flex items-center justify-center text-white/80 text-4xl',
                      )}
                    >
                      {GLYPHS[a.kind]}
                    </span>
                    <div
                      className={cm.cn(
                        'absolute inset-0 bg-gradient-to-t from-[var(--anim-surface)] via-transparent to-transparent',
                      )}
                    />
                    <span
                      className={cm.cn(
                        'absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-widest bg-foreground/50 text-white',
                      )}
                    >
                      {a.kind}
                    </span>
                  </div>
                  <div className={cm.cn(cm.sp('p', 3), cm.stack(1))}>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'text-[var(--anim-text)] truncate font-mono block',
                      )}
                    >
                      {a.name}
                    </span>
                    <span
                      className={cm.cn(
                        'font-mono text-[10px] uppercase tracking-widest text-[var(--anim-text-muted)]',
                      )}
                    >
                      {formatBytes(Number(a.size_bytes ?? 0))}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {detail ? (
              <aside
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.stack(4),
                  'rounded-xl bg-[var(--anim-surface)] border border-[var(--anim-border)] h-fit sticky top-4',
                )}
              >
                <h3
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'text-[var(--anim-text)]',
                  )}
                >
                  {t('assets.detail', {}, { defaultValue: 'Detail' })}
                </h3>
                <div
                  className={cm.cn('aspect-video rounded-lg overflow-hidden relative')}
                  style={{ background: SWATCHES[detail.kind] }}
                >
                  <span
                    className={cm.cn(
                      'material-symbols-outlined absolute inset-0 flex items-center justify-center text-white/80 text-5xl',
                    )}
                  >
                    {GLYPHS[detail.kind]}
                  </span>
                </div>
                <dl className={cm.cn(cm.stack(2), cm.textSize('xs'))}>
                  <div className={cm.cn('flex items-center justify-between')}>
                    <dt
                      className={cm.cn(
                        'font-mono uppercase tracking-widest text-[var(--anim-text-muted)]',
                      )}
                    >
                      {t('form.name', {}, { defaultValue: 'Name' })}
                    </dt>
                    <dd className={cm.cn('text-[var(--anim-text)] font-mono truncate')}>
                      {detail.name}
                    </dd>
                  </div>
                  <div className={cm.cn('flex items-center justify-between')}>
                    <dt
                      className={cm.cn(
                        'font-mono uppercase tracking-widest text-[var(--anim-text-muted)]',
                      )}
                    >
                      {t('form.type', {}, { defaultValue: 'Type' })}
                    </dt>
                    <dd className={cm.cn('text-[var(--anim-primary)] font-mono uppercase')}>
                      {detail.kind}
                    </dd>
                  </div>
                  <div className={cm.cn('flex items-center justify-between')}>
                    <dt
                      className={cm.cn(
                        'font-mono uppercase tracking-widest text-[var(--anim-text-muted)]',
                      )}
                    >
                      {t('form.size', {}, { defaultValue: 'Size' })}
                    </dt>
                    <dd className={cm.cn('text-[var(--anim-text)] font-mono')}>
                      {formatBytes(Number(detail.size_bytes ?? 0))}
                    </dd>
                  </div>
                  <div className={cm.cn('flex items-center justify-between')}>
                    <dt
                      className={cm.cn(
                        'font-mono uppercase tracking-widest text-[var(--anim-text-muted)]',
                      )}
                    >
                      {t('assets.detailUpdated', {}, { defaultValue: 'Updated' })}
                    </dt>
                    <dd className={cm.cn('text-[var(--anim-text)] font-mono')}>
                      {formatTimeAgo(detail.created_at)}
                    </dd>
                  </div>
                </dl>
                <button
                  type="button"
                  onClick={() => void handleUseInProject(detail)}
                  disabled={actionInFlight}
                  data-mol-id={`asset-use-${detail.id}`}
                  className={cm.cn(
                    cm.w('full'),
                    cm.fontWeight('semibold'),
                    cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'rounded-lg bg-gradient-to-r from-[var(--anim-primary)] to-[var(--anim-secondary)] text-white hover:opacity-90 transition-opacity disabled:opacity-60',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-[16px]')}>add</span>
                  <span>
                    {actionInFlight
                      ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                      : t('assets.useAsset', {}, { defaultValue: 'Use in project' })}
                  </span>
                </button>
                {actionMessage ? (
                  <p
                    role="status"
                    data-mol-id="asset-use-status"
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-[var(--anim-primary)] font-mono uppercase tracking-widest',
                    )}
                  >
                    {actionMessage}
                  </p>
                ) : null}
                {actionError ? (
                  <p
                    role="alert"
                    data-mol-id="asset-use-error"
                    className={cm.cn(cm.textSize('xs'), 'text-[var(--anim-danger)] font-mono')}
                  >
                    {actionError}
                  </p>
                ) : null}
              </aside>
            ) : null}
          </div>
        )}
      </div>
    </AnimationToolLayout>
  )
}

export default Assets
