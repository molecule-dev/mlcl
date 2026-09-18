import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Showing {
  id: string
  property_title: string
  date: string
  time: string
  client_name: string
}

export function AgentDashboardShowingsCard({ showings = [] }: { showings?: Showing[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()

  function formatShowingDate(dateStr: string) {
    if (!dateStr)
      return {
        month: t('showingsCard.invalidMonth', {}, { defaultValue: '---' }),
        day: t('showingsCard.invalidDay', {}, { defaultValue: '--' }),
      }
    const d = new Date(dateStr)
    if (isNaN(d.getTime()))
      return {
        month: t('showingsCard.invalidMonth', {}, { defaultValue: '---' }),
        day: t('showingsCard.invalidDay', {}, { defaultValue: '--' }),
      }
    return {
      month: d.toLocaleString('en', { month: 'short' }).toUpperCase(),
      day: String(d.getDate()),
    }
  }
  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('p', 6),
        'col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-xl shadow-sm border border-border',
      )}
      data-mol-id="showings_card"
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
        <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-success')}>
          {t('showingsCard.title', {}, { defaultValue: 'Upcoming Showings' })}
        </h3>
        <Link
          to="/admin/showings"
          className={cm.cn('text-xs font-semibold text-secondary hover:underline')}
        >
          {t('showingsCard.viewCalendar', {}, { defaultValue: 'View Calendar' })}
        </Link>
      </div>
      <div className={cm.stack(4)} data-mol-id="showings_list">
        {showings.length === 0 ? (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.textCenter,
              cm.sp('py', 6),
              'text-foreground-tertiary',
            )}
          >
            {t('showingsCard.emptyState', {}, { defaultValue: 'No upcoming showings' })}
          </p>
        ) : (
          showings.slice(0, 3).map((showing, i) => {
            const { month, day } = formatShowingDate(showing.date)
            const isFirst = i === 0
            return (
              <button
                type="button"
                key={showing.id}
                onClick={() => navigate('/admin/showings')}
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 'md' }),
                  cm.sp('p', 3),
                  cm.cursorPointer,
                  'w-full text-left rounded-lg hover:bg-surface-secondary transition-colors group',
                )}
              >
                <div
                  className={cm.cn(
                    isFirst
                      ? 'bg-tertiary-fixed text-tertiary'
                      : 'bg-surface-secondary text-foreground-secondary',
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    'rounded-md',
                    cm.flex({ direction: 'col', align: 'center' }),
                    'min-w-[50px]',
                  )}
                >
                  <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'))}>{month}</span>
                  <span className={cm.cn(cm.textSize('lg'), 'font-black leading-tight')}>
                    {day}
                  </span>
                </div>
                <div className={cm.flex1}>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('bold'),
                      'block text-foreground group-hover:text-success transition-colors',
                    )}
                  >
                    {showing.property_title}
                  </span>
                  <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
                    {t(
                      'showingsCard.meta',
                      { time: showing.time, client: showing.client_name },
                      { defaultValue: '{{time}} • {{client}}' },
                    )}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    'material-symbols-outlined text-foreground-tertiary',
                  )}
                >
                  chevron_right
                </span>
              </button>
            )
          })
        )}
      </div>
    </section>
  )
}
export default AgentDashboardShowingsCard
