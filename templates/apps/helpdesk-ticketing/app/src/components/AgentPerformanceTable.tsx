import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface AgentRow {
  id: string
  name: string
  tickets_resolved: number
  avg_time: string
  rating: number
}

function AgentPerformanceTable({
  agents = [],
  loading: _loading = false,
}: {
  agents?: AgentRow[]
  loading?: boolean
}) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const cm = getClassMap()
  const filtered = agents.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className={cm.cn('bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden')}>
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('px', 8),
          cm.sp('py', 6),
          'bg-surface-container-low/30',
        )}
      >
        <h3
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('agentPerformanceTable.title', {}, { defaultValue: 'Agent Performance' })}
        </h3>
        <div className={cm.cn('relative')}>
          <input
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('pl', 8),
              cm.sp('pr', 4),
              'bg-surface-container-lowest border-0 ring-1 ring-outline-variant/20 rounded-md py-1.5 focus:ring-primary transition-all',
            )}
            placeholder={t(
              'agentPerformanceTable.searchPlaceholder',
              {},
              { defaultValue: 'Search agents...' },
            )}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span
            className={cm.cn(
              cm.textSize('sm'),
              'material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant',
            )}
          >
            search
          </span>
        </div>
      </div>
      <div className={cm.cn('overflow-x-auto')}>
        <table className={cm.cn(cm.w('full'), 'text-left border-collapse')}>
          <thead>
            <tr
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant/70 border-b border-outline-variant/10',
              )}
            >
              <th className={cm.cn(cm.sp('px', 8), cm.sp('py', 4))}>
                {t('form.name', {}, { defaultValue: 'Name' })}
              </th>
              <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 4))}>
                {t(
                  'agentPerformanceTable.columnTicketsResolved',
                  {},
                  { defaultValue: 'Tickets Resolved' },
                )}
              </th>
              <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 4))}>
                {t('agentPerformanceTable.columnAvgTime', {}, { defaultValue: 'Avg Time' })}
              </th>
              <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 4))}>
                {t(
                  'agentPerformanceTable.columnSatisfactionRating',
                  {},
                  { defaultValue: 'Satisfaction Rating' },
                )}
              </th>
            </tr>
          </thead>
          <tbody className={cm.textSize('sm')}>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 10),
                    cm.textCenter,
                    cm.textSize('sm'),
                    'text-on-surface-variant',
                  )}
                >
                  {t(
                    'agentPerformanceTable.empty',
                    {},
                    { defaultValue: 'No agents match your search.' },
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((agent, idx) => {
                const ini = agent.name
                  .split(' ')
                  .map((p: string) => p[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
                const cc = [
                  'bg-primary-container/20 text-primary',
                  'bg-secondary-container/20 text-secondary',
                  'bg-tertiary-container/20 text-tertiary',
                  'bg-error-container/20 text-error',
                ][idx % 4]
                const stars = Math.round(agent.rating * 2) / 2
                return (
                  <tr
                    key={agent.id}
                    className={cm.cn('hover:bg-surface-container-low/30 transition-colors')}
                  >
                    <td
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 3 }),
                        cm.sp('px', 8),
                        cm.sp('py', 5),
                      )}
                    >
                      <div
                        className={cm.cn(
                          cm.w(8),
                          cm.h(8),
                          cm.roundedFull,
                          cm.flex({ align: 'center', justify: 'center' }),
                          cm.fontWeight('bold'),
                          cm.textSize('xs'),
                          cc,
                        )}
                      >
                        {ini}
                      </div>
                      <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                        {agent.name}
                      </span>
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 5), cm.fontWeight('medium'))}>
                      {agent.tickets_resolved}
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 5), cm.fontWeight('medium'))}>
                      {agent.avg_time}
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 5))}>
                      <div className={cm.cn(cm.flex(), 'text-warning gap-0.5')}>
                        {Array.from({ length: 5 }).map((_, si: number) => (
                          <span
                            key={si}
                            className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}
                            style={{
                              fontVariationSettings:
                                si < Math.floor(stars) ||
                                (si === Math.floor(stars) && stars % 1 >= 0.5)
                                  ? "'FILL' 1"
                                  : 'normal',
                            }}
                          >
                            {si < Math.floor(stars)
                              ? 'star'
                              : si === Math.floor(stars) && stars % 1 >= 0.5
                                ? 'star_half'
                                : 'star_outline'}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AgentPerformanceTable
export { AgentPerformanceTable }
