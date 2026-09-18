import { getClassMap } from '@molecule/app-ui'

/**
 * Small status / permission pill — used everywhere a page state, role,
 * or category needs a one-glance affordance. Mirrors DESIGN.md
 * "Page Status Badge" + "Permission Badge" specs (rounded-full,
 * 10px font-black, uppercase, tracking-widest).
 *
 * Translated from personal-finance/StatusPill + blog/TagsTableRow row
 * pill — same anatomy with the Cairn semantic token list (draft/
 * published/archived/locked + owner/editor/viewer/public).
 */

export type StatPillTone =
  | 'draft'
  | 'published'
  | 'archived'
  | 'locked'
  | 'owner'
  | 'editor'
  | 'viewer'
  | 'public'
  | 'mention'
  | 'neutral'

export interface StatPillProps {
  tone: StatPillTone
  icon?: string
  children: React.ReactNode
  /** Optional test id forwarded to the rendered span. */
  'data-testid'?: string
}

const TONE_TO_TAILWIND: Record<StatPillTone, string> = {
  draft: 'bg-warning-container text-on-warning-container',
  published: 'bg-success-container text-on-success-container',
  archived: 'bg-surface-container-high text-on-surface-variant',
  locked: 'bg-error-container text-on-error-container',
  owner: 'bg-primary text-on-primary',
  editor: 'bg-secondary-container text-on-secondary-container',
  viewer: 'bg-surface-container-high text-on-surface-variant',
  public: 'bg-success-container text-on-success-container',
  mention: 'bg-tertiary-container text-on-tertiary-container',
  neutral: 'bg-surface-container-high text-on-surface-variant',
}

export function StatPill({ tone, icon, children, ...rest }: StatPillProps) {
  const cm = getClassMap()
  return (
    <span
      data-testid={rest['data-testid']}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.sp('px', 3),
        cm.sp('py', 1),
        'rounded-full text-[10px] font-black uppercase tracking-widest',
        TONE_TO_TAILWIND[tone],
      )}
    >
      {icon ? (
        <span className={cm.cn('material-symbols-outlined text-[12px]')} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  )
}
