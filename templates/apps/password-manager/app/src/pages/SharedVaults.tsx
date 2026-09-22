import { useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useVaults } from '../lib/api.js'

const ACCENTS = [
  'bg-emerald-500',
  'bg-primary',
  'bg-amber-500',
  'bg-purple-500',
  'bg-cyan-500',
  'bg-pink-500',
]

export function SharedVaults() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const vaults = useVaults(refreshKey)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await http.post<unknown>('/api/vaults', {
        name: name.trim(),
        description: description.trim(),
      })
      const created =
        res && typeof res === 'object' && 'data' in res
          ? (res as { data: { id?: string } }).data
          : (res as { id?: string } | undefined)
      void track({
        name: 'vault.created',
        properties: { vault_id: created?.id, has_description: Boolean(description.trim()) },
      })
      setName('')
      setDescription('')
      setShowForm(false)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vault')
    } finally {
      setCreating(false)
    }
  }

  const inputClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 2),
    cm.textSize('sm'),
    'rounded-lg border border-primary-light/40 bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all',
  )

  return (
    <div
      className={cm.cn(
        'p-4 md:p-8',
        cm.flex({ direction: 'col', gap: 'xl' }),
        cm.maxW('5xl'),
        'mx-auto',
      )}
    >
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-primary-dark',
            )}
          >
            {t('shared.eyebrow', {}, { defaultValue: 'Vault · Sharing' })}
          </span>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('shared.heading', {}, { defaultValue: 'Shared vaults' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-2xl')}>
            {t(
              'shared.subhead',
              {},
              {
                defaultValue:
                  'Per-user envelope encryption keeps each shared vault sealed end-to-end across every member.',
              },
            )}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          type="button"
          data-testid="shared-toggle-form"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'rounded-lg bg-primary text-white hover:bg-primary-hover shadow-sm transition-colors',
          )}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            {showForm ? 'close' : 'add'}
          </span>
          {showForm
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('shared.newVault', {}, { defaultValue: 'New shared vault' })}
        </button>
      </header>

      {showForm && (
        <form
          onSubmit={submit}
          data-testid="shared-create-form"
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', gap: 'sm' }),
            'bg-surface rounded-2xl border border-primary-light/30 shadow-sm',
          )}
        >
          <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('shared.formHeading', {}, { defaultValue: 'New shared vault' })}
          </h2>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('shared.namePlaceholder', {}, { defaultValue: 'Family secrets' })}
            className={inputClass}
            data-testid="shared-form-name"
            required
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('shared.descPlaceholder', {}, { defaultValue: 'Optional description' })}
            className={inputClass}
            data-testid="shared-form-description"
          />
          {error && (
            <p className={cm.cn(cm.textSize('xs'), 'text-error')} data-testid="shared-form-error">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={creating || !name.trim()}
            data-testid="shared-form-submit"
            className={cm.cn(
              cm.sp('px', 4),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'self-start rounded-lg py-2 bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-60',
            )}
          >
            {creating
              ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
              : t('shared.create', {}, { defaultValue: 'Create vault' })}
          </button>
        </form>
      )}

      {vaults.loading && (
        <p
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          data-testid="shared-loading"
        >
          {t('shared.loading', {}, { defaultValue: 'Loading vaults…' })}
        </p>
      )}

      {!vaults.loading && vaults.data.length === 0 && (
        <div
          data-testid="shared-empty"
          className={cm.cn(
            cm.sp('p', 6),
            cm.textCenter,
            cm.flex({ direction: 'col', gap: 'sm' }),
            'bg-surface rounded-2xl border border-dashed border-primary-light/40',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('shared.empty', {}, { defaultValue: 'You have not created any shared vaults yet.' })}
          </span>
        </div>
      )}

      {!vaults.loading && vaults.data.length > 0 && (
        <section
          className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2')}
          data-testid="shared-list"
        >
          {vaults.data.map((v, i) => (
            <Link
              key={v.id}
              to={`/shared/${v.id}`}
              data-testid={`shared-vault-${v.id}`}
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.sp('p', 6),
                'bg-surface rounded-2xl border-l-4 border-primary shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <span
                    className={cm.cn('w-3 h-3 rounded-full', ACCENTS[i % ACCENTS.length])}
                    aria-hidden="true"
                  />
                  <h3
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.textSize('lg'),
                      'tracking-tight text-on-surface group-hover:text-primary transition-colors',
                    )}
                  >
                    {v.name}
                  </h3>
                </div>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('xs'),
                    'rounded-md py-0.5 bg-primary-light text-primary',
                  )}
                >
                  {t('shared.role.owner', {}, { defaultValue: 'Owner' })}
                </span>
              </div>
              {v.description && (
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {v.description}
                </p>
              )}
            </Link>
          ))}
        </section>
      )}
    </div>
  )
}

export default SharedVaults
