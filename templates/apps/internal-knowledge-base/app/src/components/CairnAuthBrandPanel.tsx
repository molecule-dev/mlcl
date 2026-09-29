import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from './BrandWordmark.js'

/**
 * Editorial brand panel for Cairn's auth split-screen layout —
 * deep-teal-to-cyan gradient with a warm amber under-glow,
 * stacked stones glyph, an enduring quote about durable
 * documentation, and a small editor presence row.
 *
 * Translated from §13.3 (Decorated-Card with Brand Panel) and the
 * document-collaboration QuillonAuthBrandPanel — adapted to Cairn's
 * library voice (Georgia serif quote, no exclamation points).
 */
export interface CairnAuthBrandPanelProps {
  quote?: string
  attribution?: string
  /** Number of editors actively maintaining knowledge spaces. */
  activeEditors?: number
}

// Avatar fills sit under white bold initials — amber/green were 3.2-3.3:1
// (axe serious on /login); stepped to the same hue one shade darker.
const STONE_AVATARS = [
  { color: '#0f766e', initials: 'MP' },
  { color: '#b45309', initials: 'JL' }, // was #d97706 (3.18:1); amber-700 = 5.0:1 under white
  { color: '#7c3aed', initials: 'AK' },
  { color: '#166534', initials: 'RS' }, // was #16a34a (3.29:1); green-800 = 7.1:1 under white
] as const

export function CairnAuthBrandPanel({
  quote,
  attribution,
  activeEditors = 18,
}: CairnAuthBrandPanelProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const resolvedQuote =
    quote ??
    t(
      'cairnAuthBrandPanel.quote',
      {},
      {
        defaultValue: '“The job of the writer is to make revolution irresistible.”',
      },
    )
  const resolvedAttribution =
    attribution ?? t('cairnAuthBrandPanel.attribution', {}, { defaultValue: 'Toni Cade Bambara' })
  const presenceLabel = t(
    'cairnAuthBrandPanel.presence',
    { count: activeEditors },
    { defaultValue: '{{count}} editors maintaining the trail this week' },
  )

  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 12),
        'relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-[var(--mol-color-primary)] via-[var(--mol-color-primary-hover)] to-[#0d9488] text-white lg:flex',
      )}
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
          'pointer-events-none absolute -left-20 -bottom-32 h-80 w-80 rounded-full bg-[var(--mol-color-secondary)]/30 blur-3xl',
        )}
      />

      <div className={cm.cn('relative z-10')}>
        <BrandWordmark as="span" size="lg" invert withTagline />
      </div>

      <div className={cm.cn('relative z-10 mx-auto max-w-md')}>
        <blockquote
          className={cm.cn(cm.textSize('3xl'), 'italic leading-snug text-white')}
          style={{ fontFamily: 'Georgia, "Iowan Old Style", serif' }}
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
          {STONE_AVATARS.map((a, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={cm.cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface/40 text-sm font-extrabold text-white',
              )}
              style={{ backgroundColor: a.color }}
            >
              {a.initials}
            </span>
          ))}
          <span
            className={cm.cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface/40 bg-surface/15 text-xs font-extrabold text-white backdrop-blur-md',
            )}
          >
            +{Math.max(0, activeEditors - STONE_AVATARS.length)}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-white/85')}>{presenceLabel}</p>
      </div>
    </aside>
  )
}
