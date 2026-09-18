import { useTranslation, type UseTranslationResult } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Activity {
  id: string
  type: string
  subject: string
  description: string | null
  due_date: string | null
  completed: boolean
  contact_name: string | null
  company_name: string | null
}

interface Props {
  activities: Activity[]
  loading: boolean
}

function getTypeStyle(type: string): { bg: string; text: string; icon: string } {
  switch (type) {
    case 'call':
      return { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'call' }
    case 'email':
      return { bg: 'bg-warning-light', text: 'text-warning', icon: 'mail' }
    case 'meeting':
      return { bg: 'bg-purple-100', text: 'text-purple-700', icon: 'calendar_today' }
    case 'note':
      return { bg: 'bg-surface-secondary', text: 'text-foreground', icon: 'sticky_note_2' }
    case 'task':
      return { bg: 'bg-success-light', text: 'text-success', icon: 'task_alt' }
    default:
      return { bg: 'bg-surface-secondary', text: 'text-foreground', icon: 'circle' }
  }
}

function formatDate(dateStr: string | null, t: UseTranslationResult['t']): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  if (diffHours < 1) return t('activitiesTimelineFeed.justNow', {}, { defaultValue: 'Just now' })
  if (diffHours < 24)
    return t(
      'activitiesTimelineFeed.hoursAgo',
      { hours: diffHours },
      { defaultValue: '{{hours}} hours ago' },
    )
  if (diffDays === 1)
    return t('activitiesTimelineFeed.yesterday', {}, { defaultValue: 'Yesterday' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ActivitiesTimelineFeed({ activities, loading }: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()
  if (loading) {
    return (
      <div className={cm.cn(cm.stack(4), 'relative')}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cm.cn(cm.flex({}), 'relative z-10 gap-6')}>
            <div
              className={cm.cn(
                cm.w(12),
                cm.h(12),
                cm.roundedFull,
                'bg-surface-container-low animate-pulse ring-4 ring-background',
              )}
            />
            <div
              className={cm.cn(
                cm.flex1,
                cm.sp('p', 5),
                'bg-surface-container-lowest rounded-2xl animate-pulse',
              )}
              style={{ minHeight: 100 }}
            />
          </div>
        ))}
      </div>
    )
  }
  if (activities.length === 0) {
    return (
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.sp('py', 16),
          'text-on-surface-variant',
        )}
      >
        <span className={cm.fv5b245ffa} style={{ fontSize: 40 }}>
          event_busy
        </span>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), cm.sp('mt', 3))}>
          {t(
            'activitiesTimelineFeed.noActivitiesFound',
            {},
            { defaultValue: 'No activities found' },
          )}
        </p>
      </div>
    )
  }
  return (
    <div className={cm.cn(cm.stack(4), 'relative')}>
      {/* Vertical line */}
      <div
        className={cm.cn(
          cm.position('absolute'),
          'left-6 top-4 bottom-4 w-[2px] bg-surface-variant z-0',
        )}
      />
      {activities.map((activity) => {
        const style = getTypeStyle(activity.type)
        return (
          <div key={activity.id} className={cm.cn(cm.flex({}), 'relative z-10 gap-6 group')}>
            <div
              className={cm.cn(
                'w-12 h-12 rounded-full flex items-center justify-center shadow-sm ring-4 ring-background',
                style.bg,
                style.text,
              )}
            >
              <span className={cm.fv5b245ffa}>{style.icon}</span>
            </div>
            <div
              className={cm.cn(
                cm.flex1,
                cm.sp('p', 5),
                'bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,74,198,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,74,198,0.1)] transition-all border border-transparent hover:border-primary/10',
              )}
            >
              <div
                className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 2))}
              >
                <h4 className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                  {activity.subject}
                </h4>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] text-foreground-tertiary uppercase tracking-tighter',
                  )}
                >
                  {formatDate(activity.due_date, t)}
                </span>
              </div>
              {(activity.description || activity.contact_name) && (
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mb', 4),
                    'text-on-surface-variant leading-relaxed',
                  )}
                >
                  {activity.description ||
                    (activity.company_name
                      ? t(
                          'activitiesTimelineFeed.contactAtCompany',
                          { contact: activity.contact_name ?? '', company: activity.company_name },
                          { defaultValue: '{{contact}} at {{company}}' },
                        )
                      : (activity.contact_name ?? ''))}
                </p>
              )}
              <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
                <span
                  className={cm.cn(
                    'px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full',
                    activity.completed
                      ? 'bg-success-light text-success'
                      : 'bg-blue-100 text-blue-700',
                  )}
                >
                  {activity.completed
                    ? t('common.completed', {}, { defaultValue: 'Completed' })
                    : t('activitiesTimelineFeed.scheduled', {}, { defaultValue: 'Scheduled' })}
                </span>
              </div>
            </div>
          </div>
        )
      })}
      <div className={cm.cn(cm.flex({}), 'relative z-10 gap-6 group')}>
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'bg-blue-100 text-blue-700 shadow-sm ring-4 ring-background',
          )}
        >
          <span className={cm.fv5b245ffa}>call</span>
        </div>
        <div
          className={cm.cn(
            cm.flex1,
            cm.sp('p', 5),
            'bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,74,198,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,74,198,0.1)] transition-all border border-transparent hover:border-primary/10',
          )}
        >
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 2))}>
            <h4 className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
              {t(
                'activitiesTimelineFeed.demoCallSubject',
                {},
                { defaultValue: 'Discovery Call with Sarah Jenkins' },
              )}
            </h4>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-foreground-tertiary uppercase tracking-tighter',
              )}
            >
              {t(
                'activitiesTimelineFeed.hoursAgo',
                { hours: 2 },
                { defaultValue: '{{hours}} hours ago' },
              )}
            </span>
          </div>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mb', 4),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t('activitiesTimelineFeed.demoCallLogIntro', {}, { defaultValue: 'Called Sarah at ' })}
            <span className={cm.cn(cm.textPrimary, cm.fontWeight('semibold'))}>Acme Corp</span>
            {t(
              'activitiesTimelineFeed.demoCallLogOutcome',
              {},
              {
                defaultValue:
                  ' — discussed Q4 renewal and potential seat expansion for the engineering department.',
              },
            )}
          </p>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                'gap-1.5 bg-surface-container-low',
              )}
            >
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'material-symbols-outlined text-foreground-secondary',
                )}
              >
                schedule
              </span>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'text-foreground-secondary',
                )}
              >
                {t(
                  'activitiesTimelineFeed.callDuration',
                  { minutes: 12 },
                  { defaultValue: '{{minutes}} mins' },
                )}
              </span>
            </div>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                'bg-success-light text-success text-[10px] font-black uppercase tracking-widest',
              )}
            >
              {t('common.completed', {}, { defaultValue: 'Completed' })}
            </span>
          </div>
        </div>
      </div>
      {/* removed: hardcoded demo item 2 */}

      {/* removed: hardcoded demo item 3 */}

      {/* removed: hardcoded demo item 4 */}
      {/* end dynamic items */}
      <div className={cm.cn(cm.flex({}), 'relative z-10 gap-6 group')} style={{ display: 'none' }}>
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'bg-surface-secondary text-foreground shadow-sm ring-4 ring-background',
          )}
        >
          <span className={cm.fv5b245ffa}>sticky_note_2</span>
        </div>
        <div
          className={cm.cn(
            cm.flex1,
            cm.sp('p', 5),
            'bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,74,198,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,74,198,0.1)] transition-all border border-transparent hover:border-primary/10',
          )}
        >
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 2))}>
            <h4 className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
              {t(
                'activitiesTimelineFeed.demoNoteSubject',
                {},
                { defaultValue: 'Strategy Session Internal Note' },
              )}
            </h4>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-foreground-tertiary uppercase tracking-tighter',
              )}
            >
              {t(
                'activitiesTimelineFeed.demoNoteTimestamp',
                {},
                { defaultValue: 'Oct 24, 02:15 PM' },
              )}
            </span>
          </div>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mb', 0),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'activitiesTimelineFeed.demoNoteIntro',
              {},
              { defaultValue: 'Internal memo regarding ' },
            )}
            <span className={cm.cn(cm.textPrimary, cm.fontWeight('semibold'))}>
              Global Logistics Corp
            </span>
            {t(
              'activitiesTimelineFeed.demoNoteAction',
              {},
              { defaultValue: ". Need to prioritize the fulfillment module in next week's demo." },
            )}
          </p>
        </div>
      </div>
      {/* 5. Activity Item: Call (Missed) */}
      <div className={cm.cn(cm.flex({}), 'relative z-10 gap-6 group')}>
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'bg-error-light text-error shadow-sm ring-4 ring-background',
          )}
        >
          <span className={cm.fv5b245ffa}>phone_missed</span>
        </div>
        <div
          className={cm.cn(
            cm.flex1,
            cm.sp('p', 5),
            'bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,74,198,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,74,198,0.1)] transition-all border border-transparent hover:border-primary/10',
          )}
        >
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 2))}>
            <h4 className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
              {t(
                'activitiesTimelineFeed.demoMissedCallSubject',
                {},
                { defaultValue: 'Missed Inbound: David Miller' },
              )}
            </h4>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-foreground-tertiary uppercase tracking-tighter',
              )}
            >
              {t(
                'activitiesTimelineFeed.demoMissedCallTimestamp',
                {},
                { defaultValue: 'Oct 24, 11:00 AM' },
              )}
            </span>
          </div>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mb', 4),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'activitiesTimelineFeed.demoMissedCallContext',
              {},
              { defaultValue: 'Returned call attempted by ' },
            )}
            <span className={cm.cn(cm.textPrimary, cm.fontWeight('semibold'))}>David Miller</span>
            {t(
              'activitiesTimelineFeed.demoMissedCallAttemptsNote',
              { count: 3 },
              { defaultValue: '. System recorded {{count}} attempts.' },
            )}
          </p>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                'bg-error-light text-error text-[10px] font-black uppercase tracking-widest',
              )}
            >
              {t('activitiesTimelineFeed.missed', {}, { defaultValue: 'Missed' })}
            </span>
          </div>
        </div>
      </div>
      {/* 6-10 Placeholder rows (compact) */}
      <div
        className={cm.cn(
          cm.flex({}),
          'relative z-10 gap-6 group opacity-75 grayscale hover:grayscale-0 transition-all',
        )}
      >
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'bg-blue-100 text-blue-700 shadow-sm ring-4 ring-background',
          )}
        >
          <span className={cm.fv5b245ffa}>mail</span>
        </div>
        <div className={cm.cn(cm.flex1, cm.sp('p', 4), 'bg-surface-container-low rounded-xl')}>
          <div className={cm.flex({ justify: 'between', align: 'center' })}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t(
                'activitiesTimelineFeed.demoEmailBatchSubject',
                {},
                { defaultValue: 'Email Batch Sent to Pipeline' },
              )}
            </span>
            <span className={cm.fvd0ac7e41}>
              {t('activitiesTimelineFeed.demoPlaceholderDate', {}, { defaultValue: 'Oct 23' })}
            </span>
          </div>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          'relative z-10 gap-6 group opacity-75 grayscale hover:grayscale-0 transition-all',
        )}
      >
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'bg-surface-secondary text-foreground shadow-sm ring-4 ring-background',
          )}
        >
          <span className={cm.fv5b245ffa}>edit</span>
        </div>
        <div className={cm.cn(cm.flex1, cm.sp('p', 4), 'bg-surface-container-low rounded-xl')}>
          <div className={cm.flex({ justify: 'between', align: 'center' })}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t(
                'activitiesTimelineFeed.demoDealUpdate',
                {},
                { defaultValue: 'Deal Stage Updated: Nexus Pro' },
              )}
            </span>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-foreground-tertiary uppercase tracking-tighter',
              )}
            >
              {t('activitiesTimelineFeed.demoPlaceholderDate', {}, { defaultValue: 'Oct 23' })}
            </span>
          </div>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          'relative z-10 gap-6 group opacity-75 grayscale hover:grayscale-0 transition-all',
        )}
      >
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'bg-blue-100 text-blue-700 shadow-sm ring-4 ring-background',
          )}
        >
          <span className={cm.fv5b245ffa}>call</span>
        </div>
        <div className={cm.cn(cm.flex1, cm.sp('p', 4), 'bg-surface-container-low rounded-xl')}>
          <div className={cm.flex({ justify: 'between', align: 'center' })}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t(
                'activitiesTimelineFeed.demoFollowUp',
                {},
                { defaultValue: 'Follow-up Call: Jane Doe' },
              )}
            </span>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-foreground-tertiary uppercase tracking-tighter',
              )}
            >
              {t('activitiesTimelineFeed.demoDateOct22', {}, { defaultValue: 'Oct 22' })}
            </span>
          </div>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          'relative z-10 gap-6 group opacity-75 grayscale hover:grayscale-0 transition-all',
        )}
      >
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'bg-purple-100 text-purple-700 shadow-sm ring-4 ring-background',
          )}
        >
          <span className={cm.fv5b245ffa}>calendar_today</span>
        </div>
        <div className={cm.cn(cm.flex1, cm.sp('p', 4), 'bg-surface-container-low rounded-xl')}>
          <div className={cm.flex({ justify: 'between', align: 'center' })}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t(
                'activitiesTimelineFeed.demoWeeklyScrum',
                {},
                { defaultValue: 'Weekly Sales Scrum' },
              )}
            </span>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-foreground-tertiary uppercase tracking-tighter',
              )}
            >
              {t('activitiesTimelineFeed.demoDateOct22', {}, { defaultValue: 'Oct 22' })}
            </span>
          </div>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          'relative z-10 gap-6 group opacity-75 grayscale hover:grayscale-0 transition-all',
        )}
      >
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'bg-surface-secondary text-foreground shadow-sm ring-4 ring-background',
          )}
        >
          <span className={cm.fv5b245ffa}>sticky_note_2</span>
        </div>
        <div className={cm.cn(cm.flex1, cm.sp('p', 4), 'bg-surface-container-low rounded-xl')}>
          <div className={cm.flex({ justify: 'between', align: 'center' })}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t(
                'activitiesTimelineFeed.demoOnboardingNotes',
                {},
                { defaultValue: 'Onboarding Notes: Client #402' },
              )}
            </span>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-foreground-tertiary uppercase tracking-tighter',
              )}
            >
              {t('activitiesTimelineFeed.demoDateOct21', {}, { defaultValue: 'Oct 21' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActivitiesTimelineFeed
export { ActivitiesTimelineFeed }
