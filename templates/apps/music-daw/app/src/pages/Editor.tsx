import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { unwrapList, unwrapSingle } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { TrackLaneItem } from '../components/TrackLane.js'
import { TrackLane } from '../components/TrackLane.js'

interface ProjectMeta {
  id: string
  name: string
  bpm: number
  time_signature: string
  duration?: number | string
  duration_seconds?: number
  cover_index?: number
  collaborators?: string[]
}

interface ApiTrack {
  id: string
  name: string
  type: string
  position: number
  muted?: boolean
  solo?: boolean
  armed?: boolean
}

const LANE_COLORS = [
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#22c55e',
  '#ec4899',
  '#eab308',
  '#3b82f6',
  '#14b8a6',
]

const TOOLS = [
  { key: 'select', defaultLabel: 'Select', icon: 'arrow_selector_tool' },
  { key: 'pencil', defaultLabel: 'Pencil', icon: 'edit' },
  { key: 'cut', defaultLabel: 'Cut', icon: 'content_cut' },
  { key: 'magnify', defaultLabel: 'Zoom', icon: 'zoom_in' },
  { key: 'mute', defaultLabel: 'Mute', icon: 'volume_off' },
] as const

function toLaneItem(t: ApiTrack): TrackLaneItem {
  const i = t.position ?? 0
  const apiType = (t.type ?? 'audio') as string
  const type: TrackLaneItem['type'] =
    apiType === 'midi' || apiType === 'audio' || apiType === 'instrument' || apiType === 'bus'
      ? apiType
      : 'audio'
  return {
    id: t.id,
    name: t.name,
    type,
    lane_color: LANE_COLORS[i % LANE_COLORS.length],
    clips: [],
    muted: t.muted,
    solo: t.solo,
    armed: t.armed,
  }
}

export function Editor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectMeta | null>(null)
  const [tracks, setTracks] = useState<TrackLaneItem[]>([])
  const [tool, setTool] = useState<(typeof TOOLS)[number]['key']>('select')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [openingPianoRoll, setOpeningPianoRoll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const load = async () => {
      try {
        const [projRes, tracksRes] = await Promise.all([
          http.get<unknown>(`/api/projects/${id}`),
          http.get<unknown>(`/api/tracks?project_id=${id}`),
        ])
        if (cancelled) return
        setProject(unwrapSingle<ProjectMeta>(projRes.data))
        const lanes = unwrapList<ApiTrack>(tracksRes.data).map(toLaneItem)
        setTracks(lanes)
        if (lanes.length > 0) setSelectedId(lanes[0].id)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : t('editor.loadFailed', {}, { defaultValue: 'Failed to load project.' }),
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const handleAddTrack = async (kind: 'audio' | 'midi' = 'audio') => {
    if (!id || adding) return
    setAdding(true)
    setError(null)
    try {
      const res = await http.post<unknown>('/api/tracks', {
        project_id: id,
        name: t(
          kind === 'midi' ? 'editor.newMidiTrackLabel' : 'editor.newTrackLabel',
          { num: tracks.length + 1 },
          { defaultValue: kind === 'midi' ? 'New MIDI track {{num}}' : 'New track {{num}}' },
        ),
        type: kind,
      })
      const created = unwrapSingle<ApiTrack>(res.data)
      if (created && created.id) {
        track({
          name: 'track.added',
          properties: { track_id: created.id, project_id: id, type: kind },
        })
        const lane = toLaneItem({ ...created, position: tracks.length })
        setTracks((prev) => [...prev, lane])
        setSelectedId(lane.id)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('editor.addFailed', {}, { defaultValue: 'Failed to add track.' }),
      )
    } finally {
      setAdding(false)
    }
  }

  const handleOpenPianoRoll = async () => {
    if (!id || openingPianoRoll) return
    const trackId = selectedId ?? tracks[0]?.id
    if (!trackId) {
      setError(
        t(
          'editor.noTrackForPianoRoll',
          {},
          {
            defaultValue: 'Add a track first, then open the piano roll.',
          },
        ),
      )
      return
    }
    setOpeningPianoRoll(true)
    setError(null)
    try {
      const existing = await http.get<unknown>(`/api/clips?track_id=${trackId}`)
      const clips = unwrapList<{ id: string; kind?: string }>(existing.data)
      let clipId = clips.find((c) => c.kind === 'midi')?.id
      if (!clipId) {
        const res = await http.post<unknown>('/api/clips', {
          track_id: trackId,
          kind: 'midi',
          start_time: 0,
          duration: 4,
        })
        const created = unwrapSingle<{ id: string }>(res.data)
        clipId = created?.id
      }
      if (clipId) {
        navigate(`/projects/${id}/clips/${clipId}`)
      } else {
        setError(
          t('editor.openPianoRollFailed', {}, { defaultValue: 'Failed to open piano roll.' }),
        )
      }
    } catch (error) {
      setError(t('editor.openPianoRollFailed', {}, { defaultValue: 'Failed to open piano roll.' }))
      logError('editor.openPianoRoll', error)
    } finally {
      setOpeningPianoRoll(false)
    }
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8))}>
        <p className={cm.cn('text-sm', cm.textMuted)}>
          {t('editor.loading', {}, { defaultValue: 'Loading project…' })}
        </p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), 'space-y-4')}>
        <Link
          to="/projects"
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('editor.backLink', {}, { defaultValue: 'All projects' })}
        </Link>
        <p className={cm.cn('text-sm text-on-surface-variant')}>
          {t('editor.notFound', {}, { defaultValue: 'Project not found.' })}
        </p>
      </div>
    )
  }

  const dur =
    typeof project.duration === 'string'
      ? parseFloat(project.duration)
      : (project.duration ?? project.duration_seconds ?? 0)

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 6), 'space-y-6')}>
      <header className={cm.cn('flex items-center gap-4 flex-wrap')}>
        <Link
          to="/projects"
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-on-surface flex items-center gap-1',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('editor.backLink', {}, { defaultValue: 'All projects' })}
        </Link>
        <h1
          className={cm.cn(
            'text-2xl font-extrabold tracking-tight text-on-surface flex-1 min-w-0 truncate',
          )}
        >
          {project.name}
        </h1>
        <div
          className={cm.cn(
            'flex items-center gap-3 text-[12px] font-mono tabular-nums text-on-surface-variant',
          )}
        >
          <span>{project.bpm} BPM</span>
          <span aria-hidden="true">·</span>
          <span>{project.time_signature}</span>
          <span aria-hidden="true">·</span>
          <span>
            {Math.floor(Number(dur) / 60)}:
            {Math.floor(Number(dur) % 60)
              .toString()
              .padStart(2, '0')}
          </span>
        </div>
        <Link
          to={`/projects/${project.id}/mix`}
          className={cm.cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-lowest border border-outline-variant text-sm font-semibold hover:bg-surface-container transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            tune
          </span>
          {t('editor.openMixer', {}, { defaultValue: 'Open mixer' })}
        </Link>
      </header>

      <div
        className={cm.cn(
          'flex items-center gap-2 flex-wrap p-2 bg-surface-container-lowest rounded-xl border border-outline-variant',
        )}
      >
        {TOOLS.map((toolItem) => (
          <button
            key={toolItem.key}
            type="button"
            onClick={() => setTool(toolItem.key)}
            aria-pressed={tool === toolItem.key}
            className={cm.cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
              tool === toolItem.key
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              {toolItem.icon}
            </span>
            {t(`editor.tool.${toolItem.key}`, {}, { defaultValue: toolItem.defaultLabel })}
          </button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className={cm.cn(
            'text-sm text-on-error-container bg-error-container px-3 py-2 rounded-lg',
          )}
        >
          {error}
        </p>
      )}

      {tracks.length === 0 ? (
        <div
          className={cm.cn(
            'rounded-2xl border border-dashed border-outline-variant px-6 py-12 text-center',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant')}
            aria-hidden="true"
          >
            graphic_eq
          </span>
          <p className={cm.cn('text-sm font-semibold text-on-surface-variant mt-3')}>
            {t(
              'editor.emptyTracks',
              {},
              { defaultValue: 'No tracks yet — add your first audio or MIDI lane.' },
            )}
          </p>
        </div>
      ) : (
        <TrackLane tracks={tracks} totalBeats={32} selectedId={selectedId ?? undefined} />
      )}

      <div className={cm.cn('flex items-center justify-between gap-4 flex-wrap')}>
        <div className={cm.cn('flex items-center gap-2 flex-wrap')}>
          <button
            type="button"
            onClick={() => handleAddTrack('audio')}
            disabled={adding}
            className={cm.cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-surface-container-lowest border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-60',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              add
            </span>
            {adding
              ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
              : t('editor.addTrack', {}, { defaultValue: 'Add audio track' })}
          </button>
          <button
            type="button"
            onClick={() => handleAddTrack('midi')}
            disabled={adding}
            className={cm.cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-surface-container-lowest border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-60',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              piano
            </span>
            {t('editor.addMidiTrack', {}, { defaultValue: 'Add MIDI track' })}
          </button>
          {tracks.length > 0 && (
            <button
              type="button"
              onClick={handleOpenPianoRoll}
              disabled={openingPianoRoll}
              className={cm.cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-60',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                music_note
              </span>
              {openingPianoRoll
                ? t('editor.openingPianoRoll', {}, { defaultValue: 'Opening piano roll…' })
                : t('editor.openPianoRoll', {}, { defaultValue: 'Open piano roll' })}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
