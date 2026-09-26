/**
 * Compose — /compose new post editor.
 *
 * Layout: title input → markdown toolbar → body editor → category +
 * flair selectors → submit.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { getClient as getHttpClient } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { PromptDialog } from '@molecule/app-ui-react'

interface ApiCategory {
  id: string
  slug: string
  name: string
  description?: string
  color?: string | null
  emoji?: string | null
}

interface CategoryOption {
  id: string
  slug: string
  label: string
  accent: string
}

const FALLBACK_CATEGORIES: CategoryOption[] = [
  { id: 'design-craft', slug: 'design-craft', label: 'design-craft', accent: '#0e7c6b' },
  { id: 'gardening', slug: 'gardening', label: 'gardening', accent: '#16a34a' },
  { id: 'web-dev', slug: 'web-dev', label: 'web-dev', accent: '#0c6558' },
  { id: 'self-help', slug: 'self-help', label: 'self-help', accent: '#7c3aed' },
  { id: 'hardware', slug: 'hardware', label: 'hardware', accent: '#0369a1' },
  { id: 'baking', slug: 'baking', label: 'baking', accent: '#d97706' },
  { id: 'meta', slug: 'meta', label: 'meta', accent: '#b44c18' },
  { id: 'cycling', slug: 'cycling', label: 'cycling', accent: '#ea580c' },
  { id: 'coffee', slug: 'coffee', label: 'coffee', accent: '#92400e' },
]

const FLAIRS = ['Discussion', 'Help', 'Show & Tell', 'Meta', 'Resolved', 'PSA']

/** Which URL the open toolbar prompt asks for, plus the captured textarea selection. */
interface UrlPromptRequest {
  kind: 'link' | 'image'
  start: number
  end: number
}

export function Compose() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [flair, setFlair] = useState<string>('')
  const [categories, setCategories] = useState<CategoryOption[]>(FALLBACK_CATEGORIES)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement | null>(null)
  // Open toolbar URL prompt (shared PromptDialog replaces window.prompt) —
  // carries the selection captured when the toolbar button was clicked,
  // because focus moves to the dialog input while it is open.
  const [urlPrompt, setUrlPrompt] = useState<UrlPromptRequest | null>(null)

  /**
   * Wraps or prefixes the current textarea selection with markdown syntax.
   * Triggered by the formatting toolbar (bold/italic/quote/code/list/link/image).
   * Link/image open the shared URL prompt dialog instead of window.prompt.
   */
  const applyMarkdown = useCallback(
    (icon: string) => {
      const ta = bodyRef.current
      if (!ta) return
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const before = body.slice(0, start)
      const sel = body.slice(start, end)
      const after = body.slice(end)
      let inserted: string
      let cursorOffset = 0
      switch (icon) {
        case 'format_bold':
          inserted = `**${sel || 'bold text'}**`
          cursorOffset = sel ? inserted.length : 2
          break
        case 'format_italic':
          inserted = `_${sel || 'italic text'}_`
          cursorOffset = sel ? inserted.length : 1
          break
        case 'format_quote':
          inserted = sel
            ? sel
                .split('\n')
                .map((l) => `> ${l}`)
                .join('\n')
            : '> '
          cursorOffset = inserted.length
          break
        case 'code':
          inserted = sel.includes('\n')
            ? `\n\`\`\`\n${sel || 'code'}\n\`\`\`\n`
            : `\`${sel || 'code'}\``
          cursorOffset = inserted.length
          break
        case 'format_list_bulleted':
          inserted = sel
            ? sel
                .split('\n')
                .map((l) => `- ${l}`)
                .join('\n')
            : '- '
          cursorOffset = inserted.length
          break
        case 'link':
          setUrlPrompt({ kind: 'link', start, end })
          return
        case 'image':
          setUrlPrompt({ kind: 'image', start, end })
          return
        default:
          return
      }
      const next = before + inserted + after
      setBody(next)
      requestAnimationFrame(() => {
        ta.focus()
        const pos = start + cursorOffset
        ta.setSelectionRange(pos, pos)
      })
    },
    [body],
  )

  /**
   * PromptDialog onSubmit for the toolbar URL prompt — inserts the markdown
   * at the captured selection. Resolve closes the dialog (single-stage flow,
   * so no stage-aware onClose is needed); an empty value behaves like
   * window.prompt's falsy return: close with nothing inserted.
   */
  const applyPromptedUrl = useCallback(
    (url: string) => {
      if (!urlPrompt) return
      if (!url) return
      const { kind, start, end } = urlPrompt
      const before = body.slice(0, start)
      const sel = body.slice(start, end)
      const after = body.slice(end)
      const inserted =
        kind === 'link' ? `[${sel || 'link text'}](${url})` : `![${sel || 'alt text'}](${url})`
      setBody(before + inserted + after)
      const ta = bodyRef.current
      if (ta) {
        const pos = start + inserted.length
        requestAnimationFrame(() => {
          ta.focus()
          ta.setSelectionRange(pos, pos)
        })
      }
    },
    [body, urlPrompt],
  )

  useEffect(() => {
    let cancelled = false
    const http = getHttpClient()
    void http
      .get<ApiCategory[]>('/api/categories')
      .then((res) => {
        if (cancelled) return
        const data = res?.data
        if (Array.isArray(data) && data.length > 0) {
          setCategories(
            data.map((c) => ({
              id: c.id,
              slug: c.slug,
              label: c.name || c.slug,
              accent: c.color || '#0e7c6b',
            })),
          )
        }
      })
      .catch(() => {
        /* fall back to defaults */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const isReady = useMemo(
    () => title.trim().length >= 5 && body.trim().length >= 10 && categoryId.length > 0,
    [title, body, categoryId],
  )
  const selected = categories.find((c) => c.id === categoryId)
  const accent = selected?.accent ?? 'var(--color-primary, #0e7c6b)'

  const handleSubmit = async () => {
    if (!isReady || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const http = getHttpClient()
      const finalBody = flair ? `**[${flair}]** ${body.trim()}` : body.trim()
      const tags = flair ? [flair] : []
      const resp = await http.post<{ id?: string; slug?: string; error?: string }>('/api/threads', {
        title: title.trim(),
        body: finalBody,
        category_id: categoryId,
        tags,
      })
      const created = resp?.data
      if (created?.id) {
        void track({
          name: 'topic.created',
          properties: { topic_id: created.id, category_id: categoryId, flair: flair || null },
        })
        navigate(`/thread/${created.id}`)
        return
      }
      setError(
        created?.error ||
          t('compose.publishFailed', {}, { defaultValue: 'Failed to publish thread.' }),
      )
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('compose.publishFailed', {}, { defaultValue: 'Failed to publish thread.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'max-w-3xl')}>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-widest text-primary',
          )}
        >
          {t('compose.eyebrow', {}, { defaultValue: 'Start a thread' })}
        </span>
        <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
          {t('compose.title', {}, { defaultValue: 'Bring something worth reading.' })}
        </h1>
      </div>

      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'rounded-xl border border-outline-variant/40 bg-surface overflow-hidden',
        )}
        style={{ borderTopColor: accent, borderTopWidth: '4px' }}
      >
        <div className={cm.cn(cm.flex({ direction: 'col' }))}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t(
              'compose.titlePlaceholder',
              {},
              { defaultValue: 'What is the thread about?' },
            )}
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.sp('px', 5),
              cm.sp('py', 4),
              'w-full text-lg border-b border-outline-variant/30 bg-transparent text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-low/30',
            )}
            maxLength={300}
          />
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 5),
              cm.sp('py', 2),
              'border-b border-outline-variant/30 bg-surface-container-low/40 flex-wrap',
            )}
            aria-label={t('compose.toolbar', {}, { defaultValue: 'Formatting' })}
          >
            {[
              {
                icon: 'format_bold',
                label: t('compose.toolbarBold', {}, { defaultValue: 'Bold' }),
              },
              {
                icon: 'format_italic',
                label: t('compose.toolbarItalic', {}, { defaultValue: 'Italic' }),
              },
              {
                icon: 'format_quote',
                label: t('compose.toolbarQuote', {}, { defaultValue: 'Quote' }),
              },
              { icon: 'code', label: t('compose.toolbarCode', {}, { defaultValue: 'Code' }) },
              {
                icon: 'format_list_bulleted',
                label: t('compose.toolbarList', {}, { defaultValue: 'Bulleted list' }),
              },
              { icon: 'link', label: t('compose.toolbarLink', {}, { defaultValue: 'Link' }) },
              { icon: 'image', label: t('compose.toolbarImage', {}, { defaultValue: 'Image' }) },
            ].map(({ icon, label }) => (
              <button
                key={icon}
                type="button"
                aria-label={label}
                title={label}
                onClick={() => applyMarkdown(icon)}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(8),
                  cm.h(8),
                  'rounded-md text-on-surface-variant hover:bg-surface-container-low/80 hover:text-primary transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')}>{icon}</span>
              </button>
            ))}
          </div>
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t(
              'compose.bodyPlaceholder',
              {},
              {
                defaultValue:
                  'What did you learn? What is the question? Quote sources where you can.',
              },
            )}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 4),
              cm.textSize('base'),
              'w-full min-h-[200px] bg-transparent text-on-surface placeholder:text-on-surface-variant focus:outline-none',
            )}
            style={{ fontFamily: 'var(--font-family-serif)' }}
          />
        </div>

        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('p', 5),
            'border-t border-outline-variant/30 bg-surface-container-low/30',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <label
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('compose.categoryLabel', {}, { defaultValue: 'Choose a community' })}
            </label>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
              {categories.map((c) => {
                const isSelected = c.id === categoryId
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('xs'),
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      'rounded-full border transition-colors',
                      isSelected
                        ? ''
                        : 'border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/50',
                    )}
                    style={
                      isSelected
                        ? {
                            borderColor: c.accent,
                            backgroundColor: `${c.accent}1f`,
                            color: c.accent,
                          }
                        : undefined
                    }
                  >
                    {t('compose.categoryPrefix', {}, { defaultValue: 'c/' })}
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <label
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('compose.flairLabel', {}, { defaultValue: 'Flair (optional)' })}
            </label>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
              {FLAIRS.map((f) => {
                const selected = f === flair
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFlair(selected ? '' : f)}
                    className={cm.cn(
                      cm.fontWeight('medium'),
                      cm.textSize('xs'),
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      'rounded-full border transition-colors',
                      selected
                        ? 'border-primary bg-primary-container/30 text-primary'
                        : 'border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/50',
                    )}
                  >
                    {f}
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.sp('p', 3),
                'rounded-lg bg-error-container/40 text-on-error-container border border-error/40',
              )}
            >
              {error}
            </div>
          )}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              cm.sp('mt', 1),
            )}
          >
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('compose.markdownHint', {}, { defaultValue: 'Markdown supported.' })}
            </span>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
              <button
                type="button"
                onClick={() => navigate('/feed')}
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-full text-on-surface-variant hover:bg-surface-container-low/60 transition-colors',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="button"
                disabled={!isReady || submitting}
                onClick={() => {
                  void handleSubmit()
                }}
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  'rounded-full bg-primary text-on-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors hover:bg-primary-active',
                )}
              >
                {submitting
                  ? t('common.publishingEllipsis', {}, { defaultValue: 'Publishing…' })
                  : t('compose.submit', {}, { defaultValue: 'Post to community' })}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Shared URL prompt — replaces the toolbar's window.prompt calls. */}
      <PromptDialog
        open={urlPrompt !== null}
        onClose={() => setUrlPrompt(null)}
        title={
          urlPrompt?.kind === 'image'
            ? t('compose.imageUrlPrompt', {}, { defaultValue: 'Image URL' })
            : t('compose.linkUrlPrompt', {}, { defaultValue: 'Link URL' })
        }
        placeholder="https://"
        initialValue="https://"
        confirmLabel={t('compose.insertUrl', {}, { defaultValue: 'Insert' })}
        inputMolId={
          urlPrompt?.kind === 'image' ? 'compose-image-url-input' : 'compose-link-url-input'
        }
        confirmMolId={
          urlPrompt?.kind === 'image' ? 'compose-image-url-confirm' : 'compose-link-url-confirm'
        }
        cancelMolId="compose-url-cancel"
        onSubmit={applyPromptedUrl}
      />
    </div>
  )
}

export default Compose
