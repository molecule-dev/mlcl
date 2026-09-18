import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DatabaseAdminLayout } from '../components/DatabaseAdminLayout.js'
import { apiDelete, apiGet, apiPut } from '../lib/api.js'

interface ConnectionRow {
  id: string
  name: string
  host: string
  port: number
  database_name: string
  username: string
  ssl: boolean
  color: string
  driver: string
}

export function EditConnection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { connectionId } = useParams<{ connectionId: string }>()
  const [form, setForm] = useState<ConnectionRow | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!connectionId) return
    void apiGet<ConnectionRow>(http, `/api/connections/${connectionId}`)
      .then((row) => setForm(row))
      .catch((e: Error) => setError(e.message ?? 'load failed'))
  }, [connectionId, http])

  const onChange = useCallback(<K extends keyof ConnectionRow>(key: K, value: ConnectionRow[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f))
  }, [])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form || !connectionId) return
    setSaving(true)
    setError(null)
    try {
      const payload: Partial<ConnectionRow> & { password?: string } = {
        name: form.name,
        host: form.host,
        port: form.port,
        database_name: form.database_name,
        username: form.username,
        ssl: form.ssl,
        color: form.color,
        driver: form.driver,
      }
      if (password) payload.password = password
      await apiPut(http, `/api/connections/${connectionId}`, payload)
      setSaving(false)
      setSaved(true)
      // Re-fetch so the panel reflects what's actually stored.
      try {
        const fresh = await apiGet<ConnectionRow>(http, `/api/connections/${connectionId}`)
        setForm(fresh)
      } catch (_error) {
        /* leave form in last-known state */
      }
    } catch (e) {
      setError((e as Error).message ?? 'save failed')
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!connectionId) return
    if (
      !window.confirm(
        t('editConnection.confirmDelete', {}, { defaultValue: 'Delete this connection?' }),
      )
    )
      return
    setDeleting(true)
    try {
      await apiDelete(http, `/api/connections/${connectionId}`)
      navigate('/connections')
    } catch (e) {
      setError((e as Error).message ?? 'delete failed')
      setDeleting(false)
    }
  }

  if (!form) {
    return (
      <DatabaseAdminLayout>
        <div data-mol-id="ec-page" className={cm.cn('flex-1 overflow-y-auto p-6')}>
          {error ?? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      </DatabaseAdminLayout>
    )
  }

  return (
    <DatabaseAdminLayout>
      <div
        data-mol-id="ec-page"
        className={cm.cn('flex-1 overflow-y-auto p-6 space-y-6')}
        aria-label={t('editConnection.title', {}, { defaultValue: 'Edit connection' })}
      >
        <header className={cm.cn('flex items-center justify-between')}>
          <h1 className={cm.cn('text-2xl font-bold')}>
            {t('editConnection.title', {}, { defaultValue: 'Edit connection' })}
          </h1>
          <button
            type="button"
            onClick={() => navigate('/connections')}
            className={cm.cn('rounded border border-border px-3 py-1 text-xs')}
          >
            {t('common.back', {}, { defaultValue: 'Back' })}
          </button>
        </header>

        <form onSubmit={onSubmit} className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
          <Field
            id="conn-name"
            label={t('form.name', {}, { defaultValue: 'Name' })}
            value={form.name}
            onChange={(v) => onChange('name', v)}
            required
          />
          <Field
            id="conn-host"
            label={t('newConnection.host', {}, { defaultValue: 'Host' })}
            value={form.host}
            onChange={(v) => onChange('host', v)}
            required
          />
          <Field
            id="conn-port"
            label={t('newConnection.port', {}, { defaultValue: 'Port' })}
            type="number"
            value={String(form.port)}
            onChange={(v) => onChange('port', Number(v) || 5432)}
            required
          />
          <Field
            id="conn-database"
            label={t('newConnection.database', {}, { defaultValue: 'Database' })}
            value={form.database_name}
            onChange={(v) => onChange('database_name', v)}
            required
          />
          <Field
            id="conn-username"
            label={t('auth.username', {}, { defaultValue: 'Username' })}
            value={form.username}
            onChange={(v) => onChange('username', v)}
            required
          />
          <Field
            id="conn-password"
            label={t(
              'editConnection.newPassword',
              {},
              { defaultValue: 'New password (leave blank to keep)' },
            )}
            type="password"
            value={password}
            onChange={setPassword}
          />

          <div className={cm.cn('md:col-span-2 flex items-center gap-3 pt-2')}>
            <button
              type="submit"
              data-mol-id="ec-save"
              disabled={saving}
              className={cm.cn('rounded bg-primary px-3 py-2 text-sm font-bold text-on-primary')}
            >
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
            </button>
            <button
              type="button"
              data-mol-id="edit-conn-delete"
              onClick={onDelete}
              disabled={deleting}
              className={cm.cn('rounded border border-error/40 px-3 py-2 text-sm text-error')}
            >
              {deleting
                ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
                : t('editConnection.deleteButton', {}, { defaultValue: 'Delete connection' })}
            </button>
          </div>

          {saved && !error && (
            <div
              data-mol-id="ec-saved"
              className={cm.cn(
                'md:col-span-2 rounded border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary',
              )}
            >
              {t('editConnection.saved', {}, { defaultValue: 'Connection saved.' })}
            </div>
          )}
          {error && (
            <div
              role="alert"
              data-mol-id="ec-error"
              className={cm.cn(
                'md:col-span-2 rounded border border-error/30 bg-error/10 px-3 py-2 text-xs text-error',
              )}
            >
              {error}
            </div>
          )}
        </form>
      </div>
    </DatabaseAdminLayout>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  required,
  type = 'text',
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  type?: string
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn('space-y-1')}>
      <label htmlFor={id} className={cm.cn('block text-xs uppercase text-muted')}>
        {label}
      </label>
      <input
        id={id}
        data-mol-id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          'h-10 w-full rounded border border-border bg-bg px-3 font-mono text-sm text-text focus:border-primary focus:outline-none',
        )}
      />
    </div>
  )
}

export default EditConnection
