// Pattern source: bespoke — Neuron prompt editing screen with version side-rail.
// Authed editor — large mono textarea, version history (client snapshots), publish via PUT /agents/:id.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageHeader } from '../components/PageHeader.js'

interface AgentRow {
  id: string
  name?: string
  system_prompt?: string
  provider?: string
  model?: string
  temperature?: number
  max_tokens?: number
}

interface PromptVersion {
  id: string
  label: string
  content: string
  ago: string
}

function makeVersionId(): string {
  return `v${Date.now().toString(36).slice(-6)}`
}

// Template variables: `{name}` or `{{name}}` placeholders found in the draft.
const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z_][\w.-]*)\s*\}\}|\{\s*([a-zA-Z_][\w.-]*)\s*\}/g

function extractVariables(text: string): string[] {
  const found = new Set<string>()
  for (const match of text.matchAll(VARIABLE_PATTERN)) {
    const name = match[1] ?? match[2]
    if (name) found.add(name)
  }
  return [...found]
}

export function PromptEditor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const [agent, setAgent] = useState<AgentRow | null>(null)
  const [prompt, setPrompt] = useState('')
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setError(null)
    try {
      const res = await http.get<AgentRow>(`/agents/${id}`)
      const row = (res.data ?? null) as AgentRow | null
      setAgent(row)
      const initial = row?.system_prompt ?? ''
      setPrompt(initial)
      setVersions([
        {
          id: 'current',
          label: t('status.published', {}, { defaultValue: 'Published' }),
          content: initial,
          ago: 'now',
        },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [http, id, t])

  useEffect(() => {
    void load()
  }, [load])

  async function publish(): Promise<void> {
    if (!agent?.id) return
    setError(null)
    setInfo(null)
    try {
      const res = await http.put<AgentRow>(`/agents/${agent.id}`, { system_prompt: prompt })
      setAgent(res.data as AgentRow)
      setVersions((prev) => [
        {
          id: makeVersionId(),
          label: t('promptEditor.snapshotLabel', {}, { defaultValue: 'Snapshot' }),
          content: prompt,
          ago: t('common.justNow', {}, { defaultValue: 'just now' }),
        },
        ...prev,
      ])
      setInfo(t('promptEditor.publishedToast', {}, { defaultValue: 'Prompt published.' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function loadVersion(version: PromptVersion): void {
    setPrompt(version.content)
    setInfo(t('promptEditor.versionLoaded', { id: version.id }, { defaultValue: 'Loaded {{id}}' }))
  }

  const variables = useMemo(() => extractVariables(prompt), [prompt])
  // Rough pre-flight estimate (~4 chars per token) for the inference meter.
  const estimatedTokens = Math.ceil(prompt.length / 4)
  const meterPct = Math.min(100, Math.round((estimatedTokens / 8192) * 100))
  const temperatureLabel =
    typeof agent?.temperature === 'number' ? agent.temperature.toFixed(2) : '0.70'
  const maxTokensLabel =
    typeof agent?.max_tokens === 'number' ? String(Math.round(agent.max_tokens)) : '1024'

  return (
    <div data-mol-id="page-prompt-editor">
      <PageHeader
        actions={
          <>
            <button
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('medium'),
                cm.textSize('xs'),
                'font-mono uppercase tracking-wider text-on-surface bg-surface-container-high rounded hover:bg-surface-container-highest transition-colors',
              )}
              data-mol-id="prompt-preview"
              onClick={() => setPreviewOpen(true)}
              type="button"
            >
              {t('promptEditor.preview', {}, { defaultValue: 'Preview' })}
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
              data-mol-id="prompt-publish"
              onClick={publish}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              {t('common.publish', {}, { defaultValue: 'Publish' })}
            </button>
          </>
        }
        subtitle={t(
          'promptEditor.subtitle',
          { agent: agent?.name ?? id ?? 'agent' },
          { defaultValue: 'Edit and version the system prompt for {{agent}}.' },
        )}
        title={t('promptEditor.title', {}, { defaultValue: 'Prompt Editor' })}
      />

      {(error || info) && (
        <div className={cm.cn(cm.sp('mb', 4))}>
          {error && (
            <p
              className={cm.cn(cm.textSize('sm'), 'text-error font-mono')}
              data-mol-id="prompt-error"
              role="alert"
            >
              {error}
            </p>
          )}
          {info && !error && (
            <p
              className={cm.cn(cm.textSize('sm'), 'text-success font-mono')}
              data-mol-id="prompt-info"
            >
              {info}
            </p>
          )}
        </div>
      )}

      <div className={cm.cn(cm.grid({ cols: 12, gap: 6 }))}>
        <aside className="col-span-3" data-mol-id="prompt-variables">
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mb', 3),
              'font-mono uppercase tracking-wider text-tertiary',
            )}
          >
            {t('promptEditor.variables', {}, { defaultValue: 'Variables' })}
          </h2>
          {variables.length === 0 ? (
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('p', 3),
                'text-tertiary leading-relaxed rounded border border-dashed border-outline-variant/30',
              )}
            >
              {t(
                'promptEditor.noVariables',
                {},
                {
                  defaultValue:
                    'No variables yet — add {name} placeholders to the prompt and they appear here.',
                },
              )}
            </p>
          ) : (
            <div className={cm.stack(2)}>
              {variables.map((name) => (
                <div
                  key={name}
                  className={cm.cn(
                    cm.sp('p', 2),
                    'bg-surface-container-lowest rounded border border-outline-variant/15',
                  )}
                  data-mol-id="prompt-variable-chip"
                >
                  <div className={cm.cn(cm.textSize('xs'), 'font-mono text-primary mb-1')}>
                    {`{${name}}`}
                  </div>
                  <div className={cm.cn(cm.textSize('xs'), 'text-tertiary truncate font-mono')}>
                    {t(
                      'promptEditor.variableFromPrompt',
                      {},
                      { defaultValue: 'filled from the run input' },
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        <section className="col-span-6">
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'bg-surface-container-highest rounded-t border border-b-0 border-outline-variant/15',
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-mono uppercase tracking-wider text-tertiary',
              )}
            >
              {t('promptEditor.systemPrompt', {}, { defaultValue: 'system_prompt.md' })}
            </span>
            <span className="font-mono text-[10px] text-tertiary uppercase tracking-widest">
              {t(
                'promptEditor.charCount',
                { count: prompt.length },
                { defaultValue: '{{count}} chars' },
              )}
            </span>
          </div>
          <textarea
            className={cm.cn(
              cm.w('full'),
              cm.sp('p', 4),
              cm.textSize('sm'),
              'h-[480px] bg-surface-container-lowest text-on-surface font-mono leading-relaxed rounded-b border border-outline-variant/15 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary',
            )}
            data-mol-id="prompt-textarea"
            onChange={(e) => setPrompt(e.target.value)}
            value={prompt}
          />
          {previewOpen && (
            <div
              className={cm.cn(
                cm.sp('p', 4),
                cm.sp('mt', 4),
                'bg-surface-container rounded border border-outline-variant/15',
              )}
              data-mol-id="prompt-preview-modal"
            >
              <div
                className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 2))}
              >
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-mono uppercase text-tertiary tracking-wider',
                  )}
                >
                  {t('promptEditor.previewTitle', {}, { defaultValue: 'Dry-run preview' })}
                </span>
                <button
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-mono uppercase tracking-wider text-tertiary hover:text-on-surface',
                  )}
                  data-mol-id="prompt-preview-close"
                  onClick={() => setPreviewOpen(false)}
                  type="button"
                >
                  {t('common.close', {}, { defaultValue: 'Close' })}
                </button>
              </div>
              <pre
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-mono text-on-surface whitespace-pre-wrap',
                )}
              >
                {prompt.slice(0, 2000)}
              </pre>
            </div>
          )}
        </section>
        <aside className="col-span-3">
          <div data-mol-id="prompt-inference">
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mb', 3),
                'font-mono uppercase tracking-wider text-tertiary',
              )}
            >
              {t('promptEditor.inferenceSetup', {}, { defaultValue: 'Inference Setup' })}
            </h2>
            <div
              className={cm.cn(
                cm.sp('p', 4),
                cm.sp('mb', 6),
                'bg-surface-container-low rounded border border-outline-variant/15',
              )}
            >
              <div className={cm.stack(3)}>
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t('agentBuilder.provider', {}, { defaultValue: 'Provider' })}
                  </span>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      'font-mono uppercase tracking-wider rounded border border-primary/40 text-primary bg-surface-container',
                    )}
                  >
                    {agent?.provider ?? 'anthropic'}
                  </span>
                </div>
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t('form.model', {}, { defaultValue: 'Model' })}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface truncate')}>
                    {agent?.model ?? '—'}
                  </span>
                </div>
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t('agentBuilder.temperatureLabel', {}, { defaultValue: 'Temperature' })}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface')}>
                    {temperatureLabel}
                  </span>
                </div>
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t('agentBuilder.maxTokensLabel', {}, { defaultValue: 'Max Tokens' })}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface')}>
                    {maxTokensLabel}
                  </span>
                </div>
              </div>
              <div className={cm.sp('mt', 4)}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mb', 2),
                  )}
                >
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'promptEditor.estimatedTokens',
                      {},
                      { defaultValue: 'Estimated tokens (est.)' },
                    )}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'font-mono text-secondary tabular-nums',
                    )}
                  >
                    {estimatedTokens.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full"
                    style={{ width: `${meterPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mb', 3),
              'font-mono uppercase tracking-wider text-tertiary',
            )}
          >
            {t('promptEditor.versions', {}, { defaultValue: 'Versions' })}
          </h2>
          <div className={cm.cn(cm.stack(2))}>
            {versions.map((version, idx) => (
              <button
                key={version.id}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('p', 3),
                  'rounded border text-left transition-colors',
                  idx === 0
                    ? 'bg-primary/10 border-primary/40'
                    : 'bg-surface-container-low border-outline-variant/15 hover:border-outline-variant/30',
                )}
                data-mol-id="prompt-version"
                onClick={() => loadVersion(version)}
                type="button"
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mb', 1),
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'font-mono text-on-surface',
                    )}
                  >
                    {version.id}
                  </span>
                  {idx === 0 && (
                    <span className="font-mono text-[10px] text-primary uppercase tracking-widest">
                      {t('status.live', {}, { defaultValue: 'Live' })}
                    </span>
                  )}
                </div>
                <p className={cm.cn(cm.textSize('xs'), 'text-tertiary line-clamp-2')}>
                  {version.label}
                </p>
                <p className={'font-mono text-[10px] text-tertiary mt-2 uppercase tracking-widest'}>
                  {version.ago}
                </p>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default PromptEditor
