import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface VaultHeroCardProps {
  /** Number of items currently sealed in the vault. */
  itemCount: number
  /** Score 0-100 reflecting vault strength. */
  strengthScore: number
  /** When provided, shown in the corner pill (e.g. 'Last sync 2m ago'). */
  syncedLabel?: string
}

/**
 * Hero card surfaced on Vault overview + auth'd dashboards. Indigo →
 * primary-container gradient, "Items Sealed" label, 6xl extrabold
 * count, frosted-glass strength pill with shield glyph, decorative
 * blurred indigo orbs in the corners, inline SVG vault keys arc.
 *
 * Translated from personal-finance's NetWorthCard.tsx (catalog §1.1)
 * with Sigil's diamond/shield iconography.
 */
export function VaultHeroCard({ itemCount, strengthScore, syncedLabel }: VaultHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        'p-6 md:p-10',
        'min-h-[240px] md:min-h-[320px] bg-gradient-to-br from-primary to-indigo-900 rounded-[2rem] text-white relative overflow-hidden',
      )}
    >
      <div className={cm.cn('relative z-10', cm.flex({ direction: 'col', gap: 'md' }))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined text-emerald-300')}
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            diamond
          </span>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'uppercase tracking-widest text-white/80',
            )}
          >
            {t('vaultHeroCard.title', {}, { defaultValue: 'Items Sealed' })}
          </h2>
        </div>

        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }), 'flex-wrap')}>
          <span className={cm.cn('text-5xl md:text-6xl font-extrabold tracking-tighter')}>
            {t('vaultHeroCard.count', { count: itemCount }, { defaultValue: '{{count}}' })}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface/20 backdrop-blur-md',
            )}
          >
            <span
              className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
              aria-hidden="true"
            >
              shield
            </span>
            {t(
              'vaultHeroCard.strength',
              { score: strengthScore },
              { defaultValue: '{{score}}% strength' },
            )}
          </span>
        </div>
      </div>

      <div className={cm.cn('relative z-10', cm.flex({ direction: 'col', gap: 'sm' }))}>
        <div
          className={cm.cn(
            cm.h(20),
            cm.w('full'),
            cm.flex({ align: 'end', gap: 'xs' }),
            'opacity-50',
          )}
        >
          <svg
            className={cm.cn(cm.w('full'), cm.h('full'))}
            viewBox="0 0 400 80"
            preserveAspectRatio="none"
          >
            <path
              d="M0,60 Q40,40 80,55 T160,30 T240,40 T320,15 T400,25 L400,80 L0,80 Z"
              fill="white"
              opacity="0.25"
            />
            <path
              d="M0,60 Q40,40 80,55 T160,30 T240,40 T320,15 T400,25"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        {syncedLabel && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-white/70',
            )}
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              cloud_done
            </span>
            {syncedLabel}
          </span>
        )}
      </div>

      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-20 -bottom-20 bg-surface/10 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          cm.w(20),
          cm.h(20),
          cm.roundedFull,
          'absolute right-10 top-10 bg-emerald-300/30 blur-xl',
        )}
        aria-hidden="true"
      />
    </div>
  )
}

export default VaultHeroCard
