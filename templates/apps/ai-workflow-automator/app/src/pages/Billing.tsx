/**
 * Billing — current plan card, usage meters, and pricing tiers. Heavy
 * lifting (Stripe checkout / portal) is delegated to the bonded billing
 * package; this page surfaces the current state and routes to the proper
 * sub-pages for changes.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WorkflowAppShell } from '../components/WorkflowAppShell.js'
import { WorkflowStatCard } from '../components/WorkflowStatCard.js'

interface DashboardSummary {
  runs_today?: number
  active_workflows?: number
  total_workflows?: number
  failed_24h?: number
}

interface BillingStatus {
  planKey?: string
  category?: string
  name?: string
  isFree?: boolean
  limits?: {
    maxRuns?: number
    maxWorkflows?: number
    advancedFeatures?: boolean
    canExport?: boolean
    retentionDays?: number
  }
}

const DEFAULT_PLAN: BillingStatus = {
  planKey: 'free',
  category: 'free',
  name: 'Free',
  isFree: true,
  limits: {
    maxRuns: 5,
    maxWorkflows: 5,
    advancedFeatures: false,
    canExport: false,
    retentionDays: 90,
  },
}

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [status, setStatus] = useState<BillingStatus>(DEFAULT_PLAN)
  const [canceling, setCanceling] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  async function refreshStatus() {
    try {
      const res = await http.get<BillingStatus>('/api/billing/status')
      const data = res?.data ?? {}
      setStatus({
        ...DEFAULT_PLAN,
        ...data,
        limits: { ...DEFAULT_PLAN.limits, ...(data.limits ?? {}) },
      })
    } catch (_error) {
      // Billing status fetch failed; degrade gracefully to the free-tier defaults.
      setStatus(DEFAULT_PLAN)
    }
  }

  useEffect(() => {
    let cancelled = false
    http
      .get<DashboardSummary>('/api/dashboard')
      .then((res) => {
        if (cancelled) return
        setSummary(res.data ?? {})
      })
      .catch(() => {
        if (cancelled) return
        setSummary({})
      })
    void refreshStatus()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  async function handleCancel() {
    if (canceling) return
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        t(
          'billing.cancelConfirm',
          {},
          {
            defaultValue:
              'Cancel your current subscription? You will retain access until the end of the period.',
          },
        ),
      )
    )
      return
    setCanceling(true)
    setFeedback(null)
    try {
      const res = await http.post<{ canceled?: boolean; error?: string }>('/api/billing/cancel', {})
      const data = res?.data ?? {}
      if (data.canceled) {
        setFeedback({
          kind: 'ok',
          msg: t('billing.cancelOk', {}, { defaultValue: 'Subscription canceled.' }),
        })
        await refreshStatus()
      } else if (data.error) {
        setFeedback({ kind: 'err', msg: data.error })
      } else {
        setFeedback({
          kind: 'err',
          msg: t('billing.cancelFailed', {}, { defaultValue: 'Could not cancel subscription.' }),
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Cancel failed.'
      setFeedback({ kind: 'err', msg: message })
    } finally {
      setCanceling(false)
    }
  }

  const runsToday = summary?.runs_today ?? 0
  const active = summary?.active_workflows ?? 0
  const total = summary?.total_workflows ?? 0
  const failed = summary?.failed_24h ?? 0
  const planName = status.name || 'Free'
  const isFree = status.isFree !== false && (status.planKey === 'free' || !status.planKey)
  const planNote = isFree
    ? t(
        'billing.planNoteFree',
        { runs: status.limits?.maxRuns ?? 5, workflows: status.limits?.maxWorkflows ?? 5 },
        {
          defaultValue:
            'Free tier — {{runs}} runs and {{workflows}} active workflows. Upgrade for higher limits.',
        },
      )
    : t(
        'billing.planNotePaid',
        { runs: status.limits?.maxRuns ?? 0, workflows: status.limits?.maxWorkflows ?? 0 },
        { defaultValue: 'Paid plan — {{runs}} runs and {{workflows}} active workflows.' },
      )

  return (
    <WorkflowAppShell
      pageId="billing"
      eyebrow={t('billing.eyebrow', {}, { defaultValue: 'Account · Plan & usage' })}
      title={t('billing.title', {}, { defaultValue: 'Billing & usage' })}
      description={t(
        'billing.description',
        {},
        { defaultValue: 'Track usage, manage your plan, and pull invoices for accounting.' },
      )}
    >
      {/* Current plan banner */}
      <div
        data-mol-id="billing-plan-card"
        className={'rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden text-white shadow-xl'}
        style={{
          background:
            'linear-gradient(135deg, var(--color-node-trigger) 0%, var(--color-node-condition) 100%)',
          boxShadow: '0 20px 50px color-mix(in srgb, var(--color-node-trigger) 30%, transparent)',
        }}
      >
        <div
          className={
            'absolute -right-16 -bottom-16 w-72 h-72 rounded-full blur-3xl pointer-events-none'
          }
          style={{ background: 'color-mix(in srgb, white 18%, transparent)' }}
          aria-hidden
        />
        <div className={'relative z-10 flex flex-wrap gap-6 items-end justify-between'}>
          <div>
            <div
              className={'text-xs font-bold uppercase tracking-widest mb-2'}
              style={{ color: 'color-mix(in srgb, var(--color-sidebar-text) 90%, transparent)' }}
            >
              {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
            </div>
            <div
              className={'text-4xl md:text-5xl font-extrabold tracking-tight'}
              data-mol-id="billing-plan-name"
            >
              {planName}
            </div>
            <p className={'mt-2 text-sm opacity-90 max-w-md'}>{planNote}</p>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <Link
              to="/pricing"
              data-mol-id="billing-change-plan"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-full backdrop-blur-md transition-colors hover:bg-surface/30',
              )}
              style={{ background: 'color-mix(in srgb, white 20%, transparent)', color: 'white' }}
            >
              {t('billing.changePlan', {}, { defaultValue: 'Change plan' })}
            </Link>
            {!isFree && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={canceling}
                data-mol-id="billing-cancel-plan"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-full transition-colors',
                )}
                style={{
                  background: 'var(--color-on-primary)',
                  color: 'var(--color-danger-btn)',
                  opacity: canceling ? 0.6 : 1,
                }}
              >
                {canceling
                  ? t('billing.canceling', {}, { defaultValue: 'Canceling…' })
                  : t('billing.cancelPlan', {}, { defaultValue: 'Cancel plan' })}
              </button>
            )}
            <Link
              to="/settings"
              data-mol-id="billing-update-billing"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-full transition-colors',
              )}
              style={{ background: 'var(--color-on-primary)', color: 'var(--color-accent-violet)' }}
            >
              {t('billing.updateBilling', {}, { defaultValue: 'Update settings' })}
            </Link>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          data-mol-id="billing-feedback"
          className={cm.cn(cm.sp('p', 3), cm.sp('mb', 6), cm.textSize('sm'), 'rounded-xl')}
          role="status"
          style={{
            background:
              feedback.kind === 'ok'
                ? 'var(--color-status-success-bg)'
                : 'var(--color-status-error-bg)',
            color:
              feedback.kind === 'ok'
                ? 'var(--color-status-success-fg)'
                : 'var(--color-status-error-fg)',
          }}
        >
          {feedback.msg}
        </div>
      )}

      {/* Usage stats */}
      <div className={'grid gap-4 grid-cols-1 md:grid-cols-3 mb-8'}>
        <WorkflowStatCard
          label={t('billing.runsLabel', {}, { defaultValue: 'Runs in last 24h' })}
          value={runsToday.toLocaleString()}
          icon="bolt"
          accent="var(--color-node-trigger)"
        />
        <WorkflowStatCard
          label={t('billing.workflowsLabel', {}, { defaultValue: 'Active workflows' })}
          value={String(active)}
          caption={t(
            'billing.workflowsCaption',
            { total },
            { defaultValue: '{{total}} total in workspace' },
          )}
          icon="account_tree"
          accent="var(--color-node-condition)"
        />
        <WorkflowStatCard
          label={t('billing.failedLabel', {}, { defaultValue: 'Failed runs · 24h' })}
          value={String(failed)}
          icon="error"
          accent="var(--color-status-failure)"
        />
      </div>

      {/* Tiers shortcut */}
      <h2
        className={cm.cn(
          cm.textSize('xl'),
          cm.fontWeight('bold'),
          cm.sp('mb', 4),
          'tracking-tight',
        )}
      >
        {t('billing.tiersTitle', {}, { defaultValue: 'Plans' })}
      </h2>
      <div
        className={cm.cn(cm.sp('p', 6), cm.sp('mb', 6), 'rounded-2xl bg-surface shadow-sm')}
        style={{ border: '1px solid var(--color-border)' }}
      >
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mb', 4))}>
          {t(
            'billing.tiersBlurb',
            {},
            {
              defaultValue:
                'Compare every tier — runs, active workflows, advanced features, and support — on the dedicated pricing page.',
            },
          )}
        </p>
        <Link
          to="/pricing"
          data-mol-id="billing-view-pricing"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-full text-white shadow-md self-start inline-flex',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-node-trigger), var(--color-node-condition))',
            boxShadow: '0 4px 12px color-mix(in srgb, var(--color-node-trigger) 30%, transparent)',
          }}
        >
          <span className={'material-symbols-outlined text-lg'}>list_alt</span>
          {t('billing.viewPricing', {}, { defaultValue: 'View pricing' })}
        </Link>
      </div>

      {/* Invoices placeholder */}
      <h2
        className={cm.cn(
          cm.textSize('xl'),
          cm.fontWeight('bold'),
          cm.sp('mb', 4),
          'tracking-tight',
        )}
      >
        {t('billing.invoicesTitle', {}, { defaultValue: 'Invoice history' })}
      </h2>
      <div
        className={cm.cn(cm.sp('p', 8), cm.textCenter, 'rounded-xl bg-surface')}
        data-mol-id="billing-invoices-empty"
        style={{ border: '1px dashed var(--color-border)' }}
      >
        <span
          className={cm.cn('material-symbols-outlined text-4xl', cm.sp('mb', 3))}
          style={{ color: 'var(--color-accent-violet-light)' }}
        >
          receipt_long
        </span>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t(
            'billing.invoicesEmpty',
            {},
            {
              defaultValue: 'No invoices yet. They will appear here after your first paid renewal.',
            },
          )}
        </p>
      </div>
    </WorkflowAppShell>
  )
}

export default Billing
