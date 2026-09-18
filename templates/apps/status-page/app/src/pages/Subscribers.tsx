import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { MetricKpiCard } from '../components/MetricKpiCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface Subscriber {
  id: string
  channel: 'email' | 'sms' | 'webhook' | 'rss' | 'slack'
  destination: string
  components: string[] | string
  is_confirmed: boolean
  created_at: string
}

function readComponents(raw: Subscriber['components']): string[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (_error) {
      // malformed JSON — fall back to empty array
      return []
    }
  }
  return []
}

const CHANNEL_ICON: Record<Subscriber['channel'], string> = {
  email: 'mail',
  sms: 'sms',
  webhook: 'webhook',
  rss: 'rss_feed',
  slack: 'forum',
}

const NOTIFY_LABEL: Record<'all' | 'incidents' | 'maintenance', string> = {
  all: 'All',
  incidents: 'Incidents',
  maintenance: 'Maintenance',
}

const CHANNEL_TINT: Record<Subscriber['channel'], string> = {
  email: '#10b981',
  sms: '#6366f1',
  webhook: '#a78bfa',
  rss: '#f59e0b',
  slack: '#34d399',
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(0, Math.floor(ms / 60_000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function Subscribers() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | Subscriber['channel']>('all')
  const [showInvite, setShowInvite] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [destination, setDestination] = useState('')
  const [channel, setChannel] = useState<Subscriber['channel']>('email')
  const [notificationType, setNotificationType] = useState<'all' | 'incidents' | 'maintenance'>(
    'all',
  )

  const refresh = async () => {
    const res = await http.get('/api/subscribers')
    setSubscribers(unwrapList<Subscriber>(res))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    refresh()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setInviteError(null)
    try {
      await http.post('/api/subscribers', {
        channel,
        destination: destination.trim(),
        email: channel === 'email' ? destination.trim() : undefined,
        notification_type: notificationType,
        components: ['all'],
      })
      setDestination('')
      setShowInvite(false)
      await refresh()
    } catch (err) {
      setInviteError(
        err instanceof Error
          ? err.message
          : t('subscribers.inviteError', {}, { defaultValue: 'Could not invite subscriber' }),
      )
    } finally {
      setInviting(false)
    }
  }

  const counts = useMemo(() => {
    return {
      total: subscribers.length,
      email: subscribers.filter((s) => s.channel === 'email').length,
      sms: subscribers.filter((s) => s.channel === 'sms').length,
      webhook: subscribers.filter((s) => s.channel === 'webhook').length,
      pending: subscribers.filter((s) => !s.is_confirmed).length,
    }
  }, [subscribers])

  const visible = filter === 'all' ? subscribers : subscribers.filter((s) => s.channel === filter)

  const filters: { key: 'all' | Subscriber['channel']; label: string; count: number }[] = [
    { key: 'all', label: t('status.all', {}, { defaultValue: 'All' }), count: counts.total },
    {
      key: 'email',
      label: t('auth.forgotPassword.email', {}, { defaultValue: 'Email' }),
      count: counts.email,
    },
    {
      key: 'sms',
      label: t('subscribers.filter.sms', {}, { defaultValue: 'SMS' }),
      count: counts.sms,
    },
    {
      key: 'webhook',
      label: t('subscribers.filter.webhook', {}, { defaultValue: 'Webhook' }),
      count: counts.webhook,
    },
  ]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))} data-mol-id="page-subscribers">
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-8')}>
        <div>
          <p
            className={cm.cn(
              'font-mono text-xs font-bold uppercase tracking-widest text-primary mb-2',
            )}
          >
            {t(
              'subscribers.eyebrow',
              { app: APP_NAME },
              { defaultValue: '$ {{app}} subscribers --list' },
            )}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('nav.subscribers', {}, { defaultValue: 'Subscribers' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'subscribers.subheading',
              {},
              {
                defaultValue:
                  'Customers paged on every status change. Manage channels, components, and confirmation state.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          data-testid="invite-subscriber-btn"
          onClick={() => setShowInvite((s) => !s)}
          className={cm.cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest transition-all hover:opacity-90',
          )}
          style={{
            backgroundColor: 'var(--color-status-operational)',
            color: 'var(--color-on-status-operational)',
          }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            person_add
          </span>
          {t('subscribers.invite', {}, { defaultValue: 'Invite subscriber' })}
        </button>
      </header>

      {showInvite ? (
        <form
          onSubmit={onInvite}
          data-testid="invite-subscriber-form"
          className={cm.cn('rounded-2xl p-6 mb-8')}
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.65)',
            border: '1px solid var(--color-border-card)',
          }}
        >
          <p
            className={cm.cn(
              'font-mono text-[10px] font-black uppercase tracking-widest text-primary mb-3',
            )}
          >
            {t('subscribers.inviteHeading', {}, { defaultValue: 'Invite a subscriber' })}
          </p>
          <div className={cm.cn('grid gap-3 grid-cols-1 md:grid-cols-3')}>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as Subscriber['channel'])}
              data-testid="invite-channel"
              className={cm.cn('px-3 py-2 rounded-md font-mono text-sm')}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--color-border-card)',
                color: 'var(--mol-color-text)',
              }}
            >
              <option value="email">
                {t('subscribers.channel.email', {}, { defaultValue: 'Email' })}
              </option>
              <option value="sms">
                {t('subscribers.channel.sms', {}, { defaultValue: 'SMS' })}
              </option>
              <option value="webhook">
                {t('subscribers.channel.webhook', {}, { defaultValue: 'Webhook' })}
              </option>
              <option value="rss">
                {t('subscribers.channel.rss', {}, { defaultValue: 'RSS' })}
              </option>
              <option value="slack">
                {t('subscribers.channel.slack', {}, { defaultValue: 'Slack' })}
              </option>
            </select>
            <input
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              data-testid="invite-destination"
              placeholder={
                channel === 'email'
                  ? 'name@example.com'
                  : channel === 'sms'
                    ? '+15551234567'
                    : channel === 'webhook'
                      ? 'https://example.com/webhook'
                      : '#status-feed'
              }
              className={cm.cn('md:col-span-2 px-3 py-2 rounded-md font-mono text-sm')}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--color-border-card)',
                color: 'var(--mol-color-text)',
              }}
            />
          </div>
          <div className={cm.cn('mt-3 flex items-center gap-2')}>
            <p
              className={cm.cn(
                'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('subscribers.notify', {}, { defaultValue: 'Notify on' })}
            </p>
            {(['all', 'incidents', 'maintenance'] as const).map((n) => {
              const active = notificationType === n
              return (
                <button
                  key={n}
                  type="button"
                  data-testid={`invite-notification-${n}`}
                  onClick={() => setNotificationType(n)}
                  className={cm.cn(
                    'px-2.5 py-1 rounded-md font-mono text-[10px] font-extrabold uppercase tracking-widest',
                  )}
                  style={{
                    backgroundColor: active ? 'rgba(16, 185, 129, 0.20)' : 'rgba(15, 23, 42, 0.6)',
                    color: active ? 'var(--color-link-hover)' : 'var(--color-chip-text)',
                    border: `1px solid ${active ? 'rgba(16, 185, 129, 0.40)' : 'var(--color-border-card)'}`,
                  }}
                >
                  {t(`subscribers.notify.${n}`, {}, { defaultValue: NOTIFY_LABEL[n] })}
                </button>
              )
            })}
          </div>
          {inviteError ? (
            <p
              role="alert"
              data-testid="invite-error"
              className={cm.cn('mt-3 font-mono text-[11px]')}
              style={{ color: 'var(--color-error-text-vivid-on-dark)' }}
            >
              {inviteError}
            </p>
          ) : null}
          <div className={cm.cn('mt-4 flex items-center justify-end gap-2')}>
            <button
              type="button"
              onClick={() => setShowInvite(false)}
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
            <button
              type="submit"
              disabled={inviting || !destination.trim()}
              data-testid="invite-submit"
              className={cm.cn(
                'px-3 py-1.5 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50',
              )}
              style={{
                backgroundColor: 'var(--color-status-operational)',
                color: 'var(--color-on-status-operational)',
              }}
            >
              {inviting
                ? t('subscribers.inviting', {}, { defaultValue: 'Inviting…' })
                : t('subscribers.inviteSubmit', {}, { defaultValue: 'Add subscriber' })}
            </button>
          </div>
        </form>
      ) : null}

      <section className={cm.cn('grid gap-4 grid-cols-2 md:grid-cols-4 mb-8')}>
        <MetricKpiCard
          eyebrow={t('subscribers.kpi.total', {}, { defaultValue: 'Total subscribers' })}
          value={counts.total.toLocaleString('en-US')}
          icon="group"
          tone="operational"
        />
        <MetricKpiCard
          eyebrow={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          value={String(counts.email)}
          icon="mail"
          tone="operational"
        />
        <MetricKpiCard
          eyebrow={t('subscribers.kpi.sms', {}, { defaultValue: 'SMS' })}
          value={String(counts.sms)}
          icon="sms"
          tone="maintenance"
        />
        <MetricKpiCard
          eyebrow={t('subscribers.kpi.pending', {}, { defaultValue: 'Pending confirmation' })}
          value={String(counts.pending)}
          icon="hourglass_empty"
          tone={counts.pending > 0 ? 'degraded' : 'operational'}
        />
      </section>

      <div className={cm.cn('flex flex-wrap items-center gap-2 mb-4')}>
        {filters.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cm.cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-xs font-bold uppercase tracking-widest transition-colors',
              )}
              style={{
                backgroundColor: active ? 'rgba(16, 185, 129, 0.20)' : 'rgba(30, 41, 59, 0.6)',
                color: active ? 'var(--color-link-hover)' : 'var(--color-chip-text)',
                border: `1px solid ${active ? 'rgba(16, 185, 129, 0.40)' : 'var(--color-border-card)'}`,
              }}
            >
              {f.label}
              <span className={cm.cn('opacity-70')}>{f.count}</span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('subscribers.loading', {}, { defaultValue: 'Loading subscribers…' })}
        </p>
      ) : (
        <ul className={cm.cn('space-y-3')}>
          {visible.map((s) => {
            const tint = CHANNEL_TINT[s.channel]
            return (
              <li
                key={s.id}
                className={cm.cn(
                  'rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3',
                )}
                style={{
                  backgroundColor: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid var(--color-border-card)',
                }}
              >
                <div className={cm.cn('flex items-center gap-3 min-w-0')}>
                  <span
                    className={cm.cn(
                      'inline-flex h-9 w-9 items-center justify-center rounded-lg shrink-0',
                    )}
                    style={{ backgroundColor: `${tint}22`, color: tint }}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined text-base')}>
                      {CHANNEL_ICON[s.channel]}
                    </span>
                  </span>
                  <div className={cm.cn('min-w-0')}>
                    <p
                      className={cm.cn('font-mono text-sm font-extrabold text-on-surface truncate')}
                    >
                      {s.destination}
                    </p>
                    <p
                      className={cm.cn(
                        'mt-0.5 font-mono text-[11px] text-on-surface-variant truncate',
                      )}
                    >
                      {(() => {
                        const list = readComponents(s.components)
                        return list.includes('all') || list.length === 0
                          ? t('subscribers.allComponents', {}, { defaultValue: 'All components' })
                          : list.join(' · ')
                      })()}
                    </p>
                  </div>
                </div>
                <div className={cm.cn('flex items-center gap-3 ml-auto')}>
                  <span
                    className={cm.cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-extrabold uppercase tracking-widest',
                    )}
                    style={{
                      backgroundColor: s.is_confirmed
                        ? 'rgba(16, 185, 129, 0.18)'
                        : 'rgba(245, 158, 11, 0.18)',
                      color: s.is_confirmed ? 'var(--color-link-hover)' : '#fcd34d',
                    }}
                  >
                    {s.is_confirmed
                      ? t('subscribers.confirmed', {}, { defaultValue: 'Confirmed' })
                      : t('status.pending', {}, { defaultValue: 'Pending' })}
                  </span>
                  <span className={cm.cn('font-mono text-[11px] text-on-surface-variant')}>
                    {fmtRelative(s.created_at)}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
