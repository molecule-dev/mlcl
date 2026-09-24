import { useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AppShell from '../components/AppShell.js'

interface CreatedArticle {
  id?: string
  data?: { id?: string }
}

function pickId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const o = payload as CreatedArticle
  if (typeof o.id === 'string') return o.id
  if (o.data && typeof o.data.id === 'string') return o.data.id
  return null
}

export function KnowledgeBaseNew() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('published')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!title.trim() || !body.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        body: body.trim(),
        status,
      }
      if (category.trim()) payload.category = category.trim()
      const res = await http.post<unknown>('/api/articles', payload)
      const id = pickId(res)
      // Domain analytics (no-op unless a provider is bonded via VITE_POSTHOG_KEY).
      void track({ name: 'article.created', properties: { article_id: id ?? null, status } })
      if (id) {
        navigate(`/knowledge-base?created=${id}`)
        return
      }
      navigate('/knowledge-base')
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      const message =
        err instanceof Error && err.message
          ? err.message
          : t(
              'knowledgeBaseNew.error',
              {},
              { defaultValue: 'Could not create article. Try again.' },
            )
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell mobileTitle={t('knowledgeBaseNew.title', {}, { defaultValue: 'New Article' })}>
      <div className={cm.cn(cm.maxW('3xl'), cm.mxAuto, cm.w('full'), cm.stack(6), 'p-4 md:p-8')}>
        <header className={cm.stack(2)}>
          <h1
            className={cm.cn(cm.textSize('2xl'), cm.fontWeight('semibold'), 'text-on-surface')}
            data-mol-id="kb-new-title"
          >
            {t('knowledgeBaseNew.title', {}, { defaultValue: 'New Article' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'knowledgeBaseNew.subtitle',
              {},
              {
                defaultValue:
                  'Write a knowledge base article. Published articles surface in the help center; drafts stay private.',
              },
            )}
          </p>
        </header>

        {error && (
          <div
            role="alert"
            data-mol-id="kb-new-error"
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-lg bg-error-container text-on-error-container',
            )}
          >
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{error}</p>
          </div>
        )}

        <form data-mol-id="kb-new-form" className={cm.stack(5)} onSubmit={handleSubmit}>
          <div className={cm.stack(2)}>
            <label
              htmlFor="article-title"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
            >
              {t('form.title', {}, { defaultValue: 'Title' })}
            </label>
            <input
              id="article-title"
              data-mol-id="article-title"
              type="text"
              required
              maxLength={300}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'w-full rounded-lg border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary',
              )}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t(
                'knowledgeBaseNew.titlePlaceholder',
                {},
                { defaultValue: 'How do I reset my password?' },
              )}
            />
          </div>

          <div className={cm.stack(2)}>
            <label
              htmlFor="article-body"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
            >
              {t('knowledgeBaseNew.bodyLabel', {}, { defaultValue: 'Article body (Markdown)' })}
            </label>
            <textarea
              id="article-body"
              data-mol-id="article-body"
              required
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'w-full min-h-[260px] rounded-lg border border-outline-variant bg-surface-container-lowest font-mono focus:outline-none focus:ring-2 focus:ring-primary',
              )}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t(
                'knowledgeBaseNew.bodyPlaceholder',
                {},
                { defaultValue: 'Step 1 — go to settings…' },
              )}
            />
          </div>

          <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 4 }))}>
            <div className={cm.cn(cm.stack(2), cm.flex1)}>
              <label
                htmlFor="article-category"
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
              >
                {t('knowledgeBaseNew.categoryLabel', {}, { defaultValue: 'Category (optional)' })}
              </label>
              <input
                id="article-category"
                data-mol-id="article-category"
                type="text"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'w-full rounded-lg border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary',
                )}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={t(
                  'knowledgeBaseNew.categoryPlaceholder',
                  {},
                  { defaultValue: 'getting-started, account-billing, troubleshooting' },
                )}
              />
            </div>

            <div className={cm.cn(cm.stack(2), cm.flex1)}>
              <label
                htmlFor="article-status"
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
              >
                {t('nav.status', {}, { defaultValue: 'Status' })}
              </label>
              <select
                id="article-status"
                data-mol-id="article-status"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'w-full rounded-lg border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary',
                )}
                value={status}
                onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
              >
                <option value="published">
                  {t(
                    'knowledgeBaseNew.statusPublished',
                    {},
                    { defaultValue: 'Published — visible in help center' },
                  )}
                </option>
                <option value="draft">
                  {t(
                    'knowledgeBaseNew.statusDraft',
                    {},
                    { defaultValue: 'Draft — only visible to me' },
                  )}
                </option>
              </select>
            </div>
          </div>

          <div className={cm.cn(cm.flex({ align: 'center', justify: 'end', gap: 3 }))}>
            <button
              type="button"
              data-mol-id="kb-new-cancel"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low',
              )}
              onClick={() => navigate('/knowledge-base')}
              disabled={submitting}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              data-mol-id="kb-new-submit"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-lg bg-primary text-on-primary hover:opacity-90 disabled:opacity-50',
              )}
              disabled={submitting || !title.trim() || !body.trim()}
            >
              {submitting
                ? t('common.publishingEllipsis', {}, { defaultValue: 'Publishing…' })
                : t('knowledgeBaseNew.submit', {}, { defaultValue: 'Publish article' })}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}

export default KnowledgeBaseNew
export { KnowledgeBaseNew as KnowledgeBaseNewPage }
