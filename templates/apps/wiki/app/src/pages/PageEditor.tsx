import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatPill } from '../components/StatPill.js'

interface ApiPage {
  id: string
  space_id: string
  title: string
  slug: string
  content: string
  tags: unknown
  version: number
  updated_at: string | null
}

interface ApiSpace {
  id: string
  name: string
}

const TEMPLATE_BODIES: Record<string, { title: string; body: string; tags: string[] }> = {
  rfc: {
    title: 'RFC — ',
    body: `# RFC — <one-line summary>\n\n## Context\n\nWhat problem are we solving and why now?\n\n## Decision\n\nWhat we are choosing to do.\n\n## Consequences\n\nWhat we accept by choosing this option.\n\n## Alternatives considered\n\n- Option A —\n- Option B —\n`,
    tags: ['rfc'],
  },
  postmortem: {
    title: 'Post-mortem — ',
    body: `# Post-mortem — <incident>\n\n**Severity:** sev-?\n**Owner:** \n**Duration:** \n\n## Summary\n\n## Timeline\n\n- HH:MM — \n- HH:MM — \n\n## Contributing factors\n\n## Action items\n\n- [ ] owner: \n`,
    tags: ['postmortem'],
  },
  'oncall-runbook': {
    title: 'Oncall runbook — ',
    body: `# Oncall runbook\n\n## Severity table\n\n| Sev | Definition | Response time |\n|-----|------------|---------------|\n| 1   | Outage     | 5m            |\n| 2   | Degraded   | 30m           |\n\n## Escalation path\n\n1. Primary oncall\n2. Secondary oncall\n3. Engineering manager\n\n## Common alerts\n\n- ALERT_NAME → playbook link\n`,
    tags: ['runbook'],
  },
  standup: {
    title: 'Standup — ',
    body: `# Standup — <date>\n\n## Shipped\n\n- \n\n## Blocked\n\n- \n\n## Next\n\n- \n`,
    tags: ['standup'],
  },
  'design-review': {
    title: 'Design review — ',
    body: `# Design review — <feature>\n\n## Brief\n\n## Hypothesis\n\n## Prototype\n\n[link]\n\n## Open questions\n\n- \n`,
    tags: ['design'],
  },
  '1on1': {
    title: '1:1 — ',
    body: `# 1:1 — <names>\n\n## Manager bullets\n\n- \n\n## Report bullets\n\n- \n\n## Action items\n\n- [ ] \n`,
    tags: ['1on1'],
  },
  'decision-log': {
    title: 'Decision — ',
    body: `# Decision — <title>\n\n**Date:** \n**Deciders:** \n\n## Options\n\n- A — \n- B — \n\n## Rationale\n\n## Follow-up\n\n- \n`,
    tags: ['decision'],
  },
  'launch-checklist': {
    title: 'Launch — ',
    body: `# Launch — <feature>\n\n## Pre-flight\n\n- [ ] Feature flag\n- [ ] Dashboards\n- [ ] Support brief\n\n## Day-of\n\n- [ ] Smoke tests\n- [ ] Comms\n\n## Post-mortem prompt (24h)\n\n- [ ] Schedule\n`,
    tags: ['launch'],
  },
  okr: {
    title: 'OKR — ',
    body: `# OKR — <quarter>\n\n## Objective\n\n## Key results\n\n1. KR1 — owner: \n2. KR2 — owner: \n3. KR3 — owner: \n\n## Weekly check-in cadence\n\n`,
    tags: ['okr'],
  },
}

const TOOLBAR_BUTTONS: Array<{ icon: string; label: string; insert: string }> = [
  { icon: 'format_bold', label: 'Bold', insert: '**bold**' },
  { icon: 'format_italic', label: 'Italic', insert: '_italic_' },
  { icon: 'format_underlined', label: 'Underline', insert: '<u>underline</u>' },
  { icon: 'format_list_bulleted', label: 'Bulleted list', insert: '\n- item' },
  { icon: 'format_list_numbered', label: 'Numbered list', insert: '\n1. item' },
  { icon: 'format_quote', label: 'Quote', insert: '\n> quote' },
  { icon: 'code', label: 'Inline code', insert: '`code`' },
  { icon: 'link', label: 'Link', insert: '[text](https://)' },
  { icon: 'image', label: 'Image', insert: '![alt](url)' },
]

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

// Tiny markdown → blocks renderer (headings, paragraphs, lists, quotes, code).
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

export function PageEditor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const isNew = !params.id || params.id === 'new'

  const [spaces, setSpaces] = useState<ApiSpace[]>([])
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(searchParams.get('space_id') ?? '')
  const [, setPage] = useState<ApiPage | null>(null)
  const loadedTitleRef = useRef<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<ApiSpace[]>('/spaces')
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res.data) ? res.data : []
        setSpaces(list)
        if (!selectedSpaceId && list[0]) setSelectedSpaceId(list[0].id)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http]) // selectedSpaceId intentionally omitted: only seed the default once on mount

  useEffect(() => {
    if (isNew) {
      const tplId = searchParams.get('template') ?? ''
      const tpl = tplId ? TEMPLATE_BODIES[tplId] : null
      setTitle(tpl?.title ?? '')
      setBody(tpl?.body ?? '')
      setTags(tpl?.tags ?? [])
      setSavedAt(null)
      setPage(null)
      loadedTitleRef.current = null
      return
    }
    let cancelled = false
    http
      .get<ApiPage>(`/pages/${params.id}`)
      .then((res) => {
        if (cancelled || !res.data) return
        setPage(res.data)
        loadedTitleRef.current = res.data.title
        setTitle(res.data.title)
        setBody(res.data.content || '')
        setTags(parseTags(res.data.tags))
        setSelectedSpaceId(res.data.space_id)
        setSavedAt(res.data.updated_at ? new Date(res.data.updated_at).toLocaleString() : null)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load page')
      })
    return () => {
      cancelled = true
    }
  }, [http, params.id, isNew, searchParams])

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase()
    if (!tag) return
    if (!tags.includes(tag)) setTags([...tags, tag])
    setTagInput('')
  }

  const handleSave = useCallback(async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        if (!selectedSpaceId) {
          setError('Pick a space first')
          return
        }
        const res = await http.post<ApiPage>('/pages', {
          title: title.trim(),
          content: body,
          space_id: selectedSpaceId,
          tags,
        })
        if (res.data?.id) {
          void track({
            name: 'page.created',
            properties: { page_id: res.data.id, space_id: selectedSpaceId },
          })
          navigate(`/page/${res.data.id}`)
        }
      } else {
        const res = await http.put<ApiPage>(`/pages/${params.id}`, {
          title: title.trim(),
          content: body,
          tags,
        })
        if (res.data) {
          const renamed = loadedTitleRef.current !== null && loadedTitleRef.current !== title.trim()
          void track({
            name: 'page.edited',
            properties: { page_id: params.id ?? '', version: res.data.version },
          })
          if (renamed) {
            void track({
              name: 'page.renamed',
              properties: { page_id: params.id ?? '', title: title.trim() },
            })
          }
          setPage(res.data)
          loadedTitleRef.current = title.trim()
          setSavedAt(new Date().toLocaleString())
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [http, isNew, title, body, tags, selectedSpaceId, params.id, navigate, saving])

  const handleSummarize = async () => {
    if (isNew || !params.id || summarizing) return
    setSummarizing(true)
    try {
      const res = await http.post<{ summary?: string; error?: string }>(
        `/pages/${params.id}/summarize`,
      )
      if (res.data?.summary) setSummary(res.data.summary)
      else if (res.data?.error) setError(res.data.error)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Summarize failed')
    } finally {
      setSummarizing(false)
    }
  }

  const handleToolbar = (insert: string) => {
    setBody((prev) => prev + (prev.endsWith('\n') || !prev ? '' : '\n') + insert)
  }

  const blocks = renderMarkdown(body)

  return (
    <div className={cm.stack(6)} data-testid="page-editor">
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(1)}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {isNew
              ? t('pageEditor.eyebrowNew', {}, { defaultValue: 'New page' })
              : t('pageEditor.eyebrowEdit', {}, { defaultValue: 'Editing' })}
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('pageEditor.titlePlaceholder', {}, { defaultValue: 'Page title…' })}
            data-testid="page-editor-title"
            className={cm.cn(
              cm.textSize('3xl'),
              'w-full bg-transparent border-0 font-extrabold tracking-tight text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none',
            )}
            style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
          />
          {isNew && spaces.length > 0 ? (
            <select
              value={selectedSpaceId}
              onChange={(e) => setSelectedSpaceId(e.target.value)}
              data-testid="page-editor-space"
              className={cm.cn(
                cm.sp('px', 3),
                cm.textSize('sm'),
                'h-9 w-fit rounded-md border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none',
              )}
            >
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <StatPill
            tone={isNew ? 'draft' : 'published'}
            icon={isNew ? 'edit_note' : 'check_circle'}
          >
            {t(
              isNew ? 'pageEditor.statusDraft' : 'pageEditor.statusPublished',
              {},
              { defaultValue: isNew ? 'Draft' : 'Published' },
            )}
          </StatPill>
          {savedAt ? (
            <span
              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
              data-testid="page-editor-saved-at"
            >
              {t('pageEditor.savedAt', { when: savedAt }, { defaultValue: 'Saved {{when}}' })}
            </span>
          ) : null}
          <Link
            to={isNew ? '/home' : `/page/${params.id}`}
            className={cm.cn(
              cm.sp('px', 4),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'h-9 inline-flex items-center rounded-md border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            data-testid="page-editor-save"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'h-9 rounded-md bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-60 transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
              check
            </span>
            {saving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('common.save', {}, { defaultValue: 'Save' })}
          </button>
        </div>
      </div>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            cm.accentCard({ tone: 'error' }),
            'rounded-md bg-error/10 text-on-surface',
          )}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div
        className={cm.cn(
          cm.sp('px', 2),
          cm.flex({ align: 'center', gap: 'xs' }),
          'h-10 rounded-md border border-outline-variant/60 bg-surface-container-lowest sticky top-14 z-10',
        )}
      >
        {TOOLBAR_BUTTONS.map((btn) => (
          <button
            key={btn.icon}
            type="button"
            onClick={() => handleToolbar(btn.insert)}
            aria-label={t(`pageEditor.toolbar.${btn.icon}`, {}, { defaultValue: btn.label })}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-8 w-8 rounded-md text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
              {btn.icon}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={handleSummarize}
          disabled={isNew || summarizing}
          aria-label={t('pageEditor.toolbar.summarize', {}, { defaultValue: 'AI summarize' })}
          data-testid="page-editor-summarize"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-8 w-8 ml-auto rounded-md text-primary hover:bg-surface-container-high disabled:opacity-50',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
            auto_awesome
          </span>
        </button>
      </div>

      {summary ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            cm.accentCard({ tone: 'primary' }),
            'rounded-md bg-primary/5',
          )}
          data-testid="page-editor-summary"
        >
          <p className={cm.accentCardLabel({ tone: 'primary' })}>
            {t('pageEditor.summaryLabel', {}, { defaultValue: 'AI summary' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface mt-1 leading-snug')}>{summary}</p>
        </div>
      ) : null}

      <div className={cm.cn('grid gap-4 lg:grid-cols-2')}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          spellCheck
          data-testid="page-editor-body"
          className={cm.cn(
            cm.sp('p', 5),
            'min-h-[480px] rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm leading-relaxed text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y',
          )}
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
          aria-label={t('pageEditor.bodyLabel', {}, { defaultValue: 'Markdown body' })}
        />
        <article
          aria-label={t('pageEditor.previewLabel', {}, { defaultValue: 'Live preview' })}
          data-testid="page-editor-preview"
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(4),
            'min-h-[480px] rounded-xl bg-surface-container-lowest border border-outline-variant/40 overflow-auto',
          )}
          style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
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
                  className={cm.cn(cm.textSize('base'), 'leading-relaxed text-on-surface')}
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
        </article>
      </div>

      <section
        className={cm.cn(
          cm.sp('p', 5),
          cm.stack(3),
          'rounded-xl bg-surface-container-lowest border border-outline-variant/40',
        )}
      >
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            'font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('form.tags', {}, { defaultValue: 'Tags' })}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
          {tags.map((tag) => (
            <span
              key={tag}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                'rounded-full bg-primary/10 text-primary font-semibold inline-flex items-center gap-1',
              )}
            >
              #{tag}
              <button
                type="button"
                onClick={() => setTags(tags.filter((x) => x !== tag))}
                className={cm.cn('hover:text-primary-hover')}
                aria-label={t(
                  'pageEditor.tags.remove',
                  { tag },
                  { defaultValue: 'Remove tag {{tag}}' },
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[14px]')}>close</span>
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addTag(tagInput)
              }
            }}
            placeholder={t('pageEditor.tags.placeholder', {}, { defaultValue: 'Add tag…' })}
            data-testid="page-editor-tag-input"
            className={cm.cn(
              cm.sp('px', 3),
              cm.textSize('xs'),
              'h-7 min-w-[8rem] rounded-full border border-outline-variant/60 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40',
            )}
          />
        </div>
      </section>
    </div>
  )
}
