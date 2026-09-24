import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useStorage, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { renderMarkdown } from '../lib/render-markdown.js'

interface CategoryOption {
  id: string
  slug: string
  name: string
  color?: string
}

/** Storage key for the autosaved draft (title + body), cleared on publish. */
const DRAFT_KEY = 'compose:draft'

export function Compose() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetCategorySlug = searchParams.get('category')
  const storage = useStorage()
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [categoriesReloadKey, setCategoriesReloadKey] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [previewing, setPreviewing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [draftRestored, setDraftRestored] = useState(false)

  // Restore the autosaved draft once on mount (only into still-empty fields).
  useEffect(() => {
    let cancelled = false
    storage
      .get<{ title?: string; body?: string }>(DRAFT_KEY)
      .then((draft) => {
        if (cancelled || !draft) return
        setTitle((current) => current || draft.title || '')
        setBody((current) => current || draft.body || '')
      })
      .catch((_error) => {
        // Best-effort restore — a missing or corrupt draft just starts blank.
      })
      .finally(() => {
        if (!cancelled) setDraftRestored(true)
      })
    return () => {
      cancelled = true
    }
  }, [storage])

  // Autosave the draft as the user writes (debounced), per the page subtitle.
  useEffect(() => {
    if (!draftRestored) return
    const handle = window.setTimeout(() => {
      if (title.trim() || body.trim()) {
        storage.set(DRAFT_KEY, { title, body }).catch((_error) => {
          // Best-effort autosave — the in-memory state stays authoritative.
        })
      } else {
        storage.remove(DRAFT_KEY).catch((_error) => {
          // Best-effort cleanup of an emptied draft.
        })
      }
    }, 400)
    return () => window.clearTimeout(handle)
  }, [draftRestored, title, body, storage])

  useEffect(() => {
    let cancelled = false
    setCategoriesError(null)
    http
      .get<{ data: CategoryOption[] } | CategoryOption[]>('/api/categories')
      .then((res) => {
        if (cancelled) return
        const body2 = res?.data as unknown
        const list = Array.isArray(body2)
          ? (body2 as CategoryOption[])
          : Array.isArray((body2 as { data?: CategoryOption[] })?.data)
            ? (body2 as { data: CategoryOption[] }).data
            : []
        setCategories(list)
        if (list.length > 0) {
          if (presetCategorySlug) {
            const match = list.find((c) => c.slug === presetCategorySlug)
            if (match) {
              setCategoryId(match.id)
              return
            }
          }
          setCategoryId(list[0]!.id)
        }
      })
      .catch(() => {
        // A silent failure here leaves the form unpublishable with no
        // explanation — surface it with a retry instead.
        if (cancelled) return
        setCategories([])
        setCategoriesError(
          t('compose.categoriesFailed', {}, { defaultValue: 'Could not load categories.' }),
        )
      })
    return () => {
      cancelled = true
    }
    // `t` is intentionally excluded — including it can retrigger the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, presetCategorySlug, categoriesReloadKey])

  const previewHtml = useMemo(() => renderMarkdown(body), [body])
  const wordCount = useMemo(() => (body.trim() ? body.trim().split(/\s+/).length : 0), [body])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim() || !categoryId || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const res = await http.post<
        { data: { id: string; slug?: string } } | { id: string; slug?: string }
      >('/api/threads', { title: title.trim(), body, categoryId })
      const created =
        (res?.data as { data?: { id: string; slug?: string } })?.data ??
        (res?.data as { id: string; slug?: string })
      await storage.remove(DRAFT_KEY).catch((_error) => {
        // Best-effort — an orphaned draft is overwritten on the next compose.
      })
      if (created?.id) {
        track({
          name: 'thread.created',
          properties: { thread_id: created.id, category_id: categoryId },
        })
        navigate(`/t/${created.slug ?? created.id}`)
      } else {
        navigate('/c')
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('compose.failed', {}, { defaultValue: 'Could not start the thread. Try again.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const activeCategory = categories.find((c) => c.id === categoryId)

  return (
    <div className={cm.cn(cm.stack(6), 'mx-auto w-full max-w-[820px]')}>
      <header className={cm.stack(2)}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-[0.3em] text-primary',
          )}
        >
          {t('compose.eyebrow', {}, { defaultValue: 'New thread' })}
        </span>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('compose.title', {}, { defaultValue: 'Start the conversation.' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'compose.subtitle',
            {},
            {
              defaultValue:
                'Markdown supported — headings, quotes, lists, and inline code. Drafts are autosaved as you write.',
            },
          )}
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className={cm.cn(
          cm.sp('p', 6),
          cm.stack(5),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
        )}
      >
        <div className={cm.stack(2)}>
          <label
            htmlFor="compose-title"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('compose.field.title', {}, { defaultValue: 'Thread title' })}
          </label>
          <input
            id="compose-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            placeholder={t(
              'compose.titlePlaceholder',
              {},
              { defaultValue: 'A clear, generous question or framing' },
            )}
            className={cm.cn(
              cm.sp('p', 3),
              cm.fontWeight('semibold'),
              'w-full rounded-xl bg-surface-container border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 text-lg',
            )}
          />
          <p
            className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant text-right tabular-nums')}
          >
            {title.length}/140
          </p>
        </div>

        <div className={cm.stack(2)}>
          <label
            htmlFor="compose-category"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.category', {}, { defaultValue: 'Category' })}
          </label>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
            {categories.map((c) => {
              const active = c.id === categoryId
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    cm.roundedFull,
                    'inline-flex items-center gap-2 text-xs uppercase tracking-widest transition-colors min-h-10 md:min-h-0',
                    active
                      ? 'bg-primary text-on-primary shadow-sm shadow-primary/30'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant',
                  )}
                >
                  <span
                    aria-hidden
                    className={cm.cn('h-2 w-2 rounded-full')}
                    style={{ background: c.color ?? 'var(--color-author)' }}
                  />
                  {c.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className={cm.stack(2)}>
          <div
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-2')}
          >
            <label
              htmlFor="compose-body"
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('compose.field.body', {}, { defaultValue: 'Body' })}
            </label>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <button
                type="button"
                onClick={() => setPreviewing(false)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'text-xs uppercase tracking-widest transition-colors min-h-10 md:min-h-0',
                  !previewing
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant',
                )}
              >
                {t('compose.toggle.write', {}, { defaultValue: 'Write' })}
              </button>
              <button
                type="button"
                onClick={() => setPreviewing(true)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'text-xs uppercase tracking-widest transition-colors min-h-10 md:min-h-0',
                  previewing
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant',
                )}
              >
                {t('compose.toggle.preview', {}, { defaultValue: 'Preview' })}
              </button>
            </div>
          </div>
          {previewing ? (
            <div
              className={cm.cn(
                cm.sp('p', 5),
                'min-h-[260px] rounded-xl bg-surface-container border border-outline-variant/40 prose max-w-none leading-[1.75] text-on-surface',
              )}
              style={{ fontFamily: 'var(--mol-font-serif, Georgia, serif)' }}
              dangerouslySetInnerHTML={{
                __html: previewHtml || '<p><em>Nothing to preview yet.</em></p>',
              }}
            />
          ) : (
            <textarea
              id="compose-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              placeholder={t(
                'compose.bodyPlaceholder',
                {},
                {
                  defaultValue:
                    'Lay it out. Use ## for sections, > for quotes, ``` for code blocks.',
                },
              )}
              className={cm.cn(
                cm.sp('p', 5),
                'w-full rounded-xl bg-surface-container border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono text-sm leading-relaxed',
              )}
            />
          )}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.textSize('xs'),
              'text-on-surface-variant flex-wrap',
            )}
          >
            <span>
              {t(
                'compose.tipBar',
                {},
                {
                  defaultValue:
                    'Markdown — # heading, > quote, - list, **bold**, *italic*, `code`, [link](url)',
                },
              )}
            </span>
            <span className="tabular-nums">
              {t(
                'common.countWords',
                { count: wordCount.toLocaleString() },
                { defaultValue: '{{count}} words' },
              )}
            </span>
          </div>
        </div>

        {categoriesError && (
          <LoadErrorBanner
            message={categoriesError}
            onRetry={() => setCategoriesReloadKey((k) => k + 1)}
          />
        )}

        {error && <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p>}

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'text-sm text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </button>
          <span className={cm.cn(cm.flex1)} />
          {activeCategory && (
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant inline-flex items-center gap-2',
              )}
            >
              <span
                aria-hidden
                className={cm.cn('h-2 w-2 rounded-full')}
                style={{ background: activeCategory.color ?? 'var(--color-author)' }}
              />
              {t(
                'compose.postingTo',
                { name: activeCategory.name },
                { defaultValue: 'Posting to {{name}}' },
              )}
            </span>
          )}
          <button
            type="submit"
            disabled={submitting || !title.trim() || !body.trim()}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.roundedFull,
              cm.textSize('sm'),
              'inline-flex items-center gap-2 bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-sm shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden>
              send
            </span>
            {submitting
              ? t('common.publishingEllipsis', {}, { defaultValue: 'Publishing…' })
              : t('compose.publish', {}, { defaultValue: 'Publish thread' })}
          </button>
        </div>
      </form>
    </div>
  )
}

export default Compose
