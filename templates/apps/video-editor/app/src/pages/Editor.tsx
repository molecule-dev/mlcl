import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track as trackEvent } from '@molecule/app-analytics'
import { unwrapSingle } from '@molecule/app-http'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { RushesLayout } from '../components/RushesLayout.js'
import { TimelinePreview } from '../components/TimelinePreview.js'

interface ProjectRow {
  id: string
  name: string
  width?: number | null
  height?: number | null
  fps?: number | null
}
interface AssetRow {
  id: string
  name: string
  kind: 'video' | 'audio' | 'image' | 'text'
  source_url?: string | null
  duration_ms?: number | null
}
interface TrackRow {
  id: string
  name: string
  type: string
  position: number
}
interface ClipRow {
  id: string
  name?: string | null
  start_time: number
  end_time: number
  track_id: string
  type: string
}

const ASSET_FILTERS = [
  { id: 'all', label: 'All', icon: 'inventory_2' },
  { id: 'video', label: 'Video', icon: 'videocam' },
  { id: 'audio', label: 'Audio', icon: 'graphic_eq' },
  { id: 'image', label: 'Image', icon: 'image' },
  { id: 'text', label: 'Text', icon: 'title' },
] as const

const KIND_SWATCH: Record<string, string> = {
  video: 'var(--video-cta-from)',
  audio: 'var(--mol-color-success)',
  image: 'var(--mol-color-info)',
  text: 'var(--mol-color-warning)',
}
const KIND_ICON: Record<string, string> = {
  video: 'videocam',
  audio: 'graphic_eq',
  image: 'image',
  text: 'title',
}

function arrayFrom<T>(res: unknown): T[] {
  const d = (res as { data?: unknown })?.data
  if (Array.isArray(d)) return d as T[]
  if (Array.isArray(res)) return res as T[]
  return []
}

function durationLabel(ms?: number | null): string {
  if (!ms || ms <= 0) return '--:--'
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function Editor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const params = useParams<{ id: string }>()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [project, setProject] = useState<ProjectRow | null>(null)
  const [tracks, setTracks] = useState<TrackRow[]>([])
  const [clips, setClips] = useState<ClipRow[]>([])
  const [assets, setAssets] = useState<AssetRow[]>([])
  const [filter, setFilter] = useState<(typeof ASSET_FILTERS)[number]['id']>('all')
  const [search, setSearch] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  async function reload() {
    if (!params.id) return
    setLoading(true)
    setError(null)
    try {
      const projRes = await http.get(`/api/projects/${params.id}`)
      const proj = unwrapSingle<ProjectRow>(projRes.data)
      if (!proj || !proj.id) throw new Error('Project not found')
      setProject(proj as ProjectRow)
      const [tRes, cRes, aRes] = await Promise.all([
        http.get(`/api/timeline/tracks?projectId=${params.id}`).catch(() => null),
        http.get(`/api/clips?projectId=${params.id}`).catch(() => null),
        http.get('/api/assets').catch(() => null),
      ])
      setTracks(arrayFrom<TrackRow>(tRes))
      setClips(arrayFrom<ClipRow>(cRes))
      setAssets(arrayFrom<AssetRow>(aRes))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const visibleAssets = useMemo(() => {
    return assets.filter((a) => {
      if (filter !== 'all' && a.kind !== filter) return false
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [assets, filter, search])

  async function handleAddClip(asset: AssetRow) {
    if (!project) return
    if (adding) return
    let track = tracks[0]
    setAdding(true)
    try {
      if (!track) {
        const res = await http.post('/api/timeline/tracks', {
          project_id: project.id,
          name: asset.kind === 'audio' ? 'Audio' : 'Video',
          type: asset.kind === 'audio' ? 'audio' : 'video',
          position: 0,
        })
        track = unwrapSingle<TrackRow>(res.data) as TrackRow
        setTracks((t) => [...t, track])
      }
      const lastEnd = clips
        .filter((c) => c.track_id === track.id)
        .reduce((max, c) => Math.max(max, c.end_time), 0)
      const dur = asset.duration_ms && asset.duration_ms > 0 ? asset.duration_ms : 5_000
      const res = await http.post('/api/clips', {
        project_id: project.id,
        track_id: track.id,
        source_url: asset.source_url ?? '',
        type:
          asset.kind === 'audio'
            ? 'audio'
            : asset.kind === 'image'
              ? 'image'
              : asset.kind === 'text'
                ? 'text'
                : 'video',
        start_time: lastEnd,
        end_time: lastEnd + dur,
        position: clips.filter((c) => c.track_id === track.id).length,
      })
      const clip = unwrapSingle<ClipRow>(res.data) as ClipRow
      setClips((c) => [...c, clip])
      void trackEvent({
        name: 'clip.added',
        properties: { project_id: project.id, clip_id: clip.id, kind: asset.kind },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add clip.')
    } finally {
      setAdding(false)
    }
  }

  async function handleExport() {
    if (!project) return
    try {
      const res = await http.post('/api/exports', {
        project_id: project.id,
        format: 'mp4',
        resolution: '1080p',
      })
      const created = unwrapSingle<{ id?: string }>(res.data)
      if (!created?.id) throw new Error('Export not created')
      void trackEvent({
        name: 'export.rendered',
        properties: {
          project_id: project.id,
          export_id: created.id,
          format: 'mp4',
          resolution: '1080p',
        },
      })
      navigate(`/export/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Render queue failed.')
    }
  }

  if (loading) {
    return (
      <RushesLayout
        title={t('editor.loading', {}, { defaultValue: 'Loading editor…' })}
        breadcrumb="// editor"
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-[var(--video-text-muted-alt)] font-mono')}>
          {t('editor.loading', {}, { defaultValue: 'Loading editor…' })}
        </p>
      </RushesLayout>
    )
  }
  if (error || !project) {
    return (
      <RushesLayout
        title={t('editor.error', {}, { defaultValue: 'Editor unavailable' })}
        breadcrumb="// editor"
      >
        <div className={cm.stack(4)}>
          <p
            role="alert"
            data-mol-id="editor-error"
            className={cm.cn(cm.textSize('sm'), 'text-[var(--video-error-text)] font-mono')}
          >
            {error ?? t('editor.notFound', {}, { defaultValue: 'Project not found.' })}
          </p>
          <Link
            to="/dashboard"
            className={cm.cn(
              'font-mono text-[11px] uppercase tracking-widest text-[var(--video-link)] hover:text-[var(--video-link-hover)]',
            )}
          >
            ← {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
          </Link>
        </div>
      </RushesLayout>
    )
  }

  const totalDuration = clips.reduce((max, c) => Math.max(max, c.end_time), 0)

  return (
    <RushesLayout title={project.name} breadcrumb="// editor" fullBleed>
      <div className={cm.cn('flex flex-col lg:h-full')} data-mol-id="editor-shell">
        <div
          className={cm.cn(
            'flex flex-row items-center justify-between flex-wrap gap-x-4 gap-y-2',
            cm.sp('px', 5),
            cm.sp('py', 3),
            'border-b border-[var(--video-border-subtle)] bg-[var(--video-input-bg)]',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
            <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--video-text-muted-alt)]">
              {t('editor.project', {}, { defaultValue: 'Project' })}
            </span>
            <span
              data-mol-id="editor-project-name"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-[var(--video-text-primary)]',
              )}
            >
              {project.name}
            </span>
            <span
              data-mol-id="editor-project-dims"
              className={
                'font-mono text-[10px] uppercase tracking-widest text-[var(--video-link)] bg-[var(--video-cta-from)]/15 border border-[var(--video-cta-from)]/40 px-2 py-0.5 rounded'
              }
            >
              {project.width ?? 1920}×{project.height ?? 1080} · {project.fps ?? 30}fps
            </span>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
            <Link
              to={`/projects/${project.id}`}
              data-mol-id="editor-project-link"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 1 }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-md text-[var(--video-text-primary)] bg-[var(--video-panel-bg)] border border-[var(--video-border-subtle)] hover:border-[var(--video-cta-from)]/60 transition-colors text-xs',
              )}
            >
              <span className="material-symbols-outlined text-[16px]">info</span>
              {t('nav.details', {}, { defaultValue: 'Details' })}
            </Link>
            <button
              type="button"
              data-mol-id="editor-export"
              onClick={handleExport}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 1 }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'rounded-md text-white bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] hover:opacity-90 transition-opacity text-xs',
              )}
            >
              <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
              {t('common.export', {}, { defaultValue: 'Export' })}
            </button>
          </div>
        </div>

        {/* Stacks to one column below lg; the three-pane studio grid above. */}
        <div className={cm.cn('flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] min-h-0')}>
          <aside
            className={cm.cn(
              'border-b lg:border-b-0 lg:border-r border-[var(--video-border-subtle)] bg-[var(--video-input-bg)] flex flex-col',
            )}
          >
            <div
              className={cm.cn(
                cm.sp('p', 4),
                'border-b border-[var(--video-border-subtle)]',
                cm.stack(3),
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-muted-alt)]">
                  {t('editor.media', {}, { defaultValue: 'Media' })}
                </span>
                <Link
                  to="/assets"
                  data-mol-id="editor-import"
                  aria-label={t('editor.import', {}, { defaultValue: 'Open asset library' })}
                  className={
                    'inline-flex p-2.5 -m-1.5 text-[var(--video-link)] hover:text-[var(--video-link-hover)] transition-colors'
                  }
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </Link>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined text-[16px] absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--video-text-dim)]">
                  search
                </span>
                <input
                  type="text"
                  data-mol-id="editor-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('editor.searchMedia', {}, { defaultValue: 'Search clips' })}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 2),
                    'rounded-md bg-[var(--video-panel-bg)] border border-[var(--video-border-subtle)] focus:border-[var(--video-cta-from)]/60 outline-none text-xs text-[var(--video-text-primary)] placeholder:text-[var(--video-text-dim)] pl-8 pr-2',
                  )}
                />
              </div>
              <div className={cm.cn(cm.flex({ gap: 1, wrap: 'wrap' }))}>
                {ASSET_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    data-mol-id={`editor-filter-${f.id}`}
                    aria-pressed={filter === f.id}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 1 }),
                      'px-2.5 py-2 rounded-md text-[10px] font-mono uppercase tracking-widest border transition-colors',
                      filter === f.id
                        ? 'border-[var(--video-cta-from)] bg-[var(--video-cta-from)]/15 text-[var(--video-link)]'
                        : 'border-[var(--video-border-subtle)] text-[var(--video-text-muted-alt)] hover:border-[var(--video-cta-from)]/40 hover:text-[var(--video-text-primary)]',
                    )}
                  >
                    <span className="material-symbols-outlined text-[12px]">{f.icon}</span>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div
              className={cm.cn('flex-1 overflow-y-auto', cm.sp('p', 3), cm.stack(2))}
              data-mol-id="editor-assets"
            >
              {visibleAssets.length === 0 ? (
                <p
                  data-mol-id="editor-assets-empty"
                  className={cm.cn(cm.textSize('xs'), 'text-[var(--video-text-dim)] font-mono p-2')}
                >
                  {assets.length === 0
                    ? t(
                        'editor.noAssets',
                        {},
                        { defaultValue: 'No assets yet — open the library to add some.' },
                      )
                    : t('editor.noMatches', {}, { defaultValue: 'No assets match your filter.' })}
                </p>
              ) : (
                visibleAssets.map((asset) => {
                  const swatch = KIND_SWATCH[asset.kind] ?? 'var(--video-cta-from)'
                  const icon = KIND_ICON[asset.kind] ?? 'videocam'
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      data-mol-id={`editor-asset-${asset.id}`}
                      onClick={() => handleAddClip(asset)}
                      disabled={adding}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 3 }),
                        cm.w('full'),
                        cm.sp('p', 2),
                        'rounded-md bg-[var(--video-panel-bg)] border border-[var(--video-border-subtle)] hover:border-[var(--video-cta-from)]/60 hover:bg-[var(--video-panel-bg)] transition-colors text-left disabled:opacity-50',
                      )}
                    >
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          'w-10 h-10 rounded shrink-0',
                        )}
                        style={{ backgroundColor: `${swatch}25`, border: `1px solid ${swatch}55` }}
                      >
                        <span
                          className="material-symbols-outlined text-[18px]"
                          style={{ color: swatch }}
                        >
                          {icon}
                        </span>
                      </div>
                      <div className={'min-w-0 flex-1'}>
                        <p
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('medium'),
                            'text-[var(--video-text-primary)] truncate',
                          )}
                        >
                          {asset.name}
                        </p>
                        <p
                          className={
                            'font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-dim)] mt-0.5'
                          }
                        >
                          {durationLabel(asset.duration_ms)} ·{' '}
                          {t('editor.clickToAdd', {}, { defaultValue: 'click to add' })}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          <section className={cm.cn('flex flex-col min-h-0 bg-[var(--video-timeline-bg)]')}>
            <div className={cm.cn('flex-1 flex items-center justify-center p-6 min-h-0')}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'relative w-full max-w-3xl aspect-video rounded-lg overflow-hidden border border-[var(--video-border-subtle)]',
                )}
                style={{
                  background:
                    'radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--video-cta-from) 35%, transparent) 0%, transparent 50%), radial-gradient(circle at 70% 70%, color-mix(in srgb, var(--video-cta-to) 25%, transparent) 0%, transparent 50%), var(--video-panel-bg)',
                }}
              >
                <div className={cm.cn('relative z-10 text-center', cm.stack(2))}>
                  <span className="material-symbols-outlined text-[48px] text-white/80">movie</span>
                  <p
                    data-mol-id="editor-preview-label"
                    className={cm.cn(
                      cm.textSize('sm'),
                      'text-white/90 font-mono uppercase tracking-widest',
                    )}
                  >
                    {project.width ?? 1920}×{project.height ?? 1080} · {project.fps ?? 30}fps
                  </p>
                </div>
                <div
                  className={
                    'absolute top-3 left-3 font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-muted-alt)] bg-foreground/40 backdrop-blur px-2 py-1 rounded'
                  }
                >
                  {clips.length === 0
                    ? t('editor.noClips', {}, { defaultValue: 'No clips yet' })
                    : t(
                        'editor.clipCount',
                        { count: clips.length, dur: durationLabel(totalDuration) },
                        { defaultValue: '{{count}} clips · {{dur}}' },
                      )}
                </div>
              </div>
            </div>

            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 4 }),
                cm.sp('py', 3),
                'border-t border-[var(--video-border-subtle)] bg-[var(--video-input-bg)]',
              )}
            >
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                aria-label={
                  isPlaying
                    ? t('common.pause', {}, { defaultValue: 'Pause' })
                    : t('common.play', {}, { defaultValue: 'Play' })
                }
                data-mol-id="editor-play"
                aria-pressed={isPlaying}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'w-12 h-12 rounded-full bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] text-white hover:opacity-90 transition-opacity',
                )}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
              <span className={'w-px h-6 bg-[var(--video-border-subtle)] mx-2'} />
              <span className={'font-mono text-xs text-[var(--video-text-primary)] tabular-nums'}>
                00:00:00
              </span>
              <span className={'font-mono text-xs text-[var(--video-text-dim)]'}>/</span>
              <span
                data-mol-id="editor-duration"
                className={'font-mono text-xs text-[var(--video-text-muted-alt)] tabular-nums'}
              >
                {durationLabel(totalDuration)}
              </span>
            </div>

            <div className={cm.cn(cm.sp('p', 4), 'border-t border-[var(--video-border-subtle)]')}>
              <TimelinePreview
                caption={
                  clips.length === 0
                    ? t(
                        'editor.timelineEmpty',
                        {},
                        { defaultValue: 'Drag from the media panel to add to a track.' },
                      )
                    : t(
                        'editor.timelineCaption',
                        { tracks: tracks.length, clips: clips.length },
                        { defaultValue: '{{tracks}} tracks · {{clips}} clips' },
                      )
                }
              />
            </div>
          </section>

          <aside
            className={cm.cn(
              'border-t lg:border-t-0 lg:border-l border-[var(--video-border-subtle)] bg-[var(--video-input-bg)] lg:overflow-y-auto',
              cm.stack(0),
            )}
            data-mol-id="editor-inspector"
          >
            <div className={cm.cn(cm.sp('p', 4), 'border-b border-[var(--video-border-subtle)]')}>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-muted-alt)]">
                {t('editor.inspector', {}, { defaultValue: 'Inspector' })}
              </span>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  cm.sp('mt', 1),
                  'text-[var(--video-text-primary)]',
                )}
              >
                {clips.length === 0
                  ? t('editor.noSelection', {}, { defaultValue: 'No clip selected' })
                  : t(
                      'editor.firstClip',
                      { name: clips[0].name ?? 'Clip 1' },
                      { defaultValue: '{{name}}' },
                    )}
              </p>
              <p className={'font-mono text-[10px] text-[var(--video-text-dim)] mt-0.5'}>
                {tracks.length} tracks · {clips.length} clips
              </p>
            </div>

            <div
              className={cm.cn(
                cm.sp('p', 4),
                'border-b border-[var(--video-border-subtle)]',
                cm.stack(2),
              )}
            >
              <h4 className="font-mono text-[10px] uppercase tracking-widest text-[var(--video-link)]">
                {t('editor.tracksHeading', {}, { defaultValue: 'Tracks' })}
              </h4>
              {tracks.length === 0 ? (
                <p className={cm.cn(cm.textSize('xs'), 'text-[var(--video-text-dim)] font-mono')}>
                  {t(
                    'editor.noTracks',
                    {},
                    { defaultValue: 'No tracks yet — add a clip to seed one.' },
                  )}
                </p>
              ) : (
                <ul className={cm.stack(2)} data-mol-id="editor-tracks">
                  {tracks.map((trk) => (
                    <li
                      key={trk.id}
                      data-mol-id={`editor-track-${trk.id}`}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        'rounded-md bg-[var(--video-panel-bg)] border border-[var(--video-border-subtle)]',
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-[var(--video-text-primary)] font-mono truncate',
                        )}
                      >
                        {trk.name}
                      </span>
                      <span
                        className={cm.cn(
                          'font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-dim)]',
                        )}
                      >
                        {trk.type}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={cm.cn(cm.sp('p', 4), cm.stack(2))}>
              <h4 className="font-mono text-[10px] uppercase tracking-widest text-[var(--video-link-hover)]">
                {t('editor.clipsHeading', {}, { defaultValue: 'Clips' })}
              </h4>
              {clips.length === 0 ? (
                <p className={cm.cn(cm.textSize('xs'), 'text-[var(--video-text-dim)] font-mono')}>
                  {t(
                    'editor.noClipsHint',
                    {},
                    { defaultValue: 'No clips yet — click an asset on the left.' },
                  )}
                </p>
              ) : (
                <ul className={cm.stack(2)} data-mol-id="editor-clips">
                  {clips.map((c) => (
                    <li
                      key={c.id}
                      data-mol-id={`editor-clip-${c.id}`}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        'rounded-md bg-[var(--video-panel-bg)] border border-[var(--video-border-subtle)]',
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-[var(--video-text-primary)] font-mono truncate',
                        )}
                      >
                        {c.name ?? c.id.slice(0, 6)}
                      </span>
                      <span
                        className={cm.cn(
                          'font-mono text-[10px] text-[var(--video-text-muted-alt)] tabular-nums',
                        )}
                      >
                        {durationLabel(c.end_time - c.start_time)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>
    </RushesLayout>
  )
}

export default Editor
