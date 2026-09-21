import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface VoiceAgentRow {
  id: string
  name: string
  phone_number: string
  languages: string[] | string
}

interface TranscriptEntry {
  id: string
  role: 'caller' | 'agent'
  text: string
  language: string | null
}

interface ActionEntry {
  id: string
  tool: string
  summary: string
}

interface UtteranceResponse {
  reply: string
  reply_language: string
  detected_language: string
  engine: 'llm' | 'scripted'
  actions: Array<{ id: string; tool: string; arguments: unknown; result: unknown }>
}

function asStringArray(value: string[] | string): string[] {
  if (Array.isArray(value)) return value
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch (_error) {
    return []
  }
}

function summarizeAction(tool: string, result: unknown): string {
  const parsed = (obj: unknown): Record<string, unknown> => {
    if (typeof obj === 'string') {
      try {
        return JSON.parse(obj) as Record<string, unknown>
      } catch (_error) {
        return {}
      }
    }
    return (obj ?? {}) as Record<string, unknown>
  }
  const r = parsed(result)
  if (tool === 'search_availability') {
    const options = Array.isArray(r.options) ? r.options.length : 0
    return String(r.available) + ' · ' + String(options) + ' options'
  }
  if (tool === 'create_reservation') {
    return typeof r.confirmation_code === 'string' ? String(r.confirmation_code) : 'error'
  }
  if (tool === 'lookup_reservation') {
    return r.found ? 'found' : 'not found'
  }
  return JSON.stringify(r)
}

let entrySeq = 0
function nextEntryId(prefix: string): string {
  entrySeq += 1
  return prefix + '-' + entrySeq
}

export function CallSimulator() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams] = useSearchParams()
  const [agents, setAgents] = useState<VoiceAgentRow[]>([])
  const [agentId, setAgentId] = useState<string>('')
  const [language, setLanguage] = useState('en')
  const [mode, setMode] = useState<'scripted' | 'llm'>('scripted')
  const [speakReplies, setSpeakReplies] = useState(false)
  const [callId, setCallId] = useState<string | null>(null)
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null)
  const [engine, setEngine] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [actions, setActions] = useState<ActionEntry[]>([])
  const [utterance, setUtterance] = useState('')
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const transcriptRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    ;(async () => {
      const res = await http.get('/api/voice-agents').catch(() => null)
      const list = unwrapList<VoiceAgentRow>(res)
      setAgents(list)
      const preset = searchParams.get('agent')
      const initial = list.find((a) => a.id === preset)?.id ?? list[0]?.id ?? ''
      setAgentId(initial)
      const initialAgent = list.find((a) => a.id === initial)
      setLanguage(asStringArray(initialAgent?.languages ?? ['en'])[0] ?? 'en')
    })()
  }, [http, searchParams])

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight })
  }, [transcript])

  const selectedAgent = agents.find((a) => a.id === agentId)
  const agentLanguages = asStringArray(selectedAgent?.languages ?? ['en'])

  const speak = async (text: string, lang: string) => {
    try {
      const res = await http.post('/api/speech/synthesize', { text, language: lang })
      const body = (res as unknown as { data?: unknown }).data
      if (body instanceof Blob && body.size > 0) {
        const url = URL.createObjectURL(body)
        const audio = new Audio(url)
        audio.addEventListener('ended', () => URL.revokeObjectURL(url))
        await audio.play().catch(() => undefined)
      }
    } catch (_e) {
      // TTS is optional — transcript stays the primary UX.
      setSpeakReplies(false)
      setError(
        t(
          'simulator.speechUnavailable',
          {},
          { defaultValue: 'Spoken replies are unavailable on this server — transcript only.' },
        ),
      )
    }
  }

  const startCall = async () => {
    if (!agentId) return
    setBusy(true)
    setError(null)
    try {
      const res = await http.post('/api/calls', {
        voice_agent_id: agentId,
        language,
        mode,
      })
      const payload = unwrapSingle<{ id: string; greeting: string }>(res)
      if (!payload) throw new Error('no call')
      setCallId(payload.id)
      void track({
        name: 'call.simulated',
        properties: { call_id: payload.id, agent_id: agentId, language, mode },
      })
      setOutcome(null)
      setActions([])
      setDetectedLanguage(language)
      setTranscript([{ id: nextEntryId('agent'), role: 'agent', text: payload.greeting, language }])
      if (speakReplies) await speak(payload.greeting, language)
    } catch (_e) {
      setError(t('simulator.startError', {}, { defaultValue: 'Could not start the call.' }))
    } finally {
      setBusy(false)
    }
  }

  const sendUtterance = async () => {
    const text = utterance.trim()
    if (!text || !callId) return
    setBusy(true)
    setError(null)
    setUtterance('')
    setTranscript((prev) => [
      ...prev,
      { id: nextEntryId('caller'), role: 'caller', text, language: null },
    ])
    try {
      const res = await http.post('/api/calls/' + callId + '/utterance', { text })
      const payload = unwrapSingle<UtteranceResponse>(res)
      if (!payload) throw new Error('no reply')
      setDetectedLanguage(payload.detected_language)
      setEngine(payload.engine)
      setTranscript((prev) => [
        ...prev,
        {
          id: nextEntryId('agent'),
          role: 'agent',
          text: payload.reply,
          language: payload.reply_language,
        },
      ])
      if (payload.actions.length > 0) {
        const mapped = payload.actions.map((a) => ({
          id: a.id || nextEntryId('action'),
          tool: a.tool,
          summary: summarizeAction(a.tool, a.result),
        }))
        setActions((prev) => [...prev, ...mapped])
      }
      if (speakReplies) await speak(payload.reply, payload.reply_language)
    } catch (_e) {
      setError(t('simulator.turnError', {}, { defaultValue: 'The agent turn failed — try again.' }))
    } finally {
      setBusy(false)
    }
  }

  const endCall = async () => {
    if (!callId) return
    setBusy(true)
    try {
      const res = await http.put('/api/calls/' + callId + '/end', {})
      const payload = unwrapSingle<{ outcome: string }>(res)
      setOutcome(payload?.outcome ?? 'info')
    } catch (_e) {
      setError(t('simulator.endError', {}, { defaultValue: 'Could not end the call.' }))
    } finally {
      setBusy(false)
    }
  }

  const inputClass = cm.cn(
    cm.sp('px', 4),
    cm.sp('py', 3),
    'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
  )

  return (
    <div className={cm.cn(cm.maxW('6xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <h1
        className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}
        data-mol-id="simulator-heading"
      >
        {t('simulator.heading', {}, { defaultValue: 'Call Simulator' })}
      </h1>
      <p className={cm.cn(cm.sp('mt', 1), 'text-on-surface-variant')}>
        {t(
          'simulator.subheading',
          {},
          {
            defaultValue:
              'Type what a caller would say. The agent detects the language, calls its tools, and books rooms live.',
          },
        )}
      </p>

      {error ? (
        <p
          data-mol-id="simulator-error"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-xl bg-error/10 text-error border border-error/30',
          )}
        >
          {error}
        </p>
      ) : null}

      <div className={cm.cn(cm.sp('mt', 6), 'grid grid-cols-1 lg:grid-cols-2 gap-6')}>
        {/* Phone panel */}
        <section
          className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface border border-outline-variant')}
          aria-label={t('simulator.phonePanelLabel', {}, { defaultValue: 'Phone panel' })}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('simulator.agent', {}, { defaultValue: 'Voice agent' })}
              </span>
              <select
                value={agentId}
                onChange={(e) => {
                  setAgentId(e.target.value)
                  const next = agents.find((a) => a.id === e.target.value)
                  setLanguage(asStringArray(next?.languages ?? ['en'])[0] ?? 'en')
                }}
                disabled={callId !== null}
                data-mol-id="simulator-agent-select"
                className={inputClass}
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.phone_number})
                  </option>
                ))}
              </select>
            </label>

            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('simulator.callerLanguage', {}, { defaultValue: 'Caller speaks' })}
              </span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={callId !== null}
                data-mol-id="simulator-language-select"
                className={inputClass}
              >
                {agentLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </label>

            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('simulator.engine', {}, { defaultValue: 'Conversation engine' })}
              </span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value === 'llm' ? 'llm' : 'scripted')}
                disabled={callId !== null}
                data-mol-id="simulator-mode-select"
                className={inputClass}
              >
                <option value="scripted">
                  {t(
                    'simulator.modeScripted',
                    {},
                    { defaultValue: 'Scripted demo (deterministic, no AI key needed)' },
                  )}
                </option>
                <option value="llm">
                  {t(
                    'simulator.modeLlm',
                    {},
                    { defaultValue: 'AI agent (falls back to scripted without a key)' },
                  )}
                </option>
              </select>
            </label>

            <button
              type="button"
              role="switch"
              aria-checked={speakReplies}
              disabled={callId !== null}
              data-mol-id="simulator-speak-toggle"
              onClick={() => setSpeakReplies((v) => !v)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-xl border transition-colors w-fit disabled:opacity-60',
                speakReplies
                  ? 'bg-success/10 text-success border-success/40'
                  : 'bg-surface text-on-surface-variant border-outline-variant',
              )}
            >
              {speakReplies
                ? t('simulator.speakOn', {}, { defaultValue: 'Speak replies: on' })
                : t('simulator.speakOff', {}, { defaultValue: 'Speak replies: off' })}
            </button>

            {callId === null ? (
              <button
                type="button"
                disabled={busy || agentId === ''}
                data-mol-id="simulator-start"
                onClick={() => void startCall()}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  'rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg disabled:opacity-60',
                )}
              >
                {busy
                  ? t('simulator.dialingEllipsis', {}, { defaultValue: 'Dialing…' })
                  : t('simulator.startCall', {}, { defaultValue: 'Start the call' })}
              </button>
            ) : (
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
                <span
                  data-mol-id="simulator-call-state"
                  className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                >
                  {t('simulator.callInProgress', {}, { defaultValue: 'Line open' })}
                  {detectedLanguage
                    ? ' · ' +
                      t(
                        'simulator.detectedAs',
                        { lang: detectedLanguage },
                        { defaultValue: 'caller detected: {{lang}}' },
                      )
                    : ''}
                  {engine ? ' · ' + engine : ''}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  data-mol-id="simulator-end-call"
                  onClick={() => void endCall()}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'rounded-xl border border-error/40 text-error hover:bg-error/10 transition-colors disabled:opacity-60',
                  )}
                >
                  {t('simulator.endCall', {}, { defaultValue: 'End call' })}
                </button>
                {outcome ? (
                  <>
                    <span
                      data-mol-id="simulator-outcome"
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'rounded-full bg-surface-container-high uppercase tracking-widest',
                      )}
                    >
                      {outcome}
                    </span>
                    <Link
                      to={'/calls/' + callId}
                      data-mol-id="simulator-view-detail"
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-primary hover:underline',
                      )}
                    >
                      {t('simulator.viewCallDetail', {}, { defaultValue: 'Open the call record' })}
                    </Link>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </section>

        {/* Transcript + actions */}
        <section
          className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface border border-outline-variant')}
          aria-label={t('simulator.transcriptLabel', {}, { defaultValue: 'Call transcript' })}
        >
          <div
            ref={transcriptRef}
            data-mol-id="simulator-transcript"
            className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'max-h-80 overflow-y-auto')}
          >
            {transcript.length === 0 ? (
              <p
                data-mol-id="simulator-idle"
                className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
              >
                {t(
                  'simulator.idleHint',
                  {},
                  {
                    defaultValue:
                      'Start the call, then type the caller\u2019s first words — any of the agent\u2019s languages works.',
                  },
                )}
              </p>
            ) : (
              transcript.map((entry) => (
                <p
                  key={entry.id}
                  data-mol-id={'simulator-entry-' + entry.role}
                  className={cm.cn(
                    cm.sp('p', 3),
                    cm.textSize('sm'),
                    'rounded-xl max-w-[90%]',
                    entry.role === 'caller'
                      ? 'bg-surface-container-high self-end'
                      : 'bg-primary/10 self-start',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant block',
                    )}
                  >
                    {t('callRole.' + entry.role, {}, { defaultValue: entry.role })}
                    {entry.language ? ' · ' + entry.language : ''}
                  </span>
                  {entry.text}
                </p>
              ))
            )}
          </div>

          {/* Utterance composer */}
          <div className={cm.cn(cm.sp('mt', 4), cm.flex({ gap: 'sm' }))}>
            <label className="sr-only" htmlFor="utterance">
              {t('simulator.utteranceLabel', {}, { defaultValue: 'Caller utterance' })}
            </label>
            <input
              id="utterance"
              type="text"
              value={utterance}
              onChange={(e) => setUtterance(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !busy) void sendUtterance()
              }}
              disabled={callId === null || outcome !== null || busy}
              placeholder={t(
                'simulator.utterancePlaceholder',
                {},
                { defaultValue: 'What the caller says next…' },
              )}
              data-mol-id="simulator-utterance"
              className={cm.cn(inputClass, 'flex-1')}
            />
            <button
              type="button"
              disabled={callId === null || outcome !== null || busy || utterance.trim() === ''}
              data-mol-id="simulator-send"
              onClick={() => void sendUtterance()}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                'rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors disabled:opacity-60',
              )}
            >
              {t('simulator.send', {}, { defaultValue: 'Send' })}
            </button>
          </div>

          {/* Live tool-call timeline */}
          {actions.length > 0 ? (
            <div className={cm.sp('mt', 4)}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('simulator.agentActions', {}, { defaultValue: 'Agent actions this call' })}
              </p>
              <ul className={cm.cn(cm.sp('mt', 2), cm.flex({ direction: 'col', gap: 'xs' }))}>
                {actions.map((a) => (
                  <li
                    key={a.id}
                    data-mol-id={'simulator-action-' + a.tool}
                    className={cm.cn(
                      cm.sp('p', 2),
                      cm.textSize('xs'),
                      'rounded-lg border border-outline-variant bg-surface-container-low',
                      cm.flex({ align: 'center', justify: 'between' }),
                    )}
                  >
                    <span className="font-bold text-primary">{a.tool}</span>
                    <span className="text-on-surface-variant">{a.summary}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
