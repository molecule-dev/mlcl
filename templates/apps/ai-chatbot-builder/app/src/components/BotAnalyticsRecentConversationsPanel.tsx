import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function BotAnalyticsRecentConversationsPanel() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [filterOpen, setFilterOpen] = useState(false)
  const navigate = useNavigate()
  return (
    <div
      className={cm.cn('glass-card rounded-[2rem] border border-surface shadow-sm overflow-hidden')}
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
            'botAnalyticsRecentConversationsPanel.title',
            {},
            { defaultValue: 'Recent Conversations' },
          )}
        </h4>
        <button
          className={cm.cn(
            cm.sp('p', 2),
            'bg-surface-container-high hover:bg-surface-variant rounded-xl transition-colors',
          )}
          onClick={() => setFilterOpen((o) => !o)}
          aria-pressed={filterOpen}
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
                {t('botAnalyticsRecentConversationsPanel.columnUser', {}, { defaultValue: 'User' })}
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
                  'botAnalyticsRecentConversationsPanel.columnIntent',
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
                  'botAnalyticsRecentConversationsPanel.columnResolution',
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
                  'botAnalyticsRecentConversationsPanel.columnSatisfaction',
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
                    alt={t('common.userAvatarAlt', {}, { defaultValue: 'User Avatar' })}
                    className={cm.cn(cm.w(8), cm.h(8), cm.roundedFull, 'object-cover')}
                    data-alt="Close up of a friendly looking young man with glasses and a stylish haircut in bright daylight"
                    src="https://picsum.photos/seed/BotAnalyticsRecentConversationsPanel-1/1200/800"
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
                  {t(
                    'botAnalyticsRecentConversationsPanel.intentBillingInquiry',
                    {},
                    { defaultValue: 'Billing Inquiry' },
                  )}
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
                {t(
                  'botAnalyticsRecentConversationsPanel.duration',
                  { minutes: 4, seconds: 12 },
                  { defaultValue: '{{minutes}}m {{seconds}}s' },
                )}
              </td>
              <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                <div className={cm.cn(cm.flex({}), 'gap-0.5 text-tertiary')}>
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
                    alt={t('common.userAvatarAlt', {}, { defaultValue: 'User Avatar' })}
                    className={cm.cn(cm.w(8), cm.h(8), cm.roundedFull, 'object-cover')}
                    data-alt="Professional woman with a confident smile, wearing a cream blazer, outdoor urban setting with soft depth of field"
                    src="https://picsum.photos/seed/BotAnalyticsRecentConversationsPanel-2/1200/800"
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
                  {t(
                    'botAnalyticsRecentConversationsPanel.intentPasswordReset',
                    {},
                    { defaultValue: 'Password Reset' },
                  )}
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
                {t(
                  'botAnalyticsRecentConversationsPanel.duration',
                  { minutes: 1, seconds: 45 },
                  { defaultValue: '{{minutes}}m {{seconds}}s' },
                )}
              </td>
              <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                <div className={cm.cn(cm.flex({}), 'gap-0.5 text-tertiary')}>
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
                  {t(
                    'botAnalyticsRecentConversationsPanel.intentApiConnection',
                    {},
                    { defaultValue: 'API Connection' },
                  )}
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
                  {t('common.inProgress', {}, { defaultValue: 'In Progress' })}
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
                {t(
                  'botAnalyticsRecentConversationsPanel.duration',
                  { minutes: 12, seconds: 8 },
                  { defaultValue: '{{minutes}}m {{seconds}}s' },
                )}
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
                    alt={t('common.userAvatarAlt', {}, { defaultValue: 'User Avatar' })}
                    className={cm.cn(cm.w(8), cm.h(8), cm.roundedFull, 'object-cover')}
                    data-alt="Portrait of a young man with a casual style, laughing, vibrant city background with warm afternoon sunlight"
                    src="https://picsum.photos/seed/BotAnalyticsRecentConversationsPanel-3/1200/800"
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
                  {t(
                    'botAnalyticsRecentConversationsPanel.intentRefundRequest',
                    {},
                    { defaultValue: 'Refund Request' },
                  )}
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
                  {t('common.escalated', {}, { defaultValue: 'Escalated' })}
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
                {t(
                  'botAnalyticsRecentConversationsPanel.duration',
                  { minutes: 8, seconds: 33 },
                  { defaultValue: '{{minutes}}m {{seconds}}s' },
                )}
              </td>
              <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                <div className={cm.cn(cm.flex({}), 'gap-0.5 text-tertiary')}>
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
              <td className={cm.cn('px-8 py-5')}>
                <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
                  <img
                    alt={t('common.userAvatarAlt', {}, { defaultValue: 'User Avatar' })}
                    className={cm.cn(cm.w(8), cm.h(8), cm.roundedFull, 'object-cover')}
                    data-alt="Thoughtful looking woman with red hair in a bright minimalist office, high key lighting, very clean professional look"
                    src="https://picsum.photos/seed/BotAnalyticsRecentConversationsPanel-4/1200/800"
                  />
                  <span
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                  >
                    Emily Blunt
                  </span>
                </div>
              </td>
              <td className={cm.cn('px-8 py-5')}>
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-on-surface-variant',
                  )}
                >
                  {t(
                    'botAnalyticsRecentConversationsPanel.intentPlanUpgrade',
                    {},
                    { defaultValue: 'Plan Upgrade' },
                  )}
                </span>
              </td>
              <td className={cm.cn('px-8 py-5')}>
                <span
                  className={cm.cn(
                    'inline-flex items-center px-3 py-1 rounded-full bg-success-light text-success text-xs font-bold',
                  )}
                >
                  {t('status.resolved', {}, { defaultValue: 'Resolved' })}
                </span>
              </td>
              <td className={cm.cn('px-8 py-5 text-sm font-medium text-outline')}>
                {t(
                  'botAnalyticsRecentConversationsPanel.duration',
                  { minutes: 3, seconds: 15 },
                  { defaultValue: '{{minutes}}m {{seconds}}s' },
                )}
              </td>
              <td className={cm.cn('px-8 py-5')}>
                <div className={cm.cn('flex gap-0.5 text-tertiary')}>
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
      <div
        className={cm.cn(
          'p-4 bg-surface-container-low/30 border-t border-surface-container-high flex justify-center',
        )}
      >
        <button
          className={cm.cn('text-sm font-bold text-primary hover:underline')}
          onClick={() => navigate('/conversations')}
        >
          {t(
            'botAnalyticsRecentConversationsPanel.viewAll',
            {},
            { defaultValue: 'View All Conversations' },
          )}
        </button>
      </div>
    </div>
  )
}

export default BotAnalyticsRecentConversationsPanel
export { BotAnalyticsRecentConversationsPanel }
