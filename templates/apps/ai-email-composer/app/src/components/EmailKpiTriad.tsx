import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface KpiSpec {
  key: string
  defaultLabel: string
  value: string
  hint: string
  icon: string
  accent: 'primary' | 'secondary' | 'info' | 'success'
}

interface EmailKpiTriadProps {
  drafts: number
  scheduled: number
  openRatePct: number
  replyRatePct: number
}

const ACCENT_BORDER: Record<KpiSpec['accent'], string> = {
  primary: 'border-primary',
  secondary: 'border-secondary',
  info: 'border-info',
  success: 'border-success',
}

const ACCENT_TINT: Record<KpiSpec['accent'], string> = {
  primary: 'text-primary',
  secondary: 'text-secondary-dark',
  info: 'text-info',
  success: 'text-success',
}

/**
 * Four-up KPI strip used on Signet dashboard + analytics — left-edge accent
 * stripe in the brand palette, uppercase 10px label, hover lift + shadow.
 *
 * Translated from personal-finance's StatsRow + ai-chatbot-builder's
 * BotAnalyticsKpiRow patterns for the email-composer domain.
 */
export function EmailKpiTriad({
  drafts,
  scheduled,
  openRatePct,
  replyRatePct,
}: EmailKpiTriadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const items: KpiSpec[] = [
    {
      key: 'drafts',
      defaultLabel: 'Drafts',
      value: String(drafts),
      hint: t('emailKpiTriad.draftsHint', {}, { defaultValue: 'Awaiting your review' }),
      icon: 'drafts',
      accent: 'primary',
    },
    {
      key: 'scheduled',
      defaultLabel: 'Scheduled',
      value: String(scheduled),
      hint: t('emailKpiTriad.scheduledHint', {}, { defaultValue: 'Queued to send' }),
      icon: 'schedule',
      accent: 'info',
    },
    {
      key: 'openRate',
      defaultLabel: 'Open Rate',
      value: `${openRatePct}%`,
      hint: t('emailKpiTriad.openRateHint', {}, { defaultValue: 'Above your baseline' }),
      icon: 'visibility',
      accent: 'secondary',
    },
    {
      key: 'replyRate',
      defaultLabel: 'Reply Rate',
      value: `${replyRatePct}%`,
      hint: t('emailKpiTriad.replyRateHint', {}, { defaultValue: 'Highly engaged' }),
      icon: 'reply',
      accent: 'success',
    },
  ]

  return (
    <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>
      {items.map((item) => (
        <div
          key={item.key}
          data-mol-id={`kpi-${item.key}`}
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm border-l-4',
            'hover:-translate-y-0.5 hover:shadow-md transition-all',
            ACCENT_BORDER[item.accent],
          )}
        >
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(`emailKpiTriad.${item.key}Label`, {}, { defaultValue: item.defaultLabel })}
            </p>
            <span
              className={cm.cn(
                cm.sp('p', 2),
                cm.roundedFull,
                'bg-surface-container',
                ACCENT_TINT[item.accent],
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                {item.icon}
              </span>
            </span>
          </div>
          <p className={cm.cn(cm.textSize('3xl'), 'font-extrabold tabular-nums text-on-surface')}>
            {item.value}
          </p>
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {item.hint}
          </p>
        </div>
      ))}
    </section>
  )
}
