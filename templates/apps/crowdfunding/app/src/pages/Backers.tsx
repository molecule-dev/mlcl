import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { KpiStatCard } from '../components/KpiStatCard.js'
import { api, type ApiCampaign, type ApiPledge } from '../lib/api.js'

const STATUS_TINT: Record<string, string> = {
  active: 'bg-success/10 text-success',
  refunded: 'bg-error/10 text-error',
  fulfilled: 'bg-primary/10 text-primary',
}

interface BackerRowView extends ApiPledge {
  campaign_title_resolved: string
}

export function Backers() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [pledges, setPledges] = useState<BackerRowView[]>([])
  const [campaigns, setCampaigns] = useState<ApiCampaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const my = await api.myCampaigns(http)
        if (!alive) return
        setCampaigns(my)
        const all: BackerRowView[] = []
        for (const c of my) {
          try {
            const ps = await api.campaignPledges(http, c.id)
            for (const p of ps) all.push({ ...p, campaign_title_resolved: c.title })
          } catch (_error) {
            // skip — likely not the creator (shouldn't happen since myCampaigns)
          }
        }
        all.sort((a, b) => (a.pledged_at < b.pledged_at ? 1 : -1))
        if (alive) setPledges(all)
      } catch (err) {
        if (alive)
          setError(
            err instanceof Error
              ? err.message
              : t('backers.loadError', {}, { defaultValue: 'Failed to load backers' }),
          )
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [http, t])

  const filtered = useMemo(() => {
    if (selectedCampaign === 'all') return pledges
    return pledges.filter((p) => p.campaign_id === selectedCampaign)
  }, [pledges, selectedCampaign])

  const totalAmount = filtered
    .filter((p) => p.status === 'active')
    .reduce((s, p) => s + p.amount_cents, 0)
  const uniqueBackers = new Set(filtered.map((p) => p.backer_id ?? p.id)).size
  const fmt = (c: number) => `$${Math.round(c / 100).toLocaleString()}`

  const exportCsv = () => {
    const rows = [
      ['backer', 'email', 'campaign', 'tier', 'amount_usd', 'status', 'pledged_at'],
      ...filtered.map((p) => [
        p.backer_name ?? '',
        p.backer_email ?? '',
        p.campaign_title_resolved,
        p.tier_title ?? '',
        (p.amount_cents / 100).toFixed(2),
        p.status,
        p.pledged_at,
      ]),
    ]
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backers-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className={cm.cn(
        cm.maxW('7xl'),
        cm.mxAuto,
        cm.w('full'),
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.stack(8),
      )}
      data-mol-id="page-backers"
    >
      <header className={cm.stack(2)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('backers.eyebrow', {}, { defaultValue: 'Community' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('backers.heading', {}, { defaultValue: 'Backers across all campaigns' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'backers.subheading',
            {},
            { defaultValue: 'Pledge history, tier mix, and payment status — at a glance.' },
          )}
        </p>
      </header>

      {error ? (
        <div className={cm.cn(cm.textSize('sm'), 'text-error')} data-mol-id="backers-error">
          {error}
        </div>
      ) : null}

      <section
        className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-3')}
        data-mol-id="backers-kpis"
      >
        <KpiStatCard
          label={t('backers.kpi.total', {}, { defaultValue: 'Unique backers' })}
          value={String(uniqueBackers)}
          icon="group"
          accent="primary"
        />
        <KpiStatCard
          label={t('backers.kpi.pledged', {}, { defaultValue: 'Active pledges total' })}
          value={fmt(totalAmount)}
          icon="payments"
          accent="accent"
        />
        <KpiStatCard
          label={t('backers.kpi.campaigns', {}, { defaultValue: 'Campaigns' })}
          value={String(campaigns.length)}
          icon="campaign"
          accent="tertiary"
        />
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.stack(4),
          'rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm overflow-hidden',
        )}
      >
        <div
          className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }), 'flex-wrap gap-3')}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('backers.list.title', {}, { defaultValue: 'Recent pledges' })}
          </h2>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            {campaigns.length > 1 ? (
              <select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-lg border border-outline-variant bg-surface-container-low',
                )}
                data-mol-id="backers-campaign-filter"
              >
                <option value="all">
                  {t('backers.list.allCampaigns', {}, { defaultValue: 'All campaigns' })}
                </option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              type="button"
              onClick={exportCsv}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container',
              )}
              data-mol-id="backers-export"
            >
              {t('common.exportCsv', {}, { defaultValue: 'Export CSV' })}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <p
              className={cm.cn(
                cm.sp('py', 6),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t('backers.loading', {}, { defaultValue: 'Loading backers…' })}
            </p>
          ) : filtered.length === 0 ? (
            <p
              className={cm.cn(
                cm.sp('py', 6),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
              data-mol-id="backers-empty"
            >
              {t(
                'backers.empty',
                {},
                { defaultValue: 'No backers yet — pledges from your campaigns will show up here.' },
              )}
            </p>
          ) : (
            <table className={cm.cn(cm.w('full'), 'border-collapse')}>
              <thead>
                <tr className={cm.cn(cm.borderB)}>
                  {[
                    { key: 'backer', defaultLabel: 'Backer' },
                    { key: 'campaign', defaultLabel: 'Campaign' },
                    { key: 'tier', defaultLabel: 'Tier' },
                    { key: 'amount', defaultLabel: 'Amount' },
                    { key: 'pledged', defaultLabel: 'Pledged' },
                    { key: 'status', defaultLabel: 'Status' },
                  ].map((h) => (
                    <th
                      key={h.key}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 3),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'text-left uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t(`backers.list.col.${h.key}`, {}, { defaultValue: h.defaultLabel })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr
                    key={b.id}
                    className={cm.cn(
                      cm.borderB,
                      'last:border-0 hover:bg-surface-container transition-colors',
                    )}
                    data-mol-id={`backer-${b.id}`}
                  >
                    <td className={cm.cn(cm.sp('px', 3), cm.sp('py', 4))}>
                      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                        <div
                          className={cm.cn(
                            cm.w(8),
                            cm.h(8),
                            cm.roundedFull,
                            cm.flex({ align: 'center', justify: 'center' }),
                            cm.fontWeight('bold'),
                            cm.textSize('xs'),
                            'text-white',
                          )}
                          style={{
                            background:
                              'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                          }}
                        >
                          {(b.backer_name ?? 'A').charAt(0).toUpperCase()}
                        </div>
                        <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                            {b.backer_name ?? t('backers.anon', {}, { defaultValue: 'Anonymous' })}
                          </span>
                          {b.backer_email ? (
                            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                              {b.backer_email}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className={cm.cn(cm.sp('px', 3), cm.sp('py', 4), cm.textSize('sm'))}>
                      {b.campaign_title_resolved}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 4),
                        cm.textSize('sm'),
                        'text-on-surface-variant',
                      )}
                    >
                      {b.tier_title ?? '—'}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 4),
                        cm.textSize('sm'),
                        cm.fontWeight('bold'),
                        'tabular-nums',
                      )}
                    >
                      {fmt(b.amount_cents)}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 4),
                        cm.textSize('sm'),
                        'text-on-surface-variant',
                      )}
                    >
                      {new Date(b.pledged_at).toLocaleDateString()}
                    </td>
                    <td className={cm.cn(cm.sp('px', 3), cm.sp('py', 4))}>
                      <span
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'uppercase tracking-widest rounded-full',
                          STATUS_TINT[b.status] ?? 'bg-surface-container text-on-surface-variant',
                        )}
                      >
                        {t(`backers.status.${b.status}`, {}, { defaultValue: b.status })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}

export default Backers
