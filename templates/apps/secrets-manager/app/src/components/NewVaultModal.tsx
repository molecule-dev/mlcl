import { type FormEvent, useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface NewVaultModalProps {
  onClose: () => void
  onCreated: (id: string) => void | Promise<void>
}

const ENVIRONMENTS = ['production', 'staging', 'development', 'test'] as const

export function NewVaultModal({ onClose, onCreated }: NewVaultModalProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [name, setName] = useState('')
  const [environment, setEnvironment] = useState<(typeof ENVIRONMENTS)[number]>('production')
  const [description, setDescription] = useState('')
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
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await http.post<{ id: string }>('/api/vaults', {
        name: name.trim(),
        environment,
        description: description.trim() || undefined,
      })
      const id = (res.data as { id?: string } | undefined)?.id
      if (!id) throw new Error('vault create returned no id')
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
      data-mol-id="new-vault-modal"
      className={cm.cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-6 backdrop-blur-sm',
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-vault-title"
        className={cm.cn('w-full max-w-md')}
      >
        <form
          onSubmit={submit}
          className={cm.cn(
            'flex w-full flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-xl',
          )}
        >
          <div className={cm.cn('flex items-center justify-between')}>
            <h2
              id="new-vault-title"
              className={cm.cn('font-headline text-lg font-semibold text-text')}
            >
              {t('vaults.new.title', {}, { defaultValue: 'New vault' })}
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
            {t('form.name', {}, { defaultValue: 'Name' })}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-mol-id="new-vault-name"
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
            {t('vaults.new.environment', {}, { defaultValue: 'Environment' })}
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as (typeof ENVIRONMENTS)[number])}
              data-mol-id="new-vault-environment"
              className={cm.cn(
                'h-9 w-full rounded-md border border-border bg-background px-3 font-mono text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              )}
            >
              {ENVIRONMENTS.map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </select>
          </label>

          <label
            className={cm.cn(
              'flex flex-col gap-1 font-mono text-xs uppercase tracking-widest text-muted',
            )}
          >
            {t('form.descriptionOptional', {}, { defaultValue: 'Description (optional)' })}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-mol-id="new-vault-description"
              maxLength={2000}
              rows={3}
              className={cm.cn(
                'w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              )}
            />
          </label>

          {error ? (
            <p
              data-mol-id="new-vault-error"
              className={cm.cn(
                'rounded border border-error/40 bg-error/10 px-3 py-2 font-mono text-xs text-error',
              )}
            >
              {error}
            </p>
          ) : null}

          <div className={cm.cn('flex items-center justify-end gap-2')}>
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
              data-mol-id="new-vault-submit"
              className={cm.cn(
                'inline-flex h-8 items-center gap-1 rounded bg-primary px-3 font-headline text-xs font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              {submitting
                ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                : t('vaults.new.submit', {}, { defaultValue: 'Create vault' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewVaultModal
