import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { unwrapList } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ApiTrack {
  id: string
  name: string
  type: string
  position: number
  volume: number | string
  pan: number | string
  muted?: boolean
  solo?: boolean
  armed?: boolean
}

interface ChannelStrip {
  id: string
  name: string
  color: string
  level: number
  pan: number
  meter: number
  muted?: boolean
  solo?: boolean
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

function toStrip(track: ApiTrack, idx: number): ChannelStrip {
  const level = Number(track.volume ?? 0.8)
  const pan = Number(track.pan ?? 0)
  return {
    id: track.id,
    name: track.name,
    color: LANE_COLORS[idx % LANE_COLORS.length],
    level: Number.isFinite(level) ? level : 0.8,
    pan: Number.isFinite(pan) ? pan : 0,
    meter: Math.min(1, Math.max(0.2, level)),
    muted: Boolean(track.muted),
    solo: Boolean(track.solo),
  }
}

export function Mixing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [strips, setStrips] = useState<ChannelStrip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get<unknown>(`/api/tracks?project_id=${id}`)
      .then((res) => {
        if (cancelled) return
        setStrips(unwrapList<ApiTrack>(res.data).map(toStrip))
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError(t('mixing.loadFailed', {}, { defaultValue: 'Failed to load mixer.' }))
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const updateTrack = async (
    trackId: string,
    updates: Partial<{ muted: boolean; solo: boolean; volume: number; pan: number }>,
  ) => {
    setBusyId(trackId)
    setStrips((prev) =>
      prev.map((s) =>
        s.id === trackId
          ? {
              ...s,
              muted: updates.muted ?? s.muted,
              solo: updates.solo ?? s.solo,
              level: updates.volume ?? s.level,
              pan: updates.pan ?? s.pan,
            }
          : s,
      ),
    )
    try {
      await http.put<unknown>(`/api/tracks/${trackId}`, updates)
    } catch (error) {
      setError(t('mixing.updateFailed', {}, { defaultValue: 'Failed to save change.' }))
      logError('mixing.updateTrack', error)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 6), 'space-y-6')}>
      <header className={cm.cn('flex items-center gap-4 flex-wrap')}>
        <Link
          to={`/projects/${id ?? ''}`}
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-on-surface flex items-center gap-1',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('mixing.backLink', {}, { defaultValue: 'Arrangement' })}
        </Link>
        <h1
          className={cm.cn(
            'text-2xl font-extrabold tracking-tight text-on-surface flex-1 min-w-0 truncate',
          )}
        >
          {t('mixing.title', {}, { defaultValue: 'Mixer' })}
        </h1>
        <span
          className={cm.cn(
            'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface-container text-on-surface-variant',
          )}
        >
          {t('mixing.tracksLabel', { count: strips.length }, { defaultValue: '{{count}} tracks' })}
        </span>
      </header>

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

      {loading ? (
        <p className={cm.cn('text-sm', cm.textMuted)}>
          {t('mixing.loading', {}, { defaultValue: 'Loading mixer…' })}
        </p>
      ) : strips.length === 0 ? (
        <div
          className={cm.cn(
            'rounded-2xl border border-dashed border-outline-variant px-6 py-12 text-center',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant')}
            aria-hidden="true"
          >
            tune
          </span>
          <p className={cm.cn('text-sm font-semibold text-on-surface-variant mt-3')}>
            {t(
              'mixing.empty',
              {},
              { defaultValue: 'No tracks yet — add a track in the arrangement view first.' },
            )}
          </p>
          <Link
            to={`/projects/${id ?? ''}`}
            className={cm.cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-primary text-on-primary mt-3',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              arrow_back
            </span>
            {t('mixing.toArrangement', {}, { defaultValue: 'Open arrangement' })}
          </Link>
        </div>
      ) : (
        <div
          className={cm.cn(
            'overflow-x-auto rounded-2xl bg-surface-container-lowest border border-outline-variant',
          )}
        >
          <div className={cm.cn('flex gap-px bg-outline-variant/40 min-w-max')}>
            {strips.map((strip) => (
              <ChannelStripCard
                key={strip.id}
                strip={strip}
                busy={busyId === strip.id}
                onMute={() => updateTrack(strip.id, { muted: !strip.muted })}
                onSolo={() => updateTrack(strip.id, { solo: !strip.solo })}
                onVolume={(v) => updateTrack(strip.id, { volume: v })}
                onPan={(p) => updateTrack(strip.id, { pan: p })}
              />
            ))}
          </div>
        </div>
      )}

      <p className={cm.cn('text-[11px] text-on-surface-variant')}>
        {t(
          'mixing.tip',
          {},
          {
            defaultValue:
              'Tip · Mute and Solo persist to the project so co-writers see your monitor mix.',
          },
        )}
      </p>
    </div>
  )
}

function ChannelStripCard({
  strip,
  busy,
  onMute,
  onSolo,
  onVolume,
  onPan,
}: {
  strip: ChannelStrip
  busy: boolean
  onMute: () => void
  onSolo: () => void
  onVolume: (v: number) => void
  onPan: (p: number) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const meterPct = Math.round(strip.meter * 100)
  const levelPct = Math.round(strip.level * 100)
  return (
    <div
      className={cm.cn(
        'flex flex-col items-center gap-3 px-3 py-4 min-w-[112px] bg-surface-container-lowest',
        strip.muted ? 'opacity-60' : '',
      )}
      style={{ borderTop: `3px solid ${strip.color}` }}
    >
      <p
        className={cm.cn(
          'text-[11px] font-bold tracking-tight text-on-surface text-center w-full truncate',
        )}
      >
        {strip.name}
      </p>
      <div className={cm.cn('flex flex-col items-center gap-1 w-full')}>
        <span
          className={cm.cn(
            'text-[9px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('mixing.panLabel', {}, { defaultValue: 'Pan' })}
        </span>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={strip.pan}
          onChange={(e) => onPan(Number(e.target.value))}
          disabled={busy}
          aria-label={t('mixing.panAria', { name: strip.name }, { defaultValue: 'Pan {{name}}' })}
          className={cm.cn('w-full')}
          style={{ accentColor: strip.color }}
        />
      </div>

      <div
        className={cm.cn('relative w-full h-40 rounded-md flex items-center justify-center')}
        style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
      >
        <div
          className={cm.cn('absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 rounded-b-md')}
          style={{
            height: `${meterPct}%`,
            background:
              'linear-gradient(to top, #22c55e 0%, #facc15 65%, #f97316 85%, #ef4444 100%)',
          }}
          aria-hidden="true"
        />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={strip.level}
          onChange={(e) => onVolume(Number(e.target.value))}
          disabled={busy}
          aria-label={t(
            'mixing.volumeAria',
            { name: strip.name },
            { defaultValue: 'Volume {{name}}' },
          )}
          className={cm.cn('absolute inset-0 w-full opacity-0 cursor-ns-resize')}
          style={{
            writingMode: 'vertical-lr' as React.CSSProperties['writingMode'],
            transform: 'rotate(180deg)',
          }}
        />
        <div
          className={cm.cn(
            'absolute left-1/2 -translate-x-1/2 w-8 h-3 rounded-sm border shadow-md pointer-events-none',
          )}
          style={{
            bottom: `${Math.max(0, levelPct - 4)}%`,
            backgroundColor: 'var(--color-surface)',
            borderColor: strip.color,
          }}
          aria-hidden="true"
        />
      </div>

      <div className={cm.cn('flex flex-col items-center gap-0.5')}>
        <span
          className={cm.cn('text-[10px] font-mono tabular-nums text-on-surface')}
          style={{ color: strip.color }}
        >
          {(strip.level * 12 - 6).toFixed(1)} dB
        </span>
        <span
          className={cm.cn(
            'text-[9px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {levelPct}%
        </span>
      </div>

      <div className={cm.cn('flex gap-1')}>
        <button
          type="button"
          onClick={onMute}
          disabled={busy}
          aria-pressed={!!strip.muted}
          aria-label={t('mixing.muteAria', { name: strip.name }, { defaultValue: 'Mute {{name}}' })}
          className={cm.cn(
            'inline-flex items-center justify-center w-6 h-6 rounded-sm text-[10px] font-black border transition-colors disabled:opacity-60',
          )}
          style={{
            backgroundColor: strip.muted ? 'var(--mol-color-text-secondary)' : 'transparent',
            color: strip.muted ? 'var(--mol-color-background)' : 'var(--mol-color-text-secondary)',
            borderColor: 'color-mix(in srgb, var(--mol-color-text-secondary) 50%, transparent)',
          }}
        >
          M
        </button>
        <button
          type="button"
          onClick={onSolo}
          disabled={busy}
          aria-pressed={!!strip.solo}
          aria-label={t('mixing.soloAria', { name: strip.name }, { defaultValue: 'Solo {{name}}' })}
          className={cm.cn(
            'inline-flex items-center justify-center w-6 h-6 rounded-sm text-[10px] font-black border transition-colors disabled:opacity-60',
          )}
          style={{
            backgroundColor: strip.solo ? 'var(--daw-meter-yellow)' : 'transparent',
            color: strip.solo ? 'var(--mol-color-background)' : 'var(--daw-meter-yellow)',
            borderColor: 'color-mix(in srgb, var(--daw-meter-yellow) 50%, transparent)',
          }}
        >
          S
        </button>
      </div>
    </div>
  )
}
