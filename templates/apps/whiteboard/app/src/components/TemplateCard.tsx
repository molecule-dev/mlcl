import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Template gallery card — categorical eyebrow, illustrated frame preview,
 * usage count, and a "Use template" gradient CTA on hover. Uses a per-card
 * accent strip (left border) sourced from the cursor-remote palette so the
 * gallery feels editorial.
 *
 * Translated from blog/ArticleListItem.tsx + crm/StatsRow.tsx — kept the
 * border-l-4 accent + uppercase 10px tracking-widest label treatment from the
 * KPI / category recipe in the polished pattern catalog.
 */
export interface TemplateCardProps {
  template: {
    id: string
    title: string
    description: string
    /** Category eyebrow ("Workshop", "Brainstorm", "Retro", …). */
    category: string
    /** Cursor-remote palette accent (DESIGN.md). */
    accentColor: string
    iconName: string
    usageCount: number
  }
}

export function TemplateCard({ template }: TemplateCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <Link
      to={`/templates/${template.id}`}
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('p', 6),
        'group bg-surface-container-lowest rounded-xl shadow-sm border-l-4 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 relative overflow-hidden',
      )}
      style={{ borderLeftColor: template.accentColor }}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(12),
          cm.h(12),
          cm.roundedFull,
          cm.sp('mb', 4),
          'text-white shadow-md',
        )}
        style={{ backgroundColor: template.accentColor }}
      >
        <span
          className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {template.iconName}
        </span>
      </div>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.sp('mb', 2),
          'text-[10px] uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {template.category}
      </span>
      <h3
        className={cm.cn(
          cm.textSize('lg'),
          cm.fontWeight('bold'),
          cm.sp('mb', 2),
          'text-on-surface tracking-tight',
        )}
      >
        {template.title}
      </h3>
      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          cm.flex1,
          'text-on-surface-variant leading-relaxed',
        )}
      >
        {template.description}
      </p>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('mt', 5),
          cm.sp('pt', 4),
          'border-t border-outline-variant/40',
        )}
      >
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            'text-on-surface-variant',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[14px]')}>group_work</span>
          {t(
            'templateCard.usageCount',
            { count: template.usageCount.toLocaleString() },
            { defaultValue: '{{count}} uses' },
          )}
        </span>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'text-primary group-hover:gap-2 transition-all',
          )}
        >
          {t('common.usename', {}, { defaultValue: 'Use template' })}
          <span className={cm.cn('material-symbols-outlined text-[14px]')}>arrow_forward</span>
        </span>
      </div>
    </Link>
  )
}

export default TemplateCard
