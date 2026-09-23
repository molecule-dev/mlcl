import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatMoney, getCurrency } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface Goal {
  id: string
  name: string
  target_cents: number
  saved_cents: number
  monthly_contribution_cents: number
  target_date?: string | null
  category_name?: string | null
}

function fmt(cents: number): string {
  return formatMoney(cents, getCurrency(), { grouping: false })
}

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return Math.min(100, Math.max(0, Math.round((numerator / denominator) * 100)))
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

export function Goals() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  function reload() {
    setLoading(true)
    setError(null)
    http
      .get('/api/goals')
      .then((res) => setGoals(unwrapList<Goal>(res)))
      .catch(() => setError(t('goals.loadError', {}, { defaultValue: 'Failed to load goals.' })))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/goals')
      .then((res) => {
        if (!cancelled) setGoals(unwrapList<Goal>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('goals.loadError', {}, { defaultValue: 'Failed to load goals.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('goals.heading', {}, { defaultValue: 'Goals' })}
        </h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          type="button"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          {showForm
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('goals.addCta', {}, { defaultValue: 'New goal' })}
        </button>
      </header>

      {showForm ? (
        <GoalForm
          onSaved={() => {
            setShowForm(false)
            reload()
          }}
        />
      ) : null}

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : goals.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t(
            'goals.empty',
            {},
            { defaultValue: 'No goals yet — start by saving for an emergency fund.' },
          )}
        </p>
      ) : (
        <ul className={cm.grid({ cols: 2, gap: 'md' })}>
          {goals.map((g) => {
            const percent = pct(g.saved_cents, g.target_cents)
            const remaining = Math.max(0, g.target_cents - g.saved_cents)
            return (
              <li key={g.id}>
                <Link
                  to={`/goals/${g.id}`}
                  className={cm.cn(
                    cm.card(),
                    cm.sp('p', 5),
                    'block hover:shadow-md transition-shadow space-y-3',
                  )}
                >
                  <header className={cm.flex({ align: 'center', justify: 'between' })}>
                    <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                      {g.name}
                    </h2>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        cm.textPrimary,
                      )}
                    >
                      {percent}%
                    </span>
                  </header>
                  <div
                    className={cm.cn('h-2', cm.roundedFull, 'bg-surface-container overflow-hidden')}
                  >
                    <div
                      className={cm.cn('h-full bg-primary', cm.roundedFull)}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <dl className={cm.cn(cm.textSize('sm'), 'space-y-1')}>
                    <div className={cm.flex({ align: 'center', justify: 'between' })}>
                      <dt className={'text-on-surface-variant'}>
                        {t('common.saved', {}, { defaultValue: 'Saved' })}
                      </dt>
                      <dd className={cm.cn('tabular-nums', cm.fontWeight('semibold'))}>
                        {fmt(g.saved_cents)} / {fmt(g.target_cents)}
                      </dd>
                    </div>
                    <div className={cm.flex({ align: 'center', justify: 'between' })}>
                      <dt className={'text-on-surface-variant'}>
                        {t('goals.remaining', {}, { defaultValue: 'Remaining' })}
                      </dt>
                      <dd className={cm.cn('tabular-nums', 'text-on-surface-variant')}>
                        {fmt(remaining)}
                      </dd>
                    </div>
                    <div className={cm.flex({ align: 'center', justify: 'between' })}>
                      <dt className={'text-on-surface-variant'}>
                        {t('goals.monthly', {}, { defaultValue: 'Monthly target' })}
                      </dt>
                      <dd className={cm.cn('tabular-nums', 'text-on-surface-variant')}>
                        {fmt(g.monthly_contribution_cents)}
                      </dd>
                    </div>
                    {g.target_date ? (
                      <div className={cm.flex({ align: 'center', justify: 'between' })}>
                        <dt className={'text-on-surface-variant'}>
                          {t('goals.targetDate', {}, { defaultValue: 'Target date' })}
                        </dt>
                        <dd className={'text-on-surface-variant'}>{fmtDate(g.target_date)}</dd>
                      </div>
                    ) : null}
                  </dl>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function GoalForm({ onSaved }: { onSaved: () => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [monthly, setMonthly] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError(t('auth.signup.nameRequired', {}, { defaultValue: 'Name is required.' }))
      return
    }
    const cents = Math.round(Number(target) * 100)
    if (!Number.isFinite(cents) || cents <= 0) {
      setError(t('goals.error.target', {}, { defaultValue: 'Target must be greater than zero.' }))
      return
    }
    setSubmitting(true)
    void http
      .post<{ id?: string }>('/api/goals', {
        name: name.trim(),
        target_cents: cents,
        monthly_contribution_cents: Math.round((Number(monthly) || 0) * 100),
        target_date: targetDate || null,
      })
      .then((created) => {
        track({
          name: 'goal.created',
          properties: {
            goalId: created?.data?.id,
            targetCents: cents,
          },
        })
        onSaved()
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg || t('goals.error.create', {}, { defaultValue: 'Could not create goal.' }))
        setSubmitting(false)
      })
  }

  return (
    <form onSubmit={onSubmit} className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('goals.form.heading', {}, { defaultValue: 'New goal' })}
      </h2>
      <label className="block">
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
        >
          {t('form.name', {}, { defaultValue: 'Name' })}
        </span>
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'w-full border border-outline-variant rounded-md',
          )}
        />
      </label>
      <div className={cm.grid({ cols: 2, gap: 'md' })}>
        <label className="block">
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
          >
            {t('goals.form.target', {}, { defaultValue: 'Target amount' })}
          </span>
          <input
            name="target"
            type="number"
            step="0.01"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="5000"
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'w-full border border-outline-variant rounded-md',
            )}
          />
        </label>
        <label className="block">
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
          >
            {t('goals.form.monthly', {}, { defaultValue: 'Monthly contribution' })}
          </span>
          <input
            name="monthly"
            type="number"
            step="0.01"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            placeholder="200"
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'w-full border border-outline-variant rounded-md',
            )}
          />
        </label>
      </div>
      <label className="block">
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
        >
          {t('goals.form.targetDate', {}, { defaultValue: 'Target date (optional)' })}
        </span>
        <input
          name="target_date"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'w-full border border-outline-variant rounded-md',
          )}
        />
      </label>
      {error ? (
        <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
          {error}
        </p>
      ) : null}
      <div className={cm.flex({ gap: 'sm', justify: 'end' })}>
        <button
          type="submit"
          disabled={submitting}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md disabled:opacity-50',
          )}
        >
          {submitting
            ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
            : t('goals.form.saveCta', {}, { defaultValue: 'Create goal' })}
        </button>
      </div>
    </form>
  )
}
