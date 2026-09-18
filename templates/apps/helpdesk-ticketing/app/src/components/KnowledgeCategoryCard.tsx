import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export type KnowledgeCategoryVariant =
  'getting-started' | 'account-billing' | 'api-integrations' | 'troubleshooting'

interface KnowledgeCategoryCardProps {
  variant?: KnowledgeCategoryVariant
  onClick?: () => void
}

const VARIANT_STYLES: Record<KnowledgeCategoryVariant, { iconWrap: string; icon: string }> = {
  'getting-started': { iconWrap: 'bg-primary/10 text-primary', icon: 'rocket_launch' },
  'account-billing': {
    iconWrap: 'bg-tertiary-container/40 text-on-tertiary-container',
    icon: 'payments',
  },
  'api-integrations': {
    iconWrap: 'bg-secondary-container/30 text-on-secondary-container',
    icon: 'api',
  },
  troubleshooting: { iconWrap: 'bg-error-container/25 text-on-error-container', icon: 'build' },
}

export default function KnowledgeCategoryCard({
  variant = 'getting-started',
  onClick,
}: KnowledgeCategoryCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const style = VARIANT_STYLES[variant]

  const title =
    variant === 'getting-started'
      ? t('knowledgeCategoryCard.title', {}, { defaultValue: 'Getting Started' })
      : variant === 'account-billing'
        ? t('knowledgeCategoryCard.accountBillingTitle', {}, { defaultValue: 'Account & Billing' })
        : variant === 'api-integrations'
          ? t(
              'knowledgeCategoryCard.apiIntegrationsTitle',
              {},
              { defaultValue: 'API & Integrations' },
            )
          : t('knowledgeCategoryCard.troubleshootingTitle', {}, { defaultValue: 'Troubleshooting' })

  const description =
    variant === 'getting-started'
      ? t(
          'knowledgeCategoryCard.description',
          { appName: APP_NAME },
          {
            defaultValue:
              'New to {{appName}}? Learn the basics and set up your support environment in minutes.',
          },
        )
      : variant === 'account-billing'
        ? t(
            'knowledgeCategoryCard.accountBillingDescription',
            {},
            { defaultValue: 'Plans, invoices, payment methods, and subscription changes.' },
          )
        : variant === 'api-integrations'
          ? t(
              'knowledgeCategoryCard.apiIntegrationsDescription',
              {},
              { defaultValue: 'Webhooks, authentication, rate limits, and SDK references.' },
            )
          : t(
              'knowledgeCategoryCard.troubleshootingDescription',
              {},
              { defaultValue: 'Diagnose errors, outages, and common integration pitfalls.' },
            )

  const count =
    variant === 'getting-started'
      ? 24
      : variant === 'account-billing'
        ? 18
        : variant === 'api-integrations'
          ? 31
          : 15

  return (
    <div
      role="button"
      tabIndex={0}
      className={cm.cn(
        cm.sp('p', 8),
        cm.flex({ direction: 'col', align: 'start', gap: 4 }),
        cm.cursorPointer,
        'group rounded-xl bg-surface-container-lowest hover:bg-surface-container-highest transition-all duration-300 relative overflow-hidden border border-outline-variant/10 shadow-sm',
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
      data-mol-id={`cat-card-${variant}`}
    >
      <div
        className={cm.cn(
          cm.w(12),
          cm.h(12),
          cm.flex({ align: 'center', justify: 'center' }),
          'rounded-xl',
          'transition-transform group-hover:scale-110',
          style.iconWrap,
        )}
        data-mol-id={`cat-icon-${variant}`}
      >
        <span
          className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined')}
          data-icon={style.icon}
        >
          {style.icon}
        </span>
      </div>
      <div>
        <h4
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'text-on-surface',
          )}
          data-mol-id={`cat-name-${variant}`}
        >
          {title}
        </h4>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mb', 4),
            'text-on-surface-variant leading-relaxed',
          )}
          data-mol-id={`cat-desc-${variant}`}
        >
          {description}
        </p>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 2 }),
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'mt-auto text-on-surface-variant uppercase tracking-wider',
        )}
        data-mol-id={`cat-meta-${variant}`}
      >
        <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')} data-icon="article">
          article
        </span>
        {t('knowledgeCategoryCard.articleCount', { count }, { defaultValue: '{{count}} Articles' })}
      </div>
    </div>
  )
}
export { KnowledgeCategoryCard }
