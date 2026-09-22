import { useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useTrashedItems } from '../lib/api.js'
import { itemTypeLabel } from '../lib/itemTypeLabel.js'

function daysLeft(trashedAt: string | null | undefined): number {
  if (!trashedAt) return 30
  const then = new Date(trashedAt).getTime()
  const days = Math.floor((then + 30 * 86_400_000 - Date.now()) / 86_400_000)
  return Math.max(0, days)
}

export function Trash() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [refreshKey, setRefreshKey] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const trashed = useTrashedItems(refreshKey)

  const restore = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      await http.post(`/api/items/${id}/restore`)
      void track({ name: 'credential.restored', properties: { item_id: id } })
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore item')
    } finally {
      setBusyId(null)
    }
  }

  const purge = async (id: string) => {
    if (
      !confirm(
        t(
          'trash.confirmPurge',
          {},
          { defaultValue: 'Permanently delete this item? This cannot be undone.' },
        ),
      )
    )
      return
    setBusyId(id)
    setError(null)
    try {
      await http.delete(`/api/items/${id}`)
      void track({ name: 'credential.deleted', properties: { item_id: id } })
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to purge item')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div
      className={cm.cn(
        'p-4 md:p-8',
        cm.flex({ direction: 'col', gap: 'xl' }),
        cm.maxW('4xl'),
        'mx-auto',
      )}
    >
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'uppercase tracking-widest text-primary-dark',
          )}
        >
          {t('trash.eyebrow', {}, { defaultValue: 'Vault · Trash' })}
        </span>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('trash.heading', {}, { defaultValue: 'Recently deleted' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-2xl')}>
          {t(
            'trash.subhead',
            {},
            {
              defaultValue:
                'Deleted items stay encrypted in the vault for 30 days. Restore or purge before the timer runs out.',
            },
          )}
        </p>
      </header>

      {error && (
        <p className={cm.cn(cm.textSize('xs'), 'text-error')} data-testid="trash-error">
          {error}
        </p>
      )}

      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.flex({ direction: 'col', gap: 'sm' }),
          'bg-surface rounded-2xl border border-primary-light/30 shadow-sm',
        )}
      >
        {trashed.loading && (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 4),
              cm.textCenter,
              'text-on-surface-variant',
            )}
            data-testid="trash-loading"
          >
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        )}
        {!trashed.loading && trashed.data.length === 0 && (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 6),
              cm.textCenter,
              'text-on-surface-variant',
            )}
            data-testid="trash-empty"
          >
            {t('trash.empty', {}, { defaultValue: 'Trash is empty.' })}
          </p>
        )}
        {!trashed.loading && trashed.data.length > 0 && (
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))} data-testid="trash-list">
            {trashed.data.map((it) => {
              const days = daysLeft((it as { trashed_at?: string }).trashed_at)
              return (
                <li
                  key={it.id}
                  data-testid={`trash-item-${it.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('p', 4),
                    'flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-3 rounded-xl border border-primary-light/20 bg-surface-container-low/40 hover:bg-surface-container-low transition-colors',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'w-9 h-9 rounded-lg bg-error-light text-error',
                      )}
                      aria-hidden="true"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </span>
                    <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                      <span
                        className={cm.cn(
                          cm.fontWeight('semibold'),
                          cm.textSize('sm'),
                          'text-on-surface',
                        )}
                      >
                        {it.name}
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {itemTypeLabel(t, it.type)}
                      </span>
                    </div>
                  </div>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.fontWeight('semibold'),
                        cm.textSize('xs'),
                        'rounded-md py-0.5',
                        days <= 7 ? 'bg-error-light text-error' : 'bg-primary-light text-primary',
                      )}
                    >
                      {t(
                        'trash.daysLeft',
                        { count: days },
                        { defaultValue: '{{count}} days left' },
                      )}
                    </span>
                    <button
                      onClick={() => restore(it.id)}
                      disabled={busyId === it.id}
                      type="button"
                      data-testid={`trash-restore-${it.id}`}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.fontWeight('semibold'),
                        cm.textSize('xs'),
                        'rounded-md py-1.5 bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-60',
                      )}
                    >
                      {busyId === it.id
                        ? t('trash.working', {}, { defaultValue: '…' })
                        : t('trash.restore', {}, { defaultValue: 'Restore' })}
                    </button>
                    <button
                      onClick={() => purge(it.id)}
                      disabled={busyId === it.id}
                      type="button"
                      data-testid={`trash-purge-${it.id}`}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.fontWeight('semibold'),
                        cm.textSize('xs'),
                        'rounded-md py-1.5 bg-surface border border-red-200 text-error hover:bg-error-light transition-colors disabled:opacity-60',
                      )}
                    >
                      {t('trash.purge', {}, { defaultValue: 'Purge now' })}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default Trash
