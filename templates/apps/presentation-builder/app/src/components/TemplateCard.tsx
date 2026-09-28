import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Template gallery card — categorical eyebrow, illustrated 16:9 stage
 * preview, slide count, and a "Use template" CTA on hover. Per-card accent
 * bar sourced from the cursor palette so the gallery feels editorial.
 *
 * Translated from design-canvas's TemplateCard.tsx — same border-l-4 accent
 * + uppercase 10px tracking-widest label treatment from catalog §2.3 KPI
 * recipe, retuned for slide-deck thumbnails.
 */
export interface TemplateCardProps {
  template: {
    id: string
    title: string
    description: string
    /** Category eyebrow ("Pitch Deck", "Investor Update", "Webinar", …). */
    category: string
    /** Cursor palette accent (DESIGN.md). */
    accentColor: string
    iconName: string
    slideCount: number
    /** How many users have used this template. */
    usageCount: number
  }
}

export function TemplateCard({ template }: TemplateCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <Link
      to={`/decks?template=${template.id}`}
      data-testid={`template-card-${template.id}`}
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'group bg-surface-container-lowest rounded-xl shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 relative overflow-hidden',
      )}
    >
      <div
        className={cm.cn('relative overflow-hidden')}
        style={{ aspectRatio: '16 / 9', backgroundColor: 'var(--color-slide-canvas)' }}
      >
        <svg
          viewBox="0 0 320 180"
          preserveAspectRatio="xMidYMid meet"
          className={cm.cn(cm.w('full'), cm.h('full'))}
        >
          <defs>
            <pattern
              id={`tc-grid-${template.id}`}
              x="0"
              y="0"
              width="14"
              height="14"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1.5" cy="1.5" r="0.8" fill="rgba(255,255,255,0.08)" />
            </pattern>
          </defs>
          <rect width="320" height="180" style={{ fill: 'var(--color-slide-canvas)' }} />
          <rect width="320" height="180" fill={`url(#tc-grid-${template.id})`} />
          {/* big title */}
          <rect x="40" y="56" width="220" height="18" rx="4" fill={template.accentColor} />
          <rect x="40" y="84" width="160" height="6" rx="2" fill="#ffffff" fillOpacity="0.55" />
          <rect x="40" y="96" width="100" height="6" rx="2" fill="#ffffff" fillOpacity="0.4" />
          {/* CTA pill */}
          <rect
            x="40"
            y="124"
            width="84"
            height="20"
            rx="10"
            fill={template.accentColor}
            fillOpacity="0.8"
          />
          <rect x="48" y="132" width="68" height="4" rx="2" fill="#ffffff" />
          {/* big circle decorator */}
          <circle cx="270" cy="120" r="36" fill={template.accentColor} fillOpacity="0.18" />
          <circle cx="270" cy="120" r="22" fill={template.accentColor} fillOpacity="0.4" />
          <circle cx="270" cy="120" r="10" fill={template.accentColor} />
        </svg>
      </div>
      {/* The accent bar runs beside the text, not the preview image. */}
      <div
        className={cm.cn(cm.sp('p', 6), cm.stack(3), cm.flex1, cm.accentCard({ tone: 'custom' }))}
        style={{ ['--mol-accent' as string]: template.accentColor }}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              'text-white shadow-md',
            )}
            style={{ backgroundColor: template.accentColor }}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[16px]')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {template.iconName}
            </span>
          </span>
          <span className={cm.accentCardLabel({ tone: 'custom' })}>{template.category}</span>
        </div>
        <h3
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
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
            cm.sp('mt', 2),
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
            <span className={cm.cn('material-symbols-outlined text-[14px]')}>filter_none</span>
            {t(
              'templateCard.slideCount',
              { count: template.slideCount },
              { defaultValue: '{{count}} slides' },
            )}
            <span
              className={cm.cn(cm.sp('mx', 2), 'h-1 w-1 rounded-full bg-on-surface-variant/40')}
            ></span>
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
      </div>
    </Link>
  )
}

export default TemplateCard
