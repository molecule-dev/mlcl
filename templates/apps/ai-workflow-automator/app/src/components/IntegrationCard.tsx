/**
 * Integration tile — service icon, name, category eyebrow, connection state
 * (connected / available / coming soon) with action button.
 *
 * Translated from ai-chatbot-builder's IntegrationCard.tsx, retuned to the
 * Dendrite palette and stripped of bot-specific affordances.
 */
import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type IntegrationStatus = 'connected' | 'available' | 'comingSoon'

interface IntegrationCardProps {
  name: string
  category: string
  /** Material Symbols glyph used as the service mark. */
  icon: string
  /** Brand color of the integration (rendered behind the icon). */
  brandColor?: string
  status: IntegrationStatus
  description: string
  /** Optional badge slot (e.g. "OAuth", "API key"). */
  badge?: ReactNode
  onAction?: () => void
}

const STATUS_LABELS: Record<IntegrationStatus, string> = {
  connected: 'Connected',
  available: 'Connect',
  comingSoon: 'Coming soon',
}

const STATUS_COLOR: Record<IntegrationStatus, { bg: string; text: string }> = {
  connected: {
    bg: 'var(--color-integration-connected-bg)',
    text: 'var(--color-integration-connected-fg)',
  },
  available: {
    bg: 'var(--color-integration-available-bg)',
    text: 'var(--color-integration-available-fg)',
  },
  comingSoon: {
    bg: 'var(--color-integration-coming-bg)',
    text: 'var(--color-integration-coming-fg)',
  },
}

export function IntegrationCard({
  name,
  category,
  icon,
  brandColor = 'var(--color-accent-violet)',
  status,
  description,
  badge,
  onAction,
}: IntegrationCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'sm' }),
        cm.sp('p', 5),
        'rounded-xl bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
      )}
      style={{ border: '1px solid var(--color-border)' }}
    >
      <div className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'sm' }))}>
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'rounded-xl shrink-0')}
          style={{
            width: 44,
            height: 44,
            background: `color-mix(in srgb, ${brandColor} 12%, transparent)`,
          }}
        >
          <span
            className={cm.cn('material-symbols-outlined', cm.textSize('xl'))}
            style={{ color: brandColor, fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        </div>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'rounded-full uppercase tracking-widest whitespace-nowrap px-2.5 py-1',
          )}
          style={{
            background: STATUS_COLOR[status].bg,
            color: STATUS_COLOR[status].text,
          }}
        >
          {t(`integrationCard.status.${status}`, {}, { defaultValue: STATUS_LABELS[status] })}
        </span>
      </div>

      <div>
        <div
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'uppercase tracking-widest',
          )}
          style={{ color: brandColor }}
        >
          {category}
        </div>
        <h3
          className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tracking-tight')}
          style={{ color: 'var(--color-foreground)' }}
        >
          {name}
        </h3>
      </div>

      <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'line-clamp-2')}>{description}</p>

      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'mt-auto')}
        style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}
      >
        {badge ?? <span />}
        {status !== 'comingSoon' && (
          <button
            type="button"
            onClick={onAction}
            disabled={status === 'connected'}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'rounded-full uppercase tracking-widest transition-all',
            )}
            style={{
              background:
                status === 'connected' ? 'transparent' : 'var(--color-integration-connect-btn)',
              color: status === 'connected' ? 'var(--color-integration-connected-text)' : 'white',
              border:
                status === 'connected'
                  ? '1px solid var(--color-integration-connected-border)'
                  : 'none',
              cursor: status === 'connected' ? 'default' : 'pointer',
            }}
          >
            {status === 'connected'
              ? t('integrationCard.manage', {}, { defaultValue: 'Manage' })
              : t('common.connect', {}, { defaultValue: 'Connect' })}
          </button>
        )}
      </div>
    </div>
  )
}
