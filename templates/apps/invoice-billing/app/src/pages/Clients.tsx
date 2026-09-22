import { useCallback, useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ClientCard, type ClientCardData } from '../components/ClientCard.js'
import { KpiStatCard } from '../components/KpiStatCard.js'

interface ClientResponse {
  id: string
  name: string
  email?: string | null
  company?: string | null
  phone?: string | null
  outstanding_cents?: number
  invoice_count?: number
  total_billed?: number
  last_activity?: string | null
}

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

const toCard = (c: ClientResponse): ClientCardData => ({
  id: c.id,
  name: c.name,
  company: c.company ?? undefined,
  email: c.email ?? undefined,
  outstanding_cents: c.outstanding_cents ?? 0,
  invoice_count: c.invoice_count ?? 0,
  last_activity: c.last_activity ?? undefined,
})

export function Clients() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<ClientResponse[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      const r = await http.get<ClientResponse[]>('/api/clients')
      setData(Array.isArray(r.data) ? r.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load clients')
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void reload()
  }, [reload])

  const cards = useMemo(() => data.map(toCard), [data])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return cards
    return cards.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q),
    )
  }, [cards, search])

  const totals = useMemo(() => {
    let outstanding = 0
    let lifetime = 0
    for (const c of data) {
      outstanding += Number(c.outstanding_cents ?? 0)
      lifetime += Number(c.total_billed ?? 0) * 100
    }
    return { outstanding, lifetime, count: cards.length }
  }, [data, cards.length])

  const handleCreate = async (payload: {
    name: string
    email?: string
    company?: string
    phone?: string
  }) => {
    setError(null)
    setFeedback(null)
    try {
      const created = await http.post<{ id?: string }>('/api/clients', payload)
      track({ name: 'client.added', properties: { clientId: created.data?.id } })
      setFeedback(
        t('clients.createdFeedback', { name: payload.name }, { defaultValue: '{{name}} added.' }),
      )
      setShowForm(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create client')
      throw err
    }
  }

  return (
    <div data-mol-id="page-clients" className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}
        style={{ flexWrap: 'wrap', gap: '12px' }}
      >
        <div>
          <span
            style={{
              fontSize: '11px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-primary-dark)',
              fontWeight: 700,
            }}
          >
            {t('clients.eyebrow', {}, { defaultValue: 'Relationships' })}
          </span>
          <h1
            className={cm.cn(cm.fontWeight('bold'))}
            style={{
              fontSize: '28px',
              letterSpacing: '-0.02em',
              color: 'var(--mol-color-text)',
              margin: '4px 0 0',
            }}
          >
            {t('clients.title', {}, { defaultValue: 'Clients' })}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          data-action="add-client"
          style={{
            padding: '10px 22px',
            borderRadius: '9999px',
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-sidebar-text-active)',
            fontWeight: 700,
            fontSize: '13px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 6px 18px var(--color-accent-shadow)',
          }}
        >
          {t('clients.add', {}, { defaultValue: 'Add client' })}
        </button>
      </div>

      {feedback ? (
        <div
          role="status"
          data-testid="clients-feedback"
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-paid-light)',
            color: 'var(--color-paid)',
            borderRadius: '12px',
            fontSize: '13px',
          }}
        >
          {feedback}
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-overdue-light)',
            color: 'var(--color-danger-hover)',
            borderRadius: '12px',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
        }}
      >
        <KpiStatCard
          label={t('clients.kpi.count', {}, { defaultValue: 'Active clients' })}
          value={String(totals.count)}
          icon="group"
          tone="collected"
        />
        <KpiStatCard
          label={t('status.outstanding', {}, { defaultValue: 'Outstanding' })}
          value={formatCurrency(totals.outstanding)}
          icon="schedule_send"
          tone="outstanding"
        />
        <KpiStatCard
          label={t('clients.kpi.lifetime', {}, { defaultValue: 'Lifetime revenue' })}
          value={formatCurrency(totals.lifetime)}
          icon="trending_up"
          tone="revenue"
        />
      </div>

      <div
        className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
        style={{
          backgroundColor: 'var(--mol-color-surface)',
          borderRadius: '12px',
          padding: '8px 14px',
          border: '1px solid var(--mol-color-border)',
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '20px', color: 'var(--mol-color-text-secondary)' }}
        >
          search
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('clients.search', {}, { defaultValue: 'Search by name, company, email' })}
          aria-label={t('clients.search', {}, { defaultValue: 'Search by name, company, email' })}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '14px',
            color: 'var(--mol-color-text)',
          }}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        {loading ? (
          <div
            data-testid="clients-loading"
            style={{
              padding: '40px 24px',
              textAlign: 'center',
              color: 'var(--mol-color-text-tertiary)',
              fontSize: '14px',
              gridColumn: '1 / -1',
            }}
          >
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </div>
        ) : filtered.length === 0 ? (
          <div
            data-testid="clients-empty"
            style={{
              padding: '40px 24px',
              textAlign: 'center',
              color: 'var(--mol-color-text-tertiary)',
              fontSize: '14px',
              gridColumn: '1 / -1',
            }}
          >
            {data.length === 0
              ? t(
                  'clients.emptyAll',
                  {},
                  { defaultValue: 'No clients yet — add your first client to start invoicing.' },
                )
              : t(
                  'clients.empty',
                  {},
                  { defaultValue: 'No clients match — try a different name.' },
                )}
          </div>
        ) : (
          filtered.map((c) => <ClientCard key={c.id} client={c} />)
        )}
      </div>

      {showForm ? (
        <NewClientModal onClose={() => setShowForm(false)} onCreate={handleCreate} />
      ) : null}
    </div>
  )
}

function NewClientModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (payload: {
    name: string
    email?: string
    company?: string
    phone?: string
  }) => Promise<void>
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const submit = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      await onCreate({
        name: name.trim(),
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        phone: phone.trim() || undefined,
      })
    } catch (_error) {
      // error surfaced by parent via onCreate's own error state
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      data-testid="new-client-modal"
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-client-title"
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--mol-color-surface)',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        }}
      >
        <h2
          id="new-client-title"
          style={{ fontSize: '20px', fontWeight: 800, color: 'var(--mol-color-text)', margin: 0 }}
        >
          {t('clients.modal.title', {}, { defaultValue: 'Add a new client' })}
        </h2>
        <p
          style={{ fontSize: '13px', color: 'var(--mol-color-text-secondary)', margin: '6px 0 0' }}
        >
          {t(
            'clients.modal.subtitle',
            {},
            { defaultValue: 'Just a name is enough — you can fill the rest later.' },
          )}
        </p>
        <div style={{ display: 'grid', gap: '12px', marginTop: '20px' }}>
          <ModalField
            label={t('clients.modal.name', {}, { defaultValue: 'Client name' })}
            value={name}
            onChange={setName}
            name="clientName"
            required
          />
          <ModalField
            label={t('form.company', {}, { defaultValue: 'Company' })}
            value={company}
            onChange={setCompany}
            name="clientCompany"
          />
          <ModalField
            label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            value={email}
            onChange={setEmail}
            name="clientEmail"
          />
          <ModalField
            label={t('form.phone', {}, { defaultValue: 'Phone' })}
            value={phone}
            onChange={setPhone}
            name="clientPhone"
          />
        </div>
        <div
          style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 18px',
              borderRadius: '9999px',
              backgroundColor: 'var(--mol-color-surface)',
              color: 'var(--mol-color-text-secondary)',
              fontWeight: 600,
              fontSize: '13px',
              border: '1px solid var(--mol-color-border)',
              cursor: 'pointer',
            }}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !name.trim()}
            data-action="create-client"
            style={{
              padding: '10px 18px',
              borderRadius: '9999px',
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-sidebar-text-active)',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              cursor: busy || !name.trim() ? 'not-allowed' : 'pointer',
              opacity: busy || !name.trim() ? 0.6 : 1,
            }}
          >
            {busy
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('clients.modal.create', {}, { defaultValue: 'Add client' })}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalField({
  label,
  value,
  onChange,
  name,
  required,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  name?: string
  required?: boolean
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span
        style={{
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--mol-color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
        {required ? <span style={{ color: 'var(--color-accent)' }}> *</span> : null}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        data-field={name}
        required={required}
        style={{
          padding: '10px 12px',
          borderRadius: '10px',
          border: '1px solid var(--mol-color-border)',
          backgroundColor: 'var(--mol-color-surface-secondary)',
          fontSize: '13px',
          color: 'var(--mol-color-text)',
          outline: 'none',
        }}
      />
    </label>
  )
}

export default Clients
