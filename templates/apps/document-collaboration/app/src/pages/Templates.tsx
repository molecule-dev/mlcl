import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface TemplateRow {
  id: string
  owner_id: string | null
  name: string
  description: string
  category: string
  is_system: boolean
  content: { blocks?: Array<{ type: string; text?: string }> } | null
  created_at: string
}

const CATEGORIES: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All templates' },
  { key: 'writing', label: 'Writing' },
  { key: 'team', label: 'Team' },
  { key: 'engineering', label: 'Engineering' },
  { key: 'personal', label: 'Personal' },
]

export function Templates() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [active, setActive] = useState<string>('all')
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/templates')
      .then((res) => {
        if (cancelled) return
        setTemplates(unwrapList<TemplateRow>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('templates.loadFailed', {}, { defaultValue: 'Could not load templates.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = useMemo(
    () => (active === 'all' ? templates : templates.filter((tpl) => tpl.category === active)),
    [active, templates],
  )

  const previewOf = (tpl: TemplateRow): string => {
    const blocks = tpl.content?.blocks ?? []
    const para = blocks.find((b) => b.type === 'paragraph' && b.text)
    if (para?.text) return para.text
    return tpl.description
  }

  const onUseTemplate = async (tpl: TemplateRow): Promise<void> => {
    setBusyId(tpl.id)
    try {
      const res = await http.post(`/api/templates/${tpl.id}/instantiate`, {})
      const created = unwrapSingle<{ id: string }>(res)
      if (created?.id) {
        void track({
          name: 'doc.created_from_template',
          properties: { document_id: created.id, template_id: tpl.id },
        })
        navigate(`/doc/${created.id}`)
      }
    } catch (error) {
      logError('templates.useTemplate', error)
      setError(
        t(
          'templates.useFailed',
          {},
          { defaultValue: 'Could not start a document from this template.' },
        ),
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}
      data-testid="templates-root"
    >
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'uppercase tracking-widest text-secondary',
            )}
          >
            {t('templates.eyebrow', {}, { defaultValue: 'Start with structure' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 1),
              cm.textSize('3xl'),
              cm.fontWeight('extrabold'),
              'tracking-tight',
            )}
          >
            {t('nav.templates', {}, { defaultValue: 'Templates' })}
          </h1>
          <p
            className={cm.cn(cm.sp('mt', 1), cm.textSize('lg'), 'italic text-on-surface-variant')}
            style={{ fontFamily: 'Charter, Georgia, serif' }}
          >
            {t(
              'templates.subtitle',
              {},
              { defaultValue: 'Start with a thoughtful structure. Customize endlessly.' },
            )}
          </p>
        </div>
      </header>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border-l-4 border-l-error bg-error/5 text-sm text-error',
          )}
        >
          {error}
        </div>
      ) : null}

      <Link
        to="/doc/new"
        className={cm.cn(
          cm.sp('p', 6),
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          'group rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 transition-colors hover:bg-primary/10',
        )}
        data-testid="templates-blank"
      >
        <div className={cm.cn('min-w-0 flex-1')}>
          <p className={cm.cn(cm.fontWeight('extrabold'), 'text-on-surface')}>
            {t('templates.blank.title', {}, { defaultValue: 'Blank document' })}
          </p>
          <p
            className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'italic text-on-surface-variant')}
            style={{ fontFamily: 'Charter, Georgia, serif' }}
          >
            {t(
              'templates.blank.subtitle',
              {},
              { defaultValue: 'A clean page. The cursor begins.' },
            )}
          </p>
        </div>
        <span
          className={cm.cn(
            'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-transform group-hover:-translate-y-0.5',
          )}
          aria-hidden="true"
        >
          <span className={cm.cn('material-symbols-outlined')}>edit_note</span>
        </span>
      </Link>

      <nav className={cm.flex({ align: 'center', wrap: 'wrap', gap: 'sm' })}>
        {CATEGORIES.map((c) => {
          const isActive = active === c.key
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setActive(c.key)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-full transition-colors',
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
              data-testid={`templates-cat-${c.key}`}
            >
              {t(`templates.category.${c.key}`, {}, { defaultValue: c.label })}
            </button>
          )
        })}
      </nav>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-center text-sm text-on-surface-variant')}>
          {t('templates.loading', {}, { defaultValue: 'Loading templates…' })}
        </p>
      ) : filtered.length === 0 ? (
        <p
          className={cm.cn(cm.sp('py', 16), 'text-center text-sm text-on-surface-variant')}
          data-testid="templates-empty"
        >
          {t('templates.empty', {}, { defaultValue: 'No templates in this category yet.' })}
        </p>
      ) : (
        <div
          className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2 xl:grid-cols-3')}
          data-testid="templates-grid"
        >
          {filtered.map((tpl) => (
            <article
              key={tpl.id}
              className={cm.cn(
                cm.sp('p', 5),
                'group flex flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
              )}
              data-testid={`templates-item-${tpl.id}`}
            >
              <div
                className={cm.cn(
                  'relative h-32 w-full overflow-hidden rounded-xl bg-surface-container-low ring-1 ring-outline-variant/40',
                )}
                aria-hidden="true"
              >
                <div
                  className={cm.cn(
                    'h-full w-full p-4 text-[10px] leading-tight text-on-surface-variant/80',
                  )}
                  style={{ fontFamily: 'Charter, Georgia, serif' }}
                >
                  {previewOf(tpl)}
                </div>
                <span
                  aria-hidden="true"
                  className={cm.cn(
                    'pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface-container-low to-transparent',
                  )}
                />
              </div>
              <div
                className={cm.cn(cm.sp('mt', 4), cm.flex({ align: 'center', justify: 'between' }))}
              >
                <h3
                  className={cm.cn(
                    cm.fontWeight('extrabold'),
                    'text-on-surface group-hover:text-primary',
                  )}
                >
                  {tpl.name}
                </h3>
                <span
                  className={cm.cn(
                    cm.fontWeight('extrabold'),
                    'rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-secondary',
                  )}
                >
                  {t(`templates.category.${tpl.category}`, {}, { defaultValue: tpl.category })}
                </span>
              </div>
              <p className={cm.cn(cm.sp('mt', 2), cm.textSize('xs'), 'text-on-surface-variant')}>
                {tpl.description}
              </p>
              <button
                type="button"
                onClick={() => onUseTemplate(tpl)}
                disabled={busyId === tpl.id}
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('extrabold'),
                  cm.textSize('sm'),
                  'block rounded-full bg-primary text-center text-white shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50',
                )}
                data-testid={`templates-use-${tpl.id}`}
              >
                {busyId === tpl.id
                  ? t('templates.creating', {}, { defaultValue: 'Creating…' })
                  : t('templates.useTemplate', {}, { defaultValue: 'Use this template' })}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default Templates
