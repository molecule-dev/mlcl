import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'

/**
 * Editorial brand panel for Quillon's auth split-screen layout —
 * indigo-to-cyan gradient, blurred orbs, voice-of-the-writer quote,
 * and a stack of avatars hinting at ambient collaborator presence.
 *
 * Translated from catalog §13.3 (Decorated-Card with Brand Panel) and
 * the contract-management AuthBrandPanel — adapted to Quillon's
 * literary indigo (#4f46e5) + cyan accent (#06b6d4).
 */
export interface QuillonAuthBrandPanelProps {
  /** Optional writer testimonial / quote. */
  quote?: string
  /** Attribution under the quote. */
  attribution?: string
  /** Number of writers shown as actively collaborating. */
  activeCount?: number
}

const AVATAR_COLORS = ['#4f46e5', '#e11d48', '#16a34a', '#d97706'] as const

export function QuillonAuthBrandPanel({
  quote,
  attribution,
  activeCount = 12,
}: QuillonAuthBrandPanelProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const resolvedQuote =
    quote ??
    t(
      'quillonAuthBrandPanel.quote',
      {},
      {
        defaultValue:
          '“Writing is the only thing that, when I do it, I don\u2019t feel I should be doing something else.”',
      },
    )
  const resolvedAttribution =
    attribution ?? t('quillonAuthBrandPanel.attribution', {}, { defaultValue: 'Gloria Steinem' })
  const presenceLabel = t(
    'quillonAuthBrandPanel.presence',
    { count: activeCount },
    { defaultValue: '{{count}} writers active in the studio' },
  )

  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 12),
        'relative hidden w-1/2 overflow-hidden text-white lg:flex',
      )}
      style={{
        background:
          'linear-gradient(to bottom right, var(--color-brand-gradient-from), var(--color-brand-gradient-via), var(--color-brand-gradient-to))',
      }}
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          'pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-surface/15 blur-3xl',
        )}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'pointer-events-none absolute -left-20 -bottom-32 h-80 w-80 rounded-full blur-3xl',
        )}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-brand-gradient-to) 30%, transparent)',
        }}
      />

      <div className={cm.cn('relative z-10')}>
        <BrandWordmark as="span" size="lg" invert />
        <p className={cm.cn(cm.sp('mt', 3), cm.textSize('xl'), 'text-white/85')}>{APP_TAGLINE}.</p>
      </div>

      <div className={cm.cn('relative z-10 mx-auto max-w-md')}>
        <blockquote
          className={cm.cn(cm.textSize('3xl'), 'font-serif italic leading-snug text-white')}
          style={{ fontFamily: 'Charter, Georgia, serif' }}
        >
          {resolvedQuote}
        </blockquote>
        <p
          className={cm.cn(
            cm.sp('mt', 6),
            cm.textSize('xs'),
            cm.fontWeight('extrabold'),
            'uppercase tracking-widest text-white/70',
          )}
        >
          — {resolvedAttribution}
        </p>
      </div>

      <div className={cm.cn('relative z-10', cm.flex({ align: 'center', gap: 'md' }))}>
        <div className={cm.cn('flex -space-x-3')}>
          {AVATAR_COLORS.map((color, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={cm.cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface/40 text-sm font-extrabold text-white',
              )}
              style={{ backgroundColor: color }}
            >
              {String.fromCharCode(65 + i)}
            </span>
          ))}
          <span
            className={cm.cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface/40 bg-surface/15 text-xs font-extrabold text-white backdrop-blur-md',
            )}
          >
            +{Math.max(0, activeCount - AVATAR_COLORS.length)}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-white/85')}>{presenceLabel}</p>
      </div>
    </aside>
  )
}
