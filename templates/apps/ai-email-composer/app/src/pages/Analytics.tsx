import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EmailKpiTriad } from '../components/EmailKpiTriad.js'
import { StatusPill } from '../components/StatusPill.js'

interface DraftRow {
  id: string
  subject: string
  status: string
  tone?: string | null
  template_id?: string | null
}

interface SentRow {
  id: string
  draft_id: string
  recipient_email: string
  status: string
  opened_at?: string | null
  clicked_at?: string | null
  created_at?: string
  updated_at?: string
}

interface TemplateRow {
  id: string
  name: string
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

const TONE_LABELS: Record<string, string> = {
  formal: 'Formal',
  friendly: 'Friendly',
  concise: 'Concise',
  persuasive: 'Persuasive',
  urgent: 'Urgent',
  warm: 'Warm',
}

interface ToneRow {
  tone: string
  sends: number
  open_rate: number
  reply_rate: number
}

interface TemplateStat {
  id: string
  name: string
  category: string
  sends: number
  open_rate: number
  reply_rate: number
}

function rateOf(numerator: number, denom: number): number {
  if (denom === 0) return 0
  return Math.round((numerator / denom) * 100)
}

function bar(value: number, max: number): number {
  if (max === 0) return 4
  return Math.max(4, Math.round((value / max) * 100))
}

export function Analytics() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [drafts, setDrafts] = useState<DraftRow[]>([])
  const [sent, setSent] = useState<SentRow[]>([])
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        setSummary(summaryResp.data ?? {})
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load analytics')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http])

  const draftCount = useMemo(() => drafts.filter((d) => d.status === 'draft').length, [drafts])
  const scheduledCount = useMemo(
    () => drafts.filter((d) => d.status === 'scheduled').length,
    [drafts],
  )
  const openRate = Math.round(summary?.open_rate ?? 0)
  const replyRate = Math.round(summary?.reply_rate ?? 0)

  // Build per-tone effectiveness from drafts × sent
  const toneRows = useMemo<ToneRow[]>(() => {
    const byTone = new Map<string, { sends: number; opens: number; replies: number }>()
    for (const s of sent) {
      const draft = drafts.find((d) => d.id === s.draft_id)
      const tone = (draft?.tone ?? 'persuasive') as string
      const bucket = byTone.get(tone) ?? { sends: 0, opens: 0, replies: 0 }
      bucket.sends += 1
      if (s.opened_at) bucket.opens += 1
      if (s.status === 'replied') bucket.replies += 1
      byTone.set(tone, bucket)
    }
    return Array.from(byTone.entries())
      .map(([tone, b]) => ({
        tone: TONE_LABELS[tone] ?? tone,
        sends: b.sends,
        open_rate: rateOf(b.opens, b.sends),
        reply_rate: rateOf(b.replies, b.sends),
      }))
      .sort((a, b) => b.sends - a.sends)
  }, [drafts, sent])

  const templateRows = useMemo<TemplateStat[]>(() => {
    const byTemplate = new Map<string, { sends: number; opens: number; replies: number }>()
    for (const s of sent) {
      const draft = drafts.find((d) => d.id === s.draft_id)
      const tplId = draft?.template_id
      if (!tplId) continue
      const bucket = byTemplate.get(tplId) ?? { sends: 0, opens: 0, replies: 0 }
      bucket.sends += 1
      if (s.opened_at) bucket.opens += 1
      if (s.status === 'replied') bucket.replies += 1
      byTemplate.set(tplId, bucket)
    }
    return templates
      .map((tpl) => {
        const b = byTemplate.get(tpl.id) ?? { sends: 0, opens: 0, replies: 0 }
        return {
          id: tpl.id,
          name: tpl.name,
          category: tpl.category,
          sends: b.sends,
          open_rate: rateOf(b.opens, b.sends),
          reply_rate: rateOf(b.replies, b.sends),
        }
      })
      .sort((a, b) => b.sends - a.sends)
  }, [drafts, sent, templates])

  const maxToneSends = Math.max(0, ...toneRows.map((t) => t.sends))

  // Engagement Over Time — daily open counts for the last 14 days, from the
  // sent_emails rows (opened_at). Same bucketing the dashboard sparkline uses.
  const engagementSeries = useMemo(() => {
    const days = 14
    const buckets = Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10),
      opens: 0,
      sends: 0,
    }))
    for (const s of sent) {
      const sendDay = new Date(s.created_at ?? s.updated_at ?? 0).toISOString().slice(0, 10)
      const sendBucket = buckets.find((b) => b.date === sendDay)
      if (sendBucket) sendBucket.sends += 1
      if (s.opened_at == null) continue
      const day = new Date(s.opened_at).toISOString().slice(0, 10)
      const bucket = buckets.find((b) => b.date === day)
      if (bucket) bucket.opens += 1
    }
    return buckets
  }, [sent])

  const maxEngagement = Math.max(1, ...engagementSeries.map((d) => Math.max(d.opens, d.sends)))

  return (
    <div
      data-mol-id="analytics-page"
      className={cm.cn('px-4 py-6 md:px-8 md:py-8', cm.maxW('7xl'), 'mx-auto', cm.stack(8))}
    >
      <header>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tighter')}>
          {t('analytics.heading', {}, { defaultValue: 'How your words landed' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'analytics.subheading',
            {},
            { defaultValue: 'Tone, template, and engagement at a glance — no spreadsheet needed.' },
          )}
        </p>
      </header>

      <EmailKpiTriad
        drafts={draftCount}
        scheduled={scheduledCount}
        openRatePct={openRate}
        replyRatePct={replyRate}
      />

      <section
        data-mol-id="analytics-engagement-section"
        className={cm.cn(
          cm.sp('p', 8),
          'bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/40',
        )}
      >
        <header
          className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }), cm.sp('mb', 6))}
        >
          <div>
            <h2 className={cm.cn(cm.textSize('xl'), 'font-bold tracking-tight')}>
              {t('analytics.engagementHeading', {}, { defaultValue: 'Engagement Over Time' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'analytics.engagementSubheading',
                {},
                { defaultValue: 'Opens and sends per day, last 14 days.' },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.textSize('xs'))}>
            <span
              className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'text-on-surface-variant')}
            >
              <span
                className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-primary')}
                aria-hidden="true"
              />
              {t('analytics.legend.opens', {}, { defaultValue: 'Opens' })}
            </span>
            <span
              className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'text-on-surface-variant')}
            >
              <span
                className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-secondary')}
                aria-hidden="true"
              />
              {t('analytics.legend.sends', {}, { defaultValue: 'Sends' })}
            </span>
          </div>
        </header>
        {loading ? (
          <p
            data-mol-id="analytics-engagement-loading"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t('analytics.loading', {}, { defaultValue: 'Loading analytics…' })}
          </p>
        ) : (
          <>
            <div
              data-mol-id="analytics-engagement-chart"
              className={cm.cn(cm.flex({ align: 'end', gap: 'xs' }), 'h-40 w-full')}
              role="img"
              aria-label={t(
                'analytics.engagementAria',
                {},
                { defaultValue: 'Bar chart of opens and sends per day over the last two weeks' },
              )}
            >
              {engagementSeries.map((day) => (
                <div
                  key={day.date}
                  className={cm.cn('flex-1 h-full flex flex-col justify-end gap-px min-w-0')}
                >
                  <div
                    className={cm.cn('w-full rounded-t-sm bg-secondary/60')}
                    style={{ height: `${(day.sends / maxEngagement) * 100}%` }}
                    aria-hidden="true"
                  />
                  <div
                    className={cm.cn('w-full rounded-b-sm bg-primary')}
                    style={{ height: `${(day.opens / maxEngagement) * 100}%` }}
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>
            <div
              className={cm.cn(
                cm.flex({ justify: 'between' }),
                cm.textSize('xs'),
                'text-on-surface-variant mt-2 tabular-nums',
              )}
            >
              <span>{engagementSeries[0]?.date.slice(5)}</span>
              <span>
                {engagementSeries[Math.floor(engagementSeries.length / 2)]?.date.slice(5)}
              </span>
              <span>{engagementSeries[engagementSeries.length - 1]?.date.slice(5)}</span>
            </div>
          </>
        )}
      </section>

      <section
        data-mol-id="analytics-tone-section"
        className={cm.cn(
          cm.sp('p', 8),
          'bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/40',
        )}
      >
        <header
          className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }), cm.sp('mb', 6))}
        >
          <div>
            <h2 className={cm.cn(cm.textSize('xl'), 'font-bold tracking-tight')}>
              {t('analytics.toneHeading', {}, { defaultValue: 'Tone effectiveness' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'analytics.toneSubheading',
                {},
                { defaultValue: 'Which voice gets your messages opened.' },
              )}
            </p>
          </div>
          <span
            className={cm.cn(
              'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('analytics.allTime', {}, { defaultValue: 'All time' })}
          </span>
        </header>

        {loading ? (
          <p
            data-mol-id="analytics-loading"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t('analytics.loading', {}, { defaultValue: 'Loading analytics…' })}
          </p>
        ) : error ? (
          <p
            data-mol-id="analytics-error"
            role="alert"
            className={cm.cn(cm.textSize('sm'), 'text-on-error')}
          >
            {error}
          </p>
        ) : toneRows.length === 0 ? (
          <p
            data-mol-id="analytics-tone-empty"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t(
              'analytics.toneEmpty',
              {},
              { defaultValue: 'Send a few emails to see tone breakdowns here.' },
            )}
          </p>
        ) : (
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
            {toneRows.map((row) => (
              <div
                key={row.tone}
                data-mol-id="analytics-tone-row"
                className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}
              >
                <span
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'w-28 shrink-0 text-on-surface',
                  )}
                >
                  {row.tone}
                </span>
                <div className={cm.cn('flex-1 relative')}>
                  <div
                    className={cm.cn(
                      'h-3 w-full bg-surface-container rounded-full overflow-hidden',
                    )}
                  >
                    <div
                      className={cm.cn('h-full rounded-full transition-all')}
                      style={{
                        width: `${bar(row.sends, maxToneSends)}%`,
                        background:
                          'linear-gradient(90deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #a78bfa))',
                      }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'w-16 text-right tabular-nums',
                  )}
                >
                  {row.sends}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.roundedFull,
                    'w-20 text-center font-bold bg-secondary/15 text-secondary-dark tabular-nums',
                  )}
                >
                  {row.open_rate}%
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.roundedFull,
                    'w-20 text-center font-bold bg-success/15 text-success tabular-nums',
                  )}
                >
                  {row.reply_rate}%
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section
        data-mol-id="analytics-templates-section"
        className={cm.cn(
          cm.sp('p', 8),
          'bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/40',
        )}
      >
        <header className={cm.sp('mb', 4)}>
          <h2 className={cm.cn(cm.textSize('xl'), 'font-bold tracking-tight')}>
            {t('analytics.templateHeading', {}, { defaultValue: 'Top Performing Templates' })}
          </h2>
        </header>
        {templateRows.length === 0 ? (
          <p
            data-mol-id="analytics-templates-empty"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t(
              'analytics.templatesEmpty',
              {},
              { defaultValue: 'Save templates and send them to see performance metrics.' },
            )}
          </p>
        ) : (
          <table className={cm.cn('w-full text-sm')}>
            <thead>
              <tr className={cm.cn('text-left border-b border-outline-variant/40')}>
                <th
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant py-3 pl-2',
                  )}
                >
                  {t('analytics.col.template', {}, { defaultValue: 'Template' })}
                </th>
                <th
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant py-3',
                  )}
                >
                  {t('form.category', {}, { defaultValue: 'Category' })}
                </th>
                <th
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant py-3 text-right',
                  )}
                >
                  {t('analytics.col.sends', {}, { defaultValue: 'Sends' })}
                </th>
                <th
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant py-3 text-right',
                  )}
                >
                  {t('analytics.col.open', {}, { defaultValue: 'Open rate' })}
                </th>
                <th
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant py-3 text-right pr-2',
                  )}
                >
                  {t('analytics.col.reply', {}, { defaultValue: 'Reply rate' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant/30')}>
              {templateRows.map((row) => (
                <tr
                  key={row.id}
                  data-mol-id="analytics-template-row"
                  className={cm.cn('hover:bg-surface-container-low transition-colors')}
                >
                  <td className={cm.cn('py-4 pl-2 font-semibold text-on-surface')}>{row.name}</td>
                  <td className={cm.cn('py-4')}>
                    <StatusPill
                      status="ai-generated"
                      label={row.category}
                      icon="dashboard_customize"
                    />
                  </td>
                  <td className={cm.cn('py-4 text-right font-bold tabular-nums')}>{row.sends}</td>
                  <td
                    className={cm.cn('py-4 text-right font-bold tabular-nums text-secondary-dark')}
                  >
                    {row.open_rate}%
                  </td>
                  <td className={cm.cn('py-4 text-right font-bold tabular-nums text-success pr-2')}>
                    {row.reply_rate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

export default Analytics
export { Analytics as AnalyticsPage }
