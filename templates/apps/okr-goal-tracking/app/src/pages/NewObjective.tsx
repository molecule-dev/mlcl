import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { backendMetricType, type ObjectiveRow } from '../lib/api.js'

interface DraftKr {
  id: string
  title: string
  metricType: 'percentage' | 'number' | 'currency' | 'boolean'
  startValue: string
  targetValue: string
}

const EMPTY_KR = (): DraftKr => ({
  id: `draft-${Math.random().toString(36).slice(2, 8)}`,
  title: '',
  metricType: 'percentage',
  startValue: '',
  targetValue: '',
})

export function NewObjective() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scope, setScope] = useState<'individual' | 'team' | 'company'>('individual')
  const [krs, setKrs] = useState<DraftKr[]>([EMPTY_KR(), EMPTY_KR()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateKr = (id: string, patch: Partial<DraftKr>) =>
    setKrs((prev) => prev.map((k) => (k.id === id ? { ...k, ...patch } : k)))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError(null)
    if (!title.trim()) {
      setError(
        t('newObjective.errorTitleRequired', {}, { defaultValue: 'Give your objective a title.' }),
      )
      return
    }
    setSubmitting(true)
    try {
      const objRes = await http.post<ObjectiveRow>('/api/objectives', {
        title: title.trim(),
        description: description.trim() || null,
        scope,
        status: 'on_track',
        progress: 0,
      })
      const created: ObjectiveRow | null = objRes.data ?? null
      if (!created?.id) {
        throw new Error('Backend did not return a created objective id')
      }
      const filledKrs = krs.filter((k) => k.title.trim())
      let position = 0
      for (const kr of filledKrs) {
        position += 1
        const metric = backendMetricType(kr.metricType)
        const start = metric === 'boolean' ? 0 : Number(kr.startValue || '0') || 0
        const target = metric === 'boolean' ? 1 : Number(kr.targetValue || '100') || 100
        await http.post('/api/key-results', {
          objective_id: created.id,
          title: kr.title.trim(),
          metric_type: metric,
          start_value: start,
          target_value: target,
          current_value: start,
          position,
          status: 'on_track',
        })
      }
      navigate(`/objectives/${created.id}`)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : 'Could not save objective.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.stack(8))}>
      <header className={cm.cn(cm.flex({ justify: 'between', align: 'end', gap: 'md' }))}>
        <div className={cm.cn(cm.stack(2))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-[0.22em] text-indigo-700',
            )}
          >
            {t('newObjective.eyebrow', {}, { defaultValue: 'New objective · Set the summit' })}
          </span>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}
            style={{ color: 'var(--color-heading-ink)' }}
          >
            {t('newObjective.heading', {}, { defaultValue: 'Define your next climb' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
            {t(
              'newObjective.subheading',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Aspirational outcome, 3–5 measurable KRs, and a cadence. {{appName}} will keep the team honest from there.',
              },
            )}
          </p>
        </div>
        <Link
          to="/objectives"
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
      </header>

      {error && (
        <div
          role="alert"
          data-testid="new-objective-error"
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
            <header className={cm.cn(cm.stack(1))}>
              <h2 className={cm.cn(cm.textSize('lg'), 'font-bold tracking-tight text-on-surface')}>
                {t('newObjective.outcomeHeading', {}, { defaultValue: 'Outcome' })}
              </h2>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'newObjective.outcomeBody',
                  {},
                  {
                    defaultValue:
                      'Lead with a verb. Make it ambitious enough to feel uncomfortable.',
                  },
                )}
              </p>
            </header>
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
                placeholder={t(
                  'newObjective.titlePlaceholder',
                  {},
                  { defaultValue: 'Become the OKR product engineering loves' },
                )}
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
                {t('newObjective.descriptionLabel', {}, { defaultValue: 'Why this matters' })}
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder={t(
                  'newObjective.descriptionPlaceholder',
                  {},
                  { defaultValue: 'Explain the strategic context in 2–3 sentences.' },
                )}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'bg-surface-container-low rounded-xl border border-outline-variant/40 focus:bg-surface focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all leading-relaxed resize-none',
                )}
              />
            </label>
            <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }))}>
              <label className={cm.cn(cm.stack(1))}>
                <span
                  className={cm.cn(cm.textSize('sm'), 'font-semibold')}
                  style={{ color: 'var(--color-heading-ink)' }}
                >
                  {t('newObjective.scopeLabel', {}, { defaultValue: 'Scope' })}
                </span>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as 'individual' | 'team' | 'company')}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'bg-surface-container-low rounded-xl border border-outline-variant/40 focus:bg-surface focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all',
                  )}
                >
                  <option value="individual">
                    {t('objective.scopes.individual', {}, { defaultValue: 'Individual' })}
                  </option>
                  <option value="team">
                    {t('objective.scopes.team', {}, { defaultValue: 'Team' })}
                  </option>
                  <option value="company">
                    {t('objective.scopes.company', {}, { defaultValue: 'Company' })}
                  </option>
                </select>
              </label>
            </div>
          </article>

          <article
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40',
            )}
          >
            <header className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
              <div className={cm.cn(cm.stack(1))}>
                <h2
                  className={cm.cn(cm.textSize('lg'), 'font-bold tracking-tight text-on-surface')}
                >
                  {t('newObjective.krsHeading', {}, { defaultValue: 'Key results' })}
                </h2>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'newObjective.krsBody',
                    {},
                    { defaultValue: '3–5 numeric, time-bound results that prove the objective.' },
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setKrs((prev) => [...prev, EMPTY_KR()])}
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
                {t('newObjective.addKr', {}, { defaultValue: 'Add KR' })}
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
                        'newObjective.krIndex',
                        { index: index + 1 },
                        { defaultValue: 'KR {{index}}' },
                      )}
                    </span>
                    {krs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setKrs((prev) => prev.filter((k) => k.id !== kr.id))}
                        className={cm.cn(
                          'text-xs font-bold text-error hover:text-error transition-colors',
                        )}
                      >
                        {t('common.remove', {}, { defaultValue: 'Remove' })}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={kr.title}
                    onChange={(e) => updateKr(kr.id, { title: e.target.value })}
                    placeholder={t(
                      'newObjective.krTitlePlaceholder',
                      {},
                      { defaultValue: 'NPS from engineering admins ≥ 60' },
                    )}
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'bg-surface rounded-lg border border-outline-variant/40 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all',
                    )}
                  />
                  <div className={cm.cn(cm.grid({ cols: 3, gap: 'sm' }))}>
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
                      disabled={kr.metricType === 'boolean'}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        'tabular-nums bg-surface rounded-lg border border-outline-variant/40 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all disabled:opacity-50',
                      )}
                    />
                    <input
                      type="number"
                      value={kr.targetValue}
                      onChange={(e) => updateKr(kr.id, { targetValue: e.target.value })}
                      placeholder={t(
                        'newObjective.targetPlaceholder',
                        {},
                        { defaultValue: 'Target' },
                      )}
                      disabled={kr.metricType === 'boolean'}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        'tabular-nums bg-surface rounded-lg border border-outline-variant/40 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all disabled:opacity-50',
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
              'rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 border border-indigo-100',
            )}
          >
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-indigo-700',
              )}
            >
              <span className="material-symbols-outlined text-[16px]">school</span>
              {t('newObjective.coachLabel', {}, { defaultValue: 'Coach reminders' })}
            </span>
            {/* Fixed dark ink — the card keeps its light indigo tint in dark
                mode, so theme-flipping `text-on-surface` would be unreadable. */}
            <ul
              className={cm.cn(cm.stack(2), cm.textSize('sm'), 'text-indigo-950 leading-relaxed')}
            >
              <li>
                {t(
                  'newObjective.tip1',
                  {},
                  { defaultValue: 'Lead with a verb: “Become…”, “Cut…”, “Win…”' },
                )}
              </li>
              <li>
                {t(
                  'newObjective.tip2',
                  {},
                  { defaultValue: 'KRs must be measurable — avoid “Improve X.”' },
                )}
              </li>
              <li>
                {t(
                  'newObjective.tip3',
                  {},
                  { defaultValue: '3–5 KRs is the sweet spot. More creates noise.' },
                )}
              </li>
            </ul>
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
              : t('newObjective.submit', {}, { defaultValue: 'Save objective' })}
            <span className="material-symbols-outlined text-[18px]">flag</span>
          </button>
        </aside>
      </form>
    </div>
  )
}

export default NewObjective
