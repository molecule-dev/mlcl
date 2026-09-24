import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton, Switch } from '@molecule/app-ui-react'

interface AgentTools {
  tempo?: number
  warmth?: number
  capabilities?: Record<string, boolean>
}

interface AgentRow {
  id: string
  name: string
  system_prompt: string
  voice_id: string | null
  model: string
  tools?: AgentTools | unknown
}

interface VoiceTile {
  key: string
  defaultLabel: string
  range: string
}

// Fallback list mirrors the OpenAI voices the backend speech bond actually
// supports (see api/src/handlers/speech.ts). The page also fetches /speech/voices
// at runtime in case providers change.
const FALLBACK_VOICE_TILES: ReadonlyArray<VoiceTile> = [
  { key: 'alloy', defaultLabel: 'Alloy', range: 'Neutral · EN' },
  { key: 'echo', defaultLabel: 'Echo', range: 'Crisp baritone · EN' },
  { key: 'fable', defaultLabel: 'Fable', range: 'Warm storyteller · EN-GB' },
  { key: 'onyx', defaultLabel: 'Onyx', range: 'Deep grounded · EN-US' },
  { key: 'nova', defaultLabel: 'Nova', range: 'Bright soprano · EN-US' },
  { key: 'shimmer', defaultLabel: 'Shimmer', range: 'Soft alto · EN' },
]

const CAPABILITIES = [
  { key: 'webSearch', label: 'Web search' },
  { key: 'calendar', label: 'Calendar access' },
  { key: 'email', label: 'Email drafting' },
  { key: 'kb', label: 'Knowledge base' },
] as const

function AgentDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const params = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [agent, setAgent] = useState<AgentRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [voice, setVoice] = useState<string>('alloy')
  const [voicePickedAt, setVoicePickedAt] = useState<number | null>(null)
  const [voiceTiles, setVoiceTiles] = useState<ReadonlyArray<VoiceTile>>(FALLBACK_VOICE_TILES)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [tempo, setTempo] = useState(40)
  const [warmth, setWarmth] = useState(70)
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    webSearch: true,
    calendar: false,
    email: true,
    kb: true,
  })
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await http.get<{ voices?: { voiceId: string; name: string }[] }>(
          '/speech/voices',
        )
        if (cancelled) return
        const list = res.data?.voices
        if (Array.isArray(list) && list.length > 0) {
          setVoiceTiles(
            list.map((v) => ({
              key: v.voiceId,
              defaultLabel: v.name || v.voiceId,
              range: v.name || v.voiceId,
            })),
          )
        }
      } catch (_error) {
        // Keep fallback tile list — /speech/voices is best-effort; the hardcoded
        // FALLBACK_VOICE_TILES list is a complete, correct default.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http])

  useEffect(() => {
    let cancelled = false
    if (!params.id) return
    ;(async () => {
      try {
        const res = await http.get<AgentRow>(`/agents/${params.id}`)
        if (cancelled) return
        if (res.data) {
          setAgent(res.data)
          setSystemPrompt(res.data.system_prompt ?? '')
          if (res.data.voice_id) setVoice(res.data.voice_id)
          // Hydrate behaviour sliders + capabilities from the agent's
          // `tools` jsonb so the UI matches what we last saved.
          const tools = (
            res.data.tools && typeof res.data.tools === 'object'
              ? (res.data.tools as AgentTools)
              : {}
          ) as AgentTools
          if (typeof tools.tempo === 'number') setTempo(tools.tempo)
          if (typeof tools.warmth === 'number') setWarmth(tools.warmth)
          if (tools.capabilities && typeof tools.capabilities === 'object') {
            setEnabled((s) => ({ ...s, ...tools.capabilities }))
          }
        }
      } catch (e) {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('agentDetail.fetchError', {}, { defaultValue: 'Could not load persona.' }),
        )
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, params.id, t])

  async function handleSave() {
    if (saving || !agent) return
    setSaving(true)
    setError(null)
    try {
      const tools: AgentTools = { tempo, warmth, capabilities: enabled }
      const res = await http.patch<AgentRow>(`/agents/${agent.id}`, {
        system_prompt: systemPrompt,
        voice_id: voice,
        tools,
      })
      if (res.data) setAgent(res.data)
      setSavedAt(new Date())
      // Domain event: persona configuration committed.
      track({
        name: 'agent.updated',
        properties: { agentId: agent.id, voiceId: voice },
      })
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('agentDetail.saveError', {}, { defaultValue: 'Could not save persona.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!agent) return
    // Confirmation is ConfirmButton's two-step arm/confirm (Escape +
    // 4s auto-disarm, aria-live) — no more blocking window.confirm.
    setError(null)
    try {
      await http.delete(`/agents/${agent.id}`)
      // Domain event: persona deleted (after the destructive action commits).
      track({ name: 'agent.deleted', properties: { agentId: agent.id } })
      navigate('/agents')
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('agentDetail.deleteError', {}, { defaultValue: 'Could not delete persona.' }),
      )
    }
  }

  const initials = (agent?.name ?? voice).slice(0, 2).toUpperCase()
  const displayName = agent?.name ?? voice

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
          to="/agents"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            cm.textMuted,
            'hover:text-foreground transition-colors',
          )}
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          {t('agentDetail.back', {}, { defaultValue: 'All agents' })}
        </Link>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <div
            className={cm.cn(
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              cm.fontWeight('bold'),
              'h-16 w-16 bg-gradient-to-br from-primary to-secondary text-white text-xl',
            )}
          >
            {initials}
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col' }))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.textMuted,
                'uppercase tracking-widest font-semibold',
              )}
            >
              {t('agentDetail.eyebrow', {}, { defaultValue: 'Persona' })}
            </span>
            <h1
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                'tracking-tight capitalize',
              )}
            >
              {displayName}
            </h1>
          </div>
        </div>
      </header>

      <main
        className={cm.cn(
          cm.grid({ cols: 1, gap: 'lg' }),
          cm.sp('px', 6),
          cm.sp('py', 8),
          cm.mxAuto,
          cm.w('full'),
          'max-w-[1080px] lg:grid-cols-[2fr_1fr]',
        )}
      >
        <section className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(6))}>
          <article className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface border border-border')}>
            <header
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
            >
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                {t('agentDetail.voicePicker', {}, { defaultValue: 'Voice tile' })}
              </h2>
              <span className={cm.cn(cm.textSize('xs'), cm.textMuted, 'uppercase tracking-widest')}>
                {t('agentDetail.tap', {}, { defaultValue: 'Tap to preview' })}
              </span>
            </header>
            <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
              {voicePickedAt ? (
                <span
                  className="sr-only"
                  data-mol-id="voice-picked-at"
                  data-at={String(voicePickedAt)}
                >
                  {voice}
                </span>
              ) : null}
              {voiceTiles.map((tile) => {
                const active = tile.key === voice
                return (
                  <button
                    key={tile.key}
                    type="button"
                    data-mol-id={`agent-voice-${tile.key}`}
                    onClick={() => {
                      setVoice(tile.key)
                      setVoicePickedAt(Date.now())
                    }}
                    aria-pressed={active}
                    className={cm.cn(
                      cm.flex({ direction: 'col', gap: 'xs' }),
                      cm.sp('p', 4),
                      cm.textSize('sm'),
                      'rounded-xl border transition-all text-left',
                      active
                        ? 'bg-primary/15 border-primary'
                        : 'bg-surface-secondary border-border hover:border-primary/40',
                    )}
                  >
                    <span className={cm.cn(cm.fontWeight('bold'))}>
                      {t(
                        `agentDetail.voice.${tile.key}.label`,
                        {},
                        { defaultValue: tile.defaultLabel },
                      )}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                      {t(`agentDetail.voice.${tile.key}.range`, {}, { defaultValue: tile.range })}
                    </span>
                  </button>
                )
              })}
            </div>
          </article>

          <article className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface border border-border')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
              {t('agentDetail.systemPrompt', {}, { defaultValue: 'System prompt' })}
            </h2>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={6}
              placeholder={t(
                'agentDetail.systemPromptPlaceholder',
                {},
                { defaultValue: 'Describe how this persona should respond…' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 4),
                cm.textSize('sm'),
                'rounded-xl bg-surface-secondary border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none font-mono',
              )}
            />
          </article>

          <article className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface border border-border')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
              {t('agentDetail.behavior', {}, { defaultValue: 'Behavior' })}
            </h2>
            <div className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(4))}>
              <label className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.textSize('sm'),
                  )}
                >
                  <span className={cm.cn(cm.fontWeight('semibold'))}>
                    {t('agentDetail.tempo', {}, { defaultValue: 'Tempo' })}
                  </span>
                  <span className={cm.cn(cm.textMuted, 'tabular-nums')}>{tempo}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={tempo}
                  onChange={(e) => setTempo(Number(e.target.value))}
                  className={cm.cn('w-full accent-primary')}
                />
              </label>
              <label className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.textSize('sm'),
                  )}
                >
                  <span className={cm.cn(cm.fontWeight('semibold'))}>
                    {t('agentDetail.warmth', {}, { defaultValue: 'Warmth' })}
                  </span>
                  <span className={cm.cn(cm.textMuted, 'tabular-nums')}>{warmth}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={warmth}
                  onChange={(e) => setWarmth(Number(e.target.value))}
                  className={cm.cn('w-full accent-secondary')}
                />
              </label>
            </div>
          </article>
        </section>

        <aside className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(6))}>
          <article className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface border border-border')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
              {t('agentDetail.capabilities', {}, { defaultValue: 'Capabilities' })}
            </h2>
            <ul className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
              {CAPABILITIES.map((c) => {
                const on = !!enabled[c.key]
                return (
                  <li
                    key={c.key}
                    className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}
                  >
                    <span className={cm.cn(cm.textSize('sm'))}>
                      {t(`agentDetail.cap.${c.key}`, {}, { defaultValue: c.label })}
                    </span>
                    {/* Shared a11y Switch — role=switch + aria-checked +
                        40×40 touch hit-area (the old aria-pressed pill had
                        no touch-target expansion at all). */}
                    <Switch
                      checked={on}
                      onChange={(e) =>
                        setEnabled((s) => ({
                          ...s,
                          [c.key]: (e.target as HTMLInputElement).checked,
                        }))
                      }
                      aria-label={t(`agentDetail.cap.${c.key}`, {}, { defaultValue: c.label })}
                      size="sm"
                    />
                  </li>
                )
              })}
            </ul>
          </article>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !agent}
            data-mol-id="agent-save"
            className={cm.cn(
              cm.roundedFull,
              cm.fontWeight('bold'),
              cm.sp('py', 3),
              'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:opacity-90 active:scale-95 transition-all disabled:opacity-60',
            )}
          >
            {saving
              ? t('agentDetail.saving', {}, { defaultValue: 'Saving…' })
              : t('agentDetail.save', {}, { defaultValue: 'Save persona' })}
          </button>
          {agent ? (
            <Link
              to={`/conversation?agent=${agent.id}`}
              data-mol-id="agent-talk-now"
              className={cm.cn(
                cm.roundedFull,
                cm.fontWeight('semibold'),
                cm.sp('py', 3),
                cm.textCenter,
                'border border-primary/40 text-primary hover:bg-primary/10 active:scale-95 transition-all',
              )}
            >
              {t('agentDetail.talkNow', {}, { defaultValue: 'Talk now with this persona' })}
            </Link>
          ) : null}
          {/* Two-step destructive action: arm → "Confirm delete?" → commit.
              Escape disarms, 4s auto-disarm, aria-live announces the arm. */}
          <ConfirmButton
            label={t('agentDetail.delete', {}, { defaultValue: 'Delete persona' })}
            confirmLabel={t('agentDetail.deleteConfirm', {}, { defaultValue: 'Confirm delete?' })}
            onConfirm={handleDelete}
            disabled={!agent}
            testId="agent-delete"
            color="error"
            variant="outline"
            className={cm.cn(cm.roundedFull, cm.fontWeight('semibold'), cm.sp('py', 3))}
          />
          {savedAt ? (
            <p role="status" className={cm.cn(cm.textSize('xs'), cm.textCenter, cm.textMuted)}>
              {t(
                'common.savedAt',
                { time: savedAt.toLocaleTimeString() },
                { defaultValue: 'Saved at {{time}}' },
              )}
            </p>
          ) : null}
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
        </aside>
      </main>
    </div>
  )
}

export default AgentDetail
export { AgentDetail, AgentDetail as AgentDetailPage }
