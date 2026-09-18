import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ChatBubble } from '../components/ChatBubble.js'
import { WaveformBars } from '../components/WaveformBars.js'
import { API_BASE_URL } from '../config.js'

interface MessageRow {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  type: string
  duration_ms: number | null
  created_at: string
}

interface ConversationDetailRow {
  id: string
  title: string
  message_count: number
  total_seconds_spoken: number
  started_at: string
  messages?: MessageRow[]
}

function timecodeFor(idx: number, message: MessageRow, started?: string): string {
  if (!started) return String(idx).padStart(2, '0')
  const start = new Date(started).getTime()
  const ts = new Date(message.created_at).getTime()
  const diff = Math.max(0, Math.round((ts - start) / 1000))
  const m = Math.floor(diff / 60)
  const s = diff % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const SPEED_OPTIONS = ['1×', '1.5×', '2×'] as const
type Speed = (typeof SPEED_OPTIONS)[number]
const SPEED_TO_RATE: Record<Speed, number> = { '1×': 1, '1.5×': 1.5, '2×': 2 }

function ConversationDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const params = useParams<{ id: string }>()
  const [detail, setDetail] = useState<ConversationDetailRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<Speed>('1×')
  // Index of the message currently being played back. -1 means none.
  const [activeIdx, setActiveIdx] = useState<number>(-1)
  // Track last interaction so same-value clicks still mutate the DOM
  // (e.g., clicking the active speed button re-confirms it).
  const [lastInteraction, setLastInteraction] = useState<{ kind: string; at: number } | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  // Latest desired play state — captured by the playback async loop so
  // a Pause click between fetch and play() actually halts playback.
  const playingRef = useRef(false)
  const speedRef = useRef<Speed>('1×')

  useEffect(() => {
    playingRef.current = playing
  }, [playing])
  useEffect(() => {
    speedRef.current = speed
    if (audioRef.current) audioRef.current.playbackRate = SPEED_TO_RATE[speed]
  }, [speed])

  useEffect(() => {
    let cancelled = false
    if (!params.id) return
    ;(async () => {
      try {
        const res = await http.get<ConversationDetailRow>(`/conversations/${params.id}`)
        if (cancelled) return
        setDetail(res.data ?? null)
      } catch (e) {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t(
                'conversationDetail.fetchError',
                {},
                { defaultValue: 'Could not load transcript.' },
              ),
        )
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, params.id, t])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- new array ref each render; startPlayback captures the latest messages correctly via the dep
  const messages = detail?.messages ?? []

  const stopPlayback = useCallback(() => {
    playingRef.current = false
    setPlaying(false)
    setActiveIdx(-1)
    const audio = audioRef.current
    if (audio) {
      try {
        audio.pause()
      } catch (_error) {
        // pause() throws in some browsers when called on an element with no src; safe to ignore.
      }
      audio.removeAttribute('src')
      audio.load()
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  // Tear down any in-flight playback if the user navigates away.
  useEffect(() => {
    return () => {
      stopPlayback()
    }
  }, [stopPlayback])

  const playOne = useCallback(
    async (text: string): Promise<boolean> => {
      // Returns true once the audio finished naturally (or 0-length blob,
      // treated as a no-op success), false if the user paused or an
      // error short-circuited it. Caller decides whether to advance.
      if (!text.trim()) return true
      let res: Response
      try {
        res = await fetch(`${API_BASE_URL}/speech/synthesize`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          // Include the conversation so the server honors the bound agent's voice /
          // the user's preferred voice instead of falling back to the provider default.
          body: JSON.stringify({ text, ...(params.id ? { conversationId: params.id } : {}) }),
        })
      } catch (_error) {
        // Network failure — signal caller to stop playback loop.
        return false
      }
      if (!res.ok) return false
      if (!playingRef.current) return false
      const blob = await res.blob()
      if (blob.size === 0) return true
      const url = URL.createObjectURL(blob)
      // Drop the previous synthesised chunk before swapping to the next.
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
      objectUrlRef.current = url
      const audio = audioRef.current ?? new Audio()
      audioRef.current = audio
      audio.src = url
      audio.playbackRate = SPEED_TO_RATE[speedRef.current]
      const ended = new Promise<boolean>((resolve) => {
        const cleanup = () => {
          audio.removeEventListener('ended', onEnded)
          audio.removeEventListener('pause', onPause)
          audio.removeEventListener('error', onError)
        }
        const onEnded = () => {
          cleanup()
          resolve(true)
        }
        const onPause = () => {
          // Only treat user-initiated pauses as a stop. Natural end fires
          // pause too, but `ended` already resolved by then.
          if (audio.ended) return
          if (!playingRef.current) {
            cleanup()
            resolve(false)
          }
        }
        const onError = () => {
          cleanup()
          resolve(false)
        }
        audio.addEventListener('ended', onEnded)
        audio.addEventListener('pause', onPause)
        audio.addEventListener('error', onError)
      })
      try {
        await audio.play()
      } catch (_error) {
        // Autoplay may be blocked even though the user clicked Play —
        // resolve as not-finished so the loop stops cleanly.
        return false
      }
      return ended
      // params.id is read above to bind the synthesis to this conversation; without
      // it in the deps the callback keeps the id captured at first render.
    },
    [params.id],
  )

  const startPlayback = useCallback(async () => {
    if (messages.length === 0) return
    playingRef.current = true
    setPlaying(true)
    for (let i = 0; i < messages.length; i++) {
      if (!playingRef.current) break
      setActiveIdx(i)
      const msg = messages[i]
      if (!msg) continue
      const finished = await playOne(msg.content)
      if (!finished) break
    }
    // Natural end-of-conversation: clear active marker and flip to paused
    // so the icon goes back to play_arrow.
    if (playingRef.current) {
      stopPlayback()
    }
  }, [messages, playOne, stopPlayback])

  function togglePlay() {
    if (playing) {
      stopPlayback()
    } else {
      void startPlayback()
    }
  }
  const totalDurationLabel = detail
    ? (() => {
        const m = Math.floor((detail.total_seconds_spoken ?? 0) / 60)
        const s = (detail.total_seconds_spoken ?? 0) % 60
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      })()
    : '00:00'

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-foreground',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'md' }),
          cm.sp('px', 6),
          cm.sp('py', 6),
          'border-b border-border',
        )}
      >
        <Link
          to="/history"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            cm.textMuted,
            'hover:text-foreground transition-colors',
          )}
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          {t('conversationDetail.back', {}, { defaultValue: 'Back to history' })}
        </Link>
        <div className={cm.cn(cm.flex({ direction: 'col' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.textMuted,
              'uppercase tracking-widest font-semibold',
            )}
          >
            {t('conversationDetail.eyebrow', {}, { defaultValue: 'Transcript' })}
          </span>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {detail?.title ??
              t('conversationDetail.untitled', {}, { defaultValue: 'Untitled conversation' })}
          </h1>
          <span className={cm.cn(cm.textSize('sm'), cm.textMuted, 'tabular-nums')}>
            {t(
              'conversationDetail.meta',
              { duration: totalDurationLabel, count: detail?.message_count ?? messages.length },
              { defaultValue: '{{duration}} · {{count}} turns' },
            )}
          </span>
        </div>
      </header>

      <section
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          cm.sp('px', 6),
          cm.sp('py', 6),
          'border-b border-border bg-surface/40 backdrop-blur-md',
        )}
      >
        <WaveformBars count={56} variant="tall" active={playing} />
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <button
            type="button"
            onClick={togglePlay}
            aria-pressed={playing}
            disabled={messages.length === 0}
            aria-label={
              playing
                ? t('conversationDetail.pause', {}, { defaultValue: 'Pause playback' })
                : t('conversationDetail.play', {}, { defaultValue: 'Play playback' })
            }
            className={cm.cn(
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'h-12 w-12 bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50',
            )}
          >
            <span
              className="material-symbols-outlined text-[24px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {playing ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSpeed(s)
                  setLastInteraction({ kind: `speed:${s}`, at: Date.now() })
                }}
                aria-pressed={speed === s}
                aria-label={t(
                  'conversationDetail.setSpeed',
                  { speed: s },
                  { defaultValue: 'Set playback speed to {{speed}}' },
                )}
                className={cm.cn(
                  cm.roundedFull,
                  cm.fontWeight('semibold'),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  speed === s
                    ? 'bg-primary text-white'
                    : 'text-foreground-tertiary border border-border hover:text-foreground',
                  'transition-colors',
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <span className={cm.cn(cm.textSize('sm'), cm.textMuted, 'tabular-nums ml-2')}>
            {t(
              'conversationDetail.elapsed',
              { duration: totalDurationLabel },
              { defaultValue: '00:00 / {{duration}}' },
            )}
          </span>
          {lastInteraction ? (
            <span
              className="sr-only"
              data-mol-id="last-interaction"
              data-kind={lastInteraction.kind}
              data-at={String(lastInteraction.at)}
            >
              {lastInteraction.kind}
            </span>
          ) : null}
          {/* Hidden marker proves playback advanced past the first turn —
              tests can watch this to confirm /api/speech/synthesize fired
              with the first message's text. */}
          {activeIdx >= 0 ? (
            <span
              className="sr-only"
              data-mol-id="conversation-detail-active"
              data-idx={String(activeIdx)}
            >
              {String(activeIdx)}
            </span>
          ) : null}
        </div>
      </section>

      <main
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.stack(8),
          cm.sp('px', 4),
          cm.sp('py', 8),
          cm.mxAuto,
          cm.w('full'),
          'max-w-[760px]',
        )}
      >
        {detail === null && error === null ? (
          <p className={cm.cn(cm.textCenter, cm.textMuted, cm.textSize('sm'))}>
            {t('conversationDetail.loading', {}, { defaultValue: 'Loading transcript…' })}
          </p>
        ) : messages.length === 0 ? (
          <p className={cm.cn(cm.textCenter, cm.textMuted, cm.textSize('sm'))}>
            {t(
              'conversationDetail.empty',
              {},
              { defaultValue: 'No messages in this conversation yet.' },
            )}
          </p>
        ) : (
          messages.map((message, i) => {
            const isActive = i === activeIdx
            return (
              <article
                key={message.id}
                data-mol-id={`conversation-detail-message-${String(i)}`}
                aria-current={isActive ? 'true' : undefined}
                className={cm.cn(
                  cm.flex({ direction: 'col' }),
                  cm.stack(2),
                  isActive ? 'rounded-2xl ring-2 ring-primary/40 bg-primary/5 p-3 -m-3' : '',
                )}
              >
                <header
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('px', 1),
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-secondary',
                    )}
                  >
                    {message.role === 'assistant'
                      ? t('conversationDetail.assistant', {}, { defaultValue: 'Assistant' })
                      : message.role === 'system'
                        ? t('conversationDetail.system', {}, { defaultValue: 'System' })
                        : t('nav.you', {}, { defaultValue: 'You' })}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), cm.textSubtle, 'tabular-nums')}>
                    {timecodeFor(i, message, detail?.started_at)}
                  </span>
                </header>
                <ChatBubble
                  speaker={message.role === 'assistant' ? 'assistant' : 'user'}
                  source={message.type === 'voice' ? 'voice' : 'text'}
                >
                  {message.content}
                </ChatBubble>
              </article>
            )
          })
        )}
        {error ? (
          <p
            role="alert"
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 3),
              'rounded-xl bg-error/15 text-error border border-error/30',
            )}
          >
            {error}
          </p>
        ) : null}
      </main>
    </div>
  )
}

export default ConversationDetail
export { ConversationDetail, ConversationDetail as ConversationDetailPage }
