import { NavLink } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/** Sub-navigation inside a project — Overview / Daily logs / Punch list / RFIs / Subcontractors. */
export function ProjectNav({ projectId }: { projectId: string }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const base = `/projects/${projectId}`
  const items = [
    { to: base, label: 'Overview', key: 'overview', end: true },
    { to: `${base}/logs`, label: 'Daily logs', key: 'logs', end: false },
    { to: `${base}/punch`, label: 'Punch list', key: 'punch', end: false },
    { to: `${base}/rfis`, label: 'RFIs', key: 'rfis', end: false },
    { to: `${base}/subs`, label: 'Subcontractors', key: 'subs', end: false },
  ] as const
  return (
    <nav
      className={cm.cn(
        cm.flex({ gap: 'xs', align: 'center', wrap: 'wrap' }),
        'border-b border-outline-variant',
      )}
      aria-label={t('project.navLabel', {}, { defaultValue: 'Project sections' })}
    >
      {items.map((item) => (
        <NavLink
          key={item.key}
          to={item.to}
          end={item.end}
          data-mol-id={`project-nav-${item.key}`}
          className={({ isActive }: { isActive: boolean }) =>
            cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'rounded-t-md',
              isActive
                ? 'bg-surface-container text-on-surface border-b-2 border-primary'
                : 'text-on-surface-variant hover:bg-surface-container-low',
            )
          }
        >
          {t(`project.nav.${item.key}`, {}, { defaultValue: item.label })}
        </NavLink>
      ))}
    </nav>
  )
}
