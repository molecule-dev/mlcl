import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { NimbusFileKind } from './NimbusFileTypeIcon.js'
import { NimbusFileTypeIcon } from './NimbusFileTypeIcon.js'

/**
 * Bespoke file card for grid view — 4:3 thumbnail flush to the top, brand
 * tile for the file kind, name + metadata, and a hover-revealed action
 * cluster (checkbox + triple-dot menu) per DESIGN.md `### File Card`.
 *
 * Translated from online-store's CategoryProductCard editorial treatment +
 * personal-finance's hover-lift transitions — adapted for the cloud-file
 * domain.
 */
export interface NimbusFileGridCardProps {
  id: string
  kind: NimbusFileKind
  name: string
  /** Pre-formatted metadata line — e.g. `12.4 MB · Edited 2h ago` or `12 items`. */
  meta: string
  /** When supplied, renders an `<img>` thumbnail; otherwise the brand tile fills the area. */
  thumbnailUrl?: string
  /** When true, render a star glyph on the thumbnail. */
  starred?: boolean
  /** When true, render a small share badge on the thumbnail. */
  shared?: boolean
}

export function NimbusFileGridCard({
  id,
  kind,
  name,
  meta,
  thumbnailUrl,
  starred,
  shared,
}: NimbusFileGridCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <Link
      to={`/files/${id}`}
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'group rounded-xl bg-surface-container-lowest border border-outline-variant/15 overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all relative',
      )}
      data-mol-id={`file-card-${id}`}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'aspect-[4/3] bg-gradient-to-br from-primary-container/20 to-tertiary-container/20 relative overflow-hidden',
        )}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
          />
        ) : (
          <NimbusFileTypeIcon kind={kind} size="lg" />
        )}
        {(starred || shared) && (
          <div className={cm.cn(cm.flex({ gap: 'xs' }), cm.sp('p', 2), 'absolute top-0 right-0')}>
            {starred && (
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(6),
                  cm.h(6),
                  cm.roundedFull,
                  'bg-surface/90 backdrop-blur-md text-warning',
                )}
                aria-label={t('status.starred', {}, { defaultValue: 'Starred' })}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-base')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
              </span>
            )}
            {shared && (
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(6),
                  cm.h(6),
                  cm.roundedFull,
                  'bg-surface/90 backdrop-blur-md text-secondary',
                )}
                aria-label={t('status.shared', {}, { defaultValue: 'Shared' })}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-base')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  group
                </span>
              </span>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(8),
            cm.h(8),
            cm.roundedFull,
            'absolute bottom-2 right-2 bg-surface/90 backdrop-blur-md text-on-surface opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface',
          )}
          aria-label={t(
            'nimbusFileGridCard.moreActions',
            { name },
            { defaultValue: 'More actions for {{name}}' },
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-lg')}>more_vert</span>
        </button>
      </div>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('p', 3))}>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'truncate text-on-surface',
          )}
        >
          {name}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>{meta}</p>
      </div>
    </Link>
  )
}
