import { type FormEvent, useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LanguagePairBadge } from '../components/LanguagePairBadge.js'
import { PageHeading } from '../components/PageHeading.js'
import { unwrapList } from '../lib/unwrap.js'

interface GlossaryTerm {
  id: string
  source_term: string
  target_term: string
  source_lang: string
  target_lang: string
  domain: string
  approved: boolean
  notes?: string
}

interface ApiTermRow {
  id?: unknown
  source_term?: unknown
  target_term?: unknown
  source_lang?: unknown
  target_lang?: unknown
  notes?: unknown
  project_id?: unknown
}

const ALL_DOMAIN = 'all'

function adapt(row: ApiTermRow, idx: number): GlossaryTerm {
  return {
    id: String(row.id ?? `g_${idx}`),
    source_term: String(row.source_term ?? ''),
    target_term: String(row.target_term ?? ''),
    source_lang: String(row.source_lang ?? 'EN').toLowerCase(),
    target_lang: String(row.target_lang ?? 'ES').toLowerCase(),
    domain: row.project_id != null ? 'Project' : 'General',
    approved: row.notes != null,
    notes: typeof row.notes === 'string' && row.notes ? row.notes : undefined,
  }
}

export function Glossary() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [terms, setTerms] = useState<ReadonlyArray<GlossaryTerm>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [domain, setDomain] = useState<string>(ALL_DOMAIN)
  const [addStatus, setAddStatus] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [draftSourceTerm, setDraftSourceTerm] = useState('')
  const [draftTargetTerm, setDraftTargetTerm] = useState('')
  const [draftSourceLang, setDraftSourceLang] = useState('EN')
  const [draftTargetLang, setDraftTargetLang] = useState('ES')
  const [draftNotes, setDraftNotes] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/glossary')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<ApiTermRow>(res)
        setTerms(list.map((g, i) => adapt(g, i)))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('glossary.loadError', {}, { defaultValue: 'Failed to load glossary.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const handleAdd = () => {
    setShowAddForm((prev) => !prev)
    setAddStatus(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!draftSourceTerm.trim() || !draftTargetTerm.trim() || creating) return
    setCreating(true)
    setAddStatus(null)
    try {
      const res = await http.post('/glossary', {
        source_term: draftSourceTerm,
        target_term: draftTargetTerm,
        source_lang: draftSourceLang.toUpperCase(),
        target_lang: draftTargetLang.toUpperCase(),
        notes: draftNotes || null,
      })
      const body = res as unknown as { data?: ApiTermRow } & ApiTermRow
      const row = (body.data ?? body) as ApiTermRow
      setTerms((prev) => [adapt(row, prev.length), ...prev])
      // Domain event: a glossary term was committed (success point).
      void track({
        name: 'glossary.added',
        properties: {
          term_id: row.id != null ? String(row.id) : null,
          source_lang: draftSourceLang.toUpperCase(),
          target_lang: draftTargetLang.toUpperCase(),
        },
      })
      setDraftSourceTerm('')
      setDraftTargetTerm('')
      setDraftNotes('')
      setShowAddForm(false)
      setAddStatus(t('glossary.added', {}, { defaultValue: 'Term added to glossary.' }))
    } catch (_error) {
      // Term creation failed — surface the error message to the user.
      setAddStatus(t('glossary.addFailed', {}, { defaultValue: 'Failed to add term.' }))
    } finally {
      setCreating(false)
    }
  }

  const domains = Array.from(new Set(terms.map((d) => d.domain)))
  const filtered = terms.filter((d) => {
    if (domain !== ALL_DOMAIN && d.domain !== domain) return false
    if (query && !d.source_term.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'lg' }),
        cm.sp('p', 8),
        cm.maxW('7xl'),
        cm.mxAuto,
        cm.minH('screen'),
        'w-full',
      )}
    >
      <PageHeading
        eyebrow={t('glossary.eyebrow', {}, { defaultValue: 'Terminology' })}
        title={t('glossary.title', {}, { defaultValue: 'Glossary' })}
        subtitle={t(
          'glossary.subtitle',
          {},
          { defaultValue: 'Approved and pending terms across every locale.' },
        )}
        actions={
          <button
            data-mol-id="glossary-add-toggle"
            onClick={handleAdd}
            type="button"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full inline-flex items-center gap-2 text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 shadow-sm shadow-primary/30',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              add
            </span>
            {t('glossary.addTerm', {}, { defaultValue: 'Add term' })}
          </button>
        }
      />

      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          data-mol-id="glossary-add-form"
          className={cm.cn(
            cm.sp('p', 5),
            cm.flex({ direction: 'col', gap: 'sm' }),
            'bg-surface-container-lowest rounded-xl border border-surface-container/50 shadow-sm',
          )}
        >
          <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-1 md:grid-cols-2')}>
            <label
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'xs' }),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('glossary.field.source', {}, { defaultValue: 'Source term' })}
              <input
                data-mol-id="glossary-add-source-term"
                value={draftSourceTerm}
                onChange={(e) => setDraftSourceTerm(e.target.value)}
                required
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-lg bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/30 focus:outline-none font-serif-content text-base',
                )}
              />
            </label>
            <label
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'xs' }),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('glossary.field.target', {}, { defaultValue: 'Target term' })}
              <input
                data-mol-id="glossary-add-target-term"
                value={draftTargetTerm}
                onChange={(e) => setDraftTargetTerm(e.target.value)}
                required
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-lg bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/30 focus:outline-none font-serif-content text-base',
                )}
              />
            </label>
            <label
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'xs' }),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('glossary.field.sourceLang', {}, { defaultValue: 'Source language (e.g. EN)' })}
              <input
                data-mol-id="glossary-add-source-lang"
                value={draftSourceLang}
                onChange={(e) => setDraftSourceLang(e.target.value)}
                maxLength={10}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-lg bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/30 focus:outline-none font-mono uppercase',
                )}
              />
            </label>
            <label
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'xs' }),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('glossary.field.targetLang', {}, { defaultValue: 'Target language (e.g. ES)' })}
              <input
                data-mol-id="glossary-add-target-lang"
                value={draftTargetLang}
                onChange={(e) => setDraftTargetLang(e.target.value)}
                maxLength={10}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-lg bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/30 focus:outline-none font-mono uppercase',
                )}
              />
            </label>
          </div>
          <label
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xs' }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('glossary.field.notes', {}, { defaultValue: 'Notes (optional)' })}
            <textarea
              data-mol-id="glossary-add-notes"
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              rows={2}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-lg bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/30 focus:outline-none font-serif-content',
              )}
            />
          </label>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <button
              type="submit"
              data-mol-id="glossary-add-submit"
              disabled={creating || !draftSourceTerm.trim() || !draftTargetTerm.trim()}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full text-on-primary bg-primary hover:opacity-90 disabled:opacity-60',
              )}
            >
              {creating
                ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                : t('glossary.submit', {}, { defaultValue: 'Save term' })}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setAddStatus(null)
              }}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      )}

      {addStatus && (
        <div
          role="status"
          className={cm.cn(
            cm.sp('p', 3),
            'rounded-xl bg-primary-fixed/40 text-on-primary-fixed text-sm',
          )}
        >
          {addStatus}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl bg-error-container text-on-error-container text-sm',
          )}
        >
          {error}
        </div>
      )}

      {loading && (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('glossary.loading', {}, { defaultValue: 'Loading glossary…' })}
        </p>
      )}

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
          cm.sp('p', 4),
          'bg-surface-container-lowest rounded-xl border border-surface-container/50',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'relative w-full md:w-72')}>
          <span
            className={cm.cn(
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]',
            )}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('glossary.searchPlaceholder', {}, { defaultValue: 'Search terms…' })}
            className={cm.cn(
              cm.w('full'),
              cm.fontWeight('medium'),
              'bg-surface-container-low border-0 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none',
            )}
          />
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <button
            type="button"
            onClick={() => setDomain(ALL_DOMAIN)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.fontWeight('medium'),
              cm.textSize('xs'),
              'rounded-full inline-flex items-center min-h-[32px]',
              domain === ALL_DOMAIN
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
            )}
          >
            {t('glossary.allDomains', {}, { defaultValue: 'All domains' })}
          </button>
          {domains.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDomain(d)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('medium'),
                cm.textSize('xs'),
                'rounded-full inline-flex items-center min-h-[32px]',
                domain === d
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
              )}
            >
              {t(`glossary.domain.${d}`, {}, { defaultValue: d })}
            </button>
          ))}
        </div>
      </div>

      {terms.length === 0 && !loading ? (
        <div
          className={cm.cn(
            cm.sp('p', 8),
            cm.textCenter,
            'bg-surface-container-lowest rounded-xl border border-surface-container/50 text-on-surface-variant text-sm',
          )}
        >
          {t(
            'glossary.empty',
            {},
            {
              defaultValue:
                'No glossary terms yet — capture terminology while translating to start building consistency.',
            },
          )}
        </div>
      ) : (
        <div
          className={cm.cn(
            'bg-surface-container-lowest rounded-xl border border-surface-container/50 overflow-hidden shadow-sm',
          )}
        >
          {/* 6 columns won't fit a 390px phone — scroll horizontally instead of
              clipping cells. */}
          <div className="overflow-x-auto">
            <table className={cm.cn('w-full text-sm min-w-[640px]')}>
              <thead>
                <tr className={cm.cn('bg-surface-container-low text-on-surface-variant')}>
                  <th
                    className={cm.cn(
                      'text-left px-5 py-3 font-bold text-[10px] uppercase tracking-widest',
                    )}
                  >
                    {t('glossary.col.source', {}, { defaultValue: 'Source term' })}
                  </th>
                  <th
                    className={cm.cn(
                      'text-left px-5 py-3 font-bold text-[10px] uppercase tracking-widest',
                    )}
                  >
                    {t('glossary.col.target', {}, { defaultValue: 'Target term' })}
                  </th>
                  <th
                    className={cm.cn(
                      'text-left px-5 py-3 font-bold text-[10px] uppercase tracking-widest',
                    )}
                  >
                    {t('glossary.col.pair', {}, { defaultValue: 'Locale' })}
                  </th>
                  <th
                    className={cm.cn(
                      'text-left px-5 py-3 font-bold text-[10px] uppercase tracking-widest',
                    )}
                  >
                    {t('glossary.col.domain', {}, { defaultValue: 'Domain' })}
                  </th>
                  <th
                    className={cm.cn(
                      'text-left px-5 py-3 font-bold text-[10px] uppercase tracking-widest',
                    )}
                  >
                    {t('nav.status', {}, { defaultValue: 'Status' })}
                  </th>
                  <th
                    className={cm.cn(
                      'text-left px-5 py-3 font-bold text-[10px] uppercase tracking-widest',
                    )}
                  >
                    {t('form.notes', {}, { defaultValue: 'Notes' })}
                  </th>
                </tr>
              </thead>
              <tbody className={cm.cn('divide-y divide-surface-container')}>
                {filtered.map((g) => (
                  <tr key={g.id} className={cm.cn('hover:bg-surface-container-low ')}>
                    <td className={cm.cn('px-5 py-4 font-mono text-primary font-bold')}>
                      {g.source_term}
                    </td>
                    <td className={cm.cn('px-5 py-4 font-serif-content')}>{g.target_term}</td>
                    <td className={cm.cn('px-5 py-4')}>
                      <LanguagePairBadge source={g.source_lang} target={g.target_lang} size="sm" />
                    </td>
                    <td
                      className={cm.cn(
                        'px-5 py-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold',
                      )}
                    >
                      {g.domain}
                    </td>
                    <td className={cm.cn('px-5 py-4')}>
                      {g.approved ? (
                        <span
                          className={cm.cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-light text-success text-[10px] font-bold uppercase tracking-widest',
                          )}
                        >
                          <span
                            className={cm.cn('material-symbols-outlined text-base')}
                            aria-hidden="true"
                          >
                            check_circle
                          </span>
                          {t('glossary.approved', {}, { defaultValue: 'Approved' })}
                        </span>
                      ) : (
                        <span
                          className={cm.cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full bg-warning-light text-warning text-[10px] font-bold uppercase tracking-widest',
                          )}
                        >
                          {t('status.pending', {}, { defaultValue: 'Pending' })}
                        </span>
                      )}
                    </td>
                    <td
                      className={cm.cn(
                        'px-5 py-4 text-on-surface-variant text-xs leading-relaxed max-w-xs',
                      )}
                    >
                      {g.notes ?? '—'}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={6}
                      className={cm.cn('px-5 py-12 text-center text-on-surface-variant text-sm')}
                    >
                      {t(
                        'glossary.emptyFiltered',
                        {},
                        { defaultValue: 'No terms match your filter.' },
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Glossary
export { Glossary as GlossaryPage }
