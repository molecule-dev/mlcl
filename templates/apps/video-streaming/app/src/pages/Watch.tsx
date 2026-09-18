import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ACCENT_COLOR, BRAND_COLOR } from '../branding.js'
import type { VideoCardData } from '../components/VideoCard.js'
import { VideoGrid } from '../components/VideoGrid.js'
import { resumePosition } from '../lib/resume.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Chapter {
  title: string
  start_seconds: number
}
interface CommentRow {
  id: string
  body: string
  posted_at: string
  user_label: string
  author_avatar_index: number
  like_count: number
}
interface WatchVideo {
  id: string
  title: string
  description: string
  stream_url: string | null
  /** WebVTT captions URL — set by the AI subtitle pipeline (PUT /api/videos/:id/subtitles). */
  subtitles_url: string | null
  thumbnail_url: string | null
  channel_id: string
  channel_name: string
  channel_avatar_index: number
  channel_subscribers: number
  duration_seconds: number
  view_count: number
  like_count: number
  dislike_count: number
  published_at: string
  chapters: Chapter[]
  tags: string[]
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #f43f5e 0%, #be185d 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #c2410c 100%)',
  'linear-gradient(135deg, #10b981 0%, #047857 100%)',
]

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function fmtViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `${days}d ago`
  const hours = Math.floor(diff / 3600000)
  if (hours > 0) return `${hours}h ago`
  return 'just now'
}

/**
 * Map an API video row (snake_case from `videos.ts` enrichVideo()) into the
 * shape the watch page renders. Keeps `chapters` parsing tolerant —
 * Postgres returns the JSONB column as an array of objects with `start_sec`
 * and `title` keys, but legacy fixture rows might use `start_seconds`.
 */
function mapApiVideo(raw: Record<string, unknown>, channelName?: string): WatchVideo {
  const rawChapters = Array.isArray(raw.chapters) ? raw.chapters : []
  const chapters: Chapter[] = rawChapters
    .map((c: unknown) => {
      const obj = (c ?? {}) as Record<string, unknown>
      const start =
        typeof obj.start_sec === 'number'
          ? obj.start_sec
          : typeof obj.start_seconds === 'number'
            ? obj.start_seconds
            : 0
      return { start_seconds: start, title: String(obj.title ?? '') }
    })
    .filter((c) => c.title)
  const channelId = String(raw.channel_id ?? '')
  const tags = typeof raw.tag === 'string' && raw.tag ? [raw.tag] : []
  const stream =
    (raw.hls_url as string | null | undefined) ??
    (raw.source_url as string | null | undefined) ??
    null
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    description: String(raw.description ?? ''),
    stream_url: stream,
    subtitles_url: (raw.subtitles_url as string | null | undefined) ?? null,
    thumbnail_url: (raw.thumbnail_url as string | null | undefined) ?? null,
    channel_id: channelId,
    channel_name: channelName ?? String(raw.channel_name ?? ''),
    channel_avatar_index: 0,
    channel_subscribers: 0,
    duration_seconds:
      typeof raw.duration_seconds === 'number'
        ? raw.duration_seconds
        : typeof raw.duration_sec === 'number'
          ? raw.duration_sec
          : 0,
    view_count: typeof raw.view_count === 'number' ? raw.view_count : 0,
    like_count: typeof raw.like_count === 'number' ? raw.like_count : 0,
    dislike_count: typeof raw.dislike_count === 'number' ? raw.dislike_count : 0,
    published_at: String(raw.published_at ?? raw.created_at ?? new Date().toISOString()),
    chapters,
    tags,
  }
}

const EMPTY_VIDEO: WatchVideo = {
  id: '',
  title: '',
  description: '',
  stream_url: null,
  subtitles_url: null,
  thumbnail_url: null,
  channel_id: '',
  channel_name: '',
  channel_avatar_index: 0,
  channel_subscribers: 0,
  duration_seconds: 0,
  view_count: 0,
  like_count: 0,
  dislike_count: 0,
  published_at: new Date().toISOString(),
  chapters: [],
  tags: [],
}

export function Watch() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [video, setVideo] = useState<WatchVideo>(EMPTY_VIDEO)
  const [recs, setRecs] = useState<VideoCardData[]>([])
  const [comments, setComments] = useState<CommentRow[]>([])
  const [activeChapter, setActiveChapter] = useState(0)
  const [reaction, setReaction] = useState<'like' | 'dislike' | null>(null)
  const [subscribed, setSubscribed] = useState(false)
  const [followId, setFollowId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [composerBody, setComposerBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [progressSeconds, setProgressSeconds] = useState(0)
  // Resume playback: the saved watch_history.position_sec, seeked once BOTH the metadata is loaded
  // and the saved position has been fetched (whichever lands last triggers the one-time seek, guarded
  // by resumeAppliedRef); the position is saved back as the user watches. lastSavedRef throttles saves.
  const resumeAtRef = useRef<number | null>(null)
  const resumeAppliedRef = useRef(false)
  const lastSavedRef = useRef(0)

  const seekToResume = useCallback(() => {
    const el = videoRef.current
    if (!el || resumeAppliedRef.current || resumeAtRef.current == null || el.readyState < 1) return
    const target = resumePosition(resumeAtRef.current, el.duration)
    if (target > 0) el.currentTime = target
    resumeAppliedRef.current = true
  }, [])

  const savePosition = useCallback(() => {
    const el = videoRef.current
    if (!el || !id) return
    const pos = Math.floor(el.currentTime)
    if (pos <= 0) return
    void http.post('/api/library/history', { video_id: id, position_sec: pos }).catch(() => null)
  }, [http, id])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    resumeAppliedRef.current = false
    resumeAtRef.current = null
    lastSavedRef.current = 0
    // Loading the watch page IS the user's "watch this video" action: record an entry in
    // /api/library/history (position omitted) so /library reflects it; the handler upserts on
    // (user_id, video_id) so re-visits just bump watched_at and keep the saved resume position.
    http.post('/api/library/history', { video_id: id }).catch(() => null)
    Promise.all([
      http.get(`/api/videos/${id}`).catch(() => null),
      http.get('/api/videos').catch(() => null),
      http.get(`/api/comments?video_id=${id}`).catch(() => null),
      http.get('/api/follows').catch(() => null),
      http.get('/api/library/later').catch(() => null),
      http.get('/api/library/history').catch(() => null),
    ]).then(([v, recList, c, follows, later, history]) => {
      if (cancelled) return
      const apiV = v ? unwrapSingle<Record<string, unknown>>(v) : null
      if (apiV) {
        const mapped = mapApiVideo(apiV)
        setVideo(mapped)
        if (mapped.channel_id) {
          http
            .get(`/api/channels/${mapped.channel_id}`)
            .catch(() => null)
            .then((ch) => {
              if (cancelled || !ch) return
              const channel = unwrapSingle<Record<string, unknown>>(ch)
              if (!channel) return
              setVideo((prev) => ({
                ...prev,
                channel_name: String(channel.name ?? prev.channel_name),
                channel_subscribers:
                  typeof channel.subscriber_count === 'number'
                    ? channel.subscriber_count
                    : prev.channel_subscribers,
              }))
            })
        }
      }
      if (recList) {
        const list = unwrapList<Record<string, unknown>>(recList)
          .filter((r) => String(r.id) !== id)
          .map(
            (r) =>
              ({
                id: String(r.id),
                title: String(r.title ?? ''),
                channel_id: String(r.channel_id ?? ''),
                channel_name: String(r.channel_name ?? ''),
                duration_seconds:
                  typeof r.duration_seconds === 'number'
                    ? r.duration_seconds
                    : typeof r.duration_sec === 'number'
                      ? r.duration_sec
                      : 0,
                view_count: typeof r.view_count === 'number' ? r.view_count : 0,
                published_at: String(r.published_at ?? r.created_at ?? new Date().toISOString()),
                cover_index: typeof r.cover_index === 'number' ? r.cover_index : 0,
                live: !!r.live,
              }) as VideoCardData,
          )
        setRecs(list.slice(0, 6))
      }
      if (c) {
        const list = unwrapList<Record<string, unknown>>(c).map((row, i): CommentRow => ({
          id: String(row.id ?? i),
          body: String(row.body ?? ''),
          posted_at: String(row.createdAt ?? row.created_at ?? new Date().toISOString()),
          user_label: String(row.userLabel ?? row.user_label ?? row.userId ?? 'You'),
          author_avatar_index: i % AVATAR_GRADIENTS.length,
          like_count: 0,
        }))
        setComments(list)
      }
      if (follows && apiV) {
        const list = unwrapList<Record<string, unknown>>(follows)
        const targetChannel = String(apiV.channel_id ?? '')
        const f = list.find((r) => String(r.channel_id ?? r.targetId) === targetChannel)
        if (f) {
          setSubscribed(true)
          setFollowId(String(f.id ?? ''))
        }
      }
      if (later) {
        const list = unwrapList<Record<string, unknown>>(later)
        const s = list.find((r) => String(r.video_id) === id)
        if (s) {
          setSaved(true)
          setSavedId(String(s.id ?? ''))
        }
      }
      if (history) {
        const rows = unwrapList<Record<string, unknown>>(history)
        const row = rows.find((r) => String(r.video_id) === id)
        resumeAtRef.current = row && typeof row.position_sec === 'number' ? row.position_sec : 0
        // The metadata may already be loaded by the time this fetch resolves — try the seek now;
        // onLoadedMetadata will try it too if it hasn't loaded yet. Whichever is second applies it.
        seekToResume()
      }
    })
    return () => {
      cancelled = true
      // Persist the position when leaving the page / switching videos, so Resume works next time.
      savePosition()
    }
  }, [http, id, seekToResume, savePosition])

  const channelAvatarGradient =
    AVATAR_GRADIENTS[video.channel_avatar_index % AVATAR_GRADIENTS.length]
  const progress =
    video.duration_seconds > 0 ? Math.min(1, progressSeconds / video.duration_seconds) : 0

  const handleReact = async (next: 'like' | 'dislike') => {
    const previous = reaction
    if (previous === next) {
      setReaction(null)
      return
    }
    setReaction(next)
    if (!id) return
    try {
      // The HttpClient.post signature is `(url, data, config?)` — the body
      // is the SECOND argument, NOT `{ data: ... }`. Earlier flagship code
      // wrapped the body which sent `{ data: { reaction } }` to the server
      // and silently failed validation.
      await http.post(`/api/videos/${id}/react`, { reaction: next })
      setVideo((prev) =>
        next === 'like'
          ? { ...prev, like_count: prev.like_count + 1 }
          : { ...prev, dislike_count: prev.dislike_count + 1 },
      )
    } catch (_error) {
      // Rollback optimistic reaction update on failure.
      setReaction(previous)
    }
  }

  const handleSubscribe = async () => {
    if (!video.channel_id) return
    if (subscribed && followId) {
      try {
        await http.delete(`/api/follows/${followId}`)
        setSubscribed(false)
        setFollowId(null)
        setVideo((prev) => ({
          ...prev,
          channel_subscribers: Math.max(0, prev.channel_subscribers - 1),
        }))
      } catch (_error) {
        /* Unsubscribe is best-effort; leave UI as-is on failure. */
      }
    } else {
      try {
        const res = await http.post('/api/follows', { channel_id: video.channel_id })
        const row = unwrapSingle<Record<string, unknown>>(res) ?? {}
        setSubscribed(true)
        setFollowId(String(row.id ?? ''))
        setVideo((prev) => ({ ...prev, channel_subscribers: prev.channel_subscribers + 1 }))
      } catch (_error) {
        /* Subscribe is best-effort; leave UI as-is on failure. */
      }
    }
  }

  const handleSave = async () => {
    if (!id) return
    if (saved && savedId) {
      try {
        await http.delete(`/api/library/later/${savedId}`)
        setSaved(false)
        setSavedId(null)
      } catch (_error) {
        /* Remove from library is best-effort; leave UI as-is on failure. */
      }
    } else {
      try {
        const res = await http.post('/api/library/later', { video_id: id })
        const row = unwrapSingle<Record<string, unknown>>(res) ?? {}
        setSaved(true)
        setSavedId(String(row.id ?? ''))
      } catch (_error) {
        /* Save to library is best-effort; leave UI as-is on failure. */
      }
    }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 1800)
    } catch (_error) {
      /* Clipboard access is optional; browser may block it — ignore. */
    }
  }

  const handlePostComment = async () => {
    if (!id || !composerBody.trim()) return
    setPosting(true)
    try {
      const res = await http.post('/api/comments', { video_id: id, body: composerBody.trim() })
      const row = unwrapSingle<Record<string, unknown>>(res) ?? {}
      const next: CommentRow = {
        id: String(row.id ?? `local-${Date.now()}`),
        body: composerBody.trim(),
        posted_at: String(row.createdAt ?? new Date().toISOString()),
        user_label: 'You',
        author_avatar_index: 0,
        like_count: 0,
      }
      setComments((prev) => [...prev, next])
      setComposerBody('')
    } catch (_error) {
      /* Leave composer text alone so the user can retry. */
    } finally {
      setPosting(false)
    }
  }

  const handleChapterClick = (i: number) => {
    setActiveChapter(i)
    if (videoRef.current && video.chapters[i]) {
      videoRef.current.currentTime = video.chapters[i].start_seconds
      void videoRef.current.play().catch(() => {})
    }
  }

  const watchProgressLabel = useMemo(() => fmtTime(progressSeconds), [progressSeconds])
  const durationLabel = useMemo(() => fmtTime(video.duration_seconds), [video.duration_seconds])

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 6), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8')}>
        <div className={cm.cn('lg:col-span-2 space-y-5')}>
          <div
            className={cm.cn(
              'relative overflow-hidden rounded-2xl shadow-2xl shadow-black/30 aspect-video flex items-center justify-center bg-foreground',
            )}
          >
            {video.stream_url ? (
              <video
                ref={videoRef}
                key={video.stream_url}
                src={video.stream_url}
                poster={video.thumbnail_url ?? undefined}
                controls
                playsInline
                preload="metadata"
                className={cm.cn('w-full h-full')}
                onTimeUpdate={(e) => {
                  const now = e.currentTarget.currentTime
                  setProgressSeconds(now)
                  // Throttle position saves to ~every 10s of playback so a crash/close mid-watch
                  // still leaves a recent resume point.
                  if (now - lastSavedRef.current >= 10) {
                    lastSavedRef.current = now
                    savePosition()
                  }
                  const next = video.chapters.findIndex((c, i) => {
                    const nextStart = video.chapters[i + 1]?.start_seconds ?? Infinity
                    return now >= c.start_seconds && now < nextStart
                  })
                  if (next >= 0 && next !== activeChapter) setActiveChapter(next)
                }}
                onPause={() => savePosition()}
                onLoadedMetadata={(e) => {
                  if (!isFinite(video.duration_seconds) || video.duration_seconds === 0) {
                    setVideo((prev) => ({ ...prev, duration_seconds: e.currentTarget.duration }))
                  }
                  seekToResume()
                }}
              >
                {/* Captions track: the video's own WebVTT when the AI subtitle
                    pipeline has produced one, otherwise an explicitly empty
                    placeholder so the player never claims captions it lacks. */}
                <track
                  kind="captions"
                  src={video.subtitles_url ?? '/captions/no-captions.vtt'}
                  srcLang="en"
                  label={t('watch.captionsLabel', {}, { defaultValue: 'Captions' })}
                />
                {t(
                  'watch.unsupportedFallback',
                  {},
                  { defaultValue: 'Your browser does not support inline video playback.' },
                )}
              </video>
            ) : (
              <div
                className={cm.cn('absolute inset-0')}
                style={{
                  backgroundImage: `radial-gradient(circle at 30% 40%, ${BRAND_COLOR}55, transparent 50%), radial-gradient(circle at 75% 60%, ${ACCENT_COLOR}40, transparent 45%)`,
                }}
                aria-hidden="true"
              />
            )}
            {!video.stream_url && (
              <p className={cm.cn('relative z-10 text-white/85 text-sm')}>
                {t(
                  'watch.notReady',
                  {},
                  { defaultValue: 'This video is still processing — check back in a few minutes.' },
                )}
              </p>
            )}
          </div>

          <div className={cm.cn('space-y-3')}>
            {video.tags.length > 0 && (
              <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
                {video.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className={cm.cn(
                      'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface-container-low text-on-surface-variant border border-outline-variant',
                    )}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <h1
              className={cm.cn('text-2xl md:text-3xl font-extrabold tracking-tight leading-tight')}
            >
              {video.title || t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </h1>
            <div
              className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}
            >
              <Link
                to={`/channel/${video.channel_id}`}
                className={cm.cn('group flex items-center gap-3')}
              >
                <div
                  className={cm.cn(
                    'w-12 h-12 rounded-full flex items-center justify-center shadow',
                  )}
                  style={{ background: channelAvatarGradient }}
                  aria-hidden="true"
                >
                  <span className={cm.cn('material-symbols-outlined text-[24px] text-white/90')}>
                    person
                  </span>
                </div>
                <div className={cm.cn('min-w-0')}>
                  <p
                    className={cm.cn(
                      'text-sm font-bold tracking-tight group-hover:text-primary transition-colors',
                    )}
                  >
                    {video.channel_name}
                  </p>
                  <p className={cm.cn('text-xs text-on-surface-variant tabular-nums')}>
                    {t(
                      'watch.subscribersCount',
                      { count: fmtViews(video.channel_subscribers) },
                      { defaultValue: '{{count}} subscribers' },
                    )}
                  </p>
                </div>
              </Link>

              <div className={cm.cn('flex items-center gap-2')}>
                <button
                  type="button"
                  onClick={handleSubscribe}
                  className={cm.cn(
                    'px-5 h-10 rounded-full text-sm font-bold uppercase tracking-widest transition-opacity shadow',
                    subscribed
                      ? 'bg-surface-container-low text-on-surface border border-outline-variant'
                      : 'text-white hover:opacity-90',
                  )}
                  style={
                    !subscribed
                      ? { background: `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})` }
                      : undefined
                  }
                  aria-pressed={subscribed}
                >
                  {subscribed
                    ? t('watch.subscribedCta', {}, { defaultValue: 'Subscribed' })
                    : t('watch.subscribeCta', {}, { defaultValue: 'Subscribe' })}
                </button>
                <div
                  className={cm.cn(
                    'inline-flex items-center bg-surface-container-low rounded-full overflow-hidden border border-outline-variant',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleReact('like')}
                    className={cm.cn(
                      'inline-flex items-center gap-1.5 px-4 h-10 text-sm font-semibold transition-colors',
                      reaction === 'like' ? 'text-primary' : 'text-on-surface hover:text-primary',
                    )}
                    aria-pressed={reaction === 'like'}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-[20px]')}
                      style={
                        reaction === 'like' ? { fontVariationSettings: "'FILL' 1" } : undefined
                      }
                    >
                      thumb_up
                    </span>
                    <span className={cm.cn('tabular-nums')}>{fmtViews(video.like_count)}</span>
                  </button>
                  <span className={cm.cn('w-px h-6 bg-outline-variant')} aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => handleReact('dislike')}
                    className={cm.cn(
                      'inline-flex items-center px-4 h-10 transition-colors',
                      reaction === 'dislike'
                        ? 'text-primary'
                        : 'text-on-surface hover:text-primary',
                    )}
                    aria-pressed={reaction === 'dislike'}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-[20px]')}
                      style={
                        reaction === 'dislike' ? { fontVariationSettings: "'FILL' 1" } : undefined
                      }
                    >
                      thumb_down
                    </span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleShare}
                  className={cm.cn(
                    'inline-flex items-center gap-1.5 px-4 h-10 rounded-full text-sm font-semibold bg-surface-container-low border border-outline-variant hover:bg-surface-container transition-colors',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[20px]')}
                    aria-hidden="true"
                  >
                    share
                  </span>
                  {shareCopied
                    ? t('common.copiedBang', {}, { defaultValue: 'Copied!' })
                    : t('common.share', {}, { defaultValue: 'Share' })}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className={cm.cn(
                    'inline-flex items-center gap-1.5 px-4 h-10 rounded-full text-sm font-semibold border transition-colors',
                    saved
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-surface-container-low border-outline-variant hover:bg-surface-container',
                  )}
                  aria-pressed={saved}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[20px]')}
                    aria-hidden="true"
                  >
                    {saved ? 'bookmark_added' : 'bookmark_add'}
                  </span>
                  {saved
                    ? t('common.saved', {}, { defaultValue: 'Saved' })
                    : t('common.save', {}, { defaultValue: 'Save' })}
                </button>
              </div>
            </div>

            <div className={cm.cn('rounded-2xl bg-surface-container-lowest p-5 space-y-3')}>
              <div className={cm.cn('flex items-center gap-3 text-xs text-on-surface-variant')}>
                <span className={cm.cn('font-bold tabular-nums')}>
                  {t(
                    'common.countViews',
                    { count: fmtViews(video.view_count) },
                    { defaultValue: '{{count}} views' },
                  )}
                </span>
                <span aria-hidden="true">·</span>
                <span>{timeAgo(video.published_at)}</span>
                <span aria-hidden="true">·</span>
                <span className={cm.cn('font-mono tabular-nums')}>
                  {watchProgressLabel} / {durationLabel}
                </span>
              </div>
              <p className={cm.cn('text-sm leading-relaxed text-on-surface whitespace-pre-line')}>
                {video.description}
              </p>
              {progress > 0 && (
                <div className={cm.cn('h-1 rounded-full bg-outline-variant overflow-hidden')}>
                  <div
                    className={cm.cn('h-full bg-primary')}
                    style={{ width: `${progress * 100}%` }}
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>
          </div>

          <section className={cm.cn('space-y-4')}>
            <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
              <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
                {t(
                  'watch.commentsHeading',
                  { count: comments.length },
                  { defaultValue: '{{count}} comments' },
                )}
              </h2>
              <span className={cm.cn('text-xs text-on-surface-variant')}>
                {t('watch.commentsSort', {}, { defaultValue: 'Sort by Newest' })}
              </span>
            </div>
            <div
              className={cm.cn(
                'flex items-start gap-3 p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant',
              )}
            >
              <div
                className={cm.cn(
                  'w-9 h-9 rounded-full shrink-0 flex items-center justify-center shadow',
                )}
                style={{ background: AVATAR_GRADIENTS[0] }}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined text-[18px] text-white/90')}>
                  person
                </span>
              </div>
              <div className={cm.cn('flex-1 space-y-2')}>
                <textarea
                  value={composerBody}
                  onChange={(e) => setComposerBody(e.target.value)}
                  placeholder={t(
                    'watch.commentPlaceholder',
                    {},
                    { defaultValue: 'Add a comment…' },
                  )}
                  rows={2}
                  aria-label={t('watch.commentInputAria', {}, { defaultValue: 'Add a comment' })}
                  className={cm.cn(
                    'w-full resize-none bg-transparent border-0 focus:outline-none text-sm placeholder:text-on-surface-variant',
                  )}
                />
                <div className={cm.flex({ align: 'center', justify: 'end', gap: 'sm' })}>
                  <button
                    type="button"
                    onClick={() => setComposerBody('')}
                    className={cm.cn(
                      'px-3 h-8 rounded-full text-xs font-bold uppercase tracking-widest bg-surface-container-low border border-outline-variant hover:bg-surface-container transition-colors',
                    )}
                  >
                    {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                  </button>
                  <button
                    type="button"
                    onClick={handlePostComment}
                    disabled={!composerBody.trim() || posting}
                    className={cm.cn(
                      'px-4 h-8 rounded-full text-xs font-bold uppercase tracking-widest text-white transition-opacity shadow disabled:opacity-50',
                    )}
                    style={{
                      background: `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})`,
                    }}
                  >
                    {posting
                      ? t('common.postingEllipsis', {}, { defaultValue: 'Posting…' })
                      : t('watch.commentPost', {}, { defaultValue: 'Comment' })}
                  </button>
                </div>
              </div>
            </div>
            <ul className={cm.cn('divide-y divide-outline-variant/40')}>
              {comments.length === 0 ? (
                <li
                  className={cm.cn(
                    cm.sp('py', 8),
                    cm.textCenter,
                    'text-on-surface-variant text-sm',
                  )}
                >
                  {t('watch.commentsEmpty', {}, { defaultValue: 'Be the first to comment.' })}
                </li>
              ) : (
                comments.map((c) => {
                  const grad = AVATAR_GRADIENTS[c.author_avatar_index % AVATAR_GRADIENTS.length]
                  return (
                    <li key={c.id} className={cm.cn('flex gap-3 py-4')}>
                      <div
                        className={cm.cn(
                          'w-10 h-10 rounded-full shrink-0 flex items-center justify-center shadow',
                        )}
                        style={{ background: grad }}
                        aria-hidden="true"
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-[20px] text-white/90')}
                        >
                          person
                        </span>
                      </div>
                      <div className={cm.cn('min-w-0 flex-1')}>
                        <div className={cm.cn('flex items-center gap-2')}>
                          <p className={cm.cn('text-sm font-bold')}>{c.user_label}</p>
                          <span className={cm.cn('text-[11px] text-on-surface-variant')}>
                            {timeAgo(c.posted_at)}
                          </span>
                        </div>
                        <p className={cm.cn('text-sm leading-relaxed mt-1 whitespace-pre-line')}>
                          {c.body}
                        </p>
                      </div>
                    </li>
                  )
                })
              )}
            </ul>
          </section>
        </div>

        <aside className={cm.cn('space-y-6')}>
          {video.chapters.length > 0 && (
            <section className={cm.cn('rounded-2xl bg-surface-container-lowest p-5')}>
              <h2
                className={cm.cn(
                  'text-sm font-black uppercase tracking-widest text-on-surface-variant mb-3',
                )}
              >
                {t('watch.chaptersHeading', {}, { defaultValue: 'Chapters' })}
              </h2>
              <ul className={cm.cn('space-y-1')}>
                {video.chapters.map((ch, i) => {
                  const isActive = i === activeChapter
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => handleChapterClick(i)}
                        className={cm.cn(
                          'group w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                          isActive
                            ? 'bg-primary/10 text-on-surface'
                            : 'hover:bg-surface-container text-on-surface',
                        )}
                        aria-current={isActive}
                      >
                        <span
                          className={cm.cn(
                            'mt-0.5 text-xs font-mono tabular-nums shrink-0 w-12',
                            isActive ? 'text-primary font-bold' : 'text-on-surface-variant',
                          )}
                        >
                          {fmtTime(ch.start_seconds)}
                        </span>
                        <span
                          className={cm.cn(
                            'text-sm flex-1',
                            isActive ? 'font-bold' : 'font-medium',
                          )}
                        >
                          {ch.title}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {recs.length > 0 && (
            <section className={cm.cn('space-y-3')}>
              <h2
                className={cm.cn(
                  'text-sm font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('status.upNext', {}, { defaultValue: 'Up next' })}
              </h2>
              <div className={cm.cn('space-y-3')}>
                {recs.map((r) => (
                  <Link key={r.id} to={`/watch/${r.id}`} className={cm.cn('group flex gap-3')}>
                    <div
                      className={cm.cn(
                        'w-32 aspect-video rounded-xl shrink-0 flex items-center justify-center shadow',
                      )}
                      style={{
                        background:
                          'linear-gradient(135deg, var(--color-primary-container) 0%, var(--color-surface-container-highest) 50%, var(--color-surface-variant) 100%)',
                      }}
                      aria-hidden="true"
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[28px] text-white/40')}
                      >
                        play_circle
                      </span>
                    </div>
                    <div className={cm.cn('min-w-0 flex-1')}>
                      <p
                        className={cm.cn(
                          'text-xs font-semibold tracking-tight line-clamp-2 leading-snug group-hover:text-primary transition-colors',
                        )}
                      >
                        {r.title}
                      </p>
                      <p className={cm.cn('text-[11px] text-on-surface-variant truncate mt-1')}>
                        {r.channel_name}
                      </p>
                      <p className={cm.cn('text-[11px] text-on-surface-variant tabular-nums')}>
                        {t(
                          'common.countViews',
                          { count: fmtViews(r.view_count) },
                          { defaultValue: '{{count}} views' },
                        )}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      {recs.length > 0 && (
        <section className={cm.cn('space-y-4 pt-4')}>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t(
              'watch.moreFromHeading',
              { name: video.channel_name },
              { defaultValue: 'More from {{name}}' },
            )}
          </h2>
          <VideoGrid videos={recs} />
        </section>
      )}
    </div>
  )
}
