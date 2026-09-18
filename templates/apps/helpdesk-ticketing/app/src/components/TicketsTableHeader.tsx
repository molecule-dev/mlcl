import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function TicketsTableHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [allSelected, setAllSelected] = useState(false)

  return (
    <thead>
      <tr className={cm.cn('bg-surface-container-low border-b-0')}>
        <th className={cm.cn(cm.sp('px', 6), cm.sp('py', 4), cm.w(12))}>
          <input
            className={cm.cn(cm.textPrimary, 'rounded focus:ring-primary-container')}
            type="checkbox"
            aria-label={t(
              'ticketsTableHeader.selectAll',
              {},
              { defaultValue: 'Select all tickets' },
            )}
            checked={allSelected}
            onChange={(e) => setAllSelected(e.target.checked)}
          />
        </th>
        <th
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 4),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('form.priority', {}, { defaultValue: 'Priority' })}
        </th>
        <th
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 4),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('ticketsTableHeader.subject', {}, { defaultValue: 'Subject' })}
        </th>
        <th
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 4),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('ticketsTableHeader.requester', {}, { defaultValue: 'Requester' })}
        </th>
        <th
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 4),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('nav.status', {}, { defaultValue: 'Status' })}
        </th>
        <th
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 4),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('ticketsTableHeader.assignee', {}, { defaultValue: 'Assignee' })}
        </th>
        <th
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 4),
            cm.textRight,
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('ticketsTableHeader.updated', {}, { defaultValue: 'Updated' })}
        </th>
        <th
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 4),
            cm.textRight,
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('ticketsTableHeader.sla', {}, { defaultValue: 'SLA' })}
        </th>
      </tr>
    </thead>
  )
}

export default TicketsTableHeader
export { TicketsTableHeader }
