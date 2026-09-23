import { type FormEvent, useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface NewSecretModalProps {
  vaultId: string
  defaultEnvironment?: 'production' | 'staging' | 'development' | 'test'
  onClose: () => void
  onCreated: (id: string) => void | Promise<void>
}

const ENVIRONMENTS = ['production', 'staging', 'development', 'test'] as const
const KINDS = ['token', 'cert', 'db-credential', 'api-key', 'other'] as const

export function NewSecretModal({
  vaultId,
  defaultEnvironment,
  onClose,
  onCreated,
}: NewSecretModalProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [kind, setKind] = useState<(typeof KINDS)[number]>('token')
  const [environment, setEnvironment] = useState<(typeof ENVIRONMENTS)[number]>(
    defaultEnvironment ?? 'production',
  )
  const [rotationDays, setRotationDays] = useState('0')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !key.trim() || !value) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await http.post<{ id: string }>('/api/secrets', {
        vault_id: vaultId,
        name: name.trim(),
        key: key.trim(),
        value,
        kind,
        environment,
        rotation_days: Number.parseInt(rotationDays, 10) || 0,
      })
      const id = (res.data as { id?: string } | undefined)?.id
      if (!id) throw new Error('secret create returned no id')
      // Metadata only — never the secret value (or key name) in telemetry.
      void track({
        name: 'secret.created',
        properties: { secret_id: id, vault_id: vaultId, kind, environment },
      })
      await onCreated(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'create failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="presentation"
      data-mol-id="new-secret-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className={cm.cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-6 backdrop-blur-sm',
      )}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-secret-title"
        className={cm.cn('w-full max-w-lg')}
      >
        <form
          onSubmit={submit}
          className={cm.cn(
            'flex max-h-[calc(100vh-3rem)] w-full flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-xl',
          )}
        >
          <div className={cm.cn('flex items-center justify-between')}>
            <h2
              id="new-secret-title"
              className={cm.cn('font-headline text-lg font-semibold text-text')}
            >
              {t('secrets.new.title', {}, { defaultValue: 'New secret' })}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close', {}, { defaultValue: 'Close' })}
              className={cm.cn('text-muted hover:text-text')}
            >
              <span aria-hidden="true" className="material-symbols-outlined">
                close
              </span>
            </button>
          </div>

          <label
            className={cm.cn(
              'flex flex-col gap-1 font-mono text-xs uppercase tracking-widest text-muted',
            )}
          >
            {t('form.displayName', {}, { defaultValue: 'Display name' })}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-mol-id="new-secret-name"
              required
              maxLength={120}
              className={cm.cn(
                'h-9 w-full rounded-md border border-border bg-background px-3 font-mono text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              )}
            />
          </label>

          <label
            className={cm.cn(
              'flex flex-col gap-1 font-mono text-xs uppercase tracking-widest text-muted',
            )}
          >
            {t('secrets.new.key', {}, { defaultValue: 'Key' })}
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              data-mol-id="new-secret-key"
              required
              maxLength={120}
              placeholder="STRIPE_SECRET_KEY"
              className={cm.cn(
                'h-9 w-full rounded-md border border-border bg-background px-3 font-mono text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              )}
            />
          </label>

          <label
            className={cm.cn(
              'flex flex-col gap-1 font-mono text-xs uppercase tracking-widest text-muted',
            )}
          >
            {t('secrets.new.value', {}, { defaultValue: 'Value (encrypted at rest)' })}
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              data-mol-id="new-secret-value"
              required
              rows={3}
              className={cm.cn(
                'w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              )}
            />
          </label>

          <div className={cm.cn('grid grid-cols-1 gap-3 sm:grid-cols-3')}>
            <label
              className={cm.cn(
                'flex flex-col gap-1 font-mono text-xs uppercase tracking-widest text-muted',
              )}
            >
              {t('form.kind', {}, { defaultValue: 'Kind' })}
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as (typeof KINDS)[number])}
                data-mol-id="new-secret-kind"
                className={cm.cn(
                  'h-9 w-full rounded-md border border-border bg-background px-2 font-mono text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                )}
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label
              className={cm.cn(
                'flex flex-col gap-1 font-mono text-xs uppercase tracking-widest text-muted',
              )}
            >
              {t('secrets.new.environment', {}, { defaultValue: 'Env' })}
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as (typeof ENVIRONMENTS)[number])}
                data-mol-id="new-secret-environment"
                className={cm.cn(
                  'h-9 w-full rounded-md border border-border bg-background px-2 font-mono text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                )}
              >
                {ENVIRONMENTS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </label>
            <label
              className={cm.cn(
                'flex flex-col gap-1 font-mono text-xs uppercase tracking-widest text-muted',
              )}
            >
              {t('secrets.new.rotationDays', {}, { defaultValue: 'Rotate (d)' })}
              <input
                type="number"
                min={0}
                max={3650}
                value={rotationDays}
                onChange={(e) => setRotationDays(e.target.value)}
                data-mol-id="new-secret-rotation-days"
                className={cm.cn(
                  'h-9 w-full rounded-md border border-border bg-background px-3 font-mono text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                )}
              />
            </label>
          </div>

          {error ? (
            <p
              data-mol-id="new-secret-error"
              className={cm.cn(
                'rounded border border-error/40 bg-error/10 px-3 py-2 font-mono text-xs text-error',
              )}
            >
              {error}
            </p>
          ) : null}

          <div className={cm.cn('mt-2 flex items-center justify-end gap-2')}>
            <button
              type="button"
              onClick={onClose}
              className={cm.cn(
                'inline-flex h-8 items-center rounded border border-border bg-surface px-3 font-headline text-xs font-semibold text-text transition-colors hover:border-primary hover:text-primary',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={submitting}
              data-mol-id="new-secret-submit"
              className={cm.cn(
                'inline-flex h-8 items-center gap-1 rounded bg-primary px-3 font-headline text-xs font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              {submitting
                ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                : t('secrets.new.submit', {}, { defaultValue: 'Create secret' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewSecretModal
