import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { unwrapSingle } from '@molecule/app-http'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { RushesLayout } from '../components/RushesLayout.js'

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
  is_public?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

const SWATCH_BY_KIND: Record<string, string> = {
  video: 'linear-gradient(135deg, var(--video-cta-from), var(--video-cta-to))',
  audio: 'linear-gradient(135deg, var(--mol-color-info), var(--mol-color-secondary))',
  image: 'linear-gradient(135deg, var(--mol-color-warning), var(--video-cta-to))',
  text: 'linear-gradient(135deg, var(--video-cta-to), var(--video-link-hover))',
}
const ICON_BY_KIND: Record<string, string> = {
  video: 'videocam',
  audio: 'graphic_eq',
  image: 'image',
  text: 'text_fields',
}

function formatSize(bytes?: number | string | null): string {
  const n = typeof bytes === 'string' ? Number(bytes) : (bytes ?? 0)
  if (!n || Number.isNaN(n)) return '0 KB'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`
}
function durationLabel(ms?: number | null): string {
  if (!ms || ms <= 0) return '—'
  const t = Math.floor(ms / 1000)
  const m = Math.floor(t / 60)
  const s = t % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function AssetDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [asset, setAsset] = useState<AssetRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await http.get(`/api/assets/${id}`)
        if (cancelled) return
        const a = unwrapSingle<AssetRow>(res.data)
        if (!a || !a.id) throw new Error('Asset not found')
        setAsset(a as AssetRow)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load asset.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, http])

  async function handleDelete() {
    if (!asset) return
    if (
      !confirm(
        t(
          'assetDetail.confirmDelete',
          { name: asset.name },
          { defaultValue: 'Delete "{{name}}"? This cannot be undone.' },
        ),
      )
    )
      return
    setDeleting(true)
    setError(null)
    try {
      await http.delete(`/api/assets/${asset.id}`)
      navigate('/assets')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <RushesLayout
        title={t('assetDetail.loading', {}, { defaultValue: 'Loading asset…' })}
        breadcrumb="// assets"
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-[var(--video-text-muted-alt)] font-mono')}>
          {t('assetDetail.loading', {}, { defaultValue: 'Loading asset…' })}
        </p>
      </RushesLayout>
    )
  }
  if (error || !asset) {
    return (
      <RushesLayout
        title={t('assetDetail.error', {}, { defaultValue: 'Asset unavailable' })}
        breadcrumb="// assets"
      >
        <div className={cm.stack(4)}>
          <p
            role="alert"
            data-mol-id="asset-error"
            className={cm.cn(cm.textSize('sm'), 'text-[var(--video-error-text)] font-mono')}
          >
            {error ?? t('assetDetail.notFound', {}, { defaultValue: 'Asset not found.' })}
          </p>
          <Link
            to="/assets"
            className={cm.cn(
              'font-mono text-[11px] uppercase tracking-widest text-[var(--video-link)] hover:text-[var(--video-link-hover)]',
            )}
          >
            ← {t('assetDetail.back', {}, { defaultValue: 'Back to library' })}
          </Link>
        </div>
      </RushesLayout>
    )
  }

  const swatch = SWATCH_BY_KIND[asset.kind] ?? SWATCH_BY_KIND.video
  const icon = ICON_BY_KIND[asset.kind] ?? 'video_library'

  return (
    <RushesLayout
      title={asset.name}
      breadcrumb={t(
        'assetDetail.crumb',
        { id: asset.id.slice(0, 8) },
        { defaultValue: '// assets › {{id}}' },
      )}
    >
      <div
        data-mol-id="asset-detail"
        className={cm.cn('grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6')}
      >
        <section className={cm.cn(cm.stack(4))}>
          <div
            className={cm.cn(
              'relative aspect-video rounded-2xl border border-[var(--video-border-subtle)] overflow-hidden flex items-center justify-center',
            )}
            style={{ background: swatch }}
          >
            <div
              className={cm.cn(
                'absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.18)_1px,transparent_0)] [background-size:24px_24px] opacity-50',
              )}
            />
            <span className={cm.cn('material-symbols-outlined text-white/85 text-[64px]')}>
              {icon}
            </span>
            <span
              className={cm.cn(
                'absolute bottom-3 right-3 font-mono text-[12px] tracking-widest text-white bg-foreground/60 backdrop-blur px-2 py-1 rounded',
              )}
            >
              {durationLabel(asset.duration_ms)}
            </span>
            <span
              className={cm.cn(
                'absolute top-3 left-3 font-mono text-[10px] uppercase tracking-widest text-white/90 bg-foreground/40 backdrop-blur px-2 py-1 rounded',
              )}
            >
              {asset.kind}
            </span>
          </div>

          {asset.source_url && (
            <div
              className={cm.cn(
                cm.sp('p', 4),
                cm.stack(2),
                'rounded-md bg-[var(--video-input-bg)] border border-[var(--video-border-subtle)]',
              )}
            >
              <p
                className={cm.cn(
                  'font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-muted-alt)]',
                )}
              >
                {t('assetDetail.sourceUrl', {}, { defaultValue: 'Source URL' })}
              </p>
              <p
                data-mol-id="asset-source-url"
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-mono text-[var(--video-text-primary)] break-all',
                )}
              >
                {asset.source_url}
              </p>
            </div>
          )}
        </section>

        <aside className={cm.cn(cm.stack(4))}>
          <div
            className={cm.cn(
              cm.sp('p', 5),
              cm.stack(3),
              'rounded-xl bg-[var(--video-panel-bg)] border border-[var(--video-border-subtle)]',
            )}
          >
            <h2
              data-mol-id="asset-name"
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                'tracking-tight text-[var(--video-text-primary)] truncate font-mono',
              )}
            >
              {asset.name}
            </h2>
            <Stat
              label={t('form.size', {}, { defaultValue: 'Size' })}
              value={formatSize(asset.size_bytes)}
            />
            {asset.width && asset.height ? (
              <Stat
                label={t('assetDetail.resolution', {}, { defaultValue: 'Resolution' })}
                value={`${asset.width}×${asset.height}`}
              />
            ) : null}
            <Stat label={t('form.kind', {}, { defaultValue: 'Kind' })} value={asset.kind} />
            <Stat
              label={t('assetDetail.id', {}, { defaultValue: 'ID' })}
              value={asset.id.slice(0, 8)}
            />
          </div>

          <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
            {asset.source_url && (
              <a
                href={asset.source_url}
                target="_blank"
                rel="noopener noreferrer"
                data-mol-id="asset-download"
                className={cm.cn(
                  cm.fontWeight('medium'),
                  cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-lg border border-[var(--video-border-subtle)] hover:border-[var(--video-cta-from)]/40 text-[var(--video-text-primary)] transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>open_in_new</span>
                <span>{t('assetDetail.openSource', {}, { defaultValue: 'Open source' })}</span>
              </a>
            )}
            <button
              type="button"
              data-mol-id="asset-delete"
              onClick={handleDelete}
              disabled={deleting}
              className={cm.cn(
                cm.fontWeight('medium'),
                cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg border border-[var(--video-danger)]/40 text-[var(--video-error-text)] hover:bg-[var(--video-danger)]/10 transition-colors disabled:opacity-50',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>delete</span>
              <span>
                {deleting
                  ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
                  : t('assetDetail.delete', {}, { defaultValue: 'Delete asset' })}
              </span>
            </button>
          </div>
        </aside>
      </div>
    </RushesLayout>
  )
}

interface StatProps {
  label: string
  value: string
}
function Stat({ label, value }: StatProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('xs'))}>
      <span className={cm.cn('font-mono uppercase tracking-widest text-[var(--video-text-dim)]')}>
        {label}
      </span>
      <span className={cm.cn('font-mono text-[var(--video-text-primary)]')}>{value}</span>
    </div>
  )
}

export default AssetDetail
