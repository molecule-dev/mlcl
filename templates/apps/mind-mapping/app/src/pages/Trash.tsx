import { useCallback, useEffect, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TrashedMap {
  id: string
  title: string
  description: string
  trashed_at: string | null
  updated_at: string
}

const RETENTION_DAYS = 30

const formatRelative = (iso: string | null): { ago: string; remaining: number } => {
  if (!iso) return { ago: '—', remaining: RETENTION_DAYS }
  const date = new Date(iso)
  const ms = Date.now() - date.getTime()
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor(ms / 3600000)
  const ago = days >= 1 ? `${days}d` : hours >= 1 ? `${hours}h` : '<1h'
  const remaining = Math.max(0, RETENTION_DAYS - days)
  return { ago, remaining }
}

export function Trash() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<TrashedMap[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await http.get<TrashedMap[]>('/maps?include_trashed=true&scope=mine')
      const all = res?.data ?? []
      setItems(all.filter((m) => !!m.trashed_at))
      setError(null)
    } catch (error) {
      logError('trash.load', error)
      setError(t('trash.loadError', {}, { defaultValue: 'Could not load trashed maps.' }))
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void load()
  }, [load])

  const handleRestore = async (id: string) => {
    setBusyId(id)
    try {
      await http.post(`/maps/${id}/restore`, {})
      setItems((prev) => prev.filter((m) => m.id !== id))
    } catch (error) {
      logError('trash.restore', error)
      setError(t('trash.restoreError', {}, { defaultValue: 'Could not restore map.' }))
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setBusyId(id)
    try {
      await http.delete(`/maps/${id}`)
      setItems((prev) => prev.filter((m) => m.id !== id))
    } catch (error) {
      logError('trash.delete', error)
      setError(t('trash.deleteError', {}, { defaultValue: 'Could not delete map permanently.' }))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={cm.cn(cm.stack(8), 'max-w-3xl')}>
      <header className={cm.stack(2)}>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('trash.title', {}, { defaultValue: 'Trash' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
          {t(
            'trash.subtitle',
            { days: RETENTION_DAYS },
            {
              defaultValue: 'Maps stay here for {{days}} days before they’re permanently deleted.',
            },
          )}
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'rounded-xl bg-error-container/30 text-on-error-container border border-error/30',
          )}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.textCenter, cm.sp('py', 12))}>
          {t('trash.loading', {}, { defaultValue: 'Loading trash…' })}
        </p>
      ) : items.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 12),
            cm.stack(3),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('3xl'),
              'material-symbols-outlined text-on-surface-variant/60',
            )}
          >
            delete_outline
          </span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('trash.empty.title', {}, { defaultValue: 'Trash is empty' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'trash.empty.body',
              {},
              { defaultValue: 'Nothing waiting to be cleared. Your branches are safe.' },
            )}
          </p>
        </div>
      ) : (
        <ul className={cm.stack(3)} data-mol-id="trash-list">
          {items.map((item) => {
            const meta = formatRelative(item.trashed_at)
            return (
              <li
                key={item.id}
                data-mol-id="trash-item"
                data-map-id={item.id}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                  cm.sp('p', 5),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(11),
                      cm.h(11),
                      'rounded-2xl bg-error-container/40 text-on-error-container shrink-0',
                    )}
                  >
                    <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                      delete
                    </span>
                  </span>
                  <div className={cm.cn(cm.stack(1), 'min-w-0')}>
                    <span
                      className={cm.cn(
                        cm.textSize('base'),
                        cm.fontWeight('bold'),
                        'text-on-surface truncate block',
                      )}
                    >
                      {item.title}
                    </span>
                    {item.description && (
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant truncate block',
                        )}
                      >
                        {item.description}
                      </span>
                    )}
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'uppercase tracking-widest text-on-surface-variant/80',
                      )}
                    >
                      {t(
                        'trash.deletedAgo',
                        { ago: meta.ago, days: meta.remaining },
                        { defaultValue: 'Trashed {{ago}} ago · {{days}} days remaining' },
                      )}
                    </span>
                  </div>
                </div>
                <div className={cm.flex({ gap: 'sm' })}>
                  <button
                    type="button"
                    onClick={() => handleRestore(item.id)}
                    disabled={busyId === item.id}
                    data-mol-id="trash-restore"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      cm.flex({ align: 'center', gap: 'xs' }),
                      'rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-60',
                    )}
                  >
                    <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                      restore
                    </span>
                    {t('trash.restore', {}, { defaultValue: 'Restore' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={busyId === item.id}
                    data-mol-id="trash-delete"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      cm.flex({ align: 'center', gap: 'xs' }),
                      'rounded-xl bg-error-container/30 text-on-error-container hover:bg-error-container/50 transition-colors disabled:opacity-60',
                    )}
                  >
                    <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                      delete_forever
                    </span>
                    {t('trash.deleteForever', {}, { defaultValue: 'Delete forever' })}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default Trash
