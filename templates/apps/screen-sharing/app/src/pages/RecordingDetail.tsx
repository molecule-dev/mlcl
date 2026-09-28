import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { RecordingIndicator } from '../components/RecordingIndicator.js'
import { ShareLinkCard } from '../components/ShareLinkCard.js'

interface RecordingRow {
  id: string
  title: string
  description?: string | null
  duration_ms?: number | null
  view_count?: number | null
  comment_count?: number | null
  visibility?: 'private' | 'workspace' | 'public' | 'password'
  status?: string | null
  share_token?: string | null
  video_url?: string | null
  transcript?: string | null
  comments_allowed?: boolean
  expires_at?: string | null
  share_password_hash?: string | null
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

interface CommentRow {
  id: string
  content: string
  timestamp_ms?: number | null
  user_id?: string | null
  name?: string | null
  parent_comment_id?: string | null
  created_at?: string | null
}

function unwrapRecording(payload: unknown): RecordingRow | null {
  if (!payload || typeof payload !== 'object') return null
  const direct = payload as RecordingRow & { data?: unknown }
  if (typeof direct.id === 'string') return direct
  if (direct.data && typeof direct.data === 'object') {
    const inner = direct.data as RecordingRow
    if (typeof inner.id === 'string') return inner
  }
  return null
}

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (payload && typeof payload === 'object') {
    const data = (payload as { data?: unknown }).data
    if (Array.isArray(data)) return data as T[]
  }
  return []
}

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const sec = (totalSec % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

function visibilityToCard(v?: string | null): 'public' | 'team' | 'private' {
  if (v === 'public') return 'public'
  if (v === 'workspace') return 'team'
  return 'private'
}

function deriveInitials(name?: string | null, fallback?: string | null): string {
  const candidate = (name || fallback || '?').trim()
  const parts = candidate.split(/[\s_-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function RecordingDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [recording, setRecording] = useState<RecordingRow | null>(null)
  const [comments, setComments] = useState<CommentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progressMs, setProgressMs] = useState(0)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [recRes, commentsRes] = await Promise.all([
        http.get(`/api/recordings/${id}`),
        http.get(`/api/comments/${id}`),
      ])
      const rec = unwrapRecording(recRes?.data)
      if (!rec) {
        throw new Error('Recording not found')
      }
      setRecording(rec)
      setComments(unwrapList<CommentRow>(commentsRes?.data))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('recordingDetail.error', {}, { defaultValue: 'Failed to load recording.' }),
      )
      setRecording(null)
      setComments([])
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const durationMs = recording?.duration_ms ?? 0
  const progressPercent =
    durationMs > 0 ? Math.min(100, Math.round((progressMs / durationMs) * 100)) : 0

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !draft.trim() || posting) return
    setPosting(true)
    setPostError(null)
    try {
      await http.post(`/api/comments/${id}`, {
        content: draft.trim(),
        timestamp_ms: progressMs,
      })
      track({
        name: 'comment.created',
        properties: { recording_id: id, timestamp_ms: progressMs },
      })
      setDraft('')
      await refresh()
    } catch (err) {
      setPostError(
        err instanceof Error
          ? err.message
          : t('recordingDetail.comment.error', {}, { defaultValue: 'Failed to post comment.' }),
      )
    } finally {
      setPosting(false)
    }
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play().catch(() => {
        /* playback may fail for placeholder URLs in tests */
      })
    } else {
      video.pause()
    }
  }

  const seekTo = (ms: number) => {
    setProgressMs(ms)
    const video = videoRef.current
    if (video && Number.isFinite(video.duration)) {
      try {
        video.currentTime = Math.min(video.duration, ms / 1000)
      } catch (_error) {
        // video not yet loaded or seek not supported — seek silently ignored
      }
    }
  }

  if (loading) {
    return (
      <div
        data-mol-id="recording-detail-loading"
        className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}
      >
        {t('recordingDetail.loading', {}, { defaultValue: 'Loading recording…' })}
      </div>
    )
  }

  if (error || !recording) {
    return (
      <div
        data-mol-id="recording-detail-error"
        className={cm.cn(
          cm.sp('p', 8),
          cm.textCenter,
          'rounded-2xl border border-error/30 bg-error/5',
        )}
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-error')}>
          {error ?? t('recordingDetail.notFound', {}, { defaultValue: 'Recording not found.' })}
        </p>
        <Link
          to="/library"
          data-mol-id="recording-detail-back-on-error"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.fontWeight('semibold'),
            'inline-block text-[var(--color-brand-gradient-from)]',
          )}
        >
          {t('recordingDetail.backToLibrary', {}, { defaultValue: 'Back to library' })}
        </Link>
      </div>
    )
  }

  const cardVisibility = visibilityToCard(recording.visibility)
  const shareToken = recording.share_token ?? null
  const shareUrl = shareToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${shareToken}`
    : ''

  return (
    <div
      data-mol-id="recording-detail-page"
      className={cm.cn(cm.stack(8), cm.maxW('2xl'), 'mx-auto')}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 3 }), 'flex-wrap')}>
        <Link
          to="/library"
          data-mol-id="recording-detail-back"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 1 }),
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            'uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
          {t('recordingDetail.backToLibrary', {}, { defaultValue: 'Back to library' })}
        </Link>
        <RecordingIndicator
          state={recording.status === 'processing' ? 'processing' : 'ready'}
          size="sm"
        />
      </div>

      <section
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] aspect-video shadow-2xl shadow-black/40',
          'bg-gradient-to-br from-[var(--color-bg-player)] via-[var(--color-brand-deep-a)] to-[var(--color-brand-deep-b)]',
        )}
      >
        <div
          className={cm.cn(
            'pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(124,58,237,0.45),transparent_55%),radial-gradient(circle_at_75%_60%,rgba(6,182,212,0.4),transparent_60%)]',
          )}
        />
        {recording.video_url ? (
          <video
            ref={videoRef}
            data-mol-id="recording-detail-video"
            src={recording.video_url}
            controls
            preload="metadata"
            className={cm.cn('absolute inset-0 w-full h-full object-cover bg-foreground')}
            onTimeUpdate={(e) =>
              setProgressMs(Math.round((e.currentTarget.currentTime || 0) * 1000))
            }
          >
            <track
              kind="captions"
              srcLang="en"
              label={t('recordingDetail.captionsLabel', undefined, { defaultValue: 'Captions' })}
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
            {t('recordingDetail.noVideo', {}, { defaultValue: 'Recording is still uploading.' })}
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
            data-mol-id="recording-detail-play"
            onClick={togglePlay}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(20),
              cm.h(20),
              'pointer-events-auto rounded-full bg-surface/95 text-[var(--color-brand-gradient-from)] shadow-2xl hover:scale-105 transition-transform opacity-80 hover:opacity-100',
            )}
            aria-label={t('recordingDetail.play', {}, { defaultValue: 'Play recording' })}
          >
            <span className={cm.cn('material-symbols-outlined text-5xl')}>play_arrow</span>
          </button>
        </div>
        <div
          className={cm.cn(
            'absolute left-0 right-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white pointer-events-none',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 3))}>
            <span className={cm.cn('font-mono text-xs tabular-nums opacity-90')}>
              {formatTime(progressMs)}
            </span>
            <div
              className={cm.cn('relative flex-1 h-1.5 rounded-full bg-surface/20 overflow-hidden')}
            >
              <div
                className={cm.cn(
                  'absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[var(--color-brand-gradient-to)] to-[var(--color-brand-gradient-lavender)]',
                )}
                style={{ width: `${progressPercent}%` }}
              />
              {comments.map(
                (c) =>
                  durationMs > 0 && (
                    <span
                      key={c.id}
                      className={cm.cn(
                        'absolute top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300 ring-2 ring-black/40',
                      )}
                      style={{
                        left: `${Math.min(100, ((c.timestamp_ms ?? 0) / durationMs) * 100)}%`,
                      }}
                    />
                  ),
              )}
            </div>
            <span className={cm.cn('font-mono text-xs tabular-nums opacity-90')}>
              {formatTime(durationMs)}
            </span>
          </div>
        </div>
      </section>

      <section className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-3')}>
        <div className={cm.cn(cm.stack(4), 'lg:col-span-2')}>
          <header className={cm.stack(1)}>
            <h1
              data-mol-id="recording-detail-title"
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-3xl md:text-4xl tracking-tight leading-[1.1] font-extrabold text-on-surface',
              )}
            >
              {recording.title}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant uppercase tracking-widest font-semibold',
              )}
            >
              {t(
                'common.countViews',
                { count: recording.view_count ?? 0 },
                { defaultValue: '{{count}} views' },
              )}
            </p>
          </header>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {recording.description ??
              t('recordingDetail.noDescription', {}, { defaultValue: 'No description provided.' })}
          </p>

          <div className={cm.stack(3)}>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-sm uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(
                'recordingDetail.comments',
                { count: comments.length },
                { defaultValue: 'Comments ({{count}})' },
              )}
            </h2>
            {comments.length === 0 ? (
              <p
                data-mol-id="recording-detail-comments-empty"
                className={cm.cn(cm.textSize('sm'), cm.textMuted)}
              >
                {t(
                  'recordingDetail.noComments',
                  {},
                  { defaultValue: 'No comments yet — start the conversation below.' },
                )}
              </p>
            ) : (
              <ul data-mol-id="recording-detail-comments" className={cm.stack(3)}>
                {comments.map((c) => (
                  <li
                    key={c.id}
                    data-mol-id={`recording-detail-comment-${c.id}`}
                    className={cm.cn(
                      cm.flex({ align: 'start', gap: 3 }),
                      cm.sp('p', 4),
                      cm.accentCard({ tone: 'custom' }),
                      'rounded-2xl bg-cyan-50/40 dark:bg-cyan-500/5 shadow-sm',
                    )}
                    style={{ ['--mol-accent' as string]: 'var(--color-cyan-500)' }}
                  >
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.w(10),
                        cm.h(10),
                        'rounded-full bg-gradient-to-br from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] text-white text-sm font-bold shrink-0',
                      )}
                    >
                      {deriveInitials(c.name, c.user_id)}
                    </div>
                    <div className={cm.cn(cm.flex1, cm.stack(1), 'min-w-0')}>
                      <div
                        className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.textSize('xs'))}
                      >
                        <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                          {c.name ?? t('status.member', {}, { defaultValue: 'Member' })}
                        </span>
                        <button
                          type="button"
                          onClick={() => seekTo(c.timestamp_ms ?? 0)}
                          className={cm.cn(
                            'font-mono tabular-nums px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-700 hover:bg-cyan-200 transition-colors',
                          )}
                        >
                          {formatTime(c.timestamp_ms ?? 0)}
                        </button>
                      </div>
                      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface leading-relaxed')}>
                        {c.content}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <form
              onSubmit={handleSubmitComment}
              data-mol-id="recording-detail-comment-form"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('p', 2),
                'rounded-full border border-outline-variant bg-surface-container-lowest focus-within:ring-2 focus-within:ring-[var(--color-brand-gradient-from)]/40',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-on-surface-variant ml-2')}>
                chat_bubble
              </span>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                data-mol-id="recording-detail-comment-input"
                aria-label={t('recordingDetail.commentAria', {}, { defaultValue: 'Comment text' })}
                placeholder={t(
                  'recordingDetail.commentPlaceholder',
                  { time: formatTime(progressMs) },
                  { defaultValue: 'Comment at {{time}}…' },
                )}
                className={cm.cn(
                  cm.flex1,
                  cm.textSize('sm'),
                  'bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant',
                )}
              />
              <button
                type="submit"
                data-mol-id="recording-detail-comment-submit"
                disabled={!draft.trim() || posting}
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-full text-white bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] hover:opacity-90 disabled:opacity-40',
                )}
              >
                {posting
                  ? t('common.postingEllipsis', {}, { defaultValue: 'Posting…' })
                  : t('recordingDetail.post', {}, { defaultValue: 'Post' })}
              </button>
            </form>
            {postError ? (
              <p
                data-mol-id="recording-detail-comment-error"
                role="alert"
                className={cm.cn(cm.textSize('xs'), 'text-error')}
              >
                {postError}
              </p>
            ) : null}
          </div>
        </div>

        <aside className={cm.stack(4)}>
          {shareToken ? (
            <ShareLinkCard
              url={shareUrl}
              visibility={cardVisibility}
              expiresAt={recording.expires_at ?? null}
              passwordProtected={!!recording.share_password_hash}
            />
          ) : null}
        </aside>
      </section>
    </div>
  )
}
