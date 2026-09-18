/**
 * Editorial list row for the Surveys index — title + meta line, status
 * pill, response/NPS counts, hover lift. Designed to stack vertically
 * on the Surveys page and on SurveyDetail's "related surveys" list.
 *
 * Translated from blog/ArticleListItem + crm/ActivityRow editorial
 * patterns, palette aligned with DESIGN.md "Response Table" + "Question
 * Block" radii.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { StatusVariant } from './StatusPill.js'
import { StatusPill } from './StatusPill.js'

export interface SurveyListItemData {
  id: string
  title: string
  /** One-line description shown under the title. */
  description?: string
  /** "Updated 2h ago" / "Created Jan 12". */
  meta: string
  status: StatusVariant
  /** Total responses captured. */
  responses: number
  /** Optional NPS score (-100..100). */
  nps?: number
  /** Optional completion rate as a 0-100 number. */
  completionRate?: number
}

interface SurveyListItemProps extends SurveyListItemData {
  active?: boolean
}

function SurveyListItem({
  id,
  title,
  description,
  meta,
  status,
  responses,
  nps,
  completionRate,
  active = false,
}: SurveyListItemProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Link
      to={`/surveys/${id}`}
      aria-current={active ? 'page' : undefined}
      className={cm.cn(
        cm.flex({ align: 'start', justify: 'between', gap: 4 }),
        cm.sp('p', 5),
        'rounded-xl bg-surface border border-[color:var(--color-border)] hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 shadow-sm',
        active && 'border-primary',
      )}
    >
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }), cm.flex1, 'min-w-0')}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
          <StatusPill variant={status} />
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {meta}
          </span>
        </div>
        <h3 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
          {title}
        </h3>
        {description && (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-2xl')}>
            {description}
          </p>
        )}
      </div>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'end', gap: 2 }),
          'shrink-0 text-right',
        )}
      >
        <div className={cm.cn(cm.flex({ direction: 'col' }))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('surveyListItem.responses', {}, { defaultValue: 'Responses' })}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xl'),
              'font-extrabold tracking-tight text-on-surface tabular-nums',
            )}
          >
            {responses.toLocaleString()}
          </span>
        </div>
        {nps !== undefined && (
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'text-on-surface-variant',
            )}
          >
            {t('surveyListItem.nps', { nps }, { defaultValue: 'NPS {{nps}}' })}
          </span>
        )}
        {completionRate !== undefined && (
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'text-on-surface-variant',
            )}
          >
            {t(
              'surveyListItem.completion',
              { rate: completionRate },
              { defaultValue: '{{rate}}% complete' },
            )}
          </span>
        )}
      </div>
    </Link>
  )
}

export default SurveyListItem
export { SurveyListItem }
