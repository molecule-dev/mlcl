import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { RecordingIndicator } from '../components/RecordingIndicator.js'

type CaptureSource = 'screen' | 'camera' | 'screen+camera' | 'window'

interface SourceOption {
  id: CaptureSource
  label: string
  description: string
  icon: string
}

interface CreatedRecording {
  id: string
  share_token?: string | null
}

type Visibility = 'private' | 'workspace' | 'public'

function unwrapEnvelope(payload: unknown): CreatedRecording | null {
  if (!payload || typeof payload !== 'object') return null
  const direct = payload as { id?: string; share_token?: string | null; data?: unknown }
  if (typeof direct.id === 'string') {
    return { id: direct.id, share_token: direct.share_token ?? null }
  }
  if (direct.data && typeof direct.data === 'object') {
    const inner = direct.data as { id?: string; share_token?: string | null }
    if (typeof inner.id === 'string') {
      return { id: inner.id, share_token: inner.share_token ?? null }
    }
  }
  return null
}

export function Record() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()

  const [source, setSource] = useState<CaptureSource>('screen+camera')
  const [micEnabled, setMicEnabled] = useState(true)
  const [camEnabled, setCamEnabled] = useState(true)
  const [recordingState, setRecordingState] = useState<'idle' | 'live' | 'paused'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [title, setTitle] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('private')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  useEffect(() => {
    if (recordingState === 'live') {
      intervalRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000)
    } else if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
    }
  }, [recordingState])

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop()
        streamRef.current = null
      }
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop()
        } catch (_error) {
          // recorder already stopped — stop() on inactive recorder throws; safely ignorable
        }
      }
    }
  }, [])

  const sources: SourceOption[] = [
    {
      id: 'screen+camera',
      label: t('record.source.screenCamera', {}, { defaultValue: 'Screen + camera' }),
      description: t(
        'record.source.screenCameraBody',
        {},
        { defaultValue: 'Full screen with floating camera bubble' },
      ),
      icon: 'cast',
    },
    {
      id: 'screen',
      label: t('record.source.screen', {}, { defaultValue: 'Screen only' }),
      description: t(
        'record.source.screenBody',
        {},
        { defaultValue: 'Capture the entire display' },
      ),
      icon: 'desktop_windows',
    },
    {
      id: 'window',
      label: t('record.source.window', {}, { defaultValue: 'Specific window' }),
      description: t('record.source.windowBody', {}, { defaultValue: 'Pick a window to capture' }),
      icon: 'tab',
    },
    {
      id: 'camera',
      label: t('record.source.camera', {}, { defaultValue: 'Camera only' }),
      description: t(
        'record.source.cameraBody',
        {},
        { defaultValue: 'Talking-head video without screen' },
      ),
      icon: 'videocam',
    },
  ]

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m.toString().padStart(2, '0')}:${sec}`
  }

  const startCapture = async () => {
    setError(null)
    setElapsed(0)
    chunksRef.current = []
    const md = (typeof navigator !== 'undefined' ? navigator.mediaDevices : null) as
      | (MediaDevices & {
          getDisplayMedia?: (constraints?: DisplayMediaStreamOptions) => Promise<MediaStream>
        })
      | null
    if (md && typeof md.getDisplayMedia === 'function') {
      try {
        const stream = await md.getDisplayMedia({ video: true, audio: micEnabled })
        streamRef.current = stream
        const recorder = new MediaRecorder(stream)
        recorderRef.current = recorder
        recorder.addEventListener('dataavailable', (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
        })
        recorder.start(1000)
      } catch (err) {
        // permission denied or unsupported — fall back to manual save
        console.warn('[record] capture unavailable, falling back to manual save', err)
      }
    }
    setRecordingState('live')
  }

  const handlePause = () => {
    setRecordingState((s) => {
      const next = s === 'live' ? 'paused' : 'live'
      const recorder = recorderRef.current
      if (recorder) {
        try {
          if (next === 'paused' && recorder.state === 'recording') recorder.pause()
          if (next === 'live' && recorder.state === 'paused') recorder.resume()
        } catch (err) {
          console.warn('[record] pause/resume failed', err)
        }
      }
      return next
    })
  }

  const handleStop = async () => {
    if (saving) return
    setSaving(true)
    setError(null)

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        const recorder = recorderRef.current!
        const onStop = () => {
          recorder.removeEventListener('stop', onStop)
          resolve()
        }
        recorder.addEventListener('stop', onStop)
        try {
          recorder.stop()
        } catch (_error) {
          // recorder may already be inactive — resolve immediately so save proceeds
          resolve()
        }
      })
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop()
      streamRef.current = null
    }
    recorderRef.current = null

    const finalElapsed = elapsed
    setRecordingState('idle')

    let videoUrl = ''
    if (chunksRef.current.length > 0) {
      try {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        videoUrl = URL.createObjectURL(blob)
      } catch (_error) {
        // Blob/URL creation failed (e.g. no chunks) — fall back to placeholder URL below
        videoUrl = ''
      }
    }
    if (!videoUrl) {
      videoUrl = `local://recording/${Date.now()}.webm`
    }

    const payload = {
      title: title.trim() || t('record.untitled', {}, { defaultValue: 'Untitled recording' }),
      visibility,
      video_url: videoUrl,
      duration_ms: finalElapsed * 1000,
    }
    try {
      const res = await http.post<CreatedRecording>('/api/recordings', payload)
      const created = unwrapEnvelope(res?.data)
      if (!created) {
        throw new Error('Server returned no recording id')
      }
      track({
        name: 'recording.created',
        properties: {
          recording_id: created.id,
          duration_ms: finalElapsed * 1000,
          visibility,
          source,
        },
      })
      navigate(`/recordings/${created.id}`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('record.save.error', {}, { defaultValue: 'Failed to save recording.' }),
      )
      setSaving(false)
    }
  }

  return (
    <div data-mol-id="record-page" className={cm.cn(cm.stack(8), cm.maxW('2xl'), 'mx-auto')}>
      <header className={cm.stack(2)}>
        <span
          className={cm.cn(
            'inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant w-fit',
          )}
        >
          <span
            className={cm.cn(
              'material-symbols-outlined text-base text-[var(--color-brand-gradient-from)]',
            )}
          >
            fiber_manual_record
          </span>
          {t('record.eyebrow', {}, { defaultValue: 'Capture studio' })}
        </span>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-4xl md:text-5xl tracking-tight leading-[1.05] font-extrabold text-on-surface',
          )}
        >
          {t('record.title', {}, { defaultValue: 'Set up your next clip' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
          {t(
            'record.subtitle',
            { appName: APP_NAME },
            {
              defaultValue:
                'Pick a source, check your inputs, and start the broadcast — {{appName}} handles the rest.',
            },
          )}
        </p>
      </header>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'relative overflow-hidden rounded-[2rem] text-white shadow-xl shadow-[var(--color-brand-gradient-from)]/20',
          'bg-gradient-to-br from-[var(--color-brand-deep-a)] via-[var(--color-brand-deep-b)] to-[var(--color-brand-gradient-from)]',
        )}
      >
        <div
          className={cm.cn(
            'pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-cyan-300/20 blur-3xl',
          )}
        />
        <div
          className={cm.cn(
            'pointer-events-none absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-fuchsia-400/20 blur-3xl',
          )}
        />
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 4 }), 'relative')}
        >
          <RecordingIndicator
            state={
              recordingState === 'live' ? 'live' : recordingState === 'paused' ? 'paused' : 'idle'
            }
            size="lg"
          />
          <span
            data-mol-id="record-elapsed"
            className={cm.cn('font-mono tabular-nums text-2xl font-bold tracking-tight')}
          >
            {formatElapsed(elapsed)}
          </span>
        </div>
        <div
          className={cm.cn(
            'relative mt-6 aspect-video rounded-2xl border border-surface/15 bg-foreground/40 overflow-hidden',
            cm.flex({ align: 'center', justify: 'center' }),
          )}
        >
          {recordingState === 'idle' ? (
            <div className={cm.cn(cm.stack(2), cm.textCenter)}>
              <span className={cm.cn('material-symbols-outlined text-6xl text-white/40 mx-auto')}>
                {sources.find((s) => s.id === source)?.icon ?? 'cast'}
              </span>
              <p className={cm.cn(cm.textSize('sm'), 'text-white/70')}>
                {t(
                  'record.preview.placeholder',
                  {},
                  { defaultValue: 'Preview appears here once you press Start' },
                )}
              </p>
            </div>
          ) : (
            <div
              className={cm.cn(
                'absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(124,58,237,0.6),transparent_60%),radial-gradient(circle_at_70%_60%,rgba(6,182,212,0.5),transparent_60%)]',
              )}
            />
          )}
          {camEnabled && recordingState !== 'idle' && (
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'absolute bottom-4 right-4 w-24 h-24 rounded-full border-2 border-surface/80 bg-gradient-to-br from-fuchsia-500 to-cyan-500 text-3xl font-bold shadow-2xl',
              )}
            >
              {t('record.camBubbleInitial', {}, { defaultValue: 'YO' })}
            </div>
          )}
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 3 }),
            cm.sp('mt', 6),
            'relative flex-wrap',
          )}
        >
          {recordingState === 'idle' ? (
            <button
              type="button"
              data-mol-id="record-start"
              onClick={() => {
                void startCapture()
              }}
              disabled={saving}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                cm.sp('px', 6),
                cm.sp('py', 3),
                'rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/40 transition-all active:scale-95 uppercase tracking-widest disabled:opacity-50',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-xl')}>
                fiber_manual_record
              </span>
              {t('record.action.start', {}, { defaultValue: 'Start recording' })}
            </button>
          ) : (
            <>
              <button
                type="button"
                data-mol-id="record-pause"
                onClick={handlePause}
                disabled={saving}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  'rounded-full bg-surface/15 backdrop-blur-md hover:bg-surface/25 text-white border border-surface/20 transition-colors disabled:opacity-50',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-xl')}>
                  {recordingState === 'live' ? 'pause' : 'play_arrow'}
                </span>
                {recordingState === 'live'
                  ? t('common.pause', {}, { defaultValue: 'Pause' })
                  : t('common.resume', {}, { defaultValue: 'Resume' })}
              </button>
              <button
                type="button"
                data-mol-id="record-stop"
                onClick={() => {
                  void handleStop()
                }}
                disabled={saving}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  'rounded-full bg-surface text-[var(--color-brand-gradient-from)] hover:bg-surface-secondary shadow-lg transition-colors disabled:opacity-50',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-xl')}>stop</span>
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('record.action.stop', {}, { defaultValue: 'Stop & save' })}
              </button>
            </>
          )}
        </div>
      </section>

      <section
        data-mol-id="record-metadata"
        className={cm.cn(
          cm.sp('p', 6),
          cm.stack(4),
          'rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm',
        )}
      >
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-sm uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('record.metadata.title', {}, { defaultValue: 'Clip details' })}
        </h2>
        <label className={cm.cn(cm.stack(1))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.title', {}, { defaultValue: 'Title' })}
          </span>
          <input
            type="text"
            data-mol-id="record-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t(
              'record.field.titlePlaceholder',
              {},
              { defaultValue: 'Sprint demo: comments timeline' },
            )}
            disabled={saving}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant outline-none focus:ring-2 focus:ring-[var(--color-brand-gradient-from)]/40',
            )}
          />
        </label>
        <label className={cm.cn(cm.stack(1))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('record.field.visibility', {}, { defaultValue: 'Visibility' })}
          </span>
          <select
            data-mol-id="record-visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            disabled={saving}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface outline-none focus:ring-2 focus:ring-[var(--color-brand-gradient-from)]/40',
            )}
          >
            <option value="private">
              {t('record.visibility.private', {}, { defaultValue: 'Private (only me)' })}
            </option>
            <option value="workspace">
              {t('nav.workspace', {}, { defaultValue: 'Workspace' })}
            </option>
            <option value="public">
              {t('record.visibility.public', {}, { defaultValue: 'Public link' })}
            </option>
          </select>
        </label>
      </section>

      {error ? (
        <p
          data-mol-id="record-error"
          role="alert"
          className={cm.cn(cm.textSize('sm'), 'text-error')}
        >
          {error}
        </p>
      ) : null}

      <section className={cm.stack(3)}>
        <h2 className={cm.cn(cm.fontWeight('bold'), 'text-lg text-on-surface')}>
          {t('record.sources.title', {}, { defaultValue: 'Source' })}
        </h2>
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2')}>
          {sources.map((opt) => {
            const active = opt.id === source
            return (
              <button
                key={opt.id}
                type="button"
                data-mol-id={`record-source-${opt.id}`}
                onClick={() => setSource(opt.id)}
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 3 }),
                  cm.sp('p', 4),
                  'text-left rounded-2xl border-l-4 transition-all hover:-translate-y-0.5',
                  active
                    ? 'border-[var(--color-brand-gradient-from)] bg-gradient-to-br from-[var(--color-brand-gradient-from)]/10 to-[var(--color-brand-gradient-to)]/5 shadow-md shadow-[var(--color-brand-gradient-from)]/10'
                    : 'border-outline-variant bg-surface-container-lowest hover:border-[var(--color-brand-gradient-to)]/40',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(11),
                    cm.h(11),
                    'rounded-xl shrink-0',
                    active
                      ? 'bg-gradient-to-br from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] text-white'
                      : 'bg-surface-container text-on-surface-variant',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-xl')}>{opt.icon}</span>
                </div>
                <div className={cm.flex1}>
                  <div
                    className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-on-surface')}
                  >
                    {opt.label}
                  </div>
                  <div className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-0.5')}>
                    {opt.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
        <InputToggleCard
          icon="mic"
          molId="record-mic-toggle"
          label={t('record.input.mic', {}, { defaultValue: 'Microphone' })}
          deviceLabel={t(
            'record.input.micDevice',
            {},
            { defaultValue: 'System default microphone' },
          )}
          enabled={micEnabled}
          onToggle={() => setMicEnabled((v) => !v)}
        />
        <InputToggleCard
          icon="videocam"
          molId="record-cam-toggle"
          label={t('record.input.cam', {}, { defaultValue: 'Camera' })}
          deviceLabel={t('record.input.camDevice', {}, { defaultValue: 'System default camera' })}
          enabled={camEnabled}
          onToggle={() => setCamEnabled((v) => !v)}
        />
      </section>
    </div>
  )
}

function InputToggleCard({
  icon,
  label,
  deviceLabel,
  enabled,
  onToggle,
  molId,
}: {
  icon: string
  label: string
  deviceLabel: string
  enabled: boolean
  onToggle: () => void
  molId?: string
}) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 5),
        cm.flex({ align: 'center', gap: 3 }),
        'rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(11),
          cm.h(11),
          'rounded-xl shrink-0',
          enabled
            ? 'bg-gradient-to-br from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] text-white'
            : 'bg-surface-container text-on-surface-variant',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-xl')}>
          {enabled ? icon : `${icon}_off`}
        </span>
      </div>
      <div className={cm.flex1}>
        <div className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-on-surface')}>
          {label}
        </div>
        <div className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
          {deviceLabel}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={enabled}
        aria-label={label}
        data-mol-id={molId}
        className={cm.cn(
          'relative inline-flex h-10 w-12 shrink-0 items-center rounded-full transition-colors',
          enabled
            ? 'bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)]'
            : 'bg-surface-container',
        )}
      >
        <span
          className={cm.cn(
            'inline-block h-6 w-6 transform rounded-full bg-surface shadow transition-transform',
            enabled ? 'translate-x-5' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  )
}
