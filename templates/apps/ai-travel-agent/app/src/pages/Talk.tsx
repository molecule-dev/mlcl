import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-react'

import { AmbientOrbs } from '../components/AmbientOrbs.js'
import { ChatBubble } from '../components/ChatBubble.js'
import { type ToolCall, ToolCallChips } from '../components/ToolCallChips.js'
import { VoiceOrb, type VoiceState } from '../components/VoiceOrb.js'
import { WaveformBars } from '../components/WaveformBars.js'
import { API_BASE_URL } from '../config.js'

interface Turn {
  id?: string
  speaker: 'user' | 'assistant'
  body: string
  source?: 'voice' | 'text'
  toolCalls?: ToolCall[]
}

interface ConversationSummary {
  id: string
  title: string
}

interface MessageRow {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  type: string
  tool_calls?: ToolCall[] | string | null
  created_at: string
}

interface ConversationDetail extends ConversationSummary {
  messages?: MessageRow[]
}

function parseToolCalls(value: MessageRow['tool_calls']): ToolCall[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as ToolCall[]) : []
    } catch (_error) {
      // Older rows without tool calls.
      return []
    }
  }
  return []
}

function rowToTurn(m: MessageRow): Turn {
  return {
    id: m.id,
    speaker: m.role === 'assistant' ? 'assistant' : 'user',
    body: m.content,
    source: m.type === 'voice' ? 'voice' : 'text',
    toolCalls: parseToolCalls(m.tool_calls),
  }
}

/** Strip the `data:audio/...;base64,` prefix that FileReader returns. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '')
      const idx = dataUrl.indexOf('base64,')
      resolve(idx >= 0 ? dataUrl.slice(idx + 'base64,'.length) : dataUrl)
    }
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'))
    reader.readAsDataURL(blob)
  })
}

/**
 * The talk surface: press to speak (or type), the agent searches, books,
 * rebooks and splits through its tools, and the reply is read back.
 */
function Talk() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [draft, setDraft] = useState('')
  const [turns, setTurns] = useState<Turn[] | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [voicePlaybackEnabled, setVoicePlaybackEnabled] = useState(true)
  const [lastAudioAt, setLastAudioAt] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recordStartRef = useRef<number | null>(null)
  const lastDurationMsRef = useRef<number>(0)
  const endRef = useRef<HTMLDivElement | null>(null)

  // The playback toggle round-trips through /preferences so it survives reloads.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await http.get<{ voicePlaybackEnabled?: boolean }>('/preferences')
        if (cancelled) return
        if (typeof res.data?.voicePlaybackEnabled === 'boolean') {
          setVoicePlaybackEnabled(res.data.voicePlaybackEnabled)
        }
      } catch (_error) {
        // Keep the default; a failed preferences read must not block talking.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http])

  // Resume the most recent session, or start with an empty one.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await http.get<ConversationSummary[]>('/conversations')
        if (cancelled) return
        const items = Array.isArray(list.data) ? list.data : []
        if (items.length > 0 && items[0]?.id) {
          const id = items[0].id
          setActiveId(id)
          const detail = await http.get<ConversationDetail>(`/conversations/${id}`)
          if (cancelled) return
          setTurns((detail.data.messages ?? []).map(rowToTurn))
        } else {
          setTurns([])
        }
      } catch (e) {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('talk.fetchError', {}, { defaultValue: 'Could not load the conversation.' }),
        )
        setTurns([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [turns])

  // Release the microphone if the user leaves mid-recording.
  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  async function ensureConversationId(): Promise<string | null> {
    if (activeId) return activeId
    try {
      const created = await http.post<ConversationSummary>('/conversations', {
        title: t('talk.defaultTitle', {}, { defaultValue: 'New trip' }),
      })
      const id = created.data?.id ?? null
      if (id) {
        setActiveId(id)
        track({ name: 'conversation.started', properties: { conversationId: id } })
      }
      return id
    } catch (_error) {
      // The caller surfaces the failure.
      return null
    }
  }

  async function startNewTrip() {
    setError(null)
    try {
      const created = await http.post<ConversationSummary>('/conversations', {
        title: t('talk.defaultTitle', {}, { defaultValue: 'New trip' }),
      })
      if (created.data?.id) {
        setActiveId(created.data.id)
        setTurns([])
        track({ name: 'conversation.started', properties: { conversationId: created.data.id } })
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('talk.createError', {}, { defaultValue: 'Could not start a new trip.' }),
      )
    }
  }

  async function playAssistantAudio(text: string) {
    if (!voicePlaybackEnabled || !text) return
    try {
      const res = await fetch(`${API_BASE_URL}/speech/synthesize`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      if (blob.size === 0) return
      const url = URL.createObjectURL(blob)
      const audio = audioRef.current ?? new Audio()
      audio.src = url
      audioRef.current = audio
      setLastAudioAt(Date.now())
      audio.onended = () => URL.revokeObjectURL(url)
      audio.onerror = () => URL.revokeObjectURL(url)
      void audio.play().catch(() => undefined)
    } catch (_error) {
      // Synthesis failures never break the transcript.
    }
  }

  async function sendMessage(content: string, source: 'voice' | 'text', durationMs?: number) {
    if (!content || sending) return
    setSending(true)
    setError(null)
    const optimistic: Turn = { speaker: 'user', body: content, source }
    setTurns((prev) => (prev ? [...prev, optimistic] : [optimistic]))
    try {
      const id = await ensureConversationId()
      if (!id) {
        throw new Error(
          t('talk.noConversation', {}, { defaultValue: 'No conversation available.' }),
        )
      }
      const res = await http.post<{ assistantMessage?: MessageRow }>(
        `/conversations/${id}/messages`,
        {
          content,
          type: source === 'voice' ? 'voice' : 'text',
          ...(durationMs && durationMs > 0 ? { duration_ms: Math.round(durationMs) } : {}),
        },
      )
      const assistant = res.data?.assistantMessage
      if (assistant) {
        const turn = rowToTurn(assistant)
        setTurns((prev) => [...(prev ?? []), turn])
        track({
          name: source === 'voice' ? 'voice.command' : 'message.sent',
          properties: {
            conversationId: id,
            tools: (turn.toolCalls ?? []).map((c) => c.name),
            ...(durationMs && durationMs > 0 ? { durationMs: Math.round(durationMs) } : {}),
          },
        })
        void playAssistantAudio(assistant.content)
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('talk.sendError', {}, { defaultValue: 'Could not send that.' }),
      )
    } finally {
      setSending(false)
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const content = (draft.trim() || (inputRef.current?.value ?? '')).trim()
    if (!content) return
    setDraft('')
    if (inputRef.current) inputRef.current.value = ''
    await sendMessage(content, 'text')
  }

  async function startRecording() {
    setError(null)
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder !== 'function') {
        throw new Error(
          t(
            'talk.recordingUnsupported',
            {},
            { defaultValue: 'Voice input is not supported in this browser.' },
          ),
        )
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported?.('audio/webm')
          ? 'audio/webm'
          : ''
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        void finalizeRecording(recorder.mimeType || mimeType || 'audio/webm')
      }
      recorderRef.current = recorder
      recorder.start()
      recordStartRef.current = Date.now()
      setVoiceState('listening')
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('talk.micError', {}, { defaultValue: 'Could not access the microphone.' }),
      )
      setVoiceState('idle')
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (recordStartRef.current !== null) {
      lastDurationMsRef.current = Date.now() - recordStartRef.current
      recordStartRef.current = null
    }
    setVoiceState('processing')
  }

  async function finalizeRecording(mimeType: string) {
    try {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      chunksRef.current = []
      if (blob.size === 0) {
        setVoiceState('idle')
        return
      }
      const audioBase64 = await blobToBase64(blob)
      const ext = mimeType.includes('mp3') ? 'mp3' : mimeType.includes('mp4') ? 'mp4' : 'webm'
      const transcribeRes = await http.post<{ text: string; language?: string }>(
        '/speech/transcribe',
        {
          audio: audioBase64,
          filename: `recording.${ext}`,
        },
      )
      const text = (transcribeRes.data?.text ?? '').trim()
      if (!text) {
        setError(
          t('talk.transcriptionEmpty', {}, { defaultValue: 'Nothing was heard. Try again?' }),
        )
        setVoiceState('idle')
        return
      }
      setVoiceState('idle')
      const dur = lastDurationMsRef.current
      lastDurationMsRef.current = 0
      await sendMessage(text, 'voice', dur)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('talk.transcribeError', {}, { defaultValue: 'Could not transcribe the audio.' }),
      )
      setVoiceState('idle')
    }
  }

  function handleMicToggle() {
    if (voiceState === 'idle') void startRecording()
    else if (voiceState === 'listening') stopRecording()
  }

  const suggestions = [
    t(
      'talk.suggest.search',
      {},
      { defaultValue: 'Find me a flight from JFK to London next Friday.' },
    ),
    t('talk.suggest.rebook', {}, { defaultValue: 'Is my flight delayed? Move me if it is.' }),
    t('talk.suggest.split', {}, { defaultValue: 'Split the bill three ways with Ana and Ben.' }),
  ]

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-foreground antialiased relative overflow-hidden',
      )}
    >
      <AmbientOrbs />
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          'relative z-10 border-b border-border bg-background/70 backdrop-blur-md',
        )}
      >
        <div className={cm.cn(cm.flex({ direction: 'col' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.textMuted,
              'uppercase tracking-widest font-semibold',
            )}
          >
            {t('talk.eyebrow', {}, { defaultValue: 'Your agent' })}
          </span>
          <h1 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('talk.title', {}, { defaultValue: 'Where to?' })}
          </h1>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <Switch
            checked={voicePlaybackEnabled}
            onChange={(e) => {
              const next = (e.target as HTMLInputElement).checked
              setVoicePlaybackEnabled(next)
              void http.put('/preferences', { voicePlaybackEnabled: next }).catch(() => undefined)
            }}
            size="sm"
            label={
              voicePlaybackEnabled
                ? t('talk.voiceOn', {}, { defaultValue: 'Voice on' })
                : t('talk.voiceOff', {}, { defaultValue: 'Voice off' })
            }
            aria-label={t('talk.toggleVoicePlayback', {}, { defaultValue: 'Voice playback' })}
          />
          <button
            type="button"
            onClick={() => void startNewTrip()}
            data-mol-id="talk-new-trip"
            className={cm.cn(
              cm.roundedFull,
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'border border-border text-foreground hover:bg-surface-secondary transition-colors',
            )}
          >
            {t('talk.newTrip', {}, { defaultValue: 'New trip' })}
          </button>
        </div>
      </header>

      {lastAudioAt ? (
        <span className="sr-only" data-mol-id="talk-tts-played-at" data-at={String(lastAudioAt)}>
          tts-played
        </span>
      ) : null}

      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center' }),
          cm.flex1,
          'relative z-10 w-full overflow-y-auto',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            cm.stack(8),
            cm.sp('px', 4),
            cm.sp('py', 8),
            cm.w('full'),
            cm.mxAuto,
            'max-w-[680px] pb-40',
          )}
          data-mol-id="talk-transcript"
        >
          {turns === null ? (
            <p className={cm.cn(cm.textCenter, cm.textMuted, cm.textSize('sm'))}>
              {t('talk.loading', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : turns.length === 0 ? (
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
                cm.textCenter,
              )}
            >
              <p className={cm.cn(cm.textMuted, cm.textSize('sm'))}>
                {t(
                  'talk.empty',
                  {},
                  { defaultValue: 'Say where you want to go, or try one of these.' },
                )}
              </p>
              <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.w('full'))}>
                {suggestions.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => void sendMessage(s, 'text')}
                      data-mol-id="talk-suggestion"
                      className={cm.cn(
                        cm.w('full'),
                        cm.textSize('sm'),
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'rounded-2xl bg-surface border border-border text-left hover:border-primary/50 transition-colors',
                      )}
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            turns.map((turn, i) => (
              <div
                key={turn.id ?? `local-${String(i)}`}
                className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
              >
                <ChatBubble speaker={turn.speaker} source={turn.source}>
                  {turn.body}
                </ChatBubble>
                {turn.toolCalls && turn.toolCalls.length > 0 ? (
                  <ToolCallChips calls={turn.toolCalls} />
                ) : null}
              </div>
            ))
          )}
          {sending ? (
            <p
              className={cm.cn(cm.textCenter, cm.textMuted, cm.textSize('xs'))}
              data-mol-id="talk-working"
            >
              {t('talk.working', {}, { defaultValue: 'Working on it…' })}
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className={cm.cn(
                cm.textCenter,
                cm.textSize('xs'),
                cm.sp('p', 3),
                'rounded-xl bg-error/15 text-error border border-error/30',
              )}
            >
              {error}
            </p>
          ) : null}
          <div ref={endRef} />
        </div>
      </main>

      <div
        className={cm.cn(
          cm.position('sticky'),
          cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          cm.sp('px', 6),
          cm.sp('py', 6),
          'bottom-0 z-20 border-t border-border bg-background/85 backdrop-blur-xl',
        )}
      >
        <button
          type="button"
          onClick={handleMicToggle}
          disabled={voiceState === 'processing'}
          aria-label={t('talk.toggleMic', {}, { defaultValue: 'Toggle microphone' })}
          aria-pressed={voiceState === 'listening'}
          className={cm.cn(
            'rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/50',
          )}
        >
          <VoiceOrb state={voiceState} size="md" />
        </button>
        <WaveformBars count={48} active={voiceState !== 'idle'} />
        <form
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.w('full'),
            cm.mxAuto,
            'max-w-[680px] rounded-full bg-surface border border-border shadow-lg shadow-primary/10',
          )}
          onSubmit={handleSend}
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t(
              'talk.inputPlaceholder',
              {},
              { defaultValue: 'Type it instead, or just speak.' },
            )}
            data-mol-id="talk-input"
            className={cm.cn(
              cm.flex1,
              cm.sp('px', 3),
              cm.sp('py', 2),
              'bg-transparent text-foreground placeholder-foreground-tertiary outline-none',
            )}
          />
          <button
            type="submit"
            disabled={sending}
            data-mol-id="talk-send"
            className={cm.cn(
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              cm.fontWeight('bold'),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'bg-gradient-to-r from-primary to-secondary text-white shadow shadow-primary/30 hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all',
            )}
            aria-label={t('common.send', {}, { defaultValue: 'Send' })}
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </form>
        <Link
          to="/trips"
          className={cm.cn(
            cm.textSize('xs'),
            cm.textMuted,
            'hover:text-foreground transition-colors',
          )}
        >
          {t('talk.seeTrips', {}, { defaultValue: 'See your trips' })}
        </Link>
      </div>
    </div>
  )
}

export default Talk
export { Talk, Talk as TalkPage }
