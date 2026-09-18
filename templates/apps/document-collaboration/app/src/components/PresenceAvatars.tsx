import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Stacked collaborator avatars — overlapping circles with the
 * brand cursor palette, +N counter when there are more than `max`.
 *
 * Cursor colors are pulled from DESIGN.md so a writer's color is
 * consistent across cursors, selections, and avatars.
 */
export interface PresenceCollaborator {
  id: string
  initials: string
  /** Optional override; defaults to deterministic palette pick. */
  color?: string
  status?: 'editing' | 'viewing' | 'away'
}

export interface PresenceAvatarsProps {
  collaborators: PresenceCollaborator[]
  /** How many to render before collapsing into "+N". */
  max?: number
  /** Diameter in px (default 28). */
  size?: number
  /** Optional total count if `collaborators` is already truncated server-side. */
  totalOverride?: number
}

const CURSOR_PALETTE = [
  '#4f46e5', // self / indigo
  '#e11d48', // rose
  '#16a34a', // green
  '#d97706', // amber
  '#7c3aed', // violet
  '#06b6d4', // cyan
] as const

function pickColor(id: string, override?: string): string {
  if (override) return override
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return CURSOR_PALETTE[h % CURSOR_PALETTE.length]!
}

export function PresenceAvatars({
  collaborators,
  max = 4,
  size = 28,
  totalOverride,
}: PresenceAvatarsProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const visible = collaborators.slice(0, max)
  const total = totalOverride ?? collaborators.length
  const overflow = Math.max(0, total - visible.length)

  return (
    <div
      className={cm.cn(cm.flex({ align: 'center' }), '-space-x-2')}
      aria-label={t(
        'presenceAvatars.label',
        { count: total },
        { defaultValue: '{{count}} collaborators' },
      )}
    >
      {visible.map((c) => {
        const color = pickColor(c.id, c.color)
        return (
          <span
            key={c.id}
            className={cm.cn(
              'relative inline-flex items-center justify-center rounded-full border-2 border-surface text-[11px] font-extrabold text-white shadow-sm',
            )}
            style={{ width: size, height: size, backgroundColor: color }}
            title={t(
              `presenceAvatars.status.${c.status ?? 'viewing'}`,
              { initials: c.initials },
              { defaultValue: '{{initials}}' },
            )}
          >
            {c.initials}
            {c.status === 'editing' ? (
              <span
                aria-hidden="true"
                className={cm.cn(
                  'absolute -bottom-0.5 -right-0.5 inline-flex h-2.5 w-2.5 rounded-full border-2 border-surface bg-success',
                )}
              />
            ) : null}
          </span>
        )
      })}
      {overflow > 0 ? (
        <span
          className={cm.cn(
            'relative inline-flex items-center justify-center rounded-full border-2 border-surface bg-surface-container text-[10px] font-extrabold text-on-surface-variant',
          )}
          style={{ width: size, height: size }}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  )
}
