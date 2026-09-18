import { useEffect, useMemo, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { MetricKpiCard } from '../components/MetricKpiCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface IncidentSummary {
  id: string
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
  impact: 'minor' | 'major' | 'critical' | 'maintenance' | 'none'
  created_at: string
  resolved_at?: string | null
}

interface AuthUser {
  id?: string
  email?: string
  name?: string
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth()
  const u = user as unknown as AuthUser | null
  const [incidents, setIncidents] = useState<IncidentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [name, setName] = useState(u?.name ?? '')
  const [email, setEmail] = useState(u?.email ?? '')

  useEffect(() => {
    setName(u?.name ?? '')
    setEmail(u?.email ?? '')
  }, [u?.name, u?.email])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/incidents')
      .then((res) => {
        if (!cancelled) setIncidents(unwrapList<IncidentSummary>(res))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!u?.id) return
    setSaving(true)
    setSaveError(null)
    try {
      await http.patch(`/api/users/${u.id}`, {
        name: name.trim(),
        email: email.trim(),
      })
      setEditing(false)
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : t('profile.saveError', {}, { defaultValue: 'Could not save profile' }),
      )
    } finally {
      setSaving(false)
    }
  }

  const stats = useMemo(() => {
    const ninetyDaysAgo = Date.now() - 90 * 86400_000
    const recent = incidents.filter((i) => new Date(i.created_at).getTime() >= ninetyDaysAgo)
    const resolved = recent.filter((i) => i.status === 'resolved' && i.resolved_at)
    const mttrMs = resolved.length
      ? resolved.reduce(
          (acc, i) =>
            acc + (new Date(i.resolved_at as string).getTime() - new Date(i.created_at).getTime()),
          0,
        ) / resolved.length
      : 0
    return {
      total90d: recent.length,
      open: recent.filter((i) => i.status !== 'resolved').length,
      resolved: resolved.length,
      mttrMin: mttrMs ? Math.max(1, Math.round(mttrMs / 60_000)) : null,
    }
  }, [incidents])

  const displayName = u?.name?.trim() || u?.email?.split('@')[0] || ''
  const displayEmail = u?.email ?? ''

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))} data-mol-id="page-profile">
      <header className={cm.cn('mb-8')}>
        <p
          className={cm.cn(
            'font-mono text-xs font-bold uppercase tracking-widest text-primary mb-2',
          )}
        >
          {t('profile.eyebrow', { app: APP_NAME }, { defaultValue: '$ {{app}} whoami' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'profile.subheading',
            {},
            { defaultValue: 'Operator profile and incident activity for your account.' },
          )}
        </p>
      </header>

      <section
        className={cm.cn('rounded-2xl p-8 mb-8 relative overflow-hidden')}
        style={{
          backgroundImage:
            'linear-gradient(135deg, rgba(16, 185, 129, 0.30), rgba(99, 102, 241, 0.20))',
          backgroundColor: 'var(--mol-color-text-inverse)',
          border: '1px solid var(--color-border-card)',
        }}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-24 h-72 w-72 rounded-full blur-3xl pointer-events-none',
          )}
          style={{ backgroundColor: 'rgba(16, 185, 129, 0.40)' }}
          aria-hidden="true"
        />

        <div className={cm.cn('relative flex flex-col md:flex-row gap-6 items-start')}>
          <span
            className={cm.cn(
              'inline-flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-extrabold',
            )}
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.30)',
              color: 'var(--color-link-hover)',
            }}
            aria-hidden="true"
          >
            {(displayName.slice(0, 1) || '?').toUpperCase()}
          </span>
          <div className={cm.cn('flex-1 min-w-0')}>
            {editing ? (
              <form
                onSubmit={onSave}
                data-testid="edit-profile-form"
                className={cm.cn('space-y-2')}
              >
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="edit-profile-name"
                  placeholder={t('form.name', {}, { defaultValue: 'Name' })}
                  className={cm.cn('w-full px-3 py-2 rounded-md font-mono text-sm')}
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--color-border-card)',
                    color: 'var(--mol-color-text)',
                  }}
                />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="edit-profile-email"
                  className={cm.cn('w-full px-3 py-2 rounded-md font-mono text-sm')}
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--color-border-card)',
                    color: 'var(--mol-color-text)',
                  }}
                />
                {saveError ? (
                  <p
                    role="alert"
                    data-testid="edit-profile-error"
                    className={cm.cn('font-mono text-[11px]')}
                    style={{ color: 'var(--color-error-text-vivid-on-dark)' }}
                  >
                    {saveError}
                  </p>
                ) : null}
                <div className={cm.cn('flex items-center gap-2')}>
                  <button
                    type="submit"
                    disabled={saving}
                    data-testid="edit-profile-submit"
                    className={cm.cn(
                      'px-3 py-1.5 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50',
                    )}
                    style={{
                      backgroundColor: 'var(--color-status-operational)',
                      color: 'var(--color-on-status-operational)',
                    }}
                  >
                    {saving
                      ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                      : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setName(u?.name ?? '')
                      setEmail(u?.email ?? '')
                      setSaveError(null)
                      setEditing(false)
                    }}
                    className={cm.cn(
                      'px-3 py-1.5 rounded-md font-mono text-xs font-bold uppercase tracking-widest',
                    )}
                    style={{
                      backgroundColor: 'rgba(30, 41, 59, 0.6)',
                      color: 'var(--color-chip-text)',
                      border: '1px solid var(--color-border-card)',
                    }}
                  >
                    {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h2
                  className={cm.cn('text-3xl font-extrabold tracking-tight')}
                  data-testid="profile-name"
                >
                  {displayName || t('profile.noName', {}, { defaultValue: 'Unnamed operator' })}
                </h2>
                <p
                  className={cm.cn('mt-1 font-mono text-sm text-on-surface-variant')}
                  data-testid="profile-email"
                >
                  {displayEmail}
                </p>
              </>
            )}
          </div>
          {!editing ? (
            <button
              type="button"
              data-testid="edit-profile-btn"
              onClick={() => setEditing(true)}
              className={cm.cn(
                'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90 backdrop-blur-md',
              )}
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: 'var(--mol-color-text)',
                border: '1px solid rgba(255,255,255,0.20)',
              }}
            >
              {t('nav.editProfile', {}, { defaultValue: 'Edit profile' })}
            </button>
          ) : null}
        </div>
      </section>

      <section className={cm.cn('grid gap-4 grid-cols-2 md:grid-cols-4 mb-8')}>
        <MetricKpiCard
          eyebrow={t('profile.kpi.total', {}, { defaultValue: 'Incidents · 90d' })}
          value={loading ? '—' : String(stats.total90d)}
          icon="warning"
          tone={stats.open > 0 ? 'degraded' : 'operational'}
        />
        <MetricKpiCard
          eyebrow={t('common.open', {}, { defaultValue: 'Open' })}
          value={loading ? '—' : String(stats.open)}
          icon="report"
          tone={stats.open > 0 ? 'major' : 'operational'}
        />
        <MetricKpiCard
          eyebrow={t('profile.kpi.resolved', {}, { defaultValue: 'Resolved · 90d' })}
          value={loading ? '—' : String(stats.resolved)}
          icon="check_circle"
          tone="operational"
        />
        <MetricKpiCard
          eyebrow={t('profile.kpi.mttr', {}, { defaultValue: 'Avg MTTR' })}
          value={loading || stats.mttrMin === null ? '—' : String(stats.mttrMin)}
          unit={stats.mttrMin === null ? undefined : 'min'}
          icon="timer"
          tone="operational"
        />
      </section>
    </div>
  )
}
