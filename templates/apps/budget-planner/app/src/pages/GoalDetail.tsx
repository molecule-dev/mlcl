import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatDate, formatMoney, getCurrency, getDateFormat } from '../lib/format.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Goal {
  id: string
  name: string
  target_cents: number
  saved_cents: number
  monthly_contribution_cents: number
  target_date?: string | null
  status?: 'active' | 'completed' | 'cancelled'
}

interface Contribution {
  id: string
  contributed_at: string
  amount_cents: number
  source: string
}

function fmt(cents: number): string {
  return formatMoney(cents, getCurrency(), { grouping: false })
}

function fmtDate(iso: string): string {
  return formatDate(iso, getDateFormat())
}

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return Math.min(100, Math.max(0, Math.round((numerator / denominator) * 100)))
}

export function GoalDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [goal, setGoal] = useState<Goal | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contribAmount, setContribAmount] = useState('')
  const [contribSubmitting, setContribSubmitting] = useState(false)
  const [contribError, setContribError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/goals/${id}`).catch(() => null),
      http.get(`/api/goals/${id}/contributions`).catch(() => null),
    ])
      .then(([gRes, cRes]) => {
        if (cancelled) return
        setGoal(unwrapSingle<Goal>(gRes))
        setContributions(unwrapList<Contribution>(cRes))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('goalDetail.loadError', {}, { defaultValue: 'Failed to load goal.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t, reload])

  async function addContribution(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    const dollars = Number(contribAmount)
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setContribError(
        t('goalDetail.contribute.invalid', {}, { defaultValue: 'Enter a positive amount.' }),
      )
      return
    }
    setContribSubmitting(true)
    setContribError(null)
    try {
      await http.post(`/api/goals/${id}/contributions`, { amount_cents: Math.round(dollars * 100) })
      setContribAmount('')
      setReload((n) => n + 1)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setContribError(
        msg ||
          t('goalDetail.contribute.error', {}, { defaultValue: 'Could not save contribution.' }),
      )
    } finally {
      setContribSubmitting(false)
    }
  }

  async function deleteGoal() {
    if (!id) return
    if (
      !confirm(
        t(
          'goalDetail.confirmDelete',
          {},
          { defaultValue: 'Delete this goal? This cannot be undone.' },
        ),
      )
    )
      return
    try {
      await http.delete(`/api/goals/${id}`)
      navigate('/goals')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || t('goalDetail.deleteError', {}, { defaultValue: 'Could not delete goal.' }))
    }
  }

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error || !goal)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-error')}>
        {error ?? t('goalDetail.notFound', {}, { defaultValue: 'Goal not found.' })}
      </div>
    )

  const percent = pct(goal.saved_cents, goal.target_cents)
  const remaining = Math.max(0, goal.target_cents - goal.saved_cents)
  const monthsRemaining =
    goal.monthly_contribution_cents > 0
      ? Math.ceil(remaining / goal.monthly_contribution_cents)
      : null

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <Link to="/goals" className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}>
        ← {t('goalDetail.back', {}, { defaultValue: 'All goals' })}
      </Link>

      <header className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
            {goal.name}
            {goal.status === 'completed' ? (
              <span
                className={cm.cn(
                  cm.sp('ml', 2),
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('extrabold'),
                  'rounded-full bg-success/15 text-success uppercase tracking-widest',
                )}
              >
                {t('common.completed', {}, { defaultValue: 'Completed' })}
              </span>
            ) : null}
          </h1>
          <button
            type="button"
            onClick={() => {
              void deleteGoal()
            }}
            className={cm.cn(cm.textSize('sm'), 'text-error hover:underline')}
            data-testid="goal-delete"
          >
            {t('goalDetail.deleteCta', {}, { defaultValue: 'Delete goal' })}
          </button>
        </div>
        <div className={cm.cn('h-3', cm.roundedFull, 'bg-surface-container overflow-hidden')}>
          <div
            className={cm.cn('h-full bg-primary', cm.roundedFull)}
            style={{ width: `${percent}%` }}
            data-testid="goal-progress-bar"
          />
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('sm'))}>
          <span className={'text-on-surface-variant'} data-testid="goal-saved">
            {fmt(goal.saved_cents)} / {fmt(goal.target_cents)}
          </span>
          <span className={cm.fontWeight('semibold')} data-testid="goal-percent">
            {percent}%
          </span>
        </div>
        <dl className={cm.cn(cm.grid({ cols: 3, gap: 'md' }), cm.textSize('sm'))}>
          <div>
            <dt className={'text-on-surface-variant'}>
              {t('goalDetail.remaining', {}, { defaultValue: 'Remaining' })}
            </dt>
            <dd className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'tabular-nums')}>
              {fmt(remaining)}
            </dd>
          </div>
          <div>
            <dt className={'text-on-surface-variant'}>
              {t('goalDetail.monthly', {}, { defaultValue: 'Monthly target' })}
            </dt>
            <dd className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'tabular-nums')}>
              {fmt(goal.monthly_contribution_cents)}
            </dd>
          </div>
          <div>
            <dt className={'text-on-surface-variant'}>
              {t('goalDetail.eta', {}, { defaultValue: 'Est. months left' })}
            </dt>
            <dd className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'tabular-nums')}>
              {monthsRemaining ?? '—'}
            </dd>
          </div>
        </dl>
        <form
          onSubmit={addContribution}
          className={cm.cn(cm.flex({ align: 'end', gap: 'sm' }), cm.sp('pt', 2), 'flex-wrap')}
        >
          <label className="block">
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'block uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('goalDetail.contribute.label', {}, { defaultValue: 'Add contribution' })}
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={contribAmount}
              onChange={(e) => setContribAmount(e.target.value)}
              placeholder="50.00"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.sp('mt', 1),
                cm.textSize('sm'),
                'w-32 border border-outline-variant rounded-md tabular-nums',
              )}
              data-testid="goal-contribute-amount"
              aria-label={t(
                'goalDetail.contribute.aria',
                {},
                { defaultValue: 'Contribution amount in dollars' },
              )}
            />
          </label>
          <button
            type="submit"
            disabled={contribSubmitting}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'bg-primary text-on-primary rounded-md disabled:opacity-50',
            )}
            data-testid="goal-contribute-submit"
          >
            {contribSubmitting
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('common.add', {}, { defaultValue: 'Add' })}
          </button>
          {contribError ? (
            <p role="alert" className={cm.cn(cm.textSize('xs'), 'text-error w-full')}>
              {contribError}
            </p>
          ) : null}
        </form>
      </header>

      <section className={cm.cn(cm.card(), 'overflow-hidden')}>
        <header
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            'bg-surface-container border-b border-outline-variant',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wide',
            )}
          >
            {t('goalDetail.contributionsHeading', {}, { defaultValue: 'Contributions' })}
          </h2>
        </header>
        {contributions.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
            {t('goalDetail.empty', {}, { defaultValue: 'No contributions yet.' })}
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {contributions.map((c) => (
              <li
                key={c.id}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.flex({ align: 'center', justify: 'between' }),
                )}
              >
                <div>
                  <p className={cm.fontWeight('medium')}>{c.source}</p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {fmtDate(c.contributed_at)}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'tabular-nums text-success',
                  )}
                >
                  +{fmt(c.amount_cents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
