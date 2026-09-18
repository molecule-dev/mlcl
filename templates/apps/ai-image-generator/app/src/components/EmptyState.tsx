import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface EmptyStateProps {
  /** Material symbol glyph for the centred badge. */
  icon: string
  /** Heading copy. */
  title: string
  /** Supporting body copy. */
  description: string
  /** Optional CTA slot — typically a `<Link>` button. */
  action?: ReactNode
}

/**
 * Branded empty state — large dreamy gradient halo around a glyph, heading
 * + body, optional CTA. Used wherever a list page has nothing to show.
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'md' }),
        cm.sp('p', 12),
        cm.textCenter,
        'rounded-3xl border border-dashed border-outline-variant/30 bg-surface-container-lowest/50',
      )}
    >
      <span
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 text-primary',
        )}
        aria-hidden="true"
      >
        <span className={cm.cn('material-symbols-outlined text-4xl')}>{icon}</span>
      </span>
      <h2
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.textSize('xl'),
          'tracking-tight text-on-surface',
        )}
      >
        {title}
      </h2>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-md')}>{description}</p>
      {action ?? (
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'text-on-surface-variant/70 font-mono uppercase tracking-widest',
          )}
        >
          {t('emptyState.hint', {}, { defaultValue: 'Type a prompt above to begin' })}
        </span>
      )}
    </div>
  )
}
