import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { type AuditAction, AuditEntry, type AuditEntryData } from '../components/AuditEntry.js'
import { EnvironmentBadge, type EnvTone } from '../components/EnvironmentBadge.js'
import { FlagToggle, type FlagToggleState } from '../components/FlagToggle.js'
import { RolloutBar } from '../components/RolloutBar.js'

/**
 * FlagDetail — signature feature page wired to the live backend. Loads
 * /api/flags/:key (server resolves key → flag), /api/audit-log scoped to
 * this flag's id, supports inline toggle, rollout edit, rule add/remove,
 * and delete with redirect.
 */

interface RuleApi {
  id: string
  attribute: string
  operator: string
  value: unknown
  serve_value?: unknown
  priority?: number
  description?: string
}

interface FlagDetailApi {
  id: string
  key: string
  name: string
  description?: string
  flag_type?: 'boolean' | 'multivariate' | 'string' | 'number'
  state?: 'on' | 'off' | 'killed' | 'scheduled'
  rollout_percentage?: number
  default_value?: unknown
  is_enabled?: boolean
  environment?: string | null
  updated_at?: string
  rules?: RuleApi[]
}

interface AuditApi {
  id: string
  action: string
  actor: string
  actor_email?: string | null
  target?: string | null
  occurred_at?: string
  message?: string
}

const ENV_TONES: ReadonlyArray<EnvTone> = ['production', 'staging', 'development', 'custom']
const toEnvTone = (s: unknown): EnvTone =>
  ENV_TONES.includes(s as EnvTone) ? (s as EnvTone) : 'production'

const toToggleState = (flag: FlagDetailApi): FlagToggleState => {
  if (flag.state === 'killed') return 'killed'
  if (flag.state === 'scheduled') return 'scheduled'
  return flag.is_enabled ? 'on' : 'off'
}

const valueArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(String)
  if (v == null) return []
  return [String(v)]
}

function fmtRelative(iso?: string): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return iso
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const OPERATORS = ['equals', 'in', 'contains', 'starts_with', 'ends_with'] as const

const KNOWN_ACTIONS: ReadonlyArray<AuditAction> = [
  'created',
  'updated',
  'toggled_on',
  'toggled_off',
  'deleted',
  'targeting_changed',
  'rollout_changed',
  'killed',
]
const toAuditAction = (s: string): AuditAction =>
  (KNOWN_ACTIONS as readonly string[]).includes(s) ? (s as AuditAction) : 'updated'

export function FlagDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { key } = useParams<{ key: string }>()

  const [flag, setFlag] = useState<FlagDetailApi | null>(null)
  const [audit, setAudit] = useState<AuditEntryData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAddRule, setShowAddRule] = useState(false)
  const [ruleAttr, setRuleAttr] = useState('country')
  const [ruleOp, setRuleOp] = useState<(typeof OPERATORS)[number]>('in')
  const [ruleValue, setRuleValue] = useState('US, CA')
  const [ruleServe, setRuleServe] = useState('true')
  const [savingRule, setSavingRule] = useState(false)

  const [pendingRollout, setPendingRollout] = useState<number | null>(null)
  const [pendingDescription, setPendingDescription] = useState<string | null>(null)
  const [savingFlag, setSavingFlag] = useState(false)

  const reload = useCallback(async () => {
    if (!key) return
    try {
      const res = await http.get<FlagDetailApi>(`/api/flags/${key}`)
      const data = res.data
      if (!data || typeof data !== 'object' || !data.id) {
        setFlag(null)
        setError('not_found')
        return
      }
      setFlag(data)
      setError(null)
      const auditRes = await http.get<AuditApi[]>(`/api/audit-log?flag_id=${data.id}&limit=20`)
      const arr = Array.isArray(auditRes.data) ? auditRes.data : []
      setAudit(
        arr.map((a) => ({
          id: a.id,
          actor: a.actor_email ?? a.actor ?? 'system',
          action: toAuditAction(a.action),
          target: a.target ?? '',
          created_at: a.occurred_at ?? new Date().toISOString(),
          message: a.message ?? '',
        })),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed')
    }
  }, [http, key])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await reload()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reload])

  const onToggle = async () => {
    if (!flag) return
    try {
      await http.put(`/api/flags/${flag.id}/toggle`, {})
      void track({
        name: 'flag.toggled',
        properties: { flag_id: flag.id, key: flag.key, from_state: toToggleState(flag) },
      })
    } finally {
      await reload()
    }
  }

  const onSaveFlag = async () => {
    if (!flag) return
    setSavingFlag(true)
    try {
      const update: Record<string, unknown> = {}
      if (pendingRollout !== null) update.rollout_percentage = pendingRollout
      if (pendingDescription !== null) update.description = pendingDescription
      if (Object.keys(update).length === 0) return
      await http.put(`/api/flags/${flag.id}`, update)
      void track({
        name: 'flag.updated',
        properties: { flag_id: flag.id, key: flag.key, fields: Object.keys(update) },
      })
      setPendingRollout(null)
      setPendingDescription(null)
      await reload()
    } finally {
      setSavingFlag(false)
    }
  }

  const onAddRule = async () => {
    if (!flag) return
    setSavingRule(true)
    try {
      const value =
        ruleOp === 'in'
          ? ruleValue
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [ruleValue.trim()]
      await http.post(`/api/flags/${flag.id}/rules`, {
        attribute: ruleAttr,
        operator: ruleOp,
        value,
        serve_value: ruleServe === 'true' ? true : ruleServe === 'false' ? false : ruleServe,
        priority: flag.rules?.length ?? 0,
        description: '',
      })
      void track({
        name: 'flag.rule_added',
        properties: { flag_id: flag.id, key: flag.key, attribute: ruleAttr, operator: ruleOp },
      })
      setShowAddRule(false)
      setRuleValue('US, CA')
      await reload()
    } finally {
      setSavingRule(false)
    }
  }

  const onRemoveRule = async (ruleId: string) => {
    if (!flag) return
    try {
      await http.delete(`/api/flags/${flag.id}/rules/${ruleId}`)
      void track({
        name: 'flag.rule_removed',
        properties: { flag_id: flag.id, key: flag.key, rule_id: ruleId },
      })
    } finally {
      await reload()
    }
  }

  const onDeleteFlag = async () => {
    if (!flag) return
    try {
      await http.delete(`/api/flags/${flag.id}`)
      void track({ name: 'flag.deleted', properties: { flag_id: flag.id, key: flag.key } })
      navigate('/flags')
    } catch (_error) {
      // stay on page; error displayed via reload
      await reload()
    }
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
        <p className={cm.textMuted}>
          {t('flagDetail.loading', {}, { defaultValue: 'Loading flag…' })}
        </p>
      </div>
    )
  }

  if (!flag) {
    return (
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
        <p className={cm.cn('text-sm')} style={{ color: 'var(--color-error-chip-text)' }}>
          {error === 'not_found'
            ? t(
                'flagDetail.notFound',
                { key: key ?? '' },
                { defaultValue: 'Flag {{key}} not found.' },
              )
            : t(
                'flagDetail.error',
                { message: error ?? '' },
                { defaultValue: 'Could not load flag ({{message}}).' },
              )}
        </p>
        <Link
          to="/flags"
          className={cm.cn('inline-flex min-h-[28px] items-center self-start font-mono text-xs')}
          style={{ color: 'var(--color-text-link)' }}
        >
          ← {t('flagDetail.backToFlags', {}, { defaultValue: 'Back to flags' })}
        </Link>
      </div>
    )
  }

  const toggleState = toToggleState(flag)
  const flagType = flag.flag_type ?? 'boolean'
  const env = toEnvTone(flag.environment)
  const rollout = pendingRollout ?? flag.rollout_percentage ?? 0
  const description = pendingDescription ?? flag.description ?? ''
  const rules = flag.rules ?? []
  const dirty = pendingRollout !== null || pendingDescription !== null

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))} data-mol-id="page-flag-detail">
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <nav
          className={cm.flex({ align: 'center', gap: 'xs' })}
          aria-label={t('nav.breadcrumb', {}, { defaultValue: 'Breadcrumb' })}
        >
          <Link
            to="/flags"
            className={cm.cn(
              'font-mono text-xs text-on-surface-variant hover:opacity-80 transition-opacity',
            )}
          >
            {t('flagDetail.crumb.flags', {}, { defaultValue: 'Flags' })}
          </Link>
          <span className={cm.cn('text-on-surface-variant')} aria-hidden="true">
            /
          </span>
          <span className={cm.cn('font-mono text-xs text-on-surface')}>{flag.key}</span>
        </nav>
        <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
          <div className={cm.cn('min-w-0')}>
            <p
              className={cm.cn(
                'font-mono text-2xl font-extrabold tracking-tight text-on-surface truncate',
              )}
              data-mol-id="flag-detail-key"
            >
              {flag.key}
            </p>
            <h1 className={cm.cn('text-3xl font-extrabold tracking-tight text-on-surface mt-1')}>
              {flag.name}
            </h1>
            <textarea
              className={cm.cn('mt-2 w-full max-w-2xl rounded-md p-2 text-sm')}
              style={{
                backgroundColor: 'var(--color-code-block)',
                border: '1px solid rgba(30, 41, 59, 0.7)',
                color: 'var(--color-text-code)',
              }}
              rows={2}
              value={description}
              onChange={(e) => setPendingDescription(e.target.value)}
              data-mol-id="flag-detail-description"
              aria-label={t('flagDetail.descriptionAria', {}, { defaultValue: 'Flag description' })}
            />
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
                cm.sp('mt', 3),
              )}
            >
              <span
                className={cm.cn(
                  'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.type', {}, { defaultValue: 'Type' })}
              </span>
              <span
                className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                style={{ color: 'var(--color-accent-chip-text)' }}
              >
                {flagType}
              </span>
              <span className={cm.cn('text-on-surface-variant mx-1')} aria-hidden="true">
                ·
              </span>
              <EnvironmentBadge tone={env} compact />
            </div>
          </div>
          <div
            className={cm.cn(cm.flex({ direction: 'col', align: 'end', gap: 'sm' }), 'shrink-0')}
          >
            <FlagToggle
              state={toggleState}
              onClick={() => void onToggle()}
              ariaLabel={t(
                'flagRow.toggleAria',
                { key: flag.key },
                { defaultValue: 'Toggle {{key}}' },
              )}
            />
            <p className={cm.cn('font-mono text-[10px] text-on-surface-variant')}>
              {t(
                'flagDetail.lastEdit',
                {
                  who: t('flagDetail.you', {}, { defaultValue: 'you' }),
                  when: fmtRelative(flag.updated_at),
                },
                { defaultValue: 'edited by {{who}} · {{when}}' },
              )}
            </p>
            {/* Two-step destructive action: arm → confirm label → commit.
                Escape disarms, 6s auto-disarm, aria-live announces the arm. */}
            <ConfirmButton
              label={t('flagDetail.delete', {}, { defaultValue: 'Delete flag' })}
              confirmLabel={t(
                'flagDetail.deleteConfirm',
                { key: flag.key },
                { defaultValue: 'Delete flag {{key}}? This cannot be undone.' },
              )}
              onConfirm={onDeleteFlag}
              color="error"
              size="sm"
              disarmSeconds={6}
              data-mol-id="flag-detail-delete"
            />
          </div>
        </div>
      </div>

      {/* Rollout */}
      <section
        className={cm.cn('rounded-xl p-6')}
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid rgba(30, 41, 59, 0.7)',
        }}
      >
        <p
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
          )}
        >
          {t('flagDetail.rollout.eyebrow', {}, { defaultValue: 'Rollout' })}
        </p>
        <RolloutBar percent={rollout} />
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 3))}
        >
          <input
            type="range"
            min={0}
            max={100}
            value={rollout}
            onChange={(e) => setPendingRollout(Number(e.target.value))}
            className={cm.cn('flex-1 min-w-[200px] accent-emerald-500')}
            data-mol-id="flag-detail-rollout-slider"
            aria-label={t('flagDetail.rolloutAria', {}, { defaultValue: 'Rollout percentage' })}
          />
          <span
            className={cm.cn('font-mono text-sm font-bold text-on-surface')}
            style={{ fontVariantNumeric: 'tabular-nums', minWidth: '3rem', textAlign: 'right' }}
          >
            {rollout}%
          </span>
          <button
            type="button"
            onClick={() => void onSaveFlag()}
            disabled={!dirty || savingFlag}
            className={cm.cn(
              'inline-flex items-center rounded-md px-4 py-2 font-mono text-xs font-bold transition-colors disabled:opacity-50',
            )}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-on-primary-cta)',
            }}
            data-mol-id="flag-detail-save"
          >
            {savingFlag
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
          </button>
        </div>
      </section>

      {/* Targeting rules + audit — min-w-0 on the grid items so truncating
          audit rows shrink instead of stretching past the viewport. */}
      <div className={cm.cn('grid min-w-0 gap-6 lg:grid-cols-3')}>
        <section
          className={cm.cn('min-w-0 rounded-xl lg:col-span-2')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid rgba(30, 41, 59, 0.7)',
          }}
        >
          <header
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              'px-5 py-4 border-b',
            )}
            style={{ borderColor: 'rgba(30, 41, 59, 0.7)' }}
          >
            <div>
              <p
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('flagDetail.targeting.eyebrow', {}, { defaultValue: 'Order matters' })}
              </p>
              <h2 className={cm.cn('text-lg font-extrabold text-on-surface')}>
                {t('flagDetail.targeting.heading', {}, { defaultValue: 'Targeting rules' })}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAddRule((v) => !v)}
              className={cm.cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-bold transition-colors',
              )}
              style={{
                backgroundColor: 'var(--color-accent-chip-bg)',
                color: 'var(--color-accent-chip-text)',
              }}
              data-mol-id="flag-detail-toggle-add-rule"
            >
              <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                add
              </span>
              {showAddRule
                ? t('common.cancel', {}, { defaultValue: 'Cancel' })
                : t('flagDetail.targeting.addRule', {}, { defaultValue: 'Add rule' })}
            </button>
          </header>

          {showAddRule ? (
            <div
              className={cm.cn('p-5 border-b grid gap-3 sm:grid-cols-[1fr_1fr_2fr_1fr_auto]')}
              style={{ borderColor: 'rgba(30, 41, 59, 0.7)' }}
              data-mol-id="flag-detail-add-rule-form"
            >
              <input
                value={ruleAttr}
                onChange={(e) => setRuleAttr(e.target.value)}
                placeholder={t('rules.attributePh', {}, { defaultValue: 'attribute' })}
                className={cm.cn('h-9 rounded-md px-2 font-mono text-sm')}
                style={{
                  backgroundColor: 'var(--color-code-block)',
                  border: '1px solid rgba(30, 41, 59, 0.8)',
                  color: 'var(--color-text-code)',
                }}
                aria-label={t('rules.attribute', {}, { defaultValue: 'Attribute' })}
              />
              <select
                value={ruleOp}
                onChange={(e) => setRuleOp(e.target.value as (typeof OPERATORS)[number])}
                className={cm.cn('h-9 rounded-md px-2 font-mono text-sm')}
                style={{
                  backgroundColor: 'var(--color-code-block)',
                  border: '1px solid rgba(30, 41, 59, 0.8)',
                  color: 'var(--color-text-code)',
                }}
                aria-label={t('rules.operator', {}, { defaultValue: 'Operator' })}
              >
                {OPERATORS.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
              <input
                value={ruleValue}
                onChange={(e) => setRuleValue(e.target.value)}
                placeholder={t(
                  'rules.valuePh',
                  {},
                  { defaultValue: 'value(s) — comma-separated for in' },
                )}
                className={cm.cn('h-9 rounded-md px-2 font-mono text-sm')}
                style={{
                  backgroundColor: 'var(--color-code-block)',
                  border: '1px solid rgba(30, 41, 59, 0.8)',
                  color: 'var(--color-text-code)',
                }}
                aria-label={t('rules.value', {}, { defaultValue: 'Value' })}
              />
              <input
                value={ruleServe}
                onChange={(e) => setRuleServe(e.target.value)}
                placeholder={t('rules.servePh', {}, { defaultValue: 'serve value' })}
                className={cm.cn('h-9 rounded-md px-2 font-mono text-sm')}
                style={{
                  backgroundColor: 'var(--color-code-block)',
                  border: '1px solid rgba(30, 41, 59, 0.8)',
                  color: 'var(--color-text-code)',
                }}
                aria-label={t('rules.serveValue', {}, { defaultValue: 'Serve' })}
              />
              <button
                type="button"
                onClick={() => void onAddRule()}
                disabled={savingRule}
                className={cm.cn(
                  'inline-flex items-center rounded-md px-4 py-2 font-mono text-xs font-bold transition-colors disabled:opacity-50',
                )}
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-on-primary-cta)',
                }}
                data-mol-id="flag-detail-save-rule"
              >
                {savingRule
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('flagDetail.saveRule', {}, { defaultValue: 'Save rule' })}
              </button>
            </div>
          ) : null}

          <ul className={cm.cn('p-5 space-y-3')} data-mol-id="flag-detail-rules">
            {rules.length === 0 ? (
              <li className={cm.cn('text-sm text-on-surface-variant')}>
                {t(
                  'flagDetail.targeting.empty',
                  {},
                  {
                    defaultValue:
                      'No targeting rules yet — flag will serve its default value to all users.',
                  },
                )}
              </li>
            ) : (
              rules.map((rule) => (
                <li
                  key={rule.id}
                  className={cm.cn('relative rounded-lg p-4')}
                  style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    border: '1px solid rgba(30, 41, 59, 0.8)',
                  }}
                >
                  <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
                    <span
                      className={cm.cn(
                        'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('flagDetail.targeting.if', {}, { defaultValue: 'If' })}
                    </span>
                    <span
                      className={cm.cn('font-mono text-sm rounded px-2 py-1')}
                      style={{
                        backgroundColor: 'var(--color-emerald-chip-bg)',
                        color: 'var(--color-emerald-chip-text)',
                      }}
                    >
                      {rule.attribute}
                    </span>
                    <span
                      className={cm.cn(
                        'font-mono text-xs font-bold text-on-surface-variant uppercase tracking-widest',
                      )}
                    >
                      {rule.operator}
                    </span>
                    <span className={cm.cn('font-mono text-sm text-on-surface')}>
                      [
                      {valueArray(rule.value)
                        .map((v) => `"${v}"`)
                        .join(', ')}
                      ]
                    </span>
                    <span className={cm.cn('text-on-surface-variant')} aria-hidden="true">
                      →
                    </span>
                    <span
                      className={cm.cn('font-mono text-sm rounded px-2 py-1')}
                      style={{
                        backgroundColor: 'var(--color-accent-chip-bg)',
                        color: 'var(--color-accent-chip-text)',
                      }}
                    >
                      {String(rule.serve_value ?? 'true')}
                    </span>
                    <button
                      type="button"
                      onClick={() => void onRemoveRule(rule.id)}
                      className={cm.cn(
                        'ml-auto inline-flex min-h-[28px] min-w-[28px] items-center justify-center rounded-md p-1.5 text-on-surface-variant hover:text-on-surface transition-colors',
                      )}
                      data-mol-id={`flag-detail-remove-rule-${rule.id}`}
                      aria-label={t(
                        'flagDetail.removeRuleAria',
                        {},
                        { defaultValue: 'Remove rule' },
                      )}
                    >
                      <span className={cm.cn('material-symbols-outlined text-base')}>delete</span>
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section
          className={cm.cn('min-w-0 rounded-xl')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid rgba(30, 41, 59, 0.7)',
          }}
        >
          <header
            className={cm.cn('px-5 py-4 border-b')}
            style={{ borderColor: 'rgba(30, 41, 59, 0.7)' }}
          >
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('nav.history', {}, { defaultValue: 'History' })}
            </p>
            <h2 className={cm.cn('text-lg font-extrabold text-on-surface')}>
              {t('nav.auditLog', {}, { defaultValue: 'Audit log' })}
            </h2>
          </header>
          <ul className={cm.cn('py-1')} data-mol-id="flag-detail-audit">
            {audit.length === 0 ? (
              <li className={cm.cn('px-5 py-3 text-sm text-on-surface-variant')}>
                {t('flagDetail.audit.empty', {}, { defaultValue: 'No history yet for this flag.' })}
              </li>
            ) : (
              audit.map((entry, i, arr) => (
                <AuditEntry key={entry.id} entry={entry} noBorder={i === arr.length - 1} />
              ))
            )}
          </ul>
          <Link
            to="/audit"
            className={cm.cn(
              'block px-5 py-3 border-t font-mono text-xs font-bold transition-colors hover:opacity-80',
            )}
            style={{ borderColor: 'rgba(30, 41, 59, 0.7)', color: 'var(--color-text-link)' }}
          >
            {t('flagDetail.audit.viewAll', {}, { defaultValue: 'View full history →' })}
          </Link>
        </section>
      </div>
    </div>
  )
}
