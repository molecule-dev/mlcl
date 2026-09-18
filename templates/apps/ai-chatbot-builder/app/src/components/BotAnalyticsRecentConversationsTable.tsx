import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function BotAnalyticsRecentConversationsTable() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [filterOpen, setFilterOpen] = useState(false)
  return (
    <>
      {' '}
      {/* Bottom Section: Recent Conversations Table */}
      <div
        className={cm.cn(
          'glass-card rounded-[2rem] border border-surface shadow-sm overflow-hidden',
        )}
        data-mol-id="recent-conversations"
      >
        <div
          className={cm.cn(
            cm.sp('p', 8),
            cm.flex({ justify: 'between', align: 'center' }),
            'border-b border-surface-container-high',
          )}
        >
          <h4 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t(
              'botAnalyticsRecentConversationsTable.sectionTitle',
              {},
              { defaultValue: 'Recent Conversations' },
            )}
          </h4>
          <button
            type="button"
            aria-expanded={filterOpen}
            className={cm.cn(
              cm.sp('p', 2),
              'bg-surface-container-high hover:bg-surface-variant rounded-xl transition-colors',
            )}
            onClick={() => setFilterOpen((o) => !o)}
            aria-label={t(
              'botAnalyticsRecentConversationsTable.filterAriaLabel',
              {},
              { defaultValue: 'Filter conversations' },
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-on-surface-variant')}>
              filter_list
            </span>
          </button>
        </div>
        <div className={cm.cn('overflow-x-auto')}>
          <table className={cm.cn(cm.w('full'), 'text-left')}>
            <thead>
              <tr className={cm.cn('bg-surface-container-low/50')}>
                <th
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'text-outline uppercase tracking-wider',
                  )}
                >
                  {t(
                    'botAnalyticsRecentConversationsTable.columnUser',
                    {},
                    { defaultValue: 'User' },
                  )}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'text-outline uppercase tracking-wider',
                  )}
                >
                  {t(
                    'botAnalyticsRecentConversationsTable.columnIntent',
                    {},
                    { defaultValue: 'Intent' },
                  )}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'text-outline uppercase tracking-wider',
                  )}
                >
                  {t(
                    'botAnalyticsRecentConversationsTable.columnResolution',
                    {},
                    { defaultValue: 'Resolution' },
                  )}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'text-outline uppercase tracking-wider',
                  )}
                >
                  {t('form.duration', {}, { defaultValue: 'Duration' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'text-outline uppercase tracking-wider',
                  )}
                >
                  {t(
                    'botAnalyticsRecentConversationsTable.columnSatisfaction',
                    {},
                    { defaultValue: 'Satisfaction' },
                  )}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-surface-container-high')}>
              {/* Row 1 */}
              <tr className={cm.cn('hover:bg-surface-container-low transition-colors group')}>
                <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                  <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
                    <img
                      alt={t(
                        'botAnalyticsRecentConversationsTable.userAvatarAlt',
                        {},
                        { defaultValue: 'User Avatar' },
                      )}
                      className={cm.cn(cm.w(8), cm.h(8), cm.roundedFull, 'object-cover')}
                      data-alt="Close up of a friendly looking young man with glasses and a stylish haircut in bright daylight"
                      src="https://picsum.photos/seed/BotAnalyticsRecentConversationsTable-1/1200/800"
                    />
                    <span
                      className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                    >
                      Jordan Smith
                    </span>
                  </div>
                </td>
                <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'text-on-surface-variant',
                    )}
                  >
                    Billing Inquiry
                  </span>
                </td>
                <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.roundedFull,
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'inline-flex items-center bg-success-light text-success',
                    )}
                  >
                    {t('status.resolved', {}, { defaultValue: 'Resolved' })}
                  </span>
                </td>
                <td
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 5),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-outline',
                  )}
                >
                  4m 12s
                </td>
                <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                  <div className={cm.cn(cm.flex(), 'gap-0.5 text-tertiary')}>
                    <span
                      className={cm.cn('material-symbols-outlined text-[18px]')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span
                      className={cm.cn('material-symbols-outlined text-[18px]')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span
                      className={cm.cn('material-symbols-outlined text-[18px]')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span
                      className={cm.cn('material-symbols-outlined text-[18px]')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span
                      className={cm.cn('material-symbols-outlined text-[18px]')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  </div>
                </td>
              </tr>
              {/* Row 2 */}
              <tr className={cm.cn('hover:bg-surface-container-low transition-colors')}>
                <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                  <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
                    <img
                      alt={t(
                        'botAnalyticsRecentConversationsTable.userAvatarAlt',
                        {},
                        { defaultValue: 'User Avatar' },
                      )}
                      className={cm.cn(cm.w(8), cm.h(8), cm.roundedFull, 'object-cover')}
                      data-alt="Professional woman with a confident smile, wearing a cream blazer, outdoor urban setting with soft depth of field"
                      src="https://picsum.photos/seed/BotAnalyticsRecentConversationsTable-2/1200/800"
                    />
                    <span
                      className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                    >
                      Sarah Connor
                    </span>
                  </div>
                </td>
                <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'text-on-surface-variant',
                    )}
                  >
                    Password Reset
                  </span>
                </td>
                <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.roundedFull,
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'inline-flex items-center bg-success-light text-success',
                    )}
                  >
                    {t('status.resolved', {}, { defaultValue: 'Resolved' })}
                  </span>
                </td>
                <td
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 5),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-outline',
                  )}
                >
                  1m 45s
                </td>
                <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                  <div className={cm.cn(cm.flex(), 'gap-0.5 text-tertiary')}>
                    <span
                      className={cm.cn('material-symbols-outlined text-[18px]')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span
                      className={cm.cn('material-symbols-outlined text-[18px]')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span
                      className={cm.cn('material-symbols-outlined text-[18px]')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span
                      className={cm.cn('material-symbols-outlined text-[18px]')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span className={cm.cn('material-symbols-outlined text-[18px]')}>star</span>
                  </div>
                </td>
              </tr>
              {/* Row 3 */}
              <tr className={cm.cn('hover:bg-surface-container-low transition-colors')}>
                <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                  <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
                    <div
                      className={cm.cn(
                        cm.w(8),
                        cm.h(8),
                        cm.roundedFull,
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.fontWeight('bold'),
                        cm.textSize('xs'),
                        'bg-secondary-fixed text-secondary',
                      )}
                    >
                      MB
                    </div>
                    <span
                      className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                    >
                      Marcus Brown
                    </span>
                  </div>
                </td>
                <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'text-on-surface-variant',
                    )}
                  >
                    API Connection
                  </span>
                </td>
                <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.roundedFull,
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'inline-flex items-center bg-blue-100 text-blue-700',
                    )}
                  >
                    {t(
                      'botAnalyticsRecentConversationsTable.statusInProgress',
                      {},
                      { defaultValue: 'In Progress' },
                    )}
                  </span>
                </td>
                <td
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 5),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-outline',
                  )}
                >
                  12m 08s
                </td>
                <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-outline')}>
                    {t('status.pending', {}, { defaultValue: 'Pending' })}
                  </span>
                </td>
              </tr>
              {/* Row 4 */}
              <tr className={cm.cn('hover:bg-surface-container-low transition-colors')}>
                <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                  <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
                    <img
                      alt={t(
                        'botAnalyticsRecentConversationsTable.userAvatarAlt',
                        {},
                        { defaultValue: 'User Avatar' },
                      )}
                      className={cm.cn(cm.w(8), cm.h(8), cm.roundedFull, 'object-cover')}
                      data-alt="Portrait of a young man with a casual style, laughing, vibrant city background with warm afternoon sunlight"
                      src="https://picsum.photos/seed/BotAnalyticsRecentConversationsTable-3/1200/800"
                    />
                    <span
                      className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                    >
                      Leo Valdez
                    </span>
                  </div>
                </td>
                <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'text-on-surface-variant',
                    )}
                  >
                    Refund Request
                  </span>
                </td>
                <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.roundedFull,
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'inline-flex items-center bg-error-container text-error',
                    )}
                  >
                    {t(
                      'botAnalyticsRecentConversationsTable.statusEscalated',
                      {},
                      { defaultValue: 'Escalated' },
                    )}
                  </span>
                </td>
                <td
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 5),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-outline',
                  )}
                >
                  8m 33s
                </td>
                <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                  <div className={cm.cn(cm.flex(), 'gap-0.5 text-tertiary')}>
                    <span
                      className={cm.cn('material-symbols-outlined text-[18px]')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span
                      className={cm.cn('material-symbols-outlined text-[18px]')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span
                      className={cm.cn('material-symbols-outlined text-[18px]')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span className={cm.cn('material-symbols-outlined text-[18px]')}>star</span>
                    <span className={cm.cn('material-symbols-outlined text-[18px]')}>star</span>
                  </div>
                </td>
              </tr>
              {/* Row 5 */}
              <tr className={cm.cn('hover:bg-surface-container-low transition-colors')}>
                <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                  <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
                    <img
                      alt={t(
                        'botAnalyticsRecentConversationsTable.userAvatarAlt',
                        {},
                        { defaultValue: 'User Avatar' },
                      )}
                      className={cm.cn(cm.w(8), cm.h(8), cm.roundedFull, 'object-cover')}
                      data-alt="Thoughtful looking woman with red hair in a bright minimalist office, high key lighting, very clean professional look"
                      src="https://picsum.photos/seed/BotAnalyticsRecentConversationsTable-4/1200/800"
                    />
                    <span
                      className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                    >
                      Emily Blunt
                    </span>
                  </div>
                </td>
                <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'text-on-surface-variant',
                    )}
                  >
                    Plan Upgrade
                  </span>
                </td>
                <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.roundedFull,
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'inline-flex items-center bg-success-light text-success',
                    )}
                  >
                    {t('status.resolved', {}, { defaultValue: 'Resolved' })}
                  </span>
                </td>
                <td
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 5),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-outline',
                  )}
                >
                  3m 15s
                </td>
                <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                  <div className={cm.cn(cm.flex(), 'gap-0.5 text-tertiary')}>
                    <span
                      className={cm.cn('material-symbols-outlined text-[18px]')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span
                      className={cm.cn('material-symbols-outlined text-[18px]')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span
                      className={cm.cn('material-symbols-outlined text-[18px]')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span
                      className={cm.cn('material-symbols-outlined text-[18px]')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span
                      className={cm.cn('material-symbols-outlined text-[18px]')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
export { BotAnalyticsRecentConversationsTable }
