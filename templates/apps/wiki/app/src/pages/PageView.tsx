import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AISummaryCard } from '../components/AISummaryCard.js'
import { StatPill } from '../components/StatPill.js'

interface ApiPage {
  id: string
  space_id: string
  title: string
  slug: string
  content: string
  summary: string | null
  tags: unknown
  version: number
  updated_at: string | null
  created_at: string | null
  author_id: string | null
  last_editor_id: string | null
}

interface ApiSpace {
  id: string
  name: string
  slug: string
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed as string[]
    } catch (_error) {
      // Not valid JSON; fall back to empty array.
      return []
    }
  }
  return []
}

// Extract a table-of-contents from H1/H2/H3 lines in markdown.
function extractToc(content: string): { level: number; id: string; text: string }[] {
  const out: { level: number; id: string; text: string }[] = []
  for (const line of content.split('\n')) {
    const m = /^(#{1,3})\s+(.+)$/.exec(line)
    if (!m) continue
    const level = m[1]!.length
    const text = m[2]!.trim()
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    out.push({ level, id, text })
  }
  return out
}

// Render markdown into paragraphs + headings + lists. Re-uses the
// PageEditor renderer style, kept inline to avoid a circular dep.
type Block =
  | { tag: 'h1' | 'h2' | 'h3' | 'p' | 'quote'; text: string }
  | { tag: 'ol' | 'ul'; items: string[] }
  | { tag: 'code'; text: string }

function renderMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i] ?? ''
    if (line.startsWith('```')) {
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i]!.startsWith('```')) {
        buf.push(lines[i] ?? '')
        i++
      }
      i++
      blocks.push({ tag: 'code', text: buf.join('\n') })
      continue
    }
    if (line.startsWith('# ')) {
      blocks.push({ tag: 'h1', text: line.slice(2).trim() })
      i++
      continue
    }
    if (line.startsWith('## ')) {
      blocks.push({ tag: 'h2', text: line.slice(3).trim() })
      i++
      continue
    }
    if (line.startsWith('### ')) {
      blocks.push({ tag: 'h3', text: line.slice(4).trim() })
      i++
      continue
    }
    if (line.startsWith('> ')) {
      blocks.push({ tag: 'quote', text: line.slice(2).trim() })
      i++
      continue
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\s*[-*]\s+/, ''))
        i++
      }
      blocks.push({ tag: 'ul', items })
      continue
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\s*\d+\.\s+/, ''))
        i++
      }
      blocks.push({ tag: 'ol', items })
      continue
    }
    if (line.trim() === '') {
      i++
      continue
    }
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i]!.trim() !== '' &&
      !lines[i]!.startsWith('#') &&
      !lines[i]!.startsWith('```')
    ) {
      para.push(lines[i] ?? '')
      i++
    }
    blocks.push({ tag: 'p', text: para.join(' ') })
  }
  return blocks
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const diffMs = Date.now() - d.getTime()
  const min = Math.round(diffMs / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hours = Math.round(min / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

export function PageView() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()

  const [page, setPage] = useState<ApiPage | null>(null)
  const [spaceName, setSpaceName] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [summaryUnavailable, setSummaryUnavailable] = useState(false)
  // Two-step trash: first click arms the button, second confirms. Auto-disarms
  // so a stray click never throws a page away.
  const [trashArmed, setTrashArmed] = useState(false)
  const [trashing, setTrashing] = useState(false)
  const disarmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadPage = useCallback(async () => {
    if (!params.id) return
    try {
      const res = await http.get<ApiPage>(`/pages/${params.id}`)
      setPage(res.data ?? null)
      if (res.data?.space_id) {
        try {
          const space = await http.get<ApiSpace>(`/spaces/${res.data.space_id}`)
          setSpaceName(space.data?.name ?? '')
        } catch (_error) {
          // Space fetch failed; degrade gracefully with an empty name.
          setSpaceName('')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Page not found')
    }
  }, [http, params.id])

  useEffect(() => {
    loadPage()
  }, [loadPage])

  useEffect(() => {
    return () => {
      if (disarmTimer.current) clearTimeout(disarmTimer.current)
    }
  }, [])

  const handleTrash = async () => {
    if (!params.id || trashing) return
    // First click arms the destructive action; the second confirms.
    if (!trashArmed) {
      setTrashArmed(true)
      if (disarmTimer.current) clearTimeout(disarmTimer.current)
      disarmTimer.current = setTimeout(() => setTrashArmed(false), 4_000)
      return
    }
    if (disarmTimer.current) clearTimeout(disarmTimer.current)
    setTrashArmed(false)
    setTrashing(true)
    try {
      await http.delete(`/pages/${params.id}`)
      void track({ name: 'page.trashed', properties: { page_id: params.id, source: 'page_view' } })
      navigate('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move page to trash')
    } finally {
      setTrashing(false)
    }
  }

  const handleRegenerate = async () => {
    if (!params.id || regenerating) return
    setRegenerating(true)
    setSummaryUnavailable(false)
    try {
      // Force regeneration by clearing the cached summary first; if the
      // backend doesn't support it, the existing summary is reused.
      const res = await http.post<{ summary?: string; error?: string }>(
        `/pages/${params.id}/summarize`,
      )
      if (res.data?.summary) {
        setPage((prev) => (prev ? { ...prev, summary: res.data!.summary! } : prev))
      } else if (res.data?.error) {
        setSummaryUnavailable(true)
      }
    } catch (err) {
      // 503 → summarizer not bonded; treat as "unavailable", not "broken".
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('503') || msg.toLowerCase().includes('not configured')) {
        setSummaryUnavailable(true)
      } else {
        setError(msg || 'Summarize failed')
      }
    } finally {
      setRegenerating(false)
    }
  }

  if (error) {
    return (
      <article className={cm.cn(cm.stack(4), 'mx-auto max-w-3xl')} data-testid="page-view-error">
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold text-on-surface')}>
          {t('pageView.notFoundTitle', {}, { defaultValue: 'Page not found' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{error}</p>
        <Link
          to="/home"
          className={cm.cn(
            cm.sp('px', 4),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'h-9 inline-flex items-center w-fit rounded-md bg-primary text-on-primary hover:bg-primary-hover transition-colors',
          )}
        >
          {t('auth.backToHome', {}, { defaultValue: 'Back to home' })}
        </Link>
      </article>
    )
  }

  if (!page) {
    return (
      <article className={cm.cn(cm.stack(4), 'mx-auto max-w-3xl')} data-testid="page-view-loading">
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('pageView.loading', {}, { defaultValue: 'Loading page…' })}
        </p>
      </article>
    )
  }

  const tags = parseTags(page.tags)
  const toc = extractToc(page.content)
  const blocks = renderMarkdown(page.content)
  const lastEditedLabel = page.updated_at
    ? t(
        'pageView.lastEdited',
        { when: formatRelative(page.updated_at) },
        { defaultValue: 'Updated {{when}}' },
      )
    : ''

  return (
    <article className={cm.cn(cm.stack(8), 'mx-auto max-w-3xl')} data-testid="page-view">
      <nav
        className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))}
        aria-label={t('pageView.breadcrumb', {}, { defaultValue: 'Breadcrumb' })}
      >
        <Link
          to="/home"
          className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
        >
          {t('pageView.home', {}, { defaultValue: 'Home' })}
        </Link>
        {spaceName ? (
          <span className={cm.flex({ align: 'center', gap: 'xs' })}>
            <span className={cm.cn('text-on-surface-variant/50')}>/</span>
            <span className={cm.cn('text-on-surface-variant')}>{spaceName}</span>
          </span>
        ) : null}
        <span className={cm.cn('text-on-surface-variant/50')}>/</span>
        <span className={cm.cn('text-on-surface font-medium')}>{page.title}</span>
      </nav>

      <div className={cm.stack(4)}>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            'font-extrabold tracking-tight leading-tight text-on-surface',
          )}
          style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
          data-testid="page-view-title"
        >
          {page.title}
        </h1>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          <StatPill tone="published" icon="check_circle">
            {t('status.published', {}, { defaultValue: 'Published' })}
          </StatPill>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'pageView.versionBadge',
              { version: page.version },
              { defaultValue: 'v{{version}}' },
            )}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            'flex-wrap',
          )}
        >
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{lastEditedLabel}</p>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <Link
              to={`/page/${page.id}/edit`}
              data-testid="page-view-edit"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'h-9 rounded-md bg-primary text-on-primary hover:bg-primary-hover transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                edit
              </span>
              {t('common.edit', {}, { defaultValue: 'Edit' })}
            </Link>
            <Link
              to={`/page/${page.id}/history`}
              data-testid="page-view-history"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'h-9 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                history
              </span>
              {t('nav.history', {}, { defaultValue: 'History' })}
            </Link>
            <button
              type="button"
              onClick={handleTrash}
              disabled={trashing}
              data-testid="page-view-trash"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                trashArmed
                  ? 'h-9 rounded-md bg-error text-on-error ring-2 ring-error/50 hover:bg-error-hover disabled:opacity-60 transition-colors'
                  : 'h-9 rounded-md border border-error/50 text-error hover:bg-error/10 disabled:opacity-60 transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                delete
              </span>
              {trashing
                ? t('pageView.trashing', {}, { defaultValue: 'Trashing…' })
                : trashArmed
                  ? t('pageView.confirmTrash', {}, { defaultValue: 'Trash it?' })
                  : t('pageView.trash', {}, { defaultValue: 'Trash' })}
            </button>
          </div>
        </div>
        <hr className={cm.cn('border-t border-outline-variant/40')} />
      </div>

      {page.summary ? (
        <AISummaryCard
          summary={page.summary}
          onRegenerate={handleRegenerate}
          isRegenerating={regenerating}
        />
      ) : (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-md border border-dashed border-outline-variant flex items-center justify-between gap-2 flex-wrap',
          )}
          data-testid="page-view-summary-empty"
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {summaryUnavailable
              ? t(
                  'pageView.summaryUnavailable',
                  {},
                  { defaultValue: 'AI summary is not configured for this workspace.' },
                )
              : t(
                  'pageView.summaryEmpty',
                  {},
                  { defaultValue: 'No AI summary yet — generate one from the page content.' },
                )}
          </p>
          {!summaryUnavailable ? (
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerating}
              data-testid="page-view-summarize"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'h-9 rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-60',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                auto_awesome
              </span>
              {regenerating
                ? t('pageView.summarizing', {}, { defaultValue: 'Summarizing…' })
                : t('pageView.summarize', {}, { defaultValue: 'Generate summary' })}
            </button>
          ) : null}
        </div>
      )}

      <div
        className={cm.stack(5)}
        style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
        data-testid="page-view-body"
      >
        {blocks.map((blk, i) => {
          if (blk.tag === 'h1') {
            return (
              <h1
                key={i}
                className={cm.cn(
                  cm.textSize('3xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {blk.text}
              </h1>
            )
          }
          if (blk.tag === 'h2') {
            return (
              <h2
                key={i}
                className={cm.cn(cm.textSize('xl'), 'font-bold tracking-tight text-on-surface')}
              >
                {blk.text}
              </h2>
            )
          }
          if (blk.tag === 'h3') {
            return (
              <h3
                key={i}
                className={cm.cn(cm.textSize('lg'), 'font-bold tracking-tight text-on-surface')}
              >
                {blk.text}
              </h3>
            )
          }
          if (blk.tag === 'p') {
            return (
              <p
                key={i}
                className={cm.cn(cm.textSize('lg'), 'leading-relaxed text-on-surface')}
                style={{ lineHeight: 1.75 }}
              >
                {blk.text}
              </p>
            )
          }
          if (blk.tag === 'ul') {
            return (
              <ul key={i} className={cm.cn('list-disc pl-6 leading-relaxed text-on-surface')}>
                {blk.items.map((item, j) => (
                  <li key={j} className={cm.cn('mb-1')}>
                    {item}
                  </li>
                ))}
              </ul>
            )
          }
          if (blk.tag === 'ol') {
            return (
              <ol key={i} className={cm.cn('list-decimal pl-6 leading-relaxed text-on-surface')}>
                {blk.items.map((item, j) => (
                  <li key={j} className={cm.cn('mb-1')}>
                    {item}
                  </li>
                ))}
              </ol>
            )
          }
          if (blk.tag === 'quote') {
            return (
              <blockquote
                key={i}
                className={cm.cn(
                  'border-l-[3px] border-primary pl-4 italic text-on-surface-variant',
                )}
              >
                {blk.text}
              </blockquote>
            )
          }
          if (blk.tag === 'code') {
            return (
              <pre
                key={i}
                className={cm.cn(
                  cm.sp('p', 4),
                  'rounded-lg overflow-x-auto bg-on-surface text-surface-container-lowest text-[13px]',
                )}
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                <code>{blk.text}</code>
              </pre>
            )
          }
          return null
        })}
      </div>

      {tags.length > 0 ? (
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.tags', {}, { defaultValue: 'Tags' })}
          </span>
          <ul className={cm.cn(cm.flex({ gap: 'xs' }), 'flex-wrap')}>
            {tags.map((tag) => (
              <li key={tag}>
                <Link
                  to={`/search?q=${encodeURIComponent(tag)}`}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    'rounded-full bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors',
                  )}
                >
                  #{tag}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {toc.length > 0 ? (
        <section
          className={cm.cn(
            cm.sp('p', 5),
            cm.stack(2),
            'rounded-xl bg-surface-container-lowest border border-outline-variant/40',
          )}
        >
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('pageView.tocTitle', {}, { defaultValue: 'On this page' })}
          </p>
          <ul className={cm.stack(1)}>
            {toc.map((item) => (
              <li
                key={`${item.level}-${item.id}`}
                className={cm.cn(
                  cm.textSize('sm'),
                  'text-on-surface-variant hover:text-primary transition-colors',
                )}
                style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
              >
                <a href={`#${item.id}`}>{item.text}</a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  )
}
