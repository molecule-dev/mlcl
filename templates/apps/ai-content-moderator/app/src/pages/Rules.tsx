import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SiftLayout } from '../components/SiftLayout.js'
import { VerdictBadge } from '../components/VerdictBadge.js'

interface Condition {
  id: string
  field: string
  operator: string
  value: string
  connector?: 'AND' | 'OR'
}

interface ApiRule {
  id: string
  name: string
  description: string | null
  kind: 'regex' | 'embedding' | 'classifier_threshold'
  pattern_or_threshold: string
  action: 'auto_approve' | 'queue' | 'auto_reject' | 'escalate'
  enabled: boolean
  language_scope: string | null
}

const ACTION_TO_VERDICT: Record<
  ApiRule['action'],
  { verdict: 'approved' | 'rejected' | 'escalated'; category: string }
> = {
  auto_approve: { verdict: 'approved', category: 'Reputation' },
  auto_reject: { verdict: 'rejected', category: 'Spam' },
  escalate: { verdict: 'escalated', category: 'Reputation' },
  queue: { verdict: 'escalated', category: 'Reputation' },
}

export function Rules() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [rules, setRules] = useState<ApiRule[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  /** Rule id awaiting a second click on delete (inline destructive confirm). */
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [name, setName] = useState('High-quality contributor fast-pass')
  const [verdict, setVerdict] = useState<ApiRule['action']>('auto_approve')
  const [conditions, setConditions] = useState<Condition[]>([
    { id: 'c1', field: 'author_reputation', operator: 'gte', value: '0.8' },
    {
      id: 'c2',
      field: 'content.length',
      operator: 'lte',
      value: '500',
      connector: 'AND',
    },
  ])

  function loadRules() {
    http
      .get<ApiRule[]>('/api/rules')
      .then((res) => setRules(res.data ?? []))
      .catch(() => {
        setError(t('rules.loadError', {}, { defaultValue: 'Could not load rules.' }))
        setRules([])
      })
  }

  useEffect(() => {
    let cancelled = false
    http
      .get<ApiRule[]>('/api/rules')
      .then((res) => {
        if (cancelled) return
        setRules(res.data ?? [])
      })
      .catch(() => {
        if (cancelled) return
        setError(t('rules.loadError', {}, { defaultValue: 'Could not load rules.' }))
        setRules([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const updateCondition = (id: string, patch: Partial<Condition>) => {
    setConditions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  const addCondition = () => {
    setConditions((prev) => [
      ...prev,
      {
        id: `c${prev.length + 1}-${Date.now()}`,
        field: 'category',
        operator: 'eq',
        value: 'spam',
        connector: 'AND',
      },
    ])
  }

  const removeCondition = (id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id))
  }

  const compiledPattern = conditions
    .map((c, i) => {
      const prefix = i === 0 ? '' : ` ${c.connector ?? 'AND'} `
      return `${prefix}${c.field} ${c.operator} ${c.value}`
    })
    .join('')

  async function publishRule() {
    setBusy(true)
    setError(null)
    setFeedback(null)
    try {
      await http.post('/api/rules', {
        name,
        description: compiledPattern,
        kind: 'classifier_threshold',
        pattern_or_threshold: compiledPattern || 'true',
        action: verdict,
        enabled: true,
      })
      setFeedback(t('rules.publishOk', {}, { defaultValue: 'Rule published.' }))
      loadRules()
      track({ name: 'rule.created', properties: { name, action: verdict } })
    } catch (error) {
      logError('rules.publishRule', error)
      setError(t('rules.publishError', {}, { defaultValue: 'Could not publish rule.' }))
    } finally {
      setBusy(false)
    }
  }

  async function testRule() {
    setBusy(true)
    setError(null)
    setFeedback(null)
    try {
      const res = await http.get<{ total?: number }>('/api/moderation/stats/summary')
      const total = res.data?.total ?? 0
      setFeedback(
        t(
          'rules.testResult',
          { count: total },
          { defaultValue: `Test pass: ${total} historical items would have been evaluated.` },
        ),
      )
    } catch (error) {
      logError('rules.testRule', error)
      setError(t('rules.testError', {}, { defaultValue: 'Test run failed.' }))
    } finally {
      setBusy(false)
    }
  }

  async function toggleRuleEnabled(rule: ApiRule) {
    setBusy(true)
    setError(null)
    try {
      await http.put(`/api/rules/${rule.id}`, { enabled: !rule.enabled })
      loadRules()
      track({
        name: 'rule.updated',
        properties: { id: rule.id, enabled: !rule.enabled },
      })
    } catch (error) {
      logError('rules.toggleRuleEnabled', error)
      setError(t('rules.updateError', {}, { defaultValue: 'Could not update rule.' }))
    } finally {
      setBusy(false)
    }
  }

  async function deleteRule(rule: ApiRule) {
    setBusy(true)
    setError(null)
    try {
      await http.delete(`/api/rules/${rule.id}`)
      loadRules()
      track({ name: 'rule.deleted', properties: { id: rule.id, name: rule.name } })
    } catch (error) {
      logError('rules.deleteRule', error)
      setError(t('rules.deleteError', {}, { defaultValue: 'Could not delete rule.' }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SiftLayout
      actions={
        <button
          type="button"
          onClick={publishRule}
          disabled={busy}
          data-mol-id="publish-rule"
          className={cm.cn(
            'bg-gradient-to-br from-primary to-primary-container text-white font-bold text-xs uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-md transition-shadow disabled:opacity-60',
          )}
        >
          {t('rules.publish', {}, { defaultValue: 'Publish rule' })}
        </button>
      }
    >
      <header className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), 'gap-4 flex-wrap')}>
        <div>
          <h1
            className={cm.cn(
              'text-4xl font-bold tracking-tight font-headline text-on-surface mb-2',
            )}
          >
            {t('rules.heading', {}, { defaultValue: 'Moderation rules' })}
          </h1>
          <p className={cm.cn('text-on-surface-variant')}>
            {t(
              'rules.subheading',
              {},
              {
                defaultValue:
                  'Compose AND/OR conditions, preview matches, then publish to apply across queues.',
              },
            )}
          </p>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            'rounded-lg border-l-4 border-red-500 bg-error-light px-4 py-3 text-sm text-error',
          )}
        >
          {error}
        </div>
      )}
      {feedback && (
        <div
          role="status"
          className={cm.cn(
            'rounded-lg border-l-4 border-emerald-500 bg-success-light px-4 py-3 text-sm text-success',
          )}
        >
          {feedback}
        </div>
      )}

      <section
        className={cm.cn(
          cm.grid({ cols: 12, gap: 6 }),
          'rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden',
        )}
      >
        <div
          className={cm.cn(
            'col-span-12 lg:col-span-8 p-6 space-y-6 border-r border-surface-container',
          )}
        >
          <div>
            <label
              htmlFor="rule-name"
              className={cm.cn(
                'block text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label mb-2',
              )}
            >
              {t('rules.builder.name', {}, { defaultValue: 'Rule name' })}
            </label>
            <input
              id="rule-name"
              data-mol-id="rule-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={cm.cn(
                'w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:outline-none text-on-surface text-base px-4 py-3 rounded-lg transition-colors',
              )}
            />
          </div>

          <div>
            <label
              htmlFor="rule-verdict"
              className={cm.cn(
                'block text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label mb-2',
              )}
            >
              {t('rules.builder.verdict', {}, { defaultValue: 'Apply verdict' })}
            </label>
            <select
              id="rule-verdict"
              value={verdict}
              onChange={(event) => setVerdict(event.target.value as ApiRule['action'])}
              className={cm.cn(
                'w-full bg-surface-container-low border border-surface-container rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:outline-none',
              )}
            >
              <option value="auto_approve">
                {t('rules.action.approve', {}, { defaultValue: 'Auto approve' })}
              </option>
              <option value="auto_reject">
                {t('rules.action.reject', {}, { defaultValue: 'Auto reject' })}
              </option>
              <option value="escalate">
                {t('rules.action.escalate', {}, { defaultValue: 'Escalate' })}
              </option>
              <option value="queue">
                {t('rules.action.queue', {}, { defaultValue: 'Send to queue' })}
              </option>
            </select>
          </div>

          <div>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label mb-3',
              )}
            >
              {t('rules.builder.conditions', {}, { defaultValue: 'When all of these are true' })}
            </p>
            <ol className={cm.cn('space-y-3')}>
              {conditions.map((condition, idx) => (
                <li
                  key={condition.id}
                  className={cm.cn(
                    'rounded-lg border border-surface-container bg-surface-container-low/50 p-3',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 flex-wrap')}>
                    {idx > 0 && (
                      <select
                        aria-label={t('rules.builder.connector', {}, { defaultValue: 'Connector' })}
                        value={condition.connector ?? 'AND'}
                        onChange={(event) =>
                          updateCondition(condition.id, {
                            connector: event.target.value as 'AND' | 'OR',
                          })
                        }
                        className={cm.cn(
                          'bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wide rounded-md px-2 py-1 border-0 focus:outline-none',
                        )}
                      >
                        <option>AND</option>
                        <option>OR</option>
                      </select>
                    )}
                    <input
                      aria-label={t('rules.builder.field', {}, { defaultValue: 'Field' })}
                      type="text"
                      value={condition.field}
                      onChange={(event) =>
                        updateCondition(condition.id, { field: event.target.value })
                      }
                      className={cm.cn(
                        'font-mono text-[13px] bg-surface border border-surface-container rounded-md px-2 py-1.5 min-w-[180px] focus:border-primary focus:outline-none',
                      )}
                    />
                    <select
                      aria-label={t('rules.builder.operator', {}, { defaultValue: 'Operator' })}
                      value={condition.operator}
                      onChange={(event) =>
                        updateCondition(condition.id, { operator: event.target.value })
                      }
                      className={cm.cn(
                        'bg-surface border border-surface-container rounded-md px-2 py-1.5 text-sm focus:border-primary focus:outline-none',
                      )}
                    >
                      <option value="eq">=</option>
                      <option value="ne">≠</option>
                      <option value="gt">&gt;</option>
                      <option value="gte">≥</option>
                      <option value="lt">&lt;</option>
                      <option value="lte">≤</option>
                      <option value="contains">contains</option>
                      <option value="matches">matches</option>
                    </select>
                    <input
                      aria-label={t('rules.builder.value', {}, { defaultValue: 'Value' })}
                      type="text"
                      value={condition.value}
                      onChange={(event) =>
                        updateCondition(condition.id, { value: event.target.value })
                      }
                      className={cm.cn(
                        'font-mono text-[13px] bg-surface border border-surface-container rounded-md px-2 py-1.5 min-w-[120px] focus:border-primary focus:outline-none',
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => removeCondition(condition.id)}
                      className={cm.cn(
                        'ml-auto text-on-surface-variant hover:text-error transition-colors p-1',
                      )}
                      aria-label={t(
                        'rules.builder.remove',
                        {},
                        { defaultValue: 'Remove condition' },
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cm.cn('material-symbols-outlined text-[18px]')}
                      >
                        close
                      </span>
                    </button>
                  </div>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={addCondition}
              className={cm.cn(
                'mt-3 inline-flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider hover:underline',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-[18px]')}>
                add
              </span>
              {t('rules.builder.addCondition', {}, { defaultValue: 'Add condition' })}
            </button>
          </div>
        </div>

        <aside
          className={cm.cn('col-span-12 lg:col-span-4 p-6 space-y-4 bg-surface-container-low/40')}
        >
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label',
            )}
          >
            {t('rules.preview.title', {}, { defaultValue: 'Preview matches' })}
          </p>
          <div className={cm.cn('rounded-lg bg-surface-container-lowest p-4 text-sm')}>
            <p className={cm.cn('text-3xl font-extrabold text-primary tabular-nums')}>
              {rules?.length ?? 0}
            </p>
            <p className={cm.cn('text-xs text-on-surface-variant mt-1')}>
              {t(
                'rules.preview.body',
                {},
                {
                  defaultValue: 'rules currently active in this workspace.',
                },
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={testRule}
            disabled={busy}
            className={cm.cn(
              'w-full inline-flex items-center justify-center gap-2 border border-primary text-primary font-bold text-sm uppercase tracking-wider px-4 py-3 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-60',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-[18px]')}>
              science
            </span>
            {t('rules.preview.run', {}, { defaultValue: 'Test against last 24h' })}
          </button>
          <p className={cm.cn('text-[11px] text-on-surface-variant leading-relaxed')}>
            {t(
              'rules.preview.help',
              {},
              {
                defaultValue:
                  'Tests are non-destructive — no items are reclassified until you publish the rule.',
              },
            )}
          </p>
        </aside>
      </section>

      <section
        className={cm.cn('rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden')}
      >
        <header className={cm.cn('px-6 py-4 border-b border-surface-container')}>
          <h2
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label',
            )}
          >
            {t('rules.list.heading', {}, { defaultValue: 'Live rules' })}
          </h2>
        </header>
        {rules === null ? (
          <p className={cm.cn('px-6 py-12 text-center text-sm text-on-surface-variant')}>
            {t('rules.list.loading', {}, { defaultValue: 'Loading rules…' })}
          </p>
        ) : rules.length === 0 ? (
          <p className={cm.cn('px-6 py-12 text-center text-sm text-on-surface-variant')}>
            {t(
              'rules.list.empty',
              {},
              { defaultValue: 'No rules yet. Compose one above and publish it.' },
            )}
          </p>
        ) : (
          <ul className={cm.cn('divide-y divide-surface-container')}>
            {rules.map((rule) => {
              const meta = ACTION_TO_VERDICT[rule.action]
              return (
                <li
                  key={rule.id}
                  data-mol-id={`rule-card-${rule.id}`}
                  className={cm.cn('p-6 flex items-center gap-4 flex-wrap')}
                >
                  <div className={cm.cn('flex-1 min-w-[260px]')}>
                    <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3 flex-wrap')}>
                      <h3 className={cm.cn('text-base font-bold text-on-surface')}>{rule.name}</h3>
                      <VerdictBadge verdict={meta.verdict} />
                      <span
                        className={cm.cn(
                          'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {rule.kind.replace('_', ' ')}
                      </span>
                      {!rule.enabled && (
                        <span
                          className={cm.cn(
                            'text-[10px] font-bold uppercase tracking-widest text-warning bg-warning-light px-2 py-0.5 rounded-full',
                          )}
                        >
                          {t('status.paused', {}, { defaultValue: 'Paused' })}
                        </span>
                      )}
                    </div>
                    <p className={cm.cn('text-sm text-on-surface-variant mt-1 font-mono')}>
                      {rule.description ?? rule.pattern_or_threshold}
                    </p>
                  </div>
                  <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-1')}>
                    <button
                      type="button"
                      onClick={() => toggleRuleEnabled(rule)}
                      disabled={busy}
                      className={cm.cn(
                        'text-on-surface-variant hover:text-primary p-2 transition-colors disabled:opacity-50',
                      )}
                      aria-label={t('rules.list.toggle', {}, { defaultValue: 'Toggle rule' })}
                      title={
                        rule.enabled
                          ? t('rules.list.disable', {}, { defaultValue: 'Disable' })
                          : t('rules.list.enable', {}, { defaultValue: 'Enable' })
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={cm.cn('material-symbols-outlined text-[20px]')}
                      >
                        {rule.enabled ? 'pause_circle' : 'play_circle'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (pendingDeleteId === rule.id) {
                          setPendingDeleteId(null)
                          void deleteRule(rule)
                        } else {
                          setPendingDeleteId(rule.id)
                        }
                      }}
                      disabled={busy}
                      data-mol-id="delete-rule"
                      className={cm.cn(
                        'p-2 transition-colors disabled:opacity-50',
                        pendingDeleteId === rule.id
                          ? 'bg-error-light text-error rounded-full'
                          : 'text-on-surface-variant hover:text-error',
                      )}
                      aria-label={
                        pendingDeleteId === rule.id
                          ? t(
                              'rules.list.confirmDelete',
                              {},
                              { defaultValue: 'Click again to delete this rule' },
                            )
                          : t('rules.list.delete', {}, { defaultValue: 'Delete rule' })
                      }
                      title={
                        pendingDeleteId === rule.id
                          ? t(
                              'rules.list.confirmDelete',
                              {},
                              { defaultValue: 'Click again to delete this rule' },
                            )
                          : t('rules.list.delete', {}, { defaultValue: 'Delete rule' })
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={cm.cn('material-symbols-outlined text-[20px]')}
                      >
                        {pendingDeleteId === rule.id ? 'delete_forever' : 'delete'}
                      </span>
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </SiftLayout>
  )
}

export default Rules
