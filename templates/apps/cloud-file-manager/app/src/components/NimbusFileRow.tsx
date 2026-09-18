import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { NimbusFileKind } from './NimbusFileTypeIcon.js'
import { NimbusFileTypeIcon } from './NimbusFileTypeIcon.js'

/**
 * Editorial table row for the list-view file browser.
 *
 * Translated from personal-finance's AccountRecentTransactions row pattern —
 * 4-column grid (name / modified / size / shared) with hover background and
 * uppercase-tracked metadata, but tuned for cloud-file-manager DESIGN.md
 * `### File Row (List View)` measurements.
 */
export interface NimbusFileRowProps {
  id: string
  kind: NimbusFileKind
  name: string
  modifiedLabel: string
  sizeLabel: string
  sharedWith?: string | null
  starred?: boolean
}

export function NimbusFileRow({
  id,
  kind,
  name,
  modifiedLabel,
  sizeLabel,
  sharedWith,
  starred,
}: NimbusFileRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <Link
      to={`/files/${id}`}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        'group hover:bg-surface-container-low transition-colors text-on-surface',
      )}
      data-mol-id={`file-row-${id}`}
    >
      <NimbusFileTypeIcon kind={kind} size="sm" />
      <div className={cm.cn(cm.flex({ direction: 'col' }), 'flex-grow min-w-0')}>
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'truncate text-on-surface')}
        >
          {name}
        </span>
      </div>
      {starred && (
        <span
          className={cm.cn('material-symbols-outlined text-base text-warning shrink-0')}
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-label={t('status.starred', {}, { defaultValue: 'Starred' })}
        >
          star
        </span>
      )}
      <span
        className={cm.cn(
          cm.textSize('xs'),
          'w-40 shrink-0 hidden md:inline text-on-surface-variant tabular-nums',
        )}
      >
        {modifiedLabel}
      </span>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('medium'),
          'w-24 shrink-0 hidden md:inline text-on-surface tabular-nums text-right',
        )}
      >
        {sizeLabel}
      </span>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          'w-20 shrink-0 hidden md:inline text-on-surface-variant truncate',
        )}
      >
        {sharedWith ?? '—'}
      </span>
    </Link>
  )
}
