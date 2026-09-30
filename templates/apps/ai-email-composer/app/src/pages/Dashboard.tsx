import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { EmailKpiTriad } from '../components/EmailKpiTriad.js'
import { InboxHeroCard } from '../components/InboxHeroCard.js'
import type { RecentEmail } from '../components/RecentSentList.js'
import { RecentSentList } from '../components/RecentSentList.js'
import type { EmailTemplate, TemplateCategory } from '../components/TemplateLibraryGrid.js'
import { TemplateLibraryGrid } from '../components/TemplateLibraryGrid.js'

interface DraftRow {
  id: string
  subject: string
  body: string
  status: string
  recipients: unknown
  ai_generated?: boolean
  scheduled_at?: string | null
  sent_at?: string | null
  updated_at?: string
  created_at?: string
}

interface SentRow {
  id: string
  draft_id: string
  recipient_email: string
  status: string
  created_at?: string
  updated_at?: string
  opened_at?: string | null
  clicked_at?: string | null
  bounced_at?: string | null
}

interface TemplateRow {
  id: string
  name: string
  description: string
  subject: string
  category: string
}

interface AnalyticsSummary {
  total_sent?: number
  total_delivered?: number
  total_opened?: number
  total_clicked?: number
  total_bounced?: number
  total_replied?: number
  open_rate?: number
  reply_rate?: number
  click_rate?: number
  bounce_rate?: number
  delivery_rate?: number
}

const ACCENTS: ReadonlyArray<'primary' | 'secondary' | 'tertiary'> = [
  'primary',
  'secondary',
  'tertiary',
]

function statusFromSent(s: SentRow): RecentEmail['status'] {
  const v = s.status?.toLowerCase()
  if (v === 'opened' || v === 'clicked') return 'opened'
  if (v === 'bounced' || v === 'failed') return 'bounced'
  if (v === 'replied') return 'replied'
  if (v === 'delivered') return 'delivered'
  return 'sent'
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [drafts, setDrafts] = useState<DraftRow[]>([])
  const [sent, setSent] = useState<SentRow[]>([])
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const [draftsResp, sentResp, templatesResp, summaryResp] = await Promise.all([
          http.get<DraftRow[] | { data: DraftRow[] }>('/drafts'),
          http.get<SentRow[] | { data: SentRow[] }>('/sent-emails'),
          http.get<TemplateRow[] | { data: TemplateRow[] }>('/templates'),
          http.get<AnalyticsSummary>('/sent-emails/analytics/summary').catch(() => ({ data: {} })),
        ])
        if (cancelled) return
        const draftRows = Array.isArray(draftsResp.data)
          ? draftsResp.data
          : (draftsResp.data.data ?? [])
        const sentRows = Array.isArray(sentResp.data) ? sentResp.data : (sentResp.data.data ?? [])
        const tmplRows = Array.isArray(templatesResp.data)
          ? templatesResp.data
          : (templatesResp.data.data ?? [])
        setDrafts(draftRows)
        setSent(sentRows)
        setTemplates(tmplRows)
        setSummary(summaryResp.data ?? null)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : t('dashboard.loadFailed', {}, { defaultValue: 'Could not load your dashboard.' }),
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, reloadKey, t])

  const recentEmails = useMemo<RecentEmail[]>(() => {
    return sent
      .slice()
      .sort((a, b) => {
        const ta = new Date(a.updated_at ?? a.created_at ?? 0).getTime()
        const tb = new Date(b.updated_at ?? b.created_at ?? 0).getTime()
        return tb - ta
      })
      .slice(0, 4)
      .map((s) => {
        const draft = drafts.find((d) => d.id === s.draft_id)
        return {
          id: s.id,
          subject: draft?.subject ?? t('dashboard.untitled', {}, { defaultValue: '(no subject)' }),
          recipient: s.recipient_email,
          snippet: draft?.body?.slice(0, 220) ?? '',
          sent_at: s.updated_at ?? s.created_at ?? new Date().toISOString(),
          status: statusFromSent(s),
          ai_generated: draft?.ai_generated,
        }
      })
  }, [drafts, sent, t])

  const topTemplates = useMemo<EmailTemplate[]>(() => {
    return templates.slice(0, 6).map((tpl, idx) => ({
      id: tpl.id,
      name: tpl.name,
      category: (tpl.category as TemplateCategory) ?? 'sales',
      preview: tpl.description || tpl.subject || '',
      usage_count: 0,
      accent: ACCENTS[idx % ACCENTS.length],
    }))
  }, [templates])

  const draftCount = useMemo(() => drafts.filter((d) => d.status === 'draft').length, [drafts])
  const scheduledCount = useMemo(
    () => drafts.filter((d) => d.status === 'scheduled').length,
    [drafts],
  )
  const totalSent = summary?.total_sent ?? sent.length
  const openRate = Math.round(summary?.open_rate ?? 0)
  const replyRate = Math.round(summary?.reply_rate ?? 0)

  const history = useMemo(() => {
    const days = 14
    const buckets = Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10),
      opens: 0,
    }))
    for (const s of sent) {
      if (s.opened_at == null) continue
      const day = new Date(s.opened_at).toISOString().slice(0, 10)
      const bucket = buckets.find((b) => b.date === day)
      if (bucket) bucket.opens += 1
    }
    return buckets.map((b) => ({ date: new Date(b.date).toISOString(), opens: b.opens }))
  }, [sent])

  const sentChangePct = useMemo(() => {
    if (sent.length < 2) return 0
    const now = Date.now()
    const week = 7 * 86_400_000
    const last7 = sent.filter((s) => {
      const ts = new Date(s.created_at ?? s.updated_at ?? 0).getTime()
      return now - ts < week
    }).length
    const prev7 = sent.filter((s) => {
      const ts = new Date(s.created_at ?? s.updated_at ?? 0).getTime()
      return now - ts >= week && now - ts < 2 * week
    }).length
    if (prev7 === 0) return last7 > 0 ? 100 : 0
    return Math.round(((last7 - prev7) / prev7) * 100)
  }, [sent])

  return (
    <div
      data-mol-id="dashboard-page"
      className={cm.cn('px-4 py-6 md:px-8 md:py-8', cm.maxW('7xl'), 'mx-auto', cm.stack(8))}
    >
      <header>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tighter')}>
          {t('dashboard.heading', {}, { defaultValue: 'Your week, composed' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'dashboard.subheading',
            {},
            { defaultValue: 'Drafts, sends, and signals — all in one calm view.' },
          )}
        </p>
      </header>

      {error && (
        <LoadErrorBanner
          data-mol-id="dashboard-error"
          message={error}
          retryMolId="dashboard-retry"
          onRetry={() => {
            setReloadKey((k) => k + 1)
            return Promise.resolve()
          }}
        />
      )}

      <section
        className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-stretch')}
      >
        <InboxHeroCard sent={totalSent} changePct={sentChangePct} history={history} />
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'between' }),
            cm.sp('p', 6),
            'lg:col-span-4 bg-surface-container-lowest rounded-2xl shadow-sm',
          )}
        >
          <div>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('dashboard.composeCtaLabel', {}, { defaultValue: 'Quick compose' })}
            </p>
            <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 2), 'font-bold leading-snug')}>
              {t(
                'dashboard.composeCtaHeading',
                { app: APP_NAME },
                {
                  defaultValue: `Need to send something? ${APP_NAME} can have a draft ready in seconds.`,
                },
              )}
            </p>
          </div>
          <Link
            to="/compose"
            data-mol-id="dashboard-compose-cta"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              cm.sp('mt', 6),
              'rounded-xl text-white text-center transition-all hover:shadow-lg active:scale-95',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #a78bfa))',
              boxShadow: '0 8px 24px color-mix(in srgb, var(--color-primary) 28%, transparent)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              edit_note
            </span>
            {t('dashboard.composeCta', {}, { defaultValue: 'Open composer' })}
          </Link>
        </div>
      </section>

      <EmailKpiTriad
        drafts={draftCount}
        scheduled={scheduledCount}
        openRatePct={openRate}
        replyRatePct={replyRate}
      />

      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('dashboard.recentHeading', {}, { defaultValue: 'Recent Sent' })}
          </h2>
          <Link
            to="/inbox"
            data-mol-id="dashboard-view-inbox"
            className={cm.cn(cm.textSize('sm'), 'font-bold text-primary hover:underline')}
          >
            {t('dashboard.viewAllLink', {}, { defaultValue: 'View inbox →' })}
          </Link>
        </div>
        {loading ? (
          <p
            data-mol-id="dashboard-recent-loading"
            className={cm.cn(cm.textSize('sm'), cm.sp('py', 6), 'text-on-surface-variant')}
          >
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : recentEmails.length === 0 ? (
          <div
            data-mol-id="dashboard-recent-empty"
            className={cm.cn(
              cm.sp('p', 8),
              cm.textCenter,
              'rounded-2xl border-2 border-dashed border-outline-variant/60 text-on-surface-variant',
            )}
          >
            <p className={cm.textSize('sm')}>
              {t(
                'dashboard.recentEmpty',
                {},
                { defaultValue: 'No sends yet — your sent emails will appear here.' },
              )}
            </p>
          </div>
        ) : (
          <RecentSentList emails={recentEmails} />
        )}
      </section>

      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('dashboard.templatesHeading', {}, { defaultValue: 'Top templates' })}
          </h2>
          <Link
            to="/templates"
            data-mol-id="dashboard-manage-library"
            className={cm.cn(cm.textSize('sm'), 'font-bold text-primary hover:underline')}
          >
            {t('dashboard.manageLibrary', {}, { defaultValue: 'Manage library →' })}
          </Link>
        </div>
        {loading ? (
          <p
            data-mol-id="dashboard-templates-loading"
            className={cm.cn(cm.textSize('sm'), cm.sp('py', 6), 'text-on-surface-variant')}
          >
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : (
          <TemplateLibraryGrid templates={topTemplates} />
        )}
      </section>
    </div>
  )
}

export default Dashboard
export { Dashboard as DashboardPage }
