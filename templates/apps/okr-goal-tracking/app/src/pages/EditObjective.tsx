import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { backendMetricType, type ObjectiveWithKrs, toNumber, uiMetricType } from '../lib/api.js'

interface DraftKr {
  id: string // backend id, or 'new-...' for unsaved
  isNew?: boolean
  title: string
  metricType: 'percentage' | 'number' | 'currency' | 'boolean'
  startValue: string
  currentValue: string
  targetValue: string
}

interface AuditEntry {
  id: string
  occurred_at: string
  action: string
  actor_user_id: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

const newKrId = (): string => `new-${Math.random().toString(36).slice(2, 8)}`

export function EditObjective() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()

  const [objective, setObjective] = useState<ObjectiveWithKrs | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [krs, setKrs] = useState<DraftKr[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    let aborted = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get<ObjectiveWithKrs>(`/api/objectives/${id}`),
      http
        .get<AuditEntry[]>(`/api/audit-events?record_id=${id}`)
        .then((r) => r.data)
        .catch(() => [] as AuditEntry[]),
    ])
      .then(([objRes, ev]) => {
        if (aborted) return
        const obj = objRes.data
        setObjective(obj)
        setTitle(obj.title)
        setDescription(obj.description ?? '')
        setKrs(
          (obj.key_results ?? []).map((kr) => ({
            id: kr.id,
            title: kr.title,
            metricType: uiMetricType(kr.metric_type),
            startValue: String(toNumber(kr.start_value)),
            currentValue: String(toNumber(kr.current_value)),
            targetValue: String(toNumber(kr.target_value)),
          })),
        )
        setAudit(Array.isArray(ev) ? ev : [])
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (aborted) return
        setError(err instanceof Error ? err.message : 'Failed to load objective')
        setLoading(false)
      })
    return () => {
      aborted = true
    }
  }, [http, id])

  const updateKr = (krId: string, patch: Partial<DraftKr>) =>
    setKrs((prev) => prev.map((k) => (k.id === krId ? { ...k, ...patch } : k)))

  const removeKr = (krId: string) => setKrs((prev) => prev.filter((k) => k.id !== krId))

  const addKr = () =>
    setKrs((prev) => [
      ...prev,
      {
        id: newKrId(),
        isNew: true,
        title: '',
        metricType: 'percentage',
        startValue: '0',
        currentValue: '0',
        targetValue: '100',
      },
    ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!objective || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      // 1. Update the objective itself.
      await http.patch(`/api/objectives/${objective.id}`, {
        title: title.trim(),
        description: description.trim() || null,
      })
      // 2. Track which existing KR ids are still present; delete the rest.
      const presentIds = new Set(krs.filter((k) => !k.isNew).map((k) => k.id))
      const removed = (objective.key_results ?? []).filter((o) => !presentIds.has(o.id))
      for (const original of removed) {
        await http.delete(`/api/key-results/${original.id}`)
        track({
          name: 'key_result.deleted',
          properties: { key_result_id: original.id, objective_id: objective.id },
        })
      }
      // 3. Update existing KRs and create new ones.
      let position = 0
      for (const kr of krs) {
        position += 1
        const metric = backendMetricType(kr.metricType)
        const start = metric === 'boolean' ? 0 : Number(kr.startValue || '0') || 0
        const target = metric === 'boolean' ? 1 : Number(kr.targetValue || '100') || 100
        const current =
          metric === 'boolean'
            ? Number(kr.currentValue || '0') > 0
              ? 1
              : 0
            : Number(kr.currentValue || '0') || 0
        if (kr.isNew) {
          await http.post('/api/key-results', {
            objective_id: objective.id,
            title: kr.title.trim(),
            metric_type: metric,
            start_value: start,
            target_value: target,
            current_value: current,
            position,
            status: 'on_track',
          })
          track({
            name: 'key_result.created',
            properties: { objective_id: objective.id, metric_type: metric },
          })
        } else {
          await http.patch(`/api/key-results/${kr.id}`, {
            title: kr.title.trim(),
            metric_type: metric,
            start_value: start,
            target_value: target,
            current_value: current,
            position,
          })
          track({
            name: 'key_result.updated',
            properties: { key_result_id: kr.id, objective_id: objective.id },
          })
        }
      }
      track({
        name: 'objective.updated',
        properties: { objective_id: objective.id, key_result_count: krs.length },
      })
      navigate(`/objectives/${objective.id}`)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : 'Could not save changes.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Confirmation is handled inline by the two-step ConfirmButton (arm →
  // confirm) — no blocking window.confirm dialog.
  const handleArchive = async (): Promise<void> => {
    if (!objective) return
    try {
      await http.post(`/api/objectives/${objective.id}/archive`, {})
      track({
        name: 'objective.archived',
        properties: { objective_id: objective.id },
      })
      navigate('/objectives')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not archive objective.')
    }
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.textCenter, 'text-on-surface-variant text-sm')}>
        {t('editObjective.loading', {}, { defaultValue: 'Loading objective…' })}
      </div>
    )
  }

  if (!objective) {
    return (
      <div className={cm.cn(cm.stack(4), cm.sp('p', 8), cm.textCenter)}>
        <p className={cm.cn('text-on-surface-variant')}>
          {error ?? t('editObjective.notFound', {}, { defaultValue: 'Objective not found.' })}
        </p>
        <div>
          <Link to="/objectives" className={cm.cn('text-sm font-bold text-indigo-700')}>
            {t('editObjective.backToList', {}, { defaultValue: 'Back to objectives' })}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.stack(8))}>
      <nav
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('sm'),
          'text-on-surface-variant',
        )}
      >
        <Link to="/objectives" className={cm.cn('hover:text-indigo-700 transition-colors')}>
          {t('editObjective.breadcrumbAll', {}, { defaultValue: 'Objectives' })}
        </Link>
        <span aria-hidden>/</span>
        <Link
          to={`/objectives/${objective.id}`}
          className={cm.cn('hover:text-indigo-700 transition-colors')}
        >
          {objective.title}
        </Link>
        <span aria-hidden>/</span>
        <span className="font-semibold text-on-surface">
          {t('common.edit', {}, { defaultValue: 'Edit' })}
        </span>
      </nav>

      <header className={cm.cn(cm.flex({ justify: 'between', align: 'end', gap: 'md' }))}>
        <div className={cm.cn(cm.stack(2))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-[0.22em] text-indigo-700',
            )}
          >
            {t('editObjective.eyebrow', {}, { defaultValue: 'Edit objective' })}
          </span>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}
            style={{ color: 'var(--color-heading-ink)' }}
          >
            {t(
              'editObjective.heading',
              {},
              { defaultValue: 'Update the outcome, KRs, alignment, or cadence.' },
            )}
          </h1>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <Link
            to={`/objectives/${objective.id}`}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-xl text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </Link>
          <ConfirmButton
            data-mol-id="objective-archive"
            label={t('editObjective.archive', {}, { defaultValue: 'Archive objective' })}
            confirmLabel={t(
              'editObjective.confirmArchive',
              {},
              {
                defaultValue: 'Archive this objective? You can find it later under archived view.',
              },
            )}
            onConfirm={handleArchive}
            disarmSeconds={6}
            color="error"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-xl bg-error-light border border-red-100 hover:bg-error-light transition-colors',
            )}
          />
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-2xl bg-error-light border border-red-200 text-error text-sm',
          )}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }))}>
        <section className={cm.cn('col-span-12 lg:col-span-8', cm.stack(5))}>
          <article
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40',
            )}
          >
            <h2 className={cm.cn(cm.textSize('lg'), 'font-bold tracking-tight text-on-surface')}>
              {t('editObjective.outcomeHeading', {}, { defaultValue: 'Outcome' })}
            </h2>
            <label className={cm.cn(cm.stack(1))}>
              <span
                className={cm.cn(cm.textSize('sm'), 'font-semibold')}
                style={{ color: 'var(--color-heading-ink)' }}
              >
                {t('form.title', {}, { defaultValue: 'Title' })}
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'bg-surface-container-low rounded-xl border border-outline-variant/40 focus:bg-surface focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all',
                )}
              />
            </label>
            <label className={cm.cn(cm.stack(1))}>
              <span
                className={cm.cn(cm.textSize('sm'), 'font-semibold')}
                style={{ color: 'var(--color-heading-ink)' }}
              >
                {t('editObjective.descriptionLabel', {}, { defaultValue: 'Why this matters' })}
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'bg-surface-container-low rounded-xl border border-outline-variant/40 focus:bg-surface focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all leading-relaxed resize-none',
                )}
              />
            </label>
          </article>

          <article
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40',
            )}
          >
            <header className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
              <h2 className={cm.cn(cm.textSize('lg'), 'font-bold tracking-tight text-on-surface')}>
                {t('editObjective.krsHeading', {}, { defaultValue: 'Key results' })}
              </h2>
              <button
                type="button"
                onClick={addKr}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-xl bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors',
                )}
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                {t('editObjective.addKr', {}, { defaultValue: 'Add KR' })}
              </button>
            </header>
            <div className={cm.cn(cm.stack(3))}>
              {krs.map((kr, index) => (
                <div
                  key={kr.id}
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.stack(3),
                    'rounded-xl bg-surface-container-low border border-outline-variant/40',
                  )}
                >
                  <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t(
                        'editObjective.krIndex',
                        { index: index + 1 },
                        { defaultValue: 'KR {{index}}' },
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeKr(kr.id)}
                      className={cm.cn(
                        'text-xs font-bold text-error hover:text-error transition-colors',
                      )}
                    >
                      {t('common.remove', {}, { defaultValue: 'Remove' })}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={kr.title}
                    onChange={(e) => updateKr(kr.id, { title: e.target.value })}
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'bg-surface rounded-lg border border-outline-variant/40 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all',
                    )}
                  />
                  <div className={cm.cn(cm.grid({ cols: 4, gap: 'sm' }))}>
                    <select
                      value={kr.metricType}
                      onChange={(e) =>
                        updateKr(kr.id, { metricType: e.target.value as DraftKr['metricType'] })
                      }
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        'bg-surface rounded-lg border border-outline-variant/40 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all',
                      )}
                    >
                      <option value="percentage">
                        {t('keyResult.metrics.percent', {}, { defaultValue: '% percentage' })}
                      </option>
                      <option value="number">
                        {t('keyResult.metrics.number', {}, { defaultValue: 'Number' })}
                      </option>
                      <option value="currency">
                        {t('keyResult.metrics.currency', {}, { defaultValue: 'Currency $' })}
                      </option>
                      <option value="boolean">
                        {t('keyResult.metrics.boolean', {}, { defaultValue: 'Yes / No' })}
                      </option>
                    </select>
                    <input
                      type="number"
                      value={kr.startValue}
                      onChange={(e) => updateKr(kr.id, { startValue: e.target.value })}
                      placeholder={t('common.start', {}, { defaultValue: 'Start' })}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        'tabular-nums bg-surface rounded-lg border border-outline-variant/40 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all',
                      )}
                    />
                    <input
                      type="number"
                      value={kr.currentValue}
                      onChange={(e) => updateKr(kr.id, { currentValue: e.target.value })}
                      placeholder={t('nav.current', {}, { defaultValue: 'Current' })}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        'tabular-nums bg-surface rounded-lg border border-outline-variant/40 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all',
                      )}
                    />
                    <input
                      type="number"
                      value={kr.targetValue}
                      onChange={(e) => updateKr(kr.id, { targetValue: e.target.value })}
                      placeholder={t(
                        'editObjective.targetPlaceholder',
                        {},
                        { defaultValue: 'Target' },
                      )}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        'tabular-nums bg-surface rounded-lg border border-outline-variant/40 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all',
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <aside className={cm.cn('col-span-12 lg:col-span-4', cm.stack(4))}>
          <div
            className={cm.cn(
              cm.sp('p', 5),
              cm.stack(3),
              'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40',
            )}
          >
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              <span className="material-symbols-outlined text-[16px]">history_edu</span>
              {t('editObjective.recentEditsHeading', {}, { defaultValue: 'Recent edits' })}
            </span>
            {audit.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('editObjective.noEdits', {}, { defaultValue: 'No edits yet.' })}
              </p>
            ) : (
              <ul className={cm.cn(cm.stack(3))}>
                {audit.slice(0, 5).map((entry) => (
                  <li key={entry.id} className={cm.cn(cm.stack(1))}>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface leading-snug')}>
                      {entry.action} ·{' '}
                      {new Date(entry.occurred_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              cm.w('full'),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-xl text-white bg-gradient-to-br from-indigo-600 to-sky-500 shadow-lg shadow-indigo-500/30 hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            {submitting
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
            <span className="material-symbols-outlined text-[18px]">save</span>
          </button>
        </aside>
      </form>
    </div>
  )
}

export default EditObjective
