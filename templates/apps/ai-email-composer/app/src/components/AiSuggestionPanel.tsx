import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface AiSuggestionPanelProps {
  /** Optional title — defaults to `${APP_NAME} Copilot`. */
  title?: string
  /** Optional subtitle paragraph rendered below the title. */
  subtitle?: string
  children: ReactNode
}

/**
 * Purple-tinted AI panel — the recurring sidebar/panel chrome for any
 * Signet surface that hosts copilot interactions (Compose AI sidebar,
 * Compose-tone adjuster, suggestion drawers).
 *
 * Inset primary accent bar + tinted ai-panel background + the Signet
 * sparkle glyph in the corner. Designed to read as "AI-assisted" without
 * shouting.
 */
export function AiSuggestionPanel({ title, subtitle, children }: AiSuggestionPanelProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <aside
      className={cm.cn(
        cm.sp('p', 6),
        cm.accentCard({ tone: 'primary' }),
        'rounded-2xl overflow-hidden',
      )}
      style={{
        background:
          'linear-gradient(140deg, color-mix(in srgb, var(--color-primary) 8%, transparent) 0%, color-mix(in srgb, var(--color-primary) 4%, transparent) 60%, color-mix(in srgb, var(--color-secondary) 5%, transparent) 100%)',
      }}
    >
      <div
        className={cm.cn(cm.w(24), cm.h(24), cm.roundedFull, 'absolute -right-10 -top-10 blur-2xl')}
        style={{ background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}
        aria-hidden="true"
      />
      <header
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4), 'relative z-10')}
      >
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(8),
            cm.h(8),
            cm.roundedFull,
            'bg-primary/15 text-primary',
          )}
          aria-hidden="true"
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>auto_awesome</span>
        </span>
        <div>
          <h3
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'text-on-surface uppercase tracking-wider',
            )}
          >
            {title ??
              t(
                'aiSuggestionPanel.title',
                { app: APP_NAME },
                { defaultValue: `${APP_NAME} Copilot` },
              )}
          </h3>
          {subtitle && (
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-0.5')}>{subtitle}</p>
          )}
        </div>
      </header>
      <div className={cm.cn(cm.stack(4), 'relative z-10')}>{children}</div>
    </aside>
  )
}
