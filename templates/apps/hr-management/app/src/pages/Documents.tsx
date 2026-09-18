import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Document {
  id: string
  name: string
  type: 'pdf' | 'doc' | 'xls' | 'img'
  size_label: string
  category: string
  uploader_name: string
  uploader_initial: string
  uploaded_at: string
  url: string
  shared_with: string
}

const TYPE_COLOR: Record<Document['type'], string> = {
  pdf: 'var(--color-doc-pdf)',
  doc: 'var(--color-doc-word)',
  xls: 'var(--color-doc-excel)',
  img: 'var(--color-doc-image)',
}

const TYPE_ICON: Record<Document['type'], string> = {
  pdf: 'picture_as_pdf',
  doc: 'description',
  xls: 'table_chart',
  img: 'image',
}

const CATEGORY_FILTERS: { key: 'all' | string; defaultLabel: string }[] = [
  { key: 'all', defaultLabel: 'All' },
  { key: 'Policy', defaultLabel: 'Policies' },
  { key: 'Contract', defaultLabel: 'Contracts' },
  { key: 'Reports', defaultLabel: 'Reports' },
  { key: 'Confidential', defaultLabel: 'Confidential' },
  { key: 'Performance', defaultLabel: 'Performance' },
]

export function Documents() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof CATEGORY_FILTERS)[number]['key']>('all')
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState({
    name: '',
    type: 'pdf' as Document['type'],
    category: 'Policy',
    size_label: '',
    url: '',
    shared_with: 'All employees',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/documents')
      .then((res) => {
        if (!cancelled) setDocs(unwrapList<Document>(res))
      })
      .catch(() => {
        if (!cancelled) setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function submitNew() {
    setSubmitError(null)
    if (!draft.name.trim()) {
      setSubmitError(t('documents.nameRequired', {}, { defaultValue: 'File name is required.' }))
      return
    }
    setSubmitting(true)
    try {
      const res = await http.post('/api/documents', {
        name: draft.name,
        type: draft.type,
        category: draft.category,
        size_label: draft.size_label || '0 KB',
        url: draft.url || '#',
        shared_with: draft.shared_with,
      })
      const created = unwrapSingle<Document>(res)
      if (created) setDocs((prev) => [created, ...prev])
      setComposing(false)
      setDraft({
        name: '',
        type: 'pdf',
        category: 'Policy',
        size_label: '',
        url: '',
        shared_with: 'All employees',
      })
    } catch (err) {
      const msg =
        (err && typeof err === 'object' && 'message' in err ? String(err.message) : '') ||
        t('documents.submitFailed', {}, { defaultValue: 'Failed to add document.' })
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return docs.filter((d) => {
      if (filter !== 'all' && d.category !== filter) return false
      if (!q) return true
      return d.name.toLowerCase().includes(q) || d.uploader_name.toLowerCase().includes(q)
    })
  }, [docs, query, filter])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(6))}>
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary-dark')}
          >
            {t('documents.eyebrow', {}, { defaultValue: 'Document library' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('documents.heading', {}, { defaultValue: 'Documents' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
            {t(
              'documents.subheading',
              {},
              { defaultValue: 'Handbook, contracts, reports — scoped per role and audit-logged.' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setComposing((v) => !v)}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
            {composing ? 'close' : 'upload'}
          </span>
          {composing
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('documents.upload', {}, { defaultValue: 'Upload document' })}
        </button>
      </header>

      {composing ? (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
            {t('documents.compose.heading', {}, { defaultValue: 'Add a document' })}
          </h2>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'documents.compose.note',
              {},
              {
                defaultValue:
                  'Paste a hosted file URL — full upload pipeline ships with the S3 bond.',
              },
            )}
          </p>
          <div className={cm.cn(cm.sp('mt', 4), cm.grid({ cols: 2, gap: 'md' }))}>
            <DocField
              label={t('form.name', {}, { defaultValue: 'Name' })}
              value={draft.name}
              onChange={(v) => setDraft({ ...draft, name: v })}
            />
            <DocField
              label={t('documents.field.size', {}, { defaultValue: 'Size' })}
              value={draft.size_label}
              onChange={(v) => setDraft({ ...draft, size_label: v })}
              placeholder={t(
                'documents.field.sizePlaceholder',
                {},
                { defaultValue: 'e.g. 240 KB' },
              )}
            />
            <DocField
              label={t('documents.field.url', {}, { defaultValue: 'URL' })}
              value={draft.url}
              onChange={(v) => setDraft({ ...draft, url: v })}
              placeholder="https://…"
            />
            <DocField
              label={t('documents.field.sharedWith', {}, { defaultValue: 'Shared with' })}
              value={draft.shared_with}
              onChange={(v) => setDraft({ ...draft, shared_with: v })}
            />
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <span
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('documents.field.category', {}, { defaultValue: 'Category' })}
              </span>
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary outline-none text-sm font-medium text-on-surface',
                )}
              >
                <option value="Policy">Policy</option>
                <option value="Contract">Contract</option>
                <option value="Reports">Reports</option>
                <option value="Confidential">Confidential</option>
                <option value="Performance">Performance</option>
              </select>
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <span
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.type', {}, { defaultValue: 'Type' })}
              </span>
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as Document['type'] })}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary outline-none text-sm font-medium text-on-surface',
                )}
              >
                <option value="pdf">PDF</option>
                <option value="doc">DOC</option>
                <option value="xls">XLS</option>
                <option value="img">Image</option>
              </select>
            </label>
          </div>
          {submitError ? (
            <p className={cm.cn(cm.sp('mt', 3), 'text-error text-sm font-semibold')}>
              {submitError}
            </p>
          ) : null}
          <div className={cm.cn(cm.sp('mt', 4), cm.flex({ align: 'center', gap: 'sm' }))}>
            <button
              type="button"
              onClick={submitNew}
              disabled={submitting}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50',
              )}
            >
              {submitting
                ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                : t('documents.compose.submit', {}, { defaultValue: 'Add document' })}
            </button>
          </div>
        </section>
      ) : null}

      <div
        className={cm.cn(
          cm.sp('p', 4),
          cm.flex({ align: 'center', wrap: 'wrap', gap: 'md' }),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            'flex flex-1 items-center gap-3 rounded-full bg-surface-container-low border border-outline-variant/20 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all min-w-[14rem]',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-[18px] text-on-surface-variant')}
          >
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'documents.searchPlaceholder',
              {},
              { defaultValue: 'Search by file name or uploader…' },
            )}
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.textSize('sm'),
              'flex-1 bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/70',
            )}
          />
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          {CATEGORY_FILTERS.map((f) => {
            const active = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  'rounded-full text-[10px] font-black uppercase tracking-widest transition-colors',
                  active
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {t(`documents.filter.${f.key.toLowerCase()}`, {}, { defaultValue: f.defaultLabel })}
              </button>
            )
          })}
        </div>
      </div>

      <section
        className={cm.cn(
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        {loading ? (
          <p className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
            {t('documents.loading', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : error ? (
          <p className={cm.cn(cm.sp('p', 8), 'text-error')}>{error}</p>
        ) : filtered.length === 0 ? (
          <p className={cm.cn(cm.sp('p', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('documents.empty', {}, { defaultValue: 'No documents match.' })}
          </p>
        ) : (
          <ul className={cm.cn('divide-y divide-outline-variant/20')}>
            {filtered.map((d) => (
              <li
                key={d.id}
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({ align: 'center', gap: 'md' }),
                  'hover:bg-surface-container-low transition-colors',
                )}
              >
                <span
                  className={cm.cn(
                    'h-10 w-10 grid place-items-center rounded-lg bg-surface-container-low text-[24px] material-symbols-outlined shrink-0',
                  )}
                  style={{ color: TYPE_COLOR[d.type] }}
                  aria-hidden="true"
                >
                  {TYPE_ICON[d.type]}
                </span>
                <div className={cm.cn('min-w-0 flex-1')}>
                  <p className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface truncate')}>
                    {d.name}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {d.size_label} · {d.uploader_name} ·{' '}
                    {new Date(d.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    'rounded-full bg-primary/10 text-primary-dark text-[10px] font-black uppercase tracking-widest',
                  )}
                >
                  {d.category}
                </span>
                <span
                  className={cm.cn(cm.textSize('xs'), 'hidden md:inline text-on-surface-variant')}
                >
                  {d.shared_with}
                </span>
                <a
                  href={d.url || '#'}
                  target={d.url ? '_blank' : undefined}
                  rel={d.url ? 'noreferrer noopener' : undefined}
                  aria-label={t('documents.openAria', {}, { defaultValue: 'Open document' })}
                  className={cm.cn(
                    'h-9 w-9 grid place-items-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[18px]')}
                    aria-hidden="true"
                  >
                    open_in_new
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

interface DocFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

function DocField({ label, value, onChange, placeholder }: DocFieldProps) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
      <span
        className={cm.cn(
          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary outline-none text-sm font-medium text-on-surface',
        )}
      />
    </label>
  )
}
