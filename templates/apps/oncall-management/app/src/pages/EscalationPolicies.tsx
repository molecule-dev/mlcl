import { useCallback, useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { unwrapList } from '../lib/unwrap.js'

interface RosterMember {
  id: string
  name: string
  email: string
}

interface PolicyRule {
  id?: string
  position: number
  notify_member_id: string | null
  notify_member_name?: string | null
  notify_channel: string | null
  wait_minutes: number
}

interface PolicyRow {
  id: string
  name: string
  description: string
  repeat_cycles: number
  is_active: boolean
  rules: PolicyRule[]
}

interface DraftRule {
  notify_member_id: string
  notify_channel: string
  wait_minutes: number
}

const emptyDraftRule = (): DraftRule => ({
  notify_member_id: '',
  notify_channel: '',
  wait_minutes: 0,
})

export function EscalationPolicies() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [policies, setPolicies] = useState<PolicyRow[]>([])
  const [team, setTeam] = useState<RosterMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // create-form state
  const [name, setName] = useState('')
  const [repeatCycles, setRepeatCycles] = useState(1)
  const [draftRules, setDraftRules] = useState<DraftRule[]>([emptyDraftRule()])

  const refetch = useCallback(() => {
    setLoading(true)
    return http
      .get('/api/escalation-policies')
      .then((res) => setPolicies(unwrapList<PolicyRow>(res)))
      .catch(() =>
        setError(
          t('policies.loadError', {}, { defaultValue: "Couldn't load escalation policies." }),
        ),
      )
      .finally(() => setLoading(false))
  }, [http, t])

  useEffect(() => {
    refetch()
  }, [refetch])

  useEffect(() => {
    http
      .get('/api/team')
      .then((res) => {
        const data = res.data
        const rows = Array.isArray(data)
          ? data
          : ((data as { members?: RosterMember[] })?.members ?? [])
        setTeam(
          rows
            .filter(
              (m) =>
                String((m as { member_status?: string }).member_status ?? 'active') === 'active',
            )
            .map((m) => ({
              id: String(m.id),
              name: String(m.name ?? m.email ?? 'Responder'),
              email: String(m.email ?? ''),
            })),
        )
      })
      .catch(() => {})
  }, [http])

  const onCreate = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await http.post('/api/escalation-policies', {
        name: name.trim(),
        repeat_cycles: repeatCycles,
        rules: draftRules
          .filter((r) => r.notify_member_id || r.notify_channel.trim())
          .map((r) => ({
            notify_member_id: r.notify_member_id || null,
            notify_channel: r.notify_channel.trim() || null,
            wait_minutes: r.wait_minutes,
          })),
      })
      setName('')
      setRepeatCycles(1)
      setDraftRules([emptyDraftRule()])
      void track({
        name: 'escalation_policy.created',
        properties: { name: name.trim(), rule_count: draftRules.length },
      })
      await refetch()
    } catch (_error) {
      setError(t('policies.createError', {}, { defaultValue: "Couldn't create the policy." }))
    } finally {
      setSaving(false)
    }
  }

  /** Toggle a policy's is_active flag. */
  const toggleActive = async (policy: PolicyRow) => {
    setSaving(true)
    setError(null)
    try {
      await http.put(`/api/escalation-policies/${policy.id}`, { is_active: !policy.is_active })
      void track({
        name: 'escalation_policy.updated',
        properties: { policy_id: policy.id, is_active: !policy.is_active },
      })
      await refetch()
    } catch (_error) {
      setError(t('policies.updateError', {}, { defaultValue: "Couldn't update the policy." }))
    } finally {
      setSaving(false)
    }
  }

  /** Two-step inline confirm for the destructive delete. */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const deletePolicy = async (policy: PolicyRow) => {
    if (confirmDeleteId !== policy.id) {
      setConfirmDeleteId(policy.id)
      return
    }
    setConfirmDeleteId(null)
    setSaving(true)
    setError(null)
    try {
      await http.delete(`/api/escalation-policies/${policy.id}`)
      void track({
        name: 'escalation_policy.deleted',
        properties: { policy_id: policy.id },
      })
      await refetch()
    } catch (_error) {
      setError(t('policies.deleteError', {}, { defaultValue: "Couldn't delete the policy." }))
    } finally {
      setSaving(false)
    }
  }

  const ruleTargetLabel = (rule: PolicyRule | DraftRule): string => {
    if ('notify_member_name' in rule && rule.notify_member_name) return rule.notify_member_name
    if (rule.notify_member_id) {
      return team.find((m) => m.id === rule.notify_member_id)?.name ?? 'responder'
    }
    return rule.notify_channel || '—'
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('mb-8')}>
        <p
          className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
          style={{ color: BRAND_COLOR }}
        >
          {t('policies.eyebrow', {}, { defaultValue: '$ klaxon escalation cat' })}
        </p>
        <h1
          className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
          style={{ color: 'var(--color-text)' }}
        >
          {t('nav.escalationPolicies', {}, { defaultValue: 'Escalation Policies' })}
        </h1>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t(
            'policies.subheading',
            {},
            {
              defaultValue: 'Ordered ladders: notify someone, wait N minutes, page the next layer.',
            },
          )}
        </p>
      </header>

      {error ? (
        <p
          className={cm.cn(cm.sp('py', 4), cm.sp('px', 4), 'rounded-md text-xs mb-4')}
          style={{
            color: 'var(--color-severity-warning)',
            backgroundColor: 'var(--color-severity-warning-light)',
            border: '1px solid var(--color-severity-warning)',
          }}
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <p
          className={cm.cn(cm.sp('py', 16), cm.textCenter)}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('policies.loading', {}, { defaultValue: 'Loading policies…' })}
        </p>
      ) : policies.length === 0 ? (
        <div
          className={cm.cn(cm.sp('py', 16), 'text-center mb-8 rounded-xl')}
          style={{
            color: 'var(--color-text-secondary)',
            backgroundColor: 'var(--color-surface)',
            border: '1px dashed var(--color-border)',
          }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl opacity-40 mb-3 inline-block')}
            aria-hidden="true"
          >
            moving
          </span>
          <p className={cm.cn('text-sm')}>
            {t(
              'policies.empty',
              {},
              {
                defaultValue:
                  'No escalation policies yet — create one below so pages have a ladder to climb.',
              },
            )}
          </p>
        </div>
      ) : (
        <ul className={cm.cn('space-y-4 mb-8')}>
          {policies.map((policy) => (
            <li
              key={policy.id}
              data-mol-id={`policy-card-${policy.id}`}
              className={cm.cn('rounded-xl p-5')}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: `1px solid ${policy.is_active ? 'var(--color-border)' : 'var(--color-border-subtle)'}`,
                opacity: policy.is_active ? 1 : 0.7,
              }}
            >
              <div className={cm.cn('flex items-start justify-between gap-4 flex-wrap')}>
                <div>
                  <h2
                    className={cm.cn('text-lg font-bold tracking-tight')}
                    style={{ color: 'var(--color-text)' }}
                  >
                    {policy.name}
                  </h2>
                  <p
                    className={cm.cn('text-sm mt-0.5')}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {policy.description}
                  </p>
                </div>
                <div className={cm.cn('flex items-center gap-2')}>
                  <span
                    className={cm.cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-widest',
                    )}
                    style={{
                      backgroundColor: policy.is_active
                        ? 'var(--color-severity-resolved-light)'
                        : 'color-mix(in srgb, var(--color-severity-muted) 12%, transparent)',
                      color: policy.is_active
                        ? 'var(--color-severity-resolved)'
                        : 'var(--color-text-secondary)',
                    }}
                  >
                    {policy.is_active
                      ? t('policies.active', {}, { defaultValue: 'active' })
                      : t('policies.paused', {}, { defaultValue: 'paused' })}
                  </span>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => toggleActive(policy)}
                    data-mol-id={`policy-toggle-${policy.id}`}
                    className={cm.cn(
                      'px-3 py-1.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-widest border disabled:opacity-50',
                    )}
                    style={{
                      borderColor: 'var(--color-border-secondary)',
                      color: 'var(--color-text)',
                    }}
                  >
                    {policy.is_active
                      ? t('policies.pause', {}, { defaultValue: 'Pause' })
                      : t('policies.activate', {}, { defaultValue: 'Activate' })}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => deletePolicy(policy)}
                    data-mol-id={`policy-delete-${policy.id}`}
                    className={cm.cn(
                      'px-3 py-1.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-widest border disabled:opacity-50',
                    )}
                    style={{
                      borderColor: 'var(--color-severity-critical)',
                      color: 'var(--color-severity-critical)',
                    }}
                  >
                    {confirmDeleteId === policy.id
                      ? t('common.confirmDelete', {}, { defaultValue: 'Confirm delete' })
                      : t('common.delete', {}, { defaultValue: 'Delete' })}
                  </button>
                </div>
              </div>

              <ol className={cm.cn('mt-4 space-y-0')}>
                {policy.rules.map((rule, idx) => (
                  <li key={rule.id ?? idx} className={cm.cn('relative flex gap-3 pb-3')}>
                    {idx < policy.rules.length - 1 ? (
                      <span
                        className={cm.cn('absolute left-[13px] top-7 bottom-0 w-px')}
                        style={{ backgroundColor: 'var(--color-border-secondary)' }}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span
                      className={cm.cn(
                        'h-7 w-7 shrink-0 flex items-center justify-center rounded-full font-mono text-[11px] font-black z-10',
                      )}
                      style={{
                        backgroundColor: 'var(--color-background-tertiary)',
                        border: '1px solid var(--color-border-secondary)',
                        color: BRAND_COLOR,
                      }}
                    >
                      {rule.position + 1}
                    </span>
                    <div
                      className={cm.cn(
                        'flex-1 rounded-lg px-4 py-2 flex items-center gap-3 flex-wrap',
                      )}
                      style={{ backgroundColor: 'var(--color-background-tertiary)' }}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-base')}
                        style={{ color: BRAND_COLOR }}
                        aria-hidden="true"
                      >
                        {rule.notify_member_id ? 'person' : 'campaign'}
                      </span>
                      <span
                        className={cm.cn('text-sm font-bold')}
                        style={{ color: 'var(--color-text)' }}
                      >
                        {ruleTargetLabel(rule)}
                      </span>
                      <span
                        className={cm.cn('ml-auto font-mono text-[11px] uppercase tracking-widest')}
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {rule.wait_minutes === 0
                          ? t('policies.immediately', {}, { defaultValue: 'page immediately' })
                          : t(
                              'policies.waitThen',
                              { minutes: rule.wait_minutes },
                              { defaultValue: 'then wait {{minutes}}m' },
                            )}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
              <p
                className={cm.cn('mt-2 font-mono text-[11px]')}
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {t(
                  'policies.repeatNote',
                  { cycles: policy.repeat_cycles },
                  { defaultValue: 'the whole ladder repeats up to {{cycles}}× before giving up' },
                )}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* Create policy */}
      <section
        className={cm.cn('rounded-xl p-5')}
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <h2
          className={cm.cn('text-lg font-bold tracking-tight mb-4')}
          style={{ color: 'var(--color-text)' }}
        >
          {t('policies.createNew', {}, { defaultValue: 'New escalation policy' })}
        </h2>
        <div className={cm.cn('grid gap-4 md:grid-cols-2 mb-4')}>
          <div>
            <label
              htmlFor="policy-name"
              className={cm.cn(
                'font-mono text-[10px] font-black uppercase tracking-widest block mb-1.5',
              )}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('policies.nameLabel', {}, { defaultValue: 'Name' })}
            </label>
            <input
              id="policy-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cm.cn('w-full px-3 py-2 rounded-md text-sm outline-none')}
              style={{
                backgroundColor: 'var(--color-input-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              placeholder={t(
                'policies.namePlaceholder',
                {},
                { defaultValue: 'e.g. Sev1 war path' },
              )}
              data-mol-id="policy-name-input"
            />
          </div>
          <div>
            <label
              htmlFor="policy-repeat"
              className={cm.cn(
                'font-mono text-[10px] font-black uppercase tracking-widest block mb-1.5',
              )}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('policies.repeatLabel', {}, { defaultValue: 'Repeat cycles' })}
            </label>
            <input
              id="policy-repeat"
              type="number"
              min={1}
              max={10}
              value={repeatCycles}
              onChange={(e) =>
                setRepeatCycles(Math.max(1, Math.min(10, Number(e.target.value) || 1)))
              }
              className={cm.cn('w-full px-3 py-2 rounded-md text-sm outline-none')}
              style={{
                backgroundColor: 'var(--color-input-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              data-mol-id="policy-repeat-input"
            />
          </div>
        </div>

        <p
          className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-2')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('policies.rulesLabel', {}, { defaultValue: 'Rules (in order)' })}
        </p>
        <div className={cm.cn('space-y-2')}>
          {draftRules.map((rule, idx) => (
            <div
              key={idx}
              data-mol-id={`policy-draft-rule-${idx}`}
              className={cm.cn('rounded-lg px-4 py-3 flex items-center gap-3 flex-wrap')}
              style={{ backgroundColor: 'var(--color-background-tertiary)' }}
            >
              <span
                className={cm.cn(
                  'h-6 w-6 shrink-0 flex items-center justify-center rounded-full font-mono text-[11px] font-black',
                )}
                style={{ border: '1px solid var(--color-border-secondary)', color: BRAND_COLOR }}
              >
                {idx + 1}
              </span>
              <select
                value={rule.notify_member_id}
                onChange={(e) =>
                  setDraftRules((prev) =>
                    prev.map((r, i) =>
                      i === idx ? { ...r, notify_member_id: e.target.value } : r,
                    ),
                  )
                }
                aria-label={t('policies.notifyMember', {}, { defaultValue: 'Notify member' })}
                className={cm.cn('px-3 py-2 rounded-md text-sm outline-none')}
                style={{
                  backgroundColor: 'var(--color-input-background)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
                data-mol-id={`policy-rule-member-${idx}`}
              >
                <option value="">
                  {t('policies.pickMember', {}, { defaultValue: 'Member…' })}
                </option>
                {team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={rule.notify_channel}
                onChange={(e) =>
                  setDraftRules((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, notify_channel: e.target.value } : r)),
                  )
                }
                placeholder={t(
                  'policies.channelPlaceholder',
                  {},
                  { defaultValue: '…or channel (#incidents, ops@…)' },
                )}
                aria-label={t('policies.notifyChannel', {}, { defaultValue: 'Or notify channel' })}
                className={cm.cn('px-3 py-2 rounded-md text-sm outline-none flex-1 min-w-[12rem]')}
                style={{
                  backgroundColor: 'var(--color-input-background)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
                data-mol-id={`policy-rule-channel-${idx}`}
              />
              <label
                className={cm.cn(
                  'font-mono text-[10px] uppercase tracking-widest flex items-center gap-1.5',
                )}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t('policies.wait', {}, { defaultValue: 'wait' })}
                <input
                  type="number"
                  min={0}
                  max={1440}
                  value={rule.wait_minutes}
                  onChange={(e) =>
                    setDraftRules((prev) =>
                      prev.map((r, i) =>
                        i === idx
                          ? { ...r, wait_minutes: Math.max(0, Number(e.target.value) || 0) }
                          : r,
                      ),
                    )
                  }
                  className={cm.cn('w-16 px-2 py-1.5 rounded-md text-sm outline-none')}
                  style={{
                    backgroundColor: 'var(--color-input-background)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                  data-mol-id={`policy-rule-wait-${idx}`}
                />
                m
              </label>
            </div>
          ))}
        </div>
        <div className={cm.cn('mt-3 flex items-center gap-2')}>
          <button
            type="button"
            onClick={() => setDraftRules((prev) => [...prev, emptyDraftRule()])}
            data-mol-id="policy-add-rule"
            className={cm.cn(
              'px-3 py-1.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-widest border',
            )}
            style={{ borderColor: 'var(--color-border-secondary)', color: 'var(--color-text)' }}
          >
            + {t('policies.addRule', {}, { defaultValue: 'Add rule' })}
          </button>
          <button
            type="button"
            disabled={!name.trim() || saving}
            onClick={onCreate}
            data-mol-id="policy-create-submit"
            className={cm.cn(
              'px-4 py-1.5 rounded-md font-mono text-xs font-bold uppercase tracking-widest border disabled:opacity-50',
            )}
            style={{ borderColor: BRAND_COLOR, color: BRAND_COLOR }}
          >
            {saving
              ? t('policies.creating', {}, { defaultValue: 'Creating…' })
              : t('policies.createSubmit', {}, { defaultValue: 'Create policy' })}
          </button>
        </div>
      </section>
    </div>
  )
}
