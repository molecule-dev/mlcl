import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { type Severity, SeverityPill } from '../components/SeverityPill.js'

interface AlertRule {
  id: string
  user_id: string
  project_id: string
  name: string
  rule_type: string
  level: string | null
  threshold: number
  window_seconds: number
  scope: string | null
  environment: string | null
  channels: Array<{ kind: string; target: string }> | null
  status: 'active' | 'paused'
  is_enabled: boolean
  notification_channel: string | null
  notification_target: string | null
  last_triggered_at: string | null
  trigger_count_7d: number
  created_at: string
}

interface ProjectHealth {
  id: string
  name: string
  slug: string
}

const LEVEL_TO_SEVERITY: Record<string, Severity> = {
  fatal: 'critical',
  error: 'error',
  warning: 'warning',
  info: 'info',
  debug: 'info',
}

function fmtRelative(iso: string | null): string {
  if (!iso) return 'never'
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function fmtThreshold(r: AlertRule): string {
  if (r.window_seconds <= 0) return `${r.rule_type} (instant)`
  const m = r.window_seconds < 60 ? `${r.window_seconds}s` : `${Math.round(r.window_seconds / 60)}m`
  return `${r.rule_type} > ${r.threshold} / ${m}`
}

export function Alerts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rules, setRules] = useState<AlertRule[]>([])
  const [projects, setProjects] = useState<ProjectHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftLevel, setDraftLevel] = useState<'fatal' | 'error' | 'warning' | 'info'>('error')
  const [draftThreshold, setDraftThreshold] = useState(50)
  const [draftWindow, setDraftWindow] = useState(300)
  const [draftChannel, setDraftChannel] = useState<'email' | 'slack' | 'webhook'>('email')
  const [draftTarget, setDraftTarget] = useState('')

  const reload = useCallback(async () => {
    try {
      const [alertsRes, projectsRes] = await Promise.all([
        http.get<AlertRule[]>('/api/alerts'),
        http.get<ProjectHealth[]>('/api/projects-health'),
      ])
      setRules(Array.isArray(alertsRes.data) ? alertsRes.data : [])
      setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : [])
    } catch (error) {
      logError('alerts.reload', error)
      setError(t('alerts.loadError', {}, { defaultValue: "Couldn't load alert rules." }))
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void reload()
  }, [reload])

  const createRule = useCallback(async () => {
    if (!draftName.trim()) return
    if (projects.length === 0) {
      setError(
        t('alerts.needProject', {}, { defaultValue: 'Create a project before adding alerts.' }),
      )
      return
    }
    setCreating(true)
    try {
      await http.post('/api/alerts', {
        project_id: projects[0]?.id,
        name: draftName.trim(),
        rule_type: 'issue-frequency',
        level: draftLevel,
        threshold: draftThreshold,
        window_seconds: draftWindow,
        scope: 'project',
        channels: [{ kind: draftChannel, target: draftTarget || 'oncall@example.com' }],
        notification_channel: draftChannel,
        notification_target: draftTarget || null,
        status: 'active',
        is_enabled: true,
      })
      setDraftName('')
      setDraftTarget('')
      setShowCreate(false)
      await reload()
    } catch (error) {
      logError('alerts.createRule', error)
      setError(t('alerts.createError', {}, { defaultValue: "Couldn't create rule." }))
    } finally {
      setCreating(false)
    }
  }, [
    draftChannel,
    draftLevel,
    draftName,
    draftTarget,
    draftThreshold,
    draftWindow,
    http,
    projects,
    reload,
    t,
  ])

  const active = rules.filter((r) => r.status === 'active').length
  const paused = rules.length - active

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-8')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t(
              'alerts.eyebrow',
              { app: APP_NAME.toLowerCase() },
              { defaultValue: '$ {{app}} alerts --rules' },
            )}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t('alerts.heading', {}, { defaultValue: 'Alert rules' })}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t(
              'alerts.subheading',
              { active, paused },
              { defaultValue: '{{active}} active · {{paused}} paused' },
            )}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          type="button"
          data-testid="alerts-create-open"
          className={cm.cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-90',
          )}
          style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            add
          </span>
          {t('alerts.create', {}, { defaultValue: 'New rule' })}
        </button>
      </header>

      {error ? (
        <p
          role="alert"
          data-testid="alerts-error"
          className={cm.cn('mb-4 font-mono text-xs')}
          style={{ color: 'var(--color-severity-critical)' }}
        >
          {error}
        </p>
      ) : null}

      {showCreate ? (
        <section
          role="dialog"
          aria-label={t('alerts.createDialog', {}, { defaultValue: 'New alert rule' })}
          className={cm.cn('mb-6 rounded-2xl p-5')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
          }}
        >
          <h2
            className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('alerts.createEyebrow', {}, { defaultValue: '// new alert rule' })}
          </h2>
          <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-3')}>
            <input
              data-testid="alerts-create-name"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder={t(
                'alerts.namePlaceholder',
                {},
                { defaultValue: 'High error rate · checkout' },
              )}
              className={cm.cn('px-3 py-2 rounded font-mono text-sm')}
              style={{
                backgroundColor: 'var(--color-background-secondary)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            />
            <select
              data-testid="alerts-create-level"
              value={draftLevel}
              onChange={(e) => setDraftLevel(e.target.value as typeof draftLevel)}
              className={cm.cn('px-3 py-2 rounded font-mono text-sm')}
              style={{
                backgroundColor: 'var(--color-background-secondary)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            >
              <option value="fatal">fatal</option>
              <option value="error">error</option>
              <option value="warning">warning</option>
              <option value="info">info</option>
            </select>
            <label
              className={cm.cn('flex items-center gap-2 font-mono text-xs')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('alerts.threshold', {}, { defaultValue: 'Threshold' })}
              <input
                data-testid="alerts-create-threshold"
                type="number"
                min={1}
                value={draftThreshold}
                onChange={(e) => setDraftThreshold(Math.max(1, Number(e.target.value) || 1))}
                className={cm.cn('flex-1 px-2 py-1.5 rounded font-mono text-sm')}
                style={{
                  backgroundColor: 'var(--color-background-secondary)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
              />
            </label>
            <label
              className={cm.cn('flex items-center gap-2 font-mono text-xs')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('alerts.window', {}, { defaultValue: 'Window (s)' })}
              <input
                data-testid="alerts-create-window"
                type="number"
                min={1}
                value={draftWindow}
                onChange={(e) => setDraftWindow(Math.max(1, Number(e.target.value) || 60))}
                className={cm.cn('flex-1 px-2 py-1.5 rounded font-mono text-sm')}
                style={{
                  backgroundColor: 'var(--color-background-secondary)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
              />
            </label>
            <select
              data-testid="alerts-create-channel"
              value={draftChannel}
              onChange={(e) => setDraftChannel(e.target.value as typeof draftChannel)}
              className={cm.cn('px-3 py-2 rounded font-mono text-sm')}
              style={{
                backgroundColor: 'var(--color-background-secondary)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            >
              <option value="email">email</option>
              <option value="slack">slack</option>
              <option value="webhook">webhook</option>
            </select>
            <input
              data-testid="alerts-create-target"
              value={draftTarget}
              onChange={(e) => setDraftTarget(e.target.value)}
              placeholder={
                draftChannel === 'slack'
                  ? t('alerts.targetPlaceholderSlack', {}, { defaultValue: '#errors' })
                  : draftChannel === 'webhook'
                    ? t(
                        'alerts.targetPlaceholderWebhook',
                        {},
                        { defaultValue: 'https://hooks.example/abc' },
                      )
                    : t('alerts.targetPlaceholderEmail', {}, { defaultValue: 'oncall@company.com' })
              }
              className={cm.cn('px-3 py-2 rounded font-mono text-sm')}
              style={{
                backgroundColor: 'var(--color-background-secondary)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            />
          </div>
          <div className={cm.cn('mt-3 flex gap-2')}>
            <button
              type="button"
              data-testid="alerts-create-confirm"
              disabled={creating}
              onClick={() => void createRule()}
              className={cm.cn(
                'px-4 py-2 rounded font-mono text-xs font-bold uppercase tracking-widest disabled:opacity-50',
              )}
              style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
            >
              {creating ? '…' : t('alerts.confirmCreate', {}, { defaultValue: 'Create rule' })}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false)
                setDraftName('')
              }}
              className={cm.cn(
                'px-4 py-2 rounded font-mono text-xs font-bold uppercase tracking-widest hover:bg-surface/5',
              )}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        </section>
      ) : null}

      {loading ? (
        <p
          className={cm.cn(cm.sp('py', 16), cm.textCenter)}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('alerts.loading', {}, { defaultValue: 'Loading rules…' })}
        </p>
      ) : rules.length === 0 ? (
        <p
          data-testid="alerts-empty"
          className={cm.cn('font-mono text-sm py-12 text-center')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t(
            'alerts.empty',
            {},
            { defaultValue: 'No alert rules yet — create your first rule above.' },
          )}
        </p>
      ) : (
        <ul data-testid="alerts-list" className={cm.cn('grid gap-4 grid-cols-1 lg:grid-cols-2')}>
          {rules.map((r) => {
            const channels = Array.isArray(r.channels) ? r.channels : []
            const severity = LEVEL_TO_SEVERITY[r.level ?? 'info'] ?? 'info'
            return (
              <li key={r.id} data-testid="alert-row" data-rule-id={r.id}>
                <Link
                  to={`/alerts/${r.id}`}
                  className={cm.cn(
                    'block rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg',
                  )}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderLeft: `3px solid ${r.status === 'active' ? 'var(--color-primary)' : 'var(--color-severity-muted)'}`,
                  }}
                >
                  <div className={cm.cn('flex items-center justify-between gap-3')}>
                    <div className={cm.cn('flex items-center gap-2 min-w-0')}>
                      <span
                        className={cm.cn('h-2 w-2 rounded-full')}
                        style={{
                          backgroundColor:
                            r.status === 'active'
                              ? 'var(--color-primary)'
                              : 'var(--color-severity-muted)',
                          boxShadow:
                            r.status === 'active'
                              ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 30%, transparent)'
                              : undefined,
                        }}
                        aria-hidden="true"
                      />
                      <p
                        className={cm.cn('font-bold text-sm truncate')}
                        style={{ color: 'var(--color-text)' }}
                      >
                        {r.name}
                      </p>
                    </div>
                    <SeverityPill severity={severity} />
                  </div>
                  <p
                    className={cm.cn('mt-3 font-mono text-sm font-bold')}
                    style={{ color: 'var(--color-text-code)' }}
                  >
                    {fmtThreshold(r)}
                  </p>
                  <p
                    className={cm.cn('mt-1 font-mono text-xs')}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {r.scope ?? 'project'} {r.environment ? `· ${r.environment}` : ''}
                  </p>
                  <div className={cm.cn('mt-4 flex items-center justify-between gap-3')}>
                    <div className={cm.cn('flex flex-wrap items-center gap-1.5')}>
                      {channels.length === 0 ? (
                        <span
                          className={cm.cn('font-mono text-[10px]')}
                          style={{ color: 'var(--color-severity-muted)' }}
                        >
                          {t('alerts.noChannels', {}, { defaultValue: 'no channels' })}
                        </span>
                      ) : (
                        channels.map((c) => (
                          <span
                            key={`${c.kind}:${c.target}`}
                            className={cm.cn('font-mono text-[10px] px-2 py-0.5 rounded')}
                            style={{
                              backgroundColor: 'var(--color-surface-overlay)',
                              color: 'var(--color-text-secondary)',
                            }}
                          >
                            {c.kind}:{c.target}
                          </span>
                        ))
                      )}
                    </div>
                    <span
                      className={cm.cn('text-[10px] font-mono uppercase tracking-widest')}
                      style={{ color: 'var(--color-severity-muted)' }}
                    >
                      {t(
                        'alerts.lastTriggered',
                        { when: fmtRelative(r.last_triggered_at) },
                        { defaultValue: 'last {{when}}' },
                      )}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
