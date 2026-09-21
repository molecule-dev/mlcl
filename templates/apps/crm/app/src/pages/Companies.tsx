import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CompanyRecord {
  id: string
  name: string
  domain: string | null
  industry: string | null
  size: string | null
  phone: string | null
  address: string | null
  created_at: string
  updated_at: string
}

const SIZE_OPTIONS = ['1-10', '11-50', '51-200', '201-1000', '1000+']

export function CompaniesPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [searchParams] = useSearchParams()
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [draftOpen, setDraftOpen] = useState(searchParams.get('new') === '1')
  const [submitting, setSubmitting] = useState(false)
  const [draft, setDraft] = useState({
    name: '',
    domain: '',
    industry: '',
    size: '',
    phone: '',
    address: '',
  })

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get<CompanyRecord[]>('/api/companies')
      setCompanies(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load companies.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is defined inline and recreated each render; adding it would cause an infinite loop
  }, [])

  // Keep the topbar search + "Add Company" button working while this page is
  // already mounted (in-app navigation only changes the query string).
  useEffect(() => {
    const q = searchParams.get('q')
    if (q !== null) setSearch(q)
    if (searchParams.get('new') === '1') setDraftOpen(true)
  }, [searchParams])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return companies
    return companies.filter((c) =>
      [c.name, c.domain, c.industry, c.size, c.phone, c.address]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [companies, search])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const created = await http.post<CompanyRecord>('/api/companies', {
        name: draft.name.trim(),
        domain: draft.domain || null,
        industry: draft.industry || null,
        size: draft.size || null,
        phone: draft.phone || null,
        address: draft.address || null,
      })
      track({ name: 'company.created', properties: { companyId: created.data?.id } })
      setDraft({ name: '', domain: '', industry: '', size: '', phone: '', address: '' })
      setDraftOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t('companies.confirmDelete', {}, { defaultValue: 'Delete this company?' })))
      return
    try {
      await http.delete(`/api/companies/${id}`)
      setCompanies((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete company.')
    }
  }

  return (
    <div
      aria-label={t('companies.pageLabel', {}, { defaultValue: 'Companies' })}
      className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')}
    >
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-3')}
      >
        <div>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('companies.title', {}, { defaultValue: 'Companies' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            <span data-mol-id="companies-count">{companies.length}</span>{' '}
            {t('companies.totalLabel', {}, { defaultValue: 'companies tracked' })}
          </p>
        </div>
        <div className={cm.cn(cm.flex(), 'gap-2 flex-wrap')}>
          <input
            data-mol-id="companies-search"
            placeholder={t('companies.search', {}, { defaultValue: 'Search…' }) as string}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'w-full sm:w-56 rounded-lg border border-outline-variant/30 bg-surface',
            )}
          />
          <button
            type="button"
            data-mol-id="companies-new"
            onClick={() => setDraftOpen((v) => !v)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-lg hover:bg-primary/90',
            )}
          >
            {draftOpen
              ? t('common.cancel', {}, { defaultValue: 'Cancel' })
              : t('companies.new', {}, { defaultValue: 'Add company' })}
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          data-mol-id="companies-error"
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-lg bg-error-container text-on-error-container',
          )}
        >
          {error}
        </div>
      )}

      {draftOpen && (
        <form
          onSubmit={handleCreate}
          data-mol-id="companies-form"
          className={cm.cn(
            cm.sp('p', 4),
            cm.flex({ direction: 'col' }),
            'gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-low',
          )}
        >
          <div className={cm.cn(cm.flex(), 'gap-3 flex-wrap')}>
            <input
              required
              data-mol-id="companies-form-name"
              placeholder={t('form.name', {}, { defaultValue: 'Name' }) as string}
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'flex-1 min-w-[200px] rounded-lg border border-outline-variant/30 bg-surface',
              )}
            />
            <input
              data-mol-id="companies-form-domain"
              placeholder={t('companies.fieldDomain', {}, { defaultValue: 'Domain' }) as string}
              value={draft.domain}
              onChange={(e) => setDraft((d) => ({ ...d, domain: e.target.value }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'w-48 rounded-lg border border-outline-variant/30 bg-surface',
              )}
            />
            <input
              data-mol-id="companies-form-industry"
              placeholder={t('companies.fieldIndustry', {}, { defaultValue: 'Industry' }) as string}
              value={draft.industry}
              onChange={(e) => setDraft((d) => ({ ...d, industry: e.target.value }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'w-44 rounded-lg border border-outline-variant/30 bg-surface',
              )}
            />
            <select
              data-mol-id="companies-form-size"
              value={draft.size}
              onChange={(e) => setDraft((d) => ({ ...d, size: e.target.value }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg border border-outline-variant/30 bg-surface',
              )}
            >
              <option value="">{t('form.size', {}, { defaultValue: 'Size' })}</option>
              {SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className={cm.cn(cm.flex(), 'gap-3 flex-wrap')}>
            <input
              data-mol-id="companies-form-phone"
              placeholder={t('form.phone', {}, { defaultValue: 'Phone' }) as string}
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'w-44 rounded-lg border border-outline-variant/30 bg-surface',
              )}
            />
            <input
              data-mol-id="companies-form-address"
              placeholder={t('form.address', {}, { defaultValue: 'Address' }) as string}
              value={draft.address}
              onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'flex-1 min-w-[200px] rounded-lg border border-outline-variant/30 bg-surface',
              )}
            />
            <button
              type="submit"
              data-mol-id="companies-form-submit"
              disabled={submitting || !draft.name.trim()}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-lg disabled:opacity-50',
              )}
            >
              {submitting
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('companies.create', {}, { defaultValue: 'Create company' })}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div data-mol-id="companies-loading" className="text-on-surface-variant">
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      ) : filtered.length === 0 ? (
        <div
          data-mol-id="companies-empty"
          className={cm.cn(
            cm.sp('p', 8),
            'text-center text-on-surface-variant rounded-xl border border-dashed border-outline-variant/30',
          )}
        >
          {companies.length === 0
            ? t(
                'companies.empty',
                {},
                { defaultValue: 'No companies yet. Add your first company above.' },
              )
            : t(
                'companies.emptyFiltered',
                {},
                { defaultValue: 'No companies match the current search.' },
              )}
        </div>
      ) : (
        <div
          data-mol-id="companies-table"
          className={cm.cn(
            'rounded-xl border border-outline-variant/15 bg-surface-container-lowest overflow-x-auto',
          )}
        >
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider">
              <tr>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('form.name', {}, { defaultValue: 'Name' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('companies.col.domain', {}, { defaultValue: 'Domain' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('companies.col.industry', {}, { defaultValue: 'Industry' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('form.size', {}, { defaultValue: 'Size' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('nav.actions', {}, { defaultValue: 'Actions' })}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  data-mol-id="companies-row"
                  data-company-id={c.id}
                  className="border-t border-outline-variant/10"
                >
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.fontWeight('semibold'))}>
                    <Link to={`/companies/${c.id}`} className="hover:text-primary">
                      {c.name}
                    </Link>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {c.domain || '—'}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {c.industry || '—'}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {c.size || '—'}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                    <button
                      type="button"
                      data-mol-id="companies-delete"
                      onClick={() => handleDelete(c.id)}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'rounded-lg text-error hover:bg-error-container/30',
                      )}
                    >
                      {t('common.delete', {}, { defaultValue: 'Delete' })}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default CompaniesPage
export { CompaniesPage as Companies }
