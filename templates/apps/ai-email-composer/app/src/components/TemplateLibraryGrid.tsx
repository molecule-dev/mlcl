import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type TemplateCategory =
  'sales' | 'recruiting' | 'executive' | 'follow_up' | 'apology' | 'announcement'

export interface EmailTemplate {
  id: string
  name: string
  category: TemplateCategory
  preview: string
  /** How many times the user has sent this template. */
  usage_count: number
  /** Optional accent gradient stop — defaults to primary. */
  accent?: 'primary' | 'secondary' | 'tertiary'
}

interface TemplateLibraryGridProps {
  templates: ReadonlyArray<EmailTemplate>
  /** Optional handler when a template card is activated. */
  onSelect?: (template: EmailTemplate) => void
}

const CATEGORY_ICON: Record<TemplateCategory, string> = {
  sales: 'handshake',
  recruiting: 'group_add',
  executive: 'record_voice_over',
  follow_up: 'reply',
  apology: 'sentiment_calm',
  announcement: 'campaign',
}

/** The card's accent bar color, read by `cm.accentCard({ tone: 'custom' })`. */
const ACCENT_VAR = {
  primary: 'var(--color-primary)',
  secondary: 'var(--color-secondary)',
  tertiary: 'var(--color-tertiary)',
}

const ACCENT_TINT = {
  primary: 'text-primary',
  secondary: 'text-secondary-dark',
  tertiary: 'text-tertiary',
}

const ACCENT_ORB = {
  primary: 'bg-primary/8 group-hover:bg-primary/15',
  secondary: 'bg-secondary/10 group-hover:bg-secondary/20',
  tertiary: 'bg-tertiary/8 group-hover:bg-tertiary/15',
}

/**
 * Bento-grid template library — each card is a tinted surface with a
 * decorative blurred orb, large category icon, name + 2-line preview,
 * and a usage-count caption. Hover reveals the "Use" arrow CTA.
 *
 * Translated from personal-finance's GoalCard and ai-chatbot-builder's
 * BotCard pattern; tuned for Signet's email template metadata.
 */
export function TemplateLibraryGrid({ templates, onSelect }: TemplateLibraryGridProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (templates.length === 0) {
    return (
      <div
        className={cm.cn(
          cm.sp('p', 8),
          cm.textCenter,
          'rounded-2xl border-2 border-dashed border-outline-variant/60 text-on-surface-variant',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-3xl block mb-2')} aria-hidden="true">
          dashboard_customize
        </span>
        <p className={cm.textSize('sm')}>
          {t(
            'templateLibraryGrid.empty',
            {},
            { defaultValue: 'No templates yet — save a draft to start your library.' },
          )}
        </p>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}>
      {templates.map((template) => {
        const accent = template.accent ?? 'primary'
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect?.(template)}
            className={cm.cn(
              cm.sp('p', 6),
              cm.flex({ direction: 'col', align: 'start' }),
              cm.accentCard({ tone: 'custom' }),
              'group text-left bg-surface-container-lowest rounded-2xl shadow-sm',
              'hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden',
            )}
            style={{ ['--mol-accent' as string]: ACCENT_VAR[accent] }}
          >
            <div
              className={cm.cn(
                cm.w(32),
                cm.h(32),
                cm.roundedFull,
                'absolute -right-8 -top-8 blur-2xl transition-all',
                ACCENT_ORB[accent],
              )}
              aria-hidden="true"
            />
            <span
              className={cm.cn(
                cm.sp('p', 2),
                cm.roundedFull,
                cm.sp('mb', 4),
                'bg-surface-container relative z-10',
                ACCENT_TINT[accent],
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
                {CATEGORY_ICON[template.category]}
              </span>
            </span>
            <h3 className={cm.cn(cm.textSize('lg'), 'font-bold text-on-surface relative z-10')}>
              {template.name}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 2),
                cm.sp('mb', 6),
                'text-on-surface-variant line-clamp-2 leading-relaxed relative z-10',
              )}
            >
              {template.preview}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.w('full'),
                'mt-auto relative z-10',
              )}
            >
              <span
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t(
                  'templateLibraryGrid.usage',
                  { count: template.usage_count },
                  { defaultValue: 'Used {{count}} times' },
                )}
              </span>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  ACCENT_TINT[accent],
                )}
              >
                {t('templateLibraryGrid.use', {}, { defaultValue: 'Use' })}
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  arrow_forward
                </span>
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
