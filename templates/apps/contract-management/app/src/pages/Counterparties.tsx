import { useCallback, useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Counterparty {
  id: string
  organization: string
  contact_name: string
  contact_email: string
  phone?: string
  address?: string
  notes?: string
  type?: 'client' | 'vendor'
  active_contracts: number
  total_value_cents: number
  last_signed_at?: string | null
}

function fmtUsd(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(2)}M`
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(0)}K`
  return `$${dollars.toFixed(2)}`
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '\u2014'
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface FormState {
  organization: string
  contact_name: string
  contact_email: string
  phone: string
  type: 'client' | 'vendor'
}

const EMPTY_FORM: FormState = {
  organization: '',
  contact_name: '',
  contact_email: '',
  phone: '',
  type: 'client',
}

export function Counterparties() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rows, setRows] = useState<Counterparty[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState<{ id: string | null; form: FormState } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    try {
      const res = await http.get('/api/counterparties')
      setRows(unwrapList<Counterparty>(res))
      setError(null)
    } catch (error) {
      logError('counterparties.reload', error)
      setError(
        t('counterparties.loadError', {}, { defaultValue: 'Failed to load counterparties.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/counterparties')
      .then((res) => {
        if (!cancelled) setRows(unwrapList<Counterparty>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('counterparties.loadError', {}, { defaultValue: 'Failed to load counterparties.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.toLowerCase().trim()
    return rows.filter(
      (r) =>
        r.organization.toLowerCase().includes(q) ||
        r.contact_name.toLowerCase().includes(q) ||
        r.contact_email.toLowerCase().includes(q),
    )
  }, [rows, query])

  function openNew() {
    setSaveError(null)
    setEditing({ id: null, form: { ...EMPTY_FORM } })
  }

  function openEdit(r: Counterparty) {
    setSaveError(null)
    setEditing({
      id: r.id,
      form: {
        organization: r.organization,
        contact_name: r.contact_name ?? '',
        contact_email: r.contact_email ?? '',
        phone: r.phone ?? '',
        type: (r.type as 'client' | 'vendor') ?? 'client',
      },
    })
  }

  const closeEditor = useCallback(() => {
    if (saving) return
    setEditing(null)
  }, [saving])

  useEffect(() => {
    if (!editing) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeEditor()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [editing, closeEditor])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    const f = editing.form
    if (!f.organization.trim()) {
      setSaveError(
        t('counterparties.requiredOrg', {}, { defaultValue: 'Organization is required.' }),
      )
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const payload: Record<string, unknown> = {
        organization: f.organization.trim(),
        contact_name: f.contact_name.trim(),
        contact_email: f.contact_email.trim() || null,
        phone: f.phone.trim() || null,
        type: f.type,
      }
      if (editing.id) {
        const res = await http.patch(`/api/counterparties/${editing.id}`, payload)
        const updated = unwrapSingle<Counterparty>(res)
        if (updated) setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
        if (updated)
          void track({
            name: 'counterparty.updated',
            properties: { counterpartyId: updated.id },
          })
      } else {
        const res = await http.post('/api/counterparties', payload)
        const created = unwrapSingle<Counterparty>(res)
        if (created) setRows((prev) => [...prev, created])
        if (created)
          void track({
            name: 'counterparty.created',
            properties: { counterpartyId: created.id },
          })
      }
      setEditing(null)
    } catch (error) {
      logError('counterparties.save', error)
      setSaveError(
        t('counterparties.saveError', {}, { defaultValue: 'Failed to save counterparty.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  async function remove(r: Counterparty) {
    const confirmed = window.confirm(
      t(
        'counterparties.confirmDelete',
        { name: r.organization },
        { defaultValue: 'Delete {{name}}?' },
      ),
    )
    if (!confirmed) return
    try {
      await http.delete(`/api/counterparties/${r.id}`)
      void track({ name: 'counterparty.deleted', properties: { counterpartyId: r.id } })
      setRows((prev) => prev.filter((x) => x.id !== r.id))
    } catch (error) {
      logError('counterparties.remove', error)
      await reload()
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }))}
      >
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('counterparties.heading', {}, { defaultValue: 'Counterparties' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'counterparties.subheading',
              {},
              {
                defaultValue:
                  'Organizations and individual signatories across the contract portfolio.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          id="new-counterparty"
          onClick={openNew}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          {t('counterparties.newCta', {}, { defaultValue: 'New counterparty' })}
        </button>
      </header>

      <div className={cm.cn(cm.card(), cm.sp('p', 4))}>
        <input
          type="search"
          id="counterparties-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            'counterparties.searchPlaceholder',
            {},
            { defaultValue: 'Search organization or contact\u2026' },
          )}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'w-full border border-outline-variant rounded-md',
          )}
        />
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('counterparties.loading', {}, { defaultValue: 'Loading\u2026' })}
        </p>
      ) : filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t(
            'counterparties.empty',
            {},
            { defaultValue: 'No counterparties yet. Create one to get started.' },
          )}
        </p>
      ) : (
        <section className={cm.cn(cm.card(), 'overflow-hidden')}>
          {/* 6 columns don't fit a 390px screen — scroll the table, never clip it. */}
          <div className="overflow-x-auto">
            <table className={'w-full min-w-[640px]'} data-testid="counterparties-table">
              <thead
                className={cm.cn(
                  'bg-surface-container',
                  cm.textSize('xs'),
                  'uppercase tracking-wide',
                  'text-on-surface-variant',
                )}
              >
                <tr>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                    {t('form.organization', {}, { defaultValue: 'Organization' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                    {t('nav.contact', {}, { defaultValue: 'Contact' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                    {t('status.active', {}, { defaultValue: 'Active' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                    {t('counterparties.col.value', {}, { defaultValue: 'Total value' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                    {t('counterparties.col.lastSigned', {}, { defaultValue: 'Last signed' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                    {t('nav.actions', {}, { defaultValue: 'Actions' })}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className={'hover:bg-surface-container'}
                    data-testid={`counterparty-row-${r.id}`}
                  >
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                      <p className={cm.fontWeight('semibold')}>{r.organization}</p>
                      {r.type ? (
                        <span
                          className={cm.cn(
                            cm.sp('px', 2),
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            cm.roundedFull,
                            'inline-block bg-primary-container',
                            cm.textPrimary,
                            cm.sp('mt', 1),
                          )}
                        >
                          {r.type}
                        </span>
                      ) : null}
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.textSize('sm'))}>
                      <p>{r.contact_name || '\u2014'}</p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {r.contact_email || '\u2014'}
                      </p>
                    </td>
                    <td
                      className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right tabular-nums')}
                    >
                      {r.active_contracts}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'text-right tabular-nums',
                        cm.fontWeight('semibold'),
                      )}
                    >
                      {fmtUsd(r.total_value_cents)}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'text-on-surface-variant',
                        'whitespace-nowrap',
                      )}
                    >
                      {fmtDate(r.last_signed_at)}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'text-right whitespace-nowrap',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.textSize('sm'),
                          cm.textPrimary,
                          'hover:underline',
                        )}
                      >
                        {t('common.edit', {}, { defaultValue: 'Edit' })}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(r)}
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.textSize('sm'),
                          'text-error hover:underline',
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
        </section>
      )}

      {editing ? (
        <div
          role="presentation"
          className="fixed inset-0 z-40 flex items-center justify-center bg-foreground/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditor()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="counterparty-editor-title"
            className={cm.cn('w-full max-w-lg')}
          >
            <form
              onSubmit={submit}
              className={cm.cn(
                cm.card(),
                cm.sp('p', 6),
                'w-full space-y-4 bg-surface-container-lowest',
              )}
              data-testid="counterparty-form"
            >
              <h2
                id="counterparty-editor-title"
                className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}
              >
                {editing.id
                  ? t('counterparties.editTitle', {}, { defaultValue: 'Edit counterparty' })
                  : t('counterparties.newTitle', {}, { defaultValue: 'New counterparty' })}
              </h2>

              <Field
                id="cp-organization"
                label={t('form.organization', {}, { defaultValue: 'Organization' })}
                value={editing.form.organization}
                onChange={(v) =>
                  setEditing({ ...editing, form: { ...editing.form, organization: v } })
                }
                required
              />
              <Field
                id="cp-contact-name"
                label={t('counterparties.fld.contactName', {}, { defaultValue: 'Contact name' })}
                value={editing.form.contact_name}
                onChange={(v) =>
                  setEditing({ ...editing, form: { ...editing.form, contact_name: v } })
                }
              />
              <Field
                id="cp-contact-email"
                type="email"
                label={t('counterparties.fld.contactEmail', {}, { defaultValue: 'Contact email' })}
                value={editing.form.contact_email}
                onChange={(v) =>
                  setEditing({ ...editing, form: { ...editing.form, contact_email: v } })
                }
              />
              <Field
                id="cp-phone"
                label={t('form.phone', {}, { defaultValue: 'Phone' })}
                value={editing.form.phone}
                onChange={(v) => setEditing({ ...editing, form: { ...editing.form, phone: v } })}
              />

              <label className={'block'}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-wide text-on-surface-variant',
                  )}
                >
                  {t('form.type', {}, { defaultValue: 'Type' })}
                </span>
                <select
                  id="cp-type"
                  value={editing.form.type}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      form: { ...editing.form, type: e.target.value as 'client' | 'vendor' },
                    })
                  }
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.sp('mt', 1),
                    'w-full border border-outline-variant rounded-md',
                  )}
                >
                  <option value="client">{t('nav.client', {}, { defaultValue: 'Client' })}</option>
                  <option value="vendor">
                    {t('counterparties.type.vendor', {}, { defaultValue: 'Vendor' })}
                  </option>
                </select>
              </label>

              {saveError ? (
                <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
                  {saveError}
                </p>
              ) : null}

              <div className={cm.cn(cm.flex({ gap: 'sm', justify: 'end' }))}>
                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={saving}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'rounded-md border border-outline',
                  )}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  id="cp-save"
                  disabled={saving}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    'rounded-md bg-primary text-on-primary disabled:opacity-60',
                  )}
                >
                  {saving
                    ? t('counterparties.saving', {}, { defaultValue: 'Saving\u2026' })
                    : t('common.save', {}, { defaultValue: 'Save' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

interface FieldProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}

function Field({ id, label, value, onChange, type = 'text', required }: FieldProps) {
  const cm = getClassMap()
  return (
    <label className={'block'}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'uppercase tracking-wide text-on-surface-variant',
        )}
      >
        {label}
        {required ? <span className="text-error">*</span> : null}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.sp('mt', 1),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}
