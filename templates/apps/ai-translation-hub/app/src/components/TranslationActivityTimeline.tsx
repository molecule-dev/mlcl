import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type ActivityKind =
  'approved' | 'commented' | 'uploaded' | 'mt_pass' | 'review_requested' | 'glossary_updated'

export interface ActivityEvent {
  id: string
  actor: string
  actor_initials: string
  kind: ActivityKind
  /** Message body, may include `<strong>` markers (rendered safely as <strong>). */
  text: string
  project?: { id: string; name: string }
  timestamp: string
}

interface TranslationActivityTimelineProps {
  events: ReadonlyArray<ActivityEvent>
}

const KIND_ICON: Record<ActivityKind, string> = {
  approved: 'check_circle',
  commented: 'chat',
  uploaded: 'upload_file',
  mt_pass: 'smart_toy',
  review_requested: 'rate_review',
  glossary_updated: 'menu_book',
}

const KIND_TINT: Record<ActivityKind, string> = {
  approved: 'bg-success text-on-primary',
  commented: 'bg-secondary text-on-secondary',
  uploaded: 'bg-primary text-on-primary',
  mt_pass: 'bg-tertiary-container text-tertiary',
  review_requested: 'bg-tertiary text-on-tertiary',
  glossary_updated: 'bg-secondary-container text-on-secondary-container',
}

/**
 * Vertical activity feed — left rail with iconographic dots/avatars,
 * editorial text + timestamp pair per row.
 *
 * Translated from the dashboard fixture's `Recent activity` right rail
 * pattern; we keep the avatar + dot mix for variety.
 */
export function TranslationActivityTimeline({ events }: TranslationActivityTimelineProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (events.length === 0) {
    return (
      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.textCenter,
          cm.sp('py', 8),
          'text-on-surface-variant',
        )}
      >
        {t('translationActivityTimeline.empty', {}, { defaultValue: 'No recent activity yet.' })}
      </p>
    )
  }

  return (
    <div
      className={cm.cn('relative border-l-2 border-surface-container-highest ml-3 space-y-6 pb-4')}
    >
      {events.map((ev) => (
        <div key={ev.id} className={cm.cn('relative pl-6')}>
          {ev.actor_initials ? (
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'absolute -left-[15px] top-0 w-7 h-7 rounded-full border-2 border-surface-container-high bg-primary text-on-primary',
              )}
            >
              {ev.actor_initials}
            </span>
          ) : (
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'absolute -left-[11px] top-1 w-5 h-5 rounded-full border-2 border-surface-container-high',
                KIND_TINT[ev.kind],
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[12px]')} aria-hidden="true">
                {KIND_ICON[ev.kind]}
              </span>
            </span>
          )}
          <div
            className={cm.cn(
              cm.sp('p', 3),
              'bg-surface-container-lowest rounded-lg shadow-sm border border-surface-container-lowest/50',
            )}
          >
            <p className={cm.cn(cm.textSize('sm'), 'text-on-background leading-tight mb-1')}>
              <span className={cm.fontWeight('medium')}>{ev.actor}</span> {ev.text}
              {ev.project && (
                <>
                  {' '}
                  <span className={cm.cn(cm.fontWeight('medium'), 'text-primary')}>
                    {ev.project.name}
                  </span>
                </>
              )}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-outline font-mono')}>{ev.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
