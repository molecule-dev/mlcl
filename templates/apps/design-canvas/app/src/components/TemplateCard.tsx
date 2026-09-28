import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Template gallery card — categorical eyebrow, illustrated frame preview,
 * usage count, and a "Use template" gradient CTA on hover. Uses a per-card
 * accent strip (left border) sourced from the cursor palette so the gallery
 * feels editorial.
 *
 * Translated from whiteboard's TemplateCard.tsx + crm's StatsRow accent-bar
 * accent — kept the uppercase 10px tracking-widest label treatment from
 * catalog §2.3 KPI / category recipe.
 */
export interface TemplateCardProps {
  template: {
    id: string
    title: string
    description: string
    /** Category eyebrow ("UI Mockup", "Branding", "Illustration", …). */
    category: string
    /** Cursor palette accent (DESIGN.md). */
    accentColor: string
    iconName: string
    usageCount: number
  }
  /**
   * Invoked when the card is activated — forks the template into a new
   * project via POST /api/templates/:id/use (same flow as the overlay
   * "Use template" button).
   */
  onUse?: () => void
}

export function TemplateCard({ template, onUse }: TemplateCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onUse}
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('p', 6),
        'group text-left w-full bg-surface-container-lowest rounded-xl shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 overflow-hidden',
        cm.accentCard({ tone: 'custom' }),
      )}
      style={{ ['--mol-accent' as string]: template.accentColor }}
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
          'text-[10px] uppercase tracking-widest',
          cm.accentCardLabel({ tone: 'custom' }),
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
    </button>
  )
}

export default TemplateCard
