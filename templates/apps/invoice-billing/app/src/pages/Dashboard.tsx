import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ActivityFeed, type ActivityItem } from '../components/ActivityFeed.js'
import { type InvoiceRow, InvoiceTableRow } from '../components/InvoiceTableRow.js'
import { KpiStatCard } from '../components/KpiStatCard.js'
import { RevenueHeroCard } from '../components/RevenueHeroCard.js'
import { useIsMobile } from '../components/useIsMobile.js'

interface DashboardSummary {
  outstanding_cents: number
  overdue_cents: number
  collected_this_month_cents: number
  collected_all_time_cents: number
  open_invoices: number
  draft_count: number
  sent_count: number
  paid_this_week_count: number
  recurring_active_count: number
  change_pct: number
}

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const isMobile = useIsMobile()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])

  useEffect(() => {
    let active = true
    http
      .get<DashboardSummary>('/api/dashboard/summary')
      .then((r) => {
        if (active) setSummary(r.data)
      })
      .catch(() => {
        if (active) setSummary(null)
      })
    http
      .get<ActivityItem[]>('/api/dashboard/activity')
      .then((r) => {
        if (active) setActivity(Array.isArray(r.data) ? r.data : [])
      })
      .catch(() => {
        if (active) setActivity([])
      })
    http
      .get<InvoiceRow[]>('/api/invoices')
      .then((r) => {
        if (active) setInvoices(Array.isArray(r.data) ? r.data.slice(0, 5) : [])
      })
      .catch(() => {
        if (active) setInvoices([])
      })
    return () => {
      active = false
    }
  }, [http])

  const heroOutstandingCents = summary?.outstanding_cents ?? 0
  const heroCollectedCents = summary?.collected_this_month_cents ?? 0
  const heroChangePct = summary?.change_pct ?? 0
  const heroInvoicesOpen = summary?.open_invoices ?? 0

  return (
    <div data-mol-id="page-dashboard" className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}
        style={{ flexWrap: 'wrap', gap: '12px' }}
      >
        <div>
          <span
            style={{
              fontSize: '11px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-primary-dark)',
              fontWeight: 700,
            }}
          >
            {t('status.today', {}, { defaultValue: 'Today' })}
          </span>
          <h1
            className={cm.cn(cm.fontWeight('bold'))}
            style={{
              fontSize: '30px',
              letterSpacing: '-0.02em',
              color: 'var(--mol-color-text)',
              margin: '4px 0 0',
            }}
          >
            {t('dashboard.title', {}, { defaultValue: 'Welcome back. Cash is on its way.' })}
          </h1>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <Link
            to="/clients"
            style={{
              padding: '10px 18px',
              borderRadius: '9999px',
              backgroundColor: 'var(--mol-color-surface)',
              color: 'var(--color-primary-dark)',
              fontWeight: 600,
              fontSize: '13px',
              textDecoration: 'none',
              border: '1px solid var(--mol-color-border)',
            }}
          >
            {t('dashboard.addClient', {}, { defaultValue: 'New client' })}
          </Link>
          <Link
            to="/invoices/new"
            style={{
              padding: '10px 22px',
              borderRadius: '9999px',
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-sidebar-text-active)',
              fontWeight: 700,
              fontSize: '13px',
              textDecoration: 'none',
              boxShadow: '0 6px 18px var(--color-accent-shadow)',
            }}
          >
            {t('nav.newInvoice', {}, { defaultValue: 'New invoice' })}
          </Link>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(12, 1fr)',
          gap: '20px',
          alignItems: 'stretch',
        }}
      >
        <div style={isMobile ? undefined : { gridColumn: 'span 8' }}>
          <RevenueHeroCard
            outstandingCents={heroOutstandingCents}
            collectedCents={heroCollectedCents}
            changePct={heroChangePct}
            invoicesOpen={heroInvoicesOpen}
          />
        </div>
        <div
          style={{
            ...(isMobile ? {} : { gridColumn: 'span 4' }),
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(auto-fit, minmax(150px, 1fr))' : '1fr',
            gridTemplateRows: isMobile ? undefined : 'repeat(2, 1fr)',
            gap: '20px',
          }}
        >
          <KpiStatCard
            label={t('status.overdue', {}, { defaultValue: 'Overdue' })}
            value={formatCurrency(summary?.overdue_cents ?? 0)}
            icon="schedule"
            tone="overdue"
          />
          <KpiStatCard
            label={t('dashboard.kpi.thisMonth', {}, { defaultValue: 'Collected MTD' })}
            value={formatCurrency(heroCollectedCents)}
            icon="paid"
            tone="collected"
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
        }}
      >
        <KpiStatCard
          label={t('dashboard.kpi.draft', {}, { defaultValue: 'Drafts' })}
          value={String(summary?.draft_count ?? 0)}
          icon="edit_note"
          tone="neutral"
          caption={t('dashboard.kpi.draftCaption', {}, { defaultValue: 'Ready to send' })}
        />
        <KpiStatCard
          label={t('dashboard.kpi.sent', {}, { defaultValue: 'Sent' })}
          value={String(summary?.sent_count ?? 0)}
          icon="send"
          tone="outstanding"
          caption={t('dashboard.kpi.sentCaption', {}, { defaultValue: 'Awaiting reply' })}
        />
        <KpiStatCard
          label={t('dashboard.kpi.paidCount', {}, { defaultValue: 'Paid this week' })}
          value={String(summary?.paid_this_week_count ?? 0)}
          icon="check_circle"
          tone="revenue"
        />
        <KpiStatCard
          label={t('dashboard.kpi.recurring', {}, { defaultValue: 'Recurring' })}
          value={String(summary?.recurring_active_count ?? 0)}
          icon="autorenew"
          tone="collected"
          caption={t('dashboard.kpi.recurringCaption', {}, { defaultValue: 'Active schedules' })}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr',
          gap: '20px',
        }}
      >
        <section
          className={cm.cn(cm.sp('p', 0), 'bg-surface rounded-2xl shadow-sm overflow-hidden')}
          style={{ border: '1px solid var(--mol-color-border)' }}
        >
          <div
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}
            style={{ padding: '18px 20px', borderBottom: '1px solid var(--color-draft-light)' }}
          >
            <div>
              <h3
                className={cm.cn(cm.fontWeight('bold'))}
                style={{
                  fontSize: '16px',
                  color: 'var(--mol-color-text)',
                  letterSpacing: '-0.01em',
                }}
              >
                {t('dashboard.recent.title', {}, { defaultValue: 'Recent invoices' })}
              </h3>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--mol-color-text-secondary)',
                  marginTop: '2px',
                }}
              >
                {t('dashboard.recent.subtitle', {}, { defaultValue: 'Latest 5 — newest first' })}
              </p>
            </div>
            <Link
              to="/invoices"
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-sidebar-hover)',
                textDecoration: 'none',
              }}
            >
              {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
            </Link>
          </div>
          {/* Wide table: scrolls horizontally on small screens instead of cramming. */}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '640px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1.6fr 1.1fr 1.4fr 1.1fr 0.8fr',
                  padding: '10px 16px',
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--mol-color-text-tertiary)',
                  backgroundColor: 'var(--mol-color-surface-secondary)',
                  borderBottom: '1px solid var(--mol-color-border)',
                }}
              >
                <span>{t('dashboard.recent.col.number', {}, { defaultValue: 'Invoice' })}</span>
                <span>{t('nav.client', {}, { defaultValue: 'Client' })}</span>
                <span>{t('form.due', {}, { defaultValue: 'Due' })}</span>
                <span style={{ textAlign: 'right' }}>
                  {t('form.amount', {}, { defaultValue: 'Amount' })}
                </span>
                <span>{t('nav.status', {}, { defaultValue: 'Status' })}</span>
                <span style={{ textAlign: 'right' }}>
                  {t('dashboard.recent.col.paid', {}, { defaultValue: 'Paid' })}
                </span>
              </div>
              {invoices.length === 0 ? (
                <div
                  style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: 'var(--mol-color-text-tertiary)',
                    fontSize: '13px',
                  }}
                >
                  {t(
                    'dashboard.recent.empty',
                    {},
                    { defaultValue: 'No invoices yet — create your first one.' },
                  )}
                </div>
              ) : (
                invoices.map((inv) => <InvoiceTableRow key={inv.id} invoice={inv} />)
              )}
            </div>
          </div>
        </section>

        <ActivityFeed items={activity} />
      </div>
    </div>
  )
}

export default Dashboard
