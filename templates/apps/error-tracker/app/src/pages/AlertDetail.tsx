import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { FrequencySparkline } from '../components/FrequencySparkline.js'
import { type Severity, SeverityPill } from '../components/SeverityPill.js'

interface AlertChannel {
  kind: string
  target: string
}

interface AlertRule {
  id: string
  name: string
  rule_type: string
  level: string | null
  threshold: number
  window_seconds: number
  scope: string | null
  environment: string | null
  channels: AlertChannel[] | null
  status: 'active' | 'paused'
  is_enabled: boolean
  notification_channel: string | null
  notification_target: string | null
  last_triggered_at: string | null
  trigger_count_7d: number
  created_at: string
}

const LEVEL_TO_SEVERITY: Record<string, Severity> = {
  fatal: 'critical',
  error: 'error',
  warning: 'warning',
  info: 'info',
  debug: 'info',
}

function deriveTimeline(rule: AlertRule): number[] {
  // 20-bin synthesized trigger histogram for the timeline sparkline. Real
  // alert_triggers wiring would replace this with a backend timeseries.
  let h = rule.trigger_count_7d || 1
  for (const c of rule.id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const peak = Math.max(1, Math.round(rule.trigger_count_7d / 4))
  return Array.from({ length: 20 }, (_, i) => {
    const phase = (h >> (i % 16)) & 0xff
    const wobble = (phase / 255) * 0.6 + 0.7
    const ramp = Math.min(1, (i + 4) / 20)
    return Math.round(peak * ramp * wobble)
  })
}

function fmtTimestamp(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

export function AlertDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [rule, setRule] = useState<AlertRule | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<'toggle' | 'delete' | null>(null)
  // Two-step destructive confirm: first click arms, second click executes.
  const [armingDelete, setArmingDelete] = useState(false)

  const reload = useCallback(async () => {
    if (!id) return
    try {
      const res = await http.get<AlertRule>(`/api/alerts/${id}`)
      setRule(res.data ?? null)
    } catch (error) {
      logError('alertDetail.reload', error)
      setError(t('alertDetail.loadError', {}, { defaultValue: "Couldn't load alert rule." }))
    }
  }, [http, id, t])

  useEffect(() => {
    void reload()
  }, [reload])

  const togglePaused = useCallback(async () => {
    if (!rule) return
    setPending('toggle')
    try {
      const newStatus = rule.status === 'active' ? 'paused' : 'active'
      await http.put(`/api/alerts/${rule.id}`, {
        status: newStatus,
        is_enabled: newStatus === 'active',
      })
      void track({
        name: newStatus === 'paused' ? 'alert.paused' : 'alert.resumed',
        properties: { alert_id: rule.id, status: newStatus },
      })
      await reload()
    } catch (error) {
      logError('alertDetail.togglePaused', error)
      setError(t('alertDetail.toggleError', {}, { defaultValue: "Couldn't update rule." }))
    } finally {
      setPending(null)
    }
  }, [http, reload, rule, t])

  const deleteRule = useCallback(async () => {
    if (!rule) return
    setPending('delete')
    try {
      await http.delete(`/api/alerts/${rule.id}`)
      void track({ name: 'alert.deleted', properties: { alert_id: rule.id } })
      navigate('/alerts')
    } catch (error) {
      logError('alertDetail.deleteRule', error)
      setError(t('alertDetail.deleteError', {}, { defaultValue: "Couldn't delete rule." }))
      setPending(null)
    }
  }, [http, navigate, rule, t])

  if (!rule) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
        <Link
          to="/alerts"
          className={cm.cn(
            'inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest mb-4 hover:opacity-80',
          )}
          style={{ color: BRAND_COLOR }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('alertDetail.back', {}, { defaultValue: 'Back to alert rules' })}
        </Link>
        {error ? (
          <p
            role="alert"
            className={cm.cn('font-mono text-xs')}
            style={{ color: 'var(--color-severity-critical)' }}
          >
            {error}
          </p>
        ) : (
          <p
            className={cm.cn('font-mono text-sm')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('alertDetail.loading', {}, { defaultValue: 'Loading alert…' })}
          </p>
        )}
      </div>
    )
  }

  const severity = LEVEL_TO_SEVERITY[rule.level ?? 'info'] ?? 'info'
  const channels = Array.isArray(rule.channels) ? rule.channels : []
  const timeline = deriveTimeline(rule)
  const accent =
    rule.status === 'active' ? 'var(--color-severity-resolved)' : 'var(--color-severity-muted)'

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <Link
        to="/alerts"
        className={cm.cn(
          'inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest mb-4 hover:opacity-80',
        )}
        style={{ color: BRAND_COLOR }}
      >
        <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
          arrow_back
        </span>
        {t('alertDetail.back', {}, { defaultValue: 'Back to alert rules' })}
      </Link>

      {error ? (
        <p
          role="alert"
          className={cm.cn('mb-4 font-mono text-xs')}
          style={{ color: 'var(--color-severity-critical)' }}
        >
          {error}
        </p>
      ) : null}

      <header
        className={cm.cn(
          'relative overflow-hidden rounded-2xl mb-6 p-6',
          cm.accentCard({ tone: 'custom' }),
        )}
        style={{
          backgroundImage:
            'linear-gradient(135deg, var(--color-severity-critical-light), var(--color-severity-info-light))',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          ['--mol-accent' as string]: accent,
        }}
      >
        <div className={cm.cn('flex items-center gap-2 flex-wrap mb-3')}>
          <SeverityPill severity={severity} emphasis />
          <span
            data-status={rule.status}
            className={cm.cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[10px] font-black uppercase tracking-widest',
            )}
            style={{
              backgroundColor:
                rule.status === 'active'
                  ? 'var(--color-severity-resolved-light)'
                  : 'color-mix(in srgb, var(--color-severity-muted) 12%, transparent)',
              color:
                rule.status === 'active'
                  ? 'var(--color-severity-resolved)'
                  : 'var(--color-text-secondary)',
              border: `1px solid ${accent}`,
            }}
          >
            <span
              className={cm.cn(
                'h-1.5 w-1.5 rounded-full',
                rule.status === 'active' && 'animate-pulse',
              )}
              style={{ backgroundColor: accent }}
              aria-hidden="true"
            />
            {rule.status}
          </span>
        </div>
        <h1
          className={cm.cn('text-2xl md:text-3xl font-extrabold tracking-tight')}
          style={{ color: 'var(--color-text)' }}
        >
          {rule.name}
        </h1>
        <p
          className={cm.cn('mt-2 font-mono text-sm font-bold')}
          style={{ color: 'var(--color-text-code)' }}
        >
          {rule.rule_type} {' > '} {rule.threshold} /{' '}
          {Math.max(1, Math.round(rule.window_seconds / 60))}m
        </p>
        <div className={cm.cn('mt-4 flex items-center gap-2 flex-wrap')}>
          <button
            type="button"
            data-testid="alert-toggle-status"
            disabled={pending !== null}
            onClick={() => void togglePaused()}
            className={cm.cn(
              'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border disabled:opacity-50',
            )}
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            {pending === 'toggle'
              ? '…'
              : rule.status === 'active'
                ? t('common.pause', {}, { defaultValue: 'Pause' })
                : t('common.resume', {}, { defaultValue: 'Resume' })}
          </button>
          <button
            type="button"
            data-testid="alert-delete"
            disabled={pending !== null}
            onClick={() => {
              if (!armingDelete) {
                setArmingDelete(true)
                return
              }
              setArmingDelete(false)
              void deleteRule()
            }}
            className={cm.cn(
              'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest disabled:opacity-50',
            )}
            style={{
              backgroundColor: armingDelete
                ? 'var(--color-severity-critical)'
                : 'var(--color-severity-critical-light)',
              color: armingDelete ? 'var(--color-on-primary)' : 'var(--color-severity-critical)',
              border: '1px solid var(--color-severity-critical)',
            }}
          >
            {pending === 'delete'
              ? '…'
              : armingDelete
                ? t('common.confirmDelete', {}, { defaultValue: 'Confirm delete?' })
                : t('common.delete', {}, { defaultValue: 'Delete' })}
          </button>
        </div>
      </header>

      <section
        className={cm.cn('rounded-2xl mb-6 p-6')}
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <p
          className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t(
            'alertDetail.triggerActivity',
            {},
            { defaultValue: '// trigger activity · synthesized from 7d count' },
          )}
        </p>
        <FrequencySparkline
          values={timeline}
          width={620}
          height={64}
          color="var(--color-severity-critical)"
          spikeColor="var(--color-severity-critical)"
          mode="bar"
          className={cm.cn('w-full h-auto')}
          ariaLabel={t('alertDetail.triggerActivityAria', {}, { defaultValue: 'Trigger activity' })}
        />
        <p
          className={cm.cn('mt-3 font-mono text-xs')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t(
            'alertDetail.triggers7d',
            { count: rule.trigger_count_7d },
            { defaultValue: '{{count}} triggers · last 7 days' },
          )}
        </p>
      </section>

      <section className={cm.cn('grid gap-6 grid-cols-1 lg:grid-cols-2 mb-6')}>
        <div
          className={cm.cn('rounded-2xl p-6')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h2 className={cm.cn('text-lg font-bold mb-4')} style={{ color: 'var(--color-text)' }}>
            {t('alertDetail.thresholds', {}, { defaultValue: 'Thresholds' })}
          </h2>
          <dl className={cm.cn('space-y-3 font-mono text-sm')}>
            <Row
              label={t('alertDetail.metric', {}, { defaultValue: 'Metric' })}
              value={rule.rule_type}
            />
            <Row
              label={t('alertDetail.window', {}, { defaultValue: 'Window' })}
              value={`${Math.max(1, Math.round(rule.window_seconds / 60))}m`}
            />
            <Row
              label={t('alertDetail.warnAt', {}, { defaultValue: 'Trigger at' })}
              value={`${rule.threshold}`}
              valueColor="var(--color-severity-warning)"
            />
            <Row
              label={t('alertDetail.environment', {}, { defaultValue: 'Environment' })}
              value={rule.environment ?? '—'}
            />
            <Row
              label={t('alertDetail.lastTriggered', {}, { defaultValue: 'Last triggered' })}
              value={fmtTimestamp(rule.last_triggered_at)}
            />
          </dl>
        </div>

        <div
          className={cm.cn('rounded-2xl p-6')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h2 className={cm.cn('text-lg font-bold mb-4')} style={{ color: 'var(--color-text)' }}>
            {t('alertDetail.channels', {}, { defaultValue: 'Channels' })}
          </h2>
          {channels.length === 0 ? (
            <p
              data-testid="alert-no-channels"
              className={cm.cn('font-mono text-xs')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('alertDetail.noChannels', {}, { defaultValue: 'No channels configured.' })}
            </p>
          ) : (
            <ul className={cm.cn('space-y-2.5')}>
              {channels.map((c) => (
                <li
                  key={`${c.kind}:${c.target}`}
                  className={cm.cn('flex items-center gap-3 rounded-md px-3 py-2')}
                  style={{
                    backgroundColor: 'var(--color-background-tertiary)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-base')}
                    style={{ color: BRAND_COLOR }}
                    aria-hidden="true"
                  >
                    {c.kind === 'slack' ? 'chat' : c.kind === 'webhook' ? 'webhook' : 'mail'}
                  </span>
                  <span
                    className={cm.cn('font-mono text-sm font-medium')}
                    style={{ color: 'var(--color-text)' }}
                  >
                    {c.target}
                  </span>
                  <span
                    className={cm.cn(
                      'ml-auto font-mono text-[10px] font-bold uppercase tracking-widest',
                    )}
                    style={{ color: 'var(--color-severity-muted)' }}
                  >
                    {c.kind}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn('flex justify-between gap-3')}>
      <dt
        className={cm.cn('text-[10px] font-black uppercase tracking-widest')}
        style={{ color: 'var(--color-severity-muted)' }}
      >
        {label}
      </dt>
      <dd style={{ color: valueColor ?? 'var(--color-text)' }}>{value}</dd>
    </div>
  )
}
