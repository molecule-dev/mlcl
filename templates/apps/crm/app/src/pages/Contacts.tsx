import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ContactRecord {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  title: string | null
  company_id: string | null
  source: string | null
  created_at: string
  updated_at: string
}

interface CompanyRecord {
  id: string
  name: string
}

const CREATE_SOURCE_OPTIONS = [
  { value: 'website', labelKey: 'contacts.source.website', labelDefault: 'Website' },
  { value: 'referral', labelKey: 'contacts.source.referral', labelDefault: 'Referral' },
  {
    value: 'cold_outreach',
    labelKey: 'contacts.source.coldOutreach',
    labelDefault: 'Cold outreach',
  },
  { value: 'event', labelKey: 'contacts.source.event', labelDefault: 'Event' },
]

function getInitials(first: string | null, last: string | null, email: string | null): string {
  const f = first?.[0] ?? ''
  const l = last?.[0] ?? ''
  if (f || l) return `${f}${l}`.toUpperCase()
  return (email?.[0] ?? '?').toUpperCase()
}

function fullName(c: ContactRecord): string {
  const name = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim()
  return name || c.email || 'Unnamed contact'
}

function sourceTone(_cm: ReturnType<typeof getClassMap>, source: string | null): string {
  switch (source) {
    case 'referral':
      return 'bg-tertiary-container text-on-tertiary-container'
    case 'event':
      return 'bg-secondary-container text-on-secondary-container'
    case 'cold_outreach':
      return 'bg-surface-container-high text-on-surface-variant'
    case 'website':
    default:
      return 'bg-primary-container text-on-primary-container'
  }
}

function formatRelative(timestamp: string | null): string {
  if (!timestamp) return '—'
  const then = new Date(timestamp).getTime()
  const now = Date.now()
  const diff = now - then
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(timestamp).toLocaleDateString()
}

export function ContactsPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams] = useSearchParams()
  const [contacts, setContacts] = useState<ContactRecord[]>([])
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [showCreate, setShowCreate] = useState(searchParams.get('new') === '1')
  const [draft, setDraft] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    title: '',
    company_id: '',
    source: 'website',
  })
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [contactsResp, companiesResp] = await Promise.all([
        http.get<ContactRecord[]>('/api/contacts'),
        http.get<CompanyRecord[]>('/api/companies'),
      ])
      setContacts(Array.isArray(contactsResp.data) ? contactsResp.data : [])
      setCompanies(Array.isArray(companiesResp.data) ? companiesResp.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is defined inline and recreated each render; adding it would cause an infinite loop
  }, [])

  // Keep the topbar search + "Add Contact" button working while this page is
  // already mounted (in-app navigation only changes the query string).
  useEffect(() => {
    const q = searchParams.get('q')
    if (q !== null) setSearch(q)
    if (searchParams.get('new') === '1') setShowCreate(true)
  }, [searchParams])

  // Sources present in the data drive the filter (fixtures/imports may use
  // values beyond the curated create-form set, e.g. "conference").
  const sourceOptions = useMemo(() => {
    const seen = new Set<string>()
    for (const c of contacts) {
      if (c.source) seen.add(c.source)
    }
    return Array.from(seen).sort()
  }, [contacts])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return contacts.filter((c) => {
      if (sourceFilter !== 'all' && c.source !== sourceFilter) return false
      if (!q) return true
      const haystack = [
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.title,
        companies.find((co) => co.id === c.company_id)?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [contacts, companies, search, sourceFilter])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        ...draft,
        company_id: draft.company_id || null,
        title: draft.title || null,
        phone: draft.phone || null,
      }
      await http.post('/api/contacts', payload)
      setDraft({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        title: '',
        company_id: '',
        source: 'website',
      })
      setShowCreate(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contact')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (
      !window.confirm(t('contacts.confirmDelete', {}, { defaultValue: 'Delete this contact?' }))
    ) {
      return
    }
    try {
      await http.delete(`/api/contacts/${id}`)
      setContacts((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete contact')
    }
  }

  return (
    <div data-mol-id="contacts-page" className={cm.stack(6)}>
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' }), 'gap-4')}
      >
        <div>
          <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('contacts.heading', {}, { defaultValue: 'Contacts' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'contacts.subheading',
              { count: contacts.length },
              {
                defaultValue: `${contacts.length} contact${contacts.length === 1 ? '' : 's'} in your workspace`,
              },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
          <input
            data-mol-id="contacts-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('contacts.searchPlaceholder', {}, { defaultValue: 'Search…' })}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-xl border border-outline-variant bg-surface-container-low text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary',
            )}
          />
          <select
            data-mol-id="contacts-source-filter"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary',
            )}
          >
            <option value="all">
              {t('contacts.allSources', {}, { defaultValue: 'All sources' })}
            </option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {source.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <button
            type="button"
            data-mol-id="contacts-create-toggle"
            onClick={() => setShowCreate((s) => !s)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-xl bg-primary text-on-primary hover:opacity-90',
            )}
          >
            {showCreate
              ? t('common.cancel', {}, { defaultValue: 'Cancel' })
              : t('contacts.add', {}, { defaultValue: '+ Add Contact' })}
          </button>
        </div>
      </div>

      {error && (
        <div
          data-mol-id="contacts-error"
          role="alert"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl bg-error-container text-on-error-container',
          )}
        >
          {error}
        </div>
      )}

      {showCreate && (
        <form
          data-mol-id="contacts-create-form"
          onSubmit={handleCreate}
          className={cm.cn(
            cm.sp('p', 4),
            cm.stack(3),
            'rounded-2xl bg-surface-container-low ring-1 ring-outline-variant',
          )}
        >
          <div className={cm.cn(cm.grid({ cols: 2, gap: 3 }))}>
            <input
              required
              data-mol-id="contact-firstName"
              placeholder={t('form.firstName', {}, { defaultValue: 'First name' })}
              value={draft.first_name}
              onChange={(e) => setDraft((d) => ({ ...d, first_name: e.target.value }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg border border-outline-variant bg-surface text-on-surface',
              )}
            />
            <input
              data-mol-id="contact-lastName"
              placeholder={t('form.lastName', {}, { defaultValue: 'Last name' })}
              value={draft.last_name}
              onChange={(e) => setDraft((d) => ({ ...d, last_name: e.target.value }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg border border-outline-variant bg-surface text-on-surface',
              )}
            />
            <input
              type="email"
              required
              data-mol-id="contact-email"
              placeholder={t('form.email', {}, { defaultValue: 'Email' })}
              value={draft.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg border border-outline-variant bg-surface text-on-surface',
              )}
            />
            <input
              data-mol-id="contact-phone"
              placeholder={t('form.phone', {}, { defaultValue: 'Phone' })}
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg border border-outline-variant bg-surface text-on-surface',
              )}
            />
            <input
              data-mol-id="contact-title"
              placeholder={t('contacts.title', {}, { defaultValue: 'Job title' })}
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg border border-outline-variant bg-surface text-on-surface',
              )}
            />
            <select
              data-mol-id="contact-company"
              value={draft.company_id}
              onChange={(e) => setDraft((d) => ({ ...d, company_id: e.target.value }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg border border-outline-variant bg-surface text-on-surface',
              )}
            >
              <option value="">
                {t('contacts.noCompany', {}, { defaultValue: 'No company' })}
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'end' }), 'gap-2')}>
            <select
              data-mol-id="contact-source"
              value={draft.source}
              onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg border border-outline-variant bg-surface text-on-surface',
              )}
            >
              {CREATE_SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey, {}, { defaultValue: opt.labelDefault })}
                </option>
              ))}
            </select>
            <button
              type="submit"
              data-mol-id="contact-create-submit"
              disabled={submitting}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-xl bg-primary text-on-primary disabled:opacity-50',
              )}
            >
              {submitting
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('contacts.save', {}, { defaultValue: 'Save contact' })}
            </button>
          </div>
        </form>
      )}

      <div
        data-mol-id="contacts-table-card"
        className={cm.cn(
          'rounded-2xl bg-surface-container-low ring-1 ring-outline-variant overflow-hidden',
        )}
      >
        <table className={cm.cn(cm.w('full'), 'text-left border-collapse')}>
          <thead>
            <tr className="text-on-surface-variant">
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('xs'),
                  'uppercase tracking-wide',
                )}
              >
                {t('form.name', {}, { defaultValue: 'Name' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('xs'),
                  'uppercase tracking-wide',
                )}
              >
                {t('form.company', {}, { defaultValue: 'Company' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('xs'),
                  'uppercase tracking-wide',
                )}
              >
                {t('form.email', {}, { defaultValue: 'Email' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('xs'),
                  'uppercase tracking-wide',
                )}
              >
                {t('form.phone', {}, { defaultValue: 'Phone' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('xs'),
                  'uppercase tracking-wide',
                )}
              >
                {t('contacts.col.updated', {}, { defaultValue: 'Updated' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('xs'),
                  'uppercase tracking-wide',
                )}
              >
                {t('contacts.col.source', {}, { defaultValue: 'Source' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('xs'),
                  'uppercase tracking-wide',
                )}
              >
                <span className="sr-only">{t('nav.actions', {}, { defaultValue: 'Actions' })}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={7}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 8),
                    cm.textCenter,
                    cm.textSize('sm'),
                    'text-on-surface-variant',
                  )}
                  data-mol-id="contacts-loading"
                >
                  {t('contacts.loading', {}, { defaultValue: 'Loading contacts…' })}
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 12),
                    cm.textCenter,
                    cm.textSize('sm'),
                    'text-on-surface-variant',
                  )}
                  data-mol-id="contacts-empty"
                >
                  {contacts.length === 0
                    ? t(
                        'contacts.empty',
                        {},
                        { defaultValue: 'No contacts yet. Add your first one to get started.' },
                      )
                    : t(
                        'contacts.noResults',
                        {},
                        { defaultValue: 'No contacts match your filters.' },
                      )}
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((c) => {
                const company = companies.find((co) => co.id === c.company_id)
                return (
                  <tr
                    key={c.id}
                    data-mol-id="contact-row"
                    data-contact-id={c.id}
                    className="border-t border-outline-variant hover:bg-surface-container"
                  >
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                      <Link
                        to={`/contacts/${c.id}`}
                        className={cm.cn(cm.flex({ align: 'center' }), 'gap-3 group')}
                      >
                        <span
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'center' }),
                            cm.w(8),
                            cm.h(8),
                            cm.roundedFull,
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            'bg-primary-container text-on-primary-container',
                          )}
                        >
                          {getInitials(c.first_name, c.last_name, c.email)}
                        </span>
                        <span className={cm.stack(0)}>
                          <span
                            className={cm.cn(
                              cm.textSize('sm'),
                              cm.fontWeight('semibold'),
                              'text-on-surface group-hover:underline',
                            )}
                          >
                            {fullName(c)}
                          </span>
                          {c.title && (
                            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                              {c.title}
                            </span>
                          )}
                        </span>
                      </Link>
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'text-on-surface',
                      )}
                    >
                      {company ? (
                        <Link to={`/companies/${company.id}`} className="hover:underline">
                          {company.name}
                        </Link>
                      ) : (
                        <span className="text-on-surface-variant">—</span>
                      )}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'text-on-surface',
                      )}
                    >
                      {c.email ?? '—'}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'text-on-surface',
                      )}
                    >
                      {c.phone ?? '—'}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'text-on-surface-variant',
                      )}
                    >
                      {formatRelative(c.updated_at ?? c.created_at)}
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.sp('py', 0.5),
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'rounded-full uppercase tracking-wide',
                          sourceTone(cm, c.source),
                        )}
                      >
                        {(c.source ?? 'website').replace('_', ' ')}
                      </span>
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                      <button
                        type="button"
                        data-mol-id="contact-delete"
                        aria-label={t('contacts.delete', {}, { defaultValue: 'Delete contact' })}
                        onClick={() => void handleDelete(c.id)}
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          'rounded-md text-on-surface-variant hover:bg-error-container hover:text-on-error-container',
                        )}
                      >
                        {t('common.delete', {}, { defaultValue: 'Delete' })}
                      </button>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ContactsPage
