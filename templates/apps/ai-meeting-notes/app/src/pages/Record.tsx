import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

type RecordingState = 'idle' | 'recording' | 'processing' | 'error'

interface BarHeights {
  bars: number[]
}

const SUPPORTED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
] as const

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm'
  for (const mt of SUPPORTED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mt)) return mt
  }
  return 'audio/webm'
}

function fmtElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function useLiveBars(stream: MediaStream | null, recording: boolean): BarHeights {
  const [bars, setBars] = useState<number[]>(Array(60).fill(8))
  const rafRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  useEffect(() => {
    if (!recording || !stream) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      audioCtxRef.current?.close().catch(() => undefined)
      audioCtxRef.current = null
      analyserRef.current = null
      setBars(Array(60).fill(8))
      return
    }
    const ctxClass: typeof AudioContext | undefined =
      typeof AudioContext !== 'undefined'
        ? AudioContext
        : (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!ctxClass) return

    const ctx = new ctxClass()
    audioCtxRef.current = ctx
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyserRef.current = analyser
    const data = new Uint8Array(analyser.frequencyBinCount)

    const tick = () => {
      analyser.getByteFrequencyData(data)
      const slice = Math.floor(data.length / 60) || 1
      const next: number[] = []
      for (let i = 0; i < 60; i++) {
        let sum = 0
        for (let j = 0; j < slice; j++) sum += data[i * slice + j] ?? 0
        const avg = sum / slice
        next.push(Math.max(6, Math.min(56, (avg / 255) * 56 + 6)))
      }
      setBars(next)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      ctx.close().catch(() => undefined)
    }
  }, [stream, recording])

  return { bars }
}

export function Record() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()

  const [state, setState] = useState<RecordingState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [title, setTitle] = useState('')

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const startedAtRef = useRef<number>(0)
  const elapsedTimerRef = useRef<number | null>(null)
  const mimeTypeRef = useRef<string>('audio/webm')

  const { bars } = useLiveBars(stream, state === 'recording')

  useEffect(() => {
    return () => {
      if (elapsedTimerRef.current != null) window.clearInterval(elapsedTimerRef.current)
      stream?.getTracks().forEach((tr) => tr.stop())
    }
  }, [stream])

  const startRecording = async () => {
    setErrorMessage(null)
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage(
        t(
          'record.error.unsupported',
          {},
          {
            defaultValue: 'Your browser does not support recording. Try Chrome, Edge, or Safari.',
          },
        ),
      )
      setState('error')
      return
    }
    let s: MediaStream
    try {
      s = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : t(
              'record.error.permission',
              {},
              {
                defaultValue: 'Microphone permission denied.',
              },
            ),
      )
      setState('error')
      return
    }
    setStream(s)
    const mimeType = pickMimeType()
    mimeTypeRef.current = mimeType
    const recorder = new MediaRecorder(s, { mimeType })
    recorderRef.current = recorder
    chunksRef.current = []
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onerror = (e) => {
      const err = (e as { error?: Error }).error
      setErrorMessage(
        err?.message ?? t('record.error.recorder', {}, { defaultValue: 'Recorder error' }),
      )
      setState('error')
      s.getTracks().forEach((tr) => tr.stop())
    }
    recorder.start(1000)
    startedAtRef.current = Date.now()
    setElapsed(0)
    elapsedTimerRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 1000)
    setState('recording')
  }

  const stopRecording = async () => {
    const recorder = recorderRef.current
    if (!recorder) return
    if (elapsedTimerRef.current != null) {
      window.clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = null
    }
    setState('processing')

    const stopped = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current })
        resolve(blob)
      }
      recorder.stop()
    })
    const blob = await stopped
    stream?.getTracks().forEach((tr) => tr.stop())
    setStream(null)

    if (blob.size === 0) {
      setErrorMessage(t('record.error.empty', {}, { defaultValue: 'No audio was captured.' }))
      setState('error')
      return
    }

    // Route through the bonded http client so the auth bearer-token
    // interceptor fires. Raw fetch() would skip the interceptor and the
    // backend would 401. The client recognises Blob bodies and sends them
    // as-is (no JSON.stringify, no Content-Type override).
    try {
      const res = await http.post<{ meeting_id?: string; error?: string; details?: string }>(
        '/api/meetings/transcribe',
        blob,
        {
          headers: {
            'Content-Type': blob.type || mimeTypeRef.current,
            'X-Meeting-Title': title.slice(0, 200),
          },
        },
      )
      const json = res.data
      if (!json?.meeting_id) {
        const msg = json?.error
          ? `${json.error}${json.details ? ` (${json.details})` : ''}`
          : t('record.error.upload', {}, { defaultValue: 'Upload failed. Try again.' })
        setErrorMessage(msg)
        setState('error')
        return
      }
      navigate(`/meetings/${json.meeting_id}`)
    } catch (err) {
      let msg = err instanceof Error ? err.message : null
      if (err && typeof err === 'object' && 'response' in err) {
        const httpErr = err as {
          response?: { data?: { error?: string; details?: string }; status?: number }
        }
        const data = httpErr.response?.data
        if (data?.error) msg = data.error + (data.details ? ` (${data.details})` : '')
        else if (httpErr.response?.status) msg = `Server returned ${httpErr.response.status}.`
      }
      setErrorMessage(
        msg ?? t('record.error.upload', {}, { defaultValue: 'Upload failed. Try again.' }),
      )
      setState('error')
      return
    }
  }

  const reset = () => {
    setErrorMessage(null)
    setElapsed(0)
    setState('idle')
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.textCenter}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('record.heading', {}, { defaultValue: 'Record' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'record.subheading',
            { appName: APP_NAME },
            {
              defaultValue:
                'Press the mic to start. {{appName}} captures the audio, transcribes via Whisper, and writes a Claude-powered summary.',
            },
          )}
        </p>
      </header>

      <section className={cm.cn(cm.card(), cm.sp('py', 12), cm.textCenter, 'space-y-6')}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t(
            'record.titlePlaceholder',
            {},
            {
              defaultValue: 'Meeting title (optional)',
            },
          )}
          aria-label="meeting-title"
          disabled={state === 'recording' || state === 'processing'}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'mx-auto block w-full max-w-md border border-outline-variant rounded-md bg-surface',
          )}
        />

        <button
          type="button"
          onClick={
            state === 'recording'
              ? stopRecording
              : state === 'processing'
                ? undefined
                : startRecording
          }
          aria-pressed={state === 'recording'}
          aria-label={state === 'recording' ? 'stop-recording' : 'start-recording'}
          disabled={state === 'processing'}
          className={cm.cn(
            'h-32 w-32 rounded-full grid place-items-center mx-auto',
            state === 'recording'
              ? 'bg-error text-on-primary ai-pulse'
              : state === 'processing'
                ? 'bg-surface-container text-on-surface-variant cursor-wait'
                : 'bg-primary text-on-primary',
          )}
        >
          <span className="material-symbols-outlined text-5xl" aria-hidden="true">
            {state === 'recording' ? 'stop' : state === 'processing' ? 'autorenew' : 'mic'}
          </span>
        </button>
        <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {state === 'recording'
            ? t('record.recordingLabel', {}, { defaultValue: 'Recording…' })
            : state === 'processing'
              ? t(
                  'record.processingLabel',
                  {},
                  {
                    defaultValue: 'Transcribing with Whisper, summarizing with Claude…',
                  },
                )
              : state === 'error'
                ? t('record.errorLabel', {}, { defaultValue: 'Something went wrong' })
                : t('record.idleLabel', {}, { defaultValue: 'Tap to start recording' })}
        </p>
        {state === 'recording' ? (
          <>
            <p className={cm.cn(cm.textSize('sm'), 'font-mono tabular-nums')} role="timer">
              {fmtElapsed(elapsed)}
            </p>
            <svg
              viewBox="0 0 600 80"
              className={'w-full max-w-2xl h-20 mx-auto'}
              aria-hidden="true"
            >
              {bars.map((h, i) => (
                <rect
                  key={i}
                  x={i * 10 + 2}
                  y={40 - h / 2}
                  width={6}
                  height={h}
                  fill="var(--color-ai-accent)"
                />
              ))}
            </svg>
          </>
        ) : null}
        {state === 'error' ? (
          <div className={cm.cn(cm.textSize('sm'), 'space-y-2', 'text-error')}>
            <p>{errorMessage}</p>
            <button
              type="button"
              onClick={reset}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-md',
              )}
            >
              {t('record.retryCta', {}, { defaultValue: 'Try again' })}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  )
}
