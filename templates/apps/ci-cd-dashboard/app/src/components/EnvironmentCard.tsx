import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type PipelineStatus, StatusPill } from './StatusPill.js'

/**
 * Environment card — large gradient-tinted header with environment name,
 * health pill, traffic %, current deploy mono-SHA + branch + author + age,
 * decorative blurred orb, and a vertical timeline of recent deploys.
 *
 * Translated from personal-finance's NetWorthCard hero (gradient bg,
 * decorative orbs, frosted-glass pill, mono numbers) + crm's
 * RecentActivities timeline shape for the deploys list.
 */

type EnvHealth = 'healthy' | 'degraded' | 'down'

interface EnvironmentDeploy {
  sha: string
  status: 'success' | 'failed' | 'rolled_back' | 'queued' | 'running' | 'cancelled'
  deployed_at: string
  /** Required only on the current_deploy. */
  branch?: string
  deployed_by?: string
}

export interface EnvironmentData {
  id: string
  name: string
  url: string
  status: EnvHealth
  traffic_pct: number
  current_deploy: EnvironmentDeploy & { branch: string; deployed_by: string }
  recent_deploys: EnvironmentDeploy[]
}

const TONE: Record<EnvHealth, { gradFrom: string; gradTo: string; accent: string; orb: string }> = {
  healthy: {
    gradFrom: 'var(--color-pill-success-ring)',
    gradTo: 'var(--color-pill-queued-bg)',
    accent: 'var(--color-pill-success-dot)',
    orb: 'var(--color-pill-success-ring)',
  },
  degraded: {
    gradFrom: 'var(--color-pill-degraded-ring)',
    gradTo: 'var(--color-pill-queued-bg)',
    accent: 'var(--color-pill-degraded-dot)',
    orb: 'var(--color-pill-degraded-ring)',
  },
  down: {
    gradFrom: 'var(--color-pill-failed-ring)',
    gradTo: 'var(--color-pill-queued-bg)',
    accent: 'var(--color-pill-failed-dot)',
    orb: 'var(--color-pill-failed-ring)',
  },
}

const DEPLOY_STATUS_TO_PIPELINE: Record<EnvironmentDeploy['status'], PipelineStatus> = {
  success: 'success',
  failed: 'failed',
  rolled_back: 'failed',
  queued: 'queued',
  running: 'running',
  cancelled: 'cancelled',
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface EnvironmentCardProps {
  environment: EnvironmentData
}

export function EnvironmentCard({ environment }: EnvironmentCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tone = TONE[environment.status]
  const sha = environment.current_deploy.sha.slice(0, 7)

  return (
    <article
      className={cm.cn('relative overflow-hidden rounded-[1.5rem]')}
      style={{
        backgroundImage: `linear-gradient(135deg, ${tone.gradFrom}, ${tone.gradTo})`,
        backgroundColor: 'var(--color-surface)',
        border: '1px solid rgba(30, 41, 59, 0.8)',
      }}
      data-mol-id={`environment-card-${environment.id}`}
    >
      {/* Decorative blurred orb */}
      <div
        className={
          'absolute -right-16 -bottom-20 h-56 w-56 rounded-full blur-3xl pointer-events-none'
        }
        style={{ backgroundColor: tone.orb }}
        aria-hidden="true"
      />

      <header className={'relative p-6 pb-5'}>
        {/* Wrap allows the traffic pill to drop under the name row on phone
            widths instead of overflowing the card edge. */}
        <div
          className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}
          style={{ flexWrap: 'wrap', rowGap: '0.5rem' }}
        >
          <div className={'flex items-center gap-3 min-w-0'}>
            <h3 className={'text-2xl font-extrabold tracking-tight text-on-surface truncate'}>
              {environment.name}
            </h3>
            <StatusPill status={environment.status === 'down' ? 'failed' : environment.status} />
          </div>
          <span
            className={
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md'
            }
            style={{ backgroundColor: 'rgba(255,255,255,0.10)', color: 'var(--color-on-surface)' }}
          >
            <span className="font-mono">{environment.traffic_pct}%</span>
            <span className="opacity-70">
              {t('environmentCard.traffic', {}, { defaultValue: 'traffic' })}
            </span>
          </span>
        </div>
        <a
          href={environment.url}
          target="_blank"
          rel="noreferrer"
          className={
            'mt-1 inline-flex items-center gap-1 py-1.5 font-mono text-xs text-on-surface-variant hover:text-primary transition-colors'
          }
        >
          <span className="material-symbols-outlined text-[12px]" aria-hidden="true">
            link
          </span>
          {environment.url.replace(/^https?:\/\//, '')}
        </a>
      </header>

      <section className={'relative px-6 pb-5'}>
        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          {t('environmentCard.currentDeploy', {}, { defaultValue: 'Current deploy' })}
        </p>
        <p className={'mt-1.5 font-mono text-2xl font-extrabold tracking-tighter text-on-surface'}>
          {sha}
        </p>
        <p className={'mt-1 font-mono text-xs text-on-surface-variant'}>
          <span style={{ color: tone.accent }} className="font-semibold">
            {environment.current_deploy.branch}
          </span>
          <span className={'mx-1.5 opacity-50'}>·</span>
          <span>{environment.current_deploy.deployed_by}</span>
          <span className={'mx-1.5 opacity-50'}>·</span>
          <span className="whitespace-nowrap">
            {fmtRelative(environment.current_deploy.deployed_at)}
          </span>
        </p>
      </section>

      <section
        className={'relative border-t px-6 py-5'}
        style={{ borderColor: 'rgba(30, 41, 59, 0.8)', backgroundColor: 'rgba(12, 14, 20, 0.35)' }}
      >
        <p
          className={
            'mb-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant'
          }
        >
          {t('environmentCard.recentDeploys', {}, { defaultValue: 'Recent deploys' })}
        </p>
        <ul className={'space-y-2.5'}>
          {environment.recent_deploys.slice(0, 3).map((d, idx) => (
            <li key={`${d.sha}-${idx}`} className={'flex items-center gap-3 text-xs'}>
              <StatusPill status={DEPLOY_STATUS_TO_PIPELINE[d.status]} />
              <span className={'font-mono font-semibold text-on-surface flex-1 truncate'}>
                {d.sha.slice(0, 7)}
              </span>
              <span className="font-mono text-on-surface-variant whitespace-nowrap">
                {fmtRelative(d.deployed_at)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}
