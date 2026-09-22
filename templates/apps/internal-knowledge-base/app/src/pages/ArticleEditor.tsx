import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CairnArticleStatusPill } from '../components/CairnArticleStatusPill.js'
import { renderMarkdown } from '../lib/markdown.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface SpaceSummary {
  id: string
  key: string
  name: string
}

interface ArticleResponse {
  id: string
  space_id: string
  title: string
  body_md: string
  body_html: string
  status: 'draft' | 'published'
  last_edited_at: string | null
  updated_at: string | null
}

const TOOLBAR_GROUPS: {
  key: string
  items: { key: string; label: string; icon: string; insert?: string }[]
}[] = [
  {
    key: 'block',
    items: [
      { key: 'heading', label: 'Heading', icon: 'title', insert: '\n## Heading\n' },
      { key: 'paragraph', label: 'Paragraph', icon: 'subject', insert: '\n\n' },
      { key: 'quote', label: 'Quote', icon: 'format_quote', insert: '\n> Quoted text\n' },
    ],
  },
  {
    key: 'inline',
    items: [
      { key: 'bold', label: 'Bold', icon: 'format_bold', insert: '**bold**' },
      { key: 'italic', label: 'Italic', icon: 'format_italic', insert: '*italic*' },
      {
        key: 'underline',
        label: 'Underline',
        icon: 'format_underlined',
        insert: '<u>underline</u>',
      },
      { key: 'code', label: 'Inline code', icon: 'code', insert: '`code`' },
    ],
  },
  {
    key: 'lists',
    items: [
      { key: 'bullet', label: 'Bullets', icon: 'format_list_bulleted', insert: '\n- Item\n' },
      { key: 'number', label: 'Numbered', icon: 'format_list_numbered', insert: '\n1. Item\n' },
      { key: 'check', label: 'Checklist', icon: 'check_box', insert: '\n- [ ] Item\n' },
    ],
  },
  {
    key: 'embed',
    items: [
      { key: 'image', label: 'Image', icon: 'image', insert: '\n![alt](url)\n' },
      { key: 'embed', label: 'Embed', icon: 'attach_file', insert: '\n[Embed](url)\n' },
      { key: 'link', label: 'Link', icon: 'link', insert: '[text](url)' },
    ],
  },
]

const SLASH_COMMANDS = [
  {
    key: 'callout',
    label: 'Callout',
    icon: 'campaign',
    description: 'A bordered note for a key warning or tip.',
    insert: '\n> [!NOTE]\n> Callout body.\n',
  },
  {
    key: 'codeblock',
    label: 'Code block',
    icon: 'code_blocks',
    description: 'A monospace block with syntax highlighting.',
    insert: '\n```\ncode\n```\n',
  },
  {
    key: 'table',
    label: 'Table',
    icon: 'table_chart',
    description: 'Insert a table with headers.',
    insert: '\n| H1 | H2 |\n| --- | --- |\n| a | b |\n',
  },
  {
    key: 'divider',
    label: 'Divider',
    icon: 'horizontal_rule',
    description: 'A thin horizontal rule between sections.',
    insert: '\n---\n',
  },
  {
    key: 'toggle',
    label: 'Toggle',
    icon: 'toggle_off',
    description: 'Collapsible block for optional reading.',
    insert: '\n<details><summary>Toggle</summary>\n\nBody.\n\n</details>\n',
  },
  {
    key: 'embed',
    label: 'Embed',
    icon: 'open_in_new',
    description: 'Paste any URL — we figure out the embed.',
    insert: '\n[Embed](https://)\n',
  },
]

const NEW_ARTICLE_BODY =
  '# New article\n\nStart writing here. Slash menus and the toolbar above insert blocks.\n'

export function ArticleEditor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id: routeId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const querySpace = searchParams.get('space') ?? ''

  const isNew = !routeId || routeId === 'new'

  const [articleId, setArticleId] = useState<string | null>(isNew ? null : (routeId ?? null))
  const [spaces, setSpaces] = useState<SpaceSummary[]>([])
  const [spaceId, setSpaceId] = useState<string>('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState(NEW_ARTICLE_BODY)
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get('/spaces')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<SpaceSummary>(res)
        setSpaces(list)
        if (isNew && !spaceId) {
          // Prefer ?space=key, otherwise the first available space
          const match = list.find((s) => s.key === querySpace || s.id === querySpace)
          setSpaceId(match?.id ?? list[0]?.id ?? '')
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http, isNew, querySpace, spaceId])

  useEffect(() => {
    let cancelled = false
    if (isNew || !routeId) return
    http
      .get(`/articles/${routeId}`)
      .then((res) => {
        if (cancelled) return
        const a = unwrapSingle<ArticleResponse>(res)
        if (!a) return
        setArticleId(a.id)
        setSpaceId(a.space_id)
        setTitle(a.title)
        setBody(a.body_md ?? '')
        setStatus(a.status)
        setSavedAt(a.last_edited_at ?? a.updated_at)
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t('articleEditor.loadFailed', {}, { defaultValue: 'Could not load article' }),
        )
      })
    return () => {
      cancelled = true
    }
  }, [http, isNew, routeId, t])

  function insertAtCursor(snippet: string) {
    const ta = document.querySelector<HTMLTextAreaElement>('[data-editor-body]')
    if (!ta) {
      setBody((b) => b + snippet)
      return
    }
    const start = ta.selectionStart ?? body.length
    const end = ta.selectionEnd ?? body.length
    const next = body.slice(0, start) + snippet + body.slice(end)
    setBody(next)
    requestAnimationFrame(() => {
      ta.focus()
      const cursor = start + snippet.length
      ta.setSelectionRange(cursor, cursor)
    })
  }

  async function handleSave(nextStatus?: 'draft' | 'published') {
    if (!title.trim()) {
      setError(t('articleEditor.titleRequired', {}, { defaultValue: 'Add a title before saving.' }))
      return
    }
    if (!spaceId) {
      setError(
        t('articleEditor.spaceRequired', {}, { defaultValue: 'Pick a space for this article.' }),
      )
      return
    }
    setError(null)
    const isPublish = nextStatus === 'published'
    if (isPublish) setPublishing(true)
    else setSaving(true)
    try {
      const targetStatus = nextStatus ?? status
      const body_html = renderMarkdown(body)
      if (articleId) {
        const res = await http.patch<ArticleResponse>(`/articles/${articleId}`, {
          title,
          body_md: body,
          body_html,
          status: targetStatus,
        })
        const a = (res as { data?: ArticleResponse }).data ?? (res as unknown as ArticleResponse)
        setStatus(a?.status ?? targetStatus)
        setSavedAt(a?.last_edited_at ?? new Date().toISOString())
        void track({
          name: 'article.updated',
          properties: { article_id: articleId, status: a?.status ?? targetStatus },
        })
        if (isPublish && targetStatus === 'published') {
          void track({
            name: 'article.published',
            properties: { article_id: articleId, space_id: spaceId },
          })
        }
      } else {
        const res = await http.post<ArticleResponse>('/articles', {
          space_id: spaceId,
          title,
          body_md: body,
          body_html,
          status: targetStatus,
        })
        const a = (res as { data?: ArticleResponse }).data ?? (res as unknown as ArticleResponse)
        if (a?.id) {
          setArticleId(a.id)
          setStatus(a.status)
          setSavedAt(a.last_edited_at ?? new Date().toISOString())
          void track({
            name: 'article.created',
            properties: { article_id: a.id, space_id: spaceId, status: a.status },
          })
          if (a.status === 'published') {
            void track({
              name: 'article.published',
              properties: { article_id: a.id, space_id: spaceId },
            })
          }
          // Replace history so we move from /article/new/edit to /article/:id/edit
          navigate(`/article/${a.id}/edit`, { replace: true })
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('articleEditor.saveFailed', {}, { defaultValue: 'Save failed' }),
      )
    } finally {
      setSaving(false)
      setPublishing(false)
    }
  }

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface-container-low')}>
      <header
        className={cm.cn(
          'sticky top-0 z-30 border-b border-outline-variant bg-surface/95 backdrop-blur',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('5xl'),
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            'mx-auto',
          )}
        >
          <Link
            to={articleId ? `/article/${articleId}` : '/home'}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant hover:text-on-surface',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              aria-hidden="true"
              style={{ fontSize: '1rem' }}
            >
              arrow_back
            </span>
            {t('common.back', {}, { defaultValue: 'Back' })}
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <CairnArticleStatusPill status={status} />
            <span
              aria-live="polite"
              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
            >
              {saving
                ? t('articleEditor.saving', {}, { defaultValue: 'Saving\u2026' })
                : savedAt
                  ? t(
                      'common.savedAt',
                      { time: new Date(savedAt).toLocaleTimeString() },
                      { defaultValue: 'Saved at {{time}}' },
                    )
                  : t('articleEditor.unsaved', {}, { defaultValue: 'Unsaved changes' })}
            </span>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving || publishing}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-full border border-outline text-on-surface hover:bg-surface-container disabled:opacity-50',
              )}
            >
              {t('common.saveDraft', {}, { defaultValue: 'Save draft' })}
            </button>
            <button
              type="button"
              onClick={() => handleSave('published')}
              disabled={saving || publishing}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('extrabold'),
                'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0',
              )}
            >
              {publishing
                ? t('articleEditor.publishing', {}, { defaultValue: 'Publishing\u2026' })
                : status === 'published'
                  ? t('pwa.update', {}, { defaultValue: 'Update' })
                  : t('common.publish', {}, { defaultValue: 'Publish' })}
            </button>
          </div>
        </div>
        <div
          className={cm.cn(
            cm.maxW('5xl'),
            cm.sp('px', 6),
            cm.sp('py', 2),
            cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
            'mx-auto border-t border-outline-variant',
          )}
        >
          {TOOLBAR_GROUPS.map((group, i) => (
            <div key={group.key} className={cm.flex({ align: 'center', gap: 'xs' })}>
              {group.items.map((item) => {
                const itemLabel = t(
                  `articleEditor.toolbar.${item.key}`,
                  {},
                  { defaultValue: item.label },
                )
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => item.insert && insertAtCursor(item.insert)}
                    title={itemLabel}
                    aria-label={itemLabel}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-9 w-9 rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined')}
                      aria-hidden="true"
                      style={{ fontSize: '1.125rem' }}
                    >
                      {item.icon}
                    </span>
                  </button>
                )
              })}
              {i < TOOLBAR_GROUPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cm.cn(cm.sp('mx', 2), 'h-6 w-px bg-outline-variant')}
                />
              ) : null}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setShowSlashMenu((s) => !s)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'ml-auto rounded-full bg-secondary/15 uppercase tracking-widest text-secondary hover:bg-secondary/25',
            )}
          >
            {t('articleEditor.slash', {}, { defaultValue: 'Slash menu (/)' })}
          </button>
        </div>
      </header>

      <main className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 12), 'relative mx-auto')}>
        {error ? (
          <p
            role="alert"
            className={cm.cn(
              cm.sp('mb', 4),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-lg bg-error/10 text-error',
            )}
          >
            {error}
          </p>
        ) : null}

        {spaces.length > 0 ? (
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
            <label
              htmlFor="article-space"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('articleEditor.spaceLabel', {}, { defaultValue: 'Space' })}
            </label>
            <select
              id="article-space"
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
              disabled={!isNew}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-lg border border-outline bg-surface-container-lowest text-on-surface disabled:opacity-60',
              )}
            >
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <input
          aria-label={t('articleEditor.titleAria', {}, { defaultValue: 'Article title' })}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t(
            'articleEditor.titlePlaceholder',
            {},
            { defaultValue: 'Untitled article' },
          )}
          className={cm.cn(
            cm.w('full'),
            cm.fontWeight('extrabold'),
            'border-0 bg-transparent text-4xl tracking-tight text-on-surface focus:outline-none placeholder:text-on-surface-variant/40',
          )}
        />

        <div
          className={cm.cn(
            cm.sp('mt', 8),
            cm.sp('p', 8),
            'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant shadow-sm',
          )}
        >
          <textarea
            data-editor-body
            aria-label={t('articleEditor.bodyAria', {}, { defaultValue: 'Article body' })}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck
            placeholder={t(
              'articleEditor.bodyPlaceholder',
              {},
              { defaultValue: 'Type / for blocks, or just start writing.' },
            )}
            className={cm.cn(
              cm.w('full'),
              'min-h-[420px] resize-none border-0 bg-transparent leading-[1.75] text-on-surface focus:outline-none',
            )}
            style={{ fontFamily: 'Georgia, "Iowan Old Style", serif', fontSize: '1.0625rem' }}
          />
        </div>

        {showSlashMenu ? (
          <div
            className={cm.cn(
              cm.sp('p', 3),
              'mt-6 max-w-md rounded-xl bg-surface-container-lowest ring-1 ring-outline-variant shadow-lg',
            )}
            role="menu"
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('articleEditor.slashHeading', {}, { defaultValue: 'Insert block' })}
            </p>
            <ul className={cm.cn(cm.sp('mt', 2), 'space-y-1')}>
              {SLASH_COMMANDS.map((c) => (
                <li key={c.key}>
                  <button
                    type="button"
                    onClick={() => {
                      insertAtCursor(c.insert)
                      setShowSlashMenu(false)
                    }}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.sp('p', 2),
                      cm.w('full'),
                      'rounded-lg text-left transition-colors hover:bg-surface-container',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'h-8 w-8 rounded-lg bg-primary/15 text-primary',
                      )}
                      aria-hidden="true"
                    >
                      <span
                        className={cm.cn('material-symbols-outlined')}
                        style={{ fontSize: '1rem' }}
                      >
                        {c.icon}
                      </span>
                    </span>
                    <span className={cm.cn('min-w-0 flex-1')}>
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('extrabold'),
                          'block text-on-surface',
                        )}
                      >
                        {t(`articleEditor.slashCmd.${c.key}.label`, {}, { defaultValue: c.label })}
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'block text-on-surface-variant')}>
                        {t(
                          `articleEditor.slashCmd.${c.key}.description`,
                          {},
                          { defaultValue: c.description },
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </main>
    </div>
  )
}

export default ArticleEditor
