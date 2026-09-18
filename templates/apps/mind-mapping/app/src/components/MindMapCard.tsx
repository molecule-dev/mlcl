import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Mind-map preview tile — rounded gradient header with branching SVG glyph,
 * editable title, last-edited timestamp, and a frosted-glass node-count pill.
 *
 * Translated from personal-finance's NetWorthCard.tsx (gradient hero card
 * with frosted-glass overlays and decorative orbs) — adapted into a grid
 * tile to fit the mind-map browse layout.
 */

export interface MindMapCardData {
  id: string
  name: string
  description?: string | null
  thumbnail_url?: string | null
  updated_at: string
  node_count?: number
  is_public?: boolean
  /** True when the map is shared WITH the current user (collaborator, not owner). */
  is_shared?: boolean
}

export interface MindMapCardProps {
  map: MindMapCardData
  paletteIndex?: number
}

const PALETTES = [
  'from-primary to-primary-container',
  'from-tertiary to-tertiary-container',
  'from-secondary to-secondary-container',
  'from-primary-container to-tertiary',
] as const

export function MindMapCard({ map, paletteIndex = 0 }: MindMapCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const palette = PALETTES[paletteIndex % PALETTES.length]
  const updated = new Date(map.updated_at)
  const updatedLabel = isNaN(updated.getTime())
    ? t('mindMapCard.justUpdated', {}, { defaultValue: 'Just now' })
    : updated.toLocaleDateString()

  return (
    <Link
      to={`/maps/${map.id}`}
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'rounded-2xl overflow-hidden bg-surface-container-lowest shadow-sm border border-outline-variant/30 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200',
      )}
    >
      <div className={cm.cn(cm.h(40), 'relative bg-gradient-to-br', palette)}>
        <div
          className={cm.cn(
            'absolute -right-10 -top-10 w-32 h-32 rounded-full bg-surface/15 blur-2xl',
          )}
          aria-hidden
        />
        <div
          className={cm.cn(
            'absolute -left-8 -bottom-8 w-24 h-24 rounded-full bg-surface/10 blur-2xl',
          )}
          aria-hidden
        />
        {map.thumbnail_url ? (
          <img
            src={map.thumbnail_url}
            alt=""
            className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover opacity-90')}
          />
        ) : (
          <svg
            viewBox="0 0 200 140"
            className={cm.cn(cm.w('full'), cm.h('full'), 'absolute inset-0')}
            aria-hidden
          >
            <g stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none">
              <path d="M100 70 Q60 40 30 30" />
              <path d="M100 70 Q140 40 170 30" />
              <path d="M100 70 Q60 100 30 110" />
              <path d="M100 70 Q140 100 170 110" />
            </g>
            <g fill="rgba(255,255,255,0.95)">
              <circle cx="100" cy="70" r="14" />
              <circle cx="30" cy="30" r="9" />
              <circle cx="170" cy="30" r="9" />
              <circle cx="30" cy="110" r="9" />
              <circle cx="170" cy="110" r="9" />
            </g>
          </svg>
        )}
        {typeof map.node_count === 'number' && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              'absolute top-3 right-3 bg-surface/25 backdrop-blur-md text-on-primary text-[10px] uppercase tracking-widest rounded-full',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>hub</span>
            {t('mindMapCard.nodes', { count: map.node_count }, { defaultValue: '{{count}} nodes' })}
          </span>
        )}
      </div>
      <div className={cm.cn(cm.sp('p', 5), cm.stack(2))}>
        <div className={cm.flex({ justify: 'between', align: 'center' })}>
          <h3
            className={cm.cn(
              cm.textSize('lg'),
              'font-extrabold tracking-tight text-on-surface truncate',
            )}
          >
            {map.name}
          </h3>
          {map.is_public && (
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest rounded-full bg-tertiary-container/40 text-on-tertiary-container',
              )}
            >
              {t('status.shared', {}, { defaultValue: 'Shared' })}
            </span>
          )}
        </div>
        {map.description && (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant truncate')}>
            {map.description}
          </p>
        )}
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'text-on-surface-variant')}>
          <span className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}>schedule</span>
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))}>
            {t('mindMapCard.updated', { date: updatedLabel }, { defaultValue: 'Updated {{date}}' })}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default MindMapCard
