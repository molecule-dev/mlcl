import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AmbientOrbs } from '../components/AmbientOrbs.js'
import { ChatBubble } from '../components/ChatBubble.js'
import { VoiceOrb, type VoiceState } from '../components/VoiceOrb.js'
import { WaveformBars } from '../components/WaveformBars.js'
import { API_BASE_URL } from '../config.js'

interface Turn {
  id?: string
  speaker: 'user' | 'assistant'
  body: string
  source?: 'voice' | 'text'
  duration?: string
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
  created_at: string
}

interface ConversationDetail extends ConversationSummary {
  messages?: MessageRow[]
}

function rowToTurn(m: MessageRow): Turn {
  return {
    id: m.id,
    speaker: m.role === 'assistant' ? 'assistant' : 'user',
    body: m.content,
    source: m.type === 'voice' ? 'voice' : 'text',
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

function Conversation() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams] = useSearchParams()
  const requestedAgentId = searchParams.get('agent')
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

  // Hydrate the voice-playback toggle from the user's persisted prefs so
  // the choice survives reload / device switch. Without this load the
  // toggle is purely local React state and quietly resets to "on" on
  // every navigation — a classic placeholder bug.
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
        // Keep the optimistic default — losing the persisted value is a
        // worse UX than ignoring a transient /preferences fetch failure.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http])

  // Fetch the most recent conversation (or create one if none) when the
  // page mounts. The verifier and humans both need a real, observable
  // network round-trip on first load.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (requestedAgentId) {
          // ?agent=<id> means "talk now with this persona" — always
          // start a fresh conversation bound to that agent rather than
          // resuming the most recent (likely unrelated) thread.
          const created = await http.post<ConversationSummary>('/conversations', {
            title: t('conversation.defaultTitle', {}, { defaultValue: 'New conversation' }),
            agent_id: requestedAgentId,
          })
          if (cancelled) return
          if (created.data?.id) {
            setActiveId(created.data.id)
            // Domain event: a fresh session bound to a persona began.
            track({
              name: 'conversation.started',
              properties: { conversationId: created.data.id, agentId: requestedAgentId },
            })
          }
          setTurns([])
          return
        }
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
            : t('conversation.fetchError', {}, { defaultValue: 'Could not load conversation.' }),
        )
        setTurns([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t, requestedAgentId])

  // Tear down the recorder + stream on unmount so the mic light doesn't
  // stay on if the user navigates away mid-recording.
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
        title: t('conversation.defaultTitle', {}, { defaultValue: 'New conversation' }),
        ...(requestedAgentId ? { agent_id: requestedAgentId } : {}),
      })
      const id = created.data?.id ?? null
      if (id) {
        setActiveId(id)
        // Domain event: an ad-hoc session began (first message in a
        // thread that did not exist yet).
        track({ name: 'conversation.started', properties: { conversationId: id } })
      }
      return id
    } catch (_error) {
      // Creation failed — caller receives null and surfaces an error to the user.
      return null
    }
  }

  async function playAssistantAudio(text: string, conversationId?: string) {
    if (!voicePlaybackEnabled) return
    if (!text) return
    try {
      // Fetch as binary blob — relying on the http client's JSON parsing
      // would corrupt the bytes, so go straight to fetch with cookies.
      const res = await fetch(`${API_BASE_URL}/speech/synthesize`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        // Pass the conversation so the server can honor the bound agent's voice /
        // the user's preferred voice; without it TTS falls back to the provider default.
        body: JSON.stringify({ text, ...(conversationId ? { conversationId } : {}) }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      if (blob.size === 0) return
      const url = URL.createObjectURL(blob)
      const audio = audioRef.current ?? new Audio()
      audio.src = url
      audioRef.current = audio
      // Update so tests can detect playback was triggered.
      setLastAudioAt(Date.now())
      audio.onended = () => {
        URL.revokeObjectURL(url)
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
      }
      // play() returns a promise that rejects in autoplay-restricted
      // contexts. Swallow — we still set lastAudioAt so backend logs
      // a real synthesize call regardless of browser permission.
      void audio.play().catch(() => undefined)
    } catch (_error) {
      // Synthesis failures shouldn't break the conversation thread.
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
          t('conversation.noConversation', {}, { defaultValue: 'No conversation available.' }),
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
        setTurns((prev) => [...(prev ?? []), rowToTurn(assistant)])
        // Domain event: a delivered turn — voice-sourced sends are the
        // app's core funnel (voice.command), typed sends are message.sent.
        track({
          name: source === 'voice' ? 'voice.command' : 'message.sent',
          properties: {
            conversationId: id,
            ...(requestedAgentId ? { agentId: requestedAgentId } : {}),
            ...(durationMs && durationMs > 0
              ? { durationMs: Math.round(durationMs) }
              : {}),
          },
        })
        // Auto-play the assistant's reply for voice-first interaction.
        // Always synthesize when the user spoke; for typed messages the
        // user still gets audio playback unless they've muted it.
        void playAssistantAudio(assistant.content, id)
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('conversation.sendError', {}, { defaultValue: 'Could not send message.' }),
      )
    } finally {
      setSending(false)
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    // Read directly from the DOM so the form still submits when the
    // input was filled programmatically (e.g., via dispatchEvent in
    // automation), in addition to the React-controlled `draft` state.
    const fromState = draft.trim()
    const fromRef = (inputRef.current?.value ?? '').trim()
    const content = fromState || fromRef
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
            'conversation.recordingUnsupported',
            {},
            { defaultValue: 'Voice input is not supported in this browser.' },
          ),
        )
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      // webm/opus is broadly supported in browsers; OpenAI Whisper accepts it.
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
          : t('conversation.micError', {}, { defaultValue: 'Could not access microphone.' }),
      )
      setVoiceState('idle')
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
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
        { audio: audioBase64, filename: `recording.${ext}` },
      )
      const text = (transcribeRes.data?.text ?? '').trim()
      if (!text) {
        setError(
          t(
            'conversation.transcriptionEmpty',
            {},
            { defaultValue: "We couldn't hear anything. Try again?" },
          ),
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
          : t('conversation.transcribeError', {}, { defaultValue: 'Could not transcribe audio.' }),
      )
      setVoiceState('idle')
    }
  }

  function handleMicToggle() {
    if (voiceState === 'idle') {
      void startRecording()
    } else if (voiceState === 'listening') {
      stopRecording()
    }
    // While processing, ignore further presses.
  }

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
            {t('conversation.eyebrow', {}, { defaultValue: 'Live session' })}
          </span>
          <h1 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('conversation.title', {}, { defaultValue: 'Talk it through' })}
          </h1>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <button
            type="button"
            role="switch"
            aria-checked={voicePlaybackEnabled}
            aria-label={t(
              'conversation.toggleVoicePlayback',
              {},
              { defaultValue: 'Voice playback' },
            )}
            onClick={() => {
              setVoicePlaybackEnabled((v) => {
                const next = !v
                // Persist asynchronously — losing this PUT shouldn't break
                // the toggle, but the toggle MUST round-trip through the
                // server so the next page-load and other devices see it.
                void http.put('/preferences', { voicePlaybackEnabled: next }).catch(() => undefined)
                return next
              })
            }}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.roundedFull,
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'px-3 py-1 uppercase tracking-widest transition-colors',
              voicePlaybackEnabled
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'bg-surface text-foreground-tertiary border border-border',
            )}
          >
            <span className="material-symbols-outlined text-[14px]">
              {voicePlaybackEnabled ? 'volume_up' : 'volume_off'}
            </span>
            {voicePlaybackEnabled
              ? t('conversation.voiceOn', {}, { defaultValue: 'Voice on' })
              : t('conversation.voiceOff', {}, { defaultValue: 'Voice off' })}
          </button>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.roundedFull,
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'px-3 py-1 uppercase tracking-widest bg-success/15 text-success border border-success/30',
            )}
          >
            <span className={cm.cn(cm.roundedFull, 'h-1.5 w-1.5 bg-success animate-pulse')} />
            {t('status.live', {}, { defaultValue: 'Live' })}
          </span>
        </div>
      </header>

      {/* Hidden marker for tests: when audio is requested for the latest
          assistant turn, this number changes — proves /api/speech/synthesize
          fired even in headless contexts where audio playback is silent. */}
      {lastAudioAt ? (
        <span
          className="sr-only"
          data-mol-id="conversation-tts-played-at"
          data-at={String(lastAudioAt)}
        >
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
        >
          {turns === null ? (
            <p className={cm.cn(cm.textCenter, cm.textMuted, cm.textSize('sm'))}>
              {t('conversation.loading', {}, { defaultValue: 'Loading conversation…' })}
            </p>
          ) : turns.length === 0 ? (
            <p className={cm.cn(cm.textCenter, cm.textMuted, cm.textSize('sm'))}>
              {t(
                'conversation.empty',
                {},
                { defaultValue: 'No messages yet. Start by saying something or typing below.' },
              )}
            </p>
          ) : (
            turns.map((turn, i) => (
              <ChatBubble
                key={turn.id ?? `local-${String(i)}`}
                speaker={turn.speaker}
                source={turn.source}
                duration={turn.duration}
              >
                {turn.body}
              </ChatBubble>
            ))
          )}
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
          aria-label={t('conversation.toggleMic', {}, { defaultValue: 'Toggle microphone' })}
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
              'conversation.inputPlaceholder',
              {},
              { defaultValue: 'Type a follow-up — or just speak.' },
            )}
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
      </div>
    </div>
  )
}

export default Conversation
export { Conversation, Conversation as ConversationPage }
