import { useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DatabaseAdminLayout } from '../components/DatabaseAdminLayout.js'
import { apiDelete, apiPost } from '../lib/api.js'

interface FormState {
  name: string
  host: string
  port: number
  database_name: string
  username: string
  password: string
  ssl: boolean
  color: string
  driver: 'postgresql'
}

const initial: FormState = {
  name: '',
  host: 'localhost',
  port: 5432,
  database_name: '',
  username: '',
  password: '',
  ssl: false,
  color: '#10b981',
  driver: 'postgresql',
}

export function NewConnection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [form, setForm] = useState<FormState>(initial)
  const [testStatus, setTestStatus] = useState<'idle' | 'pending' | 'ok' | 'fail'>('idle')
  const [testError, setTestError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const onChange = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  async function onTest() {
    setTestStatus('pending')
    setTestError(null)
    // Save draft, probe, then either keep or roll back. Simpler: create
    // and probe, leaving the row behind with a "draft" marker isn't safe.
    // Instead, we POST a one-shot probe via a temporary connection: create
    // with a unique scratch name, test it, then delete it. The user-facing
    // signal is the data-mol-id="new-conn-test-ok"/fail badge.
    let createdId: string | null = null
    try {
      const created = await apiPost<{ id: string }>(http, '/api/connections', {
        ...form,
        name: `__probe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      })
      createdId = created?.id ?? null
      if (!createdId) {
        throw new Error(t('newConnection.noId', {}, { defaultValue: 'No id returned' }))
      }
      const res = await apiPost<{ success: boolean; error?: string }>(
        http,
        `/api/connections/${createdId}/test`,
        {},
      )
      if (res?.success) {
        setTestStatus('ok')
      } else {
        setTestStatus('fail')
        setTestError(res?.error ?? null)
      }
    } catch (e) {
      setTestStatus('fail')
      setTestError((e as Error).message ?? 'probe failed')
    } finally {
      if (createdId) {
        try {
          await apiDelete(http, `/api/connections/${createdId}`)
        } catch (_error) {
          /* ignore — probe cleanup is best-effort */
        }
      }
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const res = await apiPost<{ id: string }>(http, '/api/connections', form)
      if (!res?.id) throw new Error(t('newConnection.noId', {}, { defaultValue: 'No id returned' }))
      track({
        name: 'connection.created',
        properties: { connection_id: res.id, driver: form.driver },
      })
      navigate(`/query/${res.id}`)
    } catch (e) {
      setSaveError((e as Error).message ?? 'save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DatabaseAdminLayout>
      <div
        data-mol-id="new-conn-page"
        className={cm.cn('flex-1 overflow-y-auto p-6 space-y-6')}
        aria-label={t('newConnection.title', {}, { defaultValue: 'New connection' })}
      >
        <header className={cm.cn('flex items-center justify-between')}>
          <div>
            <h1 className={cm.cn('text-2xl font-bold')}>
              {t('newConnection.title', {}, { defaultValue: 'New connection' })}
            </h1>
            <p className={cm.cn('text-sm text-muted')}>
              {t(
                'newConnection.subtitle',
                {},
                { defaultValue: 'Connect to any reachable Postgres database.' },
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/connections')}
            className={cm.cn('rounded border border-border px-3 py-1.5 text-xs')}
          >
            {t('common.back', {}, { defaultValue: 'Back' })}
          </button>
        </header>

        <fieldset className={cm.cn('rounded border border-border bg-surface p-4 space-y-2')}>
          <legend className={cm.cn('px-1 text-xs uppercase text-muted')}>
            {t('newConnection.engine', {}, { defaultValue: 'Engine' })}
          </legend>
          <label className={cm.cn('flex items-center gap-2')}>
            <input
              data-mol-id="engine-postgresql"
              type="radio"
              name="engine"
              value="postgresql"
              checked={form.driver === 'postgresql'}
              onChange={() => onChange('driver', 'postgresql')}
            />
            <span>PostgreSQL</span>
          </label>
          <label className={cm.cn('flex items-center gap-2 opacity-60')}>
            <input data-mol-id="engine-mysql" type="radio" name="engine" disabled />
            <span>{t('newConnection.mysqlSoon', {}, { defaultValue: 'MySQL (coming soon)' })}</span>
          </label>
          <label className={cm.cn('flex items-center gap-2 opacity-60')}>
            <input data-mol-id="engine-sqlite" type="radio" name="engine" disabled />
            <span>
              {t('newConnection.sqliteSoon', {}, { defaultValue: 'SQLite (coming soon)' })}
            </span>
          </label>
        </fieldset>

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
            value={String(form.port)}
            onChange={(v) => onChange('port', Number(v) || 5432)}
            required
            type="number"
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
            label={t('auth.login.password', {}, { defaultValue: 'Password' })}
            value={form.password}
            onChange={(v) => onChange('password', v)}
            type="password"
          />

          <div className={cm.cn('md:col-span-2 flex items-center gap-3 pt-2')}>
            <button
              type="button"
              data-mol-id="new-conn-test-button"
              disabled={testStatus === 'pending'}
              onClick={onTest}
              className={cm.cn('rounded border border-border px-3 py-2 text-sm')}
            >
              {testStatus === 'pending'
                ? t('newConnection.testing', {}, { defaultValue: 'Testing…' })
                : t('newConnection.testButton', {}, { defaultValue: 'Test connection' })}
            </button>
            <button
              type="submit"
              data-mol-id="new-conn-save"
              disabled={saving}
              className={cm.cn('rounded bg-primary px-3 py-2 text-sm font-bold text-on-primary')}
            >
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.save', {}, { defaultValue: 'Save' })}
            </button>
          </div>

          {testStatus === 'ok' && (
            <div
              data-mol-id="new-conn-test-ok"
              className={cm.cn(
                'md:col-span-2 rounded border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary',
              )}
            >
              {t('newConnection.testOk', {}, { defaultValue: 'Connection probe succeeded.' })}
            </div>
          )}
          {testStatus === 'fail' && (
            <div
              data-mol-id="new-conn-test-fail"
              className={cm.cn(
                'md:col-span-2 rounded border border-error/30 bg-error/10 px-3 py-2 text-xs text-error',
              )}
            >
              {testError ??
                t('newConnection.testFail', {}, { defaultValue: 'Connection probe failed.' })}
            </div>
          )}
          {saveError && (
            <div
              data-mol-id="new-conn-save-error"
              role="alert"
              className={cm.cn(
                'md:col-span-2 rounded border border-error/30 bg-error/10 px-3 py-2 text-xs text-error',
              )}
            >
              {saveError}
            </div>
          )}
        </form>
      </div>
    </DatabaseAdminLayout>
  )
}

interface FieldProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  type?: string
}

function Field({ id, label, value, onChange, required, type = 'text' }: FieldProps) {
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

export default NewConnection
