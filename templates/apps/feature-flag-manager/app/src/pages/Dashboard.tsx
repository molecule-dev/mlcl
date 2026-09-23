import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type AuditAction, AuditEntry, type AuditEntryData } from '../components/AuditEntry.js'
import type { EnvTone } from '../components/EnvironmentBadge.js'
import { FlagRow, type FlagRowData } from '../components/FlagRow.js'
import { KpiStatCard } from '../components/KpiStatCard.js'

/**
 * Dashboard — Pennant control panel landing for authed users. Pulls live
 * flags + audit-log data from the backend; on first load (no flags yet) it
 * triggers POST /api/seed which idempotently creates a small set of demo
 * environments + flags + audit entries so the dashboard isn't empty.
 */

interface FlagApi {
  id: string
  key: string
  name: string
  description?: string
  flag_type?: 'boolean' | 'multivariate' | 'string' | 'number'
  state?: 'on' | 'off' | 'killed' | 'scheduled'
  rollout_percentage?: number
  is_enabled?: boolean
  environment?: string | null
  stale_days?: number
  updated_at?: string
  updated_by?: string
}

interface AuditApi {
  id: string
  action: string
  actor: string
  actor_email?: string | null
  target?: string | null
  occurred_at?: string
  created_at?: string
  message?: string
}

const ENV_TONES: ReadonlyArray<EnvTone> = ['production', 'staging', 'development', 'custom']
const toEnvTone = (s: unknown): EnvTone =>
  ENV_TONES.includes(s as EnvTone) ? (s as EnvTone) : 'production'

const shapeFlag = (row: FlagApi): FlagRowData => ({
  key: row.key,
  name: row.name,
  description: row.description,
  flag_type: row.flag_type ?? 'boolean',
  state:
    row.state === 'killed'
      ? 'killed'
      : row.state === 'scheduled'
        ? 'scheduled'
        : row.is_enabled
          ? 'on'
          : 'off',
  rollout_percentage: row.rollout_percentage ?? 0,
  environments: row.environment ? [toEnvTone(row.environment)] : ['production'],
  updated_at: row.updated_at,
  updated_by: row.updated_by,
  stale_days: row.stale_days,
})

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

const shapeAudit = (row: AuditApi): AuditEntryData => ({
  id: row.id,
  actor: row.actor_email ?? row.actor ?? 'system',
  action: toAuditAction(row.action),
  target: row.target ?? '',
  created_at: row.occurred_at ?? row.created_at ?? new Date().toISOString(),
  message: row.message ?? '',
})

const isStale = (f: FlagRowData): boolean => {
  if (!f.updated_at) return false
  const days = (Date.now() - new Date(f.updated_at).getTime()) / 86_400_000
  return days > (f.stale_days ?? 30)
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [flags, setFlags] = useState<FlagRowData[]>([])
  const [audit, setAudit] = useState<AuditEntryData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        let flagsRes = await http.get<FlagApi[]>('/api/flags')
        const initial = Array.isArray(flagsRes.data) ? flagsRes.data : []
        if (initial.length === 0) {
          await http.post('/api/seed', {}).catch(() => null)
          flagsRes = await http.get<FlagApi[]>('/api/flags')
        }
        const auditRes = await http.get<AuditApi[]>('/api/audit-log?limit=10')
        if (cancelled) return
        const fArr = Array.isArray(flagsRes.data) ? flagsRes.data.map(shapeFlag) : []
        const aArr = Array.isArray(auditRes.data) ? auditRes.data.map(shapeAudit) : []
        setFlags(fArr)
        setAudit(aArr)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'load failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [http])

  const total = flags.length
  const active = flags.filter((f) => f.state === 'on').length
  const stale = flags.filter((f) => isStale(f)).length
  const killed = flags.filter((f) => f.state === 'killed').length
  const heroPct = total > 0 ? Math.round((active / total) * 100) : 0
  const recent = [...flags]
    .sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime())
    .slice(0, 5)

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))} data-mol-id="page-dashboard">
      {/* Hero card */}
      <article
        className={cm.cn('relative overflow-hidden rounded-[1.5rem]')}
        style={{
          backgroundImage:
            'linear-gradient(135deg, var(--color-success-banner-border), rgba(139, 92, 246, 0.20))',
          backgroundColor: 'var(--color-background-secondary)',
          border: '1px solid rgba(30, 41, 59, 0.8)',
        }}
      >
        <div
          className={cm.cn(
            'absolute -right-16 -bottom-20 h-56 w-56 rounded-full blur-3xl pointer-events-none',
          )}
          style={{ backgroundColor: 'var(--color-success-banner-border)' }}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'absolute -left-20 -top-16 h-48 w-48 rounded-full blur-3xl pointer-events-none',
          )}
          style={{ backgroundColor: 'rgba(139, 92, 246, 0.20)' }}
          aria-hidden="true"
        />
        <div className={cm.cn('relative p-7 md:p-10')}>
          <p
            className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
            style={{ color: 'var(--color-text-link)' }}
          >
            {t('dashboard.kicker', {}, { defaultValue: '// production · live' })}
          </p>
          <h1
            className={cm.cn(
              'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-2',
            )}
          >
            {t('dashboard.heading', {}, { defaultValue: 'Flag operations' })}
          </h1>
          <p className={cm.cn('text-on-surface-variant max-w-xl')}>
            {t(
              'dashboard.subheading',
              {},
              {
                defaultValue:
                  'A snapshot of every active flag, every targeting rule, and every change made today across your environments.',
              },
            )}
          </p>
          <div className={cm.cn('mt-7 flex items-baseline gap-4')}>
            <span
              className={cm.cn(
                'font-mono text-6xl font-extrabold tracking-tighter text-on-surface',
              )}
              style={{ fontVariantNumeric: 'tabular-nums' }}
              data-mol-id="dashboard-hero-active"
            >
              {active}
            </span>
            <div>
              <span
                className={cm.cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-widest backdrop-blur-md',
                )}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.10)',
                  color: 'var(--color-text-code)',
                }}
              >
                <span className={cm.cn('font-mono')}>{heroPct}%</span>
                <span className={cm.cn('opacity-70 uppercase')}>
                  {t('dashboard.activePct', {}, { defaultValue: 'active' })}
                </span>
              </span>
              <p className={cm.cn('mt-1 font-mono text-xs text-on-surface-variant')}>
                {t(
                  'dashboard.activeOfTotal',
                  { active, total },
                  { defaultValue: '{{active}} of {{total}} flags evaluated this hour' },
                )}
              </p>
            </div>
          </div>
        </div>
      </article>

      {/* KPI quad */}
      <div className={cm.cn('grid gap-4 grid-cols-2 lg:grid-cols-4')}>
        <KpiStatCard
          eyebrow={t('dashboard.kpi.total.eyebrow', {}, { defaultValue: 'Total flags' })}
          value={String(total)}
          tone="flag-on"
          icon="flag"
          caption={t(
            'dashboard.kpi.total.caption',
            {},
            { defaultValue: 'across all environments' },
          )}
        />
        <KpiStatCard
          eyebrow={t('status.active', {}, { defaultValue: 'Active' })}
          value={String(active)}
          unit={`/ ${total}`}
          tone="flag-on"
          icon="bolt"
          caption={t('dashboard.kpi.active.caption', {}, { defaultValue: 'currently ON' })}
        />
        <KpiStatCard
          eyebrow={t('dashboard.kpi.stale.eyebrow', {}, { defaultValue: 'Stale' })}
          value={String(stale)}
          tone="stale"
          icon="watch_later"
          changeLabel={t('dashboard.kpi.stale.change', {}, { defaultValue: '30+ days idle' })}
          changeTone="stale"
          caption={t('dashboard.kpi.stale.caption', {}, { defaultValue: 'candidates for cleanup' })}
        />
        <KpiStatCard
          eyebrow={t('dashboard.kpi.killed.eyebrow', {}, { defaultValue: 'Killed' })}
          value={String(killed)}
          tone="flag-killed"
          icon="dangerous"
          caption={t('dashboard.kpi.killed.caption', {}, { defaultValue: 'killswitches engaged' })}
        />
      </div>

      {/* Two-column: recent flag changes + audit feed. min-w-0 on the grid
          items lets the truncating audit rows below shrink instead of
          stretching the track wider than a 390px viewport. */}
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
                {t('status.live', {}, { defaultValue: 'Live' })}
              </p>
              <h2 className={cm.cn('text-lg font-extrabold text-on-surface')}>
                {t('dashboard.recent.heading', {}, { defaultValue: 'Recent flag changes' })}
              </h2>
            </div>
            <Link
              to="/flags"
              className={cm.cn(
                'inline-flex min-h-[28px] items-center font-mono text-xs font-bold transition-colors hover:opacity-80',
              )}
              style={{ color: 'var(--color-text-link)' }}
            >
              {t('dashboard.recent.viewAll', {}, { defaultValue: 'All flags →' })}
            </Link>
          </header>
          <div className={cm.cn('p-4 space-y-3')} data-mol-id="dashboard-recent-flags">
            {loading ? (
              <p className={cm.cn('text-sm text-on-surface-variant')}>
                {t('dashboard.loading', {}, { defaultValue: 'Loading flags…' })}
              </p>
            ) : error ? (
              <p className={cm.cn('text-sm')} style={{ color: 'var(--color-error-chip-text)' }}>
                {t(
                  'dashboard.error',
                  { message: error },
                  { defaultValue: 'Could not load flags ({{message}}).' },
                )}
              </p>
            ) : recent.length === 0 ? (
              <p className={cm.cn('text-sm text-on-surface-variant')}>
                {t(
                  'dashboard.empty.flags',
                  {},
                  { defaultValue: 'No flags yet. Create one to get started.' },
                )}
              </p>
            ) : (
              recent.map((f) => <FlagRow key={f.key} flag={f} />)
            )}
          </div>
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
              {t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
            </h2>
          </header>
          <ul className={cm.cn('py-1')} data-mol-id="dashboard-audit-feed">
            {audit.length === 0 && !loading ? (
              <li className={cm.cn('px-5 py-3 text-sm text-on-surface-variant')}>
                {t('dashboard.empty.audit', {}, { defaultValue: 'No activity yet.' })}
              </li>
            ) : (
              audit
                .slice(0, 6)
                .map((entry, i, arr) => (
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
            {t('dashboard.audit.viewAll', {}, { defaultValue: 'View full audit log →' })}
          </Link>
        </section>
      </div>
    </div>
  )
}
