// Pattern source: bespoke per Neuron DESIGN.md "Agent Builder" treatment.
// Three-pane workbench: tool palette (per-agent toggles), prompt editor, provider/model + run.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ExecutionLogPanel, type LogEntry } from '../components/ExecutionLogPanel.js'

interface AgentRow {
  id: string
  name: string
  provider: string
  model: string
  system_prompt: string
  tools_config: unknown
  temperature?: number
  max_tokens?: number
}

interface ExecutionRow {
  id: string
  status: string
  output?: string
  duration_ms?: number
  started_at?: string
  finished_at?: string
  error_message?: string | null
}

interface ToolToggle {
  name: string
  description: string
  enabled: boolean
}

const DEFAULT_TOOLS: ToolToggle[] = [
  { name: 'web_search', description: 'Real-time web results', enabled: true },
  { name: 'code_executor', description: 'Sandboxed Python REPL', enabled: true },
  { name: 'file_reader', description: 'Read PDF, MD, JSON files', enabled: false },
  { name: 'http_request', description: 'Outbound HTTP fetch', enabled: false },
  { name: 'calculator', description: 'Deterministic math', enabled: true },
  { name: 'database_query', description: 'Read-only SQL projection', enabled: false },
]

const PROVIDERS = ['anthropic', 'openai', 'google'] as const
const MODELS: Record<(typeof PROVIDERS)[number], string[]> = {
  anthropic: ['claude-opus-4-7', 'claude-sonnet-4-7', 'claude-haiku-4-5'],
  openai: ['gpt-5.5', 'gpt-5.3-codex', 'gpt-4o'],
  google: ['gemini-2.5-pro', 'gemini-2.5-flash'],
}

function normalizeProvider(value: string | undefined): (typeof PROVIDERS)[number] {
  const v = (value ?? 'anthropic').toLowerCase()
  return (PROVIDERS as readonly string[]).includes(v)
    ? (v as (typeof PROVIDERS)[number])
    : 'anthropic'
}

function buildLogFromExecution(execution: ExecutionRow): LogEntry[] {
  const stamp = (iso?: string) => (iso ? new Date(iso).toISOString().slice(11, 19) : '00:00:00')
  const entries: LogEntry[] = [
    {
      timestamp: stamp(execution.started_at),
      level: 'INFO',
      message: 'Run dispatched.',
    },
  ]
  if (execution.error_message) {
    entries.push({
      timestamp: stamp(execution.finished_at ?? execution.started_at),
      level: 'WARN',
      message: execution.error_message,
    })
  }
  if (execution.output) {
    entries.push({
      timestamp: stamp(execution.finished_at ?? execution.started_at),
      level: execution.status === 'failed' ? 'WARN' : 'SUCCESS',
      message: execution.output.slice(0, 240),
    })
  }
  return entries
}

export function AgentBuilder() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id: routeId } = useParams<{ id: string }>()

  const [agent, setAgent] = useState<AgentRow | null>(null)
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]>('anthropic')
  const [model, setModel] = useState(MODELS.anthropic[0])
  const [tools, setTools] = useState<ToolToggle[]>(DEFAULT_TOOLS)
  const [prompt, setPrompt] = useState('')
  const [name, setName] = useState('')
  const [testInput, setTestInput] = useState('')
  const [log, setLog] = useState<LogEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isNew = !routeId || routeId === 'new'

  const applyAgent = useCallback((row: AgentRow) => {
    setAgent(row)
    setName(row.name ?? '')
    setProvider(normalizeProvider(row.provider))
    setModel(row.model || MODELS[normalizeProvider(row.provider)][0])
    setPrompt(row.system_prompt ?? '')
    if (Array.isArray(row.tools_config) && row.tools_config.length > 0) {
      setTools(
        DEFAULT_TOOLS.map((tool) => ({
          ...tool,
          enabled: (row.tools_config as Array<{ name?: string; enabled?: boolean }>).some(
            (t) => t.name === tool.name && t.enabled !== false,
          ),
        })),
      )
    }
  }, [])

  const loadAgent = useCallback(async () => {
    if (isNew) {
      try {
        const res = await http.post<AgentRow>('/agents', { name: '' })
        applyAgent(res.data as AgentRow)
        return
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return
      }
    }
    try {
      const res = await http.get<AgentRow>(`/agents/${routeId}`)
      applyAgent(res.data as AgentRow)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [http, isNew, routeId, applyAgent])

  useEffect(() => {
    void loadAgent()
  }, [loadAgent])

  function toggleTool(toolName: string): void {
    setTools((prev) =>
      prev.map((tool) => (tool.name === toolName ? { ...tool, enabled: !tool.enabled } : tool)),
    )
  }

  async function saveDraft(): Promise<void> {
    if (!agent?.id) return
    setError(null)
    setBusy(true)
    try {
      const res = await http.put<AgentRow>(`/agents/${agent.id}`, {
        name: name || agent.name,
        provider,
        model,
        system_prompt: prompt,
        tools_config: tools.map((tool) => ({ name: tool.name, enabled: tool.enabled })),
      })
      applyAgent(res.data as AgentRow)
      setInfo(t('agentBuilder.savedToast', {}, { defaultValue: 'Draft saved.' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function runTest(): Promise<void> {
    if (!agent?.id) return
    if (!testInput.trim()) {
      setError(
        t('agentBuilder.inputRequired', {}, { defaultValue: 'Add a test message before running.' }),
      )
      return
    }
    setError(null)
    setBusy(true)
    try {
      const res = await http.post<{ execution: ExecutionRow }>(`/agents/${agent.id}/run`, {
        message: testInput,
      })
      const execution = (res.data?.execution ?? null) as ExecutionRow | null
      if (execution) {
        setLog((prev) => [...buildLogFromExecution(execution), ...prev])
      }
      setInfo(t('agentBuilder.ranToast', {}, { defaultValue: 'Run dispatched.' }))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      setLog((prev) => [{ timestamp: '--:--:--', level: 'WARN', message }, ...prev])
    } finally {
      setBusy(false)
    }
  }

  const headerId = useMemo(() => agent?.id ?? routeId ?? 'new', [agent?.id, routeId])

  return (
    <div data-mol-id="page-agent-builder">
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
          <Link
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.textSize('xs'),
              'font-mono uppercase tracking-wider text-tertiary hover:text-on-surface transition-colors',
            )}
            data-mol-id="agent-builder-back"
            to="/agents"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            {t('agentBuilder.backToAgents', {}, { defaultValue: 'agents' })}
          </Link>
          <span className="text-tertiary">/</span>
          <h1
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('lg'),
              'font-mono text-on-surface tracking-tight',
            )}
            data-mol-id="agent-builder-id"
          >
            {headerId}
          </h1>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
          <button
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('medium'),
              cm.textSize('xs'),
              'font-mono uppercase tracking-wider text-on-surface bg-surface-container-high hover:bg-surface-container-highest rounded transition-colors',
            )}
            data-mol-id="agent-builder-save"
            disabled={busy || !agent?.id}
            onClick={saveDraft}
            type="button"
          >
            {t('agentBuilder.save', {}, { defaultValue: 'Save Draft' })}
          </button>
          <button
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              cm.flex({ align: 'center', gap: 2 }),
              'btn-primary-gradient rounded text-on-primary-fixed font-mono uppercase tracking-wider',
            )}
            data-mol-id="agent-builder-run"
            disabled={busy || !agent?.id}
            onClick={runTest}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">play_arrow</span>
            {t('agentBuilder.runTest', {}, { defaultValue: 'Run Test' })}
          </button>
        </div>
      </div>

      {(error || info) && (
        <div className={cm.cn(cm.sp('mb', 4))}>
          {error && (
            <p
              className={cm.cn(cm.textSize('sm'), 'text-error font-mono')}
              data-mol-id="agent-builder-error"
              role="alert"
            >
              {error}
            </p>
          )}
          {info && !error && (
            <p
              className={cm.cn(cm.textSize('sm'), 'text-success font-mono')}
              data-mol-id="agent-builder-info"
            >
              {info}
            </p>
          )}
        </div>
      )}

      <div className={cm.cn(cm.grid({ cols: 12, gap: 6 }))}>
        <aside className="col-span-3">
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mb', 3),
              'font-mono uppercase tracking-wider text-tertiary',
            )}
          >
            {t('agentBuilder.toolPalette', {}, { defaultValue: 'Tool Palette' })}
          </h2>
          <div className={cm.cn(cm.stack(2))}>
            {tools.map((tool) => (
              <button
                key={tool.name}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('p', 3),
                  cm.flex({ align: 'start', justify: 'between', gap: 2 }),
                  'bg-surface-container-low rounded border transition-colors text-left',
                  tool.enabled
                    ? 'border-secondary/40 hover:border-secondary'
                    : 'border-outline-variant/15 hover:border-outline-variant/30',
                )}
                data-mol-id={`agent-builder-tool-${tool.name}`}
                onClick={() => toggleTool(tool.name)}
                type="button"
              >
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <div
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'font-mono text-on-surface truncate',
                    )}
                  >
                    {tool.name}
                  </div>
                  <div className={cm.cn(cm.textSize('xs'), 'text-tertiary leading-relaxed mt-0.5')}>
                    {tool.description}
                  </div>
                </div>
                <span
                  aria-hidden
                  className={cm.cn(
                    cm.w(4),
                    cm.h(4),
                    cm.roundedFull,
                    tool.enabled ? 'bg-secondary' : 'bg-surface-container-highest',
                  )}
                />
              </button>
            ))}
          </div>
        </aside>

        <section className="col-span-6">
          <label className="block">
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mb', 2),
                'font-mono uppercase tracking-wider text-tertiary block',
              )}
            >
              {t('agentBuilder.nameLabel', {}, { defaultValue: 'Agent name' })}
            </span>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 3),
                cm.sp('mb', 4),
                cm.textSize('sm'),
                'bg-surface-container-low text-on-surface font-mono rounded border border-outline-variant/15 focus:border-secondary focus:outline-none',
              )}
              data-mol-id="agent-builder-name"
              onChange={(e) => setName(e.target.value)}
              type="text"
              value={name}
            />
          </label>

          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mb', 3),
              'font-mono uppercase tracking-wider text-tertiary',
            )}
          >
            {t('agentBuilder.systemPrompt', {}, { defaultValue: 'System Prompt' })}
          </h2>
          <textarea
            className={cm.cn(
              cm.w('full'),
              cm.sp('p', 4),
              cm.textSize('sm'),
              'h-[280px] bg-surface-container-lowest text-on-surface font-mono leading-relaxed rounded border border-outline-variant/15 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary',
            )}
            data-mol-id="agent-builder-prompt"
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t(
              'agentBuilder.promptPlaceholder',
              {},
              { defaultValue: 'Define agent behavior...' },
            )}
            value={prompt}
          />
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 6),
              cm.sp('mb', 3),
              'font-mono uppercase tracking-wider text-tertiary',
            )}
          >
            {t('agentBuilder.testInput', {}, { defaultValue: 'Test Input' })}
          </h2>
          <textarea
            className={cm.cn(
              cm.w('full'),
              cm.sp('p', 4),
              cm.textSize('sm'),
              'h-[100px] bg-surface-container-low text-on-surface font-mono leading-relaxed rounded border border-outline-variant/15 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary',
            )}
            data-mol-id="agent-builder-test-input"
            onChange={(e) => setTestInput(e.target.value)}
            placeholder={t(
              'agentBuilder.testInputPlaceholder',
              {},
              { defaultValue: 'Send a test message...' },
            )}
            value={testInput}
          />
        </section>

        <aside className="col-span-3">
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mb', 3),
              'font-mono uppercase tracking-wider text-tertiary',
            )}
          >
            {t('agentBuilder.provider', {}, { defaultValue: 'Provider' })}
          </h2>
          <div className={cm.cn(cm.flex({ gap: 2 }), cm.sp('mb', 4), 'flex-wrap')}>
            {PROVIDERS.map((p) => (
              <button
                key={p}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  'font-mono uppercase tracking-wider rounded border transition-colors',
                  p === provider
                    ? 'bg-primary/15 text-primary border-primary'
                    : 'text-tertiary border-outline-variant/30 hover:border-outline-variant',
                )}
                data-mol-id={`agent-builder-provider-${p}`}
                onClick={() => {
                  setProvider(p)
                  setModel(MODELS[p][0])
                }}
                type="button"
              >
                {p}
              </button>
            ))}
          </div>

          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mb', 3),
              'font-mono uppercase tracking-wider text-tertiary',
            )}
          >
            {t('form.model', {}, { defaultValue: 'Model' })}
          </h2>
          <select
            className={cm.cn(
              cm.w('full'),
              cm.sp('p', 3),
              cm.textSize('sm'),
              'bg-surface-container-low text-on-surface font-mono rounded border border-outline-variant/15 focus:border-secondary focus:outline-none',
            )}
            data-mol-id="agent-builder-model"
            onChange={(e) => setModel(e.target.value)}
            value={model}
          >
            {MODELS[provider].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <div className={cm.sp('mt', 6)}>
            <ExecutionLogPanel entries={log} />
          </div>

          {agent?.id && (
            <Link
              className={cm.cn(
                cm.sp('mt', 4),
                cm.textSize('xs'),
                'block font-mono text-secondary hover:text-on-surface uppercase tracking-wider',
              )}
              data-mol-id="agent-builder-open-prompt-editor"
              to={`/agents/${agent.id}/prompt`}
            >
              {t('agentBuilder.openPromptEditor', {}, { defaultValue: 'Open prompt editor →' })}
            </Link>
          )}
        </aside>
      </div>
    </div>
  )
}

export default AgentBuilder
