import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { del, get, put } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ConfidenceMeter } from '../components/ConfidenceMeter.js'
import { RapportLayout } from '../components/RapportLayout.js'
import { StatusBadge } from '../components/StatusBadge.js'

interface ArticleRow {
  id: string
  title: string
  content: string
  body_md: string
  category: string
  tags_json: string[] | null
  status: 'draft' | 'published' | 'archived'
  embedding_status: string
  version: number
  created_at: string
  updated_at: string | null
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const day = Math.floor(hr / 24)
  return `${day} day${day === 1 ? '' : 's'} ago`
}

function KnowledgeArticleDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [article, setArticle] = useState<ArticleRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editStatus, setEditStatus] = useState<'draft' | 'published' | 'archived'>('published')
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [related, setRelated] = useState<ArticleRow[]>([])

  async function loadArticle() {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const response = await get<ArticleRow>(`/api/knowledge/${id}`)
      const row = response.data
      setArticle(row ?? null)
      if (row) {
        setEditTitle(row.title)
        setEditContent(row.content || row.body_md || '')
        setEditStatus(row.status)
        void loadRelated(row.category, row.id)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('knowledgeArticleDetail.loadError', {}, { defaultValue: 'Failed to load article' }),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadArticle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Related articles: same category, excluding the current one. A failed
  // fetch just leaves the section empty — it is secondary content and must
  // never surface the page-level error state.
  async function loadRelated(category: string, excludeId: string) {
    try {
      const response = await get<ArticleRow[]>('/api/knowledge')
      const rows = Array.isArray(response.data) ? response.data : []
      setRelated(rows.filter((r) => r.id !== excludeId && r.category === category).slice(0, 3))
    } catch (_error) {
      // Intentional noop: a failed fetch just leaves the section empty.
      setRelated([])
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    setSaving(true)
    setError(null)
    try {
      await put(`/api/knowledge/${id}`, {
        title: editTitle,
        content: editContent,
        body_md: editContent,
        status: editStatus,
      })
      track({
        name: 'knowledge.article_updated',
        properties: { article_id: id, status: editStatus },
      })
      setActionMessage(
        t('knowledgeArticleDetail.savedConfirm', {}, { defaultValue: 'Article saved' }),
      )
      setEditing(false)
      await loadArticle()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('knowledgeArticleDetail.saveError', {}, { defaultValue: 'Failed to save article' }),
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    setSaving(true)
    setError(null)
    try {
      await del(`/api/knowledge/${id}`)
      track({ name: 'knowledge.article_deleted', properties: { article_id: id } })
      navigate('/knowledge')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'knowledgeArticleDetail.deleteError',
              {},
              { defaultValue: 'Failed to delete article' },
            ),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <RapportLayout>
      <div
        data-mol-id="page-knowledge-detail"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 2 }),
          cm.textSize('xs'),
          'text-on-surface-variant',
        )}
      >
        <Link
          data-mol-id="knowledge-breadcrumb"
          to="/knowledge"
          className="hover:text-on-surface transition-colors"
        >
          {t('knowledgeArticleDetail.crumbKb', {}, { defaultValue: 'Knowledge' })}
        </Link>
        <span className="material-symbols-outlined text-base">chevron_right</span>
        {article && <span className="text-on-surface">{article.category}</span>}
      </div>

      {loading ? (
        <div
          data-mol-id="knowledge-detail-loading"
          className={cm.cn(cm.textCenter, cm.sp('p', 8), 'text-on-surface-variant')}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      ) : error ? (
        <div
          data-mol-id="knowledge-detail-error"
          role="alert"
          className={cm.cn(cm.textCenter, cm.sp('p', 8), 'text-error')}
        >
          {error}
        </div>
      ) : !article ? (
        <div
          data-mol-id="knowledge-detail-empty"
          className={cm.cn(cm.textCenter, cm.sp('p', 8), 'text-on-surface-variant')}
        >
          {t('knowledgeArticleDetail.notFound', {}, { defaultValue: 'Article not found.' })}
        </div>
      ) : (
        <div className={cm.cn(cm.grid({ cols: 1, gap: 8 }), 'lg:grid-cols-12')}>
          <article
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 6 }),
              cm.sp('p', 8),
              'lg:col-span-8 rounded-2xl bg-surface-container-lowest shadow-sm',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'rounded-full bg-primary/10 text-primary px-3 py-1 text-[10px] tracking-widest uppercase',
                  )}
                >
                  {article.category}
                </span>
                <StatusBadge
                  variant={article.status === 'published' ? 'resolved' : 'draft'}
                  label={article.status}
                />
              </div>
              <div className={cm.flex({ gap: 2 })}>
                <button
                  data-mol-id="knowledge-detail-edit"
                  type="button"
                  onClick={() => setEditing((e) => !e)}
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('xs'),
                    cm.touchTargetCompact,
                    'rounded-full bg-surface-container-low text-on-surface px-3 py-1.5',
                  )}
                >
                  {editing
                    ? t('common.cancel', {}, { defaultValue: 'Cancel' })
                    : t('common.edit', {}, { defaultValue: 'Edit' })}
                </button>
                <button
                  data-mol-id="knowledge-detail-delete"
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('xs'),
                    cm.touchTargetCompact,
                    'rounded-full bg-error/10 text-error px-3 py-1.5',
                  )}
                >
                  {t('common.delete', {}, { defaultValue: 'Delete' })}
                </button>
              </div>
            </div>

            {actionMessage && (
              <div
                data-mol-id="knowledge-detail-action"
                role="status"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('p', 3),
                  'rounded-lg bg-primary/10 text-primary text-sm',
                )}
              >
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>{actionMessage}</span>
              </div>
            )}

            {editing ? (
              <form
                data-mol-id="knowledge-detail-edit-form"
                onSubmit={handleSave}
                className={cm.flex({ direction: 'col', gap: 4 })}
              >
                <input
                  data-mol-id="knowledge-detail-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('xl'),
                    'rounded-xl bg-surface-container-low border-transparent focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none',
                  )}
                />
                <textarea
                  data-mol-id="knowledge-detail-content"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={12}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'rounded-xl bg-surface-container-low border-transparent focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none resize-none',
                  )}
                />
                <select
                  data-mol-id="knowledge-detail-status"
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(e.target.value as 'draft' | 'published' | 'archived')
                  }
                  className={cm.cn(
                    cm.maxW('[200px]'),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'rounded-xl bg-surface-container-low',
                  )}
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="archived">archived</option>
                </select>
                <div>
                  <button
                    data-mol-id="knowledge-detail-save"
                    type="submit"
                    disabled={saving}
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      cm.touchTargetCompact,
                      'rounded-full bg-primary text-on-primary px-5 py-2 disabled:opacity-50',
                    )}
                  >
                    {saving
                      ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                      : t('common.save', {}, { defaultValue: 'Save' })}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h1
                  data-mol-id="knowledge-detail-title-display"
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-3xl md:text-4xl tracking-tight text-on-background leading-tight',
                  )}
                >
                  {article.title}
                </h1>
                <ConfidenceMeter
                  value={article.embedding_status === 'ready' ? 0.9 : 0.5}
                  label={t(
                    'knowledgeArticleDetail.confidenceLabel',
                    {},
                    { defaultValue: 'Indexing' },
                  )}
                />
                <div
                  data-mol-id="knowledge-detail-body"
                  className={cm.cn(
                    cm.textSize('base'),
                    'text-on-surface leading-relaxed whitespace-pre-wrap',
                  )}
                >
                  {article.content ||
                    article.body_md ||
                    t('knowledgeArticleDetail.noBody', {}, { defaultValue: 'No content yet.' })}
                </div>
              </>
            )}

            {confirmingDelete && (
              <div
                data-mol-id="knowledge-delete-confirm"
                role="dialog"
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 3 }),
                  cm.sp('p', 4),
                  'rounded-xl bg-error/10 border border-error/30',
                )}
              >
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                  {t(
                    'knowledgeArticleDetail.deleteConfirm',
                    {},
                    { defaultValue: 'Delete this article? This cannot be undone.' },
                  )}
                </p>
                <div className={cm.flex({ gap: 2 })}>
                  <button
                    data-mol-id="knowledge-delete-confirm-yes"
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      cm.touchTargetCompact,
                      'rounded-full bg-error text-on-error px-4 py-2',
                    )}
                  >
                    {t('common.delete', {}, { defaultValue: 'Delete' })}
                  </button>
                  <button
                    data-mol-id="knowledge-delete-confirm-no"
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      cm.touchTargetCompact,
                      'rounded-full bg-surface-container-low text-on-surface px-4 py-2',
                    )}
                  >
                    {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                  </button>
                </div>
              </div>
            )}
          </article>

          <aside className={cm.cn(cm.flex({ direction: 'col', gap: 6 }), 'lg:col-span-4')}>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 3 }),
                cm.sp('p', 5),
                'rounded-2xl bg-surface-container-lowest shadow-sm',
              )}
            >
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'tracking-widest uppercase text-on-surface-variant',
                )}
              >
                {t('knowledgeArticleDetail.metadata', {}, { defaultValue: 'Metadata' })}
              </span>
              <dl className={cm.cn(cm.flex({ direction: 'col', gap: 2 }), cm.textSize('sm'))}>
                <div className={cm.flex({ justify: 'between' })}>
                  <dt className="text-on-surface-variant">
                    {t('knowledgeArticleDetail.versionLabel', {}, { defaultValue: 'Version' })}
                  </dt>
                  <dd className="font-semibold text-on-surface tabular-nums">v{article.version}</dd>
                </div>
                <div className={cm.flex({ justify: 'between' })}>
                  <dt className="text-on-surface-variant">
                    {t('knowledgeArticleDetail.indexLabel', {}, { defaultValue: 'Indexing' })}
                  </dt>
                  <dd className="font-semibold text-on-surface">{article.embedding_status}</dd>
                </div>
                <div className={cm.flex({ justify: 'between' })}>
                  <dt className="text-on-surface-variant">
                    {t('knowledgeArticleDetail.updatedLabel', {}, { defaultValue: 'Updated' })}
                  </dt>
                  <dd className="font-semibold text-on-surface text-xs">
                    {relativeTime(article.updated_at ?? article.created_at)}
                  </dd>
                </div>
              </dl>
            </div>

            {(article.tags_json ?? []).length > 0 && (
              <div
                data-mol-id="knowledge-detail-tags"
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 3 }),
                  cm.sp('p', 5),
                  'rounded-2xl bg-surface-container-lowest shadow-sm',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 2 }),
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'tracking-widest uppercase text-on-surface',
                  )}
                >
                  <span className="material-symbols-outlined text-base text-primary">label</span>
                  {t('knowledgeArticleDetail.tagsTitle', {}, { defaultValue: 'Tags' })}
                </span>
                <div className={cm.cn(cm.flex({ gap: 2 }), 'flex-wrap')}>
                  {(article.tags_json ?? []).map((tag) => (
                    <span
                      key={tag}
                      className={cm.cn(
                        cm.textSize('xs'),
                        'rounded-md bg-surface-container px-2.5 py-1 text-on-surface-variant',
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div
              data-mol-id="knowledge-detail-related"
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 3 }),
                cm.sp('p', 5),
                'rounded-2xl bg-surface-container-lowest shadow-sm',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'tracking-widest uppercase text-on-surface',
                )}
              >
                <span className="material-symbols-outlined text-base text-primary">
                  library_books
                </span>
                {t('knowledgeArticleDetail.relatedTitle', {}, { defaultValue: 'Related' })}
              </span>
              {related.length === 0 ? (
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'knowledgeArticleDetail.relatedEmpty',
                    {},
                    {
                      defaultValue:
                        'No other articles in this category yet — publish one to link it here.',
                    },
                  )}
                </span>
              ) : (
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
                  {related.map((r) => (
                    <Link
                      key={r.id}
                      data-mol-id={`knowledge-detail-related-${r.id}`}
                      to={`/knowledge/${r.id}`}
                      className={cm.cn(
                        cm.flex({ direction: 'col', gap: 1 }),
                        cm.sp('p', 3),
                        'rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors',
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.fontWeight('medium'),
                          cm.textSize('sm'),
                          'text-on-surface',
                        )}
                      >
                        {r.title}
                      </span>
                      <span
                        className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}
                      >
                        {r.category}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div
              data-mol-id="knowledge-detail-history"
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 3 }),
                cm.sp('p', 5),
                'rounded-2xl bg-surface-container-lowest shadow-sm',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'tracking-widest uppercase text-on-surface',
                )}
              >
                <span className="material-symbols-outlined text-base text-primary">history</span>
                {t('knowledgeArticleDetail.historyTitle', {}, { defaultValue: 'Version History' })}
              </span>
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 4 }),
                  'border-l border-outline-variant/30 pl-4 ml-2',
                )}
              >
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 1 }), 'relative')}>
                  <span
                    aria-hidden="true"
                    className="absolute w-2.5 h-2.5 rounded-full bg-primary -left-[22px] top-1.5 ring-4 ring-surface-container-lowest"
                  />
                  <div className={cm.flex({ justify: 'between', align: 'baseline' })}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        cm.textSize('xs'),
                        'font-mono text-primary',
                      )}
                    >
                      v{article.version}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {relativeTime(article.updated_at ?? article.created_at)}
                    </span>
                  </div>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface')}>
                    {t(
                      'knowledgeArticleDetail.historyCurrent',
                      {},
                      { defaultValue: 'Current revision.' },
                    )}
                  </span>
                </div>
                {article.version > 1 && (
                  <div className={cm.cn(cm.flex({ direction: 'col', gap: 1 }), 'relative')}>
                    <span
                      aria-hidden="true"
                      className="absolute w-2 h-2 rounded-full bg-outline-variant -left-[21px] top-1.5 ring-4 ring-surface-container-lowest"
                    />
                    <div className={cm.flex({ justify: 'between', align: 'baseline' })}>
                      <span
                        className={cm.cn(
                          cm.fontWeight('medium'),
                          cm.textSize('xs'),
                          'font-mono text-outline',
                        )}
                      >
                        v1
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {new Date(article.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'knowledgeArticleDetail.historyInitial',
                        {},
                        { defaultValue: 'Initial publication.' },
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </RapportLayout>
  )
}

export default KnowledgeArticleDetail
export { KnowledgeArticleDetail, KnowledgeArticleDetail as KnowledgeArticleDetailPage }
