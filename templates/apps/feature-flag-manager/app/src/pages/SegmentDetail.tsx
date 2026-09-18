import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type AuditAction, AuditEntry, type AuditEntryData } from '../components/AuditEntry.js'

const TABS = ['rules', 'used_in', 'audit'] as const
type Tab = (typeof TABS)[number]

interface SegmentApi {
  id: string
  key: string
  name: string
  description?: string
  conditions: unknown
  created_at?: string
  updated_at?: string
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

interface FlagApi {
  id: string
  key: string
  state?: string
  is_enabled?: boolean
  environment?: string | null
  rules?: Array<{ attribute?: string; value?: unknown }>
}

/**
 * True when any targeting rule on the flag references this segment
 * (attribute `segment`/`segments` with the segment key among its values).
 * Rule values are jsonb and may arrive either parsed or JSON-encoded.
 */
const referencesSegment = (rules: FlagApi['rules'], segmentKey: string): boolean => {
  if (!Array.isArray(rules)) return false
  return rules.some((rule) => {
    const attr = typeof rule.attribute === 'string' ? rule.attribute.toLowerCase() : ''
    if (attr !== 'segment' && attr !== 'segments') return false
    let v = rule.value
    if (typeof v === 'string') {
      try {
        v = JSON.parse(v)
      } catch (_error) {
        // Not JSON — treat the raw string as a single value.
      }
    }
    const values = Array.isArray(v) ? v.map(String) : v == null ? [] : [String(v)]
    return values.includes(segmentKey)
  })
}

interface RuleRow {
  id: string
  attribute: string
  operator: string
  values: string[]
}

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

const toRuleRows = (conds: unknown): RuleRow[] => {
  if (!Array.isArray(conds)) return []
  return conds.map((c, idx): RuleRow => {
    const obj = (c ?? {}) as Record<string, unknown>
    const attribute = typeof obj.attribute === 'string' ? obj.attribute : ''
    const operator = typeof obj.operator === 'string' ? obj.operator : 'is'
    const v = obj.value
    const values = Array.isArray(v) ? v.map(String) : v == null ? [] : [String(v)]
    return { id: `r${idx}`, attribute, operator, values }
  })
}

const OPERATORS = ['equals', 'in', 'contains', 'starts_with', 'ends_with', 'is'] as const

export function SegmentDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { key } = useParams<{ key: string }>()
  const [tab, setTab] = useState<Tab>('rules')

  const [segment, setSegment] = useState<SegmentApi | null>(null)
  const [audit, setAudit] = useState<AuditEntryData[]>([])
  const [flags, setFlags] = useState<FlagApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAddRule, setShowAddRule] = useState(false)
  const [ruleAttr, setRuleAttr] = useState('country')
  const [ruleOp, setRuleOp] = useState<(typeof OPERATORS)[number]>('in')
  const [ruleValue, setRuleValue] = useState('US, CA')
  const [savingRule, setSavingRule] = useState(false)

  const [pendingDescription, setPendingDescription] = useState<string | null>(null)
  const [savingSegment, setSavingSegment] = useState(false)

  const reload = useCallback(async () => {
    if (!key) return
    try {
      const segRes = await http.get<SegmentApi>(`/api/segments/${key}`)
      const data = segRes.data
      if (!data || typeof data !== 'object' || !data.id) {
        setSegment(null)
        setError('not_found')
        return
      }
      setSegment(data)
      setError(null)

      const auditRes = await http.get<AuditApi[]>(
        `/api/audit-log?target=${encodeURIComponent(key)}&limit=20`,
      )
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

      // "Used in" must only list flags whose targeting rules actually
      // reference this segment — listing every flag was misleading. The
      // list endpoint omits rules, so fetch each flag's detail (bounded).
      const flagsRes = await http.get<FlagApi[]>('/api/flags')
      const flagsArr = Array.isArray(flagsRes.data) ? flagsRes.data : []
      const details = await Promise.all(
        flagsArr.slice(0, 25).map(async (f) => {
          try {
            const res = await http.get<FlagApi>(`/api/flags/${f.key}`)
            return res.data ?? null
          } catch (_error) {
            return null
          }
        }),
      )
      setFlags(
        details.filter((d): d is FlagApi => d != null && referencesSegment(d.rules, data.key)),
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

  const onAddRule = async () => {
    if (!segment) return
    setSavingRule(true)
    try {
      const value =
        ruleOp === 'in'
          ? ruleValue
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [ruleValue.trim()]
      const next = [
        ...(Array.isArray(segment.conditions) ? segment.conditions : []),
        { attribute: ruleAttr, operator: ruleOp, value },
      ]
      await http.put(`/api/segments/${segment.id}`, { conditions: next })
      setShowAddRule(false)
      setRuleValue('US, CA')
      await reload()
    } finally {
      setSavingRule(false)
    }
  }

  const onRemoveRule = async (idx: number) => {
    if (!segment) return
    const conds = Array.isArray(segment.conditions) ? segment.conditions : []
    const next = conds.filter((_, i) => i !== idx)
    await http.put(`/api/segments/${segment.id}`, { conditions: next })
    await reload()
  }

  const onSaveDescription = async () => {
    if (!segment || pendingDescription === null) return
    setSavingSegment(true)
    try {
      await http.put(`/api/segments/${segment.id}`, { description: pendingDescription })
      setPendingDescription(null)
      await reload()
    } finally {
      setSavingSegment(false)
    }
  }

  const onDelete = async () => {
    if (!segment) return
    if (
      !window.confirm(
        t(
          'segmentDetail.deleteConfirm',
          { key: segment.key },
          { defaultValue: 'Delete segment {{key}}?' },
        ),
      )
    )
      return
    await http.delete(`/api/segments/${segment.id}`)
    navigate('/segments')
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
        <p className={cm.textMuted}>
          {t('segmentDetail.loading', {}, { defaultValue: 'Loading segment…' })}
        </p>
      </div>
    )
  }

  if (!segment) {
    return (
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
        <p className={cm.cn('text-sm')} style={{ color: 'var(--color-error-chip-text)' }}>
          {error === 'not_found'
            ? t(
                'segmentDetail.notFound',
                { key: key ?? '' },
                { defaultValue: 'Segment {{key}} not found.' },
              )
            : t(
                'segmentDetail.error',
                { message: error ?? '' },
                { defaultValue: 'Could not load segment ({{message}}).' },
              )}
        </p>
        <Link
          to="/segments"
          className={cm.cn('font-mono text-xs')}
          style={{ color: 'var(--color-text-link)' }}
        >
          ← {t('segmentDetail.backToSegments', {}, { defaultValue: 'Back to segments' })}
        </Link>
      </div>
    )
  }

  const rules = toRuleRows(segment.conditions)
  const description = pendingDescription ?? segment.description ?? ''
  const dirtyDescription = pendingDescription !== null

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}
      data-mol-id="page-segment-detail"
    >
      <div>
        <nav
          className={cm.flex({ align: 'center', gap: 'xs' })}
          aria-label={t('nav.breadcrumb', {}, { defaultValue: 'Breadcrumb' })}
        >
          <Link
            to="/segments"
            className={cm.cn(
              'font-mono text-xs text-on-surface-variant hover:opacity-80 transition-opacity',
            )}
          >
            {t('segmentDetail.crumb.segments', {}, { defaultValue: 'Segments' })}
          </Link>
          <span className={cm.cn('text-on-surface-variant')} aria-hidden="true">
            /
          </span>
          <span className={cm.cn('font-mono text-xs text-on-surface')}>{segment.key}</span>
        </nav>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
            cm.sp('mt', 2),
          )}
        >
          <div className={cm.cn('min-w-0 flex-1')}>
            <p
              className={cm.cn('font-mono text-2xl font-extrabold tracking-tight text-on-surface')}
            >
              {segment.key}
            </p>
            <h1 className={cm.cn('text-3xl font-extrabold tracking-tight text-on-surface mt-1')}>
              {segment.name}
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
              data-mol-id="segment-detail-description"
              aria-label={t(
                'segmentDetail.descriptionAria',
                {},
                { defaultValue: 'Segment description' },
              )}
            />
            {dirtyDescription ? (
              <button
                type="button"
                onClick={() => void onSaveDescription()}
                disabled={savingSegment}
                className={cm.cn(
                  'mt-2 inline-flex items-center rounded-md px-3 py-1 font-mono text-xs font-bold disabled:opacity-50',
                )}
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-on-primary-cta)',
                }}
                data-mol-id="segment-detail-save-description"
              >
                {savingSegment
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('segmentDetail.save', {}, { defaultValue: 'Save description' })}
              </button>
            ) : null}
          </div>
          <div
            className={cm.cn(cm.flex({ direction: 'col', align: 'end', gap: 'sm' }), 'shrink-0')}
          >
            <button
              type="button"
              onClick={() => void onDelete()}
              className={cm.cn(
                'inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-mono text-[11px] font-bold',
              )}
              style={{
                backgroundColor: 'var(--color-error-chip-bg)',
                color: 'var(--color-error-chip-text)',
              }}
              data-mol-id="segment-detail-delete"
            >
              <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                delete
              </span>
              {t('segmentDetail.delete', {}, { defaultValue: 'Delete segment' })}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className={cm.cn('rounded-xl')}
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid rgba(30, 41, 59, 0.7)',
        }}
      >
        <div
          className={cm.cn('flex items-center gap-1 px-4 py-2 border-b overflow-x-auto')}
          style={{ borderColor: 'rgba(30, 41, 59, 0.7)' }}
        >
          {TABS.map((label) => {
            const active = tab === label
            return (
              <button
                key={label}
                type="button"
                onClick={() => setTab(label)}
                className={cm.cn(
                  'rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors whitespace-nowrap',
                )}
                style={
                  active
                    ? {
                        backgroundColor: 'var(--color-emerald-chip-bg)',
                        color: 'var(--color-env-filter-active-text)',
                        fontWeight: 700,
                      }
                    : { color: 'var(--color-text-muted)' }
                }
                data-mol-id={`segment-detail-tab-${label}`}
              >
                {t(`segmentDetail.tab.${label}`, {}, { defaultValue: label.replace('_', ' ') })}
              </button>
            )
          })}
        </div>

        <div className={cm.cn('p-5')}>
          {tab === 'rules' ? (
            <div>
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'mb-4')}>
                <p className={cm.cn('text-sm text-on-surface-variant')}>
                  {t(
                    'segmentDetail.rules.intro',
                    { count: rules.length },
                    {
                      defaultValue: '{{count}} predicates. Users matching all of them are members.',
                    },
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddRule((v) => !v)}
                  className={cm.cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-bold',
                  )}
                  style={{
                    backgroundColor: 'var(--color-accent-chip-bg)',
                    color: 'var(--color-accent-chip-text)',
                  }}
                  data-mol-id="segment-detail-toggle-add-rule"
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[14px]')}
                    aria-hidden="true"
                  >
                    add
                  </span>
                  {showAddRule
                    ? t('common.cancel', {}, { defaultValue: 'Cancel' })
                    : t('segmentDetail.addRule', {}, { defaultValue: 'Add rule' })}
                </button>
              </div>

              {showAddRule ? (
                <div
                  className={cm.cn(
                    'p-4 mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] rounded-md',
                  )}
                  style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    border: '1px solid rgba(30, 41, 59, 0.8)',
                  }}
                  data-mol-id="segment-detail-add-rule-form"
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
                      'segmentDetail.valuePh',
                      {},
                      { defaultValue: 'value (comma for in)' },
                    )}
                    className={cm.cn('h-9 rounded-md px-2 font-mono text-sm')}
                    style={{
                      backgroundColor: 'var(--color-code-block)',
                      border: '1px solid rgba(30, 41, 59, 0.8)',
                      color: 'var(--color-text-code)',
                    }}
                    aria-label={t('rules.value', {}, { defaultValue: 'Value' })}
                  />
                  <button
                    type="button"
                    onClick={() => void onAddRule()}
                    disabled={savingRule}
                    className={cm.cn(
                      'inline-flex items-center rounded-md px-4 py-2 font-mono text-xs font-bold disabled:opacity-50',
                    )}
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-on-primary-cta)',
                    }}
                    data-mol-id="segment-detail-save-rule"
                  >
                    {savingRule
                      ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                      : t('segmentDetail.saveRule', {}, { defaultValue: 'Save rule' })}
                  </button>
                </div>
              ) : null}

              {rules.length === 0 ? (
                <p className={cm.cn('text-sm text-on-surface-variant')}>
                  {t(
                    'segmentDetail.noRules',
                    {},
                    { defaultValue: 'No predicates yet — add one above.' },
                  )}
                </p>
              ) : (
                <ul className={cm.cn('space-y-3')}>
                  {rules.map((rule, idx) => (
                    <li
                      key={rule.id}
                      className={cm.cn('rounded-lg p-4')}
                      style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        border: '1px solid rgba(30, 41, 59, 0.7)',
                      }}
                    >
                      <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
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
                          [{rule.values.map((v) => `"${v}"`).join(', ')}]
                        </span>
                        <button
                          type="button"
                          onClick={() => void onRemoveRule(idx)}
                          className={cm.cn(
                            'ml-auto inline-flex items-center rounded-md p-1 text-on-surface-variant hover:text-on-surface transition-colors',
                          )}
                          aria-label={t(
                            'segmentDetail.removeRuleAria',
                            {},
                            { defaultValue: 'Remove rule' },
                          )}
                          data-mol-id={`segment-detail-remove-rule-${idx}`}
                        >
                          <span className={cm.cn('material-symbols-outlined text-base')}>
                            delete
                          </span>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {tab === 'used_in' ? (
            flags.length === 0 ? (
              <p className={cm.cn('text-sm text-on-surface-variant')}>
                {t(
                  'segmentDetail.noFlags',
                  {},
                  {
                    defaultValue:
                      "No flags yet. Reference this segment from a flag's targeting rule.",
                  },
                )}
              </p>
            ) : (
              <ul className={cm.cn('space-y-2')}>
                {flags.map((flag) => (
                  <li
                    key={flag.id}
                    className={cm.cn('rounded-lg px-4 py-3 flex items-center gap-3')}
                    style={{
                      backgroundColor: 'var(--color-surface-secondary)',
                      border: '1px solid rgba(30, 41, 59, 0.7)',
                    }}
                  >
                    <Link
                      to={`/flags/${flag.key}`}
                      className={cm.cn(
                        'font-mono text-sm font-bold text-on-surface flex-1 hover:opacity-80 truncate',
                      )}
                    >
                      {flag.key}
                    </Link>
                    <span className={cm.cn('font-mono text-[11px] text-on-surface-variant')}>
                      {flag.environment ?? 'production'}
                    </span>
                    <span
                      className={cm.cn(
                        'font-mono text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full',
                      )}
                      style={
                        flag.is_enabled
                          ? {
                              backgroundColor: 'var(--color-emerald-chip-bg)',
                              color: 'var(--color-emerald-chip-text)',
                            }
                          : {
                              backgroundColor: 'var(--color-surface-container-high)',
                              color: 'var(--color-text-muted)',
                            }
                      }
                    >
                      {flag.is_enabled
                        ? t('segmentDetail.flagOn', {}, { defaultValue: 'on' })
                        : t('segmentDetail.flagOff', {}, { defaultValue: 'off' })}
                    </span>
                  </li>
                ))}
              </ul>
            )
          ) : null}

          {tab === 'audit' ? (
            audit.length === 0 ? (
              <p className={cm.cn('text-sm text-on-surface-variant')}>
                {t(
                  'segmentDetail.noAudit',
                  {},
                  { defaultValue: 'No history for this segment yet.' },
                )}
              </p>
            ) : (
              <ul>
                {audit.map((entry, i, arr) => (
                  <AuditEntry key={entry.id} entry={entry} noBorder={i === arr.length - 1} />
                ))}
              </ul>
            )
          ) : null}
        </div>
      </div>
    </div>
  )
}
