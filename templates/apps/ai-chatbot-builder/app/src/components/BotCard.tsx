import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
type BotCardProps = {
  id?: string
  name?: string
  description?: string
  status?: string
  conversations?: number
  lastActive?: string
  avatarUrl?: string
}
export default function BotCard({
  id,
  name = 'Customer Support Bot',
  description = 'Handles general inquiries, ticket status, and knowledge base lookups for current customers.',
  status = 'Online',
  conversations = 89,
  lastActive = '2h ago',
  avatarUrl = 'https://picsum.photos/seed/BotCard-1/1200/800',
}: BotCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const normalized = String(status).toLowerCase()
  const isLive = normalized === 'online' || normalized === 'active'
  const statusLabel = isLive ? 'ONLINE' : 'OFFLINE'
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'group bg-surface-container-lowest rounded-[1.5rem] border border-transparent hover:border-primary/20 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.textPrimary,
            'bg-indigo-100 border-4 border-surface shadow-sm overflow-hidden',
          )}
        >
          <img
            alt={t('botCard.avatarAlt', {}, { defaultValue: 'Bot Avatar' })}
            className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
            data-alt="Futuristic robot avatar icon with neon indigo accents and clean geometric minimalist lines"
            src={avatarUrl}
          />
        </div>
        <span
          className={cm.cn(
            cm.sp('px', 2),
            cm.roundedFull,
            cm.fontWeight('bold'),
            'py-0.5 text-[10px] uppercase tracking-wide border',
            isLive
              ? 'bg-success-light text-success border-emerald-100'
              : 'bg-surface-secondary text-foreground-secondary border-border',
          )}
        >
          {statusLabel}
        </span>
      </div>
      <h5 className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 1), 'text-on-surface')}>{name}</h5>
      <p
        className={cm.cn(cm.textSize('xs'), cm.sp('mb', 4), 'text-on-surface-variant line-clamp-2')}
      >
        {description}
      </p>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('py', 3),
          cm.fontWeight('semibold'),
          'gap-4 border-t border-surface-container text-[11px] text-on-surface-variant',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-1')}>
          <span className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')} data-icon="forum">
            forum
          </span>
          {t(
            'botCard.conversations',
            { count: conversations },
            { defaultValue: '{{count}} convos' },
          )}
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-1')}>
          <span
            className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}
            data-icon="edit_calendar"
          >
            edit_calendar
          </span>
          {lastActive}
        </div>
      </div>
      <button
        className={cm.cn(
          cm.w('full'),
          cm.sp('mt', 2),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          'bg-surface-container-low hover:bg-primary hover:text-white rounded-lg transition-colors group-hover:bg-primary group-hover:text-white',
        )}
        onClick={() => (id ? navigate(`/bots/${id}/editor`) : undefined)}
      >
        {t('botCard.editBot', {}, { defaultValue: 'Edit Bot' })}
      </button>
    </div>
  )
}
export { BotCard }
