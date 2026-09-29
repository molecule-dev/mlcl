// Pattern source: ai-chatbot-builder/components/IntegrationCard.tsx.
// Authed tool library — register new tools, list installed ones, uninstall via DELETE /tools/:id.
import { useCallback, useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { PromptDialog } from '@molecule/app-ui-react'

import { PageHeader } from '../components/PageHeader.js'

interface ToolRow {
  id: string
  name: string
  description?: string
  type?: string
}

const TYPE_TONE: Record<string, string> = {
  builtin: 'text-secondary border-secondary/40',
  http: 'text-primary border-primary/40',
  function: 'text-success border-emerald-500/40',
  mcp: 'text-tertiary border-outline-variant/30',
}

export function ToolLibrary() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [rows, setRows] = useState<ToolRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // Register flow lives in a shared PromptDialog (replaces the old
  // window.prompt, which is broken headless). The suggested name is seeded
  // ONCE at open time — PromptDialog re-seeds from `initialValue` whenever it
  // changes, so computing it inline would clobber the user's typing on every
  // keystroke re-render.
  const [registerOpen, setRegisterOpen] = useState(false)
  const [suggestedName, setSuggestedName] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get<ToolRow[]>('/tools')
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void refresh()
  }, [refresh])

  function openRegister(): void {
    setSuggestedName(`tool_${Date.now().toString(36)}`)
    setRegisterOpen(true)
  }

  async function registerTool(rawName: string): Promise<void> {
    // Empty input behaves like the old prompt's cancel (window.prompt
    // returned "" → bail without POSTing).
    if (!rawName) return
    setError(null)
    try {
      const res = await http.post<ToolRow>('/tools', {
        name: rawName,
        description: t('toolLibrary.defaultDescription', {}, { defaultValue: 'Custom tool' }),
        type: 'http',
        schema_json: {},
        handler_config_json: {},
      })
      track({ name: 'tool.registered', properties: { toolId: res.data?.id, name: rawName } })
      await refresh()
    } catch (err) {
      // The page-level banner keeps showing POST failures exactly as before;
      // resolving (not rejecting) closes the dialog like an accepted prompt.
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function uninstall(id: string): Promise<void> {
    setError(null)
    try {
      await http.delete(`/tools/${id}`)
      track({ name: 'tool.uninstalled', properties: { toolId: id } })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div data-mol-id="page-tool-library">
      <PageHeader
        actions={
          <button
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              cm.flex({ align: 'center', gap: 2 }),
              'btn-primary-gradient rounded text-on-primary-fixed font-mono uppercase tracking-wider',
            )}
            data-mol-id="tool-library-register"
            onClick={openRegister}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            {t('toolLibrary.registerTool', {}, { defaultValue: 'Register Tool' })}
          </button>
        }
        subtitle={t(
          'toolLibrary.subtitle',
          {},
          {
            defaultValue:
              'Tools the orchestrator can call. Register once; reference from any agent.',
          },
        )}
        title={t('toolLibrary.title', {}, { defaultValue: 'Tool Library' })}
      />

      {error && (
        <p
          className={cm.cn(cm.sp('mb', 4), cm.textSize('sm'), 'text-error font-mono')}
          data-mol-id="tool-library-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className={'font-mono text-sm text-tertiary'} data-mol-id="tool-library-loading">
          {t('toolLibrary.loading', {}, { defaultValue: 'Loading tools…' })}
        </p>
      ) : rows.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('py', 12),
            cm.textCenter,
            'rounded border border-dashed border-outline-variant/30 font-mono text-sm text-tertiary',
          )}
          data-mol-id="tool-library-empty"
        >
          {t(
            'toolLibrary.empty',
            {},
            { defaultValue: 'No tools registered — register your first one above.' },
          )}
        </div>
      ) : (
        <div className={cm.cn(cm.grid({ cols: 3, gap: 4 }))}>
          {rows.map((tool) => {
            const tone = TYPE_TONE[tool.type ?? 'http'] ?? TYPE_TONE.http
            return (
              <div
                key={tool.id}
                className={cm.cn(
                  cm.sp('p', 5),
                  'bg-surface-container-low rounded border border-outline-variant/15 hover:border-outline-variant/30 transition-colors group',
                )}
                data-mol-id="tool-library-card"
              >
                <div
                  className={cm.cn(cm.flex({ align: 'start', justify: 'between' }), cm.sp('mb', 3))}
                >
                  <div
                    className={cm.cn(
                      cm.w(10),
                      cm.h(10),
                      cm.flex({ align: 'center', justify: 'center' }),
                      'rounded bg-surface-container-highest text-primary',
                    )}
                  >
                    <span className="material-symbols-outlined">build</span>
                  </div>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      'font-mono uppercase tracking-wider rounded border bg-surface-container',
                      tone,
                    )}
                  >
                    {tool.type ?? 'http'}
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    cm.sp('mb', 1),
                    'font-mono text-on-surface',
                  )}
                >
                  {tool.name}
                </h3>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mb', 4),
                    'text-tertiary leading-relaxed line-clamp-2',
                  )}
                >
                  {tool.description ?? ''}
                </p>
                <button
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('xs'),
                    'font-mono uppercase tracking-wider rounded transition-colors bg-surface-container-highest text-tertiary hover:text-on-surface',
                  )}
                  data-mol-id="tool-library-uninstall"
                  onClick={() => uninstall(tool.id)}
                  type="button"
                >
                  {t('toolLibrary.uninstall', {}, { defaultValue: 'Uninstall' })}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <PromptDialog
        confirmLabel={t('toolLibrary.registerTool', {}, { defaultValue: 'Register Tool' })}
        confirmMolId="tool-library-register-confirm"
        initialValue={suggestedName}
        inputMolId="tool-library-name-input"
        onClose={() => setRegisterOpen(false)}
        onSubmit={registerTool}
        open={registerOpen}
        placeholder={t('toolLibrary.namePrompt', {}, { defaultValue: 'New tool name' })}
        title={t('toolLibrary.namePrompt', {}, { defaultValue: 'New tool name' })}
      />
    </div>
  )
}

export default ToolLibrary
