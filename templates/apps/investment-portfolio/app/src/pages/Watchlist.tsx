import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { WatchlistAddModal } from '../components/WatchlistAddModal.js'
import { unwrapList } from '../lib/unwrap.js'

interface WatchedAsset {
  id?: string
  symbol: string
  name: string
  asset_class: string
  last_price_cents: number
  day_change_pct: number
  alert_threshold_cents?: number | null
  alert_direction?: 'above' | 'below' | null
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function fmtUsd(cents: unknown): string {
  return `$${(num(cents) / 100).toFixed(2)}`
}

function fmtPct(v: unknown): string {
  const n = num(v)
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

function deltaClass(v: unknown): string {
  const n = num(v)
  if (n > 0) return 'text-success'
  if (n < 0) return 'text-error'
  return ''
}

export function Watchlist() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rows, setRows] = useState<WatchedAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [reloadCounter, setReloadCounter] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/watchlist')
      .then((res) => {
        if (!cancelled) setRows(unwrapList<WatchedAsset>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('watchlist.loadError', {}, { defaultValue: 'Failed to load watchlist.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t, reloadCounter])

  const handleSuccess = useCallback(() => setReloadCounter((c) => c + 1), [])

  const removeItem = useCallback(
    async (item: WatchedAsset) => {
      if (!item.id) return
      try {
        await http.delete(`/api/watchlist/${item.id}`)
        void track({ name: 'watchlist.removed', properties: { symbol: item.symbol } })
        setRows((prev) => prev.filter((r) => r.id !== item.id))
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(
          msg ||
            t('watchlist.removeError', {}, { defaultValue: 'Failed to remove from watchlist.' }),
        )
      }
    },
    [http, t],
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'gap-3', 'flex-wrap')}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'min-w-0')}>
          {t('watchlist.heading', {}, { defaultValue: 'Watchlist' })}
        </h1>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          {t('watchlist.addCta', {}, { defaultValue: 'Track ticker' })}
        </button>
      </header>

      <WatchlistAddModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={handleSuccess}
      />

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : rows.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('py', 16),
            cm.textCenter,
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-4xl text-on-surface-variant')}
            aria-hidden="true"
          >
            visibility
          </span>
          <p className="text-on-surface-variant">
            {t('watchlist.empty', {}, { defaultValue: 'No tickers tracked yet.' })}
          </p>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md',
            )}
          >
            {t('watchlist.addCta', {}, { defaultValue: 'Track ticker' })}
          </button>
        </div>
      ) : (
        <section className={cm.cn(cm.card(), 'overflow-x-auto')}>
          <table className={cm.cn('w-full', 'min-w-[560px]')}>
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
                  {t('watchlist.col.symbol', {}, { defaultValue: 'Symbol' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('watchlist.col.last', {}, { defaultValue: 'Last' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('watchlist.col.day', {}, { defaultValue: 'Day' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('watchlist.col.alert', {}, { defaultValue: 'Alert' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}></th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant')}>
              {rows.map((r) => (
                <tr key={r.id ?? r.symbol} className={cm.cn('hover:bg-surface-container')}>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <Link to={`/assets/${r.symbol}`} className={cm.cn('hover:underline')}>
                      <span className={cm.cn(cm.fontWeight('semibold'), 'font-mono')}>
                        {r.symbol}
                      </span>
                      <span
                        className={cm.cn(cm.textSize('xs'), 'block', 'text-on-surface-variant')}
                      >
                        {r.name ?? ''} · {r.asset_class ?? ''}
                      </span>
                    </Link>
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      cm.fontWeight('semibold'),
                    )}
                  >
                    {fmtUsd(r.last_price_cents)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      deltaClass(r.day_change_pct),
                    )}
                  >
                    {fmtPct(r.day_change_pct)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'text-on-surface-variant',
                      'tabular-nums',
                    )}
                  >
                    {r.alert_threshold_cents != null && r.alert_direction
                      ? `${r.alert_direction === 'above' ? '≥' : '≤'} ${fmtUsd(r.alert_threshold_cents)}`
                      : '—'}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                    <ConfirmButton
                      color="error"
                      variant="link"
                      size="sm"
                      label={t('common.remove', {}, { defaultValue: 'Remove' })}
                      confirmLabel={t(
                        'watchlist.confirmRemove',
                        { symbol: r.symbol },
                        { defaultValue: `Remove ${r.symbol} from watchlist?` },
                      )}
                      pendingLabel={t('watchlist.removing', {}, { defaultValue: 'Removing…' })}
                      disarmSeconds={5}
                      onConfirm={() => removeItem(r)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
