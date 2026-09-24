import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { EnvironmentBadge, type EnvTone } from '../components/EnvironmentBadge.js'
import { SDKKeyDisplay } from '../components/SDKKeyDisplay.js'

interface EnvApi {
  id: string
  key: string
  name: string
  color: string
  is_production: boolean
  flag_count: number
  active_flag_count: number
  sdk_key: string
  client_key: string
  created_at?: string
  updated_at?: string
}

const ENV_TONES: ReadonlyArray<EnvTone> = ['production', 'staging', 'development', 'custom']
const toEnvTone = (key: string, isProduction: boolean): EnvTone => {
  if (isProduction) return 'production'
  if (ENV_TONES.includes(key as EnvTone)) return key as EnvTone
  return 'custom'
}

export function Environments() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [envs, setEnvs] = useState<EnvApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#10b981')
  const [newIsProd, setNewIsProd] = useState(false)
  const [creating, setCreating] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const reload = async () => {
    try {
      const res = await http.get<EnvApi[]>('/api/environments')
      const arr = Array.isArray(res.data) ? res.data : []
      setEnvs(arr)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed')
    }
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await reload()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setActionError(null)
    try {
      const created = await http.post<{ id?: string; key?: string }>('/api/environments', {
        key: newKey,
        name: newName,
        color: newColor,
        is_production: newIsProd,
      })
      void track({
        name: 'environment.added',
        properties: { environment_id: created.data?.id, key: newKey, is_production: newIsProd },
      })
      setShowCreate(false)
      setNewKey('')
      setNewName('')
      setNewColor('#10b981')
      setNewIsProd(false)
      await reload()
    } catch (err) {
      // Keep the form open and surface why (e.g. duplicate key, or the
      // plan's environment limit was reached).
      setActionError(err instanceof Error ? err.message : 'request failed')
    } finally {
      setCreating(false)
    }
  }

  const onRotateKeys = async (env: EnvApi) => {
    setActionError(null)
    try {
      await http.put(`/api/environments/${env.id}`, { rotate_keys: true })
      void track({
        name: 'environment.keys_rotated',
        properties: { environment_id: env.id, key: env.key },
      })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'request failed')
    }
    await reload()
  }

  const onDelete = async (env: EnvApi) => {
    setActionError(null)
    try {
      await http.delete(`/api/environments/${env.id}`)
      void track({
        name: 'environment.deleted',
        properties: { environment_id: env.id, key: env.key },
      })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'request failed')
    }
    await reload()
  }

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}
      data-mol-id="page-environments"
    >
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
            style={{ color: 'var(--color-text-link)' }}
          >
            {t('environments.kicker', {}, { defaultValue: '// /environments' })}
          </p>
          <h1 className={cm.cn('mt-1 text-3xl font-extrabold tracking-tight text-on-surface')}>
            {t('environments.heading', {}, { defaultValue: 'Environments' })}
          </h1>
          <p className={cm.cn('mt-1 text-sm text-on-surface-variant')}>
            {t(
              'environments.subheading',
              {},
              { defaultValue: 'Manage environment SDK keys, flag scopes, and evaluation traffic.' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className={cm.cn(
            'inline-flex items-center gap-1.5 rounded-md px-4 py-2 font-mono text-sm font-bold transition-colors',
          )}
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary-cta)' }}
          data-mol-id="environments-new-btn"
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            add
          </span>
          {showCreate
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('environments.newEnv', {}, { defaultValue: 'New environment' })}
        </button>
      </header>

      {showCreate ? (
        <form
          onSubmit={onCreate}
          className={cm.cn('rounded-xl p-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto_auto]')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid rgba(30, 41, 59, 0.7)',
          }}
          data-mol-id="environments-new-form"
        >
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder={t('environments.keyPh', {}, { defaultValue: 'key' })}
            required
            pattern="[a-zA-Z0-9_\-]+"
            className={cm.cn('h-9 rounded-md px-2 font-mono text-sm')}
            style={{
              backgroundColor: 'var(--color-code-block)',
              border: '1px solid rgba(30, 41, 59, 0.8)',
              color: 'var(--color-text-code)',
            }}
            aria-label={t('environments.keyAria', {}, { defaultValue: 'Environment key' })}
            data-mol-id="environments-new-key"
          />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('form.name', {}, { defaultValue: 'Name' })}
            required
            className={cm.cn('h-9 rounded-md px-2 text-sm')}
            style={{
              backgroundColor: 'var(--color-code-block)',
              border: '1px solid rgba(30, 41, 59, 0.8)',
              color: 'var(--color-text-code)',
            }}
            aria-label={t('environments.nameAria', {}, { defaultValue: 'Environment name' })}
            data-mol-id="environments-new-name"
          />
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className={cm.cn('h-9 w-12 rounded-md')}
            aria-label={t('environments.colorAria', {}, { defaultValue: 'Environment color' })}
          />
          <label
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'font-mono text-xs text-on-surface-variant',
            )}
          >
            <input
              type="checkbox"
              checked={newIsProd}
              onChange={(e) => setNewIsProd(e.target.checked)}
              className={cm.cn('h-4 w-4 accent-emerald-500')}
            />
            {t('environments.isProduction', {}, { defaultValue: 'production' })}
          </label>
          <button
            type="submit"
            disabled={creating}
            className={cm.cn(
              'inline-flex items-center rounded-md px-4 py-2 font-mono text-xs font-bold transition-colors disabled:opacity-50',
            )}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-on-primary-cta)',
            }}
            data-mol-id="environments-new-submit"
          >
            {creating
              ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
              : t('common.create', {}, { defaultValue: 'Create' })}
          </button>
        </form>
      ) : null}

      {actionError ? (
        <p
          role="alert"
          className={cm.cn('text-sm')}
          style={{ color: 'var(--color-error-chip-text)' }}
          data-mol-id="environments-action-error"
        >
          {t(
            'environments.actionError',
            { message: actionError },
            { defaultValue: 'Request failed: {{message}}' },
          )}
        </p>
      ) : null}

      {loading ? (
        <p className={cm.textMuted}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : error ? (
        <p className={cm.cn('text-sm')} style={{ color: 'var(--color-error-chip-text)' }}>
          {t(
            'environments.error',
            { message: error },
            { defaultValue: 'Could not load environments ({{message}}).' },
          )}
        </p>
      ) : envs.length === 0 ? (
        <div
          className={cm.cn('rounded-xl px-6 py-12 text-center')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px dashed rgba(30, 41, 59, 0.8)',
          }}
        >
          <p className={cm.cn('text-sm text-on-surface-variant')}>
            {t(
              'environments.empty',
              {},
              { defaultValue: 'No environments yet. Create one above.' },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.cn('grid gap-4 lg:grid-cols-2')} data-mol-id="environments-grid">
          {envs.map((env) => {
            const tone = toEnvTone(env.key, env.is_production)
            return (
              <article
                key={env.id}
                className={cm.cn('relative min-w-0 overflow-hidden rounded-2xl p-6')}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid rgba(30, 41, 59, 0.7)',
                  borderLeft: `4px solid ${env.color}`,
                }}
                data-mol-id={`env-card-${env.key}`}
              >
                <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                  <h2 className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
                    {env.name}
                  </h2>
                  <EnvironmentBadge tone={tone} />
                </div>

                <div className={cm.cn('mt-4 grid grid-cols-2 gap-4')}>
                  <div>
                    <p
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('environments.key', {}, { defaultValue: 'Key' })}
                    </p>
                    <p className={cm.cn('font-mono text-base font-extrabold text-on-surface')}>
                      {env.key}
                    </p>
                  </div>
                  <div>
                    <p
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('environments.flags', {}, { defaultValue: 'Flags' })}
                    </p>
                    <p
                      className={cm.cn('font-mono text-2xl font-extrabold text-on-surface')}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {env.flag_count}
                    </p>
                  </div>
                </div>

                <div className={cm.cn('mt-5 space-y-3')}>
                  <SDKKeyDisplay
                    envName={`${env.name} · server`}
                    envTone={tone}
                    sdkKey={env.sdk_key}
                  />
                  <SDKKeyDisplay
                    envName={`${env.name} · client`}
                    envTone={tone}
                    sdkKey={env.client_key}
                  />
                </div>

                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 4))}>
                  {/* Two-step actions: arm → confirm label → commit. Escape
                      disarms, 6s auto-disarm, aria-live announces the arm. */}
                  <ConfirmButton
                    label={t('environments.rotateKeys', {}, { defaultValue: 'Rotate keys' })}
                    confirmLabel={t(
                      'environments.rotateConfirm',
                      { name: env.name },
                      {
                        defaultValue:
                          'Rotate SDK + client keys for {{name}}? Existing integrations will need to be updated.',
                      },
                    )}
                    onConfirm={() => onRotateKeys(env)}
                    color="info"
                    size="sm"
                    disarmSeconds={6}
                    data-mol-id={`env-rotate-${env.key}`}
                  />
                  <ConfirmButton
                    label={t('common.delete', {}, { defaultValue: 'Delete' })}
                    confirmLabel={t(
                      'environments.deleteConfirm',
                      { name: env.name },
                      { defaultValue: 'Delete environment {{name}}?' },
                    )}
                    onConfirm={() => onDelete(env)}
                    color="error"
                    size="sm"
                    disarmSeconds={6}
                    className={cm.cn('ml-auto')}
                    data-mol-id={`env-delete-${env.key}`}
                  />
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
