import { type FormEvent, useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AppShell } from '../components/AppShell.js'
import KnowledgeBaseDataHealthWidget from '../components/KnowledgeBaseDataHealthWidget.js'
import KnowledgeBaseModelInsightPanel from '../components/KnowledgeBaseModelInsightPanel.js'
import KnowledgeBaseNeuralTopologyVisual from '../components/KnowledgeBaseNeuralTopologyVisual.js'
import KnowledgeBasePageHeader from '../components/KnowledgeBasePageHeader.js'
import KnowledgeBaseSourcesHeader from '../components/KnowledgeBaseSourcesHeader.js'
import KnowledgeBaseStatsBar from '../components/KnowledgeBaseStatsBar.js'
import KnowledgeSourceCard from '../components/KnowledgeSourceCard.js'

interface KnowledgeDocument {
  id: string
  bot_id?: string
  name?: string
  title?: string
  pages?: number
  page_count?: number
  status?: string
  source_url?: string | null
}

interface BotSummary {
  id: string
  name?: string
}

// http.get/post wrap the API body as `{ data, status, ... }` (HttpResponse).
// Pages that want the raw entity list have to unwrap once for the wrapper
// and again if the API itself returns `{ data: [...] }`. Keep this helper
// small so individual pages don't reinvent the cast.
function asArray<T>(res: unknown): T[] {
  const body = (res as { data?: unknown } | null)?.data ?? res
  if (Array.isArray(body)) return body as T[]
  if (body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)) {
    return (body as { data: unknown[] }).data as T[]
  }
  return []
}

function asObject<T>(res: unknown): T | null {
  const body = (res as { data?: unknown } | null)?.data ?? res
  if (body && typeof body === 'object' && !Array.isArray(body)) return body as T
  return null
}

function KnowledgeBase() {
  const { t } = useTranslation()
  const http = useHttpClient()
  const cm = getClassMap()
  const [bots, setBots] = useState<BotSummary[]>([])
  const [selectedBotId, setSelectedBotId] = useState<string>('')
  const [docs, setDocs] = useState<KnowledgeDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [docsLoading, setDocsLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setFetchError(null)
    http
      .get('/api/bots')
      .then((res) => {
        if (!active) return
        const list = asArray<BotSummary>(res)
        setBots(list)
        if (list.length > 0) setSelectedBotId(list[0].id)
      })
      .catch((err) => {
        if (active)
          setFetchError(
            err instanceof Error
              ? err.message
              : t('knowledgeBase.botsLoadError', {}, { defaultValue: 'Failed to load your bots.' }),
          )
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [http, t])

  useEffect(() => {
    if (!selectedBotId) {
      setDocs([])
      return
    }
    let active = true
    setDocsLoading(true)
    setFetchError(null)
    http
      .get(`/api/training/documents/${selectedBotId}`)
      .then((res) => active && setDocs(asArray<KnowledgeDocument>(res)))
      .catch(
        (err) =>
          active &&
          setFetchError(
            err instanceof Error
              ? err.message
              : t(
                  'knowledgeBase.loadError',
                  {},
                  { defaultValue: 'Failed to load knowledge documents.' },
                ),
          ),
      )
      .finally(() => active && setDocsLoading(false))
    return () => {
      active = false
    }
  }, [selectedBotId, http, t])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!selectedBotId || !title.trim() || !content.trim() || submitting) return
    setSubmitting(true)
    setAddError(null)
    try {
      const res = await http.post('/api/training/documents', {
        bot_id: selectedBotId,
        title: title.trim(),
        content: content.trim(),
        source_url: sourceUrl.trim() || null,
      })
      const created = asObject<KnowledgeDocument>(res)
      if (created) {
        setDocs((xs) => [created, ...xs])
        void track({
          name: 'knowledge.document_added',
          properties: { document_id: created.id, bot_id: selectedBotId },
        })
      }
      setTitle('')
      setContent('')
      setSourceUrl('')
      setAdding(false)
    } catch (err) {
      setAddError(
        err instanceof Error
          ? err.message
          : t('knowledgeBase.addError', {}, { defaultValue: 'Could not add document.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const selectedBotName = useMemo(
    () => bots.find((b) => b.id === selectedBotId)?.name,
    [bots, selectedBotId],
  )

  return (
    <AppShell className="bg-surface text-on-surface antialiased">
      <div className={cm.cn(cm.sp('p', 8), 'max-w-7xl', cm.mxAuto, cm.w('full'), cm.stack(8))}>
        <KnowledgeBasePageHeader onAddSource={() => setAdding(true)} />
        <KnowledgeBaseStatsBar />
        {bots.length > 1 && (
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('p', 4),
              'gap-3 bg-surface-container-low rounded-2xl',
            )}
          >
            <label
              htmlFor="kb-bot-select"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}
            >
              {t('knowledgeBase.botPickerLabel', {}, { defaultValue: 'Bot' })}
            </label>
            <select
              id="kb-bot-select"
              value={selectedBotId}
              onChange={(e) => setSelectedBotId(e.target.value)}
              className={cm.cn(
                cm.textSize('sm'),
                'bg-surface-container-high border-none rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary/40',
              )}
            >
              {bots.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || b.id}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'lg:grid-cols-12')}>
          <div className={cm.cn(cm.stack(6), 'lg:col-span-8')}>
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <KnowledgeBaseSourcesHeader />
              {selectedBotId && (
                <button
                  type="button"
                  onClick={() => setAdding((v) => !v)}
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'btn-gradient text-on-primary px-4 py-2 rounded-lg',
                  )}
                >
                  {adding
                    ? t('common.cancel', {}, { defaultValue: 'Cancel' })
                    : t('knowledgeBase.addDocument', {}, { defaultValue: 'Add document' })}
                </button>
              )}
            </div>
            {adding && selectedBotId && (
              <form
                onSubmit={handleAdd}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.stack(4),
                  'bg-surface-container-lowest rounded-2xl ambient-shadow',
                )}
                aria-label={t(
                  'knowledgeBase.addFormLabel',
                  {},
                  { defaultValue: 'Add knowledge document' },
                )}
              >
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {selectedBotName
                    ? t(
                        'knowledgeBase.addingFor',
                        { name: selectedBotName },
                        { defaultValue: 'Adding to: {{name}}' },
                      )
                    : null}
                </p>
                <input
                  required
                  aria-label={t('form.title', {}, { defaultValue: 'Title' })}
                  placeholder={t(
                    'knowledgeBase.titlePlaceholder',
                    {},
                    { defaultValue: 'Title (e.g. "Refund policy")' },
                  )}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={500}
                  className={cm.cn(
                    cm.w('full'),
                    'bg-surface-container-high border-none rounded-xl px-4 py-3',
                  )}
                />
                <input
                  aria-label={t(
                    'knowledgeBase.sourceUrlLabel',
                    {},
                    { defaultValue: 'Source URL (optional)' },
                  )}
                  placeholder={t(
                    'knowledgeBase.sourceUrlPlaceholder',
                    {},
                    { defaultValue: 'https://… (optional)' },
                  )}
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  type="url"
                  className={cm.cn(
                    cm.w('full'),
                    'bg-surface-container-high border-none rounded-xl px-4 py-3',
                  )}
                />
                <textarea
                  required
                  aria-label={t('knowledgeBase.contentLabel', {}, { defaultValue: 'Content' })}
                  placeholder={t(
                    'knowledgeBase.contentPlaceholder',
                    {},
                    {
                      defaultValue: 'Paste reference text the bot should learn (FAQ, doc, policy)…',
                    },
                  )}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  maxLength={100000}
                  className={cm.cn(
                    cm.w('full'),
                    'bg-surface-container-high border-none rounded-xl px-4 py-3 font-mono text-sm',
                  )}
                />
                {addError && (
                  <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
                    {addError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'btn-gradient text-on-primary px-5 py-3 rounded-xl disabled:opacity-50',
                  )}
                >
                  {submitting
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('knowledgeBase.saveDocument', {}, { defaultValue: 'Save document' })}
                </button>
              </form>
            )}
            {(loading || docsLoading) &&
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className={cm.cn(cm.h(24), 'rounded-2xl bg-surface-container-low animate-pulse')}
                />
              ))}
            {fetchError && (
              <p role="alert" className={cm.cn(cm.textSize('sm'), cm.sp('px', 2), 'text-error')}>
                {fetchError}
              </p>
            )}
            {!loading && !docsLoading && bots.length === 0 && (
              <p className={cm.cn(cm.textSize('sm'), cm.sp('px', 2), 'text-on-surface-variant')}>
                {t(
                  'knowledgeBase.noBots',
                  {},
                  { defaultValue: 'Create a bot first to start adding knowledge.' },
                )}
              </p>
            )}
            {!loading && !docsLoading && !fetchError && bots.length > 0 && docs.length === 0 && (
              <p className={cm.cn(cm.textSize('sm'), cm.sp('px', 2), 'text-on-surface-variant')}>
                {t(
                  'knowledgeBase.emptyState',
                  {},
                  { defaultValue: 'No knowledge documents yet for this bot.' },
                )}
              </p>
            )}
            {docs.map((doc) => (
              <KnowledgeSourceCard
                key={doc.id}
                doc={doc}
                onDelete={(id) => setDocs((ds) => ds.filter((d) => d.id !== id))}
              />
            ))}
          </div>
          <div className={cm.cn(cm.stack(6), 'lg:col-span-4')}>
            <KnowledgeBaseDataHealthWidget />
            <KnowledgeBaseModelInsightPanel />
            <KnowledgeBaseNeuralTopologyVisual />
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default KnowledgeBase
export { KnowledgeBase, KnowledgeBase as KnowledgeBasePage }
