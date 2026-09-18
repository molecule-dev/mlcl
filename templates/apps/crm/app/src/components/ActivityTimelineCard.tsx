/**
 * Thin shim around @molecule/app-activity-timeline-react. Preserves
 * the local Activity shape and the per-app heading + "Show Older
 * Activities" CTA; the shared package owns the connector-line +
 * dot-marker rendering.
 */
import { Link } from 'react-router'

import { ActivityTimeline, type TimelineKindTone } from '@molecule/app-activity-timeline-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const ACTIVITY_TONES: Record<string, TimelineKindTone> = {
  call: { icon: 'call', dotClass: 'bg-primary', iconClass: 'text-on-primary' },
  email: { icon: 'mail', dotClass: 'bg-secondary', iconClass: 'text-on-primary' },
  meeting: {
    icon: 'groups',
    dotClass: 'bg-surface-container-highest',
    iconClass: 'text-primary',
  },
  task: { icon: 'task_alt', dotClass: 'bg-primary', iconClass: 'text-on-primary' },
  note: {
    icon: 'sticky_note_2',
    dotClass: 'bg-surface-container-highest',
    iconClass: 'text-primary',
  },
}

interface Activity {
  id: string
  type: string
  subject: string
  description: string | null
  due_date: string | null
  completed: boolean
}

interface ActivityTimelineCardProps {
  activities: Activity[]
}

function ActivityTimelineCard({ activities }: ActivityTimelineCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <ActivityTimeline
      events={activities.map((a) => ({
        id: a.id,
        kind: a.type,
        title: a.subject,
        description: a.description,
        meta: a.due_date
          ? new Date(a.due_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
          : '',
      }))}
      toneByKind={ACTIVITY_TONES}
      header={
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mb', 6),
            'font-bold uppercase tracking-[0.15em] text-on-surface-variant',
          )}
        >
          {t('activityTimelineCard.title', {}, { defaultValue: 'Activity Timeline' })}
        </h2>
      }
      footer={
        <Link className={cm.fv55045ba8} to="/activities">
          {t(
            'activityTimelineCard.showOlderActivities',
            {},
            { defaultValue: 'Show Older Activities' },
          )}
        </Link>
      }
    />
  )
}

export default ActivityTimelineCard
export { ActivityTimelineCard }
