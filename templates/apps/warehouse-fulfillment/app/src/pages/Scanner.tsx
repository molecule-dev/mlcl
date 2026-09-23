import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface RecentScan {
  code: string
  kind: 'order' | 'sku' | 'bin' | 'unknown'
  detail: string
  at: string
  href?: string
}

interface ApiOrder {
  id: string
  externalOrderId?: string
  status?: string
  customerName?: string
}

interface ApiInventoryRow {
  id: string
  name?: string
  sku?: string
  bin?: string | null
}

interface ApiZone {
  id: string
  name?: string
  code?: string | null
  bins?: number | null
}

const STORAGE_KEY = 'wf-scanner-recent'

function readRecent(): RecentScan[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as RecentScan[]) : []
  } catch (_error) {
    // corrupt localStorage data — fall back to empty scan history
    return []
  }
}

function writeRecent(list: RecentScan[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 8)))
  } catch (_error) {
    // storage quota exceeded — recent scans are best-effort, safe to skip
  }
}

export function Scanner() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [recent, setRecent] = useState<RecentScan[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setRecent(readRecent())
  }, [])

  function pushRecent(scan: RecentScan) {
    const next = [scan, ...recent.filter((r) => r.code !== scan.code)].slice(0, 8)
    setRecent(next)
    writeRecent(next)
  }

  async function lookup(raw: string) {
    const q = raw.trim()
    if (!q) return
    setBusy(true)
    setError(null)
    try {
      const upper = q.toUpperCase()
      if (upper.startsWith('SO-') || upper.startsWith('ORD-')) {
        const ordersRes = await http.get<ApiOrder[]>(`/orders`)
        const orders = Array.isArray(ordersRes.data) ? ordersRes.data : []
        const match = orders.find((o) => (o.externalOrderId ?? '').toUpperCase() === upper)
        if (match) {
          pushRecent({
            code: upper,
            kind: 'order',
            detail: `${match.customerName ?? ''} · ${match.status ?? 'pending'}`,
            at: new Date().toISOString(),
            href: `/orders/${match.id}`,
          })
          navigate(`/orders/${match.id}`)
          return
        }
      }
      const invRes = await http.get<ApiInventoryRow[]>('/inventory')
      const inventory = Array.isArray(invRes.data) ? invRes.data : []
      const skuMatch = inventory.find((row) => (row.sku ?? '').toUpperCase() === upper)
      if (skuMatch) {
        pushRecent({
          code: upper,
          kind: 'sku',
          detail: `${skuMatch.name ?? ''} · Bin ${skuMatch.bin ?? '—'}`,
          at: new Date().toISOString(),
          href: `/inventory/${skuMatch.id}`,
        })
        navigate(`/inventory/${skuMatch.id}`)
        return
      }
      const zonesRes = await http.get<ApiZone[]>('/zones')
      const zones = Array.isArray(zonesRes.data) ? zonesRes.data : []
      const zoneMatch = zones.find(
        (z) => (z.code ?? '').toUpperCase() === upper || (z.name ?? '').toUpperCase() === upper,
      )
      if (zoneMatch) {
        pushRecent({
          code: upper,
          kind: 'bin',
          detail: `${zoneMatch.name ?? ''} · ${Number(zoneMatch.bins ?? 0)} bins`,
          at: new Date().toISOString(),
          href: '/locations',
        })
        navigate('/locations')
        return
      }
      setError(
        t(
          'scanner.notFound',
          { code: upper },
          { defaultValue: '"{{code}}" not found in orders, SKUs, or zones.' },
        ),
      )
      pushRecent({
        code: upper,
        kind: 'unknown',
        detail: 'Not found',
        at: new Date().toISOString(),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col' }), 'min-h-screen text-white')}
      style={{
        background:
          'radial-gradient(circle at 50% 0%, var(--color-primary-dark) 0%, var(--color-sidebar) 60%, var(--mol-color-background) 100%)',
      }}
      data-testid="scanner-page"
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
        )}
      >
        <Link
          to="/dashboard"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            'inline-flex min-h-[36px] items-center rounded-md text-[11px] font-bold uppercase tracking-[0.22em] text-white/70 hover:text-white',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[14px]')} data-icon="arrow_back">
            arrow_back
          </span>
          {t('scanner.back', {}, { defaultValue: 'Exit scanner' })}
        </Link>
      </header>

      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'md' }),
          cm.sp('px', 6),
          cm.sp('py', 8),
          'flex-1',
        )}
      >
        <div className={cm.cn(cm.stack(2), 'text-center')}>
          <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.32em] text-secondary')}>
            {t('scanner.eyebrow', {}, { defaultValue: 'Scanner mode' })}
          </p>
          <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight')}>
            {t('scanner.title', {}, { defaultValue: 'Hold. Aim. Pull.' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-white/70 max-w-md')}>
            {t(
              'scanner.body',
              {},
              {
                defaultValue:
                  'Scan an order, SKU, or zone. We auto-detect and jump to the right page.',
              },
            )}
          </p>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            await lookup(code)
            setCode('')
          }}
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'w-full max-w-2xl')}
          data-testid="scanner-form"
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.h(14),
              'flex-1 rounded-xl bg-surface/10 backdrop-blur-md border border-surface/15 focus-within:border-secondary',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[20px] text-white/60')}
              data-icon="keyboard"
            >
              keyboard
            </span>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t(
                'scanner.placeholder',
                {},
                { defaultValue: 'Enter SO-#, SKU, or zone code…' },
              )}
              data-testid="scanner-input"
              className={cm.cn(
                'w-full bg-transparent border-none outline-none font-mono text-lg text-white placeholder:text-white/50',
              )}
            />
          </div>
          <button
            type="submit"
            disabled={!code.trim() || busy}
            data-testid="scanner-submit"
            className={cm.cn(
              cm.h(14),
              cm.sp('px', 6),
              cm.fontWeight('bold'),
              'rounded-xl bg-secondary text-on-secondary shadow shadow-secondary/40 hover:opacity-95 disabled:opacity-50 transition-all uppercase tracking-wider text-sm',
            )}
          >
            {t('scanner.submit', {}, { defaultValue: 'Lookup' })}
          </button>
        </form>

        {error && (
          <p
            className={cm.cn(cm.textSize('sm'), 'text-rose-300 max-w-2xl text-center')}
            data-testid="scanner-error"
          >
            {error}
          </p>
        )}
      </main>

      <section
        className={cm.cn(cm.sp('px', 6), cm.sp('pb', 8), 'mx-auto w-full max-w-2xl', cm.stack(3))}
      >
        <p className={cm.cn('text-[10px] font-bold uppercase tracking-[0.22em] text-white/50')}>
          {t('scanner.recent.eyebrow', {}, { defaultValue: 'Recent scans' })}
        </p>
        {recent.length === 0 ? (
          <p
            className={cm.cn(cm.textSize('xs'), 'text-white/50')}
            data-testid="scanner-recent-empty"
          >
            {t('scanner.recent.empty', {}, { defaultValue: 'No scans yet — try one above.' })}
          </p>
        ) : (
          <div
            className={cm.cn(
              'rounded-2xl bg-surface/5 backdrop-blur border border-surface/10 divide-y divide-white/10 overflow-hidden',
            )}
            data-testid="scanner-recent"
          >
            {recent.map((scan) => {
              const Inner = (
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
                    <span
                      className={cm.cn(
                        'inline-flex h-9 w-9 rounded-full bg-secondary/20 text-secondary flex items-center justify-center',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[18px]')}
                        data-icon="qr_code_2"
                      >
                        qr_code_2
                      </span>
                    </span>
                    <div className={cm.cn('min-w-0', cm.stack(0))}>
                      <p className={cm.cn('font-mono text-sm font-bold text-white truncate')}>
                        {scan.code}
                      </p>
                      <p className={cm.cn('text-[11px] text-white/60 truncate')}>{scan.detail}</p>
                    </div>
                  </div>
                  <span className={cm.cn('text-[10px] uppercase tracking-wider text-white/55')}>
                    {scan.kind}
                  </span>
                </div>
              )
              return scan.href ? (
                <Link
                  key={scan.code + scan.at}
                  to={scan.href}
                  className={cm.cn('block hover:bg-surface/5')}
                >
                  {Inner}
                </Link>
              ) : (
                <div key={scan.code + scan.at}>{Inner}</div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default Scanner
