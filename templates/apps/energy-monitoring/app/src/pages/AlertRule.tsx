import { useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

const ALERT_TYPES = [
  { key: 'high_usage', defaultLabel: 'High whole-home draw', icon: 'electric_bolt' },
  { key: 'low_production', defaultLabel: 'Solar underperformance', icon: 'wb_sunny' },
  { key: 'unusual_pattern', defaultLabel: 'Unusual pattern', icon: 'insights' },
  { key: 'cost_threshold', defaultLabel: 'Daily cost', icon: 'savings' },
  { key: 'peak_demand', defaultLabel: 'Peak demand', icon: 'trending_up' },
] as const

type AlertType = (typeof ALERT_TYPES)[number]['key']

type Comparison = 'above' | 'below' | 'average_above'

const COMPARISONS: Array<{ key: Comparison; defaultLabel: string }> = [
  { key: 'above', defaultLabel: 'Goes above' },
  { key: 'below', defaultLabel: 'Drops below' },
  { key: 'average_above', defaultLabel: 'Avg above' },
]

const CHANNELS = [
  { key: 'push', defaultLabel: 'Push', icon: 'notifications' },
  { key: 'email', defaultLabel: 'Email', icon: 'mail' },
  { key: 'sms', defaultLabel: 'SMS', icon: 'sms' },
] as const

export function AlertRule() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [name, setName] = useState('')
  const [type, setType] = useState<AlertType>('high_usage')
  const [threshold, setThreshold] = useState('5000')
  const [comparison, setComparison] = useState<Comparison>('above')
  const [email, setEmail] = useState('')
  const [channels, setChannels] = useState<Set<string>>(new Set(['push', 'email']))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleChannel = (key: string) => {
    setChannels((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const created = await http.post<{ id?: string }>('/api/alerts/rules', {
        name: name || undefined,
        type,
        threshold: Number(threshold),
        comparison,
        notify_email: channels.has('email') ? email || undefined : undefined,
      })
      void track({
        name: 'alert.threshold_set',
        properties: {
          rule_id: unwrapSingle<{ id?: string }>(created)?.id ?? null,
          type,
          threshold: Number(threshold),
          comparison,
        },
      })
      navigate('/alerts')
    } catch (err) {
      const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(
        apiError ??
          (err instanceof Error
            ? err.message
            : t('alertRule.submitError', {}, { defaultValue: 'Could not save the rule.' })),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto, cm.stack(8))}>
      <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('alertRule.eyebrow', {}, { defaultValue: 'New rule' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('alertRule.heading', {}, { defaultValue: 'Catch the spike before it costs you' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'alertRule.subheading',
            {},
            {
              defaultValue:
                'Pick a metric, a threshold, and where to send the alert. You can edit or pause it any time.',
            },
          )}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl', cm.stack(6))}
      >
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            aria-hidden="true"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-9 h-9 rounded-full bg-primary-container text-on-primary-container shrink-0',
            )}
          >
            <span className={'material-symbols-outlined text-lg'}>tune</span>
          </span>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('alertRule.basicsHeading', {}, { defaultValue: 'Rule basics' })}
          </h2>
        </div>
        <label className={cm.stack(2)}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('alertRule.nameLabel', {}, { defaultValue: 'Rule name' })}
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t(
              'alertRule.namePlaceholder',
              {},
              { defaultValue: 'e.g. After-hours HVAC watch' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none transition-colors',
            )}
          />
        </label>

        <div className={cm.stack(2)}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('alertRule.typeLabel', {}, { defaultValue: 'Trigger type' })}
          </span>
          <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-1 md:grid-cols-2')}>
            {ALERT_TYPES.map((typeOpt) => (
              <button
                key={typeOpt.key}
                type="button"
                onClick={() => setType(typeOpt.key)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('p', 4),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-xl border-2 transition-all text-left',
                  type === typeOpt.key
                    ? 'border-primary bg-primary/5'
                    : 'border-outline-variant hover:border-primary/40 bg-surface',
                )}
              >
                <span
                  className={cm.cn(
                    'material-symbols-outlined',
                    type === typeOpt.key ? 'text-primary' : 'text-on-surface-variant',
                  )}
                  aria-hidden="true"
                >
                  {typeOpt.icon}
                </span>
                {t(`alertRule.type.${typeOpt.key}`, {}, { defaultValue: typeOpt.defaultLabel })}
              </button>
            ))}
          </div>
        </div>

        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
          <label className={cm.stack(2)}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('alertRule.comparisonLabel', {}, { defaultValue: 'Comparison' })}
            </span>
            <select
              value={comparison}
              onChange={(e) => setComparison(e.target.value as Comparison)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none',
              )}
            >
              {COMPARISONS.map((c) => (
                <option key={c.key} value={c.key}>
                  {t(`alertRule.comparison.${c.key}`, {}, { defaultValue: c.defaultLabel })}
                </option>
              ))}
            </select>
          </label>
          <label className={cm.stack(2)}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('alertRule.thresholdLabel', {}, { defaultValue: 'Threshold' })}
            </span>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              required
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none font-mono tabular-nums transition-colors',
              )}
            />
          </label>
        </div>

        <div className={cm.stack(2)}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('alertRule.channelsLabel', {}, { defaultValue: 'Notification channels' })}
          </span>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
            {CHANNELS.map((c) => {
              const on = channels.has(c.key)
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggleChannel(c.key)}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'uppercase tracking-widest transition-all',
                    on
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
                  )}
                  aria-pressed={on}
                >
                  <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                    {c.icon}
                  </span>
                  {t(`alertRule.channel.${c.key}`, {}, { defaultValue: c.defaultLabel })}
                </button>
              )
            })}
          </div>
        </div>

        {channels.has('email') ? (
          <label className={cm.stack(2)}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('alertRule.emailLabel', {}, { defaultValue: 'Email address' })}
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(
                'alertRule.emailPlaceholder',
                {},
                { defaultValue: 'alerts@yourdomain.com' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none transition-colors',
              )}
            />
          </label>
        ) : null}

        {error ? (
          <p
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'bg-error-container text-on-error-container rounded-xl',
            )}
          >
            {error}
          </p>
        ) : null}

        <div className={cm.cn(cm.flex({ align: 'center', justify: 'end', gap: 'sm' }))}>
          <button
            type="button"
            onClick={() => navigate('/alerts')}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-60',
            )}
          >
            {submitting
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('alertRule.submit', {}, { defaultValue: 'Save rule' })}
          </button>
        </div>
      </form>
    </div>
  )
}
