import React from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface BreadcrumbCrumb {
  label: string
  to?: string
}

interface BreadcrumbProps {
  crumbs?: BreadcrumbCrumb[]
}

function categoryToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+&\s+/g, '-')
    .replace(/\s+/g, '-')
}

export default function Breadcrumb({ crumbs }: BreadcrumbProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const items: BreadcrumbCrumb[] =
    crumbs && crumbs.length > 0
      ? crumbs
      : [{ label: t('common.home', {}, { defaultValue: 'Home' }), to: '/' }]
  return (
    <nav
      aria-label={t('breadcrumb.navLabel', {}, { defaultValue: 'Breadcrumb' })}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 2 }),
        cm.textSize('sm'),
        cm.sp('mb', 8),
        'text-foreground-secondary',
      )}
    >
      {items.map((crumb, idx) => {
        const isLast = idx === items.length - 1
        return (
          <React.Fragment key={`${crumb.label}-${idx}`}>
            {crumb.to && !isLast ? (
              <Link className={cm.cn('hover:text-success')} to={crumb.to}>
                {crumb.label}
              </Link>
            ) : (
              <span
                className={cm.cn(
                  isLast ? cm.fontWeight('medium') : '',
                  isLast ? 'text-foreground' : '',
                )}
              >
                {crumb.label}
              </span>
            )}
            {!isLast && (
              <span className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}>
                chevron_right
              </span>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

export { Breadcrumb, categoryToSlug }
