import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Timeline entry — left gutter date + connector node, content card with
 * provider chip, summary, and category icon. Stack multiple entries
 * for the Visits page.
 *
 * Translated from helpdesk-ticketing's TicketDetail timeline pattern +
 * blog's ArticleListItem editorial card — left gutter date pattern
 * lifted from the catalog §15-style timeline section, recoloured to
 * Meridian's clinical palette per DESIGN.md "Timeline Entry: Left
 * gutter 48px, Connector 2px solid, Node 12px circle".
 */
export type VisitCategory = 'office' | 'urgent_care' | 'emergency' | 'telehealth' | 'lab' | 'other'

export interface VisitTimelineEntryProps {
  /** Visit id — when present, the card links to /visits/:id. */
  id?: string
  /** Display-formatted visit date, e.g. "Mar 18". */
  dateLabel: string
  /** Year, e.g. "2026". */
  yearLabel: string
  category: VisitCategory
  /** Visit type label, e.g. "Annual physical". */
  title: string
  providerName: string
  facilityName?: string
  /** One-sentence summary, e.g. "Routine annual physical, all in range." */
  summary: string
  /** Whether this is the last entry (suppresses connector below). */
  isLast?: boolean
}

const CATEGORY_COLOR: Record<VisitCategory, string> = {
  office: 'var(--color-primary)',
  urgent_care: 'var(--color-clinical-caution)',
  emergency: 'var(--color-clinical-abnormal)',
  telehealth: 'var(--color-secondary)',
  lab: 'var(--color-clinical-confidential)',
  other: 'var(--color-clinical-inactive)',
}

const CATEGORY_ICON: Record<VisitCategory, string> = {
  office: 'medical_services',
  urgent_care: 'emergency',
  emergency: 'local_hospital',
  telehealth: 'video_call',
  lab: 'science',
  other: 'event',
}

export function VisitTimelineEntry({
  id,
  dateLabel,
  yearLabel,
  category,
  title,
  providerName,
  facilityName,
  summary,
  isLast = false,
}: VisitTimelineEntryProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const inner = (
    <div className={cm.cn(cm.flex({ gap: 'md' }), 'relative group')}>
      <div className={cm.cn(cm.shrink0, cm.flex({ direction: 'col', align: 'center' }), 'w-12')}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'tabular-nums uppercase tracking-widest text-on-surface-variant',
          )}
          style={{ fontFamily: 'var(--mol-font-mono)' }}
        >
          {dateLabel}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'tabular-nums text-on-surface-variant/70')}>
          {yearLabel}
        </p>
        <div
          className={cm.cn(cm.sp('mt', 2), cm.w(3), cm.h(3), cm.roundedFull, 'shrink-0 z-10')}
          style={{ backgroundColor: CATEGORY_COLOR[category] }}
          aria-hidden="true"
        />
        {!isLast && (
          <div
            className={cm.cn(
              cm.flex1,
              cm.w(0),
              'border-l-2 border-outline-variant/40 mt-1 min-h-12',
            )}
            aria-hidden="true"
          />
        )}
      </div>

      <article
        className={cm.cn(
          cm.flex1,
          cm.sp('p', 5),
          cm.sp('mb', 4),
          'rounded-xl bg-surface-container-lowest hover:shadow-md transition-all',
        )}
        style={{ borderLeft: `4px solid ${CATEGORY_COLOR[category]}` }}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
            cm.sp('mb', 2),
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              className={cm.cn('material-symbols-outlined text-base')}
              style={{ color: CATEGORY_COLOR[category] }}
              aria-hidden="true"
            >
              {CATEGORY_ICON[category]}
            </span>
            <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>{title}</p>
          </div>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'px-2 py-1 text-[10px] uppercase tracking-widest rounded-full',
            )}
            style={{
              backgroundColor: 'color-mix(in srgb, ' + CATEGORY_COLOR[category] + ' 14%, white)',
              color: CATEGORY_COLOR[category],
            }}
          >
            {t(
              `visitTimelineEntry.category.${category}`,
              {},
              { defaultValue: category.replace('_', ' ') },
            )}
          </span>
        </div>

        <p
          className={cm.cn(
            cm.textSize('xs'),
            'text-on-surface-variant uppercase tracking-wider',
            cm.sp('mb', 2),
          )}
        >
          {facilityName
            ? t(
                'visitTimelineEntry.providerWithFacility',
                { provider: providerName, facility: facilityName },
                { defaultValue: '{{provider}} · {{facility}}' },
              )
            : providerName}
        </p>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>{summary}</p>
      </article>
    </div>
  )

  return id ? (
    <Link to={`/visits/${id}`} className={cm.cn('block')}>
      {inner}
    </Link>
  ) : (
    inner
  )
}

export default VisitTimelineEntry
