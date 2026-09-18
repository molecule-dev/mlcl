import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { fmtMoney } from '../lib/money.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface PayStub {
  id: string
  employee_id: string
  employee_name: string
  gross: number | string
  net: number | string
  federal_tax: number | string
  state_tax: number | string
  fica: number | string
  medicare: number | string
  deductions_total: number | string
}

interface PayRun {
  id: string
  pay_date: string
  pay_period_start: string
  pay_period_end: string
  status: string
  total_gross: number | string
  total_taxes: number | string
  total_net: number | string
  total_deductions: number | string
  employee_count: number
  approved_at: string | null
  processed_at: string | null
  stubs?: PayStub[]
}

interface AuditEntry {
  id: string
  actor: string
  action: string
  resource: string
  resource_id: string | null
  timestamp: string
}

const ICON_FOR: Record<string, string> = {
  create: 'add_circle',
  approve: 'verified',
  process: 'send',
  update: 'edit',
  delete: 'delete',
}

export function PayRunDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()

  const [run, setRun] = useState<PayRun | null>(null)
  const [audit, setAudit] = useState<AuditEntry[]>([])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void Promise.all([
      http.get<PayRun>(`/api/pay-runs/${id}`).catch(() => null),
      http.get('/api/audit-log?resource=pay_run').catch(() => null),
    ]).then(([rRes, aRes]) => {
      if (cancelled) return
      const r = unwrapSingle<PayRun>(rRes)
      setRun(r)
      const list = unwrapList<AuditEntry>(aRes).filter((e) => e.resource_id === id)
      setAudit(list)
    })
    return () => {
      cancelled = true
    }
  }, [http, id])

  if (!run) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto)}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      </div>
    )
  }

  const stubs = run.stubs ?? []
  const num = (v: number | string | null | undefined): number => {
    if (v === null || v === undefined) return 0
    const n = typeof v === 'string' ? Number(v) : v
    return Number.isFinite(n) ? n : 0
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <nav
        className={cm.cn(
          cm.textSize('sm'),
          cm.flex({ align: 'center', gap: 'xs' }),
          'text-on-surface-variant',
        )}
      >
        <Link to="/pay-runs" className={cm.cn(`hover:text-primary`)}>
          {t('payRunDetail.crumbRuns', {}, { defaultValue: 'Pay runs' })}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-on-surface font-semibold">{run.id.slice(0, 8)}</span>
      </nav>

      <section
        className={cm.cn(
          cm.sp('p', 8),
          'rounded-[2rem] bg-gradient-to-br from-primary to-secondary text-white relative overflow-hidden',
        )}
      >
        <div className="relative z-10 max-w-2xl">
          <p className={cm.cn(`text-xs font-bold uppercase tracking-widest text-white/80`)}>
            {t(
              `payRunDetail.status.${run.status}`,
              {},
              {
                defaultValue:
                  run.status === 'processed'
                    ? 'Processed pay run'
                    : run.status === 'approved'
                      ? 'Approved pay run'
                      : 'Draft pay run',
              },
            )}
          </p>
          <h1
            className={cm.cn(
              `text-4xl md:text-5xl font-extrabold tracking-tight mt-2 tabular-nums`,
            )}
          >
            {fmtMoney(run.total_gross)}
          </h1>
          <p className={cm.cn(`text-sm text-white/80 mt-2`)}>
            {t(
              'payRunDetail.subtitle',
              {
                date: new Date(run.pay_date).toLocaleDateString(),
                start: new Date(run.pay_period_start).toLocaleDateString(),
                end: new Date(run.pay_period_end).toLocaleDateString(),
              },
              { defaultValue: 'Pay date {{date}} · period {{start}} – {{end}}' },
            )}
          </p>

          <div className={cm.cn(`grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8`)}>
            <Stat
              label={t('payRunDetail.statNet', {}, { defaultValue: 'Net to employees' })}
              value={fmtMoney(run.total_net)}
            />
            <Stat
              label={t('payRunDetail.statTaxes', {}, { defaultValue: 'Taxes withheld' })}
              value={fmtMoney(run.total_taxes)}
            />
            <Stat
              label={t('payRunDetail.statDeductions', {}, { defaultValue: 'Deductions' })}
              value={fmtMoney(run.total_deductions)}
            />
            <Stat
              label={t('payRunDetail.statHeadcount', {}, { defaultValue: 'Employees' })}
              value={String(run.employee_count)}
            />
          </div>
        </div>
        <div
          className={cm.cn(
            `absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/10 blur-3xl`,
          )}
        />
      </section>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-2 rounded-2xl bg-surface-container-lowest shadow-sm space-y-4',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('payRunDetail.entriesHeading', {}, { defaultValue: 'Entries' })}
          </h2>
          {stubs.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'payRunDetail.noStubs',
                {},
                { defaultValue: 'No pay-stubs yet — approve & process to generate them.' },
              )}
            </p>
          ) : (
            <ul className={cm.stack(2)}>
              {stubs.map((stub) => (
                <li
                  key={stub.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('py', 3),
                    cm.sp('px', 4),
                    'rounded-xl bg-surface-container-low',
                  )}
                >
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <span
                      className={cm.cn(
                        cm.w(9),
                        cm.h(9),
                        cm.roundedFull,
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.fontWeight('bold'),
                        cm.textSize('xs'),
                        'text-white bg-gradient-to-br from-primary to-secondary',
                      )}
                    >
                      {stub.employee_name
                        .split(' ')
                        .map((s) => s.charAt(0))
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <div>
                      <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                        {stub.employee_name}
                      </p>
                      <Link
                        to={`/pay-stub/${stub.id}`}
                        className={cm.cn(cm.textSize('xs'), 'text-primary hover:underline')}
                      >
                        {t('payRunDetail.viewStub', {}, { defaultValue: 'View stub →' })}
                      </Link>
                    </div>
                  </div>
                  <div className={cm.flex({ align: 'baseline', gap: 'md' })}>
                    <span
                      className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}
                    >
                      {fmtMoney(stub.gross)}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('bold'),
                        'tabular-nums text-primary',
                      )}
                    >
                      {fmtMoney(stub.net)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest shadow-sm space-y-4',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('nav.status', {}, { defaultValue: 'Status' })}
          </h2>
          <ul className={cm.stack(2)}>
            <CheckLine
              pass={run.status !== 'draft'}
              label={t('payRunDetail.compliance.created', {}, { defaultValue: 'Cycle created' })}
            />
            <CheckLine
              pass={Boolean(run.approved_at)}
              label={t(
                'payRunDetail.compliance.approved',
                {},
                { defaultValue: 'Approved by an owner' },
              )}
            />
            <CheckLine
              pass={Boolean(run.processed_at)}
              label={t(
                'payRunDetail.compliance.processed',
                {},
                { defaultValue: 'Stubs generated' },
              )}
            />
            <CheckLine
              pass={num(run.total_taxes) > 0}
              label={t('payRunDetail.compliance.taxes', {}, { defaultValue: 'Taxes computed' })}
            />
          </ul>
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-3 rounded-2xl bg-surface-container-lowest shadow-sm space-y-4',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('payRunDetail.activityHeading', {}, { defaultValue: 'Activity timeline' })}
          </h2>
          {audit.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'payRunDetail.noActivity',
                {},
                { defaultValue: 'No audit entries for this pay-run yet.' },
              )}
            </p>
          ) : (
            <ol
              className={cm.cn(
                `relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-outline-variant`,
              )}
            >
              {audit.map((entry) => (
                <li key={entry.id} className="relative">
                  <span
                    className={cm.cn(
                      `absolute -left-6 top-1 w-4 h-4 rounded-full bg-primary text-white inline-flex items-center justify-center`,
                    )}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined text-[12px]">
                      {ICON_FOR[entry.action] ?? 'history'}
                    </span>
                  </span>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                    <span className="font-bold">{entry.actor.slice(0, 8)}</span> · {entry.resource}.
                    {entry.action}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div>
      <p className={cm.cn(`text-xs text-white/70 uppercase tracking-widest`)}>{label}</p>
      <p className={cm.cn(`text-xl font-extrabold tabular-nums mt-1`)}>{value}</p>
    </div>
  )
}

function CheckLine({ pass, label }: { pass: boolean; label: string }) {
  const cm = getClassMap()
  return (
    <li className={cm.flex({ align: 'center', gap: 'sm' })}>
      <span
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(6),
          cm.h(6),
          cm.roundedFull,
          pass
            ? 'bg-success-container/40 text-on-success-container'
            : 'bg-surface-container text-on-surface-variant',
        )}
        aria-hidden="true"
      >
        <span className={cm.cn(`material-symbols-outlined text-base`)}>
          {pass ? 'check' : 'pending'}
        </span>
      </span>
      <span className={cm.textSize('sm')}>{label}</span>
    </li>
  )
}
