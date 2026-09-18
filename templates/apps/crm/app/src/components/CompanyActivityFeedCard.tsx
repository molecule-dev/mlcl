import { useTranslation, type UseTranslationResult } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CompanyActivity {
  id: string
  type: string
  subject: string
  description: string | null
  created_at: string
  author_name?: string | null
}

const TYPE_ICON: Record<string, string> = {
  call: 'call',
  email: 'mail',
  meeting: 'group',
  note: 'description',
}

function formatActivityDate(s: string, t: UseTranslationResult['t']): string {
  const d = new Date(s)
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days === 0)
    return t(
      'companyActivityFeedCard.today',
      { time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      { defaultValue: 'Today, {{time}}' },
    )
  if (days === 1)
    return t(
      'companyActivityFeedCard.yesterday',
      { time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      { defaultValue: 'Yesterday, {{time}}' },
    )
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function CompanyActivityFeedCard({ activities }: { activities: CompanyActivity[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-3xl shadow-[0px_12px_32px_rgba(19,47,106,0.06)] border-none',
      )}
    >
      <h3
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          cm.sp('mb', 6),
          'text-on-surface gap-2',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined', cm.textPrimary)}
          data-icon="history"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          history
        </span>
        {t('companyActivityFeedCard.title', {}, { defaultValue: 'Activity Feed' })}
      </h3>
      {activities.length === 0 ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'companyActivityFeedCard.noActivities',
            {},
            { defaultValue: 'No activities recorded.' },
          )}
        </p>
      ) : (
        <div
          className={cm.cn(
            cm.stack(8),
            'relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-surface-container',
          )}
        >
          {activities.map((activity, i) => {
            const icon = TYPE_ICON[activity.type] ?? 'circle'
            const first = i === 0
            return (
              <div key={activity.id} className={cm.cn(cm.sp('pl', 10), 'relative')}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(7),
                    cm.h(7),
                    cm.roundedFull,
                    first ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface',
                    'absolute left-0 top-1 ring-4 ring-surface-container-lowest z-10',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}
                    data-icon={icon}
                  >
                    {icon}
                  </span>
                </div>
                <div>
                  <h4
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                  >
                    {activity.subject}
                  </h4>
                  {activity.description && (
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-0.5')}>
                      {activity.description}
                    </p>
                  )}
                  <p
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.sp('mt', 2),
                      first ? 'text-primary' : 'text-on-surface-variant',
                      'text-[10px] uppercase',
                    )}
                  >
                    {formatActivityDate(activity.created_at, t)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CompanyActivityFeedCard
export { CompanyActivityFeedCard }
