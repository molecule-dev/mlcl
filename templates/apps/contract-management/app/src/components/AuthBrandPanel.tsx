import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'

/**
 * Dark navy brand panel for the auth split-screen layout — gold "seal"
 * emblem, blurred decorative orbs, voice-of-the-customer quote.
 *
 * Translated from catalog §13.3 (Decorated-Card with Brand Panel) and
 * Vellum's brand — `#0f1d2f` navy + `#c49a2a` gold seal.
 */
export interface AuthBrandPanelProps {
  /** Optional customer testimonial. */
  quote?: string
  /** Attribution under the quote. */
  attribution?: string
}

export function AuthBrandPanel({ quote, attribution }: AuthBrandPanelProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const resolvedQuote =
    quote ??
    t(
      'authBrandPanel.quote',
      { appName: APP_NAME },
      {
        defaultValue:
          '“{{appName}} is now the system of record for every signed agreement we own.”',
      },
    )
  const resolvedAttribution =
    attribution ??
    t(
      'authBrandPanel.attribution',
      {},
      { defaultValue: 'Morgan Reyes — Head of Legal Ops, Northwind Traders' },
    )

  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 12),
        'relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-sidebar-bg via-[var(--mol-color-primary-dark)] to-[var(--mol-color-primary)] text-white lg:flex',
      )}
    >
      <div
        aria-hidden="true"
        className={
          'pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-[var(--color-status-pending)]/15 blur-3xl'
        }
      />
      <div
        aria-hidden="true"
        className={
          'pointer-events-none absolute -left-20 -bottom-32 h-80 w-80 rounded-full bg-surface/5 blur-3xl'
        }
      />

      <div className="relative z-10">
        <BrandWordmark as="span" size="lg" invert />
        <p className={cm.cn(cm.sp('mt', 3), cm.textSize('xl'), 'text-white/80')}>
          {t('authBrandPanel.tagline', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}.' })}
        </p>
      </div>

      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'relative z-10 flex-1')}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-44 w-44 rounded-full bg-[var(--color-status-pending)]/20 ring-1 ring-[var(--color-status-pending)]/40 backdrop-blur-md',
          )}
          aria-hidden="true"
        >
          <span
            className={'material-symbols-outlined text-[var(--color-status-pending)]'}
            style={{ fontSize: '4rem' }}
          >
            workspace_premium
          </span>
        </div>
      </div>

      <div className="relative z-10">
        <p className={cm.cn(cm.textSize('lg'), 'italic leading-relaxed text-white/90')}>
          {resolvedQuote}
        </p>
        <p
          className={cm.cn(
            cm.sp('mt', 3),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-[var(--color-status-pending)]',
          )}
        >
          {resolvedAttribution}
        </p>
      </div>
    </aside>
  )
}
