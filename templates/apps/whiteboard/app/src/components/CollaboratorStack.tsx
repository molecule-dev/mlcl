import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Stacked collaborator avatars with online dot. Each avatar shows the
 * collaborator's first initial against their assigned cursor color (per
 * DESIGN.md cursor-remote palette). Overflows render a `+N` pill in the same
 * stack. Online indicator is an emerald dot in the bottom-right.
 *
 * Translated from project-management's TaskCard avatar pattern + the
 * personal-finance Dashboard team-avatar overlap (`-space-x-2`).
 */
export interface CollaboratorStackProps {
  collaborators: Array<{
    id: string
    name: string
    avatarColor: string
    online?: boolean
  }>
  /** Maximum avatars to render before collapsing to a `+N` pill (default 4). */
  max?: number
  size?: 'sm' | 'md'
}

export function CollaboratorStack({ collaborators, max = 4, size = 'md' }: CollaboratorStackProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visible = collaborators.slice(0, max)
  const overflow = collaborators.length - visible.length
  const dim = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'

  return (
    <div className={cm.cn(cm.flex({ align: 'center' }), '-space-x-2')}>
      {visible.map((c) => (
        <span
          key={c.id}
          title={c.name}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'relative border-2 border-surface-container-lowest text-white',
            dim,
          )}
          style={{ backgroundColor: c.avatarColor }}
        >
          {c.name.charAt(0).toUpperCase()}
          {c.online && (
            <span
              className={cm.cn(
                'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-surface-container-lowest',
              )}
              // aria-label is prohibited on a bare <span> (axe serious) — role="img" makes
              // the status dot a labelled graphic
              role="img"
              aria-label={t('settings.online', {}, { defaultValue: 'Online' })}
            ></span>
          )}
        </span>
      ))}
      {overflow > 0 && (
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'border-2 border-surface-container-lowest bg-surface-container-high text-on-surface-variant',
            dim,
          )}
        >
          {t('collaboratorStack.overflow', { count: overflow }, { defaultValue: '+{{count}}' })}
        </span>
      )}
    </div>
  )
}

export default CollaboratorStack
