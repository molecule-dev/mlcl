import { useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { RebalanceDriftCard } from '../components/RebalanceDriftCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface AllocationDrift {
  category: string
  target_pct: number
  current_pct: number
  drift_pct: number
  tolerance_pct: number
  current_value_cents: number
  target_value_cents: number
  trade_action: 'buy' | 'sell' | 'hold'
  trade_amount_cents: number
}

const ACTION_LABEL: Record<AllocationDrift['trade_action'], string> = {
  buy: 'Buy',
  sell: 'Sell',
  hold: 'Hold',
}

const ACTION_PILL: Record<AllocationDrift['trade_action'], string> = {
  buy: 'bg-success/15 text-success',
  sell: 'bg-error/15 text-error',
  hold: 'bg-surface-container text-on-surface-variant',
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
  const dollars = Math.abs(num(cents)) / 100
  return `$${dollars.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function Rebalance() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rows, setRows] = useState<AllocationDrift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadCounter, setReloadCounter] = useState(0)
  const [executing, setExecuting] = useState(false)
  const [executeMsg, setExecuteMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/reports/rebalance')
      .then((res) => {
        if (!cancelled) setRows(unwrapList<AllocationDrift>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('rebalance.loadError', {}, { defaultValue: 'Failed to load rebalance plan.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t, reloadCounter])

  async function executePlan() {
    if (executing) return
    setExecuting(true)
    setExecuteMsg(null)
    try {
      const res = await http.post('/api/reports/rebalance/execute', {})
      const body =
        (res as { data?: { created?: unknown[]; skipped?: unknown[] } }).data ??
        (res as { created?: unknown[]; skipped?: unknown[] })
      const created = Array.isArray(body?.created) ? body.created : []
      const skipped = Array.isArray(body?.skipped) ? body.skipped : []
      void track({
        name: 'rebalance.executed',
        properties: { created: created.length, skipped: skipped.length },
      })
      if (created.length === 0) {
        setExecuteMsg(
          t(
            'rebalance.executeSkipped',
            { count: skipped.length },
            {
              defaultValue: 'No trades placed (skipped {{count}}).',
            },
          ),
        )
      } else {
        setExecuteMsg(
          t(
            'rebalance.executeOk',
            { count: created.length },
            {
              defaultValue: 'Placed {{count}} trades. View them on the Transactions page.',
            },
          ),
        )
      }
      setReloadCounter((c) => c + 1)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setExecuteMsg(
        msg || t('rebalance.executeError', {}, { defaultValue: 'Failed to place trades.' }),
      )
    } finally {
      setExecuting(false)
    }
  }

  const outOfBand = useMemo(
    () => rows.filter((r) => Math.abs(num(r.drift_pct)) > num(r.tolerance_pct)),
    [rows],
  )
  const totalTradeAmount = useMemo(
    () => outOfBand.reduce((sum, r) => sum + Math.abs(num(r.trade_amount_cents)), 0),
    [outOfBand],
  )
  const buyCount = outOfBand.filter((r) => r.trade_action === 'buy').length
  const sellCount = outOfBand.filter((r) => r.trade_action === 'sell').length

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-8')}>
      {/* Page header */}
      <header>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'uppercase tracking-widest text-primary-dark',
          )}
        >
          {t(
            'rebalance.eyebrow',
            { appName: APP_NAME },
            { defaultValue: 'Rebalance · {{appName}} advisor' },
          )}
        </p>
        <div
          className={cm.cn(
            cm.flex({ align: 'start', justify: 'between', gap: 'lg' }),
            cm.sp('mt', 1),
            'flex-wrap',
          )}
        >
          <div className={cm.cn('max-w-2xl')}>
            <h1
              className={cm.cn(
                'text-3xl sm:text-4xl font-extrabold tracking-tight break-words min-w-0',
              )}
            >
              {t(
                'rebalance.heading',
                {},
                { defaultValue: 'Bring your portfolio back into discipline' },
              )}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 2),
                'text-on-surface-variant leading-relaxed',
              )}
            >
              {t(
                'rebalance.subheading',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Rows outside their tolerance band trigger trade suggestions. {{appName}} only acts on your confirmation.',
                },
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={executePlan}
            disabled={outOfBand.length === 0 || executing}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'bg-primary text-on-primary rounded-full inline-flex items-center gap-2 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-lg')} aria-hidden="true">
              play_arrow
            </span>
            {executing
              ? t('rebalance.executing', {}, { defaultValue: 'Placing…' })
              : t(
                  'rebalance.executeCta',
                  { count: outOfBand.length },
                  { defaultValue: 'Place {{count}} trades' },
                )}
          </button>
        </div>
        {executeMsg ? (
          <p
            role="status"
            data-testid="rebalance-execute-status"
            className={cm.cn(cm.textSize('sm'), cm.sp('mt', 3), 'text-on-surface-variant')}
          >
            {executeMsg}
          </p>
        ) : null}
      </header>

      {/* Out-of-band summary stats */}
      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 lg:grid-cols-4')}>
        <article
          className={cm.cn(
            cm.sp('p', 5),
            'bg-surface-container-lowest rounded-2xl border border-outline-variant/40',
            cm.accentCard({ tone: 'warning' }),
          )}
        >
          <p className={cm.accentCardLabel({ tone: 'warning' })}>
            {t('rebalance.summary.driftLabel', {}, { defaultValue: 'Out-of-band' })}
          </p>
          <p
            className={cm.cn(
              'text-3xl font-extrabold tabular-nums tracking-tight text-on-surface mt-1',
            )}
          >
            {outOfBand.length}
            <span className={cm.cn('text-base font-bold text-on-surface-variant')}>
              {' '}
              / {rows.length}
            </span>
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-1')}>
            {t('rebalance.summary.driftSub', {}, { defaultValue: 'allocation rows' })}
          </p>
        </article>
        <article
          className={cm.cn(
            cm.sp('p', 5),
            'bg-surface-container-lowest rounded-2xl border border-outline-variant/40',
            cm.accentCard({ tone: 'success' }),
          )}
        >
          <p className={cm.accentCardLabel({ tone: 'success' })}>
            {t('rebalance.summary.buyLabel', {}, { defaultValue: 'Buys' })}
          </p>
          <p
            className={cm.cn(
              'text-3xl font-extrabold tabular-nums tracking-tight text-success mt-1',
            )}
          >
            {buyCount}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-1')}>
            {t('rebalance.summary.buySub', {}, { defaultValue: 'positions to top up' })}
          </p>
        </article>
        <article
          className={cm.cn(
            cm.sp('p', 5),
            'bg-surface-container-lowest rounded-2xl border border-outline-variant/40',
            cm.accentCard({ tone: 'error' }),
          )}
        >
          <p className={cm.accentCardLabel({ tone: 'error' })}>
            {t('rebalance.summary.sellLabel', {}, { defaultValue: 'Sells' })}
          </p>
          <p
            className={cm.cn('text-3xl font-extrabold tabular-nums tracking-tight text-error mt-1')}
          >
            {sellCount}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-1')}>
            {t('rebalance.summary.sellSub', {}, { defaultValue: 'positions to trim' })}
          </p>
        </article>
        <article
          className={cm.cn(
            cm.sp('p', 5),
            'bg-surface-container-lowest rounded-2xl border border-outline-variant/40',
            cm.accentCard({ tone: 'primary' }),
          )}
        >
          <p className={cm.accentCardLabel({ tone: 'primary' })}>
            {t('rebalance.summary.notionalLabel', {}, { defaultValue: 'Total notional' })}
          </p>
          <p
            className={cm.cn(
              'text-3xl font-extrabold tabular-nums tracking-tight text-on-surface mt-1',
            )}
          >
            {fmtUsd(totalTradeAmount)}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-1')}>
            {t('rebalance.summary.notionalSub', {}, { defaultValue: 'across suggested trades' })}
          </p>
        </article>
      </section>

      {/* Drift cards */}
      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : rows.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('rebalance.empty', {}, { defaultValue: 'No targets set yet.' })}
        </p>
      ) : (
        <>
          <section>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
              {t('rebalance.allocationHeading', {}, { defaultValue: 'Allocation drift' })}
            </h2>
            <div
              className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}
            >
              {rows.map((r) => (
                <RebalanceDriftCard
                  key={r.category}
                  category={r.category}
                  currentPct={r.current_pct}
                  targetPct={r.target_pct}
                  driftPct={r.drift_pct}
                  tolerancePct={r.tolerance_pct}
                  tradeAction={r.trade_action}
                  tradeAmountCents={r.trade_amount_cents}
                />
              ))}
            </div>
          </section>

          {/* Trade plan ticket */}
          {outOfBand.length > 0 ? (
            <section
              className={cm.cn(
                cm.sp('p', 8),
                'bg-surface-container-lowest rounded-[2rem] border border-outline-variant/40',
              )}
            >
              <header
                className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}
              >
                <div>
                  <p
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('rebalance.planLabel', {}, { defaultValue: 'Suggested trade plan' })}
                  </p>
                  <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
                    {t(
                      'rebalance.planHeading',
                      { appName: APP_NAME },
                      { defaultValue: '{{appName}} ticket — review before placing' },
                    )}
                  </h2>
                </div>
              </header>
              <ul className={cm.stack(3)}>
                {outOfBand.map((r) => (
                  <li
                    key={r.category}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                      cm.sp('px', 5),
                      cm.sp('py', 4),
                      'bg-surface-container-low rounded-2xl',
                    )}
                  >
                    <div className={cm.flex({ align: 'center', gap: 'md' })}>
                      <span
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.roundedFull,
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'uppercase tracking-widest',
                          ACTION_PILL[r.trade_action],
                        )}
                      >
                        {t(
                          `rebalance.action.${r.trade_action}`,
                          {},
                          { defaultValue: ACTION_LABEL[r.trade_action] },
                        )}
                      </span>
                      <div>
                        <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                          {r.category}
                        </p>
                        <p
                          className={cm.cn(
                            cm.textSize('xs'),
                            'text-on-surface-variant tabular-nums',
                          )}
                        >
                          {t(
                            'rebalance.plan.driftLine',
                            {
                              current: num(r.current_pct).toFixed(1),
                              target: num(r.target_pct).toFixed(0),
                            },
                            { defaultValue: 'currently {{current}}% · target {{target}}%' },
                          )}
                        </p>
                      </div>
                    </div>
                    <p
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'tabular-nums text-on-surface text-lg',
                      )}
                    >
                      {fmtUsd(r.trade_amount_cents)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
