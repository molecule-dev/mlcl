import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AssignmentsPageHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }))}>
      <div>
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.sp('mb', 2))}>
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-on-surface-variant/60 uppercase tracking-widest hover:underline',
            )}
          >
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </Link>
          <span className={cm.cn(cm.textPrimary, 'text-[10px] opacity-50')}>•</span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.textPrimary,
              'uppercase tracking-widest',
            )}
          >
            {t('assignmentsPageHeader.breadcrumbCurrent', {}, { defaultValue: 'Assignments' })}
          </span>
        </nav>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('assignmentsPageHeader.title', {}, { defaultValue: 'Your Assignments' })}
        </h1>
      </div>
    </div>
  )
}

export default AssignmentsPageHeader
export { AssignmentsPageHeader }
