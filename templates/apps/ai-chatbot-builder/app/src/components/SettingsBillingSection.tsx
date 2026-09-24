import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

interface BillingStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
  limits: {
    maxBots: number
    maxAiMessagesPerMonth: number
    maxTrainingDocsMb: number
  }
}

interface BotSummary {
  id: string
  message_count?: number
  conversation_count?: number
}

const formatNum = (n: number): string => (n >= 999_999 ? '∞' : n.toLocaleString())

const pct = (used: number, total: number): number => {
  if (!Number.isFinite(total) || total <= 0 || total >= 999_999) return 0
  return Math.min(100, Math.round((used / total) * 1000) / 10)
}

function SettingsBillingSection() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const cm = getClassMap()
  const http = useHttpClient()

  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [bots, setBots] = useState<BotSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [statusRes, listRes] = await Promise.all([
        http.get('/api/billing/status'),
        http.get('/api/bots'),
      ])
      const statusBody = ((statusRes as { data?: unknown })?.data ??
        statusRes) as BillingStatus | null
      const listBody = (listRes as { data?: unknown })?.data ?? listRes
      const listData = listBody as { data?: BotSummary[] } | BotSummary[] | unknown
      setStatus(statusBody)
      setBots(
        Array.isArray(listData)
          ? (listData as BotSummary[])
          : Array.isArray((listData as { data?: BotSummary[] })?.data)
            ? (listData as { data: BotSummary[] }).data
            : [],
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settingsBilling.loadError', {}, { defaultValue: 'Could not load billing details.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCancel() {
    setError(null)
    try {
      await http.post('/api/billing/cancel', {})
      await loadAll()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settingsBilling.cancelError', {}, { defaultValue: 'Cancel failed.' }),
      )
    }
  }

  const planLabel = status?.name ?? '—'
  const totalBots = bots.length
  const maxBots = status?.limits?.maxBots ?? 0
  const totalMessages = bots.reduce((acc, b) => acc + Number(b.message_count ?? 0), 0)
  const maxMessages = status?.limits?.maxAiMessagesPerMonth ?? 0

  return (
    <section className={cm.stack(6)}>
      <h3
        className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-headline tracking-tight')}
      >
        {t('settingsBilling.sectionTitle', {}, { defaultValue: 'Subscription & Usage' })}
      </h3>
      <div
        className={cm.cn(cm.sp('p', 8), 'bg-surface-container-lowest rounded-3xl ambient-shadow')}
      >
        {error && (
          <p role="alert" className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-error')}>
            {error}
          </p>
        )}
        {loading ? (
          <div
            aria-hidden="true"
            className={cm.cn(cm.h(48), 'rounded-2xl bg-surface-container-low animate-pulse')}
          />
        ) : (
          <div className={cm.grid({ cols: 12, gap: 'xl' })}>
            <div
              className={cm.cn(
                cm.sp('pr', 10),
                'col-span-12 lg:col-span-5 lg:border-r border-surface-container-high',
              )}
            >
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  'primary-gradient rounded-2xl text-white shadow-xl relative overflow-hidden',
                )}
              >
                <p
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.sp('mb', 1),
                    'text-[10px] uppercase tracking-widest opacity-80',
                  )}
                >
                  {t('settingsBilling.currentPlanLabel', {}, { defaultValue: 'Current Plan' })}
                </p>
                <h4 className={cm.cn(cm.textSize('3xl'), 'font-headline font-extrabold')}>
                  {planLabel}
                </h4>
                <p className={cm.cn(cm.textSize('xs'), 'opacity-80 mt-2')}>
                  {status?.isFree
                    ? t(
                        'settingsBilling.freePlanHint',
                        {},
                        { defaultValue: 'Upgrade for higher limits and integrations.' },
                      )
                    : t(
                        'settingsBilling.paidPlanHint',
                        {},
                        { defaultValue: 'Renews automatically.' },
                      )}
                </p>
                <div className={cm.cn(cm.sp('mt', 6), cm.flex({ gap: 'sm' }))}>
                  <button
                    type="button"
                    className={cm.cn(
                      cm.roundedFull,
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      'bg-surface text-primary shadow-lg',
                    )}
                    onClick={() => navigate('/pricing')}
                  >
                    {status?.isFree
                      ? t('settingsBilling.choosePlan', {}, { defaultValue: 'Choose a plan' })
                      : t('settingsBilling.changePlan', {}, { defaultValue: 'Change plan' })}
                  </button>
                  {!status?.isFree && (
                    <ConfirmButton
                      label={t('settingsBilling.cancelPlan', {}, { defaultValue: 'Cancel plan' })}
                      confirmLabel={t(
                        'settingsBilling.confirmCancel',
                        {},
                        {
                          defaultValue:
                            'Cancel your subscription? You will keep access until the end of the billing period.',
                        },
                      )}
                      onConfirm={handleCancel}
                      testId="billing-cancel-plan"
                      className={cm.cn(
                        cm.roundedFull,
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        'bg-surface/20 hover:bg-surface/30 transition-all text-white backdrop-blur-sm',
                      )}
                    />
                  )}
                </div>
              </div>
            </div>
            <div className={cm.cn(cm.stack(6), 'col-span-12 lg:col-span-7')}>
              <UsageBar
                label={t('settingsBilling.activeBotsLabel', {}, { defaultValue: 'Active AI bots' })}
                used={totalBots}
                total={maxBots}
                cm={cm}
              />
              <UsageBar
                label={t(
                  'settingsBilling.messagesSentLabel',
                  {},
                  { defaultValue: 'Messages sent (lifetime)' },
                )}
                used={totalMessages}
                total={maxMessages}
                cm={cm}
                color="bg-tertiary"
              />
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'settingsBilling.usageNote',
                  {},
                  {
                    defaultValue:
                      'Bot counts come from your account; per-month message totals reset when your billing cycle rolls over.',
                  },
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function UsageBar({
  label,
  used,
  total,
  cm,
  color = 'primary-gradient',
}: {
  label: string
  used: number
  total: number
  cm: ReturnType<typeof getClassMap>
  color?: string
}) {
  const percent = pct(used, total)
  const totalLabel = total >= 999_999 ? '∞' : formatNum(total)
  return (
    <div>
      <div
        className={cm.cn(
          cm.flex({ justify: 'between' }),
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          cm.sp('mb', 2),
        )}
      >
        <span className={cm.cn('text-on-surface uppercase tracking-tighter')}>{label}</span>
        <span className={cm.cn('text-on-surface-variant')}>
          {formatNum(used)} / {totalLabel}
        </span>
      </div>
      <div
        className={cm.cn(
          cm.h(2),
          cm.w('full'),
          cm.roundedFull,
          'bg-surface-container-high overflow-hidden',
        )}
      >
        <div
          className={cm.cn(cm.h('full'), cm.roundedFull, color)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export default SettingsBillingSection
export { SettingsBillingSection }
