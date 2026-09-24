// Pattern source: ai-chatbot-builder/components/KnowledgeBaseSourceCard.tsx.
// Authed knowledge base management — vector index cards with chunk counts.
import { useCallback, useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { PromptDialog } from '@molecule/app-ui-react'

import { PageHeader } from '../components/PageHeader.js'

interface KnowledgeBaseRow {
  id: string
  name: string
  description?: string
  embedding_model?: string
  document_count?: number
  ingested_at?: string | null
  updated_at?: string
}

function formatRelative(iso?: string | null): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`
  return `${Math.floor(ms / 86_400_000)}d ago`
}

export function KnowledgeBases() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [rows, setRows] = useState<KnowledgeBaseRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // New-index flow lives in a shared PromptDialog (replaces the old
  // window.prompt, which is broken headless). The suggested name is seeded
  // ONCE at open time — PromptDialog re-seeds from `initialValue` whenever it
  // changes, so computing it inline would clobber the user's typing on every
  // keystroke re-render.
  const [createOpen, setCreateOpen] = useState(false)
  const [suggestedName, setSuggestedName] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get<KnowledgeBaseRow[]>('/knowledge-bases')
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

  function openCreate(): void {
    setSuggestedName(`kb_${Date.now().toString(36)}`)
    setCreateOpen(true)
  }

  async function newIndex(rawName: string): Promise<void> {
    // Empty input behaves like the old prompt's cancel (window.prompt
    // returned "" → bail without POSTing).
    if (!rawName) return
    setError(null)
    try {
      const res = await http.post<KnowledgeBaseRow>('/knowledge-bases', {
        name: rawName,
        description: t('knowledgeBases.defaultDescription', {}, { defaultValue: 'Vector index' }),
      })
      track({
        name: 'knowledge_base.created',
        properties: { kbId: res.data?.id, name: rawName },
      })
      await refresh()
    } catch (err) {
      // The page-level banner keeps showing POST failures exactly as before;
      // resolving (not rejecting) closes the dialog like an accepted prompt.
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function resync(id: string): Promise<void> {
    setError(null)
    try {
      await http.put(`/knowledge-bases/${id}`, {})
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div data-mol-id="page-knowledge-bases">
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
            data-mol-id="kb-new"
            onClick={openCreate}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            {t('knowledgeBases.newIndex', {}, { defaultValue: 'New Index' })}
          </button>
        }
        subtitle={t(
          'knowledgeBases.subtitle',
          {},
          {
            defaultValue: 'Vector indexes that ground your agents. Re-sync to refresh embeddings.',
          },
        )}
        title={t('knowledgeBases.title', {}, { defaultValue: 'Knowledge Bases' })}
      />

      {error && (
        <p
          className={cm.cn(cm.sp('mb', 4), cm.textSize('sm'), 'text-error font-mono')}
          data-mol-id="kb-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className={'font-mono text-sm text-tertiary'} data-mol-id="kb-loading">
          {t('knowledgeBases.loading', {}, { defaultValue: 'Loading knowledge bases…' })}
        </p>
      ) : rows.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('py', 12),
            cm.textCenter,
            'rounded border border-dashed border-outline-variant/30 font-mono text-sm text-tertiary',
          )}
          data-mol-id="kb-empty"
        >
          {t(
            'knowledgeBases.empty',
            {},
            { defaultValue: 'No knowledge bases yet — create one above.' },
          )}
        </div>
      ) : (
        <div className={cm.cn(cm.grid({ cols: 2, gap: 4 }))}>
          {rows.map((kb) => (
            <div
              key={kb.id}
              className={cm.cn(
                cm.sp('p', 5),
                'bg-surface-container-low rounded border border-outline-variant/15 hover:border-outline-variant/30 transition-colors',
              )}
              data-mol-id="kb-card"
            >
              <div
                className={cm.cn(cm.flex({ align: 'start', justify: 'between' }), cm.sp('mb', 3))}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                  <div
                    className={cm.cn(
                      cm.w(10),
                      cm.h(10),
                      cm.flex({ align: 'center', justify: 'center' }),
                      'rounded bg-surface-container-highest text-primary',
                    )}
                  >
                    <span className="material-symbols-outlined">storage</span>
                  </div>
                  <div>
                    <h3
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.textSize('sm'),
                        'font-mono text-on-surface',
                      )}
                    >
                      {kb.name}
                    </h3>
                    <span
                      className={
                        'font-mono text-[10px] text-tertiary uppercase tracking-widest mt-1 block'
                      }
                    >
                      {kb.embedding_model ?? ''}
                    </span>
                  </div>
                </div>
              </div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mb', 4),
                  'text-tertiary leading-relaxed',
                )}
              >
                {kb.description ?? ''}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('pt', 3),
                  'border-t border-surface/5',
                )}
              >
                <div>
                  <div
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'font-mono text-on-surface tabular-nums',
                    )}
                  >
                    {(kb.document_count ?? 0).toLocaleString()}
                  </div>
                  <div className="font-mono text-[10px] text-tertiary uppercase tracking-widest">
                    {t('knowledgeBases.docs', {}, { defaultValue: 'Docs' })}
                  </div>
                </div>
                <button
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    'font-mono uppercase tracking-wider rounded border border-secondary/40 text-secondary hover:bg-secondary/10 transition-colors',
                  )}
                  data-mol-id="kb-resync"
                  onClick={() => resync(kb.id)}
                  type="button"
                >
                  {t(
                    'knowledgeBases.resync',
                    { time: formatRelative(kb.ingested_at ?? kb.updated_at) },
                    { defaultValue: 'Re-sync · {{time}}' },
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PromptDialog
        confirmLabel={t('knowledgeBases.newIndex', {}, { defaultValue: 'New Index' })}
        confirmMolId="kb-create-confirm"
        initialValue={suggestedName}
        inputMolId="kb-name-input"
        onClose={() => setCreateOpen(false)}
        onSubmit={newIndex}
        open={createOpen}
        placeholder={t(
          'knowledgeBases.namePrompt',
          {},
          { defaultValue: 'New knowledge base name' },
        )}
        title={t('knowledgeBases.namePrompt', {}, { defaultValue: 'New knowledge base name' })}
      />
    </div>
  )
}

export default KnowledgeBases
