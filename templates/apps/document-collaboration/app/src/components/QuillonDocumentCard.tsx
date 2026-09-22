import { Link } from 'react-router'

import type { TranslateFunction } from '@molecule/app-i18n'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type DocumentVisibility, DocumentVisibilityPill } from './DocumentVisibilityPill.js'
import { PresenceAvatars, type PresenceCollaborator } from './PresenceAvatars.js'

/**
 * Hero document card — Charter-serif preview thumbnail, title in
 * Inter, last-edited timestamp, sharing pill, and stacked
 * collaborator avatars. Translated from blog/PostListItem.tsx and
 * the §13 catalog editorial card pattern.
 */
export interface QuillonDocumentCardProps {
  id: string
  title: string
  preview: string
  visibility: DocumentVisibility
  collaborators: PresenceCollaborator[]
  totalCollaborators?: number
  /** ISO timestamp. */
  updatedAt: string
  /** Optional folder accent color (hex). */
  folderColor?: string
  folderName?: string
  /** Override the auto-generated `/doc/:id` link. */
  href?: string
  /** Extra footer slot (e.g. Trash actions). */
  footerSlot?: React.ReactNode
  /** Mute the card (Trash). */
  dimmed?: boolean
}

function fmtRelative(iso: string, t: TranslateFunction): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffH = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffH < 1) return t('time.justNow', {}, { defaultValue: 'just now' })
  if (diffH < 24) return t('time.hoursAgo', { hours: diffH }, { defaultValue: '{{hours}}h ago' })
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return t('time.daysAgo', { days: diffD }, { defaultValue: '{{days}}d ago' })
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function QuillonDocumentCard({
  id,
  title,
  preview,
  visibility,
  collaborators,
  totalCollaborators,
  updatedAt,
  folderColor,
  folderName,
  href,
  footerSlot,
  dimmed = false,
}: QuillonDocumentCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const target = href ?? `/doc/${id}`

  return (
    <article
      className={cm.cn(
        cm.sp('p', 5),
        'group relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40',
        dimmed ? 'opacity-70' : '',
      )}
    >
      {folderColor ? (
        <span
          aria-hidden="true"
          className={cm.cn('absolute inset-x-0 top-0 h-1')}
          style={{ backgroundColor: folderColor }}
        />
      ) : null}

      <Link to={target} className="block">
        <div
          className={cm.cn(
            'relative h-32 w-full overflow-hidden rounded-xl bg-surface-container-low ring-1 ring-outline-variant/40',
          )}
          aria-hidden="true"
        >
          <div
            className={cm.cn(
              'h-full w-full p-4 text-[10px] leading-tight text-on-surface-variant/80',
            )}
            style={{ fontFamily: 'Charter, Georgia, serif' }}
          >
            {preview}
          </div>
          <span
            aria-hidden="true"
            className={cm.cn(
              'pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface-container-low to-transparent',
            )}
          />
        </div>
      </Link>

      <div
        className={cm.cn(
          cm.sp('mt', 4),
          cm.flex({ align: 'start', justify: 'between', gap: 'sm' }),
        )}
      >
        <div className={cm.cn('min-w-0 flex-1')}>
          <Link
            to={target}
            className={cm.cn(
              cm.fontWeight('extrabold'),
              cm.textSize('base'),
              'block min-h-[36px] truncate text-on-surface group-hover:text-primary',
            )}
          >
            {title}
          </Link>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('xs'), 'text-on-surface-variant')}>
            {folderName
              ? `${folderName} · ${t('quillonDocumentCard.edited', { when: fmtRelative(updatedAt, t) }, { defaultValue: 'edited {{when}}' })}`
              : t(
                  'quillonDocumentCard.edited',
                  { when: fmtRelative(updatedAt, t) },
                  { defaultValue: 'edited {{when}}' },
                )}
          </p>
        </div>
        <DocumentVisibilityPill visibility={visibility} />
      </div>

      <div
        className={cm.cn(
          cm.sp('mt', 4),
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        )}
      >
        <PresenceAvatars
          collaborators={collaborators}
          totalOverride={totalCollaborators}
          size={26}
        />
        {footerSlot ?? (
          <Link
            to={target}
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'inline-flex min-h-[36px] items-center text-primary hover:underline',
            )}
          >
            {t('quillonDocumentCard.open', {}, { defaultValue: 'Open →' })}
          </Link>
        )}
      </div>
    </article>
  )
}
