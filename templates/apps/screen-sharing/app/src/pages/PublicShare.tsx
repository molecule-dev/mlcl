import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { RecordingIndicator } from '../components/RecordingIndicator.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

interface PublicRecording {
  id: string
  title: string
  description?: string | null
  duration_ms?: number | null
  view_count?: number | null
  video_url?: string | null
  transcript?: string | null
  created_at?: string | null
}

/**
 * Builds a WebVTT captions resource from the recording's transcript — a
 * single cue spanning the full duration (per-cue timing arrives with the
 * transcript pipeline). Recordings without a transcript get a valid,
 * cue-less track so the player's caption slot is still wired.
 */
function captionsFromTranscript(transcript?: string | null, durationMs?: number | null): string {
  if (!transcript) return `data:text/vtt,${encodeURIComponent('WEBVTT')}`
  const totalSec = Math.max(1, Math.round((durationMs ?? 0) / 1000) || 3600)
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0')
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0')
  const ss = String(totalSec % 60).padStart(2, '0')
  const vtt = `WEBVTT\n\n00:00:00.000 --> ${hh}:${mm}:${ss}.000\n${transcript}`
  return `data:text/vtt,${encodeURIComponent(vtt)}`
}

function unwrapRecording(payload: unknown): PublicRecording | null {
  if (!payload || typeof payload !== 'object') return null
  const direct = payload as PublicRecording & { data?: unknown }
  if (typeof direct.id === 'string') return direct
  if (direct.data && typeof direct.data === 'object') {
    const inner = direct.data as PublicRecording
    if (typeof inner.id === 'string') return inner
  }
  return null
}

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const sec = (totalSec % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

export function PublicShare() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const http = useHttpClient()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [recording, setRecording] = useState<PublicRecording | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/recordings/shared/${token}`)
      .then((res) => {
        if (cancelled) return
        const data = unwrapRecording(res?.data)
        if (!data) {
          throw new Error('Recording not found')
        }
        setRecording(data)
        // Viewer-funnel event: a share link actually resolved for a visitor.
        track({
          name: 'share.opened',
          properties: { recording_id: data.id },
        })
      })
      .catch(() => {
        if (cancelled) return
        setError(t('publicShare.error', {}, { defaultValue: 'This share link is unavailable.' }))
        setRecording(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, token, t])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play().catch(() => {
        /* playback failure (e.g. placeholder url) is non-fatal */
      })
    } else {
      video.pause()
    }
  }

  return (
    <div
      data-mol-id="public-share-page"
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'min-h-screen bg-[var(--color-bg-player)] text-white',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
          'border-b border-surface/10 backdrop-blur-md bg-foreground/20',
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
          <BrandWordmark
            as="span"
            size="lg"
            invert
            tagline={t('publicShare.tagline', {}, { defaultValue: 'Public clip' })}
          />
        </Link>
        <Link
          to="/signup"
          data-mol-id="public-share-signup"
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.sp('px', 4),
            cm.sp('py', 2),
            'rounded-full bg-surface text-[var(--color-brand-gradient-from)] hover:bg-surface-secondary uppercase tracking-widest',
          )}
        >
          {t(
            'publicShare.joinFree',
            { appName: APP_NAME },
            { defaultValue: 'Try {{appName}} free' },
          )}
        </Link>
      </header>

      <main
        className={cm.cn(
          cm.flex1,
          cm.sp('px', 6),
          cm.sp('py', 10),
          cm.maxW('2xl'),
          'mx-auto w-full',
        )}
      >
        {loading ? (
          <p
            data-mol-id="public-share-loading"
            className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-white/60')}
          >
            {t('publicShare.loading', {}, { defaultValue: 'Loading recording…' })}
          </p>
        ) : error || !recording ? (
          <div
            data-mol-id="public-share-error"
            role="alert"
            className={cm.cn(
              cm.sp('p', 8),
              cm.textCenter,
              'rounded-2xl bg-surface/5 border border-surface/10',
            )}
          >
            <p className={cm.cn(cm.textSize('sm'), 'text-white/70')}>
              {error ?? t('publicShare.notFound', {}, { defaultValue: 'Recording not found.' })}
            </p>
            <Link
              to="/"
              data-mol-id="public-share-error-back"
              className={cm.cn(
                cm.sp('mt', 4),
                cm.fontWeight('semibold'),
                'inline-block text-white',
              )}
            >
              {t('auth.backToHome', {}, { defaultValue: 'Back to home' })}
            </Link>
          </div>
        ) : (
          <>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 3 }),
                cm.sp('mb', 4),
                'flex-wrap',
              )}
            >
              <RecordingIndicator state="ready" size="sm" />
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-white/60 uppercase tracking-widest font-semibold',
                )}
              >
                {t(
                  'common.countViews',
                  { count: recording.view_count ?? 0 },
                  { defaultValue: '{{count}} views' },
                )}
              </span>
            </div>

            <section
              className={cm.cn(
                'relative aspect-video rounded-[2rem] overflow-hidden shadow-2xl shadow-black/60',
                'bg-gradient-to-br from-[var(--color-brand-deep-a)] via-[var(--color-brand-deep-b)] to-[var(--color-brand-gradient-from)]',
              )}
            >
              <div
                className={cm.cn(
                  'pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(124,58,237,0.5),transparent_55%),radial-gradient(circle_at_75%_60%,rgba(6,182,212,0.45),transparent_60%)]',
                )}
              />
              {recording.video_url ? (
                <video
                  ref={videoRef}
                  data-mol-id="public-share-video"
                  src={recording.video_url}
                  controls
                  preload="metadata"
                  className={cm.cn('absolute inset-0 w-full h-full object-cover bg-foreground')}
                >
                  <track
                    kind="captions"
                    srcLang="en"
                    label={t('publicShare.captionsLabel', undefined, { defaultValue: 'Captions' })}
                    src={captionsFromTranscript(recording.transcript, recording.duration_ms)}
                  />
                </video>
              ) : (
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'absolute inset-0 text-white/70 text-sm',
                  )}
                >
                  {t('publicShare.noVideo', {}, { defaultValue: 'Recording is still uploading.' })}
                </div>
              )}
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'absolute inset-0 pointer-events-none',
                )}
              >
                <button
                  type="button"
                  data-mol-id="public-share-play"
                  onClick={togglePlay}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(24),
                    cm.h(24),
                    'pointer-events-auto rounded-full bg-surface/95 text-[var(--color-brand-gradient-from)] shadow-2xl hover:scale-105 transition-transform opacity-80 hover:opacity-100',
                  )}
                  aria-label={t('publicShare.play', {}, { defaultValue: 'Play recording' })}
                >
                  <span className={cm.cn('material-symbols-outlined text-6xl')}>play_arrow</span>
                </button>
              </div>
              <span
                className={cm.cn(
                  'absolute bottom-4 right-4 rounded-md bg-foreground/75 text-white text-xs font-mono font-semibold px-3 py-1',
                )}
              >
                {formatTime(recording.duration_ms ?? 0)}
              </span>
            </section>

            <section className={cm.cn(cm.stack(3), cm.sp('mt', 6))}>
              <h1
                data-mol-id="public-share-title"
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-3xl md:text-5xl tracking-tight leading-[1.05] font-extrabold',
                )}
              >
                {recording.title}
              </h1>
              {recording.description ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-white/80 leading-relaxed max-w-2xl')}>
                  {recording.description}
                </p>
              ) : null}
            </section>

            <section
              className={cm.cn(
                cm.sp('p', 8),
                cm.sp('mt', 10),
                'relative overflow-hidden rounded-[2rem] text-center shadow-2xl shadow-[var(--color-brand-gradient-from)]/30',
                'bg-gradient-to-br from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)]',
              )}
            >
              <div
                className={cm.cn(
                  'pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
                )}
              />
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-3xl md:text-4xl tracking-tight relative font-extrabold',
                )}
              >
                {t(
                  'publicShare.cta.title',
                  {},
                  { defaultValue: 'Record clips like this in 30 seconds' },
                )}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mt', 3),
                  'opacity-90 relative max-w-md mx-auto',
                )}
              >
                {t(
                  'publicShare.cta.body',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'Free for unlimited 5-minute clips on {{appName}}. No card required.',
                  },
                )}
              </p>
              <Link
                to="/signup"
                data-mol-id="public-share-cta"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.sp('mt', 6),
                  cm.fontWeight('bold'),
                  'inline-block relative rounded-full bg-surface text-[var(--color-brand-gradient-from)] hover:bg-surface-secondary uppercase tracking-widest text-sm shadow-lg',
                )}
              >
                {t('publicShare.cta.button', {}, { defaultValue: 'Start recording free' })}
              </Link>
            </section>
          </>
        )}
      </main>

      <footer
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
          cm.textSize('xs'),
          'border-t border-surface/10 text-white/60',
        )}
      >
        <span>
          {t(
            'publicShare.footer.copy',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}}. Async, made luminous.' },
          )}
        </span>
        <Link to="/login" className={cm.cn('hover:text-white transition-colors')}>
          {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </Link>
      </footer>
    </div>
  )
}
