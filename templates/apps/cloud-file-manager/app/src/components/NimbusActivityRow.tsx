import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { NimbusFileKind } from './NimbusFileTypeIcon.js'
import { NimbusFileTypeIcon } from './NimbusFileTypeIcon.js'

export type NimbusActivityKind = 'edit' | 'share' | 'comment' | 'upload' | 'restore' | 'delete'

const ACTIVITY_GLYPHS: Record<NimbusActivityKind, string> = {
  edit: 'edit',
  share: 'share',
  comment: 'mode_comment',
  upload: 'upload',
  restore: 'restore',
  delete: 'delete',
}

const ACTIVITY_TONES: Record<NimbusActivityKind, string> = {
  edit: 'text-primary bg-primary-container/15',
  share: 'text-secondary bg-secondary-container/20',
  comment: 'text-tertiary bg-tertiary-container/10',
  upload: 'text-success bg-success-light',
  restore: 'text-tertiary bg-tertiary-container/10',
  delete: 'text-error bg-error-container',
}

/**
 * Recent activity feed row — actor + action + file (icon + name) + timestamp.
 *
 * Translated from crm/ActivityFeed and personal-finance/ActivityRow — same
 * editorial timeline pattern, restyled for the cloud-file-manager domain.
 */
export interface NimbusActivityRowProps {
  id: string
  activity: NimbusActivityKind
  actorName: string
  actorInitials: string
  /** Localized verb phrase between actor and file — e.g. "edited", "shared". */
  actionLabel: string
  fileId: string
  fileName: string
  fileKind: NimbusFileKind
  /** Pre-formatted relative time — e.g. `2h ago`. */
  timestamp: string
}

export function NimbusActivityRow({
  id,
  activity,
  actorName,
  actorInitials,
  actionLabel,
  fileId,
  fileName,
  fileKind,
  timestamp,
}: NimbusActivityRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <li
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('p', 4),
        'rounded-xl bg-surface-container-lowest border border-outline-variant/15 hover:border-primary-container hover:shadow-sm transition-all',
      )}
      data-mol-id={`activity-row-${id}`}
    >
      <div className="relative shrink-0">
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'bg-gradient-to-br from-primary to-tertiary-container text-on-primary',
          )}
          aria-hidden="true"
        >
          {actorInitials}
        </span>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(5),
            cm.h(5),
            cm.roundedFull,
            'absolute -right-1 -bottom-1 ring-2 ring-surface',
            ACTIVITY_TONES[activity],
          )}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-[14px]">{ACTIVITY_GLYPHS[activity]}</span>
        </span>
      </div>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-grow min-w-0')}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
          <span className={cm.cn(cm.fontWeight('semibold'))}>{actorName}</span>{' '}
          <span className="text-on-surface-variant">{actionLabel}</span>{' '}
          <Link
            to={`/files/${fileId}`}
            className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
          >
            {fileName}
          </Link>
        </p>
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t('nimbusActivityRow.timestamp', { time: timestamp }, { defaultValue: '{{time}}' })}
        </span>
      </div>
      <NimbusFileTypeIcon kind={fileKind} size="sm" />
    </li>
  )
}
