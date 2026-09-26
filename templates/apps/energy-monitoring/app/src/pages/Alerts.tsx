import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AlertCard, type AlertCardItem } from '../components/AlertCard.js'
import { type EnergyKpi, EnergyKpiTriad } from '../components/EnergyKpiTriad.js'
import { unwrapList } from '../lib/unwrap.js'

interface RuleSummary {
  id: string
  name: string
  type: string
  threshold: number
  comparison: string
  enabled: boolean
}

type AlertFilter = 'open' | 'acknowledged' | 'dismissed' | 'all'

function mapAlert(item: Record<string, unknown>): AlertCardItem {
  const raw = String(item.status ?? 'open')
  const status: AlertCardItem['status'] =
    raw === 'open' ? 'active' : (raw as AlertCardItem['status'])
  return {
    id: String(item.id ?? ''),
    type: String(item.type ?? 'unusual_pattern'),
    message: String(item.message ?? ''),
    createdAt: (item.created_at as string | null) ?? null,
    status,
    value: item.value != null ? Number(item.value) : null,
    threshold: item.threshold != null ? Number(item.threshold) : null,
  }
}

export function Alerts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [alerts, setAlerts] = useState<AlertCardItem[] | null>(null)
  const [rules, setRules] = useState<RuleSummary[] | null>(null)
  const [filter, setFilter] = useState<AlertFilter>('open')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [evalBusy, setEvalBusy] = useState(false)
  // Destructive delete arms on the first click and commits on the second
  // (auto-disarm after 4s) — no modal, no lost taps on mobile.
  const [armedDeleteId, setArmedDeleteId] = useState<string | null>(null)

  async function load(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const [a, r] = await Promise.all([
        http.get<unknown>('/api/alerts?limit=100'),
        http.get<unknown>('/api/alerts/rules/list'),
      ])
      const aList = unwrapList<Record<string, unknown>>(a).map(mapAlert)
      setAlerts(aList)
      const rList = unwrapList<Record<string, unknown>>(r).map((item) => ({
        id: String(item.id ?? ''),
        name: String(item.name ?? item.type ?? 'Rule'),
        type: String(item.type ?? 'high_usage'),
        threshold: Number(item.threshold ?? 0),
        comparison: String(item.comparison ?? 'above'),
        enabled: Boolean(item.enabled ?? true),
      }))
      setRules(rList)
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : t('alerts.loadError', {}, { defaultValue: 'Could not load alerts.' })
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [a, r] = await Promise.all([
          http.get<unknown>('/api/alerts?limit=100'),
          http.get<unknown>('/api/alerts/rules/list'),
        ])
        if (cancelled) return
        const aList = unwrapList<Record<string, unknown>>(a).map(mapAlert)
        setAlerts(aList)
        const rList = unwrapList<Record<string, unknown>>(r).map((item) => ({
          id: String(item.id ?? ''),
          name: String(item.name ?? item.type ?? 'Rule'),
          type: String(item.type ?? 'high_usage'),
          threshold: Number(item.threshold ?? 0),
          comparison: String(item.comparison ?? 'above'),
          enabled: Boolean(item.enabled ?? true),
        }))
        setRules(rList)
      } catch (err) {
        if (cancelled) return
        const msg =
          err instanceof Error
            ? err.message
            : t('alerts.loadError', {}, { defaultValue: 'Could not load alerts.' })
        setError(msg)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function acknowledge(id: string): Promise<void> {
    setBusyId(id)
    try {
      await http.post(`/api/alerts/${id}/acknowledge`, {})
      void track({ name: 'alert.acknowledged', properties: { alert_id: id } })
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('alerts.errorAck', {}, { defaultValue: 'Could not acknowledge.' }),
      )
    } finally {
      setBusyId(null)
    }
  }

  async function dismiss(id: string): Promise<void> {
    setBusyId(id)
    try {
      await http.post(`/api/alerts/${id}/dismiss`, {})
      void track({ name: 'alert.dismissed', properties: { alert_id: id } })
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('alerts.errorDismiss', {}, { defaultValue: 'Could not dismiss.' }),
      )
    } finally {
      setBusyId(null)
    }
  }

  async function toggleRule(rule: RuleSummary): Promise<void> {
    setBusyId(rule.id)
    try {
      await http.post(`/api/alerts/rules/${rule.id}/toggle`, {})
      void track({
        name: 'alert.rule_toggled',
        properties: { rule_id: rule.id, enabled: !rule.enabled },
      })
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('alerts.errorToggle', {}, { defaultValue: 'Could not update rule.' }),
      )
    } finally {
      setBusyId(null)
    }
  }

  async function deleteRule(rule: RuleSummary): Promise<void> {
    if (armedDeleteId !== rule.id) {
      setArmedDeleteId(rule.id)
      window.setTimeout(() => setArmedDeleteId((cur) => (cur === rule.id ? null : cur)), 4000)
      return
    }
    setArmedDeleteId(null)
    setBusyId(rule.id)
    try {
      await http.delete(`/api/alerts/rules/${rule.id}`)
      void track({ name: 'alert.rule_deleted', properties: { rule_id: rule.id } })
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('alerts.errorDelete', {}, { defaultValue: 'Could not delete rule.' }),
      )
    } finally {
      setBusyId(null)
    }
  }

  async function runCheck(): Promise<void> {
    setEvalBusy(true)
    try {
      await http.post('/api/alerts/check', {})
      void track({ name: 'alert.check_run' })
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('alerts.errorCheck', {}, { defaultValue: 'Could not run rule check.' }),
      )
    } finally {
      setEvalBusy(false)
    }
  }

  const renderedAlerts = alerts ?? []
  const renderedRules = rules ?? []

  function inFilter(a: AlertCardItem): boolean {
    if (filter === 'all') return true
    if (filter === 'open') return a.status === 'active'
    return a.status === filter
  }
  const filtered = renderedAlerts.filter(inFilter)

  const activeCount = renderedAlerts.filter((a) => a.status === 'active').length
  const ackCount = renderedAlerts.filter((a) => a.status === 'acknowledged').length
  const ruleCount = renderedRules.filter((r) => r.enabled).length

  const kpis: EnergyKpi[] = [
    {
      key: 'active',
      label: 'Active alerts',
      value: String(activeCount),
      icon: 'priority_high',
      tint: 'text-error',
    },
    {
      key: 'acknowledged',
      label: 'Acknowledged',
      value: String(ackCount),
      icon: 'check_circle',
      tint: 'text-success',
    },
    {
      key: 'rules',
      label: 'Rules enabled',
      value: `${ruleCount}/${renderedRules.length}`,
      icon: 'rule',
      tint: 'text-primary',
    },
  ]

  const filters: Array<{ key: AlertFilter; defaultLabel: string }> = [
    { key: 'open', defaultLabel: 'Active' },
    { key: 'acknowledged', defaultLabel: 'Acknowledged' },
    { key: 'dismissed', defaultLabel: 'Dismissed' },
    { key: 'all', defaultLabel: 'All' },
  ]

  return (
    <div
      data-mol-id="alerts-page"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}
    >
      <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('alerts.eyebrow', {}, { defaultValue: 'Watch list' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('alerts.heading', {}, { defaultValue: 'Alerts & rules' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'alerts.subheading',
            {},
            {
              defaultValue:
                'Threshold and pattern alerts firing on your meters, plus the rules that drive them.',
            },
          )}
        </p>
      </div>

      {error ? (
        <p
          data-mol-id="alerts-error"
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'bg-error-container text-on-error-container rounded-xl text-sm',
          )}
        >
          {error}
        </p>
      ) : null}

      <EnergyKpiTriad kpis={kpis} />

      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              data-mol-id={`alerts-filter-${f.key}`}
              onClick={() => setFilter(f.key)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest transition-all',
                filter === f.key
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
            >
              {t(`alerts.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
            </button>
          ))}
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
          <button
            type="button"
            data-mol-id="alerts-run-check"
            onClick={() => void runCheck()}
            disabled={evalBusy}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest bg-surface-container text-on-surface hover:bg-surface-container-high transition-all disabled:opacity-60',
            )}
          >
            <span
              className={'material-symbols-outlined text-base align-middle mr-1'}
              aria-hidden="true"
            >
              autorenew
            </span>
            {evalBusy
              ? t('alerts.checking', {}, { defaultValue: 'Checking\u2026' })
              : t('alerts.runCheck', {}, { defaultValue: 'Evaluate now' })}
          </button>
          <Link
            to="/alerts/rules/new"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest bg-primary text-on-primary hover:bg-primary/90 transition-colors',
            )}
          >
            <span
              className={'material-symbols-outlined text-base align-middle mr-1'}
              aria-hidden="true"
            >
              add
            </span>
            {t('alerts.newRule', {}, { defaultValue: 'New rule' })}
          </Link>
        </div>
      </div>

      {loading && alerts === null ? (
        <p
          data-mol-id="alerts-loading"
          className={cm.cn(
            cm.sp('p', 6),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
          )}
        >
          {t('alerts.loading', {}, { defaultValue: 'Pulling latest alerts\u2026' })}
        </p>
      ) : filtered.length === 0 ? (
        <p
          data-mol-id="alerts-empty"
          className={cm.cn(
            cm.sp('p', 6),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
          )}
        >
          {filter === 'open' && renderedRules.length === 0
            ? t(
                'alerts.emptyNoRules',
                {},
                {
                  defaultValue: 'No alerts yet — add a rule, then click “Evaluate now” to test it.',
                },
              )
            : t('alerts.empty', {}, { defaultValue: 'Nothing to show — no alerts in this state.' })}
        </p>
      ) : (
        <div data-mol-id="alerts-list" className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {filtered.map((a) => (
            <AlertCard
              key={a.id}
              alert={a}
              onAcknowledge={busyId === a.id ? undefined : (id) => void acknowledge(id)}
              onDismiss={busyId === a.id ? undefined : (id) => void dismiss(id)}
            />
          ))}
        </div>
      )}

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('alerts.rulesHeading', {}, { defaultValue: 'Active rules' })}
        </h2>
        {renderedRules.length === 0 ? (
          <p
            data-mol-id="alerts-rules-empty"
            className={cm.cn(
              cm.sp('p', 6),
              cm.textCenter,
              'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
            )}
          >
            {t(
              'alerts.rulesEmpty',
              {},
              { defaultValue: 'No rules yet — create one to start monitoring.' },
            )}
          </p>
        ) : (
          <div
            data-mol-id="alerts-rules"
            className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
          >
            {renderedRules.map((r) => (
              <div
                key={r.id}
                data-mol-id={`alerts-rule-${r.id}`}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
                  cm.sp('p', 5),
                  'bg-surface-container-lowest rounded-2xl border-l-4',
                  r.enabled ? 'border-l-primary' : 'border-l-outline-variant',
                  r.enabled ? '' : 'opacity-70',
                )}
              >
                <div className={cm.cn('min-w-0 flex-1')}>
                  <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'))}>{r.name}</p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
                    {t(
                      'alerts.ruleSummary',
                      {
                        type: r.type.replace(/_/g, ' '),
                        comparison: r.comparison,
                        threshold: r.threshold,
                      },
                      { defaultValue: '{{type}} · {{comparison}} {{threshold}}' },
                    )}
                  </p>
                </div>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <button
                    type="button"
                    data-mol-id={`alerts-rule-toggle-${r.id}`}
                    onClick={() => void toggleRule(r)}
                    disabled={busyId === r.id}
                    aria-pressed={r.enabled}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.roundedFull,
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest disabled:opacity-60',
                      r.enabled
                        ? 'bg-primary text-on-primary hover:bg-primary/90'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
                    )}
                  >
                    {r.enabled
                      ? t('alerts.ruleOn', {}, { defaultValue: 'On' })
                      : t('status.off', {}, { defaultValue: 'Off' })}
                  </button>
                  <button
                    type="button"
                    data-mol-id={`alerts-rule-delete-${r.id}`}
                    onClick={() => void deleteRule(r)}
                    disabled={busyId === r.id}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.roundedFull,
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest bg-surface-container text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors disabled:opacity-60',
                    )}
                  >
                    {armedDeleteId === r.id
                      ? t('alerts.confirmDelete', {}, { defaultValue: 'Confirm delete' })
                      : t('common.delete', {}, { defaultValue: 'Delete' })}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
