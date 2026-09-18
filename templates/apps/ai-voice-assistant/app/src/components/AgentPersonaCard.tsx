import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface AgentPersonaCardProps {
  to: string
  name: string
  voice: string
  description: string
  capabilities: ReadonlyArray<string>
  initials: string
  active?: boolean
}

/**
 * AgentPersonaCard — a tile in the Agents grid.
 *
 * Glass-style surface with a violet→cyan avatar disc, voice tag, short
 * description, and a capability chip strip. Hover lifts the card slightly
 * (translate + shadow) to make the grid feel tactile. The "Active" state
 * adds a green pulse dot per DESIGN.md `Agent Status Indicator` spec.
 */
export function AgentPersonaCard({
  to,
  name,
  voice,
  description,
  capabilities,
  initials,
  active = false,
}: AgentPersonaCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Link
      to={to}
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'md' }),
        cm.sp('p', 6),
        'rounded-2xl bg-surface border border-border hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 shadow-sm',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
        <div
          className={cm.cn(
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.fontWeight('bold'),
            'h-14 w-14 bg-gradient-to-br from-primary to-secondary text-white text-lg',
          )}
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className={cm.cn(cm.flex({ direction: 'col' }), 'flex-1 min-w-0')}>
          <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'truncate')}>
            {name}
          </span>
          <span className={cm.cn(cm.textSize('xs'), cm.textMuted, 'uppercase tracking-widest')}>
            {voice}
          </span>
        </div>
        {active ? (
          <span
            className={cm.cn(
              cm.roundedFull,
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              'px-3 py-1 text-[10px] uppercase tracking-widest bg-success/15 text-success',
            )}
          >
            <span className={cm.cn(cm.roundedFull, 'h-1.5 w-1.5 bg-success animate-pulse')} />
            {t('agentPersonaCard.active', {}, { defaultValue: 'Active' })}
          </span>
        ) : null}
      </div>
      <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'leading-relaxed')}>{description}</p>
      <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }))}>
        {capabilities.map((c) => (
          <span
            key={c}
            className={cm.cn(
              cm.roundedFull,
              'px-2.5 py-0.5 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/25',
            )}
          >
            {c}
          </span>
        ))}
      </div>
    </Link>
  )
}
