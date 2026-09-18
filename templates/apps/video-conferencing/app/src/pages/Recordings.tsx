import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { RecordingTile } from '../components/RecordingTile.js'

interface ApiRecording {
  id: string
  meeting_id: string
  video_url?: string
  thumbnail_url?: string | null
  duration_ms?: number
  created_at: string
  title?: string
  host_name?: string
}

function unwrap<T>(value: unknown, fallback: T): T {
  let current: unknown = value
  for (let i = 0; i < 3; i++) {
    if (Array.isArray(current)) return current as T
    if (current && typeof current === 'object' && 'data' in current) {
      current = (current as { data: unknown }).data
      continue
    }
    break
  }
  return Array.isArray(current) ? (current as T) : fallback
}

function timestampLabel(iso?: string): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return ''
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString()
}

export function Recordings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [recordings, setRecordings] = useState<ApiRecording[]>([])
  const [filter, setFilter] = useState<'all' | 'mine' | 'shared'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/recordings')
      .then((res) => {
        if (cancelled) return
        setRecordings(unwrap<ApiRecording[]>(res, []))
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <div className={cm.stack(8)}>
      <header className={cm.stack(2)}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {recordings.length} {recordings.length === 1 ? 'clip' : 'clips'}
        </span>
        <h1 className={cm.cn('text-4xl font-extrabold tracking-tight text-on-surface')}>
          {t('recordings.title', {}, { defaultValue: 'Recordings' })}
        </h1>
        <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
          {t(
            'recordings.subtitle',
            {},
            { defaultValue: 'Auto-transcribed, instantly searchable.' },
          )}
        </p>
      </header>

      <div className={cm.flex({ gap: 2 })}>
        {(
          [
            { value: 'all', label: t('recordings.filterAll', {}, { defaultValue: 'All' }) },
            { value: 'mine', label: t('recordings.filterMine', {}, { defaultValue: 'Mine' }) },
            {
              value: 'shared',
              label: t('recordings.filterShared', {}, { defaultValue: 'Shared' }),
            },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.roundedFull,
              'transition-colors',
              filter === option.value
                ? 'bg-primary text-on-primary shadow-md shadow-primary/25'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading && recordings.length === 0 ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : recordings.length === 0 ? (
        <div data-testid="no-recordings" className={cm.cn(cm.textCenter, cm.sp('py', 16))}>
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/40">
            play_circle
          </span>
          <p className={cm.cn(cm.sp('mt', 4), cm.textSize('base'), 'text-on-surface-variant')}>
            {t('recordings.noRecordings', {}, { defaultValue: 'No recordings yet.' })}
          </p>
        </div>
      ) : (
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2 xl:grid-cols-3')}>
          {recordings.map((r) => (
            <RecordingTile
              key={r.id}
              id={r.id}
              title={r.title ?? `Recording from ${new Date(r.created_at).toLocaleDateString()}`}
              hostName={r.host_name ?? ''}
              recordedAtLabel={timestampLabel(r.created_at)}
              durationMinutes={r.duration_ms ? Math.round(r.duration_ms / 60_000) : 0}
              thumbnailUrl={r.thumbnail_url ?? undefined}
              onPlay={() => navigate(`/recordings/${r.id}`)}
              onShare={() => navigate(`/recordings/${r.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
